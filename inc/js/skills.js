'use strict';
// 개인 기술 (DESIGN.md 43 · 56): 직업 풀에서 한 사람 넷 + 서브클래스 기능. 전부 자동 — 사람마다 쿨다운(a.cds)을 따로 돈다.
// when(c, x) = 지금 쓸 만한가, run(c, x) = 쓴다(false면 쓰지 않은 것으로 — 쿨다운도 돌지 않는다). 효과는 js/srd.js.
// 기술은 주로 상태이상을 건다. 걸린 상태를 규칙대로 받아치는 것은 트리의 연계기(G.Combo).
G.Skill = (() => {
  const D = G.D;
  const F = () => G.Fantasy;
  const GAP = 0.8, LV_K = 0.15;
  // 시전자 공격력 × 배율 × 스킬 레벨(+15%/레벨)
  const pow = c => 1 + LV_K * (G.Guild.skillLv(c.merc) - 1);
  // 기술 효과는 js/srd.js가 채운다 (SRD 직업 기술 · 주문 — DESIGN.md 56)
  const SK = {};

  const Sk = {
    SK, pow,
    // 동료 한 명: 열린 칸의 스킬 중 쿨다운이 끝났고 쓸 만한 것 하나 (한 번 쓰면 GAP초 쉰다)
    tick(f, rt, a, dt, seen) {
      const cds = a.cds || (a.cds = {});
      if (G.Skill.persist) G.Skill.persist(f, rt, a, dt);
      for (const k in cds) if ((cds[k] -= dt) <= 0) delete cds[k];
      if ((a.gcd -= dt) > 0 || !a.merc || a.dead) return;
      const x = { f, rt, seen };
      for (const k of G.Guild.active(a.merc)) {
        const S = SK[k];
        if (!S || cds[k] > 0 || !S.when(a, x)) continue;
        if (S.run(a, x) === false) continue;
        // 마법 입문으로만 아는 주문은 「긴 휴식에 한 번」 → 쿨다운 ×MI_K
        const mi = G.Feat.spell(a.merc) === k && !G.Guild.slots(a.merc).includes(k) && !(a.merc.adv && D.ADV[a.merc.adv].sig.includes(k));
        cds[k] = D.MSKILLS[k].cool * (F().sk(a, 'sr_quicken') ? 0.75 : 1) * (G.Dnd.boon(a.merc, 'recall') ? 0.85 : 1) * (mi ? G.Feat.MI_K : 1);
        a.gcd = GAP;
        a.lastSk = k;
        if (G.Sim) G.Sim.casts[k] = (G.Sim.casts[k] || 0) + 1;
        return;
      }
    },
    // 지도 밝히기 (정찰 · 지름길 · 보물 감지)
    reveal(rt, cx, cy, R) {
      const m = rt.map; cx = Math.round(cx); cy = Math.round(cy);
      for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) if (x >= 0 && y >= 0 && x < m.w && y < m.h && (x - cx) ** 2 + (y - cy) ** 2 <= R * R) rt.seen[y * m.w + x] = 1;
      rt.seenVer++;
    },
  };
  return Sk;
})();
