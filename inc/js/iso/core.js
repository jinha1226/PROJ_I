'use strict';
// 기초: 화면 버퍼 · 수학 · 입체 그리기 · 그림자
// 쿼터뷰 시험 장면: 실제 턴제 전투(G.Turn · G.Story)를 탁자 위 디오라마처럼 그린다. 그림 파일 없이 전부 코드.
// 렌더러 방식(직교 카메라 · 깊이 버퍼 · 색 램프 · 그림자 · 외곽선)은 pixel-plays(MIT, LICENSE-pixel-plays.txt)에서 가져와 고쳤다.
const q = new URLSearchParams(location.search);
const DARK = q.get('bg') !== 'light';
if (DARK) document.body.classList.add('dark');
// 화면 크기: 픽셀 배율은 정수로 두고 창을 꽉 채운다. S가 칸 크기 — 인물(32px) 대비 칸을 키워 방이 넓어 보이게 한다
const STG = document.getElementById('stage'), DPR = devicePixelRatio || 1; let PXS = Math.max(1, Math.ceil(STG.clientWidth * DPR / 1000));
let W = Math.max(320, Math.floor(STG.clientWidth * DPR / PXS)), H = Math.max(200, Math.floor((innerHeight - 142) * DPR / PXS)); let VW = W, VH = H; const S = +(q.get('s') || 14), T = 2, FIG = 1.4; // T: 칸 하나의 월드 크기 · FIG: 인물 배율
const SIN = 0.5, COS = Math.sqrt(3) / 2, R2 = Math.SQRT2; let OX = W / 2, OY = H / 2 + 6;
const SHX = 1.3, SHY = -0.12;
const canvas = document.getElementById('c'); canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d'); let image = ctx.createImageData(W, H), viewPix = new Uint32Array(image.data.buffer); let pix = viewPix;
let viewZ = new Float32Array(W * H), bakedPix = new Uint32Array(W * H), bakedZ = new Float32Array(W * H), viewGZ = new Float32Array(W * H); let zb = viewZ, groundZ = viewGZ;
let viewG = new Uint8Array(W * H), viewSh = new Uint8Array(W * H); let ground = viewG, shadow = viewSh;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
const COOL = DARK ? [28, 22, 62] : [46, 38, 84], WARM = [255, 232, 180];
const rgb = (r, g, b) => (255 << 24 | Math.min(255, b | 0) << 16 | Math.min(255, g | 0) << 8 | Math.min(255, r | 0)) >>> 0;
const BG = DARK ? rgb(23, 21, 28) : rgb(239, 231, 214);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, ease = t => t * t * (3 - 2 * t);
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const noise = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = ease(x - ix), fy = ease(y - iy); return lerp(lerp(hash(ix, iy), hash(ix + 1, iy), fx), lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), fx), fy); };
const bayer = (ix, iy) => BAYER[(iy & 3) * 4 + (ix & 3)];
const ramps = new WeakMap();
function rampOf(c) {
  let r = ramps.get(c); if (r) return r;
  const mix = (m, t, k) => rgb(lerp(c[0] * m, t[0], k), lerp(c[1] * m, t[1], k), lerp(c[2] * m, t[2], k));
  r = [mix(.4, COOL, .34), mix(.62, COOL, .18), mix(.84, COOL, .05), mix(1, WARM, 0), mix(1.1, WARM, .22)];
  ramps.set(c, r); return r;
}
// 굽는 동안 어느 픽셀이 어느 칸의 것인지 적는다 (bake.js의 시야)
let cellMap = null, curCell = -1, kindMap = null, curKind = 0; // kindMap: 구울 때 픽셀 종류 (2 = 벽, js/iso/hdbg.js)
const tint = (i, r, g, b) => { const c = pix[i]; pix[i] = rgb((c & 255) * r, (c >> 8 & 255) * g, (c >> 16 & 255) * b); };
const project = (x, y, z) => { const u = (x - y) / R2, v = (x + y) / R2; return { sx: OX + u * S, sy: OY + (v * SIN - z * COS) * S, d: v * COS + z * SIN }; };
const unproject = (sx, sy) => { const u = (sx - OX) / S, v = (sy - OY) / (S * SIN); return { x: (u + v) / R2, y: (v - u) / R2 }; };

