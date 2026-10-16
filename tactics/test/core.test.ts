import test from 'node:test';
import assert from 'node:assert/strict';
import { applyElement, cellAt, enemies, heroUnit, push, sees } from '../src/core/board';
import { enemyTurn, threatCells } from '../src/core/enemy';
import { applyItem, identifiable, itemName, itemTargets, itemUses, rollItemNames } from '../src/core/items';
import { act, createBattle, endTurn, heroSteps, leave, stepHero, useItem, wait } from '../src/core/game';
import { attackPower, attackRange, perform, skillCd, skillPower } from '../src/core/hero';
import { chooseReward, nextMap, newHero, rollRewards, settle, spendPoint, startRun } from '../src/core/run';
import type { Battle, WeaponId } from '../src/core/types';
import { ENEMIES } from '../src/data/enemies';
import { ACT1 } from '../src/data/maps';
import { COLLIDE_DMG, LAVA_DMG, SHOCK_DMG, START_HP, STR_HP } from '../src/data/rules';
import { WEAPONS } from '../src/data/weapons';
import { FIRE_BOMB_DMG, HEAL_FRAC } from '../src/data/items';
import { ENCHANT_ATK, REWARD_CHOICES } from '../src/data/rewards';

/** 시험은 피해를 늘 최대로 굴린다 (범위 자체는 따로 시험한다) */
const battle = (rows: string[], weapon: WeaponId = 'sword'): Battle => {
  const b = createBattle({ name: '시험', clearXp: 5, rows }, newHero(weapon), 1);
  b.roll = 'max';
  return b;
};
const nth = (b: Battle, i: number) => enemies(b)[i]!;

test('수제 맵: 줄 길이가 같고 주인공이 하나', () => {
  for (const m of ACT1) {
    assert.ok(m.rows.every((r) => r.length === 10), m.name);
    assert.equal(m.rows.join('').split('@').length - 1, 1, m.name);
  }
});

test('정통 턴제: 붙은 적은 예고 없이 바로 때리고, 물러서면 따라붙는다', () => {
  const b = battle(['.....', '.@g..', '.....']);
  const me = heroUnit(b);
  wait(b);
  assert.equal(me.hp, me.maxHp - ENEMIES.goblin.dmg[1], '붙어 있으면 바로 맞는다');
  const hp = me.hp;
  stepHero(b, { x: 0, y: 1 });
  assert.equal(me.hp, hp, '물러선 턴은 안 맞는다');
  assert.equal(nth(b, 0).pos.x, 1, '고블린이 따라붙었다');
});

test('빠른 적은 한 턴에 두 번, 느린 적은 두 턴에 한 번', () => {
  const b = battle(['@....v', '......']);
  wait(b);
  assert.equal(nth(b, 0).pos.x, 3, '늑대 두 칸');
  const o = battle(['@...G.', '......']);
  const ogre = nth(o, 0);
  wait(o); // 1턴: 쉼
  assert.equal(ogre.pos.x, 4);
  wait(o); // 2턴: 움직임
  assert.equal(ogre.pos.x, 3);
});

test('궁수는 처음 맞는 게 주인공일 때만 쏜다 (적 뒤에 숨기)', () => {
  const b = battle(['......', '@.g..a', '......']);
  const me = heroUnit(b);
  const [gob, archer] = [nth(b, 0), nth(b, 1)];
  gob.frozen = 1; // 고블린은 제자리에 둔다
  enemyTurn(b);
  assert.equal(me.hp, me.maxHp, '고블린 뒤라 안 맞음');
  assert.notDeepEqual(archer.pos, { x: 5, y: 1 }, '쏠 자리를 찾아 움직였다');
});

test('창병은 직선 두 칸을 찌르고, 사이에 선 고블린도 맞는다', () => {
  const b = battle(['@gs..']);
  const [gob] = [nth(b, 0)];
  enemyTurn(b);
  assert.equal(gob.hp, gob.maxHp - ENEMIES.spearman.dmg[1], '사이의 고블린이 맞음');
});

