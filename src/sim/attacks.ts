import type {WeaponStats} from '../items/catalog';
import type {AttackStep} from './types';

const DEG = Math.PI / 180;

const ONE_HANDED: readonly AttackStep[] = [
  {clip: '1H_Melee_Attack_Slice_Diagonal', clipHit: 0.36, duration: 0.46, hitTime: 0.17, damageMul: 1, arc: 115 * DEG, heavy: false, lunge: 5.5, sweep: 'right'},
  {clip: '1H_Melee_Attack_Slice_Horizontal', clipHit: 0.38, duration: 0.46, hitTime: 0.17, damageMul: 1.1, arc: 135 * DEG, heavy: false, lunge: 5.5, sweep: 'left'},
  {clip: '1H_Melee_Attack_Chop', clipHit: 0.42, duration: 0.66, hitTime: 0.27, damageMul: 1.75, arc: 85 * DEG, heavy: true, lunge: 8.5, sweep: 'down'},
];

const TWO_HANDED: readonly AttackStep[] = [
  {clip: '2H_Melee_Attack_Slice', clipHit: 0.4, duration: 0.62, hitTime: 0.26, damageMul: 1, arc: 150 * DEG, heavy: false, lunge: 5, sweep: 'right'},
  {clip: '2H_Melee_Attack_Spinning', clipHit: 0.5, duration: 0.58, hitTime: 0.26, damageMul: 0.9, arc: 360 * DEG, heavy: false, lunge: 3, sweep: 'spin'},
  {clip: '2H_Melee_Attack_Chop', clipHit: 0.48, duration: 0.86, hitTime: 0.38, damageMul: 1.9, arc: 90 * DEG, heavy: true, lunge: 9, sweep: 'down'},
];

const UNARMED: readonly AttackStep[] = [
  {clip: 'Unarmed_Melee_Attack_Punch_A', clipHit: 0.3, duration: 0.42, hitTime: 0.16, damageMul: 1, arc: 70 * DEG, heavy: false, lunge: 4, sweep: 'thrust'},
  {clip: 'Unarmed_Melee_Attack_Kick', clipHit: 0.4, duration: 0.55, hitTime: 0.24, damageMul: 1.6, arc: 80 * DEG, heavy: true, lunge: 6, sweep: 'thrust'},
];

export const UNARMED_STATS: WeaponStats = {kind: '1h', damage: 6, speed: 1, reach: 1.9, mesh: 'knight:1H_Sword'};

/** The player's combo chain for a weapon, with timings scaled by the weapon's speed. */
export function comboFor(weapon: WeaponStats | undefined): AttackStep[] {
  const base = !weapon ? UNARMED : weapon.kind === '2h' ? TWO_HANDED : ONE_HANDED;
  const speed = weapon?.speed ?? 1;
  return base.map(step => ({...step, duration: step.duration * speed, hitTime: step.hitTime * speed}));
}
