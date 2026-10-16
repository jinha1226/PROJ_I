// 봇으로 1막을 무기별로 돌려 본다: 끝까지 도는지, 얼마나 어려운지, 맵마다 몇 턴 걸리는지
// npx tsx sim/smoke.ts [판 수] [--d1 한 수 앞만] [--items 소모품도 씀] [--w 무기] [--stat str|dex|int (기본: 무기의 첫 능력치)]
// 기본은 소모품 없이 (지형만으로 깨지는지, DESIGN.md "스테이지")
// 최저 체력: 판 동안 가장 낮았던 체력 비율 (끝 체력은 레벨업 회복 때문에 늘 가득이라 난이도를 못 보여준다)
// 나감: 체력이 낮거나 오래 교착이면 봇이 계단으로 나간다 → 그 맵에 무기별 답이 없다는 신호
import { nextMap, settle, spendPoint, startRun } from '../src/core/run';
import type { StatId, WeaponId } from '../src/core/types';
import { WEAPONS } from '../src/data/weapons';
import { DEFAULT_BOT, playBattle, type BotOpts } from './bot';

const args = process.argv.slice(2);
const N = Number(args.find((a) => /^\d+$/.test(a)) ?? 3);
const flag = (f: string) => args.includes(f);
const only = args[args.indexOf('--w') + 1] as WeaponId | undefined;
const statArg = flag('--stat') ? (args[args.indexOf('--stat') + 1] as StatId) : undefined;
const opts: BotOpts = { ...DEFAULT_BOT, depth: flag('--d1') ? 1 : 2, items: flag('--items') };

const t0 = Date.now();
for (const w of (flag('--w') && only ? [only] : Object.keys(WEAPONS)) as WeaponId[]) {
  let wins = 0;
  const reached: number[] = [];
  const turns: string[] = [];
  const lows: number[] = [];
  /** 맵마다 일찍 나간 횟수 */
  const left: number[] = [];
  for (let i = 0; i < N; i++) {
    const run = startRun(w);
    const t: number[] = [];
    let low = 1;
    while (run.phase === 'battle') {
      low = Math.min(low, playBattle(run.battle, opts));
      settle(run);
      t.push(run.battle.turn);
      if (run.battle.status === 'left') left[t.length - 1] = (left[t.length - 1] ?? 0) + 1;
      while (run.hero.points > 0) spendPoint(run, statArg ?? (Object.keys(WEAPONS[w].req)[0] as StatId));
      if ((run.phase as string) === 'between') nextMap(run); // settle이 phase를 바꾼다
    }
    if ((run.phase as string) === 'victory') {
      wins++;
    }
    lows.push(Math.round(low * 100));
    reached.push(run.mapIdx + 1);
    turns.push(t.join('-'));
  }
  console.log(`${WEAPONS[w].name.padEnd(6)} 승 ${wins}/${N}  도달한 맵 ${reached.join(',')}  최저 체력 ${lows.join(',')}%${left.length ? `  나감 ${left.map((n, i) => (n ? `${i + 1}번 맵 ${n}` : '')).filter(Boolean).join(', ')}` : ''}  맵별 턴 ${turns.join(' | ')}`);
}
console.log(`(${opts.depth}수 앞${opts.items ? ', 소모품 씀' : ''}${statArg ? `, 능력치는 늘 ${statArg}` : ''} · ${((Date.now() - t0) / 1000).toFixed(1)}초)`);
