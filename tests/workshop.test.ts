import {describe, expect, it} from 'vitest';
import {BACKPACK_SIZE} from '../src/config';
import {addAuto, makeItem} from '../src/items/inventory';
import {sellItem} from '../src/meta/economy';
import {newProfile, parseProfile, type Profile} from '../src/meta/profile';
import {deriveBonuses, NODES} from '../src/meta/upgrades';
import {countItem, craft, purchase, purchaseCheck} from '../src/meta/workshop';

function withStash(profile: Profile, items: [string, number][], gold = 5000): Profile {
  let stash = profile.stash;
  for (const [id, qty] of items) stash = addAuto(stash, makeItem(id, qty)).grid;
  return {...profile, stash, gold};
}

describe('hideout upgrades', () => {
  it('locks building nodes until the building exists', () => {
    const p = withStash(newProfile(), [['iron_scrap', 10]]);
    expect(purchaseCheck(p, 'blacksmith.sharpen')).toBe('locked');
    const built = purchase(p, 'blacksmith.build')!;
    expect(built.upgrades['blacksmith.build']).toBe(1);
    expect(purchaseCheck(built, 'blacksmith.sharpen')).toBeNull();
  });

  it('pays gold and materials, taking from stash then backpack', () => {
    let p = withStash(newProfile(), [['iron_scrap', 3]], 200);
    p = {...p, backpack: addAuto(p.backpack, makeItem('iron_scrap', 2)).grid};
    const built = purchase(p, 'blacksmith.build')!;
    expect(built.gold).toBe(0);
    expect(countItem(built, 'iron_scrap')).toBe(0);
  });

  it('refuses when materials are missing and never exceeds max level', () => {
    const poor = withStash(newProfile(), [['iron_scrap', 4]]);
    expect(purchaseCheck(poor, 'blacksmith.build')).toBe('cost');
    let p = purchase(withStash(newProfile(), [['iron_scrap', 40]]), 'blacksmith.build')!;
    for (let i = 0; i < 5; i++) p = purchase(p, 'blacksmith.sharpen')!;
    expect(p.upgrades['blacksmith.sharpen']).toBe(5);
    expect(purchaseCheck(p, 'blacksmith.sharpen')).toBe('maxed');
    expect(deriveBonuses(p.upgrades).damageMul).toBeCloseTo(1.3);
  });

  it('coming-soon nodes cannot be bought', () => {
    const p = purchase(withStash(newProfile(), [['bone_dust', 10], ['iron_scrap', 10]]), 'barracks.build')!;
    expect(purchaseCheck(p, 'barracks.mercenary')).toBe('soon');
  });

  it('bag expansion grows the backpack and survives a save round-trip', () => {
    let p = purchase(withStash(newProfile(), [['silverware', 1], ['ancient_silk', 2]]), 'market.build')!;
    p = purchase(p, 'market.bag')!;
    expect(p.backpack.h).toBe(BACKPACK_SIZE.h + 1);
    // An item in the new bottom row must not be lost on reload.
    const lowRow = {...p, backpack: {...p.backpack, items: [{item: makeItem('ruby'), x: 0, y: BACKPACK_SIZE.h, rot: false}]}};
    const restored = parseProfile(JSON.stringify(lowRow))!;
    expect(restored.backpack.h).toBe(BACKPACK_SIZE.h + 1);
    expect(restored.backpack.items[0]).toMatchObject({x: 0, y: BACKPACK_SIZE.h});
  });

  it('haggle raises sell prices', () => {
    const base = withStash(newProfile(), [['ruby', 1]]);
    const uid = base.stash.items.find(i => i.item.defId === 'ruby')!.item.uid;
    const plain = sellItem(base, 'stash', uid)!.gold - base.gold;
    const haggled = {...base, upgrades: {'market.build': 1, 'market.haggle': 3}};
    expect(sellItem(haggled, 'stash', uid)!.gold - base.gold).toBe(Math.round(plain * 1.15));
  });

  it('every node has a valid cost for each level', () => {
    for (const n of NODES) for (let l = 1; l <= n.maxLevel; l++) expect(n.cost(l).gold).toBeGreaterThanOrEqual(0);
  });
});

describe('crafting', () => {
  it('needs the recipe node, consumes inputs and outputs into the stash', () => {
    let p = withStash(newProfile(), [['bone_dust', 20], ['dusty_bottle', 5]]);
    expect(craft(p, 'health_potion')).toBeNull();
    p = purchase(p, 'alchemist.build')!;
    p = purchase(p, 'alchemist.brewing')!;
    const before = countItem(p, 'bone_dust');
    const crafted = craft(p, 'health_potion')!;
    expect(countItem(crafted, 'health_potion')).toBe(1);
    expect(countItem(crafted, 'bone_dust')).toBe(before - 2);
  });
});
