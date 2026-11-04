'use strict';
// 판독 패널 · 파티 패널
let last = now(), fps = 0, fN = 0, fT = now(), acc = 0, cost = 0;
const PANEL = { party: null, key: '', order: '' };
// 말풍선 (G.Banter): 대사 · 쓴 기술 이름. 인물 머리 위에 따라다닌다
const bubMap = new Map();
function drawBubbles(r) {
  const box = $('floats'), list = G.Banter.live(r) || [], seen = new Set(), rc = canvas.getBoundingClientRect(), st = $('stage').getBoundingClientRect();
  for (const b of list) {
    if (!b.e || (b.e.kind === 'mon' ? b.e.hp <= 0 : b.e.dead)) continue;
    seen.add(b);
    let el = bubMap.get(b);
    if (!el) { el = document.createElement('div'); el.className = 'bub'; el.textContent = b.s; if (b.col) el.style.color = b.col; box.append(el); bubMap.set(b, el); }
    const a = project(wx(b.e._dx ?? b.e.x), wy(b.e._dy ?? b.e.y), 4.4), x = rc.left - st.left + a.sx / W * rc.width, y = rc.top - st.top + a.sy / H * rc.height;
    el.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%)`;
  }
  for (const [b, el] of bubMap) if (!seen.has(b)) { el.remove(); bubMap.delete(b); }
}
// 쓴 기술 이름: 대사와 따로, 실제 시간으로 꼭 보여 준다 (배속과 무관 · 덮이지 않음 · 한 차례 둘이면 위로 쌓인다)
const SK_SHOW = 1700, skFloats = [];
function drawSkillNames(r) {
  const box = $('floats'), rc = canvas.getBoundingClientRect(), st = $('stage').getBoundingClientRect(), t = now();
  for (const p of r.party) if (p.skLog && p.skLog.length) {
    for (const k of p.skLog.splice(0)) {
      const D = G.D.MSKILLS[k], el = document.createElement('div'), im = document.createElement('img');
      el.className = 'skname'; im.src = `dcss/${skIcon(k)}.png`; im.alt = ''; el.append(im, document.createTextNode(D.n)); box.append(el);
      skFloats.push({ el, p, t0: t });
      const row = PANEL.party && PANEL.party.get(p)?.querySelector('.sks'), b = row && [...row.children].find(x => x.dataset.k === k);
      if (b) { b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); }
    }
  }
  const seen = new Map();
  for (let i = skFloats.length - 1; i >= 0; i--) {
    const q = skFloats[i], age = t - q.t0;
    if (age > SK_SHOW) { q.el.remove(); skFloats.splice(i, 1); continue; }
    const n = seen.get(q.p) || 0; seen.set(q.p, n + 1);
    const a = project(wx(q.p._dx ?? q.p.x), wy(q.p._dy ?? q.p.y), 4.4), x = rc.left - st.left + a.sx / W * rc.width, y = rc.top - st.top + a.sy / H * rc.height - n * 30 - Math.min(10, age / 40);
    q.el.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%)`;
    q.el.style.opacity = age > SK_SHOW - 300 ? (SK_SHOW - age) / 300 : 1;
  }
}
// 기술 줄: 아이콘 · 남은 횟수. 마우스를 올리면 자세히 (손가락은 눌러서)
const skTip = document.createElement('div'); skTip.id = 'sktip'; skTip.className = 'hidden'; document.body.append(skTip);
const SCH_IC = { fire: 's_fire_magic', cold: 's_ice_magic', lightning: 's_air_magic', thunder: 's_air_magic', acid: 's_poison_magic', poison: 's_poison_magic', necrotic: 's_necromancy', radiant: 's_invocations', psychic: 's_hexes', force: 's_conjurations', slashing: 's_long_blades', piercing: 's_bows', bludgeoning: 's_maces_flails', abjuration: 's_charms', conjuration: 's_summonings', divination: 's_spellcasting', enchantment: 's_hexes', evocation: 's_conjurations', illusion: 's_hexes', necromancy: 's_necromancy', transmutation: 's_transmutations' };
const skIcon = k => { const D = G.D.MSKILLS[k]; return G.DCSS.sk[k] || D?.ic || SCH_IC[D?.dt] || SCH_IC[D?.sch] || 's_cantrip'; };
const KIND_C = { 행동: 'act', '추가 행동': 'bonus', 반응: 'react', '늘 적용': 'pas', '소모 없음': 'free', 탐험: 'explore' };
function skShow(el, m, k) {
  const D = G.D.MSKILLS[k], S0 = G.Skill.SK[k], rs = G.Skill.resOf(k), left = rs ? G.Res.usesOf(m, rs) - (G.Res.of(m).fu[k] || 0) : null, kind = G.Skill.kindOf(k), tags = [S0?.conc ? '집중' : '', G.D.SK_RANGE[k] ? `사거리 ${G.D.SK_RANGE[k]}` : ''].filter(Boolean).join(' · ');
  skTip.textContent = '';
  const h1 = document.createElement('b'); h1.textContent = D.n; const en = document.createElement('small'); en.textContent = D.en || ''; const kd = document.createElement('span'); kd.className = 'kind k-' + KIND_C[kind]; kd.textContent = kind; const ty = document.createElement('i'); ty.textContent = tags; const d = document.createElement('p'); d.textContent = D.d; skTip.append(h1, en, kd); if (tags) skTip.append(ty); skTip.append(d);
  const lock = !G.Guild.active(m).includes(k); if (lock) { const u = document.createElement('em'); u.textContent = `Lv ${G.Guild.skLv(m.cls, k)}부터`; skTip.append(u); } else if (rs || !D.passive) { const u = document.createElement('em'); u.textContent = !rs ? '제한 없음' : f.town ? `전투당 ${G.Res.usesOf(m, rs)}번` : `이번 전투 ${left} / ${G.Res.usesOf(m, rs)}번`; skTip.append(u); }
  skTip.classList.remove('hidden');
  const a = el.getBoundingClientRect(), box = (el.closest('.pc, .cell') || el).getBoundingClientRect(), b = skTip.getBoundingClientRect(); // 카드 위로 띄워 이름 · 직업을 가리지 않는다
  skTip.style.left = Math.max(8, Math.min(innerWidth - b.width - 8, a.left + a.width / 2 - b.width / 2)) + 'px'; skTip.style.top = Math.max(8, box.top - b.height - 6) + 'px';
}
const r0party = f => [G.Guild.leader(f), ...G.Fantasy.lineup(f).map(u => G.Guild.get(f, u))].filter(Boolean);
function skillRow(m, cls = '') {
  const row = document.createElement('div'); row.className = 'sks ' + cls; row._m = m;
  const act = G.Guild.order(m, G.Guild.picks(m)), list = act.concat((m.skills || []).filter(k => !act.includes(k))).slice(0, 4); // 넷 · 쓰는 순서대로. 아직 못 쓰는 기술은 잠근 채 보여 준다
  for (const k of list) {
    const D = G.D.MSKILLS[k]; if (!D) continue;
    const b = document.createElement('i'); b.className = 'sk k-' + KIND_C[G.Skill.kindOf(k)] + (act.includes(k) ? '' : ' lock'); b.dataset.k = k; b.setAttribute('aria-label', D.n); b.tabIndex = 0;
    const im = document.createElement('img'); im.alt = ''; im.src = `dcss/${skIcon(k)}.png`; b.append(im);
    if (G.Skill.resOf(k) && act.includes(k)) { const c = document.createElement('u'); b.append(c); }
    b.onpointerenter = () => skShow(b, m, k); b.onpointerleave = () => skTip.classList.add('hidden'); b.onfocus = () => skShow(b, m, k); b.onblur = () => skTip.classList.add('hidden'); b.onclick = () => { if (cls === 'pri' && act.includes(k)) { G.Guild.first(m, k); skTip.classList.add('hidden'); briefFor = null; drawBrief(); } else skShow(b, m, k); };
    row.append(b);
  }
  return row;
}
function skillCounts(p, e) {
  const m = p.merc, row = e.querySelector('.sks'), fu = G.Res.of(m).fu; if (!row) return;
  for (const b of row.children) { const c = b.querySelector('u'); if (!c) continue; const k = b.dataset.k, n = G.Res.usesOf(m, G.Skill.resOf(k)) - (fu[k] || 0), t = String(Math.max(0, n)); if (c.textContent !== t) { c.textContent = t; b.classList.toggle('none', n <= 0); } }
}
// 원정 선택: 세력을 보고 전술을 맞춘 뒤 출발한다
let briefFor = null;
function drawBrief() {
  const el = $("brief"), show = f.town && !f.seasonEnd;
  el.classList.toggle('hidden', !show);
  $('top').classList.toggle('hidden', !!show); // 원정 선택에는 지도가 없다
  if (!show) { briefFor = null; return; }
  if (briefFor) return;
  briefFor = G.Foe.offer(3).map(k => G.Foe.brief(k, f.start || f.floor));
  let chosen = briefFor[0].key; el.textContent = '';
  const h = document.createElement('h3'); h.textContent = `원정 선택 · ${f.start || f.floor}층`; el.append(h);
  const row = document.createElement('div'); row.className = 'row'; el.append(row);
  const cards = briefFor.map(b => { const c = document.createElement('button'); c.className = 'card'; const t = document.createElement('b'); t.textContent = b.n; const r = document.createElement('small'); r.textContent = b.roles.join(' · '); c.append(t, r); if (b.terrain) { const tt = document.createElement('i'); tt.className = 'tag res'; tt.textContent = b.terrain; c.append(tt); } for (const q of b.mons) { const m = document.createElement('div'); m.className = 'mon'; const nm = document.createElement('span'); nm.textContent = q.n; m.append(nm); const res = q.notes.filter(x => x.c === 'res').map(x => x.s); if (res.length) m.title = res.join(' · '); for (const x of q.notes) { if (x.c === 'res') continue; const g = document.createElement('i'); g.className = 'tag ' + x.c; g.textContent = x.s; m.append(g); } c.append(m); } c.onclick = () => { chosen = b.key; mark(); }; row.append(c); return [c, b.key]; });
  const mark = () => { for (const [c, k] of cards) c.classList.toggle('on', k === chosen); }; mark();
  drawCrew(el);
  const go = document.createElement('button'); go.className = 'go'; go.textContent = '출발'; go.onclick = () => { f.front = chosen; G.Exp.depart(f, rt()); el.classList.add('hidden'); }; el.append(go);
  const ntc = document.createElement('small'); ntc.textContent = G.D.NOTICE + ' Compatible with fifth edition.'; ntc.style.cssText = 'display:block;margin-top:10px;opacity:.55;font-size:10px;line-height:1.35'; el.append(ntc);
}
// 진형 판 + 용병별 지시: 판에서 사람을 고르면 오른쪽에 그 사람의 지시가 나온다
function drawCrew(el) {
  skTip.classList.add('hidden');
  const T = G.Tactics, wrap = document.createElement('div'); wrap.className = 'plan'; el.append(wrap);
  const board = document.createElement('div'), side = document.createElement('div'); board.className = 'board'; side.className = 'orders'; wrap.append(board, side);
  let pick = G.Guild.leader(f);
  const mk = (tag, cls, s) => { const e = document.createElement(tag); if (cls) e.className = cls; if (s != null) e.textContent = s; return e; };
  const chip = (s, on, fn) => { const b = mk('button', 'chip' + (on ? ' on' : ''), s); b.onclick = fn; return b; };
  const draw = () => {
    const form = G.Fantasy.formation(f); board.textContent = ''; side.textContent = '';
    board.append(mk('small', 'dir', '▲ 적'));
    const grid = mk('div', 'grid'); board.append(grid);
    for (let c = 0; c < 9; c++) {
      const u = Object.keys(form).find(k => form[k] === c), m = u != null ? G.Guild.get(f, +u) : null, b = mk('button', 'cell' + (m === pick ? ' on' : ''));
      if (m) { const def = G.Guild.def(m); b.style.setProperty('--c', def.col); b.append(mk('b', '', m.name || '단장'), mk('small', '', G.Res.SPECIES[G.Res.species(m)].n + ' ' + def.n), mk('small', 'lab', T.label(m)), skillRow(m, 'mini')); }
      b.dataset.c = c;
      // 누르면 고르고, 끌어다 놓으면 자리를 옮긴다 (손가락도 같다). 빈칸을 누르면 고른 사람이 그리로 간다
      b.onpointerdown = ev => { ev.preventDefault(); addEventListener('pointerup', up => {
        const to = document.elementFromPoint(up.clientX, up.clientY)?.closest?.('.cell'), tc = to ? +to.dataset.c : c;
        if (m && tc !== c) { pick = m; G.Fantasy.setCell(f, m.uid, tc); } else if (m) pick = m; else if (tc === c) G.Fantasy.setCell(f, pick.uid, c);
        draw();
      }, { once: true }); };
      grid.append(b);
    }
    const def = G.Guild.def(pick), head = mk('h4', '', pick.name || '단장'); head.append(mk('small', '', G.Res.SPECIES[G.Res.species(pick)].n + ' ' + def.n)); side.append(head);
    side.append(mk('div', 'trait', G.Res.SPECIES[G.Res.species(pick)].d));
    side.append(mk('small', 'sk-h' + ((pick.stress || 0) >= 70 ? ' hot' : ''), `스트레스 ${Math.round(pick.stress || 0)} / 100`), mk('small', 'sk-h', '왼쪽부터 먼저 · 누르면 맨 앞으로'), skillRow(pick, 'pri'));
    { const xk = G.Pool.of(pick), all = G.Pool.can(pick); if (all.length) { const w = mk('div', 'traits'); w.append(mk('small', '', '탐험 · 하나를 고른다')); const r = document.createElement('div'); r.className = 'sks'; for (const k of all) { const D = G.D.MSKILLS[k], b = document.createElement('i'); b.className = 'sk k-explore' + (k === xk ? ' sel' : ' off'); b.dataset.k = k; b.setAttribute('aria-label', D.n); b.tabIndex = 0; const im = document.createElement('img'); im.alt = ''; im.src = `dcss/${skIcon(k)}.png`; b.append(im); b.onpointerenter = () => skShow(b, pick, k); b.onpointerleave = () => skTip.classList.add('hidden'); b.onfocus = () => skShow(b, pick, k); b.onblur = () => skTip.classList.add('hidden'); b.onclick = () => { G.Pool.set(pick, k); skTip.classList.add('hidden'); briefFor = null; drawBrief(); }; r.append(b); } w.append(r); side.append(w); } }
    { const xs = r0party(f).map(m => G.Pool.of(m)).filter(Boolean); if (xs.length) side.append(mk('small', 'sk-h', '원정대 탐험: ' + [...new Set(xs)].map(k => G.D.MSKILLS[k].n).join(' · '))); }
    { const tr = G.Guild.traits(pick); if (tr.length) { const t2 = mk('div', 'traits'); t2.append(mk('small', '', '직업 특성')); const r2 = document.createElement('div'); r2.className = 'sks'; for (const k of tr) { const b = document.createElement('i'); b.className = 'sk k-' + KIND_C[G.Skill.kindOf(k)]; b.dataset.k = k; const im = document.createElement('img'); im.alt = ''; im.src = `dcss/${skIcon(k)}.png`; b.append(im); b.onpointerenter = () => skShow(b, pick, k); b.onpointerleave = () => skTip.classList.add('hidden'); r2.append(b); } t2.append(r2); side.append(t2); } }
    side.append(mk('div', 'stance', T.stance(pick)));
    const now = T.of({ merc: pick }).target, row = mk('div', 'presets');
    for (const t of Object.keys(T.TARGET)) row.append(chip(T.TARGET[t], now === t, () => { T.setTarget(pick, t); draw(); }));
    side.append(row);
  };
  draw();
}
function ui(r) {
  const st = r.turn, $r = $('round');
  $r.textContent = f.town ? '마을' : `${f.floor}층${st ? ` · ${st.round}라운드` : ''}`;
  const inf = st && st.info, iKey = inf ? `${inf.n}|${inf.mv}|${inf.rg}` : '', iEl = $('turninfo');
  if (iEl.dataset.k !== iKey) { iEl.dataset.k = iKey; iEl.innerHTML = ''; if (inf) { const b = document.createElement('b'); b.textContent = inf.n; iEl.append(b, ` ${inf.cls} · `); const a1 = document.createElement('span'); a1.className = 'mv'; a1.textContent = `이동 ${inf.mv}`; const a2 = document.createElement('span'); a2.className = 'rg'; a2.textContent = `사거리 ${inf.rg}`; iEl.append(a1, ' · ', a2); } }
  const oKey = st ? st.order.map(x => (x.e.kind === 'mon' ? 'm' : x.e.uid || 'h')).join() + '|' + (st.cur ? st.order.findIndex(x => x.e === st.cur) : -1) : '';
  if (oKey !== PANEL.order) {
    PANEL.order = oKey; const o = $('order'); o.innerHTML = '';
    if (st) for (const x of st.order) { if (x.e.kind === 'mon' ? !r.mons.includes(x.e) : x.e.dead) continue; const i = document.createElement('i'); i.style.background = x.e.kind === 'mon' ? '#b5392b' : (x.e.merc ? G.Guild.def(x.e.merc).col : '#6f8fe8'); i.textContent = `${x.e.kind === 'mon' ? '적' : (x.e.merc ? G.Guild.def(x.e.merc).n : '단장').slice(0, 2)} ${x.init}`; if (x.e === st.cur) i.className = 'cur'; o.append(i); }
  }
  const dm = r.dm && r.dm.until > G.S.runTime && !(r.roll && !r.roll.quiet && r.roll.nat != null && dieRolling()) ? r.dm.s : ''; $('dm').classList.toggle('hidden', !dm); if ($('dm').textContent !== dm) $('dm').textContent = dm;
  // 판독 패널: 왜 굴리는지 · 몇이 나와야 하는지 → 굴림 → 결과
  const R = r.roll, rEl = $('roll'), showR = !!R && !R.quiet && (r.scene || r.rollT > G.S.runTime || (st && (R.id !== dieId || now() - dieAt < 3200)));
  rEl.classList.toggle('hidden', !showR); drawDie(showR ? R : null, now() / 1000);
  if (showR) {
    const roll = dieRolling() && R.nat != null, w = rEl.querySelector('.w'), a = rEl.querySelector('.a'), wait = roll || R.pre;
    rEl.querySelector('.h').textContent = R.why || R.what || '';
    w.textContent = wait ? (R.need != null ? `${clamp(R.need, 2, 20)} 이상` : '') : R.word || '';
    w.className = 'w ' + (wait ? 'need' : R.nat === 20 || R.nat === 1 ? 'big' : R.word ? (R.ok ? 'ok' : 'no') : '');
    a.textContent = [`${R.who}${R.tg ? ' → ' + R.tg : ''}`, wait ? '' : R.need != null ? `${clamp(R.need, 2, 20)} 이상` : R.calc, wait ? '' : R.res].filter(Boolean).join(' · ');
  }
  const A = r.ask, aEl = $('ask'); aEl.classList.toggle('hidden', !A);
  if (A) {
    if (aEl.dataset.id != A.id) { aEl.dataset.id = A.id; aEl.querySelector('h3').textContent = A.title; const o = aEl.querySelector('.opts'); o.innerHTML = ''; A.opts.forEach((p, i) => { const b = document.createElement('button'); if (i === A.def) b.className = 'def'; b.innerHTML = '<b></b><small></small>'; b.firstChild.textContent = p.label; b.lastChild.textContent = p.sub || ''; b.onclick = () => G.Story.answer(r, i); o.append(b); }); }
    aEl.querySelector('.bar').style.width = (A.t / A.max * 100) + '%';
  }
  const pKey = r.party.map(p => (p.uid || 'h') + (p.dead ? 'x' : '') + (p.dying ? 'd' : '')).join();
  if (pKey !== PANEL.key) {
    PANEL.key = pKey; const box = $('party'); box.innerHTML = ''; PANEL.party = new Map();
    for (const p of r.party) { const d = p.merc || f.leader, def = G.Guild.def(d), e = document.createElement('div'); e.className = 'pc' + (p.dead || p.dying ? ' down' : ''); e.style.setProperty('--c', def.col); e.innerHTML = `<b></b><span></span><div class="hp"><i></i></div><div class="hp st"><i></i></div><small class="stv"></small>`; e.children[0].textContent = d.name || '단장'; e.children[1].textContent = def.n + ' · ' + G.Tactics.label(d); e.append(skillRow(d)); box.append(e); PANEL.party.set(p, e); }
  }
  for (const [p, e] of PANEL.party) { if (p.merc) skillCounts(p, e); e.children[2].firstChild.style.width = clamp(p.hp / (p.max || 1), 0, 1) * 100 + '%'; { const sv = Math.round((p.merc && p.merc.stress) || 0), t = p.broke ? `무너짐 · 스트레스 ${sv}` : p.resolve ? `이를 악묾 · 스트레스 ${sv}` : `스트레스 ${sv}`; e.children[3].firstChild.style.width = clamp(sv, 0, 100) + '%'; if (e.children[4].textContent !== t) e.children[4].textContent = t; e.classList.toggle('hot', sv >= 70 || !!p.broke); } e.classList.toggle('cur', !!(st && st.cur === p)); }
}
