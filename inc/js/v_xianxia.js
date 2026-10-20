'use strict';
// 수선 화면: 동부 지도가 화면 전체, 그 위에 HUD (판타지·무협과 같은 구성 원리)
//  왼쪽 위: 경지 · 무대 · 상태, 그 아래 영석·단약·영초 / 위 가운데: 영기 막대(다 차면 천겁) + 초당 영기, 아래 한 줄: 총 배율(올리면 내역)
//  왼쪽 가운데: ⚙ 자동(천겁·기준·배치) / 아래 가운데: 오행 진기 줄(고르고 진법 칸을 누른다) + 천겁
//  같은 진기를 다시 누르거나 지우개면 뺀다.
G.UI.views.xianxia = function () {
  const x = () => G.S.w.xianxia, X = G.Xianxia, D = G.D.X, U = G.U;
  const ta = k => G.Tree.add('xianxia', x().tree, k);
  const STATE = { meditate: '좌선', trib: '천겁' };
  let pick = 'water';

  // ── 왼쪽 위: 경지 · 무대 · 상태, 영석·단약·영초
  const realmEl = h('b'), stageEl = h('span.role'), stateEl = h('small'), devEl = h('small.warn');
  const res = G.UI.ov.stats([['stone', 'q_stone', '영석: 스킬트리 포인트'], ['pill', 'q_pill', '단약: 천겁에 쓴다'], ['herb', 'q_herb', '영초: 3개로 단약 1개']]);
  const hud = h('div.fhud', null, h('div.floorrow', null, realmEl, stageEl, stateEl), res.el, devEl);

  // ── 위 가운데: 영기 + 총 배율
  const qi = G.UI.ov.bar('영기: 다 차면 천겁에 도전한다', '초당 영기');
  const mult = G.UI.ov.stats([['qi', 'a_gong', '영기'], ['stone', 'q_stone', '영석'], ['power', 'fx_sword', '도력'], ['chance', 'a_thunder', '천겁 성공률']]);
  const top = h('div.ftop', null, qi.el, mult.el);
  const tipOf = k => X.parts(k).filter(p => Math.abs(p[1] - 1) > 1e-9).map(([n, v]) => `${n} ×${U.fmt(v)}`).join(' · ') || '기본';

  // ── 왼쪽 가운데: ⚙ 자동
  const tAuto = G.UI.toggle('천겁', () => x().autoBreak, v => { x().autoBreak = v; }, '자동 천겁: 성공률이 기준 이상이면 스스로 넘는다');
  const thr = h('select.othr', { on: { change: e => { x().autoThr = +e.target.value; } } },
    [0.25, 0.4, 0.5, 0.6, 0.75, 0.9].map(v => h('option', { value: v, selected: x().autoThr === v }, `≥ ${v * 100}%`)));
  const tArr = G.UI.toggle('배치', () => x().autoArr, v => { x().autoArr = v; if (v) X.autoArrange(x()); }, '자동 배치: 상생 사슬로 깐다 (직접 놓으면 꺼진다)');
  const autoPop = h('div.fpop.lpop.hidden', null, h('div.card-h', null, h('b', null, '자동')), h('div.tgls', null, tAuto.el, thr, tArr.el));
  let autoOpen = false;
  const autoBtn = h('button.fbtn.pbtn', { 'data-tip': '자동', on: { click: e => { e.stopPropagation(); autoOpen = !autoOpen; tog(autoPop, 'hidden', !autoOpen); tog(autoBtn, 'on', autoOpen); } } }, '⚙');
  const left = h('div.fleft', null, h('div.pf-top', null, autoBtn, autoPop));

  // ── 아래 가운데: 오행 진기 줄 + 천겁. 진기마다 총 출력과 효과
  const EFF = { water: '영기', metal: '영석', wood: '영초 성장', fire: '연단 속도', earth: '요수 방어 · 천겁 성공률' };
  const pal = D.els.map(el => {
    const v = h('b'), eff = h('small');
    const b = h('button.el-pick.ovp', { 'data-tip': `${D.el[el].n} · ${EFF[el]}`, style: `--ec:${D.el[el].col}`, on: { click: () => { pick = el; } } },
      G.T.el(D.el[el].t, 'md'), h('span', null, v, eff));
    return { el, b, v, eff };
  });
  const eraser = h('button.el-pick.erase.ovp', { 'data-tip': '빼기', on: { click: () => { pick = null; } } }, '✕');
  const slotEl = h('small.slots');
  const breakBtn = h('button.btn.big.tribbtn', { on: { click: () => X.breakthrough(x()) } }, '천겁');
  const act = h('div.oact.xxbar', null, h('div.xxpal', null, slotEl, pal.map(p => p.b), eraser), breakBtn);

  // 천겁 돌파·실패·등선 배너 (무협 경지 돌파와 같은 판: 경지가 높을수록 화려하게)
  const rfx = h('div.realmfx.hidden');
  let rfxT = 0;
  const COL = ['#ffffff', '#e8e2d0', '#9fe0ff', '#9fffd8', '#ffd24a', '#c78bff', '#ff9a5a', '#7dffcf', '#bfe8ff', '#ffffff'];
  const banner = (cls, col, small, big, ms) => {
    if (G.UI.cur !== 'xianxia') return;
    rfx.className = 'realmfx ' + cls;
    rfx.style.setProperty('--rc', col);
    rfx.innerHTML = '';
    rfx.append(h('div.rays'), h('div.rglow'), h('div.rtext', null, h('small', null, small), h('b', null, big)));
    clearTimeout(rfxT);
    rfxT = setTimeout(() => rfx.classList.add('hidden'), ms);
  };
  G.on('xx_realm', e => {
    if (e.asc) banner('lv7 asc', '#ffffff', '천겁을 넘어 신선이 되다', '등선', 6000);
    else banner('lv' + Math.min(6, Math.floor(e.r * 0.7)), COL[Math.min(9, e.r)] || '#ffe08a', e.stage ? `천겁 돌파 · ${X.stageName(x())}` : '천겁 돌파', X.realmName(e.r), 2000 + Math.min(9, e.r) * 300);
  });
  G.on('xx_fail', () => banner('lv0 fail', '#ff6a6a', '천겁 실패 · 영기가 흩어졌다', '실패', 1800));
  const overlay = h('div.fover', null, hud, top, left, act, rfx);
  return G.UI.worldScreen('xianxia', {
    overlay,
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
      setText(realmEl, X.realmName(s.realm));
      setText(stageEl, X.stageName(s) + (s.ascended ? ' · 등선' : ''));
      setText(stateEl, ` · ${rt.state === 'trib' ? (rt.demons.length ? `심마 ${rt.demons.length}` : '천겁') : STATE[rt.state]} → ${X.realmName(s.realm + 1)}`);
      setText(devEl, s.devT > 0 ? `도심 동요 ${Math.ceil(s.devT)}초 · 영기 30%` : '');
      res.set('stone', U.fmt(s.stone));
      res.set('pill', `${s.pills} (천겁에 ${X.pillUse()})`);
      res.set('herb', s.herbs);
      tAuto.update(); tArr.update();
      qi.set(s.qi / cost, `${U.fmt(s.qi)} / ${U.fmt(cost)}`, `+${U.fmt(X.qiRate(s))}/초`);
      for (const k of ['qi', 'stone', 'power']) { mult.set(k, `×${U.fmt(X.sum(X.parts(k)))}`); mult.tip(k, `${{ qi: '영기', stone: '영석', power: '도력' }[k]} — ${tipOf(k)}`); }
      const ch = Math.max(0, X.breakChance(s) - (rt.state === 'trib' ? rt.penalty : 0)), used = Math.min(X.pillUse(), s.pills);
      mult.set('chance', U.pct(ch));
      mult.tip('chance', `천겁 성공률 — 기본 ${U.pct(Math.max(0.2, 0.62 - 0.04 * s.realm))} · 단약 ${used}개 +${U.pct((0.08 + ta('pillPow')) * used)} · 토 진기 +${U.pct(Math.min(0.15, 0.015 * L.sum.earth))} · 트리 +${U.pct(ta('trib'))} (최대 95%) · 실패하면 그 경지의 영기를 처음부터`);
      breakBtn.disabled = s.qi < cost || rt.state === 'trib';
      tog(breakBtn, 'ready', !breakBtn.disabled);
      const effTxt = { water: `+${U.fmt(X.qiRate(s))}/초`, metal: `+${U.fmt(X.stoneRate(s))}/초`, wood: `×${(1 + 0.5 * L.sum.wood).toFixed(1)}`, fire: `×${(1 + 0.5 * L.sum.fire).toFixed(1)}`, earth: `+${Math.round(Math.min(15, 1.5 * L.sum.earth))}%` };
      for (const p of pal) { tog(p.b, 'on', pick === p.el); setText(p.v, L.sum[p.el].toFixed(1)); setText(p.eff, ` ${effTxt[p.el]}`); }
      tog(eraser, 'on', pick === null);
      setText(slotEl, `진법 ${Object.keys(s.arr).filter(i => i < X.slotCount()).length}/${X.slotCount()}`);
    },
  });
};
