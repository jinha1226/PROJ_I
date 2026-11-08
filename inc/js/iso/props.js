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
      if (!v.ok) JU.add(.35);
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
    else if (v.k === 'spikes') { spikes.push({ x: v.x, y: v.y, t0: now() }); const a = project(wx(v.x), wy(v.y), .3); spark(a.sx, a.sy, 26, [rgb(210, 200, 190), rgb(120, 112, 110), rgb(200, 60, 50)], 90, 160, .55); JU.add(.35); }
    else if (v.k === 'disarm') { const a = project(wx(v.x), wy(v.y), .2); spark(a.sx, a.sy, 16, [rgb(255, 230, 120), rgb(200, 190, 180)], 60, 120, .5); G.fx(r, { k: 'text', x: v.x, y: v.y - 1, s: '해체', col: '#ffd24a', t: 1, sz: .9 }); }
  }
}
// 판정 결과 효과: 한 곳에서 관리한다
function burst(fx, x, y, r, e) {
  if (!fx) return;
  const a = project(x, y, 1.2);
  if (fx === 'coins') { fount(a.sx, a.sy, 80, COINS, 150, 300, 1.3); pfx('pickups/collect-burst', x, y, .4, {}); }
  else if (fx === 'poof') pfx('spawn/poof', x, y, 0, { k: 1.2 });
  else if (fx === 'dust') { spark(a.sx, a.sy + 8, 44, [rgb(170, 160, 146), rgb(120, 112, 104), rgb(200, 190, 170)], 110, 40, .8); JU.add(.35); }
  else if (fx === 'rattle') { spark(a.sx, a.sy - 8, 16, [rgb(255, 214, 120), rgb(220, 220, 230)], 90, 200, .4); JU.add(.35); }
  else if (fx === 'clang') { spark(a.sx, a.sy, 22, [rgb(240, 220, 170), rgb(200, 200, 210)], 120, 220, .5); JU.add(.35); }
  else if (fx === 'holy') pfx('holy/heal', x, y, 0, { e });
  else if (fx === 'blood') { fount(a.sx, a.sy, 50, [rgb(214, 40, 44), rgb(140, 20, 30), rgb(255, 90, 70)], 120, 180, 1); JU.add(.35); }
  else if (fx === 'curse') pfx('shadow/curse', x, y, 0, { k: 1.5, e });
  else if (fx === 'calm') fount(a.sx, a.sy - 8, 16, [rgb(150, 230, 190), rgb(220, 255, 230)], 30, -30, .9);
  else if (fx === 'hurt') spark(a.sx, a.sy, 22, [rgb(214, 40, 44), rgb(150, 24, 30)], 80, 160, .5);
}
const SCENE2 = new Set(['trap', 'post', 'band', 'throne', 'sack', 'box', 'statue', 'stele', 'plate', 'pit', 'pool', 'tracks']);
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
    if (st !== 'cold' && !P._fx) P._fx = pfx('fire/campfire', x, y, 0, { under: true });
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
    if (st !== 'empty' && st !== 'freed' && P.cls) propFig('c_' + P.cls, G.DCSS.cls[P.cls] || G.DCSS.cls.dragoon, x, y);
    if (P.guards && (st === 'idle' || st === 'freed')) { block(x - .4, y + R + 1.6, 0, x + .4, y + R + 2.4, .6, C.wood); block(x - .15, y + R + 1.8, .6, x + .05, y + R + 2, .8, C.white); block(x + .1, y + R + 2.05, .6, x + .3, y + R + 2.25, .8, C.white); P.guards.forEach((g, i) => stand(figOf(g), x + (i - 1) * 1.5, y + R + 2 + (i === 1 ? 1.2 : 0), { flip: i === 2, shake: Math.sin(t * 9 + i) * .4 })); }
  } else if (P.sc === 'shrine') {
    block(x - 1.1, y - .7, 0, x + 1.1, y + .7, 1.1, STONE); block(x - 1.3, y - .85, 1.1, x + 1.3, y + .85, 1.3, [140, 132, 128]);
    const bowl = st === 'holy' ? [240, 224, 170] : st === 'boil' ? [255, 60, 44] : st === 'fed' ? C.gold : [130, 30, 34];
    sphere(x, y, 1.42, .42, bowl, 'solid');
    if (st === 'holy' && !P._cand) P._cand = [-1, 1].map(a => pfx('fire/candle', x + a * .95, y, 1.3, {})); else if (st !== 'holy') for (const a of [-1, 1]) capsule([x + a * .95, y, 1.3], [x + a * .95, y, 1.65], .07, .07, [226, 214, 186]);
    if (age < 4) { if (st === 'holy') emit('holy', .5); if (st === 'boil') emit('blood', .5); }
  } else if (P.sc === 'hoard') {
    const n = st === 'taken' ? 0 : st === 'some' ? 9 : 26;
    for (let i = 0; i < n; i++) { const a = hash(i, 11) * 6.28, q = hash(i, 13) * 1.5; sphere(x + Math.cos(a) * q, y + Math.sin(a) * q, .1 + (1.5 - q) * .34, .2, C.gold, 'solid'); }
    if (!P.plain) propFig(...NPC.skel, x, y - .1, { dy: n ? -8 : 0 });
  } else if (P.sc === 'stranger') {
    if (st !== 'gone') propFig(...NPC.merchant, x, y);
  } else if (P.sc === 'mercy') {
    // 다친 적: 누워 떨다가, 살려 보내면 일어나 절뚝이며 사라진다
    const dl = st !== 'gone' && (P.civ ? figOf('civ') : dcssOf({ kind: 'mon', n: P.mon }));
    if (dl && st === 'leave') { const u = (now() - P.t0) / 2200; if (u < 1) { const q = project(x + u * 5, y - u * 5, 0); blitRot({ w: dl.w, h: dl.h, foot: dl.foot, px: dl.fr.idle[0] }, q.sx, q.sy + Math.abs(Math.sin(u * 22)) * -2, 0, SC, q.d, { px: dl.w / 2, py: dl.foot }); } }
    else if (dl) { const q = project(x, y, .1); blitRot({ w: dl.w, h: dl.h, foot: dl.foot, px: dl.fr.idle[0] }, q.sx + Math.sin(t * 40) * .6, q.sy - 4, 1.57, SC, q.d + .05, { px: dl.w / 2, py: dl.foot / 2 }); }
  }
}
// 장면 소품 2 (DESIGN.md 148): 사건 글에 나오는 것을 지도에도 둔다. 글과 그림이 어긋나지 않게
const figOf = s => (s === 'civ' ? layered(...NPC.merchant) : s === 'skel' ? layered(...NPC.skel) : dcssOf({ kind: 'mon', n: s }));
function stand(dl, x, y, o = {}) { if (!dl) return; const b = project(x + (o.shake || 0) * .1, y, 0); blit({ w: dl.w, h: dl.h, foot: dl.foot, px: dl.fr.idle[0] }, b.sx + (o.shake || 0), b.sy + (o.dy || 0), b.d, { flip: !!o.flip, sc: SC }); }
function lie(dl, x, y, sh = 0) { if (!dl) return; const q = project(x, y, .1); blitRot({ w: dl.w, h: dl.h, foot: dl.foot, px: dl.fr.idle[0] }, q.sx + sh, q.sy - 4, 1.57, SC, q.d + .05, { px: dl.w / 2, py: dl.foot / 2 }); }
const walkOff = (P, x, y) => { const u = (now() - P.t0) / 2200; return u < 1 ? [x + u * 5, y - u * 5, Math.abs(Math.sin(u * 22)) * -2] : null; };
function snooze(P, pts) { if (!P._zz2 && !P._zzEnd) P._zz2 = pts.map(([a, b]) => pfx('status/sleep', a, b, 0, { under: false })).filter(Boolean); }
function wake(P) { if (P._zz2) for (const q of P._zz2) q?.fx?.stop?.(); P._zz2 = null; P._zzEnd = true; }
const SACK = [134, 100, 64], WATER = [22, 34, 56], BRONZE = [196, 140, 60], RUNE = { holy: [255, 230, 150], boil: [255, 80, 60] };
function sack(x, y, z) { sphere(x, y, z + .5, .55, SACK, 'rough'); capsule([x, y, z + .95], [x, y, z + 1.2], .18, .08, [104, 76, 48]); }
function drawScene2(P, t) {
  const x = wx(P.x), y = wy(P.y), st = P.state, STONE = C.stone, IRON = [84, 86, 98];
  if (P.sc === 'trap') { // 쇠 덫: 걸린 몸이 버둥거리다, 풀려나면 절뚝이며 떠난다
    const open = st === 'leave' || st === 'gone';
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28 + (open ? .35 : 0), rr = open ? .95 : .55; sphere(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .7, .14, .12, IRON, 'solid'); }
    capsule([x + .6, y + .2, .1], [x + 1.6, y + .5, .1], .05, .05, IRON); capsule([x + 1.6, y + .5, 0], [x + 1.6, y + .5, .5], .1, .06, C.wood);
    if (st === 'gone') { block(x - .5, y - .3, 0, x + .5, y + .3, .03, C.blood); return; }
    const dl = figOf(P.fig); if (st === 'leave') { const w = walkOff(P, x, y); if (w) stand(dl, w[0], w[1], { dy: w[2] }); } else stand(dl, x, y, { shake: Math.sin(t * 30) * 1.2 });
  } else if (P.sc === 'post') { // 초소: 말뚝 울타리 · 징 · 졸고 있는 보초
    for (let i = 0; i < 4; i++) capsule([x - 2.4 + i * .5, y - 1.4, 0], [x - 2.6 + i * .5, y - 1.4, 1.6], .12, .08, C.wood);
    capsule([x + 1.6, y - .7, 0], [x + 1.6, y - .7, 2.6], .09, .09, C.wood); capsule([x + 1.6, y + .7, 0], [x + 1.6, y + .7, 2.6], .09, .09, C.wood); capsule([x + 1.6, y - .8, 2.6], [x + 1.6, y + .8, 2.6], .08, .08, C.wood);
    block(x + 1.55, y - .5, .9, x + 1.65, y + .5, 2.3, st === 'gone' ? [120, 86, 44] : BRONZE);
    const pos = [[-1, -.2], [-.2, 1.1]];
    if (st === 'gone') { wake(P); return; }
    (P.guards || []).forEach((g, i) => { const [a, b] = pos[i] || [i - 1, 0]; if (st === 'woken') stand(figOf(g), x + a, y + b, { flip: i % 2 === 1 }); else lie(figOf(g), x + a, y + b); });
    if (st === 'woken') wake(P); else snooze(P, (P.guards || []).map((g, i) => [x + (pos[i] || [0, 0])[0], y + (pos[i] || [0, 0])[1]]));
  } else if (P.sc === 'band') { // 길을 막은 무리
    if (st === 'gone') return; const n = (P.guards || []).length; P.guards.forEach((g, i) => stand(figOf(g), x + (i - (n - 1) / 2) * .4, y + (i - (n - 1) / 2) * 1.5, { flip: true }));
  } else if (P.sc === 'throne') { // 뼈 의자: 두목이 일어서기 전까지 그 앞에 서 있다
    block(x + .6, y - .9, 0, x + 1.8, y + .9, 1.1, C.bone); block(x + 1.5, y - .9, 1.1, x + 1.8, y + .9, 3, C.bone);
    for (const b of [-.75, .75]) sphere(x + 1.65, y + b, 3.25, .32, C.bone, 'rough');
    for (let i = 0; i < 5; i++) sphere(x - .6 + hash(i, 3) * 2.4, y - 1.4 + hash(i, 7) * 2.8, .1, .16, C.bone, 'rough');
    if (st !== 'gone') stand(figOf(P.mon), x, y, { flip: true });
  } else if (P.sc === 'sack') { // 금화 자루 (매달린 것은 줄에)
    if (P.torn) { block(x - .7, y - .4, 0, x + .7, y + .4, .12, SACK); for (let i = 0; i < 4; i++) sphere(x - .5 + hash(i, 9), y - .3 + hash(i, 4) * .6, .1, .1, C.steel, 'solid'); return; }
    if (st === 'taken') return;
    if (P.hang) { capsule([x, y, 3.4], [x, y, 2.4], .03, .03, [200, 190, 160]); sack(x, y, 1.4); } else { sack(x, y, 0); for (let i = 0; i < 5; i++) sphere(x - .8 + hash(i, 11) * 1.6, y - .6 + hash(i, 13) * 1.2, .08, .14, C.gold, 'solid'); }
    if (P.line) capsule([x + .5, y, .06], [x + 2.6, y + .4, .06], .025, .025, [210, 200, 170]);
  } else if (P.sc === 'box') { // 작은 궤짝 (단도가 꽂힌 빈 궤짝도)
    drawChest(x, y, st === 'open' || st === 'took' || P.opened ? 'open' : 'closed', P.t0 ? (now() - P.t0) / 1000 : 0);
    if (P.dagger && st !== 'took') { capsule([x, y, .9], [x, y, 2.1], .05, .02, C.steel); block(x - .25, y - .05, 2.05, x + .25, y + .05, 2.15, C.gold); }
  } else if (P.sc === 'statue') { // 입 벌린 석상과 그을린 바닥 · 그 앞의 궤짝
    block(x - 3.3, y - 1.3, 0, x - .7, y + 1.3, .03, [44, 36, 34]);
    block(x - 2.6, y - .7, 0, x - 1.2, y + .7, 1, STONE); block(x - 2.4, y - .5, 1, x - 1.4, y + .5, 2.6, STONE); sphere(x - 1.9, y, 3.1, .6, STONE, 'rough'); sphere(x - 1.45, y, 3, .22, [30, 22, 20], 'solid');
    if (st === 'boil' && Math.random() < .4) { const a = project(x - 1.3, y, 3); fount(a.sx, a.sy, 1, [rgb(255, 190, 80), rgb(255, 90, 40)], 40, 20, .5); }
    drawChest(x + .6, y, st === 'holy' || st === 'boil' ? 'open' : 'closed', 0);
  } else if (P.sc === 'stele') { // 글자가 새겨진 돌판: 빛이 샌다. 부수면 조각
    if (st === 'fed') { for (let i = 0; i < 5; i++) block(x - 1 + hash(i, 2) * 1.6, y - .5 + hash(i, 5), 0, x - .6 + hash(i, 2) * 1.6, y - .2 + hash(i, 5), .4 + hash(i, 8) * .4, STONE); return; }
    block(x - 1, y - .2, 0, x + 1, y + .2, 2.8, STONE);
    const g = RUNE[st] || [170, 210, 255], on = .6 + .4 * Math.sin(t * 3);
    for (let i = 0; i < 6; i++) block(x - .7 + (i % 3) * .55, y + .2, .7 + Math.floor(i / 3) * .8, x - .45 + (i % 3) * .55, y + .25, 1.1 + Math.floor(i / 3) * .8, g.map(v => Math.round(v * on)));
  } else if (P.sc === 'plate') { // 판석 하나 · (구르는 돌이면 위에 돌덩이)
    block(x - .9, y - .9, 0, x + .9, y + .9, .06, P.odd ? [150, 128, 104] : [200, 192, 170]);
    if (P.boulder) sphere(x - 3, y - 1.5, 1.4, 1.3, STONE, 'rough');
    if (P.sack && st !== 'taken') sack(x + 2.6, y + .6, 0);
  } else if (P.sc === 'pit') { // 땅이 꺼진 틈
    block(x - 1.6, y - 1.1, 0, x + 1.6, y + 1.1, .04, [10, 8, 14]); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; sphere(x + Math.cos(a) * 1.8, y + Math.sin(a) * 1.3, .1, .22, STONE, 'rough'); }
  } else if (P.sc === 'pool') { // 길을 덮은 검은 물 · 건너편 궤짝
    block(x - 2.2, y - 2.6, 0, x + 1.2, y + 2.6, .05, WATER); for (let i = 0; i < 4; i++) { const k = (t * .4 + i * .25) % 1; block(x - 1.6 + hash(i, 3) * 2.4, y - 2 + hash(i, 6) * 4, .06, x - 1.4 + hash(i, 3) * 2.4, y - 1.8 + hash(i, 6) * 4, .07, [60 + k * 80, 80 + k * 80, 110 + k * 80]); }
    if (P.box) drawChest(x + 2.4, y, st === 'taken' ? 'open' : 'closed', 0);
  } else if (P.sc === 'tracks') { // 맨발 자국 · 붉은 가루
    for (let i = 0; i < 7; i++) { const k = i - 3, side = i % 2 ? .35 : -.35; block(x + k * 1 - .25, y + side - .12, 0, x + k * 1 + .25, y + side + .12, .03, [150, 50, 44]); }
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
// 노리는 대상: 바닥 마름모와 점선. 지형 위에만 그린다 (벽 · 인물에 가려진다)
const AIM_COL = { foe: [255, 225, 110], atk: [255, 170, 150], heal: [170, 255, 180] }; // 범위 표시(붉은 칸) 위에서도 보이게 밝게
function drawAim(r, t) {
  const A = G.Turn.aim(r); if (!A) return;
  const hw = T * S / R2, hh = hw * SIN, tint = (i, c, a) => { if (i < 0 || i >= VW * VH || !viewG[i] || zb[i] !== bakedZ[i]) return; const d = pix[i]; pix[i] = rgb(lerp(d & 255, c[0], a), lerp(d >> 8 & 255, c[1], a), lerp(d >> 16 & 255, c[2], a)); };
  const pos = e => [e._rx ?? e.x, e._ry ?? e.y], [fx, fy] = pos(A.from), pulse = .78 + .2 * Math.sin(t * 7);
  for (const { e, kind } of A.list) {
    const c = AIM_COL[kind], [x, y] = pos(e); if (!seenAt(r, x, y)) continue;
    const p = project(wx(x), wy(y), 0), X = Math.round(p.sx), Y = Math.round(p.sy);
    for (let iy = Math.max(0, Math.ceil(Y - hh)); iy <= Math.min(VH - 1, Math.floor(Y + hh)); iy++) for (let ix = Math.max(0, Math.ceil(X - hw)); ix <= Math.min(VW - 1, Math.floor(X + hw)); ix++) { const q = Math.abs(ix - X) / hw + Math.abs(iy - Y) / hh; if (q <= 1 && q > .74) tint(iy * VW + ix, c, pulse); }
    if (e === A.from) continue;
    const dist = Math.hypot(x - fx, y - fy); if (dist < 1.6) continue;
    const n = Math.floor(dist * 3), off = (t * 2.2) % 1;
    for (let k = 1; k < n; k++) { const u = (k - off) / n; if (u < .1 || u > .92) continue; const wxp0 = fx + (x - fx) * u, wyp0 = fy + (y - fy) * u; if (!seenAt(r, wxp0, wyp0)) continue; const q = project(wx(wxp0), wy(wyp0), 0), X0 = Math.round(q.sx), Y0 = Math.round(q.sy); for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) * 2 <= 2 && Y0 + dy >= 0 && Y0 + dy < VH && X0 + dx >= 0 && X0 + dx < VW) tint((Y0 + dy) * VW + X0 + dx, c, .95); }
  }
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
    if (P.sc) { if (SCENE2.has(P.sc)) drawScene2(P, t); else drawScene(P, t); continue; }
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
