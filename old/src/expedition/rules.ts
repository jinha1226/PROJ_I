// Pure expedition rules: no DOM, Three.js or storage dependencies.
import {MAX_PARTY_SIZE} from '../config';
import type {Guild, RosterHero} from '../types';

export interface RewardInput {
  successful: boolean;
  survivors: number;
  discoveredTiles: number;
  loot: number;
}

const TILES_PER_SUPPLY = 5;

export function expeditionReward({successful, survivors, discoveredTiles, loot}: RewardInput): number {
  if (!successful || survivors <= 0) return 0;
  return Math.floor(Math.max(0, discoveredTiles) / TILES_PER_SUPPLY) + Math.max(0, loot);
}

export function livingRoster<T extends Pick<RosterHero, 'alive' | 'hp'>>(roster: readonly T[], limit: number = MAX_PARTY_SIZE): T[] {
  return roster.filter(hero => hero.alive && hero.hp > 0).slice(0, limit);
}

/** Marks a hero permanently dead. Returns false if unknown or already dead. */
export function recordHeroDeath(roster: RosterHero[], rosterId: number): boolean {
  const hero = roster.find(h => h.id === rosterId);
  if (!hero || !hero.alive) return false;
  hero.alive = false;
  hero.hp = 0;
  return true;
}

/** An expedition left open by a reload counts as one completed (failed) run. */
export function closeInterruptedExpedition(guild: Guild): boolean {
  if (!guild.activeExpedition) return false;
  guild.activeExpedition = false;
  guild.expeditions = (guild.expeditions || 0) + 1;
  return true;
}
