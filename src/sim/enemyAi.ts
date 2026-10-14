import {ENEMY} from '../config';
import {angleTo, dist, turnTowards, type Vec2} from '../core/math';
import {itemDef} from '../items/catalog';
import {addAuto, removeItem} from '../items/inventory';
import {FlowField, lineOfSight} from '../world/physics';
import type {Raid} from './raid';
import type {Enemy, EnemyState} from './types';

const DEG = Math.PI / 180;
const SIGHT_INTERVAL = 0.2;
const HEARING_RANGE = 3.5;
const DORMANT_WAKE_RANGE = 7;
const WAKE_DURATION = 1.7;
const LOSE_INTEREST_AFTER = 7;
const ENEMY_ARC = 100 * DEG;
const RAIDER_POTION_HEAL = 40;
const RAIDER_POTION_TIME = 1.2;
const RAIDER_LOOT_PER_CONTAINER = 3;

/** Raiders path toward containers, not the player, so each keeps its own field. */
const raiderFields = new WeakMap<Enemy, FlowField>();

function setState(e: Enemy, state: EnemyState, duration = 0): void {
  e.state = state;
  e.stateTime = 0;
  e.stateDuration = duration;
}

function face(e: Enemy, target: Vec2, rate: number, dt: number): void {
  e.facing = turnTowards(e.facing, angleTo(e, target), rate * dt);
}

/** Straight at the player when visible, otherwise follow the shared flow field. */
function chaseStep(raid: Raid, e: Enemy, speed: number, dt: number): void {
  const target = e.canSee ? raid.player : raid.flow.nextStep(e);
  if (!target) return;
  raid.moveToward(e, target, speed, dt);
  face(e, target, 10, dt);
}

function moveAway(raid: Raid, e: Enemy, speed: number, dt: number): void {
  const p = raid.player;
  raid.moveToward(e, {x: e.x * 2 - p.x, z: e.z * 2 - p.z}, speed, dt);
  face(e, p, 10, dt);
}

function strafe(raid: Raid, e: Enemy, speed: number, dt: number): void {
  const p = raid.player;
  e.strafeTimer -= dt;
  if (e.strafeTimer <= 0) {
    e.strafeTimer = raid.rng.range(1.2, 2.4);
    e.strafeDir = e.strafeDir === 1 ? -1 : 1;
  }
  const a = angleTo(e, p) + (Math.PI / 2) * e.strafeDir;
  raid.moveToward(e, {x: e.x + Math.sin(a), z: e.z + Math.cos(a)}, speed, dt);
  face(e, p, 10, dt);
}

function perceive(raid: Raid, e: Enemy, dt: number, sight: number): void {
  const p = raid.player;
  e.sightTimer -= dt;
  if (e.sightTimer <= 0) {
    e.sightTimer = SIGHT_INTERVAL;
    const d = dist(e, p);
    e.canSee = p.alive && d < sight && lineOfSight(raid.map, e, p);
  }
  if (!p.alive) {
    e.alerted = false;
    return;
  }
  const d = dist(e, p);
  if (!e.alerted) {
    const wakes = e.state === 'dormant' ? d < DORMANT_WAKE_RANGE : e.canSee || d < HEARING_RANGE;
    if (wakes) raid.alert(e);
    return;
  }
  e.lostTimer = e.canSee ? 0 : e.lostTimer + dt;
  if (e.lostTimer > LOSE_INTEREST_AFTER) {
    e.alerted = false;
    if (e.state === 'chase') setState(e, e.kind === 'raider' ? 'roam' : 'idle');
  }
}

/** Ends a melee wind-up: lunge and test the arc. */
function meleeStrike(raid: Raid, e: Enemy, reach: number, damage: number, heavy: boolean): void {
  e.vx += Math.sin(e.facing) * 7;
  e.vz += Math.cos(e.facing) * 7;
  raid.emit({type: 'strike', enemy: e.id});
  if (raid.inArc(e, e.facing, raid.player, reach, ENEMY_ARC)) raid.damagePlayer(damage, e, heavy);
}

function startWindup(raid: Raid, e: Enemy, duration: number, reach: number): void {
  setState(e, 'windup', duration);
  raid.emit({type: 'windup', enemy: e.id, duration, reach, arc: ENEMY_ARC});
}

