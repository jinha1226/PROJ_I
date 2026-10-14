import {EXHAUST_LOSS} from '../config';
import {itemDef} from '../items/catalog';
import {addAuto, emptyGrid, findPlaced, gridValue, makeItem, removeItem, stackValue, type Grid, type ItemStack} from '../items/inventory';
import {emptySlots, type Stores} from '../items/stores';
import type {Outcome} from '../sim/types';
import {STARTER_WEAPON, type Profile} from './profile';
import {deriveBonuses} from './upgrades';

/** Merchant stock: buy prices sit above sell value, so looting beats shopping. */
export const SHOP: readonly {defId: string; price: number}[] = [
  {defId: 'bandage', price: 25},
  {defId: 'health_potion', price: 70},
  {defId: 'lamp_oil', price: 45},
  {defId: 'rusty_sword', price: 60},
  {defId: 'leather_armor', price: 160},
];

export interface RaidResult {
  outcome: Outcome;
  /** Value of everything carried out (0 unless extracted). */
  haul: number;
  kills: number;
  seconds: number;
}

export interface Settlement {
  profile: Profile;
  haul: number;
  /** Stacks lost on the way out (exhaustion); empty otherwise. */
  lost: ItemStack[];
}

/** Drops a random share of backpack stacks (rounded up). */
function loseShare(grid: Grid, share: number, random: () => number): {grid: Grid; lost: ItemStack[]} {
  const order = grid.items.map(p => ({p, k: random()})).sort((a, b) => a.k - b.k).map(x => x.p);
  const lost = order.slice(0, Math.ceil(order.length * share)).map(p => p.item);
  return {grid: lost.reduce((g, item) => removeItem(g, item.uid), grid), lost};
}

/**
 * Applies a finished raid. Extraction keeps everything; an empty lantern keeps
 * the equipped gear but loses half the backpack; death or forfeit loses all.
 */
export function settleRaid(profile: Profile, outcome: Outcome, carried: Stores, random: () => number = Math.random, exhaustLoss = EXHAUST_LOSS): Settlement {
  const survived = outcome === 'extracted' || outcome === 'exhausted';
  let backpack = survived ? carried.grids.backpack : emptyGrid(carried.grids.backpack.w, carried.grids.backpack.h);
  let lost: ItemStack[] = [];
  if (outcome === 'exhausted') ({grid: backpack, lost} = loseShare(backpack, exhaustLoss, random));
  const slots = survived ? {...carried.slots} : emptySlots();
  const haul = survived ? gridValue(backpack) + Object.values(slots).reduce((s, i) => s + (i ? stackValue(i) : 0), 0) : 0;
  const stats = {
    ...profile.stats,
    raids: profile.stats.raids + 1,
    extracts: profile.stats.extracts + (outcome === 'extracted' ? 1 : 0),
    deaths: profile.stats.deaths + (survived ? 0 : 1),
    bestHaul: Math.max(profile.stats.bestHaul, haul),
  };
  return {profile: {...profile, backpack, slots, stats, raidCounter: profile.raidCounter + 1}, haul, lost};
}

/** Sells one stack from a hideout grid for its full value. */
export function sellItem(profile: Profile, gridId: 'stash' | 'backpack', uid: number): Profile | null {
  const grid = profile[gridId];
  const placed = findPlaced(grid, uid);
  if (!placed) return null;
  const value = Math.round(stackValue(placed.item) * deriveBonuses(profile.upgrades).sellMul);
  return {
    ...profile,
    gold: profile.gold + value,
    [gridId]: removeItem(grid, uid),
    stats: {...profile.stats, totalEarned: profile.stats.totalEarned + value},
  };
}

/** Sells every stack explicitly categorized as junk in one hideout grid. */
export function sellJunk(profile: Profile, gridId: 'stash' | 'backpack'): Profile | null {
  const grid = profile[gridId];
  const junk = grid.items.filter(p => itemDef(p.item.defId).category === 'junk');
  if (!junk.length) return null;
  const multiplier = deriveBonuses(profile.upgrades).sellMul;
  const value = junk.reduce((sum, p) => sum + Math.round(stackValue(p.item) * multiplier), 0);
  const sold = new Set(junk.map(p => p.item.uid));
  return {
    ...profile,
    gold: profile.gold + value,
    [gridId]: {...grid, items: grid.items.filter(p => !sold.has(p.item.uid))},
    stats: {...profile.stats, totalEarned: profile.stats.totalEarned + value},
  };
}

/** Buys one item into the stash if there is gold and room. */
export function buyItem(profile: Profile, defId: string): Profile | null {
  const entry = SHOP.find(s => s.defId === defId);
  if (!entry || profile.gold < entry.price) return null;
  const {grid, leftover} = addAuto(profile.stash, makeItem(defId, 1));
  if (leftover) return null;
  return {...profile, gold: profile.gold - entry.price, stash: grid};
}

/** A broke player with no weapon gets a free rusty sword so they can never soft-lock. */
export function needsCharityKit(profile: Profile): boolean {
  const hasWeapon = Boolean(profile.slots.weapon) || [...profile.stash.items, ...profile.backpack.items].some(p => itemDef(p.item.defId).weapon);
  const cheapest = SHOP.find(s => s.defId === STARTER_WEAPON)!.price;
  return !hasWeapon && profile.gold < cheapest;
}

export function grantCharityKit(profile: Profile): Profile {
  return {...profile, slots: {...profile.slots, weapon: makeItem(STARTER_WEAPON), belt0: profile.slots.belt0 ?? makeItem('bandage', 1)}};
}
