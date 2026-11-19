'use strict';
// 쿼터뷰 전투 (화면 쪽): 옛 SRD 턴제 오토배틀(G.Turn · G.Flow)을 그 자리에서 돌리고 운명판(G.Dice)을 띄운다.
// 판정 · 규칙은 옛 엔진과 js/game에 — 여기는 전투 시계 · 플레이어 기다리기 · 운명판 창 · 작은 판뿐.
// 쓰는 쪽(탐사 crawl.js · 시험 장면)은 start(rt, opts)로 넘기고, 끝나면 opts.done(win, F)를 받는다.
const FIGHT = (() => {
  const { $, esc } = UI;
  let R = null, F = null;
  const dieFace = r => (r.special === 'death' ? '☠' : r.value) + (r.sym ? `<i class="sy s-${r.sym}">${G.Dice.SYM[r.sym].n}</i>` : '');
  // 칸 하나: 치명타 범위 · 자연 1 · 하플링 행운으로 다시 굴린 칸을 표시한다 (d = null이면 아직 모르는 칸)
  const dieHTML = (p, d, cls = '', attr = '') => (d ? `<b class="die k-${d.kind} ${G.Dice.mark(p, d) || ''}${d.lucky ? ' lucky' : ''} ${cls}" ${attr} title="${esc(G.Dice.KINDS[d.kind].n)}${d.lucky ? ' · 하플링 행운으로 다시 굴림' : ''}">${dieFace(d)}</b>` : `<b class="die roll ${cls}" ${attr}>?</b>`);
  const comboTxt = c => { const Y = G.Dice.SYM[c.s]; return `${Y.n}×${c.n} ${Y.fx}`; };

  // 전투 시작. opts = { n: 탐사의 방 노드, mod, intro: Map(사람 → 걸어갈 자리), quiet: 운명판 창 없이 알아서, log(t), done(win, F), onRound(round), purse: { gold(), pay(n) } — 다시 굴리기 값을 낼 주머니 (없으면 공짜) }
  function start(rt, opts) {
    R = rt; R.turn = null; R.phase = 'explore'; G.S.w.fantasy.town = false;
    G.Dice.party = () => R.party.filter(p => !p.dead && p.hp > 0); G.Dice.cur = () => R.turn?.cur || null; G.Dice.end();
    F = { log: () => {}, done: () => {}, purse: { gold: () => Infinity, pay: () => {} }, ...opts, acc: 0, round: 0, cur: null, t: 0, intro: opts.intro ? { t: 0, to: opts.intro } : null };
  }
  // 매 화면 틱. 전투 중이면 true
  function frame(dt) {
    if (!F) return false;
    const T = R.turn; F.t += dt;
    // 걸어 들어오기 (그동안 전투 시계는 멈춘다)
    if (F.intro) {
      F.intro.t += dt; let left = 0;
      for (const [e, q] of F.intro.to) { const path = [q]; G.Tactics.walk(e, path, 3.2, dt); if (path.length) left++; }
      if (left && F.intro.t < 3) return true;
      G.Tactics.snap(R); F.intro = null;
    }
    // 첫 라운드에 운명판(앞 3라운드)을 굴린다 (죽음의 주사위가 있으면 맡을 사람부터). 라운드마다 맨 앞 열을 쓰고, 새 열이 굴러 들어온다
    if (T && T.round !== F.round && F.onRound) F.onRound(T.round); // 쓰는 쪽의 라운드 일 (탐사: 전투 소리 · 증원)
    if (T && T.round !== F.round) { F.round = T.round; if (!G.Dice.board && !$('dicebear')) { if (G.Dice.loadout.includes('doom') && !F.quiet) bearerPick(); else { G.Dice.newBoard(); if (F.quiet) G.Dice.board.ready = true; else boardTray(); } } }
    if ($('dicebear') || $('dicetray') || (G.Dice.board && !G.Dice.board.ready)) return true; // 플레이어를 기다린다 (전투 중 밀기 창도)
    if (T && G.Dice.board && G.Dice.st?.round !== T.round) {
      const B = G.Dice.board, old = G.Dice.st && B.base < T.round ? B.cells.map(row => row[0]) : null; // 방금까지의 맨 앞 칸 (쓴 줄만 밀려 나간다 — B.fresh)
      G.Dice.useRound(T.round); const c = G.Dice.fire(); if (c) F.log(`${T.round}라운드 — ${comboTxt(c)}: ${G.Dice.SYM[c.s].txt(c.n)}`);
      if (F.quiet) roundFx(c); else stage(c, old);
    }
    if (F.stage) { stageStep(dt); return true; } // 라운드 연출 동안 전투는 멈춘다
    // 차례가 바뀌었다: 앞 사람의 내성 뒤집기를 끝내고, 즉사 면을 받은 사람이면 쓰러진다
    if (T && T.cur !== F.cur) {
      if (F.cur) G.Dice.turnEnd(F.cur); F.cur = T.cur;
      const r = T.cur && G.Dice.dieOf(T.cur);
      if (r && r.special === 'death' && !T.cur.dead) { T.cur.hp = 0; T.cur.dead = true; T.cur.dying = false; F.log(`죽음의 주사위가 ${T.cur.merc?.name || '동료'}를 데려갔다.`); G.Fantasy.refreshEnts(R); }
    }
    F.acc += dt; let n = 0; while (F.acc >= 0.1 && n++ < 4) { G.tick(0.1); F.acc -= 0.1; }
    const foes = R.mons.filter(m => m.hp > 0), ps = R.party.filter(p => !p.dead && p.hp > 0);
    document.body.dataset.fight = `${F.round}r:${foes.length}foes:${ps.length}ps`;
    if (!ps.length) end(false); else if (!foes.length || F.t > 600) end(true);
    return true;
  }
  function end(win) {
    stageEnd(); const f = F; F = null; G.Dice.end(); closeTray(); $('fatepush')?.remove(); $('fatebanners')?.remove(); R.turn = null; // 조합 효과도 여기서 끝
    document.body.dataset.fights = ((parseInt(document.body.dataset.fights, 10) || 0) + 1) + (win ? 'w' : 'l'); delete document.body.dataset.fight;
    f.done(win, f);
  }

  // ── 라운드 시작 연출: 조합이 맞으면 위쪽에 띠 · 효과를 받은 사람마다 이펙트 (기호마다 다르게), 가로줄이 새로 맞으면 금빛 띠 + 후광, 영감은 반짝임 ──
  const COMBO_FX = { atk: 'impacts/ground-slam', def: 'holy/divine-shield', arc: 'arcane/rune-circle', holy: 'holy/heal' }, ROW_FX = 'holy/halo', INSP_FX = 'pickups/collect-burst';
  const cast = (p, id) => G.fx(R, { k: 'cast', mode: 'me', id, who: p, x: p.x, y: p.y, pts: [[p.x, p.y]], t: 0.6 }); // 0.6초: 배속으로 한 화면에 여러 틱이 돌아도 그리기 전에 사라지지 않게 (재생은 한 번 — playCast)
  const chip = s => `<i class="sy s-${s}">${G.Dice.SYM[s].n}</i>`;
  function banner(html, cls = '') {
    let box = $('fatebanners'); if (!box) { box = document.createElement('div'); box.id = 'fatebanners'; $('stage').append(box); }
    const b = document.createElement('div'); b.className = 'fb ' + cls; b.innerHTML = html; box.append(b); setTimeout(() => b.remove(), 2300);
  }
  function roundFx(c, staged = false) { // staged: 조합은 라운드 연출(stage)이 보여 준다 — 띠는 한 줄 · 영감만
    const D = G.Dice, fx = D.st?.fx || {}, name = p => esc(p.merc?.name || '동료');
    if (c && staged) { for (const p of D.party()) cast(p, COMBO_FX[c.s]); }
    else if (c) { banner(`${chip(c.s).repeat(Math.min(4, c.n))} <b>${D.SYM[c.s].fx}</b> <span>${D.SYM[c.s].txt(c.n)}</span>`, `c-${c.s}${c.n >= 3 ? ' big' : ''}`); for (const p of D.party()) cast(p, COMBO_FX[c.s]); }
    const got = new Set(fx.insp || []), rowed = new Set(); // 한 줄로 얻은 영감은 한 줄 띠에 같이 적는다 (띠가 쌓이지 않게)
    for (const [p, s] of fx.rowsNew || []) { rowed.add(p); banner(`${chip(s).repeat(3)} <b>${name(p)} — 한 줄!</b> <span>${D.rowTxt(s)}${got.has(p) ? ' · ✦ 영감' : ''}</span>`, 'row'); cast(p, ROW_FX); }
    for (const p of got) { if (!rowed.has(p)) banner(`✦ <b>영웅적 영감</b> <span>${name(p)}</span>`, 'insp'); cast(p, INSP_FX); }
  }
  // ── 라운드 연출 (슬롯 한 번 돌리듯): 쓴 열이 밀려 나가고 새 열이 굴러 들어온다 → 이번 열이 켜지고 조합이 맞은 칸이 빛난다 → 주사위가 각자의 카드로 날아간다 ──
  // 시각만 — 규칙(useRound · fire)은 이미 끝났다. 시간은 전투 시계(dt × 배속)로 센다
  function stage(c, old) {
    const D = G.Dice, B = D.board, alive = new Set(D.party()), el = document.createElement('div'); el.id = 'fatestage';
    const adv = r => !!old && B.fresh?.has(r), any = !!old && B.rows.some((p, r) => adv(r)); // 주사위를 쓴 줄만 당겨지고 끝 칸이 새로 굴러 들어온다
    el.innerHTML = `<div class="fs-hd">${B.base}라운드${old ? `<small>${any ? '쓴 주사위만 빠지고, 그 줄 끝에 새 주사위가 굴러 들어온다' : '아무도 주사위를 쓰지 않았다 — 그대로'}</small>` : ''}</div><div class="fs-row fs-cols"><span></span><span>지금</span><span>다음</span><span>그다음</span></div>` +
      B.rows.map((p, r) => `<div class="fs-row${alive.has(p) ? '' : ' dead'}${adv(r) ? ' adv' : ''}" data-r="${r}"><span class="fs-n">${esc(p.merc?.name || '동료')}${old && !adv(r) && alive.has(p) ? '<small>안 썼다</small>' : ''}</span>` +
      `${adv(r) ? `<span class="fs-cell out">${dieHTML(p, old[r])}</span>` : ''}${B.cells[r].map((d, k) => `<span class="fs-cell c${k}">${adv(r) && k === 2 ? '<b class="die spin">?</b>' : dieHTML(p, d)}</span>`).join('')}</div>`).join('') + '<div class="fs-cb"></div>';
    $('stage').append(el); document.body.dataset.fstage = '1';
    F.stage = { el, c, t: 0, ph: any ? 0 : 1, at: !old ? [0, 0.2, 1.1, 1.5] : !any ? [0, 0.35, 0.9, 1.2] : !c ? [0.7, 0.95, 1.4, 1.7] : [0.7, 1.0, 1.9, 2.3] }; // 조합이 없는 라운드는 짧게
  }
  function stageStep(dt) {
    const S = F.stage, D = G.Dice, B = D.board, el = S.el; S.t += dt * G.Turn.speed(G.S.w.fantasy);
    if (S.ph === 0) { for (const d of el.querySelectorAll('.die.spin')) d.textContent = 1 + Math.floor(Math.random() * 20); }
    if (S.ph === 0 && S.t >= S.at[0]) { S.ph = 1; B.rows.forEach((p, r) => { const cell = el.querySelector(`.fs-row.adv[data-r="${r}"] .c2`); if (cell) cell.innerHTML = dieHTML(p, B.cells[r][2], 'land') + '<i class="fs-new">새로</i>'; }); } // 새 주사위가 멈춘다 (당겨진 줄만)
    if (S.ph === 1 && S.t >= S.at[1]) { S.ph = 2; el.classList.add('use'); const c = S.c, alive = new Set(D.party()); // 이번 열이 켜진다: 위에서 아래로 하나씩, 조합이 맞은 칸은 그 빛으로
      B.rows.forEach((p, r) => { const d = el.querySelector(`.fs-row[data-r="${r}"] .c0 .die`); if (!d) return; d.style.animationDelay = `${r * 0.09}s`; d.classList.add('pop'); if (c && alive.has(p) && D.inCombo(B.cells[r][0], c.s)) d.classList.add('hit', 'h-' + c.s); });
      const cb = el.querySelector('.fs-cb'); if (c) { cb.innerHTML = `<b class="h-${c.s}">${comboTxt(c)}</b> <span>${esc(D.SYM[c.s].txt(c.n))}</span>`; el.classList.add('win', 'w-' + c.s); } else cb.innerHTML = '<span>조합 없음</span>';
      roundFx(c, true); }
    if (S.ph === 2 && S.t >= S.at[2]) { S.ph = 3; el.classList.add('deal'); // 주사위가 각자의 카드로
      B.rows.forEach((p, r) => { const d = el.querySelector(`.fs-row[data-r="${r}"] .c0 .die`), to = $('hud')?.querySelector(`.pm[data-i="${R.party.indexOf(p)}"]`); if (!d || !to || p.dead) return;
        const a = d.getBoundingClientRect(), b = to.getBoundingClientRect(); d.style.animation = 'none'; d.style.transition = 'transform .32s cubic-bezier(.5,0,.8,.4), opacity .32s'; d.style.transform = `translate(${b.right - 22 - a.left - a.width / 2}px, ${b.top + 12 - a.top - a.height / 2}px) scale(.6)`; d.style.opacity = '.2'; }); }
    if (S.t >= S.at[3]) stageEnd();
  }
  function stageEnd() { if (F?.stage) { F.stage.el.remove(); F.stage = null; } $('fatestage')?.remove(); delete document.body.dataset.fstage; }
  // ── 죽음의 주사위를 맡을 사람 (판을 굴리기 전에) ──
  function bearerPick() {
    const ps = G.Dice.party(), sug = G.Dice.suggestBearer(), box = document.createElement('div'); box.id = 'dicebear';
    box.innerHTML = '<h4>죽음의 주사위를 누가 맡나</h4><p>20 · 20 · 20 · 20 · 즉사 — 즉사가 나오면 맡은 사람이 쓰러진다.</p>' + ps.map((p, i) => `<button data-i="${i}" class="${p === sug ? 'sug' : ''}">${esc(p.merc?.name || '동료')}${p === sug ? ' <small>추천</small>' : ''}</button>`).join('');
    box.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; G.Dice.bearer = ps[+b.dataset.i]; box.remove(); G.Dice.newBoard(); boardTray(); };
    $('stage').append(box);
  }
  // ── 운명판 창 ──
  // 전투 시작(view = false): 열이 하나씩 굴러 멈춘다 → 칸을 골라 다시 굴리기(한 번) · 라운드 이름 둘을 눌러 순서 바꾸기 · 시작
  // 전투 중(view = true, 「운명판」 단추): 전투가 멈추고 판을 본다 — 밀기(한 번): 한 사람의 다음 칸을 버리고 당긴다(끝자리는 새로 굴러 들어온다)
  // 둘 다: ✦ 영웅적 영감이 있는 사람은 자기 칸 하나를 다시 굴릴 수 있다 (✦ → 칸)
  function closeTray() { const t = $('dicetray'); if (t) t.remove(); }
  function boardTray(view = false) {
    closeTray(); const B = G.Dice.board, D = G.Dice, sel = new Set(), box = document.createElement('div'); box.id = 'dicetray'; box.className = 'board'; let pickCol = null, pickRow = null, pickInsp = null;
    box.onpointerup = ev => ev.stopPropagation(); // 창 위를 누른 것은 바닥 누르기가 아니다
    const name = p => esc(p.merc?.name || '동료'), cols = [0, 1, 2], now = () => performance.now();
    // 굴러가는 칸: '줄,열' → 멈출 시각. 처음에는 열이 차례로 멈추고, 한 줄의 앞 두 칸이 같은 기호면 셋째 칸은 뜸을 들인다 (슬롯의 마지막 릴)
    const spin = new Map(), landed = new Set(), rolling = (r, c) => spin.has(r + ',' + c), busy = () => spin.size > 0;
    const tease = r => { const [a, b] = B.cells[r]; return !!a?.sym && !!b?.sym && (a.sym === b.sym || a.sym === 'wild' || b.sym === 'wild'); };
    const roll = (keys, ms = 520) => { const t = now(); for (const k of keys) spin.set(k, t + ms); tick(); };
    let timer = 0;
    const tick = () => { if (timer) return; timer = setInterval(() => {
      if (!box.isConnected) { clearInterval(timer); timer = 0; return; }
      const t = now(); let stop = false; for (const [k, u] of spin) if (t >= u) { spin.delete(k); landed.add(k); stop = true; }
      if (stop) draw(); else for (const el of box.querySelectorAll('.die.roll')) el.textContent = 1 + Math.floor(Math.random() * 20);
      if (!busy()) { clearInterval(timer); timer = 0; }
    }, 70); };
    box._rv = { get on() { return !!timer; } }; // closeTray가 지운다 (시계는 창이 사라지면 스스로 멈춘다)
    const draw = () => {
      const cells = B.cells.map((row, r) => (r === pickRow ? D.pushed(row) : row)), alive = new Set(D.party());
      const colOk = c => B.rows.every((p, r) => !rolling(r, c)), rowOk = r => cols.every(c => !rolling(r, c));
      const best = cols.map(c => { if (!colOk(c)) return null; const cs = D.combos(B.rows.map((p, r) => (alive.has(p) ? cells[r][c] : null))), s = D.pickCombo(cs); return s ? cs.find(x => x.s === s) : null; });
      const cost = D.rerollCost(sel.size), gold = F.purse.gold(), push = view && D.canPush(), idle = !busy();
      box.innerHTML = `<div class="hd">운명판 <small>${pickInsp != null ? `✦ 영웅적 영감 — ${name(B.rows[pickInsp])}의 칸 하나를 골라 다시 굴린다` : view ? (push ? '밀기 ▸ 한 사람의 다음 칸을 버리고 당긴다 (끝자리는 새로 굴러 들어온다). 전투에 한 번' : '라운드가 끝날 때마다 새 열이 굴러 들어온다') : '칸 → 다시 굴리기 (첫 칸 공짜, 더 고르면 금화) · 라운드 둘 → 순서 바꾸기 · 라운드마다 새 열이 붙는다'}</small></div>` +
        `<table><tr><th></th>${cols.map(c => `<th><button class="col${pickCol === c || (view && c === 0) ? ' on' : ''}" data-c="${c}"${view || !idle ? ' disabled' : ''}>${view && c === 0 ? '지금' : `${B.base + c}라운드`}</button></th>`).join('')}</tr>` +
        B.rows.map((p, r) => { const rs = rowOk(r) ? D.rowCombo(cells[r]) : null, tags = D.tags(p).filter(x => x[0] !== '✦'), can = idle && cols.some(c => D.canInsp(r, c));
          return `<tr class="${rs ? 'rowfx' : ''}${alive.has(p) ? '' : ' dead'}"><th>${push && alive.has(p) ? `<button class="push${pickRow === r ? ' on' : ''}" data-r="${r}">${name(p)} ▸</button>` : name(p)}` +
            `${can ? `<button class="insp${pickInsp === r ? ' on' : ''}" data-ir="${r}" title="영웅적 영감: 칸 하나를 다시 굴린다">✦</button>` : ''}` +
            `${rs ? `<small>${D.SYM[rs].n} 한 줄 · ${D.rowTxt(rs)}</small>` : tags.length ? `<small class="tg">${tags.map(esc).join(' · ')}</small>` : ''}</th>` +
            `${cols.map(c => { const k = r + ',' + c, d = rolling(r, c) ? null : cells[r][c], hit = d && best[c] && alive.has(p) && D.inCombo(d, best[c].s);
              return `<td>${dieHTML(p, d, `${sel.has(k) ? 'sel' : ''}${pickInsp === r && D.canInsp(r, c) ? ' can' : ''}${landed.has(k) ? ' land' : ''}${hit ? ` hit h-${best[c].s}` : ''}${!d && c === 2 && rolling(r, c) && !rolling(r, 1) && tease(r) ? ' tease' : ''}`, `data-rc="${k}"`)}</td>`; }).join('')}</tr>`; }).join('') +
        `<tr class="cb"><th>조합</th>${cols.map(c => `<td>${!colOk(c) ? '' : best[c] ? `<b class="cbhit h-${best[c].s}">${comboTxt(best[c])}</b>` : '—'}</td>`).join('')}</tr></table>` +
        (view ? `<div class="bar">${push ? `<button class="pp"${pickRow == null ? ' disabled' : ''}>민다</button>` : ''}<button class="go">닫기</button></div>`
          : `<div class="bar"><button class="rr"${B.rerolled || !sel.size || cost > gold || !idle ? ' disabled' : ''}>다시 굴리기${cost ? ` · 금화 ${cost}${cost > gold ? ' (모자람)' : ''}` : ''}</button><button class="go">시작</button></div>`);
      landed.clear();
    };
    box.onclick = ev => {
      const t = ev.target.closest('[data-rc],[data-c],[data-r],[data-ir],.rr,.pp,.go'); if (!t || t.disabled) return;
      if (t.classList.contains('go')) { B.ready = true; closeTray(); return; }
      if (busy()) return;
      if (t.dataset.ir != null) { pickInsp = pickInsp === +t.dataset.ir ? null : +t.dataset.ir; pickRow = null; }
      else if (pickInsp != null) { if (t.dataset.rc == null) return; const [r, c] = t.dataset.rc.split(',').map(Number); if (r !== pickInsp || !D.inspReroll(r, c)) return; F.log(`영웅적 영감 — ${B.rows[r].merc?.name || '동료'}의 칸을 다시 굴렸다.`); pickInsp = null; sel.delete(r + ',' + c); roll([r + ',' + c]); }
      else if (t.dataset.r != null) pickRow = pickRow === +t.dataset.r ? null : +t.dataset.r;
      else if (t.classList.contains('pp')) { const p = B.rows[pickRow], r = pickRow; if (D.pushRow(r)) { F.log(`운명판 밀기 — ${p.merc?.name || '동료'}의 다음 칸을 버렸다.`); roll([r + ',2'], 700); } pickRow = null; }
      else if (view) return;
      else if (t.dataset.rc != null) { if (B.rerolled) return; const k = t.dataset.rc; sel.has(k) ? sel.delete(k) : sel.add(k); }
      else if (t.dataset.c != null) { const c = +t.dataset.c; if (pickCol == null) pickCol = c; else { D.swapCols(pickCol, c); pickCol = null; } }
      else if (t.classList.contains('rr')) { const keys = [...sel], res = D.rerollCells(keys.map(k => k.split(',').map(Number)), Math.random, F.purse.gold()); if (res) { if (res.cost) { F.purse.pay(res.cost); F.log(`운명판 다시 굴리기 — 금화 ${res.cost}.`); } sel.clear(); roll(keys); } }
      draw();
    };
    if (!view) { const t = now(); B.rows.forEach((p, r) => cols.forEach(c => spin.set(r + ',' + c, t + 420 * (c + 1) + (c === 2 && tease(r) ? 700 : 0)))); tick(); }
    draw(); $('stage').append(box);
  }
  // ── 차례 띠 (위): 이번 라운드의 선제권 순서 — 지금 차례는 밝게, 쓰러진 쪽은 빠진다. 그 아래 한 줄: 지금 누가 무엇을 누구에게 (굴림 · 결과) ──
  const nm = e => e.merc?.name || e.n || e.def?.n || '?';
  // 왜 그 행동인가 (한 마디): 치유 · 이점을 준 것 · 표적을 고른 까닭. 엔진이 고른 것을 결과에서 읽는다
  function why(r) {
    if (r.foe) return '';
    const cur = R.turn?.cur, tg = R.turn?.tg, t = [];
    if (/치유|치료|회복/.test(r.what || '') || (!r.tg && /회복/.test(r.res || ''))) t.push('다친 동료가 있다');
    else if (/이점/.test(r.calc || '') || /이점/.test(r.mark || '')) t.push('이점을 얻었다');
    else if (r.atk && cur && tg && tg.kind === 'mon') { const foes = R.mons.filter(m => m.hp > 0), d = o => Math.hypot(o.x - cur.x, o.y - cur.y); t.push(foes.every(o => d(tg) <= d(o) + 0.01) ? '가장 가까운 적' : foes.every(o => tg.hp <= o.hp) ? '가장 약한 적' : '닿는 적'); }
    return t.length ? `<em class="why">${esc(t[0])}</em>` : '';
  }
  function strip() {
    const T = F && R.turn; let el = $('turnstrip');
    if (!T || !T.order.length) { if (el) el.remove(); $('turnmark')?.remove(); $('turntg')?.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'turnstrip'; el.innerHTML = '<div class="ts-row"></div><div class="ts-act"></div>'; $('stage').append(el); }
    const live = T.order.map(x => x.e).filter(e => (e.kind === 'mon' ? e.hp > 0 && R.mons.includes(e) : !e.dead || e.dying)), roll = R.roll, cur = T.cur;
    // 한 줄: 방금 끝난 행동(굴림 · 결과)이 지금 차례 사람의 것이면 그것을, 아니면 지금 하려는 일(대상)
    let act = '';
    if (roll && F.rollId !== roll.id && roll.who) { F.rollId = roll.id; F.act = { who: roll.who, foe: !!roll.foe, what: roll.what || '공격', t: F.t, html: why(roll) + `<b>${esc(roll.who)}</b> ${esc(roll.what || '공격')}${roll.tg ? ` → <b>${esc(roll.tg)}</b>` : ''}${roll.word ? ` · <i class="${roll.ok ? 'ok' : 'no'}">${esc(roll.word)}</i>` : ''}${roll.atk && roll.nat ? ` <small>d20 ${roll.nat} ${esc(roll.calc || '')}</small>` : roll.calc ? ` <small>${esc(roll.calc)}</small>` : ''}${roll.res ? ` · ${esc(roll.res)}` : ''}` }; }
    if (cur && F.act && F.act.who === nm(cur) && T.ph === 'wait') act = F.act.html;
    else if (cur && (T.ph === 'move' || T.ph === 'pre' || T.ph === 'show') && T.tg) act = `<b>${esc(nm(cur))}</b> → <b>${esc(nm(T.tg))}</b> <small>다가가 친다</small>`;
    else if (F.act) act = F.act.html;
    // 머리 위 표시: 지금 행동하는 사람(우리 = 금색 ▼, 적 = 붉은 ▼)과 그 대상(◎)
    { const foe = cur?.kind === 'mon', tg = cur && (T.ph === 'move' || T.ph === 'pre' || T.ph === 'show') ? T.tg : null;
      let a = $('turnmark'), b = $('turntg'); if (!a) { a = document.createElement('div'); a.id = 'turnmark'; a.textContent = '▼'; b = document.createElement('div'); b.id = 'turntg'; b.textContent = '◎'; $('floats').append(a, b); }
      a.textContent = cur && F.act && F.act.who === nm(cur) && F.t - F.act.t < 1.6 ? `${F.act.what}` : '▼'; // 방금 쓴 기술의 이름을 머리 위에
      a.className = (foe ? 'foe' : '') + (a.textContent === '▼' ? '' : ' say'); a.style.display = cur ? '' : 'none'; if (cur) UI.place(a, cur._dx ?? cur.x, cur._dy ?? cur.y, 2.5);
      b.className = foe ? 'foe' : ''; b.style.display = tg ? '' : 'none'; if (tg) UI.place(b, tg._dx ?? tg.x, tg._dy ?? tg.y, 1.2); }
    const side = cur ? (cur.kind === 'mon' ? '적의 차례' : '우리 차례') : '';
    const k = `${T.round}|${side}|${live.map(e => (e === cur ? '*' : '') + nm(e) + (e.dying ? '!' : '')).join(',')}|${act}`;
    if (el.dataset.k === k) return; el.dataset.k = k;
    el.firstChild.innerHTML = `<span class="ts-rd">${T.round}라운드</span>${side ? `<span class="ts-side${cur.kind === 'mon' ? ' foe' : ''}">${side}</span>` : ''}` + live.map(e => { const c = e.merc ? G.Guild.def(e.merc) : null;
      return `<span class="ts-c${e === cur ? ' cur' : ''}${e.kind === 'mon' ? ' foe' : ''}${e.dying ? ' down' : ''}"><i style="background:${c?.col || (e.kind === 'mon' ? '#b0483c' : '#888')}">${esc((c?.n || nm(e)).slice(0, 1))}</i>${esc(nm(e))}</span>`; }).join('<s>›</s>');
    el.lastChild.innerHTML = act; el.lastChild.className = 'ts-act' + (F.act?.foe && act === F.act.html ? ' foe' : '');
    el.querySelector('.ts-c.cur')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  // ── 싸우는 동안 작은 운명판 (왼쪽 아래): 맨 앞 열이 이번 라운드(쓴 칸은 흐리게), 새로 굴러 들어온 끝 열은 잠깐 구른다 ──
  function hud() {
    const B = G.Dice.board, S = G.Dice.st, D = G.Dice; let el = $('fatehud');
    pushBtn(); strip();
    if (!B || !B.ready || !F) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'fatehud'; el.onpointerup = ev => ev.stopPropagation(); el.onclick = () => { if (F && !F.quiet && !$('dicetray')) boardTray(true); }; $('stage').append(el); }
    const cs = S ? D.combos().find(x => x.s === S.combo) : null, bon = B.rows.map(p => D.bonus(p).join(''));
    const k = `${B.base}|${S ? S.used.size : 0}|${S?.combo}|${B.rows.filter(p => p.dead).length}|${B.pushes || 0}|${bon}|${B.rows.map(p => +D.insp(p)).join('')}|${B.cells.map(row => row.map(d => d.value).join()).join(';')}`;
    if (el.dataset.k === k) return; const fresh = el.dataset.base && +el.dataset.base !== B.base && B.base > 1; el.dataset.k = k; el.dataset.base = B.base;
    el.innerHTML = `<table>${B.rows.map((p, r) => `<tr class="${p.dead ? 'dead' : ''}${S?.rows?.has(p) ? ' rowfx' : ''}"><th>${D.insp(p) ? '<i class="ins">✦</i>' : ''}${esc(p.merc?.name || '동료')}</th>${B.cells[r].map((d, c) => `<td class="${c === 0 ? 'now' : ''}${c === 0 && S && S.used.has(p) ? ' used' : ''}${fresh && c === 2 && B.fresh?.has(r) ? ' new' : ''}">${dieHTML(p, d, c === 0 && cs && !p.dead && D.inCombo(d, cs.s) ? `hit h-${cs.s}` : '')}${c === 0 && bon[r] ? `<i class="bn">${bon[r]}</i>` : ''}</td>`).join('')}</tr>`).join('')}</table>` +
      `<div class="cb">${S ? `${S.round}라운드` : ''}${cs ? ` · ${comboTxt(cs)}` : ''}</div>`;
  }
  // 전투 중 「운명판」 단추 (오른쪽 아래): 누르면 전투가 멈추고 판이 열린다 — 앞으로 올 열을 보고, 밀기(한 번) · 영감을 쓴다
  function pushBtn() {
    let b = $('fatepush'); const B = G.Dice.board, on = !!F && !F.quiet && !!B && B.ready && !$('dicetray');
    if (!on) { if (b) b.remove(); return; }
    const txt = `운명판${G.Dice.canPush() ? ' · 밀기' : ''}${B.rows.some(p => G.Dice.insp(p) && !p.dead) ? ' ✦' : ''}`;
    if (!b) { b = document.createElement('button'); b.id = 'fatepush'; b.title = '운명판을 본다 (전투가 멈춘다)'; b.onpointerup = ev => ev.stopPropagation(); b.onclick = () => { b.remove(); boardTray(true); }; $('stage').append(b); }
    if (b.textContent !== txt) b.textContent = txt;
  }
  // ── 원정 전: 특수 주사위 고르기 (2개까지). ?dice=gamble,doom 이면 창 없이 그대로, ?auto면 건너뛴다 ──
  function dicePick(open = null, need = {}) { // open: 소문으로 열린 특수 주사위 (null이면 모두) · need: 잠긴 것이 열리는 소문
    if (q.get('dice') != null) { G.Dice.loadout = q.get('dice').split(',').filter(k => G.Dice.SPECIAL.includes(k)).slice(0, 2); return; }
    if (q.get('auto')) return;
    const box = document.createElement('div'), sel = []; box.id = 'dicepick';
    const SP = G.Dice.SPECIAL, faces = k => (G.Dice.KINDS[k].faces ? G.Dice.KINDS[k].faces.map(f => (f === 'death' ? '☠' : f)).join(' · ') : k === 'twin' ? 'd20 두 번 중 높은 쪽' : '');
    const locked = k => open && (k === 'twin' || k === 'doom') && !open.includes(k);
    const draw = () => { box.innerHTML = `<h3>특수 주사위</h3><p>둘까지 골라 간다. 전투마다 운명판의 칸 하나씩에 들어간다.</p>${SP.map(k => locked(k) ? `<button disabled><b class="die">?</b><span>잠김<small>소문 ${need[k] || '?'}에 열린다</small></span></button>` : `<button data-k="${k}" class="${sel.includes(k) ? 'on' : ''}"><b class="die k-${k}">${k === 'doom' ? '☠' : k === 'gamble' ? '20' : k === 'steady' ? '10' : '↑'}</b><span>${esc(G.Dice.KINDS[k].n)}<small>${esc(faces(k))}</small></span></button>`).join('')}<button class="go">출발${sel.length ? ` (${sel.length})` : ' (보통 주사위만)'}</button>`; };
    box.onclick = ev => { const b = ev.target.closest('button'); if (!b || b.disabled) return; if (b.classList.contains('go')) { G.Dice.loadout = sel.slice(); box.remove(); return; } const k = b.dataset.k, i = sel.indexOf(k); if (i >= 0) sel.splice(i, 1); else if (sel.length < 2) sel.push(k); draw(); };
    draw(); $('stage').append(box);
  }
  // 연계 띠: 누가 깐 것을 누가 터뜨렸나 (사건 줄의 'link' — bridge.js). 같은 차례에 같은 연계는 한 번만
  function link(e) { if (!F) return; const who = e.who.merc?.name || '동료', k = `${G.Turn.no()}|${who}|${e.set}|${e.use}`; if (F.linkK === k) return; F.linkK = k; banner(`<b>연계</b> ${esc(e.set)} → <b>${esc(e.use)}</b> <span>${esc(who)}</span>`, 'link'); }
  return { start, frame, hud, dicePick, link, get on() { return !!F; } };
})();
