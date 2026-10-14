import type {Vector3} from 'three';
import type {Actor, ProjectileKind} from '../types';
import type {CombatFx, ProjectileVisual} from './ports';

const AOE_WINDUP_SECONDS = 0.4;
const SHOT_HEIGHT_FROM = 1.35;
const SHOT_HEIGHT_TO = 1.15;
const FLIGHT_SECONDS: Record<ProjectileKind, number> = {arrow: 0.2, spell: 0.37};
const PROJECTILE_HIT_COLOR: Record<ProjectileKind, string> = {arrow: '#ffe29b', spell: '#8bc7ff'};

interface PendingAttack {
  attacker: Actor;
  target: Actor;
  remaining: number;
  aoe: boolean;
}

interface Shot {
  attacker: Actor;
  target: Actor;
  kind: ProjectileKind;
  age: number;
  duration: number;
  visual: ProjectileVisual;
}

export interface AttackResolvers {
  resolveAoe(attacker: Actor, center: Actor): void;
  resolveAttack(attacker: Actor, target: Actor): void;
  /** Called when a projectile lands on a still-living target. */
  projectileHit(attacker: Actor, target: Actor, color: string): void;
}

/** Delayed attack resolution: wind-ups before the blow lands, and projectiles in flight. */
export class AttackQueue {
  private pending: PendingAttack[] = [];
  private shots: Shot[] = [];

  constructor(private readonly fx: CombatFx) {}

  scheduleAttack(attacker: Actor, target: Actor, windup: number): void {
    this.pending.push({attacker, target, remaining: windup, aoe: false});
  }

  scheduleAoe(attacker: Actor, center: Actor): void {
    this.pending.push({attacker, target: center, remaining: AOE_WINDUP_SECONDS, aoe: true});
  }

  launch(attacker: Actor, target: Actor, kind: ProjectileKind): void {
    const from: Vector3 = attacker.pos.clone();
    from.y += SHOT_HEIGHT_FROM;
    const to: Vector3 = target.pos.clone();
    to.y += SHOT_HEIGHT_TO;
    this.shots.push({attacker, target, kind, age: 0, duration: FLIGHT_SECONDS[kind], visual: this.fx.spawnProjectile(from, to, kind)});
  }

  /** Wind-ups resolve first; shots launched this step already age by `dt`. */
  update(dt: number, resolvers: AttackResolvers): void {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      p.remaining -= dt;
      if (p.remaining > 0) continue;
      this.pending.splice(i, 1);
      if (p.aoe) resolvers.resolveAoe(p.attacker, p.target);
      else resolvers.resolveAttack(p.attacker, p.target);
    }
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const shot = this.shots[i];
      shot.age += dt;
      const t = Math.min(1, shot.age / shot.duration);
      shot.visual.advance(t, dt);
      if (t < 1) continue;
      shot.visual.dispose();
      this.shots.splice(i, 1);
      if (!shot.target.dead) resolvers.projectileHit(shot.attacker, shot.target, PROJECTILE_HIT_COLOR[shot.kind]);
    }
  }

  clear(): void {
    for (const shot of this.shots) shot.visual.dispose();
    this.shots = [];
    this.pending = [];
  }

  get inFlight(): number {
    return this.shots.length + this.pending.length;
  }
}