function updateWarrior(raid: Raid, e: Enemy, dt: number): void {
  const s = ENEMY.warrior;
  const p = raid.player;
  const d = dist(e, p);
  switch (e.state) {
    case 'waking':
      if (e.stateTime >= WAKE_DURATION) setState(e, 'chase');
      break;
    case 'idle':
      if (e.alerted) setState(e, 'chase');
      break;
    case 'chase':
      if (!e.alerted) break;
      if (d <= s.reach * 0.85 && e.canSee) {
        face(e, p, 10, dt);
        if (e.cooldown <= 0) startWindup(raid, e, s.windup, s.reach);
      } else {
        chaseStep(raid, e, s.speed, dt);
      }
      break;
    case 'windup':
      if (e.stateTime < e.stateDuration * 0.7) face(e, p, 4, dt);
      if (e.stateTime >= e.stateDuration) {
        setState(e, 'strike', s.strike);
        meleeStrike(raid, e, s.reach, s.damage, false);
      }
      break;
    case 'strike':
      if (e.stateTime >= e.stateDuration) setState(e, 'recover', s.recover);
      break;
    case 'recover':
    case 'hurt':
      if (e.stateTime >= e.stateDuration) {
        e.cooldown = 0.25;
        setState(e, 'chase');
      }
      break;
    default:
      break;
  }
}

function updateMage(raid: Raid, e: Enemy, dt: number): void {
  const s = ENEMY.mage;
  const p = raid.player;
  const d = dist(e, p);
  switch (e.state) {
    case 'idle':
      if (e.alerted) setState(e, 'chase');
      break;
    case 'chase':
      if (!e.alerted) break;
      if (!e.canSee || d > s.castRange) chaseStep(raid, e, s.speed, dt);
      else if (d < 4.5) moveAway(raid, e, s.speed, dt);
      else if (e.cooldown <= 0) {
        setState(e, 'cast', s.windup);
        raid.emit({type: 'cast', enemy: e.id, duration: s.windup});
      } else strafe(raid, e, s.speed * 0.5, dt);
      break;
    case 'cast':
      face(e, p, 6, dt);
      if (e.stateTime >= e.stateDuration) {
        const a = angleTo(e, p);
        const dir = {x: Math.sin(a), z: Math.cos(a)};
        raid.spawnProjectile('bolt', {x: e.x + dir.x * 0.8, z: e.z + dir.z * 0.8}, dir, s.boltSpeed, s.damage);
        e.cooldown = s.cooldown * raid.rng.range(0.85, 1.2);
        setState(e, 'recover', 0.35);
      }
      break;
    case 'recover':
    case 'hurt':
      if (e.stateTime >= e.stateDuration) setState(e, 'chase');
      break;
    default:
      break;
  }
}

function pickLootTarget(raid: Raid, e: Enemy): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const c of raid.containers) {
    if (e.visited.has(c.id) || c.enemyId !== null || c.type === 'pile' || raid.openContainer === c.id) continue;
    if (!raid.stores.grids[c.gridId].items.length) continue;
    const d = dist(e, c);
    if (d < bestD) {
      bestD = d;
      best = c.id;
    }
  }
  return best;
}

/** The raider empties the most valuable items into its own bag (dropped on death). */
function lootContainer(raid: Raid, e: Enemy, containerId: number): void {
  const c = raid.containers.find(x => x.id === containerId);
  if (!c || !e.bag) return;
  let grid = raid.stores.grids[c.gridId];
  const best = [...grid.items].sort((a, b) => itemDef(b.item.defId).value * b.item.qty - itemDef(a.item.defId).value * a.item.qty);
  for (const placed of best.slice(0, RAIDER_LOOT_PER_CONTAINER)) {
    const {grid: bag, leftover} = addAuto(e.bag, placed.item);
    if (leftover) break;
    e.bag = bag;
    grid = removeItem(grid, placed.item.uid);
  }
  raid.stores = {...raid.stores, grids: {...raid.stores.grids, [c.gridId]: grid}};
  raid.emit({type: 'raiderLoot', enemy: e.id, container: c.id});
}

function raiderRoam(raid: Raid, e: Enemy, dt: number): void {
  const s = ENEMY.raider;
  if (e.lootTarget === null) {
    e.lootTarget = pickLootTarget(raid, e);
    if (e.lootTarget === null) return;
    const field = raiderFields.get(e) ?? new FlowField(raid.map);
    raiderFields.set(e, field);
    field.update(raid.containers.find(c => c.id === e.lootTarget)!);
  }
  const target = raid.containers.find(c => c.id === e.lootTarget);
  if (!target) {
    e.lootTarget = null;
    return;
  }
  if (dist(e, target) < 1.9) {
    face(e, target, 8, dt);
    setState(e, 'loot', s.lootTime);
    return;
  }
  const field = raiderFields.get(e);
  const step = lineOfSight(raid.map, e, target) ? target : field?.nextStep(e);
  if (!step) {
    e.visited.add(target.id);
    e.lootTarget = null;
    return;
  }
  raid.moveToward(e, step, s.speed * 0.6, dt);
  face(e, step, 8, dt);
}

