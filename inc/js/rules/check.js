'use strict';
// 능력 판정 (전투 밖): 파티에서 그 기술을 가장 잘하는 사람(또는 정한 사람)이 굴린다.
// 옛 js/legacy/mission.js에서 이 함수만 가져왔다 (2026-11-17 — 나머지 임무 규칙은 old로). 부르는 곳이 많아 이름 G.Mission은 그대로 둔다.
G.Mission = (() => {
  const U = G.U, DC = fl => 10 + Math.floor(fl / 5); // 층에 따른 기본 DC (옛 미션 파일 그대로)
  const M = {
    // 굴린 결과까지: { who(굴린 사람), nat, mod, dc, ok } — 말풍선에 판정을 보여 줄 때 (실패해도 who가 있다)
    roll(f, rt, sk, extra = 0, by = null, fixDC = null) {
      const ms = rt.party.filter(p => p.merc && !p.dead), b = G.Dnd.best(ms.map(p => p.merc), sk);
      if (!b.m) return null;
      // 가장 잘하는 사람과 2 이내면 누구든 나선다 (늘 같은 사람만 말하지 않게)
      const val = p => G.Dnd.best([p.merc], sk).v, who = by && !by.dead ? by : U.pick(ms.filter(p => val(p) >= b.v - 2)), B = G.Items.bag(f), climb = sk === 'athletics' && B['Potion of Climbing'] > 0 && (B['Potion of Climbing']--, true), adv = climb || G.Trinket.props(who.merc, 'skAdv').some(q => q[1] === sk), nat0 = G.Dnd.d20(adv ? 1 : 0), nat = G.Dnd.reliable(who.merc) && G.Dnd.profs(who.merc).includes(sk) ? Math.max(10, nat0) : nat0, mod = (sk === 'athletics' && who.merc.adv === 'thief' && who.merc.lv >= 3 ? Math.max(G.Dnd.skill(who.merc, sk), G.Dnd.skill(who.merc, 'acrobatics')) : G.Dnd.skill(who.merc, sk)) /* 2층 작업 (SRD 도둑) */ - 2 * (who.merc.exh || 0) - (who.merc.raisePen || 0), /* 사자 소생 (SRD): d20 −4, 긴 휴식마다 1씩 */ /* 믿음직한 재능 (SRD): 숙련 판정은 9 이하를 10으로 · 등반의 물약 · 엘프의 장화 같은 이점 · 탈진 */ dc = fixDC ?? DC(f.floor) + extra + (G.CHECK_DC || 0);
      let tot = nat + mod;
      if (tot < dc) { const h = G.Util?.help(rt, sk, who); if (h?.adv) tot = Math.max(tot, G.Dnd.d20(0) + mod); else if (h?.b) tot += h.b; } // 전투 밖 주문 (G.Util): 유도 +1d4 · 그 판정에 맞는 주문은 이점
      if (tot < dc && G.Guild.skill(who.merc, 'x_tmind') && G.Res.can(who.merc, 'sr_second', G.Skill.SK.sr_second.res)) { tot += 1 + U.rand(10); if (tot >= dc) { G.Res.pay(who.merc, 'sr_second', G.Skill.SK.sr_second.res); G.Pool.used(who, 'x_tmind'); } } // 전술적 사고 (SRD): 실패에 d10. 그래도 실패면 소모 안 함
      return { who, nat, mod: tot - nat, dc, ok: tot >= dc };
    },
    // 옛 실시간 임무 — 새 게임에 없다. 옛 지형 모듈(legacy/fantasy · guild)이 아직 부르는 이름만 빈 함수로
    targets: () => [], ents: () => [], ahead: () => [], label: () => '', start() {}, tick() {}, leave() {}, relic() {},
  };
  return M;
})();
