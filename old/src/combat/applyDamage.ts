import {Vector3} from 'three';
import type {Actor} from '../types';
import {attackDamage} from './damage';
import type {CombatFx} from './ports';

export interface DamageEnv {
  fx: CombatFx;
  onCasualty(actor: Actor): void;
}

const DEFAULT_GUARD_FACTOR = 0.55;
const COUNTER_GUARD_RATIO = 0.3;
const HIT_STAGGER_SECONDS = 0.22;
const HIT_KNOCKBACK_SECONDS = 0.34;
const HIT_BUMP = 0.12;
const KNIGHT_IMPACT_POWER = 1.7;

function kill(actor: Actor, env: DamageEnv): void {
  actor.dead = true;
  env.onCasualty(actor);
  actor.view.play('death', true);
  actor.view.setRingVisible(false);
  actor.dying = 0;
}

export function applyDamage(attacker: Actor, target: Actor, color: string, multiplier: number, env: DamageEnv): void {
  if (target.dead) return;
  const {fx} = env;
  let amount = attackDamage(attacker, target, multiplier);

  if ((target.guardTime ?? 0) > 0 && target.guard && !target.guard.dead) {
    amount = Math.ceil(amount * (target.guardFactor || DEFAULT_GUARD_FACTOR));
    if (target.counterGuard && attacker.team !== target.team) {
      attacker.hp = Math.max(0, attacker.hp - Math.ceil(target.guard.damage * COUNTER_GUARD_RATIO));
      if (attacker.hp === 0) kill(attacker, env);
    }
    fx.floatText(target.pos, '방어!', '#7ed7ff');
  }

  target.hp = Math.max(0, target.hp - amount);
  fx.floatText(target.pos, '-' + amount, color);
  fx.impact(target.pos, attacker.team === 'hero' ? 0xffd47d : 0xff6666, attacker.name === 'Knight' ? KNIGHT_IMPACT_POWER : 1);

  target.stagger = HIT_STAGGER_SECONDS;
  target.knockback = HIT_KNOCKBACK_SECONDS;
  const away = target.pos.clone().sub(attacker.pos).setY(0).normalize();
  target.knockDirection = away.lengthSq() < 0.001 ? new Vector3(0, 0, 1) : away;
  target.view.bump(HIT_BUMP);

  if (target.hp === 0) kill(target, env);
  else target.view.play('hit', true);
}
