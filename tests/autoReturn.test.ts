import {describe, expect, it} from 'vitest';
import {emptyGrid, makeItem} from '../src/items/inventory';
import {emptySlots, type Stores} from '../src/items/stores';
import {AutoReturn} from '../src/sim/auto/autoReturn';
import {BASE_MODIFIERS} from '../src/sim/modifiers';
import {Raid} from '../src/sim/raid';
import {idleInput, type SimInput} from '../src/sim/types';
import {generateMap} from '../src/world/mapgen';

const DT = 1 / 30;

function setup(seed: number, level = 1): {raid: Raid; auto: AutoReturn} {
  const stores: Stores = {grids: {backpack: emptyGrid(6, 5)}, slots: {...emptySlots(), weapon: makeItem('rusty_sword')}};
  const raid = new Raid(generateMap(seed), {seed, stores, modifiers: {...BASE_MODIFIERS, autoReturn: level}});
  raid.enemies.length = 0;
  return {raid, auto: new AutoReturn(raid, level)};
}

function step(raid: Raid, auto: AutoReturn, manual: Partial<SimInput> = {}): void {
  raid.update(DT, auto.apply({...idleInput(), ...manual}, DT));
  raid.drainEvents();
}

describe('auto return', () => {
  it.each([1, 2, 3, 5, 8, 13, 21, 34])('seed %i: starts in time and extracts before the oil runs out', seed => {
    const {raid, auto} = setup(seed);
    // Drain the lantern to just above the trigger point.
    const required = raid.oilSeconds - auto.status().slack;
    raid.oil = raid.oilDrainRate * (required + 2);
    for (let t = 0; t < 900 && !raid.outcome; t += DT) step(raid, auto);
    expect(raid.outcome).toBe('extracted');
  });

  it('gets home from anywhere on the map (next to every container)', () => {
    const {raid: probe} = setup(4);
    // Step out from the wall in the direction each container faces.
    const spots = probe.containers.map(c => ({x: c.x + Math.sin(c.rot) * 1.6, z: c.z + Math.cos(c.rot) * 1.6}));
    for (const spot of spots) {
      const {raid, auto} = setup(4);
      Object.assign(raid.player, {x: spot.x, z: spot.z});
      const required = raid.oilSeconds - auto.status().slack;
      raid.oil = raid.oilDrainRate * (required + 1);
      for (let t = 0; t < 600 && !raid.outcome; t += DT) step(raid, auto);
      expect(raid.outcome, `from ${spot.x.toFixed(0)},${spot.z.toFixed(0)}`).toBe('extracted');
    }
  });

  it('does nothing while locked', () => {
    const {raid, auto} = setup(1, 0);
    raid.oil = 5;
    step(raid, auto);
    expect(auto.status().phase).toBe('locked');
    expect(raid.player.moveAmount).toBe(0);
  });

  it('manual movement cancels the return, which resumes after the player lets go', () => {
    const {raid, auto} = setup(2);
    raid.oil = raid.oilDrainRate * 20;
    step(raid, auto);
    expect(auto.status().phase).toBe('returning');
    step(raid, auto, {move: {x: 1, z: 0}});
    expect(auto.status().phase).toBe('paused');
    for (let t = 0; t < 3.2; t += DT) step(raid, auto);
    expect(auto.status().phase).toBe('returning');
  });

  it('higher levels wait longer before leaving', () => {
    const low = setup(3, 1).auto.status().slack;
    const high = setup(3, 3).auto.status().slack;
    expect(high).toBeGreaterThan(low);
  });
});

describe('return now', () => {
  it('walks home on command even with plenty of oil, and manual input cancels it', () => {
    const {raid, auto} = setup(5);
    expect(auto.returnNow()).toBe(true);
    expect(auto.status().phase).toBe('returning');
    step(raid, auto, {move: {x: 1, z: 0}});
    expect(auto.status().phase).toBe('paused');
    auto.returnNow();
    for (let t = 0; t < 300 && !raid.outcome; t += DT) step(raid, auto);
    expect(raid.outcome).toBe('extracted');
  });

  it('is unavailable while locked', () => {
    const {auto} = setup(5, 0);
    expect(auto.returnNow()).toBe(false);
  });
});
