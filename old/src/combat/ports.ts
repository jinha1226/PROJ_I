import type {Vector3} from 'three';
import type {ProjectileKind} from '../types';

export interface ProjectileVisual {
  /** `t` is flight progress in [0, 1]; `dt` is the elapsed step for spin animation. */
  advance(t: number, dt: number): void;
  dispose(): void;
}

export interface BossWarningVisual {
  setOpacity(value: number): void;
  dispose(): void;
}

/** Everything combat needs from the presentation layer. */
export interface CombatFx {
  floatText(at: Vector3, text: string, color: string): void;
  impact(at: Vector3, color: number, power?: number): void;
  spawnProjectile(from: Vector3, to: Vector3, kind: ProjectileKind): ProjectileVisual;
  spawnBossWarning(center: Vector3): BossWarningVisual;
  bossPulse(center: Vector3): void;
}
