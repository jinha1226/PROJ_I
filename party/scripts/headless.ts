// 렌더링 없이 전투 시뮬레이션을 돌려 규칙과 밸런스를 점검한다.
// 사용: npm run sim -- [seed] [runs]
import { MAP1 } from '../src/data/maps';
import { World } from '../src/sim/world';

const ROUTE: [number, number][] = [[12, 4], [20, 5], [20, 18], [31, 5], [40, 6], [40, 13], [38, 21]];

function run(seed: number, verbose: boolean) {
  const w = new World(MAP1, seed);
  const dt = 1 / 60;
  let step = 0;
  let wasCombat = false;
  while (!w.outcome && w.time < 900) {
    // 자동 진행용: 전투가 시작되면 이동 명령을 취소하고 AI 에 맡긴다
    if (w.inCombat && !wasCombat) for (const p of w.party) if (p.command?.intent.type === 'move') { p.command = null; p.holdPos = null; }
    wasCombat = w.inCombat;
    if (!w.inCombat && w.party.every((p) => !p.command)) {
      const L = w.leader!;
      const [x, y] = ROUTE[Math.min(step, ROUTE.length - 1)];
      if (Math.hypot(L.x - x - 0.5, L.y - y - 0.5) < 1.5) step++;
      else w.commandMove(w.party.filter((p) => p.alive), x + 0.5, y + 0.5);
    }
    w.tick(dt);
  }
  if (verbose) for (const l of w.logs) console.log(`[${l.time.toFixed(1).padStart(6)}] ${l.text}`);
  const alive = w.party.filter((p) => p.alive).map((p) => `${p.name}(${Math.round(p.hp)})`).join(' ');
  return { outcome: w.outcome ?? 'timeout', time: w.time.toFixed(0), alive, enemies: w.units.filter((u) => u.faction === 'enemy' && u.alive).length };
}

const seed = Number(process.argv[2] ?? 1);
const runs = Number(process.argv[3] ?? 1);
if (runs === 1) console.log(run(seed, true));
else {
  const res: Record<string, number> = {};
  for (let i = 0; i < runs; i++) {
    const r = run(seed + i, false);
    res[r.outcome] = (res[r.outcome] ?? 0) + 1;
    console.log(seed + i, r);
  }
  console.log(res);
}