test('폭탄벌레: 붙으면 도화선, 다음 턴 3×3으로 터진다 (주변 적도)', () => {
  const b = battle(['......', '.@b...', '..g...']);
  const me = heroUnit(b);
  const [beetle, gob] = [nth(b, 0), nth(b, 1)];
  gob.hp = gob.maxHp = 20; // 최대 굴림에 죽지 않게
  enemyTurn(b);
  assert.ok(beetle.intent, '도화선');
  const hp = me.hp;
  stepHero(b, { x: 0, y: 0 }); // 물러서도 벌레는 그 자리에서 터진다
  assert.ok(beetle.dead);
  assert.equal(me.hp, hp, '3×3 밖');
  assert.ok(gob.hp < gob.maxHp, '옆의 고블린이 휘말림');
});

test('밀치기: 용암에 빠지면 큰 피해, 구덩이는 즉사, 벽은 충돌 피해', () => {
  const b = battle(['@....', '.g~..', '.g_..', '.g#..', '.....']);
  const [lava, pit, wall] = [nth(b, 0), nth(b, 1), nth(b, 2)];
  push(b, lava, { x: 1, y: 0 }, 1);
  push(b, pit, { x: 1, y: 0 }, 1);
  push(b, wall, { x: 1, y: 0 }, 1);
  assert.ok(lava.dead || lava.hp === lava.maxHp - LAVA_DMG);
  assert.ok(pit.dead, '구덩이');
  assert.equal(wall.hp, wall.maxHp - COLLIDE_DMG, '바위에 부딪힘');
  assert.equal(wall.pos.x, 1, '안 움직임');
});

test('얼음 위에서 밀리면 멈출 때까지 미끄러진다', () => {
  const b = battle(['@....', '.g===', '.....']);
  const g = nth(b, 0);
  push(b, g, { x: 1, y: 0 }, 1);
  assert.equal(g.pos.x, 4, '끝까지 미끄러짐');
  assert.equal(g.hp, g.maxHp - COLLIDE_DMG, '보드 끝에 부딪힘');
});

test('원소 반응: 불은 얼음을 물로, 그 물이 같은 행동에서 증기가 되지는 않는다 (한 단계)', () => {
  const b = battle(['@....', '.=w..', '.....']);
  applyElement(b, [{ x: 1, y: 1 }, { x: 2, y: 1 }], 'fire');
  assert.equal(cellAt(b, { x: 1, y: 1 }).tile, 'water');
  assert.equal(cellAt(b, { x: 1, y: 1 }).steam, 0, '녹은 물은 증기가 되지 않음');
  assert.ok(cellAt(b, { x: 2, y: 1 }).steam > 0, '원래 물은 증기');
});

test('원소 반응: 서리는 물을 얼리고 그 위의 적을 얼린다, 용암은 식었다가 돌아온다', () => {
  const b = battle(['@....', '.~...', '..w..', '.....', '....g']);
  const g = nth(b, 0);
  g.pos = { x: 2, y: 2 };
  applyElement(b, [{ x: 1, y: 1 }, { x: 2, y: 2 }], 'frost');
  assert.equal(cellAt(b, { x: 2, y: 2 }).tile, 'ice');
  assert.ok(g.frozen > 0, '빙결');
  assert.equal(cellAt(b, { x: 1, y: 1 }).tile, 'floor');
  for (let i = 0; i < 3; i++) endTurn(b);
  assert.equal(cellAt(b, { x: 1, y: 1 }).tile, 'lava', '다시 용암');
});

test('번개: 이어진 물 전체가 감전되고 얼음은 끊는다', () => {
  const b = battle(['@.....', 'www=w.', 'g.g.g.']);
  const [a, c, far] = [nth(b, 0), nth(b, 1), nth(b, 2)];
  a.pos = { x: 0, y: 1 };
  c.pos = { x: 2, y: 1 };
  far.pos = { x: 4, y: 1 };
  applyElement(b, [{ x: 0, y: 1 }], 'shock');
  assert.equal(a.hp, a.maxHp - SHOCK_DMG);
  assert.equal(c.hp, c.maxHp - SHOCK_DMG, '이어진 물');
  assert.equal(far.hp, far.maxHp, '얼음 너머는 안 감전');
});

