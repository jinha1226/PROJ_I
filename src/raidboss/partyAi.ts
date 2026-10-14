import {angleTo, dist, type Vec2} from '../core/math';
import {ARENA_RADIUS, type BossRaid} from './sim';
import type {Hazard, Unit} from './types';

const HEAL_AMOUNT = 230;
const HEAL_CAST = 1.0;
const GROUP_HEAL = 140;
const GROUP_HEAL_CD = 15;
const TAUNT_CD = 8;
const BLOCK_CD = 10;
const BLOCK_TIME = 3;
const STRIKE_CD = 6;
const VOLLEY_CD = 8;
const RANGED_DISTANCE = 9;
const DODGE_CD = 1.2;
/** Dodge this close to impact; must be shorter than the dodge's i-frames (0.4s). */
const DODGE_LEAD = 0.3;

const clampToArena = (p: Vec2, margin = 1.2): Vec2 => {
  const d = Math.hypot(p.x, p.z);
  const max = ARENA_RADIUS - margin;
  return d > max ? {x: (p.x / d) * max, z: (p.z / d) * max} : p;
};

// ---------- actions shared with the player-controlled unit ----------

export function swing(raid: BossRaid, u: Unit, target: Unit, mult = 1): void {
  u.attackTimer = u.attackTime;
  u.busy = 0.25;
  u.facing = angleTo(u, target);
  raid.setAnim(u, 'attack');
  raid.damage(u, target, u.damage * mult, 'melee');
}

export function shoot(raid: BossRaid, u: Unit, target: Unit, mult = 1): void {
  u.attackTimer = u.attackTime;
  u.busy = 0.2;
  u.facing = angleTo(u, target);
  raid.setAnim(u, 'attack');
  raid.emit({type: 'shot', from: u.id, to: target.id, kind: u.kind === 'healer' ? 'bolt' : 'arrow'});
  raid.damage(u, target, u.damage * mult, u.kind === 'healer' ? 'magic' : 'ranged');
}

export function taunt(raid: BossRaid, u: Unit, enemy: Unit): void {
  u.cooldowns.taunt = TAUNT_CD;
  const top = Math.max(0, ...enemy.threat.values());
  enemy.threat.set(u.id, top * 1.2 + 200);
  enemy.target = u.id;
  enemy.cooldowns.forced = 3;
  raid.emit({type: 'taunt', unit: u.id});
}

export function block(raid: BossRaid, u: Unit): void {
  u.cooldowns.block = BLOCK_CD;
  u.guard = BLOCK_TIME;
  raid.setAnim(u, 'block');
}

export function dodge(raid: BossRaid, u: Unit, dir: Vec2): void {
  const len = Math.hypot(dir.x, dir.z) || 1;
  u.cooldowns.dodge = DODGE_CD;
  u.iframes = 0.4;
  u.busy = 0.35;
  u.vx += (dir.x / len) * 16;
  u.vz += (dir.z / len) * 16;
  raid.setAnim(u, 'dodge');
  raid.emit({type: 'dodge', unit: u.id});
}

/** Starts a heal cast; it lands when the cast completes (see tickHealCast). */
export function startHeal(raid: BossRaid, u: Unit, target: Unit): void {
  u.busy = HEAL_CAST;
  u.cooldowns.healCast = HEAL_CAST;
  u.target = target.id;
  raid.setAnim(u, 'cast');
}

export function groupHeal(raid: BossRaid, u: Unit): void {
  u.cooldowns.groupHeal = GROUP_HEAL_CD;
  raid.setAnim(u, 'cast');
  for (const ally of raid.party) if (ally.alive) raid.heal(u, ally, GROUP_HEAL);
}

/** Lands a finished heal cast. Returns true while a cast is still running. */
export function tickHealCast(raid: BossRaid, u: Unit): boolean {
  if (u.cooldowns.healCast === undefined) return false;
  if (u.cooldowns.healCast > 0) return true;
  delete u.cooldowns.healCast;
  const target = raid.unit(u.target);
  if (target) {
    raid.emit({type: 'shot', from: u.id, to: target.id, kind: 'heal'});
    raid.heal(u, target, HEAL_AMOUNT);
  }
  return false;
}

export const COOLDOWNS = {taunt: TAUNT_CD, block: BLOCK_CD, strike: STRIKE_CD, volley: VOLLEY_CD, groupHeal: GROUP_HEAL_CD, dodge: DODGE_CD} as const;

// ---------- mechanics awareness ----------

/**
 * When does this unit notice this hazard? Skilled companions react fast;
 * clumsy ones react late or (sometimes) not at all.
 */
