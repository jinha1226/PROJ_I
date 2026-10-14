import {BOSS_BLAST_RADIUS} from '../data/enemies';
import type {Navigator} from '../dungeon/navigation';
import type {GuildState} from '../state/guild';
import type {Progression} from '../state/progression';
import type {World} from '../state/world';
import type {Actor} from '../types';
import {applyDamage as resolveDamage, type DamageEnv} from './applyDamage';
import {activeCombatActors, chooseCombatTarget, decayCombatTimers, isInCombat, livingCombatSides} from './actorLogic';
import {AttackQueue, type AttackResolvers} from './attackQueue';
import {updateBoss} from './boss';
import {approachGoal, dodgeGoal, lookAt, moveToward} from './movement';
import type {CombatFx} from './ports';
import {createTactics, evaluateTactics, type TacticTable} from './tactics';

export interface CombatEnv {
  world: World;
  nav: Navigator;
  fx: CombatFx;
  progression: Progression;
  guild: GuildState;
}

export interface CombatOutcome {
  heroesSurvived: boolean;
}

const MELEE_WINDUP_MIN = 0.12;
const MELEE_WINDUP_MAX = 0.55;
const KNIGHT_WINDUP_RATIO = 0.42;
const OTHER_WINDUP_RATIO = 0.48;
const DEFAULT_CLIP_SECONDS = 0.7;
const BASIC_ATTACK_ACTION_SECONDS = 0.8;
const KNOCKBACK_SPEED = 3;
const DEATH_SINK_AFTER = 0.7;

/** Real-time room fight: AI decisions, delayed hits, tactics and the boss shockwave. */
export class CombatSystem {
  /** Dungeon room whose enemies are currently engaged; -1 when none. */
  activeRoom = -1;
  readonly attacks: AttackQueue;
  private readonly tactics: TacticTable;
  private readonly damageEnv: DamageEnv & {fx: CombatFx};

  constructor(private readonly env: CombatEnv) {
    this.attacks = new AttackQueue(env.fx);
    this.tactics = createTactics({
      fx: env.fx,
      attacks: this.attacks,
      level: id => env.progression.tacticLevel(id),
      healingUpgrade: () => env.progression.data.upgrades.healing,
    });
    this.damageEnv = {fx: env.fx, onCasualty: actor => this.markCasualty(actor)};
  }

  private markCasualty(actor: Actor): void {
    if (actor.team === 'hero' && actor.rosterId) this.env.guild.recordDeath(actor.rosterId);
  }

  /** Public so retreat penalties can share the casualty rule. */
  recordCasualty(actor: Actor): void {
    this.markCasualty(actor);
  }

  applyDamage(attacker: Actor, target: Actor, color: string, multiplier = 1): void {
    resolveDamage(attacker, target, color, multiplier, this.damageEnv);
  }

  private readonly resolvers: AttackResolvers = {
    resolveAoe: (attacker, center) => {
      if (attacker.dead) return;
      const level = this.env.progression.tacticLevel('aoe');
      const radius = level >= 2 ? 3.5 : 2.8;
      for (const enemy of this.env.world.actors.filter(e => e.team !== attacker.team && !e.dead && e.pos.distanceTo(center.pos) < radius)) {
        this.applyDamage(attacker, enemy, '#8bc7ff', level >= 3 ? 1.35 : 1);
      }
    },
    resolveAttack: (attacker, target) => {
      if (attacker.dead || target.dead || !this.env.nav.lineClear(attacker.pos, target.pos)) return;
      if (attacker.name === 'Rogue_Hooded') this.attacks.launch(attacker, target, 'arrow');
      else if (attacker.name === 'Mage' || attacker.name === 'Skeleton_Mage') this.attacks.launch(attacker, target, 'spell');
      else this.applyDamage(attacker, target, attacker.team === 'hero' ? '#ffe29b' : '#ff8181');
    },
    projectileHit: (attacker, target, color) => this.applyDamage(attacker, target, color),
  };

  /** Starts a basic attack; damage lands after the wind-up. */
  private beginAttack(attacker: Actor, target: Actor): void {
    if (target.dead) return;
    attacker.lastAction = '일반 공격';
    attacker.actionTime = BASIC_ATTACK_ACTION_SECONDS;
    attacker.view.play('attack', true);
    const clip = attacker.view.clipDuration() || DEFAULT_CLIP_SECONDS;
    const ratio = attacker.name === 'Knight' ? KNIGHT_WINDUP_RATIO : OTHER_WINDUP_RATIO;
    this.attacks.scheduleAttack(attacker, target, Math.max(MELEE_WINDUP_MIN, Math.min(MELEE_WINDUP_MAX, clip * ratio)));
  }

