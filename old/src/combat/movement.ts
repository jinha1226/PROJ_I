import {Vector3} from 'three';
import {ENEMY_MOVE_SPEED, HERO_MOVE_SPEED} from '../config';
import type {Navigator} from '../dungeon/navigation';
import type {Actor} from '../types';

const GOAL_DRIFT_SQUARED = 0.36;
const PATH_REFRESH_SECONDS = 1.2;
const WAYPOINT_REACHED = 0.13;
const ARRIVED = 0.02;
const APPROACH_ANGLES = 24;
const GOAL_STICKINESS_SQUARED = 0.1;
const GOAL_STICKINESS_COST = 2.5;
const BOSS_DODGE_DIRECTIONS = 20;
const BOSS_DODGE_RADIUS = 4.15;

// KNOWN-BUG(legacy): dodge candidates are rejected outside the old single-room
// arena bounds, so away from the origin the dodge AI often finds no safe spot.
const LEGACY_ARENA_HALF_X = 7.5;
const LEGACY_ARENA_HALF_Z = 5.5;

export function lookAt(actor: Actor, target: Actor): void {
  actor.view.faceTowards(actor.pos, target.pos);
}

/**
 * Advances `actor` along a (cached) path toward `goal`. Returns false when no
 * path exists or the next step is blocked, so the caller can repath.
 */
export function moveToward(actor: Actor, goal: Vector3, dt: number, nav: Navigator): boolean {
  const goalChanged = !actor.pathGoal || actor.pathGoal.distanceToSquared(goal) > GOAL_DRIFT_SQUARED;
  if (goalChanged || !actor.path?.length || (actor.pathAge ?? 0) <= 0) {
    const route = nav.findPath(actor.pos, goal);
    if (!route) return false;
    // Path points are tile centers; end on the exact goal so an offset goal inside
    // the last tile is actually reached (otherwise fights can deadlock at range).
    actor.path = [...route.points, goal.clone()];
    actor.pathGoal = goal.clone();
    actor.pathAge = PATH_REFRESH_SECONDS;
  }
  actor.pathAge = (actor.pathAge ?? 0) - dt;

  const path = actor.path!;
  while (path.length && actor.pos.distanceTo(path[0]) < WAYPOINT_REACHED) path.shift();
  if (!path.length) return true;

  // Skip intermediate corners when a direct shortcut becomes possible.
  for (let i = path.length - 1; i > 0; i--) {
    if (nav.lineClear(actor.pos, path[i])) {
      path.splice(0, i);
      break;
    }
  }

  const delta = path[0].clone().sub(actor.pos).setY(0);
  const distance = delta.length();
  if (distance < ARRIVED) return true;

  const speed = actor.team === 'hero' ? HERO_MOVE_SPEED : ENEMY_MOVE_SPEED;
  const next = actor.pos.clone().addScaledVector(delta.normalize(), Math.min(distance, dt * speed));
  if (nav.blocked(next.x, next.z)) {
    actor.pathAge = 0;
    return false;
  }
  actor.pos.copy(next);
  actor.view.place(actor.pos);
  actor.view.play('walk');
  return true;
}

/** Picks a standing spot around `target` within attack range, preferring the current goal when it is nearly as cheap. */
export function approachGoal(actor: Actor, target: Actor, nav: Navigator): Vector3 | null {
  const candidates: {p: Vector3; cost: number}[] = [];
  const costOf = nav.pathCosts(actor.pos);
  const radii = [Math.max(0.85, actor.range * 0.72), Math.max(0.95, actor.range * 0.94)];
  for (let i = 0; i < APPROACH_ANGLES; i++) {
    const angle = (i * Math.PI * 2) / APPROACH_ANGLES;
    const direction = new Vector3(Math.cos(angle), 0, Math.sin(angle));
    for (const radius of radii) {
      const p = target.pos.clone().addScaledVector(direction, radius);
      if (nav.blocked(p.x, p.z) || !nav.lineClear(p, target.pos)) continue;
      const cost = costOf(p);
      if (cost !== null) candidates.push({p, cost});
    }
  }
  candidates.sort((x, y) => x.cost - y.cost);
  if (!candidates.length) return null;
  const best = candidates[0];
  const current = actor.pathGoal;
  if (current && candidates.some(c => c.p.distanceToSquared(current) < GOAL_STICKINESS_SQUARED && c.cost < best.cost + GOAL_STICKINESS_COST)) {
    return current;
  }
  return best.p;
}

/** Nearest reachable point just outside a boss shockwave circle, or null. */
export function dodgeGoal(actor: Actor, center: Vector3, nav: Navigator): Vector3 | null {
  let best: Vector3 | null = null;
  let bestCost = Infinity;
  const costOf = nav.pathCosts(actor.pos);
  for (let i = 0; i < BOSS_DODGE_DIRECTIONS; i++) {
    const theta = (i * Math.PI * 2) / BOSS_DODGE_DIRECTIONS;
    const p = center.clone().addScaledVector(new Vector3(Math.cos(theta), 0, Math.sin(theta)), BOSS_DODGE_RADIUS);
    if (Math.abs(p.x) > LEGACY_ARENA_HALF_X || Math.abs(p.z) > LEGACY_ARENA_HALF_Z || nav.blocked(p.x, p.z)) continue;
    const cost = costOf(p);
    if (cost !== null && cost < bestCost) {
      best = p;
      bestCost = cost;
    }
  }
  return best;
}

