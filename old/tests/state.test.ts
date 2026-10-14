import {beforeEach, describe, expect, it, vi} from 'vitest';
import {STORAGE_KEYS} from '../src/config';
import {closeInterruptedExpedition, expeditionReward, livingRoster, recordHeroDeath} from '../src/expedition/rules';
import {expeditionSummary, settleExpedition} from '../src/expedition/settlement';
import {memoryStore, readJson} from '../src/persistence/store';
import {GuildState, createDefaultGuild, parseGuild} from '../src/state/guild';
import {Progression, createDefaultProgress, parseProgress} from '../src/state/progression';
import type {Guild} from '../src/types';

describe('expedition rules', () => {
  it('rewards only recovered exploration and loot from successful runs with survivors', () => {
    expect(expeditionReward({successful: true, survivors: 2, discoveredTiles: 11, loot: 6})).toBe(8);
    expect(expeditionReward({successful: false, survivors: 0, discoveredTiles: 100, loot: 40})).toBe(0);
    expect(expeditionReward({successful: true, survivors: 0, discoveredTiles: 100, loot: 40})).toBe(0);
    expect(expeditionReward({successful: true, survivors: 3, discoveredTiles: 0, loot: 0})).toBe(0);
  });

  it('records permadeath once and excludes the dead from deployment', () => {
    const roster = [{id: 1, type: 'Knight' as const, alive: true, hp: 50}, {id: 2, type: 'Mage' as const, alive: true, hp: 20}];
    expect(recordHeroDeath(roster, 1)).toBe(true);
    expect(recordHeroDeath(roster, 1)).toBe(false);
    expect(recordHeroDeath(roster, 99)).toBe(false);
    expect(livingRoster(roster).map(h => h.id)).toEqual([2]);
    expect(roster[0].hp).toBe(0);
  });

  it('limits the deployed party to three living heroes', () => {
    const roster = [1, 2, 3, 4].map(id => ({id, alive: true, hp: 10}));
    expect(livingRoster(roster)).toHaveLength(3);
    expect(livingRoster(roster, Infinity)).toHaveLength(4);
  });

  it('closes an interrupted expedition exactly once', () => {
    const guild: Guild = {...createDefaultGuild(), activeExpedition: true, expeditions: 2};
    expect(closeInterruptedExpedition(guild)).toBe(true);
    expect(closeInterruptedExpedition(guild)).toBe(false);
    expect(guild.expeditions).toBe(3);
  });

  it('settles credit only for successful survivors and keeps the deepest run', () => {
    const guild: Guild = {...createDefaultGuild(), expeditions: 2, deepest: 5, supplies: 10, activeExpedition: true};
    const actors = [{team: 'hero' as const, hp: 5, dead: false}, {team: 'hero' as const, hp: 0, dead: true}, {team: 'enemy' as const, hp: 9, dead: false}];
    const result = settleExpedition({guild, actors, successful: true, discoveredTiles: 10, loot: 3, steps: 7, kills: 2});
    expect(result).toEqual({survivors: 1, reward: 5, steps: 7, kills: 2});
    expect(guild).toMatchObject({supplies: 15, expeditions: 3, deepest: 7, activeExpedition: false});
    expect(expeditionSummary('귀환', result)).toContain('생존 1명');
    expect(expeditionSummary('실패', {...result, reward: 0})).toContain('전리품 미회수');
  });
});

