import {describe, expect, it} from 'vitest';
import {EXTRACT_SECONDS} from '../src/config';
import {BASE_MODIFIERS} from '../src/sim/modifiers';
import {emptyGrid, makeItem} from '../src/items/inventory';
import {emptySlots, type Stores} from '../src/items/stores';
import {Raid} from '../src/sim/raid';
import {idleInput, type SimEvent, type SimInput} from '../src/sim/types';
import {generateMap} from '../src/world/mapgen';

const DT = 1 / 60;

function newRaid(seed = 3, opts: {lootSpeed?: number} = {}): Raid {
  const stores: Stores = {grids: {backpack: emptyGrid(6, 5)}, slots: {...emptySlots(), weapon: makeItem('rusty_sword')}};
  return new Raid(generateMap(seed), {seed, stores, modifiers: {...BASE_MODIFIERS, lootSpeed: opts.lootSpeed ?? 1}});
}

/** Removes every enemy so a test controls the whole encounter. */
function clearEnemies(raid: Raid): void {
  raid.enemies.length = 0;
}

function run(raid: Raid, seconds: number, input: (t: number) => Partial<SimInput> = () => ({})): SimEvent[] {
  const events: SimEvent[] = [];
  for (let t = 0; t < seconds; t += DT) {
    raid.update(DT, {...idleInput(), aim: {x: raid.player.x, z: raid.player.z + 5}, ...input(t)});
    events.push(...raid.drainEvents());
  }
  return events;
}

describe('player combat', () => {
  it('a swing damages an enemy in front, triggers hitstop and knockback', () => {
    const raid = newRaid();
    clearEnemies(raid);
    const p = raid.player;
    const enemy = raid.spawnEnemy('warrior', {x: p.x, z: p.z + 1.8}, false);
    const hp = enemy.hp;
    const events = run(raid, 0.5, t => ({attack: t < DT, aim: {x: p.x, z: p.z + 5}}));
    const hit = events.find(e => e.type === 'hit');
    expect(hit).toBeDefined();
    expect(enemy.hp).toBeLessThan(hp);
    expect(events.some(e => e.type === 'swing')).toBe(true);
  });

  it('does not hit enemies behind the player', () => {
    const raid = newRaid();
    clearEnemies(raid);
    const p = raid.player;
    const enemy = raid.spawnEnemy('warrior', {x: p.x, z: p.z - 1.8}, false);
    enemy.alerted = true;
    enemy.cooldown = 99;
    run(raid, 0.4, t => ({attack: t < DT, aim: {x: p.x, z: p.z + 5}}));
    expect(enemy.hp).toBe(enemy.maxHp);
  });

  it('chains a three-step combo when attack is pressed repeatedly', () => {
    const raid = newRaid();
    clearEnemies(raid);
    const events = run(raid, 2, t => ({attack: Math.floor(t / 0.1) % 2 === 0}));
    const combos = events.filter((e): e is Extract<SimEvent, {type: 'swing'}> => e.type === 'swing').map(e => e.combo);
    expect(combos.slice(0, 3)).toEqual([0, 1, 2]);
  });

  it('dodging grants i-frames that turn damage into an evade', () => {
    const raid = newRaid();
    clearEnemies(raid);
    run(raid, DT * 2, () => ({dodge: true, move: {x: 1, z: 0}}));
    expect(raid.player.state).toBe('dodge');
    const hp = raid.player.hp;
    expect(raid.damagePlayer(30, {x: raid.player.x + 1, z: raid.player.z})).toBe(false);
    expect(raid.player.hp).toBe(hp);
    expect(raid.drainEvents().some(e => e.type === 'evade')).toBe(true);
  });

  it('dodging costs stamina', () => {
    const raid = newRaid();
    clearEnemies(raid);
    run(raid, DT, () => ({dodge: true}));
    expect(raid.player.stamina).toBeLessThan(100);
  });
});

