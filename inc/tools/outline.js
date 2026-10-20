// 지도 그림에서 땅 윤곽선을 따 SVG 경로로: node tools/outline.js 그림.png [칸px=3]
// 바깥 흰 바탕을 가장자리부터 채우고 남은 곳을 땅으로 본다 → 덩어리마다 테두리를 따라 돌고 → 점을 줄인다.
// 출력: viewBox 0~100 폭 기준 경로 (덩어리 큰 순, 작은 섬 하나까지)
const fs = require('fs'), PNG = require('./png');
const img = PNG.read(fs.readFileSync(process.argv[2])), C = +(process.argv[3] || 3);
const { w, h, d } = img;
const bg = i => d[i * 4 + 3] < 30 || (d[i * 4] > 232 && d[i * 4 + 1] > 232 && d[i * 4 + 2] > 232);
// 1) 바깥 채우기
const out = new Uint8Array(w * h), q = [];
for (let x = 0; x < w; x++) q.push(x, (h - 1) * w + x);
for (let y = 0; y < h; y++) q.push(y * w, y * w + w - 1);
while (q.length) {
  const i = q.pop();
  if (out[i] || !bg(i)) continue;
  out[i] = 1;
  const x = i % w, y = (i / w) | 0;
  if (x > 0) q.push(i - 1); if (x < w - 1) q.push(i + 1); if (y > 0) q.push(i - w); if (y < h - 1) q.push(i + w);
}
// 2) 칸으로 줄이기 (칸 안 땅이 절반 넘으면 땅)
const W = Math.ceil(w / C), H = Math.ceil(h / C), g = new Uint8Array(W * H);
for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
  let n = 0, t = 0;
  for (let y = cy * C; y < Math.min(h, cy * C + C); y++) for (let x = cx * C; x < Math.min(w, cx * C + C); x++) { t++; if (!out[y * w + x]) n++; }
  g[cy * W + cx] = n * 2 > t ? 1 : 0;
}
// 3) 덩어리
const lab = new Int32Array(W * H).fill(-1), comps = [];
for (let i = 0; i < W * H; i++) {
  if (!g[i] || lab[i] >= 0) continue;
  const id = comps.length, st = [i], cells = [];
  lab[i] = id;
  while (st.length) {
    const j = st.pop(); cells.push(j);
    const x = j % W, y = (j / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = ny * W + nx;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || !g[k] || lab[k] >= 0) continue;
      lab[k] = id; st.push(k);
    }
  }
  comps.push({ id, cells });
}
comps.sort((a, b) => b.cells.length - a.cells.length);
// 4) 테두리 따라 돌기 (칸 모서리 격자 위 경계선)
function trace(id) {
  const inC = (x, y) => x >= 0 && y >= 0 && x < W && y < H && lab[y * W + x] === id;
  // 경계 변들: 칸의 바깥쪽 변을 시계 방향 선분으로
  const next = new Map();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inC(x, y)) continue;
    if (!inC(x, y - 1)) next.set(`${x},${y}`, [x + 1, y]);
    if (!inC(x + 1, y)) next.set(`${x + 1},${y}`, [x + 1, y + 1]);
    if (!inC(x, y + 1)) next.set(`${x + 1},${y + 1}`, [x, y + 1]);
    if (!inC(x - 1, y)) next.set(`${x},${y + 1}`, [x, y]);
  }
  // 가장 긴 고리 하나 (바깥 테두리)
  let best = [];
  const seen = new Set();
  for (const k of next.keys()) {
    if (seen.has(k)) continue;
    const loop = [];
    let cur = k;
    while (!seen.has(cur) && next.has(cur)) { seen.add(cur); const [x, y] = cur.split(',').map(Number); loop.push([x, y]); const n = next.get(cur); cur = `${n[0]},${n[1]}`; }
    if (loop.length > best.length) best = loop;
  }
  return best;
}
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let md = 0, mi = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const dd = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / L;
    if (dd > md) { md = dd; mi = i; }
  }
  if (md <= eps) return [a, b];
  return [...simplify(pts.slice(0, mi + 1), eps).slice(0, -1), ...simplify(pts.slice(mi), eps)];
}
const S = 100 / w;
const paths = comps.slice(0, 2).filter(c => c.cells.length > 20).map(c => {
  const loop = trace(c.id), half = loop.length >> 1;
  const pts = [...simplify(loop.slice(0, half + 1), 0.9).slice(0, -1), ...simplify(loop.slice(half).concat([loop[0]]), 0.9).slice(0, -1)];
  return 'M' + pts.map(([x, y]) => `${(x * C * S).toFixed(1)} ${(y * C * S).toFixed(1)}`).join('L') + 'Z';
});
console.log(JSON.stringify({ vb: [100, +(h * S).toFixed(1)], paths }));
console.error('덩어리', comps.slice(0, 4).map(c => c.cells.length).join(','), '점', paths.map(p => p.split('L').length).join(','));
