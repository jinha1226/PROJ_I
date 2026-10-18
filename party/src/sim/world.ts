import { dist, Rng } from '../core/rng';
import type { Element } from './defs';
import type { ArenaWave, MapDef } from '../data/maps';
import { DIFFICULTIES, type Difficulty, type DifficultyId } from '../data/difficulty';
import { MONSTERS } from '../data/units';
import { synergyProps } from '../data/synergy';
import { CONTRACTS } from '../data/contracts';
import { updateUnit } from './behavior';
import { beginFloor, gainXp, newParty, type Hero } from './hero';
import { itemTitle } from './items';
import { checkObjects, type EventPrompt, type WorldObject } from './objects';
import { usefulItem } from './reward';
import { newRun, type RunState } from './run';
import { GameMap } from './map';
import { resolveCollisions } from './movement';
import { computeStats } from './stats';
import { addStress, obeys, partyStress, tickStress } from './stress';
import { stopMoving } from './movement';
import { Unit, type Intent } from './unit';

export interface Projectile {
  source: Unit;
  target: Unit | null;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  color: string;
  size: number;
  onHit: () => void;
  /** 화면용: 모양 · 속성 (화살 · 불덩이 · 얼음 조각 · 구슬) */
  style?: 'arrow' | 'bolt' | 'shard' | 'orb';
  element?: Element;
}

/** 화면용 이펙트 사건. 시뮬레이션은 일어난 일만 알리고, 그리는 쪽이 꺼내 쓴다 (헤드리스에서는 쌓이다 버려진다) */
export type Vfx =
  | { type: 'impact'; x: number; y: number; color: string; element?: Element; radius: number }
  | { type: 'heal'; unit: Unit }
  | { type: 'status'; unit: Unit; status: string }
  | { type: 'hit'; unit: Unit; heavy: boolean; from: Unit | null };

export interface Fx {
  kind: 'ring' | 'slash' | 'trail';
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  r: number;
  color: string;
  dur: number;
  t?: number;
}

export interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
  scale: number;
}

export interface LogLine {
  text: string;
  color: string;
  time: number;
}

/** 플레이어가 개입해야 할 순간. 화면 쪽에서 꺼내 감속/일시정지에 쓴다 */
export interface Crisis {
  text: string;
  color: string;
  x: number;
  y: number;
}

/** 머리 위 말풍선 (대사 · 명령 거부) */
export interface Bubble {
  unit: Unit;
  text: string;
  color: string;
  t: number;
  dur: number;
}

/** 붕괴 · 각성 순간. 화면 쪽에서 꺼내 잠깐 멈추고 크게 보여 준다 */
export interface MoodBreak {
  unit: Unit;
  title: string;
  desc: string;
  line: string;
  color: string;
}

export const SIGHT = 8;

/** 전투 템포: 적은 더 튼튼하고 덜 아프게 → 전투 하나가 15~30초, 그동안 판단할 여유 */
const ENEMY_HP = 2;
const ENEMY_DMG = 0.85;
const BOSS_HP = 1.5;

/** 전장 몬스터 체력 배율 */
const ARENA_HP = 1.2;

export class World {
  readonly map: GameMap;
  readonly rng: Rng;
  units: Unit[] = [];
  party: Unit[] = [];
  projectiles: Projectile[] = [];
  fx: Fx[] = [];
  floaters: Floater[] = [];
  logs: LogLine[] = [];
  crises: Crisis[] = [];
  bubbles: Bubble[] = [];
  /** 타격감: 히트스톱(초) · 화면 흔들림(px) · 효과음 이름. 화면 쪽이 소비한다 */
  hitstop = 0;
  shake = 0;
  sfx: string[] = [];
  vfx: Vfx[] = [];
  moodBreaks: MoodBreak[] = [];
  private crisisAt = new Map<string, number>();
  private lowHp = new Set<Unit>();
  time = 0;
  focusTarget: Unit | null = null;
  leader: Unit | null = null;
  /** 주장: 플레이어가 직접 조작하는 한 명. 나머지는 작전대로 AI 가 싸운다 */
  captain: Unit | null = null;
  /** 주장 조이스틱 방향 (없으면 AI 가 근처 적을 친다) */
  capDir: { x: number; y: number } | null = null;
  inCombat = false;
  /** victory = 보스 처치(런 승리), cleared = 계단 도착(다음 층) */
  outcome: 'victory' | 'defeat' | 'cleared' | null = null;
  readonly depth: number;
  readonly stairs: { x: number; y: number } | null;
  readonly rooms: MapDef['rooms'];
  readonly roles: NonNullable<MapDef['roles']>;
  readonly run: RunState;
  /** 상자 · 이벤트 */
  objects: WorldObject[];
  /** 이벤트 선택 대기 (화면이 선택지를 띄우고 그동안 시뮬레이션을 멈춘다) */
  prompt: EventPrompt | null = null;
  visitedRooms: boolean[];
  /** 자동 탐험: 전투가 없을 때 다음 방 → 계단으로 파티를 이동시킨다 */
  autoExplore = false;
  /** 자동 탐험이 곁가지 방의 상자·이벤트까지 들르는지 (시뮬레이션의 '개입하는 플레이어' 흉내용) */
  exploreSides = false;
  private exploreMove = false;
  /** 조이스틱으로 직접 움직인 직후에는 자동 탐험이 끼어들지 않는다 */
  private manualUntil = 0;
  private steerAt = -1;
  private steerGroup = 0;
  private groupSeq = 0;
  private groupFields = new Map<number, Float32Array>();
  readonly visible: Uint8Array;
  /** 파티가 보고 있는 적. 칸 중심이 아니라 실제 위치끼리 시야를 잰다 (모퉁이 궁수 대비) */
  private seenUnits = new Set<Unit>();
  readonly seen: Uint8Array;
  private nextId = 1;
  private visTimer = 0;
  private awareTimer = 0;
  private calmTimer = 0;