function noticed(raid: BossRaid, h: Hazard, u: Unit): boolean {
  const key = `${h.id}:${u.id}`;
  let at = raid.reactions.get(key);
  if (at === undefined) {
    const skill = raid.options.aiSkill;
    const oblivious = raid.rng.chance((1 - skill) * 0.45);
    const delay = (1.4 - 1.2 * skill) * raid.rng.range(0.7, 1.3);
    at = oblivious ? Infinity : h.total - h.timer + delay;
    raid.reactions.set(key, at);
  }
  return h.total - h.timer >= at;
}

/** A chance that is rolled once per key (frame-rate independent). */
function rollOnce(raid: BossRaid, key: string, chance: number): boolean {
  let v = raid.reactions.get(key);
  if (v === undefined) {
    v = raid.rng.chance(chance) ? 1 : 0;
    raid.reactions.set(key, v);
  }
  return v === 1;
}

function escapePoint(raid: BossRaid, h: Hazard, u: Unit): Vec2 {
  if (h.shape === 'cone') {
    // Frontal cleave: get behind the boss.
    const boss = raid.boss;
    return clampToArena({x: boss.x - Math.sin(h.angle) * (boss.r + 2), z: boss.z - Math.cos(h.angle) * (boss.r + 2)});
  }
  let dx = u.x - h.x;
  let dz = u.z - h.z;
  let d = Math.hypot(dx, dz);
  if (d < 0.3) {
    // Dead center: pick one direction and stick with it (re-rolling per frame just jitters in place).
    const key = `${h.id}:${u.id}:dir`;
    let a = raid.reactions.get(key);
    if (a === undefined) {
      a = raid.rng.range(0, Math.PI * 2);
      raid.reactions.set(key, a);
    }
    dx = Math.cos(a);
    dz = Math.sin(a);
    d = 1;
  }
  const out = h.radius + u.r + 1;
  const p = {x: h.x + (dx / d) * out, z: h.z + (dz / d) * out};
  // Pushed against the wall: go around toward the arena center instead.
  return Math.hypot(p.x, p.z) > ARENA_RADIUS - 1 ? clampToArena({x: h.x - (dx / d) * out, z: h.z - (dz / d) * out}) : p;
}

/** Handles danger first. Returns true when the unit spent this frame on a mechanic. */
function handleMechanics(raid: BossRaid, u: Unit, dt: number): boolean {
  for (const h of raid.hazards) {
    if (!noticed(raid, h, u)) continue;
    // The tank faces the cleave on purpose and blocks it.
    if (h.shape === 'cone' && u.kind === 'tank') {
      if ((u.cooldowns.block ?? 0) <= 0) block(raid, u);
      continue;
    }
    if (h.owner === u.id) {
      // Marked: run away from the group so the blast only hits me.
      const others = raid.party.filter(o => o.alive && o !== u);
      const cx = others.reduce((s, o) => s + o.x, 0) / Math.max(1, others.length);
      const cz = others.reduce((s, o) => s + o.z, 0) / Math.max(1, others.length);
      const a = Math.atan2(u.z - cz, u.x - cx);
      raid.walk(u, clampToArena({x: Math.cos(a) * 12, z: Math.sin(a) * 12}), dt);
      return true;
    }
    if (!raid.inHazard(h, u, u.r + 0.4)) continue;
    // Standing in fire beats finishing a heal: cancel the cast and move.
    if (u.cooldowns.healCast !== undefined) {
      delete u.cooldowns.healCast;
      u.busy = 0;
    }
    const exit = escapePoint(raid, h, u);
    // Too late to walk out: roll once per hazard, then dodge just before it lands so the i-frames cover it.
    const late = h.timer < DODGE_LEAD && dist(u, exit) > 1.5;
    if (late && (u.cooldowns.dodge ?? 0) <= 0 && rollOnce(raid, `${h.id}:${u.id}:dodge`, 0.4 + 0.6 * raid.options.aiSkill)) {
      dodge(raid, u, {x: exit.x - u.x, z: exit.z - u.z});
    } else {
      raid.walk(u, exit, dt);
    }
    return true;
  }
  return false;
}

// ---------- role behaviors ----------

function nearestEnemy(raid: BossRaid, u: Unit, addsOnly: boolean): Unit | undefined {
  return raid.enemies.filter(e => !addsOnly || e.kind === 'add').sort((a, b) => dist(a, u) - dist(b, u))[0];
}

/** Spot around the boss for this unit: tank in front, everyone else behind or at range. */
function station(raid: BossRaid, u: Unit, slot: number): Vec2 {
  const boss = raid.boss;
  const front = boss.facing;
  if (raid.order === 'stack') {
    const anchor = raid.party.find(p => p.controlled && p.alive) ?? raid.party.find(p => p.kind === 'tank' && p.alive) ?? u;
    return {x: anchor.x + Math.cos(slot) * 1.2, z: anchor.z + Math.sin(slot) * 1.2};
  }
  const spread = raid.order === 'spread' ? 0.9 : 0.45;
  const behind = front + Math.PI + (slot - 2) * spread;
  const range = u.kind === 'ranged' || u.kind === 'healer' ? RANGED_DISTANCE : boss.r + u.reach * 0.6;
  return clampToArena({x: boss.x + Math.sin(behind) * range, z: boss.z + Math.cos(behind) * range});
}

