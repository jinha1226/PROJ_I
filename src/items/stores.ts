import {itemDef} from './catalog';
import {addAuto, canPlace, findPlaced, findSpot, place, removeItem, replaceItem, type Grid, type ItemStack} from './inventory';

export type SlotId = 'weapon' | 'armor' | 'belt0' | 'belt1';
export const SLOT_IDS: readonly SlotId[] = ['weapon', 'armor', 'belt0', 'belt1'];

/** Every place an item can live during a raid or in the hideout. */
export interface Stores {
  readonly grids: Readonly<Record<string, Grid>>;
  readonly slots: Readonly<Record<SlotId, ItemStack | null>>;
}

export type Source = {kind: 'grid'; id: string; uid: number} | {kind: 'slot'; id: SlotId};
export type Dest = {kind: 'grid'; id: string; x: number; y: number; rot: boolean} | {kind: 'slot'; id: SlotId};

export const emptySlots = (): Record<SlotId, ItemStack | null> => ({
  weapon: null,
  armor: null,
  belt0: null,
  belt1: null,
});

export function slotAccepts(slot: SlotId, defId: string): boolean {
  const def = itemDef(defId);
  if (slot === 'weapon') return Boolean(def.weapon);
  if (slot === 'armor') return Boolean(def.armor);
  return Boolean(def.consumable);
}

export function itemOf(stores: Stores, source: Source): ItemStack | null {
  if (source.kind === 'slot') return stores.slots[source.id];
  const grid = stores.grids[source.id];
  return grid ? (findPlaced(grid, source.uid)?.item ?? null) : null;
}

const withGrid = (stores: Stores, id: string, grid: Grid): Stores => ({
  ...stores,
  grids: {...stores.grids, [id]: grid},
});
const withSlot = (stores: Stores, id: SlotId, item: ItemStack | null): Stores => ({...stores, slots: {...stores.slots, [id]: item}});

function detach(stores: Stores, source: Source): Stores {
  if (source.kind === 'slot') return withSlot(stores, source.id, null);
  return withGrid(stores, source.id, removeItem(stores.grids[source.id], source.uid));
}

/** Puts `item` back where it came from, at its original grid position when possible. */
function reattach(stores: Stores, source: Source, original: Stores, item: ItemStack): Stores | null {
  if (source.kind === 'slot') return withSlot(stores, source.id, item);
  const grid = stores.grids[source.id];
  const was = findPlaced(original.grids[source.id], source.uid);
  if (was && canPlace(grid, item.defId, was.x, was.y, was.rot)) {
    return withGrid(stores, source.id, place(grid, item, was.x, was.y, was.rot)!);
  }
  const spot = findSpot(grid, item.defId);
  return spot ? withGrid(stores, source.id, place(grid, item, spot.x, spot.y, spot.rot)!) : null;
}

/** Merges into a same-item stack under the drop point; returns null if that does not apply. */
function mergeAt(stores: Stores, dest: Extract<Dest, {kind: 'grid'}>, item: ItemStack, source: Source): Stores | null {
  const grid = stores.grids[dest.id];
  const target = grid.items.find(p => p.x === dest.x && p.y === dest.y && p.item.defId === item.defId && p.item.uid !== item.uid);
  const max = itemDef(item.defId).maxStack;
  if (!target || max <= 1 || target.item.qty >= max) return null;
  const moved = Math.min(item.qty, max - target.item.qty);
  let next = withGrid(stores, dest.id, replaceItem(grid, {...target.item, qty: target.item.qty + moved}));
  const rest = item.qty - moved;
  if (rest <= 0) return detach(next, source);
  if (source.kind === 'slot') return withSlot(next, source.id, {...item, qty: rest});
  next = withGrid(next, source.id, replaceItem(next.grids[source.id], {...item, qty: rest}));
  return next;
}

/**
 * Moves an item to an exact destination. Returns the new stores, or null when
 * the move is illegal (overlap, wrong slot type, nowhere to put a swapped item).
 */
export function transfer(stores: Stores, source: Source, dest: Dest): Stores | null {
  const item = itemOf(stores, source);
  if (!item) return null;

  if (dest.kind === 'grid') {
    if (!stores.grids[dest.id]) return null;
    const merged = mergeAt(stores, dest, item, source);
    if (merged) return merged;
    const detached = detach(stores, source);
    const placed = place(detached.grids[dest.id], item, dest.x, dest.y, dest.rot);
    return placed ? withGrid(detached, dest.id, placed) : null;
  }

  if (!slotAccepts(dest.id, item.defId)) return null;
  if (source.kind === 'slot' && source.id === dest.id) return stores;
  const occupant = stores.slots[dest.id];
  const next = withSlot(detach(stores, source), dest.id, item);
  if (!occupant) return next;
  // Swap: the previous occupant goes back to where the dragged item came from.
  if (source.kind === 'slot' && !slotAccepts(source.id, occupant.defId)) return null;
  return reattach(next, source, stores, occupant);
}

/** Shift-click: move into another grid wherever it fits (stacking first). */
export function quickMove(stores: Stores, source: Source, targetGrid: string): Stores | null {
  const item = itemOf(stores, source);
  const grid = stores.grids[targetGrid];
  if (!item || !grid) return null;
  if (source.kind === 'grid' && source.id === targetGrid) return null;
  const {grid: filled, leftover} = addAuto(grid, item);
  if (leftover && leftover.qty === item.qty) return null;
  let next = withGrid(detach(stores, source), targetGrid, filled);
  if (leftover) next = reattach(next, source, stores, leftover) ?? next;
  return next;
}

/** Shift-click on an equippable item: put it into the matching empty slot. */
export function quickEquip(stores: Stores, source: Source): Stores | null {
  const item = itemOf(stores, source);
  if (!item || source.kind === 'slot') return null;
  const def = itemDef(item.defId);
  const candidates: SlotId[] = def.weapon ? ['weapon'] : def.armor ? ['armor'] : def.consumable ? ['belt0', 'belt1'] : [];
  const slot = candidates.find(id => !stores.slots[id]) ?? candidates[0];
  return slot ? transfer(stores, source, {kind: 'slot', id: slot}) : null;
}

/** Splits `count` off a stack into a free spot in the same grid. */
export function splitStack(stores: Stores, gridId: string, uid: number, count: number, newItem: ItemStack): Stores | null {
  const grid = stores.grids[gridId];
  const placed = grid && findPlaced(grid, uid);
  if (!placed || count <= 0 || count >= placed.item.qty) return null;
  const reduced = replaceItem(grid, {
    ...placed.item,
    qty: placed.item.qty - count,
  });
  const piece: ItemStack = {...newItem, defId: placed.item.defId, qty: count};
  const spot = findSpot(reduced, piece.defId);
  if (!spot) return null;
  return withGrid(stores, gridId, place(reduced, piece, spot.x, spot.y, spot.rot)!);
}

/** Removes one unit of a slot item (e.g. drinking a potion). */
export function consumeSlot(stores: Stores, slot: SlotId): Stores {
  const item = stores.slots[slot];
  if (!item) return stores;
  return withSlot(stores, slot, item.qty > 1 ? {...item, qty: item.qty - 1} : null);
}

export function removeFrom(stores: Stores, source: Source): Stores {
  return detach(stores, source);
}
