'use strict';
// 쿼터뷰 전투 (화면 쪽): 옛 SRD 턴제 오토배틀(G.Turn · G.Flow)을 그 자리에서 돌리고 운명판(G.Dice)을 띄운다.
// 판정 · 규칙은 옛 엔진과 js/game에 — 여기는 전투 시계 · 플레이어 기다리기 · 운명판 창 · 작은 판뿐.
// 쓰는 쪽(탐사 crawl.js · 시험 장면)은 start(rt, opts)로 넘기고, 끝나면 opts.done(win, F)를 받는다.
const FIGHT = (() => {
  const { $, esc } = UI;
  let R = null, F = null;
  const dieFace = r => (r.special === 'death' ? '☠' : r.value) + (r.sym ? `<i class="sy s-${r.sym}">${G.Dice.SYM[r.sym].n}</i>` : '');
  const comboTxt = c => { const Y = G.Dice.SYM[c.s]; return `${Y.n}×${c.n} ${Y.fx}`; };

  // 전투 시작. opts = { n: 탐사의 방 노드, mod, intro: Map(사람 → 걸어갈 자리), quiet: 운명판 창 없이 알아서, log(t), done(win, F), onRound(round) }
  function start(rt, opts) {
    R = rt; R.turn = null; R.phase = 'explore'; G.S.w.fantasy.town = false;
    G.Dice.party = () => R.party.filter(p => !p.dead && p.hp > 0); G.Dice.cur = () => R.turn?.cur || null; G.Dice.end();
    F = { log: () => {}, done: () => {}, ...opts, acc: 0, round: 0, cur: null, t: 0, intro: opts.intro ? { t: 0, to: opts.intro } : null };
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
    // 첫 라운드에 운명판을 한 번 굴린다 (죽음의 주사위가 있으면 맡을 사람부터). 라운드마다 판의 그 열을 쓴다
    if (T && T.round !== F.round && F.onRound) F.onRound(T.round); // 쓰는 쪽의 라운드 일 (탐사: 전투 소리 · 증원)
    if (T && T.round !== F.round) { F.round = T.round; if (!G.Dice.board && !$('dicebear')) { if (G.Dice.loadout.includes('doom') && !F.quiet) bearerPick(); else { G.Dice.newBoard(); if (F.quiet) G.Dice.board.ready = true; else boardTray(); } } }
    if ($('dicebear') || (G.Dice.board && !G.Dice.board.ready)) return true; // 플레이어를 기다린다
    if (T && G.Dice.board && G.Dice.st?.round !== T.round) { G.Dice.useRound(T.round); const c = G.Dice.fire(); if (c) F.log(`${T.round}라운드 — ${comboTxt(c)}: ${G.Dice.SYM[c.s].txt(c.n)}`); }
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
    const f = F; F = null; G.Dice.end(); closeTray(); R.turn = null; // 조합 효과도 여기서 끝
    document.body.dataset.fights = (+(document.body.dataset.fights || 0) + 1) + (win ? 'w' : 'l'); delete document.body.dataset.fight;
    f.done(win, f);
  }

  // ── 죽음의 주사위를 맡을 사람 (판을 굴리기 전에) ──
  function bearerPick() {
    const ps = G.Dice.party(), sug = G.Dice.suggestBearer(), box = document.createElement('div'); box.id = 'dicebear';
    box.innerHTML = '<h4>죽음의 주사위를 누가 맡나</h4><p>20 · 20 · 20 · 20 · 즉사 — 즉사가 나오면 맡은 사람이 쓰러진다.</p>' + ps.map((p, i) => `<button data-i="${i}" class="${p === sug ? 'sug' : ''}">${esc(p.merc?.name || '동료')}${p === sug ? ' <small>추천</small>' : ''}</button>`).join('');
    box.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; G.Dice.bearer = ps[+b.dataset.i]; box.remove(); G.Dice.newBoard(); boardTray(); };
    $('stage').append(box);
  }
  // ── 운명판 창 (전투 시작에 한 번): 칸을 골라 다시 굴리기(한 번) · 라운드 이름 둘을 눌러 순서 바꾸기 · 시작 ──
  function closeTray() { const t = $('dicetray'); if (t) t.remove(); }
  function boardTray() {
    closeTray(); const B = G.Dice.board, sel = new Set(), box = document.createElement('div'); box.id = 'dicetray'; box.className = 'board'; let pickCol = null;
    const draw = () => {
      const cols = [0, 1, 2], pick = c => { const cs = G.Dice.combos(G.Dice.colDice(c)), s = G.Dice.pickCombo(cs); return s ? comboTxt(cs.find(x => x.s === s)) : '—'; };
      box.innerHTML = `<div class="hd">운명판 <small>칸을 눌러 고르기 → 다시 굴리기(한 번) · 라운드 이름 둘을 눌러 순서 바꾸기 · 4라운드부터 처음 열부터 되풀이</small></div>` +
        `<table><tr><th></th>${cols.map(c => `<th><button class="col${pickCol === c ? ' on' : ''}" data-c="${c}">${c + 1}라운드</button></th>`).join('')}</tr>` +
        B.rows.map((p, r) => `<tr><th>${esc(p.merc?.name || '동료')}</th>${cols.map(c => { const d = B.cells[r][c]; return `<td><b class="die k-${d.kind}${sel.has(r + ',' + c) ? ' sel' : ''}" data-rc="${r},${c}" title="${esc(G.Dice.KINDS[d.kind].n)}">${dieFace(d)}</b></td>`; }).join('')}</tr>`).join('') +
        `<tr class="cb"><th>조합</th>${cols.map(c => `<td>${pick(c)}</td>`).join('')}</tr></table>` +
        `<div class="bar"><button class="rr"${B.rerolled || !sel.size ? ' disabled' : ''}>다시 굴리기</button><button class="go">시작</button></div>`;
    };
    box.onclick = ev => {
      const t = ev.target.closest('[data-rc],[data-c],.rr,.go'); if (!t) return;
      if (t.dataset.rc != null) { if (B.rerolled) return; const k = t.dataset.rc; sel.has(k) ? sel.delete(k) : sel.add(k); }
      else if (t.dataset.c != null) { const c = +t.dataset.c; if (pickCol == null) pickCol = c; else { G.Dice.swapCols(pickCol, c); pickCol = null; } }
      else if (t.classList.contains('rr')) { G.Dice.rerollCells([...sel].map(k => k.split(',').map(Number))); sel.clear(); }
      else if (t.classList.contains('go')) { B.ready = true; box.remove(); return; }
      draw();
    };
    draw(); $('stage').append(box);
  }
  // ── 싸우는 동안 작은 운명판 (왼쪽 아래): 이번 라운드 열을 밝히고 쓴 칸은 흐리게 ──
  function hud() {
    const B = G.Dice.board, S = G.Dice.st; let el = $('fatehud');
    if (!B || !B.ready || !F) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'fatehud'; $('stage').append(el); }
    const col = S ? S.col : -1, cs = S ? G.Dice.combos().find(x => x.s === S.combo) : null, k = `${col}|${S ? S.used.size : 0}|${S?.combo}|${B.rows.filter(p => p.dead).length}`;
    if (el.dataset.k === k) return; el.dataset.k = k;
    el.innerHTML = `<table>${B.rows.map((p, r) => `<tr class="${p.dead ? 'dead' : ''}"><th>${esc(p.merc?.name || '동료')}</th>${B.cells[r].map((d, c) => `<td class="${c === col ? 'now' : ''}${c === col && S.used.has(p) ? ' used' : ''}"><b class="die k-${d.kind}">${dieFace(d)}</b></td>`).join('')}</tr>`).join('')}</table>` +
      `<div class="cb">${S ? `${S.round}라운드 · ${col + 1}열` : ''}${cs ? ` · ${comboTxt(cs)}` : ''}</div>`;
  }
  // ── 원정 전: 특수 주사위 고르기 (2개까지). ?dice=gamble,doom 이면 창 없이 그대로, ?auto면 건너뛴다 ──
  function dicePick() {
    if (q.get('dice') != null) { G.Dice.loadout = q.get('dice').split(',').filter(k => G.Dice.SPECIAL.includes(k)).slice(0, 2); return; }
    if (q.get('auto')) return;
    const box = document.createElement('div'), sel = []; box.id = 'dicepick';
    const SP = G.Dice.SPECIAL, faces = k => (G.Dice.KINDS[k].faces ? G.Dice.KINDS[k].faces.map(f => (f === 'death' ? '☠' : f)).join(' · ') : k === 'twin' ? 'd20 두 번 중 높은 쪽' : '');
    const draw = () => { box.innerHTML = `<h3>특수 주사위</h3><p>둘까지 골라 간다. 전투마다 운명판의 칸 하나씩에 들어간다.</p>${SP.map(k => `<button data-k="${k}" class="${sel.includes(k) ? 'on' : ''}"><b class="die k-${k}">${k === 'doom' ? '☠' : k === 'gamble' ? '20' : k === 'steady' ? '10' : '↑'}</b><span>${esc(G.Dice.KINDS[k].n)}<small>${esc(faces(k))}</small></span></button>`).join('')}<button class="go">출발${sel.length ? ` (${sel.length})` : ' (보통 주사위만)'}</button>`; };
    box.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; if (b.classList.contains('go')) { G.Dice.loadout = sel.slice(); box.remove(); return; } const k = b.dataset.k, i = sel.indexOf(k); if (i >= 0) sel.splice(i, 1); else if (sel.length < 2) sel.push(k); draw(); };
    draw(); $('stage').append(box);
  }
  return { start, frame, hud, dicePick, get on() { return !!F; } };
})();
