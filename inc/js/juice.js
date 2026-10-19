'use strict';
// 손맛: 히트스톱, 화면 흔들림, 결정타 슬로모션+확대, 맞은 대상 번쩍임, 효과음 호출.
// 세계 로직은 G.J.*를 부르기만 한다. 지금 보고 있는 세계가 아니거나 오프라인 계산 중이면 아무 일도 하지 않는다.
// 히트스톱·슬로모션으로 멈춘 시간은 빚으로 쌓았다가 조금 빠르게 돌려준다 — 클릭이 생산을 깎지 않게.
G.OPT = { sfx: true, vol: 0.6, shake: true };
try { Object.assign(G.OPT, JSON.parse(localStorage.getItem('rift_inc_opt') || '{}')); } catch (e) { /* 저장소를 못 쓰면 기본값 */ }
G.saveOpt = () => { try { localStorage.setItem('rift_inc_opt', JSON.stringify(G.OPT)); } catch (e) { /* 무시 */ } };

G.J = {
  st: {},
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  live: id => !G.quiet && !!G.UI && G.UI.cur === id,
  s(id) { return this.st[id] || (this.st[id] = { stop: 0, slow: 0, debt: 0, shA: 0, shT: 0, shD: 1, dx: 0, dy: 0, zT: 0, zD: 1, zx: 0, zy: 0, z: 1, flT: 0, flC: '#fff' }); },

  // 맞은 대상이 하얗게 번쩍이며 떤다. power(0~1) > 0이면 세계 전체가 잠깐 멈춘다(히트스톱).
  hit(id, e, power = 0) {
    if (!G.J.live(id)) return;
    e._hit = G.J.now();
    e._hitP = power;
    if (power > 0) { const s = G.J.s(id); s.stop = Math.max(s.stop, 0.03 + 0.1 * power); }
  },
  // 방향(dx, dy)을 주면 그쪽으로 튕겼다 돌아오고, 없으면 무작위로 떤다
  shake(id, amp, dx = 0, dy = 0, dur = 0.25) {
    if (!G.J.live(id) || !G.OPT.shake) return;
    const s = G.J.s(id), now = G.J.now();
    const left = s.shT + s.shD * 1000 > now ? s.shA * (1 - (now - s.shT) / (s.shD * 1000)) : 0;
    if (amp < left) return;
    Object.assign(s, { shA: amp, shT: now, shD: dur, dx, dy });
  },
  flash(id, col = '#fff') {
    if (!G.J.live(id)) return;
    const s = G.J.s(id);
    s.flT = G.J.now(); s.flC = col;
  },
  // 결정타: 느려지며 그 자리로 다가간다
  finish(id, x, y, z = 1.45) {
    if (!G.J.live(id)) return;
    const s = G.J.s(id);
    s.slow = Math.max(s.slow, 0.9);
    s.stop = Math.max(s.stop, 0.12);
    Object.assign(s, { zT: G.J.now(), zD: 1.4, zx: x, zy: y, z });
    G.J.flash(id);
    G.J.shake(id, 10, 0, 1, 0.4);
  },
  sfx(id, name, o) { if (G.J.live(id) && G.SFX) G.SFX.play(name, o); },

  // 로직 dt 조정: 멈춤/느림 동안 못 쓴 시간을 빚으로 쌓고, 끝나면 35%씩 얹어서 갚는다
  dt(id, dt) {
    const s = G.J.st[id];
    if (!s) return dt;
    if (s.stop > 0) { const u = Math.min(s.stop, dt); s.stop -= u; s.debt += u; dt -= u; }
    if (s.slow > 0) { s.slow -= dt; s.debt += dt * 0.75; return dt * 0.25; }
    if (s.debt > 0) { const r = Math.min(s.debt, dt * 0.35); s.debt -= r; dt += r; }
    return dt;
  },

  // ── 그리기용 (render.js가 읽는다) ──
  shakeOff(id, now) {
    const s = G.J.st[id];
    if (!s || !s.shA) return [0, 0];
    const k = 1 - (now - s.shT) / (s.shD * 1000);
    if (k <= 0) { s.shA = 0; return [0, 0]; }
    const a = s.shA * k * k, osc = Math.sin((now - s.shT) / 18);
    if (s.dx || s.dy) return [s.dx * a * osc + (Math.random() - 0.5) * a * 0.3, s.dy * a * osc + (Math.random() - 0.5) * a * 0.3];
    return [(Math.random() - 0.5) * 2 * a, (Math.random() - 0.5) * 2 * a];
  },
  // 확대 정도 0~1: 빠르게 다가가서 머물다가 천천히 돌아온다
  zoomK(id, now) {
    const s = G.J.st[id];
    if (!s || !s.zT) return 0;
    const p = (now - s.zT) / (s.zD * 1000);
    if (p >= 1) { s.zT = 0; return 0; }
    if (p < 0.12) return p / 0.12;
    if (p < 0.6) return 1;
    const q = (p - 0.6) / 0.4;
    return 1 - q * q * (3 - 2 * q);
  },
  flashA(id, now) {
    const s = G.J.st[id];
    if (!s || !s.flT) return 0;
    const a = 1 - (now - s.flT) / 160;
    if (a <= 0) { s.flT = 0; return 0; }
    return a * 0.55;
  },
};
