import type {Actor} from '../types';
import {selectMonsterTarget} from './monsterBehaviors';

/** Enemies that belong to other dungeon rooms sit out the current fight. */
export function isInCombat(actor: Actor, room: number): boolean {
  return actor.team !== 'enemy' || actor.dungeonRoom === undefined || actor.dungeonRoom === room;
}

export function activeCombatActors(actors: readonly Actor[], room: number): Actor[] {
  return actors.filter(a => isInCombat(a, room));
}

export function livingCombatSides(actors: readonly Actor[], room: number): {heroes: Actor[]; foes: Actor[]} {
  const active = activeCombatActors(actors, room).filter(a => !a.dead);
  return {heroes: active.filter(a => a.team === 'hero'), foes: active.filter(a => a.team === 'enemy')};
}

/** Priority: active taunt, then tactical focus, then the role's default targeting. */
export function chooseCombatTarget(actor: Actor, enemies: readonly Actor[]): Actor | undefined | null {
  if ((actor.tauntTime ?? 0) > 0 && !actor.tauntedBy?.dead && actor.tauntedBy?.team !== actor.team && actor.tauntedBy) return actor.tauntedBy;
  if ((actor.focusTime ?? 0) > 0 && actor.focus && !actor.focus.dead) return actor.focus;
  if (actor.team === 'enemy') return selectMonsterTarget(actor, enemies);
  return enemies.reduce<Actor | null>(
    (best, b) => (!best || b.pos.distanceToSquared(actor.pos) < best.pos.distanceToSquared(actor.pos) ? b : best),
    null,
  );
}

const TIMED_STATUS_KEYS = ['tauntTime', 'guardTime', 'focusTime', 'kiteBonusTime', 'retreatTime'] as const;

export function decayCombatTimers(actor: Actor, dt: number): void {
  const cooldowns = actor.tacticCooldowns;
  if (cooldowns) for (const key of Object.keys(cooldowns)) cooldowns[key] = Math.max(0, cooldowns[key] - dt);
  for (const key of TIMED_STATUS_KEYS) actor[key] = Math.max(0, (actor[key] ?? 0) - dt);
}
