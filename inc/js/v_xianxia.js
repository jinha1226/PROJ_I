'use strict';
// 수선 화면: 동부 지도 + 옆 패널(경지·영기·천겁, 오행 진기 팔레트, 영석·단약)
// 팔레트에서 오행을 고르고 진법 칸을 누르면 놓인다. 같은 진기를 다시 누르거나 지우개면 뺀다.
G.UI.views.xianxia = function () {
  const x = () => G.S.w.xianxia, X = G.Xianxia, D = G.D.X, U = G.U;
  const STATE = { meditate: '좌선', trib: '천겁' };
  let pick = 'water';

  const hudState = h('b'), hudInfo = h('small');
  const hud = h('div', null, hudState, hudInfo);

  const realmEl = h('div.realm'), nextEl = h('small');
  const qi = G.UI.meter('영기'), chanceEl = h('b'), pillEl = h('b'), herbEl = h('b'), devEl = h('p.warn.hidden');
  const breakBtn = h('button.btn.big', { on: { click: () => X.breakthrough(x()) } }, '천겁');
  const tAuto = G.UI.toggle('자동 천겁', () => x().autoBreak, v => { x().autoBreak = v; });
  const thr = h('select', { on: { change: e => { x().autoThr = +e.target.value; } } },
    [0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1].map(v => h('option', { value: v, selected: x().autoThr === v }, `≥ ${v * 100}%`)));

  // 오행 팔레트: 보석 + 그 오행의 총 출력
  const pal = D.els.map(el => {
    const v = h('b');
    const b = h('button.el-pick', { title: `${D.el[el].n} · ${D.el[el].d}`, style: `--ec:${D.el[el].col}`, on: { click: () => { pick = el; } } },
      G.T.el(D.el[el].t, 'md'), h('span', null, h('small', null, D.el[el].n), v));
    return { el, b, v };
  });
  const eraser = h('button.el-pick.erase', { title: '빼기', on: { click: () => { pick = null; } } }, '✕');
  const tArr = G.UI.toggle('자동 배치', () => x().autoArr, v => { x().autoArr = v; if (v) X.autoArrange(x()); });
  const slotEl = h('small');
  const effs = { water: h('b'), metal: h('b'), wood: h('b'), fire: h('b'), earth: h('b') };
  const stoneEl = h('b');

  const side = h('div', null,
    h('div.card.realm-card', null, realmEl, nextEl, qi.el,
      h('div.kv', null, h('span', null, '천겁 성공률'), chanceEl),
      h('div.kv', { title: '천겁에 4개까지, 개당 +12%' }, h('span', null, G.T.el('q_pill', 'xs'), ' 단약'), pillEl),
      h('div.kv', null, h('span', null, G.T.el('q_herb', 'xs'), ' 영초'), herbEl), devEl, breakBtn, h('div.tgls', null, tAuto.el, thr)),
    h('div.card', null, h('div.card-h', null, h('b', null, '진법'), slotEl, h('span.sp'), tArr.el),
      h('div.el-pal', null, pal.map(p => p.b), eraser),
      h('div.el-eff', null,
        h('span', { title: '영기' }, G.T.el('e_water', 'xs'), ' 영기 ', effs.water),
        h('span', { title: '영석' }, G.T.el('e_metal', 'xs'), ' 영석 ', effs.metal),
        h('span', { title: '영초 성장' }, G.T.el('e_wood', 'xs'), ' 영초 ', effs.wood),
        h('span', { title: '연단 속도' }, G.T.el('e_fire', 'xs'), ' 연단 ', effs.fire),
        h('span', { title: '요수 방어 · 천겁 성공률' }, G.T.el('e_earth', 'xs'), ' 방어 ', effs.earth))),
    h('div.card', null, h('div.card-h', null, G.T.el('q_stone', 'cur'), stoneEl, h('small', null, ' 영석'))));

  return G.UI.worldScreen('xianxia', {
    side, hud,
    click(p) {
      const s = x();
      if (X.click(s, p.x, p.y)) return true;
      const i = X.slotAt(s, p.x, p.y);
      if (i < 0) return true;
      if (i >= X.slotCount()) { G.SFX.play('error'); return true; }
      // 직접 놓으면 자동 배치는 꺼진다
      s.autoArr = false;
      X.place(s, i, pick && s.arr[i] !== pick ? pick : null);
      G.SFX.play(pick && s.arr[i] ? 'build' : 'select');
      return true;
    },
    update() {
      const s = x(), rt = X.rt(s), cost = X.breakCost(s.realm), L = X.layout(s);
      setText(hudState, rt.state === 'trib' ? (rt.demons.length ? `심마 ${rt.demons.length}` : '천겁') : STATE[rt.state]);
      setText(hudInfo, ` · +${U.fmt(X.qiRate(s))}/초`);
      setText(realmEl, X.realmName(s.realm));
      setText(nextEl, `→ ${X.realmName(s.realm + 1)}`);
      qi.set(s.qi / cost, `${U.fmt(s.qi)} / ${U.fmt(cost)}`);
      setText(chanceEl, U.pct(Math.max(0, X.breakChance(s) - (rt.state === 'trib' ? rt.penalty : 0))));
      setText(pillEl, s.pills);
      setText(herbEl, s.herbs);
      tog(devEl, 'hidden', s.devT <= 0);
      if (s.devT > 0) setText(devEl, `도심 동요 ${Math.ceil(s.devT)}초 · 영기 30%`);
      breakBtn.disabled = s.qi < cost || rt.state === 'trib';
      tAuto.update(); tArr.update();
      for (const p of pal) { tog(p.b, 'on', pick === p.el); setText(p.v, L.sum[p.el].toFixed(1)); }
      tog(eraser, 'on', pick === null);
      setText(slotEl, ` ${Object.keys(s.arr).filter(i => i < X.slotCount()).length} / ${X.slotCount()}`);
      setText(effs.water, `+${U.fmt(X.qiRate(s))}/초`);
      setText(effs.metal, `+${U.fmt(X.stoneRate(s))}/초`);
      setText(effs.wood, `×${(1 + 0.5 * L.sum.wood).toFixed(1)}`);
      setText(effs.fire, `×${(1 + 0.5 * L.sum.fire).toFixed(1)}`);
      setText(effs.earth, `+${Math.round(Math.min(20, 2 * L.sum.earth))}%`);
      setText(stoneEl, U.fmt(s.stone));
    },
  });
};
