'use strict';
// 문 앞 준비 (화면 쪽, 설계 5-11): 적이 있는 방의 문 앞에서 시간이 멈춘다. 규칙은 js/game/prep.js — 여기는 누르기 · 걷는 모습 · 주사위 · 실루엣 · 연출.
// 쓰는 쪽: PREPUI.open(rt, { door, doorTiles, out, locked, mons, others, items, clue, intro(Map 사람 → 걸어올 자리), script, reveal(), onOpen(setup, 남은 물건) }).
// 매 틱 PREPUI.frame(dt) — 준비 중이면 true (그동안 탐사 걸음 · 전투 시계는 멈춘다).
const PREPUI = (() => {
  const { $, esc } = UI;
  let R = null, P = null, O = null, sel = null, mode = null, ghost = null, busy = false, opening = null, intro = null, die = null, script = [];
  const walks = new Map(); // 사람 → { to, then }
  const AW = { sleep: 'z', idle: '?', alert: '!', hunt: '!!' };
  const TIP = { stand: '바닥을 눌러 고른 사람을 세운다 (문 앞 우리 쪽).', oil: '기름을 부을 곳을 누른다 — 불이 닿으면 타오른다.', caltrops: '마름쇠를 뿌릴 곳을 누른다 — 처음 밟는 적은 멈춘다.' };
  const doorK = () => Math.round(O.door.y) * R.map.w + Math.round(O.door.x);
  const front = () => ({ x: O.door.x + P.out.x * 1.1, y: O.door.y + P.out.y * 1.1 }); // 문 바로 앞 (우리 쪽)
  const io = { d20: () => 1 + Math.floor(Math.random() * 20), skill: (w, sk) => G.Dnd.best([w.merc], sk).v };
  const live = () => R.party.filter(p => !p.dead);

  function open(rt, o) {
    R = rt; O = o; sel = null; mode = null; ghost = null; busy = true; opening = null; die = null; walks.clear();
    const dset = new Set(o.doorTiles || [Math.round(o.door.y) * R.map.w + Math.round(o.door.x)]); // 닫힌 문 칸들 (탐사 층은 지도 1칸 = 2×2타일)
    const grid = { w: R.map.w, h: R.map.h, pass: k => R.map.c[k] !== '#', door: k => dset.has(k) && !(P && P.opened) };
    P = G.Prep.begin({ door: o.door, out: o.out, locked: o.locked, grid, party: live(), mons: o.mons, items: o.items, clue: o.clue, others: o.others });
    FXUI.extra = () => (P ? P.dropped.map(d => ({ ...d, r: G.Ground.R[d.kind], lit: false })) : []);
    intro = o.intro ? { to: o.intro, t: 0 } : null; script = (o.script || []).slice();
    if (!intro) begin();
    canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onTap);
  }
  function begin() { busy = false; sel = live()[0]; panel(); }
  function close() {
    canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onTap);
    for (const id of ['prep', 'prepsvg', 'prepdie']) { const el = $(id); if (el) el.remove(); }
    FXUI.extra = null; P = null;
  }

  // ── 창: 사람 · 엿듣기 · 자리 잡기 · 물건 · 여는 방법 ──
  function panel() {
    let box = $('prep'); if (!box) { box = document.createElement('div'); box.id = 'prep'; box.onclick = onPanel; box.onpointerup = ev => ev.stopPropagation(); $('stage').append(box); }
    const L = P.listened, ms = sel ? G.Prep.methods(P, sel) : [], off = busy ? ' disabled' : '';
    box.innerHTML = `<h4>문 앞 준비 <small>${P.locked ? '잠긴 문' : '닫힌 문'} · 너머: ${esc(L ? (L.ok ? `적 ${L.hint}` : L.hint) : '모른다')}</small></h4>` +
      `<div class="who">${live().map((p, i) => `<button data-p="${i}" class="${p === sel ? 'on' : ''}"${off}>${esc(p.merc?.name || '동료')}<small>${esc(G.Guild.def(p.merc).n)}</small></button>`).join('')}</div>` +
      `<div class="acts"><button data-a="listen"${L || busy ? ' disabled' : ''}>엿듣기<small>${L ? '했다' : '지각 판정'}</small></button>` +
      `<button data-a="stand" class="${mode === 'stand' ? 'on' : ''}"${off}>자리 잡기<small>바닥을 누른다</small></button>` +
      ['oil', 'caltrops'].map(k => `<button data-a="${k}" class="${mode === k ? 'on' : ''}"${!P.items[k] || busy ? ' disabled' : ''}>${k === 'oil' ? '기름' : '마름쇠'} ×${P.items[k]}<small>${k === 'oil' ? '불이 닿으면 탄다' : '밟으면 멈춘다'}</small></button>`).join('') + '</div>' +
      `<div class="open"><b>${esc(sel?.merc?.name || '')}이(가) 연다</b>${ms.map(m => `<button data-m="${m.id}"${!m.ok || busy ? ' disabled' : ''}>${esc(m.n)}<small>${m.ok ? `${m.dc ? `DC ${m.dc} · ` : ''}소리 ${m.noise}${m.fail != null && m.fail !== m.noise ? ` · 실패하면 ${m.fail}` : ''}` : esc(m.why)}</small></button>`).join('')}</div>` +
      `<p class="tip">${esc(busy ? '…' : TIP[mode] || '사람을 골라 엿듣거나, 세우거나, 물건을 놓거나, 문을 연다.')}</p>`;
  }
  function onPanel(ev) {
    ev.stopPropagation(); const b = ev.target.closest('button'); if (!b || b.disabled || busy) return;
    if (b.dataset.p != null) sel = live()[+b.dataset.p];
    else if (b.dataset.a === 'listen') return doListen();
    else if (b.dataset.a) mode = mode === b.dataset.a ? null : b.dataset.a;
    else if (b.dataset.m) return doOpen(b.dataset.m);
    panel();
  }

  // ── 바닥 누르기: 세우기 · 놓기 · 사람 고르기 ──
  function onMove(ev) { if (P && mode) { const [x, y] = UI.tileAt(ev.clientX, ev.clientY); ghost = { x, y }; } }
  function onTap(ev) {
    if (!P || busy || opening) return;
    const [x, y] = UI.tileAt(ev.clientX, ev.clientY); ghost = { x, y };
    if (mode === 'stand' && sel) { if (G.Prep.stand(P, sel, x, y)) walkTo(sel, { x, y }); else say('거기는 설 수 없다 — 문 앞 우리 쪽에'); return; }
    if (mode === 'oil' || mode === 'caltrops') { if (G.Prep.drop(P, mode, x, y)) { if (!P.items[mode]) mode = null; panel(); } else say('거기는 놓을 수 없다 — 문 앞이나 문간에'); return; }
    const p = live().find(q => Math.hypot(q.x - x, q.y - y) < 0.9); if (p) { sel = p; panel(); }
  }
  const say = s => G.fx(R, { k: 'text', x: sel ? sel.x : O.door.x, y: (sel ? sel.y : O.door.y) - 1.2, s, col: '#e8c890', t: 1.4, sz: 0.75 });
  function walkTo(who, to, then) { walks.set(who, { to: { x: to.x, y: to.y }, then }); }

  // ── 엿듣기 · 열기: 문 앞으로 걸어가 → 주사위 → 결과 ──
  function doListen() {
    const who = sel; busy = true; panel();
    walkTo(who, front(), () => {
      const r = G.Prep.listen(P, who, io);
      roll(who, r.res.nat, () => { G.Feed.push(r.ev); if (r.res.ok) for (const m of P.mons) m._known = true; busy = false; panel(); });
    });
  }
  function doOpen(id) {
    const who = sel; busy = true; panel();
    walkTo(who, front(), () => {
      const r = G.Prep.open(P, who, id, io); if (!r) { busy = false; panel(); return; }
      roll(who, r.nat, () => { G.Feed.push(r.ev); if (r.ok) startOpening(); else { busy = false; panel(); } });
    });
  }
  // 주사위: 머리 위에서 0.8초 구르다 멈춘다 (판정 없는 행동이면 바로)
  function roll(who, nat, then) {
    if (nat == null) { die = { who, t: 0, T: 0.25, nat: null, then }; return; }
    let el = $('prepdie'); if (!el) { el = document.createElement('div'); el.id = 'prepdie'; $('floats').append(el); }
    die = { who, t: 0, T: 1.3, nat, then, el };
  }
  // 문이 열린다: 그 자리를 바닥으로 바꿔 다시 굽고(잠깐 어두워졌다 밝아진다) 방을 드러낸다 → 1초 뒤 전투
  function startOpening() {
    for (const k of O.doorTiles || [doorK()]) R.map.c[k] = '.'; win.map = null;
    O.reveal?.(); for (const m of P.mons) m.spotted = true;
    G.Fantasy.refreshEnts?.(R); if (G.Sight?.update) G.Sight.update(R);
    const box = $('prep'); if (box) box.remove();
    opening = { t: 0 };
  }

  function frame(dt) {
    if (!P) return false;
    if (intro) { intro.t += dt; let left = 0; for (const [e, q] of intro.to) { const path = [q]; G.Tactics.walk(e, path, 3.2, dt); if (path.length) left++; } if (!left || intro.t > 4) { intro = null; begin(); } }
    for (const [e, w] of [...walks]) { const path = [w.to]; G.Tactics.walk(e, path, 3.2, dt); if (!path.length) { walks.delete(e); if (w.then) w.then(); } }
    if (die) {
      die.t += dt;
      if (die.el) { const rolling = die.t < 0.8; die.el.textContent = rolling ? 1 + Math.floor(Math.random() * 20) : die.nat; die.el.className = rolling ? 'rolling' : die.nat === 20 ? 'crit' : die.nat === 1 ? 'fumble' : ''; UI.place(die.el, die.who.x, die.who.y, 2.6); }
      if (die.t >= die.T) { const d = die; die = null; if (d.el) d.el.remove(); d.then(); }
    }
    // 시험용 차례 (?auto): 한가할 때 하나씩 — { a: 'sel', i } · { a: 'listen' } · { a: 'drop', kind, x, y } · { a: 'open', id }
    if (script.length && !busy && !intro && !opening && !die && !walks.size) {
      const s = script.shift();
      if (s.a === 'sel') { sel = live()[s.i] || sel; panel(); } else if (s.a === 'listen') doListen(); else if (s.a === 'drop') { G.Prep.drop(P, s.kind, s.x, s.y); panel(); } else if (s.a === 'open') doOpen(s.id);
    }
    if (opening && (opening.t += dt) > 1.1) { const S = G.Prep.setup(P), cb = O.onOpen, left = { ...P.items }; close(); cb(S, left); return false; }
    draw();
    return true;
  }
  // 무대 위 그림: 문 · 고른 사람 · 세울 수 있는 곳 · 놓을 자리 원 · 실루엣(엿들은 적) · 적의 상태
  function draw() {
    let out = `<path class="p-door" d="${UI.ring(O.door.x, O.door.y, 0.7)}"/>`;
    if (sel && !opening) out += `<path class="p-sel" d="${UI.ring(sel.x, sel.y, 0.55)}"/>`;
    if (mode && !busy) {
      out += `<path class="p-zone" d="${UI.ring(O.door.x, O.door.y, G.Prep.ZONE_R)}"/>`;
      if (ghost) { const ok = mode === 'stand' ? G.Prep.canStand(P, sel, ghost.x, ghost.y) : G.Prep.canDrop(P, mode, ghost.x, ghost.y); out += `<path class="p-ghost ${ok ? 'ok' : 'bad'}" d="${UI.ring(ghost.x, ghost.y, mode === 'stand' ? 0.45 : G.Ground.R[mode])}"/>`; }
    }
    for (const m of P.mons) {
      if (!m._known || m.hp <= 0) continue;
      const [X, Y] = UI.toStage(m.x, m.y);
      if (!m.spotted) out += `<g class="p-sil"><ellipse cx="${X.toFixed(1)}" cy="${(Y - 14).toFixed(1)}" rx="9" ry="13"/><circle cx="${X.toFixed(1)}" cy="${(Y - 33).toFixed(1)}" r="6.5"/></g>`;
      out += `<text class="p-aw a-${m.aware}" x="${X.toFixed(1)}" y="${(Y - 46).toFixed(1)}">${AW[m.aware] || ''}</text>`;
    }
    UI.svg('prepsvg', 3).innerHTML = out;
  }
  return { open, frame, get active() { return !!P; } };
})();
