/**
 * Multipliers the incremental meta-game will raise over time. The raid only
 * reads them, so upgrades never need to touch combat or loot code.
 */
export interface RaidModifiers {
  /** Search speed: 2 reveals items twice as fast. */
  readonly lootSpeed: number;
  /** Scales how many items each container rolls. */
  readonly lootQuantity: number;
  /** Scales the roll weight of rare-or-better items. */
  readonly rareFind: number;
  /** Scales lantern oil capacity. */
  readonly oilCapacity: number;
  /** Scales oil burn rate; 0.5 burns half as fast. */
  readonly oilDrain: number;
  readonly damageMul: number;
  readonly critBonus: number;
  readonly maxHpBonus: number;
  readonly staminaBonus: number;
  readonly healMul: number;
  /** Auto-return node level; 0 = locked. */
  readonly autoReturn: number;
  /** Auto-explore node level; 0 = locked. */
  readonly autoExplore: number;
  /** Auto-battle node level; 0 = locked. */
  readonly autoBattle: number;
}

export const BASE_MODIFIERS: RaidModifiers = {
  lootSpeed: 1,
  lootQuantity: 1,
  rareFind: 1,
  oilCapacity: 1,
  oilDrain: 1,
  damageMul: 1,
  critBonus: 0,
  maxHpBonus: 0,
  staminaBonus: 0,
  healMul: 1,
  autoReturn: 0,
  autoExplore: 0,
  autoBattle: 0,
};
