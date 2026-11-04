'use strict';
// 메인 루프 · 도감 · 시작
function frame(tt) {
  const n = now(); let dt = Math.min(.25, (n - last) / 1000); last = n; acc += dt;
  while (acc >= .1) { if (!SH.open) G.tick(.1); acc -= .1; } // 상태창을 보는 동안은 멈춘다
  const t = n / 1000, r = rt();
  drawBrief();
  if (f.town) { for (const el of bubMap.values()) el.remove(); bubMap.clear(); for (const q of skFloats) q.el.remove(); skFloats.length = 0; }
  if (f.town || !r.map || !r.party) { requestAnimationFrame(frame); return; }
  const c0 = now();
  const ref = r.party.find(p => !p.dead) || r.hero;
  if (win.map !== r.map) { fxLive.length = 0; for (const P of r.map.props || []) { P._fx = null; P._zz = null; P._zzOn = false; P._cand = null; } const b0 = now(); bakeFloor(r.map); bake0 = now() - b0; canvas.style.transition = 'none'; canvas.style.opacity = 0; requestAnimationFrame(() => requestAnimationFrame(() => { canvas.style.transition = 'opacity .35s'; canvas.style.opacity = 1; })); for (const e of r.party.concat(r.mons)) { e._rx = e._dx = e.x; e._ry = e._dy = e.y; e._ldx = e.x; e._ldy = e.y; } const c0 = camFor(ref.x, ref.y); cam.x = c0[0]; cam.y = c0[1]; }
  // 싸울 때는 싸우는 사람들 가운데를, 아니면 파티 가운데를 본다
  { const list = (r.turn ? r.turn.order.map(x => x.e).filter(e => e.kind !== 'mon' ? !e.dead : r.mons.includes(e)) : r.party.filter(p => !p.dead)); let ax = 0, ay = 0, n0 = 0; for (const e of list) { ax += e.x; ay += e.y; n0++; } if (n0) { const c1 = camFor(ax / n0, ay / n0), k = 1 - Math.exp(-dt * 3.2); cam.x += (c1[0] - cam.x) * k; cam.y += (c1[1] - cam.y) * k; } }
  syncFog(r); copyView();
  drawBubbles(r); drawSkillNames(r);
  pix.set(bakedPix); zb.set(bakedZ);
  drawProps(r, t); drawTufts(t);
  if (SPR) {
    settle(r, dt);
    const recs = r.mons.concat(r.party).map(e => prep(e, r, t, dt)).filter(Boolean);
    flushShadow(); applyShadows(bakedZ); shadeEdges();
    drawRange(r); stepFx(dt); paintFx(true);
    for (const R0 of recs) drawRec(R0, t);
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
  canvas.style.transform = n - shakeT < 180 ? `translate(${Math.round((Math.random() - .5) * 6)}px,${Math.round((Math.random() - .5) * 6)}px)` : '';
  ctx.putImageData(image, 0, 0);
  cost += (now() - c0); fN++;
  if (n - fT > 1000) { fps = fN; $('fps').textContent = q.has('debug') ? `${fps}fps · 프레임 ${(cost / fN).toFixed(1)}ms · 굽기 ${(bake0 || 0).toFixed(0)}ms` : ''; G.isoStat = { fps, ms: cost / fN, bake: bake0 }; fN = 0; cost = 0; fT = n; }
  ui(r); drawOver(r); runVis(r);
  requestAnimationFrame(frame);
}
// 도감: 직업 12 + 몬스터를 한 판에 (?lineup)
function lineupDcss() {
  const w = 15, h = 9, m = { w, h, c: new Array(w * h).fill('.'), rooms: [{ x: 0, y: 0, w, h, cx: 7, cy: 4 }] };
  bakeFloor(m); win.map = m; { const c0 = camFor(7, 4); cam.x = c0[0]; cam.y = c0[1]; } copyView();
  const CL = Object.keys(G.DCSS.cls), MO = G.DCSS.mon.filter((x, i, a) => a.findIndex(y => y[1] === x[1]) === i).slice(0, 20), ents = [];
  CL.forEach((c, i) => ents.push({ sp: layered('c_' + c, G.DCSS.cls[c]), x: 1.2 + (i % 6) * 2.2, y: .6 + Math.floor(i / 6) * 2, key: 'c_' + c, parts: G.DCSS.cls[c] }));
  MO.forEach((x, i) => ents.push({ x: 1 + (i % 7) * 1.9, y: 4.6 + Math.floor(i / 7) * 1.6, key: 'm_' + x[1], parts: [x[1]] }));
  const go = () => { pix.set(bakedPix); zb.set(bakedZ); let ok = true; for (const e of ents) { const sp = layered(e.key, e.parts); if (!sp) { ok = false; continue; } const p = project(wx(e.x), wy(e.y), 0), F0 = sp.fr.idle[0]; blit({ w: sp.w, h: sp.h, foot: sp.foot, px: F0 }, p.sx, p.sy, p.d); if (sp.weapon) blit(sp.weapon, p.sx, p.sy - sp.foot + sp.weapon.foot, p.d + .1); } ctx.putImageData(image, 0, 0); if (!ok) setTimeout(go, 100); };
  go();
}
function lineup() {
  if (DCSS) return lineupDcss();
  const w = 15, h = 9, m = { w, h, c: new Array(w * h).fill('.'), rooms: [{ x: 0, y: 0, w, h, cx: 7, cy: 4 }] };
  bakeFloor(m); win.map = m; { const c0 = camFor(7, 4); cam.x = c0[0]; cam.y = c0[1]; } copyView();
  const CL = Object.keys(CLS), MON = ['고블린', '해골', '좀비', '오크 전사', '놀 전사', '임프', '늪 점액', '작은 버섯', '숲 늑대', '동굴 곰', '초트', '호박 망령', '오우거', '돌 골렘', '강령술사', '대악마'];
  const t = now() / 1000; pix.set(bakedPix); zb.set(bakedZ);
  CL.forEach((k, i) => { const x = wx(1.5 + (i % 6) * 2.2), y = wy(.8 + Math.floor(i / 6) * 2), m0 = CLS[k]; person(x, y, .8, m0, { scale: FIG, arm: .35, up: .9, armL: m0.o === 'shield' ? 1.2 : .5 }); });
  MON.forEach((n, i) => { const o = monModel({ n }), x = wx(1 + (i % 8) * 1.75), y = wy(5 + Math.floor(i / 8) * 2.2); if (o.blob) blob(x, y, o, t); else if (o.mush) shroom(x, y, o, t); else if (o.quad) quad(x, y, .8, o, t); else if (o.spider) spider(x, y, o, t); else if (o.ghost) ghost(x, y, o, t); else person(x, y, .8, o, { scale: FIG, arm: .35, up: .9 }); });
  flushShadow(); applyShadows(bakedZ); shadeEdges(); ctx.putImageData(image, 0, 0);
}
G.iso = { f, rt, bakeRoom, win, graves };
const boot = () => {
  if (q.has('lineup')) { fit(); lineup(); document.getElementById('wrap').querySelector('#top').textContent = '직업 12 · 몬스터'; return; }
  fit(); requestAnimationFrame(() => { fit(); last = now(); frame(); });
};
if (DNG) loadTex().then(boot); else boot();
// 시험용: ?sheet=1 — 시작하면 첫 동료의 상태창을 연다
if (q.get('sheet')) setTimeout(() => openSheet(f.mercs[0] || G.Guild.leader(f)), 800);
