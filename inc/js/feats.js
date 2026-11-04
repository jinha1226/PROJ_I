'use strict';
// 출신 재주 (DESIGN.md 61 · SRD 5.2.1 「Origin Feats」): 고용할 때 하나, 바뀌지 않는다. m.feat
// 경계 · 마법 입문(클레릭 · 드루이드 · 위저드) · 야만적 공격자 · 숙련. 효과는 수치 배율이 아니라 할 수 있는 일
// 현판(banner)은 머리 위에 생긴 일을 띄우는 연출 — 관계 · 마법 물건이 같이 쓴다
G.Feat = (() => {
  const U = G.U, D = G.D;
  // 마법 입문 주문은 「긴 휴식에 한 번」 — 방치형이라 그 주문 쿨다운 ×MI_K
  const MI_K = 3, SAVAGE_T = 2;
  const Ft = {
    MI_K,
    def: m => (m && m.feat ? D.FEATS[m.feat] : null),
    has: (m, k) => !!m && (m.feat === k || (m.cls === 'warlock' && (k === 'alert' || k === 'savage') && G.Opt.of(m).includes('iv_' + k))),
    roll: () => U.pick(Object.keys(D.FEATS)),
    // 마법 입문이 주는 주문 (직업 기술에 이미 있으면 그쪽 쿨다운)
    spell: m => Ft.def(m)?.spell || null,
    // 야만적 공격자: 한 턴(2초)에 한 번, 명중 피해를 두 번 굴려 큰 쪽 — 피해 주사위 폭을 ±50%로 보고 둘 중 큰 쪽
    savage(a) {
      if (!a.merc || !Ft.has(a.merc, 'savage') || a.savT > G.S.runTime) return 1;
      a.savT = G.S.runTime + SAVAGE_T;
      return 0.5 + Math.max(Math.random(), Math.random());
    },
    // 머리 위 현판 (DD 연출): 한 번에 하나씩 — 앞 현판이 뜬 지 0.9초 뒤에, 같은 사람 머리 위는 앞 것이 거의 사라진 뒤에
    BANNER_COL: { good: '#8fef8f', bad: '#ff6b6b', bond: '#ff9ac0', loot: '#f4efe2' },
    banner(rt, a, ic, s, kind, col) {
      const c = col || Ft.BANNER_COL[kind], now = G.S.runTime, wait = Math.max(0, (rt.bannerAt || 0) + 0.9 - now, (a._bannerEnd || 0) - 0.4 - now);
      rt.bannerAt = now + wait;
      a._bannerEnd = now + wait + 2.6;
      G.fx(rt, { k: 'banner', ent: a, x: a.x, y: a.y, ic, s, col: c, wait, t: 2.6 + wait });
      G.fx(rt, { k: 'ring', x: a.x, y: a.y, r: 1.2, t: 0.5, col: c });
      a._qfx = { t: now + wait, kind };
      G.J.sfx('fantasy', kind === 'bad' ? 'quirkBad' : 'quirkGood');
      if (kind === 'bad') G.J.shake('fantasy', 3);
    },
  };
  return Ft;
})();