describe('Progression', () => {
  let store: ReturnType<typeof memoryStore>;
  beforeEach(() => {
    store = memoryStore();
  });

  it('starts with the default loadout and no purchases', () => {
    const p = new Progression(store);
    expect(p.data).toEqual(createDefaultProgress());
    expect(p.data.loadout.Knight).toEqual(['taunt', 'protect']);
    expect(p.loadoutSlots()).toBe(2);
  });

  it('sanitises corrupt or hostile save data field by field', () => {
    const parsed = parseProgress({
      wins: 3,
      gold: -50,
      stage: 0,
      highestStage: 'x',
      farming: 1,
      tacticLevels: {taunt: 99, heal: -4, kite: 'abc'},
      upgrades: {attack: 500, health: -1, dodge: 1.9},
      loadout: {Knight: ['heal', 'taunt', 'taunt', 'ironwall', 'protect'], Mage: ['nonsense'], Rogue_Hooded: 'oops'},
    });
    expect(parsed).toMatchObject({wins: 3, gold: 0, stage: 1, highestStage: 1, farming: true});
    expect(parsed.tacticLevels).toMatchObject({taunt: 3, heal: 1, kite: 1});
    expect(parsed.upgrades).toMatchObject({attack: 100, health: 0, dodge: 1});
    expect(parsed.loadout.Knight).toEqual(['taunt', 'ironwall', 'protect']);
    expect(parsed.loadout.Mage).toEqual(['heal', 'aoe']);
    expect(parsed.loadout.Rogue_Hooded).toEqual(['execute', 'kite']);
  });

  it.each([null, 'text', 42, [], {wins: -1}, {wins: 1.5}])('falls back to defaults for %j', raw => {
    expect(parseProgress(raw)).toEqual(createDefaultProgress());
  });

  it('survives invalid JSON in storage', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    store.setItem(STORAGE_KEYS.progress, '{broken');
    expect(new Progression(store).data).toEqual(createDefaultProgress());
  });

  it('prices upgrades exponentially and caps dodge at one purchase', () => {
    const p = new Progression(store);
    expect(p.upgradeCost('attack')).toBe(20);
    p.data.gold = 1000;
    expect(p.buyUpgrade('attack')).toBe(true);
    expect(p.upgradeCost('attack')).toBe(31);
    expect(p.buyUpgrade('dodge')).toBe(true);
    expect(p.upgradeCost('dodge')).toBe(Infinity);
    expect(p.buyUpgrade('dodge')).toBe(false);
    expect(p.data.gold).toBe(1000 - 20 - 120);
  });

  it('refuses purchases the player cannot afford', () => {
    const p = new Progression(store);
    p.data.gold = 10;
    expect(p.buyUpgrade('attack')).toBe(false);
    expect(p.data.upgrades.attack).toBe(0);
  });

  it('levels tactics for 75 then 200 gold up to level 3', () => {
    const p = new Progression(store);
    p.data.gold = 1000;
    expect(p.tacticCost('taunt')).toBe(75);
    expect(p.levelUpTactic('taunt')).toBe(true);
    expect(p.tacticCost('taunt')).toBe(200);
    expect(p.levelUpTactic('taunt')).toBe(true);
    expect(p.tacticCost('taunt')).toBe(Infinity);
    expect(p.levelUpTactic('taunt')).toBe(false);
    expect(p.tacticLevel('taunt')).toBe(3);
    expect(p.data.gold).toBe(725);
  });

  it('only allows a third loadout slot after the first win and never empties a role', () => {
    const p = new Progression(store);
    expect(p.toggleTactic('Knight', 'ironwall')).toBe(true);
    expect(p.data.loadout.Knight).toEqual(['taunt', 'protect']);
    p.recordBattle(true);
    expect(p.loadoutSlots()).toBe(3);
    p.toggleTactic('Knight', 'ironwall');
    expect(p.data.loadout.Knight).toEqual(['taunt', 'protect', 'ironwall']);
    p.toggleTactic('Knight', 'taunt');
    p.toggleTactic('Knight', 'protect');
    expect(p.toggleTactic('Knight', 'ironwall')).toBe(false);
    expect(p.data.loadout.Knight).toEqual(['ironwall']);
  });

  it('rejects equipping a tactic that belongs to another role', () => {
    const p = new Progression(store);
    expect(p.toggleTactic('Knight', 'heal')).toBe(false);
  });

  it('advances the stage on victory and drops into farming after defeat', () => {
    const p = new Progression(store);
    expect(p.recordBattle(true)).toEqual({victory: true, goldAwarded: 15});
    expect(p.data).toMatchObject({wins: 1, gold: 15, stage: 2, highestStage: 2});
    p.recordBattle(true);
    expect(p.data).toMatchObject({stage: 3, gold: 15 + 20});
    expect(p.recordBattle(false)).toEqual({victory: false, goldAwarded: 0});
    expect(p.data).toMatchObject({farming: true, stage: 2, highestStage: 3});
    p.recordBattle(true);
    expect(p.data).toMatchObject({farming: false, stage: 3});
  });

  it('persists every change and reloads it', () => {
    const first = new Progression(store);
    first.recordBattle(true);
    first.data.gold = 500;
    first.buyUpgrade('healing');
    const reloaded = new Progression(store);
    expect(reloaded.data).toEqual(first.data);
    expect(readJson(store, STORAGE_KEYS.progress)).toMatchObject({wins: 1});
  });
});

