'use strict';
// 그리기 루프 (2026-11-17 2단계): 옛 legacy/iso/main.js의 frame()에서 그리기만 남겼다 — 옛 흐름(G.tick) · 옛 HUD(drawBrief · ui · 말풍선) · 지휘(CMD) · 상태창 · 도감은 뺐다.
let last = now(), fps = 0, fN = 0, fT = now(), acc = 0, cost = 0;
function frame(tt) {
  const n = now(); let dt = Math.min(.25, (n - last) / 1000); last = n; acc += dt;
  if (JU.frozen()) acc = 0; // 타격 경직: 그동안 게임 시간은 흐르지 않는다
  const t = n / 1000, r = rt();
  CRAWL.frame(dt);
  if (!r.map || !r.party) { requestAnimationFrame(frame); return; }
  const c0 = now();
  const ref = r.party.find(p => !p.dead) || r.hero;
  if (r.map?.redraw) { r.map.redraw = false; win.map = null; }
  if (win.map !== r.map) { fxLive.length = 0; for (const P of r.map.props || []) { P._fx = null; P._zz = null; P._zzOn = false; P._cand = null; } const b0 = now(); bakeFloor(r.map); bake0 = now() - b0; canvas.style.transition = 'none'; canvas.style.opacity = 0; requestAnimationFrame(() => requestAnimationFrame(() => { canvas.style.transition = 'opacity .35s'; canvas.style.opacity = 1; })); for (const e of r.party.concat(r.mons)) { e._rx = e._dx = e.x; e._ry = e._dy = e.y; e._ldx = e.x; e._ldy = e.y; } const c0 = camFor(ref.x, ref.y); cam.x = c0[0]; cam.y = c0[1]; }
  // 싸울 때는 싸우는 사람들 가운데를, 아니면 파티 가운데를 본다
  { const list = (r.turn ? r.turn.order.map(x => x.e).filter(e => e.kind !== 'mon' ? !e.dead : r.mons.includes(e)) : r.party.filter(p => !p.dead)); let ax = 0, ay = 0, n0 = 0; for (const e of list) { ax += e.x; ay += e.y; n0++; } if (n0) { const c1 = camFor(ax / n0, ay / n0), k = 1 - Math.exp(-dt * 3.2); cam.x += (c1[0] - cam.x) * k; cam.y += (c1[1] - cam.y) * k; } }
  syncFog(r); copyView(); if (VOXON) VOX.light(r, t); /* 복셀 층: 파티 둘레만 빛 */
  if (win.map === r.map) document.body.dataset.floor = 'ready';
  pix.set(bakedPix); zb.set(bakedZ);
  drawProps(r, t); if (VOXON) VOX.flush(t); /* 복셀 소품 */ drawTufts(t); HDBG.mark(0); // 선 그림 배경: 소품까지 그린 상태
  if (SPR) {
    settle(r, dt);
    const recs = r.mons.concat(r.party).map(e => prep(e, r, t, dt)).filter(Boolean);
    flushShadow(); applyShadows(bakedZ); shadeEdges(); HDBG.mark(1); // 그림자까지
    drawRange(r); drawAim(r, t); stepFx(dt); paintFx(true); HDBG.mark(2); // 바닥 이펙트(횃불 빛)까지
    for (const R0 of recs) drawRec(R0, t);
    if (MINI_ON) MD.snap();
    // 쓰러져 사망 내성 중인 사람은 피를 흘린다
    for (const p of r.party) { if (p.dying && !p._bleed) p._bleed = pfx('status/bleeding', wx(p._dx ?? p.x), wy(p._dy ?? p.y), 0, { e: p }); else if (!p.dying && p._bleed) { p._bleed.fx.stop(); p._bleed = null; } }
    drawParts(dt);
  } else {
  // 깊이 순서는 Z 버퍼가 맡는다
  for (const e of r.mons) drawEnt(e, r, t);
  for (const e of r.party) drawEnt(e, r, t);
  flushShadow(); applyShadows(bakedZ); shadeEdges();
  const st = r.turn;
  if (st && st.cur && !st.cur.dead && inWin(st.cur.x, st.cur.y)) { const e = st.cur, m = e._model || {}, p = project(wx(e._rx + (e._ox || 0)), wy(e._ry + (e._oy || 0)), (m.blob || m.mush ? 1.9 : 3.15) * (m.b || 1) * FIG); drawArrowAt(p.sx, p.sy - 3, t, e.kind === 'mon' ? C.red : [255, 214, 10]); }
  }
  if (SPR) paintFx(false);
  drawFx(r); drawNums();
  { const [jx, jy] = JU.step(dt), k = canvas.clientWidth / W; canvas.style.transform = Math.abs(jx) + Math.abs(jy) > .3 ? `translate(${(jx * k / 3).toFixed(1)}px,${(jy * k / 3).toFixed(1)}px)` : ''; } // 버퍼 px → 화면 (×3 기준 그대로)
  HDBG.put(ctx, image); // 선 그림 배경이면 배경 픽셀만 투명하게
  HDBG.present();
  if (MINI_ON) MD.present();
  VFX.present(); // 선 그림 이펙트 층 (인형 위)
  cost += (now() - c0); fN++;
  if (n - fT > 1000) { fps = fN; $('fps').textContent = q.has('debug') ? `${fps}fps · 프레임 ${(cost / fN).toFixed(1)}ms · 굽기 ${(bake0 || 0).toFixed(0)}ms` : ''; G.isoStat = { fps, ms: cost / fN, bake: bake0 }; fN = 0; cost = 0; fT = n; }
  drawOver(r); runVis(r); // 미니맵은 양피지 지도(CRAWL)
  document.body.dataset.ents = r.party.length + r.mons.length;
  requestAnimationFrame(frame);
}
G.iso = { f, rt, win, graves };
const boot = () => { fit(); requestAnimationFrame(() => { setZoom(HUD.zoom(), true); fit(); last = now(); frame(); }); }; // 확대는 화면 너비 기준 (hud.js)
if (DNG) loadTex().then(boot); else boot();
