'use strict';
// 수선 화면: 선문 산 지도 + 옆 패널(경지·영기, 천겁, 천교방 도전자, 제자·영초·단약)
G.UI.views.xianxia = function () {
  const x = () => G.S.w.xianxia, X = G.Xianxia, U = G.U;
  const STATE = { meditate: '영맥에서 좌선', hunt: '요수 사냥', duel: '산문에서 비무', trib: '정상에서 천겁' };

  const hudState = h('b');
  const hud = h('div', null, hudState, h('small.dim', null, '요수를 누르면 비검 · 수도자를 누르면 운기조식 · 익은 영초를 누르면 수확'));

  const realmEl = h('div.realm'), nextEl = h('small');
  const qi = G.UI.meter('영기'), chanceEl = h('b'), pillEl = h('b'), herbEl = h('b'), devEl = h('p.warn.hidden');
  const breakBtn = h('button.btn.big', { on: { click: () => X.breakthrough(x()) } }, '천겁에 도전');
  const tAuto = G.UI.toggle('자동 천겁', () => x().autoBreak, v => { x().autoBreak = v; });
  const thr = h('select', { on: { change: e => { x().autoThr = +e.target.value; } } },
    [0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1].map(v => h('option', { value: v, selected: x().autoThr === v }, `성공률 ${v * 100}% 이상`)));
  const oTile = G.T.el('o_0', 'lg'), oName = h('b'), oInfo = h('small'), powEl = h('b'), stoneEl = h('b'), discEl = h('small');

  const side = h('div', null,
    h('div.card.realm-card', null, h('small', null, '현재 경지'), realmEl, nextEl, qi.el,
      h('div.kv', null, h('span', null, '천겁 성공률'), chanceEl), h('div.kv', null, h('span', null, '단약 (천겁에 4개까지, 개당 +12%)'), pillEl),
      h('div.kv', null, h('span', null, '영초'), herbEl), devEl, breakBtn, h('div.tgls', null, tAuto.el, thr)),
    h('div.card', null, h('div.card-h', null, h('b', null, '천교방 다음 도전자')), h('div.opp-row', null, oTile, h('div', null, oName, oInfo)),
      h('div.kv', null, h('span', null, '나의 도력'), powEl)),
    h('div.card', null, h('div.card-h', null, G.T.el('q_stone', 'cur'), stoneEl, h('small', null, ' 영석')), discEl));

  return G.UI.worldScreen('xianxia', {
    side, hud,
    update() {
      const s = x(), rt = X.rt(s), cost = X.breakCost(s.realm);
      setText(hudState, STATE[rt.state] + (rt.state === 'meditate' ? ` · +${U.fmt(X.qiRate(s))}/초` : ''));
      setText(realmEl, X.realmName(s.realm));
      setText(nextEl, `다음: ${X.realmName(s.realm + 1)}`);
      qi.set(s.qi / cost, `${U.fmt(s.qi)} / ${U.fmt(cost)}`);
      setText(chanceEl, U.pct(X.breakChance(s)));
      setText(pillEl, s.pills);
      setText(herbEl, s.herbs);
      tog(devEl, 'hidden', s.devT <= 0);
      if (s.devT > 0) setText(devEl, `도심 동요: ${Math.ceil(s.devT)}초간 수련 30%`);
      breakBtn.disabled = s.qi < cost || rt.state === 'trib';
      tAuto.update();
      const o = X.opp(s.k);
      G.T.set(oTile, 'o_' + Math.min(8, o.tier));
      setText(oName, `${o.title} ${o.name}`);
      setText(oInfo, ` ${o.sect} · ${o.rank} · 도력 ${U.fmt(o.power)}`);
      setText(powEl, U.fmt(X.power(s)));
      setText(stoneEl, U.fmt(s.stone));
      setText(discEl, ` · 제자 ${rt.disciples.length}명`);
    },
  });
};
