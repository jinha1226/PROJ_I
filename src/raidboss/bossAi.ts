import {angleTo, dist, turnTowards} from '../core/math';
import {ARENA_RADIUS, type BossRaid} from './sim';
import type {Unit} from './types';

const CLEAVE = {first: 7, every: 11, enragedEvery: 8, cast: 1.6, radius: 7.5, halfArc: (55 * Math.PI) / 180, damage: 420};
const MARK = {first: 13, every: 19, radius: 5, timer: 5, damage: 300};
/** Spinning cleave around the boss: everyone in melee range must run out. */
const WHIRL = {first: 22, every: 17, cast: 2.0, radius: 6.5, damage: 300};
const STORM = {below: 0.8, every: 14, cast: 1.2, count: 6, radius: 3.5, timer: 2.4, damage: 260};
const ADD_WAVES = [0.7, 0.4];
const ADDS_PER_WAVE = 3;
const ENRAGE_BELOW = 0.2;
const TURN_RATE = 3;

/** Highest-threat living party member, unless a taunt forces the target. */
function pickTarget(raid: BossRaid, enemy: Unit): Unit | undefined {
  const forced = raid.unit(enemy.target);
  if ((enemy.cooldowns.forced ?? 0) > 0 && forced?.alive) return forced;
  let best: Unit | undefined;
  let bestThreat = -1;
  for (const u of raid.party) {
    if (!u.alive) continue;
    // A little proximity threat so fresh fights still find someone.
    const t = (enemy.threat.get(u.id) ?? 0) + Math.max(0, 10 - dist(u, enemy));
    if (t > bestThreat) {
      bestThreat = t;
      best = u;
    }
  }
  enemy.target = best?.id ?? null;
  return best;
}

function meleeTowards(raid: BossRaid, e: Unit, target: Unit, dt: number): void {
  const d = dist(e, target);
  if (d > e.reach + target.r - 0.2) {
    raid.walk(e, target, dt);
    return;
  }
  e.facing = turnTowards(e.facing, angleTo(e, target), TURN_RATE * dt * 2);
  if (e.attackTimer <= 0 && e.busy <= 0) {
    e.attackTimer = e.attackTime;
    e.busy = 0.35;
    raid.setAnim(e, 'attack');
    raid.damage(e, target, e.damage, 'boss');
  }
}

function startCast(raid: BossRaid, boss: Unit, name: string, duration: number): void {
  raid.cast = {name, timer: duration, total: duration};
  boss.busy = duration;
  raid.setAnim(boss, 'cast');
  raid.emit({type: 'cast', unit: boss.id, name, duration});
}

function spawnAdds(raid: BossRaid): void {
  raid.emit({type: 'phase', text: '해골 군주가 부하들을 불러냈다!'});
  for (let i = 0; i < ADDS_PER_WAVE; i++) {
    const a = raid.rng.range(0, Math.PI * 2);
    const add = raid.addUnit('add', 'enemy', {x: Math.cos(a) * (ARENA_RADIUS - 1.5), z: Math.sin(a) * (ARENA_RADIUS - 1.5)});
    add.name = '해골 졸개';
    raid.emit({type: 'spawn', unit: add.id});
  }
}

/** The boss script: auto-attacks, frontal cleave, death mark, bone storm, add waves, enrage. */
export function updateBoss(raid: BossRaid, dt: number): void {
  const boss = raid.boss;
  const timers = boss.cooldowns;
  if (!boss.alive) return;
  timers.cleave ??= CLEAVE.first;
  timers.mark ??= MARK.first;
  timers.storm ??= 4;
  timers.whirl ??= WHIRL.first;
  const hpRatio = boss.hp / boss.maxHp;
  const enraged = hpRatio < ENRAGE_BELOW;
  if (enraged && !timers.enraged) {
    timers.enraged = 1e9;
    boss.attackTime = 1.3;
    raid.emit({type: 'phase', text: '해골 군주가 광폭해진다!'});
  }
  for (const [i, at] of ADD_WAVES.entries()) {
    const key = `wave${i}`;
    if (hpRatio < at && !timers[key]) {
      timers[key] = 1e9;
      spawnAdds(raid);
    }
  }

  if (raid.cast) {
    raid.cast.timer -= dt;
    if (raid.cast.timer <= 0) raid.cast = null;
  }

  const target = pickTarget(raid, boss);
  if (!target) return;
  if (!raid.cast) {
    if (timers.cleave <= 0) {
      timers.cleave = enraged ? CLEAVE.enragedEvery : CLEAVE.every;
      boss.facing = angleTo(boss, target);
      startCast(raid, boss, '전방 강타', CLEAVE.cast);
      raid.addHazard({
        shape: 'cone',
        x: boss.x,
        z: boss.z,
        radius: CLEAVE.radius,
        angle: boss.facing,
        halfArc: CLEAVE.halfArc,
        follow: null,
        timer: CLEAVE.cast,
        damage: CLEAVE.damage,
        name: '전방 강타',
        owner: null,
      });
      return;
    }
    if (timers.whirl <= 0) {
      timers.whirl = WHIRL.every;
      startCast(raid, boss, '회전 베기', WHIRL.cast);
      raid.addHazard({
        shape: 'circle',
        x: boss.x,
        z: boss.z,
        radius: WHIRL.radius,
        angle: 0,
        halfArc: 0,
        follow: boss.id,
        timer: WHIRL.cast,
        damage: WHIRL.damage,
        name: '회전 베기',
        owner: null,
      });
      return;
    }
    if (timers.mark <= 0) {
      timers.mark = MARK.every;
      const candidates = raid.party.filter(u => u.alive && u.kind !== 'tank');
      const victim = candidates.length ? raid.rng.pick(candidates) : target;
      raid.addHazard({
        shape: 'circle',
        x: victim.x,
        z: victim.z,
        radius: MARK.radius,
        angle: 0,
        halfArc: 0,
        follow: victim.id,
        timer: MARK.timer,
        damage: MARK.damage,
        name: '죽음의 표식',
        owner: victim.id,
      });
      raid.emit({type: 'phase', text: `${victim.name}에게 죽음의 표식! 파티에서 떨어져라`});
    }
    if (hpRatio < STORM.below && timers.storm <= 0) {
      timers.storm = STORM.every;
      startCast(raid, boss, '뼈 폭풍', STORM.cast);
      const living = raid.party.filter(u => u.alive);
      for (let i = 0; i < STORM.count; i++) {
        // Half the circles land on someone, the rest anywhere in the arena.
        const on = i < 3 && living.length ? raid.rng.pick(living) : null;
        const a = raid.rng.range(0, Math.PI * 2);
        const r = raid.rng.range(2, ARENA_RADIUS - 3);
        const at = on ? {x: on.x, z: on.z} : {x: Math.cos(a) * r, z: Math.sin(a) * r};
        raid.addHazard({
          shape: 'circle',
          x: at.x,
          z: at.z,
          radius: STORM.radius,
          angle: 0,
          halfArc: 0,
          follow: null,
          timer: STORM.timer + STORM.cast,
          damage: STORM.damage,
          name: '뼈 폭풍',
          owner: null,
        });
      }
      return;
    }
  }
  if (boss.busy <= 0) {
    if (!raid.cast) boss.facing = turnTowards(boss.facing, angleTo(boss, target), TURN_RATE * dt);
    meleeTowards(raid, boss, target, dt);
  }

  for (const add of raid.enemies) {
    if (add === boss) continue;
    const t = pickTarget(raid, add);
    if (t) meleeTowards(raid, add, t, dt);
  }
}
