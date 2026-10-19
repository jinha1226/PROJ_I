'use strict';
// 무협 화면: 마을 지도 + 옆 패널(삶·나이, 은자 상점, 직업·무공 목록). 지도의 장소를 눌러도 직업·수련을 바꾼다.
G.UI.views.wuxia = function () {
  const w = () => G.S.w.wuxia, W = G.Wuxia, D = G.D.WX, U = G.U;

  const hudMode = h('b'), hudAge = h('small');
  const hud = h('div', null, hudMode, hudAge);

  const lifeEl = h('b'), age = G.UI.meter('나이'), goldEl = h('b'), incEl = h('small'), insEl = h('b');
  const jobM = G.UI.meter('직업'), skillM = G.UI.meter('수련');
  const tPromote = G.UI.toggle('자동 승진', () => w().autoPromote, v => { w().autoPromote = v; });
  const tSkill = G.UI.toggle('자동 수련', () => w().autoSkill, v => { w().autoSkill = v; }, '다음 직업에 필요한 무공을 알아서 고른다');
  const tBuy = G.UI.toggle('자동 구입', () => w().autoBuy, v => { w().autoBuy = v; });

  // 은자 상점: 이번 생에만 쓰는 물건 + 몇 번이고 사는 영단
  const shop = D.items.map(it => {
    const cost = h('small.c');
    const el = h('button.shop-it', { title: it.n, on: { click: () => W.buyItem(w(), it.id) } }, G.T.el('it_' + it.id, 'md'), h('span.si', null, h('b', null, it.d), cost));
    return { it, el, cost };
  });
  const elixCnt = h('b'), elixCost = h('small.c');
  const elixBtn = h('button.shop-it.elix', { title: '영단', on: { click: () => W.buyElixir(w()) } }, G.T.el('q_pill', 'md'), h('span.si', null, h('b', null, '숙련 +10%'), elixCost), elixCnt);

  const mk = (defs, isJob) => defs.map(d => {
    const lv = h('span.lv'), xb = bar('xp'), sub = h('small');
    const el = h('button.lrow', { on: { click: () => (isJob ? W.setJob(w(), d.id) : W.setSkill(w(), d.id)) } },
      G.T.el((isJob ? 'j_' : 's_') + d.id, 'sm'), h('span.lm', null, h('span.ln', null, h('b', null, d.n), lv), xb, sub));
    return { d, el, lv, xb, sub, isJob };
  });
  const jobs = mk(D.jobs, true), skills = mk(D.skills, false);

  const side = h('div', null,
    h('div.card', null,
      h('div.card-h', null, h('b', null, '삶 '), lifeEl, h('span.sp'), G.T.el('ui_star', 'cur'), insEl), age.el),
    h('div.card', null, h('div.card-h', null, G.T.el('c_coin', 'cur'), goldEl, incEl, h('span.sp'), tBuy.el),
      h('div.shop', null, shop.map(x => x.el), elixBtn)),
    h('div.card', null, jobM.el, skillM.el, h('div.tgls', null, tPromote.el, tSkill.el)),
    h('div.card', null, jobs.map(x => x.el)),
    h('div.card', null, skills.map(x => x.el)));

  const req = d => !d.req ? '' : Object.entries(d.req).filter(([id, lv]) => W.L(w(), id) < lv).map(([id, lv]) => `${(W.jobDef(id) || W.skillDef(id)).n} ${lv}`).join(' · ');
  return G.UI.worldScreen('wuxia', {
    side, hud,
    update() {
      const s = w(), life = W.lifespan(s), jd = W.jobDef(s.job), sd = W.skillDef(s.skill);
      setText(hudMode, s.dead ? '천수를 다했다' : s.mode === 'work' ? `${D.places[jd.at]} · ${jd.n}` : `${D.places[sd.at]} · ${sd.n}`);
      setText(hudAge, ` · ${Math.floor(s.age)}세`);
      setText(lifeEl, `${s.lives + 1}회차`);
      age.set((s.age - W.startAge()) / (life - W.startAge()), `${Math.floor(s.age)} / ${Math.floor(life)}세`);
      tog(age.bar, 'late', s.age > life - 8);
      setText(goldEl, U.fmt(s.gold));
      setText(incEl, ` +${U.fmt(W.income(s))}/초`);
      setText(insEl, U.fmt(s.ins));
      tBuy.update();
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
      jobM.set((s.xp[s.job] || 0) / W.need(W.L(s, s.job), true), `${jd.n} Lv ${W.L(s, s.job)}`);
      skillM.set((s.xp[s.skill] || 0) / W.need(W.L(s, s.skill), false), `${sd.n} Lv ${W.L(s, s.skill)}`);
      tPromote.update(); tSkill.update();
      for (const x of [...jobs, ...skills]) {
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
