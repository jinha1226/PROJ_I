'use strict';
// pixelfx 이펙트 층: 재생 · 톤 맞춤 · 인물 윤곽
// ───── pixelfx 이펙트 (pixelfx/README.md): 화면 픽셀에 그리고, 색은 스프라이트와 같은 톤으로 맞춘다 ─────
const PFX = G.PFX, fxLive = [], fxFrame = PFX ? PFX.createFrame(VW, VH, 0, 0) : null, fxTone = new Map(), FX_MAX = 48, FX_LIGHT = .62, Z_CHEST = 1.5, TORCH_CLIP = 2;
function pfx(id, x, y, z = 0, o = {}) {
  if (!PFX || !PFX.mods[id] || fxLive.length >= FX_MAX) return null;
  const { e, body, under, k = 1, to, clip = 0, ...opt } = o, meta = PFX.mods[id].meta, rec = { fx: PFX.createFx(PFX.mods[id], { seed: 1 + (Math.random() * 9999 | 0), x: -999, y: -999, actor: actorOf(body || e), ...opt }), x, y, z, e, under: !!under, k, to, clip, age: 0, loop: !!meta.loop };
  // 칠할 영역: 원본 크기 + 여유 (회전하면 정사각형)
  const [sw, sh] = meta.size, [ox, oy] = meta.origin; rec.rw = opt.angle ? Math.max(sw, sh) : Math.max(ox, sw - ox) + 12; rec.ru = opt.angle ? rec.rw : oy + 24; rec.rd = opt.angle ? rec.rw : sh - oy + 12;
  fxLive.push(rec); return rec;
}
function stepFx(dt) {
  for (let i = fxLive.length - 1; i >= 0; i--) {
    const q = fxLive[i]; q.age += dt;
    if (q.e && q.e._dx != null) { q.x = wx(q.e._dx); q.y = wy(q.e._dy); if (q.e.dead && !q.e.dying) q.fx.stop(); }
    if (q.to) { const u = Math.min(1, q.age / q.to.t); q.x = lerp(q.to.x0, q.to.x1, u); q.y = lerp(q.to.y0, q.to.y1, u); if (u >= 1) { fxLive.splice(i, 1); continue; } }
    const a = project(q.x, q.y, q.z); q.fx.options.x = Math.round(a.sx); q.fx.options.y = Math.round(a.sy);
    q.vis = a.sx > -160 && a.sx < VW + 160 && a.sy > -160 && a.sy < VH + 200;
    if (q.vis || !q.loop) q.fx.update(dt * q.k);
    if (q.fx.done()) fxLive.splice(i, 1);
  }
}
// 이펙트가 쓰는 인물 윤곽: 원본의 기준 인물 대신 우리 스프라이트로 만든다. 인물이 없는 곳은 빈 윤곽
const NO_BODY = { mask: { w: 24, h: 38, data: new Uint8Array(24 * 38) }, pixels: new Uint32Array(24 * 38), x: -12, y: -38, w: 24, h: 38, k: 2, head: [0, -38], chest: [0, -26] }, bodies = new Map();
function actorOf(e) {
  if (!e) return NO_BODY;
  const dl = DCSS && dcssOf(e); if (!dl) return NO_BODY;
  let a = bodies.get(dl); if (a) return a;
  const px = dl.fr.idle[0], w = dl.w, h = dl.h, data = new Uint8Array(w * h); for (let i = 0; i < px.length; i++) if (px[i]) data[i] = 1;
  const top = dl.top - dl.foot;
  a = { mask: { w, h, data }, pixels: px, x: -(w >> 1), y: -dl.foot, w, h, k: 2, head: [0, top], chest: [0, Math.round(top * .62)] };
  bodies.set(dl, a); return a;
}
function paintFx(under) {
  const Cc = fxFrame.color, Ll = fxFrame.light;
  for (const q of fxLive) {
    if (!q.vis || q.under !== under) continue;
    q.fx.draw(fxFrame);
    const X = q.fx.options.x, Y = q.fx.options.y, x0 = Math.max(0, X - q.rw), x1 = Math.min(VW, X + q.rw), y0 = Math.max(0, Y - q.ru), y1 = Math.min(VH, Y + q.rd);
    for (let iy = y0; iy < y1; iy++) for (let i = iy * VW + x0, e0 = iy * VW + x1; i < e0; i++) {
    const c = Cc[i], l = Ll[i] & 0xffffff; if (!c && !l) continue;
    Cc[i] = 0; Ll[i] = 0;
    let d = pix[i];
    const ca = q.clip && iy > Y - q.clip ? 0 : c >>> 24; // 원본의 긴 손잡이는 잘라 낸다 (빛은 남긴다)
    if (ca) { const key = c | 0xff000000; let tc = fxTone.get(key); if (tc === undefined) { tc = tone(key); fxTone.set(key, tc); } if (ca >= 250) d = tc; else { const u = ca / 255; d = rgb(lerp(d & 255, tc & 255, u), lerp(d >> 8 & 255, tc >> 8 & 255, u), lerp(d >> 16 & 255, tc >> 16 & 255, u)); } }
    if (l) d = rgb(Math.min(255, (d & 255) + (l & 255) * FX_LIGHT), Math.min(255, (d >> 8 & 255) + (l >> 8 & 255) * FX_LIGHT), Math.min(255, (d >> 16 & 255) + (l >> 16 & 255) * FX_LIGHT));
    pix[i] = d;
    }
  }
}
const SWING = { dragoon: 'melee/thrust', rogue: 'melee/dagger-flurry', barbarian: 'melee/heavy-cleave' }, FOE_SLASH = ['#1c1014', '#4a1c22', '#7c2e30', '#ae5240', '#d89070', '#f4dcc0'];
const PROJ_FX = { fx_arrow: 'projectiles/arrow', fx_fire: 'fire/fireball', fx_flame: 'fire/fireball', fx_ice: 'ice/ice-lance' };
