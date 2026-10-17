import { dist, Rng } from '../core/rng';
import type { MapDef } from '../data/maps';
import { MONSTERS, PARTY } from '../data/units';
import { updateUnit } from './behavior';
import { GameMap } from './map';
import { resolveCollisions } from './movement';
import { computeStats } from './stats';
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
}

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

export const SIGHT = 8;

export class World {
  readonly map: GameMap;
  readonly rng: Rng;
  units: Unit[] = [];
  party: Unit[] = [];
  projectiles: Projectile[] = [];
  fx: Fx[] = [];
  floaters: Floater[] = [];
  logs: LogLine[] = [];
  time = 0;
  focusTarget: Unit | null = null;
  leader: Unit | null = null;
  inCombat = false;
  outcome: 'victory' | 'defeat' | null = null;
  readonly visible: Uint8Array;
  readonly seen: Uint8Array;
  private nextId = 1;
  private visTimer = 0;
  private awareTimer = 0;
  private calmTimer = 0;

  constructor(def: MapDef, seed: number) {
    this.rng = new Rng(seed);
    this.map = GameMap.fromDef(def);
    this.visible = new Uint8Array(this.map.w * this.map.h);
    this.seen = new Uint8Array(this.map.w * this.map.h);
    PARTY.forEach((d, i) => {
      const [x, y] = def.partyStart[i];
      this.party.push(this.spawn(d.id, 'party', x + 0.5, y + 0.5));
    });
    this.leader = this.party[0];
    for (const s of def.spawns) this.spawn(s.id, 'enemy', s.x + 0.5, s.y + 0.5);
    this.updateVisibility();
    this.log('던전에 들어섰다. [Space] 일시정지 · [H] 도움말', '#cccccc');
  }

  spawn(id: string, faction: 'party' | 'enemy', x: number, y: number): Unit {
    const def = faction === 'party' ? PARTY.find((p) => p.id === id)! : MONSTERS[id];
    if (!def) throw new Error(`unknown unit ${id}`);
    const u = new Unit(this.nextId++, def, faction, x, y);
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
    return this.visible[Math.floor(u.y) * this.map.w + Math.floor(u.x)] === 1;
  }
  /** AI 가 인지하고 있는 적 목록 */
  knownEnemies(u: Unit): Unit[] {
    if (u.faction === 'party') return this.hostilesOf(u).filter((e) => this.isVisible(e) && dist(u, e) < 10);
    if (!u.aware) return [];
    return this.hostilesOf(u).filter((e) => dist(u, e) < 14);
  }

  // ── 플레이어 명령 ──
  private issue(u: Unit, intent: Intent) {
    if (!u.alive) return;
    if (u.cast) this.cancelCast(u, '', false);
    u.command = { intent, bestDist: Infinity, lastProgress: this.time };
    u.intent = null;
  }

  commandMove(units: Unit[], x: number, y: number) {
    const live = units.filter((u) => u.alive);
    if (!live.length) return;
    const hold = live.length === 1 || this.inCombat;
    if (live.length === 1) {
      const p = this.map.nearestFloor(x, y);
      this.issue(live[0], { type: 'move', x: p.x, y: p.y });
      live[0].holdPos = p;
      this.leader = live[0];
      return;
    }
    // 대형: 목표 주변 바닥 칸을 고르고, 목표에 가까운 유닛일수록 무리에서 먼 칸을 맡긴다.
    // (좁은 통로에서 서로 엇갈려 지나가야 하는 배정을 피한다)
    const slots = this.map.nearbyFloorSlots(x, y, live.length);
    slots[0] = this.map.nearestFloor(x, y);
    const c = { x: live.reduce((s, u) => s + u.x, 0) / live.length, y: live.reduce((s, u) => s + u.y, 0) / live.length };
    slots.sort((a, b) => dist(b, c) - dist(a, c));
    const order = [...live].sort((a, b) => dist(a, { x, y }) - dist(b, { x, y }));
    order.forEach((u, i) => {
      const p = slots[Math.min(i, slots.length - 1)];
      this.issue(u, { type: 'move', x: p.x, y: p.y });
      u.holdPos = hold ? p : null;
    });
    this.leader = order[0];
  }

  commandAttack(units: Unit[], target: Unit) {
    for (const u of units) {
      this.issue(u, { type: 'attack', target });
      u.holdPos = null;
    }
  }

  commandAbility(u: Unit, slot: number, target: Unit | null, x: number, y: number) {
    this.issue(u, { type: 'ability', slot, target, x, y });
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
    this.log(`${u.name} 쓰러짐${by ? ` (${by.name})` : ''}`, u.faction === 'party' ? '#ff6666' : '#aaaaaa');
    if (this.focusTarget === u) this.focusTarget = null;
    if (this.leader === u) this.leader = this.party.find((p) => p.alive) ?? null;
    if (u.def.boss) {
      this.outcome = 'victory';
      this.log('오우거 족장을 쓰러뜨렸다! 승리!', '#ffe14d');
    }
    if (u.faction === 'party' && this.party.every((p) => !p.alive)) {
      this.outcome = 'defeat';
      this.log('파티가 전멸했다...', '#ff4444');
    }
  }

  // ── 시뮬레이션 ──
  tick(dt: number) {
    this.time += dt;

    this.awareTimer -= dt;
    if (this.awareTimer <= 0) {
      this.awareTimer = 0.2;
      this.updateAwareness();
      this.updateCombatState(0.2);
    }

    for (const u of this.units) if (u.alive) updateUnit(this, u, dt);
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
      if (!this.inCombat) this.log('전투 시작!', '#ffaa66');
      this.inCombat = true;
      this.calmTimer = 0;
    } else if (this.inCombat) {
      this.calmTimer += dt;
      if (this.calmTimer > 1.5) {
        this.inCombat = false;
        for (const p of this.party) p.holdPos = null;
        this.log('전투 종료', '#88cc88');
      }
    }
  }

  updateVisibility() {
    const { w, h } = this.map;
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
  }
}
