import {PLAYER} from '../config';
import {angleTo, turnTowards, type Vec2} from '../core/math';
import {itemDef} from '../items/catalog';
import {consumeSlot, type SlotId} from '../items/stores';
import {comboFor, UNARMED_STATS} from './attacks';
import type {Raid} from './raid';
import type {Player, SimInput} from './types';

const COMBO_GRACE = 0.32;
const ATTACK_TRACK_RATE = 7;
const LUNGE_WINDOW = 0.6;

function spendStamina(p: Player, amount: number): void {
  p.stamina = Math.max(0, p.stamina - amount);
  p.staminaDelay = PLAYER.staminaRegenDelay;
}

function setState(p: Player, state: Player['state']): void {
  p.state = state;
  p.stateTime = 0;
}

function startAttack(raid: Raid, p: Player, aim: Vec2): void {
  const combo = comboFor(raid.weapon);
  const index = p.comboWindow > 0 && p.combo < combo.length ? p.combo : 0;
  p.step = combo[index];
  p.combo = index;
  p.comboQueued = false;
  p.hitDone = false;
  p.facing = angleTo(p, aim);
  spendStamina(p, PLAYER.attackCost * (p.step.heavy ? 1.4 : 1));
  setState(p, 'attack');
  raid.emit({type: 'swing', actor: p.id, step: p.step, combo: index});
}

function startDodge(raid: Raid, p: Player, input: SimInput): void {
  const len = Math.hypot(input.move.x, input.move.z);
  // No direction held: hop backwards away from where we face.
  p.dodgeDir = len > 0.1 ? {x: input.move.x / len, z: input.move.z / len} : {x: -Math.sin(p.facing), z: -Math.cos(p.facing)};
  p.iframes = PLAYER.dodgeIFrames;
  p.step = null;
  p.usingSlot = null;
  spendStamina(p, PLAYER.dodgeCost);
  setState(p, 'dodge');
  raid.emit({type: 'dodge', actor: p.id, x: p.x, z: p.z, dirX: p.dodgeDir.x, dirZ: p.dodgeDir.z});
}

function startUse(raid: Raid, p: Player, slot: SlotId): void {
  const item = raid.stores.slots[slot];
  const use = item && itemDef(item.defId).consumable;
  const useful = (use?.heal ?? 0) > 0 && p.hp < p.maxHp ? true : (use?.oil ?? 0) > 0 && raid.oil < raid.oilMax;
  if (!use || !useful) return;
  p.usingSlot = slot;
  setState(p, 'use');
  raid.emit({type: 'useStart', actor: p.id, duration: use.useTime});
}

function resolveSwing(raid: Raid, p: Player): void {
  const step = p.step;
  if (!step) return;
  const weapon = raid.weapon ?? UNARMED_STATS;
  for (const enemy of raid.enemies) {
    if (!enemy.alive || !raid.inArc(p, p.facing, enemy, weapon.reach, step.arc)) continue;
    const crit = raid.rng.chance(PLAYER.critChance + raid.mods.critBonus);
    const damage = weapon.damage * raid.mods.damageMul * step.damageMul * (crit ? PLAYER.critMultiplier : 1) * raid.rng.range(0.92, 1.08);
    raid.damageEnemy(enemy, damage, p, step.heavy, crit);
  }
}

function walk(raid: Raid, p: Player, input: SimInput, dt: number, factor: number): void {
  const len = Math.min(1, Math.hypot(input.move.x, input.move.z));
  const moving = len > 0.1;
  const canSprint = moving && input.sprint && p.stamina > 0 && factor === 1;
  p.sprinting = canSprint;
  if (canSprint) spendStamina(p, PLAYER.sprintCost * dt);
  const speed = (canSprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed) * factor;
  if (moving) {
    p.x += (input.move.x / len) * len * speed * dt;
    p.z += (input.move.z / len) * len * speed * dt;
    p.facing = turnTowards(p.facing, Math.atan2(input.move.x, input.move.z), PLAYER.turnRate * dt);
  }
  p.moveAmount = moving ? (speed * len) / PLAYER.sprintSpeed : 0;
  if (p.state === 'idle' || p.state === 'move') p.state = moving ? 'move' : 'idle';
  void raid;
}

