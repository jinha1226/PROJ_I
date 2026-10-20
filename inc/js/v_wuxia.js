'use strict';
// 무협 화면: 마을 지도가 화면 전체, 그 위에 HUD (판타지와 같은 구성 원리)
//  위 가운데: 수명 막대(이번 생이 끝나는 시계) + 남은 햇수, 아래 한 줄: 은자·수입·깨달음·회차
//  왼쪽 위: 지금 장소·하는 일, 자동 승진·수련·구입 / 왼쪽 가운데: 지금 직업·무공 카드(누르면 목록), 은자 상점 단추
//  지도의 장소를 눌러도 직업·수련을 바꾼다
G.UI.views.wuxia = function () {
  const w = () => G.S.w.wuxia, W = G.Wuxia, D = G.D.WX, U = G.U;

  // ── 왼쪽 위
  const hudMode = h('b'), hudAge = h('small');
  const tPromote = G.UI.toggle('승진', () => w().autoPromote, v => { w().autoPromote = v; }, '자동 승진');
  const tSkill = G.UI.toggle('수련', () => w().autoSkill, v => { w().autoSkill = v; }, '자동 수련: 다음 직업에 필요한 무공을 알아서 고른다');
  const tBuy = G.UI.toggle('구입', () => w().autoBuy, v => { w().autoBuy = v; }, '자동 구입');
  const hud = h('div.fhud', null, h('div.floorrow', null, hudMode, hudAge), h('div.tgls', null, h('small.dim', null, '자동'), tPromote.el, tSkill.el, tBuy.el));

  // ── 위 가운데: 수명
  const life = G.UI.ov.bar('수명: 다하면 이번 생이 끝나고 회귀한다', '남은 햇수');
  const st = G.UI.ov.stats([['gold', 'c_coin', '은자'], ['inc', 'c_coin', '초당 은자 수입'], ['ins', 'ui_star', '깨달음: 회귀해도 남아 숙련을 빠르게 한다'], ['lives', 'wx_hero0', '회차']]);
  const top = h('div.ftop', null, life.el, st.el);

  // ── 왼쪽 가운데: 지금 직업·무공 (누르면 목록 창)
  const mk = (defs, isJob) => defs.map(d => {
    const lv = h('span.lv'), xb = bar('xp'), sub = h('small');
    const el = h('button.lrow', { on: { click: () => (isJob ? W.setJob(w(), d.id) : W.setSkill(w(), d.id)) } },
      G.T.el((isJob ? 'j_' : 's_') + d.id, 'sm'), h('span.lm', null, h('span.ln', null, h('b', null, d.n), lv), xb, sub));
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
  const overlay = h('div.fover', null, hud, top, left);

  const req = d => !d.req ? '' : Object.entries(d.req).filter(([id, lv]) => W.L(w(), id) < lv).map(([id, lv]) => `${(W.jobDef(id) || W.skillDef(id)).n} ${lv}`).join(' · ');
  return G.UI.worldScreen('wuxia', {
    overlay,
    update() {
      const s = w(), lifeN = W.lifespan(s), jd = W.jobDef(s.job), sd = W.skillDef(s.skill);
      setText(hudMode, s.dead ? '천수를 다했다' : s.mode === 'work' ? `${D.places[jd.at]} · ${jd.n}` : `${D.places[sd.at]} · ${sd.n}`);
      setText(hudAge, ` · ${Math.floor(s.age)}세`);
      tPromote.update(); tSkill.update(); tBuy.update();
      const left = Math.max(0, lifeN - s.age);
      life.set((lifeN - s.age) / (lifeN - W.startAge()), `${Math.floor(s.age)} / ${Math.floor(lifeN)}세`, `⌛ ${Math.ceil(left)}년`, left < 8);
      st.set('gold', U.fmt(s.gold));
      st.set('inc', `+${U.fmt(W.income(s))}/초`);
      st.set('ins', U.fmt(s.ins));
      st.set('lives', `${s.lives + 1}회차`);
      // 카드: 지금 직업·무공
      G.T.set(jobC.ic, 'j_' + s.job); setText(jobC.n, jd.n); setText(jobC.lv, `Lv ${W.L(s, s.job)}${s.mode === 'work' ? ' · 일하는 중' : ''}`);
      setW(jobC.xb.fill, (s.xp[s.job] || 0) / W.need(W.L(s, s.job), true));
      G.T.set(skillC.ic, 's_' + s.skill); setText(skillC.n, sd.n); setText(skillC.lv, `Lv ${W.L(s, s.skill)}${s.mode !== 'work' ? ' · 수련 중' : ''}`);
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
        const d = x.d, lv = W.L(s, d.id), ok = W.reqMet(s, d), on = x.isJob ? s.job === d.id : s.skill === d.id, pk = s.peak[d.id] || 0;
        tog(x.el, 'on', on);
        tog(x.el, 'locked', !ok);
        x.el.disabled = !ok;
        setText(x.lv, ` ${lv}` + (pk ? ` (${pk})` : ''));
        setW(x.xb.fill, (s.xp[d.id] || 0) / W.need(lv, x.isJob));
        setText(x.sub, !ok ? `🔒 ${d.unlock && !G.Tree.add('wuxia', s.tree, d.unlock) ? '스킬트리' : req(d)}` : x.isJob ? `+${U.fmt(d.inc * (1 + 0.1 * lv))}/초` : d.d);
      }
    },
  });
};
