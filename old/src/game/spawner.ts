import {HERO_BASE_STATS} from '../config';
import {BOSS_FIRST_COOLDOWN, BOSS_SCALE, ENEMY_VARIANTS, enemyStats} from '../data/enemies';
import type {ActorFactory} from '../render/actorFactory';
import type {Dungeon} from '../dungeon/types';
import {tileToWorld} from '../dungeon/coordinates';
import type {Actor, EnemyKind, RosterHero} from '../types';

const ROOM_OFFSETS: readonly (readonly [number, number])[] = [
  [0, -1.6],
  [1.6, 0],
  [-1.6, 0],
];
const REGULAR_ROOM_KINDS: readonly EnemyKind[] = ['guardian', 'stalker', 'caster'];

export async function spawnEnemy(factory: ActorFactory, kind: EnemyKind, x: number, z: number, stage: number): Promise<Actor> {
  const variant = ENEMY_VARIANTS[kind];
  const stats = enemyStats(kind, stage);
  const actor = await factory.spawn({
    name: kind === 'caster' ? 'Skeleton_Mage' : 'Skeleton_Warrior',
    team: 'enemy',
    x,
    z,
    hp: stats.hp,
    damage: stats.damage,
    range: variant.range,
    cooldown: variant.cooldown,
    variant,
  });
  if (kind === 'boss') {
    actor.isBoss = true;
    actor.view.scaleBy(BOSS_SCALE);
    actor.bossCooldown = BOSS_FIRST_COOLDOWN;
  }
  return actor;
}

/** Spawns the living roster (already limited to the party size) at the entrance. */
export function spawnParty(factory: ActorFactory, team: readonly RosterHero[], x: number, z: number): Promise<Actor[]> {
  return Promise.all(
    team.map(async hero => {
      const stats = HERO_BASE_STATS[hero.type];
      const actor = await factory.spawn({name: hero.type, team: 'hero', x, z, hp: hero.hp, damage: stats.damage, range: stats.range, cooldown: stats.cooldown});
      actor.rosterId = hero.id;
      return actor;
    }),
  );
}

/** Populates every room except the entrance; the last room holds the boss. */
export async function spawnDungeonMonsters(factory: ActorFactory, dungeon: Dungeon, stage: number): Promise<Map<number, Actor[]>> {
  const byRoom = new Map<number, Actor[]>();
  const jobs: Promise<void>[] = [];
  for (let room = 1; room < dungeon.centers.length; room++) {
    const center = tileToWorld(dungeon.centers[room][0], dungeon.centers[room][1], dungeon);
    const kinds: readonly EnemyKind[] = room === dungeon.centers.length - 1 ? ['boss'] : REGULAR_ROOM_KINDS;
    jobs.push(
      Promise.all(kinds.map((kind, i) => spawnEnemy(factory, kind, center.x + ROOM_OFFSETS[i][0], center.z + ROOM_OFFSETS[i][1], stage))).then(enemies => {
        for (const enemy of enemies) {
          enemy.dungeonRoom = room;
          enemy.view.setVisible(true);
          enemy.view.setRingVisible(true);
          enemy.view.play('idle');
        }
        byRoom.set(room, enemies);
      }),
    );
  }
  await Promise.all(jobs);
  return byRoom;
}
