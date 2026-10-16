// 맵 검사 · 정답 찾기가 같이 쓰는 시작 상태: 그 맵에 보통 도착하는 레벨의 주인공
import { newHero } from '../src/core/run';
import type { HeroInfo, ItemId, StatId, WeaponId } from '../src/core/types';
import { ITEMS } from '../src/data/items';
import { HP_PER_LEVEL, STR_HP } from '../src/data/rules';
import { WEAPONS } from '../src/data/weapons';

/** 맵마다 보통 도착하는 레벨 (smoke.ts 난이도 곡선의 도착 레벨) */
export const ARRIVE_LEVEL = [1, 2, 3, 4, 5];

/** 그 레벨에 도착한 주인공: 체력 가득, 능력치는 무기의 첫 능력치에. items면 싸움에 쓰는 소모품 1개씩 (정체를 안다) */
export function heroAt(w: WeaponId, level: number, items = false): HeroInfo {
  const h = newHero(w);
  const main = Object.keys(WEAPONS[w].req)[0] as StatId;
  h.level = level;
  h.stats[main] += level - 1;
  h.maxHp += (level - 1) * HP_PER_LEVEL + (main === 'str' ? (level - 1) * STR_HP : 0);
  h.hp = h.maxHp;
  h.items = items ? (Object.keys(ITEMS) as ItemId[]).filter((id) => id !== 'identify') : [];
  h.known = [...h.items];
  return h;
}

export const arriveLevel = (mapIdx: number) => ARRIVE_LEVEL[mapIdx] ?? ARRIVE_LEVEL[ARRIVE_LEVEL.length - 1]!;
