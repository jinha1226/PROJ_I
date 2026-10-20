'use strict';
// 무협 화면: 지역 지도가 화면 전체, 그 위에 HUD (판타지와 같은 구성 원리)
//  위 가운데: 수명 막대(이번 생이 끝나는 시계) + 남은 햇수, 아래 한 줄: 경지·명성·녹봉·깨달음·회차
//  왼쪽 위: 지역·활동, 진로(화산·마교), 자동 이동·수련·구입 / 왼쪽 가운데: 지위 카드(누르면 지위 목록)·무공 카드(누르면 목록), 특산 상점
//  오른쪽 위: 강호 지도 — 지금 지역을 밝히고, 여정 중이면 길 위에 점. 지역을 누르면 그곳에 머문다(📍), 다시 누르면 풀린다
//  지도의 수련터를 누르면 그 무공으로
G.UI.views.wuxia = function () {
  const w = () => G.S.w.wuxia, W = G.Wuxia, D = G.D.WX, U = G.U;

  // ── 왼쪽 위
  const hudMode = h('b'), hudAge = h('small');
  const tPromote = G.UI.toggle('이동', () => w().autoPromote, v => { w().autoPromote = v; }, '자동 이동: 지위·특산·천하제일 비무에 따라 지역을 알아서 옮긴다');
  const tSkill = G.UI.toggle('수련', () => w().autoSkill, v => { w().autoSkill = v; }, '자동 수련: 경지가 모자라면 가장 빨리 오르는 무공을 고른다');
  const tBuy = G.UI.toggle('구입', () => w().autoBuy, v => { w().autoBuy = v; }, '자동 구입');
  // 진로: 낭인 다음 어느 쪽으로 오를지 (이번 생, 회귀해도 기억)
  const pathBtn = h('button.tgl.pathbtn', { 'data-tip': '진로: 낭인 다음 화산파와 마교 중 어느 쪽으로 오를지', on: { click: () => { const s = w(); if (W.jobDef(s.job).path) return; s.path = s.path === 'ma' ? 'jeong' : 'ma'; } } });
  const hud = h('div.fhud', null, h('div.floorrow', null, hudMode, hudAge), h('div.tgls', null, pathBtn, h('small.dim', null, '자동'), tPromote.el, tSkill.el, tBuy.el));

  // ── 오른쪽 위: 강호 지도 (중국 윤곽 위에 지역). 길 숫자는 지금 몸으로 걸리는 햇수 — 크게 볼 때(올리거나 여정 중)만 보인다
  const SVGNS = 'http://www.w3.org/2000/svg', svgEl = (t, a) => { const e = document.createElementNS(SVGNS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const O = D.outline, jmap = svgEl('svg', { viewBox: `0 0 ${O.vb[0]} ${O.vb[1]}`, class: 'jmap' });
  for (const d of O.paths) jmap.append(svgEl('path', { d, class: 'jland' }));
  const yearT = [];
  for (const [a, b] of D.links) {
    const A = D.regions[a].pos, B = D.regions[b].pos;
    jmap.append(svgEl('line', { x1: A[0], y1: A[1], x2: B[0], y2: B[1], class: 'jl' }));
    const t = svgEl('text', { x: (A[0] + B[0]) / 2, y: (A[1] + B[1]) / 2 - 1, class: 'jy' });
    jmap.append(t);
    yearT.push({ t, a, b });
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
  // 여정 배율: 경지·경공·트리 (올리면 자세히)
  const tripEl = h('small.jtrip');
  const jbox = h('div.jbox', null, jmap, tripEl);

  // ── 위 가운데: 수명
  const life = G.UI.ov.bar('수명: 다하면 이번 생이 끝나고 회귀한다', '남은 햇수');
  const st = G.UI.ov.stats([['realm', 's_naegong', '경지: 무공 레벨 합으로 오른다. 경지마다 전투력 +30%·여정 +15%, 화경부터 천수 +4년'], ['gold', 'c_coin', '명성: 특산·영단에 쓴다. 지위는 이번 생에 쌓은 명성으로 정해져 써도 내려가지 않는다'], ['inc', 'wa_band', '녹봉: 지위가 주는 초당 명성 (활동 중에는 그 지역 배수, 그 밖에서는 절반)'], ['ins', 'ui_star', '깨달음: 회귀해도 남아 스킬트리에 쓴다'], ['lives', 'wx_hero0', '회차']]);
  const top = h('div.ftop', null, life.el, st.el);

  // ── 왼쪽 가운데: 지위(누르면 지위 목록) · 무공(누르면 목록) · 특산 상점
  const card = () => {
    const ic = G.T.el('j_jumso', 'md'), n = h('b'), lv = h('small'), xb = bar('xp');
    return { ic, n, lv, xb, el: h('div.ocard', null, ic, h('div.om', null, n, xb, lv)) };
  };
  const rankC = card(), skillC = card();
  // 지위 목록: 이번 진로의 단계와 조건 (보기 전용)
  const ranks = D.jobs.map(d => {
    const sub = h('small');
    const el = h('div.lrow.rrow', null, G.T.el(d.t || 'j_' + d.id, 'sm'), h('span.lm', null, h('span.ln', null, h('b', null, d.n), h('small.rg', null, ` 녹봉 ${U.fmt(d.inc)}/초`)), sub));
    return { d, el, sub };
  });
  const skills = D.skills.map(d => {
    const lv = h('span.lv'), xb = bar('xp'), sub = h('small');
    const el = h('button.lrow', { on: { click: () => W.setSkill(w(), d.id) } },
      G.T.el(d.t || 's_' + d.id, 'sm'), h('span.lm', null, h('span.ln', null, h('b', null, d.n), h('small.rg', null, ` ${d.fam}`), lv), xb, sub));
    return { d, el, lv, xb, sub };
  });
  const group = [];
  const rankPop = G.UI.ov.pop(rankC.el, '지위', h('div.olist', null, ranks.map(x => x.el)), group);
  const skillPop = G.UI.ov.pop(skillC.el, '무공 고르기', h('div.olist', null, skills.map(x => x.el)), group);
  rankPop.btn.classList.add('cardbtn'); skillPop.btn.classList.add('cardbtn');

  // 특산 상점: 이 지역에서 파는 것만 살 수 있다 (다른 지역 것은 📍) + 어디서나 사는 영단
  const shop = D.items.map(it => {
    const cost = h('small.c');
    const el = h('button.shop-it', { title: it.n, on: { click: () => W.buyItem(w(), it.id) } }, G.T.el(it.t || 'it_' + it.id, 'md'), h('span.si', null, h('b', null, it.d), cost));
    return { it, el, cost };
  });
  const elixCnt = h('b'), elixCost = h('small.c');
  const elixBtn = h('button.shop-it.elix', { title: '영단', on: { click: () => W.buyElixir(w()) } }, G.T.el('q_pill', 'md'), h('span.si', null, h('b', null, '숙련 +10%'), elixCost), elixCnt);
  const shopPop = G.UI.ov.pop(G.T.el('c_coin', 'xs'), '특산 상점', h('div.shop', null, shop.map(x => x.el), elixBtn), group);

  const left = h('div.fleft', null, h('div.ocol', null, rankPop.el, skillPop.el, shopPop.el));
  const overlay = h('div.fover', null, hud, top, left, jbox);

  const req = d => !d.req ? '' : Object.entries(d.req).filter(([id, lv]) => W.L(w(), id) < lv).map(([id, lv]) => (id === 'realm' ? `경지 ${W.realmName(lv)}` : `${W.skillDef(id).n} ${lv}`)).join(' · ');
  // 지위 조건 중 아직 못 채운 것
  const rankReq = (s, d) => [s.fameT < W.fameNeed(d) ? `명성 ${U.fmt(s.fameT)}/${U.fmt(W.fameNeed(d))}` : '', W.realm(s) < (d.realm || 0) ? `경지 ${W.realmName(d.realm)}` : '', d.champ && !s.champ ? '천산 비무 승리' : ''].filter(Boolean).join(' · ');
  return G.UI.worldScreen('wuxia', {
    overlay,
    update() {
      const s = w(), lifeN = W.lifespan(s), jd = W.jobDef(s.job), sd = W.skillDef(s.skill);
      const rt = W.rt(s), R = D.regions[rt.region], jr = W.journey(s);
      const place = ch => (R.places[ch] || ['?'])[0];
      const act = W.act(s, rt.region);
      setText(hudMode, s.dead ? '천수를 다했다' : jr ? `여정 · ${D.regions[jr.to].n}(으)로` : `${R.n} · ${s.mode === 'train' && W.skillAt(sd, rt.region) ? `${place(W.dest(s))} · ${sd.n}` : `${place(W.dest(s))} · ${act.n}`}`);
      const locked = !!jd.path || jd.tier >= 3;
      setText(pathBtn, (jd.path || s.path) === 'ma' ? '마교' : '화산');
      tog(pathBtn, 'ma', (jd.path || s.path) === 'ma');
      tog(pathBtn, 'fixed', locked);
      // 강호 지도: 지금 지역 밝게, 할 일이 있는 지역은 보통, 없는 곳은 흐리게. 여정 중이면 길 위 점
      // 지금 지역 밝게, 지위의 근거지는 금 테, 머무는 곳(📍)은 붉은 테. 올리면 그 지역 활동
      for (const [id, g] of Object.entries(nodes)) {
        g.setAttribute('class', 'jn' + (id === rt.region && !jr ? ' cur' : '') + (id === jd.home ? ' home' : '') + (s.hold === id ? ' hold' : ''));
        const A = W.act(s, id);
        setText(g._tip, `${D.regions[id].n} · ${A.n}${s.hold === id ? ' · 머무는 중 (다시 누르면 풀림)' : ''}`);
      }
      // 길마다 지금 몸으로 걸리는 햇수, 여정 배율
      const tm = W.travelMult(s);
      for (const y of yearT) setText(y.t, `${(D.links.find(l => l[0] === y.a && l[1] === y.b)[2] / tm).toFixed(1)}년`);
      setText(tripEl, `여정 ×${(1 / tm).toFixed(2)}`);
      tripEl.dataset.tip = `경지 ${W.realmName(W.realm(s))}: ×${(1 / W.realmTravel(s)).toFixed(2)} · 경공 무공·트리: ×${(W.realmTravel(s) / tm).toFixed(2)}`;
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
      st.set('inc', `+${U.fmt(W.stipend(s))}/초`);
      st.set('ins', U.fmt(s.ins));
      st.set('lives', `${s.lives + 1}회차`);
      // 카드: 지위(다음 지위까지 쌓은 명성) · 무공
      const nx = W.nextJob(s);
      G.T.set(rankC.ic, jd.t || 'j_' + s.job); setText(rankC.n, jd.n);
      setW(rankC.xb.fill, nx ? Math.min(1, (s.fameT - W.fameNeed(jd)) / Math.max(1, W.fameNeed(nx) - W.fameNeed(jd))) : 1);
      setText(rankC.lv, nx ? `→ ${nx.n}` : '정점');
      rankPop.btn.dataset.tip = nx ? `다음 지위 ${nx.n}: ${rankReq(s, nx) || '곧'}` : '정점';
      G.T.set(skillC.ic, sd.t || 's_' + s.skill); setText(skillC.n, sd.n); setText(skillC.lv, `Lv ${W.L(s, s.skill)}${s.mode === 'train' ? ' · 수련 중' : ''}`);
      setW(skillC.xb.fill, (s.xp[s.skill] || 0) / W.need(W.L(s, s.skill)));
      tog(rankC.el, 'on', s.mode !== 'train'); tog(skillC.el, 'on', s.mode === 'train');
      if (shopPop.isOpen()) {
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
      if (rankPop.isOpen()) for (const x of ranks) {
        const d = x.d, path = W.pathOf(s);
        tog(x.el, 'hidden', !!d.path && d.path !== path);
        tog(x.el, 'on', s.job === d.id);
        tog(x.el, 'done', d.tier < jd.tier);
        setText(x.sub, d.tier <= jd.tier ? (s.job === d.id ? '지금 지위' : '✓') : rankReq(s, d) || '곧');
      }
      if (skillPop.isOpen()) for (const x of skills) {
        const d = x.d, lv = W.L(s, d.id), on = s.skill === d.id, pk = s.peak[d.id] || 0;
        // 무공은 이 지역에서 익힐 수 있어야 고를 수 있다
        const here = W.localSkills(s, rt.region).includes(d), ok = W.reqMet(s, d) && here;
        tog(x.el, 'on', on);
        tog(x.el, 'locked', !ok);
        x.el.disabled = !ok;
        setText(x.lv, ` ${lv}` + (pk ? ` (${pk})` : ''));
        setW(x.xb.fill, (s.xp[d.id] || 0) / W.need(lv));
        setText(x.sub, !W.reqMet(s, d) ? `🔒 ${d.unlock && !G.Tree.add('wuxia', s.tree, d.unlock) ? '스킬트리' : req(d)}` : !here ? `📍 ${d.at.map(a => D.regions[a[0]].n).join(' · ')}` : d.d);
      }
    },
  });
};