test('불은 풀을 타고 한 턴에 한 칸씩 번지고, 다 탄 풀은 바닥이 된다', () => {
  const b = battle(['@....', ',,,,,', '.....']);
  applyElement(b, [{ x: 0, y: 1 }], 'fire');
  endTurn(b);
  assert.ok(cellAt(b, { x: 1, y: 1 }).fire > 0);
  assert.equal(cellAt(b, { x: 2, y: 1 }).fire, 0);
  for (let i = 0; i < 3; i++) endTurn(b);
  assert.equal(cellAt(b, { x: 0, y: 1 }).tile, 'floor');
});

test('무기 조건: 넘는 만큼 더하고 모자라면 크게 깎인다', () => {
  const h = newHero('sword');
  const base = attackPower(h, 'sword');
  h.stats.str += 2;
  assert.equal(attackPower(h, 'sword'), base + 2);
  assert.ok(attackPower(newHero('sword'), 'hammer') < attackPower(newHero('hammer'), 'hammer'), '힘 모자란 망치');
});

test('깊은 물에 들어가면 다음 턴은 걷지 못한다', () => {
  const b = battle(['@w...', '.....']);
  assert.ok(stepHero(b, { x: 1, y: 0 }));
  assert.equal(heroSteps(b).length, 0);
  wait(b);
  assert.ok(heroSteps(b).length > 0);
});

test('망치는 맞힌 적을 민다, 빙결된 적은 행동하지 못한다', () => {
  const b = battle(['..@..', '..g..', '.....', '.....'], 'hammer');
  const g = nth(b, 0);
  g.hp = g.maxHp = 30; // 최대 굴림에 죽지 않게
  assert.ok(perform(b, 'attack', { x: 2, y: 1 }));
  assert.equal(g.hp, g.maxHp - attackRange(b.hero)[1]);
  assert.equal(g.pos.y, 2, '밀렸다');

  const f = battle(['@g...', '.....'], 'frostStaff');
  assert.ok(act(f, 'skill', nth(f, 0).pos));
  assert.equal(heroUnit(f).hp, heroUnit(f).maxHp, '얼어서 못 때림');
});

test('다 잡으면 클리어 경험치, 일찍 나가면 처치 경험치만', () => {
  const b = battle(['@g...', '.....', '....>']);
  act(b, 'attack', { x: 1, y: 0 });
  act(b, 'attack', { x: 1, y: 0 });
  assert.equal(b.status, 'cleared');
  assert.equal(b.hero.xp, ENEMIES.goblin.xp + 5);

  const e = battle(['.....', '.....', '...@>', '.....', '.....', '.....', '....G']);
  stepHero(e, { x: 4, y: 2 });
  assert.ok(leave(e));
  assert.equal(e.hero.xp, 0);
});

test('판: 맵을 깨면 맵 사이로, 체력 20% 회복', () => {
  const run = startRun('sword');
  heroUnit(run.battle).hp = 10;
  for (const u of enemies(run.battle)) u.dead = true;
  run.battle.status = 'cleared';
  assert.ok(settle(run));
  assert.equal(run.phase, 'between');
  assert.equal(run.hero.hp, 10 + Math.ceil(run.hero.maxHp * 0.2));
});

test('시야: 바위가 끊고, 유닛은 막지 않으며, 양쪽이 같다', () => {
  const b = battle(['@.g.p', '.....', '..#..', '.....', '....p']);
  assert.ok(sees(b, { x: 0, y: 0 }, { x: 4, y: 0 }), '사이의 고블린은 시야를 막지 않는다');
  assert.ok(!sees(b, { x: 0, y: 0 }, { x: 4, y: 4 }), '가운데 바위');
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) assert.equal(sees(b, { x: 0, y: 0 }, { x, y }), sees(b, { x, y }, { x: 0, y: 0 }));
  }
});