function raiderCombat(raid: Raid, e: Enemy, dt: number): void {
  const s = ENEMY.raider;
  const p = raid.player;
  const d = dist(e, p);
  const playerSwinging = p.state === 'attack' && !p.hitDone;
  if (playerSwinging && d < 3.6 && e.dodgeCooldown <= 0 && raid.rng.chance(0.55)) {
    const away = angleTo(p, e) + raid.rng.range(-1, 1);
    e.facing = away;
    e.dodgeCooldown = 2.8;
    setState(e, 'dodge', 0.4);
    raid.emit({type: 'dodge', actor: e.id, x: e.x, z: e.z, dirX: Math.sin(away), dirZ: Math.cos(away)});
    return;
  }
  if (e.hp < e.maxHp * 0.4 && e.potions > 0 && d > 6) {
    e.potions--;
    setState(e, 'use', RAIDER_POTION_TIME);
    raid.emit({type: 'useStart', actor: e.id, duration: RAIDER_POTION_TIME});
    return;
  }
  if (d < 3.2 && e.cooldown <= 0) {
    face(e, p, 12, dt);
    startWindup(raid, e, s.knifeWindup, s.knifeReach);
    return;
  }
  if (e.canSee && e.cooldown <= 0 && d > 4) {
    setState(e, 'aim', s.aim);
    raid.emit({type: 'aim', enemy: e.id, duration: s.aim});
    return;
  }
  if (!e.canSee || d > 11) chaseStep(raid, e, s.speed, dt);
  else if (d < 6) moveAway(raid, e, s.speed * 0.8, dt);
  else strafe(raid, e, s.speed * 0.6, dt);
}

function updateRaider(raid: Raid, e: Enemy, dt: number): void {
  const s = ENEMY.raider;
  const p = raid.player;
  switch (e.state) {
    case 'roam':
    case 'idle':
      if (e.alerted) setState(e, 'chase');
      else raiderRoam(raid, e, dt);
      break;
    case 'loot':
      if (e.alerted) setState(e, 'chase');
      else if (e.stateTime >= e.stateDuration) {
        if (e.lootTarget !== null) {
          e.visited.add(e.lootTarget);
          lootContainer(raid, e, e.lootTarget);
        }
        e.lootTarget = null;
        setState(e, 'roam');
      }
      break;
    case 'chase':
      if (!e.alerted) setState(e, 'roam');
      else raiderCombat(raid, e, dt);
      break;
    case 'dodge': {
      const t = Math.min(1, e.stateTime / e.stateDuration);
      const speed = 14 * (1 - t) ** 1.5;
      e.x += Math.sin(e.facing) * speed * dt;
      e.z += Math.cos(e.facing) * speed * dt;
      if (e.stateTime >= e.stateDuration) setState(e, 'chase');
      break;
    }
    case 'aim':
      face(e, p, 5, dt);
      if (e.stateTime >= e.stateDuration) {
        const a = e.facing;
        const dir = {x: Math.sin(a), z: Math.cos(a)};
        raid.spawnProjectile('arrow', {x: e.x + dir.x * 0.7, z: e.z + dir.z * 0.7}, dir, s.arrowSpeed, s.arrowDamage);
        e.cooldown = s.shotCooldown * raid.rng.range(0.8, 1.25);
        setState(e, 'recover', 0.3);
      }
      break;
    case 'windup':
      face(e, p, 8, dt);
      if (e.stateTime >= e.stateDuration) {
        setState(e, 'strike', 0.12);
        meleeStrike(raid, e, s.knifeReach, s.knifeDamage, false);
      }
      break;
    case 'strike':
      if (e.stateTime >= e.stateDuration) {
        e.cooldown = 0.6;
        setState(e, 'recover', 0.4);
      }
      break;
    case 'use':
      if (e.stateTime >= e.stateDuration) {
        e.hp = Math.min(e.maxHp, e.hp + RAIDER_POTION_HEAL);
        raid.emit({type: 'healed', actor: e.id, amount: RAIDER_POTION_HEAL});
        setState(e, 'chase');
      }
      break;
    case 'recover':
    case 'hurt':
      if (e.stateTime >= e.stateDuration) setState(e, e.alerted ? 'chase' : 'roam');
      break;
    default:
      break;
  }
}

export function updateEnemy(raid: Raid, e: Enemy, dt: number): void {
  e.stateTime += dt;
  e.cooldown -= dt;
  e.dodgeCooldown -= dt;
  e.poiseTimer -= dt;
  if (!e.alive) return;
  const sight = e.kind === 'raider' ? ENEMY.raider.sight : e.kind === 'mage' ? ENEMY.mage.sight : ENEMY.warrior.sight;
  perceive(raid, e, dt, sight);
  if (e.kind === 'warrior') updateWarrior(raid, e, dt);
  else if (e.kind === 'mage') updateMage(raid, e, dt);
  else updateRaider(raid, e, dt);
}
