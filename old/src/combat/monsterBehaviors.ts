import type {Actor, MonsterBehavior} from '../types';

type Selector = (actor: Actor, targets: readonly Actor[]) => Actor | undefined | null;

const nearest: Selector = (a, targets) =>
  targets.reduce<Actor | null>((best, t) => (!best || t.pos.distanceToSquared(a.pos) < best.pos.distanceToSquared(a.pos) ? t : best), null);

const weakest: Selector = (_a, targets) =>
  targets.reduce<Actor | null>((best, t) => (!best || t.hp / t.max < best.hp / best.max ? t : best), null);

const backline: Selector = (_a, targets) =>
  targets.find(t => t.name === 'Mage') ?? targets.find(t => t.name === 'Rogue_Hooded') ?? targets[0];

export const MONSTER_BEHAVIORS: Readonly<Record<MonsterBehavior, Selector>> = {
  charge: nearest,
  hunter: weakest,
  backline,
};

export function selectMonsterTarget(actor: Actor, targets: readonly Actor[]): Actor | undefined | null {
  const select = (actor.behavior && MONSTER_BEHAVIORS[actor.behavior]) || MONSTER_BEHAVIORS.charge;
  return select(actor, targets);
}
