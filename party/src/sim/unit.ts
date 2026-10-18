import type { BossState } from './boss';
import { ABILITIES } from '../data/abilities';
import type { AbilityDef, Faction, Prop, ResistKey, SkillId, StatusDef, TacticId, UnitDef, WeaponDef } from './defs';
import type { Hero } from './hero';
import { addItem, addProp, emptyBonus, weaponOf, type Bonus } from './items';
import type { Pt } from './map';

export type Intent =
  | { type: 'move'; x: number; y: number; kite?: boolean }
  | { type: 'attack'; target: Unit }
  | { type: 'ability'; slot: number; target: Unit | null; x: number; y: number };

export interface Command {
  intent: Intent;
  bestDist: number;
  lastProgress: number;
  issuedAt: number;
  /** 여럿이 함께 받은 이동 명령의 묶음 번호 (진형 유지용) */
  group?: number;
}

/** 진형: 전열은 앞장서고, 후열은 함께 이동할 때 전열을 앞지르지 않는다 */
export type Row = 'front' | 'back';

export function defaultRow(def: UnitDef): Row {
  return def.role === 'tank' || def.role === 'melee' ? 'front' : 'back';
}

export interface AbilityState {
  def: AbilityDef;
  cd: number;
  /** 자동전투에서 이 스킬을 쓸지 */
  auto: boolean;
  /** 자동전투 우선순위 (클수록 먼저) */
  prio: number;
  /** 스킬바에 표시하지 않음 (자동 전용). 항상 목록 끝에 온다 */
  hidden?: boolean;
  /** 강화 단계 (레벨업 선택). 단계마다 위력 +25%, 재사용 대기 -15% */
  rank?: number;
  /** 수동 전용: AI 가 쓰지 않는다 (레벨업으로 배운 강한 기술 = 플레이어의 몫) */
  manualOnly?: boolean;
}

export interface StatusInst {
  def: StatusDef;
  time: number;
  stacks: number;
  source: Unit | null;
  tick: number;
}

export interface CastState {
  slot: number;
  target: Unit | null;
  x: number;
  y: number;
  time: number;
  total: number;
}

export interface Stats {
  maxHp: number;
  maxMp: number;
  ac: number;
  ev: number;
  will: number;
  acc: number;
  moveSpeed: number;
  actionMult: number;
  dmgMult: number;
  dmgTakenMult: number;
  resists: Record<ResistKey, number>;
  stunned: boolean;
}

export const ALL_SKILLS: SkillId[] = [
  'fighting', 'sword', 'axe', 'mace', 'spear', 'bow', 'armour', 'dodge', 'shield',
  'spellcasting', 'fire', 'ice', 'earth', 'necro', 'summon', 'faith',
];

/** 파티원, 몬스터, (이후) 소환수가 공유하는 단일 유닛 타입 */
export class Unit {
  readonly id: number;
  readonly def: UnitDef;
  readonly faction: Faction;
  /** 파티원이면 층을 넘어 이어지는 성장 데이터 */
  readonly hero: Hero | null;
  name: string;
  x: number;
  y: number;
  radius: number;
  hp = 0;
  mp = 0;
  alive = true;
  deathTime = 0;

  skills: Record<SkillId, number>;
  abilities: AbilityState[];
  /** 장착 무기 (장비가 없으면 기본 공격) */
  weapon: WeaponDef;
  /** 장비 + 레벨업 보너스 합계 */
  bonus: Bonus;
  tags: string[];
  /** 층 깊이에 따른 몬스터 강화 배율 */
  scale = { hp: 1, dmg: 1 };
  statuses: StatusInst[] = [];
  stats!: Stats;

  tactic: TacticId;
  row: Row;
  autoMode = true;
  /** 피격 밀림 (화면 표시만, 타일 단위) */
  kickX = 0;
  kickY = 0;
  command: Command | null = null;
  intent: Intent | null = null;
  aiTimer = 0;
  cast: CastState | null = null;
  attackCd = 0;

  path: Pt[] = [];
  pathGoal: Pt | null = null;
  repathAt = 0;
  moving = false;
  facing = 1;
  /** 플레이어가 지정한 위치 고수 지점 (전투 종료 시 해제) */
  holdPos: Pt | null = null;

  /** 붕괴 상태의 명령 거부 판정 (sim/stress.ts obeys) */
  obeyUntil = 0;
  refuseUntil = 0;

