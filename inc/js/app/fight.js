'use strict';
// 쿼터뷰 전투 (화면 쪽): 옛 SRD 턴제 오토배틀(G.Turn · G.Flow)을 그 자리에서 돌리고 운명판(G.Dice)을 띄운다.
// 판정 · 규칙은 옛 엔진과 js/game에 — 여기는 전투 시계 · 플레이어 기다리기 · 빙고 띠와 이펙트 · 주사위가 날아가는 연출뿐. 운명판 자체는 왼쪽 칸(js/app/side.js)이 그린다.
// 쓰는 쪽(탐사 crawl.js · 시험 장면)은 start(rt, opts)로 넘기고, 끝나면 opts.done(win, F)를 받는다.
const FIGHT = (() => {
  const { $, esc } = UI;
  let R = null, F = null;
  const dieFace = r => (r.special === 'death' ? UI.px('skull') : r.value) + (r.sym ? `<i class="sy s-${r.sym}">${G.Dice.SYM[r.sym].n}</i>` : '');
  // 칸 하나: 치명타 범위 · 자연 1 · 하플링 행운으로 다시 굴린 칸을 표시한다 (d = null이면 굴러가는 칸)
  const dieHTML = (p, d, cls = '', attr = '') => (d ? `<b class="die k-${d.kind}${G.Dice.KINDS[d.kind].sym ? ` y-${d.sym || 'none'}` : ''} ${G.Dice.mark(p, d) || ''}${d.lucky ? ' lucky' : ''} ${cls}" ${attr} title="${esc(G.Dice.KINDS[d.kind].n)}${d.lucky ? ' · 하플링 행운으로 다시 굴림' : ''}">${dieFace(d)}</b>` : `<b class="die roll ${cls}" ${attr}>?</b>`);
  const name = p => esc(p.merc?.name || '동료');
  const lineName = x => (x.t === 'r' ? `${name(x.p)} 가로줄` : `${x.c + 1}열 세로줄`) + ` · ${G.Dice.SYM[x.s].n}`;

  // 전투 시작. opts = { n: 탐사의 방 노드, mod, intro: Map(사람 → 걸어갈 자리), quiet: 운명판 연출 없이 알아서, log(t), done(win, F), onRound(round), purse: { gold(), pay(n) } — 유지비 · 다시 굴리기 값을 낼 주머니 (없으면 공짜) }
  function start(rt, opts) {
    R = rt; R.turn = null; R.phase = 'explore'; G.S.w.fantasy.town = false;
    F = { log: () => {}, done: () => {}, purse: { gold: () => Infinity, pay: () => {} }, ...opts, acc: 0, round: 0, cur: null, t: 0, intro: opts.intro ? { t: 0, to: opts.intro } : null };
    const D = G.Dice; D.party = () => R.party.filter(p => !p.dead && p.hp > 0); D.roster = () => R.party; D.cur = () => R.turn?.cur || null; D.purse = F.purse;
    D.end(); D.sync(); // 층의 운명판은 그대로 — 새 동료의 줄만 굴린다 (판이 없으면 새로)
    // 직접 조종 (G.Ctrl): 조종하는 사람이 파티에 없으면 첫째 칸 사람을. 봇 · 알아서 하는 전투(?auto · quiet)는 아무도 조종하지 않는다
    const C = G.Ctrl; if (q.get('auto') || opts.quiet) C.clear(); else if (!R.party.some(p => C.hand.has(p.merc?.uid))) C.only(R.party[0]?.merc);
  }
  // ── 직접 조종 (G.Ctrl): 조종하는 사람의 차례면 아래 막대(눈 · 이동력 · 기술 · 차례 끝 · 자동)와 갈 수 있는 칸을 보인다. 바닥을 누르면 걷고, 적을 누르면 친다(기술을 골랐으면 그 기술로) ──
  let pickSk = null, tipK = '';
  const foeAt = (tx, ty) => R.mons.find(o => o.hp > 0 && !o.down && G.Dnd.foot(o).some(([u, v]) => u === Math.round(tx) && v === Math.round(ty)));
  const pct = p => (p == null ? '' : p >= 0.9 ? '확정' : p <= 0.1 ? '빗나감' : `${Math.round(p * 100)}%`);
  function pvTxt(v, o) { // 그 적을 누르면 일어날 일 (한 줄)
    if (pickSk) { const s = v.skills.find(q => q.k === pickSk), P = G.Ctrl.preview(G.S.w.fantasy, R, pickSk, o.e); return `${esc(s?.n || '')} → ${esc(nm(o.e))}${P?.p != null ? ` · ${P.ab ? `내성 실패 ${pct(P.p)}` : `명중 ${pct(P.p)}`}` : ''}`; }
    if (!o.can) return `${esc(nm(o.e))} · 닿지 않는다 — 다가가야 한다`;
    return `${esc(nm(o.e))} 공격 · 명중 ${pct(o.pv?.p)}${o.pv?.dmg ? ` · 예상 피해 ${Math.round(o.pv.dmg)}` : ''}`;
  }
  function ctrlBar() {
    const f = G.S.w.fantasy, v = F && !F.quiet ? G.Ctrl.view(f, R) : null; let el = $('ctrlbar');
    if (!v) { if (el) el.remove(); pickSk = null; if (R?.turn?.ph !== 'input' && R?.turn?.ov?.hand) R.turn.ov = null; return; }
    R.turn.ov = Object.assign(G.Tactics.overlay(R, v.e, v.left, G.Turn.io.reach(v.e), []), { hand: true }); // 갈 수 있는 칸 · 칠 수 있는 칸 (그리는 쪽: drawRange)
    if (pickSk && !v.skills.some(s => s.k === pickSk && s.ok)) pickSk = null;
    const d = v.die, k = `${nm(v.e)}|${d ? d.value + d.sym : '-'}|${v.left}|${v.bonusUsed}|${pickSk}|${G.Ctrl.auto}|${v.skills.map(s => s.k + s.ok + s.left).join()}|${tipK}`;
    if (!el) { el = document.createElement('div'); el.id = 'ctrlbar'; $('stage').append(el); el.onclick = ctrlClick; }
    if (el.dataset.k === k) return; el.dataset.k = k;
    el.innerHTML = `<div class="cb-who">${d ? dieHTML(v.e, d) : '<b class="die">?</b>'}<span><b>${name(v.e)}</b><small>이동 ${v.left}칸${v.bonusUsed ? ' · 추가 행동 씀' : ''}</small></span></div>`
      + `<div class="cb-sk">${v.skills.map(s => `<button data-k="${esc(s.k)}" class="${s.k === pickSk ? 'on' : ''}"${s.ok ? '' : ' disabled'}><b>${esc(s.n)}</b><small>${s.bonus ? '추가' : '행동'}${s.left != null && s.left < 20 ? ` · ${s.left}` : ''}</small></button>`).join('')}</div>`
      + `<div class="cb-btn"><button data-c="end">차례 끝</button><button data-c="auto">이번만 자동</button><button data-c="all" class="${G.Ctrl.auto ? 'on' : ''}">모두 자동</button></div>`
      + `<div class="cb-tip">${tipK || (pickSk ? '적을 누르면 그 적에게 · 기술을 한 번 더 누르면 알아서' : '바닥을 누르면 걷고 · 적을 누르면 친다')}</div>`;
  }
  function ctrlDo(c) { const r = G.Ctrl.cmd(G.S.w.fantasy, R, c); if (!r.ok) { tipK = esc(r.why); setTimeout(() => { tipK = ''; }, 1400); } else { pickSk = null; tipK = ''; } return r.ok; }
  function ctrlClick(ev) {
    ev.stopPropagation(); const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.c === 'end') return ctrlDo({ end: true });
    if (b.dataset.c === 'auto') return ctrlDo({ auto: true });
    if (b.dataset.c === 'all') { G.Ctrl.auto = !G.Ctrl.auto; if (G.Ctrl.auto && G.Ctrl.cur(R)) ctrlDo({ auto: true }); $('ctrlbar') && ($('ctrlbar').dataset.k = ''); return; }
    const sk = b.dataset.k; if (!sk) return;
    if (pickSk === sk) return ctrlDo({ sk }); // 한 번 더: 대상은 AI가 (치유 · 강화 · 범위)
    pickSk = sk;
  }
  // 게임 화면을 눌렀다 (crawl.js의 누르기가 전투 중이면 여기로): 적이면 공격 · 기술, 바닥이면 걷기
  function tap(ev) {
    if (!F || !G.Ctrl.cur(R)) return; const [tx, ty] = UI.tileAt(ev.clientX, ev.clientY), o = foeAt(tx, ty);
    if (o) return ctrlDo(pickSk ? { sk: pickSk, tg: o } : { atk: o });
    ctrlDo({ move: { x: Math.round(tx), y: Math.round(ty) } });
  }
  // 적 위에 손을 올리면 미리보기 (눈으로 맞음 · 빗나감)
  function hover(ev) {
    if (!F || !G.Ctrl.cur(R)) return; const [tx, ty] = UI.tileAt(ev.clientX, ev.clientY), o = foeAt(tx, ty), v = G.Ctrl.view(G.S.w.fantasy, R);
    const t = o && v ? pvTxt(v, v.foes.find(q => q.e === o) || { e: o, can: false }) : ''; if (t !== tipK) tipK = t;
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
    if ($('dicebear')) return true; // 플레이어를 기다린다
    // 라운드 시작: 다 쓴 줄이 넘어가고(새로 굴리거나 붙잡거나) 빙고 효과가 켜진다
    if (T && D.st?.round !== T.round) {
      D.useRound(T.round); const L = D.fire(), S = D.st;
      for (const x of D.board.turned) { if (x.kept && !F.quiet) banner(`${UI.px('gem')} <b>${name(x.p)}</b> <span>줄을 붙잡았다 · 금화 ${x.cost}</span>`, 'insp'); F.log(x.kept ? `${x.p.merc?.name || '동료'} — 운명판의 줄을 붙잡았다 (금화 ${x.cost}).` : `${x.p.merc?.name || '동료'} — 운명판의 줄을 새로 굴렸다.`); }
      for (const x of S.first ? L : S.fx.news) F.log(`운명판 — ${lineName(x).replace(/<[^>]+>/g, '')}: ${D.lineTxt(x)}`);
      F.fxWait = !F.quiet; if (F.quiet) roundFx(); else SIDE.frame(); // 새로 굴린 줄은 왼쪽 칸에서 굴러 멈춘다 — 그 뒤에 띠 · 이펙트
    }
    if (F.fxWait) { if (SIDE.busy) return true; F.fxWait = false; roundFx(); } // 줄이 구르는 동안 전투는 멈춘다
    // 차례가 바뀌었다: 즉사 면이 다음 칸인 사람이면 쓰러진다
    if (T && T.cur !== F.cur) {
      F.cur = T.cur;
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
    const f = F; F = null; G.Dice.end(); $('fatebanners')?.remove(); R.turn = null; // 빙고 효과도 여기서 끝 (판은 남는다)
    document.body.dataset.fights = ((parseInt(document.body.dataset.fights, 10) || 0) + 1) + (win ? 'w' : 'l'); delete document.body.dataset.fight;
    f.done(win, f);
  }

  // ── 빙고 연출: 줄이 맞으면 위쪽에 띠 · 효과를 받은 사람마다 이펙트 (기호마다 다르게), 가로줄은 금빛 띠 + 후광, 영감은 반짝임 ──
  // 띠는 전투의 첫 라운드에 맞아 있는 줄 모두 · 그 뒤로는 새로 맞은 줄만. 이펙트는 새로 맞은 줄에만 (판이 층 내내 남으니 전투마다 다시 터뜨리지 않는다)
  const COMBO_FX = { atk: 'impacts/ground-slam', def: 'holy/divine-shield', arc: 'arcane/rune-circle', holy: 'holy/heal' }, ROW_FX = 'holy/halo', INSP_FX = 'pickups/collect-burst';
  const cast = (p, id) => G.fx(R, { k: 'cast', mode: 'me', id, who: p, x: p.x, y: p.y, pts: [[p.x, p.y]], t: 0.6 }); // 0.6초: 배속으로 한 화면에 여러 틱이 돌아도 그리기 전에 사라지지 않게 (재생은 한 번 — playCast)
  const chip = s => `<i class="sy s-${s}">${G.Dice.SYM[s].n}</i>`;
  function banner(html, cls = '') {
    let box = $('fatebanners'); const host = $('turnstrip') || $('stage'); if (!box) { box = document.createElement('div'); box.id = 'fatebanners'; } if (box.parentNode !== host) host.append(box); // 차례 띠가 있으면 그 아래에 이어 쌓는다 (겹치지 않게)
    const b = document.createElement('div'); b.className = 'fb ' + cls; b.innerHTML = html; box.append(b); setTimeout(() => b.remove(), 2300);
  }
  // 화면 번쩍 (게임 화면 가장자리에서 그 빛깔이 한 번 스민다)
  function flash(col) { const st = $('stage'); if (!st || F?.quiet) return; const el = document.createElement('div'); el.className = 'fateflash'; el.style.setProperty('--hc', col); st.append(el); setTimeout(() => el.remove(), 800); }
  const HC = { atk: '#e0604a', def: '#4a8fd8', arc: '#a070e0', holy: '#e8c860' };
  function roundFx() {
    const D = G.Dice, S = D.st, fx = S?.fx; if (!fx || !F) return;
    const got = new Set(fx.insp), rowed = new Set(); // 가로줄로 얻은 영감은 그 띠에 같이 적는다 (띠가 쌓이지 않게)
    const done = new Set(), cast1 = (p, id) => { const k = id + '|' + R.party.indexOf(p); if (!done.has(k)) { done.add(k); cast(p, id); } }; // 같은 이펙트는 한 사람에 한 번 (같은 기호의 줄이 둘이어도)
    for (const x of S.first ? fx.lines : fx.news) {
      if (x.t === 'r') { rowed.add(x.p); banner(`${chip(x.s).repeat(D.K.COLS)} <b>${name(x.p)} — 한 줄!</b> <span>${D.rowTxt(x.s)}${got.has(x.p) ? ` · ${UI.px('spark')} 영감` : ''}</span>`, 'row'); if (x.fresh) cast(x.p, ROW_FX); }
      else { banner(`${chip(x.s).repeat(Math.min(4, x.n))} <b>${D.SYM[x.s].fx}</b> <span>${D.lineTxt(x)}</span>`, `c-${x.s}${x.n >= 3 ? ' big' : ''}`); if (x.fresh) for (const p of D.party()) cast1(p, COMBO_FX[x.s]); }
    }
    { const news = fx.news.filter(x => x.fresh); if (news.length) flash(HC[news[0].s] || '#f0c070'); if (news.length >= 2) banner(`${UI.px('star')} <b>잭팟!</b> <span>한 번에 ${news.length}줄</span>`, 'jack'); } // 새로 맞은 줄: 화면이 그 빛으로 번쩍 · 둘 이상이면 잭팟
    for (const p of got) { if (!rowed.has(p)) banner(`${UI.px('spark')} <b>영웅적 영감</b> <span>${name(p)}</span>`, 'insp'); cast(p, INSP_FX); }
  }
  // ── 죽음의 주사위를 맡을 사람 (층의 첫 전투에서) ──
  function bearerPick() {
    const ps = G.Dice.party(), sug = G.Dice.bearer || G.Dice.suggestBearer(), box = document.createElement('div'); box.id = 'dicebear';
    box.innerHTML = '<h4>죽음의 주사위를 누가 맡나</h4><p>20 · 20 · 20 · 20 · 즉사 — 즉사가 나오면 맡은 사람이 쓰러진다.</p>' + ps.map((p, i) => `<button data-i="${i}" class="${p === sug ? 'sug' : ''}">${name(p)}${p === sug ? ' <small>추천</small>' : ''}</button>`).join('');
    box.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; G.Dice.setBearer(ps[+b.dataset.i]); box.remove(); };
    $('stage').append(box);
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
    if (!el) { el = document.createElement('div'); el.id = 'turnstrip'; el.innerHTML = '<div class="ts-row"><span class="ts-rd"></span><div class="ts-q"><i class="ts-wrap" title="여기서부터 다음 라운드"></i></div></div><div class="ts-act"></div>'; el._n = new Map(); $('stage').append(el); }
    for (const [e, n] of el._n) { const cv = n.firstChild; if (!cv.dataset.ok && (e.kind === 'mon' && !MD.isMon(e) ? true : UI.face(cv, e.kind === 'mon' ? e : e.merc))) { cv.dataset.ok = '1'; if (e.kind !== 'mon' || MD.isMon(e)) n.classList.add('pic'); } } // 얼굴은 그림이 오는 대로
    const live = T.order.map(x => x.e).filter(e => (e.kind === 'mon' ? e.hp > 0 && R.mons.includes(e) : !e.dead || e.dying)), roll = R.roll, cur = T.cur;
    // 한 줄: 방금 끝난 행동(굴림 · 결과)이 지금 차례 사람의 것이면 그것을, 아니면 지금 하려는 일(대상)
    let act = '';
    if (roll && F.rollId !== roll.id && roll.who) { F.rollId = roll.id; F.act = { who: roll.who, foe: !!roll.foe, what: roll.what || '공격', t: F.t, html: why(roll) + `<b>${esc(roll.who)}</b> ${esc(roll.what || '공격')}${roll.tg ? ` → <b>${esc(roll.tg)}</b>` : ''}${roll.word ? ` · <i class="${roll.ok ? 'ok' : 'no'}">${esc(roll.word)}</i>` : ''}${roll.atk && roll.nat ? ` <small>d20 ${roll.nat} ${esc(roll.calc || '')}</small>` : roll.calc ? ` <small>${esc(roll.calc)}</small>` : ''}${roll.res ? ` · ${esc(roll.res)}` : ''}` }; }
    if (cur && F.act && F.act.who === nm(cur) && T.ph === 'wait') act = F.act.html;
    else if (cur && (T.ph === 'move' || T.ph === 'pre' || T.ph === 'show') && T.tg) act = `<b>${esc(nm(cur))}</b> → <b>${esc(nm(T.tg))}</b> <small>다가가 친다</small>`;
    else if (F.act) act = F.act.html;
    // 머리 위 표시: 지금 행동하는 사람(우리 = 금색 ▼, 적 = 붉은 ▼)과 그 대상(◎)
    { const foe = cur?.kind === 'mon', tg = cur && (T.ph === 'move' || T.ph === 'pre' || T.ph === 'show') ? T.tg : null;
      let a = $('turnmark'), b = $('turntg'); if (!a) { a = document.createElement('div'); a.id = 'turnmark'; b = document.createElement('div'); b.id = 'turntg'; b.innerHTML = UI.px('target'); $('floats').append(a, b); }
      { const say = cur && F.act && F.act.who === nm(cur) && F.t - F.act.t < 1.6 ? `${F.act.what}` : '', k = say || '▼'; if (a.dataset.k !== k) { a.dataset.k = k; if (say) a.textContent = say; else a.innerHTML = UI.px('down'); } // 방금 쓴 기술의 이름을 머리 위에 (아니면 ▼ 표시)
        a.className = (foe ? 'foe' : '') + (say ? ' say' : ''); } a.style.display = cur ? '' : 'none'; if (cur) UI.place(a, cur._dx ?? cur.x, cur._dy ?? cur.y, 2.5);
      b.className = foe ? 'foe' : ''; b.style.display = tg ? '' : 'none'; if (tg) UI.place(b, tg._dx ?? tg.x, tg._dy ?? tg.y, 1.2); }
    const big = innerWidth >= 900;
    const k = `${T.round}|${big}|${live.map(e => (e === cur ? '*' : '') + nm(e) + (e.dying ? '!' : '')).join(',')}|${act}`;
    if (el.dataset.k === k) return; el.dataset.k = k;
    // 차례 띠: 얼굴을 차례대로 — 맨 왼쪽(크게)이 지금 차례, 차례가 넘어갈 때마다 한 칸씩 왼쪽 끝으로 다가온다. 끝낸 사람은 맨 뒤로. ┆ = 여기서부터 다음 라운드
    { const ci = Math.max(0, live.indexOf(cur)), q = live.slice(ci).concat(live.slice(0, ci)), N = el._n, Q = el.querySelector('.ts-q'), wr = Q.firstChild;
      const cw = big ? 50 : 40, fw = big ? 38 : 30, gap = big ? 10 : 7, dv = ci > 0 ? (big ? 12 : 9) : 0, n1 = Math.max(1, q.length - 1);
      el.querySelector('.ts-rd').textContent = `${T.round}라운드`;
      const room = el.clientWidth - el.querySelector('.ts-rd').offsetWidth - 40 - cw - gap - dv - fw, step = Math.max(12, Math.min(fw + 4, Math.floor(room / Math.max(1, n1 - 1)))); // 많으면 겹쳐 놓는다
      for (const [e, n] of N) if (!q.includes(e)) { n.remove(); N.delete(e); }
      const wrapAt = q.length - ci; // 이 자리부터 다음 라운드
      q.forEach((e, i) => { let n = N.get(e); if (!n) { n = document.createElement('span'); n.innerHTML = `<canvas width="26" height="30"></canvas><em>${esc(nm(e).slice(0, 1))}</em>`; n.title = nm(e); Q.append(n); N.set(e, n); }
        n.className = `ts-f${n.classList.contains('pic') ? ' pic' : ''}${i === 0 ? ' cur' : ''}${e.kind === 'mon' ? ' foe' : ''}${e.dying ? ' down' : ''}`;
        n.style.left = (i === 0 ? 0 : cw + gap + (i - 1) * step + (ci > 0 && i >= wrapAt ? dv : 0)) + 'px'; n.style.zIndex = 50 - i; n.style.opacity = i === 0 ? 1 : Math.max(0.5, 1 - i * 0.07); });
      wr.style.display = ci > 0 ? '' : 'none'; wr.style.left = Math.round(wrapAt === 1 ? cw + (gap + dv) / 2 : cw + gap + (wrapAt - 1) * step + (fw - step + dv) / 2) - 1 + 'px';
      Q.style.width = (cw + gap + (n1 - 1) * step + fw + dv) + 'px'; }
    { const ac = el.querySelector('.ts-act'); ac.innerHTML = act; ac.className = 'ts-act' + (F.act?.foe && act === F.act.html ? ' foe' : ''); }
  }
  // 칸을 쓰면(G.Dice.board.uses) 왼쪽 칸의 그 자리에서 주사위가 빠져나와 그 사람 머리 위로 날아간다
  function fly(u) {
    const src = SIDE.cell(u.p, u.c), fl = $('floats'); if (!src || !fl || u.d.special) return;
    const top = u.d.value === 20, low = u.d.value === 1;
    const el = document.createElement('div'); el.className = 'fatefly' + (top ? ' jack' : low ? ' doom' : ''); el.innerHTML = dieHTML(u.p, u.d) + (u.how === 'save' ? '<i>내성</i>' : ''); fl.append(el);
    // 터지는 순간: 20을 쓰는 라운드 (전부 맞고 주사위는 모두 최대) · 1을 쓰는 라운드
    if (top) { banner(`${UI.px('star')} <b>운명의 20</b> <span>${name(u.p)} — 이번 라운드는 모두 최고의 눈</span>`, 'jack'); flash('#ffd76a'); cast(u.p, ROW_FX); }
    else if (low) banner(`<b>운명의 1</b> <span>${name(u.p)} — 이번 라운드는 모두 최악의 눈</span>`, 'doom');
    UI.place(el, u.p._dx ?? u.p.x, u.p._dy ?? u.p.y, 2.7); // 끝자리: 머리 위
    const a = src.getBoundingClientRect(), b = el.getBoundingClientRect(), die = el.firstChild;
    el.style.cssText = `position:fixed; left:${b.left}px; top:${b.top}px; transform:none;`; document.body.append(el); // 게임 화면 밖(왼쪽 칸)에서 출발하니 화면 전체 위에 띄운다
    die.style.transform = `translate(${a.left + a.width / 2 - b.left - b.width / 2}px, ${a.top + a.height / 2 - b.top - b.height / 2}px) scale(.8)`;
    requestAnimationFrame(() => { die.style.transition = 'transform .38s cubic-bezier(.3,.9,.4,1)'; die.style.transform = 'none'; });
    setTimeout(() => el.remove(), 1200);
  }
  // 매 화면: 차례 띠 · 쓴 칸의 주사위 날리기 (왼쪽 칸을 다시 그리기 전에 — 빠져나오는 자리는 지금 화면의 그 칸)
  function hud() {
    strip(); if (R) ctrlBar(); const B = G.Dice.board; if (!B) return;
    for (const u of B.uses.splice(0)) if (!(F && F.quiet) && !SIDE.busy) fly(u);
  }
  // ── 원정 전: 특수 주사위 고르기 (2개까지). ?dice=gamble,doom 이면 창 없이 그대로, ?auto면 건너뛴다. 고르면 판을 다시 굴린다 (특수 주사위가 줄에 들어간다) ──
  function dicePick(open = null, need = {}) { // open: 소문으로 열린 특수 주사위 (null이면 모두) · need: 잠긴 것이 열리는 소문
    const take = list => { G.Dice.loadout = list; if (G.Dice.board) G.Dice.newBoard(); };
    if (q.get('dice') != null) return take(q.get('dice').split(',').filter(k => G.Dice.SPECIAL.includes(k)).slice(0, 2));
    if (q.get('auto')) return;
    const box = document.createElement('div'), sel = []; box.id = 'dicepick';
    const SP = G.Dice.SPECIAL, faces = k => (G.Dice.KINDS[k].faces ? G.Dice.KINDS[k].faces.map(f => (f === 'death' ? UI.px('skull') : f)).join(' · ') : k === 'twin' ? 'd20 두 번 중 높은 쪽' : '');
    const locked = k => open && (k === 'twin' || k === 'doom') && !open.includes(k);
    const draw = () => { box.innerHTML = `<h3>특수 주사위</h3><p>둘까지 골라 간다. 운명판의 줄을 굴릴 때마다 칸 하나씩에 들어간다.</p>${SP.map(k => locked(k) ? `<button disabled><b class="die">?</b><span>잠김<small>소문 ${need[k] || '?'}에 열린다</small></span></button>` : `<button data-k="${k}" class="${sel.includes(k) ? 'on' : ''}"><b class="die k-${k}">${k === 'doom' ? '☠' : k === 'gamble' ? '20' : k === 'steady' ? '10' : '↑'}</b><span>${esc(G.Dice.KINDS[k].n)}<small>${faces(k)}</small></span></button>`).join('')}<button class="go">출발${sel.length ? ` (${sel.length})` : ' (보통 주사위만)'}</button>`; };
    box.onclick = ev => { const b = ev.target.closest('button'); if (!b || b.disabled) return; if (b.classList.contains('go')) { take(sel.slice()); box.remove(); return; } const k = b.dataset.k, i = sel.indexOf(k); if (i >= 0) sel.splice(i, 1); else if (sel.length < 2) sel.push(k); draw(); };
    draw(); $('stage').append(box);
  }
  // 연계 띠: 누가 깐 것을 누가 터뜨렸나 (사건 줄의 'link' — bridge.js). 같은 차례에 같은 연계는 한 번만
  function link(e) { if (!F) return; const who = e.who.merc?.name || '동료', k = `${G.Turn.no()}|${who}|${e.set}|${e.use}`; if (F.linkK === k) return; F.linkK = k; banner(`<b>연계</b> ${esc(e.set)} → <b>${esc(e.use)}</b> <span>${esc(who)}</span>`, 'link'); }
  return { start, frame, hud, dicePick, link, tap, hover, die: dieHTML, log: t => { if (F) F.log(t); }, get on() { return !!F; }, get quiet() { return !!(F && F.quiet); } };
})();
