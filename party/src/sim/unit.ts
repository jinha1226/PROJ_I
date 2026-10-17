import { ABILITIES } from '../data/abilities';
import type { AbilityDef, Faction, ResistKey, SkillId, StatusDef, TacticId, UnitDef, WeaponDef } from './defs';
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

  aware = false;
  aggro = new Map<number, number>();
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
