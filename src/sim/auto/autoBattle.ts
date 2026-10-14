import {PLAYER} from '../../config';
import {dist, type Vec2} from '../../core/math';
import {itemDef} from '../../items/catalog';
import type {SlotId} from '../../items/stores';
import {isWalkable} from '../../world/physics';
import {UNARMED_STATS} from '../attacks';
import type {Raid} from '../raid';
import type {Enemy, SimInput} from '../types';
import {isManual, Steering} from './steer';

const ENGAGE_RANGE = 12;
const CLOSE_RANGE = 4;
const DISENGAGE_SECONDS = 2.5;
const RESUME_AFTER_IDLE = 3;
/** How close to the end of an enemy wind-up the dodge is pressed. */
const DODGE_LEAD = 0.12;
const PROJECTILE_LOOKAHEAD = 0.24;
const DODGE_DISTANCE = 3.5;
const SAFE_HEAL_DISTANCE = 3.5;

interface Skill {
  dodgeChance: number;
  healBelow: number;
  preferRanged: boolean;
  /** Keep this much stamina so a dodge is always available. */
  reserve: number;
}

const SKILL_BY_LEVEL: readonly Skill[] = [
  {dodgeChance: 0, healBelow: 0, preferRanged: false, reserve: 0},
  {dodgeChance: 0.55, healBelow: 0.35, preferRanged: false, reserve: 0},
  {dodgeChance: 0.8, healBelow: 0.45, preferRanged: true, reserve: PLAYER.dodgeCost},
  {dodgeChance: 0.95, healBelow: 0.5, preferRanged: true, reserve: PLAYER.dodgeCost},
];

export type AutoBattlePhase = 'locked' | 'off' | 'paused' | 'idle' | 'fighting';

/**
 * Fights for the player: reads the same telegraphs a human sees (wind-ups,
 * incoming projectiles), dodges with a level-dependent success rate, heals
 * when safe, and attacks targets in reach.
 */
export class AutoBattle {
  private enabled = true;
  private idleTimer = RESUME_AFTER_IDLE;
  private calmTimer = DISENGAGE_SECONDS;
  private engagedFlag = false;
  private target: Enemy | null = null;
  /** Each threat (a wind-up or a projectile) gets one dodge roll. */
  private readonly decided = new Map<string, boolean>();
  private readonly steering: Steering;
  private readonly skill: Skill;

  constructor(
    private readonly raid: Raid,
    private readonly level: number,
  ) {
    this.steering = new Steering(raid.map);
    this.skill = SKILL_BY_LEVEL[Math.min(level, SKILL_BY_LEVEL.length - 1)];
  }

  get unlocked(): boolean {
    return this.level > 0;
  }

  get engaged(): boolean {
    return this.engagedFlag;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (!this.enabled) this.engagedFlag = false;
    return this.enabled;
  }

  status(): AutoBattlePhase {
    if (!this.unlocked) return 'locked';
    if (!this.enabled) return 'off';
    if (this.idleTimer < RESUME_AFTER_IDLE) return 'paused';
    return this.engagedFlag ? 'fighting' : 'idle';
  }

  private hostiles(): Enemy[] {
    const p = this.raid.player;
    return this.raid.enemies.filter(e => e.alive && e.state !== 'dormant' && ((e.alerted && e.canSee && dist(e, p) < ENGAGE_RANGE) || dist(e, p) < CLOSE_RANGE));
  }

  private roll(key: string): boolean {
    let ok = this.decided.get(key);
    if (ok === undefined) {
      ok = this.raid.rng.chance(this.skill.dodgeChance);
      this.decided.set(key, ok);
      if (this.decided.size > 200) this.decided.clear();
    }
    return ok;
  }

  /** Direction away from the most urgent threat, or null when nothing is about to land. */
  private dodgeDirection(): Vec2 | null {
    const p = this.raid.player;
    if (p.stamina < PLAYER.dodgeCost * 0.5 || p.state === 'dodge') return null;
    for (const e of this.raid.enemies) {
      if (!e.alive) continue;
      const left = e.stateDuration - e.stateTime;
      const meleeSoon = e.state === 'windup' && left < DODGE_LEAD && this.raid.inArc(e, e.facing, p, (e.kind === 'raider' ? 2.1 : 2.3) + 0.6, Math.PI * 0.75);
      const shotSoon = e.state === 'aim' && left < DODGE_LEAD;
      if ((meleeSoon || shotSoon) && !this.canInterrupt(e) && this.roll(`${e.id}:${e.state}:${Math.round((this.raid.time - e.stateTime) * 10)}`)) {
        return this.sidestep({x: Math.sin(e.facing), z: Math.cos(e.facing)});
      }
    }
    for (const pr of this.raid.projectiles) {
      const rx = p.x - pr.x;
      const rz = p.z - pr.z;
      const v2 = pr.vx * pr.vx + pr.vz * pr.vz;
      const t = (rx * pr.vx + rz * pr.vz) / v2;
      if (t <= 0 || t > PROJECTILE_LOOKAHEAD) continue;
      const miss = Math.hypot(rx - pr.vx * t, rz - pr.vz * t);
      if (miss < p.r + pr.r + 0.35 && this.roll(`p${pr.id}`)) {
        const len = Math.sqrt(v2);
        return this.sidestep({x: pr.vx / len, z: pr.vz / len});
      }
    }
    return null;
  }

