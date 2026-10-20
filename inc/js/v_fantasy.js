'use strict';
// 판타지 화면: 옆 대시보드 없이 전부 맵 위에 (파티 게임 UI — Baldur's Gate 3·Divinity의 왼쪽 초상 줄, 아래 기술 줄)
//  왼쪽 위: 층 이동·자동 하강 / 위 가운데: 원정대 합산 체력(제한 시간처럼 줄어드는 막대) + 오른쪽에 오염 피해, 바로 아래 파티 공용 능력치 4×2
//  왼쪽: 편성 단추 + 파티 초상(체력·쓰러짐), 초상마다 오른쪽에 걸린 버프. 초상에 올리면(누르면) 그 캐릭터 능력치 카드 / 아래: 기술
//  오른쪽 아래 스킬트리 단추는 세계 화면 틀(v_world)이 단다
G.UI.views.fantasy = function () {
  const f = () => G.S.w.fantasy, F = G.Fantasy, D = G.D.F, U = G.U;

  // ── 왼쪽 위: 층 + 원정대 상태
  const floorEl = h('b'), hudMon = G.T.el('m_rat', 'xs'), hudLeft = h('small'), maxEl = h('small.dim');
  const prev = h('button.fbtn', { on: { click: () => F.goto(f(), f().floor - 1) } }, '◀');
  const next = h('button.fbtn', { on: { click: () => F.goto(f(), f().floor + 1) } }, '▶');
  const auto = G.UI.toggle('⤓', () => f().auto, v => { f().auto = v; }, '자동 하강');
  auto.el.classList.add('fbtn');
  // 파티 전체 능력치(트리로 올린 파티 공용 배율): 아이콘 + 숫자 한 줄, 올리면 뜻이 뜬다. 기사만의 수치(치명)는 기사 카드로
  const stats = {};
  const statEl = h('div.minis', null, [['atk', 'u_sword', '파티 공격력 배율 (기사·동료 모두)'], ['hp', 'u_armor', '파티 체력 배율'], ['aspd', 'st_haste', '공격 속도 배율'], ['regen', 'b_regen', '초당 체력 재생'], ['armor', 'd_shield', '받는 피해 감소'], ['smite', 'a_thunder', '벼락 피해'], ['gold', 'ui_gold', '골드 배율'], ['matk', 'm_rat', '이 층 적의 공격력']]
    .map(([k, t, l]) => h('span.mini', { 'data-tip': l }, k === 'matk' ? (stats.matkIc = G.T.el(t, 'xs')) : G.T.el(t, 'xs'), stats[k] = h('b'))));
  const hud = h('div.fhud', null,
    h('div.floorrow', null, prev, floorEl, next, auto.el),
    h('div.hud-sub', null, hudMon, hudLeft, maxEl));
  // ── 위 가운데: 원정대 체력 (다 닳면 전멸) + 오염 피해
  const hpBar = bar('hp'), hpTxt = h('b.php-t'), corrEl = h('span.corr', { 'data-tip': '던전 오염: 깊을수록 초당 최대 체력의 일정 비율이 깎인다' });
  const top = h('div.ftop', null, h('div.ftop-r', null, h('div.php', null, hpBar, hpTxt), corrEl), statEl);


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
    // 기사가 맨 위, 동료는 영입한 순서대로
    const rt = F.rt(f()), order = F.recruits(f());
    const list = [rt.hero, ...[...rt.allies].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))];
    const key = list.map(p => p.id || 'hero').join();
    if (key === partyKey && rows.length === list.length && rows.every((r, i) => r.p === list[i])) return;
    partyKey = key;
    frames.querySelectorAll('.pf').forEach(e => e.remove());
    rows.length = 0;
    for (const p of list) {
      const b = bar('hp'), dead = h('b.pf-dead'), buffs = h('div.pf-buffs'), card = h('div.pf-card');
      // 모바일은 올릴 수 없으니 눌러서 카드를 연다
      const el = h('div.pf' + (p.kind === 'hero' ? '.lead' : ''), { on: { click: () => el.classList.toggle('show') } },
        h('div.pf-ic', null, G.T.el(p.t, 'pf-img'), dead), b, buffs, card);
      frames.append(el);
      rows.push({ p, b, dead, el, buffs, card, bk: null });
    }
  }
  // 캐릭터 카드: 이름, 체력, 그 캐릭터만의 수치 (기사: 공격·치명 / 동료: 공격·공격 간격 / 수도사: 치유)
  function cardLines(s, p) {
    const hp = `❤ ${U.fmt(Math.max(0, p.hp))} / ${U.fmt(p.max)}`;
    if (p.kind === 'hero') return ['기사', hp, `⚔ ${U.fmt(F.heroAtk(s))} · ${F.aspd(s).toFixed(2)}/초`, `치명 ${U.pct(F.crit())} · ×${F.critD().toFixed(1)}`];
    const d = p.def;
    if (d.heal) return [d.n, hp, `✚ 치유 ${Math.round(d.heal * 100 * G.Tree.mul('fantasy', s.tree, 'clericHeal'))}% · ${d.cd}초마다`];
    return [d.n, hp, `⚔ ${U.fmt(F.allyAtk(s, p))} · ${(F.allyCd(p) / F.aspd(s)).toFixed(1)}초마다`, ...(d.song ? [`♪ 노래 ${Math.round(F.songDur())}초`] : [])];
  }

  // ── 오른쪽 아래: 편성 · 능력치 (눌러서 여는 작은 창)
  const slotEl = h('small'), rosterEl = h('div.roster');
  const tAutoParty = G.UI.toggle('자동', () => f().autoParty !== false, v => F.setAuto(f(), v));
  let rosterKey = '';
  const rosterBtns = {};
  function buildRoster() {
    const have = F.recruits(f()), key = have.join();
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

  const overlay = h('div.fover', null, hud, top, h('div.fleft', null, frames));
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
      setW(hpBar.fill, ph.hp / ph.max);
      tog(hpBar, 'low', ph.hp / ph.max < 0.3);
      setText(hpTxt, `${U.fmt(Math.max(0, ph.hp))} / ${U.fmt(ph.max)}`);
      // 오염 피해: 살아 있는 파티원 최대 체력 합 × 비율 (초당)
      const alive = rt.party.reduce((a, p) => a + (p.dead ? 0 : p.max || 0), 0);
      setText(corrEl, corr > 0 ? `☣ -${U.fmt(alive * corr)}/초` : '');
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
        // 버프는 파티 전체 효과라 살아 있는 모두의 초상 옆에 뜬다
        const bk = dead ? '' : Object.keys(s.buffs).filter(k => D.buffs[k] && k !== 'assault').join();
        if (bk !== r.bk) {
          r.bk = bk;
          r.buffs.innerHTML = '';
          for (const k of bk ? bk.split(',') : []) r.buffs.append(h('span.buff', { 'data-tip': `${D.buffs[k].n} · ${D.buffs[k].d}`, 'data-k': k, style: `--bc:${D.buffs[k].col}` }, G.T.el(D.buffs[k].t, 'xs'), h('small')));
        }
        for (const el of r.buffs.children) setText(el.lastChild, Math.ceil(s.buffs[el.dataset.k] || 0));
        const lines = cardLines(s, p);
        if (r.card.childNodes.length !== lines.length) { r.card.innerHTML = ''; for (const _ of lines) r.card.append(h('div')); r.card.firstChild.classList.add('pc-n'); }
        lines.forEach((t, i) => setText(r.card.childNodes[i], t));
      }
      const tmf = k => G.Tree.mul('fantasy', s.tree, k);
      setText(stats.atk, `×${U.fmt(tmf('atk') * F.dmgMult(s))}`);
      setText(stats.hp, `×${U.fmt(tmf('hp') * G.globalMult())}`);
      setText(stats.aspd, `×${F.aspd(s).toFixed(2)}`);
      setText(stats.regen, `${(F.regen(s) * 100).toFixed(1)}%`);
      setText(stats.armor, U.pct(F.armor()));
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
