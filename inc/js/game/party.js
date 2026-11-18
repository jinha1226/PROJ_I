'use strict';
// 파티 (설계 5-13, 화면 없이): 선술집(js/game/tavern.js)에서 골라 최대 4명 — 판 안의 영입은 없다 (드문 구출만: 그 판에만, 자리 수와 별개). 사람마다 손에 든 기술은 5개까지.
// - 파티는 두 군데에 같은 차례로 있다: 옛 엔진(G — f.leader + f.lineup의 용병, rt.party)과 탐사 규칙(RUN — st.party).
//   둘은 같은 차례다 (crawl.js의 pair()가 차례로 짝짓는다).
// - 기술 5칸: 소마법 · 주문 · 직업 행동을 다 합쳐 5개 (늘 적용되는 특성은 칸을 차지하지 않는다). 자동 전투 AI도 이 5개만 쓴다.
G.Party = (() => {
  const MAX = 4, CAP = 5;
  const CLASSES = ['dragoon', 'rogue', 'mage', 'cleric', 'archer', 'archmage', 'barbarian', 'paladin', 'monk', 'warlock', 'bard', 'scout'];
  // 엔진 직업 → 탐사 규칙의 직업 (열쇠 판정용: 로그 = 자물쇠, 위저드 = 노크 · 빛, 레인저 = 길 찾기)
  const RUN_CLS = { dragoon: 'fighter', barbarian: 'fighter', paladin: 'fighter', monk: 'fighter', rogue: 'rogue', mage: 'wizard', archmage: 'wizard', warlock: 'wizard', bard: 'wizard', cleric: 'cleric', scout: 'cleric', archer: 'ranger' };
  const members = f => [G.Guild.leader(f), ...(f.lineup || []).map(u => G.Guild.get(f, u)).filter(Boolean)];
  const size = f => members(f).length;
  const level = f => Math.max(1, Math.round(members(f).reduce((a, m) => a + m.lv, 0) / Math.max(1, size(f))));
  // 손에 든 기술을 5개로: 엔진의 추천 순서(전투에 쓸 수치 있는 것 · 높은 레벨 · 치유 직업은 치유 먼저)로 앞의 5개
  function trim(m) {
    const cur = (m.skills || []).filter(k => G.Guild.spLv(k) != null);
    if (cur.length > CAP) { const rec = G.Guild.recommend(m).filter(k => cur.includes(k)), rest = cur.filter(k => !rec.includes(k)); m.skills = rec.concat(rest).slice(0, CAP); }
    m.skManual = true; m.skPri = (m.skills || []).slice(); return m;
  }
  const runMember = m => { const cls = RUN_CLS[m.cls] || 'fighter', C = RUN.CLS[cls]; return { cls, n: m.name, hp: C.hp, max: C.hp, dead: false, sl: { ...(C.slots || {}) }, uid: m.uid }; };
  // 구출한 사람: 아무 직업, 파티 평균 레벨
  const rescued = (f, rng = Math.random) => trim(G.Guild.make(f, CLASSES[Math.floor(rng() * CLASSES.length)], { lv: level(f) }));
  // 들인다: 엔진 명단 · 출전 줄 · 탐사 파티에. at = 나타날 자리. 돌려주는 것: 쿼터뷰 인물
  function join(f, rt, m, st, at) {
    f.mercs.push(m); (f.lineup = f.lineup || []).push(m.uid); G.Fantasy.syncAllies(f);
    const a = rt.party.find(p => p.merc === m);
    if (a && at) { a.x = at.x; a.y = at.y; a._dx = a._rx = a.x; a._dy = a._ry = a.y; }
    if (st) st.party.push(runMember(m));
    return a;
  }
  return { MAX, CAP, CLASSES, RUN_CLS, members, size, level, trim, runMember, rescued, join };
})();
