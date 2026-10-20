'use strict';
// 판타지 화면: 던전 맵(안개·미니맵) + 옆 패널(층, 원정대 합산 체력·오염, 편성, 파티원 상태창, 파티 능력치) + 기술·버프 단축 줄
G.UI.views.fantasy = function () {
  const f = () => G.S.w.fantasy, F = G.Fantasy, D = G.D.F, U = G.U;

  const hudFloor = h('b'), hudMon = G.T.el('m_rat', 'xs'), hudLeft = h('small');
  const hudHp = G.UI.meter('원정대');
  const buffEl = h('div.buffs');
  const hud = h('div', null, hudFloor, h('span.hud-mon', null, hudMon, hudLeft), h('div.hud-hp', null, hudHp.el), buffEl);

  // 기술 단축 버튼
  const skillBtns = Object.entries(F.SKILLS).map(([id, sk]) => {
    const cd = h('span.cd'), b = h('button.hot', { title: sk.n, on: { click: () => F.cast(f(), id) } }, G.T.el(sk.t, 'md'), cd, h('small', null, sk.n));
    return { id, sk, b, cd };
  });
  const hotbar = h('div', null, skillBtns.map(x => x.b));

  // 층
  const floorEl = h('b'), maxEl = h('small');
  const prev = h('button.btn.sm', { on: { click: () => F.goto(f(), f().floor - 1) } }, '◀');
  const next = h('button.btn.sm', { on: { click: () => F.goto(f(), f().floor + 1) } }, '▶');
  const auto = G.UI.toggle('자동 하강', () => f().auto, v => { f().auto = v; }, '끄면 같은 층을 반복해 사냥한다');

  // 원정대 합산 체력 + 오염
  const partyHp = G.UI.meter('원정대 체력'), corrEl = h('small.corr');
  // 편성: 연 동료 초상을 눌러 넣고 뺀다 (자동 편성이 기본)
  const slotEl = h('small'), rosterEl = h('div.roster');
  const tAutoParty = G.UI.toggle('자동 편성', () => f().autoParty !== false, v => F.setAuto(f(), v));
  let rosterKey = '';
  const rosterBtns = {};
  function buildRoster() {
    const have = F.roster(), key = have.join();
    if (key === rosterKey) return;
    rosterKey = key;
    rosterEl.innerHTML = '';
    for (const id of have) {
      const def = D.allies[id];
      rosterBtns[id] = h('button.rmember', { title: def.n, on: { click: () => { F.toggleMember(f(), id); G.SFX.play('select'); } } }, G.T.el(def.t, 'md'));
      rosterEl.append(rosterBtns[id]);
    }
  }

  // 파티 상태창: 초상, 이름, 체력, 역할 수치, 쓰러짐
  const partyEl = h('div.party-list');
  let partyKey = '';
  const partyRows = [];
  const role = p => {
    if (p.kind === 'hero') return [['u_sword', () => U.fmt(F.heroAtk(f()))]];
    const d = p.def;
    if (d.heal) return [['b_regen', () => `${Math.round(d.heal * 100 * G.Tree.mul('fantasy', f().tree, 'clericHeal'))}%`]];
    const atk = () => U.fmt(F.allyAtk(f(), p));
    if (d.song) return [['fx_song', () => `${Math.round(F.songDur())}초`], ['u_sword', atk]];
    return [['u_sword', atk]];
  };
  function buildParty() {
    const rt = F.rt(f());
    const key = rt.party.map(p => p.id || 'hero').join();
    if (key === partyKey) return;
    partyKey = key;
    partyEl.innerHTML = '';
    partyRows.length = 0;
    for (const p of rt.party) {
      const b = bar('hp'), hpT = h('small.hpt'), st = h('small.pst');
      const chips = role(p).map(([t, fn]) => { const v = h('b'); return { el: h('span.chip', null, G.T.el(t, 'xs'), v), v, fn }; });
      const el = h('div.prow', null, G.T.el(p.t, 'md'),
        h('div.pmain', null, h('div.pname', null, h('b', null, p.kind === 'hero' ? '기사' : p.def.n), st, chips.map(c => c.el)), b, hpT));
      partyEl.append(el);
      partyRows.push({ p, b, hpT, st, chips, el });
    }
  }
  // 파티 능력치: 아이콘 + 숫자 (파티 합산과 기사 수치)
  const stats = {};
  const statEl = h('div.istats', null, [['dps', 'u_sword', '파티 초당 피해'], ['aspd', 'st_haste', '공격 속도'], ['crit', 'g_dagger', '기사 치명'], ['smite', 'a_thunder', '벼락'], ['gold', 'ui_gold', '골드 배율'], ['matk', 'm_rat', '적 공격']]
    .map(([k, t, l]) => h('div.istat', { title: l }, k === 'matk' ? (stats.matkIc = G.T.el(t, 'xs')) : G.T.el(t, 'xs'), stats[k] = h('b'))));

  const side = h('div', null,
    h('div.card', null, h('div.card-h', null, prev, h('div.big', null, '제 ', floorEl, '층'), next, maxEl), auto.el),
    h('div.card', null, partyHp.el, corrEl,
      h('div.card-h', null, h('b', null, '편성'), slotEl, h('span.sp'), tAutoParty.el), rosterEl, partyEl),
    h('div.card', null, statEl));

  let buffKey = '';
  return G.UI.worldScreen('fantasy', {
    side, hud, hotbar,
    update() {
      const s = f(), rt = F.rt(s), band = D.bands[F.band(s.floor)], ph = F.partyHP(rt), corr = F.corruption(s, rt);
      setText(hudFloor, `제 ${s.floor}층${F.isBoss(s.floor) ? ' · 보스' : ''}`);
      G.T.set(hudMon, band.mons[0].t);
      setText(hudLeft, rt.phase === 'dead' ? ` 전멸 · ${Math.ceil(rt.reviveT)}` : ` ${rt.mons.length}`);
      hudHp.set(ph.hp / ph.max, `${U.fmt(ph.hp)} / ${U.fmt(ph.max)}`);
      partyHp.set(ph.hp / ph.max, `${U.fmt(ph.hp)} / ${U.fmt(ph.max)}`);
      tog(partyHp.bar, 'low', ph.hp / ph.max < 0.3);
      setText(corrEl, corr > 0 ? `☣ 오염 초당 -${(corr * 100).toFixed(1)}%` : '');
      // 지금 걸린 버프: 아이콘 + 남은 초
      const bk = Object.keys(s.buffs).filter(k => D.buffs[k]).join();
      if (bk !== buffKey) {
        buffKey = bk;
        buffEl.innerHTML = '';
        for (const k of bk ? bk.split(',') : []) buffEl.append(h('span.buff', { title: `${D.buffs[k].n} · ${D.buffs[k].d}`, 'data-k': k, style: `--bc:${D.buffs[k].col}` }, G.T.el(D.buffs[k].t, 'xs'), h('small')));
      }
      for (const el of buffEl.children) setText(el.lastChild, Math.ceil(s.buffs[el.dataset.k] || 0));
      for (const x of skillBtns) {
        const un = F.unlocked(x.id), cd = s.cds[x.id] || 0;
        tog(x.b, 'hidden', !un);
        x.b.disabled = cd > 0 || !F.canCast(s, x.id);
        setText(x.cd, cd > 0 ? Math.ceil(cd) : '');
      }
      setText(floorEl, s.floor);
      setText(maxEl, `최고 ${s.maxFloor} · ☠ ${s.deaths}/3`);
      prev.disabled = s.floor <= 1;
      next.disabled = s.floor >= s.maxFloor;
      auto.update();
      // 편성
      buildRoster();
      const lineup = F.lineup(s);
      setText(slotEl, ` ${lineup.length} / ${F.slots()}`);
      tAutoParty.update();
      for (const id in rosterBtns) tog(rosterBtns[id], 'on', lineup.includes(id));
      buildParty();
      for (const r of partyRows) {
        const p = r.p, dead = p.dead;
        setW(r.b.fill, dead ? 0 : p.hp / p.max);
        tog(r.b, 'dead', dead);
        tog(r.b, 'low', !dead && p.hp / p.max < 0.3);
        tog(r.el, 'down', dead);
        setText(r.hpT, `${U.fmt(Math.max(0, p.hp))} / ${U.fmt(p.max)}`);
        setText(r.st, dead ? ` ☠ ${Math.ceil(p.reviveT)}초` : '');
        for (const c of r.chips) setText(c.v, c.fn());
      }
      setText(stats.dps, U.fmt(F.partyDps(s, rt)));
      setText(stats.aspd, `${F.aspd(s).toFixed(2)}/초`);
      setText(stats.crit, `${U.pct(F.crit())} ×${F.critD().toFixed(1)}`);
      setText(stats.smite, U.fmt(F.smiteDmg(s)));
      setText(stats.gold, `×${U.fmt(F.goldMult(s))}`);
      G.T.set(stats.matkIc, band.mons[0].t);
      setText(stats.matk, U.fmt(F.monAtk(s.floor, false)));
    },
  });
};
