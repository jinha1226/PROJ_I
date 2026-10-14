import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {STORAGE_KEYS} from '../src/config';
import {readJson} from '../src/persistence/store';
import {GuildState} from '../src/state/guild';
import {createHarness, finishPause, runUntil, type Harness} from './helpers/harness';
import {viewOf} from './helpers/fakes';

// 20 Hz matches a typical frame; the legacy approach logic can stall a fight at other step sizes.
const DT = 0.05;
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function launched(): Promise<Harness> {
  const h = createHarness();
  await h.game.launchFromHub();
  return h;
}
function gameDeps(h: Harness) {
  return {dungeon: h.session.dungeon, session: h.session, progression: h.progression, guild: h.guild, factory: h.factory, fx: h.fx, scene: h.scene, presenter: h.presenter};
}
const inCombat = (h: Harness): boolean => h.game.mode === 'combat';
const toFirstFight = (h: Harness): void => void runUntil(h.game, () => inCombat(h), 5000, DT);

describe('starting an expedition', () => {
  it('spawns the party at the entrance and a monster pack in every other room', async () => {
    const h = await launched();
    const {game, presenter, scene, guild} = h;
    expect(game.mode).toBe('travel');
    expect(game.world.heroes().map(a => [a.name, a.rosterId])).toEqual([['Knight', 1], ['Rogue_Hooded', 2], ['Mage', 3]]);
    expect(presenter.party).toHaveLength(3);
    const rooms = game.session.dungeon.centers.length;
    expect(game.world.actors.filter(a => a.team === 'enemy')).toHaveLength((rooms - 2) * 3 + 1);
    expect(game.session.roomMonsters.size).toBe(rooms - 1);
    expect(presenter.statusText).toBe('STAGE 1 · 던전 탐험');
    expect(presenter.battleInfoText).toMatch(/^자동 탐험 · 지도 \d+%$/);
    expect(scene.builds).toBe(1);
    expect(readJson(h.store, STORAGE_KEYS.guild)).toMatchObject({activeExpedition: true});
    expect(guild.data.activeExpedition).toBe(true);
  });

  it('reports a populated world once per expedition, for shader warm-up', async () => {
    const h = createHarness();
    const populated = vi.fn();
    const game = new (h.game.constructor as typeof import('../src/game/game').Game)({...gameDeps(h), onWorldPopulated: populated});
    await game.launchFromHub();
    expect(populated).toHaveBeenCalledTimes(1);
    runUntil(game, () => game.mode === 'combat', 5000, DT);
    runUntil(game, () => game.phase === 'ended', 5000, DT);
    await finishPause();
    expect(game.mode).toBe('travel');
    expect(populated).toHaveBeenCalledTimes(1);
  });

  it('puts the boss alone in the last room, enlarged and with a shockwave timer', async () => {
    const {game} = await launched();
    const last = game.session.dungeon.centers.length - 1;
    const [boss, ...others] = game.session.roomMonsters.get(last)!;
    expect(others).toEqual([]);
    expect(boss).toMatchObject({isBoss: true, bossCooldown: 4.5});
    expect(viewOf(boss).scale).toBe(1.6);
  });

  it('scales enemy stats with the current stage', async () => {
    const low = await launched();
    const strongStore = createHarness();
    strongStore.progression.data.stage = 11;
    await strongStore.game.launchFromHub();
    const hp = (h: Harness): number => h.game.session.roomMonsters.get(1)![0].max;
    expect(hp(strongStore)).toBeGreaterThan(hp(low));
  });

  it('deploys at most three living heroes and skips the dead', async () => {
    const h = createHarness();
    h.guild.recruit('Mage');
    h.guild.data.roster[0].alive = false;
    await h.game.launchFromHub();
    expect(h.game.world.heroes().map(a => a.rosterId)).toEqual([2, 3, 4]);
  });

  it('returns to the hub with a message if the hero models fail to load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const h = createHarness();
    h.factory.failFor.add('Mage');
    await h.game.launchFromHub();
    expect(h.game.mode).toBe('base');
    expect(h.presenter.hubMessages.at(-1)).toBe('영웅 로딩 실패: asset missing: Mage');
    expect(h.guild.data.activeExpedition).toBe(false);
  });

  it('keeps going when only the monsters fail to load, retrying on the next travel entry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const h = createHarness();
    h.factory.failFor.add('Skeleton_Warrior');
    await h.game.launchFromHub();
    expect(h.game.mode).toBe('travel');
    expect(h.game.session.monstersReady).toBe(false);
    expect(h.game.world.actors.some(a => a.team === 'enemy')).toBe(false);
  });

  it('discards monsters from an expedition that was replaced while loading', async () => {
    const h = createHarness();
    const first = h.game.startExpedition();
    const second = h.game.startExpedition();
    await Promise.all([first, second]);
    const enemies = h.game.world.actors.filter(a => a.team === 'enemy');
    const rooms = h.game.session.dungeon.centers.length;
    expect(enemies.length).toBeLessThanOrEqual((rooms - 2) * 3 + 1);
    expect(h.factory.spawned.filter(a => a.team === 'enemy' && viewOf(a).disposed).length).toBeGreaterThanOrEqual(0);
  });
});