test('오크 사제: 보이면 사이에 누가 있든 내리치고, 두 턴에 한 번', () => {
  const b = battle(['@.o..p', '......']);
  const me = heroUnit(b);
  const [orc, priest] = [nth(b, 0), nth(b, 1)];
  orc.frozen = 9;
  enemyTurn(b);
  assert.equal(me.hp, me.maxHp - ENEMIES.priest.dmg[1], '전사 너머로 내리침');
  assert.equal(priest.charge, 1);
  enemyTurn(b);
  assert.equal(me.hp, me.maxHp - ENEMIES.priest.dmg[1], '기도를 모으는 턴');
  enemyTurn(b);
  assert.equal(me.hp, me.maxHp - ENEMIES.priest.dmg[1] * 2);
});

test('오크 사제: 바위 뒤에 숨으면 못 내리치고, 보이는 자리로 걸어 나온다', () => {
  const b = battle(['......', '@#...p', '......']);
  const me = heroUnit(b);
  const priest = nth(b, 0);
  assert.ok(!threatCells(b, priest).some((p) => p.x === 0 && p.y === 1), '내 칸은 사제 시야 밖');
  let turns = 0;
  while (!sees(b, priest.pos, me.pos) && turns < 5) {
    enemyTurn(b);
    turns++;
  }
  assert.ok(turns > 0 && turns < 5, '보이는 자리로 걸어 나왔다');
  assert.equal(me.hp, me.maxHp, '걷는 턴에는 못 내리친다');
  enemyTurn(b);
  assert.equal(me.hp, me.maxHp - ENEMIES.priest.dmg[1]);
});

test('연막 두루마리: 연기가 사제의 시야를 3턴 막고 사라진다, 쓰면 없어진다', () => {
  const b = battle(['@....p', '......', '......']);
  const me = heroUnit(b);
  assert.equal(b.hero.items.length, 1, '하나 들고 시작');
  assert.ok(!useItem(b, 0, 'read', { x: 5, y: 2 }), '사거리 밖');
  assert.ok(useItem(b, 0, 'read', { x: 2, y: 1 }));
  assert.equal(b.hero.items.length, 0);
  assert.equal(me.hp, me.maxHp, '연기 너머라 안 맞음');
  wait(b);
  wait(b);
  assert.equal(me.hp, me.maxHp, '세 턴 동안 가린다');
  assert.equal(cellAt(b, { x: 2, y: 1 }).smoke, 0, '걷혔다');
  wait(b);
  assert.equal(me.hp, me.maxHp - ENEMIES.priest.dmg[1], '연기가 걷히면 다시 맞는다');
});

test('피해 범위: 명중은 늘 하고, 굴림은 범위 안이며 같은 시드면 같다', () => {
  const rolls = (seed: number) => {
    const b = createBattle({ name: '시험', clearXp: 5, rows: ['@g', '..'] }, newHero('sword'), seed);
    const g = nth(b, 0);
    const out: number[] = [];
    for (let i = 0; i < 30; i++) {
      g.hp = g.maxHp = 99;
      perform(b, 'attack', g.pos);
      out.push(99 - g.hp);
    }
    return out;
  };
  const [lo, hi] = attackRange(newHero('sword'));
  const a = rolls(7);
  assert.ok(a.every((d) => d >= lo && d <= hi), '범위 안');
  assert.ok(new Set(a).size > 1, '흔들린다');
  assert.deepEqual(rolls(7), a, '같은 시드 = 같은 굴림');
});

test('굴림 방식: 최소 · 최대 · 최악 (미리보기 · 봇용)', () => {
  const at = (roll: Battle['roll']) => {
    const b = battle(['@g', '..']);
    b.roll = roll;
    const g = nth(b, 0);
    perform(b, 'attack', g.pos);
    return g.maxHp - g.hp;
  };
  const [lo, hi] = attackRange(newHero('sword'));
  assert.equal(at('min'), lo);
  assert.equal(at('max'), Math.min(hi, ENEMIES.goblin.hp));
  assert.equal(at('worst'), lo, '최악: 내 공격은 최소');
  const b = battle(['@g', '..']);
  b.roll = 'worst';
  wait(b);
  assert.equal(heroUnit(b).hp, heroUnit(b).maxHp - ENEMIES.goblin.dmg[1], '최악: 적 공격은 최대');
});