  readonly difficulty: Difficulty;
  /** 바닥 · 벽 색 (계약의 던전 종류) */
  readonly palette: NonNullable<MapDef['palette']>;
  /** 쓰러뜨린 보스 이름 (결과 화면) */
  bossName = '';
  /** 전장 모드: 한 화면 방, 웨이브 */
  readonly arena: boolean;
  readonly waves: ArenaWave[];
  readonly gates: [number, number][];
  waveIndex = 0;
  /** 지금 웨이브 성격 이름 (HUD) */
  waveName = '';
  private waveTimer = 1.2;

  constructor(def: MapDef, seed: number, heroes: Hero[] = newParty(), difficulty: DifficultyId = 'easy', run: RunState = newRun()) {
    this.difficulty = DIFFICULTIES[difficulty];
    this.palette = def.palette ?? 'cave';
    this.arena = !!def.arena;
    this.waves = def.waves ?? [];
    this.gates = def.gates ?? [];
    this.run = run;
    this.roles = def.roles ?? def.rooms.map((_, i) => (i === 0 ? 'start' : 'main'));
    this.objects = (def.objects ?? []).map((o, i) => ({ id: i, kind: o.kind, x: o.x + 0.5, y: o.y + 0.5, used: false }));
    this.rng = new Rng(seed);
    this.map = GameMap.fromDef(def);
    this.depth = def.depth ?? 1;
    this.stairs = def.stairs ? { x: def.stairs[0] + 0.5, y: def.stairs[1] + 0.5 } : null;
    this.rooms = def.rooms;
    this.visitedRooms = def.rooms.map((_, i) => i === 0);
    this.visible = new Uint8Array(this.map.w * this.map.h);
    this.seen = new Uint8Array(this.map.w * this.map.h);
    heroes.forEach((h, i) => {
      const [x, y] = def.partyStart[i % def.partyStart.length];
      beginFloor(h);
      const unit = this.addUnit(new Unit(this.nextId++, h.def, 'party', x + 0.5, y + 0.5, h));
      // 시너지 (직업 · 종족 조합)
      unit.synergy = synergyProps(heroes.map((x) => x.comp), h.comp);
      unit.refreshGear();
      computeStats(unit);
      // 체력은 방을 넘어 이어진다 (야영 · 물약으로 회복)
      unit.hp = Math.max(1, Math.round(unit.stats.maxHp * (h.hpFrac ?? 1)));
      this.party.push(unit);
    });
    this.setCaptain(this.party.find((p) => p.hero && p.hero.uid === run.captain) ?? this.party[0], false);
    for (const s of def.spawns) this.spawn(s.id, 'enemy', s.x + 0.5, s.y + 0.5);
    this.updateVisibility();
    if (this.arena) this.log(this.waves.length ? `적이 몰려온다! (웨이브 ${this.waves.length})` : '조용한 방이다', '#cccccc');
    else this.log(this.depth === 1 ? '던전에 들어섰다. [Space] 일시정지 · [H] 도움말' : `${this.depth}층에 내려왔다${this.stairs ? '' : ' — 족장의 기척이 느껴진다'}`, '#cccccc');
  }

