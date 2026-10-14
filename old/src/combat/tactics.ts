import {MathUtils} from 'three';
import {TACTIC_INFO} from '../data/tactics';
import type {Actor, HeroType, TacticId} from '../types';
import type {AttackQueue} from './attackQueue';
import type {CombatFx} from './ports';

export interface TacticBehavior {
  score(self: Actor, allies: readonly Actor[], enemies: readonly Actor[]): number;
  execute(self: Actor, allies: readonly Actor[], enemies: readonly Actor[]): void;
}

export interface TacticEnv {
  fx: CombatFx;
  attacks: AttackQueue;
  level(id: TacticId): number;
  /** Purchased "치유 강화" level. */
  healingUpgrade(): number;
}

/** A tactic must score at least this to fire. */
export const TACTIC_SCORE_THRESHOLD = 60;
/** Wait after any tactic before the actor's next basic attack. */
const TACTIC_ACTION_SECONDS = 2.4;
const TACTIC_MIN_ATTACK_DELAY = 0.5;

// KNOWN-BUG(legacy): kite clamps its retreat point to the old single-room arena
// instead of the dungeon, so far from the origin the retreat target is invalid.
const LEGACY_ARENA_HALF_X = 7;
const LEGACY_ARENA_HALF_Z = 5;

const ratio = (a: Actor): number => a.hp / a.max;
const byHealth = (x: Actor, y: Actor): number => ratio(x) - ratio(y);
const byDistanceTo = (origin: Actor) => (x: Actor, y: Actor): number => x.pos.distanceTo(origin.pos) - y.pos.distanceTo(origin.pos);

