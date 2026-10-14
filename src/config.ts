/** World units per map tile; matches the KayKit dungeon 4×4 floor/wall pieces. */
export const TILE = 4;
/** Walls are 1 unit thick and centered on tile edges, so they intrude this far into open tiles. */
export const WALL_INSET = 0.5;

/**
 * Lantern oil replaces a fixed raid timer: it drains steadily, the light
 * shrinks with it, and an empty lantern forces a costly retreat.
 */
export const OIL = {capacity: 100, drainPerSecond: 100 / 540, warnAt: [0.3, 0.1]} as const;
/** Share of backpack stacks lost when the lantern runs dry. */
export const EXHAUST_LOSS = 0.5;
export const EXTRACT_SECONDS = 6;
export const EXTRACT_RADIUS = 2.6;
export const INTERACT_RANGE = 2.8;
export const CONTAINER_CLOSE_RANGE = 3.6;
export const BACKPACK_SIZE = {w: 6, h: 5} as const;
export const STASH_SIZE = {w: 10, h: 10} as const;

export const PLAYER = {
  radius: 0.55,
  baseHp: 100,
  walkSpeed: 6.2,
  sprintSpeed: 8.8,
  attackMoveFactor: 0.25,
  useMoveFactor: 0.45,
  maxStamina: 100,
  staminaRegen: 34,
  staminaRegenDelay: 0.55,
  sprintCost: 16,
  attackCost: 9,
  dodgeCost: 26,
  dodgeDuration: 0.42,
  dodgeSpeed: 17,
  dodgeIFrames: 0.3,
  /** Attack can be cancelled into a dodge once its hit frame has passed. */
  turnRate: 18,
  hurtStunThreshold: 14,
  hurtStun: 0.22,
  critChance: 0.12,
  critMultiplier: 1.6,
} as const;

/** Freeze-frame lengths (seconds) that sell the impact of a hit. */
export const HITSTOP = {light: 0.055, heavy: 0.09, kill: 0.11, playerHurt: 0.07} as const;

export const ENEMY = {
  warrior: {hp: 55, speed: 4.4, radius: 0.6, damage: 15, reach: 2.3, windup: 0.5, strike: 0.12, recover: 0.65, sight: 12, poise: 0},
  mage: {hp: 38, speed: 3.6, radius: 0.55, damage: 16, castRange: 15, windup: 0.85, cooldown: 2.4, boltSpeed: 11, sight: 15, preferred: 8},
  raider: {
    hp: 95,
    speed: 6,
    radius: 0.55,
    arrowDamage: 20,
    arrowSpeed: 24,
    aim: 0.75,
    shotCooldown: 1.5,
    knifeDamage: 12,
    knifeReach: 2.1,
    knifeWindup: 0.32,
    sight: 17,
    lootTime: 3,
  },
} as const;

export const SECOND_RAIDER_AT = 200;
