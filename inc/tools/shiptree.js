// SF 트리를 궤도 정거장(바퀴) 그림에 맞춰 손으로 배치한다 (좌표와 선행 노드를 함께 정한다). node tools/shiptree.js write
//  가운데 사령부에서 바퀴살 16개, 끝이 바깥 고리를 이룬다.
//  큰 바퀴살 8개(위·아래·좌우·대각선) = 포탑 8종 (건설 → 특수 → 기술 1 → 짝)
//  그 사이 가는 바퀴살 8개 = 지휘(궤도 폭격) · 방어 셋(오른쪽) · 공용(아래) · 경제 셋(왼쪽)
const fs = require('fs');
const SRC = __dirname + '/../js/trees.js';
const L = {};
const put = (id, x, y, req) => { L[id] = [+x.toFixed(2), +y.toFixed(2), req]; };
const R0 = 2.8, RT = 6.6;                              // 첫 노드 반지름, 바퀴살 끝(바깥 고리) 반지름
const at = (deg, r, t = 0) => { const a = deg * Math.PI / 180; return [Math.cos(a) * r - Math.sin(a) * t, Math.sin(a) * r + Math.cos(a) * t]; };
// 바퀴살 하나: 단계마다 노드 하나 또는 갈래 둘(옆으로 ±0.55). 끝 단계가 늘 바깥 고리에 닿게 간격을 나눈다
function spoke(deg, levels) {
  const step = (RT - R0) / (levels.length - 1);
  let prev = ['root'];
  levels.forEach((lv, k) => {
    const ids = [].concat(lv), r = R0 + step * k;
    ids.forEach((id, j) => put(id, ...at(deg, r, ids.length > 1 ? (j ? 0.55 : -0.55) : 0), prev.join(' ')));
    prev = ids;
  });
}
// 큰 바퀴살 = 포탑 (각도: 0 = 오른쪽, 90 = 아래)
const T = (u, sp, sk, a, b) => [u, sp, sk, [a, b]];
spoke(-90, T('laser', 'l_heat', 'l_over', 'l_split', 'l_focus'));
spoke(-45, T('amp', 'am_res', 'am_surge', 'am_wide', 'am_cash'));
spoke(0, T('rail', 'r_charge', 'r_snipe', 'r_rapid', 'r_orbit'));
spoke(45, T('cryo', 'c_freeze', 'c_burst', 'c_zone', 'c_brittle'));
spoke(90, T('mortar', 'm_fire', 'm_salvo', 'm_cluster', 'm_big'));
spoke(135, T('drone', 'd_shield', 'd_nano', 'd_rebuild', 'd_combat'));
spoke(180, T('tesla', 't_shock', 't_burst', 't_more', 't_emp'));
spoke(225, T('missile', 'mi_exec', 'mi_volley', 'mi_split', 'mi_bounty'));
// 가는 바퀴살 = 지휘 · 방어 셋 · 공용 · 경제 셋
spoke(-67.5, ['strike1', ['strikeCd', 'strikeR'], 'strikeCh', ['strikeAuto', 'strikeStun'], 'strikeBoss']);
spoke(-22.5, ['core1', 'core2', 'core3', 'core4', 'thorns']);
spoke(22.5, ['regen', 'regen2', 'coreArmor', 'overshield']);
spoke(67.5, ['fallback', 'emerg', 'repair', 'lastStand']);
spoke(112.5, ['dmg1', 'pads1', 'pads2', 'pads3', ['rate', 'over']]);
spoke(157.5, ['waveEss', 'skip', 'bossSign', 'ess3']);
spoke(202.5, ['clear1', 'cheap', 'bossC', 'interest', 'refund']);
spoke(247.5, ['salv1', 'salv2', 'esss', 'salv3', 'esss2']);

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