describe('GuildState', () => {
  let store: ReturnType<typeof memoryStore>;
  beforeEach(() => {
    store = memoryStore();
  });

  it('starts with one of each hero and 30 supplies', () => {
    const guild = new GuildState(store);
    expect(guild.data.supplies).toBe(30);
    expect(guild.data.roster.map(h => [h.id, h.type, h.hp])).toEqual([[1, 'Knight', 115], [2, 'Rogue_Hooded', 78], [3, 'Mage', 75]]);
  });

  it('recruits for 10 supplies with unique ids and refuses when poor', () => {
    const guild = new GuildState(store);
    expect(guild.recruit('Mage')).toBe(true);
    expect(guild.data).toMatchObject({supplies: 20, nextId: 5});
    expect(guild.data.roster.at(-1)).toEqual({id: 4, type: 'Mage', hp: 75, alive: true});
    guild.data.supplies = 9;
    expect(guild.recruit('Knight')).toBe(false);
    expect(guild.data.roster).toHaveLength(4);
  });

  it('closes an expedition left active by a reload', () => {
    const first = new GuildState(store);
    first.beginExpedition();
    const second = new GuildState(store);
    expect(second.data.activeExpedition).toBe(false);
    expect(second.data.expeditions).toBe(1);
  });

  it('copies live hit points back to the roster, never below 1 for the living', () => {
    const guild = new GuildState(store);
    guild.syncFrom([{rosterId: 1, dead: false, hp: 40.2}, {rosterId: 2, dead: true, hp: 0}, {rosterId: 99, dead: false, hp: 1}]);
    expect(guild.data.roster[0]).toMatchObject({hp: 41, alive: true});
    expect(guild.data.roster[1]).toMatchObject({alive: false, hp: 1});
  });

  it('records a death once and persists it', () => {
    const guild = new GuildState(store);
    guild.recordDeath(2);
    expect(new GuildState(store).data.roster[1]).toMatchObject({alive: false, hp: 0});
  });

  it.each([
    ['not an object', 'x'],
    ['missing roster', {supplies: 1}],
    ['bad hero type', {roster: [{id: 1, type: 'Dragon', hp: 1, alive: true}]}],
    ['bad hp', {roster: [{id: 1, type: 'Knight', hp: 'many', alive: true}]}],
  ])('rejects a save with %s', (_label, raw) => {
    expect(parseGuild(raw)).toBeNull();
  });

  it('falls back to a fresh guild when the save is unusable', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    store.setItem(STORAGE_KEYS.guild, '{"roster": [{"id": 1, "type": "Dragon"}]}');
    expect(new GuildState(store).data).toEqual(createDefaultGuild());
  });

  it('fills missing counters when loading an older save', () => {
    const parsed = parseGuild({roster: [{id: 7, type: 'Knight', hp: 5, alive: true}]});
    expect(parsed).toMatchObject({supplies: 0, nextId: 8, expeditions: 0, deepest: 0});
  });
});