export function createTactics(env: TacticEnv): Readonly<Record<TacticId, TacticBehavior>> {
  const {fx, attacks, level} = env;
  const say = (actor: Actor, text: string, color: string): void => fx.floatText(actor.pos, text, color);
  const weakestLiving = (allies: readonly Actor[]): Actor | undefined => allies.filter(h => !h.dead).sort(byHealth)[0];
  const aoeRadius = (): number => (level('aoe') >= 2 ? 3.5 : 2.8);

  return {
    taunt: {
      score: (a, allies, enemies) =>
        enemies.filter(e => e.pos.distanceTo(a.pos) < 5 && e.target && e.target !== a).length * 45 +
        (allies.some(h => h !== a && ratio(h) < 0.55) ? 25 : 0),
      execute: (a, _allies, enemies) => {
        const radius = level('taunt') >= 2 ? 6.5 : 5;
        for (const e of enemies) {
          if (e.pos.distanceTo(a.pos) >= radius) continue;
          e.tauntedBy = a;
          e.tauntTime = 4.5;
          e.target = a;
        }
        say(a, '도발!', '#ffbb68');
        fx.impact(a.pos, 0xffa544, 1.3);
        if (level('taunt') >= 3) {
          a.guard = a;
          a.guardTime = 4.5;
          a.guardFactor = 0.8;
        }
      },
    },
    protect: {
      score: (a, allies, enemies) =>
        allies.some(h => h !== a && ratio(h) < 0.55 && enemies.some(e => e.pos.distanceTo(h.pos) < 3)) ? 88 : 0,
      execute: (a, allies) => {
        const ally = allies.filter(h => h !== a && !h.dead).sort(byHealth)[0];
        if (!ally) return;
        ally.guard = a;
        ally.guardTime = level('protect') >= 2 ? 6 : 4;
        ally.counterGuard = level('protect') >= 3;
        say(a, '수호!', '#7ed7ff');
      },
    },
    execute: {
      score: (_a, _allies, enemies) => (enemies.some(e => ratio(e) < 0.5) ? 80 : 0),
      execute: (a, _allies, enemies) => {
        a.focus = enemies.slice().sort(byHealth)[0];
        a.focusTime = 4;
        a.focusBonus = level('execute') >= 2 ? 1.3 : 1;
        say(a, '약점 포착', '#ffe29b');
      },
    },
    kite: {
      score: (a, _allies, enemies) => (enemies.some(e => e.pos.distanceTo(a.pos) < 2.6) ? 95 : 0),
      execute: (a, _allies, enemies) => {
        const nearest = enemies.slice().sort(byDistanceTo(a))[0];
        const direction = a.pos.clone().sub(nearest.pos).normalize();
        const retreat = a.pos.clone().addScaledVector(direction, level('kite') >= 2 ? 4.5 : 3);
        if (level('kite') >= 3) a.kiteBonusTime = 4;
        retreat.x = MathUtils.clamp(retreat.x, -LEGACY_ARENA_HALF_X, LEGACY_ARENA_HALF_X);
        retreat.z = MathUtils.clamp(retreat.z, -LEGACY_ARENA_HALF_Z, LEGACY_ARENA_HALF_Z);
        a.retreat = retreat;
        a.retreatTime = 1.8;
        say(a, '후퇴!', '#b4ecff');
      },
    },
    heal: {
      score: (_a, allies) => {
        const weakest = weakestLiving(allies);
        return weakest && ratio(weakest) < 0.65 ? Math.min(110, (1 - ratio(weakest)) * 145) : 0;
      },
      execute: (a, allies) => {
        const target = weakestLiving(allies);
        if (!target) return;
        const amount = Math.round(30 * (1 + env.healingUpgrade() * 0.2) * (level('heal') >= 2 ? 1.35 : 1));
        const value = Math.min(amount, target.max - target.hp);
        target.hp += value;
        say(target, '+' + value, '#78ffab');
        fx.impact(target.pos, 0x61ffa6, 0.7);
        if (level('heal') >= 3) {
          target.guard = a;
          target.guardTime = 3;
        }
        a.view.play('attack', true);
      },
    },
    aoe: {
      score: (_a, _allies, enemies) =>
        enemies.some(e => enemies.filter(t => t.pos.distanceTo(e.pos) < aoeRadius()).length >= 2) ? 83 : 0,
      execute: (a, _allies, enemies) => {
        const crowd = (center: Actor): number => enemies.filter(e => e.pos.distanceTo(center.pos) < 2.8).length;
        const center = enemies.slice().sort((x, y) => crowd(y) - crowd(x))[0];
        if (!center) return;
        a.view.play('attack', true);
        say(a, '광역 마법!', '#80bfff');
        attacks.scheduleAoe(a, center);
      },
    },
    ironwall: {
      score: a => (ratio(a) < 0.65 ? 92 : 0),
      execute: a => {
        a.guard = a;
        a.guardTime = level('ironwall') >= 2 ? 6 : 4;
        a.guardFactor = level('ironwall') >= 3 ? 0.35 : 0.55;
        say(a, '철벽!', '#a6e4ff');
      },
    },
    snipe: {
      score: (_a, _allies, enemies) => (enemies.some(e => e.name === 'Skeleton_Mage') ? 72 : 0),
      execute: (a, _allies, enemies) => {
        a.focus = enemies.find(e => e.name === 'Skeleton_Mage');
        a.focusTime = 5;
        say(a, '후방 저격!', '#ffdd8e');
      },
    },
    barrier: {
      score: (_a, allies) => (allies.some(h => ratio(h) < 0.75) ? 75 : 0),
      execute: (a, allies) => {
        const target = allies.slice().sort(byHealth)[0];
        if (!target) return;
        target.guard = a;
        target.guardTime = level('barrier') >= 2 ? 6 : 4;
        target.guardFactor = level('barrier') >= 3 ? 0.35 : 0.55;
        say(target, '보호막!', '#8ecfff');
        fx.impact(target.pos, 0x8ecfff, 0.6);
      },
    },
  };
}

export type TacticTable = Readonly<Record<TacticId, TacticBehavior>>;

/**
 * Runs the best eligible equipped tactic for a hero. Returns true when one
 * fired, in which case the hero skips its normal action this tick.
 */
export function evaluateTactics(
  actor: Actor,
  allies: readonly Actor[],
  enemies: readonly Actor[],
  loadout: Readonly<Record<HeroType, readonly TacticId[]>>,
  tactics: TacticTable,
): boolean {
  if (actor.team !== 'hero') return false;
  const cooldowns = (actor.tacticCooldowns ??= {});
  const equipped = loadout[actor.name as HeroType] ?? [];
  const best = equipped
    .filter(id => !(cooldowns[id] > 0))
    .map(id => ({id, score: tactics[id].score(actor, allies, enemies)}))
    .sort((x, y) => y.score - x.score)[0];
  if (!best || best.score < TACTIC_SCORE_THRESHOLD) return false;

  const info = TACTIC_INFO[best.id];
  tactics[best.id].execute(actor, allies, enemies);
  actor.lastAction = info.label;
  actor.actionTime = TACTIC_ACTION_SECONDS;
  cooldowns[best.id] = info.cooldown;
  actor.timer = Math.max(actor.timer, TACTIC_MIN_ATTACK_DELAY);
  return true;
}