  /** 근접 콤보: 다음 타 번호 (0 · 1 · 2, 2 = 마무리 타). 화면은 swingStep 으로 동작을 고른다 */
  combo = 0;
  comboAt = -9;
  comboTarget: Unit | null = null;
  swingStep = 0;
  /** 넉백 속도 (타일/초) */
  vx = 0;
  vy = 0;
  /** 돌진: 남은 시간 · 대상 · 다시 쓰기까지 */
  dashT = 0;
  dashTarget: Unit | null = null;
  /** 대상 없는 돌진 = 구르기 (주장 회피) 방향 */
  dashDir: { x: number; y: number } | null = null;
  /** 파티 시너지 보너스 (방에 들어설 때 정해진다) */
  synergy: Prop[] = [];
  dashCd = 0;
  /** 소환한 유닛 (소환수 수 제한용) */
  summoner: Unit | null = null;
  /** 불굴(undying) 특성을 이번 층에 썼는가 */
  undyingUsed = false;

  aware = false;
  /** 적: 파티원 id → 위협 수치 (sim/threat.ts) */
  aggro = new Map<number, number>();
  aggroTarget: Unit | null = null;
  /** 레이드 보스 스크립트 상태 (sim/boss.ts) */
  script: BossState | null = null;
  lastTarget: Unit | null = null;
  flash = 0;
  swing = 0;

  constructor(id: number, def: UnitDef, faction: Faction, x: number, y: number, hero: Hero | null = null) {
    this.id = id;
    this.def = def;
    this.faction = faction;
    this.hero = hero;
    this.name = def.name;
    this.x = x;
    this.y = y;
    this.radius = def.radius;
    this.weapon = def.weapon;
    this.bonus = emptyBonus();
    this.tags = def.tags ?? [];
    if (hero) {
      // 스킬과 기술 목록은 영웅 데이터를 그대로 공유한다 (전투 중 훈련이 바로 남는다)
      this.skills = hero.skills;
      this.abilities = hero.abilities;
      this.tactic = hero.tactic;
      this.row = hero.row;
      this.autoMode = hero.autoMode;
      this.refreshGear();
    } else {
      this.tactic = def.tactic;
      this.row = defaultRow(def);
      this.skills = Object.fromEntries(ALL_SKILLS.map((s) => [s, def.skills?.[s] ?? 0])) as Record<SkillId, number>;
      this.abilities = abilityStates(def.abilities, def.autoAbilities);
    }
  }

  /** 장비·레벨업 보너스를 다시 합산한다 */
  refreshGear() {
    const h = this.hero;
    if (!h) return;
    const b = emptyBonus();
    for (const it of Object.values(h.gear)) if (it) addItem(b, it);
    for (const p of h.perks) addProp(b, p);
    for (const p of h.def.traits ?? []) addProp(b, p);
    for (const p of this.synergy) addProp(b, p);
    this.bonus = b;
    this.weapon = h.gear.weapon ? weaponOf(h.gear.weapon) : this.def.weapon;
    if (b.onHit.length && !this.weapon.onHit) this.weapon = { ...this.weapon, onHit: b.onHit[0] };
    this.tags = [...(this.def.tags ?? []), ...b.tags];
  }

  get level() {
    return this.hero?.xl ?? 1;
  }
  get str() {
    return this.def.str + this.bonus.str;
  }
  get dex() {
    return this.def.dex + this.bonus.dex;
  }
  get int() {
    return this.def.int + this.bonus.int;
  }
  /** 갑옷 무게: 영웅은 장착 갑옷, 몬스터는 정의값 */
  get armourWeight() {
    return this.hero ? this.bonus.weight : this.def.armourWeight ?? 0;
  }

  /** 특수 태그 개수 (종족 특성과 특성 선택이 겹치면 효과가 쌓이는 것들) */
  tagCount(t: string): number {
    let n = 0;
    for (const x of this.tags) if (x === t) n++;
    return n;
  }

  hasStatus(id: string): StatusInst | undefined {
    return this.statuses.find((s) => s.def.id === id);
  }

  get hpFrac() {
    return this.hp / this.stats.maxHp;
  }

  get isRanged() {
    return this.weapon.range > 1.5;
  }
}

/** 기술 id 목록 → 기술 상태. 자동 전용 기술은 끝에 숨김으로 붙는다 */
export function abilityStates(manual: string[], autoOnly: string[] = []): AbilityState[] {
  const ids = [...manual, ...autoOnly];
  return ids.map((id, i) => {
    const a = ABILITIES[id];
    if (!a) throw new Error(`unknown ability ${id}`);
    return { def: a, cd: 0, auto: true, prio: ids.length - i, hidden: i >= manual.length, rank: 0 };
  });
}
