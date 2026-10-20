'use strict';
// 수선 화면: 동부 지도가 화면 전체, 그 위에 HUD (판타지·무협과 같은 구성 원리)
//  왼쪽 위: 경지 · 무대 · 상태, 그 아래 영석·단약·영초 / 위 가운데: 영기 막대(다 차면 천겁) + 초당 영기, 아래 한 줄: 총 배율(올리면 내역)
//  왼쪽 가운데: ⚙ 자동(천겁·기준·배치)·초기화 / 아래 가운데: 오행 진기 줄(고르고 진법 칸을 누른다) + 천겁
//  오른쪽: 진법 설계 패널(Factorio 생산 통계처럼) — 효율·연결·영맥·오행별 출력·자동 대비, 켜 두면 맵 위 진기마다 출력
//  같은 진기를 다시 누르거나 지우개면 뺀다.
G.UI.views.xianxia = function () {
  const x = () => G.S.w.xianxia, X = G.Xianxia, D = G.D.X, U = G.U;
  const ta = k => G.Tree.add('xianxia', x().tree, k);
  const STATE = { meditate: '좌선', trib: '천겁' };
  let pick = 'water';

  // ── 왼쪽 위: 경지 · 무대 · 상태, 영석·단약·영초
  const realmEl = h('b'), stageEl = h('span.role'), stateEl = h('small'), devEl = h('small.warn');
  const res = G.UI.ov.stats([['stone', 'q_stone', '영석: 스킬트리 포인트'], ['pill', 'q_pill', '단약: 천겁에 쓴다'], ['herb', 'q_herb', '영초: 3개로 단약 1개']]);
  // 영초·연단 쿨타임
  // 영초·연단 쿨타임 (두 줄): 영초 한 개 나오는 주기, 단약 한 개 (영초 3개)
  const herbBar = bar('xp'), herbTxt = h('small'), alchBar = bar('xp'), alchTxt = h('small');
  const cds = h('div.xcds', null,
    h('div.xcd', { 'data-tip': '영초: 밭에서 저절로 거둔다 (목 진기·트리·제자로 빨라진다)' }, G.T.el('q_herb', 'xs'), h('span', null, '영초'), herbBar, herbTxt),
    h('div.xcd', { 'data-tip': '연단: 영초 3개로 단약 1개 (화 진기·트리로 빨라진다)' }, G.T.el('q_furnace', 'xs'), h('span', null, '단약'), alchBar, alchTxt));
  const neckEl = h('small.neck');
  const hud = h('div.fhud', null, h('div.floorrow', null, realmEl, stageEl, stateEl), res.el, cds, devEl, neckEl);

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
  const resetBtn = h('button.btn.sm.danger', { on: { click: () => { if (confirm('수선만 처음(연기)부터 다시 시작할까요? 다른 세계는 그대로입니다.')) { X.resetWorld(); G.UI.show('xianxia'); } } } }, '수선 처음부터');
  // 테스트: 유물·넥서스(차원 배율·시너지)를 수선에서만 끈다
  const tRelic = G.UI.toggle('유물', () => !x().noRelic, v => { x().noRelic = !v; }, '유물 효과 (끄면 수선에서만 뺀다)');
  const tNexus = G.UI.toggle('넥서스', () => !x().noNexus, v => { x().noNexus = !v; }, '차원 넥서스·별·시너지 효과 (끄면 수선에서만 뺀다)');
  const autoPop = h('div.fpop.lpop.hidden', null, h('div.card-h', null, h('b', null, '자동')), h('div.tgls', null, tAuto.el, thr, tArr.el),
    h('div.card-h', null, h('b', null, '테스트')), h('div.tgls', null, tRelic.el, tNexus.el, resetBtn));
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
    else if (!e.stage) banner('lv' + Math.min(6, Math.floor(e.r * 0.7)), COL[Math.min(9, e.r)] || '#ffe08a', `천겁 돌파 · ${X.realmLore(e.r)}`, X.realmName(e.r), 2000 + Math.min(9, e.r) * 300);
  });
  // 무대가 오를 때: 구름을 뚫고 올라가는 장면 — 구름이 아래로 흘러 지나가고, 새 무대 이름과 한 줄
  const sfx = h('div.stagefx.hidden');
  let sfxT = 0;
  G.on('xx_stage', e => {
    if (G.UI.cur !== 'xianxia') return;
    const st = D.stages[e.stage], r = x().realm;
    sfx.className = 'stagefx s' + e.stage;
    sfx.innerHTML = '';
    sfx.append(h('div.clouds.c1'), h('div.clouds.c2'), h('div.clouds.c3'),
      h('div.stitle', null, h('small', null, `${X.realmName(r)} · ${X.realmLore(r)}`), h('b', null, st.n), h('span', null, st.lore)));
    clearTimeout(sfxT);
    sfxT = setTimeout(() => sfx.classList.add('hidden'), 4200);
    G.SFX.play('finish');
  });
  G.on('xx_fail', () => banner('lv0 fail', '#ff6a6a', '천겁 실패 · 영기가 흩어졌다', '실패', 1800));
  // 오행 상생(바깥 고리 화살표)·상극(안쪽 별 붉은 선) 그림
  const WHEEL = (() => {
    const pts = D.els.map((el, k) => { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; return [60 + Math.cos(a) * 42, 55 + Math.sin(a) * 42, el]; });
    let s2 = '<svg viewBox="0 0 120 110" width="150">';
    s2 += '<defs><marker id="xa" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#ffe08a"/></marker></defs>';
    for (let k = 0; k < 5; k++) { const [x1, y1] = pts[k], [x2, y2] = pts[(k + 2) % 5]; s2 += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ff5050" stroke-width="1" stroke-dasharray="3 2" opacity=".7"/>`; }
    for (let k = 0; k < 5; k++) { const [x1, y1] = pts[k], [x2, y2] = pts[(k + 1) % 5], f = 0.78; s2 += `<line x1="${x1 + (x2 - x1) * 0.22}" y1="${y1 + (y2 - y1) * 0.22}" x2="${x1 + (x2 - x1) * f}" y2="${y1 + (y2 - y1) * f}" stroke="#ffe08a" stroke-width="1.6" marker-end="url(#xa)"/>`; }
    for (const [px, py, el] of pts) s2 += `<circle cx="${px}" cy="${py}" r="10" fill="#000" stroke="${D.el[el].col}" stroke-width="2"/><text x="${px}" y="${py + 4}" text-anchor="middle" fill="${D.el[el].col}" font-size="11" font-weight="800">${D.el[el].n}</text>`;
    return s2 + '</svg>';
  })();
  // ── 오른쪽: 진법 설계 패널
  const dz = {};
  const drow = (k, label) => { dz[k] = h('b'); return h('div.drow', null, h('span', null, label), dz[k]); };
  const elRows = D.els.map(el => {
    const b = bar('xp'), v = h('b'), c = h('small');
    b.fill.style.background = D.el[el].col;
    return { el, b, v, c, row: h('div.delr', null, G.T.el(D.el[el].t, 'xs'), c, b, v) };
  });
  const cmp = h('div.dcmp');
  // 천겁 진법(청사진 한 장): 천겁이 시작되면 이 진법으로 바꿔 깔고, 끝나면 원래대로
  const tribTxt = h('small');
  const saveBtn = h('button.btn.sm', { 'data-tip': '지금 깔린 진법을 천겁용으로 저장 (토·화 위주로 깔아 두고 누르면 좋다)', on: { click: () => { X.saveTrib(x()); G.SFX.play('select'); } } }, '저장');
  const clearBtn = h('button.btn.sm', { on: { click: () => { X.clearTrib(x()); } } }, '지우기');
  const design = h('div.xdesign.hidden', null,
    h('div.card-h', null, h('b', null, '진법 설계'), h('span.sp'), h('small.dim', null, '맵 위 숫자 = 진기 출력')),
    drow('total', '총 출력'), drow('eff', '진기당 효율'), drow('gen', '상생 연결'), drow('over', '상극 연결'), drow('vein', '영맥 사용'),
    h('div.dsub', null, '오행별 출력 · 효과'), ...elRows.map(r => r.row),
    h('div.dsub', null, '자동 배치 대비'), cmp,
    h('div.dsub', null, '천겁 진법'), h('div.tribbp', null, tribTxt, h('span.sp'), saveBtn, clearBtn),
    h('div.dsub', null, '규칙'), h('div.wheel', { html: WHEEL }),
    h('small.dim.dhelp', null, '화살표 방향으로 이웃하면 받는 쪽 +50% (맵의 금빛 화살표) · 붉은 ✕ 상극 이웃은 -40% · 영맥 칸 위 ×2 · 진기 순서가 곧 사슬'));
  const designBtn = h('button.fbtn.dbtn', { 'data-tip': '진법 설계', on: { click: e => { e.stopPropagation(); X.showNums = !X.showNums; tog(design, 'hidden', !X.showNums); tog(designBtn, 'on', X.showNums); } } }, '📐');
  // 올리기: 진법 칸·영맥 위 설명 (진기면 출력 내역)
  const hov = h('div.xhov.hidden');
  const NAME = el => D.el[el].n;
  const hover = p => {
    const s = x();
    if (!p) return tog(hov, 'hidden', true);
    const rt = X.rt(s), i = rt.at[Math.round(p.x) + ',' + Math.round(p.y)];
    if (i == null) return tog(hov, 'hidden', true);
    const sl = rt.slots[i], n = X.slotCount(), vm = 2 + ta('vein');
    const lines = [];
    if (i >= n) lines.push(`🔒 잠긴 진법 칸 (${i + 1}번째로 열린다 · 지금 ${n}칸)`);
    if (sl.vein) lines.push(`영맥: 여기 놓은 진기 출력 ×${vm}`);
    const pp = X.layout(s).per.find(q => q.i === i);
    if (pp) lines.push(`${NAME(pp.el)} 진기 · 출력 ${pp.out.toFixed(2)} = ${sl.vein ? `영맥 ×${vm} · ` : ''}상생 ${pp.g} (+${Math.round((0.5 + ta('gen')) * 100)}%씩) · 상극 ${pp.o} (-40%씩) · 경맥 ×${X.elMult(pp.el).toFixed(2)}`,
      `이 진기를 키우는 이웃: ${NAME(X.gen[pp.el])} · 약하게 하는 이웃: ${NAME(X.over[pp.el])}`);
    else if (i < n) lines.push('빈 진법 칸 · 아래 줄에서 오행을 고르고 누른다');
    hov.innerHTML = '';
    for (const l of lines) hov.append(h('div', null, l));
    tog(hov, 'hidden', false);
  };
  const overlay = h('div.fover', null, hud, top, left, act, rfx, design, designBtn, hov, sfx);
  return G.UI.worldScreen('xianxia', {
    overlay, hover,
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
      realmEl.dataset.tip = X.realmLore(s.realm);
      stageEl.dataset.tip = D.stages[X.stageOf(s.realm)].lore;
      setText(stageEl, X.stageName(s) + (s.ascended ? ' · 등선' : ''));
      setText(stateEl, ` · ${rt.state === 'trib' ? (rt.demons.length ? `심마 ${rt.demons.length}` : '천겁') : STATE[rt.state]} → ${X.realmName(s.realm + 1)}`);
      setText(devEl, s.devT > 0 ? `도심 동요 ${Math.ceil(s.devT)}초 · 영기 30%` : '');
      res.set('stone', U.fmt(s.stone));
      res.set('pill', `${s.pills} (천겁에 ${X.pillUse()})`);
      res.set('herb', s.herbs);
      tAuto.update(); tArr.update(); tRelic.update(); tNexus.update();
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
      // 쿨타임: 영초(가장 빠른 밭), 연단
      setW(herbBar.fill, rt.herbClock || 0);
      setText(herbTxt, ` ${X.herbEvery(s, L).toFixed(1)}초마다`);
      setW(alchBar.fill, s.herbs >= 3 ? rt.alchT / X.ALCH_T : 0);
      setText(alchTxt, s.herbs >= 3 ? ` ${X.alchEvery(s, L).toFixed(1)}초마다` : ` 영초 ${s.herbs}/3`);
      // 첫 천겁 안내: 영기가 80% 차고 천겁 진법이 없으면 📐 → 저장을 반짝여 짚는다 (저장하면 끝, 막지는 않는다)
      const tut = s.realm === 0 && !s.arrTrib && !s.tutTrib && s.qi >= cost * 0.8;
      if (s.arrTrib && !s.tutTrib) s.tutTrib = 1;
      tog(designBtn, 'coach', tut && !X.showNums);
      tog(saveBtn, 'coach', tut && X.showNums);
      const nk = tut ? '첫 천겁 전에: 토·화 위주로 깔고 📐 → 천겁 진법 저장' : X.bottleneck(s);
      setText(neckEl, nk ? `${tut ? '안내' : '병목'} · ${nk}` : '');
      // 진법 설계
      if (X.showNums) {
        setText(tribTxt, s.arrTrib ? `저장됨 · 진기 ${Object.keys(s.arrTrib).length}개` : '없음 · 지금 진법을 저장');
        clearBtn.disabled = !s.arrTrib;
        const sc = X.score(s, L), auto = X.score(s, X.layoutOf(s, X.autoArr(s), rt, true)), mine = X.score(s, X.layoutOf(s, s.arr, rt, true));
        setText(dz.total, sc.total.toFixed(1));
        setText(dz.eff, `×${sc.eff.toFixed(2)}`);
        setText(dz.gen, sc.gen);
        setText(dz.over, sc.over);
        const allV = rt.slots.filter(q => q.vein).length;
        setText(dz.vein, `${sc.veinUse} / 열린 ${sc.veinN} · 맵 ${allV}`);
        const maxv = Math.max(1, ...D.els.map(e => L.sum[e]));
        const cnt = {};
        for (const p of L.per) cnt[p.el] = (cnt[p.el] || 0) + 1;
        for (const r of elRows) { setW(r.b.fill, L.sum[r.el] / maxv); setText(r.v, `${L.sum[r.el].toFixed(1)} → ${effTxt[r.el]}`); setText(r.c, ` ${cnt[r.el] || 0}`); }
        const d = auto.total ? mine.total / auto.total - 1 : 0;
        setText(cmp, `내 진법 ${mine.total.toFixed(1)} · 자동 ${auto.total.toFixed(1)} → ${d >= 0 ? '+' : ''}${Math.round(d * 100)}%  (영맥 ${mine.veinUse} vs ${auto.veinUse})`);
        tog(cmp, 'up', d > 0.005); tog(cmp, 'down', d < -0.005);
      }
    },
  });
};
