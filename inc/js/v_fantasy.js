'use strict';
// 판타지 화면: 옆 대시보드 없이 전부 맵 위에 (파티 게임 UI — Baldur's Gate 3·Divinity의 왼쪽 초상 줄, 아래 기술 줄)
//  왼쪽 위: 층 이동·자동 하강, 원정대 합산 체력, 그 아래 작은 능력치 줄, 오염·버프 / 왼쪽: 편성 단추 + 파티 초상(체력·쓰러짐) / 아래: 기술
//  오른쪽 아래 스킬트리 단추는 세계 화면 틀(v_world)이 단다
G.UI.views.fantasy = function () {
  const f = () => G.S.w.fantasy, F = G.Fantasy, D = G.D.F, U = G.U;

  // ── 왼쪽 위: 층 + 원정대 상태
  const floorEl = h('b'), hudMon = G.T.el('m_rat', 'xs'), hudLeft = h('small'), maxEl = h('small.dim');
  const prev = h('button.fbtn', { on: { click: () => F.goto(f(), f().floor - 1) } }, '◀');
  const next = h('button.fbtn', { on: { click: () => F.goto(f(), f().floor + 1) } }, '▶');
  const auto = G.UI.toggle('⤓', () => f().auto, v => { f().auto = v; }, '자동 하강');
  auto.el.classList.add('fbtn');
  const hudHp = G.UI.meter(''), corrEl = h('small.corr'), buffEl = h('div.buffs');
  // 파티 능력치: 아이콘 + 숫자, 합산 체력 바로 아래 작게
  const stats = {};
  const statEl = h('div.minis', null, [['dps', 'u_sword', '파티 초당 피해'], ['aspd', 'st_haste', '공격 속도'], ['crit', 'g_dagger', '기사 치명'], ['smite', 'a_thunder', '벼락'], ['gold', 'ui_gold', '골드 배율'], ['matk', 'm_rat', '적 공격']]
    .map(([k, t, l]) => h('span.mini', { title: l }, k === 'matk' ? (stats.matkIc = G.T.el(t, 'xs')) : G.T.el(t, 'xs'), stats[k] = h('b'))));
  const hud = h('div.fhud', null,
    h('div.floorrow', null, prev, floorEl, next, auto.el),
    h('div.hud-sub', null, hudMon, hudLeft, maxEl),
    h('div.hud-hp', null, hudHp.el), statEl, corrEl, buffEl);

  // ── 기술 단축 버튼
  const skillBtns = Object.entries(F.SKILLS).map(([id, sk]) => {
    const cd = h('span.cd'), b = h('button.hot', { title: sk.n, on: { click: () => F.cast(f(), id) } }, G.T.el(sk.t, 'md'), cd, h('small', null, sk.n));
    return { id, sk, b, cd };
  });
  const hotbar = h('div', null, skillBtns.map(x => x.b));

  // ── 왼쪽: 파티 초상. 체력 막대, 쓰러지면 회색 + 부활까지 남은 초
  const frames = h('div.pframes');
  let partyKey = '';
  const rows = [];
  function buildParty() {
    // 층이 바뀌면 파티원 객체를 새로 만드므로, 이름이 같아도 객체가 다르면 다시 묶는다 (예전 객체를 붙잡으면 쓰러진 채 멈춘다)
    const rt = F.rt(f()), key = rt.party.map(p => p.id || 'hero').join();
    if (key === partyKey && rows.every((r, i) => r.p === rt.party[i])) return;
    partyKey = key;
    frames.querySelectorAll('.pf').forEach(e => e.remove());
    rows.length = 0;
    for (const p of rt.party) {
      const b = bar('hp'), dead = h('b.pf-dead');
      const el = h('div.pf' + (p.kind === 'hero' ? '.lead' : ''), null, h('div.pf-ic', null, G.T.el(p.t, 'pf-img'), dead), b);
      frames.append(el);
      rows.push({ p, b, dead, el });
    }
  }

  // ── 오른쪽 아래: 편성 · 능력치 (눌러서 여는 작은 창)
  const slotEl = h('small'), rosterEl = h('div.roster');
  const tAutoParty = G.UI.toggle('자동', () => f().autoParty !== false, v => F.setAuto(f(), v));
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
  const pop = h('div.fpop.hidden', null, h('div.card-h', null, slotEl, h('span.sp'), tAutoParty.el), rosterEl);
  let open = false;
  const partyBtn = h('button.fbtn.pbtn', { title: '편성', on: { click: e => { e.stopPropagation(); open = !open; tog(pop, 'hidden', !open); tog(partyBtn, 'on', open); } } }, '⇄');
  frames.append(h('div.pf-top', null, partyBtn, pop));

  const overlay = h('div.fover', null, hud, frames);
  let buffKey = '';
  return G.UI.worldScreen('fantasy', {
    overlay, hotbar,
    update() {
      const s = f(), rt = F.rt(s), band = D.bands[F.band(s.floor)], ph = F.partyHP(rt), corr = F.corruption(s, rt);
      setText(floorEl, `제 ${s.floor}층${F.isBoss(s.floor) ? ' · 보스' : ''}`);
      prev.disabled = s.floor <= 1;
      next.disabled = s.floor >= s.maxFloor;
      auto.update();
      G.T.set(hudMon, band.mons[0].t);
      setText(hudLeft, rt.phase === 'dead' ? ` 전멸 · ${Math.ceil(rt.reviveT)}` : ` ${rt.mons.length}`);
      setText(maxEl, ` · 최고 ${s.maxFloor}`);
      hudHp.set(ph.hp / ph.max, `${U.fmt(ph.hp)} / ${U.fmt(ph.max)}`);
      tog(hudHp.bar, 'low', ph.hp / ph.max < 0.3);
      setText(corrEl, corr > 0 ? `☣ -${(corr * 100).toFixed(1)}%/초` : '');
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
      buildParty();
      for (const r of rows) {
        const p = r.p, dead = p.dead;
        setW(r.b.fill, dead ? 0 : p.hp / p.max);
        tog(r.b, 'low', !dead && p.hp / p.max < 0.3);
        tog(r.el, 'down', dead);
        setText(r.dead, dead ? Math.ceil(p.reviveT) : '');
        const atk = p.kind === 'hero' ? F.heroAtk(s) : p.def.heal ? 0 : F.allyAtk(s, p);
        r.el.title = `${p.kind === 'hero' ? '기사' : p.def.n} · ${U.fmt(Math.max(0, p.hp))}/${U.fmt(p.max)}${atk ? ` · ⚔ ${U.fmt(atk)}` : ''}`;
      }
      setText(stats.dps, U.fmt(F.partyDps(s, rt)));
      setText(stats.aspd, F.aspd(s).toFixed(2));
      setText(stats.crit, U.pct(F.crit()));
      setText(stats.smite, U.fmt(F.smiteDmg(s)));
      setText(stats.gold, `×${U.fmt(F.goldMult(s))}`);
      G.T.set(stats.matkIc, band.mons[0].t);
      setText(stats.matk, U.fmt(F.monAtk(s.floor, false)));
      // 편성 창은 열려 있을 때만 채운다
      if (open) {
        buildRoster();
        const lineup = F.lineup(s);
        setText(slotEl, `${lineup.length} / ${F.slots()}`);
        tAutoParty.update();
        for (const id in rosterBtns) tog(rosterBtns[id], 'on', lineup.includes(id));
      }
    },
  });
};
