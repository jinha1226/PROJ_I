'use strict';
// 공용 화면: 차원 넥서스(정수 스킬트리), 유물 제단(가차), 차원 붕괴(별 스킬트리)
G.UI.views.nexus = function () {
  const U = G.U;
  const essEl = h('b'), multEl = h('small'), rateEl = h('small');
  const tree = G.UI.tree('nexus', () => G.S.ntree);
  const el = h('section.meta.nexus', null,
    h('div.whead', null, h('div.wtitle', null, G.T.el('ui_nexus', 'wh-icon'), h('div', null, h('div.tag', null, '공용 스킬트리'), h('h1', null, '차원 넥서스')))),
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
    h('div.whead', null, h('div.wtitle', null, G.T.el('ui_altar', 'wh-icon'), h('div', null, h('div.tag', null, '가차'), h('h1', null, '유물 제단')))),
    h('div.card.summon', null,
      h('div', null, h('small', null, '보유 인장'), h('div.huge', null, G.T.el('ui_sign', 'md'), ' ', signEl)),
      h('div.pity', null, h('small', null, '전설 확정까지'), pityBar, pityT),
      h('div.row-btns', null, b1, b10)),
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
  let condEl;
  btn.addEventListener('click', () => {
    if (!G.Prestige.can()) return;
    G.UI.modal('차원 붕괴', `<p>★ +<b>${G.Prestige.gain()}</b></p><p class="dim">세계·트리·정수 초기화 · 유물·인장·별 트리 유지</p>`,
      [{ label: '취소' }, { label: '붕괴시킨다', cls: 'danger', fn: () => { G.Prestige.go(); G.SFX.play('finish'); G.UI.show('prestige'); } }]);
  });
  const tree = G.UI.tree('stars', () => G.S.stree);
  const statsEl = h('div.stats');
  const el = h('section.meta.prestige', null,
    h('div.whead', null, h('div.wtitle', null, G.T.el('ui_prestige', 'wh-icon'), h('div', null, h('div.tag', null, '환생'), h('h1', null, '차원 붕괴')))),
    condEl = h('div.card.pconds'),
    h('div.card.pcard-main', null,
      h('div', null, h('small', null, '이번 회차 정수'), h('div.huge', null, G.T.el('ui_ess', 'md'), ' ', runEl)),
      h('div', null, h('small', null, '얻을 별의 파편'), h('div.huge', null, G.T.el('ui_star', 'md'), ' ', gainEl)),
      btn),
    h('div.wtree', null, tree.el),
    h('h2', null, '기록'),
    statsEl);
  return {
    el,
    update() {
      const S = G.S;
      setText(runEl, U.fmt(S.runEss));
      setText(gainEl, G.Prestige.can() ? G.Prestige.gain() : 0);
      const cs = G.Prestige.conds();
      setText(btn, G.Prestige.can() ? '차원을 붕괴시킨다' : `조건 ${cs.filter(c => c.ok).length} / ${cs.length}`);
      // 세계마다 작은 조건 (연 세계만)
      const ck = cs.map(c => c.id + c.ok + Math.floor(c.v)).join();
      if (condEl._k !== ck) {
        condEl._k = ck;
        condEl.innerHTML = '';
        condEl.append(h('b', null, '붕괴 조건'), h('small.dim', null, ' 판타지·무협은 늘, 나머지는 연 세계만'),
          ...cs.map(c => h('div.pcond' + (c.ok ? '.ok' : ''), null, G.T.el('w_' + c.id, 'xs'), h('span', null, c.n), h('b', null, c.ok ? '✓' : `${U.fmt(c.v)} / ${U.fmt(c.need)}`))));
      }
      btn.disabled = !G.Prestige.can();
      tree.update();
      const st = [['보유 별', U.fmt(S.stars)], ['별 하나당', `+${Math.round((0.1 + G.Tree.add('stars', S.stree, 'starPow')) * 100)}%`], ['붕괴 횟수', S.prestiges], ['이번 회차', U.fmtTime(S.runTime)], ['총 플레이', U.fmtTime(S.playTime)], ['누적 정수', U.fmt(S.totalEss)]];
      if (statsEl.childNodes.length !== st.length) { statsEl.innerHTML = ''; st.forEach(([l]) => statsEl.append(h('div.stat', null, h('small', null, l), h('b')))); }
      st.forEach(([, v], i) => setText(statsEl.childNodes[i].lastChild, v));
    },
  };
};