function sphere(x, y, z, r, c, mode) {
  const ramp = rampOf(c), p = project(x, y, z), rp = Math.max(r * S, .75);
  const y0 = Math.max(0, Math.floor(p.sy - rp)), y1 = Math.min(H - 1, Math.ceil(p.sy + rp)), x0 = Math.max(0, Math.floor(p.sx - rp)), x1 = Math.min(W - 1, Math.ceil(p.sx + rp));
  for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) {
    const dx = (ix + .5 - p.sx) / rp, dy = (iy + .5 - p.sy) / rp, nn = dx * dx + dy * dy;
    if (nn > 1) continue;
    const nz = Math.sqrt(1 - nn), d = p.d + r * nz, i = iy * W + ix;
    if (d <= zb[i]) continue;
    zb[i] = d; if (cellMap) cellMap[i] = curCell; if (kindMap) kindMap[i] = curKind;
    let l = clamp(-.55 * dx - .6 * dy + .58 * nz, 0, 1);
    if (mode === 'rough') l += (hash(ix, iy) - .5) * .55;
    if (dy > .35) l = Math.max(l, .12 + dy * .24);
    if (mode === 'glow') { pix[i] = ramp[clamp(Math.floor(l * 4.4 + 1.6), 2, 4)]; continue; }
    if (mode === 'solid') { pix[i] = ramp[clamp(Math.floor(l * 4.4 + .2), 1, 4)]; continue; }
    pix[i] = ramp[clamp(Math.floor(l * 4.4 + .2 + (bayer(ix, iy) - .5) * .7), 0, 4)];
  }
}
function capsule(a, b, r0, r1, c, mode = 'solid') {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(1, Math.ceil(len / (Math.min(r0, r1) * .6)));
  for (let k = 0; k <= n; k++) { const t = k / n; sphere(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(r0, r1, t), c, mode); }
}
function castShadow(x, y, z, r, st = 1, dither = 0) {
  const p = project(x + SHX * z, y + SHY * z, 0), rx = r * S * 1.05, ry = rx * SIN + 1;
  const y0 = Math.max(0, Math.floor(p.sy - ry)), y1 = Math.min(H - 1, Math.ceil(p.sy + ry)), x0 = Math.max(0, Math.floor(p.sx - rx)), x1 = Math.min(W - 1, Math.ceil(p.sx + rx));
  for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) {
    const dx = (ix + .5 - p.sx) / rx, dy = (iy + .5 - p.sy) / ry;
    if (dx * dx + dy * dy + (bayer(ix, iy) - .5) * dither > 1) continue;
    const i = iy * W + ix; if (shadow[i] < st) shadow[i] = st;
  }
}
function applyShadows(ref) {
  for (let i = 0; i < pix.length; i++) {
    const s = shadow[i]; if (!s) continue; shadow[i] = 0;
    if (!ground[i] || zb[i] !== ref[i]) continue;
    if (s === 1) tint(i, .54, .52, .72); else tint(i, .36, .34, .56);
  }
}
const EDGE = .28, GRAD = COS / (S * SIN);
function shadeEdges() {
  for (let iy = 1; iy < H - 1; iy++) for (let ix = 1; ix < W - 1; ix++) {
    const i = iy * W + ix, d = zb[i];
    if (d < -1e8 || d === groundZ[i] && ground[i]) continue;
    const a = i - W, b = i + W, c = i - 1, e = i + 1;
    const onG = j => zb[j] < -1e8 || (ground[j] && zb[j] === groundZ[j]);
    if (onG(a) || onG(b) || onG(c) || onG(e)) tint(i, .68, .66, .76);
    else if (d - zb[a] - GRAD > EDGE || d - zb[c] > EDGE) { const p = pix[i]; pix[i] = rgb(lerp(p & 255, WARM[0], .3), lerp(p >> 8 & 255, WARM[1], .3), lerp(p >> 16 & 255, WARM[2], .22)); }
    else if (zb[e] - d > EDGE || zb[b] - GRAD - d > EDGE) tint(i, .74, .72, .82);
  }
}
// 타일 색에 면의 밝기를 얹는다: 어두운 면일수록 보라 쪽으로 (뭉개지지 않게 아주 약한 디더)
function lit(c, k, ix, iy) {
  k = k + (bayer(ix, iy) - .5) * .04; const m = (1 - k) * .3;
  return rgb(lerp((c & 255) * k, COOL[0], m), lerp((c >> 8 & 255) * k, COOL[1], m), lerp((c >> 16 & 255) * k, COOL[2], m));
}
// 벽돌 · 돌 무늬를 가진 상자
function block(x0, y0, z0, x1, y1, z1, c, opt = {}) {
  const ramp = rampOf(c), step = .05, bw = opt.bw || 0, bh = opt.bh || 0;
  const tx = opt.tex;
  const paint = (x, y, z, base, grain, mortar, cut, u, v) => {
    const p = project(x, y, z), ix = p.sx | 0, iy = p.sy | 0;
    if (ix < 0 || iy < 0 || ix >= W || iy >= H) return;
    if (cut != null && hash(ix, iy) > cut) return;
    const i = iy * W + ix; if (p.d <= zb[i]) return;
    zb[i] = p.d; if (cellMap) cellMap[i] = curCell; if (kindMap) kindMap[i] = curKind;
    if (tx) { const c = tx[((v | 0) & 31) * 32 + ((u | 0) & 31)] || tx[((v | 0) & 31) * 32 + (((u | 0) + 9) & 31)] || tx[(((v | 0) + 9) & 31) * 32 + (((u | 0) + 9) & 31)]; if (c) { pix[i] = lit(c, base / 3.5, ix, iy); return; } }
    const k = base + (grain - .5) * .9 + (bayer(ix, iy) - .5) * .45 - (mortar ? 1.1 : 0);
    pix[i] = ramp[clamp(Math.floor(k), 0, 4)];
  };
  const brick = (a, z) => { if (!bh) return false; const row = Math.floor(z / bh), o = row % 2 ? bw / 2 : 0; return z / bh - row < .16 || ((a + o) / bw - Math.floor((a + o) / bw)) < .12; };
  const cutAt = z => (opt.dissolve != null && z < opt.dissolve ? clamp((z - z0) / (opt.dissolve - z0), 0, 1) * 1.1 : null);
  for (let a = x0; a <= x1; a += step) for (let b = y0; b <= y1; b += step) paint(a, b, z1, 3.5 * (opt.topK || 1), noise(a * 3, b * 3), false, null, a / T * 32, b / T * 32);
  for (let a = x0; a <= x1; a += step) for (let z = z0; z <= z1; z += step) paint(a, y1, z, 2.4, noise(a * 2.3, z * 2.3), brick(a, z), cutAt(z), a / T * 32, (z1 - z) / T * 32);
  for (let a = y0; a <= y1; a += step) for (let z = z0; z <= z1; z += step) paint(x1, a, z, 1.3, noise(a * 2.3, z * 2.3), brick(a, z), cutAt(z), a / T * 32, (z1 - z) / T * 32);
}

