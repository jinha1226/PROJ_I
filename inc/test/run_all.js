'use strict';
// 규칙 시험을 한 번에: node test/run_all.js [--quick]
// test/*_rules.js 를 차례로 돌려 파일마다 한 줄, 끝에 합계. 하나라도 실패하면 종료 코드 1.
// flow_rules.js 는 sim.js --check 가 불러 쓰는 모듈이라 따로 돌리지 않는다. _로 시작하는 파일(도우미)도 뺀다.
// --quick: 오래 걸리는 셋(gob · roll · explore)을 건너뛰고 run_rules 는 40판만.
// 난수를 고정하지 않는 옛 시험(예: explore_rules)은 가끔 실패한다 — 실패하면 한 번 더 돌려, 다시 통과하면 '흔들림'으로 적고 실패로 세지 않는다.
// 시간은 performance.now()로 잰다 (WSL에서 벽시계가 튄다).
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process'), { performance } = require('perf_hooks');
const DIR = __dirname, QUICK = process.argv.includes('--quick');
const SLOW = new Set(['gob_rules', 'roll_rules', 'explore_rules']);
const files = fs.readdirSync(DIR).filter(f => f.endsWith('_rules.js') && !f.startsWith('_') && f !== 'flow_rules.js').sort();
let bad = 0, ran = 0, flaky = 0;
const now = () => performance.now(), t0 = now();
function run(args) {
  const r = spawnSync(process.execPath, args, { cwd: path.join(DIR, '..'), encoding: 'utf8', maxBuffer: 64 << 20 });
  const out = (r.stdout || '') + (r.stderr || ''), last = out.trim().split('\n').pop() || '';
  return { out, last, fail: r.status !== 0 || /실패\s*[1-9]/.test(last) || /^\s*실패:/m.test(out) };
}
for (const f of files) {
  const n = f.slice(0, -3);
  if (QUICK && SLOW.has(n)) { console.log(`${n.padEnd(14)} 건너뜀`); continue; }
  const args = [path.join(DIR, f)]; if (QUICK && n === 'run_rules') args.push('40');
  const s = now(); let r = run(args), mark = '통과';
  if (r.fail) { const r2 = run(args); if (r2.fail) { mark = '실패'; bad++; } else { mark = '흔들림'; flaky++; console.log(`${n.padEnd(14)} 첫 판 실패: ${r.last.slice(0, 80)}`); r = r2; } }
  ran++;
  console.log(`${n.padEnd(14)} ${String(Math.round((now() - s) / 1000)).padStart(4)}s  ${mark}  ${r.last.slice(0, 90)}`);
  if (mark === '실패') console.log(r.out.split('\n').filter(l => /실패|Error|at /.test(l)).slice(0, 8).map(l => '    ' + l).join('\n'));
}
console.log(`run_all: ${ran}개 중 ${ran - bad} 통과 · ${bad} 실패${flaky ? ` · 흔들림 ${flaky}` : ''} (${Math.round((now() - t0) / 1000)}초)`);
process.exit(bad ? 1 : 0);
