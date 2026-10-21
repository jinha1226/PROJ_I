// 판타지 트리를 검 모양 칸에 다시 배치한다 (선이 하나도 엇갈리지 않게).
//  검신(위): 원정대(가운데)·재화(왼쪽)·벼락(오른쪽) / 가드 왼쪽: 체력 / 가드 오른쪽: 공격 / 손잡이·폼멜: 분노 줄기(동료 지휘)
//  칸을 하나씩 고르는 탐욕 배치 + 엇갈림·노드 관통을 금지, 여러 번 섞어 돌려 선 길이가 가장 짧은 것을 쓴다.
//  node tools/swordlay.js        → 결과만 출력
//  node tools/swordlay.js write  → js/trees.js 좌표를 바꾼다
const fs = require('fs'), vm = require('vm');
const SRC = __dirname + '/../';
const ctx = { console, Math, JSON, Date }; vm.createContext(ctx);
for (const f of ['core', 'data', 'grid', 'juice', 'tree', 'trees']) vm.runInContext(fs.readFileSync(SRC + 'js/' + f + '.js', 'utf8'), ctx);
const d = ctx.G.Tree.defs.fantasy;
const ch = {}; for (const n of d) for (const r of n.req) (ch[r] = ch[r] || []).push(n.id);
const br = {}; const walk = (id, b) => { if (br[id]) return; br[id] = b; for (const c of ch[id] || []) walk(c, b); };
for (const c of ch.root) walk(c, c);
// 공격 갈래에서 분노 줄기(분노와 그 아래)는 손잡이로
const RAGE = new Set(); const wr = id => { RAGE.add(id); for (const c of ch[id] || []) wr(c); }; wr('rage');
const partOf = id => RAGE.has(id) ? 'grip' : ({ party: 'blade', gold1: 'blade', smite1: 'blade', atk1: 'guardR', hp1: 'guardL' })[br[id]];
const lane = id => RAGE.has(id) ? 0 : ({ party: 0, gold1: -2.4, smite1: 2.4, atk1: 4, hp1: -4 })[br[id]];

// 후보 점: 검 모양 안의 고운 격자. 노드끼리는 MIN 이상 떨어진다
const G2 = 0.4, MIN = 0.95;
const BW = +(process.env.BW || 3.4), BLEN = +(process.env.BLEN || 19), TIP = 3;               // 검신 반폭·길이·끝
const GW = 6.2, GH = 1.25;                         // 가드 반폭·반두께
const HW = 1.1, HLEN = 6.4;                        // 손잡이 반폭·길이
const partAt = (x, y) => {
  const ax = Math.abs(x);
  if (y <= -GH - 0.2 && y >= -BLEN && ax <= BW - 0.3) return 'blade';
  if (y < -BLEN && ax <= (BW - 0.3) * (y + BLEN + TIP) / TIP) return 'blade';
  if (Math.abs(y) <= GH - 0.3 && ax >= 0.9 && ax <= GW) return x < 0 ? 'guardL' : 'guardR';
  if (y >= GH + 0.4 && y <= HLEN && ax <= HW - 0.2) return 'grip';
  if (y > HLEN && Math.hypot(x, y - HLEN - 1.3) <= 1.3) return 'grip';
  return null;
};
const cells = [];
for (let x = -GW; x <= GW + 1e-9; x += G2) for (let y = -(BLEN + TIP); y <= HLEN + 1.8; y += G2) {
  const ax = Math.abs(x);
  let part = null;
  if (y <= -GH - 0.2 && y >= -BLEN && ax <= BW - 0.3) part = 'blade';
  else if (y < -BLEN && ax <= (BW - 0.3) * (y + BLEN + TIP) / TIP) part = 'blade';
  else if (Math.abs(y) <= GH - 0.3 && ax >= 0.9) part = x < 0 ? 'guardL' : 'guardR';
  else if (y >= GH + 0.4 && y <= HLEN && ax <= HW - 0.2) part = 'grip';
  else if (y > HLEN && Math.hypot(x, y - HLEN - 1.3) <= 1.3) part = 'grip';
  if (part) cells.push({ x: +x.toFixed(2), y: +y.toFixed(2), part });
}
const dep = { root: 0 }; let changed = true;
while (changed) { changed = false; for (const n of d) if (!n.root && n.req.every(r => dep[r] != null)) { const v = Math.max(...n.req.map(r => dep[r])) + 1; if (dep[n.id] !== v) { dep[n.id] = v; changed = true; } } }

