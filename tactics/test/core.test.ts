import test from 'node:test';
import assert from 'node:assert/strict';
import { applyElement, cellAt, enemies, heroUnit, push } from '../src/core/board';
import { enemyTurn } from '../src/core/enemy';
import { act, createBattle, endTurn, heroSteps, leave, stepHero, wait } from '../src/core/game';
import { attackPower, perform } from '../src/core/hero';
import { newHero, settle, startRun } from '../src/core/run';
import type { Battle, WeaponId } from '../src/core/types';
import { ENEMIES } from '../src/data/enemies';
import { ACT1 } from '../src/data/maps';
import { COLLIDE_DMG, LAVA_DMG, SHOCK_DMG } from '../src/data/rules';

const battle = (rows: string[], weapon: WeaponId = 'sword'): Battle =>
  createBattle({ name: '시험', clearXp: 5, rows }, newHero(weapon));
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
  assert.equal(me.hp, me.maxHp - ENEMIES.goblin.dmg, '붙어 있으면 바로 맞는다');
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
  assert.equal(gob.hp, gob.maxHp - ENEMIES.spearman.dmg, '사이의 고블린이 맞음');
});

test('폭탄벌레: 붙으면 도화선, 다음 턴 3×3으로 터진다 (주변 적도)', () => {
  const b = battle(['......', '.@b...', '..g...']);
  const me = heroUnit(b);
  const [beetle, gob] = [nth(b, 0), nth(b, 1)];
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
  assert.ok(perform(b, 'attack', { x: 2, y: 1 }));
  assert.equal(g.hp, g.maxHp - attackPower(b.hero));
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
