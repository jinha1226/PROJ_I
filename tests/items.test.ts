import {describe, expect, it} from 'vitest';
import {Rng} from '../src/core/rng';
import {itemDef} from '../src/items/catalog';
import {addAuto, canPlace, emptyGrid, findSpot, gridValue, itemAt, makeItem, place, type Grid} from '../src/items/inventory';
import {LOOT_TABLES, rollContainer} from '../src/items/loot';
import {BASE_MODIFIERS} from '../src/sim/modifiers';
import {settleRaid} from '../src/meta/economy';
import {newProfile, type Profile} from '../src/meta/profile';
import {consumeSlot, emptySlots, quickEquip, quickMove, transfer, type Stores} from '../src/items/stores';

const storesWith = (grids: Record<string, Grid>): Stores => ({grids, slots: emptySlots()});

describe('grid inventory', () => {
  it('rejects overlapping and out-of-bounds placements', () => {
    const sword = makeItem('rusty_sword'); // 1x3
    const grid = place(emptyGrid(4, 4), sword, 0, 0, false)!;
    expect(canPlace(grid, 'cracked_plate', 0, 2, false)).toBe(false);
    expect(canPlace(grid, 'cracked_plate', 1, 2, false)).toBe(true);
    expect(canPlace(grid, 'rusty_sword', 3, 2, false)).toBe(false);
  });

  it('rotation swaps the footprint', () => {
    const grid = emptyGrid(3, 1);
    expect(canPlace(grid, 'rusty_sword', 0, 0, false)).toBe(false);
    expect(canPlace(grid, 'rusty_sword', 0, 0, true)).toBe(true);
    expect(findSpot(grid, 'rusty_sword')).toEqual({x: 0, y: 0, rot: true});
  });

  it('tops up existing stacks before using new cells', () => {
    let grid = addAuto(emptyGrid(2, 1), makeItem('gold_coin', 90)).grid;
    const result = addAuto(grid, makeItem('gold_coin', 30));
    grid = result.grid;
    expect(result.leftover).toBeNull();
    expect(grid.items.map(p => p.item.qty).sort((a, b) => a - b)).toEqual([20, 100]);
  });

  it('reports leftovers when the grid is full', () => {
    const {leftover} = addAuto(emptyGrid(1, 1), makeItem('old_keg'));
    expect(leftover?.defId).toBe('old_keg');
  });

  it('values grids by item value times quantity', () => {
    const grid = addAuto(addAuto(emptyGrid(4, 4), makeItem('gold_coin', 10)).grid, makeItem('ruby')).grid;
    expect(gridValue(grid)).toBe(10 * itemDef('gold_coin').value + itemDef('ruby').value);
  });
});

describe('stores transfer', () => {
  it('moves an item between grids and leaves the source empty', () => {
    const plate = makeItem('cracked_plate');
    const s = storesWith({a: place(emptyGrid(2, 2), plate, 0, 0, false)!, b: emptyGrid(2, 2)});
    const next = transfer(s, {kind: 'grid', id: 'a', uid: plate.uid}, {kind: 'grid', id: 'b', x: 1, y: 1, rot: false})!;
    expect(next.grids.a.items).toHaveLength(0);
    expect(itemAt(next.grids.b, 1, 1)?.item.uid).toBe(plate.uid);
    expect(s.grids.a.items).toHaveLength(1); // original untouched
  });

  it('allows moving an item onto its own former cells', () => {
    const sword = makeItem('rusty_sword');
    const s = storesWith({a: place(emptyGrid(3, 3), sword, 0, 0, false)!});
    const next = transfer(s, {kind: 'grid', id: 'a', uid: sword.uid}, {kind: 'grid', id: 'a', x: 0, y: 1, rot: true});
    expect(next?.grids.a.items[0]).toMatchObject({x: 0, y: 1, rot: true});
  });

  it('only equips matching item types and swaps the old occupant back', () => {
    const rusty = makeItem('rusty_sword');
    const blade = makeItem('bone_blade');
    const plate = makeItem('cracked_plate');
    let s = storesWith({bag: place(place(emptyGrid(4, 4), blade, 0, 0, false)!, plate, 2, 0, false)!});
    s = {...s, slots: {...s.slots, weapon: rusty}};
    expect(transfer(s, {kind: 'grid', id: 'bag', uid: plate.uid}, {kind: 'slot', id: 'weapon'})).toBeNull();
    const swapped = transfer(s, {kind: 'grid', id: 'bag', uid: blade.uid}, {kind: 'slot', id: 'weapon'})!;
    expect(swapped.slots.weapon?.uid).toBe(blade.uid);
    expect(swapped.grids.bag.items.some(p => p.item.uid === rusty.uid)).toBe(true);
  });

  it('quick-moves into another grid and quick-equips consumables to the belt', () => {
    const potion = makeItem('health_potion');
    const s = storesWith({a: place(emptyGrid(2, 2), potion, 0, 0, false)!, b: emptyGrid(2, 2)});
    expect(quickMove(s, {kind: 'grid', id: 'a', uid: potion.uid}, 'b')?.grids.b.items).toHaveLength(1);
    const equipped = quickEquip(s, {kind: 'grid', id: 'a', uid: potion.uid})!;
    expect(equipped.slots.belt0?.uid).toBe(potion.uid);
    expect(consumeSlot(equipped, 'belt0').slots.belt0).toBeNull();
  });
});