  /**
   * Top level only: a staggerable enemy in reach whose wind-up ends after our
   * blade lands is better hit than dodged (the hit cancels its attack).
   */
  private canInterrupt(e: Enemy): boolean {
    if (this.level < 3 || e.poiseTimer > 0 || e.state !== 'windup') return false;
    const p = this.raid.player;
    const reach = (this.raid.weapon ?? UNARMED_STATS).reach + e.r - 0.35;
    const hitTime = 0.2 * (this.raid.weapon?.speed ?? 1);
    const idle = p.state === 'idle' || p.state === 'move';
    return idle && dist(p, e) <= reach && e.stateDuration - e.stateTime > hitTime && p.stamina >= PLAYER.attackCost;
  }

  /** Perpendicular to the incoming direction, toward open floor; straight back if both sides are walls. */
  private sidestep(incoming: Vec2): Vec2 {
    const p = this.raid.player;
    const options: Vec2[] = [{x: -incoming.z, z: incoming.x}, {x: incoming.z, z: -incoming.x}, {x: incoming.x, z: incoming.z}];
    for (const d of options) {
      if (isWalkable(this.raid.map, {x: p.x + d.x * DODGE_DISTANCE, z: p.z + d.z * DODGE_DISTANCE}, 0.6)) return d;
    }
    return options[2];
  }

  private pickTarget(hostiles: Enemy[]): Enemy {
    const p = this.raid.player;
    const meleeClose = hostiles.some(e => e.kind === 'warrior' && dist(e, p) < 4);
    // Go for casters and archers first, unless a melee enemy is already in our face.
    const score = (e: Enemy): number => dist(e, p) - (this.skill.preferRanged && !meleeClose && e.kind !== 'warrior' ? 6 : 0);
    if (this.target && this.target.alive && hostiles.includes(this.target) && score(this.target) < score(hostiles[0]) + 3) return this.target;
    return [...hostiles].sort((a, b) => score(a) - score(b))[0];
  }

  private healSlot(): SlotId | null {
    for (const slot of ['belt0', 'belt1'] as const) {
      const item = this.raid.stores.slots[slot];
      if (item && (itemDef(item.defId).consumable?.heal ?? 0) > 0) return slot;
    }
    return null;
  }

  /** Dodge-only reflexes, used while the auto-return is walking home. */
  defend(input: SimInput): SimInput {
    if (!this.unlocked || !this.enabled || !this.raid.player.alive) return input;
    const dodge = this.dodgeDirection();
    return dodge ? {...input, move: dodge, dodge: true} : input;
  }

  apply(input: SimInput, dt: number, manual = isManual(input.move, input.attack, input.dodge)): SimInput {
    const raid = this.raid;
    const p = raid.player;
    if (!this.unlocked || !this.enabled || !p.alive || raid.outcome) {
      this.engagedFlag = false;
      return input;
    }
    if (manual) {
      this.idleTimer = 0;
      return input;
    }
    this.idleTimer = Math.min(RESUME_AFTER_IDLE, this.idleTimer + dt);
    if (this.idleTimer < RESUME_AFTER_IDLE) return input;

    const hostiles = this.hostiles();
    if (hostiles.length) this.calmTimer = 0;
    else this.calmTimer += dt;
    this.engagedFlag = hostiles.length > 0 || this.calmTimer < DISENGAGE_SECONDS;
    if (!hostiles.length) {
      this.target = null;
      return input;
    }

    const dodge = this.dodgeDirection();
    if (dodge) return {...input, move: dodge, dodge: true, attack: false, interact: false};

    const target = (this.target = this.pickTarget(hostiles));
    const d = dist(p, target);
    const reach = (raid.weapon ?? UNARMED_STATS).reach + target.r - 0.35;
    const nearest = Math.min(...hostiles.map(e => dist(e, p)));
    const heal = this.healSlot();
    if (heal && p.hp < p.maxHp * this.skill.healBelow && nearest > SAFE_HEAL_DISTANCE && p.state !== 'use') {
      return {...input, move: {x: 0, z: 0}, use: heal, attack: false};
    }
    const base = {...input, aim: {x: target.x, z: target.z}, interact: false, sprint: false};
    const away = {x: (p.x - target.x) / Math.max(d, 0.01), z: (p.z - target.z) / Math.max(d, 0.01)};
    // Keep enough stamina for an emergency dodge (higher levels only).
    if (p.stamina < this.skill.reserve * 0.5 && nearest < 3) return {...base, move: away, attack: false};
    if (d <= reach) {
      const canSwing = p.stamina - PLAYER.attackCost >= this.skill.reserve * 0.5;
      // Hits stagger enemies and cancel their wind-up, so attacking is usually the best defense.
      // Smarter levels only swing into a wind-up when the blade lands before it resolves.
      const hitTime = 0.2 * (raid.weapon?.speed ?? 1);
      const beatsWindup = target.state !== 'windup' || target.stateDuration - target.stateTime > hitTime + 0.05;
      const swing = canSwing && (this.level === 1 || beatsWindup || target.poiseTimer <= 0);
      return {...base, move: {x: 0, z: 0}, attack: swing};
    }
    return {...base, move: this.steering.toward(p, target, dt, reach * 0.8), attack: false};
  }
}
