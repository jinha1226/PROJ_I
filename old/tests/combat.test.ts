import {describe, expect, it} from 'vitest';
import {Vector3} from 'three';
import {activeCombatActors, chooseCombatTarget, decayCombatTimers, livingCombatSides} from '../src/combat/actorLogic';
import {applyDamage} from '../src/combat/applyDamage';
import {AttackQueue, type AttackResolvers} from '../src/combat/attackQueue';
import {updateBoss} from '../src/combat/boss';
import {attackDamage} from '../src/combat/damage';
import {approachGoal, dodgeGoal, moveToward} from '../src/combat/movement';
import {ENEMY_VARIANTS, enemyStats} from '../src/data/enemies';
import {MONSTER_BEHAVIORS, selectMonsterTarget} from '../src/combat/monsterBehaviors';
import {createTactics, evaluateTactics} from '../src/combat/tactics';
import {tileToWorld} from '../src/dungeon/coordinates';
import {Navigator} from '../src/dungeon/navigation';
import type {Actor, TacticId} from '../src/types';
import {dungeonFromRows} from './helpers/dungeons';
import {FakeFx, makeActor, viewOf} from './helpers/fakes';

const at = (x: number): Vector3 => new Vector3(x, 0, 0);

describe('attackDamage', () => {
  it('applies focus and kite bonuses multiplicatively and rounds', () => {
    const target = makeActor({team: 'enemy'});
    const a = makeActor({damage: 10, focusTime: 1, focus: target, focusBonus: 2, kiteBonusTime: 1});
    expect(attackDamage(a, target)).toBe(24);
    expect(attackDamage({...a, focusTime: 0, kiteBonusTime: 0}, target)).toBe(10);
    expect(attackDamage(a, target, 0.65)).toBe(Math.round(10 * 0.65 * 2 * 1.2));
  });

  it('ignores a focus bonus aimed at a different target', () => {
    const a = makeActor({damage: 10, focusTime: 1, focus: makeActor({team: 'enemy'}), focusBonus: 3});
    expect(attackDamage(a, makeActor({team: 'enemy'}))).toBe(10);
  });
});

describe('enemy scaling', () => {
  it('scales hp and damage with stage and variant, casters being frailer but sharper', () => {
    expect(enemyStats('guardian', 1)).toEqual({hp: Math.round(65 * 1.8), damage: Math.round(10 * 0.8)});
    expect(enemyStats('caster', 1)).toEqual({hp: Math.round(55 * 0.85), damage: Math.round(12 * 1.2)});
    expect(enemyStats('stalker', 11).hp).toBeGreaterThan(enemyStats('stalker', 1).hp);
    expect(ENEMY_VARIANTS.boss.hp).toBeGreaterThan(ENEMY_VARIANTS.stalker.hp);
  });
});

describe('monster targeting', () => {
  const near = makeActor({name: 'Knight', pos: at(1), hp: 90, max: 100});
  const far = makeActor({name: 'Mage', pos: at(5), hp: 10, max: 100});

  it('charge picks the nearest, hunter the weakest, backline the squishiest class', () => {
    const origin = makeActor({team: 'enemy'});
    expect(selectMonsterTarget({...origin, behavior: 'charge'}, [near, far])).toBe(near);
    expect(selectMonsterTarget({...origin, behavior: 'hunter'}, [near, far])).toBe(far);
    expect(selectMonsterTarget({...origin, behavior: 'backline'}, [near, far])).toBe(far);
    expect(MONSTER_BEHAVIORS.backline(origin, [near])).toBe(near);
  });

  it('prefers a mage over a rogue, and falls back to charge for unknown behaviour', () => {
    const rogue = makeActor({name: 'Rogue_Hooded', pos: at(2)});
    expect(selectMonsterTarget(makeActor({team: 'enemy', behavior: 'backline'}), [rogue, near])).toBe(rogue);
    expect(selectMonsterTarget(makeActor({team: 'enemy', behavior: null}), [far, near])).toBe(near);
  });
});