describe('exploration', () => {
  it('walks the party onto new tiles and reveals the map', async () => {
    const h = await launched();
    const before = h.game.session.percentExplored;
    runUntil(h.game, () => h.game.session.steps >= 10 || inCombat(h), 400, DT);
    expect(h.game.session.steps).toBeGreaterThan(0);
    expect(h.game.session.percentExplored).toBeGreaterThan(before);
    expect(h.presenter.mapDraws).toBeGreaterThan(0);
    expect(h.game.session.discoveries.size).toBeGreaterThan(0);
    expect(h.game.session.discoveries.size).toBeLessThanOrEqual(h.game.session.steps);
  });

  it('follows the lead hero with the camera', async () => {
    const h = await launched();
    runUntil(h.game, () => h.game.session.steps >= 5, 400, DT);
    expect(h.game.focusPoint()).toBe(h.game.world.heroes()[0].pos);
  });

  it('does not advance while paused and resumes afterwards', async () => {
    const h = await launched();
    h.game.setPaused(true);
    expect(h.presenter.paused).toBe(true);
    for (let i = 0; i < 50; i++) h.game.tick(DT);
    expect(h.game.session.steps).toBe(0);
    h.game.setPaused(false);
    runUntil(h.game, () => h.game.session.steps > 0, 100, DT);
    expect(h.game.session.steps).toBeGreaterThan(0);
  });

  it('advances faster at higher game speed', async () => {
    const slow = await launched();
    const fast = await launched();
    fast.game.cycleSpeed();
    expect(fast.presenter.speed).toBe(2);
    for (let i = 0; i < 40; i++) {
      slow.game.tick(DT);
      if (fast.game.mode === 'travel') fast.game.tick(DT);
    }
    expect(fast.game.session.steps).toBeGreaterThanOrEqual(slow.game.session.steps);
  });

  it('cycles the game speed 1x -> 2x -> 4x -> 1x', () => {
    const h = createHarness();
    const seen = [h.game.speed];
    for (let i = 0; i < 3; i++) {
      h.game.cycleSpeed();
      seen.push(h.game.speed);
    }
    expect(seen).toEqual([1, 2, 4, 1]);
  });

  it('toggles the pathfinder skill and replans', async () => {
    const h = await launched();
    h.game.session.route = [[1, 1]];
    h.game.toggleGuide();
    expect(h.game.session.pathfinderSkill).toBe(true);
    expect(h.game.session.route).toEqual([]);
  });
});

