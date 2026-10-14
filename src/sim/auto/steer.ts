import {dist, type Vec2} from '../../core/math';
import {FlowField, lineOfSight} from '../../world/physics';
import type {GameMap} from '../../world/mapgen';

const STUCK_SECONDS = 1.2;
const STUCK_DISTANCE = 1;

/** True when a sampled input carries any deliberate player action. */
export const isManual = (move: Vec2, attack = false, dodge = false): boolean => Math.hypot(move.x, move.z) > 0.1 || attack || dodge;

/**
 * Turns "go to this point" into a movement direction: straight when in sight,
 * otherwise along a flow field toward the goal, with a sidestep when stuck.
 */
export class Steering {
  private field: FlowField;
  private goalKey = '';
  private stuckTimer = 0;
  private lastPos: Vec2 = {x: 0, z: 0};
  private nudge: Vec2 | null = null;

  constructor(private readonly map: GameMap) {
    this.field = new FlowField(map);
  }

  /** Returns a unit direction (or zero when arrived within `arrive`). */
  toward(from: Vec2, goal: Vec2, dt: number, arrive = 0.6): Vec2 {
    const key = `${Math.round(goal.x * 10)},${Math.round(goal.z * 10)}`;
    if (key !== this.goalKey) {
      this.goalKey = key;
      this.field = new FlowField(this.map);
      this.field.update(goal);
      this.stuckTimer = 0;
      this.nudge = null;
    }
    if (dist(from, goal) < arrive) return {x: 0, z: 0};
    this.stuckTimer += dt;
    if (this.stuckTimer > STUCK_SECONDS) {
      const moved = dist(from, this.lastPos);
      this.lastPos = {x: from.x, z: from.z};
      this.stuckTimer = 0;
      this.nudge = moved < STUCK_DISTANCE ? {x: Math.random() * 2 - 1, z: Math.random() * 2 - 1} : null;
    }
    const target = lineOfSight(this.map, from, goal) ? goal : this.field.nextStep(from);
    if (!target) return {x: 0, z: 0};
    const dx = target.x - from.x + (this.nudge?.x ?? 0) * 2;
    const dz = target.z - from.z + (this.nudge?.z ?? 0) * 2;
    const len = Math.hypot(dx, dz) || 1;
    return {x: dx / len, z: dz / len};
  }

  /** Walking distance in tiles from the goal's field (Infinity if unreachable). */
  stepsFrom(from: Vec2): number {
    return this.field.stepsFrom(from);
  }
}