test('능력치의 무기와 상관없는 효과: 힘 = 체력, 민첩 = 최소 피해, 지능 = 재사용 대기', () => {
  assert.equal(newHero('hammer').maxHp, START_HP + 3 * STR_HP, '힘 4로 시작하는 망치는 체력도 많다');
  const run = startRun('sword');
  run.hero.points = 1;
  const hp = run.hero.maxHp;
  spendPoint(run, 'str');
  assert.equal(run.hero.maxHp, hp + STR_HP);

  const h = newHero('sword');
  const [lo, hi] = attackRange(h);
  h.stats.dex += 1; // 검은 민첩 무기라 공격도 +1
  assert.deepEqual(attackRange(h), [lo + 2, hi + 1]);
  h.stats.dex += 5;
  const [lo2, hi2] = attackRange(h);
  assert.equal(lo2, hi2, '최소는 최대를 넘지 않는다');

  const f = newHero('frostStaff');
  assert.equal(skillCd(f), WEAPONS.frostStaff.skill.cd - 1, '지능 2');
  f.stats.int = 99;
  assert.equal(skillCd(f), 2, '최소 2턴');
});

test('지능 2점마다 기술 위력 +1: 빙결이 길어지고 찌르고 밀기가 더 멀리 민다', () => {
  const f = battle(['@.g...', '......'], 'frostStaff');
  f.hero.stats.int = 4; // 1을 넘는 3점 → 위력 +1
  assert.equal(skillPower(f.hero), 1);
  assert.ok(act(f, 'skill', nth(f, 0).pos));
  assert.equal(nth(f, 0).frozen, 3 + 1 - 1, '빙결 3+1턴, 이번 턴 적 차례에서 1 줄었다');

  const s = battle(['@g.....', '.......'], 'spear');
  s.hero.stats.int = 3;
  const g = nth(s, 0);
  g.hp = g.maxHp = 30;
  assert.ok(perform(s, 'skill', g.pos));
  assert.equal(g.pos.x, 1 + 2 + 1, '두 칸 + 위력 한 칸');
});

test('보상: 깨면 서로 다른 3개, 일찍 나가면 없음, 고르기 전에는 다음 맵으로 못 간다', () => {
  const run = startRun('sword');
  for (const u of enemies(run.battle)) u.dead = true;
  run.battle.status = 'cleared';
  settle(run);
  const rw = run.rewards!;
  assert.equal(rw.length, REWARD_CHOICES);
  assert.equal(new Set(rw.map((r) => JSON.stringify(r))).size, REWARD_CHOICES, '겹치지 않는다');
  nextMap(run);
  assert.equal(run.phase, 'between', '보상을 안 골랐다');
  assert.ok(chooseReward(run, 0));
  nextMap(run);
  assert.equal(run.phase, 'battle');

  const left = startRun('sword');
  left.battle.status = 'left';
  settle(left);
  assert.equal(left.rewards, null, '일찍 나가면 보상 없음');

  for (let i = 0; i < 50; i++) {
    for (const r of rollRewards(newHero('sword'))) if (r.kind === 'weapon') assert.notEqual(r.weapon, 'sword', '든 무기는 안 나온다');
  }
});

test('보상 적용: 강화는 든 무기에 붙고, 새 무기는 예비 칸으로', () => {
  const run = startRun('sword');
  const before = attackPower(run.hero);
  run.phase = 'between';
  run.rewards = [{ kind: 'enchant' }, { kind: 'weapon', weapon: 'axe' }];
  assert.ok(chooseReward(run, 0));
  assert.equal(attackPower(run.hero), before + ENCHANT_ATK);
  assert.equal(attackPower(run.hero, 'hammer'), attackPower(newHero('sword'), 'hammer'), '다른 무기에는 안 붙는다');
  run.rewards = [{ kind: 'weapon', weapon: 'axe' }];
  assert.ok(chooseReward(run, 0));
  assert.equal(run.hero.spare, 'axe');
});