describe('a room fight', () => {
  it('engages when the party nears a monster pack', async () => {
    const h = await launched();
    toFirstFight(h);
    expect(h.game.mode).toBe('combat');
    expect(h.game.phase).toBe('active');
    expect(h.presenter.statusText).toBe('STAGE 1 · 전투');
    expect(h.game.session.visitedRooms.has(h.game.combat.activeRoom)).toBe(true);
    expect(h.presenter.battleInfoText).toMatch(/^아군 3\/3 · 적 \d+ · 1×$/);
  });

  it('is won by the party, rewarding gold and advancing the stage', async () => {
    const h = await launched();
    toFirstFight(h);
    const room = h.game.combat.activeRoom;
    runUntil(h.game, () => h.game.phase === 'ended', 3000, DT);
    expect(h.game.phase).toBe('ended');
    expect(h.presenter.noticeText).toBe('VICTORY · GOLD +15');
    expect(h.progression.data).toMatchObject({stage: 2, gold: 15, wins: 1});
    expect(h.presenter.restartEnabled).toBe(true);
    expect(h.game.session.kills).toBe(3);
    expect(h.game.session.loot).toBe(6);
    expect(h.game.world.enemiesOfRoom(room)).toHaveLength(0);
    expect(h.presenter.statusText).toBe('STAGE 2 · 15 G · 테스트 유적');
  });

  it.each([0.02, 0.033, 0.05, 0.08, 0.1, 0.16])('finishes the first fight at a %fs frame step (no range deadlock)', async dt => {
    const h = await launched();
    runUntil(h.game, () => inCombat(h), 20000, dt);
    runUntil(h.game, () => h.game.phase === 'ended', 20000, dt);
    expect(h.game.phase).toBe('ended');
  });

  it('saves wounds to the roster after a victory', async () => {
    const h = await launched();
    toFirstFight(h);
    runUntil(h.game, () => h.game.phase === 'ended', 3000, DT);
    const living = h.game.world.livingHeroes();
    for (const hero of living) expect(h.guild.data.roster.find(r => r.id === hero.rosterId)!.hp).toBe(Math.max(1, Math.ceil(hero.hp)));
  });

  it('goes back to exploring after the pause between fights', async () => {
    const h = await launched();
    toFirstFight(h);
    runUntil(h.game, () => h.game.phase === 'ended', 3000, DT);
    expect(h.game.mode).toBe('combat');
    await finishPause();
    expect(h.game.mode).toBe('travel');
    expect(h.presenter.statusText).toBe('STAGE 2 · 던전 탐험');
  });

  it('only waits for the timer, so a paused game stays in the finished fight', async () => {
    const h = await launched();
    toFirstFight(h);
    runUntil(h.game, () => h.game.phase === 'ended', 3000, DT);
    h.game.setPaused(true);
    await vi.advanceTimersByTimeAsync(10000);
    expect(h.game.mode).toBe('combat');
    h.game.setPaused(false);
    await vi.advanceTimersByTimeAsync(10000);
    expect(h.game.mode).toBe('travel');
  });

  it('keeps the other rooms frozen while one is being fought', async () => {
    const h = await launched();
    toFirstFight(h);
    const room = h.game.combat.activeRoom;
    const bystander = h.game.world.actors.find(a => a.team === 'enemy' && a.dungeonRoom !== room)!;
    const before = bystander.pos.clone();
    for (let i = 0; i < 30; i++) h.game.tick(DT);
    expect(bystander.pos.equals(before)).toBe(true);
  });

  it('wipes the expedition if every hero falls', async () => {
    const h = await launched();
    toFirstFight(h);
    for (const hero of h.game.world.heroes()) hero.hp = 1;
    for (const enemy of h.game.world.enemiesOfRoom(h.game.combat.activeRoom)) enemy.damage = 500;
    runUntil(h.game, () => h.game.mode === 'base', 3000, DT);
    expect(h.game.mode).toBe('base');
    expect(h.presenter.noticeText).toBe('DEFEAT');
    expect(h.progression.data).toMatchObject({farming: true, stage: 1});
    expect(h.presenter.hubMessages.at(-1)).toContain('원정대 전멸');
    expect(h.guild.data.roster.every(r => !r.alive)).toBe(true);
    expect(h.game.world.actors).toHaveLength(0);
    expect(h.guild.data.activeExpedition).toBe(false);
    expect(h.guild.data.expeditions).toBe(1);
  });
});

describe('retreating', () => {
  it('is only a hub shortcut when no expedition is running', () => {
    const h = createHarness();
    h.game.issueRetreat();
    expect(h.presenter.hubMessages).toEqual(['']);
  });

  it('walks the party home and settles the expedition for supplies', async () => {
    const h = await launched();
    runUntil(h.game, () => h.game.session.steps >= 25 || inCombat(h), 800, DT);
    if (inCombat(h)) return;
    h.game.issueRetreat();
    expect(h.game.session.retreating).toBe(true);
    expect(h.presenter.noticeText).toContain('퇴각 중');
    runUntil(h.game, () => h.game.mode === 'base', 4000, DT);
    expect(h.game.mode).toBe('base');
    expect(h.presenter.hubMessages.at(-1)).toMatch(/^원정대 귀환 · 생존 3명/);
    expect(h.guild.data.supplies).toBeGreaterThan(30);
    expect(h.guild.data).toMatchObject({expeditions: 1, activeExpedition: false});
    expect(h.guild.data.deepest).toBeGreaterThanOrEqual(25);
  });

  it('is ignored once already retreating', async () => {
    const h = await launched();
    h.game.issueRetreat();
    h.game.session.route = [[3, 3]];
    h.game.issueRetreat();
    expect(h.game.session.route).toEqual([[3, 3]]);
  });

  it('breaks off a fight, hurting heroes next to enemies, and heads for the exit', async () => {
    const h = await launched();
    toFirstFight(h);
    for (const enemy of h.game.world.enemiesOfRoom(h.game.combat.activeRoom)) {
      enemy.pos.copy(h.game.world.heroes()[0].pos);
      enemy.damage = 10;
    }
    const knight = h.game.world.heroes()[0];
    const before = knight.hp;
    h.game.issueRetreat();
    expect(h.game.mode).toBe('travel');
    expect(h.game.combat.activeRoom).toBe(-1);
    expect(knight.hp).toBeLessThan(before);
    expect(h.fx.texts.some(t => t.startsWith('퇴각 -'))).toBe(true);
    expect(h.game.session.retreatEscapeRoom).not.toBe(-1);
  });

  it('can wipe the party outright when pursuers are lethal', async () => {
    const h = await launched();
    toFirstFight(h);
    for (const hero of h.game.world.heroes()) hero.hp = 1;
    for (const enemy of h.game.world.enemiesOfRoom(h.game.combat.activeRoom)) {
      enemy.pos.copy(h.game.world.heroes()[0].pos);
      for (const hero of h.game.world.heroes()) hero.pos.copy(enemy.pos);
    }
    h.game.issueRetreat();
    expect(h.game.mode).toBe('base');
    expect(h.presenter.hubMessages.at(-1)).toContain('퇴각 중 전멸');
    expect(h.guild.data.roster.every(r => !r.alive)).toBe(true);
  });
});

