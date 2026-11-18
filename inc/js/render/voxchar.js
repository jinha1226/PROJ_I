'use strict';
// 복셀 층의 인물을 배경과 같은 빛 · 색으로 (2026-11-19 시험 — 사용자: 「배경이랑 분위기를 통일」 · 「실루엣, 액션만 괜찮으면」)
//  ?vchar=1  다시 칠하기: 32px 인형 그림 그대로(실루엣 · 액션 그대로). 윤곽에서 안쪽까지의 거리로 두께를 추정해 방향 있는 빛을 받게 하고,
//            던전과 같은 식으로 칠한다 — 등불 빛(voxel.js shade와 같은 식) · 빛 밖은 흑백 · 14단계 + 4×4 디더(fin) · 테두리는 어둡게
//  ?vchar=2  ½ 복셀: 인형을 던전 복셀 절반 크기의 정육면체로 — 칸마다 윗면 · +y(왼쪽 앞) · +x(오른쪽 앞) 면을 던전 복셀과 같은 shade로
//  없으면 지금 그대로. 몬스터 그림도 같은 길(actors.js drawRec의 blit)이라 함께 바뀐다.
const VCH = (() => {
  const mode = VOXON ? +(q.get('vchar') || 0) : 0;
  const A = () => VOX.api, now = () => performance.now() / 1000;
  const R2i = 1 / Math.SQRT2;
  // 화면 방향 → 월드 방향: 오른쪽 û = (1, −1)/√2 · 아래 = SIN·v̂ − COS·ẑ · 보는 쪽 = COS·v̂ + SIN·ẑ (v̂ = (1, 1)/√2)
  const toWorld = (nx, ny, nz) => [(nx + (ny * SIN + nz * COS)) * R2i, (-nx + (ny * SIN + nz * COS)) * R2i, -ny * COS + nz * SIN];
  const litAt = e => { const a = A(); if (!a.cur || !a.vis) return false; const x = Math.round(e._rx ?? e._dx ?? e.x), y = Math.round(e._ry ?? e._dy ?? e.y); return !!a.vis[y * a.mw + x]; };
  const edgeCol = c => rgb((c & 255) * .35, (c >> 8 & 255) * .32, (c >> 16 & 255) * .38); // voxel.js 외곽선과 같은 어둡게
  const ink = rgb(...C.ink);

  // ── 1) 다시 칠하기 ──
  // 그림마다 한 번: 윤곽까지의 거리 → 둥근 두께 → 화면 기준 법선 (오른쪽 · 아래 · 보는 쪽)
  const rel = new WeakMap();
  function relief(sp) {
    let R = rel.get(sp); if (R) return R;
    const w = sp.w, h = sp.foot + 1, n = w * h, D = new Float32Array(n), Hh = new Float32Array(n), N = new Float32Array(n * 3), edge = new Uint8Array(n);
    const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !!sp.px[y * w + x];
    for (let i = 0; i < n; i++) D[i] = sp.px[i] ? 1e9 : 0;
    const relax = (i, j, c) => { if (D[j] + c < D[i]) D[i] = D[j] + c; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!D[i]) continue; if (x > 0) relax(i, i - 1, 1); else D[i] = Math.min(D[i], 1); if (y > 0) { relax(i, i - w, 1); if (x > 0) relax(i, i - w - 1, 1.41); if (x < w - 1) relax(i, i - w + 1, 1.41); } else D[i] = Math.min(D[i], 1); }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!D[i]) continue; if (x < w - 1) relax(i, i + 1, 1); else D[i] = Math.min(D[i], 1); if (y < h - 1) { relax(i, i + w, 1); if (x < w - 1) relax(i, i + w + 1, 1.41); if (x > 0) relax(i, i + w - 1, 1.41); } else D[i] = Math.min(D[i], 1); }
    const RR = 4; // 두께 반지름(픽셀): 몸통은 둥글게, 칼 · 지팡이처럼 얇은 것은 얇게
    for (let i = 0; i < n; i++) { const d = Math.min(D[i] / RR, 1); Hh[i] = D[i] ? RR * Math.sqrt(1 - (1 - d) * (1 - d)) : 0; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!sp.px[i]) continue;
      const hx = (x < w - 1 ? Hh[i + 1] : 0) - (x > 0 ? Hh[i - 1] : 0), hy = (y < h - 1 ? Hh[i + w] : 0) - (y > 0 ? Hh[i - w] : 0), l = Math.hypot(hx * .5, hy * .5, 1);
      N[i * 3] = -hx * .5 / l; N[i * 3 + 1] = -hy * .5 / l; N[i * 3 + 2] = 1 / l;
      edge[i] = !on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1) ? 1 : 0;
    }
    R = { Hh, N, edge }; rel.set(sp, R); return R;
  }
  // 인물이 받는 빛: 들고 다니는 등불(첫 빛)을 화면 쪽으로 조금 — 등불이 앞사람 몸 안에 있어서 인물 앞면(화면 쪽)이 어둡던 것.
  // 앞에 들고 있는 것처럼 (복셀 좌표로 보는 쪽 v̂ 방향 FILL만큼). 횃불 · 화로는 그대로
  const FILL = 6; let lk = null, lights = null;
  const lightsNow = () => { const c = A().cur; if (c !== lk) { lk = c; lights = c.lights.map((Lg, i) => (i ? Lg : { ...Lg, x: Lg.x + FILL, y: Lg.y + FILL })); } return lights; };
  // voxel.js shade와 같은 식, 면 대신 아무 법선이나 (a = 1)
  function shadeN(r0, g0, b0, Nw, px, py, pz) {
    const a = A(), L0 = a.cur, q2 = 1 - Math.hypot(px - L0.x, py - L0.y) / a.LR; if (q2 <= 0) return null;
    const u = Math.min(1, q2 / .45), fk = u * u * (3 - 2 * u), up = .9 + .25 * Math.max(0, Nw[2]);
    let lr = .32 * up, lg = .33 * up, lb = .44 * up;
    for (const Lg of lightsNow()) {
      const dx = Lg.x - px, dy = Lg.y - py, dz = Lg.z - pz, dd = Math.hypot(dx, dy, dz) + 1e-3, qq = dd / Lg.r; if (qq > 2.6) continue;
      const nd = Math.max(0, (Nw[0] * dx + Nw[1] * dy + Nw[2] * dz) / dd); if (!nd) continue;
      const val = Lg.i / (1 + qq * qq * 2.2) * (1 - qq / 2.6) * nd; lr += Lg.c[0] * val; lg += Lg.c[1] * val; lb += Lg.c[2] * val;
    }
    let R = r0 * lr, G2 = g0 * lg, B = b0 * lb;
    if (fk < 1) { const gy = a.grayLin(r0, g0, b0, 1, 1); R = gy[0] + (R - gy[0]) * fk; G2 = gy[1] + (G2 - gy[1]) * fk; B = gy[2] + (B - gy[2]) * fk; }
    return [R, G2, B];
  }
  const ALB = .8; // 인형 그림의 색은 이미 밝게 칠한 색 — 바닥 · 벽과 같은 밝기로 받게 조금 낮춘다
  function relit(sp, sx, sy, d0, o, e) {
    const a = A(), Rl = relief(sp), w = sp.w, L = Math.round(sx - w / 2), B = Math.round(sy), lit = litAt(e), t = now();
    const WX = wx(e._rx ?? e._dx ?? e.x), WY = wy(e._ry ?? e._dy ?? e.y), bx = cam.ix || 0, by = cam.iy || 0, fl = o.flip ? -1 : 1;
    for (let j = 0; j <= sp.foot; j++) {
      const up = sp.foot - j, d = d0 + up / (COS * S) * SIN + .06, iy = B - up; if (iy < 0 || iy >= H) continue;
      for (let i = 0; i < w; i++) {
        const si = j * w + (o.flip ? w - 1 - i : i), c = sp.px[si]; if (!c) continue;
        const ix = L + i; if (ix < 0 || ix >= W) continue;
        const k = iy * W + ix, r0 = (c & 255) / 255 * ALB, g0 = (c >> 8 & 255) / 255 * ALB, b0 = (c >> 16 & 255) / 255 * ALB;
        const Nw = toWorld(Rl.N[si * 3] * fl, Rl.N[si * 3 + 1], Rl.N[si * 3 + 2]);
        const du = (i - w / 2) / S, hb = Rl.Hh[si] / S * .5, [px, py, pz] = a.toV(WX + (du + hb) * R2i, WY + (hb - du) * R2i, up / (COS * S));
        const col = (lit && shadeN(r0, g0, b0, Nw, px, py, pz)) || a.grayLin(r0, g0, b0, 1, 1);
        let out = a.fin(col[0], col[1], col[2], ix + bx, iy + by); if (Rl.edge[si] || c === ink) out = edgeCol(out);
        if (d <= zb[k]) { if (o.xray && zb[k] === bakedZ[k] && !((ix + iy) & 1)) pix[k] = XRAY(pix[k], out); continue; }
        zb[k] = d; pix[k] = out;
      }
    }
    return true;
  }

  // ── 2) ½ 복셀 ──
  // 그림마다 한 번: 화면을 ½ 복셀 칸(가로 = 정육면체 대각선, 세로 = 옆면 높이)으로 나눠 칸의 색 (테두리 잉크는 빼고 평균)
  const cells = new WeakMap();
  function grid(sp) {
    let G0 = cells.get(sp); if (G0) return G0;
    const a = A(), hv = a.VS / 2, cw = hv * S * Math.SQRT2, ch = hv * COS * S, w = sp.w, h = sp.foot + 1;
    const C0 = Math.ceil(w / 2 / cw) + 1, cols = C0 * 2 + 1, rows = Math.ceil(h / ch) + 1, col = new Uint32Array(cols * rows);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x0 = w / 2 + (c - C0 - .5) * cw, x1 = x0 + cw, u0 = r * ch, u1 = u0 + ch; let n = 0, on = 0, ni = 0, R = 0, G2 = 0, B = 0;
      for (let y = Math.floor(sp.foot - u1 + 1); y <= Math.floor(sp.foot - u0); y++) for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
        n++; if (x < 0 || y < 0 || x >= w || y > sp.foot) continue; const p = sp.px[y * w + x]; if (!p) continue; on++;
        if (p === ink) { ni++; continue; } R += p & 255; G2 += p >> 8 & 255; B += p >> 16 & 255;
      }
      const m = on - ni; if (!n || on / n < .45) continue;
      col[r * cols + c] = m ? rgb(R / m, G2 / m, B / m) : ink;
    }
    G0 = { cols, rows, C0, col, hv }; cells.set(sp, G0); return G0;
  }
  const FACE = [[0, 0, 1], [0, 1, 0], [1, 0, 0]]; // voxel.js NORM과 같은 차례: 윗면 · +y · +x
  function voxels(sp, sx, sy, d0, o, e) {
    const a = A(), G0 = grid(sp), { cols, rows, C0, col, hv } = G0, lit = litAt(e), t = now(), fl = o.flip ? -1 : 1;
    const WX = wx(e._rx ?? e._dx ?? e.x), WY = wy(e._ry ?? e._dy ?? e.y), bx = cam.ix || 0, by = cam.iy || 0;
    const f0 = project(WX, WY, 0), offX = sx - f0.sx, offY = sy - f0.sy, offD = d0 - f0.d; // 지금 그리는 자리(흔들림 · 튐 포함)에 맞춘다
    const n = Math.ceil(S * hv * 1.3), STEP = 1 / n, drawn = [];
    const has = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && !!col[r * cols + c];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cc = col[r * cols + c]; if (!cc) continue;
      const cx = (c - C0) * fl, x = WX + cx * hv, y = WY - cx * hv, z = r * hv; // 대각선으로 늘어선 정육면체 (화면에서 한 줄)
      const r0 = (cc & 255) / 255 * ALB, g0 = (cc >> 8 & 255) / 255 * ALB, b0 = (cc >> 16 & 255) / 255 * ALB;
      for (let dir = 0; dir < 3; dir++) {
        if (dir === 0 && has(c, r + 1)) continue; // 위에 칸이 있으면 윗면은 가린다
        const nn = FACE[dir], [vx, vy, vz] = a.toV(x + hv * (nn[0] ? 1 : .5), y + hv * (nn[1] ? 1 : .5), z + hv * (nn[2] ? 1 : .5));
        const L = (lit && shadeN(r0, g0, b0, nn, vx, vy, vz)) || a.grayLin(r0, g0, b0, 1, dir); // 면 법선으로 같은 식 (윗면 1.15 · 옆면 0.9도 같다)
        for (let s = STEP / 2; s < 1; s += STEP) for (let u = STEP / 2; u < 1; u += STEP) {
          const px = x + hv * (dir === 2 ? 1 : s), py = y + hv * (dir === 0 ? u : dir === 1 ? 1 : s), pz = z + hv * (dir === 0 ? 1 : u);
          const P = project(px, py, pz), ix = (P.sx + offX) | 0, iy = (P.sy + offY) | 0; if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
          const k = iy * W + ix, dd = P.d + offD + .06; if (dd <= zb[k]) continue;
          zb[k] = dd; pix[k] = a.fin(L[0], L[1], L[2], ix + bx, iy + by); drawn.push(k);
        }
      }
    }
    // 테두리: 그린 픽셀 중 바깥과 닿은 곳을 어둡게 (복셀 판의 외곽선처럼)
    const mine = new Set(drawn);
    for (const k of mine) { const x = k % W; if (!mine.has(k - 1) && x > 0 || !mine.has(k + 1) && x < W - 1 || !mine.has(k - W) || !mine.has(k + W)) pix[k] = edgeCol(pix[k]); }
    return true;
  }

  // drawRec에서: 처리했으면 true (안 하면 원래 blit). 맞는 반짝임 · 커지는 중(배율이 정수가 아님)은 원래대로
  function draw(sp, sx, sy, d0, o, e) {
    if (!mode || !VOX.api?.toV || o.flash || (o.sc || 1) !== 1 || !e) return false;
    return mode === 2 ? voxels(sp, sx, sy, d0, o, e) : relit(sp, sx, sy, d0, o, e);
  }
  return { on: mode > 0, mode, draw };
})();
