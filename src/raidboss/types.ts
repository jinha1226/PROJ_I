import type {Vec2} from '../core/math';

export type Role = 'tank' | 'melee' | 'ranged' | 'healer';
export type UnitKind = Role | 'boss' | 'add';

export interface Unit extends Vec2 {
  readonly id: number;
  readonly kind: UnitKind;
  readonly team: 'party' | 'enemy';
  name: string;
  vx: number;
  vz: number;
  r: number;
  facing: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  speed: number;
  /** Basic attack. */
  damage: number;
  reach: number;
  attackTime: number;
  attackTimer: number;
  /** Seconds left of an action that roots the unit (casting, swinging, dodging). */
  busy: number;
  /** Seconds of dodge invulnerability left. */
  iframes: number;
  /** Damage taken multiplier while > 0 (tank block). */
  guard: number;
  cooldowns: Record<string, number>;
  /** Party: is the human driving this one? */
  controlled: boolean;
  /** Enemies: threat per party unit id. */
  threat: Map<number, number>;
  target: number | null;
  /** Visual state for animation. */
  anim: 'idle' | 'move' | 'attack' | 'cast' | 'dodge' | 'hit' | 'dead' | 'block';
  /** Set by walk() each frame; animation falls back to idle when false. */
  moving: boolean;
  animSerial: number;
  meter: {damage: number; healing: number; taken: number};
}

/** A telegraphed area that resolves after a delay. */
export interface Hazard {
  readonly id: number;
  shape: 'circle' | 'cone';
  x: number;
  z: number;
  radius: number;
  /** Cone direction and half-angle (radians). */
  angle: number;
  halfArc: number;
  /** Follows this unit until it resolves (death mark). */
  follow: number | null;
  /** Seconds until it goes off. */
  timer: number;
  readonly total: number;
  damage: number;
  name: string;
  /** Who is meant to stand in it (the marked player takes reduced damage). */
  owner: number | null;
}

export interface BossCast {
  name: string;
  timer: number;
  total: number;
}

export type Order = 'none' | 'stack' | 'spread';

export interface RaidInput {
  move: Vec2;
  aim: Vec2;
  attack: boolean;
  dodge: boolean;
  /** Role ability 1 / 2. */
  skill1: boolean;
  skill2: boolean;
  order: Order | null;
}

export type RaidEvent =
  | {type: 'hit'; source: number; target: number; amount: number; crit: boolean; x: number; z: number; kind: 'melee' | 'ranged' | 'magic' | 'boss'}
  | {type: 'heal'; source: number; target: number; amount: number; x: number; z: number}
  | {type: 'death'; unit: number}
  | {type: 'cast'; unit: number; name: string; duration: number}
  | {type: 'hazard'; hazard: Hazard}
  | {type: 'hazardEnd'; id: number; x: number; z: number; shape: Hazard['shape']; radius: number}
  | {type: 'shot'; from: number; to: number; kind: 'arrow' | 'bolt' | 'heal'}
  | {type: 'dodge'; unit: number}
  | {type: 'evade'; unit: number}
  | {type: 'taunt'; unit: number}
  | {type: 'spawn'; unit: number}
  | {type: 'phase'; text: string}
  | {type: 'order'; order: Order}
  | {type: 'end'; win: boolean};
