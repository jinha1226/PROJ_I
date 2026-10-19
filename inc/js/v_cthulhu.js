'use strict';
// 크툴루 화면: 밤거리 지도 + 옆 패널(이성, 직접 긁는 복권, 상금표, 광신도·촉수)
// 은박은 캔버스다: 마우스/손가락으로 칸을 45% 넘게 긁으면 그 칸이 드러난다.
G.UI.views.cthulhu = function () {
  const c = () => G.S.w.cthulhu, C = G.Cthulhu, D = G.D.C, U = G.U;
  const SUB = 10;
  const symTile = (tier, s, cls) => (typeof s === 'number'
    ? G.T.el({ k: 'c_s' + tier, v: s }, cls, D.tickets[tier].syms[s])
    : G.T.el('c_' + s, cls, D.specials[s].e));

  const hudSan = h('b'), hudInfo = h('small');
  const hud = h('div', null, hudSan, hudInfo);

  const san = G.UI.meter('이성'), multEl = h('b');
  const tiersEl = h('div.tiers');
  const tName = h('b'), tPrice = h('small');
  const cells = Array.from({ length: 9 }, () => h('div.cell'));
  const grid = h('div.grid', null, cells);
  const foil = h('canvas.foil');
  const madEl = h('div.mad-overlay.hidden');
  const resultEl = h('div.result');
  const ticket = h('div.ticket', null, h('div.ticket-h', null, tName, tPrice), h('div.scratch', null, grid, foil, madEl), resultEl);
  const buyBtn = h('button.btn.big', { on: { click: () => { if (C.buy(c())) { newFoil(); G.SFX.play('coin'); } } } });
  const allBtn = h('button.btn', { on: { click: () => C.revealAll(c()) } }, '전부 긁기');
  const begBtn = h('button.btn', { on: { click: () => C.beg(c()) } }, '동전 줍기 +1');
  const legend = h('div.legend');
  const coinEl = h('b'), cultEl = h('small');

  const side = h('div', null,
    h('div.card', null, h('div.card-h', null, G.T.el('c_coin', 'cur'), coinEl, h('small', null, ' 동전'), h('span.sp'), cultEl), san.el,
      h('div.kv', { title: '이성이 낮을수록 커진다' }, h('span', null, G.T.el('c_coin', 'xs'), ' 당첨금'), multEl)),
    h('div.card.ticket-card', null, tiersEl, ticket, h('div.row-btns', null, buyBtn, allBtn, begBtn)),
    h('details.card', null, h('summary', null, '상금표'), legend));

  // ── 은박 ──
  const fctx = foil.getContext('2d');
  let FW = 0, scratched = [], ticketRef, tierKey = null;
  function sizeFoil() {
    const r = grid.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (!r.width) return false;
    FW = r.width;
    foil.width = FW * dpr; foil.height = FW * dpr;
    foil.style.width = foil.style.height = FW + 'px';
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }
  function paintFoil() {
    const t = c().cur, col = D.tickets[t ? t.tier : c().tier].col;
    fctx.globalCompositeOperation = 'source-over';
    fctx.clearRect(0, 0, FW, FW);
    const cw = FW / 3;
    for (let i = 0; i < 9; i++) {
      if (t && t.cells[i].rev) continue;
      const x = (i % 3) * cw, y = Math.floor(i / 3) * cw;
      const g = fctx.createLinearGradient(x, y, x + cw, y + cw);
      g.addColorStop(0, '#b9b9c6'); g.addColorStop(0.5, col); g.addColorStop(1, '#8a8a99');
      fctx.fillStyle = g;
      fctx.fillRect(x + 2, y + 2, cw - 4, cw - 4);
      fctx.fillStyle = 'rgba(255,255,255,0.25)';
      fctx.font = `${cw * 0.32}px serif`; fctx.textAlign = 'center'; fctx.textBaseline = 'middle';
      fctx.fillText('?', x + cw / 2, y + cw / 2);
    }
  }
  function newFoil() {
    const cur = c().cur;
    ticketRef = cur;
    scratched = Array.from({ length: 9 }, () => new Uint8Array(SUB * SUB));
    sizeFoil();
    paintFoil();
    resultEl.textContent = '';
    for (let i = 0; i < 9; i++) {
      const cell = cur.cells[i];
      cells[i].innerHTML = '';
      cells[i].append(symTile(cur.tier, cell.s, 'cell-tl'));
      cells[i].className = 'cell' + (typeof cell.s === 'string' ? ' sp-' + cell.s : '');
    }
  }
  const brush = () => FW * (0.07 + 0.025 * G.Tree.add('cthulhu', c().tree, 'foil'));
  let down = false;
  function scratchAt(ev) {
    const s = c(), t = s.cur;
    if (!t || t.done || s.madT > 0) return;
    const r = foil.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, rad = brush();
    fctx.globalCompositeOperation = 'destination-out';
    fctx.beginPath(); fctx.arc(x, y, rad, 0, 7); fctx.fill();
    fctx.globalCompositeOperation = 'source-over';
    G.SFX.play('scratch');
    const cw = FW / 3, step = cw / SUB;
    for (let i = 0; i < 9; i++) {
      if (t.cells[i].rev) continue;
      const cx0 = (i % 3) * cw, cy0 = Math.floor(i / 3) * cw;
      if (x + rad < cx0 || x - rad > cx0 + cw || y + rad < cy0 || y - rad > cy0 + cw) continue;
      const m = scratched[i];
      let n = 0;
      for (let a = 0; a < SUB; a++) for (let b = 0; b < SUB; b++) {
        const px = cx0 + (a + 0.5) * step, py = cy0 + (b + 0.5) * step;
        if (!m[a * SUB + b] && (px - x) ** 2 + (py - y) ** 2 <= rad * rad) m[a * SUB + b] = 1;
        n += m[a * SUB + b];
      }
      if (n >= SUB * SUB * 0.45) C.reveal(s, i);
    }
  }
  foil.addEventListener('pointerdown', e => { down = true; foil.setPointerCapture(e.pointerId); scratchAt(e); });
  foil.addEventListener('pointermove', e => { if (down) scratchAt(e); });
  foil.addEventListener('pointerup', () => { down = false; });
  foil.addEventListener('pointercancel', () => { down = false; });

  const onReveal = () => paintFoil();
  const onResult = r => {
    const pz = r.prize >= 0 ? D.prizes[r.prize].m : 0, cur = c().cur;
    resultEl.className = 'result ' + (pz >= 25 ? 'big' : pz ? 'win' : 'lose');
    resultEl.textContent = pz ? `${pz}배 당첨! +${U.fmt(r.win)}` : '꽝… 무언가 웃는 소리가 들린다';
    if (cur) cur.cells.forEach((cell, i) => tog(cells[i], 'match', cell.s === r.prize));
  };
  const onKiosk = () => { ticket.classList.remove('flash'); void ticket.offsetWidth; ticket.classList.add('flash'); };
  G.on('c_reveal', onReveal); G.on('c_result', onResult); G.on('c_mad', onReveal); G.on('c_kiosk', onKiosk);

  function renderTiers() {
    const s = c(), un = C.unlocked(), key = un + ':' + s.tier;
    if (tierKey === key) return;
    tierKey = key;
    tiersEl.innerHTML = '';
    D.tickets.forEach((t, i) => {
      if (i > un) return;
      tiersEl.append(h('button.tier' + (i === s.tier ? '.on' : ''), { style: `--tc:${t.col}`, title: `${t.n} · 동전 ${U.fmt(t.price)}`, on: { click: () => { if (!s.cur || s.cur.done) { s.tier = i; tierKey = null; } } } },
        symTile(i, 5, 'sm'), h('small', null, U.fmt(t.price))));
    });
    legend.innerHTML = '';
    D.prizes.forEach((p, i) => legend.append(h('div.lg', null, h('span', null, [0, 1, 2].map(() => symTile(s.tier, i, 'sm'))), h('b', null, `×${p.m}`))));
    Object.entries(D.specials).forEach(([k, sp]) => legend.append(h('div.lg.sp', null, symTile(s.tier, k, 'sm'), h('small', null, sp.d))));
  }

  const scr = G.UI.worldScreen('cthulhu', {
    side, hud,
    update() {
      const s = c(), rt = C.rt(s);
      renderTiers();
      if (s.cur !== ticketRef || Math.abs(grid.getBoundingClientRect().width - FW) > 1) {
        if (s.cur) newFoil();
        else { ticketRef = null; sizeFoil(); paintFoil(); cells.forEach(x => { x.innerHTML = ''; x.className = 'cell'; }); }
      }
      const T = D.tickets[s.cur ? s.cur.tier : s.tier];
      setText(tName, T.n);
      setText(tPrice, ` 동전 ${U.fmt(T.price)}`);
      ticket.style.setProperty('--tc', T.col);
      const busy = s.cur && !s.cur.done;
      setText(buyBtn, busy ? '긁는 중…' : `복권 사기 · ${U.fmt(C.price(s.tier))}`);
      buyBtn.disabled = busy || s.madT > 0 || s.coins < C.price(s.tier);
      allBtn.disabled = !busy || s.madT > 0;
      begBtn.disabled = s.madT > 0;
      tog(madEl, 'hidden', s.madT <= 0);
      if (s.madT > 0) setText(madEl, `광기 발작… ${Math.ceil(s.madT)}초`);
      const ms = C.maxSan();
      san.set(s.san / ms, `${Math.floor(s.san)} / ${ms}`);
      tog(san.bar, 'low', s.san / ms < 0.3);
      setText(multEl, `×${C.sanMult(s).toFixed(2)}`);
      setText(coinEl, U.fmt(s.coins));
      setText(cultEl, `광신도 ${rt.cultists.length} · 촉수 ${rt.horrors.length}`);
      setText(hudSan, s.madT > 0 ? `광기 ${Math.ceil(s.madT)}초` : `이성 ${Math.floor(s.san)}`);
      setText(hudInfo, ` · 당첨금 ×${C.sanMult(s).toFixed(2)}`);
    },
  });
  scr.unmount = () => {
    for (const [k, fn] of [['c_reveal', onReveal], ['c_result', onResult], ['c_mad', onReveal], ['c_kiosk', onKiosk]]) G.handlers[k] = G.handlers[k].filter(x => x !== fn);
  };
  return scr;
};
