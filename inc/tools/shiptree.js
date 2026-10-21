// SF 트리를 우주선 그림에 맞춰 손으로 배치한다 (좌표와 선행 노드를 함께 정한다). node tools/shiptree.js write
//  선체 가운데 = 공용(병기 개량 → 포대 증설 I·II·III), 마디마다 좌우로 포탑 한 쌍: 포탑(안쪽) → 특수·기술 1(바깥 날) → 짝
//  (레이저·증폭기 → 레일건·냉각 → 박격포·수리 드론 → 테슬라·미사일), 뱃머리 = 자동 장전 → 오버클럭
//  날개: 왼쪽 크레딧 · 오른쪽 코어 / 엔진(아래): 궤도 폭격
const fs = require('fs');
const SRC = __dirname + '/../js/trees.js';
const L = {};
const put = (id, x, y, req) => { L[id] = [+x.toFixed(2), +y.toFixed(2), req]; };
const EDGE = 2.3, IN = 1.2, ST = 1.2, RUNG = 2 * ST + 1.5 + 0.35;
const ys = [-1.9, -1.9 - RUNG, -1.9 - 2 * RUNG, -1.9 - 3 * RUNG];
put('dmg1', 0, ys[0], 'root'); put('pads1', 0, ys[1], 'dmg1'); put('pads2', 0, ys[2], 'pads1'); put('pads3', 0, ys[3], 'pads2');
function rung(s, y0, side, ally, chain, pair) {
  put(ally, side * IN, y0 - 0.7, s);
  let prev = ally, y = y0 - 1.5;
  for (const c of chain) { put(c, side * EDGE, y, prev); prev = c; y -= ST; }
  put(pair[0], side * EDGE, y, prev); put(pair[1], side * IN, y, prev);
  return y;
}
rung('dmg1', ys[0], -1, 'laser', ['l_heat', 'l_over'], ['l_split', 'l_focus']);
rung('dmg1', ys[0], 1, 'amp', ['am_res', 'am_surge'], ['am_cash', 'am_wide']);
rung('pads1', ys[1], -1, 'rail', ['r_charge', 'r_snipe'], ['r_orbit', 'r_rapid']);
rung('pads1', ys[1], 1, 'cryo', ['c_freeze', 'c_burst'], ['c_brittle', 'c_zone']);
rung('pads2', ys[2], -1, 'mortar', ['m_fire', 'm_salvo'], ['m_big', 'm_cluster']);
rung('pads2', ys[2], 1, 'drone', ['d_shield', 'd_nano'], ['d_combat', 'd_rebuild']);
rung('pads3', ys[3], -1, 'tesla', ['t_shock', 't_burst'], ['t_emp', 't_more']);
const top = rung('pads3', ys[3], 1, 'missile', ['mi_exec', 'mi_volley'], ['mi_bounty', 'mi_split']);
// 뱃머리
put('rate', 0, (ys[3] + top) / 2, 'pads3');
put('over', 0, top - 0.6, 'rate');
// 날개: 뒤로 젖힌 세 줄 (가운데 줄기 + 앞·뒤 줄), 엔진: 아래로 불꽃처럼
function wing(side, center, upper, lower) {
  const ax = side * 1.4, ay = 0.4, l = Math.hypot(1, 0.5), dx = side / l, dy = 0.5 / l, nx = side * dy, ny = -side * dx;
  const P = k => [ax + dx * 1.15 * k, ay + dy * 1.15 * k];
  center.forEach((id, k) => { const [x, y] = P(k); put(id, x, y, k ? center[k - 1] : 'root'); });
  upper.forEach((id, k) => { const [x, y] = P(k + 1); put(id, x + nx, y + ny, k ? upper[k - 1] : center[0]); });
  lower.forEach((id, k) => { const [x, y] = P(k + 1); put(id, x - nx, y - ny, k ? lower[k - 1] : center[0]); });
}
wing(-1, ['salv1', 'salv2', 'esss', 'salv3', 'esss2'], ['clear1', 'cheap', 'bossC', 'interest', 'refund'], ['waveEss', 'skip', 'bossSign', 'ess3']);
wing(1, ['core1', 'core2', 'core3', 'core4', 'thorns'], ['regen', 'regen2', 'coreArmor', 'overshield'], ['fallback', 'emerg', 'repair', 'lastStand']);
put('strike1', 0, 1.6, 'root');
put('strikeCd', -0.65, 2.7, 'strike1'); put('strikeR', 0.65, 2.7, 'strike1');
put('strikeCh', 0, 3.8, 'strikeCd strikeR');
put('strikeAuto', -0.65, 4.9, 'strikeCh'); put('strikeStun', 0.65, 4.9, 'strikeCh');
put('strikeBoss', 0, 6.0, 'strikeAuto strikeStun');

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
