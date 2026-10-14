import type {Rng} from '../core/rng';
import {BASE_MODIFIERS, type RaidModifiers} from '../sim/modifiers';
import {itemDef} from './catalog';
import {addAuto, emptyGrid, makeItem, type Grid} from './inventory';

export type ContainerType =
  | 'barrel'
  | 'crate'
  | 'chest'
  | 'gold_chest'
  | 'trunk'
  | 'weapon_rack'
  | 'warrior_corpse'
  | 'mage_corpse'
  | 'raider_corpse'
  | 'pile';

type Entry = readonly [defId: string, weight: number, minQty: number, maxQty: number];

interface LootTable {
  rolls: readonly [number, number];
  grid: readonly [number, number];
  entries: readonly Entry[];
}

const JUNK: readonly Entry[] = [
  ['cracked_plate', 10, 1, 1],
  ['dusty_bottle', 10, 1, 1],
  ['candelabra', 6, 1, 1],
  ['old_keg', 3, 1, 1],
];

export const LOOT_TABLES: Readonly<Record<ContainerType, LootTable>> = {
  barrel: {rolls: [1, 2], grid: [3, 2], entries: [...JUNK, ['gold_coin', 8, 3, 12], ['iron_scrap', 6, 1, 3], ['bandage', 3, 1, 1], ['lamp_oil', 4, 1, 1]]},
  crate: {
    rolls: [2, 3],
    grid: [4, 3],
    entries: [...JUNK, ['gold_coin', 10, 5, 20], ['iron_scrap', 8, 1, 4], ['silverware', 3, 1, 1], ['bandage', 4, 1, 2], ['ancient_silk', 2, 1, 1], ['lamp_oil', 3, 1, 1]],
  },
  chest: {
    rolls: [3, 5],
    grid: [5, 4],
    entries: [
      ['gold_coin', 16, 10, 40],
      ['silverware', 6, 1, 1],
      ['candelabra', 6, 1, 1],
      ['ruby', 4, 1, 1],
      ['health_potion', 5, 1, 1],
      ['ancient_silk', 4, 1, 1],
      ['broken_crest', 3, 1, 1],
      ['lich_keyring', 2, 1, 1],
      ['golden_chalice', 1, 1, 1],
      ['bone_blade', 1.5, 1, 1],
    ],
  },
  gold_chest: {
    rolls: [4, 6],
    grid: [5, 4],
    entries: [
      ['gold_coin', 12, 30, 80],
      ['ruby', 8, 1, 3],
      ['golden_chalice', 4, 1, 1],
      ['crest_trophy', 3, 1, 1],
      ['bone_crown', 2, 1, 1],
      ['lich_keyring', 4, 1, 1],
      ['royal_coffer', 0.8, 1, 1],
      ['health_potion', 4, 1, 1],
      ['greatsword', 1, 1, 1],
    ],
  },
  trunk: {
    rolls: [2, 4],
    grid: [4, 4],
    entries: [
      ['leather_armor', 4, 1, 1],
      ['knight_plate', 1, 1, 1],
      ['ancient_silk', 5, 1, 1],
      ['gold_coin', 8, 5, 25],
      ['bandage', 6, 1, 3],
      ['health_potion', 3, 1, 1],
      ['silverware', 4, 1, 1],
      ['lamp_oil', 4, 1, 2],
    ],
  },
  weapon_rack: {
    rolls: [1, 2],
    grid: [4, 4],
    entries: [
      ['rusty_sword', 8, 1, 1],
      ['bone_blade', 4, 1, 1],
      ['bone_axe', 2, 1, 1],
      ['greatsword', 0.7, 1, 1],
      ['iron_scrap', 6, 2, 5],
      ['broken_crest', 3, 1, 1],
    ],
  },
  warrior_corpse: {rolls: [1, 2], grid: [4, 3], entries: [['bone_dust', 12, 1, 3], ['iron_scrap', 6, 1, 2], ['gold_coin', 6, 2, 10], ['rusty_sword', 1.5, 1, 1], ['bone_blade', 0.8, 1, 1]]},
  mage_corpse: {rolls: [1, 3], grid: [4, 3], entries: [['bone_dust', 8, 1, 3], ['mana_crystal', 6, 1, 1], ['gold_coin', 4, 5, 15], ['health_potion', 2, 1, 1], ['ancient_silk', 2, 1, 1]]},
  raider_corpse: {
    rolls: [4, 6],
    grid: [6, 4],
    entries: [
      ['gold_coin', 10, 20, 60],
      ['health_potion', 6, 1, 1],
      ['bandage', 6, 1, 3],
      ['lamp_oil', 5, 1, 2],
      ['ruby', 4, 1, 2],
      ['lich_keyring', 3, 1, 1],
      ['silverware', 4, 1, 1],
      ['knight_plate', 1.2, 1, 1],
      ['bone_axe', 2, 1, 1],
      ['golden_chalice', 1.5, 1, 1],
    ],
  },
  pile: {rolls: [0, 0], grid: [6, 6], entries: []},
};

export const CONTAINER_LABEL: Readonly<Record<ContainerType, string>> = {
  barrel: '통',
  crate: '나무 상자',
  chest: '보물상자',
  gold_chest: '황금 보물상자',
  trunk: '여행 가방',
  weapon_rack: '무기 거치대',
  warrior_corpse: '해골 전사의 유해',
  mage_corpse: '해골 마법사의 유해',
  raider_corpse: '약탈자의 시체',
  pile: '떨어진 물건',
};

const RARE_TIERS = new Set(['rare', 'epic', 'legendary']);

/** Expected-value preserving rounding: 2.3 becomes 3 with 30% chance. */
function stochasticRound(value: number, rng: Rng): number {
  const base = Math.floor(value);
  return base + (rng.chance(value - base) ? 1 : 0);
}

/** Rolls a container's contents into a fresh grid; items that do not fit are dropped. */
export function rollContainer(type: ContainerType, rng: Rng, mods: RaidModifiers = BASE_MODIFIERS): Grid {
  const table = LOOT_TABLES[type];
  let grid = emptyGrid(table.grid[0], table.grid[1]);
  const baseRolls = table.rolls[1] > 0 ? rng.int(table.rolls[0], table.rolls[1]) : 0;
  const rolls = stochasticRound(baseRolls * mods.lootQuantity, rng);
  const weighted = table.entries.map(e => [e, RARE_TIERS.has(itemDef(e[0]).rarity) ? e[1] * mods.rareFind : e[1]] as const);
  for (let i = 0; i < rolls; i++) {
    const [defId, , min, max] = rng.weighted(weighted);
    grid = addAuto(grid, makeItem(defId, rng.int(min, max))).grid;
  }
  return grid;
}
