import type {Vector3} from 'three';

export type Team = 'hero' | 'enemy';
export type HeroType = 'Knight' | 'Rogue_Hooded' | 'Mage';
export type ActorName = HeroType | 'Skeleton_Warrior' | 'Skeleton_Mage';
export type EnemyKind = 'brute' | 'stalker' | 'caster' | 'boss' | 'guardian';
export type MonsterBehavior = 'charge' | 'hunter' | 'backline';
export type AnimationType = 'idle' | 'walk' | 'attack' | 'hit' | 'death';
export type ProjectileKind = 'arrow' | 'spell';

export type Point = readonly [x: number, y: number];
export interface Tile {
  x: number;
  y: number;
}

export interface EnemyVariant {
  label: string;
  tint: number;
  glow: number;
  behavior: MonsterBehavior;
  hp: number;
  damage: number;
  range: number;
  cooldown: number;
}

/** Scene-graph side of an actor. The simulation only talks to this interface. */
export interface ActorView {
  play(type: AnimationType, force?: boolean): void;
  /** Duration of the currently playing clip in seconds (0 when none). */
  clipDuration(): number;
  tick(dt: number): void;
  place(pos: Vector3): void;
  faceTowards(from: Vector3, to: Vector3): void;
  setFacing(angle: number): void;
  /** Eases the model back to the ground after a hit bump. */
  settle(dt: number): void;
  bump(amount: number): void;
  fadeOut(dt: number, dyingTime: number): void;
  /** Switches back to the idle pose if currently walking. */
  idleIfWalking(): void;
  setVisible(visible: boolean): void;
  setRingVisible(visible: boolean): void;
  scaleBy(factor: number): void;
  dispose(): void;
}

export interface BossWarning {
  center: Vector3;
  time: number;
  dispose(): void;
  setOpacity(value: number): void;
}

export interface Actor {
  readonly name: ActorName;
  readonly team: Team;
  readonly view: ActorView;
  pos: Vector3;
  hp: number;
  readonly max: number;
  damage: number;
  readonly range: number;
  readonly cooldown: number;
  timer: number;
  dead: boolean;
  dying?: number;
  behavior: MonsterBehavior | null;
  variant: EnemyVariant | null;
  rosterId?: number;
  dungeonRoom?: number;

  isBoss?: boolean;
  bossCooldown?: number;
  warning?: BossWarning | null;

  lastAction?: string;
  actionTime?: number;
  target?: Actor | null;

  tacticCooldowns?: Record<string, number>;
  tauntedBy?: Actor | null;
  tauntTime?: number;
  guard?: Actor | null;
  guardTime?: number;
  guardFactor?: number;
  counterGuard?: boolean;
  focus?: Actor | null;
  focusTime?: number;
  focusBonus?: number;
  kiteBonusTime?: number;
  retreat?: Vector3 | null;
  retreatTime?: number;

  stagger?: number;
  knockback?: number;
  knockDirection?: Vector3;

  path?: Vector3[];
  pathGoal?: Vector3 | null;
  pathAge?: number;
}

export interface RosterHero {
  id: number;
  type: HeroType;
  hp: number;
  alive: boolean;
}

export interface Guild {
  supplies: number;
  nextId: number;
  expeditions: number;
  deepest: number;
  roster: RosterHero[];
  activeExpedition?: boolean;
}

export type UpgradeKey = 'attack' | 'health' | 'healing' | 'dodge';
export type TacticId =
  | 'taunt'
  | 'protect'
  | 'execute'
  | 'kite'
  | 'heal'
  | 'aoe'
  | 'ironwall'
  | 'snipe'
  | 'barrier';

export interface Progress {
  wins: number;
  gold: number;
  stage: number;
  highestStage: number;
  farming: boolean;
  tacticLevels: Record<TacticId, number>;
  upgrades: Record<UpgradeKey, number>;
  loadout: Record<HeroType, TacticId[]>;
}
