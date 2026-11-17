'use strict';
// 던전 배경 선 그림 (시제품 2026-11-07): 바닥 · 벽을 맵 모양에서 직접 다시 그린다. 캐주얼 카툰 톤 — 배경은 대비 낮게 · 선 가늘게, 벽 덩어리만 굵은 외곽선.
//  바닥: 칸마다 불규칙한 판석 4개(안쪽 꼭짓점만 흔든다 → 칸 테두리는 그대로). 돌마다 그 아래 원래 픽셀의 평균색 → 양탄자 · 물 · 이끼 · 횃불 빛이 단색 면으로 남는다
//  벽: 구울 때 남긴 벽 목록(big.walls)을 상자로. 윗면 밝게 · 앞면 두 쪽 어둡게, 높은 벽은 벽돌 줄눈. 면마다 원래 색의 평균
//  소품(뼈 · 돌 · 나무 · 계단)과 매 프레임 그리는 것은 픽셀 그대로 위에 얹힌다. 픽셀 화면은 다시 그린 바닥 · 벽 픽셀만 투명하게(그림자는 반투명 검정)
//  판을 조각(CS×CS)으로 나눠 화면에 들어올 때 한 번만 그린다. ?pxbg = 예전 픽셀 배경 · B = 켜고 끄기. 예전 픽셀 따라 잇기 판: old/before_hdbg/hdbg_trace.js
const HDBG = (() => {
  let on = !q.has('pxbg'); // 기본으로 켠다 (?pxbg = 예전 픽셀 배경, B = 켜고 끄기)
  addEventListener('keydown', e => { if (e.key.toLowerCase() === 'b' && !e.repeat && !(e.target instanceof HTMLInputElement)) { on = !on; if (el) el.style.display = on ? '' : 'none'; } });
  const CS = 192, F = 4, BUILD_MAX = 4, OL = '#1d1418';
  let el = null, ex = null, cache = new Map(), disp = null, dispPix = null, active = false;
  // 소품 외곽선 필터: 알파를 세우고 어두운 선. propline4 = 조각(4배) 공간, propline = 화면 공간 (반지름은 배율에 맞춘다)
  const svgP = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svgP.setAttribute('width', 0); svgP.setAttribute('height', 0); svgP.style.position = 'absolute';
  const filt = (id, r) => `<filter id="${id}" color-interpolation-filters="sRGB" x="-5%" y="-5%" width="110%" height="110%"><feComponentTransfer in="SourceGraphic" result="sh"><feFuncA type="linear" slope="3" intercept="-.7"/></feComponentTransfer><feMorphology in="sh" operator="dilate" radius="${r}" result="fat"/><feFlood flood-color="${OL}"/><feComposite in2="fat" operator="in" result="ol"/><feMerge><feMergeNode in="ol"/><feMergeNode in="sh"/></feMerge></filter>`;
  svgP.innerHTML = filt('propline4', 3) + filt('propline', 2); document.body.append(svgP); const propMorph = svgP.querySelectorAll('feMorphology')[1]; let propK = 0;
  function scale2(src, w, h) { const W2 = w * 2, out = new Uint32Array(W2 * h * 2); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const E = src[y * w + x], B = y > 0 ? src[(y - 1) * w + x] : E, Hh = y < h - 1 ? src[(y + 1) * w + x] : E, D = x > 0 ? src[y * w + x - 1] : E, F2 = x < w - 1 ? src[y * w + x + 1] : E; let e0 = E, e1 = E, e2 = E, e3 = E; if (B !== Hh && D !== F2) { if (D === B) e0 = D; if (B === F2) e1 = F2; if (D === Hh) e2 = D; if (Hh === F2) e3 = F2; } const o = y * 2 * W2 + x * 2; out[o] = e0; out[o + 1] = e1; out[o + W2] = e2; out[o + W2 + 1] = e3; } return out; }
  // 픽셀 조각 → 4배 캔버스 (Scale2x 두 번)
  function px4(src, w, h) { const a = scale2(scale2(src, w, h), w * 2, h * 2), cv = document.createElement('canvas'); cv.width = w * 4; cv.height = h * 4; cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(a.buffer), w * 4, h * 4), 0, 0); return cv; }
  function layer() {
    if (el) return;
    el = document.createElement('canvas'); el.id = 'hdbg'; el.style.cssText = 'position:absolute;pointer-events:none;z-index:-1;';
    canvas.parentElement.style.isolation = 'isolate'; // 이 층이 무대 배경 위 · 픽셀 화면 아래
    canvas.before(el); ex = el.getContext('2d');
  }
  // ── 판 좌표 (구운 판 big의 픽셀) ──
  const P = (X, Y, z = 0) => { const u = (X - Y) / R2, v = (X + Y) / R2; return [big.ox + u * S, big.oy + (v * SIN - z * COS) * S]; };
  const hs = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  // 원래 픽셀 평균 (같은 종류만): 판 좌표 점들
  function avg(pts, want) {
    const Fp = big.full, w = big.w; let r = 0, g = 0, b = 0, n = 0;
    for (const [x, y] of pts) { const ix = x | 0, iy = y | 0; if (ix < 0 || iy < 0 || ix >= w || iy >= big.h) continue; const i = iy * w + ix; if (!want(i)) continue; const c = Fp.pix[i]; r += c & 255; g += c >> 8 & 255; b += c >> 16 & 255; n++; }
    return n ? [r / n, g / n, b / n] : null;
  }
  const isG = i => big.full.g[i] === 1 && big.full.z[i] - big.full.gz[i] < 1e-3, isW = i => big.kind[i] === 2;
  const col = ([r, g, b], k = 1) => `rgb(${Math.min(255, r * k) | 0},${Math.min(255, g * k) | 0},${Math.min(255, b * k) | 0})`;
  // 평균색을 카툰 톤으로: 단계 줄이고 채도를 조금 올린다
  function tone(c) { const m = (c[0] + c[1] + c[2]) / 3; return c.map(v => Math.max(0, Math.round((m + (v - m) * 1.25) / 10) * 10)); }
  function reset() {
    cache = new Map();
    if (!big.full || !big.kind) return;
    const m = win.map, n = big.w * big.h, rep = big.rep = new Uint8Array(n), stair = new Set();
    if (m) { for (const s of [m.end, m.start]) if (s) stair.add(s.cy * m.w + s.cx); if (m.stairs) for (const z in m.stairs) stair.add(m.stairs[z].y * m.w + m.stairs[z].x); }
    for (let i = 0; i < n; i++) rep[i] = (big.full.g[i] === 1 && big.full.z[i] - big.full.gz[i] < 1e-3 && !stair.has(big.cell[i])) || big.kind[i] === 2 || big.kind[i] === 3 ? 1 : 0; // 바닥은 맨 위가 바닥일 때만 (소품이 덮은 곳은 픽셀 그대로)
    big.stairCells = stair; big.wallSet = new Set((big.walls || []).map(w => w.y * (m ? m.w : 0) + w.x));
  }
  // ── 조각 하나 그리기 ──
  function build(cx, cy) {
    const m = win.map, cv = document.createElement('canvas'), x0 = cx * CS, y0 = cy * CS; cv.width = cv.height = CS * F;
    const c = cv.getContext('2d'); c.setTransform(F, 0, 0, F, -x0 * F, -y0 * F); c.lineJoin = 'round'; c.lineCap = 'round';
    const inside = (pts, pad) => { let a = 1e9, b = -1e9, d = 1e9, e = -1e9; for (const [x, y] of pts) { a = Math.min(a, x); b = Math.max(b, x); d = Math.min(d, y); e = Math.max(e, y); } return b > x0 - pad && a < x0 + CS + pad && e > y0 - pad && d < y0 + CS + pad; };
    const H2 = T / 2;
    // 바닥 격자점: 칸마다 3×3 (모서리 고정, 변 가운데는 변을 따라서만, 가운데는 자유롭게)
    const lat = (gx, gy) => { const X = wx(0) - H2 + gx * H2, Y = wy(0) - H2 + gy * H2, ox = gx & 1, oy = gy & 1, j = T * .14;
      return [X + (ox ? (hs(gx, gy) - .5) * 2 * j : 0), Y + (oy ? (hs(gy + 9, gx) - .5) * 2 * j : 0)]; };
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (!isFloor(m, x, y) || big.stairCells.has(y * m.w + x)) continue;
      const corners = [[wx(x) - H2, wy(y) - H2], [wx(x) + H2, wy(y) - H2], [wx(x) + H2, wy(y) + H2], [wx(x) - H2, wy(y) + H2]].map(([X, Y]) => P(X, Y));
      if (!inside(corners, 4)) continue;
      const ch0 = m.c[y * m.w + x];
      if (ch0 === '~' || ch0 === ',') { // 물: 판석 대신 평평한 면 + 물결 두 줄
        const cxp = (corners[0][0] + corners[2][0]) / 2, cyp = (corners[0][1] + corners[2][1]) / 2, sm = [[cxp, cyp]]; for (const p of corners) for (const t of [.3, .6]) sm.push([cxp + (p[0] - cxp) * t, cyp + (p[1] - cyp) * t]);
        const tc = tone(avg(sm, isG) || [60, 90, 140]), path = new Path2D(); corners.forEach(([px, py], i) => i ? path.lineTo(px, py) : path.moveTo(px, py)); path.closePath();
        c.fillStyle = col(tc); c.fill(path); c.strokeStyle = col(tc, 1.35); c.lineWidth = .8;
        for (let k = 0; k < 2; k++) { if (hs(x * 7 + k, y * 3) > .55) continue; const ox = cxp + (hs(x, y + k) - .5) * S * .9, oy = cyp + (k - .5) * S * .35; c.beginPath(); c.moveTo(ox - 3, oy); c.quadraticCurveTo(ox - 1.5, oy - 1.4, ox, oy); c.quadraticCurveTo(ox + 1.5, oy + 1.4, ox + 3, oy); c.stroke(); }
        continue;
      }
      const L = []; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) L.push(P(...lat(x * 2 + i, y * 2 + j)));
      // 돌 네 개 (가끔 둘을 하나로)
      const merge = hs(x * 3, y * 5) > .7 ? (hs(x, y * 7) > .5 ? 0 : 1) : -1;
      const stones = merge === 0 ? [[0, 1, 2, 5, 4, 3], [3, 4, 7, 6], [4, 5, 8, 7]] : merge === 1 ? [[0, 1, 4, 7, 6, 3], [1, 2, 5, 4], [4, 5, 8, 7]] : [[0, 1, 4, 3], [1, 2, 5, 4], [3, 4, 7, 6], [4, 5, 8, 7]];
      for (const st of stones) {
        const pts = st.map(k => L[k]), cxp = pts.reduce((a, p) => a + p[0], 0) / pts.length, cyp = pts.reduce((a, p) => a + p[1], 0) / pts.length;
        const sm = [[cxp, cyp]]; for (const p of pts) for (const t of [.35, .7]) sm.push([cxp + (p[0] - cxp) * t, cyp + (p[1] - cyp) * t]);
        const tc = tone(avg(sm, isG) || [90, 90, 110]), v = .95 + hs(cxp, cyp) * .1;
        const path = new Path2D(); pts.forEach(([px, py], i) => i ? path.lineTo(px, py) : path.moveTo(px, py)); path.closePath();
        c.fillStyle = col(tc, v); c.fill(path); c.strokeStyle = col(tc, .72); c.lineWidth = .9; c.stroke(path);
        if (hs(cxp * 2, cyp) > .94) { c.strokeStyle = col(tc, .7); c.lineWidth = .6; c.beginPath(); c.moveTo(cxp - 2, cyp - 1); c.lineTo(cxp + 1, cyp + .5); c.lineTo(cxp + 2.5, cyp - .5); c.stroke(); } // 가끔 금 하나
      }
      // 바닥 가장자리(옆이 빈 곳)는 굵은 선
      c.strokeStyle = OL; c.lineWidth = 1.3;
      for (const [dx, dy, a, b] of [[0, -1, 0, 1], [1, 0, 1, 2], [0, 1, 2, 3], [-1, 0, 3, 0]]) { if (isFloor(m, x + dx, y + dy) || big.wallSet.has((y + dy) * m.w + x + dx)) continue; c.beginPath(); c.moveTo(...corners[a]); c.lineTo(...corners[b]); c.stroke(); }
    }
    // 바닥판 옆면 (맵 가장자리): 흙색 두 톤 · 아래로 갈수록 어둡게
    const isE = i => big.kind[i] === 3;
    for (const s of (big.slabs || []).slice().sort((a, b) => a.x + a.y - (b.x + b.y))) {
      const X0 = wx(s.x) - H2, X1 = wx(s.x) + H2, Y0 = wy(s.y) - H2, Y1 = wy(s.y) + H2, zb0 = -1.9;
      for (const [on2, q2] of [[s.openX, [P(X1, Y0, 0), P(X1, Y1, 0), P(X1, Y1, zb0), P(X1, Y0, zb0)]], [s.openY, [P(X0, Y1, 0), P(X1, Y1, 0), P(X1, Y1, zb0), P(X0, Y1, zb0)]]]) {
        if (!on2 || !inside(q2, 4)) continue;
        const cc = tone(avg(q2.map(([a, b]) => [(a * 2 + q2[0][0] + q2[1][0]) / 4, (b * 2 + q2[0][1] + q2[1][1]) / 4]), isE) || [110, 80, 60]);
        const g = c.createLinearGradient(q2[0][0], q2[0][1], q2[3][0], q2[3][1]); g.addColorStop(0, col(cc)); g.addColorStop(1, col(cc, .45));
        const p = new Path2D(); q2.forEach(([px, py], i) => i ? p.lineTo(px, py) : p.moveTo(px, py)); p.closePath(); c.fillStyle = g; c.fill(p);
        c.strokeStyle = OL; c.lineWidth = 1.2; c.beginPath(); c.moveTo(...q2[0]); c.lineTo(...q2[1]); c.stroke();
      }
    }
    // 벽: 먼 것부터 (x + y 순)
    const walls = big.walls.slice().sort((a, b) => a.x + a.y - (b.x + b.y));
    const samp = q2 => { const cx2 = q2.reduce((a, p) => a + p[0], 0) / 4, cy2 = q2.reduce((a, p) => a + p[1], 0) / 4, s = [[cx2, cy2]]; for (const p of q2) for (const t of [.3, .65]) s.push([cx2 + (p[0] - cx2) * t, cy2 + (p[1] - cy2) * t]); return s; };
    const poly = q2 => { const p = new Path2D(); q2.forEach(([px, py], i) => i ? p.lineTo(px, py) : p.moveTo(px, py)); p.closePath(); return p; };
    for (const w of walls) {
      const X0 = wx(w.x) - w.pw, X1 = wx(w.x) + w.pw, Y0 = wy(w.y) - w.pw, Y1 = wy(w.y) + w.pw, z = w.hz;
      const top = [P(X0, Y0, z), P(X1, Y0, z), P(X1, Y1, z), P(X0, Y1, z)], fR = [P(X1, Y0, 0), P(X1, Y1, 0), P(X1, Y1, z), P(X1, Y0, z)], fL = [P(X0, Y1, 0), P(X1, Y1, 0), P(X1, Y1, z), P(X0, Y1, z)];
      if (!inside(top.concat(fR, fL), 4)) continue;
      const bt = tone(avg(samp(top), isW) || [120, 120, 130]), br = tone(avg(samp(fR), isW) || bt.map(v => v * .8)), bl = tone(avg(samp(fL), isW) || bt.map(v => v * .65));
      const pR = poly(fR), pL = poly(fL), pT = poly(top);
      c.fillStyle = col(br); c.fill(pR); c.fillStyle = col(bl); c.fill(pL);
      if (z > 1) { // 높은 벽: 벽돌 줄눈
        const rows = Math.round(z / .55); c.lineWidth = .8;
        for (let r = 1; r <= rows; r++) {
          const zz = z * r / rows, zz0 = z * (r - 1) / rows, off = r % 2 ? .33 : .66;
          if (r < rows) { c.strokeStyle = col(bl, .7); c.beginPath(); c.moveTo(...P(X0, Y1, zz)); c.lineTo(...P(X1, Y1, zz)); c.stroke(); c.strokeStyle = col(br, .7); c.beginPath(); c.moveTo(...P(X1, Y0, zz)); c.lineTo(...P(X1, Y1, zz)); c.stroke(); }
          c.strokeStyle = col(bl, .7); c.beginPath(); c.moveTo(...P(X0 + (X1 - X0) * off, Y1, zz0)); c.lineTo(...P(X0 + (X1 - X0) * off, Y1, zz)); c.stroke();
          c.strokeStyle = col(br, .7); c.beginPath(); c.moveTo(...P(X1, Y0 + (Y1 - Y0) * off, zz0)); c.lineTo(...P(X1, Y0 + (Y1 - Y0) * off, zz)); c.stroke();
        }
      }
      c.fillStyle = col(bt, 1.08); c.fill(pT);
      const mx = (top[0][0] + top[2][0]) / 2, my = (top[0][1] + top[2][1]) / 2; // 윗면 안쪽 밝은 테두리
      c.strokeStyle = col(bt, 1.3); c.lineWidth = .7; c.stroke(poly(top.map(([px, py]) => [mx + (px - mx) * .78, my + (py - my) * .78])));
      c.strokeStyle = OL; c.lineWidth = 1.2; c.stroke(pR); c.stroke(pL); c.stroke(pT);
    }
    // 구운 소품(뼈 · 돌 · 책장 · 계단 · 나무 …): 다시 그리지 않은 픽셀을 4배로 이어 붙여 어두운 외곽선
    { const M = 2, n = CS + M * 2, src = new Uint32Array(n * n), Fp = big.full, rp = big.rep; let any = false;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const gx = x0 - M + x, gy = y0 - M + y; if (gx < 0 || gy < 0 || gx >= big.w || gy >= big.h) continue; const i = gy * big.w + gx; if (rp[i] || Fp.z[i] < -1e8) continue; src[y * n + x] = Fp.pix[i]; any = true; }
      if (any) { const pc = px4(src, n, n); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.filter = 'url(#propline4)'; c.drawImage(pc, -M * F, -M * F); c.restore(); } }
    return cv;
  }
  // 인물 그림자: 발밑 둥근 그림자 하나 (prep에서 모아 present에서 그린다)
  const shadows = []; let dynP = null, dpAny = false, dx0 = 0, dx1 = 0, dy0 = 0, dy1 = 0;
  function shadow(x, y, r) { shadows.push(x, y, r); }
  // 프레임 중간 상태 (main.js): 0 = 소품까지 · 1 = 그림자까지 · 2 = 바닥 이펙트(횃불 빛)까지
  const snaps = [null, null, null];
  function mark(k) { if (!on || f.town || !big.rep) return; if (!snaps[k] || snaps[k].length !== pix.length) snaps[k] = new Uint32Array(pix.length); snaps[k].set(pix); snaps.ok = true; }
  // 픽셀 화면 → 보여 줄 버퍼: 다시 그린 바닥 · 벽은 투명. 그 위 그림자는 반투명 검정, 횃불 빛은 따뜻한 반투명. 소품 · 인물 · 범위 표시 · 안개는 픽셀 그대로
  function put(ctx2, image) {
    active = on && !f.town && !!big.full && !!big.rep && !!win.map && !!snaps.ok && snaps[0]?.length === pix.length;
    if (!active) { ctx2.putImageData(image, 0, 0); return; }
    if (!disp || disp.width !== W || disp.height !== H) { disp = ctx2.createImageData(W, H); dispPix = new Uint32Array(disp.data.buffer); }
    const Px = pix, Bk = bakedPix, A = snaps[0], Bs = snaps[1], Cs = snaps[2], D = dispPix, rep = big.rep, bw = big.w, ix = cam.ix || 0, iy = cam.iy || 0;
    const sum = c => (c & 255) + (c >> 8 & 255) + (c >> 16 & 255);
    if (!dynP || dynP.length !== W * H) dynP = new Uint32Array(W * H); const DP = dynP; DP.fill(0); dpAny = false; dx0 = W; dx1 = -1; dy0 = H; dy1 = -1;
    for (let y = 0; y < H; y++) { const row = (y + iy) * bw + ix; for (let x = 0, i = y * W; x < W; x++, i++) {
      const c = Px[i], b = Bk[i];
      if (b === BG) { D[i] = c; continue; } // 안개
      if (!rep[row + x]) { D[i] = c === b ? 0 : c; continue; } // 구운 소품: 조각에 선 그림으로 있다
      if (A[i] !== b && c === Cs[i]) { DP[i] = A[i]; dpAny = true; if (x < dx0) dx0 = x; if (x > dx1) dx1 = x; if (y < dy0) dy0 = y; if (y > dy1) dy1 = y; D[i] = 0; continue; } // 움직이는 소품 (상자 · 함정 · 장면)
      if (A[i] !== b || c !== Cs[i]) { D[i] = c; continue; } // 나중에 그린 것
      let out = 0;
      const sh = Bs[i]; if (sh !== b) { const k = (sum(sh) + 3) / (sum(b) + 3); if (k < 1) out = (Math.round((1 - k) * 255) << 24) >>> 0; } // 그림자
      if (c !== sh) { const d = sum(c) - sum(sh); if (d > 150) { D[i] = c; continue; } /* 불꽃 그 자체 */ if (d > 0) { const a = Math.min(.55, d / 260); out = (Math.round(a * 255) << 24 | 110 << 16 | 190 << 8 | 255) >>> 0; } } // 빛
      D[i] = out;
    } }
    ctx2.putImageData(disp, 0, 0);
  }
  function present() {
    if (!on) { shadows.length = 0; if (el) el.style.display = 'none'; return; } layer();
    if (!active) { el.style.display = 'none'; return; } el.style.display = '';
    const dpr = devicePixelRatio || 1, k = canvas.clientWidth / W * dpr, cw = Math.round(canvas.clientWidth * dpr), ch = Math.round(canvas.clientHeight * dpr);
    if (el.width !== cw || el.height !== ch) { el.width = cw; el.height = ch; }
    el.style.left = canvas.offsetLeft + 'px'; el.style.top = canvas.offsetTop + 'px'; el.style.width = canvas.clientWidth + 'px'; el.style.height = canvas.clientHeight + 'px'; el.style.transform = canvas.style.transform;
    ex.setTransform(1, 0, 0, 1, 0, 0); ex.fillStyle = `rgb(${BG & 255},${BG >> 8 & 255},${BG >> 16 & 255})`; ex.fillRect(0, 0, cw, ch);
    ex.imageSmoothingEnabled = true; ex.imageSmoothingQuality = 'high';
    const ix = cam.ix || 0, iy = cam.iy || 0, c0 = Math.floor(ix / CS), c1 = Math.floor((ix + VW) / CS), r0 = Math.floor(iy / CS), r1 = Math.floor((iy + VH) / CS);
    let built = 0;
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      const key = cx + ',' + cy; let cv = cache.get(key);
      if (!cv) { if (built >= BUILD_MAX && cache.size) continue; cv = build(cx, cy); cache.set(key, cv); built++; }
      ex.drawImage(cv, 0, 0, CS * F, CS * F, (cx * CS - ix) * k, (cy * CS - iy) * k, CS * k, CS * k);
    }
    ex.fillStyle = 'rgba(18,10,26,.34)';
    for (let i = 0; i < shadows.length; i += 3) { const p = project(shadows[i], shadows[i + 1], 0), rx = shadows[i + 2] * S * 1.1 * k, ry = rx * SIN * 1.05; ex.beginPath(); ex.ellipse(p.sx * k, p.sy * k, rx, ry, 0, 0, 6.283); ex.fill(); }
    shadows.length = 0;
    // 움직이는 소품: 화면 공간에서 같은 처리 (그 상자만)
    if (dpAny) { const w = dx1 - dx0 + 3, h = dy1 - dy0 + 3, src = new Uint32Array(w * h); for (let y = 0; y < h - 2; y++) src.set(dynP.subarray((dy0 + y) * W + dx0, (dy0 + y) * W + dx0 + w - 2), (y + 1) * w + 1);
      if (Math.abs(k - propK) > .01) { propK = k; propMorph.setAttribute('radius', Math.max(1, k * .8)); }
      const pc = px4(src, w, h); ex.save(); ex.filter = 'url(#propline)'; ex.drawImage(pc, (dx0 - 1) * k, (dy0 - 1) * k, w * k, h * k); ex.restore(); }
  }
  return { get on() { return on; }, reset, mark, put, present, shadow };
})();
