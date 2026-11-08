'use strict';
// 인물 그리기: 보이는 위치 · 깡충 · 머리 위 표시
function drawEnt(e, r, t) {
  if (e._rx == null) { e._rx = e.x; e._ry = e.y; }
  const pr = e._rx, pq = e._ry; e._rx += (e.x - e._rx) * .2; e._ry += (e.y - e._ry) * .2;
  if (!inWin(e._rx, e._ry)) return;
  const vx = e._rx - pr, vy = e._ry - pq, sp = Math.hypot(vx, vy);
  if (sp > .002) e._yaw = Math.atan2(vy, vx);
  const st = r.turn;
  if (st && st.cur === e && st.tg) e._yaw = Math.atan2(st.tg.y - e.y, st.tg.x - e.x);
  else if (sp <= .002) { const pool = e.kind === 'mon' ? r.party.filter(p => !p.dead) : r.mons.filter(o => o.aggro); let b = null, bd = 1e9; for (const o of pool) { const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd) { bd = d; b = o; } } if (b && bd < 8) e._yaw = Math.atan2(b.y - e.y, b.x - e.x); }
  if (e._yaw == null) e._yaw = .8;
  let x = wx(e._rx + (e._ox || 0)), y = wy(e._ry + (e._oy || 0));
  const n = now(), lq = e._lu ? (n - e._lu) / 300 : 1, hq = e._hit ? (n - e._hit) / 220 : 1, flash = hq < .4;
  let arm = .35, up = .9, lean = 0;
  if (lq < 1) { const k = Math.sin(Math.PI * lq); x += (e._lx || 0) * k * .8; y += (e._ly || 0) * k * .8; arm = lerp(-1.4, 1.5, lq); up = lerp(1.6, -.3, lq); lean = k * .3; }
  if (hq < 1) { const kb = (1 - hq) * (1 - hq) * .55; x += (e._kx || 0) * kb; y += (e._ky || 0) * kb; lean -= (1 - hq) * .25; }
  const step = sp > .002 ? Math.sin(t * 14 + e.x) : 0;
  const m = e._model || (e._model = e.kind === 'mon' ? monModel(e) : Object.assign({}, CLS[(e.merc || f.leader).cls] || CLS.dragoon));
  const scale = FIG * (e.kind === 'mon' ? (e.boss ? 1.3 : e.chief ? 1.15 : 1) : 1);
  if (e.dead || e.dying) { lying(x, y, e._yaw, m); return; }
  if (m.blob) blob(x, y, m, t, flash);
  else if (m.mush) shroom(x, y, m, t, flash);
  else if (m.quad) quad(x, y, e._yaw, m, t, sp > .002, flash);
  else if (m.spider) spider(x, y, m, t, flash);
  else if (m.ghost) ghost(x, y, m, t, flash);
  else person(x, y, e._yaw, m, { flash, step, arm, up, lean, scale, armL: e.kind !== 'mon' && m.o === 'shield' ? 1.2 : .5 });
  // 체력 막대 (적, 또는 다친 사람만)
  if (e.max && (e.kind === 'mon' ? e.hp < e.max || st : e.hp < e.max)) {
    const tp = project(x, y, (m.blob || m.mush ? 1.5 : m.quad || m.spider ? 1.9 : 2.75) * (m.b || 1) * scale), w = 16, f = clamp(e.hp / e.max, 0, 1), L = tp.sx - w / 2 | 0, Y = tp.sy | 0;
    for (let i = -1; i <= w; i++) for (let j = -1; j <= 1; j++) { const k = (Y + j) * W + L + i; if (k >= 0 && k < pix.length) pix[k] = rgb(...C.ink); }
    for (let i = 0; i < Math.round(f * w); i++) { const k = Y * W + L + i; if (k >= 0 && k < pix.length) pix[k] = rgb(...(e.kind === 'mon' ? C.red : f > .4 ? [110, 196, 110] : C.orange)); }
  }
}
// 겹침 풀기: 보이는 자리만 서로 밀어낸다. 벽 칸으로는 밀지 않고 벽을 따라 미끄러진다 — 복도에서는 저절로 한 줄이 된다
const MIN_D = .9; // 전투는 칸마다 한 명이라 거의 밀리지 않는다
const DISP_V = 6, SNAP_D = 8, PUSH_V = .8;
function settle(r, dt) {
  const m = r.map, es = r.party.concat(r.mons).filter(e => !e.dead && !e.dying), open = (x, y) => isFloor(m, Math.round(x), Math.round(y));
  const k = 1 - Math.exp(-dt * 5);
  // 보이는 위치: 속도 상한을 두고 진짜 위치를 쫓는다. 벽이 가로막으면 길을 따라 돌아가고, 길이 없거나 너무 멀면 바로 옮긴다
  const GR = G.Grid, clear = (x0, y0, x1, y1) => GR.walkable(m, x0, y0, x1, y1), via = { x: 0, y: 0 };
  for (const e of es) {
    if (e._dx == null) { e._dx = e.x; e._dy = e.y; }
    e._ldx = e._dx; e._ldy = e._dy;
    const dx = e.x - e._dx, dy = e.y - e._dy, d = Math.hypot(dx, dy);
    if (d > SNAP_D) { e._dx = e.x; e._dy = e.y; continue; } // 층 이동 · 소환 같은 진짜 이동만
    if (d < .001) continue;
    const step = Math.min(d, Math.min(d * 5 + .4, DISP_V + Math.max(0, d - 3) * 2) * dt);
    if (clear(e._dx, e._dy, e.x, e.y)) { e._dx += dx / d * step; e._dy += dy / d * step; continue; }
    const cells = GR.field(m, Math.round(e.x), Math.round(e.y))[Math.round(e._dy) * m.w + Math.round(e._dx)];
    if (cells < 0 || cells > SNAP_D * 1.5) { e._dx = e.x; e._dy = e.y; continue; }
    via.x = e._dx; via.y = e._dy; GR.moveTo(m, via, e.x, e.y, step / dt, dt); e._dx = via.x; e._dy = via.y;
  }
  const place = (e, x, y) => { if (clear(e._dx, e._dy, x, y)) { e._dx = x; e._dy = y; } else if (clear(e._dx, e._dy, x, e._dy)) e._dx = x; else if (clear(e._dx, e._dy, e._dx, y)) e._dy = y; };
  for (let pass = 0; pass < 3; pass++) for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
    const a = es[i], b = es[j]; let dx = a._dx - b._dx, dy = a._dy - b._dy, dd = Math.hypot(dx, dy);
    if (dd >= MIN_D) continue;
    { const ma = Math.hypot(a.x - a._dx, a.y - a._dy) > .05, mb = Math.hypot(b.x - b._dx, b.y - b._dy) > .05; if ((a.kind === 'mon') === (b.kind === 'mon') && (r.turn ? ma || mb : ma !== mb)) continue; } // 같은 편이 지나가면 밀지 않고 겹쳐 지나간다. 탐험 중 함께 걸을 때는 간격을 유지한다
    if (dd < .02) { const cx = Math.round(a._dx), cy = Math.round(a._dy); if (open(cx + 1, cy) || open(cx - 1, cy)) { dx = i % 2 ? 1 : -1; dy = 0; } else { dx = 0; dy = i % 2 ? 1 : -1; } dd = 1; }
    const push = Math.min((MIN_D - (dd === 1 ? 0 : dd)) * .3, PUSH_V * dt), ux = dx / dd, uy = dy / dd; // 서로 밀어내는 힘도 천천히
    place(a, a._dx + ux * push, a._dy + uy * push); place(b, b._dx - ux * push, b._dy - uy * push);
  }
  for (const e of es) { const sp = Math.hypot(e._dx - e._ldx, e._dy - e._ldy) / Math.max(dt, .001); e._spd = (e._spd || 0) + (sp - (e._spd || 0)) * .18; }
}
const dispAt = (x, y, r) => { for (const e of r.party.concat(r.mons)) if (e._dx != null && Math.abs(e.x - x) < .02 && Math.abs(e.y - y) < .02) return [e._dx, e._dy]; return [x, y]; };
// 한 사람 준비: 위치 · 그림자 (그림은 윤곽선 뒤에 찍는다)
function prep(e, r, t, dt) {
  if (e.kind === 'mon' && !e.spotted) return null; // 시야 규칙: G.Sight
  if (e._dx == null) { e._dx = e.x; e._dy = e.y; }
  const pr = e._ldx == null ? e._dx : e._ldx, pq = e._ldy == null ? e._dy : e._ldy; e._rx = e._dx; e._ry = e._dy;
  if (e.kind === 'mon' && r.seen && !r.seen[Math.round(e.y) * r.map.w + Math.round(e.x)]) return null;
  const vx = e._rx - pr, vy = e._ry - pq, moving = (e._spd || 0) > .7, st = r.turn;
  const wxp = wx(e._rx), wyp = wy(e._ry);
  // 바라보는 쪽: 화면 좌우 기준
  let tx = null;
  if (st && st.cur === e && st.tg) tx = (st.tg.x - st.tg.y) - (e.x - e.y);
  else if (moving) tx = (e._dx - pr) - (e._dy - pq);
  else { const pool = e.kind === 'mon' ? r.party.filter(p => !p.dead) : r.mons.filter(o => o.aggro); let b = null, bd = 1e9; for (const o of pool) { const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd) { bd = d; b = o; } } if (b && bd < 9) tx = (b.x - b.y) - (e.x - e.y); }
  if (tx != null && Math.abs(tx) > .05) e._flipS = tx < 0;
  const base = project(wxp, wyp, 0), n = now();
  let ox = 0, oy = 0, flash = false, ang = 0;
  // 공격: 뒤로 살짝 모았다가 → 튀어나가 → 돌아온다
  const lq = e._lu ? (n - e._lu) / 300 : 1;
  if (lq < 1) {
    const sx = ((e._lx || 0) - (e._ly || 0)) / R2, sy = ((e._lx || 0) + (e._ly || 0)) / R2 * SIN, l = Math.hypot(sx, sy) || 1;
    const far = isRanged(e), k = far ? -RECOIL * Math.sin(Math.PI * Math.min(1, lq / .6)) : lq < .22 ? -2.5 * (lq / .22) : lq < .42 ? lerp(-2.5, 11, ease((lq - .22) / .2)) : lerp(11, 0, ease((lq - .42) / .58));
    ox += sx / l * k; oy += sy / l * k; if (!far && lq > .22 && lq < .5) oy -= 2;
  }
  const hq = e._hit ? (n - e._hit) / 260 : 1;
  if (hq < 1) { const sx = ((e._kx || 0) - (e._ky || 0)) / R2, sy = ((e._kx || 0) + (e._ky || 0)) / R2 * SIN, kb = (1 - hq) * (1 - hq) * 6; ox += sx * kb + Math.sin(n / 18) * (1 - hq) * 1.4; oy += sy * kb; flash = hq < .3; }
  if (moving && !DCSS) oy -= Math.abs(Math.sin(t * 13 + e.x)) * 2;
  const down = e.dying || e.dead;
  const key = e.t, hitKey = key + '_hit', runKey = key + '_run';
  e._ph = e._ph == null ? Math.random() * 4 : e._ph;
  const k2 = hq < .5 && G.ARTSET[hitKey] ? hitKey : moving && G.ARTSET[runKey] ? runKey : key, fr = Math.floor(t * (k2 === runKey ? 11 : 6) + e._ph);
  let sp, fk = 'idle';
  if (MINI_READY && (e.kind !== 'mon' || MD.isMon(e))) { // 용병 · 사람형 몬스터: LAYERLAB 인형
    // 용병: LAYERLAB 파츠 인형 (js/iso/minidoll.js). 무기는 인형이 들고 있다
    fk = lq < .22 ? 'w0' : lq < .5 ? 'w1' : hq < .5 ? 'hit' : moving ? 'run' : 'idle';
    sp = MD.frame(e, { lq, aim: !!aimOf(e), moving, t });
  } else if (DCSS) {
    const dl = dcssOf(e); if (!dl) return null;
    fk = lq < .22 ? 'w0' : lq < .5 ? 'w1' : hq < .5 ? 'hit' : moving ? 'run' : 'idle';
    // 깡충: 움직인 거리만큼 뛴다 (속도가 바뀌어도 발이 미끄러지지 않게)
    if (dl.hop) { e._hopA = lerp(e._hopA || 0, moving ? 1 : 0, .3); e._hopP = (e._hopP || 0) + Math.hypot(e._rx - pr, e._ry - pq) / HOP_D * Math.PI; oy -= Math.round(Math.abs(Math.sin(e._hopP)) * HOP_H * e._hopA); }
    const list = dl.fr[fk], idx = list.length > 1 ? (fk === 'run' ? Math.floor(t * 8 + e._ph) : Math.floor(t * 3 + e._ph)) % list.length : 0;
    sp = { w: dl.w, h: dl.h, foot: dl.foot, px: list[idx], weapon: dl.weapon, top: dl.top };
  } else sp = sprite(k2, fr) || sprite(key, 0);
  if (!sp) return null;
  e._sz = (e._sz ?? 1) + (G.Dnd.sizeK(e) - (e._sz ?? 1)) * Math.min(1, dt * 6); const sc = SC * (e.boss || (e.kind === 'mon' && e.s >= 2) ? 2 : 1) * e._sz; // 보스 · 큰 몬스터는 두 배로, 거대화는 서서히 커진다
  if (!down) { if (typeof HDBG !== 'undefined' && HDBG.on && !f.town) HDBG.shadow(wxp, wyp, .42 * sc); /* 선 그림 배경: 발밑 둥근 그림자 하나 */ else { pend.push([wxp, wyp, 0], .34 * sc, [wxp, wyp, (sp.foot * sc) / (COS * S) * .85]); castShadow(wxp, wyp, 0, .42 * sc, 2); } }
  return { e, sp, sx: base.sx + ox, sy: base.sy + oy, d: base.d, sc, flash, down, lq, moving, fk };
}
// 활 (쏘는 사람의 칸은 그대로): 대상 쪽으로 활을 돌려 겨누고 → 시위를 당겼다가 → 놓으면 시위가 떨린다
const AIM_UP = .14, DRAW_T = .4, RECOIL = 2.5, AIM_LIFT = 2, AIM_FWD = 2, PULL_MIN = 2, PULL_MAX = 7, SHAFT = 9, STR_C = rgb(226, 220, 196), WOOD_C = rgb(140, 100, 62), TIP_C = rgb(214, 222, 232), HAND_C = rgb(226, 178, 140), AIM_MAX = 1.25;
const isRanged = e => (e.kind === 'mon' ? !!G.Foe.ranged(e) : !!(e.def && e.def.range >= 2 && !e.swing));
function aimOf(e) { const st = rt().turn; return st && st.cur === e && st.tg && !st.tg.down && (st.ph === 'pre' || ((st.ph === 'show' || st.ph === 'move') && !(st.path && st.path.length))) && isRanged(e) ? st.tg : null; } // 걸어가는 동안은 겨누지 않는다
function aimLine(x0, y0, x1, y1, c, d) { const L = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) || 1; for (let i = 0; i <= L; i++) { const ix = Math.round(lerp(x0, x1, i / L)), iy = Math.round(lerp(y0, y1, i / L)); if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue; const k = iy * W + ix; if (d > zb[k]) { zb[k] = d; pix[k] = c; } } }
function drawBow(e, Wp, gxS, gyS, gx, sc, d, fl, lq, st) {
  const tg = aimOf(e), shot = lq < 1, n = now();
  if (tg) { if (e._aimFor !== st) { e._aimFor = st; e._aimT = n; } e._aimDir = [((tg.x - tg.y) - (e.x - e.y)) / R2, ((tg.x + tg.y) - (e.x + e.y)) / R2 * SIN]; }
  if (!tg && !shot) return false;
  const dir = e._aimDir || [fl ? 1 : -1, 0], l = Math.hypot(dir[0], dir[1]) || 1, ex = dir[0] / l, ey = dir[1] / l, face = fl ? 1 : -1;
  const age = tg ? (n - e._aimT) / 1000 : 9, up = shot ? 1 : Math.min(1, age / AIM_UP), draw = shot ? 0 : ease(clamp((age - AIM_UP) / DRAW_T, 0, 1));
  const midY = (Wp.tipT + Wp.tipB) / 2, tilt = clamp(Math.atan2(ey, Math.abs(ex)), -AIM_MAX, AIM_MAX) * up, ang = face * tilt, cx = gxS + ex * AIM_FWD * up * sc, cy = gyS + (midY - Wp.gy) * sc - AIM_LIFT * up * sc + ey * AIM_FWD * up * sc;
  blitRot(Wp, cx, cy, ang, sc, d + .12, { px: gx, py: midY, flip: fl }); // 활 한가운데가 손
  // 활 끝 (손잡이 기준으로 돌린 자리) · 시위 · 화살
  const ca = Math.cos(ang), sa = Math.sin(ang), tip = yy => { const v = (yy - midY) * sc; return [cx - sa * v, cy + ca * v]; }, T1 = tip(Wp.tipT), T2 = tip(Wp.tipB);
  const wob = shot && lq < .5 ? Math.sin(n / 14) * (1 - lq * 2) * 1.5 : 0, mid = [(T1[0] + T2[0]) / 2, (T1[1] + T2[1]) / 2], pull = (PULL_MIN + (PULL_MAX - PULL_MIN) * draw) * sc, nock = shot ? [mid[0] - ex * sc + wob, mid[1] - ey * sc] : [mid[0] - ex * pull, mid[1] - ey * pull], dz = d + .14;
  aimLine(T1[0], T1[1], nock[0], nock[1], STR_C, dz); aimLine(T2[0], T2[1], nock[0], nock[1], STR_C, dz);
  if (!shot && up >= 1) {
    const hx = nock[0] + ex * SHAFT * sc, hy = nock[1] + ey * SHAFT * sc;
    aimLine(nock[0], nock[1], hx, hy, WOOD_C, dz + .01); aimLine(hx - ex * sc, hy - ey * sc, hx + ex * sc, hy + ey * sc, TIP_C, dz + .02);
    for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const ix = Math.round(nock[0]) + a, iy = Math.round(nock[1]) + b, k = iy * W + ix; if (ix >= 0 && iy >= 0 && ix < W && iy < H) pix[k] = HAND_C; }
  }
  return true;
}
function drawRec(R0, t) {
  const { e, sp, sx, sy, d, sc, flash, down, lq } = R0, st = rt().turn;
  if (down) {
    if (e.dying || !e.merc) { blitRot(sp, sx, sy - 4, e._flipS ? -1.57 : 1.57, sc, d + .05, { px: sp.w / 2, py: sp.foot / 2, gray: true, flip: e._flipS }); for (let i = 0; i < 14; i++) { const a = hash(i, e.uid || 1) * 6.28, r2 = hash(i, 5) * 9, k = (sy + Math.sin(a) * r2 * .5 | 0) * W + (sx + Math.cos(a) * r2 | 0); if (k >= 0 && k < pix.length && zb[k] === bakedZ[k]) pix[k] = rgb(...C.blood); } if (e.dying) { if (Math.floor(t * 2) % 2) drawArrowAt(sx, sy - 14, t, C.red); } }
    return;
  }
  if (DCSS) {
    // DCSS 그림은 왼쪽을 본다: 오른쪽을 볼 때 뒤집는다
    const fl = !e._flipS;
    if (sp.mini) MD.enqueue(R0, fl, flash); // 용병 인형: 고해상도 층에 원본 그대로 (minidoll.js)
    else if (MINI_ON && typeof HDBG !== 'undefined' && HDBG.on && !f.town) MD.enqueue(R0, fl, flash); // 선 그림 배경: 픽셀 몬스터도 고해상도 층에 (붉은 외곽선)
    else blit(sp, sx, sy, d, { flip: fl, flash, sc, xray: true });
    if (sp.weapon) {
      const Wp = sp.weapon, ranged = isRanged(e), sign = fl ? 1 : -1, of = [0, 0];
      let ang = 0, lift = 0;
      if (lq < 1) { if (ranged) { const u = Math.sin(Math.PI * lq); ang = sign * .3 * u; lift = u * 3; } else ang = sign * (lq < .22 ? lerp(0, -.8, lq / .22) : lq < .5 ? lerp(-.8, 1.7, ease((lq - .22) / .28)) : lerp(1.7, 0, ease((lq - .5) / .5))); }
      const L = sx - sp.w * sc / 2, B0 = sy - sp.foot * sc, gx = fl ? Wp.w - 1 - Wp.gx : Wp.gx, ox = fl ? -of[0] : of[0];
      if (Wp.bow && drawBow(e, Wp, L + gx * sc + ox, B0 + Wp.gy * sc + of[1], gx, sc, d, fl, lq, st)) return;
      blitRot(Wp, L + gx * sc + ox, B0 + Wp.gy * sc + of[1] - lift, ang, sc, d + .12, { px: gx, py: Wp.gy, flip: fl });
    }
  } else blit(sp, sx, sy, d, { flip: e._flipS, flash, sc });
  // 무기: 평소엔 비스듬히, 공격 때 크게 휘두른다
  if (!DCSS && e.wpn && G.ARTSET[e.wpn]) {
    const W0 = sprite(e.wpn); if (W0) {
      const face = e._flipS ? -1 : 1, bow = e.wpn === 'w_bow', staff = /staff|holymace/.test(e.wpn);
      let ang = .5, lift = 0, pull = 0;
      if (bow) { ang = 0; pull = lq < 1 ? Math.sin(Math.PI * lq) * 3 : 0; }
      else if (staff) { ang = .22; if (lq < 1) { const u = Math.sin(Math.PI * lq); ang = .22 - .35 * u; lift = u * 6; } }
      else if (lq < 1) { ang = lq < .22 ? lerp(.5, -1.7, lq / .22) : lq < .5 ? lerp(-1.7, 2.1, ease((lq - .22) / .28)) : lerp(2.1, .5, ease((lq - .5) / .5)); }
      const sw = sp.w * sc, hx = sx + face * (sw * .32 - pull), hy = sy - sp.foot * sc * .36 - lift;
      blitRot(W0, hx, hy, face * ang, .62 * sc, d + (e._flipS ? -.02 : .08), { flip: e._flipS });
    }
  }
  if (e.max && (e.kind === 'mon' ? e.boss || e.hp < e.max || st : e.hp < e.max)) {
    const w = e.boss ? 40 : 14, th = e.boss ? 2 : 0, f2 = clamp(e.hp / e.max, 0, 1), L = sx - w / 2 | 0, Y = (sy - sp.foot * sc - 5) | 0, ink = rgb(...C.ink); // 보스는 굵고 긴 막대
    for (let i = -1; i <= w; i++) for (let j = -1; j <= 1 + th; j++) { const k = (Y + j) * W + L + i; if (k >= 0 && k < pix.length) pix[k] = ink; }
    const c = rgb(...(e.kind === 'mon' ? C.red : f2 > .4 ? [110, 196, 110] : C.orange));
    for (let j = 0; j <= th; j++) for (let i = 0; i < Math.round(f2 * w); i++) { const k = (Y + j) * W + L + i; if (k >= 0 && k < pix.length) pix[k] = c; }
  }
  if (e._mark && now() < e._mark.until) drawBang(sx, sy - sp.foot * sc - 8, e._mark.c);
  if (st && st.cur === e) drawArrowAt(sx, sy - sp.foot * sc - 8, t, e.kind === 'mon' ? C.red : [255, 214, 10]);
}
function drawArrowAt(sx, sy, t, col) {
  const A = ['..ooooo..', '..oXXXo..', '..oXXXo..', 'oooXXXooo', 'oXXXXXXXo', '.oXXXXXo.', '..oXXXo..', '...oXo...', '....o....'], L = Math.round(sx) - 4, Y = Math.round(sy) - A.length - (Math.floor(t * 3) % 2) * 2, ink = rgb(...C.ink), fill = rgb(...col);
  A.forEach((row, j) => [...row].forEach((c, i) => { const k = (Y + j) * W + L + i; if (k >= 0 && k < pix.length) { if (c === 'o') pix[k] = ink; if (c === 'X') pix[k] = fill; } }));
}
