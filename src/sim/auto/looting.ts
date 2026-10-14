import {itemDef} from '../../items/catalog';
import {stackValue, type ItemStack, type Placed} from '../../items/inventory';
import {quickEquip, quickMove, type Stores} from '../../items/stores';

/** Items worth less than this per cell are left behind. */
export const MIN_VALUE_PER_CELL = 4;
/** Only swap when the new item is clearly better than what it replaces. */
const SWAP_RATIO = 0.7;

export const valuePerCell = (item: ItemStack): number => {
  const def = itemDef(item.defId);
  return stackValue(item) / (def.w * def.h);
};

export interface LootOptions {
  /** Drop worse backpack items back into the container to make room. */
  allowSwap: boolean;
  /** Put found consumables straight into empty belt slots. */
  fillBelt: boolean;
}

export interface LootStep {
  stores: Stores;
  /** The item moved this step, if any. */
  taken: ItemStack | null;
}

/**
 * Takes the single most valuable (per cell) visible item from a container.
 * Returns `taken: null` when nothing else is worth taking or nothing fits.
 */
export function takeBest(stores: Stores, gridId: string, isHidden: (uid: number) => boolean, skip: ReadonlySet<number>, opts: LootOptions): LootStep {
  const candidates = stores.grids[gridId].items
    .filter(p => !isHidden(p.item.uid) && !skip.has(p.item.uid) && valuePerCell(p.item) >= MIN_VALUE_PER_CELL)
    .sort((a, b) => valuePerCell(b.item) - valuePerCell(a.item));
  for (const p of candidates) {
    const next = tryTake(stores, gridId, p, opts);
    if (next) return {stores: next, taken: p.item};
  }
  return {stores, taken: null};
}

function tryTake(stores: Stores, gridId: string, p: Placed, opts: LootOptions): Stores | null {
  const source = {kind: 'grid', id: gridId, uid: p.item.uid} as const;
  const def = itemDef(p.item.defId);
  if (opts.fillBelt && def.consumable && (!stores.slots.belt0 || !stores.slots.belt1)) {
    const equipped = quickEquip(stores, source);
    if (equipped && !equipped.grids[gridId].items.some(i => i.item.uid === p.item.uid)) return equipped;
  }
  const direct = quickMove(stores, source, 'backpack');
  if (direct) return direct;
  if (!opts.allowSwap) return null;
  // Make room by sending the worst backpack items back, cheapest per cell first.
  const worth = valuePerCell(p.item);
  const worse = [...stores.grids.backpack.items]
    .filter(b => valuePerCell(b.item) < worth * SWAP_RATIO)
    .sort((a, b) => valuePerCell(a.item) - valuePerCell(b.item));
  let trial = stores;
  for (const b of worse) {
    const out = quickMove(trial, {kind: 'grid', id: 'backpack', uid: b.item.uid}, gridId);
    if (!out) continue;
    trial = out;
    const taken = quickMove(trial, source, 'backpack');
    if (taken) return taken;
  }
  return null;
}
