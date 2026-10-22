// 크툴루 트리를 크툴루 그림에 맞춰 배치한다 (좌표와 선행 노드를 함께 정한다). node tools/cthtree.js write
//  머리(둥근 윤곽 + 눈 둘) = 이성 · 양쪽 날개 = 값·정수 · 얼굴에서 늘어진 촉수 넷 = 줄(왼쪽 둘)·바늘(오른쪽 둘)
//  갈래 안에서는 원래 깊이·비용 순서대로 가까운 칸부터 채운다. ★짝은 같은 부모를 둔 형제 칸에.
const fs = require('fs'), vm = require('vm');
const ROOT = __dirname + '/..', SRC = ROOT + '/js/trees.js';
const ctx = { console, Math, JSON, Date }; vm.createContext(ctx);
for (const f of ['core', 'data', 'grid', 'juice', 'tree', 'trees']) vm.runInContext(fs.readFileSync(ROOT + '/js/' + f + '.js', 'utf8'), ctx);
const d = ctx.G.Tree.defs.cthulhu, idx = Object.fromEntries(d.map(n => [n.id, n]));
// ORIG=경로: 태극으로 바꾸기 전 trees.js (갈래·깊이를 거기서 읽는다)
let od = d;
if (process.env.ORIG) { const c2 = { console, Math, JSON, Date }; vm.createContext(c2); for (const f of ['core', 'data', 'grid', 'juice', 'tree']) vm.runInContext(fs.readFileSync(ROOT + '/js/' + f + '.js', 'utf8'), c2); vm.runInContext(fs.readFileSync(process.env.ORIG, 'utf8'), c2); od = c2.G.Tree.defs.cthulhu; }
const oidx = Object.fromEntries(od.map(n => [n.id, n]));
const req = n => (oidx[n.id] || n).req;
const ch = {}; for (const n of d) for (const r of req(n)) (ch[r] = ch[r] || []).push(n.id);
const br = {}; const walk = (id, b) => { if (br[id]) return; br[id] = b; for (const c of ch[id] || []) walk(c, b); }; for (const c of ch.root) walk(c, c);
const dep = { root: 0 }; let changed = true;
while (changed) { changed = false; for (const n of d) if (!n.root && req(n).every(r => dep[r] != null)) { const v = Math.max(...req(n).map(r => dep[r])) + 1; if (dep[n.id] !== v) { dep[n.id] = v; changed = true; } } }

// ── 칸(슬롯): { k, x, y, req: [슬롯 이름], b: 갈래 }
const S = {}, at = (deg, r, t = 0) => { const a = deg * Math.PI / 180; return [Math.cos(a) * r - Math.sin(a) * t, Math.sin(a) * r + Math.cos(a) * t]; };
const slot = (k, xy, req, b) => { S[k] = { k, x: +xy[0].toFixed(2), y: +xy[1].toFixed(2), req, b }; };
const chain = (pre, pts, first, b) => pts.forEach((p, i) => slot(pre + i, p, [i ? pre + (i - 1) : first], b));
// 머리: 중심 (0,-3), 반지름 3 — 뿌리(목)에서 좌우 윤곽이 올라가 정수리에서 만난다. 눈: 윤곽 셋째 칸에서 형제 둘
const HC = [0, -3], HR = 3, hp = deg => [HC[0] + Math.cos(deg * Math.PI / 180) * HR, HC[1] + Math.sin(deg * Math.PI / 180) * HR];
chain('HL', [115, 140, 165, 190, 215, 240].map(hp), 'root', 'mind1');
chain('HR', [65, 40, 15, -10, -35, -60].map(hp), 'root', 'mind1');
slot('Htop', hp(-90), ['HL5', 'HR5'], 'mind1');
slot('EL0', [-1.15, -3.5], ['HL2'], 'mind1'); slot('EL1', [-1.15, -2.5], ['HL2'], 'mind1');
slot('ER0', [1.15, -3.5], ['HR2'], 'mind1'); slot('ER1', [1.15, -2.5], ['HR2'], 'mind1');
// 날개: 어깨에서 바깥 위로 펼친다
const wing = s => [[2.4, 0.6], [3.6, -0.1], [4.8, -1.0], [5.8, -1.9], [6.5, -3.0]].map(([x, y]) => [s * x, y]);
chain('WL', wing(-1), 'root', 'value1'); chain('WR', wing(1), 'root', 'value1');
// 촉수: 얼굴 아래로 늘어져 끝이 말린다 (바깥 둘은 바깥으로, 안쪽 둘은 길게)
const outer = s => [[1.55, 1.15], [2.35, 2.0], [2.95, 3.0], [3.15, 4.1], [2.8, 5.15]].map(([x, y]) => [s * x, y]);
const inner = s => [[0.5, 1.35], [0.85, 2.45], [0.95, 3.55], [1.4, 4.55], [1.85, 5.5], [1.7, 6.55], [1.05, 7.4]].map(([x, y]) => [s * x, y]);
chain('TA', outer(-1), 'root', 'line1');
chain('TB', inner(-1).slice(0, 6), 'root', 'line1');
chain('TC', inner(1), 'root', 'hook1');
chain('TD', outer(1), 'root', 'hook1');
slot('TDf0', [3.5, 6.0], ['TD4'], 'hook1'); slot('TDf1', [2.75, 6.55], ['TD4'], 'hook1');

