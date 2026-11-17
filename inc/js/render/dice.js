'use strict';
// 주사위: 고정 도안 · 굴리는 정이십면체
// 픽셀 글자: 주사위 눈 (3×5)
const DIG = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001010010', 8: '111101111101111', 9: '111101111001111' };
function drawDigit(n, x, y, c, sc = 2) { const d = DIG[n]; for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (d[j * 3 + i] === '1') for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) { const px = x + i * sc + a, k = (y + j * sc + b) * W + px; if (px >= 0 && px < W && k >= 0 && k < pix.length) pix[k] = c; } }
// 코드로 그린 d20: 회전 없는 고정 도안 (면을 정수 좌표로 찍어 깨지지 않게). 패널 안 작은 캔버스에 그린다
const dieC = document.getElementById('die'), dieX = dieC.getContext('2d'), DS = 44, dieImg = dieX.createImageData(DS, DS), diePx = new Uint32Array(dieImg.data.buffer);
const dieBase = new Map();
function dieFace(col) {
  let o = dieBase.get(col); if (o) return o;
  o = new Uint32Array(DS * DS);
  const ramp = rampOf(col), cx = 22, cy = 22, Rr = 21, V = [], I = [];
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; V.push([Math.round(cx + Math.cos(a) * Rr), Math.round(cy + Math.sin(a) * Rr)]); }
  for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 3; I.push([Math.round(cx + Math.cos(a) * Rr * .68), Math.round(cy + 2 + Math.sin(a) * Rr * .68)]); }
  const tri = (a, b, c, col2) => {
    const E = (p, q, x, y) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
    for (let y = 0; y < DS; y++) for (let x = 0; x < DS; x++) { const e1 = E(a, b, x, y), e2 = E(b, c, x, y), e3 = E(c, a, x, y); if ((e1 >= 0 && e2 >= 0 && e3 >= 0) || (e1 <= 0 && e2 <= 0 && e3 <= 0)) o[y * DS + x] = col2; }
  };
  // 둘레 아홉 면: 위는 밝게, 아래는 어둡게
  [[5, 0, 'i0', 3], [0, 1, 'i0', 3], [1, 'i0', 'i1', 2], [1, 2, 'i1', 2], [2, 3, 'i1', 1], [3, 'i1', 'i2', 1], [3, 4, 'i2', 1], [4, 5, 'i2', 2], [5, 'i2', 'i0', 2]].forEach(([a, b, c, sh]) => { const P = k => (typeof k === 'number' ? V[k] : I[+k[1]]); tri(P(a), P(b), P(c), ramp[sh]); });
  tri(I[0], I[1], I[2], ramp[3]);
  const line = (a, b, c) => { const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); for (let i = 0; i <= n; i++) { const x = Math.round(lerp(a[0], b[0], i / n)), y = Math.round(lerp(a[1], b[1], i / n)); if (x >= 0 && y >= 0 && x < DS && y < DS) o[y * DS + x] = c; } };
  const edge = rampOf(col)[0];
  for (let i = 0; i < 3; i++) line(I[i], I[(i + 1) % 3], edge);
  for (const [a, b] of [[0, 0], [1, 0], [5, 0], [1, 1], [2, 1], [3, 1], [3, 2], [4, 2], [5, 2]]) line(V[a], I[b], edge);
  const ink = rgb(...C.ink);
  for (let i = 0; i < 6; i++) line(V[i], V[(i + 1) % 6], ink);
  dieBase.set(col, o); return o;
}
// 굴리는 동안: 진짜 정이십면체를 돌리고 튕긴다. 멈추면 고정 도안에 눈을 찍는다
const ROLL_S = .85, ICO = (() => {
  const p = (1 + Math.sqrt(5)) / 2, v = [], F = [];
  for (const a of [-1, 1]) for (const b of [-p, p]) v.push([0, a, b], [a, b, 0], [b, 0, a]);
  const L = Math.hypot(1, p), V = v.map(c => c.map(n => n / L));
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), ed = 2 / L + .01;
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) for (let k = j + 1; k < 12; k++) if (dist(V[i], V[j]) < ed && dist(V[j], V[k]) < ed && dist(V[i], V[k]) < ed) {
    const A = V[i], B = V[j], C = V[k], nx = (B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]), ny = (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]), nz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]), out = nx * A[0] + ny * A[1] + nz * A[2] > 0;
    F.push(out ? [i, j, k] : [i, k, j]);
  }
  return { V, F };
})();
function dieSpin(col, u, seed) {
  const ramp = rampOf(col), ink = rgb(...C.ink), edge = ramp[0]; diePx.fill(0);
  // 무작위 축으로 돌다가 느려진다
  const ax = [Math.sin(seed * 1.7), Math.cos(seed * 2.3), Math.sin(seed * .9) + .4], al = Math.hypot(...ax), [kx, ky, kz] = ax.map(n => n / al), ang = (1 - (1 - u) * (1 - u)) * 15 + seed, c = Math.cos(ang), sn = Math.sin(ang), t = 1 - c;
  const rot = ([x, y, z]) => [(t * kx * kx + c) * x + (t * kx * ky - sn * kz) * y + (t * kx * kz + sn * ky) * z, (t * kx * ky + sn * kz) * x + (t * ky * ky + c) * y + (t * ky * kz - sn * kx) * z, (t * kx * kz - sn * ky) * x + (t * ky * kz + sn * kx) * y + (t * kz * kz + c) * z];
  const R = 19.5, P = ICO.V.map(rot), XY = P.map(p => [22 + p[0] * R, 22 + p[1] * R]);
  let front = -1, fz = -9;
  ICO.F.forEach((f, id) => {
    const [A, B, D] = f.map(i => P[i]), nz = (B[0] - A[0]) * (D[1] - A[1]) - (B[1] - A[1]) * (D[0] - A[0]); if (nz <= 0) return;
    const ny = (B[2] - A[2]) * (D[0] - A[0]) - (B[0] - A[0]) * (D[2] - A[2]), nx = (B[1] - A[1]) * (D[2] - A[2]) - (B[2] - A[2]) * (D[1] - A[1]), nl = Math.hypot(nx, ny, nz), li = (nz * .75 - ny * .55 - nx * .2) / nl, sh = clamp(Math.floor(1 + li * 3.4), 1, 4), z = nz / nl;
    if (z > fz) { fz = z; front = id; }
    const [a, b, e2] = f.map(i => XY[i]), E = (p, q, x, y) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
    for (let y = Math.max(0, Math.floor(Math.min(a[1], b[1], e2[1]))); y <= Math.min(DS - 1, Math.ceil(Math.max(a[1], b[1], e2[1]))); y++) for (let x = Math.max(0, Math.floor(Math.min(a[0], b[0], e2[0]))); x <= Math.min(DS - 1, Math.ceil(Math.max(a[0], b[0], e2[0]))); x++) { const e1 = E(a, b, x, y), e3 = E(b, e2, x, y), e4 = E(e2, a, x, y); if ((e1 >= 0 && e3 >= 0 && e4 >= 0) || (e1 <= 0 && e3 <= 0 && e4 <= 0)) diePx[y * DS + x] = ramp[sh]; }
  });
  const line = (a, b, cc) => { const n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])))); for (let i = 0; i <= n; i++) { const x = Math.round(lerp(a[0], b[0], i / n)), y = Math.round(lerp(a[1], b[1], i / n)); if (x >= 0 && y >= 0 && x < DS && y < DS) diePx[y * DS + x] = cc; } };
  ICO.F.forEach(f => { const [A, B, D] = f.map(i => P[i]); if ((B[0] - A[0]) * (D[1] - A[1]) - (B[1] - A[1]) * (D[0] - A[0]) <= 0) return; const [a, b, e2] = f.map(i => XY[i]); line(a, b, edge); line(b, e2, edge); line(e2, a, edge); });
  // 가장 앞면의 눈: 면마다 번호가 정해져 있다
  if (front >= 0) { const f = ICO.F[front], cx = (XY[f[0]][0] + XY[f[1]][0] + XY[f[2]][0]) / 3, cy = (XY[f[0]][1] + XY[f[1]][1] + XY[f[2]][1]) / 3; dieDigits(String(1 + (front * 7 + 3) % 20), Math.round(cx), Math.round(cy), rgb(250, 246, 232)); }
  // 윤곽선
  const copy = diePx.slice(); for (let y = 0; y < DS; y++) for (let x = 0; x < DS; x++) if (!copy[y * DS + x] && ((x > 0 && copy[y * DS + x - 1]) || (x < DS - 1 && copy[y * DS + x + 1]) || (y > 0 && copy[(y - 1) * DS + x]) || (y < DS - 1 && copy[(y + 1) * DS + x]))) diePx[y * DS + x] = ink;
}
function dieDigits(s0, cx, cy, c, sc = 2, rim = 0) {
  const gw = 3 * sc, gap = sc, w = s0.length === 2 ? gw * 2 + gap : gw, X0 = cx - (w >> 1), Y = cy - (5 * sc >> 1);
  const put = (x, y, col) => { if (x >= 0 && y >= 0 && x < DS && y < DS) diePx[y * DS + x] = col; };
  for (const pass of rim ? [0, 1] : [1]) for (let n = 0; n < s0.length; n++) { const g = DIG[s0[n]], X = X0 + n * (gw + gap); for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === '1') for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) { const x = X + i * sc + a, y = Y + j * sc + b; if (pass) put(x, y, c); else for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(x + u, y + v, rim); } }
}
let dieId = 0, dieAt = 0, dieKey = '';
const dieRolling = () => (now() - dieAt) / 1000 < ROLL_S;
function drawDie(R, t) {
  if (!R || R.nat == null) { dieC.style.visibility = 'hidden'; return; }
  dieC.style.visibility = '';
  if (R.id !== dieId) { dieId = R.id; if (!R.keep) dieAt = now(); dieKey = ''; }
  const age = (now() - dieAt) / 1000, u = clamp(age / ROLL_S, 0, 1), rolling = u < 1, base = R.foe ? [168, 80, 84] : [86, 104, 168];
  if (rolling) {
    dieSpin(base, u, R.id * 2.399);
    // 튕김: 세 번, 점점 낮게
    const hop = Math.abs(Math.cos(u * Math.PI * 2.5)) * Math.pow(1 - u, 1.4) * 34;
    dieX.putImageData(dieImg, 0, 0); dieC.style.transform = `translateY(${-hop.toFixed(1)}px)`; return;
  }
  const col = R.nat === 20 ? C.gold : R.nat === 1 ? C.red : base, pop = age - ROLL_S < .14 ? 1.18 : 1;
  dieC.style.transform = pop > 1 ? `scale(${pop})` : '';
  const key = R.nat + '|' + col[0]; if (key === dieKey) return; dieKey = key;
  diePx.set(dieFace(col)); dieDigits(String(R.nat), 22, 22, rgb(255, 250, 236), 3, rgb(...C.ink));
  dieX.putImageData(dieImg, 0, 0);
}
