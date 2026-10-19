'use strict';
// 공용 화면: 차원 넥서스(정수 스킬트리), 유물 제단(가차), 차원 붕괴(별 스킬트리)
G.UI.views.nexus = function () {
  const U = G.U;
  const essEl = h('b'), multEl = h('small'), rateEl = h('small');
  const tree = G.UI.tree('nexus', () => G.S.ntree);
  const el = h('section.meta.nexus', null,
    h('div.whead', null, h('div.wtitle', null, G.T.el('ui_nexus', 'wh-icon'), h('div', null, h('div.tag', null, '공용 스킬트리'), h('h1', null, '차원 넥서스'))),
      h('p.blurb', null, '다섯 세계는 저마다 다른 방식으로 굴러가지만, 모두 같은 정수를 흘려보낸다. 정수로 새 세계를 열고(순서는 자유), 모든 세계를 함께 키우고, 세계끼리 잇는다.')),
    h('div.card.ess-card', null, h('div', null, h('small', null, '보유 정수'), h('div.huge', null, G.T.el('ui_ess', 'md'), ' ', essEl)), h('div', null, multEl, h('br'), rateEl)),
    h('div.wtree.tall', null, tree.el));
  return {
    el,
    update() {
      const S = G.S;
      setText(essEl, U.fmt(S.ess));
      setText(multEl, `모든 생산 ×${U.fmt(G.globalMult())} · 정수 획득 ×${U.fmt(G.essMult())}`);
      setText(rateEl, `최근 정수 수입 ${U.fmt(S.rates.ess || 0)}/초`);
      tree.update();
    },
  };
};

G.UI.views.altar = function () {
  const S = G.S, U = G.U, D = G.D;
  const signEl = h('b'), pityBar = bar('pity'), pityT = h('small');
  const b1 = h('button.btn.big', { on: { click: () => pull(1) } }), b10 = h('button.btn.big', { on: { click: () => pull(10) } });
  const results = h('div.pulls');
  const coll = h('div.collection');

  function pull(n) {
    const out = G.Relic.summon(n);
    if (!out) { G.SFX.play('error'); return; }
    // 가장 높은 등급에 맞춰 소리를 고른다
    const best = Math.max(...out.map(o => Object.keys(D.RARITY).indexOf(o.relic.r)));
    G.SFX.play(best >= 3 ? 'jackpot' : 'win', { tier: best + 1 });
    results.innerHTML = '';
    out.forEach((o, i) => {
      const R = D.RARITY[o.relic.r];
      const card = h('div.pcard.' + o.relic.r, { style: `--rc:${R.col};animation-delay:${i * 70}ms` },
        G.T.el('rl_' + o.relic.id, 'lg', o.relic.e), h('b', null, o.relic.n), h('small', null, o.isNew ? 'NEW' : `Lv ${o.lv}`));
      results.append(card);
      if (o.relic.r === 'legend') G.UI.toast([G.T.el('rl_' + o.relic.id, 'li'), ` 전설 유물 「${o.relic.n}」`], 'good');
    });
    renderColl();
  }
  function renderColl() {
    coll.innerHTML = '';
    for (const w of [...G.D.WORLDS, { id: 'all', name: '모든 세계' }]) {
      const list = D.RELICS.filter(r => r.w === w.id);
      coll.append(h('div.coll-group', null, h('div.cg-h', null, G.T.el(w.id === 'all' ? 'ui_nexus' : 'w_' + w.id, 'sm'), ' ', w.name),
        h('div.coll-row', null, list.map(r => {
          const lv = S.relics[r.id] || 0, R = D.RARITY[r.r];
          return h('div.relic' + (lv ? '' : '.unowned'), { style: `--rc:${R.col}`, title: `${R.n} · ${r.d} +${r.v * 100}%/레벨` },
            G.T.el('rl_' + r.id, 'md', r.e), h('b', null, lv ? r.n : '???'),
            h('small', null, lv ? `Lv ${lv} · ${r.d} +${Math.round(r.v * lv * 100 * (1 + G.Tree.add('stars', S.stree, 'relicAmp')))}%` : R.n));
        }))));
    }
  }
  renderColl();

  const el = h('section.meta.altar', null,
    h('div.whead', null, h('div.wtitle', null, G.T.el('ui_altar', 'wh-icon'), h('div', null, h('div.tag', null, '가차'), h('h1', null, '유물 제단'))),
      h('p.blurb', null, '고대 인장을 바쳐 다섯 세계의 유물을 불러낸다. 같은 유물이 또 나오면 레벨이 오른다. 인장은 크툴루 복권에서 가장 많이 나오고, 다른 세계의 보스와 돌파에서도 얻는다.')),
    h('div.card.summon', null,
      h('div', null, h('small', null, '보유 인장'), h('div.huge', null, G.T.el('ui_sign', 'md'), ' ', signEl)),
      h('div.pity', null, h('small', null, '전설 확정까지'), pityBar, pityT),
      h('div.row-btns', null, b1, b10),
      h('small.dim', null, Object.values(D.RARITY).map(r => `${r.n} ${Math.round(r.p * 100)}%`).join(' · '))),
    results,
    h('h2', null, '수집품'),
    coll);

  return {
    el,
    update() {
      setText(signEl, U.fmt(S.signs));
      setW(pityBar.fill, S.pity / D.PITY);
      setText(pityT, `${D.PITY - S.pity}회`);
      setText(b1, `1회 소환 · 인장 ${D.SUMMON_COST}`);
      setText(b10, `10회 소환 · 인장 ${D.SUMMON_COST * 10}`);
      b1.disabled = S.signs < D.SUMMON_COST;
      b10.disabled = S.signs < D.SUMMON_COST * 10;
    },
  };
};