const segX = (p, q, r, t) => { const o = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); const s = (v) => v > 1e-9 ? 1 : v < -1e-9 ? -1 : 0; return s(o(p, q, r)) * s(o(p, q, t)) < 0 && s(o(r, t, p)) * s(o(r, t, q)) < 0; };
const ptSeg = (p, a, b) => { const vx = b.x - a.x, vy = b.y - a.y, L = vx * vx + vy * vy; const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / L)); return Math.hypot(a.x + t * vx - p.x, a.y + t * vy - p.y); };
const CLR = +(process.env.CLR || 0.3);

// 담금질: 엇갈림·노드 관통은 큰 벌점, 그 외 선 길이·갈래 줄·방향. 노드 하나 옮기기/둘 바꾸기를 반복한다
const ids = d.map(n => n.id), I = Object.fromEntries(ids.map((id, i) => [id, i]));
const E = []; for (const n of d) for (const r of n.req) E.push([I[r], I[n.id]]);
const inc = ids.map(() => []); E.forEach((e, k) => { inc[e[0]].push(k); inc[e[1]].push(k); });
const part = ids.map(id => id === 'root' ? 'root' : partOf(id));
const cand = {}; cells.forEach((c, i) => (cand[c.part] = cand[c.part] || []).push(i));
const XW = +(process.env.XW || 200), OW = +(process.env.OW || 150);
function nodeCost(P, i) {
  if (ids[i] === 'root') return 0;
  const n = d[i], c = P[i];
  let k = (part[i] === 'blade' ? 1.0 : 0.25) * Math.abs(c.x - lane(ids[i]));
  for (const r of n.req) {
    const p = P[I[r]];
    if (part[i] === 'blade' && c.y > p.y - 0.3) k += 3;
    if (part[i] === 'guardL' && c.x > p.x - 0.3) k += 3;
    if (part[i] === 'guardR' && c.x < p.x + 0.3) k += 3;
    if (part[i] === 'grip' && c.y < p.y + 0.3) k += 3;
  }
  return k;
}
const segLen = (P, e) => Math.hypot(P[e[0]].x - P[e[1]].x, P[e[0]].y - P[e[1]].y);
function edgeBad(P, e, f) { // 두 선 사이 벌점
  if (e[0] === f[0] || e[0] === f[1] || e[1] === f[0] || e[1] === f[1]) return 0;
  return segX(P[e[0]], P[e[1]], P[f[0]], P[f[1]]) ? XW : 0;
}
function nodeEdgeBad(P, i, e) { if (e[0] === i || e[1] === i) return 0; return ptSeg(P[i], P[e[0]], P[e[1]]) < CLR ? OW : 0; }
function localE(P, set) { // set에 든 노드와 닿는 모든 항
  let k = 0; const es = new Set(); for (const i of set) for (const x of inc[i]) es.add(x);
  for (const x of es) { k += 1.2 * segLen(P, E[x]); for (let y = 0; y < E.length; y++) if (y !== x && !(es.has(y) && y < x)) k += edgeBad(P, E[x], E[y]); for (let i = 0; i < P.length; i++) if (!set.has(i) || (E[x][0] !== i && E[x][1] !== i && set.size > 1 && !inc[i].includes(x))) k += nodeEdgeBad(P, i, E[x]); }
  for (const i of set) { for (let x = 0; x < E.length; x++) if (!es.has(x)) k += nodeEdgeBad(P, i, E[x]); k += nodeCost(P, i); for (const c of ch[ids[i]] || []) k += nodeCost(P, I[c]); for (let j = 0; j < P.length; j++) if (j !== i && !set.has(j) && Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y) < MIN) k += 500; }
  return k;
}
function total(P) {
  let k = 0, X = 0, O = 0;
  for (let x = 0; x < E.length; x++) { k += 1.2 * segLen(P, E[x]); for (let y = x + 1; y < E.length; y++) { const v = edgeBad(P, E[x], E[y]); if (v) X++; k += v; } for (let i = 0; i < P.length; i++) { const v = nodeEdgeBad(P, i, E[x]); if (v) O++; k += v; } }
  for (let i = 0; i < P.length; i++) k += nodeCost(P, i);
  return { k, X, O };
}
function anneal(rand, iters) {
  // 처음: 갈래 줄에 가까운 칸을 깊이 순으로 (엇갈림 무시)
  const P = ids.map(() => null), used = new Set(); P[I.root] = { x: 0, y: 0 };
  const order = d.filter(n => !n.root).sort((a, b) => dep[a.id] - dep[b.id]);
  for (const n of order) {
    const i = I[n.id]; let best = null, bc = 1e9;
    for (const ci of cand[part[i]]) { if (used.has(ci)) continue; const c = cells[ci]; P[i] = c; let ok = true; for (let j = 0; j < P.length; j++) if (j !== i && P[j] && Math.hypot(P[j].x - c.x, P[j].y - c.y) < MIN) { ok = false; break; } if (!ok) continue; let k = nodeCost(P, i); for (const r of n.req) k += Math.hypot(c.x - P[I[r]].x, c.y - P[I[r]].y); k += rand() * 0.5; if (k < bc) { bc = k; best = ci; } }
    if (best == null) best = cand[part[i]].find(ci => !used.has(ci));
    P[i] = cells[best]; used.add(best);
  }
  const cellOf = P.map(p => cells.indexOf(p));
  let T = 30;
  for (let it = 0; it < iters; it++) {
    T = 60 * Math.pow(0.05 / 60, it / iters);
    const i = 1 + Math.floor(rand() * (ids.length - 1));
    if (ids[i] === 'root') continue;
    if (rand() < 0.75) { // 옮기기: 조금 밀기(연속) 또는 먼 칸으로 뛰기
      let c;
      if (rand() < 0.7) { const sc = 0.15 + 1.2 * T / 60; c = { x: P[i].x + (rand() * 2 - 1) * sc, y: P[i].y + (rand() * 2 - 1) * sc }; if (partAt(c.x, c.y) !== part[i]) continue; }
      else { const pool = cand[part[i]]; c = cells[pool[Math.floor(rand() * pool.length)]]; if (Math.hypot(c.x - P[i].x, c.y - P[i].y) > 3 + 10 * T / 60) continue; c = { x: c.x, y: c.y }; }
      const set = new Set([i]), before = localE(P, set), old = P[i];
      P[i] = c; const after = localE(P, set);
      if (!(after <= before || rand() < Math.exp((before - after) / T))) P[i] = old;
    } else { // 바꾸기: 같은 부위의 다른 노드
      const j = 1 + Math.floor(rand() * (ids.length - 1));
      if (j === i || part[j] !== part[i]) continue;
      const set = new Set([i, j]), before = localE(P, set);
      [P[i], P[j]] = [P[j], P[i]]; const after = localE(P, set);
      if (!(after <= before || rand() < Math.exp((before - after) / T))) [P[i], P[j]] = [P[j], P[i]];
    }
  }
  return P;
}
let seed = +(process.env.SEED || 13); const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
let best = null;
const TRIES = +(process.env.TRIES || 1), ITERS = +(process.env.ITERS || 1200000);
for (let t = 0; t < TRIES; t++) {
  const P = anneal(rng, ITERS), r = total(P);
  console.log('시도', t, '엇갈림', r.X, '관통', r.O, '점수', r.k.toFixed(0));
  if (!best || r.k < best.r.k) best = { P, r };
}
const pos = Object.fromEntries(ids.map((id, i) => [id, best.P[i]]));
if (process.env.DBG) for (const e of E) for (let i = 0; i < ids.length; i++) if (nodeEdgeBad(best.P, i, e)) console.log('관통', ids[i], 'by', ids[e[0]], '→', ids[e[1]], ptSeg(best.P[i], best.P[e[0]], best.P[e[1]]).toFixed(2));
if (process.argv[2] === 'write') {
  let s = fs.readFileSync(SRC + 'js/trees.js', 'utf8');
  const a = s.indexOf("G.Tree.define('fantasy'"), b = s.indexOf("G.Tree.define('wuxia'");
  let seg = s.slice(a, b), n = 0;
  for (const [id, p] of Object.entries(pos)) {
    const re = new RegExp(`((?:N|PAIR|NOTE)\\('${id}', )(-?[\\d.]+), (-?[\\d.]+),`);
    if (!re.test(seg)) { console.log('miss', id); continue; }
    seg = seg.replace(re, `$1${+p.x.toFixed(2)}, ${+p.y.toFixed(2)},`); n++;
  }
  fs.writeFileSync(SRC + 'js/trees.js', s.slice(0, a) + seg + s.slice(b));
  console.log('바꾼 노드', n);
}
