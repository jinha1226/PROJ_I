import {itemDef} from './catalog';

/** A concrete item (or stack). `uid` identifies it across moves. */
export interface ItemStack {
  readonly uid: number;
  readonly defId: string;
  readonly qty: number;
}

export interface Placed {
  readonly item: ItemStack;
  readonly x: number;
  readonly y: number;
  /** Rotated items swap width and height. */
  readonly rot: boolean;
}

export interface Grid {
  readonly w: number;
  readonly h: number;
  readonly items: readonly Placed[];
}

export interface Spot {
  x: number;
  y: number;
  rot: boolean;
}

let uidCounter = 1;

export function makeItem(defId: string, qty = 1): ItemStack {
  itemDef(defId);
  return {uid: uidCounter++, defId, qty};
}

/** Keeps fresh uids above anything restored from a save. */
export function reserveUids(maxUsed: number): void {
  uidCounter = Math.max(uidCounter, maxUsed + 1);
}

export const emptyGrid = (w: number, h: number): Grid => ({w, h, items: []});

export function footprint(defId: string, rot: boolean): {w: number; h: number} {
  const def = itemDef(defId);
  return rot ? {w: def.h, h: def.w} : {w: def.w, h: def.h};
}

export function itemAt(grid: Grid, cx: number, cy: number): Placed | undefined {
  return grid.items.find(p => {
    const {w, h} = footprint(p.item.defId, p.rot);
    return cx >= p.x && cy >= p.y && cx < p.x + w && cy < p.y + h;
  });
}

export function findPlaced(grid: Grid, uid: number): Placed | undefined {
  return grid.items.find(p => p.item.uid === uid);
}

export function canPlace(grid: Grid, defId: string, x: number, y: number, rot: boolean, ignoreUid?: number): boolean {
  const {w, h} = footprint(defId, rot);
  if (x < 0 || y < 0 || x + w > grid.w || y + h > grid.h) return false;
  return grid.items.every(p => {
    if (p.item.uid === ignoreUid) return true;
    const o = footprint(p.item.defId, p.rot);
    return x + w <= p.x || p.x + o.w <= x || y + h <= p.y || p.y + o.h <= y;
  });
}

export function place(grid: Grid, item: ItemStack, x: number, y: number, rot: boolean): Grid | null {
  if (!canPlace(grid, item.defId, x, y, rot)) return null;
  return {...grid, items: [...grid.items, {item, x, y, rot}]};
}

export function removeItem(grid: Grid, uid: number): Grid {
  return {...grid, items: grid.items.filter(p => p.item.uid !== uid)};
}

export function replaceItem(grid: Grid, item: ItemStack): Grid {
  return {...grid, items: grid.items.map(p => (p.item.uid === item.uid ? {...p, item} : p))};
}

/** First free spot scanning rows top to bottom, trying upright before rotated. */
export function findSpot(grid: Grid, defId: string, ignoreUid?: number): Spot | null {
  const def = itemDef(defId);
  const rotations = def.w === def.h ? [false] : [false, true];
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      for (const rot of rotations) {
        if (canPlace(grid, defId, x, y, rot, ignoreUid)) return {x, y, rot};
      }
    }
  }
  return null;
}

export interface AddResult {
  grid: Grid;
  /** What did not fit, or null when everything was stored. */
  leftover: ItemStack | null;
}

/** Tops up existing stacks of the same item first, then places the rest. */
export function addAuto(grid: Grid, item: ItemStack): AddResult {
  const def = itemDef(item.defId);
  let remaining = item.qty;
  let next = grid;
  if (def.maxStack > 1) {
    for (const p of grid.items) {
      if (remaining <= 0) break;
      if (p.item.defId !== item.defId || p.item.qty >= def.maxStack) continue;
      const moved = Math.min(remaining, def.maxStack - p.item.qty);
      next = replaceItem(next, {...p.item, qty: p.item.qty + moved});
      remaining -= moved;
    }
  }
  if (remaining <= 0) return {grid: next, leftover: null};
  const rest: ItemStack = remaining === item.qty ? item : {...item, qty: remaining};
  const spot = findSpot(next, rest.defId);
  if (!spot) return {grid: next, leftover: rest};
  return {grid: place(next, rest, spot.x, spot.y, spot.rot) ?? next, leftover: null};
}

export const stackValue = (item: ItemStack): number => itemDef(item.defId).value * item.qty;

export const gridValue = (grid: Grid): number => grid.items.reduce((sum, p) => sum + stackValue(p.item), 0);

export const maxUid = (grid: Grid): number => grid.items.reduce((m, p) => Math.max(m, p.item.uid), 0);