  spawn(id: string, faction: 'party' | 'enemy', x: number, y: number): Unit {
    const def = MONSTERS[id];
    if (!def) throw new Error(`unknown unit ${id}`);
    const u = new Unit(this.nextId++, def, faction, x, y);
    // 깊은 층의 몬스터는 더 튼튼하고 아프다. 보스는 깊이 대신 난이도별 고정 배율
    const d = this.difficulty;
    u.scale = def.boss
      ? { hp: d.boss * BOSS_HP, dmg: (1 + (d.boss - 1) * 0.5) * ENEMY_DMG }
      : { hp: d.baseHp * ENEMY_HP * (1 + (this.depth - 1) * d.perDepthHp), dmg: d.baseDmg * ENEMY_DMG * (1 + (this.depth - 1) * d.perDepthDmg) };
    // 전장: 적이 다가오기도 전에 녹지 않게 더 튼튼하다 (대신 웨이브 예산은 그대로)
    // 얕은 깊이는 적이 너무 약해 한 번 더 (1층 ×1.4, 2층 ×1.2)
    // 계약별 적 위력
    const power = faction === 'enemy' && this.run.contract ? CONTRACTS[this.run.contract.kind].power ?? 1 : 1;
    u.scale.hp *= power;
    u.scale.dmg *= power;
    if (this.arena && faction === 'enemy' && !def.boss) {
      const shallow = Math.max(0, 3 - this.depth);
      u.scale.hp *= ARENA_HP * (1 + shallow * 0.2);
      // 얕은 층 적도 아프게 (1층 ×1.5, 2층 ×1.25): 쉬운 계약도 손 놓으면 다친다
      u.scale.dmg *= 1 + shallow * 0.25;
    }
    return this.addUnit(u);
  }

  private addUnit(u: Unit): Unit {
    computeStats(u);
    u.hp = u.stats.maxHp;
    u.mp = u.stats.maxMp;
    this.units.push(u);
    return u;
  }

  // ── 질의 ──
  hostilesOf(u: Unit) {
    return this.units.filter((v) => v.alive && v.faction !== u.faction);
  }
  alliesOf(u: Unit) {
    return this.units.filter((v) => v.alive && v.faction === u.faction);
  }
  isVisible(u: Unit) {
    return u.faction === 'party' || this.seenUnits.has(u);
  }
  /** AI 가 인지하고 있는 적 목록 */
  knownEnemies(u: Unit): Unit[] {
    // 전장은 한 화면이라 거리와 상관없이 서로 안다
    const range = this.arena ? 99 : u.faction === 'party' ? 10 : 14;
    if (u.faction === 'party') return this.hostilesOf(u).filter((e) => this.isVisible(e) && dist(u, e) < range);
    if (!u.aware) return [];
    return this.hostilesOf(u).filter((e) => dist(u, e) < range);
  }

  // ── 플레이어 명령 ──
  /** 명령 하달. player = 플레이어의 명령 (붕괴한 파티원은 거부할 수 있다) */
  private issue(u: Unit, intent: Intent, player = true): boolean {
    if (!u.alive) return false;
    if (player && !obeys(this, u)) return false;
    if (u.cast) this.cancelCast(u, '', false);
    u.command = { intent, bestDist: Infinity, lastProgress: this.time, issuedAt: this.time };
    u.intent = null;
    return true;
  }

  commandMove(units: Unit[], x: number, y: number, player = true) {
    this.exploreMove = false;
    const live = units.filter((u) => u.alive);
    if (!live.length) return;
    const hold = live.length === 1 || this.inCombat;
    if (live.length === 1) {
      const p = this.map.nearestFloor(x, y);
      if (!this.issue(live[0], { type: 'move', x: p.x, y: p.y }, player)) return;
      live[0].holdPos = p;
      this.leader = live[0];
      return;
    }
    // 진형: 목표 주변 바닥 칸을 '다가오는 방향 기준 앞쪽' 순으로 세우고,
    // 전열은 가장 앞 칸들, 후열은 가장 뒤 칸들을 맡는다.
    // 같은 줄 안에서는 지금 더 앞에 있는 유닛이 더 앞 칸을 맡아 서로 엇갈려 지나가지 않게 한다.
    const dest = this.map.nearestFloor(x, y);
    const slots = this.map.nearbyFloorSlots(x, y, live.length + 2);
    slots[0] = dest;
    const c = { x: live.reduce((s, u) => s + u.x, 0) / live.length, y: live.reduce((s, u) => s + u.y, 0) / live.length };
    const dl = dist(c, dest) || 1;
    const dir = { x: (c.x - dest.x) / dl, y: (c.y - dest.y) / dl };
    const behind = (p: { x: number; y: number }) => (p.x - dest.x) * dir.x + (p.y - dest.y) * dir.y;
    slots.sort((a, b) => behind(a) - behind(b));
    const order = (a: Unit, b: Unit) => behind(a) - behind(b);
    const front = live.filter((u) => u.row === 'front').sort(order);
    const back = live.filter((u) => u.row === 'back').sort(order);
    const backSlots = slots.slice(Math.max(front.length, slots.length - back.length));
    const group = ++this.groupSeq;
    if (front.length && back.length) {
      this.groupFields.set(group, this.map.distanceField(dest.x, dest.y));
      if (this.groupFields.size > 6) this.groupFields.delete(this.groupFields.keys().next().value!);
    }
    const assign = (u: Unit, p: { x: number; y: number }) => {
      if (!this.issue(u, { type: 'move', x: p.x, y: p.y }, player)) return;
      u.command!.group = group;
      u.holdPos = hold ? p : null;
    };
    front.forEach((u, i) => assign(u, slots[Math.min(i, slots.length - 1)]));
    back.forEach((u, i) => assign(u, backSlots[Math.min(i, backSlots.length - 1)] ?? slots[slots.length - 1]));
    this.leader = front[0] ?? back[0];
  }

