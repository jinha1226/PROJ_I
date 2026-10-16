// 보상 3택1: 후보 뽑기 · 설명 · 고르기 (tactics/DESIGN.md 5절). 표는 data/rewards.ts
import { ITEMS, ITEM_SLOTS } from '../data/items';
import {
  ENCHANT_ATK, ITEM_WEIGHTS, REWARD_CHOICES, REWARD_WEIGHTS, VIGOR_HP, type Reward,
} from '../data/rewards';
import { STAT_NAME, WEAPONS } from '../data/weapons';
import { applyStat } from './hero';
import { itemName } from './items';
import { josa } from './josa';
import type { Run } from './run';
import type { HeroInfo, ItemId, StatId, WeaponId } from './types';

function pick<T extends string>(weights: Record<T, number>, rand: () => number): T {
  const entries = Object.entries(weights) as [T, number][];
  let r = rand() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of entries) if ((r -= w) < 0) return k;
  return entries[entries.length - 1]![0];
}

/** 같은 보상이 두 번 나오지 않게 비교하는 열쇠 */
const rewardKey = (r: Reward) => JSON.stringify(r);

/** 후보 3개. 종류를 가중치로 뽑고 내용을 고른다 (지금 든 무기 · 예비와 같은 무기는 나오지 않는다) */
export function rollRewards(h: HeroInfo, rand: () => number = Math.random): Reward[] {
  const out: Reward[] = [];
  for (let guard = 0; out.length < REWARD_CHOICES && guard < 100; guard++) {
    let r: Reward;
    switch (pick(REWARD_WEIGHTS, rand)) {
      case 'weapon': {
        const pool = (Object.keys(WEAPONS) as WeaponId[]).filter((w) => w !== h.weapon && w !== h.spare);
        r = { kind: 'weapon', weapon: pool[Math.floor(rand() * pool.length)]! };
        break;
      }
      case 'enchant':
        r = { kind: 'enchant' };
        break;
      case 'stat': {
        const stats: StatId[] = ['str', 'dex', 'int'];
        r = { kind: 'stat', stat: stats[Math.floor(rand() * stats.length)]! };
        break;
      }
      case 'vigor':
        r = { kind: 'vigor' };
        break;
      case 'item':
        r = { kind: 'item', item: pick(ITEM_WEIGHTS, rand) };
        break;
    }
    if (!out.some((o) => rewardKey(o) === rewardKey(r))) out.push(r);
  }
  return out;
}

/** 보상 한 줄 설명 (화면 · 기록) */
export function describeReward(h: HeroInfo, r: Reward): { title: string; detail: string } {
  switch (r.kind) {
    case 'weapon':
      return {
        title: `${WEAPONS[r.weapon].name}`,
        detail: `${WEAPONS[r.weapon].desc}. 예비 칸으로${h.spare ? ` (${josa(WEAPONS[h.spare].name, '과/와')} 바꾼다)` : ''}`,
      };
    case 'enchant':
      return { title: `${WEAPONS[h.weapon].name} 강화`, detail: `지금 든 무기 공격 +${ENCHANT_ATK}` };
    case 'stat':
      return { title: `${STAT_NAME[r.stat]} +1`, detail: '능력치 하나 더' };
    case 'vigor':
      return { title: '단련', detail: `최대 체력 +${VIGOR_HP}` };
    case 'item': {
      const full = h.items.length >= ITEM_SLOTS ? ' (가방이 가득 찼다)' : '';
      if (!h.known.includes(r.item)) return { title: itemName(h, r.item), detail: `정체를 모른다. 써 보면 안다${full}` };
      return { title: ITEMS[r.item].name, detail: `${ITEMS[r.item].desc}${full}` };
    }
  }
}

/** 보상을 고른다. 고를 수 없으면 false (가방이 가득 찬 소모품) */
export function chooseReward(run: Run, idx: number): boolean {
  const r = run.rewards?.[idx];
  const h = run.hero;
  if (!r) return false;
  if (r.kind === 'item' && h.items.length >= ITEM_SLOTS) return false;
  switch (r.kind) {
    case 'weapon':
      h.spare = r.weapon;
      break;
    case 'enchant':
      h.enchant[h.weapon] = (h.enchant[h.weapon] ?? 0) + ENCHANT_ATK;
      break;
    case 'stat':
      applyStat(h, r.stat);
      break;
    case 'vigor':
      h.maxHp += VIGOR_HP;
      h.hp += VIGOR_HP;
      break;
    case 'item':
      h.items.push(r.item as ItemId);
      break;
  }
  run.summary.push(`보상: ${describeReward(h, r).title}`);
  run.rewards = null;
  return true;
}

/** 보상을 고르지 않고 넘긴다 */
export function skipReward(run: Run): void {
  run.rewards = null;
}
