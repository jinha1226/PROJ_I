import {describe, expect, it} from 'vitest';
import {BossRaid} from '../src/raidboss/sim';

const DT = 1 / 30;

function fight(seed: number, aiSkill: number): BossRaid {
  const raid = new BossRaid({seed, playerRole: null, aiSkill});
  for (let t = 0; t < 400 && !raid.ended; t += DT) {
    raid.update(DT, null);
    raid.drainEvents();
  }
  return raid;
}

describe('boss raid', () => {
  it('a skilled AI party usually beats the boss', () => {
    const wins = [1, 2, 3, 4, 5, 6].filter(seed => fight(seed, 1).ended === 'win').length;
    expect(wins).toBeGreaterThanOrEqual(4);
  });

  it('skill matters: clumsy companions do worse than skilled ones', () => {
    const score = (skill: number): number => [1, 2, 3, 4, 5, 6].reduce((s, seed) => {
      const r = fight(seed, skill);
      return s + (r.ended === 'win' ? 1 : 0) + (1 - r.boss.hp / r.boss.maxHp) * 0.5;
    }, 0);
    expect(score(1)).toBeGreaterThan(score(0.1));
  });

  it('the tank holds the boss most of the time', () => {
    const raid = new BossRaid({seed: 3, playerRole: null, aiSkill: 1});
    let onTank = 0;
    let samples = 0;
    for (let t = 0; t < 60 && !raid.ended; t += DT) {
      raid.update(DT, null);
      raid.drainEvents();
      if (t > 5) {
        samples++;
        if (raid.unit(raid.boss.target)?.kind === 'tank') onTank++;
      }
    }
    expect(onTank / samples).toBeGreaterThan(0.8);
  });
});