// ───── 색 ─────
const C = {
  stone: [122, 114, 112], stone2: [106, 100, 104], wall: [136, 124, 112], wallD: [96, 90, 94], earth: [78, 62, 54], moss: [78, 104, 58], mossL: [124, 146, 62],
  steel: [160, 172, 188], steelD: [96, 108, 128], gold: [228, 186, 84], wood: [122, 86, 56], woodL: [166, 126, 82], bone: [226, 218, 194], skin: [226, 178, 138], skinD: [160, 112, 82],
  white: [250, 246, 232], hit: [255, 252, 244], blood: [150, 34, 36], ink: [36, 32, 44],
  red: [190, 62, 52], blue: [62, 96, 176], green: [70, 124, 74], leaf: [92, 146, 70], purple: [112, 72, 170], dark: [58, 50, 72], orange: [226, 116, 46], yellow: [232, 196, 84], cream: [236, 224, 190], teal: [64, 150, 150], fur: [130, 96, 66], furD: [88, 66, 50],
  gob: [120, 160, 70], orc: [92, 128, 76], zom: [132, 150, 112], imp: [190, 66, 56], slime: [96, 176, 110], slime2: [150, 130, 90], mush: [206, 108, 88], gnoll: [168, 128, 76], flame: [255, 190, 80], flameH: [255, 240, 180], gem: [120, 210, 240], eye: [255, 70, 60],
};