export function updatePlayer(raid: Raid, dt: number, input: SimInput): void {
  const p = raid.player;
  p.stateTime += dt;
  p.iframes = Math.max(0, p.iframes - dt);
  p.comboWindow = Math.max(0, p.comboWindow - dt);
  p.sinceHurt += dt;
  if (!p.alive) return;

  if (p.staminaDelay > 0) p.staminaDelay -= dt;
  else if (p.state !== 'dodge' && p.state !== 'attack' && !p.sprinting) p.stamina = Math.min(raid.maxStamina, p.stamina + PLAYER.staminaRegen * dt);

  const attackPressed = input.attack && !input.uiBlocked;
  const canDodge = input.dodge && p.stamina >= PLAYER.dodgeCost * 0.5;

  switch (p.state) {
    case 'hurt':
      p.sprinting = false;
      if (p.stateTime >= PLAYER.hurtStun) setState(p, 'idle');
      break;

    case 'dodge': {
      const t = Math.min(1, p.stateTime / PLAYER.dodgeDuration);
      const speed = PLAYER.dodgeSpeed * (1 - t) ** 1.6;
      p.x += p.dodgeDir.x * speed * dt;
      p.z += p.dodgeDir.z * speed * dt;
      p.moveAmount = 0;
      if (p.stateTime >= PLAYER.dodgeDuration) setState(p, 'idle');
      break;
    }

    case 'attack': {
      const step = p.step!;
      p.sprinting = false;
      if (!p.hitDone) p.facing = turnTowards(p.facing, angleTo(p, input.aim), ATTACK_TRACK_RATE * dt);
      const lungeT = p.stateTime / (step.hitTime * LUNGE_WINDOW + 0.06);
      if (lungeT < 1) {
        p.x += Math.sin(p.facing) * step.lunge * (1 - lungeT) * dt;
        p.z += Math.cos(p.facing) * step.lunge * (1 - lungeT) * dt;
      }
      walk(raid, p, input, dt, PLAYER.attackMoveFactor);
      p.state = 'attack';
      if (!p.hitDone && p.stateTime >= step.hitTime) {
        p.hitDone = true;
        resolveSwing(raid, p);
      }
      if (attackPressed && p.stateTime > step.hitTime * 0.4) p.comboQueued = true;
      if (canDodge && p.hitDone) {
        startDodge(raid, p, input);
        break;
      }
      if (p.stateTime >= step.duration) {
        const combo = comboFor(raid.weapon);
        const next = p.combo + 1;
        if (p.comboQueued && next < combo.length && p.stamina > 0) {
          p.comboWindow = 1;
          p.combo = next;
          startAttack(raid, p, input.aim);
        } else {
          p.step = null;
          p.combo = next < combo.length ? next : 0;
          p.comboWindow = next < combo.length ? COMBO_GRACE : 0;
          setState(p, 'idle');
        }
      }
      break;
    }

    case 'use': {
      const slot = p.usingSlot;
      const item = slot ? raid.stores.slots[slot] : null;
      const use = item ? itemDef(item.defId).consumable : undefined;
      if (!slot || !use) {
        setState(p, 'idle');
        break;
      }
      walk(raid, p, input, dt, PLAYER.useMoveFactor);
      p.state = 'use';
      if (canDodge) {
        startDodge(raid, p, input);
        break;
      }
      if (p.stateTime >= use.useTime) {
        const healed = Math.min(use.heal * raid.mods.healMul, p.maxHp - p.hp);
        p.hp += healed;
        raid.stores = consumeSlot(raid.stores, slot);
        if (healed > 0) raid.emit({type: 'healed', actor: p.id, amount: Math.round(healed)});
        if (use.oil) {
          const added = raid.addOil(use.oil);
          raid.emit({type: 'notice', text: `랜턴 기름 +${Math.round(added)}`, tone: 'good'});
        }
        p.usingSlot = null;
        setState(p, 'idle');
      }
      break;
    }

    default:
      walk(raid, p, input, dt, 1);
      if (canDodge) startDodge(raid, p, input);
      else if (attackPressed && p.stamina > 0) startAttack(raid, p, input.aim);
      else if (input.use) startUse(raid, p, input.use);
  }
}
