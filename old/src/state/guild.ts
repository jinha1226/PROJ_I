import {HERO_BASE_STATS, HERO_TYPES, HUB_RECRUIT_COST, STARTING_SUPPLIES, STORAGE_KEYS} from '../config';
import {closeInterruptedExpedition, recordHeroDeath} from '../expedition/rules';
import {readJson, writeJson, type KeyValueStore} from '../persistence/store';
import type {Guild, HeroType, RosterHero} from '../types';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export function createDefaultGuild(): Guild {
  return {
    supplies: STARTING_SUPPLIES,
    nextId: 4,
    expeditions: 0,
    deepest: 0,
    roster: HERO_TYPES.map((type, index) => ({id: index + 1, type, hp: HERO_BASE_STATS[type].hp, alive: true})),
  };
}

function parseHero(raw: unknown): RosterHero | null {
  if (!isRecord(raw)) return null;
  const {id, type, hp, alive} = raw;
  if (typeof id !== 'number' || !Number.isInteger(id) || !HERO_TYPES.includes(type as HeroType)) return null;
  if (typeof hp !== 'number' || !Number.isFinite(hp) || typeof alive !== 'boolean') return null;
  return {id, type: type as HeroType, hp, alive};
}

/** Returns null when the save is unusable, so the caller can start fresh. */
export function parseGuild(raw: unknown): Guild | null {
  if (!isRecord(raw) || !Array.isArray(raw.roster)) return null;
  const roster = raw.roster.map(parseHero);
  if (roster.some(h => h === null)) return null;
  const num = (value: unknown, fallback: number): number => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
  const heroes = roster as RosterHero[];
  return {
    supplies: num(raw.supplies, 0),
    nextId: num(raw.nextId, Math.max(0, ...heroes.map(h => h.id)) + 1),
    expeditions: num(raw.expeditions, 0),
    deepest: num(raw.deepest, 0),
    roster: heroes,
    activeExpedition: raw.activeExpedition === true,
  };
}

/** Owns the persistent hero roster and supplies. */
export class GuildState {
  readonly data: Guild;

  constructor(private readonly store: KeyValueStore) {
    this.data = parseGuild(readJson(store, STORAGE_KEYS.guild)) ?? createDefaultGuild();
    if (closeInterruptedExpedition(this.data)) this.save();
  }

  save(): void {
    writeJson(this.store, STORAGE_KEYS.guild, this.data);
  }

  beginExpedition(): void {
    this.data.activeExpedition = true;
    this.save();
  }

  abortExpedition(): void {
    this.data.activeExpedition = false;
    this.save();
  }

  /** Spends supplies on a new level-appropriate hero. Returns false when too poor. */
  recruit(type: HeroType): boolean {
    if (this.data.supplies < HUB_RECRUIT_COST) return false;
    this.data.supplies -= HUB_RECRUIT_COST;
    this.data.roster.push({id: this.data.nextId++, type, hp: HERO_BASE_STATS[type].hp, alive: true});
    this.save();
    return true;
  }

  recordDeath(rosterId: number): void {
    if (recordHeroDeath(this.data.roster, rosterId)) this.save();
  }

  /** Copies live hit points back to the roster so wounds persist between rooms. */
  syncFrom(heroes: readonly {rosterId?: number; dead: boolean; hp: number}[]): void {
    for (const actor of heroes) {
      const hero = this.data.roster.find(h => h.id === actor.rosterId);
      if (!hero) continue;
      hero.alive = !actor.dead && actor.hp > 0;
      hero.hp = Math.max(1, Math.ceil(actor.hp));
    }
    this.save();
  }
}
