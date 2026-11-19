'use strict';
// 쿼터뷰 전투 (화면 쪽): 옛 SRD 턴제 오토배틀(G.Turn · G.Flow)을 그 자리에서 돌리고 운명판(G.Dice)을 띄운다.
// 판정 · 규칙은 옛 엔진과 js/game에 — 여기는 전투 시계 · 플레이어 기다리기 · 운명판 창 · 작은 판 · 주사위가 날아가는 연출뿐.
// 쓰는 쪽(탐사 crawl.js · 시험 장면)은 start(rt, opts)로 넘기고, 끝나면 opts.done(win, F)를 받는다.
const FIGHT = (() => {
  const { $, esc } = UI;
  let R = null, F = null;
  const dieFace = r => (r.special === 'death' ? '☠' : r.value) + (r.sym ? `<i class="sy s-${r.sym}">${G.Dice.SYM[r.sym].n}</i>` : '');
  // 칸 하나: 치명타 범위 · 자연 1 · 하플링 행운으로 다시 굴린 칸을 표시한다 (d = null이면 굴러가는 칸)
  const dieHTML = (p, d, cls = '', attr = '') => (d ? `<b class="die k-${d.kind} ${G.Dice.mark(p, d) || ''}${d.lucky ? ' lucky' : ''} ${cls}" ${attr} title="${esc(G.Dice.KINDS[d.kind].n)}${d.lucky ? ' · 하플링 행운으로 다시 굴림' : ''}">${dieFace(d)}</b>` : `<b class="die roll ${cls}" ${attr}>?</b>`);
  const name = p => esc(p.merc?.name || '동료');
  // 빙고 줄에 든 칸: '줄,칸' → 기호 (rows = 판의 줄 순서)
  const lineHits = (rows, L) => { const m = new Map(), alive = new Set(G.Dice.party()); for (const x of L) { if (x.t === 'r') { const r = rows.indexOf(x.p); for (let c = 0; c < G.Dice.K.COLS; c++) m.set(r + ',' + c, x.s); } else rows.forEach((p, r) => { if (alive.has(p)) m.set(r + ',' + x.c, x.s); }); } return m; };
  const lineName = x => (x.t === 'r' ? `${name(x.p)} 가로줄` : `${x.c + 1}열 세로줄`) + ` · ${G.Dice.SYM[x.s].n}`;

  // 전투 시작. opts = { n: 탐사의 방 노드, mod, intro: Map(사람 → 걸어갈 자리), quiet: 운명판 연출 없이 알아서, log(t), done(win, F), onRound(round), purse: { gold(), pay(n) } — 유지비 · 다시 굴리기 값을 낼 주머니 (없으면 공짜) }
  function start(rt, opts) {
    R = rt; R.turn = null; R.phase = 'explore'; G.S.w.fantasy.town = false;
    F = { log: () => {}, done: () => {}, purse: { gold: () => Infinity, pay: () => {} }, ...opts, acc: 0, round: 0, cur: null, t: 0, intro: opts.intro ? { t: 0, to: opts.intro } : null };
    const D = G.Dice; D.party = () => R.party.filter(p => !p.dead && p.hp > 0); D.roster = () => R.party; D.cur = () => R.turn?.cur || null; D.purse = F.purse;
    D.end(); D.sync(); // 층의 운명판은 그대로 — 새 동료의 줄만 굴린다 (판이 없으면 새로)
  }
  // 매 화면 틱. 전투 중이면 true
  function frame(dt) {
    if (!F) return false;
    const T = R.turn, D = G.Dice; F.t += dt;
    // 걸어 들어오기 (그동안 전투 시계는 멈춘다)
    if (F.intro) {
      F.intro.t += dt; let left = 0;
      for (const [e, q] of F.intro.to) { const path = [q]; G.Tactics.walk(e, path, 3.2, dt); if (path.length) left++; }
      if (left && F.intro.t < 3) return true;
      G.Tactics.snap(R); F.intro = null;
    }
    if (T && T.round !== F.round && F.onRound) F.onRound(T.round); // 쓰는 쪽의 라운드 일 (탐사: 전투 소리 · 증원)
    if (T && T.round !== F.round) { F.round = T.round; if (D.loadout.includes('doom') && !D.board.asked && !F.quiet) { D.board.asked = true; bearerPick(); } } // 죽음의 주사위를 맡을 사람은 층에 한 번 묻는다
    if ($('dicebear') || $('dicetray')) return true; // 플레이어를 기다린다 (운명판 창을 열면 전투가 멈춘다)
    // 라운드 시작: 다 쓴 줄이 넘어가고(새로 굴리거나 붙잡거나) 빙고 효과가 켜진다. 판을 띄우는 것은 전투의 첫 라운드와 판이 바뀐 라운드뿐
    if (T && D.st?.round !== T.round) {
      D.useRound(T.round); const L = D.fire(), S = D.st;
      for (const x of D.board.turned) F.log(x.kept ? `${x.p.merc?.name || '동료'} — 운명판의 줄을 붙잡았다 (금화 ${x.cost}).` : `${x.p.merc?.name || '동료'} — 운명판의 줄을 새로 굴렸다.`);
      for (const x of S.first ? L : S.fx.news) F.log(`운명판 — ${lineName(x).replace(/<[^>]+>/g, '')}: ${D.lineTxt(x)}`);
      if (!F.quiet && (S.first || D.board.turned.length || S.fx.news.length)) stage(); else roundFx();
    }
    if (F.stage) { stageStep(dt); return true; } // 라운드 연출 동안 전투는 멈춘다
    // 차례가 바뀌었다: 앞 사람의 내성 뒤집기를 끝내고, 즉사 면이 다음 칸인 사람이면 쓰러진다
    if (T && T.cur !== F.cur) {
      if (F.cur) D.turnEnd(F.cur); F.cur = T.cur;
      const r = T.cur && D.dieOf(T.cur);
      if (r && r.special === 'death' && !T.cur.dead) { D.use(T.cur, 'death'); T.cur.hp = 0; T.cur.dead = true; T.cur.dying = false; F.log(`죽음의 주사위가 ${T.cur.merc?.name || '동료'}를 데려갔다.`); G.Fantasy.refreshEnts(R); }
    }
    F.acc += dt; let n = 0; while (F.acc >= 0.1 && n++ < 4) { G.tick(0.1); F.acc -= 0.1; }
    const foes = R.mons.filter(m => m.hp > 0), ps = R.party.filter(p => !p.dead && p.hp > 0);
    document.body.dataset.fight = `${F.round}r:${foes.length}foes:${ps.length}ps`;
    if (!ps.length) end(false); else if (!foes.length || F.t > 600) end(true);
    return true;
  }
  function end(win) {
    stageEnd(); const f = F; F = null; G.Dice.end(); closeTray(); $('fatebanners')?.remove(); R.turn = null; // 빙고 효과도 여기서 끝 (판은 남는다)
    document.body.dataset.fights = ((parseInt(document.body.dataset.fights, 10) || 0) + 1) + (win ? 'w' : 'l'); delete document.body.dataset.fight;
    f.done(win, f);
  }

  // ── 빙고 연출: 줄이 맞으면 위쪽에 띠 · 효과를 받은 사람마다 이펙트 (기호마다 다르게), 가로줄은 금빛 띠 + 후광, 영감은 반짝임 ──
  // 띠는 전투의 첫 라운드에 맞아 있는 줄 모두 · 그 뒤로는 새로 맞은 줄만. 이펙트는 새로 맞은 줄에만 (판이 층 내내 남으니 전투마다 다시 터뜨리지 않는다)
  const COMBO_FX = { atk: 'impacts/ground-slam', def: 'holy/divine-shield', arc: 'arcane/rune-circle', holy: 'holy/heal' }, ROW_FX = 'holy/halo', INSP_FX = 'pickups/collect-burst';
  const cast = (p, id) => G.fx(R, { k: 'cast', mode: 'me', id, who: p, x: p.x, y: p.y, pts: [[p.x, p.y]], t: 0.6 }); // 0.6초: 배속으로 한 화면에 여러 틱이 돌아도 그리기 전에 사라지지 않게 (재생은 한 번 — playCast)
  const chip = s => `<i class="sy s-${s}">${G.Dice.SYM[s].n}</i>`;
  function banner(html, cls = '') {
    let box = $('fatebanners'); if (!box) { box = document.createElement('div'); box.id = 'fatebanners'; $('stage').append(box); }
    const b = document.createElement('div'); b.className = 'fb ' + cls; b.innerHTML = html; box.append(b); setTimeout(() => b.remove(), 2300);
  }
  function roundFx(staged = false) { // staged: 줄은 판 연출(stage)이 보여 준다 — 띠는 영감만
    const D = G.Dice, S = D.st, fx = S?.fx; if (!fx) return;
    const got = new Set(fx.insp), rowed = new Set(); // 가로줄로 얻은 영감은 그 띠에 같이 적는다 (띠가 쌓이지 않게)
    const done = new Set(), cast1 = (p, id) => { const k = id + '|' + R.party.indexOf(p); if (!done.has(k)) { done.add(k); cast(p, id); } }; // 같은 이펙트는 한 사람에 한 번 (같은 기호의 줄이 둘이어도)
    for (const x of S.first ? fx.lines : fx.news) {
      if (x.t === 'r') { rowed.add(x.p); if (!staged) banner(`${chip(x.s).repeat(D.K.COLS)} <b>${name(x.p)} — 한 줄!</b> <span>${D.rowTxt(x.s)}${got.has(x.p) ? ' · ✦ 영감' : ''}</span>`, 'row'); if (x.fresh) cast(x.p, ROW_FX); }
      else { if (!staged) banner(`${chip(x.s).repeat(Math.min(4, x.n))} <b>${D.SYM[x.s].fx}</b> <span>${D.lineTxt(x)}</span>`, `c-${x.s}${x.n >= 3 ? ' big' : ''}`); if (x.fresh) for (const p of D.party()) cast1(p, COMBO_FX[x.s]); }
    }
    for (const p of got) { if (staged || !rowed.has(p)) banner(`✦ <b>영웅적 영감</b> <span>${name(p)}</span>`, 'insp'); cast(p, INSP_FX); }
  }
  // ── 판 연출 (슬롯 한 번 돌리듯): 판이 뜬다 → 새로 굴리는 줄이 굴러 멈춘다 → 맞은 줄이 빛난다 → 걷힌다 ──
  // 시각만 — 규칙(useRound · fire)은 이미 끝났다. 시간은 전투 시계(dt × 배속)로 센다
  function stage() {
    const D = G.Dice, B = D.board, rows = D.rows(), alive = new Set(D.party()), tv = new Map(B.turned.map(x => [x.p, x])), el = document.createElement('div'); el.id = 'fatestage';
    const spin = p => tv.has(p) && !tv.get(p).kept, any = rows.some(spin);
    el.innerHTML = `<div class="fs-hd">운명판</div>` + rows.map((p, r) => { const L = D.line(p), x = tv.get(p);
      return `<div class="fs-row${alive.has(p) ? '' : ' dead'}${spin(p) ? ' adv' : ''}" data-r="${r}"><span class="fs-n">${name(p)}${x ? `<small>${x.kept ? `붙잡았다 · 금화 ${x.cost}` : '새로 굴린다'}</small>` : ''}</span>` +
        L.cells.map((d, c) => `<span class="fs-cell c${c}${c === L.at ? ' now' : c < L.at ? ' used' : ''}">${spin(p) ? '<b class="die spin">?</b>' : dieHTML(p, d)}</span>`).join('') + '</div>'; }).join('') + '<div class="fs-cb"></div>';
    $('stage').append(el); document.body.dataset.fstage = '1';
    F.stage = { el, rows, t: 0, ph: any ? 0 : 1, at: any ? [0.7, 1.0, 2.2] : D.st.fx.lines.length ? [0, 0.25, 1.6] : [0, 0.2, 1.1] }; // 맞은 줄이 없으면 짧게
  }
  function stageStep(dt) {
    const S = F.stage, D = G.Dice, el = S.el; S.t += dt * G.Turn.speed(G.S.w.fantasy);
    if (S.ph === 0) { for (const d of el.querySelectorAll('.die.spin')) d.textContent = 1 + Math.floor(Math.random() * 20); }
    if (S.ph === 0 && S.t >= S.at[0]) { S.ph = 1; S.rows.forEach((p, r) => { const L = D.line(p); el.querySelectorAll(`.fs-row.adv[data-r="${r}"] .fs-cell`).forEach((cell, c) => { cell.innerHTML = dieHTML(p, L.cells[c], 'land'); cell.firstChild.style.animationDelay = `${c * 0.07}s`; }); }); } // 새 줄이 왼쪽부터 멈춘다
    if (S.ph === 1 && S.t >= S.at[1]) { S.ph = 2; const L = D.st.fx.lines, hits = lineHits(S.rows, L); // 맞은 줄이 빛난다
      for (const [k, s] of hits) { const [r, c] = k.split(','), d = el.querySelector(`.fs-row[data-r="${r}"] .c${c} .die`); if (d) d.classList.add('pop', 'hit', 'h-' + s); }
      const cb = el.querySelector('.fs-cb'); cb.innerHTML = L.length ? L.map(x => `<div><b class="h-${x.s}">${lineName(x)}</b> <span>${esc(D.lineTxt(x))}</span></div>`).join('') : '<span>맞은 줄 없음</span>'; if (L.length) el.classList.add('win', 'w-' + L[0].s);
      roundFx(true); }
    if (S.t >= S.at[2]) stageEnd();
  }
  function stageEnd() { if (F?.stage) { F.stage.el.remove(); F.stage = null; } $('fatestage')?.remove(); delete document.body.dataset.fstage; }
  // ── 죽음의 주사위를 맡을 사람 (층의 첫 전투에서) ──
  function bearerPick() {
    const ps = G.Dice.party(), sug = G.Dice.bearer || G.Dice.suggestBearer(), box = document.createElement('div'); box.id = 'dicebear';
    box.innerHTML = '<h4>죽음의 주사위를 누가 맡나</h4><p>20 · 20 · 20 · 20 · 즉사 — 즉사가 나오면 맡은 사람이 쓰러진다.</p>' + ps.map((p, i) => `<button data-i="${i}" class="${p === sug ? 'sug' : ''}">${name(p)}${p === sug ? ' <small>추천</small>' : ''}</button>`).join('');
    box.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; G.Dice.setBearer(ps[+b.dataset.i]); box.remove(); };
    $('stage').append(box);
  }
  // ── 운명판 창 (작은 판 · 「운명판」 단추를 누르면 — 전투 중이면 전투가 멈춘다) ──
  // 줄마다: 쓴 칸은 흐리게 · 다음에 쓸 칸은 밝은 테 · 「붙잡기」(다 쓴 뒤 유지비를 내고 한 바퀴 더). 안 쓴 칸을 누르고 「다시 굴리기」(금화) · ✦ 영웅적 영감이 있으면 자기 칸 하나를 공짜로
  function closeTray() { const t = $('dicetray'); if (t) t.remove(); }
  function boardTray() {
    closeTray(); const D = G.Dice, rows = D.rows(), cols = [...Array(D.K.COLS).keys()], box = document.createElement('div'); box.id = 'dicetray'; box.className = 'board'; let sel = null, pickInsp = null;
    const log = t => (F ? F.log(t) : 0), now = () => performance.now();
    box.onpointerup = ev => ev.stopPropagation(); // 창 위를 누른 것은 바닥 누르기가 아니다
    // 굴러가는 칸: '줄,칸' → 멈출 시각
    const spin = new Map(), landed = new Set(), rolling = k => spin.has(k), busy = () => spin.size > 0;
    let timer = 0;
    const tick = () => { if (timer) return; timer = setInterval(() => {
      if (!box.isConnected) { clearInterval(timer); timer = 0; return; }
      const t = now(); let stop = false; for (const [k, u] of spin) if (t >= u) { spin.delete(k); landed.add(k); stop = true; }
      if (stop) draw(); else for (const el of box.querySelectorAll('.die.roll')) el.textContent = 1 + Math.floor(Math.random() * 20);
      if (!busy()) { clearInterval(timer); timer = 0; }
    }, 70); };
    const roll = (k, ms = 520) => { spin.set(k, now() + ms); tick(); };
    const draw = () => {
      const alive = new Set(D.party()), L = busy() ? [] : D.bingo(), hits = lineHits(rows, L), gold = D.purse.gold(), idle = !busy(), cost = D.nextCost();
      box.innerHTML = `<div class="hd">운명판 <small>${pickInsp != null ? `✦ 영웅적 영감 — ${name(rows[pickInsp])}의 안 쓴 칸 하나를 골라 다시 굴린다` : '각자 자기 줄을 앞에서부터 쓴다 · 다 쓰면 그 줄을 새로 굴린다 · 안 쓴 칸을 눌러 다시 굴리기'}</small></div><table>` +
        rows.map((p, r) => { const Ln = D.line(p), rs = L.find(x => x.t === 'r' && x.p === p), tags = D.tags(p).filter(x => x[0] !== '✦'), can = idle && cols.some(c => D.canInsp(p, c));
          return `<tr class="${rs ? 'rowfx' : ''}${alive.has(p) ? '' : ' dead'}"><th>${name(p)}${can ? `<button class="insp${pickInsp === r ? ' on' : ''}" data-ir="${r}" title="영웅적 영감: 칸 하나를 다시 굴린다">✦</button>` : ''}` +
            `${rs ? `<small>${D.SYM[rs.s].n} 한 줄 · ${D.rowTxt(rs.s)}</small>` : tags.length ? `<small class="tg">${tags.map(esc).join(' · ')}</small>` : ''}</th>` +
            cols.map(c => { const k = r + ',' + c, d = rolling(k) ? null : Ln.cells[c], s = d && hits.get(k);
              return `<td class="${c === Ln.at ? 'now' : c < Ln.at ? 'used' : ''}">${dieHTML(p, d, `${sel === k ? 'sel' : ''}${pickInsp === r && D.canInsp(p, c) ? ' can' : ''}${landed.has(k) ? ' land' : ''}${s ? ` hit h-${s}` : ''}`, `data-rc="${k}"`)}</td>`; }).join('') +
            `<td class="hold"><button class="hb${Ln.hold ? ' on' : ''}" data-h="${r}"${alive.has(p) ? '' : ' disabled'} title="이 줄을 다 쓴 뒤 유지비를 내고 한 바퀴 더 쓴다">${Ln.hold ? '붙잡음' : '붙잡기'}<small>금화 ${D.holdCost(Ln)}</small></button></td></tr>`; }).join('') +
        `<tr class="cb"><th>세로줄</th>${cols.map(c => { const x = L.find(y => y.t === 'c' && y.c === c); return `<td>${x ? `<b class="cbhit h-${x.s}">${D.SYM[x.s].n} ${D.SYM[x.s].fx}</b>` : '—'}</td>`; }).join('')}<td></td></tr></table>` +
        `<div class="fx">${L.length ? L.map(x => `<div><b class="h-${x.s}">${lineName(x)}</b> ${esc(D.lineTxt(x))}</div>`).join('') : '<div>맞은 줄 없음 — 가로 네 칸이나 세로 한 줄이 모두 같은 기호면, 그 줄이 판에 있는 동안 효과를 받는다</div>'}</div>` +
        `<div class="bar"><button class="rr"${!sel || cost > gold || !idle ? ' disabled' : ''}>다시 굴리기${cost ? ` · 금화 ${cost}${cost > gold ? ' (모자람)' : ''}` : ' · 공짜'}</button><button class="go">닫기</button></div>`;
      landed.clear();
    };
    box.onclick = ev => {
      const t = ev.target.closest('[data-rc],[data-h],[data-ir],.rr,.go'); if (!t || t.disabled) return;
      if (t.classList.contains('go')) { closeTray(); return; }
      if (busy()) return;
      if (t.dataset.ir != null) { pickInsp = pickInsp === +t.dataset.ir ? null : +t.dataset.ir; sel = null; }
      else if (pickInsp != null) { if (t.dataset.rc == null) return; const [r, c] = t.dataset.rc.split(',').map(Number); if (r !== pickInsp || !D.inspReroll(rows[r], c)) return; log(`영웅적 영감 — ${rows[r].merc?.name || '동료'}의 칸을 다시 굴렸다.`); pickInsp = null; roll(r + ',' + c); }
      else if (t.dataset.h != null) D.setHold(rows[+t.dataset.h]);
      else if (t.dataset.rc != null) { const k = t.dataset.rc, [r, c] = k.split(',').map(Number); if (!D.canReroll(rows[r], c)) return; sel = sel === k ? null : k; }
      else if (t.classList.contains('rr')) { const [r, c] = sel.split(',').map(Number), res = D.rerollCell(rows[r], c); if (res) { log(`운명판 다시 굴리기 — ${rows[r].merc?.name || '동료'}의 칸${res.cost ? ` (금화 ${res.cost})` : ''}.`); roll(sel); } sel = null; }
      draw();
    };
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
  // ── 작은 운명판 (왼쪽 아래, 탐험 중에도): 줄마다 쓴 칸은 흐리게 · 다음에 쓸 칸은 밝게 · 맞은 줄은 그 빛으로. 누르면 운명판 창 ──
  // 칸을 쓰면(G.Dice.board.uses) 그 칸에서 주사위가 빠져나와 그 사람 머리 위로 날아간다
  const lineSeen = new Map(); // 사람 → 지난번에 그린 줄 (새로 굴린 줄은 굴러 들어온다)
  function fly(u, r) {
    const src = $('fatehud')?.querySelector(`tr:nth-child(${r + 1}) td:nth-of-type(${u.c + 1}) .die`), fl = $('floats'); if (!src || !fl || u.d.special) return;
    const el = document.createElement('div'); el.className = 'fatefly'; el.innerHTML = dieHTML(u.p, u.d) + (u.how === 'save' ? '<i>내성</i>' : ''); fl.append(el);
    UI.place(el, u.p._dx ?? u.p.x, u.p._dy ?? u.p.y, 2.7); // 끝자리: 머리 위
    const a = src.getBoundingClientRect(), die = el.firstChild, b = die.getBoundingClientRect();
    die.style.transform = `translate(${a.left + a.width / 2 - b.left - b.width / 2}px, ${a.top + a.height / 2 - b.top - b.height / 2}px) scale(.6)`;
    requestAnimationFrame(() => { die.style.transition = 'transform .34s cubic-bezier(.3,.9,.4,1)'; die.style.transform = 'none'; });
    setTimeout(() => el.remove(), 1200);
  }
  function hud() {
    const D = G.Dice, B = D.board; let el = $('fatehud');
    pushBtn(); strip();
    const rows = B ? D.rows() : [];
    if (!rows.length) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'fatehud'; el.onpointerup = ev => ev.stopPropagation(); el.onclick = () => { if (!(F && F.quiet) && !$('dicetray')) boardTray(); }; $('stage').append(el); }
    for (const u of B.uses.splice(0)) if (!(F && F.quiet) && !document.body.dataset.fstage) fly(u, rows.indexOf(u.p)); // 그리기 전에 — 빠져나오는 자리는 지금 화면의 그 칸
    const L = D.bingo(), hits = lineHits(rows, L), bon = rows.map(p => (F ? D.bonus(p).join('') : ''));
    const k = rows.map((p, r) => { const Ln = D.line(p); return `${Ln.at}${Ln.hold ? 'h' : ''}${p.dead ? 'x' : ''}${D.insp(p) ? 'i' : ''}${bon[r]}:${Ln.cells.map(d => d.value ?? '☠').join()}`; }).join(';') + '|' + L.length;
    if (el.dataset.k === k) return; el.dataset.k = k;
    el.innerHTML = `<table>${rows.map((p, r) => { const Ln = D.line(p), fresh = lineSeen.has(p) && lineSeen.get(p) !== Ln; lineSeen.set(p, Ln);
      return `<tr class="${p.dead ? 'dead' : ''}${L.some(x => x.t === 'r' && x.p === p) ? ' rowfx' : ''}"><th>${D.insp(p) ? '<i class="ins">✦</i>' : ''}${name(p)}${Ln.hold ? '<i class="hold" title="붙잡아 둔 줄">◆</i>' : ''}</th>` +
        Ln.cells.map((d, c) => { const s = hits.get(r + ',' + c); return `<td class="${c === Ln.at ? 'now' : c < Ln.at ? 'used' : ''}${fresh ? ' new' : ''}">${dieHTML(p, d, s ? `hit h-${s}` : '')}${c === Ln.at && bon[r] ? `<i class="bn">${bon[r]}</i>` : ''}</td>`; }).join('') + '</tr>'; }).join('')}</table>` +
      (L.length ? `<div class="cb">${L.map(x => `<span class="h-${x.s}">${D.SYM[x.s].n} ${x.t === 'r' ? '한 줄' : D.SYM[x.s].fx}</span>`).join(' · ')}</div>` : '');
  }
  // 「운명판」 단추 (오른쪽 아래): 누르면 판이 열린다 — 붙잡기 · 다시 굴리기 · 영감
  function pushBtn() {
    let b = $('fatepush'); const D = G.Dice, rows = D.board ? D.rows() : [], on = rows.length > 0 && !(F && F.quiet) && !$('dicetray');
    if (!on) { if (b) b.remove(); return; }
    const txt = `운명판${rows.some(p => D.insp(p) && !p.dead) ? ' ✦' : ''}`;
    if (!b) { b = document.createElement('button'); b.id = 'fatepush'; b.title = '운명판을 본다 (전투 중이면 전투가 멈춘다)'; b.onpointerup = ev => ev.stopPropagation(); b.onclick = () => { b.remove(); boardTray(); }; $('stage').append(b); }
    if (b.textContent !== txt) b.textContent = txt;
  }
  // ── 원정 전: 특수 주사위 고르기 (2개까지). ?dice=gamble,doom 이면 창 없이 그대로, ?auto면 건너뛴다. 고르면 판을 다시 굴린다 (특수 주사위가 줄에 들어간다) ──
  function dicePick(open = null, need = {}) { // open: 소문으로 열린 특수 주사위 (null이면 모두) · need: 잠긴 것이 열리는 소문
    const take = list => { G.Dice.loadout = list; if (G.Dice.board) G.Dice.newBoard(); };
    if (q.get('dice') != null) return take(q.get('dice').split(',').filter(k => G.Dice.SPECIAL.includes(k)).slice(0, 2));
    if (q.get('auto')) return;
    const box = document.createElement('div'), sel = []; box.id = 'dicepick';
    const SP = G.Dice.SPECIAL, faces = k => (G.Dice.KINDS[k].faces ? G.Dice.KINDS[k].faces.map(f => (f === 'death' ? '☠' : f)).join(' · ') : k === 'twin' ? 'd20 두 번 중 높은 쪽' : '');
    const locked = k => open && (k === 'twin' || k === 'doom') && !open.includes(k);
    const draw = () => { box.innerHTML = `<h3>특수 주사위</h3><p>둘까지 골라 간다. 운명판의 줄을 굴릴 때마다 칸 하나씩에 들어간다.</p>${SP.map(k => locked(k) ? `<button disabled><b class="die">?</b><span>잠김<small>소문 ${need[k] || '?'}에 열린다</small></span></button>` : `<button data-k="${k}" class="${sel.includes(k) ? 'on' : ''}"><b class="die k-${k}">${k === 'doom' ? '☠' : k === 'gamble' ? '20' : k === 'steady' ? '10' : '↑'}</b><span>${esc(G.Dice.KINDS[k].n)}<small>${esc(faces(k))}</small></span></button>`).join('')}<button class="go">출발${sel.length ? ` (${sel.length})` : ' (보통 주사위만)'}</button>`; };
    box.onclick = ev => { const b = ev.target.closest('button'); if (!b || b.disabled) return; if (b.classList.contains('go')) { take(sel.slice()); box.remove(); return; } const k = b.dataset.k, i = sel.indexOf(k); if (i >= 0) sel.splice(i, 1); else if (sel.length < 2) sel.push(k); draw(); };
    draw(); $('stage').append(box);
  }
  // 연계 띠: 누가 깐 것을 누가 터뜨렸나 (사건 줄의 'link' — bridge.js). 같은 차례에 같은 연계는 한 번만
  function link(e) { if (!F) return; const who = e.who.merc?.name || '동료', k = `${G.Turn.no()}|${who}|${e.set}|${e.use}`; if (F.linkK === k) return; F.linkK = k; banner(`<b>연계</b> ${esc(e.set)} → <b>${esc(e.use)}</b> <span>${esc(who)}</span>`, 'link'); }
  return { start, frame, hud, dicePick, link, board: boardTray, die: dieHTML, get on() { return !!F; } };
})();
