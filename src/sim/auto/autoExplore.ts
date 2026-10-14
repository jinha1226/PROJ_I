import {EXTRACT_RADIUS, INTERACT_RANGE, TILE} from '../../config';
import {dist, type Vec2} from '../../core/math';
import {tileCenter} from '../../world/mapgen';
import type {Raid} from '../raid';
import type {Container, SimInput} from '../types';
import {takeBest} from './looting';
import {isManual, Steering} from './steer';

const RESUME_AFTER_IDLE = 3;
const THREAT_RANGE = 10;
const CALM_SECONDS = 2;
const LOOT_INTERVAL = 0.22;
const ARRIVE = 1.7;
const SPRINT_STAMINA = 60;

export type AutoExplorePhase = 'locked' | 'off' | 'paused' | 'threat' | 'looting' | 'moving' | 'leaving';

type Target = {kind: 'container'; id: number} | {kind: 'tile'; at: Vec2} | {kind: 'extract'; zone: number};

/**
 * Walks the dungeon on its own: nearest unsearched container, then unexplored
 * ground, then the nearest exit. Looting keeps the best value per cell.
 * Fighting is left to the player (or the future auto-battle).
 */
export class AutoExplore {
  private enabled = true;
  private idleTimer = RESUME_AFTER_IDLE;
  private calmTimer = CALM_SECONDS;
  private lootTimer = 0;
  private target: Target | null = null;
  private readonly done = new Set<number>();
  private readonly skipped = new Map<number, Set<number>>();
  private readonly steering: Steering;
  private phase: AutoExplorePhase = 'moving';
  private warnedThreat = false;

  constructor(
    private readonly raid: Raid,
    private readonly level: number,
  ) {
    this.steering = new Steering(raid.map);
  }

  get unlocked(): boolean {
    return this.level > 0;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  status(): AutoExplorePhase {
    if (!this.unlocked) return 'locked';
    if (!this.enabled) return 'off';
    return this.phase;
  }

  private threatened(): boolean {
    const p = this.raid.player;
    return this.raid.enemies.some(e => e.alive && e.alerted && e.canSee && dist(e, p) < THREAT_RANGE);
  }

  /** Path distance (tiles) from the player, via the raid's player-centered field. */
  private steps(at: Vec2): number {
    return this.raid.flow.stepsFrom(at);
  }

  private worthVisiting(c: Container): boolean {
    if (this.done.has(c.id) || c.type === 'pile') return false;
    return this.raid.stores.grids[c.gridId].items.length > 0;
  }

  private pickTarget(): Target | null {
    const raid = this.raid;
    let best: Container | null = null;
    let bestSteps = Infinity;
    for (const c of raid.containers) {
      if (!this.worthVisiting(c)) continue;
      const s = this.steps(c);
      if (s < bestSteps) {
        bestSteps = s;
        best = c;
      }
    }
    if (best) return {kind: 'container', id: best.id};
    let tile: Vec2 | null = null;
    let tileSteps = Infinity;
    for (let y = 0; y < raid.map.h; y++) {
      for (let x = 0; x < raid.map.w; x++) {
        const i = y * raid.map.w + x;
        if (!raid.map.tiles[i] || raid.explored[i]) continue;
        const at = {x: tileCenter(x), z: tileCenter(y)};
        const s = this.steps(at);
        if (s < tileSteps) {
          tileSteps = s;
          tile = at;
        }
      }
    }
    if (tile) return {kind: 'tile', at: tile};
    let zone = -1;
    let zoneSteps = Infinity;
    raid.zones.forEach((z, i) => {
      const s = this.steps(z);
      if (s < zoneSteps) {
        zoneSteps = s;
        zone = i;
      }
    });
    return zone >= 0 ? {kind: 'extract', zone} : null;
  }

  private targetPoint(t: Target): Vec2 | null {
    if (t.kind === 'tile') return t.at;
    if (t.kind === 'extract') return this.raid.zones[t.zone];
    return this.raid.containers.find(c => c.id === t.id) ?? null;
  }

  private stillValid(t: Target): boolean {
    if (t.kind === 'container') {
      const c = this.raid.containers.find(x => x.id === t.id);
      return Boolean(c && this.worthVisiting(c));
    }
    if (t.kind === 'tile') return !this.raid.explored[Math.floor(t.at.z / TILE) * this.raid.map.w + Math.floor(t.at.x / TILE)];
    return true;
  }

  /** Searches the open container one item at a time; closes it when nothing is left worth taking. */
  private loot(input: SimInput, dt: number): SimInput {
    const raid = this.raid;
    const c = raid.containers.find(x => x.id === raid.openContainer)!;
    this.phase = 'looting';
    this.lootTimer -= dt;
    const halt = {...input, move: {x: 0, z: 0}};
    if (this.lootTimer > 0) return halt;
    this.lootTimer = LOOT_INTERVAL;
    const skip = this.skipped.get(c.id) ?? new Set<number>();
    this.skipped.set(c.id, skip);
    const step = takeBest(raid.stores, c.gridId, uid => raid.isHidden(c.id, uid), skip, {allowSwap: this.level >= 2, fillBelt: this.level >= 3});
    if (step.taken) {
      raid.stores = step.stores;
      return halt;
    }
    const searching = c.revealed < c.revealOrder.length;
    if (searching) return halt;
    // Fully searched and nothing else fits or is worth it.
    this.done.add(c.id);
    this.target = null;
    return {...halt, interact: true};
  }

  apply(input: SimInput, dt: number, manual = isManual(input.move, input.attack, input.dodge)): SimInput {
    const raid = this.raid;
    if (!this.unlocked || !this.enabled || !raid.player.alive || raid.outcome) return input;
    if (manual) {
      this.idleTimer = 0;
      this.phase = 'paused';
      return input;
    }
    this.idleTimer = Math.min(RESUME_AFTER_IDLE, this.idleTimer + dt);
    if (this.idleTimer < RESUME_AFTER_IDLE) {
      this.phase = 'paused';
      return input;
    }
    if (this.threatened()) {
      this.calmTimer = 0;
      this.phase = 'threat';
      if (!this.warnedThreat) raid.emit({type: 'notice', text: '적 발견 — 자동 탐험 일시정지', tone: 'warn'});
      this.warnedThreat = true;
      return input;
    }
    this.calmTimer += dt;
    if (this.calmTimer < CALM_SECONDS) {
      this.phase = 'threat';
      return input;
    }
    this.warnedThreat = false;

    if (raid.openContainer !== null) return this.loot(input, dt);

    if (!this.target || !this.stillValid(this.target)) this.target = this.pickTarget();
    const target = this.target;
    const point = target && this.targetPoint(target);
    if (!target || !point) return input;
    this.phase = target.kind === 'extract' ? 'leaving' : 'moving';
    const arrive = target.kind === 'container' ? ARRIVE : target.kind === 'extract' ? EXTRACT_RADIUS * 0.45 : TILE * 0.4;
    const move = this.steering.toward(raid.player, point, dt, arrive);
    const sprint = this.level >= 3 && raid.player.stamina > SPRINT_STAMINA;
    if (target.kind === 'container' && dist(raid.player, point) < INTERACT_RANGE * 0.9) {
      // E opens the nearest container, so only press it once ours is the nearest; otherwise step closer.
      if (raid.nearestContainer()?.id === target.id) return {...input, move: {x: 0, z: 0}, interact: true};
      return {...input, move: this.steering.toward(raid.player, point, dt, 0.3), interact: false};
    }
    return {...input, move, sprint, interact: false};
  }
}
