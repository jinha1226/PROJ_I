// 시험 공용: 글자 맵으로 전투를 만든다. 피해는 늘 최대로 굴린다 (범위 자체는 hero.test.ts에서)
import { enemies } from '../src/core/board';
import { createBattle } from '../src/core/game';
import { newHero } from '../src/core/run';
import type { Battle, WeaponId } from '../src/core/types';

export const battle = (rows: string[], weapon: WeaponId = 'sword'): Battle => {
  const b = createBattle({ name: '시험', clearXp: 5, rows }, newHero(weapon), 1);
  b.roll = 'max';
  return b;
};
/** i번째 살아 있는 적 */
export const nth = (b: Battle, i: number) => enemies(b)[i]!;
