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
  // 보이는 위치: 속도 상한을 두고 진짜 위치를 쫓는다. 코너에 걸리면 벽을 따라 미끄러진다 (순간이동 금지)
  for (const e of es) {
    if (e._dx == null) { e._dx = e.x; e._dy = e.y; }
    e._ldx = e._dx; e._ldy = e._dy;
    const dx = e.x - e._dx, dy = e.y - e._dy, d = Math.hypot(dx, dy);
    if (d > SNAP_D) { e._dx = e.x; e._dy = e.y; continue; } // 층 이동 · 소환 같은 진짜 이동만
    if (d < .001) continue;
    const step = Math.min(d, Math.min(d * 5 + .4, DISP_V + Math.max(0, d - 3) * 2) * dt), nx = e._dx + dx / d * step, ny = e._dy + dy / d * step;
    if (open(nx, ny)) { e._dx = nx; e._dy = ny; } else if (open(nx, e._dy)) e._dx = nx; else if (open(e._dx, ny)) e._dy = ny; else { e._dx = nx; e._dy = ny; }
  }
  const place = (e, x, y) => { if (open(x, y)) { e._dx = x; e._dy = y; } else if (open(x, e._dy)) e._dx = x; else if (open(e._dx, y)) e._dy = y; };
  for (let pass = 0; pass < 3; pass++) for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
    const a = es[i], b = es[j]; let dx = a._dx - b._dx, dy = a._dy - b._dy, dd = Math.hypot(dx, dy);
    if (dd >= MIN_D) continue;
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
    const k = lq < .22 ? -2.5 * (lq / .22) : lq < .42 ? lerp(-2.5, 11, ease((lq - .22) / .2)) : lerp(11, 0, ease((lq - .42) / .58));
    ox += sx / l * k; oy += sy / l * k; if (lq > .22 && lq < .5) oy -= 2;
  }
  const hq = e._hit ? (n - e._hit) / 260 : 1;
  if (hq < 1) { const sx = ((e._kx || 0) - (e._ky || 0)) / R2, sy = ((e._kx || 0) + (e._ky || 0)) / R2 * SIN, kb = (1 - hq) * (1 - hq) * 6; ox += sx * kb + Math.sin(n / 18) * (1 - hq) * 1.4; oy += sy * kb; flash = hq < .3; }
  if (moving && !DCSS) oy -= Math.abs(Math.sin(t * 13 + e.x)) * 2;
  const down = e.dying || e.dead;
  const key = e.t, hitKey = key + '_hit', runKey = key + '_run';
  e._ph = e._ph == null ? Math.random() * 4 : e._ph;
  const k2 = hq < .5 && G.ARTSET[hitKey] ? hitKey : moving && G.ARTSET[runKey] ? runKey : key, fr = Math.floor(t * (k2 === runKey ? 11 : 6) + e._ph);
  let sp, fk = 'idle';
  if (DCSS) {
    const dl = dcssOf(e); if (!dl) return null;
    fk = lq < .22 ? 'w0' : lq < .5 ? 'w1' : hq < .5 ? 'hit' : moving ? 'run' : 'idle';
    // 깡충: 움직인 거리만큼 뛴다 (속도가 바뀌어도 발이 미끄러지지 않게)
    if (dl.hop) { e._hopA = lerp(e._hopA || 0, moving ? 1 : 0, .3); e._hopP = (e._hopP || 0) + Math.hypot(e._rx - pr, e._ry - pq) / HOP_D * Math.PI; oy -= Math.round(Math.abs(Math.sin(e._hopP)) * HOP_H * e._hopA); }
    const list = dl.fr[fk], idx = list.length > 1 ? (fk === 'run' ? Math.floor(t * 8 + e._ph) : Math.floor(t * 3 + e._ph)) % list.length : 0;
    sp = { w: dl.w, h: dl.h, foot: dl.foot, px: list[idx], weapon: dl.weapon, top: dl.top };
  } else sp = sprite(k2, fr) || sprite(key, 0);
  if (!sp) return null;
  const sc = SC * ((e.boss && sp.w < 24) || (e.kind === 'mon' && e.s >= 2) ? 2 : 1); // 큰 몬스터는 두 배로 (히드라)
  if (!down) { pend.push([wxp, wyp, 0], .34 * sc, [wxp, wyp, (sp.foot * sc) / (COS * S) * .85]); castShadow(wxp, wyp, 0, .42 * sc, 2); }
  return { e, sp, sx: base.sx + ox, sy: base.sy + oy, d: base.d, sc, flash, down, lq, moving, fk };
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
    blit(sp, sx, sy, d, { flip: fl, flash, sc });
    if (sp.weapon) {
      const Wp = sp.weapon, ranged = /archer|bard|mage|archmage|scout|warlock/.test((e.merc || f.leader).cls), sign = fl ? 1 : -1, of = [0, 0];
      let ang = 0, lift = 0;
      if (lq < 1) { if (ranged) { const u = Math.sin(Math.PI * lq); ang = sign * .3 * u; lift = u * 3; } else ang = sign * (lq < .22 ? lerp(0, -.8, lq / .22) : lq < .5 ? lerp(-.8, 1.7, ease((lq - .22) / .28)) : lerp(1.7, 0, ease((lq - .5) / .5))); }
      const L = sx - sp.w / 2, B0 = sy - sp.foot, gx = fl ? Wp.w - 1 - Wp.gx : Wp.gx, ox = fl ? -of[0] : of[0];
      blitRot(Wp, L + gx + ox, B0 + Wp.gy + of[1] - lift, ang, 1, d + .12, { px: gx, py: Wp.gy, flip: fl });
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
  if (e.max && (e.kind === 'mon' ? e.hp < e.max || st : e.hp < e.max)) {
    const w = 14, f2 = clamp(e.hp / e.max, 0, 1), L = sx - w / 2 | 0, Y = (sy - sp.foot * sc - 5) | 0, ink = rgb(...C.ink);
    for (let i = -1; i <= w; i++) for (let j = -1; j <= 1; j++) { const k = (Y + j) * W + L + i; if (k >= 0 && k < pix.length) pix[k] = ink; }
    const c = rgb(...(e.kind === 'mon' ? C.red : f2 > .4 ? [110, 196, 110] : C.orange));
    for (let i = 0; i < Math.round(f2 * w); i++) { const k = Y * W + L + i; if (k >= 0 && k < pix.length) pix[k] = c; }
  }
  if (e._mark && now() < e._mark.until) drawBang(sx, sy - sp.foot * sc - 8, e._mark.c);
  if (st && st.cur === e) drawArrowAt(sx, sy - sp.foot * sc - 8, t, e.kind === 'mon' ? C.red : [255, 214, 10]);
}
function drawArrowAt(sx, sy, t, col) {
  const A = ['..ooooo..', '..oXXXo..', '..oXXXo..', 'oooXXXooo', 'oXXXXXXXo', '.oXXXXXo.', '..oXXXo..', '...oXo...', '....o....'], L = Math.round(sx) - 4, Y = Math.round(sy) - A.length - (Math.floor(t * 3) % 2) * 2, ink = rgb(...C.ink), fill = rgb(...col);
  A.forEach((row, j) => [...row].forEach((c, i) => { const k = (Y + j) * W + L + i; if (k >= 0 && k < pix.length) { if (c === 'o') pix[k] = ink; if (c === 'X') pix[k] = fill; } }));
}
