import {AnimationAction, AnimationMixer, LoopOnce, LoopRepeat, MathUtils, type Mesh, type Object3D, type Scene, Vector3} from 'three';
import type {ActorView, AnimationType} from '../types';

const ANIMATION_PATTERNS: Readonly<Record<AnimationType, RegExp>> = {
  idle: /idle/i,
  walk: /walk|run/i,
  attack: /attack|slash|shoot|cast/i,
  hit: /hit|hurt|damage/i,
  death: /death|die/i,
};

const FADE_SECONDS = 0.12;
const SETTLE_RATE = 12;
const FADE_SINK_SPEED = 1.1;
const FADE_SHRINK_RATE = 1.7;
const FADE_HIDE_AFTER = 1.25;
const MIN_RECOVERY_MS = 280;
const MAX_RECOVERY_MS = 900;
const RECOVERY_CLIP_RATIO = 850;

const isOneShot = (type: AnimationType): boolean => type === 'attack' || type === 'hit' || type === 'death';

export class ThreeActorView implements ActorView {
  private readonly mixer: AnimationMixer;
  private current: AnimationAction | null = null;
  private currentKey: string | null = null;
  private recoveryTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly scene: Scene,
    private readonly root: Object3D,
    private readonly ring: Mesh,
    private readonly actions: ReadonlyMap<string, AnimationAction>,
    mixer: AnimationMixer,
    /** One-shot poses return to idle only while the actor still lives. */
    private readonly isAlive: () => boolean,
  ) {
    this.mixer = mixer;
  }

  play(type: AnimationType, force = false): void {
    const key = [...this.actions.keys()].find(k => ANIMATION_PATTERNS[type].test(k));
    if (!key || (!force && this.currentKey === key)) return;
    const action = this.actions.get(key)!;
    if (this.current && this.current !== action) this.current.fadeOut(FADE_SECONDS);
    action.reset().fadeIn(FADE_SECONDS);
    action.setLoop(isOneShot(type) ? LoopOnce : LoopRepeat, isOneShot(type) ? 1 : Infinity);
    action.clampWhenFinished = type === 'death';
    action.play();
    this.current = action;
    this.currentKey = key;

    if (type === 'attack' || type === 'hit') {
      clearTimeout(this.recoveryTimer);
      const ms = Math.min(MAX_RECOVERY_MS, Math.max(MIN_RECOVERY_MS, action.getClip().duration * RECOVERY_CLIP_RATIO));
      this.recoveryTimer = setTimeout(() => {
        if (this.isAlive()) this.play('idle');
      }, ms);
    }
  }

  idleIfWalking(): void {
    if (this.currentKey && ANIMATION_PATTERNS.walk.test(this.currentKey)) this.play('idle');
  }

  clipDuration(): number {
    return this.current?.getClip().duration ?? 0;
  }

  tick(dt: number): void {
    this.mixer.update(dt);
  }

  place(pos: Vector3): void {
    this.root.position.x = pos.x;
    this.root.position.z = pos.z;
    this.ring.position.x = pos.x;
    this.ring.position.z = pos.z;
  }

  faceTowards(from: Vector3, to: Vector3): void {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    if (dx * dx + dz * dz > 0.001) this.root.rotation.y = Math.atan2(dx, dz);
  }

  setFacing(angle: number): void {
    this.root.rotation.y = angle;
  }

  settle(dt: number): void {
    this.root.position.y = MathUtils.lerp(this.root.position.y, 0, Math.min(1, dt * SETTLE_RATE));
  }

  bump(amount: number): void {
    this.root.position.y += amount;
  }

  fadeOut(dt: number, dyingTime: number): void {
    this.root.position.y -= dt * FADE_SINK_SPEED;
    this.root.scale.multiplyScalar(Math.max(0.1, 1 - dt * FADE_SHRINK_RATE));
    if (dyingTime > FADE_HIDE_AFTER) this.root.visible = false;
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  setRingVisible(visible: boolean): void {
    this.ring.visible = visible;
  }

  scaleBy(factor: number): void {
    this.root.scale.multiplyScalar(factor);
  }

  dispose(): void {
    clearTimeout(this.recoveryTimer);
    this.scene.remove(this.root);
    this.scene.remove(this.ring);
    this.mixer.stopAllAction();
  }
}
