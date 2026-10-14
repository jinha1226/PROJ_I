import type {Actor} from '../types';

const KITE_DAMAGE_BONUS = 1.2;

export function attackDamage(attacker: Actor, target: Actor, multiplier = 1): number {
  const focus = (attacker.focusTime ?? 0) > 0 && attacker.focus === target ? attacker.focusBonus || 1 : 1;
  return Math.round(attacker.damage * multiplier * focus * ((attacker.kiteBonusTime ?? 0) > 0 ? KITE_DAMAGE_BONUS : 1));
}
