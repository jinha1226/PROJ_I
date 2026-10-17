import { ABILITIES } from '../data/abilities';
import type { AbilityDef, Faction, ResistKey, SkillId, StatusDef, TacticId, UnitDef } from './defs';
import type { Pt } from './map';

export type Intent =
  | { type: 'move'; x: number; y: number; kite?: boolean }
  | { type: 'attack'; target: Unit }
  | { type: 'ability'; slot: number; target: Unit | null; x: number; y: number };

export interface Command {
  intent: Intent;
  bestDist: number;
  lastProgress: number;
}

export interface AbilityState {
  def: AbilityDef;
  cd: number;
  /** 자동전투에서 이 스킬을 쓸지 */
  auto: boolean;
  /** 자동전투 우선순위 (클수록 먼저) */
  prio: number;
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

const ALL_SKILLS: SkillId[] = [
  'fighting', 'sword', 'axe', 'mace', 'spear', 'bow', 'armour', 'dodge', 'shield',
  'spellcasting', 'fire', 'ice', 'earth', 'necro', 'summon', 'faith',
];

/** 파티원, 몬스터, (이후) 소환수가 공유하는 단일 유닛 타입 */
export class Unit {
  readonly id: number;
  readonly def: UnitDef;
  readonly faction: Faction;
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
  statuses: StatusInst[] = [];
  stats!: Stats;

  tactic: TacticId;
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

  constructor(id: number, def: UnitDef, faction: Faction, x: number, y: number) {
    this.id = id;
    this.def = def;
    this.faction = faction;
    this.name = def.name;
    this.x = x;
    this.y = y;
    this.radius = def.radius;
    this.tactic = def.tactic;
    this.skills = Object.fromEntries(ALL_SKILLS.map((s) => [s, def.skills?.[s] ?? 0])) as Record<SkillId, number>;
    this.abilities = def.abilities.map((id, i) => {
      const a = ABILITIES[id];
      if (!a) throw new Error(`unknown ability ${id}`);
      return { def: a, cd: 0, auto: true, prio: def.abilities.length - i };
    });
  }

  hasStatus(id: string): StatusInst | undefined {
    return this.statuses.find((s) => s.def.id === id);
  }

  get hpFrac() {
    return this.hp / this.stats.maxHp;
  }

  get isRanged() {
    return this.def.weapon.range > 1.5;
  }
}
