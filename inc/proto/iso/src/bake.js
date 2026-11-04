'use strict';
// 층을 한 판으로 굽기: 바닥 · 벽 · 그림자 · 카메라
// ───── 방 굽기 ─────
let bake0 = null, tufts = [], torches = [];
const isFloor = (m, x, y) => { const c = G.Grid.at(m, x, y); return c === '.' || c === '>' || c === ',' || c === '~'; }; // 물도 평평한 바닥으로 그린다
const win = { x0: 0, y0: 0, x1: 0, y1: 0, cx: 0, cy: 0, map: null, key: '' };
const wx = x => (x - win.cx) * T, wy = y => (y - win.cy) * T;
// 판: 층 전체를 한 번 구워 두고, 카메라가 그 위를 움직인다
const big = { w: 0, h: 0, ox: 0, oy: 0, pix: null, z: null, gz: null, g: null, cv: null };
const cam = { x: 0, y: 0, tx: 0, ty: 0 };
function bakeFloor(m) {
  const w = { x0: 0, y0: 0, x1: m.w - 1, y1: m.h - 1, key: 'floor' };
  const bw = Math.max(VW, Math.ceil((m.w + m.h) * T / R2 * S) + 60), bh = Math.max(VH, Math.ceil((m.w + m.h) * T / R2 * SIN * S) + 110);
  if (big.w !== bw || big.h !== bh) Object.assign(big, { w: bw, h: bh, pix: new Uint32Array(bw * bh), z: new Float32Array(bw * bh), gz: new Float32Array(bw * bh), g: new Uint8Array(bw * bh), sh: new Uint8Array(bw * bh) });
  big.ox = bw / 2; big.oy = bh / 2 + 22;
  W = bw; H = bh; OX = big.ox; OY = big.oy; pix = big.pix; zb = big.z; groundZ = big.gz; ground = big.g; shadow = big.sh;
  big.cell = new Int32Array(bw * bh).fill(-1); cellMap = big.cell;
  bakeRoom(m, w);
  cellMap = null; hideUnseen(bw * bh);
  W = VW; H = VH; pix = viewPix; zb = viewZ; groundZ = viewGZ; ground = viewG; shadow = viewSh;
  const cv = big.cv || (big.cv = document.createElement('canvas')); cv.width = bw; cv.height = bh;
  const im = new ImageData(new Uint8ClampedArray(big.pix.buffer.slice(0)), bw, bh); cv.getContext('2d').putImageData(im, 0, 0);
}
// 시야: 다 구운 판을 보관해 두고, 본 칸의 픽셀만 판에 올린다 (G.Sight)
function hideUnseen(n) {
  big.full = { pix: big.pix.slice(), z: big.z.slice(), gz: big.gz.slice(), g: big.g.slice() };
  big.cells = new Map();
  for (let i = 0; i < n; i++) { const c = big.cell[i]; if (c < 0) continue; let L = big.cells.get(c); if (!L) big.cells.set(c, L = []); L.push(i); big.pix[i] = BG; big.z[i] = -1e9; big.gz[i] = -1e9; big.g[i] = 0; }
  big.fogVer = -1;
}
function syncFog(r) {
  if (big.fogVer === r.seenVer || !big.cells) return;
  big.fogVer = r.seenVer;
  const F0 = big.full;
  for (const [c, L] of big.cells) { if (!r.seen[c]) continue; for (const i of L) { big.pix[i] = F0.pix[i]; big.z[i] = F0.z[i]; big.gz[i] = F0.gz[i]; big.g[i] = F0.g[i]; } big.cells.delete(c); }
}
// 카메라: 판에서 화면만큼 잘라 온다
function copyView() {
  const cx = clamp(Math.round(cam.x), 0, big.w - VW), cy = clamp(Math.round(cam.y), 0, big.h - VH);
  cam.ix = cx; cam.iy = cy; OX = big.ox - cx; OY = big.oy - cy;
  for (let y = 0; y < VH; y++) {
    const a = (y + cy) * big.w + cx, b = a + VW, o = y * VW;
    bakedPix.set(big.pix.subarray(a, b), o); bakedZ.set(big.z.subarray(a, b), o); viewGZ.set(big.gz.subarray(a, b), o); viewG.set(big.g.subarray(a, b), o);
  }
}
const camFor = (x, y) => { const u = (wx(x) - wy(y)) / R2, v = (wx(x) + wy(y)) / R2; return [big.ox + u * S - VW / 2, big.oy + v * SIN * S - VH / 2 - 8]; };
// 맹그로브: 갈라진 뿌리 · 줄기 · 잎 뭉치
function tree(x, y) {
  const a = wx(x), b = wy(y), s = hash(x * 3, y * 5), H0 = 2.3 + s * 1.1, BARK = [74, 58, 44], LEAF = [[52, 92, 58], [66, 108, 62], [44, 80, 62]];
  for (let i = 0; i < 3; i++) { const t = i * 2.1 + s * 6; capsule([a + Math.cos(t) * .55, b + Math.sin(t) * .55, 0], [a, b, .75], .09, .13, BARK); }
  capsule([a, b, .6], [a + (s - .5) * .3, b + (hash(x, y) - .5) * .3, H0], .17, .1, BARK);
  for (let i = 0; i < 5; i++) { const u = hash(x + i, y * 2), v = hash(x * 2, y + i), w2 = hash(x + i, y + i); sphere(a + (u - .5) * 1.3, b + (v - .5) * 1.3, H0 + (w2 - .3) * .8, .55 + w2 * .3, LEAF[i % 3], 'rough'); }
}
function bakeRoom(m, w) {
  Object.assign(win, w, { map: m }); win.cx = (w.x0 + w.x1) / 2; win.cy = (w.y0 + w.y1) / 2;
  const inW = (x, y) => x >= w.x0 && x <= w.x1 && y >= w.y0 && y <= w.y1;
  tufts = []; torches = [];
  pix.fill(BG); zb.fill(-1e9); ground.fill(0); groundZ.fill(-1e9);
  const fl = G.S.w.fantasy.floor, zone = G.Fantasy.band(fl), FLOORS = [[172, 160, 142], [164, 158, 134], [166, 152, 156], [152, 164, 172], [176, 142, 124], [146, 138, 158]], base = FLOORS[zone % 6], alt = base.map(v => v * .88);
  const FL = rampOf(base), AL = rampOf(alt), dset = DNG ? G.DCSS.dng[zone % 6] : null;
  // 방의 표지: 큰 방은 가운데 양탄자, 둥근 방은 돌 고리, 십자 방은 가운데 판 → 멀리서도 어느 방인지 읽힌다
  const deco = new Uint8Array(m.w * m.h);
  for (const r of m.rooms) {
    if (r.shape === 'hall') for (let yy = r.cy - 2; yy <= r.cy + 2; yy++) for (let xx = r.x + 2; xx < r.x + r.w - 2; xx++) if (isFloor(m, xx, yy)) deco[yy * m.w + xx] = yy === r.cy - 2 || yy === r.cy + 2 || xx === r.x + 2 || xx === r.x + r.w - 3 ? 2 : 1;
    else if (r.shape === 'round') for (let yy = r.y; yy < r.y + r.h; yy++) for (let xx = r.x; xx < r.x + r.w; xx++) { const q = Math.hypot((xx + .5 - r.x - r.w / 2) / (r.w / 2), (yy + .5 - r.y - r.h / 2) / (r.h / 2)); if (q > .42 && q < .62 && isFloor(m, xx, yy)) deco[yy * m.w + xx] = 3; }
    else if (r.shape === 'cross') for (let yy = r.cy - 1; yy <= r.cy + 1; yy++) for (let xx = r.cx - 1; xx <= r.cx + 1; xx++) if (isFloor(m, xx, yy)) deco[yy * m.w + xx] = 3;
  }
  const DECO = { 1: [128, 40, 46, .5], 2: [176, 136, 78, .34], 3: [226, 214, 186, .3] };
  const tintD = (c, D) => rgb(lerp(c & 255, D[0], D[3]), lerp(c >> 8 & 255, D[1], D[3]), lerp(c >> 16 & 255, D[2], D[3]));
  for (let iy = 0; iy < H; iy++) for (let ix = 0; ix < W; ix++) {
    const g = unproject(ix + .5, iy + .5), cx = g.x / T + win.cx, cy = g.y / T + win.cy, tx = Math.round(cx), ty = Math.round(cy);
    if (!inW(tx, ty) || !isFloor(m, tx, ty)) continue;
    const i = iy * W + ix, d = project(g.x, g.y, 0).d, fx = cx - tx + .5, fy = cy - ty + .5; big.cell[i] = ty * m.w + tx;
    // 칸마다 판석: 줄눈 · 판마다 톤 · 낮은 잡음과 디더
    const seam = fx < .05 || fy < .05, n = noise(g.x * 1.3, g.y * 1.3), s = hash(tx, ty), ramp = s > .5 ? FL : AL;
    if (DNG && dset) {
      const rk = m.kindAt ? m.kindAt[ty * m.w + tx] : 0, fset = rk === 2 ? G.DCSS.dng[0].f : rk === 1 ? G.DCSS.dng[1].f : rk === 3 ? G.DCSS.dng[1].f : dset.f; // 큰 방 · 동굴 · 복도의 바닥을 달리한다
      const ch = m.theme === 'swamp' ? m.c[ty * m.w + tx] : '', sw = ch && G.DCSS.swamp, set2 = sw ? (ch === ',' ? sw.shallow : ch === '~' ? sw.deep : sw.land) : fset;
      const tile = TEX[set2[Math.floor(hash(tx, ty) * set2.length)]];
      if (tile) { pix[i] = lit(tile[Math.floor(fy * 32) * 32 + Math.floor(fx * 32)] || BG, .92 + (n - .5) * .16, ix, iy); if (ch && ch !== ',' && ch !== '~') pix[i] = tintD(pix[i], [92, 96, 52, .42]); else if (ch === '~') pix[i] = tintD(pix[i], [14, 34, 58, .55]); const dk = deco[ty * m.w + tx]; if (dk) { const D = DECO[dk], wv = .86 + hash(ix >> 1, iy) * .28 - (Math.floor((fx + fy * 2) * 8) % 3 === 0 ? .1 : 0); pix[i] = tintD(pix[i], [D[0] * wv, D[1] * wv, D[2] * wv, D[3]]); } zb[i] = groundZ[i] = d; ground[i] = 1; continue; }
    }
    let l = 2.45 + s * .5 + (n - .5) * .8 + (bayer(ix, iy) - .5) * .5 - (seam ? 1.2 : 0);
    if (hash(tx * 3, ty * 7) > .86 && Math.abs(noise(g.x * 2.2, g.y * 5) - .5) < .025) l -= 1.2; // 금
    pix[i] = ramp[clamp(Math.floor(l), 0, 4)];
    zb[i] = groundZ[i] = d; ground[i] = 1;
    // 벽 밑 이끼
    const wet = noise(g.x * .55 + 9, g.y * .55 + 3);
    if (wet > .7 && hash(ix, iy) < (wet - .68) * 2.4) pix[i] = rampOf(C.moss)[clamp(Math.floor(2 + (bayer(ix, iy) * 2)), 0, 4)];
    if (wet > .68 && hash(ix * 3, iy * 5) < .09) tufts.push({ ix, iy, i, h: 1 + (hash(ix, iy * 2) * 3 | 0), ph: ix * .11 + iy * .19 + hash(ix, iy), c: hash(ix, iy) > .5 ? C.mossL : C.moss });
  }
  // 그늘이 드는 벽 쪽
  const shStatic = [];
  const WALLC = zone % 6 === 2 ? [124, 110, 124] : zone % 6 === 3 ? [116, 130, 142] : zone % 6 === 4 ? [138, 104, 92] : [136, 124, 112];
  const pillar = (x, y) => !isFloor(m, x, y) && isFloor(m, x + 1, y) && isFloor(m, x - 1, y) && isFloor(m, x, y + 1) && isFloor(m, x, y - 1);
  const faces = (x, y) => isFloor(m, x + 1, y) && inW(x + 1, y) || isFloor(m, x, y + 1) && inW(x, y + 1) || isFloor(m, x + 1, y + 1) && inW(x + 1, y + 1);
  const talls = new Set();
  for (let y = w.y0; y <= w.y1; y++) for (let x = w.x0; x <= w.x1; x++) if (!isFloor(m, x, y) && faces(x, y) && ![1, 2].some(d => isFloor(m, x - d, y) || isFloor(m, x, y - d) || isFloor(m, x - d, y - d))) talls.add(y * m.w + x);
  // 혼자 선 높은 벽은 낮춘다: 복도 모서리에 기둥처럼 튀어나오지 않게
  const isTall = (x, y) => talls.has(y * m.w + x), alone = (x, y) => !(isTall(x + 1, y) || isTall(x - 1, y) || isTall(x, y + 1) || isTall(x, y - 1) || isTall(x + 1, y + 1) || isTall(x - 1, y - 1) || isTall(x + 1, y - 1) || isTall(x - 1, y + 1));
  for (const k of [...talls]) if (alone(k % m.w, Math.floor(k / m.w))) talls.delete(k);
  for (let y = w.y0; y <= w.y1; y++) for (let x = w.x0; x <= w.x1; x++) {
    if (isFloor(m, x, y)) continue;
    curCell = y * m.w + x;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([a, b]) => inW(x + a, y + b) && isFloor(m, x + a, y + b));
    if (!near) continue;
    const pil = pillar(x, y), tall = isTall(x, y) || pil, hz = tall ? 3.3 + (pil ? 0 : hash(x, y) * .3) : .3 + hash(x, y) * .1, pw = pil ? T * .36 : T / 2;
    if (m.theme === 'swamp') { tree(x, y); continue; }
    block(wx(x) - pw, wy(y) - pw, 0, wx(x) + pw, wy(y) + pw, hz, WALLC, { bw: 1.0, bh: .5, topK: tall ? .85 : .6, tex: dset ? TEX[dset.w[Math.floor(hash(x, y) * dset.w.length)]] : null });
    // 벽 그림자: 칸 안에 여러 점을 찍어 가장자리가 물결치지 않게
    if (tall) { for (let k = 0; k < (pil ? 2 : 4); k++) for (const [ax, ay] of pil ? [[0, 0]] : [[0, 0], [-.6, .6], [.6, -.6], [-.6, -.6], [.6, .6]]) shStatic.push([wx(x) + ax, wy(y) + ay, .6 + k * .7, pil ? .7 : .8]); if (!pil && hash(x * 5, y * 9) > .88 && torches.length < m.rooms.length * 2) torches.push({ cell: y * m.w + x, x: wx(x) + (isFloor(m, x + 1, y) ? T / 2 + .1 : 0), y: wy(y) + (isFloor(m, x, y + 1) ? T / 2 + .1 : 0), z: 2.1 }); }
  }
  // 바닥판 두께: 앞쪽 가장자리가 흙으로 풀어진다
  for (let y = w.y0; y <= w.y1; y++) for (let x = w.x0; x <= w.x1; x++) {
    const solid = isFloor(m, x, y) || [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([a, b]) => inW(x + a, y + b) && isFloor(m, x + a, y + b));
    if (!solid) continue;
    curCell = y * m.w + x;
    const openX = !inW(x + 1, y) || !(isFloor(m, x + 1, y) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => inW(x + 1 + a, y + b) && isFloor(m, x + 1 + a, y + b)));
    const openY = !inW(x, y + 1) || !(isFloor(m, x, y + 1) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => inW(x + a, y + 1 + b) && isFloor(m, x + a, y + 1 + b)));
    if (openX || openY) block(wx(x) - T / 2, wy(y) - T / 2, -1.9, wx(x) + T / 2, wy(y) + T / 2, -.02, C.earth, { dissolve: -.5 });
  }
  // 소품: 뼈 · 돌무더기
  for (let y = w.y0 + 1; y < w.y1; y++) for (let x = w.x0 + 1; x < w.x1; x++) {
    if (!isFloor(m, x, y)) continue;
    curCell = y * m.w + x;
    const h0 = hash(x * 11, y * 13), byWall = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !isFloor(m, x + a, y + b)), h = byWall ? h0 : h0 * .9;
    if (h > .95) { for (let i = 0; i < 5; i++) { const a = wx(x) + (hash(i, x) - .5) * 1.1, b = wy(y) + (hash(y, i) - .5) * 1.1; sphere(a, b, .12, .13 + hash(i, y) * .14, C.stone, 'rough'); } }
    else if (h > .91) { capsule([wx(x) - .3, wy(y), .05], [wx(x) + .35, wy(y) + .2, .05], .05, .05, C.bone); sphere(wx(x) + .5, wy(y) - .1, .14, .15, C.bone, 'solid'); }
  }
  curCell = m.end.cy * m.w + m.end.cx;
  if (m.end && inW(m.end.cx, m.end.cy)) { const ex = wx(m.end.cx), ey = wy(m.end.cy); for (let k = 0; k < 4; k++) block(ex - 1 + k * .4, ey - 1, -.02 + (3 - k) * .1, ex + 1, ey + 1 - k * .08, .0 + (3 - k) * .12, C.stone2); }
  // 정적 그림자 · 바닥의 음영 · 횃불빛
  for (const [a, b, z, r] of shStatic) castShadow(a, b, z, r, 1, .35);
  applyShadows(groundZ);
  for (const t of torches) {
    const p = project(t.x, t.y, 0);
    for (let iy = Math.max(0, (p.sy - 44) | 0); iy < Math.min(H, p.sy + 44); iy++) for (let ix = Math.max(0, (p.sx - 70) | 0); ix < Math.min(W, p.sx + 70); ix++) {
      const i = iy * W + ix; if (!ground[i] || zb[i] !== groundZ[i]) continue;
      const d = Math.hypot((ix - p.sx) / 70, (iy - p.sy) / 44);
      if (d + (bayer(ix, iy) - .5) * .28 < .78) { const c = pix[i], k = (1 - d) * .14 + .03; pix[i] = rgb(lerp(c & 255, 255, k), lerp(c >> 8 & 255, 196, k * .8), lerp(c >> 16 & 255, 120, k * .35)); }
    }
  }
}