describe('combat actor logic', () => {
  it('filters enemies of other rooms out of the fight', () => {
    const actors = [makeActor(), makeActor({team: 'enemy', dungeonRoom: 2}), makeActor({team: 'enemy', dungeonRoom: 3}), makeActor({team: 'enemy'})];
    expect(activeCombatActors(actors, 2)).toHaveLength(3);
    const {heroes, foes} = livingCombatSides(actors, 2);
    expect([heroes.length, foes.length]).toEqual([1, 2]);
  });

  it('ignores the dead when judging who is left', () => {
    const actors = [makeActor(), makeActor({team: 'enemy', dead: true, dungeonRoom: 1})];
    expect(livingCombatSides(actors, 1).foes).toHaveLength(0);
  });

  it('picks targets by taunt, then focus, then proximity', () => {
    const enemies = [makeActor({team: 'enemy', pos: at(2)}), makeActor({team: 'enemy', pos: at(8)})];
    const hero = makeActor({pos: at(0)});
    expect(chooseCombatTarget(hero, enemies)).toBe(enemies[0]);
    Object.assign(hero, {focusTime: 2, focus: enemies[1]});
    expect(chooseCombatTarget(hero, enemies)).toBe(enemies[1]);
    const monster = makeActor({team: 'enemy', tauntTime: 1, tauntedBy: hero, behavior: 'hunter'});
    expect(chooseCombatTarget(monster, [hero])).toBe(hero);
  });

  it('drops a dead focus or taunter', () => {
    const enemies = [makeActor({team: 'enemy', pos: at(3)})];
    const dead = makeActor({team: 'enemy', dead: true});
    expect(chooseCombatTarget(makeActor({focusTime: 2, focus: dead}), enemies)).toBe(enemies[0]);
    const taunter = makeActor({dead: true});
    expect(chooseCombatTarget(makeActor({team: 'enemy', tauntTime: 2, tauntedBy: taunter, behavior: 'charge'}), [makeActor({pos: at(4)})])).not.toBe(taunter);
  });

  it('never lets timers decay below zero', () => {
    const a = makeActor({tauntTime: 0.1, guardTime: 0.1, focusTime: 0.1, kiteBonusTime: 0.1, retreatTime: 0.1, tacticCooldowns: {heal: 0.1}});
    decayCombatTimers(a, 1);
    expect([a.tauntTime, a.guardTime, a.focusTime, a.kiteBonusTime, a.retreatTime, a.tacticCooldowns!.heal]).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe('applyDamage', () => {
  const env = (fx = new FakeFx(), deaths: Actor[] = []) => ({fx, onCasualty: (a: Actor) => deaths.push(a)});

  it('kills, flags the casualty and plays the death animation', () => {
    const deaths: Actor[] = [];
    const attacker = makeActor({damage: 12});
    const target = makeActor({team: 'enemy', hp: 10, pos: at(1)});
    applyDamage(attacker, target, 'red', 1, env(new FakeFx(), deaths));
    expect(target).toMatchObject({hp: 0, dead: true, dying: 0});
    expect(viewOf(target).ringVisible).toBe(false);
    expect(viewOf(target).played).toContain('death');
    expect(deaths).toEqual([target]);
  });

  it('staggers survivors and pushes them away from the attacker', () => {
    const fx = new FakeFx();
    const target = makeActor({team: 'enemy', pos: at(2)});
    applyDamage(makeActor({damage: 10}), target, 'red', 1, env(fx));
    expect(target.hp).toBe(90);
    expect(target.stagger).toBeCloseTo(0.22);
    expect(target.knockDirection!.x).toBeCloseTo(1);
    expect(viewOf(target).played).toContain('hit');
    expect(fx.texts).toContain('-10');
    expect(fx.impacts).toBe(1);
  });

  it('falls back to a default knockback direction when stacked on the attacker', () => {
    const target = makeActor({team: 'enemy'});
    applyDamage(makeActor(), target, 'red', 1, env());
    expect(target.knockDirection!.toArray()).toEqual([0, 0, 1]);
  });

  it('ignores hits on the dead', () => {
    const target = makeActor({team: 'enemy', dead: true, hp: 0});
    const fx = new FakeFx();
    applyDamage(makeActor(), target, 'red', 1, env(fx));
    expect(fx.texts).toEqual([]);
  });

  it('reduces damage under guard and lets a counter-guard punish enemy attackers', () => {
    const guardian = makeActor({damage: 100});
    const target = makeActor({guard: guardian, guardTime: 3, guardFactor: 0.5, counterGuard: true, hp: 100});
    const attacker = makeActor({team: 'enemy', damage: 20, hp: 25});
    const fx = new FakeFx();
    applyDamage(attacker, target, 'red', 1, env(fx));
    expect(target.hp).toBe(90);
    expect(attacker.hp).toBe(0);
    expect(attacker.dead).toBe(true);
    expect(fx.texts).toContain('방어!');
  });

  it('applies the default 55% guard factor', () => {
    const target = makeActor({guard: makeActor(), guardTime: 1, hp: 100});
    applyDamage(makeActor({team: 'enemy', damage: 20}), target, 'red', 1, env());
    expect(target.hp).toBe(100 - Math.ceil(20 * 0.55));
  });

  it('does not guard once the guardian has fallen', () => {
    const target = makeActor({guard: makeActor({dead: true}), guardTime: 3, hp: 100});
    applyDamage(makeActor({team: 'enemy', damage: 20}), target, 'red', 1, env());
    expect(target.hp).toBe(80);
  });
});

describe('AttackQueue', () => {
  const resolvers = (log: string[]): AttackResolvers => ({
    resolveAoe: (a, b) => log.push(`aoe:${a.name}>${b.name}`),
    resolveAttack: (a, b) => log.push(`hit:${a.name}>${b.name}`),
    projectileHit: (_a, _b, color) => log.push('land:' + color),
  });

  it('resolves wind-ups only after their delay', () => {
    const log: string[] = [];
    const queue = new AttackQueue(new FakeFx());
    queue.scheduleAttack(makeActor(), makeActor({team: 'enemy'}), 0.3);
    queue.update(0.2, resolvers(log));
    expect(log).toEqual([]);
    queue.update(0.2, resolvers(log));
    expect(log).toEqual(['hit:Knight>Skeleton_Warrior']);
    expect(queue.inFlight).toBe(0);
  });

  it('flies arrows for 0.2s and spells for 0.37s before landing with the right color', () => {
    const log: string[] = [];
    const fx = new FakeFx();
    const queue = new AttackQueue(fx);
    const target = makeActor({team: 'enemy', pos: at(5)});
    queue.launch(makeActor(), target, 'arrow');
    queue.launch(makeActor(), target, 'spell');
    queue.update(0.1, resolvers(log));
    expect(log).toEqual([]);
    queue.update(0.11, resolvers(log));
    expect(log).toEqual(['land:#ffe29b']);
    queue.update(0.2, resolvers(log));
    expect(log).toEqual(['land:#ffe29b', 'land:#8bc7ff']);
    expect(fx.projectiles.every(p => p.disposed)).toBe(true);
  });

  it('drops projectiles whose target died in flight', () => {
    const log: string[] = [];
    const queue = new AttackQueue(new FakeFx());
    const target = makeActor({team: 'enemy'});
    queue.launch(makeActor(), target, 'arrow');
    target.dead = true;
    queue.update(1, resolvers(log));
    expect(log).toEqual([]);
  });

  it('lets a shot launched by a wind-up age in the same step', () => {
    const queue = new AttackQueue(new FakeFx());
    const log: string[] = [];
    const target = makeActor({team: 'enemy'});
    const attacker = makeActor();
    queue.scheduleAttack(attacker, target, 0.1);
    queue.update(0.15, {...resolvers(log), resolveAttack: () => queue.launch(attacker, target, 'arrow')});
    expect(queue.inFlight).toBe(1);
    queue.update(0.1, resolvers(log));
    expect(log).toEqual(['land:#ffe29b']);
  });

  it('clears everything and releases visuals', () => {
    const fx = new FakeFx();
    const queue = new AttackQueue(fx);
    queue.launch(makeActor(), makeActor({team: 'enemy'}), 'spell');
    queue.scheduleAoe(makeActor(), makeActor({team: 'enemy'}));
    queue.clear();
    expect(queue.inFlight).toBe(0);
    expect(fx.projectiles[0].disposed).toBe(true);
  });
});

describe('tactics', () => {
  function table(levels: Partial<Record<TacticId, number>> = {}, healing = 0) {
    const fx = new FakeFx();
    const attacks = new AttackQueue(fx);
    const tactics = createTactics({fx, attacks, level: id => levels[id] ?? 1, healingUpgrade: () => healing});
    return {fx, attacks, tactics};
  }

  it('fires the best-scoring eligible tactic once and then respects its cooldown', () => {
    const {tactics} = table();
    const knight = makeActor({name: 'Knight', pos: at(0), timer: 0});
    const hurt = makeActor({name: 'Mage', hp: 30, pos: at(1)});
    const enemy = makeActor({team: 'enemy', pos: at(1.5), target: hurt});
    const loadout = {Knight: ['taunt', 'protect'], Rogue_Hooded: [], Mage: []} as const;
    expect(evaluateTactics(knight, [knight, hurt], [enemy], loadout, tactics)).toBe(true);
    expect(knight.lastAction).toBe('아군 보호');
    expect(knight.tacticCooldowns!.protect).toBe(5);
    expect(knight.actionTime).toBe(2.4);
    expect(hurt.guard).toBe(knight);
    expect(evaluateTactics(knight, [knight, hurt], [enemy], loadout, tactics)).toBe(true);
    expect(knight.lastAction).toBe('도발');
  });

  it('does nothing below the score threshold or for enemies', () => {
    const {tactics} = table();
    const knight = makeActor({name: 'Knight'});
    expect(evaluateTactics(knight, [knight], [makeActor({team: 'enemy', pos: at(20)})], {Knight: ['taunt'], Rogue_Hooded: [], Mage: []}, tactics)).toBe(false);
    expect(evaluateTactics(makeActor({team: 'enemy'}), [], [], {Knight: ['taunt'], Rogue_Hooded: [], Mage: []}, tactics)).toBe(false);
  });

  it('taunt pulls nearby enemies and grants a guard at level 3', () => {
    const {tactics} = table({taunt: 3});
    const knight = makeActor({pos: at(0)});
    const close = makeActor({team: 'enemy', pos: at(6)});
    const far = makeActor({team: 'enemy', pos: at(7)});
    tactics.taunt.execute(knight, [knight], [close, far]);
    expect(close.tauntedBy).toBe(knight);
    expect(far.tauntedBy).toBeUndefined();
    expect(knight).toMatchObject({guard: knight, guardTime: 4.5, guardFactor: 0.8});
  });

  it('heal restores the weakest ally, capped at max hp and boosted by upgrades and level', () => {
    const {tactics, fx} = table({heal: 2}, 5);
    const mage = makeActor({name: 'Mage'});
    const ally = makeActor({hp: 5, max: 100});
    tactics.heal.execute(mage, [mage, ally], []);
    expect(ally.hp).toBe(5 + Math.round(30 * 2 * 1.35));
    expect(fx.texts).toContain('+81');
    const nearlyFull = makeActor({hp: 95, max: 100});
    tactics.heal.execute(mage, [mage, nearlyFull], []);
    expect(nearlyFull.hp).toBe(100);
  });

  it('heal only scores for allies under 65% health', () => {
    const {tactics} = table();
    const mage = makeActor({name: 'Mage'});
    expect(tactics.heal.score(mage, [makeActor({hp: 70})], [])).toBe(0);
    expect(tactics.heal.score(mage, [makeActor({hp: 50})], [])).toBeCloseTo(72.5);
    expect(tactics.heal.score(mage, [makeActor({hp: 1})], [])).toBe(110);
  });

  it('aoe schedules a delayed blast on the densest cluster', () => {
    const {tactics, attacks} = table();
    const mage = makeActor({name: 'Mage'});
    const lone = makeActor({team: 'enemy', pos: at(20)});
    const a = makeActor({team: 'enemy', pos: at(5)});
    const b = makeActor({team: 'enemy', pos: at(6)});
    expect(tactics.aoe.score(mage, [mage], [lone])).toBe(0);
    expect(tactics.aoe.score(mage, [mage], [lone, a, b])).toBe(83);
    tactics.aoe.execute(mage, [mage], [lone, a, b]);
    expect(attacks.inFlight).toBe(1);
  });

  it('execute focuses the weakest enemy and snipe hunts the caster', () => {
    const {tactics} = table({execute: 2});
    const rogue = makeActor({name: 'Rogue_Hooded'});
    const weak = makeActor({team: 'enemy', hp: 10});
    const caster = makeActor({team: 'enemy', name: 'Skeleton_Mage'});
    tactics.execute.execute(rogue, [rogue], [caster, weak]);
    expect(rogue).toMatchObject({focus: weak, focusTime: 4, focusBonus: 1.3});
    tactics.snipe.execute(rogue, [rogue], [weak, caster]);
    expect(rogue.focus).toBe(caster);
    expect(tactics.snipe.score(rogue, [rogue], [weak])).toBe(0);
  });

  it('ironwall and barrier scale their guard with level', () => {
    const {tactics} = table({ironwall: 3, barrier: 2});
    const knight = makeActor({hp: 50});
    tactics.ironwall.execute(knight, [knight], []);
    expect(knight).toMatchObject({guard: knight, guardTime: 6, guardFactor: 0.35});
    const mage = makeActor({name: 'Mage'});
    const ally = makeActor({hp: 10});
    tactics.barrier.execute(mage, [ally, mage], []);
    expect(ally).toMatchObject({guard: mage, guardTime: 6, guardFactor: 0.55});
  });

  it('kite flees from the nearest enemy and (legacy) clamps to the original arena', () => {
    const {tactics} = table({kite: 3});
    const rogue = makeActor({pos: new Vector3(2, 0, 0)});
    const enemy = makeActor({team: 'enemy', pos: new Vector3(1, 0, 0)});
    tactics.kite.execute(rogue, [rogue], [enemy]);
    expect(rogue.retreat!.x).toBeCloseTo(6.5);
    expect(rogue).toMatchObject({retreatTime: 1.8, kiteBonusTime: 4});
    const far = makeActor({pos: new Vector3(50, 0, 0)});
    tactics.kite.execute(far, [far], [makeActor({team: 'enemy', pos: new Vector3(49, 0, 0)})]);
    expect(far.retreat!.x).toBe(7);
  });

  it('protect transfers a guard with counter at level 3 to the weakest other ally', () => {
    const {tactics} = table({protect: 3});
    const knight = makeActor();
    const weak = makeActor({hp: 20});
    const ok = makeActor({hp: 80});
    tactics.protect.execute(knight, [knight, ok, weak], []);
    expect(weak).toMatchObject({guard: knight, guardTime: 6, counterGuard: true});
    expect(ok.guard).toBeUndefined();
  });
});

describe('movement', () => {
  const dungeon = dungeonFromRows(['#########', '#.......#', '#.#####.#', '#.......#', '#########']);
  const nav = new Navigator(dungeon);
  const tile = (x: number, y: number): Vector3 => tileToWorld(x, y, dungeon);

  it('walks along a corridor toward the goal and plays the walk animation', () => {
    const hero = makeActor({pos: tile(1, 1)});
    const goal = tile(7, 1);
    let moved = 0;
    for (let i = 0; i < 400 && hero.pos.distanceTo(goal) > 0.05; i++) {
      expect(moveToward(hero, goal, 0.05, nav)).toBe(true);
      moved++;
    }
    expect(hero.pos.distanceTo(goal)).toBeLessThan(0.1);
    expect(moved).toBeGreaterThan(10);
    expect(viewOf(hero).played).toContain('walk');
  });

  it('reaches a goal that sits off-center inside its own tile', () => {
    const hero = makeActor({pos: tile(1, 1)});
    const goal = tile(1, 1).add(new Vector3(0.6, 0, 0.5));
    for (let i = 0; i < 40 && hero.pos.distanceTo(goal) > 0.1; i++) moveToward(hero, goal, 0.05, nav);
    expect(hero.pos.distanceTo(goal)).toBeLessThan(0.15);
  });

  it('ends exactly on an off-center goal in a distant tile', () => {
    const hero = makeActor({pos: tile(1, 1)});
    const goal = tile(7, 1).add(new Vector3(-0.5, 0, 0.4));
    for (let i = 0; i < 400 && hero.pos.distanceTo(goal) > 0.1; i++) moveToward(hero, goal, 0.05, nav);
    expect(hero.pos.distanceTo(goal)).toBeLessThan(0.15);
  });

  it('heroes outpace skeletons', () => {
    const hero = makeActor({pos: tile(1, 1)});
    const skeleton = makeActor({team: 'enemy', pos: tile(1, 1)});
    moveToward(hero, tile(7, 1), 0.1, nav);
    moveToward(skeleton, tile(7, 1), 0.1, nav);
    expect(hero.pos.distanceTo(tile(1, 1))).toBeGreaterThan(skeleton.pos.distanceTo(tile(1, 1)));
  });

  it('reports failure when the goal is unreachable', () => {
    const hero = makeActor({pos: tile(1, 1)});
    expect(moveToward(hero, tile(0, 0), 0.1, nav)).toBe(false);
  });

  it('chooses a standing spot within attack range of the target', () => {
    const hero = makeActor({pos: tile(1, 1), range: 3});
    const target = makeActor({team: 'enemy', pos: tile(6, 1)});
    const goal = approachGoal(hero, target, nav)!;
    expect(goal).not.toBeNull();
    expect(goal.distanceTo(target.pos)).toBeLessThanOrEqual(3);
    expect(nav.lineClear(goal, target.pos)).toBe(true);
  });

  it('keeps its current goal when it is nearly as cheap as the best one', () => {
    const hero = makeActor({pos: tile(1, 1), range: 3});
    const target = makeActor({team: 'enemy', pos: tile(6, 1)});
    const first = approachGoal(hero, target, nav)!;
    hero.pathGoal = first;
    expect(approachGoal(hero, target, nav)).toBe(first);
  });

  it('finds no approach spot when the target is walled in', () => {
    const sealed = dungeonFromRows(['#####', '#.#.#', '#####']);
    const hero = makeActor({pos: tileToWorld(1, 1, sealed)});
    const target = makeActor({team: 'enemy', pos: tileToWorld(3, 1, sealed)});
    expect(approachGoal(hero, target, new Navigator(sealed))).toBeNull();
  });

  it('dodge goal only exists near the legacy arena around the world origin', () => {
    const big = dungeonFromRows(['.'.repeat(21), ...Array.from({length: 20}, () => '.'.repeat(21))]);
    const bigNav = new Navigator(big);
    const hero = makeActor({pos: tileToWorld(10, 10, big)});
    expect(dodgeGoal(hero, tileToWorld(10, 10, big), bigNav)).not.toBeNull();
    expect(dodgeGoal(makeActor({pos: tileToWorld(0, 0, big)}), tileToWorld(0, 0, big), bigNav)).toBeNull();
  });
});

describe('boss shockwave', () => {
  const setup = () => {
    const fx = new FakeFx();
    const deaths: Actor[] = [];
    const env = {fx, onCasualty: (a: Actor) => deaths.push(a)};
    const boss = makeActor({team: 'enemy', isBoss: true, bossCooldown: 1, damage: 100, pos: at(0)});
    return {fx, env, boss};
  };

  it('telegraphs after its cooldown, then detonates and resets the cooldown', () => {
    const {fx, env, boss} = setup();
    const hero = makeActor({pos: at(1), hp: 500, max: 500});
    updateBoss(boss, 0.5, [boss, hero], env);
    expect(boss.warning).toBeUndefined();
    updateBoss(boss, 0.6, [boss, hero], env);
    expect(boss.warning).toBeTruthy();
    expect(boss.lastAction).toBe('충격파 예고');
    expect(fx.warnings).toHaveLength(1);
    updateBoss(boss, 1.4, [boss, hero], env);
    expect(boss.warning).toBeTruthy();
    updateBoss(boss, 0.2, [boss, hero], env);
    expect(boss.warning).toBeNull();
    expect(hero.hp).toBe(500 - Math.round(100 * 0.65));
    expect(boss.bossCooldown).toBe(5.5);
    expect(fx.pulses).toBe(1);
    expect(fx.warnings[0].disposed).toBe(true);
  });

  it('spares heroes outside the blast radius and the already dead', () => {
    const {env, boss} = setup();
    const safe = makeActor({pos: at(10), hp: 500, max: 500});
    const corpse = makeActor({pos: at(1), hp: 0, dead: true});
    boss.warning = {center: at(0), time: 0.1, setOpacity() {}, dispose() {}};
    updateBoss(boss, 0.2, [boss, safe, corpse], env);
    expect(safe.hp).toBe(500);
    expect(corpse.hp).toBe(0);
  });

  it('cancels the telegraph if the boss dies first', () => {
    const {fx, env, boss} = setup();
    boss.bossCooldown = 0;
    updateBoss(boss, 0.1, [boss], env);
    boss.dead = true;
    updateBoss(boss, 0.1, [boss], env);
    expect(boss.warning).toBeNull();
    expect(fx.warnings[0].disposed).toBe(true);
  });

  it('pulses the telegraph opacity', () => {
    const {fx, env, boss} = setup();
    boss.bossCooldown = 0;
    updateBoss(boss, 0.1, [boss], env);
    updateBoss(boss, 0.1, [boss], env);
    expect(fx.warnings[0].opacity).toBeGreaterThanOrEqual(0.18);
    expect(fx.warnings[0].opacity).toBeLessThanOrEqual(0.32);
  });
});
