import type {Vec2} from '../core/math';
import type {Grid} from '../items/inventory';
import type {ContainerType} from '../items/loot';
import type {SlotId} from '../items/stores';
import type {EnemyKind} from '../world/mapgen';

export interface Body extends Vec2 {
  readonly id: number;
  vx: number;
  vz: number;
  r: number;
  /** Radians; 0 faces +z. */
  facing: number;
}

export interface Fighter extends Body {
  hp: number;
  maxHp: number;
  alive: boolean;
}

export interface AttackStep {
  clip: string;
  /** Fraction of the source clip at which the blade connects; drives playback speed. */
  clipHit: number;
  duration: number;
  hitTime: number;
  damageMul: number;
  /** Total swing arc in radians. */
  arc: number;
  heavy: boolean;
  lunge: number;
  /** Which way the slash trail sweeps. */
  sweep: 'left' | 'right' | 'down' | 'spin' | 'thrust';
}

export type PlayerState = 'idle' | 'move' | 'attack' | 'dodge' | 'hurt' | 'use' | 'dead';

export interface Player extends Fighter {
  state: PlayerState;
  stateTime: number;
  stamina: number;
  staminaDelay: number;
  combo: number;
  comboQueued: boolean;
  comboWindow: number;
  step: AttackStep | null;
  hitDone: boolean;
  dodgeDir: Vec2;
  iframes: number;
  sprinting: boolean;
  usingSlot: SlotId | null;
  /** 0..1 of top speed, for picking walk/run animations. */
  moveAmount: number;
  /** Seconds since last damage, for regen-free tension and UI. */
  sinceHurt: number;
}

export type EnemyState =
  | 'dormant'
  | 'waking'
  | 'idle'
  | 'roam'
  | 'loot'
  | 'chase'
  | 'windup'
  | 'strike'
  | 'recover'
  | 'cast'
  | 'aim'
  | 'dodge'
  | 'use'
  | 'hurt'
  | 'dead';

export interface Enemy extends Fighter {
  kind: EnemyKind;
  state: EnemyState;
  stateTime: number;
  /** How long the current state lasts (when timed). */
  stateDuration: number;
  alerted: boolean;
  cooldown: number;
  dodgeCooldown: number;
  strafeDir: 1 | -1;
  strafeTimer: number;
  lostTimer: number;
  sightTimer: number;
  canSee: boolean;
  poiseHits: number;
  poiseTimer: number;
  /** Raider-only: container being looted and the bag it fills. */
  lootTarget: number | null;
  visited: Set<number>;
  bag: Grid | null;
  potions: number;
  corpse: number | null;
  /** Skip work for far, unalerted enemies. */
  sleeping: boolean;
}

export interface Projectile extends Vec2 {
  readonly id: number;
  kind: 'bolt' | 'arrow';
  vx: number;
  vz: number;
  damage: number;
  life: number;
  r: number;
  evaded: boolean;
}

export interface Container extends Vec2 {
  readonly id: number;
  type: ContainerType;
  rot: number;
  gridId: string;
  /** Uids in reveal order; items not in this list (put there by the player) are visible. */
  revealOrder: number[];
  revealed: number;
  searchTimer: number;
  opened: boolean;
  enemyId: number | null;
}

export interface ExtractZone extends Vec2 {
  name: string;
}

export interface SimInput {
  /** World-space movement direction, length <= 1. */
  move: Vec2;
  /** World-space point under the cursor. */
  aim: Vec2;
  attack: boolean;
  dodge: boolean;
  sprint: boolean;
  interact: boolean;
  use: SlotId | null;
  /** Inventory is open: mouse buttons belong to the UI. */
  uiBlocked: boolean;
}

export const idleInput = (): SimInput => ({
  move: {x: 0, z: 0},
  aim: {x: 0, z: 1},
  attack: false,
  dodge: false,
  sprint: false,
  interact: false,
  use: null,
  uiBlocked: false,
});

export type Outcome = 'extracted' | 'exhausted' | 'dead' | 'forfeit';

export type SimEvent =
  | {type: 'swing'; actor: number; step: AttackStep; combo: number}
  | {type: 'hit'; target: number; source: number; x: number; z: number; damage: number; crit: boolean; killed: boolean; heavy: boolean; dirX: number; dirZ: number}
  | {type: 'playerHurt'; damage: number; x: number; z: number; dirX: number; dirZ: number; heavy: boolean}
  | {type: 'dodge'; actor: number; x: number; z: number; dirX: number; dirZ: number}
  | {type: 'evade'; x: number; z: number}
  | {type: 'windup'; enemy: number; duration: number; reach: number; arc: number}
  | {type: 'strike'; enemy: number}
  | {type: 'cast'; enemy: number; duration: number}
  | {type: 'aim'; enemy: number; duration: number}
  | {type: 'shoot'; projectile: Projectile}
  | {type: 'projectileEnd'; id: number; x: number; z: number; kind: Projectile['kind']; hitWall: boolean}
  | {type: 'alert'; enemy: number}
  | {type: 'awaken'; enemy: number}
  | {type: 'death'; actor: number}
  | {type: 'containerOpen'; container: number}
  | {type: 'reveal'; container: number; defId: string; uid: number}
  | {type: 'useStart'; actor: number; duration: number}
  | {type: 'healed'; actor: number; amount: number}
  | {type: 'raiderLoot'; enemy: number; container: number}
  | {type: 'extractStart'; zone: number}
  | {type: 'extractCancel'}
  | {type: 'outcome'; outcome: Outcome}
  | {type: 'notice'; text: string; tone: 'info' | 'warn' | 'good'};
