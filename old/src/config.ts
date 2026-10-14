import type {HeroType} from './types';

/** World units per dungeon grid tile. */
export const TILE_SIZE = 1.6;

export const GAME_SPEEDS = [1, 2, 4] as const;
export const NEXT_BATTLE_DELAY_MS = 2300;
/** Frames longer than this are clamped so a background tab cannot explode the simulation. */
export const MAX_FRAME_SECONDS = 0.05;

export const HERO_MOVE_SPEED = 2.3;
export const ENEMY_MOVE_SPEED = 1.8;
export const TRAVEL_MOVE_SPEED = 3.2;
export const ARRIVAL_DISTANCE = 0.28;
export const ENCOUNTER_TRIGGER_DISTANCE = 3.4;
export const RETREAT_GRACE_SECONDS = 2;
export const RETREAT_PURSUIT_DAMAGE = 0.45;

export const ACTOR_BODY_RADIUS = 0.43;
export const ACTOR_STEP_RADIUS = 0.42;

export const HUB_RECRUIT_COST = 10;
export const STARTING_SUPPLIES = 30;
export const MAX_PARTY_SIZE = 3;

export const STORAGE_KEYS = {
  progress: 'proj_i_tactics_v1',
  guild: 'proj_i_guild_v1',
} as const;

export interface HeroBaseStats {
  hp: number;
  damage: number;
  range: number;
  cooldown: number;
}

export const HERO_BASE_STATS: Readonly<Record<HeroType, HeroBaseStats>> = {
  Knight: {hp: 115, damage: 19, range: 1.5, cooldown: 0.9},
  Rogue_Hooded: {hp: 78, damage: 13, range: 5, cooldown: 1.15},
  Mage: {hp: 75, damage: 11, range: 5.5, cooldown: 1.3},
};

export const HERO_TYPES: readonly HeroType[] = ['Knight', 'Rogue_Hooded', 'Mage'];
