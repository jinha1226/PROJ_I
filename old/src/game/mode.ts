import type {Actor} from '../types';

export const GameMode = Object.freeze({BASE: 'base', TRAVEL: 'travel', COMBAT: 'combat'});
export type GameMode = (typeof GameMode)[keyof typeof GameMode];

/** The hub can only be opened between expeditions. */
export function canOpenBase(mode: GameMode): boolean {
  return mode === GameMode.BASE;
}

export function canTravel(mode: GameMode, paused: boolean, actors: readonly Pick<Actor, 'team' | 'dead'>[]): boolean {
  return mode === GameMode.TRAVEL && !paused && actors.some(a => a.team === 'hero' && !a.dead);
}

/** Clamps wall-clock deltas so a stalled tab cannot fast-forward the simulation. */
export function frameDelta(nowMs: number, previousMs: number, maxSeconds = 0.05): number {
  return Math.min(Math.max(0, (nowMs - previousMs) / 1000), maxSeconds);
}
