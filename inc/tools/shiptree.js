// SF 트리를 인공위성 그림에 맞춰 손으로 배치한다 (좌표와 선행 노드를 함께 정한다). node tools/shiptree.js write
//  가운데 몸체(세로): 사령부 → 병기 개량 → 포대 증설 I·II·III → 자동 장전 → 오버클럭
//  태양광 패널 네 장(가로줄 격자): 위 왼쪽 경제 · 위 오른쪽 방어 (사령부에서 바로) / 아래 두 장 포탑 8종 — 한 줄에 포탑 하나
//    (건설 → 특수 → 기술 1 → 짝 위·아래), 줄마다 몸체의 마디(병기 개량·포대 증설)에서 열린다
//  꼭대기 안테나 접시: 지휘 · 궤도 폭격
const fs = require('fs');
const SRC = __dirname + '/../js/trees.js';
const L = {};
const put = (id, x, y, req) => { L[id] = [+x.toFixed(2), +y.toFixed(2), req]; };
const X0 = 1.6, DX = 1.1;
// 몸체
const ROW = [1.6, 3.5, 5.4, 7.3];
put('dmg1', 0, ROW[0], 'root'); put('pads1', 0, ROW[1], 'dmg1'); put('pads2', 0, ROW[2], 'pads1'); put('pads3', 0, ROW[3], 'pads2');
put('rate', 0, 8.7, 'pads3'); put('over', 0, 9.9, 'rate');
// 아래 패널: 포탑 한 줄
function turret(side, y, spine, ids) {
  const [u, sp, sk, a, b] = ids, X = c => side * (X0 + DX * c);
  put(u, X(0), y, spine); put(sp, X(1), y, u); put(sk, X(2), y, sp);
  put(a, X(3), y - 0.48, sk); put(b, X(3), y + 0.48, sk);
}
const SP = ['dmg1', 'pads1', 'pads2', 'pads3'];
[['laser', 'l_heat', 'l_over', 'l_split', 'l_focus'], ['rail', 'r_charge', 'r_snipe', 'r_rapid', 'r_orbit'], ['mortar', 'm_fire', 'm_salvo', 'm_cluster', 'm_big'], ['tesla', 't_shock', 't_burst', 't_more', 't_emp']]
  .forEach((ids, r) => turret(-1, ROW[r], SP[r], ids));
[['amp', 'am_res', 'am_surge', 'am_wide', 'am_cash'], ['cryo', 'c_freeze', 'c_burst', 'c_zone', 'c_brittle'], ['drone', 'd_shield', 'd_nano', 'd_rebuild', 'd_combat'], ['missile', 'mi_exec', 'mi_volley', 'mi_split', 'mi_bounty']]
  .forEach((ids, r) => turret(1, ROW[r], SP[r], ids));
// 위 패널: 사령부에서 바로 열리는 가로줄
const UROW = [-1.6, -3.1, -4.6];
function row(side, y, ids) { ids.forEach((id, c) => put(id, side * (X0 + DX * c), y, c ? ids[c - 1] : 'root')); }
row(-1, UROW[0], ['salv1', 'salv2', 'esss', 'salv3', 'esss2']);
row(-1, UROW[1], ['clear1', 'cheap', 'bossC', 'interest', 'refund']);
row(-1, UROW[2], ['waveEss', 'skip', 'bossSign', 'ess3']);
row(1, UROW[0], ['core1', 'core2', 'core3', 'core4', 'thorns']);
row(1, UROW[1], ['regen', 'regen2', 'coreArmor', 'overshield']);
row(1, UROW[2], ['fallback', 'emerg', 'repair', 'lastStand']);
// 안테나 접시: 사령부에서 곧장 위로 올라간 기둥 끝에 오목한 접시
put('strike1', 0, -6.0, 'root');
put('strikeCd', -0.7, -7.0, 'strike1'); put('strikeR', 0.7, -7.0, 'strike1');
put('strikeCh', 0, -8.0, 'strikeCd strikeR');
put('strikeAuto', -1.5, -8.6, 'strikeCh'); put('strikeStun', 1.5, -8.6, 'strikeCh');
put('strikeBoss', 0, -9.3, 'strikeCh');

// ── 검사·쓰기
let s = fs.readFileSync(SRC, 'utf8');
const a0 = s.indexOf("G.Tree.define('scifi'"), b0 = s.indexOf("G.Tree.define('cthulhu'");
let seg = s.slice(a0, b0);
const ids = [...seg.matchAll(/(?:N|PAIR|NOTE)\('(\w+)'/g)].map(m => m[1]).filter(id => id !== 'root');
const miss = ids.filter(id => !L[id]), extra = Object.keys(L).filter(id => !ids.includes(id));
console.log('노드', ids.length, '배치', Object.keys(L).length, '빠짐', miss, '없는 id', extra);
// 겹침·엇갈림 검사
const P = { root: [0, 0], ...Object.fromEntries(Object.entries(L).map(([k, v]) => [k, v.slice(0, 2)])) };
const E = []; for (const [k, v] of Object.entries(L)) for (const r of v[2].split(' ')) E.push([r, k]);
const o = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
let X = 0, O = 0, C = 0;
for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
  const [p, q] = E[i].map(k => P[k]), [r, t] = E[j].map(k => P[k]);
  if (E[i].some(k => E[j].includes(k))) continue;
  if (o(p, q, r) * o(p, q, t) < 0 && o(r, t, p) * o(r, t, q) < 0) { X++; console.log('엇갈림', E[i], E[j]); }
}
const ptSeg = (p, a, b) => { const vx = b[0] - a[0], vy = b[1] - a[1], l = vx * vx + vy * vy, u = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l)); return Math.hypot(a[0] + u * vx - p[0], a[1] + u * vy - p[1]); };
for (const [a, b] of E) for (const k in P) if (k !== a && k !== b && ptSeg(P[k], P[a], P[b]) < 0.45) { O++; console.log('관통', k, a, '→', b, ptSeg(P[k], P[a], P[b]).toFixed(2)); }
const ks = Object.keys(P); for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) if (Math.hypot(P[ks[i]][0] - P[ks[j]][0], P[ks[i]][1] - P[ks[j]][1]) < 0.9) { C++; console.log('붙음', ks[i], ks[j]); }
console.log('엇갈림', X, '관통', O, '붙음', C);
if (process.argv[2] === 'write' && !miss.length && !extra.length) {
  for (const [id, [x, y, req]] of Object.entries(L)) {
    const re = new RegExp(`((?:N|PAIR|NOTE)\\('${id}', )-?[\\d.]+, -?[\\d.]+, '[^']*',`);
    seg = seg.replace(re, `$1${x}, ${y}, '${req}',`);
  }
  fs.writeFileSync(SRC, s.slice(0, a0) + seg + s.slice(b0));
  console.log('썼다');
}
