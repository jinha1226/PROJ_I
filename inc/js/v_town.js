'use strict';
// 마을 화면 (DESIGN.md 35): 원정 사이에는 던전 대신 이 화면이 맵 자리를 채운다 — 길드 관리의 본거지.
// 틀(Eslabong·던전 세틀러즈): 윗막대(길드 · 원정 진행 · 출발점 칸 · 재화) / 탭 / 내용(카드·표) / 아랫막대(자동 출발 · 출발 · 소식)
// 탭: 원정대(출전 카드 + 출발층·귀환 방침) · 명단 · 선술집 · 라이벌 · 트리 · 기록. 글은 이름표와 숫자만.
G.UI.fantasyTown = function () {
  const f = () => G.S.w.fantasy, F = G.Fantasy, D = G.D.F, U = G.U, EX = G.Exp, GD = G.Guild, QK = G.Quirk, TK = G.Trinket, D_TK = G.D.TRINKETS;
  const RS = G.Rivals.STANCES, ORDER = Object.keys(RS), RT = EX.RETREAT;
  const WHY = { wipe: '전멸', full: '짐 가득', retreat: '방침 귀환', careful: '신중 귀환', manual: '귀환' };
  // 스킬 넷 (DESIGN.md 43): 안 열린 칸은 흐리게(툴팁에 열리는 레벨) · ★ = 스킬 레벨(용병 레벨로 자동) · 상위 직업 스킬(sig)은 보랏빛 테두리로 뒤에
  const skillEls = m => h('div.tw-sks', null, (m.skills || []).map((k, i) => { const S = G.D.MSKILLS[k], lv = GD.slotLv(i), off = m.lv < lv; return h('span.tw-sk' + (off ? '.off' : ''), { 'data-tip': `${S.n} · ${S.d} · ${S.cool}초${off ? ` · Lv ${lv}` : ''}` }, G.T.el(S.t, 'xs'), h('small', null, S.n)); }),
    h('b.tw-slv', { 'data-tip': '스킬 레벨' }, '★' + GD.skillLv(m)),
    (m.adv ? G.D.ADV[m.adv].sig : []).map(k => { const S = G.D.MSKILLS[k]; return h('span.tw-sk.sig', { 'data-tip': `${S.n} · ${S.d}` }, G.T.el(S.t, 'xs'), h('small', null, S.n)); }));
  const mchip = m => { const d = GD.def(m); return h('span.chip', { style: `--cc:${d.col}` }, d.n); };
  // 전직 수치: 배율 · 몸 수치 · 얻는 스킬 (이름표와 숫자만)
  const pct = v => `${v > 1 ? '+' : ''}${Math.round((v - 1) * 100)}%`;
  function advTip(A) {
    const o = [], d = A.def || {};
    if (A.atk) o.push(`공격 ${pct(A.atk)}`);
    if (A.hp) o.push(`체력 ${pct(A.hp)}`);
    if (A.cd) o.push(`공격 간격 ${pct(A.cd)}`);
    if (A.heal) o.push(`치유 ${pct(A.heal)}`);
    if (d.heal === 0) o.push('치유 없음');
    if (d.range) o.push(`사거리 ${d.range}`);
    if (d.splash === 0) o.push('단일');
    else if (d.splash) o.push(`범위 ${d.splash}`);
    if (d.chain) o.push(`연쇄 ${d.chain}`);
    return o.concat(A.sig.map(k => G.D.MSKILLS[k].n)).join(' · ');
  }
  const promoEls = (s, m) => {
    if (!GD.canPromote(m)) return null;
    const c = GD.promoCost(s, m);
    return h('div.tw-promo', null, GD.advs(m.cls).map(k => h('button.tw-act.promo', { disabled: s.gold < c, 'data-tip': advTip(G.D.ADV[k]), on: { click: () => { GD.promote(s, m, k); keys.party = keys.roster = ''; } } },
      G.T.el(G.D.ADV[k].t + (m.look ? '_c' + m.look : ''), 'xs'), h('b', null, G.D.ADV[k].n), h('small', null, U.fmt(c)))));
  };
  // 카드 다시 그리기 열쇠: 레벨 · 부상 · 전직 · 전직 가능(금고)
  const mkey = (s, m) => `${m.uid}${m.traits.length}${TK.worn(s, m.uid).map(t => t.k + t.g).join('')}${m.lv}${m.inj > 0 ? 'i' : ''}${m.adv || ''}${GD.canPromote(m) && s.gold >= GD.promoCost(s, m) ? 'p' : ''}`;
  // 성격 (DESIGN.md 42): 기호 + 이름, 특성보다 앞에
  const persEls = m => (m.pers || []).map(k => { const P = G.D.PERSONA[k]; return h('span.gtr.pers', { 'data-tip': `${P.n} · ${P.d}` }, G.T.el('ni_' + P.ic, 'xs'), h('small', null, P.n)); });
  // 기벽 (DESIGN.md 44): 아이콘만 한 줄 — 긍정 먼저, 부정은 붉게, 굳은 것은 자물쇠
  const qEl = (m, k, extra) => { const Q = QK.def(k), lk = QK.locked(m, k); return h('span.gq' + (Q.bad ? '.bad' : '') + (lk ? '.lock' : ''), { 'data-tip': `${Q.n} · ${Q.d}${lk ? ' · 굳음' : ''}` }, Q.ic, extra || null); };
  const qOrder = m => m.traits.slice().sort((a, b) => QK.bad(a) - QK.bad(b));
  // 장신구 (DESIGN.md 45): 아이콘 + ★등급, 희귀도 테두리
  const tkTip = t => `${D_TK[t.k].n}${t.g > 1 ? ' ★' + t.g : ''} · ${D_TK[t.k].d}`;
  const tkEl = (t, tag = 'span') => h(tag + '.gt.r' + D_TK[t.k].r, { 'data-tip': tkTip(t) }, D_TK[t.k].ic, t.g > 1 ? h('i', null, '★'.repeat(t.g - 1)) : null);
  const tkEls = (s, m) => { const w = TK.worn(s, m.uid); return h('div.tw-tks', null, [0, 1].map(i => w[i] ? tkEl(w[i]) : h('span.gt.empty'))); };
  const traitEls = m => persEls(m).concat(m.traits.length ? [h('span.gqs', null, qOrder(m).map(k => qEl(m, k)))] : []);

  // ── 윗막대
  const runsEl = h('small'), seasonEl = h('b.tw-season'), stripEl = h('div.tw-strip'), goldEl = h('b'), fameEl = h('b'), essEl = h('b'), signEl = h('b');
  const topEl = h('div.tw-top', null,
    h('div.tw-id', null, G.T.el('u_legend', 'md'), h('div', null, h('b', null, '길드'), runsEl)),
    h('div.tw-prog', null, seasonEl, stripEl),
    h('div.tw-res', null,
      h('span', { 'data-tip': '금고' }, G.T.el('ui_gold', 'xs'), goldEl),
      h('span', { 'data-tip': '명성' }, G.T.el('u_legend', 'xs'), fameEl),
      h('span', { 'data-tip': '정수' }, G.T.el('ui_ess', 'xs'), essEl),
      h('span', { 'data-tip': '인장' }, G.T.el('ui_sign', 'xs'), signEl)));
  // 출발점 칸: 1층 ~ 최고층+2. ◆ 보스, 금빛 = 출발층, 누르면 그 체크포인트에서 출발
  let stripKey = '';
  function drawStrip(s) {
    const top = Math.max(s.maxFloor + 2, 6), starts = EX.starts(s), key = [top, s.start, s.checkpoint, s.maxFloor, Object.values(G.Season.st(s).cov).map(v => Math.round(v * 20)).join('')].join();
    if (key === stripKey) return;
    stripKey = key;
    stripEl.innerHTML = '';
    for (let fl = 1; fl <= top; fl++) {
      const can = starts.includes(fl), boss = F.isBoss(fl);
      const cov = G.Season.coverage(s, fl);
      stripEl.append(h('button.tw-cell' + (boss ? '.boss' : '') + (fl === (s.start || 1) ? '.start' : '') + (fl > s.maxFloor ? '.fog' : '') + (can ? '.can' : ''),
        { disabled: !can, style: `--cov:${cov}`, 'data-tip': `${fl}층${boss ? ' · 보스' : ''}${can ? ' · 출발점' : ''} · 탐사 ${Math.round(cov * 100)}%`, on: { click: () => { s.start = fl; s.startAuto = fl === starts[starts.length - 1]; stripKey = ''; } } }, boss ? '◆' : can ? fl : ''));
    }
  }

  // ── 탭
  const TABS = [['party', '원정대'], ['roster', '명단'], ['tavern', '선술집'], ['san', '요양소'], ['trink', '장신구'], ['rival', '라이벌'], ['tree', '트리'], ['fame', '명성'], ['log', '기록']];
  let tab = 'party';
  const tabBtns = {}, panes = {};
  const tabEl = h('div.tw-tabs', null, TABS.map(([k, n]) => (tabBtns[k] = h('button.tw-tab', { on: { click: () => setTab(k) } }, n))));
  function setTab(k) {
    tab = k;
    for (const [id] of TABS) { tog(tabBtns[id], 'on', id === k); tog(panes[id], 'hidden', id !== k); }
    keys[k] = '';
    if (k === 'tree') tree.center();
    if (k === 'fame') fameTree.center();
  }
  const keys = {};

  // ── 원정대: 출전 카드 줄 + 오른쪽 계획(지난 원정 · 출발층 · 귀환 방침 · 자동)
  const lineEl = h('div.tw-line'), benchEl = h('div.tw-line.bench'), lastEl = h('div.tw-last'), planStart = h('b'), comboEl = h('div.tw-combos'), bondEl = h('div.tw-combos');
  const rtBtns = {};
  const tGo = G.UI.toggle('자동 출발', () => f().autoGo !== false, v => { f().autoGo = v; });
  const tFull = G.UI.toggle('짐 가득 → 보스 후 귀환', () => f().fullHome !== false, v => { f().fullHome = v; });
  const tAuto = G.UI.toggle('자동 편성', () => f().autoParty !== false, v => { F.setAuto(f(), v); keys.party = ''; });
  const tDirect = G.UI.toggle('아는 층 직행', () => f().direct !== false, v => { f().direct = v; });
  panes.party = h('div.tw-pane.p-party', null,
    h('div.tw-col', null, h('div.tw-h', null, h('b', null, '출전'), h('span.sp'), tAuto.el), lineEl, h('div.tw-h', null, h('b', null, '대기')), benchEl),
    h('div.tw-side', null,
      h('div.tw-box', null, h('div.tw-h', null, h('b', null, '지난 원정')), lastEl),
      h('div.tw-box', null, h('div.tw-h', null, h('b', null, '연계기')), comboEl),
      h('div.tw-box', null, h('div.tw-h', null, h('b', null, '관계')), bondEl),
      h('div.tw-box', null, h('div.tw-h', null, h('b', null, '출발층')), h('div.tw-row', null,
        h('button.fbtn', { on: { click: () => EX.pickStart(f(), -1) } }, '◀'), planStart, h('button.fbtn', { on: { click: () => EX.pickStart(f(), 1) } }, '▶'))),
      h('div.tw-box', null, h('div.tw-h', null, h('b', null, '귀환 방침')), h('div.tw-opts', null, Object.keys(RT).map(k => (rtBtns[k] = h('button.tw-opt', { on: { click: () => { f().retreat = k; } } }, RT[k].n))))),
      h('div.tw-box', null, tGo.el, tFull.el, tDirect.el)));
  function heroCard(s) {
    return h('div.tw-card.lead', null, G.T.el('knight', 'tw-img'), h('b', null, '기사'), h('span.chip', { style: '--cc:#c9a26a' }, '길드장'),
      h('small', null, `⚔ ${U.fmt(F.heroAtk(s))} · ❤ ${U.fmt(F.heroHP(s))}`));
  }
  function mercCard(s, m, actions) {
    const def = GD.def(m), xp = bar(); setW(xp.fill, m.xp / GD.need(m.lv));
    const st = m.inj > 0 ? h('small.tw-st.hurt', null, `부상 ${Math.ceil(m.inj)}초`) : null;
    return h('div.tw-card' + (m.inj > 0 ? '.hurt' : ''), { 'data-uid': m.uid }, h('b.tw-lv', null, `Lv ${m.lv}`), G.T.el(GD.tile(m), 'tw-img'), h('b', null, m.name), mchip(m), xp,
      h('div.tw-trs', null, ...traitEls(m)), s.mercs.includes(m) ? tkEls(s, m) : null, skillEls(m), promoEls(s, m), st, m.from ? h('small.tw-from', { style: `color:${G.D.RIVALS.find(d => d.id === m.from)?.col}` }, `전 ${G.D.RIVALS.find(d => d.id === m.from)?.n}`) : null, actions || null);
  }
  function drawParty(s) {
    const line = F.lineup(s), key = [line.join(), F.slots(), s.mercs.map(m => mkey(s, m)).join(), s.autoParty, G.Bond.pairs(s, line.map(u => GD.get(s, u)).filter(Boolean)).map(p => p.r).join()].join('|');
    if (key !== keys.party) {
      keys.party = key;
      lineEl.innerHTML = '';
      lineEl.append(heroCard(s));
      for (let i = 0; i < F.slots(); i++) {
        const m = line[i] != null && GD.get(s, line[i]);
        if (m) lineEl.append(mercCard(s, m, h('button.tw-act', { on: { click: () => { F.toggleMember(s, m.uid); keys.party = ''; } } }, '대기')));
        else lineEl.append(h('button.tw-card.empty', { on: { click: () => setTab('roster') } }, h('b', null, '+'), h('small', null, '빈 칸')));
      }
      // 대기: 출전하지 않은 명단 (부상 포함). 빈 출전 칸이 있으면 눌러서 출전
      benchEl.innerHTML = '';
      const bench = s.mercs.filter(m => !line.includes(m.uid));
      if (!bench.length) benchEl.append(h('div.g-empty', null, '—'));
      for (const m of bench) benchEl.append(mercCard(s, m, h('button.tw-act', { disabled: m.inj > 0 || line.length >= F.slots(), on: { click: () => { F.toggleMember(s, m.uid); keys.party = ''; } } }, '출전')));
      // 이 편성으로 나갈 수 있는 연계기 (DESIGN.md 43). 트리에서 아직 안 연 것은 흐리게
      comboEl.innerHTML = '';
      const cbs = G.Combo.possible(line.map(u => GD.get(s, u)).filter(Boolean)).sort((a, b) => b.open - a.open);
      if (!cbs.length) comboEl.append(h('div.g-empty', null, '—'));
      // 관계 (DESIGN.md 46): 이 편성의 전우 · 앙숙
      bondEl.innerHTML = '';
      const prs = G.Bond.pairs(s, line.map(u => GD.get(s, u)).filter(Boolean));
      if (!prs.length) bondEl.append(h('div.g-empty', null, '—'));
      for (const p of prs) bondEl.append(h('span.tw-cb.' + p.r, { 'data-tip': p.r === 'friend' ? '전우 · 붙어 다님 · 대신 맞음 · 연계기 쿨다운 ×0.6 · 피해 ×1.3' : '앙숙 · 서로 연계기를 잇지 않음' }, G.T.el(p.r === 'friend' ? 'rl_heart' : 'ni_pe_hot', 'xs'), `${p.a.name} · ${p.b.name}`));
      for (const { cb, open } of cbs) comboEl.append(h('span.tw-cb' + (open ? '' : '.off'), { 'data-tip': open ? cb.n : `${cb.n} · 트리` }, G.T.el('u_' + (cb.cls || 'bard'), 'xs'), cb.n));
    }
    const L = s.last;
    setText(lastEl, !L || L.why === 'start' ? '—' : `${L.floor}층 · ${WHY[L.why] || '귀환'}${L.who ? ` (${L.who})` : ''} · +${U.fmt(L.got)}${L.lost ? ` · -${U.fmt(L.lost)}` : ''}`);
    tog(lastEl, 'bad', !!L && L.why === 'wipe');
    setText(planStart, ` ${s.start || 1}층 `);
    for (const k in rtBtns) tog(rtBtns[k], 'on', (s.retreat || 'hp30') === k);
    tGo.update(); tFull.update(); tAuto.update(); tDirect.update();
  }

  // ── 명단: 카드 격자 (출전/대기 · 해고)
  const rosterEl = h('div.tw-grid'), rosterHead = h('small'), hallEl = h('div.tw-hall');
  panes.roster = h('div.tw-pane', null, h('div.tw-h', null, h('b', null, '명단'), rosterHead), rosterEl, hallEl);
  let armed = null;
  function drawRoster(s) {
    const line = F.lineup(s), key = [s.mercs.map(m => mkey(s, m)).join(), line.join(), armed, (s.hall || []).length].join('|');
    setText(rosterHead, ` ${s.mercs.length}/${GD.ROSTER_MAX} · 출전 ${line.length}/${F.slots()}`);
    if (key === keys.roster) return;
    keys.roster = key;
    rosterEl.innerHTML = '';
    if (!s.mercs.length) rosterEl.append(h('div.g-empty', null, '명단 없음'));
    for (const m of s.mercs) {
      const on = line.includes(m.uid);
      const acts = h('div.tw-acts', null,
        h('button.tw-act' + (on ? '.on' : ''), { disabled: m.inj > 0, on: { click: () => { F.toggleMember(s, m.uid); keys.roster = ''; } } }, on ? '출전' : '대기'),
        GD.canRetire(m) ? h('button.tw-act.promo' + (armed === 'r' + m.uid ? '.armed' : ''), { 'data-tip': `명성 +${m.lv}`, on: { click: () => { if (armed === 'r' + m.uid) { GD.retire(s, m.uid); armed = null; } else armed = 'r' + m.uid; keys.roster = ''; } } }, armed === 'r' + m.uid ? '은퇴?' : '은퇴') : null,
        h('button.tw-act.fire' + (armed === m.uid ? '.armed' : ''), { on: { click: () => { if (armed === m.uid) { GD.dismiss(s, m.uid); armed = null; } else armed = m.uid; keys.roster = ''; } } }, armed === m.uid ? '해고?' : '해고'));
      rosterEl.append(mercCard(s, m, acts));
    }
    // 명예의 전당: 은퇴한 사람 (초상 · 이름 · 레벨 · 시즌)
    hallEl.innerHTML = '';
    if ((s.hall || []).length) hallEl.append(h('div.tw-h', null, h('b', null, '명예의 전당')), h('div.tw-hrow', null, s.hall.slice(0, 24).map(x => h('span.tw-hm', { 'data-tip': `${x.name} · ${(x.adv ? G.D.ADV[x.adv] : D.allies[x.cls]).n} Lv ${x.lv} · 시즌 ${x.season}` }, G.T.el((x.adv ? G.D.ADV[x.adv].t : D.allies[x.cls].t) + (x.look ? '_c' + x.look : ''), 'xs'), h('small', null, x.name)))));
  }

  // ── 선술집: 후보 카드 (고용)
  const tavEl = h('div.tw-grid'), tavHead = h('small');
  panes.tavern = h('div.tw-pane', null, h('div.tw-h', null, h('b', null, '선술집'), tavHead), tavEl);
  function drawTavern(s) {
    const T = GD.tavern(s), key = [T.offers.map(o => o.m.uid).join(), GD.licensed().length].join('|'), nx = GD.nextTier();
    setText(tavHead, ` · 교체 ${U.fmtTime(Math.max(0, T.t))} · 명단 ${s.mercs.length}/${GD.ROSTER_MAX}${nx ? ` · ${D.allies[nx.cls].n} ${nx.at}층` : ''}`);
    if (key !== keys.tavern) {
      keys.tavern = key;
      tavEl.innerHTML = '';
      T.offers.forEach((o, i) => {
        const btn = h('button.tw-act.hire', { on: { click: () => { if (GD.hire(s, i)) { G.SFX.play('coin'); keys.tavern = ''; } } } }, G.T.el('ui_gold', 'xs'), ` ${U.fmt(o.price)}`);
        btn._price = o.price;
        tavEl.append(mercCard(s, o.m, btn));
      });
    }
    for (const b of tavEl.querySelectorAll('.hire')) b.disabled = s.gold < b._price || s.mercs.length >= GD.ROSTER_MAX;
  }

  // ── 요양소 (DESIGN.md 44): 부정 기벽 제거 · 긍정 기벽 하나 고정. 지난 원정에서 바뀐 사람은 금빛 줄
  const sanEl = h('div.tw-san'), sanHead = h('small');
  panes.san = h('div.tw-pane', null, h('div.tw-h', null, h('b', null, '요양소'), sanHead), sanEl);
  function drawSan(s) {
    const fresh = new Set((s.qlog || []).filter(q => q.at >= (s.last?.at ?? 0) - 1).map(q => q.uid));
    const rows = s.mercs.slice().sort((a, b) => fresh.has(b.uid) - fresh.has(a.uid) || QK.side(b, true).length - QK.side(a, true).length);
    const key = [rows.map(m => m.uid + m.traits.join() + (m.qlock || []).join()).join('|'), [...fresh].join(), Math.floor(Math.log10(s.gold + 1) * 20)].join('#');
    setText(sanHead, ` · 금고 ${U.fmt(s.gold)}`);
    if (key === keys.san) return;
    keys.san = key;
    sanEl.innerHTML = '';
    if (!rows.length) sanEl.append(h('div.g-empty', null, '명단 없음'));
    for (const m of rows) {
      const btns = qOrder(m).map(k => {
        const Q = QK.def(k), lk = QK.locked(m, k), ok = QK.canTreat(m, k), c = QK.cost(s, m, k);
        return h('button.tw-qb' + (Q.bad ? '.bad' : '') + (lk ? '.lock' : ''), { disabled: !ok || s.gold < c, 'data-tip': `${Q.n} · ${Q.d}${lk ? ' · 굳음' : ''}${ok ? (Q.bad ? ' · 제거' : ' · 고정') : ''}`, on: { click: () => { if (QK.treat(s, m, k)) { G.SFX.play('coin'); keys.san = ''; } } } },
          Q.ic, Q.n, ok ? h('small', null, G.T.el('ui_gold', 'xs'), U.fmt(c)) : null);
      });
      sanEl.append(h('div.tw-sr' + (fresh.has(m.uid) ? '.new' : ''), null, G.T.el(GD.tile(m), 'tw-img'), h('b', null, m.name), h('div.tw-sq', null, btns.length ? btns : h('small.g-empty', null, '—'))));
    }
  }

  // ── 장신구 (DESIGN.md 45): 사람마다 두 칸 + 창고. 창고에서 하나 고르고 → 사람 칸을 누르면 낀다. 고른 것 없이 낀 칸을 누르면 뺀다
  const tkRows = h('div.tw-san'), tkStore = h('div.tw-store'), tkHead = h('small');
  const tAutoTr = G.UI.toggle('자동 장착', () => f().autoTr !== false, v => { f().autoTr = v; if (v) TK.auto(f()); keys.trink = ''; });
  let tkSel = null;
  panes.trink = h('div.tw-pane.p-trink', null,
    h('div.tw-col', null, h('div.tw-h', null, h('b', null, '장신구'), h('span.sp'), tAutoTr.el), tkRows),
    h('div.tw-side', null, h('div.tw-box', null, h('div.tw-h', null, h('b', null, '창고'), tkHead), tkStore)));
  function drawTrink(s) {
    const line = F.lineup(s), all = TK.all(s);
    const key = [s.mercs.map(m => m.uid).join(), line.join(), all.map(t => `${t.id}${t.k}${t.g}${t.on}`).join(), tkSel, s.autoTr].join('|');
    tAutoTr.update();
    if (key === keys.trink) return;
    keys.trink = key;
    if (tkSel != null && !all.some(t => t.id === tkSel)) tkSel = null;
    setText(tkHead, ` ${TK.store(s).length}/${TK.CAP}`);
    tkRows.innerHTML = '';
    const ms = s.mercs.slice().sort((a, b) => line.includes(b.uid) - line.includes(a.uid));
    if (!ms.length) tkRows.append(h('div.g-empty', null, '명단 없음'));
    for (const m of ms) {
      const w = TK.worn(s, m.uid);
      const slots = [0, 1].map(i => {
        const t = w[i], click = () => { if (tkSel != null) { TK.equip(s, tkSel, m.uid); tkSel = null; } else if (t) TK.equip(s, t.id, null); keys.trink = ''; };
        return t ? h('button.tw-tk', { 'data-tip': tkTip(t), on: { click } }, tkEl(t), h('small', null, D_TK[t.k].n)) : h('button.tw-tk.empty' + (tkSel != null ? '.can' : ''), { on: { click } }, h('small', null, '—'));
      });
      tkRows.append(h('div.tw-sr' + (line.includes(m.uid) ? '' : '.bench'), null, G.T.el(GD.tile(m), 'tw-img'), h('b', null, m.name), mchip(m), h('div.tw-sq', null, slots)));
    }
    tkStore.innerHTML = '';
    const st = TK.store(s).sort((a, b) => TK.score(b) - TK.score(a));
    if (!st.length) tkStore.append(h('div.g-empty', null, '—'));
    for (const t of st) tkStore.append(h('button.tw-tk' + (tkSel === t.id ? '.sel' : ''), { 'data-tip': tkTip(t), on: { click: () => { tkSel = tkSel === t.id ? null : t.id; keys.trink = ''; } } }, tkEl(t), h('small', null, D_TK[t.k].n)));
  }

  // ── 라이벌: 순위표 (층 · 전적 · 기세 · 방침)
  const rankEl = h('div.tw-table');
  const tAsk = G.UI.toggle('조우 시 묻기', () => f().askMeet !== false, v => { f().askMeet = v; });
  panes.rival = h('div.tw-pane', null, h('div.tw-h', null, h('b', null, '층 순위'), h('span.sp'), tAsk.el), rankEl);
  function drawRival(s) {
    const rt = F.rt(s), rows = G.Rivals.standings(s, rt);
    const key = rows.map(r => `${r.id}${r.floor}${r.rest ? 'r' : ''}${r.mood || ''}${r.stance || ''}`).join();
    tAsk.update();
    if (key === keys.rival) return;
    keys.rival = key;
    rankEl.innerHTML = '';
    rankEl.append(h('div.tw-tr.th', null, h('span', null, '#'), h('span', null, '원정대'), h('span', null, '층'), h('span', null, '우리 전적'), h('span', null, '기세'), h('span', null, '방침')));
    rows.forEach((r, i) => {
      const st = r.us ? null : G.Rivals.st(s)[r.id];
      rankEl.append(h('div.tw-tr' + (r.us ? '.us' : ''), { style: `--rc:${r.col}` },
        h('b', null, i + 1), h('span.tw-rn', null, h('i'), r.n), h('b', null, r.floor), h('span', null, st ? `${st.losses}승 ${st.wins}패` : '—'),
        h('span', null, r.us ? '—' : r.rest ? '휴식' : r.mood || '—'),
        r.us ? h('span', null, '—') : h('div.tw-sts', null, ORDER.map(k => h('button.tw-st' + (r.stance === k ? '.on' : ''), { on: { click: () => { G.Rivals.setStance(s, r.d, k); keys.rival = ''; } } }, RS[k].ic, h('small', null, RS[k].n))))));
    });
  }

  // ── 트리 (판타지 트리를 탭 안에)
  const tree = G.UI.tree('fantasy', () => G.S.w.fantasy.tree);
  panes.tree = h('div.tw-pane.tree', null, tree.el);
  // ── 명성 (영구 트리)
  const fameTree = G.UI.tree('fame', () => G.Season.fameSt(G.S.w.fantasy));
  panes.fame = h('div.tw-pane.tree', null, fameTree.el);

  // ── 시즌 결과 (시즌이 끝나면 마을 화면 위에)
  const resRows = h('div.tw-table'), resSum = h('div.tw-res-sum'), resIn = h('small');
  const resEl = h('div.tw-result.hidden', null, h('div.tw-h', null, h('b.rs-t'), h('span.sp'), resIn), resSum, resRows,
    h('div.tw-row.rs-act', null, h('button.tw-act', { on: { click: () => setTab('fame') } }, '명성 트리'), h('span.sp'),
      h('button.tw-go', { on: { click: () => { const s = f(); if (s.seasonEnd) G.Season.next(s, F.rt(s)); } } }, '다음 시즌')));
  let resKey = '';
  function drawResult(s) {
    const R = s.seasonEnd;
    tog(resEl, 'hidden', !R || tab === 'fame');
    if (!R) { resKey = ''; return; }
    setText(resIn, s.autoGo !== false ? `${Math.ceil(Math.max(0, R.t))}초` : '');
    if (resKey === R.n + '') return;
    resKey = R.n + '';
    setText(resEl.querySelector('.rs-t'), `시즌 ${R.n} 결과`);
    resSum.innerHTML = '';
    for (const [k, v] of [['순위', `${R.rank} / ${R.of}`], ['최고층', `${R.floor}층`], ['라이벌 전적', `${R.won}승 ${R.lost}패`], ['명성', `+${R.fame}`]]) resSum.append(h('div', null, h('small', null, k), h('b', null, v)));
    resRows.innerHTML = '';
    R.rows.forEach((r, i) => resRows.append(h('div.tw-tr.rs' + (r.us ? '.us' : ''), { style: `--rc:${r.col}` }, h('b', null, i + 1), h('span.tw-rn', null, h('i'), r.n), h('b', null, `${r.floor}층`))));
  }

  // ── 원정 보고서 (DESIGN.md 50): 돌아오면 마을 위에 한 장. 사람마다 레벨 · 새 기벽 · 굳은 기벽 · 부상, 아래에 장신구 · 전우 · 라이벌
  const repHead = h('b.rs-t'), repSub = h('small'), repSum = h('div.tw-res-sum'), repRows = h('div.tw-rep-rows'), repFoot = h('div.tw-rep-foot');
  const repEl = h('div.tw-result.tw-report.hidden', null, h('div.tw-h', null, repHead, h('span.sp'), repSub), repSum, repRows, repFoot,
    h('div.tw-row.rs-act', null, h('span.sp'), h('button.tw-go', { on: { click: () => { const s = f(); if (s.report) s.report.seen = true; } } }, '확인')));
  let repKey = '';
  const qChip = (k, cls) => { const Q = QK.def(k); return Q ? h('span.tw-rq.' + cls + (Q.bad ? '.bad' : ''), { 'data-tip': `${Q.n} · ${Q.d}` }, Q.ic, Q.n) : null; };
  const tChip = (t, cls) => { const Df = D_TK[t.k]; return h('span.tw-rq.' + cls + '.r' + Df.r, { 'data-tip': `${Df.n} · ${Df.d}` }, Df.ic, Df.n + (t.g > 1 ? ' ★' + t.g : '')); };
  function drawReport(s) {
    const R = s.report, show = !!R && !R.seen && !s.seasonEnd;
    tog(repEl, 'hidden', !show);
    if (!show) return;
    if (repKey === R.at + '') return;
    repKey = R.at + '';
    setText(repHead, '원정 보고서');
    setText(repSub, `${R.from}층 → ${R.to}층 · ${WHY[R.why] || '귀환'}`);
    tog(repEl, 'bad', R.why === 'wipe');
    repSum.innerHTML = '';
    for (const [k, v, c] of [['짐', '+' + U.fmt(R.got), ''], ['잃음', R.lost ? '-' + U.fmt(R.lost) : '—', R.lost ? 'bad' : ''], ['처치', U.fmt(R.kills), ''], ['층', `+${Math.max(0, R.to - R.from)}`, '']])
      repSum.append(h('div' + (c ? '.' + c : ''), null, h('small', null, k), h('b', null, v)));
    repRows.innerHTML = '';
    for (const r of R.mercs) {
      const m = GD.get(s, r.uid);
      if (!m) continue;
      const chips = [...r.gain.map(k => qChip(k, 'new')), ...r.lock.map(k => qChip(k, 'lock')), ...r.gone.map(k => qChip(k, 'gone'))];
      if (r.inj) chips.push(h('span.tw-rq.bad', null, '🩹', '부상'));
      repRows.append(h('div.tw-sr' + (r.gain.length || r.lock.length ? '.new' : ''), null, G.T.el(GD.tile(m), 'tw-img'), h('b', null, m.name),
        h('span.tw-rlv' + (r.lv1 > r.lv0 ? '.up' : ''), null, r.lv1 > r.lv0 ? `Lv ${r.lv0} → ${r.lv1}` : `Lv ${r.lv1}`), h('div.tw-sq', null, chips.length ? chips : h('small.g-empty', null, '—'))));
    }
    repFoot.innerHTML = '';
    const line = (ic, items) => items.length && repFoot.append(h('div.tw-rf', null, h('small', null, ic), ...items));
    line('장신구', [...R.tkGain.map(t => tChip(t, 'new')), ...R.tkLost.map(t => tChip(t, 'gone'))]);
    line('관계', R.friends.map(p => h('span.tw-cb.friend', null, G.T.el('rl_heart', 'xs'), p.join(' · '))));
    line('라이벌', R.rivals.map(r => h('span.tw-rv', { style: `--rc:${r.col}` }, r.n, r.beat ? h('b.win', null, ` 격파 ${r.beat}`) : null, r.lostTo ? h('b.lose', null, ` 패배 ${r.lostTo}`) : null)));
  }

  // ── 기록: 라이벌 소식 + 원정 로그
  const logEl = h('div.tw-log'), logs = [];
  G.on('log', e => { if (e.world === 'fantasy') { logs.unshift({ s: e.msg, cls: e.cls, at: G.S.runTime }); if (logs.length > 60) logs.length = 60; keys.log = ''; } });
  panes.log = h('div.tw-pane', null, h('div.tw-h', null, h('b', null, '기록')), logEl);
  function drawLog() {
    const all = logs.map(l => ({ ...l, col: null })).concat(G.Rivals.news.map(n => ({ s: n.s, col: n.col, at: n.at }))).sort((a, b) => b.at - a.at).slice(0, 60);
    const key = all.map(x => x.at + x.s).join();
    if (key === keys.log) return;
    keys.log = key;
    logEl.innerHTML = '';
    for (const x of all) logEl.append(h('div' + (x.cls ? '.' + x.cls : ''), { style: x.col ? `color:${x.col}` : '' }, h('small', null, U.fmtTime(x.at)), ' ', x.s));
  }

  // ── 아랫막대
  const goIn = h('small'), newsBtn = h('button.tw-news', { on: { click: () => setTab('log') } }, '기록 ', h('b'));
  const goBtn = h('button.tw-go', { on: { click: () => { const s = f(); if (s.town) EX.depart(s, F.rt(s)); } } }, '출발', h('small'));
  const botEl = h('div.tw-bot', null, h('div.tw-bl', null, goIn), goBtn, newsBtn);

  const el = h('div.ftownui.hidden', { on: { click: e => { e.stopPropagation(); EX.hold(f()); } } }, topEl, tabEl, h('div.tw-body', null, TABS.map(([k]) => panes[k]), resEl, repEl), botEl);
  setTab('party');
  let lastNews = 0;
  return {
    el,
    update() {
      const s = f();
      tog(el, 'hidden', !s.town);
      if (!s.town) return;
      setText(runsEl, ` 원정 ${s.runs || 0}회 · 최고 ${s.maxFloor}층`);
      setText(goldEl, U.fmt(s.gold)); setText(fameEl, U.fmt(s.fame || 0)); setText(essEl, U.fmt(G.S.ess)); setText(signEl, U.fmt(G.S.signs));
      setText(seasonEl, `시즌 ${G.Season.st(s).n} · ${U.fmtTime(G.Season.left(s))}`);
      drawResult(s);
      drawReport(s);
      drawStrip(s);
      // 탭 배지: 선술집(고용 가능) · 명단(부상)
      tog(tabBtns.san, 'dot', s.mercs.some(m => m.traits.some(k => QK.bad(k) && !QK.locked(m, k) && QK.cost(s, m, k) <= s.gold)));
      tog(tabBtns.tavern, 'dot', GD.tavern(s).offers.some(o => o.price <= s.gold) && s.mercs.length < GD.ROSTER_MAX);
      tog(tabBtns.party, 'dot', F.lineup(s).length < F.slots() && GD.ready(s).length > F.lineup(s).length);
      if (tab === 'party') drawParty(s);
      if (tab === 'roster') drawRoster(s);
      if (tab === 'tavern') drawTavern(s);
      if (tab === 'san') drawSan(s);
      if (tab === 'trink') drawTrink(s);
      if (tab === 'rival') drawRival(s);
      if (tab === 'tree') tree.update();
      if (tab === 'fame') fameTree.update();
      if (tab === 'log') drawLog();
      const t = EX.departIn(s);
      setText(goIn, s.seasonEnd ? '' : isFinite(t) ? `자동 출발 ${Math.ceil(t)}초` : '자동 출발 꺼짐');
      goBtn.disabled = !!s.seasonEnd;
      setText(goBtn.lastChild, ` ${s.start || 1}층`);
      const n = G.Rivals.news.length + logs.length;
      setText(newsBtn.lastChild, n > lastNews && tab !== 'log' ? String(n - lastNews) : '');
      if (tab === 'log') lastNews = n;
    },
  };
};
