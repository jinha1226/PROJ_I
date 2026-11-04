'use strict';
// 상태창 (DESIGN.md 70 · 배틀 브라더스의 인형 + 수치 + 창고 한 화면): 마을 명단 · 던전의 초상 · 맵 위 캐릭터를 누르면 뜬다. 게임은 멈추지 않는다.
//  왼쪽: 초상 둘레 장비 칸(무기 · 갑옷 · 장신구) · 체력 · 경험치 · 상태 · 특성 / 가운데: 능력치 · 전투 수치 · 내성 · 판정 / 오른쪽: 소지품 또는 기술
//  물건을 누르면 낀 것과 바꿨을 때 달라지는 수치를 보여 준다. 위 줄의 얼굴로 사람을 바꾼다. 좁은 화면에서는 탭으로 한 칸씩.
G.UI.itemIcon = (() => {
  // 물건 그림: 이모지 → 소지품 타일 (없으면 칸에 맞는 기본 그림)
  const MAP = { '💍': 'ii_ring', '📿': 'ii_amulet', '🧿': 'ii_amulet', '🩹': 'ii_amulet', '📌': 'ii_brooch', '🧥': 'ii_cloak', '👢': 'ii_boots', '🧤': 'ii_glove', '⛓️': 'ii_bracer', '🎗️': 'ii_belt', '👑': 'ii_hat', '🦺': 'ii_armor', '🥻': 'ii_robe', '🛡️': 'ii_shield', '🗡️': 'ii_sword', '⚔️': 'ii_sword', '🔨': 'ii_hammer', '🏹': 'w_bow', '🪄': 'w_arcstaff', '🥢': 'ii_qstaff', '🪓': 'ii_axe', '🔱': 'w_spear', '🔮': 'ii_orb' };
  const SLOT = { w: 'ii_sword', a: 'ii_armor', t: 'ii_amulet' };
  return (t, cls = 'cs-ic') => { const d = G.Trinket.def(t); return G.T.el({ k: MAP[d.ic] || SLOT[d.slot || 't'], v: t.id || 0 }, cls); };
})();
G.UI.charSheet = function () {
  const f = () => G.S.w.fantasy, F = G.Fantasy, GD = G.Guild, TK = G.Trinket, DN = G.Dnd, U = G.U, D = G.D;
  const SLOT_N = { w: '무기', a: '갑옷', t: '장신구' }, RCOL = ['#d8d0bd', '#6fb4ff', '#c06bff', '#ffb547'], RN = ['일반', '고급', '희귀', '전설'];
  const SK_N = { perception: '지각', investigation: '조사', persuasion: '설득' };
  let cur = null, side = 'inv', mtab = 'doll', filter = null, item = null, armed = null, key = '';
  const sg = v => (v >= 0 ? '+' : '') + v;
  const stripEl = h('div.cs-strip'), docEl = h('div.cs-doc'), body = h('div.cs-body');
  const mtabs = h('div.cs-mtabs');
  const win = h('div.cs-win', { on: { click: e => e.stopPropagation() } }, h('div.cs-head', null, stripEl, h('button.cs-x', { 'aria-label': '닫기', on: { click: () => api.close() } }, '✕')), mtabs, body);
  const el = h('div.cs-wrap.hidden', { on: { click: () => api.close() } }, win);
  let live = null;

  // 몸: 던전 위에 있으면 그 몸(버프 포함), 아니면 수치 계산용 몸
  const bodyOf = (s, m) => { const rt = F.rt(s); return (!s.town && rt.party.find(p => p.merc === m)) || (m.lead ? F.leadBody(s) : { kind: 'ally', merc: m, def: GD.def(m) }); };
  const crew = (s, m) => GD.crew(s).includes(m);
  // 수치 한 벌 (물건을 바꿔 끼웠을 때 비교에도 쓴다)
  function snap(s, m) {
    const b = bodyOf(s, m), ab = DN.ab(m);
    return { atk: m.lead ? F.heroAtk(s) : F.allyAtk(s, b), hp: m.lead ? F.heroHP(s) : F.allyHP(s, b), ac: DN.ac(b), hit: DN.hit(b), cd: F.allyCd(b) / F.aspd(s), n: DN.attacks(b), crit: F.critAt(b), ab, saves: Object.fromEntries(DN.AB.map(k => [k, DN.saveBonus(b, k)])), regen: TK.sum(m, 'regen'), move: GD.sum(m, 'move') };
  }
  // 끼면 무엇이 달라지나: 잠깐 바꿔 끼워 재고 되돌린다
  function delta(s, m, t) {
    const a = snap(s, m), was = TK.all(s).map(q => q.on);
    for (const q of TK.worn(s, m.uid)) if (q !== t && TK.slot(q) === TK.slot(t)) q.on = null;
    t.on = m.uid;
    const b = snap(s, m);
    TK.all(s).forEach((q, i) => { q.on = was[i]; });
    const out = [], row = (n, x, y, fmt = v => v, lowGood) => { if (Math.abs(x - y) > 1e-6) out.push({ n, x: fmt(x), y: fmt(y), up: lowGood ? y < x : y > x }); };
    row('피해', a.atk, b.atk, U.fmt); row('체력', a.hp, b.hp, U.fmt); row('AC', a.ac, b.ac); row('명중', a.hit, b.hit, sg);
    row('공격 간격', a.cd, b.cd, v => v.toFixed(2) + '초', true); row('치명', a.crit, b.crit, v => (v < 20 ? `${v}~20` : '20'), true);
    for (const k of DN.AB) row(DN.AB_N[k], a.ab[k], b.ab[k]);
    row('재생', a.regen, b.regen, v => (v * 100).toFixed(1) + '%'); row('이동', a.move, b.move, sg);
    return out;
  }
  // 기본 장비 그림: 갑옷은 종류대로 (무기는 G.D.GEAR 아이콘)
  const gearIcon = (m, sl, cls) => { const g = (D.GEAR[m.cls] || D.GEAR.archer)[sl]; if (sl === 'w') return G.T.el(g[2], cls); return G.T.el(/Robe/.test(g[1]) ? 'ii_robe' : /Bracers/.test(g[1]) ? 'ii_bracer' : { k: 'ii_armor', v: /Chain/.test(g[1]) ? 1 : /Plate/.test(g[1]) ? 0 : 2 }, cls); };
  const wornIn = (s, m, sl) => TK.worn(s, m.uid).find(t => TK.slot(t) === sl);

  // ── 왼쪽: 인형 ──
  function slotEl(s, m, sl) {
    const t = wornIn(s, m, sl), g = sl === 't' ? 0 : GD.gear(m)[sl], on = filter === sl;
    const d = t && TK.def(t), name = sl === 't' ? (t ? TK.name(t) : '비어 있음') : GD.gearName(m, sl);
    const ic = t ? G.UI.itemIcon(t, 'cs-sic') : sl === 't' ? h('i.cs-sempty') : gearIcon(m, sl, 'cs-sic');
    return h('button.cs-slot' + (on ? '.on' : '') + (t ? '.r' + d.r : ''), { style: t ? `--rc:${RCOL[d.r - 1]}` : null, 'data-tip': name, on: { click: () => { filter = on ? null : sl; item = t || null; side = 'inv'; mtab = 'inv'; key = ''; } } },
      h('small', null, SLOT_N[sl]), ic, g ? h('b.cs-up', null, '+' + g) : null);
  }
  function drawDoll(s, m) {
    const isCrew = crew(s, m), line = F.lineup(s), on = m.lead || line.includes(m.uid), d = GD.def(m), base = D.F.allies[m.cls];
    const hp = bar('hp'), hpT = h('small.cs-bt'), xp = bar(), cond = h('div.cs-cond');
    setW(xp.fill, m.xp / GD.needOf(m));
    live = { hp, hpT, cond, sk: [] };
    const traits = [...(m.pers || []).map(k => { const P = D.PERSONA[k]; return h('span.cs-tr', { 'data-tip': P.d }, G.T.el('ni_' + P.ic, 'xs'), P.n); })];
    const Ft = G.Feat.def(m);
    if (Ft) traits.push(h('span.cs-tr', { 'data-tip': `${Ft.en} · ${Ft.d}` }, G.T.el(Ft.t, 'xs'), Ft.n));
    for (const id of m.scars || []) { const Sc = G.Story.SCARS[id], at = m.scarAt && m.scarAt[id]; traits.push(h('span.cs-tr.scar', { 'data-tip': Sc.d + (at ? ` · ${at.fl}층${at.by ? ` ${at.by}` : ''}` : '') }, Sc.n)); }
    traits.push(...G.Story.marks(m).map(x => h('span.cs-tr.scar', { 'data-tip': x.d }, x.n)));
    const saga = (s.saga || []).filter(x => x.who.includes(m.uid)).slice(0, 4);
    const apt = G.Mission.aptOf(m);
    const re = () => { key = ''; };
    const acts = !isCrew || m.lead || !s.town ? null : h('div.cs-acts', null,
      h('button.cs-btn' + (on ? '.on' : ''), { disabled: m.inj > 0 || (!on && line.length >= F.slots()), on: { click: () => { F.toggleMember(s, m.uid); re(); } } }, on ? '대기로' : '출전'),
      GD.canRetire(m) ? h('button.cs-btn.warn', { 'data-tip': `명성 +${GD.retireFame(m)}`, on: { click: () => { if (armed === 'r') { GD.retire(s, m.uid); armed = null; api.close(); } else { armed = 'r'; re(); } } } }, armed === 'r' ? '은퇴?' : '은퇴') : null,
      h('button.cs-btn.bad', { on: { click: () => { if (armed === 'f') { GD.dismiss(s, m.uid); armed = null; api.close(); } else { armed = 'f'; re(); } } } }, armed === 'f' ? '해고?' : '해고'));
    const promo = s.town && isCrew && GD.canPromote(m) ? h('div.cs-acts', null, GD.advs(m.cls).map(k => { const A = D.ADV[k], c = GD.promoCost(s, m); return h('button.cs-btn.promo', { disabled: s.gold < c, 'data-tip': `${A.en} · ` + A.sig.map(q => `${D.MSKILLS[q].n} Lv ${GD.skLv(m.cls, q)}`).join(' · '), on: { click: () => { GD.promote(s, m, k); re(); } } }, A.n, h('small', null, U.fmt(c))); })) : null;
    return h('section.cs-col.cs-doll', { 'data-m': 'doll' },
      h('div.cs-name', null, h('b', null, (m.lead ? '👑 ' : '') + m.name), h('small', { style: `color:${d.col}` }, m.adv ? `${base.n} · ${d.n}` : d.n), h('small', null, GD.lvText(m) + (m.job ? ` · ${D.JOBS[m.job].n} 근무` : ''))),
      isCrew ? h('div.cs-paper', null, slotEl(s, m, 'w'), h('div.cs-por', null, G.T.el(GD.tile(m), 'cs-img')), slotEl(s, m, 'a'), slotEl(s, m, 't')) : h('div.cs-paper.solo', null, h('div.cs-por', null, G.T.el(GD.tile(m), 'cs-img'))),
      h('div.cs-bar', null, h('b', null, '체력'), hp, hpT),
      h('div.cs-bar.xp', null, h('b', null, '경험'), xp, h('small.cs-bt', null, `${U.fmt(m.xp)} / ${U.fmt(GD.needOf(m))}`)),
      cond,
      traits.length ? h('div.cs-trs', null, traits) : null,
      saga.length ? h('div.cs-saga', null, saga.map(x => h('div', null, x.s))) : null,
      apt.length ? h('small.cs-apt', null, '✦ 적성 · ' + apt.map(k => G.Mission.DEF[k].n).join(' · ')) : null,
      promo, acts);
  }

  // ── 가운데: 수치 ──
  function drawStats(s, m) {
    const v = snap(s, m), c = DN.cls(m), mg = GD.magic(GD.gear(m).w), mga = GD.magic(GD.gear(m).a), pri = c.pri, ab = v.ab;
    const hitTip = `숙련 ${sg(DN.prof(m.lv))} · ${DN.AB_N[pri]} ${sg(DN.mod(ab[pri]))}${mg ? ` · 강화 ${sg(mg)}` : ''}${TK.sum(m, 'hit') ? ` · 물건 ${sg(TK.sum(m, 'hit'))}` : ''}`;
    const acTip = `${c.shield ? '방패 +2 · ' : ''}${mga ? `강화 ${sg(mga)} · ` : ''}${TK.sum(m, 'ac') ? `물건 ${sg(TK.sum(m, 'ac'))} · ` : ''}${DN.AB_N.dex} ${sg(DN.mod(ab.dex))}`;
    const stat = (ic, n, val, tip) => h('div.cs-stat', { 'data-tip': tip }, h('i', null, ic), h('small', null, n), h('b', null, val));
    return h('section.cs-col.cs-stats', { 'data-m': 'stat' },
      h('h4', null, '능력치'),
      h('div.cs-abs', null, DN.AB.map(k => h('div.cs-ab' + (DN.key(m.cls, k) ? '.key' : ''), { 'data-tip': DN.role(m.cls, k) }, h('small', null, DN.AB_N[k]), h('b', null, ab[k]), h('i', null, sg(DN.mod(ab[k])))))),
      h('h4', null, '전투'),
      h('div.cs-grid', null,
        stat('⚔', '피해', U.fmt(v.atk), v.n > 1 ? `한 번에 ${v.n}회 공격` : '한 번 공격'),
        stat('⏱', '공격 간격', v.cd.toFixed(2) + '초', v.n > 1 ? `${v.n}회씩` : null),
        stat('🎯', '명중', sg(v.hit), hitTip),
        stat('🛡', 'AC', v.ac, acTip),
        stat('❤', '최대 체력', U.fmt(v.hp), `건강 ${sg(DN.mod(ab.con))} · d${c.hd}`),
        stat('💥', '치명', v.crit < 20 ? `${v.crit}~20` : '20', '이 눈이 나오면 치명타'),
        v.regen ? stat('✚', '재생', (v.regen * 100).toFixed(1) + '%/초', null) : null,
        v.move ? stat('👟', '이동', sg(v.move), null) : null),
      h('h4', null, '내성'),
      h('div.cs-saves', null, DN.AB.map(k => h('span' + (c.saves.includes(k) ? '.pro' : ''), { 'data-tip': c.saves.includes(k) ? '숙련' : null }, h('small', null, DN.AB_N[k]), h('b', null, sg(v.saves[k]))))),
      h('h4', null, '판정'),
      h('div.cs-saves.sk', null, Object.keys(SK_N).map(k => h('span' + (c.sk.includes(k) ? '.pro' : ''), { 'data-tip': c.sk.includes(k) ? '숙련' : null }, h('small', null, SK_N[k]), h('b', null, sg(DN.skill(m, k)))))));
  }

  // ── 오른쪽: 소지품 ──
  function drawInv(s, m) {
    const fits = t => TK.fits(t, m), own = TK.worn(s, m.uid);
    const others = TK.all(s).filter(t => t.on != null && t.on !== m.uid), store = TK.store(s);
    const list = [...own, ...store, ...others].filter(t => !filter || TK.slot(t) === filter).sort((a, b) => (b.on === m.uid) - (a.on === m.uid) || (a.on != null) - (b.on != null) || fits(b) - fits(a) || TK.score(b) - TK.score(a));
    if (item && !TK.all(s).includes(item)) item = null;
    const cell = t => { const d = TK.def(t), owner = t.on != null && t.on !== m.uid ? GD.get(s, t.on) : null;
      return h('button.cs-cell.r' + d.r + (item === t ? '.sel' : '') + (fits(t) ? '' : '.unfit') + (t.on === m.uid ? '.mine' : ''), { style: `--rc:${RCOL[d.r - 1]}`, 'data-tip': TK.tip(t), on: { click: () => { item = item === t ? null : t; key = ''; } } },
        G.UI.itemIcon(t, 'cs-cic'), t.on === m.uid ? h('i.cs-e', null, 'E') : null, owner ? G.T.el(GD.tile(owner), 'cs-own') : null); };
    const empties = Math.max(0, TK.CAP - list.length);
    const chips = [null, 'w', 'a', 't'].map(k => h('button.cs-chip' + (filter === k ? '.on' : ''), { on: { click: () => { filter = k; key = ''; } } }, k ? SLOT_N[k] : '전체'));
    return h('div.cs-inv', null,
      h('div.cs-invh', null, h('div.cs-chips', null, chips), h('small', { 'data-tip': '창고' }, `창고 ${store.length}/${TK.CAP}`),
        h('button.cs-chip' + (s.autoTr !== false ? '.on' : ''), { 'data-tip': '출발할 때 · 주울 때 알아서 낀다', on: { click: () => { s.autoTr = s.autoTr === false; if (s.autoTr) TK.auto(s); key = ''; } } }, '자동 장착')),
      h('div.cs-cells', null, list.map(cell), Array.from({ length: empties }, () => h('i.cs-cell.empty'))),
      item ? itemCard(s, m, item) : filter && filter !== 't' ? gearCard(s, m, filter) : h('div.cs-card.none', null, h('small', null, list.length ? '물건을 누르면 비교' : '아직 물건이 없다')));
  }
  function itemCard(s, m, t) {
    const d = TK.def(t), mine = t.on === m.uid, can = TK.fits(t, m), owner = t.on != null && !mine ? GD.get(s, t.on) : null, cur = wornIn(s, m, TK.slot(t));
    const dl = !mine && can ? delta(s, m, t) : [];
    return h('div.cs-card', { style: `--rc:${RCOL[d.r - 1]}` },
      h('div.cs-chd', null, G.UI.itemIcon(t, 'cs-cic'), h('div', null, h('b', null, d.n), h('small', null, `${RN[d.r - 1]} · ${SLOT_N[TK.slot(t)]}${d.en ? ` · ${d.en}` : ''}`))),
      h('div.cs-tags', null, TK.tags(t).map(x => h('span', null, x))),
      d.fit ? h('small.cs-fit' + (can ? '' : '.no'), null, d.fit.map(c => D.F.allies[c].n).join(' · ')) : null,
      owner ? h('small.cs-fit', null, `${owner.name} 착용 중`) : null,
      dl.length ? h('div.cs-dl', null, dl.map(r => h('div' + (r.up ? '.up' : '.down'), null, h('small', null, r.n), h('span', null, r.x), h('i', null, '→'), h('b', null, r.y)))) : null,
      h('div.cs-acts', null,
        mine ? h('button.cs-btn', { on: { click: () => { TK.equip(s, t.id, null); key = ''; } } }, '빼기')
          : h('button.cs-btn.go', { disabled: !can, on: { click: () => { TK.equip(s, t.id, m.uid); key = ''; } } }, !can ? '직업 안 맞음' : cur ? `${TK.name(cur)} 대신 끼기` : '끼기')));
  }
  // 무기 · 갑옷 칸에 기본 장비만 있을 때: 강화 (마을에서)
  function gearCard(s, m, sl) {
    const DG = D.GEAR[m.cls] || D.GEAR.archer, g = GD.gear(m)[sl], c = GD.gearCost(m, sl), nx = GD.magic(g + 1) > GD.magic(g);
    return h('div.cs-card', null,
      h('div.cs-chd', null, gearIcon(m, sl, 'cs-cic'), h('div', null, h('b', null, GD.gearName(m, sl)), h('small', null, `${SLOT_N[sl]} · ${DG[sl][1]} · 강화 ${g}`))),
      s.town && crew(s, m) ? h('div.cs-acts', null, h('button.cs-btn.go', { disabled: s.gold < c, 'data-tip': `${sl === 'w' ? '피해' : '체력'} ×1.1${nx ? ` · ${sl === 'w' ? '명중' : 'AC'} +1` : ''}`, on: { click: () => { if (GD.upgrade(s, m, sl)) { G.SFX.play('coin'); key = ''; } } } }, `강화 +${g + 1}`, h('small', null, ' ' + U.fmt(c)))) : null);
  }
  // ── 오른쪽: 기술 ──
  function drawSkills(s, m) {
    const row = (S, k, tag, off, cls = '') => { const cd = h('i.cs-cd'), el = h('div.cs-sk' + cls + (off ? '.off' : ''), null, h('span.cs-skic', null, G.T.el(S.t, 'cs-skimg'), cd), h('div', null, h('b', null, tag + S.n), h('small', null, `${G.Skill.desc(m, k)}${off ? ` · Lv ${off}` : ''}`))); if (k && S.cool) live.sk.push({ k, cd, max: S.cool }); return el; };
    return h('div.cs-sks', null,
      h('div.cs-skh', null, h('small', { 'data-tip': '용병 레벨로 오른다' }, '스킬 레벨'), h('b', null, '★' + GD.skillLv(m))),
      (m.skills || []).map((k, i) => { const lv = GD.slotLv(i, m, k); return row(D.MSKILLS[k], k, k === D.MSIG[m.cls] ? '★ ' : '', m.lv < lv ? lv : 0); }),
      (m.adv ? D.ADV[m.adv].sig : []).map(k => { const lv = GD.skLv(m.cls, k); return row(D.MSKILLS[k], k, '', m.lv < lv ? lv : 0, '.sig'); }),
      (m.boons || []).map(k => row(D.BOONS[k], null, '', 0, '.boon')));
  }
  function drawSide(s, m) {
    const isCrew = crew(s, m), cur_ = isCrew ? side : 'skill';
    return h('section.cs-col.cs-side', { 'data-m': cur_ === 'inv' ? 'inv' : 'skill' },
      isCrew ? h('div.cs-stabs', null, h('button' + (cur_ === 'inv' ? '.on' : ''), { on: { click: () => { side = 'inv'; key = ''; } } }, '소지품'), h('button' + (cur_ === 'skill' ? '.on' : ''), { on: { click: () => { side = 'skill'; key = ''; } } }, '기술')) : h('h4', null, '기술'),
      cur_ === 'inv' ? drawInv(s, m) : drawSkills(s, m));
  }
  // 위 줄: 함께 다니는 사람들
  function drawStrip(s, m) {
    stripEl.innerHTML = '';
    const list = [GD.leader(s), ...F.lineup(s).map(u => GD.get(s, u)).filter(Boolean)];
    if (!list.includes(m)) list.push(m);
    for (const q of list) stripEl.append(h('button.cs-face' + (q === m ? '.on' : ''), { 'data-tip': q.name, on: { click: () => api.open(q) } }, G.T.el(GD.tile(q), 'cs-fimg'), h('b', null, q.lv)));
  }
  function statKey(s, m) { const v = snap(s, m); return [v.atk, v.hp, v.ac, v.hit, v.cd, v.crit, v.regen, v.move, DN.AB.map(k => v.ab[k]).join()].join(); }
  const api = {
    el,
    current: () => cur,
    isOpen: () => !!cur,
    open(m) { if (cur !== m) { item = null; armed = null; filter = null; } cur = m; key = ''; G.SFX.play('select'); },
    close() { cur = null; item = null; armed = null; filter = null; key = ''; tog(el, 'hidden', true); },
    update() {
      const s = f();
      if (!cur) return;
      const m = cur, isOffer = (s.tavern?.offers || []).some(o => o.m === m);
      if (!GD.get(s, m.uid) && !isOffer) { api.close(); return; }
      tog(el, 'hidden', false);
      if (s.town) G.Exp.hold(s);
      const k = [m.uid, m.lv, m.bt, Math.round(m.xp / GD.needOf(m) * 40), m.inj > 0, m.adv, m.job, side, mtab, filter, item && item.id, armed, s.town, s.gold >= 0 && s.town ? Math.floor(Math.log10(s.gold + 1) * 10) : 0, s.autoTr, F.lineup(s).join(), TK.all(s).map(t => `${t.id}:${t.on}`).join(), statKey(s, m)].join('|');
      if (k !== key) {
        key = k;
        // 다시 그려도 스크롤은 그대로
        const scroll = [...body.querySelectorAll('.cs-col')].map(c => c.scrollTop);
        drawStrip(s, m);
        mtabs.innerHTML = '';
        for (const [id, n] of [['doll', '인물'], ['stat', '수치'], ['inv', crew(s, m) ? '소지품' : '기술']]) mtabs.append(h('button' + (mtab === id ? '.on' : ''), { on: { click: () => { mtab = id; if (id === 'inv') side = 'inv'; key = ''; } } }, n));
        if (crew(s, m)) mtabs.append(h('button' + (mtab === 'skill' ? '.on' : ''), { on: { click: () => { mtab = 'skill'; side = 'skill'; key = ''; } } }, '기술'));
        body.innerHTML = '';
        body.dataset.m = mtab === 'inv' && !crew(s, m) ? 'skill' : mtab;
        body.append(drawDoll(s, m), drawStats(s, m), drawSide(s, m));
        [...body.querySelectorAll('.cs-col')].forEach((c, i) => { c.scrollTop = scroll[i] || 0; });
      }
      // 매 틱 바뀌는 것: 체력 · 상태 · 쿨타임
      const rt = F.rt(s), p = !s.town && rt.party.find(q => q.merc === m), L = live;
      const max = p ? p.max : (m.lead ? F.heroHP(s) : F.allyHP(s, bodyOf(s, m))), cur_ = p ? (p.dead ? 0 : Math.max(0, p.hp)) : max;
      setW(L.hp.fill, max ? cur_ / max : 0);
      tog(L.hp, 'low', max > 0 && cur_ / max < 0.3);
      setText(L.hpT, p && p.dead ? `쓰러짐 ${Math.ceil(p.reviveT)}초` : `${U.fmt(cur_)} / ${U.fmt(max)}`);
      const conds = [];
      if (m.inj > 0) conds.push(`🩹 부상 ${Math.ceil(m.inj)}초`);
      if (p && p.cond) for (const c in p.cond) if (DN.has(p, c) && DN.COND[c]) conds.push(DN.COND[c].n);
      const cs = conds.join('|');
      if (L.cond.dataset.k !== cs) { L.cond.dataset.k = cs; L.cond.innerHTML = ''; for (const c of conds) L.cond.append(h('span', null, c)); }
      for (const x of L.sk) { const v = p?.cds?.[x.k] || 0; x.cd.style.setProperty('--cd', Math.max(0, v / x.max)); }
    },
  };
  if (G.UI.sheetKeys) document.removeEventListener('keydown', G.UI.sheetKeys);
  document.addEventListener('keydown', G.UI.sheetKeys = e => { if (e.key === 'Escape' && cur) { api.close(); e.preventDefault(); } });
  return api;
};