test('소모품: 치유 물약은 최대 체력의 40%를 회복한다', () => {
  const b = battle(['@....', '.....']);
  const me = heroUnit(b);
  b.hero.items = ['heal'];
  me.hp = 10;
  assert.ok(useItem(b, 0, 'drink', me.pos));
  assert.equal(me.hp, 10 + Math.ceil(me.maxHp * HEAL_FRAC));
  assert.equal(b.hero.items.length, 0, '쓰면 사라진다');
});

test('소모품: 화염 물약은 3×3에 고정 피해와 불', () => {
  const b = battle(['@.....', '......', '...g..', '......']);
  const g = nth(b, 0);
  g.hp = g.maxHp = 30;
  b.hero.items = ['fireBomb'];
  assert.ok(useItem(b, 0, 'throw', { x: 3, y: 1 }));
  assert.ok(g.hp <= 30 - FIRE_BOMB_DMG, '불길 + 불 칸');
  assert.ok(cellAt(b, { x: 3, y: 1 }).fire > 0);
});

test('소모품: 도약은 4칸 안 빈칸으로만, 밀쳐내기는 주변 적을 2칸', () => {
  const b = battle(['@....#', '......']);
  b.hero.items = ['blink'];
  b.hero.known.push('blink'); // 알아야 칸을 고른다
  assert.ok(!useItem(b, 0, 'read', { x: 5, y: 0 }), '바위는 안 된다');
  assert.ok(useItem(b, 0, 'read', { x: 4, y: 1 }));
  assert.deepEqual(heroUnit(b).pos, { x: 4, y: 1 });

  const r = battle(['......', '..@g..', '......']);
  r.hero.items = ['repel'];
  const g = nth(r, 0);
  g.hp = g.maxHp = 30;
  assert.ok(applyItem(r, 0, 'read', heroUnit(r).pos)); // 턴을 넘기지 않고 본다 (넘기면 고블린이 다시 걸어온다)
  assert.equal(g.pos.x, 5, '두 칸 밀려났다');
});

test('미확인: 모르는 두루마리는 칸을 못 고르고, 쓰면 그 종류 전부의 정체가 보인다', () => {
  const b = battle(['@.....', '......', '......']);
  const h = b.hero;
  h.items = ['blink', 'blink'];
  assert.ok(!h.known.includes('blink'));
  assert.deepEqual(itemTargets(b, 0, 'read'), [heroUnit(b).pos], '모르면 내 칸뿐');
  assert.ok(useItem(b, 0, 'read', heroUnit(b).pos));
  assert.notDeepEqual(heroUnit(b).pos, { x: 0, y: 0 }, '무작위 빈칸으로 도약');
  assert.ok(h.known.includes('blink'));
  assert.equal(itemName(h, h.items[0]!), '도약 두루마리', '남은 같은 종류도 정체가 보인다');
  assert.ok(itemTargets(b, 0, 'read').length > 1, '이제 칸을 고른다');
});

test('감정 두루마리: 고른 미확인 물건의 정체를 알고, 모르는 물약은 마셔도 던져도 된다', () => {
  const b = battle(['@.....', '......']);
  const h = b.hero;
  h.items = ['identify', 'heal', 'fireBomb'];
  h.known.push('identify');
  assert.deepEqual(identifiable(h, 0), [1, 2]);
  assert.ok(applyItem(b, 0, 'read', heroUnit(b).pos, 2)); // 화염 물약을 감정
  assert.ok(h.known.includes('fireBomb'));
  assert.ok(!h.known.includes('heal'), '고르지 않은 것은 그대로');
  assert.deepEqual(itemUses('heal'), ['drink', 'throw']);
  assert.ok(itemTargets(b, 0, 'throw').length > 1, '모르는 물약도 던질 칸은 고른다');
});

test('모르는 이름: 판마다 섞이고, 같은 판 안에서는 겹치지 않는다', () => {
  const names = rollItemNames();
  assert.equal(new Set(Object.values(names)).size, Object.keys(names).length);
  assert.ok(names.heal.endsWith('물약') && names.smoke.endsWith('두루마리'));
});
