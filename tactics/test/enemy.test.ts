// 적: 정통 턴제 행동 · 속도 · 공격 모양 · 사제 · 궁수
import test from 'node:test';
import assert from 'node:assert/strict';
import { chebyshev, heroUnit } from '../src/core/board';
import { enemyTurn, threatCells } from '../src/core/enemy';
import { stepHero, wait } from '../src/core/game';
import { sees } from '../src/core/sight';
import { ENEMIES } from '../src/data/enemies';
import { battle, nth } from './helpers';

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

test('궁수는 붙으면 물러서지만 연달아 물러서지 못하고, 그때는 붙은 채로 쏜다', () => {
  const b = battle(['......', '.@a...', '......']);
  const me = heroUnit(b);
  const archer = nth(b, 0);
  wait(b);
  assert.equal(me.hp, me.maxHp, '첫 턴은 물러선다');
  assert.ok(chebyshev(archer.pos, me.pos) > 1);
  me.pos = { x: archer.pos.x - 1, y: archer.pos.y }; // 다시 붙었다
  wait(b);
  assert.equal(me.hp, me.maxHp - ENEMIES.archer.dmg[1], '못 물러서고 붙은 채로 쐈다');
});
