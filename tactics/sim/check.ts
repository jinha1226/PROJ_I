// 맵 검사표 (tactics/DESIGN.md "맵은 포지션, 판은 소모품"): 맵마다 포지션 · 굴림 · 소모품의 영향을 따로 잰다
// npx tsx sim/check.ts [판 수] [--map 번호(1부터)]
// 칸: 승률 / 맵 동안 가장 크게 잃은 체력 비율 (낮을수록 쉬움)
import { createBattle } from '../src/core/game';
import { newHero } from '../src/core/run';
import type { HeroInfo, ItemId, RollMode, StatId, WeaponId } from '../src/core/types';
import { ITEMS } from '../src/data/items';
import { ACT1 } from '../src/data/maps';
import { HP_PER_LEVEL, STR_HP } from '../src/data/rules';
import { WEAPONS } from '../src/data/weapons';
import { DEFAULT_BOT, playBattle, type BotOpts } from './bot';

/** 맵마다 보통 도착하는 레벨 (smoke.ts 판 기록에서) */
const ARRIVE_LEVEL = [1, 2, 4, 5, 6];

interface Cond {
  name: string;
  depth: 1 | 2;
  roll: RollMode;
  items: boolean;
}
const CONDS: Cond[] = [
  { name: '잘 둠 · 평균', depth: 2, roll: 'avg', items: false },
  { name: '잘 둠 · 최악', depth: 2, roll: 'worst', items: false },
  { name: '대충 · 평균', depth: 1, roll: 'avg', items: false },
  { name: '잘 둠 · 소모품', depth: 2, roll: 'avg', items: true },
];

/** 그 레벨에 도착한 주인공: 체력 가득, 능력치는 무기의 첫 능력치에 */
function heroAt(w: WeaponId, level: number, items: boolean): HeroInfo {
  const h = newHero(w);
  const main = Object.keys(WEAPONS[w].req)[0] as StatId;
  h.level = level;
  h.stats[main] += level - 1;
  h.maxHp += (level - 1) * HP_PER_LEVEL + (main === 'str' ? (level - 1) * STR_HP : 0);
  h.hp = h.maxHp;
  // 소모품 조건: 6종 1개씩 / 아니면 빈 가방
  h.items = items ? (Object.keys(ITEMS) as ItemId[]) : [];
  return h;
}

const args = process.argv.slice(2);
const N = Number(args.find((a) => /^\d+$/.test(a)) ?? 2);
const only = args.includes('--map') ? Number(args[args.indexOf('--map') + 1]) - 1 : undefined;

for (const [mi, map] of ACT1.entries()) {
  if (only !== undefined && mi !== only) continue;
  const level = ARRIVE_LEVEL[mi] ?? ARRIVE_LEVEL[ARRIVE_LEVEL.length - 1]!;
  console.log(`\n${mi + 1}. ${map.name} (레벨 ${level}, 체력 가득)`);
  console.log(`${'무기'.padEnd(8)}${CONDS.map((c) => c.name.padEnd(14)).join('')}`);
  for (const w of Object.keys(WEAPONS) as WeaponId[]) {
    const cells: string[] = [];
    for (const c of CONDS) {
      const opts: BotOpts = { ...DEFAULT_BOT, depth: c.depth, items: c.items };
      let wins = 0;
      let lost = 0;
      for (let i = 0; i < N; i++) {
        const b = createBattle(map, heroAt(w, level, c.items), i + 1);
        b.roll = c.roll;
        const low = playBattle(b, opts);
        if (b.status === 'cleared') wins++;
        lost += 1 - low;
      }
      cells.push(`${Math.round((wins / N) * 100)}% / ${Math.round((lost / N) * 100)}%`.padEnd(14));
    }
    console.log(`${WEAPONS[w].name.padEnd(8)}${cells.join('')}`);
  }
}