  /** Advances the fight by `dt`. Returns an outcome on the tick one side is wiped out. */
  update(dt: number): CombatOutcome | null {
    const {world} = this.env;
    this.attacks.update(dt, this.resolvers);

    for (const actor of world.actors) {
      if (!isInCombat(actor, this.activeRoom)) continue;
      this.updateActor(actor, dt);
    }

    const {heroes, foes} = livingCombatSides(world.actors, this.activeRoom);
    return heroes.length && foes.length ? null : {heroesSurvived: heroes.length > 0};
  }

  private updateActor(a: Actor, dt: number): void {
    const {world, nav, progression} = this.env;
    if (a.isBoss) updateBoss(a, dt, world.actors, this.damageEnv);
    a.actionTime = Math.max(0, (a.actionTime ?? 0) - dt);

    if (a.dead) {
      a.dying = (a.dying ?? 0) + dt;
      if (a.dying > DEATH_SINK_AFTER) a.view.fadeOut(dt, a.dying);
      return;
    }

    if ((a.knockback ?? 0) > 0 && a.knockDirection) {
      const step = Math.min(a.knockback!, dt);
      a.knockback! -= step;
      const x = a.pos.x + a.knockDirection.x * step * KNOCKBACK_SPEED;
      const z = a.pos.z + a.knockDirection.z * step * KNOCKBACK_SPEED;
      if (!nav.blocked(x, z)) {
        a.pos.set(x, 0, z);
        a.view.place(a.pos);
      }
    }
    a.view.settle(dt);

    if ((a.stagger ?? 0) > 0) {
      a.stagger! -= dt;
      return;
    }
    decayCombatTimers(a, dt);

    const enemies = world.actors.filter(b => b.team !== a.team && !b.dead && isInCombat(b, this.activeRoom));
    if (!enemies.length) return;
    const allies = world.actors.filter(b => b.team === a.team && !b.dead && isInCombat(b, this.activeRoom));

    a.timer -= dt;
    if (a.timer <= 0 && evaluateTactics(a, allies, enemies, progression.data.loadout, this.tactics)) return;
    if (this.dodgeBossBlast(a, dt)) return;
    if (this.followRetreat(a, dt)) return;

    const target = chooseCombatTarget(a, enemies);
    if (!target) return;
    a.target = target;
    lookAt(a, target);
    if (a.pos.distanceTo(target.pos) > a.range || !nav.lineClear(a.pos, target.pos)) {
      const goal = approachGoal(a, target, nav);
      if (goal && !moveToward(a, goal, dt, nav)) {
        a.pathAge = 0;
        a.pathGoal = null;
      }
    } else if (a.timer <= 0) {
      this.beginAttack(a, target);
      a.timer = a.cooldown;
    } else {
      a.view.idleIfWalking();
    }
  }

  /** Heroes with the dodge upgrade step out of a telegraphed shockwave. Returns true if it moved. */
  private dodgeBossBlast(a: Actor, dt: number): boolean {
    if (a.team !== 'hero' || this.env.progression.data.upgrades.dodge < 1) return false;
    const boss = this.env.world.actors.find(
      b => b.isBoss && !b.dead && b.warning && a.pos.distanceTo(b.warning.center) < BOSS_BLAST_RADIUS,
    );
    if (!boss?.warning) return false;
    const escape = dodgeGoal(a, boss.warning.center, this.env.nav);
    if (!escape) return false;
    moveToward(a, escape, dt, this.env.nav);
    return true;
  }

  private followRetreat(a: Actor, dt: number): boolean {
    if (!((a.retreatTime ?? 0) > 0 && a.retreat)) return false;
    if (moveToward(a, a.retreat, dt, this.env.nav)) return true;
    a.retreatTime = 0;
    return false;
  }

  /** Enemies engaged in the active room, for HUD counters. */
  engagedActors(): Actor[] {
    return activeCombatActors(this.env.world.actors, this.activeRoom);
  }

  reset(): void {
    this.attacks.clear();
    this.activeRoom = -1;
  }
}