  /** 후열 유닛이 함께 이동 중인 전열을 앞지르려 하면 기다린다 */
  shouldWait(u: Unit, group: number): boolean {
    const field = this.groupFields.get(group);
    if (!field || u.row !== 'back') return false;
    const at = (v: Unit) => field[Math.floor(v.y) * this.map.w + Math.floor(v.x)];
    let lead = Infinity;
    for (const p of this.party)
      if (p.alive && p.row === 'front' && p.command?.group === group) lead = Math.min(lead, at(p));
    return lead !== Infinity && at(u) < lead + 1.5;
  }

  commandAttack(units: Unit[], target: Unit) {
    for (const u of units) if (this.issue(u, { type: 'attack', target })) u.holdPos = null;
  }

  commandAbility(u: Unit, slot: number, target: Unit | null, x: number, y: number) {
    this.issue(u, { type: 'ability', slot, target, x, y });
  }

  /**
   * 조이스틱 (우르르 용병단식): 파티 전체를 한 방향으로 진형 이동시킨다. 손을 떼면 stopSteer.
   * 매 프레임 불러도 되고, 명령은 0.2초마다 갱신된다
   */
  steer(dx: number, dy: number) {
    const live = this.party.filter((p) => p.alive);
    if (!live.length) return;
    this.manualUntil = this.time + 4;
    if (this.time - this.steerAt < 0.2 && this.steerAt >= 0) return;
    this.steerAt = this.time;
    const cx = live.reduce((s, u) => s + u.x, 0) / live.length, cy = live.reduce((s, u) => s + u.y, 0) / live.length;
    this.commandMove(live, cx + dx * 3, cy + dy * 3);
    this.steerGroup = this.groupSeq;
  }

  /** 조이스틱을 놓으면 그 자리에 선다 (전투 중이면 위치 고수) */
  stopSteer() {
    this.steerAt = -1;
    this.manualUntil = this.time + 4;
    for (const p of this.party) {
      if (!p.alive || p.command?.group !== this.steerGroup) continue;
      p.command = null;
      stopMoving(p);
      p.holdPos = this.inCombat ? { x: p.x, y: p.y } : null;
    }
  }

  /** 주장을 바꾼다. 새 주장은 이전 주장의 자동 여부를 이어받고, 나머지는 자동전투 */
  setCaptain(u: Unit, announce = true) {
    if (!u.alive || u.faction !== 'party') return;
    const prev = this.captain;
    const auto = prev ? prev.autoMode : u.autoMode;
    for (const p of this.party) if (p !== u) p.autoMode = true;
    u.autoMode = auto;
    u.command = null;
    u.intent = null;
    u.holdPos = null;
    this.captain = u;
    this.leader = u;
    this.capDir = null;
    if (u.hero) this.run.captain = u.hero.uid;
    if (announce && prev !== u) this.say(u, '내가 맡는다!', '#ffcc66', 1.2);
  }

  /** 주장 조이스틱: 방향 (길이 1) 또는 null(손을 뗐다) */
  steerCaptain(dx: number, dy: number) {
    const c = this.captain;
    if (!c?.alive) return;
    this.capDir = { x: dx, y: dy };
    this.manualUntil = this.time + 4;
  }

  stopCaptain() {
    this.capDir = null;
    const c = this.captain;
    if (c?.alive) stopMoving(c);
  }

