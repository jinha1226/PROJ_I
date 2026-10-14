import {angleTo, dist, type Vec2} from '../core/math';
import {block, dodge, groupHeal, shoot, startHeal, swing, taunt, tickHealCast} from './partyAi';
import type {BossRaid} from './sim';
import type {RaidInput, Unit} from './types';

const MELEE_ARC = (120 * Math.PI) / 180;
const STRIKE_CD = 6;
const VOLLEY_CD = 8;
const FOCUS_CD = 25;
const FOCUS_TIME = 6;
/** Ranged/heal clicks snap to whoever is this close to the cursor. */
const SNAP = 3.5;

function nearestTo(units: Unit[], p: Vec2): Unit | undefined {
  return units.filter(u => u.alive).sort((a, b) => dist(a, p) - dist(b, p))[0];
}

/** The human-driven party member: same actions the AI uses, chosen by input. */
export function updatePlayerUnit(raid: BossRaid, u: Unit, input: RaidInput, dt: number): void {
  if (tickHealCast(raid, u)) return;
  const len = Math.hypot(input.move.x, input.move.z);
  const focus = (u.cooldowns.focus ?? 0) > FOCUS_CD - FOCUS_TIME;
  if (input.dodge && (u.cooldowns.dodge ?? 0) <= 0 && u.busy <= 0.1) {
    const dir = len > 0.1 ? input.move : {x: -Math.sin(u.facing), z: -Math.cos(u.facing)};
    dodge(raid, u, dir);
    return;
  }
  if (len > 0.1 && u.busy <= 0) raid.walk(u, {x: u.x + input.move.x, z: u.z + input.move.z}, dt);

  const enemies = raid.enemies;
  const aimTarget = nearestTo(enemies, input.aim);
  const ranged = u.kind === 'ranged' || u.kind === 'healer';
  const rangedTarget = aimTarget && dist(aimTarget, input.aim) < SNAP + aimTarget.r ? aimTarget : raid.boss.alive ? raid.boss : aimTarget;
  if (input.attack && u.busy <= 0 && u.attackTimer <= 0) {
    if (ranged) {
      if (rangedTarget && dist(u, rangedTarget) <= u.reach) shoot(raid, u, rangedTarget);
    } else {
      const facing = angleTo(u, input.aim);
      const victims = raid.inArc(u, facing, u.reach, MELEE_ARC, 'enemy');
      if (victims.length) for (const v of victims) swing(raid, u, v, v === victims[0] ? 1 : 0.5);
      else {
        u.facing = facing;
        u.attackTimer = u.attackTime;
        raid.setAnim(u, 'attack');
      }
    }
    if (focus) u.attackTimer *= 0.6;
  }

  if (input.skill1 && u.busy <= 0) {
    if (u.kind === 'tank' && (u.cooldowns.taunt ?? 0) <= 0) {
      const t = aimTarget && dist(aimTarget, input.aim) < SNAP + aimTarget.r ? aimTarget : raid.boss;
      if (t?.alive) taunt(raid, u, t);
    } else if (u.kind === 'melee' && (u.cooldowns.strike ?? 0) <= 0) {
      const t = raid.inArc(u, angleTo(u, input.aim), u.reach, MELEE_ARC, 'enemy')[0];
      if (t) {
        u.cooldowns.strike = STRIKE_CD;
        swing(raid, u, t, 2.5);
      }
    } else if (u.kind === 'ranged' && (u.cooldowns.volley ?? 0) <= 0 && rangedTarget && dist(u, rangedTarget) <= u.reach) {
      u.cooldowns.volley = VOLLEY_CD;
      shoot(raid, u, rangedTarget, 1.8);
      for (const e of enemies) if (e !== rangedTarget && dist(e, rangedTarget) < 4) raid.damage(u, e, u.damage, 'ranged');
    } else if (u.kind === 'healer') {
      // Heal whoever is under the cursor, else the most hurt ally.
      const allies = raid.party.filter(p => p.alive);
      const near = nearestTo(allies, input.aim);
      const patient = near && dist(near, input.aim) < SNAP ? near : allies.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (patient) startHeal(raid, u, patient);
    }
  }

  if (input.skill2 && u.busy <= 0) {
    if (u.kind === 'tank' && (u.cooldowns.block ?? 0) <= 0) block(raid, u);
    else if (u.kind === 'healer' && (u.cooldowns.groupHeal ?? 0) <= 0) groupHeal(raid, u);
    else if ((u.kind === 'melee' || u.kind === 'ranged') && (u.cooldowns.focus ?? 0) <= 0) {
      u.cooldowns.focus = FOCUS_CD;
      raid.emit({type: 'phase', text: '집중! 공격 속도 증가'});
    }
  }
}
