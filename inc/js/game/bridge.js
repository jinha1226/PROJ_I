'use strict';
// 옛 엔진에 거는 고리 — 새 게임 쪽에서 감싼다 (옛 파일은 고치지 않는다).
// 고돗으로 옮길 때 이 파일이 "새 게임이 옛 엔진의 동작을 어디서 바꿨나" 목록이 된다.
// (옛 파일을 직접 고친 곳: js/legacy/turn.js의 흐르는 턴제 G.Turn.smooth — 차례 단계 안쪽이라 감쌀 수 없다)
(() => {
  // 흐르는 턴제에선 '버티기'(앞줄 근접이 1~2라운드 동안 달려오는 근접 적을 서서 기다림)를 끈다 — 멈춘 것처럼 보인다 (2026-11-18)
  const waits0 = G.Tactics.waits;
  G.Tactics.waits = function (rt, st, e) { return G.Turn.smooth ? false : waits0.call(this, rt, st, e); };
  // 새 게임엔 단장 칭호가 없다 — 처음 만들 때 다른 동료처럼 이름을 붙인다 (2026-11-18)
  const leader0 = G.Guild.leader;
  G.Guild.leader = function (f) { const fresh = !f.leader, L = leader0.call(this, f); if (fresh && L.name === '단장') L.name = G.Guild.name(f); return L; };

  // 바닥에 놓은 것(G.Ground: 기름 · 마름쇠)을 옛 엔진의 걸음 · 차례 · 화염 피해에 건다. 일어난 일은 G.Feed로
  const TR = G.Ground, io = (f, rt) => ({
    round: () => rt.turn?.round || 0, turnNo: () => G.Turn.no(), save: (e, ab, dc) => G.Dnd.save(e, ab, dc),
    hurt: (e, n, type) => { const t0 = G.Foe.dtype; G.Foe.dtype = type; if (e.kind === 'mon') G.Fantasy.hurt(f, rt, e, n, 'dot', null); else G.Fantasy.hurtMember(f, rt, e, n, null); G.Foe.dtype = t0; },
  });
  const live = e => !(e.kind === 'mon' ? e.hp <= 0 : e.dead);
  const fieldMove0 = G.Fantasy.fieldMove; // 차례 안의 걸음마다 부른다 (옛 엔진: 가시 덩굴 같은 지형)
  G.Fantasy.fieldMove = function (f, rt, e, px, py) { fieldMove0.call(this, f, rt, e, px, py); if (rt.terrain?.length && live(e)) G.Feed.push(TR.moved(rt, e, px, py, io(f, rt))); };
  const turnEnd0 = G.Foe.turnEnd; // 차례가 끝날 때 (st.cur = 방금 끝난 사람)
  G.Foe.turnEnd = function (f, rt, st) { if (rt.terrain?.length) { if (st.cur && live(st.cur)) G.Feed.push(TR.turnEnd(rt, st.cur, io(f, rt))); TR.tick(rt, st.round || 0); } return turnEnd0.call(this, f, rt, st); };
  const hurt0 = G.Fantasy.hurt, hurtMember0 = G.Fantasy.hurtMember; // 화염 피해를 입은 자리의 기름이 타오른다
  G.Fantasy.hurt = function (f, rt, m, dmg, src, from) { const ty = G.Foe.dtype, r = hurt0.call(this, f, rt, m, dmg, src, from); if (ty === 'fire' && rt?.terrain?.length) G.Feed.push(TR.fireAt(rt, m, io(f, rt))); return r; };
  G.Fantasy.hurtMember = function (f, rt, p, dmg, mo) { const ty = G.Foe.dtype, r = hurtMember0.call(this, f, rt, p, dmg, mo); if (ty === 'fire' && rt?.terrain?.length) G.Feed.push(TR.fireAt(rt, p, io(f, rt))); return r; };
  // 문 앞 준비의 기습 (G.Encounter.applyPrep → rt.prepSurprise): 옛 엔진의 '들키지 않고 다가갔나' 판정 대신 쓴다. 싸움이 시작되면 지운다
  const sneak0 = G.Pool.sneak;
  G.Pool.sneak = function (rt, list) { if (rt.prepSurprise != null) { const v = rt.prepSurprise; rt.prepSurprise = null; return v; } return sneak0.call(this, rt, list); };
  const beginFight0 = G.Story.beginFight;
  G.Story.beginFight = function (f, rt) { rt.prepSurprise = null; return beginFight0.apply(this, arguments); };
  // 유틸리티 AI: 마른 기름 위에 선 적이 있으면 화염 기술 점수를 올린다 — 깔아 둔 기름을 캐릭터가 알아서 쓴다
  const score0 = G.SkillAI.score;
  G.SkillAI.score = function (k, a, x, threat) {
    let v = score0.call(this, k, a, x, threat);
    if (v > -1 && x.rt?.terrain?.length && G.SkillNum_at?.(k, a.merc.cls, a.merc.lv)?.t === 'fire') { const n = TR.oiled(x.rt, x.seen); if (n) v += 1.5 * n; }
    return v;
  };
})();
