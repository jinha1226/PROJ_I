// 소모품: 효과 · 미확인 · 감정
import test from 'node:test';
import assert from 'node:assert/strict';
import { cellAt, heroUnit } from '../src/core/board';
import { useItem, wait } from '../src/core/game';
import { applyItem, identifiable, itemName, itemTargets, itemUses, rollItemNames } from '../src/core/items';
import { ENEMIES } from '../src/data/enemies';
import { FIRE_BOMB_DMG, HEAL_FRAC } from '../src/data/items';
import { battle, nth } from './helpers';

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
