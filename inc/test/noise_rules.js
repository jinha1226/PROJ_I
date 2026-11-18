'use strict';
// 소리와 적의 상태 (설계 5-11): node test/noise_rules.js
const vm = require('vm'), LOAD = require('./_load.js');
let ok = 0, bad = 0; const t = (name, v, extra = '') => { if (v) ok++; else { bad++; console.log('  실패:', name, extra); } };
const ctx = { console, Math, JSON }; vm.createContext(ctx); ctx.G = {}; LOAD.load(ctx, ['js/game/noise']);
const N = ctx.G.Noise;

// 지도: 방 둘(왼쪽 x 1~8, 오른쪽 x 11~18)이 벽(x 9~10)으로 갈려 있고, 아래쪽 복도(y 12)로만 이어진다. 오른쪽 방 문은 (14, 9)
//   ####################
//   #........##........#   y 1~8
//   #........##........#
//   ##### ######## #####   y 9: 왼쪽 방 문 (5, 9) · 오른쪽 방 문 (14, 9)
//   (복도 y 10~12, x 5 · 14 세로, y 12 가로)
const W = 20, H = 14, c = new Array(W * H).fill('#'), set = (x, y) => { c[y * W + x] = '.'; };
for (let y = 1; y <= 8; y++) { for (let x = 1; x <= 8; x++) set(x, y); for (let x = 11; x <= 18; x++) set(x, y); }
for (let y = 9; y <= 12; y++) { set(5, y); set(14, y); } for (let x = 5; x <= 14; x++) set(x, 12);
let closed = new Set();
const grid = { w: W, h: H, pass: k => c[k] === '.' && !closed.has(k), door: k => closed.has(k) };

// 1) 거리: 벽을 뚫지 않고 복도를 따라 잰다, 닫힌 문은 +6
{
  const D = N.field(grid, 8, 4, 99);
  t('벽 너머(오른쪽 방 11, 4)는 바로 옆이 아니라 복도를 돌아 먼 거리', D[4 * W + 11] > 15, D[4 * W + 11]);
  closed = new Set([9 * W + 14]); const D2 = N.field(grid, 8, 4, 99); closed = new Set();
  t('닫힌 문을 지나면 6타일 더 멀다', Math.abs(D2[4 * W + 14] - D[4 * W + 14] - 6) < 0.01, [D[4 * W + 14], D2[4 * W + 14]]);
  t('거리장 밖(max)은 닿지 않는다', N.field(grid, 8, 4, 3)[4 * W + 14] === Infinity);
}
// 2) 상태 오르기 (설계 표)
t('잠듦 + 작은 소리(1~3) → 모름', N.hear('sleep', 2) === 'idle');
t('잠듦 + 큰 소리(4+) → 경계', N.hear('sleep', 4) === 'alert');
t('모름 + 소리 → 경계, 10+ → 쫓음', N.hear('idle', 1) === 'alert' && N.hear('idle', 10) === 'hunt');
t('경계 + 10+ → 쫓음, 그 아래는 그대로', N.hear('alert', 10) === 'hunt' && N.hear('alert', 5) === 'alert');
t('쫓음은 그대로', N.hear('hunt', 1) === 'hunt');
t('못 들으면(0 이하) 그대로', N.hear('sleep', 0) === 'sleep');
// 3) 소리 한 번: 가까운 쪽만 듣고, 멀어질수록 작게 들린다. 쫓는 쪽은 소리 난 곳을 기억한다
{
  const near = { x: 6, y: 4, aware: 'sleep' }, far = { x: 16, y: 4, aware: 'sleep' };
  const ev = N.emit(grid, { x: 4, y: 4 }, N.LV.pickFail, [near, far]); // 자물쇠 따기 실패 4: 8타일까지
  t('작은 소리(4): 가까운 잠든 적은 깬다', near.aware !== 'sleep', near.aware);
  t('작은 소리(4): 벽 너머 먼 적은 못 듣는다', far.aware === 'sleep', far.aware);
  t('사건: 파문 하나 + 상태 바뀜 하나', ev[0].k === 'noise' && ev[0].r === 8 && ev.filter(e => e.k === 'aware').length === 1, JSON.stringify(ev.map(e => e.k)));
  const a = { x: 6, y: 4, aware: 'idle' }, b = { x: 16, y: 4, aware: 'idle' };
  N.emit(grid, { x: 4, y: 4 }, N.LV.knock, [a, b]); // 노크 15: 30타일까지
  t('노크(15): 가까운 적은 쫓아온다 · 소리 난 곳을 기억', a.aware === 'hunt' && a.heard && a.heard.x === 4, JSON.stringify(a));
  t('노크(15): 복도를 돌아 옆 방 적도 듣는다', b.aware !== 'idle', b.aware);
  const z = { x: 6, y: 4, aware: 'sleep' }; N.emit(grid, { x: 4, y: 4 }, N.LV.push, [z]);
  t('살살 열기(1): 바로 옆 잠든 적도 거의 못 듣는다 (2타일 밖)', z.aware === 'sleep', z.aware);
  const q0 = N.heardAs(10, 0), q1 = N.heardAs(10, 10);
  t('들리는 크기는 거리 2타일마다 1씩 줄어든다', q0 === 10 && q1 === 5);
}
// 4) 기습: 잠듦 · 모름이면
t('기습: 잠듦 · 모름은 기습당한다, 경계 · 쫓음은 아니다', N.surprised({ aware: 'sleep' }) && N.surprised({ aware: 'idle' }) && !N.surprised({ aware: 'alert' }) && !N.surprised({ aware: 'hunt' }));
console.log(`noise_rules: 통과 ${ok} · 실패 ${bad}`);
process.exit(bad ? 1 : 0);