  /** 주장 돌진 · 구르기: 진행 방향 앞에 적이 있으면 돌진 강타, 없으면 그 방향으로 구른다 */
  captainDash(rollOnly = false): boolean {
    const c = this.captain;
    if (!c?.alive || c.dashCd > 0 || c.dashT > 0 || c.stats.stunned) return false;
    const dir = this.capDir ?? (c.lastTarget?.alive ? null : { x: c.facing, y: 0 });
    if (c.cast) this.cancelCast(c, '', false);
    c.command = null;
    c.intent = null;
    if (!c.isRanged && !rollOnly) {
      // 근접: 바라보는 쪽 6칸 안의 적 (방향이 없으면 가장 가까운 적)
      let best: Unit | null = null, bestScore = Infinity;
      for (const e of this.hostilesOf(c)) {
        if (!e.alive) continue;
        const d = dist(c, e);
        if (d > 6) continue;
        const along = dir ? ((e.x - c.x) * dir.x + (e.y - c.y) * dir.y) / (d || 1) : 1;
        if (along < 0.4) continue;
        const score = d * (1.6 - along);
        if (score < bestScore) { best = e; bestScore = score; }
      }
      if (best) {
        c.dashT = 0.4;
        c.dashTarget = best;
        c.dashDir = null;
        c.dashCd = 4;
        this.sound('swing');
        return true;
      }
    }
    // 구르기: 원거리면 적에게서 멀어지는 쪽이 기본
    let d = dir;
    if (!d) {
      const near = this.hostilesOf(c).filter((e) => e.alive).sort((a, b) => dist(c, a) - dist(c, b))[0];
      if (near) {
        const l = dist(c, near) || 1;
        d = { x: (c.x - near.x) / l, y: (c.y - near.y) / l };
      } else d = { x: c.facing, y: 0 };
    }
    c.dashT = 0.25;
    c.dashTarget = null;
    c.dashDir = d;
    c.dashCd = 2.5;
    this.sound('swing');
    return true;
  }

  setFocus(t: Unit | null) {
    this.focusTarget = t && t.alive ? t : null;
    if (this.focusTarget) this.log(`집중 공격: ${this.focusTarget.name}`, '#ff6666');
  }

  // ── 이벤트 ──
  float(u: Unit, text: string, color: string, scale = 1) {
    const stack = this.floaters.filter((f) => f.t < 0.25 && Math.abs(f.x - u.x) < 0.3).length;
    this.floaters.push({ x: u.x, y: u.y - 0.9 - stack * 0.28, text, color, t: 0, scale });
  }
  emit(v: Vfx) {
    this.vfx.push(v);
    if (this.vfx.length > 96) this.vfx.shift();
  }

  sound(name: string) {
    if (this.sfx.length < 16) this.sfx.push(name);
  }

  /** 말풍선: 유닛마다 하나 (새 말이 이전 말을 덮는다) */
  say(u: Unit, text: string, color: string, dur = 2.4) {
    this.bubbles = this.bubbles.filter((b) => b.unit !== u);
    this.bubbles.push({ unit: u, text, color, t: 0, dur });
  }
  isSaying(u: Unit) {
    return this.bubbles.some((b) => b.unit === u);
  }

  /** 같은 key 는 6초에 한 번만 알린다 */
  crisis(key: string, text: string, x: number, y: number, color = '#ff6666') {
    const last = this.crisisAt.get(key);
    if (last !== undefined && this.time - last < 6) return;
    this.crisisAt.set(key, this.time);
    this.crises.push({ text, color, x, y });
    if (this.crises.length > 8) this.crises.shift();
  }

  private checkLowHp() {
    for (const p of this.party) {
      if (!p.alive) continue;
      if (p.hpFrac < 0.35 && !this.lowHp.has(p)) {
        this.lowHp.add(p);
        addStress(this, p, 5);
        this.crisis(`low:${p.id}`, `${p.name} 체력 위험!`, p.x, p.y, '#ff5555');
      } else if (p.hpFrac > 0.6) this.lowHp.delete(p);
    }
  }

  log(text: string, color = '#cccccc') {
    this.logs.push({ text, color, time: this.time });
    if (this.logs.length > 60) this.logs.shift();
  }
  effect(f: Fx) {
    this.fx.push({ ...f, t: 0 });
  }
  spawnProjectile(p: Projectile) {
    this.projectiles.push(p);
  }

  cancelCast(u: Unit, msg: string, penalty = true) {
    if (!u.cast) return;
    const st = u.abilities[u.cast.slot];
    if (penalty) st.cd = Math.max(st.cd, 1.0);
    u.cast = null;
    if (msg) {
      this.float(u, msg, '#ffcc66');
      this.log(`${u.name}의 ${st.def.name}이(가) 끊겼다`, '#ffcc66');
    }
  }

  /** 피격된 몬스터가 주변 동료를 깨운다 */
  alert(u: Unit) {
    if (u.faction !== 'enemy' || u.aware) return;
    u.aware = true;
    for (const o of this.units)
      if (o.faction === 'enemy' && o.alive && !o.aware && dist(o, u) < 6 && this.map.los(o.x, o.y, u.x, u.y))
        o.aware = true;
  }

