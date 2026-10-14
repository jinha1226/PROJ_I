import {BACKPACK_SIZE, STASH_SIZE} from '../config';
import {ITEMS} from '../items/catalog';
import {addAuto, emptyGrid, makeItem, maxUid, place, reserveUids, type Grid, type ItemStack} from '../items/inventory';
import {emptySlots, SLOT_IDS, type SlotId, type Stores} from '../items/stores';
import {deriveBonuses, NODE_BY_ID, type Levels} from './upgrades';

export interface ProfileStats {
  raids: number;
  extracts: number;
  deaths: number;
  bestHaul: number;
  totalEarned: number;
}

export interface Profile {
  version: 1;
  gold: number;
  stash: Grid;
  backpack: Grid;
  slots: Record<SlotId, ItemStack | null>;
  stats: ProfileStats;
  raidCounter: number;
  /** Hideout tree: node id → level. */
  upgrades: Levels;
  /** Upgrade pinned to the quest-style hideout tracker. */
  trackedUpgrade: string | null;
}

const STORAGE_KEY = 'proj_i_extract_profile_v1';
export const STARTER_WEAPON = 'rusty_sword';

export function newProfile(): Profile {
  let stash = emptyGrid(STASH_SIZE.w, STASH_SIZE.h);
  for (const [id, qty] of [['bandage', 3], ['cracked_plate', 1]] as const) stash = addAuto(stash, makeItem(id, qty)).grid;
  return {
    version: 1,
    gold: 150,
    stash,
    backpack: emptyGrid(BACKPACK_SIZE.w, BACKPACK_SIZE.h),
    slots: {...emptySlots(), weapon: makeItem(STARTER_WEAPON), belt0: makeItem('bandage', 2), belt1: makeItem('health_potion')},
    stats: {raids: 0, extracts: 0, deaths: 0, bestHaul: 0, totalEarned: 0},
    raidCounter: 0,
    upgrades: {},
    trackedUpgrade: null,
  };
}

// ---------- validation of untrusted saved data ----------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

function readStack(v: unknown): ItemStack | null {
  if (!isObj(v) || typeof v.defId !== 'string' || !ITEMS.has(v.defId)) return null;
  const max = ITEMS.get(v.defId)!.maxStack;
  return {uid: Math.max(1, Math.floor(num(v.uid, 0))), defId: v.defId, qty: Math.min(max, Math.max(1, Math.floor(num(v.qty, 1))))};
}

/** Rebuilds a grid by re-placing every saved item, dropping anything invalid or overlapping. */
function readGrid(v: unknown, w: number, h: number): Grid {
  let grid = emptyGrid(w, h);
  if (!isObj(v) || !Array.isArray(v.items)) return grid;
  for (const raw of v.items as unknown[]) {
    if (!isObj(raw)) continue;
    const item = readStack(raw.item);
    if (!item) continue;
    if (grid.items.some(p => p.item.uid === item.uid)) continue;
    grid = place(grid, item, Math.floor(num(raw.x, -1)), Math.floor(num(raw.y, -1)), raw.rot === true) ?? addAuto(grid, item).grid;
  }
  return grid;
}

function readLevels(v: unknown): Levels {
  const out: Record<string, number> = {};
  if (!isObj(v)) return out;
  for (const [id, level] of Object.entries(v)) {
    const node = NODE_BY_ID.get(id);
    if (node && typeof level === 'number' && level > 0) out[id] = Math.min(node.maxLevel, Math.floor(level));
  }
  return out;
}

export function parseProfile(raw: string): Profile | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(data) || data.version !== 1) return null;
  const slotsRaw = isObj(data.slots) ? data.slots : {};
  const slots = emptySlots();
  for (const id of SLOT_IDS) slots[id] = readStack(slotsRaw[id]);
  const stats = isObj(data.stats) ? data.stats : {};
  // Grid sizes depend on upgrades, so read those first or expanded rows would be dropped.
  const upgrades = readLevels(data.upgrades);
  const bonus = deriveBonuses(upgrades);
  const profile: Profile = {
    version: 1,
    gold: Math.max(0, Math.floor(num(data.gold, 0))),
    stash: readGrid(data.stash, STASH_SIZE.w, STASH_SIZE.h + bonus.stashRows),
    backpack: readGrid(data.backpack, BACKPACK_SIZE.w, BACKPACK_SIZE.h + bonus.backpackRows),
    slots,
    stats: {
      raids: num(stats.raids, 0),
      extracts: num(stats.extracts, 0),
      deaths: num(stats.deaths, 0),
      bestHaul: num(stats.bestHaul, 0),
      totalEarned: num(stats.totalEarned, 0),
    },
    raidCounter: num(data.raidCounter, 0),
    upgrades,
    trackedUpgrade: typeof data.trackedUpgrade === 'string' && NODE_BY_ID.has(data.trackedUpgrade) ? data.trackedUpgrade : null,
  };
  const slotMax = Math.max(0, ...SLOT_IDS.map(id => profile.slots[id]?.uid ?? 0));
  reserveUids(Math.max(maxUid(profile.stash), maxUid(profile.backpack), slotMax));
  return profile;
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return parseProfile(raw) ?? newProfile();
  } catch {
    // Storage blocked (private mode): play without persistence.
  }
  return newProfile();
}

export function saveProfile(profile: Profile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage full or blocked: progress for this session only.
  }
}

export function resetProfile(): Profile {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return newProfile();
}

/** Stores view used by the hideout inventory screen. */
export const hideoutStores = (p: Profile): Stores => ({grids: {stash: p.stash, backpack: p.backpack}, slots: p.slots});

export const withHideoutStores = (p: Profile, s: Stores): Profile => ({...p, stash: s.grids.stash, backpack: s.grids.backpack, slots: {...s.slots}});

/** What the player carries into a raid. */
export const raidStores = (p: Profile): Stores => ({grids: {backpack: p.backpack}, slots: {...p.slots}});