G.UI.views.prestige = function () {
  const U = G.U;
  const runEl = h('b'), gainEl = h('b'), btn = h('button.btn.big.danger');
  btn.addEventListener('click', () => {
    if (!G.Prestige.can()) return;
    G.UI.modal('차원 붕괴', `<p>다섯 세계와 각 세계의 스킬트리, 정수, 넥서스 트리가 처음으로 돌아간다.</p><p>별의 파편 <b>${G.Prestige.gain()}</b>개를 얻는다. 유물과 인장, 별 트리는 남는다.</p>`,
      [{ label: '취소' }, { label: '붕괴시킨다', cls: 'danger', fn: () => { G.Prestige.go(); G.SFX.play('finish'); G.UI.show('prestige'); } }]);
  });
  const tree = G.UI.tree('stars', () => G.S.stree);
  const statsEl = h('div.stats');
  const el = h('section.meta.prestige', null,
    h('div.whead', null, h('div.wtitle', null, G.T.el('ui_prestige', 'wh-icon'), h('div', null, h('div.tag', null, '환생'), h('h1', null, '차원 붕괴'))),
      h('p.blurb', null, '균열을 스스로 무너뜨리면 다섯 세계가 처음으로 돌아간다. 이번 회차의 정수가 별의 파편으로 굳고, 파편 하나마다 모든 생산이 영구히 늘어난다. 남은 파편은 별 트리에 쓴다.')),
    h('div.card.pcard-main', null,
      h('div', null, h('small', null, '이번 회차 정수'), h('div.huge', null, G.T.el('ui_ess', 'md'), ' ', runEl)),
      h('div', null, h('small', null, '얻을 별의 파편'), h('div.huge', null, G.T.el('ui_star', 'md'), ' ', gainEl)),
      btn,
      h('small.dim', null, `별의 파편 = ⌊√(이번 회차 정수 ÷ 200)⌋ · 최소 정수 ${U.fmt(G.D.PRESTIGE_MIN)}`)),
    h('div.wtree', null, tree.el),
    h('h2', null, '기록'),
    statsEl);
  return {
    el,
    update() {
      const S = G.S;
      setText(runEl, U.fmt(S.runEss));
      setText(gainEl, G.Prestige.can() ? G.Prestige.gain() : 0);
      setText(btn, G.Prestige.can() ? '차원을 붕괴시킨다' : `정수 ${U.fmt(G.D.PRESTIGE_MIN)} 필요`);
      btn.disabled = !G.Prestige.can();
      tree.update();
      const st = [['보유 별', U.fmt(S.stars)], ['별 하나당', `+${Math.round((0.1 + G.Tree.add('stars', S.stree, 'starPow')) * 100)}%`], ['붕괴 횟수', S.prestiges], ['이번 회차', U.fmtTime(S.runTime)], ['총 플레이', U.fmtTime(S.playTime)], ['누적 정수', U.fmt(S.totalEss)]];
      if (statsEl.childNodes.length !== st.length) { statsEl.innerHTML = ''; st.forEach(([l]) => statsEl.append(h('div.stat', null, h('small', null, l), h('b')))); }
      st.forEach(([, v], i) => setText(statsEl.childNodes[i].lastChild, v));
    },
  };
};