  kill(u: Unit, by: Unit | null) {
    if (!u.alive) return;
    u.alive = false;
    u.hp = 0;
    u.deathTime = this.time;
    u.cast = null;
    u.command = null;
    u.intent = null;
    u.statuses = [];
    this.sound('death');
    if (u.def.boss || u.faction === 'party') this.shake = Math.max(this.shake, 10);
    this.log(`${u.name} 쓰러짐${by ? ` (${by.name})` : ''}`, u.faction === 'party' ? '#ff6666' : '#aaaaaa');
    if (this.focusTarget === u) this.focusTarget = null;
    if (this.captain === u) {
      const next = this.party.find((p) => p.alive);
      if (next) {
        this.setCaptain(next);
        this.log(`주장 교대 → ${next.name}`, '#ffcc66');
      }
    }
    if (this.leader === u) this.leader = this.party.find((p) => p.alive) ?? null;
    if (u.faction === 'party') {
      partyStress(this, 15, u);
      if (u.hero) u.hero.deathCause = by ? `${by.name}에게 쓰러짐` : '쓰러짐';
    }
    if (u.faction === 'enemy') {
      // 골드: 처치 경험치에 비례. 귀환해야 용병단 금고에 들어간다
      this.run.gold += Math.round((u.def.xp ?? 0) * 0.6);
      if (by?.hero) by.hero.kills++;
    }
    else if (by?.hero) addStress(this, by, -1);
    // 피의 갈증 (오크 · 특성)
    const lust = by?.alive ? by.tagCount('bloodlust') : 0;
    if (lust && u.faction !== by!.faction) by!.hp = Math.min(by!.stats.maxHp, by!.hp + by!.stats.maxHp * 0.08 * lust);
    if (u.faction === 'enemy') {
      // 전장(원정 지도)은 방 수가 적어 처치 수도 적으니 경험치를 더 준다
      this.grantXp(Math.round((u.def.xp ?? 0) * (this.arena ? 1.6 : 1)));
      this.run.kills[u.def.id] = (this.run.kills[u.def.id] ?? 0) + 1;
    }
    if (u.def.splitInto) {
      // 분열 (슬라임)
      const s = u.def.splitInto;
      for (let i = 0; i < s.count; i++) {
        const p = this.map.nearestFloor(u.x + (i - (s.count - 1) / 2) * 0.7, u.y + 0.2);
        const m = this.spawn(s.id, u.faction, p.x, p.y);
        m.aware = true;
      }
      this.float(u, '분열!', u.def.color, 1.1);
    }
    if (u.def.id === 'mimic') {
      // 위험을 감수한 대가: 미믹은 아티팩트 확정
      const it = usefulItem(this.rng, this.depth + 1, this.party.flatMap((p) => (p.hero ? [p.hero] : [])), { force: 'artifact' });
      this.run.found.push(it);
      this.log(`미믹이 삼키고 있던 ${itemTitle(it)}을(를) 얻었다`, '#ffcc55');
    }
    if (u.def.boss) {
      this.bossName = u.name;
      this.outcome = 'victory';
      this.log(`${u.name}을(를) 쓰러뜨렸다! 승리!`, '#ffe14d');
    }
    if (u.faction === 'party' && this.party.every((p) => !p.alive)) {
      this.outcome = 'defeat';
      this.log('파티가 전멸했다...', '#ff4444');
    }
  }

  /** 처치 경험치: 살아 있는 파티원이 똑같이 받는다 */
  grantXp(xp: number) {
    for (const p of this.party) {
      if (!p.alive || !p.hero) continue;
      const maxHp = p.stats.maxHp;
      if (gainXp(p.hero, xp)) {
        computeStats(p);
        p.hp += p.stats.maxHp - maxHp;
        this.float(p, `레벨 ${p.hero.xl}!`, '#ffe14d', 1.3);
        this.sound('level');
        this.log(`${p.name} 레벨 ${p.hero.xl} 달성 (층을 마치면 선택)`, '#ffe14d');
      }
    }
  }

  private updateRooms() {
    for (const p of this.party) {
      if (!p.alive) continue;
      this.rooms.forEach(([x, y, w, h], i) => {
        if (p.x >= x && p.x < x + w && p.y >= y && p.y < y + h && !this.visitedRooms[i]) {
          this.visitedRooms[i] = true;
          // 곁가지 방 탐험의 대가
          if (this.roles[i] === 'side') {
            partyStress(this, 5);
            this.log('음산한 곁방에 들어섰다 (스트레스)', '#b98cff');
          }
        }
      });
    }
    // 계단: 전투 중이 아닐 때 파티원 하나라도 밟으면 다음 층
    // (지나가다 밟은 것은 제외: 명령이 없거나 계단으로 가던 중이어야 한다)
    const st = this.stairs;
    const onStairs = (p: Unit) => {
      if (!p.alive || dist(p, st!) > 1.2) return false;
      const it = p.command?.intent;
      return !it || (it.type === 'move' && dist(it, st!) < 1.6);
    };
    if (st && !this.inCombat && !this.outcome && this.party.some(onStairs)) {
      this.outcome = 'cleared';
      this.log(`${this.depth}층을 벗어났다`, '#88ccff');
    }
  }