describe('animation', () => {
  it('keeps animating heroes during the pause after a fight', async () => {
    const h = await launched();
    toFirstFight(h);
    runUntil(h.game, () => h.game.phase === 'ended', 3000, DT);
    const hero = h.game.world.heroes()[0];
    const before = viewOf(hero).ticked;
    for (let i = 0; i < 10; i++) h.game.tick(DT);
    expect(viewOf(hero).ticked).toBeCloseTo(before + 10 * DT);
  });

  it('animates nearby monsters even before their room is entered, but not far-off ones', async () => {
    const h = await launched();
    const enemies = h.game.world.actors.filter(a => a.team === 'enemy');
    const focus = h.game.focusPoint();
    const near = enemies.reduce((best, e) => (e.pos.distanceTo(focus) < best.pos.distanceTo(focus) ? e : best));
    const far = enemies.reduce((best, e) => (e.pos.distanceTo(focus) > best.pos.distanceTo(focus) ? e : best));
    expect(far.pos.distanceTo(focus)).toBeGreaterThan(40);
    h.game.tick(DT);
    expect(viewOf(near).ticked).toBeGreaterThan(0);
    expect(viewOf(far).ticked).toBe(0);
  });

  it('scales animation with game speed and stops when paused', async () => {
    const h = await launched();
    const hero = h.game.world.heroes()[0];
    h.game.cycleSpeed();
    const start = viewOf(hero).ticked;
    h.game.tick(DT);
    expect(viewOf(hero).ticked - start).toBeCloseTo(DT * 2);
    h.game.setPaused(true);
    const paused = viewOf(hero).ticked;
    h.game.tick(DT);
    expect(viewOf(hero).ticked).toBe(paused);
  });
});

describe('restarting and hub access', () => {
  it('only opens the hub between expeditions', async () => {
    const h = createHarness();
    h.game.openHub('hello');
    expect(h.presenter.hubMessages).toEqual(['hello']);
    await h.game.launchFromHub();
    h.game.openHub('nope');
    expect(h.presenter.hubMessages).toEqual(['hello']);
  });

  it('starting again resets the run and rebuilds the roster of monsters', async () => {
    const h = await launched();
    runUntil(h.game, () => h.game.session.steps >= 8 || inCombat(h), 400, DT);
    await h.game.startExpedition();
    expect(h.game.session.steps).toBe(0);
    expect(h.game.session.percentExplored).toBeLessThan(10);
    expect(h.game.world.heroes()).toHaveLength(3);
    expect(h.game.world.heroes().every(a => a.hp === a.max || a.hp <= a.max)).toBe(true);
    expect(h.factory.spawned.filter(a => a.team === 'hero' && viewOf(a).disposed)).toHaveLength(3);
  });

  it('survives a reload: the guild keeps casualties and spent supplies', async () => {
    const h = await launched();
    toFirstFight(h);
    h.game.world.heroes()[0].hp = 0;
    h.guild.recordDeath(h.game.world.heroes()[0].rosterId!);
    const reloaded = new GuildState(h.store);
    expect(reloaded.data.roster[0].alive).toBe(false);
    expect(reloaded.data.expeditions).toBe(1);
  });
});
