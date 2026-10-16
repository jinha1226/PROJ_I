// 판: 맵 형식 · 경험치 · 회복 · 보상
import test from 'node:test';
import assert from 'node:assert/strict';
import { enemies, heroUnit } from '../src/core/board';
import { act, leave, stepHero } from '../src/core/game';
import { attackPower } from '../src/core/hero';
import { chooseReward, rollRewards } from '../src/core/rewards';
import { newHero, nextMap, settle, startRun } from '../src/core/run';
import { ENEMIES } from '../src/data/enemies';
import { ACT1 } from '../src/data/maps';
import { ENCHANT_ATK, REWARD_CHOICES } from '../src/data/rewards';
import { josa } from '../src/core/josa';
import { battle } from './helpers';

test('수제 맵: 줄 길이가 같고 주인공이 하나', () => {
  for (const m of ACT1) {
    assert.ok(m.rows.every((r) => r.length === 10), m.name);
    assert.equal(m.rows.join('').split('@').length - 1, 1, m.name);
  }
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

test('조사: 숫자는 읽는 소리로 (레벨 2가 · 레벨 3이 · 1로)', () => {
  assert.equal(josa('레벨 2', '이/가'), '레벨 2가');
  assert.equal(josa('레벨 3', '이/가'), '레벨 3이');
  assert.equal(josa('1', '으로/로'), '1로');
  assert.equal(josa('고블린', '을/를'), '고블린을');
});