// ── 노드를 칸에 앉힌다
const slotsOf = b => Object.values(S).filter(s => s.b === b);
const sdep = {}; const sd = k => (k === 'root' ? 0 : sdep[k] ?? (sdep[k] = 1 + Math.min(...S[k].req.filter(r => r !== k).map(r => (r === 'root' || S[r] ? (r === 'root' ? 0 : (sdep[r] ?? 50)) : 50)))));
// 깊이: 너비 우선
{ const q = ['root'], dd = { root: 0 }; const kids = {}; for (const s of Object.values(S)) for (const r of s.req) (kids[r] = kids[r] || []).push(s.k);
  for (let i = 0; i < q.length; i++) for (const c of kids[q[i]] || []) if (dd[c] == null) { dd[c] = dd[q[i]] + 1; q.push(c); }
  Object.assign(sdep, dd); }
const place = {}, BRANCH = { mind1: 1, value1: 1, line1: 1, hook1: 1 };
for (const b of Object.keys(BRANCH)) {
  const nodes = d.filter(n => br[n.id] === b), slots = slotsOf(b);
  if (nodes.length !== slots.length) throw new Error(`${b}: 노드 ${nodes.length} · 칸 ${slots.length}`);
  const free = new Set(slots.map(s => s.k));
  // 칸 순서(가까운 칸부터)와 노드 순서(원래 깊이·비용)를 맞춘다. 짝은 그 순위에 가장 가까운 형제 칸 둘에 먼저 앉힌다
  const order = slots.map(s => s.k).sort((a, c) => sdep[a] - sdep[c] || Math.hypot(S[a].x, S[a].y) - Math.hypot(S[c].x, S[c].y));
  const rank = Object.fromEntries(order.map((k, i) => [k, i]));
  const all = nodes.slice().sort((a, c) => dep[a.id] - dep[c.id] || a.base - c.base);
  const nrank = Object.fromEntries(all.map((n, i) => [n.id, i]));
  const sib = []; const byPar = {}; for (const s of slots) if (s.req.length === 1 && s.req[0] !== 'root') (byPar[s.req[0]] = byPar[s.req[0]] || []).push(s.k);
  // 형제 칸: 같은 부모를 둔 잎 칸 둘 (부모 자식이 셋이어도 잎 둘을 고른다)
  const hasKid = new Set(Object.values(S).flatMap(x => x.req));
  for (const ks of Object.values(byPar)) { const lv = ks.filter(k => !hasKid.has(k)); for (let i = 0; i < lv.length; i++) for (let j = i + 1; j < lv.length; j++) sib.push([lv[i], lv[j]]); }
  const pairs = {}; for (const n of nodes) if (n.pair) (pairs[n.pair] = pairs[n.pair] || []).push(n);
  for (const ps of Object.values(pairs)) {
    const want = (nrank[ps[0].id] + nrank[ps[1].id]) / 2;
    const cand = sib.filter(ks => ks.every(k => free.has(k))).sort((a, c) => Math.abs(rank[a[0]] - want) - Math.abs(rank[c[0]] - want));
    if (!cand.length) throw new Error('짝 칸 없음 ' + ps[0].pair);
    cand[0].forEach((k, i) => { place[ps[i].id] = k; free.delete(k); });
  }
  const rest = all.filter(n => !n.pair), fs2 = order.filter(k => free.has(k));
  rest.forEach((n, i) => { place[n.id] = fs2[i]; });
}
const who = Object.fromEntries(Object.entries(place).map(([id, k]) => [k, id]));
const L = {};
for (const [id, k] of Object.entries(place)) { const s = S[k]; L[id] = [s.x, s.y, s.req.map(r => (r === 'root' ? 'root' : who[r])).join(' ')]; }

// ── 검사·쓰기
let src = fs.readFileSync(SRC, 'utf8');
const a0 = src.indexOf("G.Tree.define('cthulhu'"), b0 = src.indexOf("G.Tree.define('nexus'") > 0 ? src.indexOf("G.Tree.define('nexus'") : src.length;
let seg = src.slice(a0, b0);
const ids = [...seg.matchAll(/(?:N|PAIR|NOTE)\('(\w+)'/g)].map(m => m[1]).filter(id => id !== 'root' && id !== 'open_');
const miss = ids.filter(id => !L[id]);
console.log('노드', ids.length, '배치', Object.keys(L).length, '빠짐', miss);
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
if (process.argv[2] === 'list') for (const [id, v] of Object.entries(L)) console.log(id.padEnd(12), br[id].padEnd(5), place[id].padEnd(8), v[2]);
if (process.argv[2] === 'write' && !miss.length) {
  for (const [id, [x, y, req]] of Object.entries(L)) {
    const re = new RegExp(`((?:N|PAIR|NOTE)\\('${id}', )-?[\\d.]+, -?[\\d.]+, '[^']*',`);
    if (!re.test(seg)) { console.log('못 바꿈', id); continue; }
    seg = seg.replace(re, `$1${x}, ${y}, '${req}',`);
  }
  fs.writeFileSync(SRC, src.slice(0, a0) + seg + src.slice(b0));
  console.log('썼다');
}
