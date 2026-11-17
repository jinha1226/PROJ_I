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
})();
