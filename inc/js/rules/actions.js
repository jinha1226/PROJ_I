'use strict';
// SRD 5.2.1 행동 (Actions): 공격 · 마법(주문) · 회피 · 돕기 · 준비 · 사용하기(물건)는 다른 모듈에 있다. 여기는 질주 · 물러나기 · 숨기 · 찾기 · 연구 · 설득 (DESIGN.md 165)
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
    // 질주 (SRD Dash): 이번 차례 이동력만큼 더 — 행동을 쓰면 공격하지 않는다 (교활한 행동은 추가 행동)
    dash(e, bonus) { e.dashNo = T().no(); if (!bonus) e.dashAct = T().no(); },
    dashing: e => e.dashNo === T().no(),
    noAttack: e => e.dashAct === T().no() || e.disAct === T().no() || e.hideAct === T().no(),
    // 물러나기 (SRD Disengage): 이번 차례 기회 공격을 부르지 않는다
    disengage(rt, e, bonus) { e.fleetN = T().no(); if (!bonus) e.disAct = T().no(); say(rt, e, '물러나기'); },
    // 숨기 (SRD Hide): 보는 적이 없어야 한다. 민첩(은신) DC 15 — 성공하면 투명 (공격하거나 들키면 끝), 그 굴림이 적의 찾기 DC
    hide(rt, e, bonus) { if (seenBy(rt, e) || DN().invis(e)) return false; const v = DN().d20(e.merc && G.Feat?.has?.(e.merc, 'stealthy') ? 1 : 0) + stealth(e); if (!bonus) e.hideAct = T().no(); if (v < 15) { say(rt, e, '숨기 실패', '#9aa0a8'); return true; } DN().buff(e, 'invis2', R6(10), { hideDC: v }); say(rt, e, '숨었다'); return true; },
    // 찾기 (SRD Search): 숨은 생물 — 지혜(지각)로 그 은신 굴림 이상이면 드러난다
    search(rt, e) { const hid = (e.kind === 'mon' ? rt.party : rt.mons).filter(o => o.bf?.invis2?.hideDC && Math.hypot(o.x - e.x, o.y - e.y) <= 12); if (!hid.length) return false; const v = DN().d20(0) + percep(e); let n = 0; for (const o of hid) if (v >= o.bf.invis2.hideDC) { delete o.bf.invis2; n++; } say(rt, e, n ? `찾았다 ${n}` : '찾기 실패'); return true; },
    // 연구 (SRD Study): 모르는 몬스터 — 지능(비전 · 역사 · 자연 · 종교) 판정으로 도감에
    study(f, rt, e) { if (!e.merc || DN().ab(e.merc).int < 12) return false; const o = foesOf(rt, e).find(o => o.stat && !G.Lore.knows(f, o) && F().sees(rt.map, e, o)); if (!o) return false; const sk = G.Lore.skillOf(o), r = G.Mission.roll(f, rt, sk, 0, e, 15); say(rt, e, '연구'); if (r?.ok) G.Lore.learn(f, rt, o, 'study'); return true; },
    // 설득 (SRD Influence): 꺾인 적 (공포 · 체력 1/4 아래 · 지능 6 이상) — 매력(위협) DC 15 또는 그 지능 점수 중 높은 것. 성공하면 항복해 물러난다
    influence(f, rt, e) { if (!e.merc) return false; const o = foesOf(rt, e).find(o => o.stat && !o.boss && (o.stat.abil?.int ?? 10) >= 6 && (DN().has(o, 'frightened') || o.hp < o.max / 4) && Math.hypot(o.x - e.x, o.y - e.y) <= 6 && F().sees(rt.map, e, o)); if (!o) return false; const dc = Math.max(15, o.stat.abil?.int ?? 0), r = G.Mission.roll(f, rt, 'intimidation', 0, e, dc); say(rt, e, '항복하라'); if (r?.ok) { o.flee = true; o.aggro = false; o.surrender = true; G.Turn.dm?.(rt, `${o.n} · 무기를 버렸다`); } return true; },
    // 교활한 행동 (SRD 로그 2, 추가 행동): 숨기 → 물러나기 (붙어 있고 원거리이거나 다쳤으면) → 질주 (멀면)
    cunning(f, rt, e) {
      if (A.hide(rt, e, true)) return 'hide';
      const adj = adjacent(rt, e);
      if (adj.length && (DN().rng(e) >= 2 || e.hp < e.max * 0.5)) { A.disengage(rt, e, true); return 'dis'; }
      const near = foesOf(rt, e).reduce((d, o) => Math.min(d, Math.hypot(o.x - e.x, o.y - e.y)), 99);
      if (!adj.length && near > (e.def?.mv || 6) + 1.5) { A.dash(e, true); say(rt, e, '질주'); return 'dash'; }
      return null;
    },
    // 동료의 차례: 할 일이 없을 때 (칠 수 없고 기다리는 차례) — 찾기 · 숨기 · 연구 · 설득 중 하나
    idle(f, rt, e) { return A.search(rt, e) || A.influence(f, rt, e) || ((e.merc?.cls === 'rogue' || (e.merc && DN().profs?.(e.merc)?.includes('stealth'))) && A.hide(rt, e)) || A.study(f, rt, e); },
    adjacent, seenBy,
  };
  return A;
})();
