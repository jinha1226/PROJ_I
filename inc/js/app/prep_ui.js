'use strict';
// 문 열기 연출 (화면 쪽, 설계 5-11): 적이 있는 방의 문 앞에 서면 저절로 연다 — 누르는 것 없음.
// 2026-11-18: 손으로 하는 준비(엿듣기 · 자리 잡기 · 기름 · 마름쇠 창)는 뺐다 (사용자: 「이 과정이 너무 번거롭다」).
// 누가 어떻게 여나는 규칙 쪽 G.Prep.next가 고른다 (살살 → 자물쇠 따기 두 번 → 걷어차기). 여기는 걷는 모습 · 머리 위 주사위 · 문이 열리는 연출뿐.
// 쓰는 쪽: PREPUI.open(rt, { door, doorTiles, out, locked, mons, others, items, intro(Map 사람 → 걸어올 자리), reveal(), onOpen(setup) }).
// 매 틱 PREPUI.frame(dt) — 문을 여는 동안 true (그동안 탐사 걸음 · 전투 시계는 멈춘다).
const PREPUI = (() => {
  const { $ } = UI;
  let R = null, P = null, O = null, busy = false, opening = null, intro = null, die = null, wait = 0;
  const walks = new Map(); // 사람 → { to, then }
  const doorK = () => Math.round(O.door.y) * R.map.w + Math.round(O.door.x);
  const front = () => ({ x: O.door.x + P.out.x * 1.1, y: O.door.y + P.out.y * 1.1 }); // 문 바로 앞 (우리 쪽)
  const io = { d20: () => 1 + Math.floor(Math.random() * 20), skill: (w, sk) => G.Dnd.best([w.merc], sk).v, insp: w => { if (!w.merc?.insp) return false; w.merc.insp = false; return true; } };
  const live = () => R.party.filter(p => !p.dead);

  function open(rt, o) {
    R = rt; O = o; busy = false; opening = null; die = null; wait = 0; walks.clear();
    const dset = new Set(o.doorTiles || [Math.round(o.door.y) * R.map.w + Math.round(o.door.x)]); // 닫힌 문 칸들 (탐사 층은 지도 1칸 = 2×2타일)
    const grid = { w: R.map.w, h: R.map.h, pass: k => R.map.c[k] !== '#', door: k => dset.has(k) && !(P && P.opened) };
    P = G.Prep.begin({ door: o.door, out: o.out, locked: o.locked, grid, mons: o.mons, items: o.items, others: o.others });
    intro = o.intro ? { to: o.intro, t: 0 } : null;
  }
  function close() { const el = $('prepdie'); if (el) el.remove(); P = null; }
  // 한 번 열어 본다: 고른 사람이 문 앞으로 → 주사위 → 열리면 연출, 안 열리면 잠깐 뒤 다음 방법
  function attempt() {
    const n = G.Prep.next(P, live(), io); if (!n) return;
    busy = true;
    walkTo(n.who, front(), () => {
      const r = G.Prep.open(P, n.who, n.id, io); if (!r) { busy = false; return; }
      roll(n.who, r.nat, () => { G.Feed.push(r.ev); if (r.ok) startOpening(); else { busy = false; wait = 0.5; } });
    });
  }
  function walkTo(who, to, then) { walks.set(who, { to: { x: to.x, y: to.y }, then }); }
  // 주사위: 머리 위에서 0.8초 구르다 멈춘다 (판정 없는 행동이면 바로)
  function roll(who, nat, then) {
    if (nat == null) { die = { who, t: 0, T: 0.25, nat: null, then }; return; }
    let el = $('prepdie'); if (!el) { el = document.createElement('div'); el.id = 'prepdie'; $('floats').append(el); }
    die = { who, t: 0, T: 1.3, nat, then, el };
  }
  // 문이 열린다: 방을 시야에 드러낸다 (벽으로 구운 문이면 바닥으로 바꿔 다시 굽는다) → 1초 뒤 전투
  function startOpening() {
    const shut = (O.doorTiles || [doorK()]).filter(k => R.map.c[k] === '#'); // 벽으로 구운 문만 (시험 장면) — 탐사 층은 문을 굽지 않아 다시 굽지 않는다
    if (shut.length) { G.Floor.setTiles(R.map, shut, '.'); win.map = null; } // 길 찾기 기억도 새로 (floor.js)
    O.reveal?.(); for (const m of P.mons) m.spotted = true;
    G.Fantasy.refreshEnts?.(R); if (G.Sight?.update) G.Sight.update(R);
    opening = { t: 0 };
  }

  function frame(dt) {
    if (!P) return false;
    if (intro) { intro.t += dt; let left = 0; for (const [e, q] of intro.to) { const path = [q]; G.Tactics.walk(e, path, 3.2, dt); if (path.length) left++; } if (!left || intro.t > 4) intro = null; }
    for (const [e, w] of [...walks]) { const path = [w.to]; G.Tactics.walk(e, path, 3.2, dt); if (!path.length) { walks.delete(e); if (w.then) w.then(); } }
    if (die) {
      die.t += dt;
      if (die.el) { const rolling = die.t < 0.8; die.el.textContent = rolling ? 1 + Math.floor(Math.random() * 20) : die.nat; die.el.className = rolling ? 'rolling' : die.nat === 20 ? 'crit' : die.nat === 1 ? 'fumble' : ''; UI.place(die.el, die.who.x, die.who.y, 2.6); }
      if (die.t >= die.T) { const d = die; die = null; if (d.el) d.el.remove(); d.then(); }
    }
    if (!intro && !busy && !opening && (wait -= dt) <= 0) attempt();
    if (opening && (opening.t += dt) > 1.1) { const S = G.Prep.setup(P), cb = O.onOpen; close(); cb(S); return false; }
    return true;
  }
  return { open, frame, get active() { return !!P; } };
})();
