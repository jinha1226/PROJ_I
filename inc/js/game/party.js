'use strict';
// 파티 (설계 5-13, 화면 없이): 선술집(js/game/tavern.js)에서 골라 최대 4명 — 판 안의 영입은 없다 (드문 구출만: 그 판에만, 자리 수와 별개). 사람마다 손에 든 기술은 5개까지.
// - 파티는 두 군데에 같은 차례로 있다: 옛 엔진(G — f.leader + f.lineup의 용병, rt.party)과 탐사 규칙(RUN — st.party).
//   둘은 같은 차례다 (crawl.js의 pair()가 차례로 짝짓는다).
// - 기술 5칸: 소마법 · 주문 · 직업 행동을 다 합쳐 5개 (늘 적용되는 특성은 칸을 차지하지 않는다). 자동 전투 AI도 이 5개만 쓴다.
G.Party = (() => {
  const MAX = 4, CAP = 5, START_LV = 1; // 시작 레벨 — 1레벨에서 시작한다 (3으로 올려 봤다가 되돌렸다: 대신 적의 수를 줄인다, gen.js)
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
  // ── 사람마다 다른 것은 주사위와 기술이다 (2026-11-19): 능력치는 직업마다 하나 (SRD 표준 배열을 그 직업의 우선 순서대로) ──
  const STD = [15, 14, 13, 12, 10, 8];
  const stdAb = cls => { const ab = {}; G.Dnd.cls({ cls }).order.forEach((k, i) => { ab[k] = STD[i]; }); return ab; };
  // 기술 · 특성의 성격 → 주사위 기호 (설명 글로 가른다): H 치유 · D 방어 · A 명중 굴림과 무기 · R 내성을 거는 주문과 제어
  const kindOf = k => { const d = G.D.MSKILLS[k]?.d || ''; if (!d) return null;
    if (/다친 동료|멀리서 \d|안정시|회복/.test(d)) return 'H';
    if (/AC|막음|받는 피해|나를 노리는|동료 내성|내성 \+|면역|임시 체력/.test(d)) return 'D';
    if (/명중|무기|맞히면|자신 피해|주사위|광선|화살/.test(d)) return 'A';
    if (/내성|넘어짐|속박|실명|매혹|공포|약화|빛남|d\d/.test(d)) return 'R';
    return null; };
  const LEAN = { c_war: ['A', 'D'], c_skl: ['A', 'D'], c_arc: ['R', 'A', 'D'], c_div: ['H', 'D', 'A'] }, LEAN_N = { A: '공격형', D: '수비형', R: '주문형', H: '치유형' }, DIE_N = { A: '검의 주사위', D: '방패의 주사위', R: '주문의 주사위', H: '빛의 주사위' };
  // 그 사람의 주사위: 직업 주사위의 기호 면을, 기질(lean) + 손에 든 기술 · 특성의 성격 비율로 다시 새긴다 (빈 면 · ★ 자리는 직업 그대로).
  // m.dieSym(20면의 기호) · m.dieN(이름) · m.lean(한 단어)를 적는다 — 운명판(fate.js)이 dieSym을 읽는다
  function forge(m, rng = Math.random) {
    const kind = G.Dice.dieFor({ merc: m }), base = G.Dice.KINDS[kind]?.sym; if (!base) return m;
    const lean = m.leanK || (m.leanK = LEAN[kind][Math.floor(rng() * LEAN[kind].length)]), w = { A: 0, D: 0, R: 0, H: 0 }, slots = [];
    for (let i = 0; i < base.length; i++) if (w[base[i]] != null) { w[base[i]] += 0.6; slots.push(i); }
    for (const k of [...(m.skills || []), ...G.Guild.traits(m)]) { const c = kindOf(k); if (c) w[c] += 2; }
    w[lean] += 4;
    const tot = w.A + w.D + w.R + w.H, n = { A: 0, D: 0, R: 0, H: 0 }, out = base.split(''), seq = [];
    for (let i = 0; i < slots.length; i++) { const c = Object.keys(w).reduce((a, b) => ((i + 1) * w[b] / tot - n[b] > (i + 1) * w[a] / tot - n[a] ? b : a)); n[c]++; seq.push(c); } // 고르게 섞어 놓는다
    slots.forEach((p, i) => { out[p] = seq[i]; });
    const top = Object.keys(n).reduce((a, b) => (n[b] > n[a] ? b : a));
    m.dieSym = out.join(''); m.dieN = DIE_N[top]; m.lean = LEAN_N[lean]; m.dieCnt = n; return m;
  }
  // 파티의 연계 (선술집에서 미리 보인다): 누가 깔고 누가 터뜨리나 — SRD 규칙에 이미 있는 것만. [{ n, d, set: [이름], use: [이름] }]
  function links(ms) {
    const S = G.SRD, has = (m, re) => [...(m.skills || []), ...G.Guild.traits(m)].some(k => re.test(G.D.MSKILLS[k]?.d || '')), W = m => S.weaponOf(m);
    const caster = m => ['sorcerer', 'wizard', 'warlock', 'cleric', 'druid', 'bard'].includes(S.RAW_CLS[m.cls]), melee = m => !caster(m) && W(m).rng !== 'ranged', hitter = m => !caster(m) || has(m, /명중/);
    const nm = l => l.map(m => m.name), out = [], add = (n, d, set, use) => { use = use.filter(m => !(set.length === 1 && set[0] === m && use.length === 1)); if (set.length && use.length) out.push({ n, d, set: nm(set), use: nm(use) }); };
    add('넘어뜨림 → 근접 이점', '넘어진 적은 곁에서 치는 공격에 이점', ms.filter(m => has(m, /넘어짐/) || (!caster(m) && W(m).m === 'topple')), ms.filter(melee));
    add('곁의 동료 → 암습', '동료가 적 곁에 서 있으면 로그의 암습이 터진다', ms.filter(m => m.cls !== 'rogue' && melee(m)), ms.filter(m => m.cls === 'rogue'));
    add('빛남 → 공격 이점', '인도의 화살 · 요정 불꽃을 맞은 적은 다음 공격에 이점', ms.filter(m => has(m, /다음 공격 이점|빛남/)), ms.filter(hitter));
    add('속박 → 공격 이점', '속박된 적을 치는 공격에 이점', ms.filter(m => has(m, /속박/)), ms.filter(hitter));
    add('축복 → 명중', '축복을 받은 셋의 명중 · 내성에 d4', ms.filter(m => has(m, /명중 · 내성 \+d4/)), ms.filter(hitter));
    const cnt = { A: 0, D: 0, R: 0, H: 0 }; for (const m of ms) for (const k in cnt) cnt[k] += m.dieCnt?.[k] || 0;
    return { links: out, dice: cnt };
  }
  // 전투 자리: 옛 엔진은 치유 직업을 뒷줄(거리 유지 — 적에게서 물러난다)에 세운다. 줄을 짜는 화면이 없는 새 게임에서는
  // 갑옷 입은 클레릭은 앞줄에서 함께 싸운다 (2인 파티에서 혼자 빠지지 않게). 드루이드 · 바드는 가운데 줄 그대로
  const place = (f, m) => { if (m.cls === 'cleric') (f.form = f.form || {})[m.uid] = 0; return m; };
  // 구출한 사람: 아무 직업, 파티 평균 레벨
  const rescued = (f, rng = Math.random) => { const m = trim(G.Guild.make(f, CLASSES[Math.floor(rng() * CLASSES.length)], { lv: Math.max(START_LV, level(f)) })); if (G.Builds) G.Builds.assign(m, rng); return forge(m, rng); };
  // 들인다: 엔진 명단 · 출전 줄 · 탐사 파티에. at = 나타날 자리. 돌려주는 것: 쿼터뷰 인물
  function join(f, rt, m, st, at) {
    place(f, m); f.mercs.push(m); (f.lineup = f.lineup || []).push(m.uid); G.Fantasy.syncAllies(f);
    const a = rt.party.find(p => p.merc === m);
    if (a && at) { a.x = at.x; a.y = at.y; a._dx = a._rx = a.x; a._dy = a._ry = a.y; }
    if (st) st.party.push(runMember(m));
    return a;
  }
  return { MAX, CAP, START_LV, CLASSES, RUN_CLS, members, size, level, trim, runMember, rescued, join, place, stdAb, kindOf, forge, links };
})();
