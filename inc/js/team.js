'use strict';
// 서로 돕는 규칙: 돕기 행동(SRD Help)과, 동료의 공격을 돕는 기술의 값. 값의 단위는 G.SkillAI와 같다 (기본 공격 한 번 = 1)
G.Team = (() => {
  const D = G.D, SK = G.Skill.SK, DN = G.Dnd, AI = G.SkillAI, F = () => G.Fantasy;
  const HELP = 'sr_help', REACH = 1.8, HIT_P = 0.65, SAVE_FAIL = 0.6, ADV_GAIN = 1 - (1 - HIT_P) * (1 - HIT_P) - HIT_P; // 이점이 늘리는 명중 몫
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // o를 이번 라운드에 칠 수 있고 아직 이점이 없는 동료들의 한 번 공격 피해
  const hits = (a, x, o) => (x.rt.party || []).filter(p => p !== a && !p.dead && p.merc && dist(p, o) <= (DN.rng(p) >= 2 ? DN.rng(p) : REACH) && DN.adv(p, o) <= 0).map(p => F().allyAtk(x.f, p));
  const nearest = (a, x) => x.seen.filter(o => dist(o, a) <= REACH).sort((p, q) => dist(p, a) - dist(q, a))[0] || null;
  D.MSKILLS[HELP] = { n: '돕기', en: 'Help', t: 'ui_star', d: '곁의 적: 동료의 다음 공격에 이점', lv: {} };
  D.SK_RANGE[HELP] = 1.5;
  SK[HELP] = {
    when: (c, x) => !!nearest(c, x),
    run(c, x) { const o = nearest(c, x); if (!o) return false; o.helped = true; o.helpBy = c; G.Skill.H.ring(x, o, 0.6, '#9fd8a0'); },
  };
  const score0 = AI.score;
  AI.score = function (k, a, x, threat) {
    if (k === HELP) { const o = nearest(a, x); if (!o || o.helped) return 0; const l = hits(a, x, o); return l.length ? Math.max(...l) * ADV_GAIN / AI.basic(a, x) : 0; }
    const v = score0.apply(this, arguments);
    if (k === 'sr_topple') { const o = nearest(a, x); if (o && !DN.has(o, 'prone')) return v + SAVE_FAIL * ADV_GAIN * hits(a, x, o).filter((_, i) => i < 3).reduce((s, q) => s + q, 0) / AI.basic(a, x); }
    return v;
  };
  const T = {
    autoHelp: false, // AI가 돕기를 스스로 고르는가: 실험에서 이득이 뚜렷하지 않아 꺼 둔다 (DESIGN.md 144)
    add: list => (!T.autoHelp || list.includes(HELP) ? list : list.concat(HELP)),
    // 돕기는 도운 사람의 다음 차례 전까지
    expire(rt, a) { for (const o of rt.mons) if (o.helpBy === a) { o.helped = false; o.helpBy = null; } },
  };
  return T;
})();
