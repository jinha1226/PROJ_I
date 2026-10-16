// 정답 찾기: 맵 하나를 가장 적게 다치고 깨는 수순 (tactics/DESIGN.md "맵 검사표")
// 굴림을 평균(또는 최악)으로 고정하면 적 행동까지 결정적이라 맵이 퍼즐이 된다.
// 빔 탐색: 매 턴 모든 수를 펼치고, 같은 상태는 합치고, 유망한 상태 beam개만 남긴다. 최선을 보장하지는 않으므로
// beam을 늘려도 결과가 더 좋아지지 않는지로 수렴을 본다.
// npx tsx sim/solve.ts --map 1 --w sword [--beam 200,1000] [--roll avg|worst] [--show 수순 재생]
// npx tsx sim/solve.ts --all --w sword --beam 300   (모든 맵: 봇 → 정답, 잃은 체력 최대)
import { enemies, heroUnit } from '../src/core/board';
import { createBattle } from '../src/core/game';
import type { Battle, RollMode, WeaponId } from '../src/core/types';
import { ACT1 } from '../src/data/maps';
import { WEAPONS } from '../src/data/weapons';
import { DEFAULT_BOT, evaluate, plans, play, playBattle, type Plan } from './bot';
import { arriveLevel, heroAt } from './start';

/** 이 턴 수를 넘기면 포기한다 */
const MAX_TURNS = 80;

interface Node {
  b: Battle;
  path: Plan[];
  /** 지금까지 가장 낮았던 체력 비율 (내려가기만 한다) */
  low: number;
}

export interface Solution {
  /** 맵 동안 가장 낮았던 체력 비율 (0~1). 깨지 못했으면 null */
  low: number | null;
  turns: number;
  path: Plan[];
  /** 펼친 상태 수 */
  expanded: number;
}

/** 같은 상태인지 가리는 열쇠: 유닛 · 칸의 변하는 것 · 재사용 대기 · 턴 홀짝 (느린 적이 짝수 턴에 움직인다) */
function stateKey(b: Battle): string {
  const u = b.units.filter((x) => !x.dead).map((x) =>
    [x.id, x.pos.x, x.pos.y, x.hp, x.frozen, x.stunned, x.stuck, x.charge, x.retreat, x.intent ? 1 : 0].join(','));
  const c = b.cells.map((x) => `${x.tile[0]}${x.tile[1]}${x.fire}${x.steam}${x.smoke}${x.revert ? x.revert.turns : ''}`).join('');
  return `${u.join(';')}|${c}|${JSON.stringify(b.hero.cooldown)}|${b.hero.weapon}|${b.turn % 2}`;
}

/** 체력 비율 (레벨업으로 최대 체력이 늘어도 그때의 최대로 나눈다) */
const ratio = (b: Battle) => Math.max(0, heroUnit(b).hp) / heroUnit(b).maxHp;

/** 가장 낮았던 체력이 가장 높은 수순 (같으면 짧은 것) */
export function solve(start: Battle, beam: number): Solution {
  let best: Solution = { low: null, turns: 0, path: [], expanded: 0 };
  let layer: Node[] = [{ b: start, path: [], low: ratio(start) }];
  const seen = new Set<string>([stateKey(start)]);
  let expanded = 0;
  for (let depth = 0; depth < MAX_TURNS && layer.length; depth++) {
    const next: { n: Node; s: number }[] = [];
    for (const node of layer) {
      for (const p of plans(node.b, false)) {
        const c = structuredClone(node.b);
        play(c, p);
        expanded++;
        if (c.status === 'dead' || c.status === 'left') continue;
        const path = [...node.path, p];
        const low = Math.min(node.low, ratio(c));
        // 가장 낮았던 체력은 내려가기만 하므로, 이미 찾은 해답보다 낮아진 갈래는 버린다
        if (best.low !== null && (low < best.low || (low === best.low && path.length >= best.turns))) continue;
        if (c.status === 'cleared') {
          best = { low, turns: path.length, path, expanded: 0 };
          continue;
        }
        const key = stateKey(c);
        if (seen.has(key)) continue;
        seen.add(key);
        next.push({ n: { b: c, path, low }, s: evaluate(c, DEFAULT_BOT.w, 'fight') });
      }
    }
    next.sort((x, y) => y.s - x.s);
    layer = next.slice(0, beam).map((x) => x.n);
  }
  best.expanded = expanded;
  return best;
}

