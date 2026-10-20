'use strict';
// 무협 화면: 지역 지도가 화면 전체, 그 위에 HUD (판타지와 같은 구성 원리)
//  왼쪽 위: 지역 이름 옆에 그 지역의 역할(명성 ×n / 계열 수련 ×n / 원정) · 그 아래 경지·명성·깨달음
//  위 가운데: 나이 막대(천수까지 차오른다, 누르면 생애 계획표) + 남은 햇수, 아래 한 줄: 계열 숙련·명성·전투력·여정·깨달음 총 배율(무공·특산·트리·넥서스·유물·붕괴 모두)
//  왼쪽 가운데: 자동 단추(판타지 편성 단추 자리) → 자동 이동·수련·구입, 소속(정파·사파·마교 — 이름·옷·근거지만 다르다)
//  아래 가운데: 지위 · 무공 · 특산 — 누르면 게임 화면 위에 크게 펼쳐진다
//  오른쪽 위: 강호 지도 — 지금 지역을 밝히고, 여정 중이면 길 위에 점. 지역을 누르면 그곳에 머문다(📍), 다시 누르면 풀린다
G.UI.views.wuxia = function () {
  const w = () => G.S.w.wuxia, W = G.Wuxia, D = G.D.WX, U = G.U;
  const tm = k => G.Tree.mul('wuxia', w().tree, k), ta = k => G.Tree.add('wuxia', w().tree, k);

  // ── 왼쪽 위: 지역·활동·이득, 경지·명성·깨달음
  const hudMode = h('b'), hudRole = h('span.role');
  const res = G.UI.ov.stats([['realm', 's_naegong', '경지: 경지마다 전투력 +30%, 여정 +15%, 화경부터 천수 +4년'], ['pow', 'u_sword', '전투력'], ['gold', 'c_coin', '명성: 특산·영단 구매 포인트'], ['ins', 'ui_star', '깨달음: 스킬트리 포인트']]);
  const hud = h('div.fhud', null, h('div.floorrow', null, hudMode, hudRole), res.el);

  // ── 위 가운데: 나이 (천수까지 차오른다) + 스킬트리 배율
  const age = G.UI.ov.bar('눌러서 생애 계획표', '남은 햇수');
  const ageBox = age.el.querySelector('.php');
  ageBox.classList.add('clickable');
  ageBox.addEventListener('click', e => { e.stopPropagation(); openPanel(openK === 'plan' ? null : 'plan'); });
  const bonus = G.UI.ov.stats([['심법', 's_naegong', '심법 숙련'], ['외공', 's_geom', '외공 숙련'], ['경공', 's_gyeong', '경공 숙련'], ['잡학', 's_yangsaeng', '잡학 숙련'], ['fame', 'c_coin', '명성'], ['combat', 'u_sword', '전투력'], ['walk', 'st_haste', '여정'], ['ins', 'ui_star', '깨달음']]);
  const top = h('div.ftop', null, age.el, bonus.el);

  // ── 오른쪽 위: 강호 지도 (중국 윤곽 위에 지역). 상자는 윤곽 높이에 맞춰 자른다
  const SVGNS = 'http://www.w3.org/2000/svg', svgEl = (t, a) => { const e = document.createElementNS(SVGNS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const O = D.outline;
  const ys = O.paths.join(' ').match(/-?[\d.]+ -?[\d.]+/g).map(p => +p.split(' ')[1]);
  const y0 = Math.max(0, Math.min(...ys) - 2), y1 = Math.max(...ys) + 3;
  const jmap = svgEl('svg', { viewBox: `0 ${y0} ${O.vb[0]} ${y1 - y0}`, class: 'jmap' });
  for (const d of O.paths) jmap.append(svgEl('path', { d, class: 'jland' }));
  const yearT = [];
  for (const [a, b, yr] of D.links) {
    const A = D.regions[a].pos, B = D.regions[b].pos;
    jmap.append(svgEl('line', { x1: A[0], y1: A[1], x2: B[0], y2: B[1], class: 'jl' }));
    const t = svgEl('text', { x: (A[0] + B[0]) / 2, y: (A[1] + B[1]) / 2 - 1, class: 'jy' });
    jmap.append(t);
    yearT.push({ t, yr });
  }
  const nodes = {};
  const LAB = { up: [0, -3.6], down: [0, 6.2], right: [3.4, 1.4, 'start'], left: [-3.4, 1.4, 'end'] };
  for (const [id, R] of Object.entries(D.regions)) {
    const g = svgEl('g', { class: 'jn', transform: `translate(${R.pos[0]},${R.pos[1]})` });
    g.append(svgEl('circle', { r: 2.2 }));
    const [lx, ly, an] = LAB[R.lab || 'down'];
    const t = svgEl('text', { x: lx, y: ly, 'text-anchor': an || 'middle' }); t.textContent = R.n; g.append(t);
    const tip = svgEl('title', {}); g.append(tip); g._tip = tip;
    g.addEventListener('click', e => { e.stopPropagation(); W.goRegion(w(), id); G.SFX.play('select'); });
    jmap.append(g);
    nodes[id] = g;
  }
  const dot = svgEl('circle', { r: 1.6, class: 'jdot' });
  jmap.append(dot);
  const tripEl = h('small.jtrip');
  const jbox = h('div.jbox', null, jmap, tripEl);

  // ── 왼쪽 가운데: 자동 단추 → 자동 이동·수련·구입, 장래
  const tPromote = G.UI.toggle('이동', () => w().autoPromote, v => { w().autoPromote = v; }, '계획표대로 지역을 옮긴다');
  const tSkill = G.UI.toggle('수련', () => w().autoSkill, v => { w().autoSkill = v; }, '자동 수련: 경지가 모자라면 가장 빨리 오르는 무공을 고른다');
  const tBuy = G.UI.toggle('구입', () => w().autoBuy, v => { w().autoBuy = v; }, '자동 구입: 특산·영단');
  const pathBtns = Object.entries(D.paths).map(([k, n]) =>
    h('button.tgl.pathbtn', { 'data-k': k, on: { click: () => W.setPath(w(), k) } }, n));
  const autoPop = h('div.fpop.lpop.hidden', null,
    h('div.card-h', null, h('b', null, '자동')), h('div.tgls', null, tPromote.el, tSkill.el, tBuy.el),
    h('div.card-h', null, h('b', null, '소속'), h('small.dim', null, ' 낭인 다음 들어갈 곳 (낭인까지 바꿀 수 있다)')), h('div.tgls.paths', null, pathBtns));
  let autoOpen = false;
  const autoBtn = h('button.fbtn.pbtn', { 'data-tip': '자동 · 소속', on: { click: e => { e.stopPropagation(); autoOpen = !autoOpen; tog(autoPop, 'hidden', !autoOpen); tog(autoBtn, 'on', autoOpen); } } }, '⚙');
  const left = h('div.fleft', null, h('div.pf-top', null, autoBtn, autoPop));

  // ── 아래 가운데: 지위 · 무공 · 특산 (누르면 게임 화면 위에 크게)
  const panelBody = h('div.wpanel-b'), panelTitle = h('b');
  const panel = h('div.wpanel.hidden', null, h('div.wpanel-h', null, panelTitle, h('span.sp'), h('button.fbtn', { on: { click: () => openPanel(null) } }, '✕')), panelBody);
  let openK = null;
  const tabBtn = (k, tile, label) => {
    const n = h('b'), sub = h('small'), ic = G.T.el(tile, 'md');
    const b = h('button.wtabbtn', { on: { click: e => { e.stopPropagation(); openPanel(openK === k ? null : k); } } }, ic, h('span', null, n, sub));
    return { k, b, n, sub, ic, label };
  };
  const tabs = { rank: tabBtn('rank', 'j_jumso', '지위'), skill: tabBtn('skill', 's_tuna', '무공'), shop: tabBtn('shop', 'c_coin', '특산') };
  const bottom = h('div.oact.wtabs2', null, Object.values(tabs).map(t => t.b));

  // 지위 목록 (보기 전용) · 무공 목록 (이 지역에서 익힐 수 있는 것만 고른다) · 특산(이 지역 것만) + 영단
  const ranks = D.jobs.map(d => {
    const sub = h('small');
    const el = h('div.lrow.rrow', null, G.T.el(d.t || 'j_' + d.id, 'sm'), h('span.lm', null, h('span.ln', null, h('b', null, d.n), h('small.rg', null, ` 녹봉 ${U.fmt(d.inc)}/초`)), sub));
    return { d, el, sub };
  });
  const skills = D.skills.map(d => {
    const lv = h('span.lv'), xb = bar('xp'), sub = h('small'), nm = h('b');
    const el = h('button.lrow', { on: { click: () => W.setSkill(w(), d.id) } },
      G.T.el(d.t || 's_' + d.id, 'sm'), h('span.lm', null, h('span.ln', null, nm, h('small.rg', null, ` ${d.fam}`), lv), xb, sub));
    return { d, el, lv, xb, sub, nm };
  });
  const shop = D.items.map(it => {
    const cost = h('small.c');
    const el = h('button.shop-it', { title: it.n, on: { click: () => W.buyItem(w(), it.id) } }, G.T.el(it.t || 'it_' + it.id, 'md'), h('span.si', null, h('b', null, `${it.n} · ${it.d}`), cost));
    return { it, el, cost };
  });
  const elixCnt = h('b'), elixCost = h('small.c');
  const elixBtn = h('button.shop-it.elix', { title: '영단', on: { click: () => W.buyElixir(w()) } }, G.T.el('q_pill', 'md'), h('span.si', null, h('b', null, '영단 · 숙련 +10% (어디서나)'), elixCost), elixCnt);
  // 생애 계획표: [자동 코스 | 내 코스], 단계(지역·집중·끝나는 조건), 이번 생 예상(내 코스 vs 자동 코스), 전생 기록
  const planBody = h('div.plan'), fcBox = h('div.fcast'), histBox = h('div.phist');
  let planKey = '', fcKey = '', fcT = 0;
  function renderPlan() {
    const s = w(), P = W.plan(s), path = W.pathOf(s), auto = !!s.planAuto;
    const key = JSON.stringify(P) + auto + path + W.maxSteps();
    if (key === planKey) return;
    planKey = key;
    fcKey = '';
    planBody.innerHTML = '';
    const modeBtn = (on, label, tip) => h('button.tgl' + (auto === on ? '.on' : ''), { 'data-tip': tip, on: { click: () => { W.setAuto(w(), on); planKey = ''; } } }, label);
    planBody.append(h('div.plan-h', null, modeBtn(true, '자동 코스', '추천 코스를 그대로 따른다 (칸이 늘면 코스도 길어진다)'), modeBtn(false, '내 코스', '직접 짠 코스 (회귀해도 남는다)'),
      h('small.dim', null, ` · ${D.paths[path]} · 위에서부터, 이룬 단계는 건너뛴다`), h('span.sp'),
      auto ? null : h('button.btn.sm', { 'data-tip': '내 코스를 자동 코스로 덮어쓴다', on: { click: () => { W.resetPlan(w()); planKey = ''; } } }, '자동 코스 복사')));
    const edit = fn => { W.editPlan(w(), fn); planKey = ''; };
    const ranks = D.jobs.filter(j => !j.path || j.path === path);
    P.forEach((b, i) => {
      const reg = h('select.psel', { on: { change: e => edit(p => { p[i].r = e.target.value; }) } },
        Object.entries(D.regions).map(([id, R]) => h('option', { value: id, selected: id === b.r }, `${R.n} — ${role(s, id)}`)));
      const foc = h('select.psel.f', { on: { change: e => edit(p => { p[i].f = e.target.value; }) } },
        W.FOCUS.map(f => h('option', { value: f, selected: f === b.f }, W.focusName(f))));
      const opts = [...ranks.map(j => ['rank:' + j.tier, `지위 ${j.n}까지`]), ...D.realms.map((r, k) => ['realm:' + k, `경지 ${r[0]}까지`]), ['end:0', '끝까지']];
      const until = h('select.psel.u', { on: { change: e => { const [u, v] = e.target.value.split(':'); edit(p => { p[i].u = u; p[i].v = +v; }); } } },
        opts.map(([v, t]) => h('option', { value: v, selected: v === `${b.u}:${b.v}` }, t)));
      const up = h('button.fbtn', { 'data-tip': '위로', on: { click: () => edit(p => { if (i > 0) [p[i - 1], p[i]] = [p[i], p[i - 1]]; }) } }, '▲');
      const del = h('button.fbtn', { 'data-tip': '단계 빼기', on: { click: () => edit(p => { p.splice(i, 1); }) } }, '✕');
      up.disabled = i === 0;
      del.disabled = P.length <= 1;
      // 자동 코스를 고치면 내 코스로 넘어간다 (자동 코스를 시작점으로)
      planBody.append(h('div.prow2' + (auto ? '.ro' : ''), { 'data-i': i }, h('b.pno', null, i + 1), reg, foc, until, up, del));
    });
    const full = P.length >= W.maxSteps();
    const add = h('button.btn.sm.padd', { on: { click: () => edit(p => { if (p.length >= W.maxSteps()) return; const l = p[p.length - 1]; p.push({ r: l.r, f: l.f, u: 'end', v: 0 }); }) } }, full ? `단계 ${P.length}/${W.maxSteps()} · 칸은 스킬트리 「한 단계 더」` : `+ 단계 (${P.length}/${W.maxSteps()})`);
    add.disabled = full;
    planBody.append(add, h('div.card-h', null, h('b', null, '이번 생 예상'), h('small.dim', null, ' 지금 상태에서 끝까지 빠르게 돌려 본 것 (같은 조건)')), fcBox, histBox);
  }
  // 예상: 계획표가 바뀌고 0.5초 뒤 한 번 (자동 코스와 내 코스를 같은 난수로)
  function renderForecast() {
    const s = w();
    const key = planKey + '|' + JSON.stringify(s.plan) + '|' + Math.floor(s.age / 5);
    if (key === fcKey || s.dead || W.journey(s)) return;
    if (!fcT) { fcT = setTimeout(() => {
      fcT = 0; fcKey = key;
      const a = W.forecast(s, true), mine = s.plan ? W.forecast(s, false, s.plan) : null;
      const row = (label, r, base) => h('div.fcrow' + (label === '자동 코스' ? '' : '.mine'), null, h('b', null, label),
        h('span', null, r.job), h('span', null, `${W.realmName(r.realm)} ${r.sum}`), h('span', null, `깨달음 +${U.fmt(r.ins)}`),
        base ? h('span.delta' + (r.ins >= base.ins ? '.up' : '.down'), null, `${r.ins >= base.ins ? '+' : ''}${Math.round((r.ins / Math.max(0.01, base.ins) - 1) * 100)}%`) : h('span'));
      fcBox.innerHTML = '';
      fcBox.append(row('자동 코스', a));
      if (mine) fcBox.append(row('내 코스', mine, a));
      const m = (s.planAuto || !mine ? a : mine).marks.slice(0, 8).map(x => `${x.s} ${x.age}세`).join(' · ');
      fcBox.append(h('small.dim', null, m ? `이정표: ${m}` : ''));
    }, 500); }
  }
  function renderHist() {
    const s = w(), H = s.hist || [], key = H.length + ':' + (H[H.length - 1] || {}).n;
    if (histBox._k === key) return;
    histBox._k = key;
    histBox.innerHTML = '';
    if (!H.length) return;
    histBox.append(h('div.card-h', null, h('b', null, '전생 기록')),
      h('div.hrows', null, [...H].reverse().map(x => h('div.hrow', null, h('small', null, `${x.n}생`), h('small', null, x.auto ? '자동' : '내 코스'), h('span', null, W.jobDef(x.job).n), h('small', null, `${W.realmName(x.realm)} ${x.sum}`), h('small', null, `${x.age}세`), h('small', null, `깨달음 +${U.fmt(x.ins)}`)))));
  }
  const bodies = { plan: planBody, rank: h('div.olist.wide', null, ranks.map(x => x.el)), skill: h('div.olist.wide', null, skills.map(x => x.el)), shop: h('div.shop.wide', null, shop.map(x => x.el), elixBtn) };
  function openPanel(k) {
    openK = k;
    tog(panel, 'hidden', !k);
    for (const t of Object.values(tabs)) tog(t.b, 'on', t.k === k);
    if (!k) return;
    panelBody.innerHTML = '';
    panelBody.append(bodies[k]);
    setText(panelTitle, k === 'plan' ? '생애 계획표' : tabs[k].label);
    if (k === 'plan') { planKey = ''; renderPlan(); }
  }

  const overlay = h('div.fover', null, hud, top, left, jbox, bottom, panel);
  const req = d => !d.req ? '' : Object.entries(d.req).filter(([id, lv]) => W.L(w(), id) < lv).map(([id, lv]) => (id === 'realm' ? `경지 ${W.realmName(lv)}` : `${W.skillDef(id).n} ${lv}`)).join(' · ');
  // 말풍선 내역: 「무공 ×1.3 · 지위 ×1.2 · …」 (1인 것은 뺀다)
  const tipOf = (s, k) => W.parts(s, k).filter(p => p[1] !== 1).map(([n, v]) => `${n} ×${U.fmt(v)}`).join(' · ') || '기본';
  const rankReq = (s, d) => [s.fameT < W.fameNeed(d) ? `명성 ${U.fmt(s.fameT)}/${U.fmt(W.fameNeed(d))}` : '', W.realm(s) < (d.realm || 0) ? `경지 ${W.realmName(d.realm)}` : '', d.champ && !s.champ ? '천산 비무 승리' : ''].filter(Boolean).join(' · ');
  // 지역의 역할 (이름 옆): 명성 ×n · 계열 수련 ×n · 원정 / 비무 / 천하제일 비무
  const role = (s, id) => {
    const a = W.act(s, id), out = [];
    if (a.kind === 'raid') return `${a.n} · 처치마다 명성·깨달음`;
    if (a.kind === 'boss') out.push(s.champ ? '천하제일 비무' : '천하제일 비무 (이기면 다음 지위)');
    if (a.kind === 'duel') out.push('비무 결투');
    if ((a.fame || 1) !== 1) out.push(`명성 ×${a.fame}`);
    for (const [f, m] of Object.entries(a.train || {})) out.push(`${f} ×${m}`);
    return out.join(' · ') || a.n;
  };

  return G.UI.worldScreen('wuxia', {
    overlay,
    update() {
      const s = w(), lifeN = W.lifespan(s), jd = W.jobDef(s.job), sd = W.skillDef(s.skill);
      const rt = W.rt(s), R = D.regions[rt.region], jr = W.journey(s), act = W.act(s, rt.region);

      // 지역 이름 옆에 그 지역의 역할 (여정 중이면 가는 곳)
      const mid = jr ? jr.to : rt.region;
      setText(hudMode, s.dead ? '천수를 다했다' : jr ? `여정 → ${D.regions[mid].n}` : R.n);
      setText(hudRole, s.dead ? '' : role(s, mid));
      res.set('realm', `${W.realmName(W.realm(s))} ${W.realmSum(s)}`);
      res.set('pow', U.fmt(W.power(s)));
      res.tip('pow', `전투력 ${U.fmt(W.power(s))} · 체력 ${U.fmt(W.maxHp(s))} — ${tipOf(s, 'pow')}`);
      res.set('gold', U.fmt(s.gold));
      res.set('ins', U.fmt(s.ins));
      // 나이: 천수까지 차오르는 막대
      const leftY = Math.max(0, lifeN - s.age);
      const st = W.stepIdx(s), sb = W.plan(s)[st];
      age.set((s.age - W.startAge()) / (lifeN - W.startAge()), `${Math.floor(s.age)} / ${Math.floor(lifeN)}세 · ${st + 1}단계 ${W.focusName(sb.f)} → ${W.stepGoal(s, sb).replace('까지', '')}`, `⌛ ${Math.ceil(leftY)}년`, leftY < 8);
      // 총 배율: 무공 효과 × 특산 × 트리 × 넥서스·유물·붕괴 (지역·전생 레벨은 빼고)
      for (const f of ['심법', '외공', '경공', '잡학']) { bonus.set(f, `×${U.fmt(W.famXp(s, f))}`); bonus.tip(f, `${f} 숙련 — ${tipOf(s, f)}`); }
      bonus.set('fame', `×${U.fmt(W.fameMult(s))}`); bonus.tip('fame', `명성 — ${tipOf(s, 'fame')}`);
      bonus.set('combat', `×${U.fmt(W.powMult(s))}`); bonus.tip('combat', `전투력 배율 — ${tipOf(s, 'pow').replace(/무공\(기본\) ×[\d.]+ · /, '')}`);
      bonus.set('walk', `×${W.travelMult(s).toFixed(2)}`); bonus.tip('walk', `여정 — ${tipOf(s, 'walk')}`);
      bonus.set('ins', `×${tm('ins').toFixed(2)}`); bonus.tip('ins', `깨달음 — ${tipOf(s, 'ins')}`);
      // 자동 · 장래
      tPromote.update(); tSkill.update(); tBuy.update();
      const path = W.pathOf(s), fixed = jd.tier >= 3;
      for (const b of pathBtns) { tog(b, 'on', b.dataset.k === path); tog(b, 'fixed', fixed && b.dataset.k !== path); }
      // 강호 지도
      for (const [id, g] of Object.entries(nodes)) {
        g.setAttribute('class', 'jn' + (id === rt.region && !jr ? ' cur' : '') + (id === jd.home ? ' home' : '') + (s.hold === id ? ' hold' : ''));
        setText(g._tip, `${D.regions[id].n} · ${role(s, id)}${s.hold === id ? ' · 📍' : ''}`);
      }
      const trip = W.travelMult(s);
      for (const y of yearT) setText(y.t, `${(y.yr / trip).toFixed(1)}년`);
      setText(tripEl, `여정 ×${(1 / trip).toFixed(2)}`);
      tripEl.dataset.tip = `경지 ${W.realmName(W.realm(s))}: ×${(1 / W.realmTravel(s)).toFixed(2)} · 경공 무공·트리: ×${(W.realmTravel(s) / trip).toFixed(2)}`;
      tog(overlay, 'travel', !!jr);
      if (jr) {
        const pts = jr.path.map(r => D.regions[r].pos);
        let total = 0; const seg = [];
        for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
        let d = total * jr.frac, i = 0;
        while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
        const a = pts[i], b = pts[i + 1] || a, f = seg[i] ? d / seg[i] : 0;
        dot.setAttribute('cx', a[0] + (b[0] - a[0]) * f); dot.setAttribute('cy', a[1] + (b[1] - a[1]) * f);
        dot.style.display = '';
      } else dot.style.display = 'none';
      // 아래 가운데 단추: 지위(다음 지위) · 무공(지금 수련) · 특산(이 지역에서 살 수 있는 수)
      const nx = W.nextJob(s);
      G.T.set(tabs.rank.ic, jd.t || 'j_' + s.job);
      setText(tabs.rank.n, jd.n); setText(tabs.rank.sub, nx ? `→ ${nx.n}` : '정점');
      tabs.rank.b.dataset.tip = nx ? `다음 지위 ${nx.n}: ${rankReq(s, nx) || '곧'}` : '정점';
      G.T.set(tabs.skill.ic, sd.t || 's_' + s.skill);
      setText(tabs.skill.n, W.skillName(s, sd)); setText(tabs.skill.sub, `Lv ${W.L(s, s.skill)}`);
      const buyable = D.items.filter(it => !s.items[it.id] && it.r === rt.region).length;
      setText(tabs.shop.n, '특산'); setText(tabs.shop.sub, buyable ? `${R.n} ${buyable}` : '영단');
      if (openK === 'plan') {
        renderPlan();
        renderForecast();
        renderHist();
        // 지금 단계 밝히기, 이룬 단계는 흐리게
        const cur = W.stepIdx(s), P = W.plan(s);
        for (const r of planBody.querySelectorAll('.prow2')) { const i = +r.dataset.i; tog(r, 'on', i === cur); tog(r, 'done', i < cur || (P[i] && W.stepDone(s, P[i]))); }
      }
      if (openK === 'rank') for (const x of ranks) {
        const d = x.d;
        tog(x.el, 'hidden', !!d.path && d.path !== path);
        tog(x.el, 'on', s.job === d.id);
        tog(x.el, 'done', d.tier < jd.tier);
        setText(x.sub, d.tier <= jd.tier ? (s.job === d.id ? '지금 지위' : '✓') : rankReq(s, d) || '곧');
      }
      if (openK === 'skill') for (const x of skills) {
        const d = x.d, lv = W.L(s, d.id), pk = s.peak[d.id] || 0;
        setText(x.nm, W.skillName(s, d));
        const here = W.localSkills(s, rt.region).includes(d), ok = W.reqMet(s, d) && here, rm = W.regionTrain(s, rt.region, d.fam);
        tog(x.el, 'on', s.skill === d.id);
        tog(x.el, 'locked', !ok);
        x.el.disabled = !ok;
        setText(x.lv, ` ${lv}` + (pk ? ` (전생 ${pk})` : ''));
        setW(x.xb.fill, (s.xp[d.id] || 0) / W.need(lv));
        const tags = [W.catchingUp(s, d.id) ? '전생 레벨까지 ×2' : '', rm > 1 ? `이 지역 수련 ×${rm}` : ''].filter(Boolean).join(' · ');
        setText(x.sub, !W.reqMet(s, d) ? `🔒 ${d.unlock && !G.Tree.add('wuxia', s.tree, d.unlock) ? '스킬트리' : req(d)}` : d.sect && jd.tier < 3 ? `${D.paths[path]} 무공 · 입문 후` : !here ? '원정 중에는 수련 못 함' : `${d.d}${tags ? ' · ' + tags : ''}`);
      }
      if (openK === 'shop') {
        for (const x of shop) {
          const own = !!s.items[x.it.id], here = x.it.r === rt.region && !jr, c = W.itemCost(x.it);
          tog(x.el, 'own', own);
          x.el.disabled = own || !here || s.gold < c;
          setText(x.cost, own ? '✓' : here ? U.fmt(c) : `📍 ${D.regions[x.it.r].n} · ${U.fmt(c)}`);
        }
        const ec = W.elixCost(s);
        setText(elixCost, U.fmt(ec));
        setText(elixCnt, s.elix ? `×${s.elix}` : '');
        elixBtn.disabled = s.gold < ec;
      }
    },
  });
};
