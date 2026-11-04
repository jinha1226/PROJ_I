'use strict';
// 화면 맞춤 · 게임 효과(G.fx) 그리기
// ───── 화면 ─────
const $ = id => document.getElementById(id), floats = $('floats');
const allBtn = document.createElement('button'); allBtn.id = 'allbtn'; allBtn.textContent = '전체 지도'; allBtn.style.cssText = 'font:inherit;color:inherit;background:none;border:1px solid var(--line);padding:2px 8px;cursor:pointer;margin-left:8px';
const spdBtn = document.createElement('button'); spdBtn.id = 'spd'; spdBtn.style.cssText = allBtn.style.cssText; spdBtn.title = '배속 (T)';
const spdShow = () => { spdBtn.textContent = `×${G.Turn.speed(f)}`; }; spdShow();
const spdNext = () => { G.Turn.nextSpeed(f); spdShow(); };
spdBtn.onclick = spdNext; addEventListener('keydown', e => { if (e.key.toLowerCase() === 't' && !e.repeat) spdNext(); });
document.getElementById('top').append(spdBtn, allBtn);
const over = document.createElement('canvas'); over.style.cssText = 'position:absolute;inset:0;margin:auto;max-width:96%;max-height:96%;background:var(--bg);z-index:5;display:none;image-rendering:auto'; document.getElementById('stage').append(over);
allBtn.onclick = () => { const on = over.style.display === 'none'; over.style.display = on ? 'block' : 'none'; canvas.style.visibility = on ? 'hidden' : ''; };
function drawOver(r) {
  if (over.style.display === 'none' || !big.cv) return;
  if (big.cvVer !== big.fogVer) { big.cvVer = big.fogVer; big.cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(big.pix.buffer.slice(0)), big.w, big.h), 0, 0); } // 전체 지도도 본 곳만
  over.width = big.w; over.height = big.h; const x = over.getContext('2d'); x.drawImage(big.cv, 0, 0);
  for (const p of r.party) { if (p.dead) continue; const u = (wx(p.x) - wy(p.y)) / R2, v = (wx(p.x) + wy(p.y)) / R2; x.fillStyle = '#d33'; x.fillRect(big.ox + u * S - 5, big.oy + v * SIN * S - 12, 10, 12); }
}
function fit() {
  const stage = $('stage'), dpr = devicePixelRatio || 1, a = Math.min(stage.clientWidth / W, stage.clientHeight / H), s = Math.max(1, Math.floor(a * dpr)) / dpr;
  canvas.style.width = W * s + 'px'; canvas.style.height = H * s + 'px'; fit.s = s;
}
addEventListener('resize', fit);
const toScreen = (x, y, z) => { const p = project(x, y, z), r = canvas.getBoundingClientRect(), st = $('stage').getBoundingClientRect(); return [r.left - st.left + p.sx * fit.s, r.top - st.top + p.sy * fit.s]; };
const fxSeen = new WeakSet();
function drawFx(r) {
  for (const o of r.fx || []) {
    if (o.k === 'proj' && !o._own && PROJ_FX[o.key] && o.x2 != null) {
      o._own = 1;
      const x0 = wx(o.x), y0 = wy(o.y), x1 = wx(o.x2), y1 = wy(o.y2), a0 = project(x0, y0, Z_CHEST), a1 = project(x1, y1, Z_CHEST);
      pfx(PROJ_FX[o.key], x0, y0, Z_CHEST, { angle: Math.atan2(a1.sy - a0.sy, a1.sx - a0.sx), to: { x0, y0, x1, y1, t: Math.max(.14, o.t || .25) } });
    }
    if (o._own) continue;
    if (o.k === 'tile' && o.key === 'fx_holy' && !o._h && inWin(o.x, o.y)) { o._h = 1; let who = null, bd = 1.5; for (const p of r.party) { const d = Math.hypot(p.x - o.x, p.y - o.y); if (!p.dead && d < bd) { bd = d; who = p; } } pfx('holy/heal', wx(who ? who._dx ?? who.x : o.x), wy(who ? who._dy ?? who.y : o.y), 0, { k: 1.4, e: who }); continue; }
    if (o.k === 'text' && !fxSeen.has(o)) {
      fxSeen.add(o);
      if (!inWin(o.x, o.y + 1)) continue;
      const num = /^([+\-]?)([\d,.]+)$/.exec(String(o.s).trim());
      if (SPR && num) {
        const n0 = now(), val = Math.round(parseFloat(num[2].replace(/,/g, ''))), s0 = dispAt(o.x, o.y + 1, r), p = project(wx(s0[0]), wy(s0[1]), 2.7), c = rgb(...hexRgb(o.col || '#ffffff'));
        // 같은 대상 · 같은 색이 짧은 사이에 또 뜨면 숫자를 더한다. 가까이 다른 숫자가 있으면 위로 쌓는다
        const same = nums.find(u => u.c === c && u.sign === num[1] && Math.abs(u.x0 - p.sx) < 12 && Math.abs(u.y0 - p.sy) < 12 && n0 - u.t0 < 450);
        if (same) { same.v += val; same.s = num[1] + same.v; same.t0 = n0 - 60; same.bump = n0; continue; }
        let y = p.sy; for (let g = 0; g < 4 && nums.some(u => Math.abs(u.x - p.sx) < 26 && Math.abs(u.y - y) < 12); g++) y -= 12;
        nums.push({ v: val, sign: num[1], s: num[1] + val, x: p.sx, y, x0: p.sx, y0: p.sy, c, t0: n0 });
        continue;
      }
      const [sx, sy] = toScreen(wx(o.x), wy(o.y + (o.ent ? 0 : 1)), 3.1), el = document.createElement('div');
      el.className = 'fl'; el.textContent = o.s; el.style.left = sx + 'px'; el.style.top = sy + 'px'; el.style.color = o.col === '#fff' || o.col === '#ffffff' ? 'var(--ink)' : o.col; el.style.fontSize = 13 + (o.sz || 1) * 4 + 'px';
      floats.append(el); const t0 = now();
      const tick = () => { const q = (now() - t0) / 900; if (q >= 1) { el.remove(); return; } el.style.transform = `translate(-50%,calc(-100% - ${q * 22}px))`; el.style.opacity = q > .7 ? (1 - q) / .3 : 1; requestAnimationFrame(tick); }; tick();
    } else if (o.k === 'proj' && o.x2 != null) {
      const pr = clamp(1 - o.t / (o.max || 1), 0, 1), a0 = dispAt(o.x, o.y, r), b0 = dispAt(o.x2, o.y2, r), A = project(wx(a0[0]), wy(a0[1]), 1.3), B = project(wx(b0[0]), wy(b0[1]), 1.1), X = lerp(A.sx, B.sx, pr), Y = lerp(A.sy, B.sy, pr) - Math.sin(pr * 3.14) * 7;
      if (o.key === 'fx_arrow') { const sp = sprite('fx_arrow'); if (sp) blitRot(sp, X, Y, Math.atan2(B.sy - A.sy, B.sx - A.sx) + 1.57, .55, 1e5, { py: sp.h / 2 }); }
      else {
        const cc = PROJC[o.key] || PROJC.fx_holy, core = rgb(...cc[0]), edge = rgb(...cc[1]);
        for (let i = 8; i >= 0; i--) { const q2 = pr - i * .035; if (q2 < 0) continue; const tx = lerp(A.sx, B.sx, q2), ty = lerp(A.sy, B.sy, q2) - Math.sin(q2 * 3.14) * 7, r2 = i === 0 ? 3 : Math.max(1, 3 - i * .35); for (let a = -r2; a <= r2; a++) for (let b = -r2; b <= r2; b++) if (a * a + b * b <= r2 * r2) { const k = (ty + b | 0) * W + (tx + a | 0); if (k >= 0 && k < pix.length && (i === 0 || (i + a + b) % 2 === 0)) pix[k] = i === 0 && a * a + b * b < 3 ? rgb(255, 250, 230) : i < 3 ? core : edge; } }
      }
      if (pr > .9 && !o._hitFx) { o._hitFx = 1; const cc = PROJC[o.key]; spark(B.sx, B.sy, cc ? 16 : 5, cc ? [rgb(...cc[0]), rgb(...cc[1]), rgb(255, 250, 230)] : [rgb(255, 240, 200)], cc ? 70 : 40); }
    } else if (o.k === 'bolt' || ((o.k === 'beam' || o.k === 'chain') && (o.x2 != null || o.pts))) {
      const pts = o.k === 'bolt' ? [project(wx(o.x), wy(o.y), 14), project(wx(o.x), wy(o.y), 0)] : o.pts ? o.pts.map(q2 => project(wx(q2[0]), wy(q2[1]), 1.5)) : [project(wx(o.x), wy(o.y), 1.5), project(wx(o.x2), wy(o.y2), 1.5)], c = rgb(...hexRgb(o.col || '#fff4c0')), fl = Math.floor(now() / 45);
      for (let n = 0; n + 1 < pts.length; n++) { const a = pts[n], b = pts[n + 1], L = Math.ceil(Math.hypot(b.sx - a.sx, b.sy - a.sy)); let jx = 0, jy = 0; for (let i = 0; i <= L; i++) { if (i % 5 === 0) { jx = (hash(i, fl + n) - .5) * 7; jy = (hash(fl, i + n) - .5) * 7; } const e = Math.sin(i / L * 3.14), ix = lerp(a.sx, b.sx, i / L) + jx * e | 0, iy = lerp(a.sy, b.sy, i / L) + jy * e | 0, k = iy * W + ix; if (k >= W && k < pix.length - W) { pix[k] = rgb(255, 252, 240); pix[k - W] = c; pix[k + W] = c; } } }
    } else if (o.k === 'slash' && o.x != null && inWin(o.x, o.y)) {
      const pr = clamp(1 - o.t / (o.max || 1), 0, 1), s0 = dispAt(o.x, o.y, r), p = project(wx(s0[0]), wy(s0[1]), 1.3), R = (o.crit ? 15 : 11) + pr * 3, dir = o.flip ? -1 : 1, rot = (o.rot || 0) * .6, a0 = -1.9, a1 = 1.1, head = lerp(a0, a1, Math.min(1, pr * 1.8)), tail = lerp(a0, a1, Math.max(0, pr * 1.8 - .5));
      const cW = rgb(255, 252, 240), cY = o.crit ? rgb(255, 196, 70) : rgb(214, 226, 240);
      for (let a = tail; a <= head; a += .035) { const u = (a - tail) / Math.max(.01, head - tail), wid = 2.6 * Math.sin(u * 3.14) + .5; for (let r3 = -wid; r3 <= wid; r3 += .7) { const ang = a + rot, X = p.sx + dir * Math.cos(ang) * (R + r3), Y = p.sy + Math.sin(ang) * (R + r3) * .72, k = (Y | 0) * W + (X | 0); if (k >= 0 && k < pix.length) pix[k] = Math.abs(r3) < wid * .5 ? cW : cY; } }
    } else if (o.k === 'impact' && o.x != null && !o._d && inWin(o.x, o.y)) { o._d = 1; const p = project(wx(o.x), wy(o.y), 1.2); spark(p.sx, p.sy, 14, [rgb(255, 245, 210), rgb(255, 190, 90)], 80); }
    else if (o.k === 'splat' && o.x != null && !o._d && inWin(o.x, o.y)) { o._d = 1; const p = project(wx(o.x), wy(o.y), .6); spark(p.sx, p.sy, 16, [rgb(150, 34, 36), rgb(90, 20, 30)], 55, 170, .5); }
    else if (o.k === 'tile' && o.x != null && !o._d && inWin(o.x, o.y)) { o._d = 1; const p = project(wx(o.x), wy(o.y), 1.2), cc = PROJC[o.key] || PROJC.fx_flame; spark(p.sx, p.sy, 18, [rgb(...cc[0]), rgb(...cc[1])], 60, -30, .55); }
    else if (o.k === 'ring' && o.x != null && inWin(o.x, o.y)) {
      const pr = 1 - o.t / (o.max || 1), R = (o.r || 1) * T * (.5 + pr * .5), c = rgb(...hexRgb(o.col || '#ffe08a'));
      for (let a = 0; a < 6.28; a += .04) { const p = project(wx(o.x) + Math.cos(a) * R, wy(o.y) + Math.sin(a) * R, .05), j = (p.sy | 0) * W + (p.sx | 0); if (j >= 0 && j < pix.length && ground[j] && zb[j] === bakedZ[j] && hash(a * 9, 3) > pr * .7) pix[j] = c; }
    }
  }
}
const hexRgb = h => { const n = parseInt((h || '#fff').slice(1, 7).padEnd(6, 'f'), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const inWin = (x, y) => !!win.map && x >= -1 && y >= -1 && x <= win.map.w && y <= win.map.h;