  /** 전장: 적이 다 쓰러지면 잠깐 뒤 다음 웨이브가 문으로 들어온다. 웨이브 · 오브젝트를 다 마치면 방 정리 */
  private arenaStep(dt: number) {
    if (this.outcome) return;
    const enemies = this.units.some((u) => u.alive && u.faction === 'enemy');
    if (enemies) {
      this.waveTimer = 2.2;
      return;
    }
    if (this.waveIndex < this.waves.length) {
      this.waveTimer -= dt;
      if (this.waveTimer > 0) return;
      this.spawnWave(this.waves[this.waveIndex]);
      this.waveIndex++;
      return;
    }
    if (this.prompt || this.objects.some((o) => !o.used && o.kind !== 'mimic')) return;
    if (this.party.some((p) => p.alive)) {
      this.outcome = 'cleared';
      this.log('방을 정리했다', '#88ccff');
    }
  }

  private spawnWave(wave: ArenaWave) {
    const group = wave.ids;
    const n = this.waveIndex + 1, total = this.waves.length;
    const boss = group.some((id) => MONSTERS[id]?.boss);
    const color = wave.color ?? (boss ? '#ff4444' : '#ffcc66');
    const title = boss ? '보스 등장!' : `웨이브 ${n}/${total}${wave.name ? ` — ${wave.name}` : ''}`;
    // 웨이브 요령은 띄우지 않는다: 짧은 제목만
    this.crisis(`wave:${n}`, boss ? title : `웨이브 ${n}/${total}`, this.map.w / 2, this.map.h / 2, color);
    this.log(title, color);
    this.waveName = wave.name ?? '';
    // 한쪽 문 성격이면 웨이브마다 번갈아, 양쪽이면 나눠서
    const left = this.gates.filter(([x]) => x === 0), right = this.gates.filter(([x]) => x > 0);
    const both = wave.sides ? wave.sides === 'both' : n % 2 === 0 || group.length >= 4;
    group.forEach((id, i) => {
      const side = both ? (i % 2 ? left : right) : n % 4 === 1 ? right : left;
      const [gx, gy] = side[i % side.length] ?? this.gates[0];
      const m = this.spawn(id, 'enemy', gx + 0.5 + (gx === 0 ? -0.3 : 0.3), gy + 0.5 + (this.rng.next() - 0.5) * 0.6);
      m.aware = true;
    });
  }

  /** 자동 탐험 한 걸음: 아무도 명령이 없고 전투가 아니면 다음 미방문 방 → 계단 */
  private exploreStep() {
    if (!this.autoExplore || this.inCombat || this.outcome || this.time < this.manualUntil) return;
    const live = this.party.filter((p) => p.alive);
    if (!live.length || live.some((p) => p.command || p.cast)) return;
    // 곁가지 방은 들르지 않는다 (털지 말지는 플레이어가 정한다)
    const next = this.visitedRooms.findIndex((v, i) => !v && this.roles[i] !== 'side');
    let target: { x: number; y: number } | null = null;
    // 구출 계약의 포로는 자동 탐험도 들른다
    const obj = this.objects.find((o) => !o.used && (this.exploreSides || o.kind === 'captive'));
    if (next >= 0) {
      const [x, y, w, h] = this.rooms[next];
      target = this.map.nearestFloor(x + w / 2, y + h / 2);
    } else if (obj) target = obj;
    else if (this.stairs) target = this.stairs;
    if (!target) return;
    this.commandMove(live, target.x, target.y, false);
    for (const p of live) p.holdPos = null;
    this.exploreMove = true;
  }

  // ── 시뮬레이션 ──
  tick(dt: number) {
    // 이벤트 선택을 기다리는 동안은 멈춘다
    if (this.prompt) return;
    this.time += dt;

    this.awareTimer -= dt;
    if (this.awareTimer <= 0) {
      this.awareTimer = 0.2;
      this.updateAwareness();
      this.updateCombatState(0.2);
      this.checkLowHp();
      this.updateRooms();
      checkObjects(this);
      tickStress(this, 0.2);
      if (this.arena) this.arenaStep(0.2);
      this.exploreStep();
    }

    for (const u of this.units) if (u.alive) updateUnit(this, u, dt);
    // 넉백: 밀려나는 속도를 줄여 가며 움직인다 (벽은 resolveCollisions 가 막는다)
    for (const u of this.units) {
      if (!u.alive || (Math.abs(u.vx) < 0.01 && Math.abs(u.vy) < 0.01)) continue;
      u.x += u.vx * dt;
      u.y += u.vy * dt;
      const k = Math.exp(-dt * 9);
      u.vx *= k;
      u.vy *= k;
    }
    resolveCollisions(this);
    this.updateProjectiles(dt);

    this.visTimer -= dt;
    if (this.visTimer <= 0) {
      this.visTimer = 0.15;
      this.updateVisibility();
    }

    for (const f of this.fx) f.t! += dt;
    this.fx = this.fx.filter((f) => f.t! < f.dur);
    for (const f of this.floaters) {
      f.t += dt;
      f.y -= dt * 0.8;
    }
    this.floaters = this.floaters.filter((f) => f.t < 1.1);
    for (const u of this.units) {
      const k = Math.exp(-dt * 14);
      u.kickX *= k;
      u.kickY *= k;
    }
    for (const b of this.bubbles) b.t += dt;
    this.bubbles = this.bubbles.filter((b) => b.t < b.dur && b.unit.alive);
    this.units = this.units.filter((u) => u.alive || u.faction === 'party' || this.time - u.deathTime < 1.5);
  }

