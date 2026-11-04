'use strict';
// 스프라이트: DCSS 불러오기 · 찍기 · 파편 · 피해 숫자
// ───── 스프라이트 층: 픽셀 그림을 수직 판으로 세운다 (깊이는 판의 높이만큼, 벽 · 소품과 바르게 겹친다) ─────
const SPR = q.get('fig') !== 'model', SC = +(q.get('spr') || 1);
const sprites = new Map();
// 그림 → 윤곽선을 두른 픽셀 배열
function pack(iw, ih, draw) {
  const w = iw + 2, h = ih + 2, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); draw(x);
  const d = new Uint32Array(x.getImageData(0, 0, w, h).data.buffer), o = new Uint32Array(w * h), ink = rgb(...C.ink);
  const on = (a, b) => a >= 0 && b >= 0 && a < w && b < h && (d[b * w + a] >>> 24) > 110;
  for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) { if (on(a, b)) o[b * w + a] = d[b * w + a] | 0xff000000; else if (on(a + 1, b) || on(a - 1, b) || on(a, b + 1) || on(a, b - 1)) o[b * w + a] = ink; }
  // 맨 아래 불투명 줄을 발끝으로 삼는다
  let foot = h - 1; find: for (; foot > 0; foot--) for (let a = 0; a < w; a++) if (o[foot * w + a]) break find;
  return { w, h, px: o, foot };
}
// DCSS: 직업은 부품을 겹쳐 인형으로, 몬스터는 한 장 (?art=dcss). 한 장 그림을 고쳐 대기 · 걷기 · 맞기 · 공격 프레임을 만든다
const DCSS = q.get('art') !== 'old', dolls = new Map(), PAD = 3, INKT = rgb(44, 38, 54);
const DNG = DCSS && q.get('dng') !== 'proc', TEX = {};
function loadTex() {
  G.DCSS.dng[2].f = G.DCSS.dng[0].f.slice(); // 오크 타일은 벽 그림이라 바닥에 깔면 구멍이 나고 시끄럽다
  const names = G.DCSS.dng.flatMap(z => z.f.concat(z.w)); const floors = new Set(G.DCSS.dng.flatMap(z => z.f));
  return Promise.all(names.map(n => new Promise(r => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0); const d = new Uint32Array(x.getImageData(0, 0, 32, 32).data.buffer), o = new Uint32Array(1024); for (let i = 0; i < 1024; i++) if ((d[i] >>> 24) > 110) o[i] = tone(d[i]);
    // 바닥은 밝기를 맞춘다: 어두운 타일 위에서도 인물이 읽히게
    if (floors.has(n)) { let L = 0; for (let i = 0; i < 1024; i++) L += (o[i] & 255) * .3 + (o[i] >> 8 & 255) * .59 + (o[i] >> 16 & 255) * .11; const K = clamp(112 / Math.max(1, L / 1024), .8, 2.1); for (let i = 0; i < 1024; i++) if (o[i]) o[i] = rgb((o[i] & 255) * K, (o[i] >> 8 & 255) * K, (o[i] >> 16 & 255) * K); }
    TEX[n] = o; r(); }; im.onerror = () => r(); im.src = 'dcss/' + n + '.png'; })));
}
// 배경 색상표에 맞춘다: 채도를 눌러 어두운 곳은 보라로, 밝은 곳은 노랑으로, 새까만 선은 먹색으로
function tone(c) {
  let r = c & 255, g = c >> 8 & 255, b = c >> 16 & 255; const l = r * .3 + g * .59 + b * .11, sat = .74;
  r = lerp(l, r, sat); g = lerp(l, g, sat); b = lerp(l, b, sat);
  const k = (1 - l / 255) * .3, w = (l / 255) * .12;
  r = lerp(lerp(r, COOL[0], k), WARM[0], w); g = lerp(lerp(g, COOL[1], k), WARM[1], w); b = lerp(lerp(b, COOL[2], k), WARM[2], w);
  if (l < 34) { r = lerp(r, 44, .75); g = lerp(g, 38, .75); b = lerp(b, 54, .75); }
  return rgb(r, g, b);
}
function rawOf(ims, size = 32) {
  const w = size + PAD * 2, c = document.createElement('canvas'); c.width = c.height = w;
  const x = c.getContext('2d', { willReadFrequently: true }); for (const im of ims) if (im) x.drawImage(im, PAD, PAD);
  const d = new Uint32Array(x.getImageData(0, 0, w, w).data.buffer), o = new Uint32Array(w * w);
  for (let i = 0; i < o.length; i++) if ((d[i] >>> 24) > 110) o[i] = tone(d[i]);
  return { w, h: w, px: o };
}
function outline(px, w, h) {
  const o = new Uint32Array(w * h), on = (a, b) => a >= 0 && b >= 0 && a < w && b < h && px[b * w + a];
  for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) { if (px[b * w + a]) o[b * w + a] = px[b * w + a]; else if (on(a + 1, b) || on(a - 1, b) || on(a, b + 1) || on(a, b - 1)) o[b * w + a] = INKT; }
  return o;
}
function bboxOf(R) { let t = 1e9, B = -1, L = 1e9, r2 = -1; for (let y = 0; y < R.h; y++) for (let x = 0; x < R.w; x++) if (R.px[y * R.w + x]) { if (y < t) t = y; if (y > B) B = y; if (x < L) L = x; if (x > r2) r2 = x; } return { t, b: B, l: L, r: r2, cx: (L + r2) / 2 }; }
// fn(x, y) → [dx, dy]: 픽셀을 옮긴다 (윤곽선은 옮긴 뒤에)
function warp(R, fn) { const o = new Uint32Array(R.w * R.h); for (let y = 0; y < R.h; y++) for (let x = 0; x < R.w; x++) { const c = R.px[y * R.w + x]; if (!c) continue; const [dx, dy] = fn(x, y), nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < R.w && ny < R.h) o[ny * R.w + nx] = c; } return outline(o, R.w, R.h); }
// 찌그러뜨리기: 발끝 기준
function squash(R, B, ky) { const o = new Uint32Array(R.w * R.h), kx = 1 / Math.sqrt(ky); for (let y = 0; y < R.h; y++) for (let x = 0; x < R.w; x++) { const sy = Math.round(B.b - (B.b - y) / ky), sx = Math.round(B.cx + (x - B.cx) / kx); if (sx >= 0 && sy >= 0 && sx < R.w && sy < R.h && sy <= B.b) o[y * R.w + x] = R.px[sy * R.w + sx]; } return outline(o, R.w, R.h); }
function framesOf(R, style) {
  const B = bboxOf(R), H0 = B.b - B.t, hip = B.b - Math.round(H0 * .36), head = B.t + Math.round(H0 * .34), up = y => y < hip;
  const fr = {};
  if (style === 'blob') {
    fr.idle = [1, .95, .9, .95].map(k => squash(R, B, k)); fr.run = [1, .82, 1.1, .9].map(k => squash(R, B, k)); fr.hit = [squash(R, B, .72)]; fr.w0 = [squash(R, B, .78)]; fr.w1 = [squash(R, B, 1.2)];
  } else if (style === 'float') {
    fr.idle = [0, -1, -2, -1].map(d => warp(R, () => [0, d])); fr.run = [0, -2, -3, -1].map(d => warp(R, (x, y) => [y > hip ? Math.sign(x - B.cx) : 0, d])); fr.hit = [warp(R, () => [2, -1])]; fr.w0 = [warp(R, () => [1, -2])]; fr.w1 = [warp(R, () => [-3, 0])];
  } else {
    // 두 발 · 네 발: 그림은 그대로 두고 몸 전체가 움직인다 (탁자 위 말처럼). 깡충 뛰기는 drawEnt 쪽에서
    const same = [warp(R, () => [0, 0])];
    for (const k of ['idle', 'run', 'hit', 'w0', 'w1']) fr[k] = same;
  }
  return { w: R.w, h: R.h, foot: B.b + 1, fr, cx: B.cx, top: B.t, hop: style === 'biped' || style === 'quad' };
}
const HOP_D = 1.5, HOP_H = 5; // 한 번 뛸 때 칸 수 · 높이(px)
const STYLE = n => (/점액|버섯/.test(n) ? 'blob' : /망령/.test(n) ? 'float' : /늑대|곰|초트|수호자/.test(n) ? 'quad' : 'biped');
const OFF = { idle: [0, 0], run: [0, 0], hit: [2, 1], w0: [1, 0], w1: [-2, 1] };
function layered(key, parts, style = 'biped') {
  let sp = dolls.get(key); if (sp !== undefined) return sp;
  dolls.set(key, null);
  Promise.all(parts.map(n => new Promise(r => { const im = new Image(); im.onload = () => r([n, im]); im.onerror = () => r([n, null]); im.src = 'dcss/' + n + '.png'; }))).then(L => {
    const body = rawOf(L.filter(([n]) => !n.startsWith('p_hand1')).map(x => x[1])), out = framesOf(body, style), wp = L.find(([n]) => n.startsWith('p_hand1'));
    if (wp && wp[1]) { const Wp = rawOf([wp[1]]), B = bboxOf(Wp), px = outline(Wp.px, Wp.w, Wp.h); out.weapon = { w: Wp.w, h: Wp.h, px, foot: B.b + 1, gx: B.cx, gy: B.b - Math.round((B.b - B.t) * .24) }; }
    dolls.set(key, out);
  });
  return null;
}
function dcssOf(e) {
  if (e.kind !== 'mon') { const c = (e.merc || f.leader).cls; return layered('c_' + c, G.DCSS.cls[c] || G.DCSS.cls.dragoon); }
  const n = e.n || '', hit = G.DCSS.mon.find(x => n.includes(x[0])), art = n === '히드라' ? 'm_hydra' + Math.min(5, e.heads ?? 5) : hit ? hit[1] : 'm_human'; return layered('m_' + art + (e.hand || ''), [art].concat(e.hand || []), STYLE(n)); // 히드라는 머리 수대로 (그림은 5까지)
}
function sprite(key, v = 0) {
  const n = G.ARTSET[key]; if (!n) return null;
  const file = n > 1 ? `${key}_${((v % n) + n) % n}` : key;
  let sp = sprites.get(file);
  if (sp === undefined) {
    sprites.set(file, null); const im = new Image();
    im.onload = () => sprites.set(file, pack(im.naturalWidth, im.naturalHeight, x => x.drawImage(im, 1, 1)));
    im.src = '../../assets/art/' + file + '.png'; return null;
  }
  return sp;
}
const GRAYC = c => { const r = c & 255, g = c >> 8 & 255, b = c >> 16 & 255, l = r * .3 + g * .59 + b * .11; return rgb(lerp(r, l, .75) * .8, lerp(g, l, .75) * .78, lerp(b, l, .75) * .86); };
const FLASH = rgb(255, 252, 240);
function blit(sp, sx, sy, d0, o = {}) {
  const sc = o.sc || 1, L = Math.round(sx - sp.w * sc / 2), B = Math.round(sy);
  for (let j = 0; j <= sp.foot; j++) {
    const up = (sp.foot - j) * sc, d = d0 + up / (COS * S) * SIN + .06;
    for (let i = 0; i < sp.w; i++) {
      const c = sp.px[j * sp.w + (o.flip ? sp.w - 1 - i : i)]; if (!c) continue;
      const col = o.flash ? (c === rgb(...C.ink) ? c : FLASH) : o.gray ? GRAYC(c) : c;
      for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) { const ix = L + i * sc + a, iy = B - up - b; if (ix < 0 || ix >= W || iy < 0 || iy >= H) continue; const k = iy * W + ix; if (d <= zb[k]) continue; zb[k] = d; pix[k] = col; }
    }
  }
}
// 회전해 찍기 (무기 · 화살 · 누운 몸)
function blitRot(sp, cx, cy, ang, sc, d, o = {}) {
  const ca = Math.cos(ang), sa = Math.sin(ang), px = o.px == null ? sp.w / 2 : o.px, py = o.py == null ? sp.h * .85 : o.py, R = Math.ceil(Math.hypot(sp.w, sp.h) * sc);
  for (let b = -R; b <= R; b++) for (let a = -R; a <= R; a++) {
    const u = (a * ca + b * sa) / sc + px, v = (-a * sa + b * ca) / sc + py, iu = Math.floor(u), iv = Math.floor(v);
    if (iu < 0 || iv < 0 || iu >= sp.w || iv >= sp.h) continue;
    const c = sp.px[iv * sp.w + (o.flip ? sp.w - 1 - iu : iu)]; if (!c) continue;
    const ix = Math.round(cx) + a, iy = Math.round(cy) + b; if (ix < 0 || ix >= W || iy < 0 || iy >= H) continue;
    const k = iy * W + ix; if (d <= zb[k]) continue; zb[k] = d; pix[k] = o.flash ? (c === rgb(...C.ink) ? c : FLASH) : o.gray ? GRAYC(c) : c;
  }
}
// 파편: 화면 좌표로 튄다
const parts = [];
const spark = (x, y, n, cols, sp = 60, g = 120, life = .4) => { for (let i = 0; i < n && parts.length < 400; i++) { const a = Math.random() * 6.283, v = sp * (.35 + Math.random() * .8); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * .3, g, t: life * (.5 + Math.random() * .7), c: cols[i % cols.length] }); } };
function drawParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t -= dt; if (p.t <= 0) { parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; const ix = p.x | 0, iy = p.y | 0; if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue; pix[iy * W + ix] = p.c; if (p.t > .18 && ix + 1 < W) pix[iy * W + ix + 1] = p.c; }
}
// 픽셀 숫자
const PIXF = Object.assign({ '+': '000010111010000', '-': '000000111000000' }, {});
const nums = [];
function drawNums() {
  const n = now();
  for (let i = nums.length - 1; i >= 0; i--) {
    const u = nums[i], q = (n - u.t0) / 850; if (q >= 1) { nums.splice(i, 1); continue; }
    const pop = u.bump && n - u.bump < 120 ? 3 : 2, str = u.s, wid = str.length * 4 * pop, X = Math.round(u.x - wid / 2), Y = Math.round(u.y - 16 * Math.min(1, q * 2.2) - 6 * q);
    const glyph = ch => DIG[ch] || PIXF[ch];
    const put = (dx, dy, c) => [...str].forEach((ch, k) => { const d = glyph(ch); if (!d) return; for (let j = 0; j < 5; j++) for (let a = 0; a < 3; a++) if (d[j * 3 + a] === '1') for (let e = 0; e < pop; e++) for (let f2 = 0; f2 < pop; f2++) { const ix = X + k * 4 * pop + a * pop + e + dx, iy = Y + j * pop + f2 + dy; if (ix >= 0 && iy >= 0 && ix < W && iy < H) pix[iy * W + ix] = c; } });
    const ink = rgb(...C.ink); for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) put(a, b, ink);
    if (q < .8 || Math.floor(q * 40) % 2) put(0, 0, u.c);
  }
}
const PROJC = { fx_flame: [C.flame, C.orange], fx_ice: [[170, 225, 255], [90, 150, 230]], fx_zap: [[220, 190, 255], C.purple], fx_holy: [[255, 240, 170], C.gold] };
