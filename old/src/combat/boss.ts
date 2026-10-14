import type {Actor} from '../types';
import {BOSS_BLAST_RADIUS, BOSS_REPEAT_COOLDOWN, BOSS_WARNING_SECONDS} from '../data/enemies';
import {applyDamage, type DamageEnv} from './applyDamage';
import type {CombatFx} from './ports';

const BLAST_DAMAGE_MULTIPLIER = 0.65;
const BLAST_COLOR = '#ffad66';

function beginWarning(boss: Actor, fx: CombatFx): void {
  if (boss.warning) return;
  const center = boss.pos.clone();
  const visual = fx.spawnBossWarning(center);
  boss.warning = {center, time: BOSS_WARNING_SECONDS, setOpacity: v => visual.setOpacity(v), dispose: () => visual.dispose()};
  boss.lastAction = '충격파 예고';
  boss.actionTime = BOSS_WARNING_SECONDS;
}

function detonate(boss: Actor, heroes: readonly Actor[], env: DamageEnv & {fx: CombatFx}): void {
  const warning = boss.warning;
  if (!warning) return;
  for (const hero of heroes) {
    if (hero.team === 'hero' && !hero.dead && hero.pos.distanceTo(warning.center) < BOSS_BLAST_RADIUS) {
      applyDamage(boss, hero, BLAST_COLOR, BLAST_DAMAGE_MULTIPLIER, env);
    }
  }
  warning.dispose();
  boss.warning = null;
  env.fx.bossPulse(warning.center);
}

/** Boss shockwave cycle: telegraph a circle for 1.5s, then detonate and cool down. */
export function updateBoss(boss: Actor, dt: number, actors: readonly Actor[], env: DamageEnv & {fx: CombatFx}): void {
  if (boss.dead) {
    if (boss.warning) {
      boss.warning.dispose();
      boss.warning = null;
    }
    return;
  }
  if (boss.warning) {
    boss.warning.time -= dt;
    boss.warning.setOpacity(0.18 + 0.14 * Math.sin(boss.warning.time * 12) ** 2);
    if (boss.warning.time <= 0) {
      detonate(boss, actors, env);
      boss.bossCooldown = BOSS_REPEAT_COOLDOWN;
    }
    return;
  }
  boss.bossCooldown = (boss.bossCooldown ?? 0) - dt;
  if (boss.bossCooldown <= 0) beginWarning(boss, env.fx);
}
