// 보드: 밀치기 · 미끄러짐 · 원소 반응 · 시야 · 물
import test from 'node:test';
import assert from 'node:assert/strict';
import { cellAt, push } from '../src/core/board';
import { applyElement } from '../src/core/elements';
import { endTurn, heroSteps, stepHero, wait } from '../src/core/game';
import { sees } from '../src/core/sight';
import { COLLIDE_DMG, LAVA_DMG, SHOCK_DMG } from '../src/data/rules';
import { battle, nth } from './helpers';

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

test('깊은 물에 들어가면 다음 턴은 걷지 못한다', () => {
  const b = battle(['@w...', '.....']);
  assert.ok(stepHero(b, { x: 1, y: 0 }));
  assert.equal(heroSteps(b).length, 0);
  wait(b);
  assert.ok(heroSteps(b).length > 0);
});

test('시야: 바위가 끊고, 유닛은 막지 않으며, 양쪽이 같다', () => {
  const b = battle(['@.g.p', '.....', '..#..', '.....', '....p']);
  assert.ok(sees(b, { x: 0, y: 0 }, { x: 4, y: 0 }), '사이의 고블린은 시야를 막지 않는다');
  assert.ok(!sees(b, { x: 0, y: 0 }, { x: 4, y: 4 }), '가운데 바위');
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) assert.equal(sees(b, { x: 0, y: 0 }, { x, y }), sees(b, { x, y }, { x: 0, y: 0 }));
  }
});
