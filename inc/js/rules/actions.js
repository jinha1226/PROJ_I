'use strict';
// SRD 5.2.1 행동 (Actions): 공격 · 마법(주문) · 회피 · 돕기 · 준비 · 사용하기(물건)는 다른 모듈에 있다. 여기는 질주 · 물러나기 · 숨기 · 찾기 (DESIGN.md 165 — 연구 · 설득은 뺐다)
// 교활한 행동 (로그 2)은 이 셋 중 하나를 추가 행동으로 (질주 · 물러나기 · 숨기)
G.Act = (() => {
  const DN = () => G.Dnd, F = () => G.Fantasy, T = () => G.Turn, R6 = n => n * G.Res_ROUND;
  const say = (rt, e, s, col = '#9fc8ff') => { if (!G.quiet) G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.1, s, col, t: 0.8, sz: 0.75 }); };
  const foesOf = (rt, e) => (e.kind === 'mon' ? rt.party.filter(p => !p.dead && !p.dying).concat(G.Sum.alive(rt)) : rt.mons.filter(o => o.hp > 0 && o.aggro && !o.flee && !o.ethereal));
  const adjacent = (rt, e) => foesOf(rt, e).filter(o => Math.hypot(o.x - e.x, o.y - e.y) <= Math.max(1.5, G.Foe.reach0?.(o) ?? 1.5) + 0.01);
  const seenBy = (rt, e) => foesOf(rt, e).some(o => !DN().has(o, 'blinded') && F().sees(rt.map, o, e) && (!G.Light || !rt.map || G.Light.sees(rt, o, e)));
  const stealth = e => (e.merc ? DN().skill(e.merc, 'stealth') : e.stat?.skills?.stealth ?? e.stat?.dex ?? 0);
  const percep = e => (e.merc ? DN().skill(e.merc, 'perception') : e.stat?.skills?.perception ?? e.stat?.save?.wis ?? 0);
  const A = {
    // 질주 · 물러나기는 따로 고르는 행동이 아니라 이동의 일부다 (2026-11-20 — 운명판: 이동만 한 차례는 칸을 쓰지 않는다)
    // 질주: 닿지 않으면 이동력만큼 더 달린다 — 달린 차례에는 치지 않는다 (교활한 행동은 달리고도 친다)
    dash(e, bonus) { e.dashNo = T().no(); if (!bonus) e.dashAct = T().no(); },
    dashing: e => e.dashNo === T().no(),
    noAttack: e => e.dashAct === T().no() || e.hideAct === T().no(),
    // 물러나기: 물러서는 이동은 기회 공격을 부르지 않는다 — 행동을 쓰지 않는다 (물러선 뒤에도 칠 수 있다)
    disengage(rt, e) { e.fleetN = T().no(); say(rt, e, '물러나기'); },
    // 숨기 (SRD Hide): 보는 적이 없어야 한다. 민첩(은신) DC 15 — 성공하면 투명 (공격하거나 들키면 끝), 그 굴림이 적의 찾기 DC
    hide(rt, e, bonus) { if (seenBy(rt, e) || DN().invis(e)) return false; const adv = e.merc && G.Feat?.has?.(e.merc, 'stealthy') ? 1 : 0, die = DN().actDie ? DN().actDie(e) : 0 /* 운명판: 그 사람의 이번 라운드 눈 (없으면 굴린다) */, v = (die ? (adv ? Math.max(die, DN().d20(0)) : die) : DN().d20(adv)) + stealth(e); if (!bonus) e.hideAct = T().no(); if (v < 15) { say(rt, e, '숨기 실패', '#9aa0a8'); return true; } DN().buff(e, 'invis2', R6(10), { hideDC: v }); say(rt, e, '숨었다'); return true; },
    // 찾기 (SRD Search): 숨은 생물 — 지혜(지각)로 그 은신 굴림 이상이면 드러난다
    search(rt, e) { const hid = (e.kind === 'mon' ? rt.party : rt.mons).filter(o => o.bf?.invis2?.hideDC && Math.hypot(o.x - e.x, o.y - e.y) <= 12); if (!hid.length) return false; const v = DN().d20(0) + percep(e); let n = 0; for (const o of hid) if (v >= o.bf.invis2.hideDC) { delete o.bf.invis2; n++; } say(rt, e, n ? `찾았다 ${n}` : '찾기 실패'); return true; },
    // 교활한 행동 (SRD 로그 2, 추가 행동): 숨기 → 물러나기 (붙어 있고 원거리이거나 다쳤으면) → 질주 (멀면)
    cunning(f, rt, e) {
      if (A.hide(rt, e, true)) return 'hide';
      const adj = adjacent(rt, e);
      if (adj.length && (DN().rng(e) >= 2 || e.hp < e.max * 0.5)) { A.disengage(rt, e, true); return 'dis'; }
      const near = foesOf(rt, e).reduce((d, o) => Math.min(d, Math.hypot(o.x - e.x, o.y - e.y)), 99);
      if (!adj.length && near > (e.def?.mv || 6) + 1.5) { A.dash(e, true); say(rt, e, '질주'); return 'dash'; }
      return null;
    },
    // 동료의 차례: 할 일이 없을 때 (칠 수 없고 기다리는 차례) — 찾기 · 숨기. 설득 · 연구는 뺐다 (2026-11-20: 전투의 행동을 줄인다 — 도감은 처음 잡을 때 오른다)
    idle(f, rt, e) { return A.search(rt, e) || ((e.merc?.cls === 'rogue' || (e.merc && DN().profs?.(e.merc)?.includes('stealth'))) && A.hide(rt, e)); },
    adjacent, seenBy,
  };
  return A;
})();
