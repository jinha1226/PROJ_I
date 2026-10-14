import {describe, expect, it} from 'vitest';
import {emptyGrid, makeItem} from '../src/items/inventory';
import {emptySlots, type Stores} from '../src/items/stores';
import {AutoBattle} from '../src/sim/auto/autoBattle';
import {BASE_MODIFIERS} from '../src/sim/modifiers';
import {Raid} from '../src/sim/raid';
import {idleInput} from '../src/sim/types';
import {generateMap} from '../src/world/mapgen';

const DT = 1 / 30;

function arena(seed = 3, level = 3): {raid: Raid; bot: AutoBattle} {
  const stores: Stores = {grids: {backpack: emptyGrid(6, 5)}, slots: {...emptySlots(), weapon: makeItem('rusty_sword'), belt0: makeItem('health_potion')}};
  const raid = new Raid(generateMap(seed), {seed, stores, modifiers: {...BASE_MODIFIERS, autoBattle: level}});
  raid.enemies.length = 0;
  return {raid, bot: new AutoBattle(raid, level)};
}

describe('auto battle', () => {
  it('stays out of the way while locked or with no enemies', () => {
    const {raid, bot} = arena(3, 0);
    expect(bot.apply(idleInput(), DT, false)).toEqual(idleInput());
    const {bot: idle} = arena(3, 3);
    idle.apply(idleInput(), DT, false);
    expect(idle.status()).toBe('idle');
    void raid;
  });

  it('attacks an enemy in reach, aiming at it', () => {
    const {raid, bot} = arena();
    const e = raid.spawnEnemy('warrior', {x: raid.player.x + 1.6, z: raid.player.z}, false);
    Object.assign(e, {alerted: true, canSee: true, state: 'chase'});
    const input = bot.apply(idleInput(), DT, false);
    expect(input.attack).toBe(true);
    expect(input.aim).toEqual({x: e.x, z: e.z});
  });

  it('dodges a wind-up that is about to land when it cannot interrupt it', () => {
    const {raid, bot} = arena(3, 3);
    const p = raid.player;
    const e = raid.spawnEnemy('warrior', {x: p.x, z: p.z - 1.8}, false);
    Object.assign(e, {alerted: true, canSee: true, state: 'windup', stateDuration: 0.5, stateTime: 0.45, facing: 0, poiseTimer: 1});
    let dodged = false;
    for (let i = 0; i < 20 && !dodged; i++) {
      bot['decided'].clear();
      dodged = bot.apply(idleInput(), DT, false).dodge;
    }
    expect(dodged).toBe(true);
  });

  it('drinks a potion when hurt and no enemy is close', () => {
    const {raid, bot} = arena();
    const e = raid.spawnEnemy('mage', {x: raid.player.x + 8, z: raid.player.z}, false);
    Object.assign(e, {alerted: true, canSee: true, state: 'chase'});
    raid.player.hp = 20;
    expect(bot.apply(idleInput(), DT, false).use).toBe('belt0');
  });

  it('wins a one-on-one against a skeleton warrior', () => {
    let wins = 0;
    for (const seed of [3, 5, 7, 9, 11]) {
      const {raid, bot} = arena(seed);
      const e = raid.spawnEnemy('warrior', {x: raid.player.x + 3, z: raid.player.z}, false);
      raid.alert(e);
      for (let t = 0; t < 30 && e.alive && raid.player.alive; t += DT) {
        raid.update(DT, bot.apply(idleInput(), DT, false));
        raid.drainEvents();
      }
      if (!e.alive && raid.player.alive) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(4);
  });

  it('manual input pauses it', () => {
    const {bot} = arena();
    bot.apply({...idleInput(), move: {x: 1, z: 0}}, DT, true);
    expect(bot.status()).toBe('paused');
  });
});
