'use strict';
// 무협 화면: 마을 지도가 화면 전체, 그 위에 HUD (판타지와 같은 구성 원리)
//  위 가운데: 수명 막대(이번 생이 끝나는 시계) + 남은 햇수, 아래 한 줄: 은자·수입·깨달음·회차
//  왼쪽 위: 지역·장소·하는 일, 진로(정파·마도), 자동 승진·수련·구입 / 왼쪽 가운데: 지금 직업·무공 카드(누르면 목록), 은자 상점 단추
//  오른쪽 위: 강호 지도 (판타지 미니맵 자리) — 지금 있는 지역을 밝히고, 여정 중이면 길 위에 점. 지역을 누르면 그곳 직업으로 떠난다
//  지도의 장소를 눌러도 직업·수련을 바꾼다
G.UI.views.wuxia = function () {
  const w = () => G.S.w.wuxia, W = G.Wuxia, D = G.D.WX, U = G.U;

  // ── 왼쪽 위
  const hudMode = h('b'), hudAge = h('small');
  const tPromote = G.UI.toggle('승진', () => w().autoPromote, v => { w().autoPromote = v; }, '자동 승진');
  const tSkill = G.UI.toggle('수련', () => w().autoSkill, v => { w().autoSkill = v; }, '자동 수련: 다음 직업에 필요한 무공을 알아서 고른다');
  const tBuy = G.UI.toggle('구입', () => w().autoBuy, v => { w().autoBuy = v; }, '자동 구입');
  // 진로: 낭인 다음 어느 쪽으로 오를지 (이번 생, 회귀해도 기억)
  const pathBtn = h('button.tgl.pathbtn', { 'data-tip': '진로: 낭인 다음 어느 쪽으로 오를지', on: { click: () => { const s = w(); if (W.jobDef(s.job).path) return; s.path = s.path === 'ma' ? 'jeong' : 'ma'; } } });
  const hud = h('div.fhud', null, h('div.floorrow', null, hudMode, hudAge), h('div.tgls', null, pathBtn, h('small.dim', null, '자동'), tPromote.el, tSkill.el, tBuy.el));

  // ── 오른쪽 위: 강호 지도
  const SVGNS = 'http://www.w3.org/2000/svg', svgEl = (t, a) => { const e = document.createElementNS(SVGNS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const jmap = svgEl('svg', { viewBox: '-6 -6 112 72', class: 'jmap' });
  for (const [a, b, y] of D.links) {
    const A = D.regions[a].pos, B = D.regions[b].pos;
    jmap.append(svgEl('line', { x1: A[0], y1: A[1], x2: B[0], y2: B[1], class: 'jl' }));
    const t = svgEl('text', { x: (A[0] + B[0]) / 2, y: (A[1] + B[1]) / 2 - 1.5, class: 'jy' }); t.textContent = `${y}년`; jmap.append(t);
  }
  const nodes = {};
  for (const [id, R] of Object.entries(D.regions)) {
    const g = svgEl('g', { class: 'jn', transform: `translate(${R.pos[0]},${R.pos[1]})` });
    g.append(svgEl('circle', { r: 4.2 }));
    // 맨 위 지역(천산)은 이름을 동그라미 위에 (아래로 가는 길 숫자와 겹치지 않게)
    const t = svgEl('text', { y: R.pos[1] < 15 ? -6.5 : 10 }); t.textContent = R.n; g.append(t);
    g.addEventListener('click', e => { e.stopPropagation(); if (!W.goRegion(w(), id)) { G.UI.toast(`${R.n}: 아직 할 일이 없다`); G.SFX.play('error'); } else G.SFX.play('select'); });
    jmap.append(g);
    nodes[id] = g;
  }
  const dot = svgEl('circle', { r: 2.4, class: 'jdot' });
  jmap.append(dot);
  const jbox = h('div.jbox', { 'data-tip': '강호 지도' }, jmap);

  // ── 위 가운데: 수명
  const life = G.UI.ov.bar('수명: 다하면 이번 생이 끝나고 회귀한다', '남은 햇수');
  const st = G.UI.ov.stats([['realm', 's_naegong', '경지: 무공 레벨 합으로 오른다. 경지마다 전투력 +30%, 화경부터 천수 +4년'], ['gold', 'c_coin', '은자'], ['inc', 'c_coin', '초당 은자 수입'], ['ins', 'ui_star', '깨달음: 회귀해도 남아 숙련을 빠르게 한다'], ['lives', 'wx_hero0', '회차']]);
  const top = h('div.ftop', null, life.el, st.el);

  // ── 왼쪽 가운데: 지금 직업·무공 (누르면 목록 창)
  const mk = (defs, isJob) => defs.map(d => {
    const lv = h('span.lv'), xb = bar('xp'), sub = h('small');
    const el = h('button.lrow', { on: { click: () => (isJob ? W.setJob(w(), d.id) : W.setSkill(w(), d.id)) } },
      G.T.el(d.t || (isJob ? 'j_' : 's_') + d.id, 'sm'), h('span.lm', null, h('span.ln', null, h('b', null, d.n), h('small.rg', null, isJob ? ` ${D.regions[d.r].n}` : ` ${d.fam}`), lv), xb, sub));
    return { d, el, lv, xb, sub, isJob };
  });
  const jobs = mk(D.jobs, true), skills = mk(D.skills, false);
  const card = isJob => {
    const ic = G.T.el(isJob ? 'j_jumso' : 's_naegong', 'md'), n = h('b'), lv = h('small'), xb = bar('xp');
    return { ic, n, lv, xb, el: h('div.ocard', null, ic, h('div.om', null, n, xb, lv)) };
  };
  const jobC = card(true), skillC = card(false);
  const group = [];
  const jobPop = G.UI.ov.pop(jobC.el, '직업 고르기', h('div.olist', null, jobs.map(x => x.el)), group);
  const skillPop = G.UI.ov.pop(skillC.el, '무공 고르기', h('div.olist', null, skills.map(x => x.el)), group);
  jobPop.btn.classList.add('cardbtn'); skillPop.btn.classList.add('cardbtn');

  // 은자 상점: 이번 생에만 쓰는 물건 + 몇 번이고 사는 영단
  const shop = D.items.map(it => {
    const cost = h('small.c');
    const el = h('button.shop-it', { title: it.n, on: { click: () => W.buyItem(w(), it.id) } }, G.T.el('it_' + it.id, 'md'), h('span.si', null, h('b', null, it.d), cost));
    return { it, el, cost };
  });
  const elixCnt = h('b'), elixCost = h('small.c');
  const elixBtn = h('button.shop-it.elix', { title: '영단', on: { click: () => W.buyElixir(w()) } }, G.T.el('q_pill', 'md'), h('span.si', null, h('b', null, '숙련 +10%'), elixCost), elixCnt);
  const shopPop = G.UI.ov.pop(G.T.el('c_coin', 'xs'), '은자 상점', h('div.shop', null, shop.map(x => x.el), elixBtn), group);

  const left = h('div.fleft', null, h('div.ocol', null, jobPop.el, skillPop.el, shopPop.el));
  const overlay = h('div.fover', null, hud, top, left, jbox);

  const req = d => !d.req ? '' : Object.entries(d.req).filter(([id, lv]) => W.L(w(), id) < lv).map(([id, lv]) => (id === 'realm' ? `경지 ${W.realmName(lv)}` : `${(W.jobDef(id) || W.skillDef(id)).n} ${lv}`)).join(' · ');
  return G.UI.worldScreen('wuxia', {
    overlay,
    update() {
      const s = w(), lifeN = W.lifespan(s), jd = W.jobDef(s.job), sd = W.skillDef(s.skill);
      const rt = W.rt(s), R = D.regions[rt.region], jr = W.journey(s);
      const place = ch => (R.places[ch] || ['?'])[0];
      setText(hudMode, s.dead ? '천수를 다했다' : jr ? `여정 · ${D.regions[jr.to].n}(으)로` : `${R.n} · ${s.mode === 'work' ? `${place(jd.at)} · ${jd.n}` : `${place(W.dest(s))} · ${sd.n}`}`);
      const locked = !!jd.path;
      setText(pathBtn, (jd.path || s.path) === 'ma' ? '마도' : '정파');
      tog(pathBtn, 'ma', (jd.path || s.path) === 'ma');
      tog(pathBtn, 'fixed', locked);
      // 강호 지도: 지금 지역 밝게, 할 일이 있는 지역은 보통, 없는 곳은 흐리게. 여정 중이면 길 위 점
      for (const [id, g] of Object.entries(nodes)) {
        const can = D.jobs.some(j => j.r === id && W.reqMet(s, j));
        g.setAttribute('class', 'jn' + (id === rt.region && !jr ? ' cur' : '') + (id === jd.r ? ' home' : '') + (can ? '' : ' dim'));
      }
      tog(overlay, 'travel', !!jr);
      if (jr) {
        // 경로를 이어 붙인 선 위에서 진행률만큼
        const pts = jr.path.map(r => D.regions[r].pos);
        let total = 0; const seg = [];
        for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
        let d = total * jr.frac, i = 0;
        while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
        const a = pts[i], b = pts[i + 1] || a, f = seg[i] ? d / seg[i] : 0;
        dot.setAttribute('cx', a[0] + (b[0] - a[0]) * f); dot.setAttribute('cy', a[1] + (b[1] - a[1]) * f);
        dot.style.display = '';
      } else dot.style.display = 'none';
      setText(hudAge, ` · ${Math.floor(s.age)}세`);
      tPromote.update(); tSkill.update(); tBuy.update();
      const left = Math.max(0, lifeN - s.age);
      life.set((lifeN - s.age) / (lifeN - W.startAge()), `${Math.floor(s.age)} / ${Math.floor(lifeN)}세`, `⌛ ${Math.ceil(left)}년`, left < 8);
      st.set('realm', `${W.realmName(W.realm(s))} ${W.realmSum(s)}`);
      st.set('gold', U.fmt(s.gold));
      st.set('inc', `+${U.fmt(W.income(s))}/초`);
      st.set('ins', U.fmt(s.ins));
      st.set('lives', `${s.lives + 1}회차`);
      // 카드: 지금 직업·무공
      G.T.set(jobC.ic, jd.t || 'j_' + s.job); setText(jobC.n, jd.n); setText(jobC.lv, `Lv ${W.L(s, s.job)}${s.mode === 'work' ? ' · 일하는 중' : ''}`);
      setW(jobC.xb.fill, (s.xp[s.job] || 0) / W.need(W.L(s, s.job), true));
      G.T.set(skillC.ic, sd.t || 's_' + s.skill); setText(skillC.n, sd.n); setText(skillC.lv, `Lv ${W.L(s, s.skill)}${s.mode !== 'work' ? ' · 수련 중' : ''}`);
      setW(skillC.xb.fill, (s.xp[s.skill] || 0) / W.need(W.L(s, s.skill), false));
      tog(jobC.el, 'on', s.mode === 'work'); tog(skillC.el, 'on', s.mode !== 'work');
      if (shopPop.isOpen()) {
        for (const x of shop) {
          const own = !!s.items[x.it.id];
          tog(x.el, 'own', own);
          x.el.disabled = own || s.gold < x.it.cost;
          setText(x.cost, own ? '✓' : U.fmt(x.it.cost));
        }
        const ec = W.elixCost(s);
        setText(elixCost, U.fmt(ec));
        setText(elixCnt, s.elix ? `×${s.elix}` : '');
        elixBtn.disabled = s.gold < ec;
      }
      if (jobPop.isOpen() || skillPop.isOpen()) for (const x of [...jobs, ...skills]) {
        const d = x.d, lv = W.L(s, d.id), on = x.isJob ? s.job === d.id : s.skill === d.id, pk = s.peak[d.id] || 0;
        // 무공은 이 지역에서 익힐 수 있어야 고를 수 있다. 직업은 다른 진로면 숨긴다 (이미 진로가 정해졌을 때)
        const here = x.isJob || !!W.skillAt(d, rt.region), ok = W.reqMet(s, d) && here;
        tog(x.el, 'hidden', x.isJob && d.path && (jd.path || s.path) !== d.path);
        tog(x.el, 'on', on);
        tog(x.el, 'locked', !ok);
        x.el.disabled = !ok;
        setText(x.lv, ` ${lv}` + (pk ? ` (${pk})` : ''));
        setW(x.xb.fill, (s.xp[d.id] || 0) / W.need(lv, x.isJob));
        setText(x.sub, !W.reqMet(s, d) ? `🔒 ${d.unlock && !G.Tree.add('wuxia', s.tree, d.unlock) ? '스킬트리' : req(d)}` : !here ? `📍 ${d.at.map(a => D.regions[a[0]].n).join(' · ')}` : x.isJob ? `+${U.fmt(d.inc * (1 + 0.1 * lv))}/초` : d.d);
      }
    },
  });
};
