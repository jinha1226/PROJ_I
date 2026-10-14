import {BACKPACK_SIZE, STASH_SIZE} from '../config';
import {addAuto, makeItem, removeItem, replaceItem, type Grid} from '../items/inventory';
import type {Profile} from './profile';
import {deriveBonuses, isUnlocked, levelOf, NODE_BY_ID, type Cost} from './upgrades';

export interface Recipe {
  id: string;
  output: readonly [defId: string, qty: number];
  inputs: readonly (readonly [defId: string, qty: number])[];
  gold: number;
  requires: {node: string; level: number};
}

export const RECIPES: readonly Recipe[] = [
  {id: 'bandage', output: ['bandage', 2], inputs: [['dusty_bottle', 1], ['bone_dust', 1]], gold: 0, requires: {node: 'alchemist.brewing', level: 1}},
  {id: 'health_potion', output: ['health_potion', 1], inputs: [['bone_dust', 2], ['dusty_bottle', 1]], gold: 10, requires: {node: 'alchemist.brewing', level: 1}},
  {id: 'lamp_oil', output: ['lamp_oil', 2], inputs: [['old_keg', 1]], gold: 0, requires: {node: 'alchemist.brewing', level: 1}},
  {id: 'bone_blade', output: ['bone_blade', 1], inputs: [['iron_scrap', 4], ['bone_dust', 3]], gold: 50, requires: {node: 'blacksmith.weapons', level: 1}},
  {id: 'bone_axe', output: ['bone_axe', 1], inputs: [['iron_scrap', 8], ['bone_dust', 4]], gold: 100, requires: {node: 'blacksmith.weapons', level: 2}},
  {id: 'greatsword', output: ['greatsword', 1], inputs: [['iron_scrap', 12], ['mana_crystal', 2], ['broken_crest', 1]], gold: 200, requires: {node: 'blacksmith.weapons', level: 3}},
  {id: 'leather_armor', output: ['leather_armor', 1], inputs: [['ancient_silk', 2], ['iron_scrap', 2]], gold: 40, requires: {node: 'blacksmith.armor', level: 1}},
  {id: 'knight_plate', output: ['knight_plate', 1], inputs: [['iron_scrap', 14], ['broken_crest', 1]], gold: 250, requires: {node: 'blacksmith.armor', level: 2}},
];

export const recipesFor = (node: string): Recipe[] => RECIPES.filter(r => r.requires.node === node);

/** Materials are taken from the stash first, then the backpack. */
const SOURCES = ['stash', 'backpack'] as const;

export function countItem(profile: Profile, defId: string): number {
  return SOURCES.reduce((sum, g) => sum + profile[g].items.filter(p => p.item.defId === defId).reduce((s, p) => s + p.item.qty, 0), 0);
}

export function canPay(profile: Profile, cost: Cost): boolean {
  return profile.gold >= cost.gold && cost.items.every(([id, qty]) => countItem(profile, id) >= qty);
}

function takeFrom(grid: Grid, defId: string, qty: number): {grid: Grid; left: number} {
  let left = qty;
  let next = grid;
  for (const p of grid.items) {
    if (left <= 0) break;
    if (p.item.defId !== defId) continue;
    const take = Math.min(left, p.item.qty);
    left -= take;
    next = take >= p.item.qty ? removeItem(next, p.item.uid) : replaceItem(next, {...p.item, qty: p.item.qty - take});
  }
  return {grid: next, left};
}

export function pay(profile: Profile, cost: Cost): Profile | null {
  if (!canPay(profile, cost)) return null;
  let next: Profile = {...profile, gold: profile.gold - cost.gold};
  for (const [defId, qty] of cost.items) {
    let left = qty;
    for (const g of SOURCES) {
      const r = takeFrom(next[g], defId, left);
      next = {...next, [g]: r.grid};
      left = r.left;
    }
  }
  return next;
}

/** Grows (never shrinks) a grid to at least the given size, keeping item positions. */
function grown(grid: Grid, w: number, h: number): Grid {
  return grid.w >= w && grid.h >= h ? grid : {...grid, w: Math.max(grid.w, w), h: Math.max(grid.h, h)};
}

/** Applies size-changing bonuses (bag / stash rows) to the profile's grids. */
export function applyGridBonuses(profile: Profile): Profile {
  const b = deriveBonuses(profile.upgrades);
  return {
    ...profile,
    backpack: grown(profile.backpack, BACKPACK_SIZE.w, BACKPACK_SIZE.h + b.backpackRows),
    stash: grown(profile.stash, STASH_SIZE.w, STASH_SIZE.h + b.stashRows),
  };
}

export type PurchaseError = 'maxed' | 'locked' | 'soon' | 'cost';

export function purchaseCheck(profile: Profile, nodeId: string): PurchaseError | null {
  const node = NODE_BY_ID.get(nodeId);
  if (!node) return 'locked';
  if (node.comingSoon) return 'soon';
  const level = levelOf(profile.upgrades, nodeId);
  if (level >= node.maxLevel) return 'maxed';
  if (!isUnlocked(profile.upgrades, node)) return 'locked';
  return canPay(profile, node.cost(level + 1)) ? null : 'cost';
}

export function purchase(profile: Profile, nodeId: string): Profile | null {
  if (purchaseCheck(profile, nodeId)) return null;
  const node = NODE_BY_ID.get(nodeId)!;
  const level = levelOf(profile.upgrades, nodeId);
  const paid = pay(profile, node.cost(level + 1));
  if (!paid) return null;
  return applyGridBonuses({...paid, upgrades: {...paid.upgrades, [nodeId]: level + 1}});
}

export function canCraft(profile: Profile, recipe: Recipe): boolean {
  return levelOf(profile.upgrades, recipe.requires.node) >= recipe.requires.level && canPay(profile, {gold: recipe.gold, items: recipe.inputs});
}

/** Crafts into the stash; fails when inputs are missing or the stash is full. */
export function craft(profile: Profile, recipeId: string): Profile | null {
  const recipe = RECIPES.find(r => r.id === recipeId);
  if (!recipe || !canCraft(profile, recipe)) return null;
  const paid = pay(profile, {gold: recipe.gold, items: recipe.inputs});
  if (!paid) return null;
  const {grid, leftover} = addAuto(paid.stash, makeItem(recipe.output[0], recipe.output[1]));
  if (leftover) return null;
  return {...paid, stash: grid};
}
