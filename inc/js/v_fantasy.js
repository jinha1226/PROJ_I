'use strict';
// 판타지 화면: 던전 맵 + 옆 패널(층, 파티, 능력치, 주방) + 기술 단축 버튼
G.UI.views.fantasy = function () {
  const f = () => G.S.w.fantasy, F = G.Fantasy, D = G.D.F, U = G.U;

  const hudFloor = h('b'), hudLeft = h('small');
  const hud = h('div', null, hudFloor, hudLeft, h('small.dim', null, '맵을 누르면 벼락 일격'));

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
  const auto = G.UI.toggle('계속 내려가기', () => f().auto, v => { f().auto = v; }, '끄면 같은 층을 반복해 사냥한다');
  // 파티
  const partyEl = h('div.party-list');
  let partyKey = '';
  const partyRows = [];
  function buildParty() {
    const rt = F.rt(f());
    const key = rt.party.map(p => p.id || 'hero').join();
    if (key === partyKey) return;
    partyKey = key;
    partyEl.innerHTML = '';
    partyRows.length = 0;
    for (const p of rt.party) {
      const b = bar('hp'), nm = p.kind === 'hero' ? '요리하는 기사' : p.def.n;
      partyEl.append(h('div.prow', null, G.T.el(p.t, 'sm'), h('div', null, h('small', null, nm), b)));
      partyRows.push({ p, b });
    }
  }
  // 능력치
  const stats = {};
  const statEl = h('div.stats.mini', null, [['atk', '공격력'], ['aspd', '공격 속도'], ['crit', '치명타'], ['smite', '벼락 일격'], ['gold', '골드 배율'], ['matk', '적 공격']]
    .map(([k, l]) => h('div.stat', null, h('small', null, l), stats[k] = h('b'))));
  // 주방
  const ingEls = {};
  const ings = h('div.ings', null, Object.entries(D.ingredients).map(([k, d]) => h('span.ing', { title: d.n }, G.T.el('i_' + k, 'xs', d.e), ingEls[k] = h('b'))));
  const recipes = D.recipes.map(r => {
    const st = h('small.rs');
    const el = h('div.recipe-row', null, G.T.el('r_' + r.id, 'sm', r.e), h('div', null, h('b', null, r.n), h('small', null, r.d)), st);
    return { r, el, st };
  });

  const side = h('div', null,
    h('div.card', null, h('div.card-h', null, prev, h('div.big', null, '제 ', floorEl, '층'), next, maxEl), auto.el),
    h('div.card', null, h('div.card-h', null, h('b', null, '파티')), partyEl),
    h('div.card', null, statEl),
    h('div.card', null, h('div.card-h', null, h('b', null, '야전 주방'), ings), recipes.map(x => x.el),
      h('small.dim', null, '요리는 스킬트리에서 배우면 재료가 모일 때마다 알아서 만든다.')));

  return G.UI.worldScreen('fantasy', {
    side, hud, hotbar,
    update() {
      const s = f(), rt = F.rt(s);
      setText(hudFloor, `제 ${s.floor}층${F.isBoss(s.floor) ? ' · 보스' : ''}`);
      setText(hudLeft, rt.phase === 'dead' ? ` · 쓰러졌다… ${Math.ceil(rt.reviveT)}초` : rt.mons.length ? ` · 남은 적 ${rt.mons.length}` : ' · 계단으로');
      for (const x of skillBtns) {
        const un = F.unlocked(x.id), cd = s.cds[x.id] || 0;
        tog(x.b, 'hidden', !un);
        x.b.disabled = cd > 0;
        setText(x.cd, cd > 0 ? Math.ceil(cd) : '');
      }
      setText(floorEl, s.floor);
      setText(maxEl, `최고 ${s.maxFloor}층 · 쓰러짐 ${s.deaths}/3`);
      prev.disabled = s.floor <= 1;
      next.disabled = s.floor >= s.maxFloor;
      auto.update();
      buildParty();
      for (const r of partyRows) { setW(r.b.fill, r.p.dead ? 0 : r.p.hp / r.p.max); tog(r.b, 'dead', r.p.dead); }
      setText(stats.atk, U.fmt(F.heroAtk(s)));
      setText(stats.aspd, `${F.aspd().toFixed(2)}/초`);
      setText(stats.crit, `${U.pct(F.crit())} ×${F.critD().toFixed(1)}`);
      setText(stats.smite, U.fmt(F.smiteDmg(s)));
      setText(stats.gold, `×${U.fmt(F.goldMult(s))}`);
      setText(stats.matk, U.fmt(F.monAtk(s.floor, false)));
      for (const k in ingEls) setText(ingEls[k], s.ing[k]);
      for (const x of recipes) {
        const un = F.cookUnlocked(x.r), b = s.buffs[x.r.buff];
        tog(x.el, 'locked', !un);
        tog(x.el, 'active', !!b);
        setText(x.st, !un ? '잠김' : b ? `${Math.ceil(b)}초` : F.canCook(s, x.r) ? '준비' : '재료 부족');
      }
    },
  });
};
