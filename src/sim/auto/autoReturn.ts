import {EXTRACT_RADIUS, EXTRACT_SECONDS, PLAYER, TILE} from '../../config';
import {FlowField} from '../../world/physics';
import type {Raid} from '../raid';
import {itemDef} from '../../items/catalog';
import type {SimInput} from '../types';
import {isManual, Steering} from './steer';

/** Safety factor on the travel estimate per node level (1 = unlocked). Higher levels leave later. */
const MARGIN_BY_LEVEL = [0, 1.5, 1.3, 1.15] as const;
/** Paths are rarely tile-center straight lines; pad the estimate. */
const PATH_FACTOR = 1.15;
const FIXED_BUFFER = 4;
const RESUME_AFTER_IDLE = 3;
/** Below this health with no healing left, go home instead of risking everything. */
const WOUNDED_RATIO = 0.3;

export type AutoReturnPhase = 'locked' | 'off' | 'watching' | 'returning' | 'paused';

export interface AutoReturnStatus {
  phase: AutoReturnPhase;
  /** Seconds of oil left before the return must start (watching), or the target zone (returning). */
  slack: number;
  zone: number | null;
}

/**
 * Walks the player to the nearest extraction when the remaining oil only just
 * covers the trip. It produces movement input like a player would, so the
 * simulation treats it exactly like manual play.
 */
export class AutoReturn {
  private readonly fields: FlowField[];
  private enabled = true;
  private active = false;
  private idleTimer = RESUME_AFTER_IDLE;
  private readonly steering: Steering;

  constructor(
    private readonly raid: Raid,
    private readonly level: number,
  ) {
    this.steering = new Steering(raid.map);
    this.fields = raid.zones.map(zone => {
      const field = new FlowField(raid.map);
      field.update(zone);
      return field;
    });
  }

  get unlocked(): boolean {
    return this.level > 0;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (!this.enabled) this.active = false;
    return this.enabled;
  }

  /** Nearest extraction by walking distance, and the seconds needed to reach and use it. */
  plan(): {zone: number; seconds: number} | null {
    const p = this.raid.player;
    let best: {zone: number; seconds: number} | null = null;
    for (let zone = 0; zone < this.fields.length; zone++) {
      const steps = this.fields[zone].stepsFrom(p);
      if (!Number.isFinite(steps)) continue;
      const seconds = (steps * TILE * PATH_FACTOR) / PLAYER.walkSpeed + EXTRACT_SECONDS;
      if (!best || seconds < best.seconds) best = {zone, seconds};
    }
    return best;
  }

  status(): AutoReturnStatus {
    if (!this.unlocked) return {phase: 'locked', slack: 0, zone: null};
    if (!this.enabled) return {phase: 'off', slack: 0, zone: null};
    const plan = this.plan();
    const slack = plan ? this.raid.oilSeconds - this.required(plan.seconds) : 0;
    if (this.active) return {phase: 'returning', slack, zone: plan?.zone ?? null};
    return {phase: this.idleTimer < RESUME_AFTER_IDLE ? 'paused' : 'watching', slack, zone: plan?.zone ?? null};
  }

  private wounded(): boolean {
    const p = this.raid.player;
    if (p.hp > p.maxHp * WOUNDED_RATIO) return false;
    const slots = [this.raid.stores.slots.belt0, this.raid.stores.slots.belt1];
    return !slots.some(item => item && (itemDef(item.defId).consumable?.heal ?? 0) > 0);
  }

  private required(travel: number): number {
    return travel * MARGIN_BY_LEVEL[Math.min(this.level, MARGIN_BY_LEVEL.length - 1)] + FIXED_BUFFER;
  }

  get returning(): boolean {
    return this.active;
  }

  /**
   * Returns the input to feed the simulation this frame.
   * @param manual whether the human is steering right now (other automation does not count).
   */
  apply(input: SimInput, dt: number, manual = isManual(input.move)): SimInput {
    const raid = this.raid;
    if (!this.unlocked || !this.enabled || !raid.player.alive || raid.outcome) return input;
    if (manual) {
      if (this.active) raid.emit({type: 'notice', text: '자동 귀환 취소 — 손을 떼면 다시 대기합니다', tone: 'info'});
      this.active = false;
      this.idleTimer = 0;
      return input;
    }
    this.idleTimer = Math.min(RESUME_AFTER_IDLE, this.idleTimer + dt);
    const plan = this.plan();
    if (!plan) return input;
    if (!this.active && this.idleTimer >= RESUME_AFTER_IDLE) {
      const lowOil = raid.oilSeconds <= this.required(plan.seconds);
      const wounded = this.wounded();
      if (lowOil || wounded) {
        this.active = true;
        const why = lowOil ? '랜턴 기름이 아슬아슬하다' : '부상이 심하고 회복약이 없다';
        raid.emit({type: 'notice', text: `${why} — <b>${raid.zones[plan.zone].name}</b>(으)로 자동 귀환`, tone: 'warn'});
      }
    }
    if (!this.active) return input;
    const zone = raid.zones[plan.zone];
    // Stop the bag-and-search routine: walk, and keep standing in the circle.
    return {...input, move: this.steering.toward(raid.player, zone, dt, EXTRACT_RADIUS * 0.45), sprint: false, interact: false};
  }
}