/** 수순 한 줄 설명 */
export function planText(p: Plan): string {
  switch (p.t) {
    case 'wait':
      return '기다리기';
    case 'step':
      return `걷기 (${p.to.x},${p.to.y})`;
    case 'act':
      return `${p.kind === 'attack' ? '공격' : '기술'} (${p.cell.x},${p.cell.y})`;
    case 'item':
      return `소모품 ${p.how} (${p.cell.x},${p.cell.y})`;
    case 'swap':
      return '교체';
    case 'leave':
      return '나가기';
  }
}

function startBattle(mapIdx: number, w: WeaponId, roll: RollMode): Battle {
  const b = createBattle(ACT1[mapIdx]!, heroAt(w, arriveLevel(mapIdx)), 1);
  b.roll = roll;
  return b;
}

// ── 명령줄 ─────────────────────────────
if (process.argv[1]?.endsWith('solve.ts')) {
  const args = process.argv.slice(2);
  const arg = (k: string, d: string) => (args.includes(k) ? args[args.indexOf(k) + 1]! : d);
  const mapIdx = Number(arg('--map', '1')) - 1;
  const w = arg('--w', 'sword') as WeaponId;
  const roll = arg('--roll', 'avg') as RollMode;
  const beams = arg('--beam', '200,1000').split(',').map(Number);
  const pct = (lost: number) => `${Math.round(lost * 100)}%`;

  if (args.includes('--all')) {
    // 무기 하나로 모든 맵: 봇 대 정답 (잃은 체력 최대)
    const beam = beams[beams.length - 1]!;
    const cells: string[] = [];
    for (const [mi] of ACT1.entries()) {
      const bot = startBattle(mi, w, roll);
      const low = playBattle(bot, DEFAULT_BOT);
      const sol = solve(startBattle(mi, w, roll), beam);
      const b = bot.status === 'cleared' ? pct(1 - low) : '죽음';
      const o = sol.low === null ? '못 깸' : pct(1 - sol.low);
      cells.push(`${b}→${o}`);
    }
    console.log(`${WEAPONS[w].name.padEnd(6)} ${cells.join('  ')}`);
    process.exit(0);
  }
  console.log(`${mapIdx + 1}. ${ACT1[mapIdx]!.name} · ${WEAPONS[w].name} · 레벨 ${arriveLevel(mapIdx)} · 굴림 ${roll}`);
  const bot = startBattle(mapIdx, w, roll);
  const low = playBattle(bot, DEFAULT_BOT);
  console.log(`  봇(두 수 앞): ${bot.status === 'cleared' ? `잃은 체력 최대 ${pct(1 - low)} · ${bot.turn - 1}턴` : '못 깸'}`);
  let sol: Solution | undefined;
  for (const beam of beams) {
    const t0 = Date.now();
    sol = solve(startBattle(mapIdx, w, roll), beam);
    const res = sol.low === null ? '못 찾음' : `잃은 체력 최대 ${pct(1 - sol.low)} · ${sol.turns}턴`;
    console.log(`  정답 찾기 빔 ${beam}: ${res} · 상태 ${sol.expanded}개 · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
  }
  if (args.includes('--show') && sol && sol.low !== null) {
    const b = startBattle(mapIdx, w, roll);
    for (const p of sol.path) {
      const from = b.log.length;
      play(b, p);
      const said = b.log.slice(from).map((l) => l.text).join(' / ');
      console.log(`  ${String(b.turn - 1).padStart(2)}. ${planText(p).padEnd(14)} 체력 ${heroUnit(b).hp} · 적 ${enemies(b).length} | ${said}`);
    }
  }
}
