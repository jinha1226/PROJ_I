import {describe, expect, it} from 'vitest';
import {emptyGrid, gridValue, makeItem, place} from '../src/items/inventory';
import {emptySlots, type Stores} from '../src/items/stores';
import {AutoExplore} from '../src/sim/auto/autoExplore';
import {AutoReturn} from '../src/sim/auto/autoReturn';
import {takeBest, valuePerCell} from '../src/sim/auto/looting';
import {BASE_MODIFIERS} from '../src/sim/modifiers';
import {Raid} from '../src/sim/raid';
import {idleInput} from '../src/sim/types';
import {generateMap} from '../src/world/mapgen';

const DT = 1 / 30;

function setup(seed: number, explore = 2): {raid: Raid; bot: AutoExplore; ret: AutoReturn} {
  const stores: Stores = {grids: {backpack: emptyGrid(6, 5)}, slots: {...emptySlots(), weapon: makeItem('rusty_sword')}};
  const raid = new Raid(generateMap(seed), {seed, stores, modifiers: {...BASE_MODIFIERS, autoExplore: explore, autoReturn: 1}});
  raid.enemies.length = 0;
  return {raid, bot: new AutoExplore(raid, explore), ret: new AutoReturn(raid, 1)};
}

/** Same composition as the game: explore unless the return has taken over. */
function step(raid: Raid, bot: AutoExplore, ret: AutoReturn): void {
  const human = idleInput();
  const explored = ret.returning ? human : bot.apply(human, DT, false);
  raid.update(DT, ret.apply(explored, DT, false));
  raid.drainEvents();
}

describe('auto explore', () => {
  it.each([3, 7, 11])('seed %i: loots containers on its own and gets out alive', seed => {
    const {raid, bot, ret} = setup(seed);
    for (let t = 0; t < 900 && !raid.outcome; t += DT) step(raid, bot, ret);
    expect(raid.outcome).toBe('extracted');
    const opened = raid.containers.filter(c => c.opened).length;
    expect(opened).toBeGreaterThan(raid.containers.length * 0.5);
    expect(gridValue(raid.stores.grids.backpack)).toBeGreaterThan(0);
  });

  it('stops when an alerted enemy is in sight', () => {
    const {raid, bot, ret} = setup(3);
    const e = raid.spawnEnemy('warrior', {x: raid.player.x + 3, z: raid.player.z}, false);
    Object.assign(e, {alerted: true, canSee: true, cooldown: 99, sightTimer: 99});
    step(raid, bot, ret);
    expect(bot.status()).toBe('threat');
  });

  it('pauses while the player steers', () => {
    const {raid, bot} = setup(3);
    bot.apply({...idleInput(), move: {x: 1, z: 0}}, DT, true);
    expect(bot.status()).toBe('paused');
    void raid;
  });
});

describe('loot choice', () => {
  const hidden = (): boolean => false;

  it('takes the best value per cell first', () => {
    let box = emptyGrid(4, 4);
    box = place(box, makeItem('old_keg'), 0, 0, false)!; // big, cheap per cell
    box = place(box, makeItem('ruby'), 2, 0, false)!;
    const stores: Stores = {grids: {backpack: emptyGrid(6, 5), box}, slots: emptySlots()};
    const step = takeBest(stores, 'box', hidden, new Set(), {allowSwap: false, fillBelt: false});
    expect(step.taken?.defId).toBe('ruby');
  });

  it('swaps out a worse item when the bag is full (level 2)', () => {
    const plate = makeItem('cracked_plate');
    const bag = place(emptyGrid(1, 1), plate, 0, 0, false)!;
    const box = place(emptyGrid(2, 2), makeItem('ruby'), 0, 0, false)!;
    const stores: Stores = {grids: {backpack: bag, box}, slots: emptySlots()};
    expect(takeBest(stores, 'box', hidden, new Set(), {allowSwap: false, fillBelt: false}).taken).toBeNull();
    const swapped = takeBest(stores, 'box', hidden, new Set(), {allowSwap: true, fillBelt: false});
    expect(swapped.taken?.defId).toBe('ruby');
    expect(swapped.stores.grids.box.items.some(p => p.item.uid === plate.uid)).toBe(true);
    expect(valuePerCell(swapped.stores.grids.backpack.items[0].item)).toBeGreaterThan(valuePerCell(plate));
  });

  it('never takes hidden (unsearched) items', () => {
    const box = place(emptyGrid(2, 2), makeItem('ruby'), 0, 0, false)!;
    const stores: Stores = {grids: {backpack: emptyGrid(6, 5), box}, slots: emptySlots()};
    expect(takeBest(stores, 'box', () => true, new Set(), {allowSwap: true, fillBelt: true}).taken).toBeNull();
  });
});