  private updateProjectiles(dt: number) {
    const done: Projectile[] = [];
    for (const p of this.projectiles) {
      if (p.target?.alive) {
        p.tx = p.target.x;
        p.ty = p.target.y;
      }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= step) {
        done.push(p);
        if (!p.target || p.target.alive) p.onHit();
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }
    if (done.length) this.projectiles = this.projectiles.filter((p) => !done.includes(p));
  }

  private updateAwareness() {
    const party = this.party.filter((p) => p.alive);
    for (const m of this.units) {
      if (m.faction !== 'enemy' || !m.alive || m.aware) continue;
      const sight = m.def.sight ?? 7;
      for (const p of party) {
        if (dist(m, p) < sight && this.map.los(m.x, m.y, p.x, p.y)) {
          this.alert(m);
          break;
        }
      }
    }
  }

  private updateCombatState(dt: number) {
    const party = this.party.filter((p) => p.alive);
    const engaged = this.units.some(
      (e) => e.faction === 'enemy' && e.alive && (e.aware || this.isVisible(e)) && party.some((p) => dist(p, e) < 12),
    );
    if (engaged) {
      if (!this.inCombat) {
        this.log('전투 시작!', '#ffaa66');
        // 자동 탐험 이동 중이었다면 멈추고 AI 에 맡긴다
        if (this.exploreMove)
          for (const p of this.party) if (p.command?.intent.type === 'move') { p.command = null; p.holdPos = null; }
        this.exploreMove = false;
      }
      this.inCombat = true;
      this.calmTimer = 0;
    } else if (this.inCombat) {
      this.calmTimer += dt;
      if (this.calmTimer > 1.5) {
        this.inCombat = false;
        for (const p of this.party) p.holdPos = null;
        this.log('전투 종료', '#88cc88');
        partyStress(this, -3);
      }
    }
  }

  updateVisibility() {
    const { w, h } = this.map;
    if (this.arena) {
      // 전장은 한눈에 다 보인다
      this.visible.fill(1);
      this.seen.fill(1);
      this.seenUnits.clear();
      for (const e of this.units) if (e.alive && e.faction !== 'party') this.seenUnits.add(e);
      return;
    }
    this.visible.fill(0);
    for (const u of this.party) {
      if (!u.alive) continue;
      const x0 = Math.floor(u.x - SIGHT), x1 = Math.ceil(u.x + SIGHT);
      const y0 = Math.floor(u.y - SIGHT), y1 = Math.ceil(u.y + SIGHT);
      for (let ty = Math.max(0, y0); ty <= Math.min(h - 1, y1); ty++)
        for (let tx = Math.max(0, x0); tx <= Math.min(w - 1, x1); tx++) {
          const i = ty * w + tx;
          if (this.visible[i]) continue;
          let cx = tx + 0.5, cy = ty + 0.5;
          const d = Math.hypot(cx - u.x, cy - u.y);
          if (d > SIGHT) continue;
          if (this.map.isWall(tx, ty) && d > 0.01) {
            // 벽은 보는 쪽 면까지만 확인
            cx -= ((cx - u.x) / d) * 0.55;
            cy -= ((cy - u.y) / d) * 0.55;
          }
          if (this.map.los(u.x, u.y, cx, cy)) {
            this.visible[i] = 1;
            this.seen[i] = 1;
          }
        }
    }
    this.seenUnits.clear();
    for (const e of this.units) {
      if (!e.alive || e.faction === 'party') continue;
      const tileVisible = this.visible[Math.floor(e.y) * w + Math.floor(e.x)] === 1;
      if (tileVisible || this.party.some((p) => p.alive && dist(p, e) <= SIGHT && this.map.los(p.x, p.y, e.x, e.y)))
        this.seenUnits.add(e);
    }
  }
}