describe('enemy AI', () => {
  it('a dormant warrior wakes when the player approaches, then attacks', () => {
    const raid = newRaid();
    clearEnemies(raid);
    const p = raid.player;
    const enemy = raid.spawnEnemy('warrior', {x: p.x + 2.5, z: p.z}, true);
    const events = run(raid, 4);
    expect(events.some(e => e.type === 'awaken')).toBe(true);
    expect(events.some(e => e.type === 'windup' && e.enemy === enemy.id)).toBe(true);
    expect(events.some(e => e.type === 'playerHurt')).toBe(true);
  });

  it('a mage casts a bolt that travels to the player', () => {
    const raid = newRaid();
    clearEnemies(raid);
    const p = raid.player;
    raid.spawnEnemy('mage', {x: p.x + 6, z: p.z}, false);
    const events = run(raid, 5);
    expect(events.some(e => e.type === 'cast')).toBe(true);
    expect(events.some(e => e.type === 'shoot')).toBe(true);
  });

  it('a raider loots containers into its bag, which drops on death', () => {
    const raid = newRaid(5);
    clearEnemies(raid);
    const target = raid.containers.find(c => raid.stores.grids[c.gridId].items.length)!;
    const raider = raid.spawnEnemy('raider', {x: target.x + 0.5, z: target.z}, false);
    raid.player.x = -999; // keep the player out of sight
    run(raid, 4);
    expect(raider.visited.has(target.id)).toBe(true);
    expect(raider.bag!.items.length).toBeGreaterThan(0);
    const carried = raider.bag!.items.map(p => p.item.uid);
    raid.damageEnemy(raider, 999, raider, true, false);
    const corpse = raid.containers.find(c => c.id === raider.corpse)!;
    const corpseUids = raid.stores.grids[corpse.gridId].items.map(p => p.item.uid);
    for (const uid of carried) expect(corpseUids).toContain(uid);
  });
});

describe('looting', () => {
  it('reveals container items over time, faster with the loot speed modifier', () => {
    const revealTime = (lootSpeed: number): number => {
      const raid = newRaid(2, {lootSpeed});
      clearEnemies(raid);
      const c = raid.containers.find(x => raid.stores.grids[x.gridId].items.length >= 2)!;
      Object.assign(raid.player, {x: c.x, z: c.z + 1});
      run(raid, DT, () => ({interact: true}));
      expect(raid.openContainer).toBe(c.id);
      let t = 0;
      while (c.revealed < c.revealOrder.length && t < 30) {
        run(raid, DT);
        t += DT;
      }
      return t;
    };
    const slow = revealTime(1);
    expect(slow).toBeGreaterThan(0.3);
    expect(revealTime(2)).toBeLessThan(slow * 0.6);
  });

  it('closes the container when the player walks away', () => {
    const raid = newRaid();
    clearEnemies(raid);
    const c = raid.containers[0];
    Object.assign(raid.player, {x: c.x, z: c.z + 1});
    run(raid, DT, () => ({interact: true}));
    expect(raid.openContainer).toBe(c.id);
    Object.assign(raid.player, {x: c.x + 30, z: c.z});
    run(raid, DT);
    expect(raid.openContainer).toBeNull();
  });
});

describe('raid outcome', () => {
  it('extracts after standing in a zone long enough', () => {
    const raid = newRaid();
    clearEnemies(raid);
    Object.assign(raid.player, {x: raid.zones[0].x, z: raid.zones[0].z});
    const events = run(raid, EXTRACT_SECONDS + 0.2);
    expect(events.some(e => e.type === 'extractStart')).toBe(true);
    expect(raid.outcome).toBe('extracted');
  });

  it('dies when hp reaches zero', () => {
    const raid = newRaid();
    clearEnemies(raid);
    raid.damagePlayer(9999, {x: raid.player.x + 1, z: raid.player.z});
    run(raid, 3);
    expect(raid.outcome).toBe('dead');
  });

  it('forces a retreat when the lantern runs dry, with warnings on the way', () => {
    const raid = newRaid();
    clearEnemies(raid);
    const events: SimEvent[] = [];
    raid.oil = raid.oilMax * 0.3 + 0.01;
    events.push(...run(raid, 0.2));
    expect(events.some(e => e.type === 'notice')).toBe(true);
    raid.oil = 0.01;
    run(raid, 0.2);
    expect(raid.outcome).toBe('exhausted');
  });

  it('lamp oil refills the lantern', () => {
    const raid = newRaid();
    clearEnemies(raid);
    raid.stores = {...raid.stores, slots: {...raid.stores.slots, belt0: makeItem('lamp_oil')}};
    raid.oil = 10;
    run(raid, 1.2, t => ({use: t < DT ? 'belt0' : null}));
    expect(raid.oil).toBeGreaterThan(35);
    expect(raid.stores.slots.belt0).toBeNull();
  });

  it('oil modifiers scale capacity and burn rate', () => {
    const stores: Stores = {grids: {backpack: emptyGrid(6, 5)}, slots: emptySlots()};
    const raid = new Raid(generateMap(3), {seed: 3, stores, modifiers: {...BASE_MODIFIERS, oilCapacity: 2, oilDrain: 0.5}});
    expect(raid.oilMax).toBe(200);
    expect(raid.oilSeconds).toBeCloseTo(new Raid(generateMap(3), {seed: 3, stores}).oilSeconds * 4);
  });
});
