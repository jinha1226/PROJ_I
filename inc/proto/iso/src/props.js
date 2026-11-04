'use strict';
// 판정 결과와 소품: 효과 · 상자 · 장면 소품 · 함정 · 횃불
// ───── 판정의 결과를 바닥 위에 ─────
const fount = (x, y, n, cols, v, g, life) => { for (let i = 0; i < n && parts.length < 400; i++) parts.push({ x, y, vx: (Math.random() - .5) * v * .9, vy: -v * (.45 + Math.random() * .75), g, t: life * (.55 + Math.random() * .6), c: cols[i % cols.length] }); };
const COINS = [rgb(255, 214, 90), rgb(240, 176, 50), rgb(255, 240, 170), rgb(190, 130, 36)], SMOKE = [rgb(58, 54, 60), rgb(84, 78, 84), rgb(40, 36, 42)];
const spikes = [];
// 판정 결과는 주사위가 멈춘 뒤에 일어난다
function runVis(r) {
  if (!r.vis || !r.vis.length) return;
  const R = r.roll; if (R && !R.quiet && R.nat != null && (R.id !== dieId || dieRolling())) return;
  for (const v of r.vis.splice(0)) {
    if (v.k === 'reveal') {
      v.e._mark = { c: v.ok ? [255, 214, 10] : [255, 70, 60], until: now() + 1400 };
      if (!v.ok) shakeT = now();
    } else if (v.k === 'stash') {
      const P = v.prop, a = project(wx(P.x), wy(P.y), 1);
      P.state = v.ok ? 'open' : 'ash'; P.t0 = now();
      if (v.ok) burst('coins', wx(P.x), wy(P.y), r);
      else { fount(a.sx, a.sy, 30, SMOKE, 42, -12, 1.5); G.fx(r, { k: 'text', x: P.x, y: P.y - 1, s: '허탕', col: '#9aa0a8', t: 1.1, sz: .9 }); }
    } else if (v.k === 'prop') {
      const P = v.P; if (v.state) { P.state = v.state; P.t0 = now(); }
      burst(v.fx, wx(P.fx == null ? P.x : P.fx), wy(P.fy == null ? P.y : P.fy), r);
    } else if (v.k === 'at') {
      if (v.e.dead) continue;
      burst(v.fx, wx(v.e.x), wy(v.e.y), r, v.e);
      if (v.fx === 'hurt') J.hit('fantasy', v.e, 1);
  } else if (v.k === 'brawl') {
      J.lunge('fantasy', v.w, v.l); J.hit('fantasy', v.l, 1); burst('hurt', wx(v.l.x), wy(v.l.y), r);
    } else if (v.k === 'coins') { burst('coins', wx(v.x), wy(v.y), r); }
    else if (v.k === 'chest') { v.c.mark = !0; if (v.c.mimic) v.c._mark = { c: [255, 70, 60], until: now() + 1e9 }; else v.c.glint = true; }
    else if (v.k === 'spikes') { spikes.push({ x: v.x, y: v.y, t0: now() }); const a = project(wx(v.x), wy(v.y), .3); spark(a.sx, a.sy, 26, [rgb(210, 200, 190), rgb(120, 112, 110), rgb(200, 60, 50)], 90, 160, .55); shakeT = now(); }
    else if (v.k === 'disarm') { const a = project(wx(v.x), wy(v.y), .2); spark(a.sx, a.sy, 16, [rgb(255, 230, 120), rgb(200, 190, 180)], 60, 120, .5); G.fx(r, { k: 'text', x: v.x, y: v.y - 1, s: '해체', col: '#ffd24a', t: 1, sz: .9 }); }
  }
}
// 판정 결과 효과: 한 곳에서 관리한다
function burst(fx, x, y, r, e) {
  if (!fx) return;
  const a = project(x, y, 1.2);
  if (fx === 'coins') { fount(a.sx, a.sy, 80, COINS, 150, 300, 1.3); pfx('pickups/collect-burst', x, y, .4, {}); }
  else if (fx === 'poof') pfx('spawn/poof', x, y, 0, { k: 1.2 });
  else if (fx === 'dust') { spark(a.sx, a.sy + 8, 44, [rgb(170, 160, 146), rgb(120, 112, 104), rgb(200, 190, 170)], 110, 40, .8); shakeT = now(); }
  else if (fx === 'rattle') { spark(a.sx, a.sy - 8, 16, [rgb(255, 214, 120), rgb(220, 220, 230)], 90, 200, .4); shakeT = now(); }
  else if (fx === 'clang') { spark(a.sx, a.sy, 22, [rgb(240, 220, 170), rgb(200, 200, 210)], 120, 220, .5); shakeT = now(); }
  else if (fx === 'holy') pfx('holy/heal', x, y, 0, { e });
  else if (fx === 'blood') { fount(a.sx, a.sy, 50, [rgb(214, 40, 44), rgb(140, 20, 30), rgb(255, 90, 70)], 120, 180, 1); shakeT = now(); }
  else if (fx === 'curse') pfx('shadow/curse', x, y, 0, { k: 1.5, e });
  else if (fx === 'calm') fount(a.sx, a.sy - 8, 16, [rgb(150, 230, 190), rgb(220, 255, 230)], 30, -30, .9);
  else if (fx === 'hurt') spark(a.sx, a.sy, 22, [rgb(214, 40, 44), rgb(150, 24, 30)], 80, 160, .5);
}
const NPC = { merchant: ['m_human', ['m_human']], skel: ['m_skeleton_humanoid_small', ['m_skeleton_humanoid_small']] };
function propFig(key, parts, x, y, o = {}) {
  const dl = layered(key, parts); if (!dl) return;
  const b = project(x, y, 0);
  blit({ w: dl.w, h: dl.h, foot: dl.foot, px: dl.fr.idle[0] }, b.sx, b.sy + (o.dy || 0), b.d, { flip: !!o.flip, sc: SC });
}
// 장면 소품
function drawScene(P, t) {
  const x = wx(P.x), y = wy(P.y), st = P.state, age = P.t0 ? (now() - P.t0) / 1000 : 0, IRON = [84, 86, 98], STONE = C.stone;
  const emit = (fx, rate) => { if (Math.random() < rate) { const a = project(x, y, 1); if (fx === 'holy') fount(a.sx, a.sy, 1, [rgb(255, 244, 190), rgb(255, 226, 130)], 34, -14, 1.1); else if (fx === 'blood') fount(a.sx, a.sy, 1, [rgb(214, 40, 44), rgb(255, 90, 70)], 44, 90, .7); } };
  if (P.sc === 'door') {
    // 벽면에 낸 문: a는 벽을 따라, n은 방 쪽으로. 열리면 어두운 틈이 보이고 궤짝은 문 앞으로 나온다
    const alongX = P.face === 'y', o = T / 2, B = (a0, a1, n0, n1, z0, z1, c) => (alongX ? block(x + a0, y + o + n0, z0, x + a1, y + o + n1, z1, c) : block(x + o + n0, y + a0, z0, x + o + n1, y + a1, z1, c));
    const sh = st === 'closed' && age < .35 ? Math.sin(t * 60) * .08 : 0, DARK = [12, 10, 16], cx = alongX ? x : x + o + 1.2, cy = alongX ? y + o + 1.2 : y;
    B(-1.25, -.85, 0, .22, 0, 3.3, STONE); B(.85, 1.25, 0, .22, 0, 3.3, STONE); B(-1.25, 1.25, 0, .22, 3, 3.5, STONE);
    if (st === 'open' || st === 'broken') {
      B(-.85, .85, 0, .03, 0, 3, DARK);
      drawChest(cx, cy, 'open', 0);
      if (st === 'broken') B(-.85, .85, 1.5, 4.5, 0, .2, IRON);
    } else { B(-.85 + sh, .85 + sh, 0, .1, 0, 3, IRON); B(-.2 + sh, .2 + sh, .1, .2, 1.3, 1.8, [150, 110, 60]); }
  } else if (P.sc === 'camp') {
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; sphere(x + Math.cos(a) * .7, y + Math.sin(a) * .7, .12, .2, STONE, 'solid'); }
    if (!P._fx) P._fx = pfx('fire/campfire', x, y, 0, { under: true });
    if (st === 'woken' && P._zz) { for (const q of P._zz) q.fx.stop(); P._zz = null; }
    for (const [a, b] of [[-2.4, -1.2], [2.3, -1.4], [.2, 2.5]]) { block(x + a - 1, y + b - .45, 0, x + a + 1, y + b + .45, .08, [92, 66, 54]); if (st !== 'woken' && P.sleepers) { const i = [-2.4, 2.3, .2].indexOf(a), dl = dcssOf({ kind: 'mon', n: P.sleepers[i] }); if (dl) { const q = project(x + a, y + b, .1); blitRot({ w: dl.w, h: dl.h, foot: dl.foot, px: dl.fr.idle[0] }, q.sx, q.sy - 4, 1.57, SC, q.d + .05, { px: dl.w / 2, py: dl.foot / 2 }); } if (!P._zzOn) (P._zzL = P._zzL || []).push([x + a, y + b]); } }
    if (!P._zzOn && st !== 'woken' && P._zzL) { P._zzOn = true; P._zz = P._zzL.map(([zx, zy]) => pfx('status/sleep', zx, zy, 0, { under: false })).filter(Boolean); }
  } else if (P.sc === 'merchant') {
    block(x + .5, y - .6, 0, x + 1.7, y + .6, 1, C.wood); block(x + .6, y - .5, 1, x + 1.6, y + .5, 1.6, C.woodL);
    if (st === 'gone') { for (let i = 0; i < 6; i++) sphere(x - .6 + hash(i, 1) * 1.2, y - .5 + hash(i, 2), .14, .17, STONE, 'rough'); }
    else if (st === 'fled') { if (age < 1) propFig(...NPC.merchant, x - age * 7, y - age * 7, { dy: -Math.abs(Math.sin(age * 14)) * 5 }); for (let i = 0; i < 6; i++) sphere(x + .5 + hash(i, 4) * 1.6, y + .7 + hash(i, 5) * .7, .08, .1, C.gold, 'solid'); }
    else propFig(...NPC.merchant, x - .5, y);
  } else if (P.sc === 'cage') {
    const R = 1.2, front = st !== 'empty';
    block(x - R, y - R, 0, x + R, y + R, .16, IRON); block(x - R, y - R, 3.4, x + R, y + R, 3.54, IRON);
    for (let i = 0; i <= 4; i++) { const k = -R + i * R / 2; capsule([x + k, y - R, 0], [x + k, y - R, 3.4], .07, .07, IRON); capsule([x - R, y + k, 0], [x - R, y + k, 3.4], .07, .07, IRON); if (front) { capsule([x + k, y + R, 0], [x + k, y + R, 3.4], .07, .07, IRON); capsule([x + R, y + k, 0], [x + R, y + k, 3.4], .07, .07, IRON); } }
    if (st !== 'empty' && P.cls) propFig('c_' + P.cls, G.DCSS.cls[P.cls] || G.DCSS.cls.dragoon, x, y);
  } else if (P.sc === 'shrine') {
    block(x - 1.1, y - .7, 0, x + 1.1, y + .7, 1.1, STONE); block(x - 1.3, y - .85, 1.1, x + 1.3, y + .85, 1.3, [140, 132, 128]);
    const bowl = st === 'holy' ? [240, 224, 170] : st === 'boil' ? [255, 60, 44] : st === 'fed' ? C.gold : [130, 30, 34];
    sphere(x, y, 1.42, .42, bowl, 'solid');
    if (st === 'holy' && !P._cand) P._cand = [-1, 1].map(a => pfx('fire/candle', x + a * .95, y, 1.3, {})); else if (st !== 'holy') for (const a of [-1, 1]) capsule([x + a * .95, y, 1.3], [x + a * .95, y, 1.65], .07, .07, [226, 214, 186]);
    if (age < 4) { if (st === 'holy') emit('holy', .5); if (st === 'boil') emit('blood', .5); }
  } else if (P.sc === 'hoard') {
    const n = st === 'taken' ? 0 : st === 'some' ? 9 : 26;
    for (let i = 0; i < n; i++) { const a = hash(i, 11) * 6.28, q = hash(i, 13) * 1.5; sphere(x + Math.cos(a) * q, y + Math.sin(a) * q, .1 + (1.5 - q) * .34, .2, C.gold, 'solid'); }
    propFig(...NPC.skel, x, y - .1, { dy: n ? -8 : 0 });
  }
}
function drawChest(x, y, st, age) {
  const W0 = st === 'ash' ? [46, 42, 48] : C.wood, L0 = st === 'ash' ? [34, 30, 36] : C.woodL, M = st === 'ash' ? [70, 62, 60] : C.gold;
  block(x - .55, y - .36, 0, x + .55, y + .36, .55, W0);
  if (st === 'open') {
    // 뚜껑은 뒤로 젖히고 안에 금화가 쌓인다
    block(x - .58, y - .5, .55, x + .58, y - .36, 1.25, L0);
    for (let i = 0; i < 7; i++) sphere(x + (hash(i, 3) - .5) * .8, y + (hash(i, 8) - .5) * .4, .62 + hash(i, 5) * .12, .14, C.gold, 'solid');
  } else { block(x - .58, y - .38, .55, x + .58, y + .38, .72, L0); block(x - .1, y + .36, .3, x + .1, y + .42, .6, M); }
  castShadow(x, y, .4, .55, 1);
}
function drawBang(sx, topY, c) {
  const col = rgb(...c), ink = rgb(...C.ink), bx = Math.round(sx) - 1, by = Math.round(topY) - 11;
  const put = (X, Y, v) => { const i = Y * W + X; if (X >= 0 && Y >= 0 && X < W && Y < H) pix[i] = v; };
  for (let j = -1; j <= 11; j++) for (let i = -1; i <= 3; i++) put(bx + i, by + j, ink);
  for (let j = 0; j < 7; j++) for (let i = 0; i < 3; i++) put(bx + i, by + j, col);
  for (let j = 8; j < 11; j++) for (let i = 0; i < 3; i++) put(bx + i, by + j, col);
  for (let j = -1; j <= 11; j++) if (j === 7) for (let i = 0; i < 3; i++) put(bx + i, by + j, ink);
}
// 차례의 이동 · 공격 범위: 바닥에만 칠한다 (G.Tactics.overlay)
const OV_MOVE = [90, 160, 255], OV_ATK = [240, 80, 70];
function drawRange(r) {
  const ov = r.turn && r.turn.ov; if (!ov) return;
  const m = r.map, hw = T * S / R2, hh = hw * SIN;
  const cell = (k, c, a, edge) => {
    if (!r.seen[k]) return;
    const p = project(wx(k % m.w), wy(Math.floor(k / m.w)), 0), X = Math.round(p.sx), Y = Math.round(p.sy);
    for (let iy = Math.max(0, Math.ceil(Y - hh)); iy <= Math.min(VH - 1, Math.floor(Y + hh)); iy++) for (let ix = Math.max(0, Math.ceil(X - hw)); ix <= Math.min(VW - 1, Math.floor(X + hw)); ix++) {
      const q = Math.abs(ix - X) / hw + Math.abs(iy - Y) / hh; if (q > 1) continue;
      const i = iy * VW + ix; if (!viewG[i] || zb[i] !== bakedZ[i]) continue;
      const u = q > .88 ? edge : a, d = pix[i];
      pix[i] = rgb(lerp(d & 255, c[0], u), lerp(d >> 8 & 255, c[1], u), lerp(d >> 16 & 255, c[2], u));
    }
  };
  for (const k of ov.attack) if (!ov.move.has(k)) cell(k, OV_ATK, .2, .6);
  for (const k of ov.move.keys()) cell(k, ov.attack.has(k) ? OV_ATK : OV_MOVE, ov.path.has(k) ? .4 : .16, .5);
}
const seenAt = (r, x, y) => !!r.seen[Math.round(y) * r.map.w + Math.round(x)];
function drawProps(r, t) {
  for (const c of r.chests || []) {
    if (!inWin(c.x, c.y) || !seenAt(r, c.x, c.y)) continue;
    const warn = c._mark && now() < c._mark.until, x = wx(c.x) + (warn ? Math.sin(t * 40) * .05 : 0), y = wy(c.y);
    drawChest(x, y, 'closed', 0);
    const a = project(x, y, 1.1);
    if (warn) drawBang(a.sx, a.sy - 8, c._mark.c);
    if (c.glint && Math.random() < .12) spark(a.sx + (Math.random() - .5) * 18, a.sy + (Math.random() - .5) * 12, 2, [rgb(255, 250, 200), rgb(255, 214, 90)], 14, 0, .45);
  }
  for (const P of (r.map && r.map.props) || []) {
    if (!inWin(P.x, P.y) || !seenAt(r, P.fx ?? P.x, P.fy ?? P.y)) continue;
    if (P.sc) { drawScene(P, t); continue; }
    drawChest(wx(P.x), wy(P.y), P.state, P.t0 ? (now() - P.t0) / 1000 : 0);
    if (P.state === 'ash' && P.t0 && now() - P.t0 < 3500 && Math.random() < .2) { const a = project(wx(P.x), wy(P.y), 1); fount(a.sx, a.sy, 1, SMOKE, 26, -8, 1.3); }
  }
  // 드러난 함정: 붉은 판 + 깜빡임
  for (const T0 of (r.ex && r.ex.map === r.map && r.ex.traps) || []) {
    if (T0.hidden || !inWin(T0.x, T0.y)) continue;
    const x = wx(T0.x), y = wy(T0.y), on = Math.floor(t * 5) % 2;
    block(x - 1, y - 1, 0, x + 1, y + 1, .07, on ? [196, 58, 48] : [120, 44, 42]); for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) capsule([x - .6 + a * .6, y - .6 + b * .6, .07], [x - .6 + a * .6, y - .6 + b * .6, .3], .1, .02, [206, 200, 192]);
    const a = project(x, y, 1.4); drawBang(a.sx, a.sy, [255, 176, 60]);
  }
  // 터진 함정: 가시가 솟았다 들어간다, 판은 남는다
  for (let i = spikes.length - 1; i >= 0; i--) {
    const k = (now() - spikes[i].t0) / 1100; if (k >= 1) { spikes.splice(i, 1); continue; }
    const x = wx(spikes[i].x), y = wy(spikes[i].y), h = (k < .15 ? k / .15 : k > .75 ? (1 - k) / .25 : 1) * 2.6;
    block(x - 2.4, y - 2.4, 0, x + 2.4, y + 2.4, .07, [96, 34, 36]);
    for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) { const px = x - 2 + a, py = y - 2 + b; capsule([px, py, 0], [px, py, h * (.7 + hash(a, b) * .5)], .2, .02, [206, 200, 192]); }
  }
  for (const g of graves) if (g.map === r.map && inWin(g.x, g.y)) grave(wx(g.x), wy(g.y));
  for (const q of torches) { if (q.cell != null && !r.seen[q.cell]) continue; if (!q._fx) q._fx = pfx('fire/torch', q.x, q.y, q.z - .95, { under: true, light: .5, clip: TORCH_CLIP }); if (!q._fx) { const fl = Math.floor(t * 8); capsule([q.x, q.y, q.z - .4], [q.x, q.y, q.z], .07, .09, C.wood); sphere(q.x, q.y, q.z + .2 + (fl % 3) * .03, .2 + (fl % 2) * .03, C.flame, 'glow'); } }
}
function drawTufts(t) {
  for (const u of tufts) {
    const vx = u.ix - cam.ix, vy = u.iy - cam.iy; if (vx < 2 || vy < 5 || vx >= W - 2 || vy >= H) continue;
    const g = Math.sin(t * .8 + u.ph) + .5 * Math.sin(t * 2.1 + u.ph * 2.3), ramp = rampOf(u.c);
    for (let k = 1; k <= u.h; k++) { const jx = vx + Math.round(g * .9 * k / 3), j = (vy - k) * W + jx; if (j < 0 || j >= pix.length || !ground[j] || zb[j] !== bakedZ[j]) continue; pix[j] = ramp[clamp(1 + k, 1, 4)]; }
  }
}
