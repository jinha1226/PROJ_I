'use strict';
// 야영 (DESIGN.md 145): 긴 휴식은 원정 출발과 야영 물자로만. 층을 내려가도 체력 · 슬롯은 차지 않는다.
// 물자는 용병단 등급만큼 들고 다닌다. 들고 갈 수 · 값은 시험값이다. 한 층에 한 번 (SRD: 긴 휴식 뒤 16시간)
G.Camp = (() => {
  const F = () => G.Fantasy;
  const CAP = [1, 2, 2, 3, 3], COST = 20, START = 1, HP_LAST = 0.5, HP_SPARE = 0.75, SLOT_AT = 0.3; // 물자에 여유가 있으면 일찍 쉬고, 마지막 하나는 아낀다
  const avg = l => l.reduce((a, b) => a + b, 0) / (l.length || 1);
  // 야영으로 돌아오는 것 (DESIGN.md 158): 쓴 슬롯 · 기술 횟수 · 집중/마력 · 히트 다이스. 긴 휴식 전에 읽는다
  const gainOf = m => {
    const s = m.rs; if (!s) return [];
    const out = [];
    (s.sl || []).forEach((n, i) => { if (n > 0) out.push(`${i + 1}레벨 슬롯 ${n}`); });
    for (const k in s.fu || {}) { const n = s.fu[k], d = G.D.MSKILLS[k]; if (n > 0 && d && !k.startsWith('free_')) out.push(`${d.n} ${n}`); }
    if (s.fp > 0) out.push(`${m.cls === 'monk' ? '집중' : '마력'} ${s.fp}`);
    if (s.hd > 0) out.push(`히트 다이스 ${s.hd}`);
    return out;
  };
  // 무엇을 되찾았나에 따라 한마디
  const LINE = { slot: '주문이 다시 머릿속에 차오른다.', rage: '푹 잤더니 다시 피가 끓는다.', fp: '숨이 고르다. 기운이 돌아왔다.', skill: '이제 또 해 볼 수 있겠어.', hp: '한숨 잤더니 살 것 같다.' };
  const lineOf = g => (g.some(x => x.includes('슬롯')) ? LINE.slot : g.some(x => x.startsWith('격노')) ? LINE.rage : g.some(x => x.startsWith('집중') || x.startsWith('마력')) ? LINE.fp : g.some(x => !x.startsWith('히트')) ? LINE.skill : LINE.hp);
  const C = {
    COST,
    cap: f => CAP[G.Guild.rank(f).i] ?? CAP[CAP.length - 1],
    have: f => (f.supply == null ? (f.supply = START) : f.supply),
    canBuy: f => C.have(f) < C.cap(f) && (f.gold || 0) >= COST,
    buy(f) { if (!C.canBuy(f)) return false; f.gold -= COST; f.supply++; return true; },
    // 자동 정비: 살 수 있는 만큼 채운다
    stock(f) { while (C.buy(f)); },
    can: (f, rt) => !f.town && (C.have(f) > 0 || !!G.Util.camp(rt)) && !rt.turn && !rt.ask && !rt.scene && rt.campOn !== rt.map && rt.phase !== 'dead' && !rt.mons.some(o => o.aggro && o.hp > 0) && rt.party.some(p => !p.dead),
    use(f, rt) {
      if (!C.can(f, rt)) return false;
      if (!G.Util.camp(rt)) f.supply--; rt.campOn = rt.map; /* 음식과 물 창조 · 장엄한 저택 (SRD): 물자 없이 */ if (G.Tut.on(f)) G.Tut.get(f, rt, 'camp'); // 처음 쉬면 야영 단추가 나타난다
      const back = rt.party.filter(p => p.merc).map(p => ({ p, hp: Math.max(0, Math.round(p.max - Math.max(0, p.hp))), g: gainOf(p.merc) })); // 쉬기 전에 무엇을 썼나
      G.Res.longRest(f.mercs.concat(G.Guild.leader(f))); G.ItemX?.bean(f, rt); // 콩 주머니 (SRD): 쉬는 동안 하나 심는다
      for (const p of rt.party) { p.dead = false; p.dying = null; p.stable = false; p.hp = p.max; }
      const h = rt.hero; G.fx(rt, { k: 'text', x: h.x, y: h.y - 1.2, s: '🏕 야영', col: '#ffd24a', t: 1.6, sz: 1, pop: true });
      G.log(`${f.floor}층 · 🏕 야영 · 남은 물자 ${f.supply}`, 'fantasy', 'good');
      C.report(f, rt, back);
      return true;
    },
    gainOf, lineOf, LINE,
    // 되찾은 것: 사람마다 기록(로그 · 진행 기록)에 남기고 머리 위에 띄운다. 가장 많이 되찾은 사람이 한마디 한다
    report(f, rt, back) {
      let top = null;
      for (const b of back) {
        const parts = [...(b.hp > 0 ? [`체력 +${b.hp}`] : []), ...b.g], nm = b.p.merc.name || '단장';
        if (!parts.length) continue;
        G.log(`🏕 ${nm} · ${parts.join(' · ')} 회복`, 'fantasy', 'good');
        if (!G.quiet) { G.Turn.dm(rt, `🏕 ${nm}: ${parts.join(' · ')} 회복`); if (b.g.length) G.fx(rt, { k: 'text', x: b.p.x, y: b.p.y - 1.7, s: b.g.length > 1 ? `${b.g[0]} 외 ${b.g.length - 1}` : b.g[0], col: '#9fd7ff', t: 1.8, sz: 0.7 }); }
        if (!top || b.g.length > top.g.length || (b.g.length === top.g.length && b.hp > top.hp)) top = b;
      }
      if (top) G.Banter.say(rt, top.p, lineOf(top.g), { pri: true });
      return top;
    },
    // 지금 쉴 만한가: 체력이 낮거나 시전자의 슬롯이 바닥났다
    needs(rt, have = 1) {
      const l = rt.party.filter(p => p.merc || p === rt.hero), hp = avg(l.map(p => (p.dead ? 0 : p.hp / (p.max || 1)))), mages = l.filter(p => p.merc && G.Res.table(p.merc).length > 0);
      return hp < (have > 1 ? HP_SPARE : HP_LAST) || (mages.length > 0 && avg(mages.map(p => G.Res.slotFrac(p.merc))) < SLOT_AT);
    },
    auto(f, rt) { if (G.Tut.campNow(f, rt) && C.can(f, rt)) return C.use(f, rt); if (f.campAuto !== false && C.can(f, rt) && C.needs(rt, C.have(f))) return C.use(f, rt); return false; }, // 튜토리얼: 첫 원정 1층 계단에서 한 번 쉰다 (DESIGN.md 157)
    // 층을 내려갈 때: 체력을 다음 층으로 넘긴다
    carry(f, rt) { const m = new Map(); for (const p of rt.party) m.set(p.uid || 'h', p.hp); return m; }, // 체력은 그대로 (SRD)
    restore(rt, m) { for (const p of rt.party) { const k = m.get(p.uid || 'h'); if (k != null) p.hp = Math.min(p.max, Math.max(1, k)); } },
  };
  return C;
})();