function tankAi(raid: BossRaid, u: Unit, dt: number): void {
  const boss = raid.boss;
  // Pick up adds that are hitting someone squishy.
  const looseAdd = raid.enemies.find(e => e.kind === 'add' && e.target !== null && raid.unit(e.target)?.kind !== 'tank' && dist(e, u) < 12);
  if (looseAdd && (u.cooldowns.taunt ?? 0) <= 0) taunt(raid, u, looseAdd);
  const bossTarget = raid.unit(boss.target);
  if (boss.alive && bossTarget && bossTarget !== u && (u.cooldowns.taunt ?? 0) <= 0) taunt(raid, u, boss);
  if (u.hp < u.maxHp * 0.4 && (u.cooldowns.block ?? 0) <= 0) block(raid, u);
  const target = boss.alive ? boss : nearestEnemy(raid, u, false);
  if (!target) return;
  if (dist(u, target) > u.reach + target.r - 0.3) raid.walk(u, target, dt);
  else if (u.attackTimer <= 0 && u.busy <= 0) swing(raid, u, target);
}

function meleeAi(raid: BossRaid, u: Unit, dt: number, slot: number): void {
  const add = nearestEnemy(raid, u, true);
  const target = add && dist(add, u) < 10 ? add : raid.boss.alive ? raid.boss : add;
  if (!target) return;
  const spot = target === raid.boss ? station(raid, u, slot) : target;
  if (dist(u, target) > u.reach + target.r - 0.3 || (target === raid.boss && dist(u, spot) > 1.6)) {
    raid.walk(u, spot, dt);
    return;
  }
  if (u.busy > 0) return;
  if ((u.cooldowns.strike ?? 0) <= 0) {
    u.cooldowns.strike = STRIKE_CD;
    swing(raid, u, target, 2.5);
  } else if (u.attackTimer <= 0) swing(raid, u, target);
}

function rangedAi(raid: BossRaid, u: Unit, dt: number, slot: number): void {
  const adds = raid.enemies.filter(e => e.kind === 'add').sort((a, b) => a.hp - b.hp);
  const target = adds[0] ?? (raid.boss.alive ? raid.boss : undefined);
  if (!target) return;
  const spot = station(raid, u, slot);
  if (dist(u, spot) > 2 && dist(u, target) > 4) raid.walk(u, spot, dt);
  if (u.busy > 0 || dist(u, target) > u.reach) return;
  if ((u.cooldowns.volley ?? 0) <= 0) {
    u.cooldowns.volley = VOLLEY_CD;
    shoot(raid, u, target, 1.8);
    for (const e of raid.enemies) if (e !== target && dist(e, target) < 4) raid.damage(u, e, u.damage, 'ranged');
  } else if (u.attackTimer <= 0) shoot(raid, u, target);
}

function healerAi(raid: BossRaid, u: Unit, dt: number, slot: number): void {
  if (tickHealCast(raid, u)) return;
  const living = raid.party.filter(p => p.alive);
  const hurtCount = living.filter(p => p.hp < p.maxHp * 0.6).length;
  if (hurtCount >= 3 && (u.cooldowns.groupHeal ?? 0) <= 0) {
    groupHeal(raid, u);
    return;
  }
  // Tanks are weighted so they get topped up a little earlier.
  const patient = living.map(p => ({p, need: p.hp / p.maxHp - (p.kind === 'tank' ? 0.1 : 0)})).sort((a, b) => a.need - b.need)[0];
  if (patient && patient.need < 0.8 && dist(u, patient.p) <= 14) {
    startHeal(raid, u, patient.p);
    return;
  }
  const spot = station(raid, u, slot);
  if (dist(u, spot) > 2) raid.walk(u, spot, dt);
  if (raid.boss.alive && u.attackTimer <= 0 && u.busy <= 0 && dist(u, raid.boss) <= u.reach) shoot(raid, u, raid.boss);
}

export function updatePartyAi(raid: BossRaid, u: Unit, dt: number): void {
  if (u.busy > 0 && u.cooldowns.healCast === undefined) return;
  // A cast in progress still has to react to danger (handleMechanics cancels it).
  if (u.busy > 0 && !raid.hazards.some(h => raid.inHazard(h, u, u.r + 0.4))) {
    tickHealCast(raid, u);
    return;
  }
  if (handleMechanics(raid, u, dt)) return;
  const slot = raid.party.indexOf(u);
  if (u.kind === 'tank') tankAi(raid, u, dt);
  else if (u.kind === 'melee') meleeAi(raid, u, dt, slot);
  else if (u.kind === 'ranged') rangedAi(raid, u, dt, slot);
  else healerAi(raid, u, dt, slot);
}
