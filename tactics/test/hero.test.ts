// 주인공: 무기 조건 · 피해 범위 · 굴림 · 능력치 · 기술
import test from 'node:test';
import assert from 'node:assert/strict';
import { heroUnit } from '../src/core/board';
import { act, createBattle, wait } from '../src/core/game';
import { attackPower, attackRange, perform, skillCd, skillPower } from '../src/core/hero';
import { newHero, spendPoint, startRun } from '../src/core/run';
import type { Battle } from '../src/core/types';
import { ENEMIES } from '../src/data/enemies';
import { START_HP, STR_HP } from '../src/data/rules';
import { WEAPONS } from '../src/data/weapons';
import { battle, nth } from './helpers';

test('무기 조건: 넘는 만큼 더하고 모자라면 크게 깎인다', () => {
  const h = newHero('sword');
  const base = attackPower(h, 'sword');
  h.stats.str += 2;
  assert.equal(attackPower(h, 'sword'), base + 2);
  assert.ok(attackPower(newHero('sword'), 'hammer') < attackPower(newHero('hammer'), 'hammer'), '힘 모자란 망치');
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

test('창: 붙은 적에게는 절반, 그 뒤의 적에게는 그대로', () => {
  const b = battle(['@gg...', '......'], 'spear');
  const [near, far] = [nth(b, 0), nth(b, 1)];
  near.hp = near.maxHp = 30;
  far.hp = far.maxHp = 30;
  assert.ok(perform(b, 'attack', near.pos));
  const hi = attackRange(b.hero)[1];
  assert.equal(near.hp, 30 - Math.floor(hi / 2), '붙은 적은 절반');
  assert.equal(far.hp, 30 - hi, '뒤의 적은 그대로');
});
