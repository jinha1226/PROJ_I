'use strict';
// 마을 화면 (DESIGN.md 35): 원정 사이에는 던전 대신 이 화면이 맵 자리를 채운다 — 길드 관리의 본거지.
// 틀(Eslabong·던전 세틀러즈): 윗막대(길드 · 원정 진행 · 출발점 칸 · 재화) / 탭 / 내용(카드·표) / 아랫막대(자동 출발 · 출발 · 소식)
// 탭: 원정대(출전 카드 + 출발층·귀환 방침) · 명단 · 선술집 · 라이벌 · 트리 · 기록. 글은 이름표와 숫자만.
G.UI.fantasyTown = function () {
  const f = () => G.S.w.fantasy, F = G.Fantasy, D = G.D.F, U = G.U, EX = G.Exp, GD = G.Guild, TK = G.Trinket;
  const RS = G.Rivals.STANCES, ORDER = Object.keys(RS), RT = EX.RETREAT;
  const WHY = { wipe: '전멸', full: '짐 가득', retreat: '방침 귀환', careful: '신중 귀환', manual: '귀환' };
  // 스킬 넷 (DESIGN.md 43): 안 열린 칸은 흐리게(툴팁에 열리는 레벨) · ★ = 스킬 레벨(용병 레벨로 자동) · 상위 직업 스킬(sig)은 보랏빛 테두리로 뒤에
  const skillEls = m => h('div.tw-sks', null, (m.skills || []).map((k, i) => { const S = G.D.MSKILLS[k], lv = GD.slotLv(i, m, k), off = m.lv < lv; return h('span.tw-sk' + (off ? '.off' : '') + (S.passive ? '.pas' : ''), { 'data-tip': `${S.n}${S.en ? ` (${S.en})` : ''} · ${S.d}${S.passive ? '' : ` · ${S.cool}초`}${off ? ` · Lv ${lv}` : ''}` }, G.T.el(S.t, 'xs'), h('small', null, S.n)); }),
    h('b.tw-slv', { 'data-tip': '스킬 레벨' }, '★' + GD.skillLv(m)),
    (m.adv ? G.D.ADV[m.adv].sig : []).map(k => { const S = G.D.MSKILLS[k], lv = GD.skLv(m.cls, k), off = m.lv < lv; return h('span.tw-sk.sig' + (off ? '.off' : ''), { 'data-tip': `${S.n}${S.en ? ` (${S.en})` : ''} · ${S.d}${off ? ` · Lv ${lv}` : ''}` }, G.T.el(S.t, 'xs'), h('small', null, S.n)); }),
    // 서사 은혜 (DESIGN.md 59)
    (m.boons || []).map(k => { const B = G.D.BOONS[k]; return h('span.tw-sk.boon', { 'data-tip': `${B.n} (${B.en}) · ${B.d}` }, G.T.el(B.t, 'xs'), h('small', null, B.n.replace('의 은혜', ''))); }));
  // 직업 칩: 서브클래스가 있으면 「직업 · 서브클래스」
  const mchip = m => { const d = GD.def(m), base = G.D.F.allies[m.cls]; return h('span.chip', { style: `--cc:${d.col}` }, m.adv ? `${base.n} · ${d.n}` : d.n); };
  // 서브클래스 (DESIGN.md 56): 얻는 기능 이름 · 레벨
  const advTip = (A, cls) => `${A.n} (${A.en}) · ` + A.sig.map(k => `${G.D.MSKILLS[k].n} Lv ${GD.skLv(cls, k)}`).join(' · ');
  const promoEls = (s, m) => {
    if (!GD.canPromote(m)) return null;
    const c = GD.promoCost(s, m);
    return h('div.tw-promo', null, GD.advs(m.cls).map(k => h('button.tw-act.promo', { disabled: s.gold < c, 'data-tip': advTip(G.D.ADV[k], m.cls), on: { click: () => { GD.promote(s, m, k); keys.party = keys.roster = ''; } } },
      G.T.el(G.ARTSET[G.D.ADV[k].t + '_c' + m.look] ? G.D.ADV[k].t + '_c' + m.look : G.D.ADV[k].t, 'xs'), h('b', null, G.D.ADV[k].n), h('small', null, U.fmt(c)))));
  };
  // 카드 다시 그리기 열쇠: 레벨 · 부상 · 전직 · 전직 가능(금고)
  // 레벨 + 서사 단계 하나로 적은 수 (원정 보고)
  const eLv = e => (e > GD.LV_MAX ? `Lv ${GD.LV_MAX} ★${e - GD.LV_MAX}` : `Lv ${e}`);
  const mkey = (s, m) => `${m.uid}${m.feat || ''}${TK.worn(s, m.uid).map(t => t.k + t.g).join('')}${m.lv}.${m.bt || 0}${(m.boons || []).length}${m.gear ? m.gear.w + '.' + m.gear.a : ''}${m.inj > 0 ? 'i' : ''}${m.job || ''}${m.adv || ''}${GD.canPromote(m) && s.gold >= GD.promoCost(s, m) ? 'p' : ''}`;
  // 성격 (DESIGN.md 42): 기호 + 이름, 특성보다 앞에
  const persEls = m => (m.pers || []).map(k => { const P = G.D.PERSONA[k]; return h('span.gtr.pers', { 'data-tip': `${P.n} · ${P.d}` }, G.T.el('ni_' + P.ic, 'xs'), h('small', null, P.n)); });
  // 마법 물건 (DESIGN.md 58): 아이콘 + 희귀도 테두리 · 랜다트는 점선 · 고정 물건은 실선. 이름 아래 DCSS 각인처럼 속성 줄
  const tkTip = t => TK.tip(t);
  const tkEl = (t, tag = 'span') => { const d = TK.def(t); return h(tag + '.gt.r' + d.r + (d.fixed ? '.fix' : '.rand'), { 'data-tip': tkTip(t) }, d.ic); };
  const tkLabel = t => h('span.tk-lb', null, h('small', null, TK.name(t)), h('i', null, `{${TK.tags(t).join(' ')}}`));
  // 카드: 무기 · 갑옷 · 장신구 한 칸씩
  const tkEls = (s, m) => { const w = TK.worn(s, m.uid); return h('div.tw-tks', null, TK.SLOT_KEYS.map(sl => { const t = w.find(q => TK.slot(q) === sl); return t ? tkEl(t) : h('span.gt.empty.' + sl); })); };
  // 능력치 (DESIGN.md 56): 여섯 칸 — 주능력은 금빛 테두리, 16 이상 밝게 · 8 이하 붉게. 끝 칸은 방어도
  const AB_S = { str: '근', dex: '민', con: '건', int: '지', wis: '혜', cha: '매' };
  // 카드 수치 (DESIGN.md 65): 피해 · 체력 · 방어(AC) 셋. 능력치 여섯은 상세 창에만
  const body = (s, m) => (m.lead ? F.leadBody(s) : { kind: 'ally', merc: m, def: GD.def(m) });
  const abEls = (m, s = f()) => { const DN = G.Dnd, b = body(s, m), atk = m.lead ? F.heroAtk(s) : F.allyAtk(s, b), hp = m.lead ? F.heroHP(s) : F.allyHP(s, b);
    return h('div.tw-st3', null,
      h('span', { 'data-tip': '피해 (한 번)' }, h('small', null, '⚔'), U.fmt(atk)),
      h('span', { 'data-tip': '체력' }, h('small', null, '❤'), U.fmt(hp)),
      h('span', { 'data-tip': '방어 (AC)' }, h('small', null, '🛡'), DN.ac({ merc: m }))); };
  // 장비 (DESIGN.md 57): 무기 · 갑옷 아이콘 + 강화 단계
  const gearEls = m => { const g = GD.gear(m), D_G = G.D.GEAR[m.cls] || G.D.GEAR.archer;
    return h('div.tw-gear', null, ['w', 'a'].map(s => h('span', { 'data-tip': `${GD.gearName(m, s)} (${D_G[s][1]}) · 강화 ${g[s]}` }, G.T.el(D_G[s][2], 'xs'), g[s] ? '+' + g[s] : '0'))); };
  // 출신 재주 (DESIGN.md 61): 성격 옆에 하나
  const featEl = m => { const Ft = G.Feat.def(m); return Ft ? [h('span.gtr.feat', { 'data-tip': `${Ft.n} (${Ft.en}) · ${Ft.d}` }, G.T.el(Ft.t, 'xs'), h('small', null, Ft.n))] : []; };
  const traitEls = m => persEls(m).concat(featEl(m));

  // ── 윗막대
  const runsEl = h('small'), seasonEl = h('b.tw-season'), stripEl = h('div.tw-strip'), goldEl = h('b'), fameEl = h('b');
  const topEl = h('div.tw-top', null,
    h('div.tw-id', null, G.T.el('u_legend', 'md'), h('div', null, h('b', null, '길드'), runsEl)),
    h('div.tw-prog', null, seasonEl, stripEl),
    h('div.tw-res', null,
      h('span', { 'data-tip': '금고' }, G.T.el('ui_gold', 'xs'), goldEl),
      h('span', { 'data-tip': '명성' }, G.T.el('u_legend', 'xs'), fameEl)));
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
  const TABS = [['party', '원정대'], ['roster', '명단'], ['tavern', '선술집'], ['gear', '장비'], ['tree', '트리'], ['guild', '길드'], ['rival', '라이벌'], ['log', '기록']];
  let tab = 'party';
  const tabBtns = {}, panes = {};
  const tabEl = h('div.tw-tabs', null, TABS.map(([k, n]) => (tabBtns[k] = h('button.tw-tab', { on: { click: () => setTab(k) } }, n))));
  function setTab(k) {
    tab = k;
    for (const [id] of TABS) { tog(tabBtns[id], 'on', id === k); tog(panes[id], 'hidden', id !== k); }
    keys[k] = '';
    if (k === 'tree') tree.center();
  }
  const keys = {};

  // ── 원정대: 출전 카드 줄 + 오른쪽 계획(지난 원정 · 출발층 · 귀환 방침 · 자동)
  const lineEl = h('div.tw-line'), benchEl = h('div.tw-line.bench'), lastEl = h('div.tw-last'), planStart = h('b'), comboEl = h('div.tw-combos'), bondEl = h('div.tw-combos');
  const rtBtns = {}, raidEl = h('small.tw-raid');
  const tGo = G.UI.toggle('자동 출발', () => f().autoGo !== false, v => { f().autoGo = v; });
  const tFull = G.UI.toggle('짐 가득 → 보스 후 귀환', () => f().fullHome !== false, v => { f().fullHome = v; });
  const tAuto = G.UI.toggle('자동 편성', () => f().autoParty !== false, v => { F.setAuto(f(), v); keys.party = ''; });
  const tDirect = G.UI.toggle('아는 층 직행', () => f().direct !== false, v => { f().direct = v; });
  panes.party = h('div.tw-pane.p-party', null,
    h('div.tw-col', null, h('div.tw-h', null, h('b', null, '출전'), h('span.sp'), tAuto.el), lineEl, h('div.tw-h', null, h('b', null, '대기'), raidEl), benchEl),
    h('div.tw-side', null,
      h('div.tw-box', null, h('div.tw-h', null, h('b', null, '지난 원정')), lastEl),
      h('div.tw-box', null, h('div.tw-h', null, h('b', null, '연계기')), comboEl),
      h('div.tw-box', null, h('div.tw-h', null, h('b', null, '관계')), bondEl),
      h('div.tw-box', null, h('div.tw-h', null, h('b', null, '출발층')), h('div.tw-row', null,
        h('button.fbtn', { on: { click: () => EX.pickStart(f(), -1) } }, '◀'), planStart, h('button.fbtn', { on: { click: () => EX.pickStart(f(), 1) } }, '▶'))),
      h('div.tw-box', null, h('div.tw-h', null, h('b', null, '귀환 방침')), h('div.tw-opts', null, Object.keys(RT).map(k => (rtBtns[k] = h('button.tw-opt', { on: { click: () => { f().retreat = k; } } }, RT[k].n))))),
      h('div.tw-box', null, tGo.el, tFull.el, tDirect.el)));
  // 단장 (DESIGN.md 63): 내가 만든 캐릭터 — 늘 출전, 금빛 테두리
  function heroCard(s) {
    const c = mercCard(s, GD.leader(s));
    c.classList.add('lead');
    return c;
  }
  function mercCard(s, m, actions) {
    const def = GD.def(m), xp = bar(); setW(xp.fill, m.xp / GD.needOf(m));
    const st = m.inj > 0 ? h('small.tw-st.hurt', null, `부상 ${Math.ceil(m.inj)}초`) : m.job ? h('small.tw-st.job', null, `${G.D.JOBS[m.job].n} 근무`) : null;
    return h('div.tw-card' + (m.inj > 0 ? '.hurt' : ''), { 'data-uid': m.uid, on: { click: e => { if (!e.target.closest('button, select, input')) openDetail(m); } } }, h('b.tw-lv' + (m.bt ? '.epic' : ''), null, GD.lvText(m)), G.T.el(GD.tile(m), 'tw-img'), h('b', null, m.name), mchip(m), xp, abEls(m), gearEls(m),
      h('div.tw-trs', null, ...traitEls(m)), GD.crew(s).includes(m) ? tkEls(s, m) : null, skillEls(m), promoEls(s, m), st, m.from ? h('small.tw-from', { style: `color:${G.D.RIVALS.find(d => d.id === m.from)?.col}` }, `전 ${G.D.RIVALS.find(d => d.id === m.from)?.n}`) : null, actions || null);
  }
  function drawParty(s) {
    const line = F.lineup(s), key = [line.join(), F.slots(), GD.crew(s).map(m => mkey(s, m)).join(), s.autoParty, G.Bond.pairs(s, line.map(u => GD.get(s, u)).filter(Boolean)).map(p => p.r).join()].join('|');
    if (key !== keys.party) {
      keys.party = key;
      lineEl.innerHTML = '';
      lineEl.append(heroCard(s));
      for (let i = 0; i < F.slots(); i++) {
        const m = line[i] != null && GD.get(s, line[i]);
        if (m) lineEl.append(mercCard(s, m, h('button.tw-act', { on: { click: () => { F.toggleMember(s, m.uid); keys.party = ''; } } }, '대기')));
        else lineEl.append(h('button.tw-card.empty', { on: { click: () => setTab('roster') } }, h('b', null, '+'), h('small', null, '빈 칸')));
      }
      // 레이드 (DESIGN.md 64): 보스 층엔 대기 인원(일 없는 · 다치지 않은)이 둘째 파티로
      const sub = GD.ready(s).filter(m => !line.includes(m.uid)).length;
      setText(raidEl, sub ? ` · 보스 층 레이드: 둘째 파티 ${Math.min(sub, F.slots())}명` : '');
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
    const line = F.lineup(s), key = [GD.crew(s).map(m => mkey(s, m)).join(), line.join(), armed, (s.hall || []).length].join('|');
    setText(rosterHead, ` ${s.mercs.length}/${GD.ROSTER_MAX} · 출전 ${line.length}/${F.slots()}`);
    if (key === keys.roster) return;
    keys.roster = key;
    rosterEl.innerHTML = '';
    if (!s.mercs.length) rosterEl.append(h('div.g-empty', null, '명단 없음'));
    rosterEl.append(heroCard(s));
    for (const m of s.mercs) {
      const on = line.includes(m.uid);
      const acts = h('div.tw-acts', null,
        h('button.tw-act' + (on ? '.on' : ''), { disabled: m.inj > 0, on: { click: () => { F.toggleMember(s, m.uid); keys.roster = ''; } } }, on ? '출전' : '대기'),
        GD.canRetire(m) ? h('button.tw-act.promo' + (armed === 'r' + m.uid ? '.armed' : ''), { 'data-tip': `명성 +${GD.retireFame(m)}`, on: { click: () => { if (armed === 'r' + m.uid) { GD.retire(s, m.uid); armed = null; } else armed = 'r' + m.uid; keys.roster = ''; } } }, armed === 'r' + m.uid ? '은퇴?' : '은퇴') : null,
        h('button.tw-act.fire' + (armed === m.uid ? '.armed' : ''), { on: { click: () => { if (armed === m.uid) { GD.dismiss(s, m.uid); armed = null; } else armed = m.uid; keys.roster = ''; } } }, armed === m.uid ? '해고?' : '해고'));
      rosterEl.append(mercCard(s, m, acts));
    }
    // 명예의 전당: 은퇴한 사람 (초상 · 이름 · 레벨 · 시즌)
    hallEl.innerHTML = '';
    if ((s.hall || []).length) hallEl.append(h('div.tw-h', null, h('b', null, '명예의 전당')), h('div.tw-hrow', null, s.hall.slice(0, 24).map(x => h('span.tw-hm', { 'data-tip': `${x.name} · ${(G.D.ADV[x.adv] || D.allies[x.cls]).n} ${x.bt ? `Lv 20 ★${x.bt}` : `Lv ${x.lv}`}${(x.boons || []).length ? ' · ' + x.boons.map(k => G.D.BOONS[k].n).join(' · ') : ''} · 시즌 ${x.season}` }, G.T.el((G.D.ADV[x.adv] || D.allies[x.cls]).t + (x.look ? '_c' + x.look : ''), 'xs'), h('small', null, x.name)))));
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

  // ── 대장간 (DESIGN.md 57): 사람마다 무기 · 갑옷 강화. 출전하는 사람이 위로 · 자동이면 출발할 때 금고 절반까지 가장 싼 것부터
  const fgEl = h('div.tw-san'), fgHead = h('small');
  const tAutoFg = G.UI.toggle('자동 강화', () => f().autoForge !== false, v => { f().autoForge = v; keys.forge = ''; });
  panes.forge = h('div.tw-pane', null, h('div.tw-h', null, h('b', null, '대장간'), fgHead, h('span.sp'), tAutoFg.el), fgEl);
  function drawForge(s) {
    const line = F.lineup(s), rows = [GD.leader(s), ...s.mercs.slice().sort((a, b) => line.includes(b.uid) - line.includes(a.uid) || b.lv - a.lv)];
    const key = [rows.map(m => m.uid + ':' + GD.gear(m).w + '.' + GD.gear(m).a).join('|'), line.join(), Math.floor(Math.log10(s.gold + 1) * 20), s.autoForge].join('#');
    setText(fgHead, ` · 금고 ${U.fmt(s.gold)}`);
    tAutoFg.update();
    if (key === keys.forge) return;
    keys.forge = key;
    fgEl.innerHTML = '';
    for (const m of rows) {
      const D_G = G.D.GEAR[m.cls] || G.D.GEAR.archer, g = GD.gear(m);
      const btns = ['w', 'a'].map(sl => {
        const c = GD.gearCost(m, sl), nx = g[sl] + 1, mg = GD.magic(nx) > GD.magic(g[sl]);
        return h('button.tw-qb.forge' + (mg ? '.mg' : ''), { disabled: s.gold < c, 'data-tip': `${GD.gearName(m, sl)} (${D_G[sl][1]}) · ${sl === 'w' ? '피해' : '체력'} ×1.1${mg ? ` · ${sl === 'w' ? '명중' : 'AC'} +1` : ''}`, on: { click: () => { if (GD.upgrade(s, m, sl)) { G.SFX.play('coin'); keys.forge = ''; } } } },
          G.T.el(D_G[sl][2], 'xs'), GD.gearName(m, sl), h('b', null, '+' + g[sl]), h('small', null, G.T.el('ui_gold', 'xs'), U.fmt(c)));
      });
      fgEl.append(h('div.tw-sr' + (line.includes(m.uid) ? '.new' : ''), null, G.T.el(GD.tile(m), 'tw-img'), h('b', null, m.name), h('div.tw-sq', null, btns)));
    }
  }

  // ── 장신구 (DESIGN.md 45): 사람마다 두 칸 + 창고. 창고에서 하나 고르고 → 사람 칸을 누르면 낀다. 고른 것 없이 낀 칸을 누르면 뺀다
  const tkRows = h('div.tw-san'), tkStore = h('div.tw-store'), tkHead = h('small');
  const tAutoTr = G.UI.toggle('자동 장착', () => f().autoTr !== false, v => { f().autoTr = v; if (v) TK.auto(f()); keys.trink = ''; });
  let tkSel = null;
  panes.trink = h('div.tw-pane.p-trink', null,
    h('div.tw-col', null, h('div.tw-h', null, h('b', null, '마법 물건'), h('span.sp'), tAutoTr.el), tkRows),
    h('div.tw-side', null, h('div.tw-box', null, h('div.tw-h', null, h('b', null, '창고'), tkHead), tkStore)));
  function drawTrink(s) {
    const line = F.lineup(s), all = TK.all(s);
    const key = [s.mercs.map(m => m.uid).join(), line.join(), all.map(t => `${t.id}:${t.on}`).join(), tkSel, s.autoTr].join('|');
    tAutoTr.update();
    if (key === keys.trink) return;
    keys.trink = key;
    if (tkSel != null && !all.some(t => t.id === tkSel)) tkSel = null;
    setText(tkHead, ` ${TK.store(s).length}/${TK.CAP}`);
    tkRows.innerHTML = '';
    const ms = [GD.leader(s), ...s.mercs.slice().sort((a, b) => line.includes(b.uid) - line.includes(a.uid))];
    if (!ms.length) tkRows.append(h('div.g-empty', null, '명단 없음'));
    for (const m of ms) {
      const w = TK.worn(s, m.uid), sel = tkSel != null ? all.find(t => t.id === tkSel) : null;
      // 빈 무기 · 갑옷 칸은 기본 장비 이름(대장간 강화 포함)
      const slots = TK.SLOT_KEYS.map(sl => {
        const t = w.find(q => TK.slot(q) === sl);
        const click = () => { if (sel) { TK.equip(s, tkSel, m.uid); tkSel = null; } else if (t) TK.equip(s, t.id, null); keys.trink = ''; };
        const can = sel && TK.slot(sel) === sl && TK.fits(sel, m);
        return t ? h('button.tw-tk.' + sl, { 'data-tip': tkTip(t), on: { click } }, tkEl(t), tkLabel(t))
          : h('button.tw-tk.empty.' + sl + (can ? '.can' : ''), { disabled: sel && !can, on: { click } }, h('small', null, sl === 't' ? '—' : GD.gearName(m, sl)));
      });
      tkRows.append(h('div.tw-sr' + (line.includes(m.uid) ? '' : '.bench'), null, G.T.el(GD.tile(m), 'tw-img'), h('b', null, m.name), mchip(m), h('div.tw-sq', null, slots)));
    }
    tkStore.innerHTML = '';
    const st = TK.store(s).sort((a, b) => TK.score(b) - TK.score(a));
    if (!st.length) tkStore.append(h('div.g-empty', null, '—'));
    for (const t of st) tkStore.append(h('button.tw-tk' + (tkSel === t.id ? '.sel' : ''), { 'data-tip': tkTip(t), on: { click: () => { tkSel = tkSel === t.id ? null : t.id; keys.trink = ''; } } }, tkEl(t), tkLabel(t)));
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
  // ── 장비 (DESIGN.md 62): 대장간(강화) 위, 마법 물건 아래
  panes.gear = h('div.tw-pane', null, panes.forge, panes.trink);
  // ── 길드 (DESIGN.md 60): 명성으로 짓는 시설 — 시즌을 넘어 남는다. 머리줄에 이름값(누적 명성)
  const guildEl = h('div.tw-san'), guildHead = h('small');
  panes.guild = h('div.tw-pane', null, h('div.tw-h', null, h('b', null, '길드'), guildHead), guildEl);
  function drawGuild(s) {
    setText(guildHead, ` · 명성 ${U.fmt(s.fame || 0)} · 이름값 피해·체력 ×${GD.renown(s).toFixed(2)}`);
    const key = Object.keys(G.D.FAC).map(k => GD.fac(s, k) + (s.fame >= GD.facCost(s, k) ? 'y' : 'n')).join() + '|' + s.mercs.map(m => m.uid + (m.job || '')).join();
    if (key === keys.guild) return;
    keys.guild = key;
    guildEl.innerHTML = '';
    for (const k in G.D.FAC) {
      const F_ = G.D.FAC[k], l = GD.fac(s, k), c = GD.facCost(s, k);
      guildEl.append(h('div.tw-sr' + (l ? '.new' : ''), null, G.T.el(F_.t, 'tw-img'), h('b', null, `${F_.n} ${l}/${F_.max}`), h('div.tw-sq', null,
        h('small', null, l ? F_.d(l) : '—'),
        c < Infinity ? h('button.tw-qb.forge', { disabled: (s.fame || 0) < c, 'data-tip': F_.d(l + 1), on: { click: () => { if (GD.build(s, k)) { G.SFX.play('coin'); keys.guild = ''; } } } }, '→ ' + F_.d(l + 1), h('small', null, G.T.el('u_legend', 'xs'), U.fmt(c))) : null)));
    }
    // 대기실 배치 (DESIGN.md 64): 자리마다 한 사람. 그 능력치가 효과를 키운다. 맡은 사람은 출전하지 않는다
    guildEl.append(h('div.tw-h', null, h('b', null, '대기실 배치')));
    for (const k in G.D.JOBS) {
      const J = G.D.JOBS[k], open = GD.jobOpen(s, k), cur = GD.jobOf(s, k), AB = G.Dnd.AB_N[J.ab];
      const sel = h('select.tw-job', { disabled: !open, on: { change: e => { GD.assign(s, k, e.target.value === '' ? null : +e.target.value); keys.guild = keys.party = keys.roster = ''; } } },
        h('option', { value: '' }, '—'),
        ...s.mercs.slice().sort((a, b) => G.Dnd.ab(b)[J.ab] - G.Dnd.ab(a)[J.ab]).map(m => { const o = h('option', { value: m.uid }, `${m.name} · ${AB} ${G.Dnd.ab(m)[J.ab]}${m.job && m.job !== k ? ` (${G.D.JOBS[m.job].n})` : ''}`); if (cur === m) o.selected = true; return o; }));
      guildEl.append(h('div.tw-sr' + (cur ? '.new' : ''), null, G.T.el(J.t, 'tw-img'), h('b', null, J.n), h('div.tw-sq', null, sel,
        h('small', null, open ? (cur ? J.d(GD.jobPow(s, k)) : `${AB} 수정치가 효과를 키움`) : `${G.D.FAC[J.fac].n}을 지으면`))));
    }
  }

  // ── 시즌 결과 (시즌이 끝나면 마을 화면 위에)
  const resRows = h('div.tw-table'), resSum = h('div.tw-res-sum'), resIn = h('small');
  const resEl = h('div.tw-result.hidden', null, h('div.tw-h', null, h('b.rs-t'), h('span.sp'), resIn), resSum, resRows,
    h('div.tw-row.rs-act', null, h('button.tw-act', { on: { click: () => setTab('guild') } }, '길드'), h('span.sp'),
      h('button.tw-go', { on: { click: () => { const s = f(); if (s.seasonEnd) G.Season.next(s, F.rt(s)); } } }, '다음 시즌')));
  let resKey = '';
  function drawResult(s) {
    const R = s.seasonEnd;
    tog(resEl, 'hidden', !R || tab === 'guild');
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
  const tChip = (t, cls) => h('span.tw-rq.' + cls + '.r' + t.r, { 'data-tip': t.tip || t.n }, t.ic, t.n);
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
      const chips = [];
      if (r.inj) chips.push(h('span.tw-rq.bad', null, '🩹', '부상'));
      repRows.append(h('div.tw-sr' + (r.lv1 > r.lv0 ? '.new' : ''), null, G.T.el(GD.tile(m), 'tw-img'), h('b', null, m.name),
        h('span.tw-rlv' + (r.lv1 > r.lv0 ? '.up' : ''), null, r.lv1 > r.lv0 ? `${eLv(r.lv0)} → ${eLv(r.lv1)}` : eLv(r.lv1)), h('div.tw-sq', null, chips.length ? chips : h('small.g-empty', null, '—'))));
    }
    repFoot.innerHTML = '';
    const line = (ic, items) => items.length && repFoot.append(h('div.tw-rf', null, h('small', null, ic), ...items));
    line('마법 물건', [...R.tkGain.map(t => tChip(t, 'new')), ...R.tkLost.map(t => tChip(t, 'gone'))]);
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

  // ── 단장 만들기 (DESIGN.md 63 · D&D 캐릭터 생성): 직업 → 능력치(표준 배열 · 4d6, 두 칸을 눌러 바꾼다) → 기술 넷 → 출신 재주 → 모습 · 이름
  const STD = [15, 14, 13, 12, 10, 8];
  const cr = { cls: 'dragoon', name: '', vals: STD.slice(), feat: 'alert', look: 0, skills: null, swap: null };
  const crBody = h('div.tw-cr-body'), crName = h('input.tw-cr-name', { maxlength: 8, placeholder: '이름', on: { keydown: e => e.stopPropagation() } });
  const crEl = h('div.tw-result.tw-report.tw-create.hidden', null, h('div.tw-h', null, h('b.rs-t', null, '단장 만들기'), h('span.sp'), h('small', null, 'SRD 5.2.1')), crBody,
    h('div.tw-row.rs-act', null, crName, h('span.sp'), h('button.tw-go', { on: { click: () => {
      const DN = G.Dnd, ord = DN.CLS[cr.cls].order, ab = {};
      ord.forEach((k, i) => (ab[k] = cr.vals[i]));
      if (GD.createLeader(f(), { cls: cr.cls, name: crName.value.trim(), ab, feat: cr.feat, look: cr.look, skills: cr.skills })) { keys.party = keys.roster = ''; crKey = ''; }
    } } }, '시작')));
  let crKey = '';
  function drawCreate(s) {
    const show = !!s.leaderNew && s.town && !s.seasonEnd;
    tog(crEl, 'hidden', !show);
    if (!show) return;
    EX.hold(s);
    if (!crName.value && GD.leader(s).name !== '단장') crName.value = GD.leader(s).name;
    if (!cr.skills) cr.skills = GD.roll(cr.cls);
    const key = JSON.stringify(cr);
    if (key === crKey) return;
    crKey = key;
    const DN = G.Dnd, C = DN.CLS[cr.cls], A = G.D.F.allies, re = () => { crKey = ''; };
    crBody.innerHTML = '';
    // 직업 열둘
    crBody.append(h('div.tw-h', null, h('b', null, '직업')), h('div.tw-cr-row', null, Object.keys(A).map(k => h('button.tw-cr-opt' + (cr.cls === k ? '.on' : ''), { 'data-tip': `히트 다이스 d${DN.CLS[k].hd} · 주능력 ${DN.AB_N[DN.CLS[k].pri]}`, on: { click: () => { cr.cls = k; cr.skills = GD.roll(k); re(); } } }, G.T.el(A[k].t + (cr.look ? '_c' + cr.look : ''), 'xs'), A[k].n))));
    // 능력치: 직업의 순서(주능력부터)에 놓인 값. 두 칸을 차례로 누르면 서로 바뀐다
    const ord = C.order;
    crBody.append(h('div.tw-h', null, h('b', null, '능력치'), h('span.sp'),
      h('button.tw-act', { on: { click: () => { cr.vals = STD.slice(); re(); } } }, '표준 배열'),
      h('button.tw-act', { on: { click: () => { cr.vals = ord.map(() => DN.roll4()).sort((a, b) => b - a); re(); } } }, '🎲 4d6')),
      h('div.tw-cr-ab', null, DN.AB.map(k => { const i = ord.indexOf(k), v = cr.vals[i]; return h('span' + (DN.key(cr.cls, k) ? '.key' : '') + (cr.swap === i ? '.sel' : '') + (v >= 16 ? '.hi' : v <= 8 ? '.lo' : ''), { on: { click: () => { if (cr.swap == null) cr.swap = i; else { const j = cr.swap; [cr.vals[i], cr.vals[j]] = [cr.vals[j], cr.vals[i]]; cr.swap = null; } re(); } } }, h('small', null, DN.AB_N[k]), h('b', null, v), h('i', null, DN.role(cr.cls, k))); })));
    // 기술: 직업 풀에서 넷
    const pool = G.D.MPOOL[cr.cls];
    crBody.append(h('div.tw-h', null, h('b', null, '기술'), h('small', null, ` ${cr.skills.length}/4`)), h('div.tw-cr-row', null, pool.map(k => { const S = G.D.MSKILLS[k], on = cr.skills.includes(k), lv = GD.skLv(cr.cls, k);
      return h('button.tw-cr-opt' + (on ? '.on' : ''), { 'data-tip': `${S.n}${S.en ? ` (${S.en})` : ''} · ${S.d}${S.passive ? '' : ` · ${S.cool}초`}${lv > 1 ? ` · Lv ${lv}` : ''}`, on: { click: () => { if (on) cr.skills = cr.skills.filter(q => q !== k); else if (cr.skills.length < 4) cr.skills = [...cr.skills, k]; re(); } } }, G.T.el(S.t, 'xs'), S.n, lv > 1 ? h('small', null, ` Lv${lv}`) : null); })));
    // 출신 재주
    crBody.append(h('div.tw-h', null, h('b', null, '출신 재주')), h('div.tw-cr-row', null, Object.keys(G.D.FEATS).map(k => { const Ft = G.D.FEATS[k];
      return h('button.tw-cr-opt' + (cr.feat === k ? '.on' : ''), { 'data-tip': `${Ft.n} (${Ft.en}) · ${Ft.d}`, on: { click: () => { cr.feat = k; re(); } } }, G.T.el(Ft.t, 'xs'), Ft.n); })));
    // 모습
    crBody.append(h('div.tw-h', null, h('b', null, '모습')), h('div.tw-cr-row', null, [0, 1, 2].map(l => { const t = A[cr.cls].t + (l ? '_c' + l : '');
      return h('button.tw-cr-opt.look' + (cr.look === l ? '.on' : ''), { on: { click: () => { cr.look = l; re(); } } }, G.T.el(G.ARTSET && !G.ARTSET[t] ? A[cr.cls].t : t, 'tw-img')); })));
  }
  // ── 상세 창 (DESIGN.md 65): 카드를 누르면. 능력치 여섯 — 이 직업에게 무엇에 쓰이는지 옆에, 공격 · 체력 · 방어에 쓰이는 것만 밝게
  const dtBody = h('div.tw-dt-body');
  const dtEl = h('div.tw-result.tw-report.tw-detail.hidden', null, h('div.tw-h', null, h('b.rs-t', null, '상세'), h('span.sp'), h('button.tw-act', { on: { click: () => { dtM = null; } } }, '닫기')), dtBody);
  let dtM = null, dtKey = '';
  const openDetail = m => { dtM = m; dtKey = ''; };
  function drawDetail(s) {
    const m = dtM && GD.get(s, dtM.uid) ? dtM : (dtM && (s.tavern?.offers || []).some(o => o.m === dtM) ? dtM : null);
    tog(dtEl, 'hidden', !m);
    if (!m) return;
    const key = mkey(s, m);
    if (key === dtKey) return;
    dtKey = key;
    const DN = G.Dnd, ab = DN.ab(m), def = GD.def(m), sg = v => (v >= 0 ? '+' : '') + v;
    dtBody.innerHTML = '';
    dtBody.append(h('div.tw-dt-top', null, G.T.el(GD.tile(m), 'tw-img'), h('div', null, h('b', null, m.name), mchip(m), h('small', null, ` ${GD.lvText(m)}`)), abEls(m, s)));
    dtBody.append(h('div.tw-dt-ab', null, DN.AB.map(k => h('div' + (DN.key(m.cls, k) ? '.key' : ''), null,
      h('b', null, DN.AB_N[k]), h('span.v', null, ab[k]), h('small', null, sg(DN.mod(ab[k]))), h('span.r', null, DN.role(m.cls, k))))));
    dtBody.append(h('div.tw-trs', null, ...traitEls(m)), gearEls(m), skillEls(m));
  }
  const el = h('div.ftownui.hidden', { on: { click: e => { e.stopPropagation(); EX.hold(f()); } } }, topEl, tabEl, h('div.tw-body', null, TABS.map(([k]) => panes[k]), resEl, repEl, dtEl, crEl), botEl);
  setTab('party');
  let lastNews = 0;
  return {
    el,
    update() {
      const s = f();
      tog(el, 'hidden', !s.town);
      if (!s.town) return;
      setText(runsEl, ` 원정 ${s.runs || 0}회 · 최고 ${s.maxFloor}층`);
      setText(goldEl, U.fmt(s.gold)); setText(fameEl, U.fmt(s.fame || 0));
      setText(seasonEl, `시즌 ${G.Season.st(s).n} · ${U.fmtTime(G.Season.left(s))}`);
      drawResult(s);
      drawReport(s);
      drawCreate(s);
      drawDetail(s);
      drawStrip(s);
      // 탭 배지: 선술집(고용 가능) · 명단(부상)
      tog(tabBtns.tavern, 'dot', GD.tavern(s).offers.some(o => o.price <= s.gold) && s.mercs.length < GD.ROSTER_MAX);
      tog(tabBtns.party, 'dot', F.lineup(s).length < F.slots() && GD.ready(s).length > F.lineup(s).length);
      if (tab === 'party') drawParty(s);
      if (tab === 'roster') drawRoster(s);
      if (tab === 'tavern') drawTavern(s);
      if (tab === 'gear') { drawForge(s); drawTrink(s); }
      if (tab === 'rival') drawRival(s);
      if (tab === 'tree') tree.update();
      if (tab === 'guild') drawGuild(s);
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
