'use strict';
// 복셀 층 (2026-11-18): px_lab.html '던전 층 시험'에서 정한 그림 방식을 실제 게임 판(bake.js의 big)에 굽는다.
//  · 타일 하나 = 복셀 6×6 (복셀 한 변 = 월드 T/6). 바닥 윗면이 월드 z=0이라 인형 · 그림자 · 범위 표시 · 깊이는 옛 판과 그대로 맞는다.
//  · 판에는 흑백만 굽는다(톤 · 디더 · 구석 음영 · 외곽선). 픽셀마다 색 · 면 · 음영 · 빛남을 남겨 두고,
//    매 프레임 파티 둘레(지금 보이는 칸)만 빛을 계산해 색을 입힌다 — 들고 다니는 등불 + 그 안의 횃불 · 화로.
//  · 소품(상자 · 장면 소품 · 함정 · 무덤): sphere · capsule · block 호출을 같은 크기의 복셀로 모아 같은 방식으로 그린다 (매 프레임).
//  · 방 장식은 지도 생성기의 장식 이름 그대로 (기둥 · 상자 · 통 · 항아리 · 석상 · 양탄자 · 제단 · 탁자 · 깔개 · 계단 · 웅덩이 …).
//  · ?vox=0 이면 옛 그림 (DCSS 타일 + 선 그림 배경).
const VOXON = q.get('vox') !== '0';
const VOX = (() => {
  const VPT = 6, VS = T / VPT, FLOOR = 3, WH = FLOOR + 11, WLOW = FLOOR + 2, ZZ = WH + 2;
  const LR = 48, VR = 9; // 빛 반지름(복셀) · 시야(타일)
  const NORM = [[0, 0, 1], [0, 1, 0], [1, 0, 0]];
  const BAY = BAYER.map(v => v - .5);
  const hs = (a, b, c = 0) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s); };
  const tint = (h, k) => { const r = Math.min(255, ((h >> 16) & 255) * k), g = Math.min(255, ((h >> 8) & 255) * k), b = Math.min(255, (h & 255) * k); return (r << 16) | (g << 8) | b; };
  const mix = (a, b, t) => { const o = [16, 8, 0].map(s => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t)); return (o[0] << 16) | (o[1] << 8) | o[2]; };
  const hex = c => (Math.min(255, c[0] | 0) << 16) | (Math.min(255, c[1] | 0) << 8) | Math.min(255, c[2] | 0);
  // 빛이 없는 곳: 흑백 (판과 빛 덮개가 같은 식 — 경계가 이어진다)
  const grayLin = (r0, g0, b0, a, nr) => { const up = nr === 0 ? 1.15 : .9, l = (.3 * r0 + .59 * g0 + .11 * b0) * .5 * a * up; return [l * .86, l * .9, l]; };
  // 톤 · 디더(판 좌표 기준) → 색 하나
  const fin = (r, g, b, X, Y) => {
    r = r / (1 + r * .35) * 1.3; g = g / (1 + g * .35) * 1.3; b = b / (1 + b * .35) * 1.3;
    const dz = BAY[(Y & 3) * 4 + (X & 3)], LV = 14;
    return rgb(Math.max(0, Math.floor(r * LV + dz + .5) / LV * 255), Math.max(0, Math.floor(g * LV + dz + .5) / LV * 255), Math.max(0, Math.floor(b * LV + dz + .5) / LV * 255));
  };

  // ── 복셀 부피: 재질 0 빈칸 · 1 돌 같은 것 · 2 빛남 · 3 물
  function Vol(X, Y, Z) {
    const VX = new Uint8Array(X * Y * Z), VC = new Uint32Array(X * Y * Z), vi = (x, y, z) => (z * Y + y) * X + x, inb = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < X && y < Y && z < Z;
    return { X, Y, Z, VX, VC, vi,
      set(x, y, z, c, m = 1) { x |= 0; y |= 0; z |= 0; if (inb(x, y, z)) { VX[vi(x, y, z)] = m; VC[vi(x, y, z)] = c; } },
      clr(x, y, z) { x |= 0; y |= 0; z |= 0; if (inb(x, y, z)) VX[vi(x, y, z)] = 0; },
      solid(x, y, z) { if (!inb(x, y, z)) return false; const m = VX[vi(x, y, z)]; return m === 1 || m === 3; },
      has(x, y, z) { return inb(x, y, z) && VX[vi(x, y, z)] !== 0; } };
  }

  let V = null, X0 = 0, Y0 = 0, mw = 0, mh = 0, kind = null, tall = null, lights = [], A = null;
  const K = (x, y) => (x < 0 || y < 0 || x >= mw || y >= mh ? 0 : kind[y * mw + x]);
  // 탐사 층이면 지도 생성기의 배치(방 칸 · 복도 칸 · 장식)를 쓴다. 시험 층은 타일 지도만
  // 지도 1칸 = 타일 KK×KK (G.Floor.K — 2026-11-19 2 → 3. 2로 박혀 있어서 3이 된 뒤 탐사 층의 방 · 장식 · 구역 재질을 못 읽었다)
  const KC = () => (G.Floor && G.Floor.K) || 2;
  const runOf = m => { const R0 = typeof CRAWL !== 'undefined' && CRAWL.st && CRAWL.st.map, KK = KC(); return R0 && R0._lay && R0._lay.COLS * KK === m.w && R0._lay.ROWS * KK === m.h ? R0 : null; };

  // 구역 재질 (2026-11-19 — 구역마다 달라 보이게): 판석 · 복도 조약돌 · 벽돌 · 줄눈 · 낮은 벽 윗면 · 이끼. 고블린 굴은 RUN.ZONES shape.cave로 방 · 복도를 모두 동굴로
  const PAL0 = { fl: [0x6e6254, 0x5a6058], cor: [0x5e5850, 0x6a6052], wall: [0x7a6c5c, 0x6c6460], joint: 0x4a4038, cap: 0x80766a, moss: true };
  const PAL = { hold: { fl: [0x686c74, 0x5a5e68], cor: [0x585a62, 0x64666e], wall: [0x707480, 0x626672], joint: 0x383a44, cap: 0x7c808a, moss: false } }; // 드워프 폐성채: 차가운 회청색 다듬은 돌
  // ── 층 세우기
  function build(m) {
    mw = m.w; mh = m.h; kind = new Uint8Array(mw * mh); tall = new Uint8Array(mw * mh); const cave = new Uint8Array(mw * mh);
    const R0 = runOf(m), L = R0 && R0._lay, rooms = [], KK = KC(); // rooms: [{ tiles, type }]
    const Zs = R0 && typeof RUN !== 'undefined' && RUN.ZONES ? (RUN.ZONES.find(z => z.id === R0.zone) || {}).shape : null, allCave = !!(Zs && Zs.cave), P = (R0 && PAL[R0.zone]) || PAL0;
    if (L) {
      for (const id in L.room) { const r = L.room[id], tiles = []; if (r.tmap) { r.tmap.forEach((row, j) => { for (let i = 0; i < row.length; i++) { if (row[i] === ' ') continue; const tx = r.x * KK + i, ty = r.y * KK + j, k = ty * mw + tx; tiles.push([tx, ty]); if (isFloor(m, tx, ty)) { kind[k] = 1; if (r.kind === 'cave' || allCave) cave[k] = 1; } } }); rooms.push({ tiles, type: R0.nodes[id] && R0.nodes[id].type, decor: r.decor || [] }); continue; } // 손으로 짠 방: 타일 그대로
        for (const [x, y] of r.cells) for (let j = 0; j < KK; j++) for (let i = 0; i < KK; i++) { const k = (y * KK + j) * mw + x * KK + i; tiles.push([x * KK + i, y * KK + j]); if (isFloor(m, x * KK + i, y * KK + j)) { kind[k] = 1; if (r.kind === 'cave' || allCave) cave[k] = 1; } } rooms.push({ tiles, type: R0.nodes[id] && R0.nodes[id].type, decor: r.decor || [] }); }
      for (const id in L.cor) for (const [x, y] of L.cor[id].cells) for (let j = 0; j < KK; j++) for (let i = 0; i < KK; i++) { const k = (y * KK + j) * mw + x * KK + i; if (!kind[k] && isFloor(m, x * KK + i, y * KK + j)) { kind[k] = 2; if (allCave) cave[k] = 1; } }
    }
    for (const r of L ? [] : m.rooms || []) { const tiles = []; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (isFloor(m, x, y)) { kind[y * mw + x] = 1; tiles.push([x, y]); } rooms.push({ tiles, type: null, decor: [] }); }
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (!kind[y * mw + x] && isFloor(m, x, y)) kind[y * mw + x] = 2;
    const X = mw * VPT, Y = mh * VPT, v = V = Vol(X, Y, ZZ); lights = [];
    // 바닥: 방은 타일마다 판석 하나(타일 경계가 줄눈 = 칸이 읽힌다), 동굴은 흙 · 자갈, 복도는 작은 조약돌
    for (let ty = 0; ty < mh; ty++) for (let tx = 0; tx < mw; tx++) {
      const k = K(tx, ty); if (!k) continue; const cv = cave[ty * mw + tx];
      if (G.Grid.at(m, tx, ty) === '~') { for (let lx = 0; lx < VPT; lx++) for (let ly = 0; ly < VPT; ly++) { const x = tx * VPT + lx, y = ty * VPT + ly; v.set(x, y, 0, 0x2a2420); v.set(x, y, 1, tint(0x1e4a5a, .9 + hs(x, y) * .15), 3); } continue; } // 물 칸(손으로 짠 방의 '~'): 바닥보다 한 단 낮은 물 (pool 장식과 같은 재질)
      for (let lx = 0; lx < VPT; lx++) for (let ly = 0; ly < VPT; ly++) {
        const x = tx * VPT + lx, y = ty * VPT + ly; v.set(x, y, 0, 0x2a2420); v.set(x, y, 1, 0x3a322a);
        if (cv) { const pb = hs(x, y, 13) < .08; v.set(x, y, 2, pb ? tint(0x8a8070, .9 + hs(x, y) * .2) : tint(mix(0x5a4a38, 0x4a4030, hs(x >> 2, y >> 2)), .85 + hs(x, y, 1) * .2)); continue; }
        if (k === 2) { const j = lx % 3 === 0 || ly % 3 === 0; if (j && hs(x, y, 3) < .7) continue; v.set(x, y, 2, tint(mix(P.cor[0], P.cor[1], hs(x / 3 | 0, y / 3 | 0, 4)), .85 + hs(x / 3 | 0, y / 3 | 0, 5) * .25)); continue; }
        if (lx === 0 || ly === 0) continue;
        const t = .82 + hs(tx, ty) * .3, base = mix(P.fl[0], P.fl[1], hs(ty, tx, 3)), crack = hs(x, y, 9) < .03;
        v.set(x, y, 2, tint(crack ? 0x2e2822 : base, crack ? 1 : t * (.93 + hs(x, y) * .14)));
      }
    }
    // 벽: 바닥에 닿은 빈 타일. 바닥 앞에 선 벽(바닥이 -x · -y 쪽 세 타일 안)은 낮게 잘라 안이 보이게, 나머지(뒤쪽 벽)는 높게
    for (let ty = 0; ty < mh; ty++) for (let tx = 0; tx < mw; tx++) {
      if (K(tx, ty)) continue; let near = false, nearCave = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (K(tx + dx, ty + dy)) { near = true; if (cave[(ty + dy) * mw + tx + dx]) nearCave = true; }
      if (!near) continue;
      let front = false; for (let dy = -3; dy <= 0; dy++) for (let dx = -3; dx <= 0; dx++) if ((dx || dy) && K(tx + dx, ty + dy)) front = true;
      const hi = !front, h = hi ? WH : WLOW; if (hi) tall[ty * mw + tx] = 1;
      for (let lx = 0; lx < VPT; lx++) for (let ly = 0; ly < VPT; ly++) {
        const x = tx * VPT + lx, y = ty * VPT + ly, hh = nearCave ? h - Math.floor(hs(x >> 1, y >> 1, 7) * (hi ? 4 : 2)) : h;
        for (let z = 0; z < hh; z++) {
          if (nearCave) { v.set(x, y, z, tint(mix(0x6a5a48, 0x564a40, hs(x >> 1, y >> 1, z >> 1)), .8 + hs(x, y, z) * .25)); continue; }
          const row = (z / 3) | 0, off = row % 2 ? 2 : 0, joint = z % 3 === 0 || (x + off) % 5 === 0 || (y + off) % 5 === 0;
          const id = [Math.floor((x + off) / 5), Math.floor((y + off) / 5), row], cap = !hi && z === hh - 1, moss = P.moss && z < 5 && hs(x, y, z + 40) < .2 - z * .03;
          v.set(x, y, z, cap ? tint(P.cap, .95 + hs(x, y) * .1) : joint ? tint(P.joint, .9 + hs(x, y, z) * .15) : moss ? tint(0x4a5a30, .85 + hs(x, z) * .3) : tint(mix(P.wall[0], P.wall[1], hs(...id, 7)), (.78 + hs(...id, 2) * .32) * (.94 + hs(x, y, z) * .1)));
        }
      }
    }
    decorate(v, rooms, R0);
  }

  // ── 장식 (지도 생성기 이름 그대로). 좌표: 방 칸(타일 둘) = 복셀 12, 장식 원점 + 6이 칸 가운데
  function decorate(v, rooms, R0) {
    const box = (x0, y0, z0, x1, y1, z1, f) => { for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) { const c = f(x, y, z); if (c != null) v.set(x, y, z, c); } };
    const cyl = (cx, cy, r, z0, z1, f) => { for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) if (Math.hypot(x + .5 - cx, y + .5 - cy) <= r) for (let z = z0; z < z1; z++) { const c = f(x, y, z); if (c != null) v.set(x, y, z, c); } };
    const glow = (x, y, z, c) => v.set(x, y, z, c, 2);
    const pillar = (cx, cy, h, broken) => { for (let z = 0; z < h; z++) { const r = z < 2 ? 4.3 : z < 3 ? 3.7 : z >= h - 2 && !broken ? 4.2 : z === h - 3 && !broken ? 3.6 : 3.1; for (let x = Math.floor(cx - 5); x <= cx + 5; x++) for (let y = Math.floor(cy - 5); y <= cy + 5; y++) { const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d > r || (d > r - 1 && hs(x, y, z) < .12) || (broken && z > h - 5 && hs(x, y, 11) * 5 < z - (h - 5))) continue; const flute = Math.abs(Math.sin(Math.atan2(y + .5 - cy, x + .5 - cx) * 6)) < .25 && z > 2 && z < h - 3; v.set(x, y, FLOOR + z, tint(0x9a9488, (flute ? .82 : 1) * (.9 + hs(x, y, z) * .15))); } } };
    const rubble = (cx, cy, n, R, seed = 0) => { for (let k = 0; k < n; k++) { const a = hs(k, 1, seed) * 6.28, r = 2 + hs(k, 2, seed) * R, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * .8, s = hs(k, 3, seed) < .3 ? 2 : 1; let z = FLOOR; while (v.has(x | 0, y | 0, z) && z < FLOOR + 4) z++; for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) for (let q2 = 0; q2 < s; q2++) v.set(x + i, y + j, z + q2, tint(0x8a847a, .8 + hs(k, i, j) * .25)); } };
    const bones = pts => { for (const [x, y] of pts) v.set(x, y, FLOOR, 0xe0d8c4); };
    const skull = (x, y) => { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) v.set(x + i, y + j, FLOOR + k, 0xe8e0cc); v.set(x + 1, y + 1, FLOOR + 1, 0x302820); v.set(x, y + 1, FLOOR + 1, 0x302820); };
    const brazier = (bx, by) => { const z0 = FLOOR; for (let z = 0; z < 6; z++) for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2], [0, 0]]) if (z < 5 || !dx) v.set(bx + dx, by + dy, z0 + z, 0x2e2a2c); for (let x = bx - 4; x <= bx + 4; x++) for (let y = by - 4; y <= by + 4; y++) { const d = Math.hypot(x - bx, y - by); if (d > 4.2) continue; v.set(x, y, z0 + 6, 0x3a3436); if (d > 3.2) v.set(x, y, z0 + 7, tint(0x4a4044, 1 + hs(x, y) * .2)); else glow(x, y, z0 + 7, hs(x, y, 1) < .55 ? 0xff7020 : 0xffb040); } lights.push({ x: bx + .5, y: by + .5, z: z0 + 11, c: [1, .6, .28], i: 3.4, r: 19 }); };
    const D = {
      pillar(x, y) { pillar(x + 4, y + 4, WH - FLOOR); },
      boulder(x, y) { const cx = x + 4, cy = y + 4, h = 7 + Math.floor(hs(x, y, 2) * 5); for (let z = 0; z < h; z++) { const r = 3.9 * (1 - z / (h + 1)) + .9; cyl(cx + (hs(x, z, 1) - .5) * 1.2, cy + (hs(y, z, 3) - .5) * 1.2, r, FLOOR + z, FLOOR + z + 1, (a, b, zz) => tint(mix(0x6a5a48, 0x52463c, hs(a >> 1, b >> 1, zz >> 1)), .78 + hs(a, b, zz) * .28)); } }, // 바위 · 종유석 (손으로 짠 방의 'O')
      brokenpillar(x, y) { pillar(x + 4, y + 4, 7, true); rubble(x + 4, y + 4, 14, 4, x + y); },
      rubble(x, y) { rubble(x + 4, y + 4, 22, 4, x * 3 + y); },
      debris(x, y) { rubble(x + 4, y + 4, 12, 3, x + y * 5); },
      bones(x, y) { bones([[x + 2, y + 3], [x + 3, y + 3], [x + 4, y + 4], [x + 5, y + 4]]); if (hs(x, y) < .5) skull(x + 4, y + 1); },
      web(x, y) { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if (hs(x + i, y + j, 5) < .2) v.set(x + i, y + j, FLOOR, 0xb8b4ac); },
      crate(x, y) { box(x + 1, y + 1, FLOOR, x + 7, y + 7, FLOOR + 6, (a, b, z) => { const e = (a === x + 1 || a === x + 6) + (b === y + 1 || b === y + 6) + (z === FLOOR || z === FLOOR + 5) >= 2; return e ? 0x5a3a1e : tint(0x9a6a38, (z % 2 ? .92 : 1.02) * (.92 + hs(a, b, z) * .1)); }); },
      barrel(x, y) { cyl(x + 4, y + 4, 2.7, FLOOR, FLOOR + 8, (a, b, z) => (z === FLOOR + 1 || z === FLOOR + 6 ? 0x3a3438 : z === FLOOR + 7 ? 0x8a5a30 : tint(0x7a4a28, .9 + hs(a, b, z) * .12))); },
      urn(x, y) { for (let z = 0; z < 7; z++) { const r = [1.6, 2.4, 2.8, 2.8, 2.3, 1.4, 1.8][z]; cyl(x + 4, y + 4, r, FLOOR + z, FLOOR + z + 1, (a, b) => tint(0x9a5a3a, (z === 5 ? .8 : 1) * (.9 + hs(a, b, z) * .12))); } },
      statue(x, y) { box(x + 1, y + 1, FLOOR, x + 7, y + 7, FLOOR + 3, (a, b, z) => tint(0xa8a090, .9 + hs(a, b, z) * .1)); cyl(x + 4, y + 4, 1.8, FLOOR + 3, FLOOR + 10, (a, b, z) => tint(0x9c9a94, .9 + hs(a, b, z) * .12)); cyl(x + 4, y + 4, 1.4, FLOOR + 10, FLOOR + 12, () => 0xa4a29c); box(x + 2, y + 3, FLOOR + 7, x + 7, y + 5, FLOOR + 8, () => 0x9c9a94); },
      rug(x, y) { box(x - 2, y, FLOOR, x + 10, y + 8, FLOOR + 1, (a, b) => { if (v.has(a, b, FLOOR)) return null; const rim = a === x - 2 || a === x + 9 || b === y || b === y + 7; return rim ? 0xc8a040 : tint((a + b) % 4 < 2 ? 0x7a2424 : 0x6a1e2a, .95 + hs(a, b) * .1); }); },
      altar(x, y) { box(x, y + 1, FLOOR, x + 8, y + 7, FLOOR + 5, (a, b, z) => tint(z === FLOOR + 4 ? 0xc8bca4 : 0xa89a80, .9 + hs(a, b, z) * .12)); for (const [a, b] of [[x + 1, y + 2], [x + 6, y + 5]]) { box(a, b, FLOOR + 5, a + 1, b + 1, FLOOR + 7, () => 0xe8dcc0); glow(a, b, FLOOR + 7, 0xffd080); } lights.push({ x: x + 4, y: y + 4, z: FLOOR + 11, c: [1, .82, .52], i: 1.2, r: 8 }); },
      chest(x, y) { box(x, y + 1, FLOOR, x + 8, y + 6, FLOOR + 5, (a, b, z) => { const band = a === x + 2 || a === x + 5; return band ? 0x50484a : tint(0x7a4a28, (z === FLOOR + 4 ? 1.12 : 1) * (b % 2 ? .92 : 1.02) * (.92 + hs(a, b, z) * .1)); }); v.set(x + 3, y + 5, FLOOR + 3, 0xd8b040); v.set(x + 4, y + 5, FLOOR + 3, 0xd8b040); },
      table(x, y) { box(x - 1, y + 1, FLOOR, x + 9, y + 7, FLOOR + 5, (a, b, z) => { const leg = (a === x - 1 || a === x + 8) && (b === y + 1 || b === y + 6); return z < FLOOR + 4 && !leg ? null : tint(0x6a4428, .92 + hs(a, b) * .1); }); },
      bedroll(x, y) { box(x + 1, y + 2, FLOOR, x + 8, y + 6, FLOOR + 1, (a, b) => tint(a < x + 3 ? 0xb8a888 : 0x4a6a5a, .92 + hs(a, b) * .1)); },
      stairs(x, y) { for (let a = x; a < x + 8; a++) for (let b = y; b < y + 8; b++) for (let z = 0; z < FLOOR; z++) v.clr(a, b, z); for (let s = 0; s < 3; s++) box(x, y + s * 2 + 1, 0, x + 8, y + s * 2 + 3, FLOOR - s, (a, b, z) => tint(0x8a8070, (z === FLOOR - s - 1 ? 1.05 : .85) * (.9 + hs(a, b, z) * .1))); },
      pool(x, y, o) { const r = (o.r || 1.2) * VPT * KC(), cx = x + 4, cy = y + 4; for (let a = Math.floor(cx - r - 2); a <= cx + r + 2; a++) for (let b = Math.floor(cy - r - 2); b <= cy + r + 2; b++) { const d = Math.hypot(a + .5 - cx, b + .5 - cy); if (d > r + 1 || !K(Math.floor(a / VPT), Math.floor(b / VPT))) continue; for (let z = 1; z < 5; z++) v.clr(a, b, z); if (d > r) for (let z = 1; z < 4; z++) v.set(a, b, z, tint(0xa09888, .9 + hs(a, b, z) * .12)); else v.set(a, b, 1, tint(0x1e4a5a, .9 + hs(a, b) * .15), 3); } lights.push({ x: cx, y: cy, z: 6, c: [.35, .65, 1], i: 1.3, r: 11 }); },
    };
    // 장식 자리: 장식 함수는 (원점 + 4)를 가운데로 그린다. 방 칸 좌표(o.x · o.y)면 그 칸 가운데, 타일 좌표(o.tx · o.ty, 크기 o.s 타일)면 그 타일 묶음 가운데
    const C2 = VPT * KC();
    const put = o => { const f = D[o.k]; if (!f) return; const cx = o.tx != null ? (o.tx + (o.s || 1) / 2) * VPT : (o.x + .5) * C2, cy = o.ty != null ? (o.ty + (o.s || 1) / 2) * VPT : (o.y + .5) * C2; f(Math.round(cx - 4), Math.round(cy - 4), o); };
    for (const r of rooms) {
      for (const o of r.decor) put(o);
      // 횃불: 방의 뒤쪽 높은 벽(방 타일의 -x · -y 쪽)에 방 크기만큼. 불꽃은 옛 횃불 효과(pfx), 여기서는 빛만
      const spots = []; for (const [tx, ty] of r.tiles) { if (!K(tx, ty)) continue; if (tall[ty * mw + tx - 1]) spots.push([tx, ty, 'x']); if (ty > 0 && tall[(ty - 1) * mw + tx]) spots.push([tx, ty, 'y']); }
      const want = Math.max(1, Math.round(r.tiles.length / 64)), picked = [];
      for (const s of spots.sort((a, b) => hs(a[0], a[1], 3) - hs(b[0], b[1], 3))) { if (picked.length >= want) break; if (picked.some(p => Math.abs(p[0] - s[0]) + Math.abs(p[1] - s[1]) < 6)) continue; picked.push(s); }
      for (const [tx, ty, side] of picked) {
        const fx = side === 'x' ? tx * VPT + .3 : tx * VPT + 3, fy = side === 'y' ? ty * VPT + .3 : ty * VPT + 3;
        lights.push({ x: fx, y: fy, z: FLOOR + 9, c: [1, .68, .36], i: 2.8, r: 16 });
        torches.push({ cell: ty * mw + tx, x: fx * VS + X0, y: fy * VS + Y0, z: 2.1 });
      }
      if (r.type === 'boss' || r.type === 'camp') {
        const t0 = r.tiles.filter(([tx, ty]) => K(tx, ty) && !r.decor.some(o => Math.floor(tx / 2) === o.x && Math.floor(ty / 2) === o.y)), c = t0[Math.floor(t0.length / 2)];
        if (c && r.type === 'boss') brazier(c[0] * VPT + 6, c[1] * VPT + 6);
        if (c && r.type === 'camp') { const x = c[0] * VPT, y = c[1] * VPT; cyl(x + 3, y + 3, 2.6, FLOOR, FLOOR + 1, (a, b) => (Math.hypot(a + .5 - x - 3, b + .5 - y - 3) > 1.7 ? 0x6a6058 : null)); for (let k = 0; k < 6; k++) glow(x + 2 + (k % 3), y + 2 + (k >> 1) % 2, FLOOR + (k < 3 ? 0 : 1), k % 2 ? 0xff7020 : 0xffb040); lights.push({ x: x + 3.5, y: y + 3.5, z: FLOOR + 6, c: [1, .6, .3], i: 2.6, r: 15 }); }
      }
    }
    if (R0) for (const id in R0._lay.cor) for (const o of R0._lay.cor[id].decor || []) put(o);
  }

  // ── 판에 굽기 (bake.js의 bakeFloor 안에서, W · H · OX · OY · pix · zb가 판을 가리킬 때)
  function bake(m, w) {
    if (G.Event && m.rooms) G.Event.tagMap(G.S.w.fantasy, m);
    Object.assign(win, w, { map: m }); win.cx = (w.x0 + w.x1) / 2; win.cy = (w.y0 + w.y1) / 2;
    tufts = []; torches = []; if (G.Terrain) G.Terrain.gen(m); if (G.Light && !m.amb) G.Light.gen(m); /* 규칙의 지형 · 밝기 (그림은 여기서) */
    pix.fill(BG); zb.fill(-1e9); ground.fill(0); groundZ.fill(-1e9);
    X0 = (-.5 - win.cx) * T; Y0 = (-.5 - win.cy) * T;
    build(m);
    const v = V, N = W * H, alb = new Uint8Array(N * 3), nrm = new Uint8Array(N).fill(255), ao = new Uint8Array(N), em = new Uint8Array(N);
    A = { alb, nrm, ao, em, w: W, h: H };
    // 복셀 좌표 → 판 좌표 (선형)
    const kU = VS * S / R2, ax = OX + (X0 - Y0) * S / R2, kV = VS / R2 * SIN * S, ay = OY + (X0 + Y0) / R2 * SIN * S + FLOOR * VS * COS * S, kZ = VS * COS * S;
    const kD = VS / R2 * COS, ad = (X0 + Y0) / R2 * COS - FLOOR * VS * SIN, kE = VS * SIN;
    const AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], n = Math.ceil(S * VS * 1.6), STEP = 1 / n;
    const cAO = (bx, by, bz, ea, eb, sa, sb) => { const s1 = v.solid(bx + ea[0] * sa, by + ea[1] * sa, bz + ea[2] * sa), s2 = v.solid(bx + eb[0] * sb, by + eb[1] * sb, bz + eb[2] * sb), c = v.solid(bx + ea[0] * sa + eb[0] * sb, by + ea[1] * sa + eb[1] * sb, bz + ea[2] * sa + eb[2] * sb); const q2 = s1 && s2 ? 0 : 3 - (s1 + s2 + c); return .45 + q2 / 3 * .55; };
    const face = (x, y, z, dir, col, m0) => {
      const nn = NORM[dir], fx = x + nn[0], fy = y + nn[1], fz = z + nn[2], [ea, eb] = dir === 0 ? [AX[0], AX[1]] : dir === 1 ? [AX[0], AX[2]] : [AX[1], AX[2]];
      const a00 = cAO(fx, fy, fz, ea, eb, -1, -1), a10 = cAO(fx, fy, fz, ea, eb, 1, -1), a01 = cAO(fx, fy, fz, ea, eb, -1, 1), a11 = cAO(fx, fy, fz, ea, eb, 1, 1);
      const r = (col >> 16) & 255, g = (col >> 8) & 255, b = col & 255, gnd = dir === 0 && z < FLOOR && m0 === 1;
      // 이 면이 속한 타일: 윗면은 제 타일, 옆면은 면 앞(바닥 쪽) 타일 — 벽 앞면은 그 앞 바닥이 보일 때 보인다
      const ci = dir === 0 ? Math.floor(y / VPT) * mw + Math.floor(x / VPT) : Math.min(mh - 1, Math.floor(fy / VPT)) * mw + Math.min(mw - 1, Math.floor(fx / VPT));
      for (let s = STEP / 2; s < 1; s += STEP) for (let t = STEP / 2; t < 1; t += STEP) {
        const px = dir === 2 ? x + 1 : x + s, py = dir === 0 ? y + t : dir === 1 ? y + 1 : y + s, pz = dir === 0 ? z + 1 : z + t;
        const ix = (ax + (px - py) * kU) | 0, iy = (ay + (px + py) * kV - pz * kZ) | 0; if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
        const i = iy * W + ix, d = ad + (px + py) * kD + pz * kE; if (d <= zb[i]) continue;
        zb[i] = d; alb[i * 3] = r; alb[i * 3 + 1] = g; alb[i * 3 + 2] = b; nrm[i] = dir; em[i] = m0 === 2 ? 1 : m0 === 3 ? 2 : 0; cellMap[i] = ci;
        ao[i] = 255 * ((a00 * (1 - s) + a10 * s) * (1 - t) + (a01 * (1 - s) + a11 * s) * t);
        if (gnd) { ground[i] = 1; groundZ[i] = d; } else { ground[i] = 0; groundZ[i] = -1e9; }
      }
    };
    for (let z = 0; z < v.Z; z++) for (let y = 0; y < v.Y; y++) for (let x = 0; x < v.X; x++) {
      const m0 = v.VX[v.vi(x, y, z)]; if (!m0) continue; const c = v.VC[v.vi(x, y, z)];
      if (!v.has(x, y, z + 1)) face(x, y, z, 0, c, m0); if (!v.has(x, y + 1, z)) face(x, y, z, 1, c, m0); if (!v.has(x + 1, y, z)) face(x, y, z, 2, c, m0);
    }
    // 흑백 + 외곽선 (깊이가 크게 끊기는 곳)
    for (let i = 0; i < N; i++) {
      if (nrm[i] === 255) continue; const x = i % W, y = (i / W) | 0, gy = grayLin(alb[i * 3] / 255, alb[i * 3 + 1] / 255, alb[i * 3 + 2] / 255, ao[i] / 255, nrm[i]);
      let c = fin(gy[0], gy[1], gy[2], x, y);
      if (edgeAt(zb, i, x, W, N)) c = rgb((c & 255) * .35, (c >> 8 & 255) * .32, (c >> 16 & 255) * .38);
      pix[i] = c;
    }
    vis = new Uint8Array(mw * mh); ovKey = ''; ov = null;
  }
  const edgeAt = (zz, i, x, w, n) => { const z0 = zz[i], zr = x + 1 < w ? zz[i + 1] : z0, zd = i + w < n ? zz[i + w] : z0, zl = x > 0 ? zz[i - 1] : z0, zu = i >= w ? zz[i - w] : z0; return z0 - Math.min(zr, zd, zl, zu) > 1; };

  // ── 빛: 지금 보이는 타일(파티 맨 앞에서 VR 타일 안, 바닥을 따라 막힘 없이) · 파티 둘레 LR 안
  let vis = null, ov = null, ovX = 0, ovY = 0, ovW = 0, ovH = 0, ovT = -1, ovKey = '', cur = null;
  function look(r, tx, ty) {
    vis.fill(0);
    for (let y = ty - VR; y <= ty + VR; y++) for (let x = tx - VR; x <= tx + VR; x++) {
      if (!K(x, y) || (x - tx) ** 2 + (y - ty) ** 2 > VR * VR + 1) continue;
      const n = Math.max(Math.abs(x - tx), Math.abs(y - ty)) * 3; let ok = true;
      for (let k = 1; k < n && ok; k++) { const t = k / n, a = Math.round(tx + (x - tx) * t), b = Math.round(ty + (y - ty) * t); if (!K(a, b)) ok = false; }
      if (!ok) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < mw && Y < mh && (!dx && !dy || !K(X, Y))) vis[Y * mw + X] = 1; } // 바닥 + 그 둘레 벽
    }
    for (let i = 0; i < vis.length; i++) if (!r.seen[i]) vis[i] = 0;
  }
  // 빛 계산 하나 (복셀 좌표, 면 nr, 음영 a) → 선형 색. fk: 흑백과 섞는 정도
  function shade(r0, g0, b0, a, nr, emv, px, py, pz, t) {
    const L0 = cur, q2 = 1 - Math.hypot(px - L0.x, py - L0.y) / LR; if (q2 <= 0) return null;
    const u = Math.min(1, q2 / .45), fk = u * u * (3 - 2 * u), n = NORM[nr];
    let R, G2, B;
    if (emv === 1) { R = r0 * 1.6 * L0.fl; G2 = g0 * 1.6 * L0.fl; B = b0 * 1.6 * L0.fl; }
    else {
      const up = nr === 0 ? 1.15 : .9, amb = .32; let lr = amb * a * up, lg = .33 * a * up, lb = .44 * a * up;
      for (const Lg of L0.lights) { const dx = Lg.x - px, dy = Lg.y - py, dz = Lg.z - pz, dd = Math.hypot(dx, dy, dz) + 1e-3, qq = dd / Lg.r; if (qq > 2.6) continue; const nd = Math.max(0, (n[0] * dx + n[1] * dy + n[2] * dz) / dd); if (!nd) continue; const val = Lg.i / (1 + qq * qq * 2.2) * (1 - qq / 2.6) * nd * (.55 + .45 * a); lr += Lg.c[0] * val; lg += Lg.c[1] * val; lb += Lg.c[2] * val; }
      R = r0 * lr; G2 = g0 * lg; B = b0 * lb;
      if (emv === 2) { const ww = Math.max(0, Math.sin(px * 1.1 + t * 2.1) + Math.sin(py * 1.5 - t * 1.7) + Math.sin((px + py) * .6 + t * 1.3) - 1.2); R += .05 + ww * .1; G2 += .12 + ww * .22; B += .18 + ww * .3; }
    }
    if (fk < 1) { const gy = grayLin(r0, g0, b0, a, nr); R = gy[0] + (R - gy[0]) * fk; G2 = gy[1] + (G2 - gy[1]) * fk; B = gy[2] + (B - gy[2]) * fk; }
    return [R, G2, B];
  }
  // 판 픽셀 → 복셀 좌표
  const vpos = (X, Y, d) => { const u = (X + .5 - big.ox) / S, sy = (Y + .5 - big.oy) / S, vv = sy * SIN + d * COS, Zw = d * SIN - sy * COS, wx2 = (u + vv) * R2 / 2, wy2 = (vv - u) * R2 / 2; return [(wx2 - X0) / VS, (wy2 - Y0) / VS, Zw / VS + FLOOR]; };
  // copyView 다음에: 화면에 걸친 빛 덮개를 (0.08초마다) 계산해 bakedPix에 얹는다
  function light(r, t) {
    if (!A || !big.full || !r.party) return;
    const L0 = r.party.find(p => !p.dead) || r.party[0]; if (!L0) return;
    const ex = L0._dx ?? L0.x, ey = L0._dy ?? L0.y, lx = (ex + .5) * VPT, ly = (ey + .5) * VPT, tx = Math.round(ex), ty = Math.round(ey);
    const key = tx + ',' + ty + ',' + r.seenVer;
    if (key !== ovKey) { ovKey = key; look(r, tx, ty); }
    const vx0 = cam.ix, vy0 = cam.iy, inside = ov && vx0 >= ovX && vy0 >= ovY && vx0 + VW <= ovX + ovW && vy0 + VH <= ovY + ovH;
    if (!inside || t - ovT > .08) {
      ovT = t;
      const fl = .85 + .1 * Math.sin(t * 7.3) + .06 * Math.sin(t * 13.1);
      cur = { x: lx, y: ly, fl, lights: [{ x: lx, y: ly, z: FLOOR + 16, c: [1, .74, .44], i: 4.4 * fl, r: 32 }, ...lights.filter(Lg => Math.hypot(Lg.x - lx, Lg.y - ly) < LR + Lg.r * 2).map((Lg, k) => ({ ...Lg, i: Lg.i * (.85 + .12 * Math.sin(t * 6.1 + k * 1.7)) }))] };
      const M = 24; ovX = Math.max(0, vx0 - M); ovY = Math.max(0, vy0 - M); ovW = Math.min(big.w, vx0 + VW + M) - ovX; ovH = Math.min(big.h, vy0 + VH + M) - ovY;
      if (!ov || ov.length < ovW * ovH) ov = new Uint32Array(ovW * ovH); else ov.fill(0, 0, ovW * ovH);
      // 파티 맨 앞의 판 좌표 둘레만 (빛 반지름 밖은 건너뛴다. 위로는 벽 높이만큼 더)
      const F0 = big.full, BW = big.w, WX = wx(ex), WY = wy(ey), pbx = big.ox + (WX - WY) / R2 * S, pby = big.oy + (WX + WY) / R2 * SIN * S, rad = LR * VS * S;
      const x0 = Math.max(ovX, Math.floor(pbx - rad)), x1 = Math.min(ovX + ovW, Math.ceil(pbx + rad)), yy0 = Math.max(ovY, Math.floor(pby - rad * SIN - (WH - FLOOR) * VS * COS * S)), yy1 = Math.min(ovY + ovH, Math.ceil(pby + rad * SIN + 8));
      for (let Y = yy0; Y < yy1; Y++) for (let X = x0; X < x1; X++) {
        const i = Y * BW + X, nr = A.nrm[i]; if (nr === 255) continue; const c = big.cell[i]; if (c < 0 || !vis[c]) continue;
        const [px, py, pz] = vpos(X, Y, F0.z[i]), col = shade(A.alb[i * 3] / 255, A.alb[i * 3 + 1] / 255, A.alb[i * 3 + 2] / 255, A.ao[i] / 255, nr, A.em[i], px, py, pz, t); if (!col) continue;
        let o = fin(col[0], col[1], col[2], X, Y); if (edgeAt(F0.z, i, X, BW, F0.z.length)) o = rgb((o & 255) * .35, (o >> 8 & 255) * .32, (o >> 16 & 255) * .38);
        ov[(Y - ovY) * ovW + (X - ovX)] = o;
      }
    }
    // 얹기 (밝혀진 픽셀만 — 덮개는 본 칸만 계산했다)
    for (let y = 0; y < VH; y++) { const Y = y + vy0 - ovY; if (Y < 0 || Y >= ovH) continue; for (let x = 0; x < VW; x++) { const X = x + vx0 - ovX; if (X < 0 || X >= ovW) continue; const c = ov[Y * ovW + X]; if (c && bakedZ[y * VW + x] > -1e8) bakedPix[y * VW + x] = c; } }
  }

  // ── 소품: sphere · capsule · block → 복셀 (매 프레임 모아서 flush에서 그린다)
  const pv = new Map(); const KEY = 8192;
  const pk = (x, y, z) => (z * KEY + y) * KEY + x;
  const pset = (x, y, z, col, m0) => { if (x < 0 || y < 0 || z < 0 || x >= KEY || y >= KEY) return; pv.set(pk(x, y, z), col | (m0 << 24)); };
  const toV = (X, Y, Z) => [(X - X0) / VS, (Y - Y0) / VS, Z / VS + FLOOR];
  const pcol = (c, x, y, z, mode) => tint(hex(c), mode === 'rough' ? .82 + hs(x, y, z) * .3 : .93 + hs(x, y, z) * .1);
  function vSphere(x, y, z, r, c, mode) {
    const [cx, cy, cz] = toV(x, y, z), rv = Math.max(r / VS, .55), m0 = mode === 'glow' ? 2 : 1;
    for (let a = Math.floor(cx - rv); a <= cx + rv; a++) for (let b = Math.floor(cy - rv); b <= cy + rv; b++) for (let k = Math.floor(cz - rv); k <= cz + rv; k++) if ((a + .5 - cx) ** 2 + (b + .5 - cy) ** 2 + (k + .5 - cz) ** 2 <= rv * rv) pset(a, b, k, pcol(c, a, b, k, mode), m0);
  }
  function vCapsule(p, q2, r0, r1, c, mode) {
    const [ax2, ay2, az2] = toV(...p), [bx2, by2, bz2] = toV(...q2), R0 = Math.max(r0 / VS, .55), R1 = Math.max(r1 / VS, .55), Rm = Math.max(R0, R1), dx = bx2 - ax2, dy = by2 - ay2, dz = bz2 - az2, LL = dx * dx + dy * dy + dz * dz || 1, m0 = mode === 'glow' ? 2 : 1;
    for (let a = Math.floor(Math.min(ax2, bx2) - Rm); a <= Math.max(ax2, bx2) + Rm; a++) for (let b = Math.floor(Math.min(ay2, by2) - Rm); b <= Math.max(ay2, by2) + Rm; b++) for (let k = Math.floor(Math.min(az2, bz2) - Rm); k <= Math.max(az2, bz2) + Rm; k++) {
      const px = a + .5, py = b + .5, pz = k + .5, t = clamp(((px - ax2) * dx + (py - ay2) * dy + (pz - az2) * dz) / LL, 0, 1), rr = R0 + (R1 - R0) * t;
      if ((px - ax2 - dx * t) ** 2 + (py - ay2 - dy * t) ** 2 + (pz - az2 - dz * t) ** 2 <= rr * rr) pset(a, b, k, pcol(c, a, b, k, mode), m0);
    }
  }
  function vBlock(x0, y0, z0, x1, y1, z1, c) {
    const [a0, b0, k0] = toV(x0, y0, z0), [a1, b1, k1] = toV(x1, y1, z1), rng = (lo, hi) => { let s = Math.round(lo), e = Math.round(hi); if (e <= s) { s = Math.floor((lo + hi) / 2); e = s + 1; } return [s, e]; };
    const [xs, xe] = rng(a0, a1), [ys, ye] = rng(b0, b1), [zs, ze] = rng(k0, k1);
    for (let a = xs; a < xe; a++) for (let b = ys; b < ye; b++) for (let k = zs; k < ze; k++) pset(a, b, k, pcol(c, a, b, k), 1);
  }
  // 모은 복셀 → 화면 (view 좌표, 지금의 OX · OY). 빛 안이면 색, 밖이면 흑백
  function flush(t) {
    if (!pv.size) return;
    const n = Math.ceil(S * VS * 1.3), STEP = 1 / n, kU = VS * S / R2, ax = OX + (X0 - Y0) * S / R2, kV = VS / R2 * SIN * S, ay = OY + (X0 + Y0) / R2 * SIN * S + FLOOR * VS * COS * S, kZ = VS * COS * S, kD = VS / R2 * COS, ad = (X0 + Y0) / R2 * COS - FLOOR * VS * SIN, kE = VS * SIN;
    const bx = cam.ix || 0, by = cam.iy || 0;
    for (const [key, val] of pv) {
      const x = key % KEY, y = Math.floor(key / KEY) % KEY, z = Math.floor(key / (KEY * KEY)), m0 = val >>> 24, col = val & 0xffffff;
      const r0 = ((col >> 16) & 255) / 255, g0 = ((col >> 8) & 255) / 255, b0 = (col & 255) / 255, tile = Math.floor(y / VPT) * mw + Math.floor(x / VPT), lit = cur && vis && vis[tile];
      for (let dir = 0; dir < 3; dir++) {
        const nn = NORM[dir]; if (pv.has(pk(x + nn[0], y + nn[1], z + nn[2]))) continue;
        const a = 1 - (pv.has(pk(x + nn[0] - 1, y + nn[1], z + nn[2])) + pv.has(pk(x + nn[0], y + nn[1] - 1, z + nn[2])) + (dir ? pv.has(pk(x + nn[0], y + nn[1], z + nn[2] - 1)) : 0)) * .12;
        const L = (lit && shade(r0, g0, b0, a, dir, m0 === 2 ? 1 : 0, x + .5 + nn[0] * .5, y + .5 + nn[1] * .5, z + .5 + nn[2] * .5, t)) || (m0 === 2 ? [r0 * 1.3, g0 * 1.3, b0 * 1.3] : grayLin(r0, g0, b0, a, dir));
        for (let s = STEP / 2; s < 1; s += STEP) for (let u = STEP / 2; u < 1; u += STEP) {
          const px = dir === 2 ? x + 1 : x + s, py = dir === 0 ? y + u : dir === 1 ? y + 1 : y + s, pz = dir === 0 ? z + 1 : z + u;
          const ix = (ax + (px - py) * kU) | 0, iy = (ay + (px + py) * kV - pz * kZ) | 0; if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
          const i = iy * W + ix, d = ad + (px + py) * kD + pz * kE; if (d <= zb[i]) continue;
          zb[i] = d; pix[i] = fin(L[0], L[1], L[2], ix + bx, iy + by);
        }
      }
    }
    pv.clear();
  }
  if (VOXON) { sphere = vSphere; capsule = vCapsule; block = vBlock; } // 소품 그리기 함수들을 복셀로 (옛 판 굽기 bakeRoom은 복셀 모드에서 부르지 않는다)
  // 인물을 같은 빛 · 색으로 칠할 때 읽는 것 (js/render/voxchar.js)
  const api = { get cur() { return cur; }, get vis() { return vis; }, get mw() { return mw; }, toV, fin, grayLin, shade, LR, VS, VPT };
  return { bake, light, flush, api };
})();