describe('loot rolls', () => {
  it('is deterministic per seed and stays within the container grid', () => {
    const a = rollContainer('chest', new Rng(5));
    const b = rollContainer('chest', new Rng(5));
    expect(a.items.map(p => p.item.defId)).toEqual(b.items.map(p => p.item.defId));
    expect([a.w, a.h]).toEqual(LOOT_TABLES.chest.grid);
    expect(a.items.length).toBeGreaterThan(0);
  });

  it('loot quantity modifier increases item count on average', () => {
    const count = (q: number): number => {
      const rng = new Rng(11);
      let total = 0;
      for (let i = 0; i < 200; i++) total += rollContainer('crate', rng, {...BASE_MODIFIERS, lootQuantity: q}).items.length;
      return total;
    };
    expect(count(2)).toBeGreaterThan(count(1) * 1.4);
  });

  it('rare find modifier shifts drops toward rare items', () => {
    const rareShare = (rf: number): number => {
      const rng = new Rng(3);
      let rare = 0;
      let all = 0;
      for (let i = 0; i < 300; i++) {
        for (const p of rollContainer('chest', rng, {...BASE_MODIFIERS, rareFind: rf}).items) {
          all++;
          if (['rare', 'epic', 'legendary'].includes(itemDef(p.item.defId).rarity)) rare++;
        }
      }
      return rare / all;
    };
    expect(rareShare(3)).toBeGreaterThan(rareShare(1));
  });
});

describe('raid settlement', () => {
  const profileWith = (): Profile => newProfile();
  const carriedWith = (n: number): Stores => {
    let bag = emptyGrid(6, 5);
    for (let i = 0; i < n; i++) bag = addAuto(bag, makeItem('cracked_plate')).grid;
    return {grids: {backpack: bag}, slots: {...emptySlots(), weapon: makeItem('rusty_sword')}};
  };

  it('extraction keeps everything', () => {
    const {profile, lost} = settleRaid(profileWith(), 'extracted', carriedWith(4));
    expect(profile.backpack.items).toHaveLength(4);
    expect(profile.slots.weapon).not.toBeNull();
    expect(lost).toHaveLength(0);
  });

  it('exhaustion keeps gear but loses half the backpack stacks', () => {
    const {profile, lost} = settleRaid(profileWith(), 'exhausted', carriedWith(4), () => 0.5);
    expect(profile.backpack.items).toHaveLength(2);
    expect(lost).toHaveLength(2);
    expect(profile.slots.weapon).not.toBeNull();
    expect(profile.stats.deaths).toBe(0);
  });

  it('death and forfeit lose everything', () => {
    for (const outcome of ['dead', 'forfeit'] as const) {
      const {profile, haul} = settleRaid(profileWith(), outcome, carriedWith(4));
      expect(profile.backpack.items).toHaveLength(0);
      expect(profile.slots.weapon).toBeNull();
      expect(haul).toBe(0);
    }
  });
});
