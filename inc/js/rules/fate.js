'use strict';
// 주사위를 다루는 탐사대 (설계 5-9): 라운드마다 파티 주사위를 굴리고, 한 번 다시 굴리고, AI가 배분한 것을 맞바꾼다.
// - 라운드 주사위: 살아 있는 아군 + 1개 (남는 하나는 예비). 원정 전에 고른 특수 주사위(2개까지)가 섞인다.
// - 공격: 배분된 주사위 값이 그 사람의 그 차례 첫 공격 d20 (이점이면 보통 d20과 큰 쪽, 불리면 작은 쪽 — SRD 대가는 살아 있다).
// - 내성 주문: 그 사람의 차례 동안 대상들의 내성 d20 = 21 − 주사위 값.
// - 죽음의 주사위: 굴리기 전에 맡을 사람을 정하고, 즉사가 나오면 그 사람이 차례 시작에 쓰러진다 (예비로 못 보낸다).
// - 적은 보통 d20. 이니셔티브에도 쓰지 않는다.
// G.Dnd.attack · save · d20을 감싸서 끼운다 (원래 함수는 그대로 부른다).
G.Dice = (() => {
  const d = (rng, n) => 1 + Math.floor(rng() * n);
  const KINDS = {
    d20: { n: '보통', roll: r => d(r, 20) },
    gamble: { n: '모 아니면 도', faces: [1, 1, 1, 1, 20, 20] },
    doom: { n: '죽음의 주사위', faces: [20, 20, 20, 20, 'death'] },
    steady: { n: '고른 주사위', faces: [8, 9, 10, 11, 12, 13] },
    twin: { n: '쌍둥이', roll: r => Math.max(d(r, 20), d(r, 20)) },
  };
  const roll = (kind, rng = Math.random) => {
    const K = KINDS[kind]; if (!K) throw new Error('모르는 주사위: ' + kind);
    const face = K.faces ? K.faces[Math.floor(rng() * K.faces.length)] : K.roll(rng);
    return face === 'death' ? { kind, face, value: null, special: 'death' } : { kind, face, value: face, special: null };
  };
  // 배분 우선: 무기를 휘두르는 사람 → 주문으로 공격하는 사람 → 치유하는 사람 (높은 주사위를 먼저)
  const WANT = { dragoon: 3, barbarian: 3, paladin: 3, rogue: 3, archer: 3, scout: 3, monk: 3, mage: 2, archmage: 2, warlock: 2, bard: 1, cleric: 1 };
  const want = p => WANT[p.merc?.cls] ?? 2;

  const D = {
    K: { SLOTS: 2 }, KINDS, roll,
    loadout: [],        // 원정 전에 고른 특수 주사위 id
    bearer: null,       // 죽음의 주사위를 맡은 사람 (라운드마다 굴리기 전에)
    st: null,           // 이번 라운드: { round, dice: Roll[], alloc: Map<actor, idx>, rerolled, used: Set, saveBy: actor|null, ready }
    ctx: null,          // 지금 굴리는 것: { kind: 'attack', actor } | { kind: 'save', target }
    party: () => [],    // 앱이 채운다: 살아 있는 아군 목록
    cur: () => null,    // 앱이 채운다: 지금 차례인 인물
    // 라운드 시작: 주사위를 굴려 AI가 배분한다 (죽음의 주사위는 맡은 사람에게 고정)
    newRound(round, rng = Math.random) {
      const ps = D.party(), n = ps.length + 1, kinds = [];
      for (const k of D.loadout) if (kinds.length < Math.min(D.K.SLOTS, n) && !kinds.includes(k)) kinds.push(k);
      while (kinds.length < n) kinds.push('d20');
      if (kinds.includes('doom') && (!D.bearer || !ps.includes(D.bearer))) D.bearer = D.suggestBearer();
      D.st = { round, kinds, dice: kinds.map(k => roll(k, rng)), alloc: new Map(), rerolled: false, used: new Set(), saveBy: null, ready: false };
      D.allocate();
      return D.st;
    },
    suggestBearer() { const ps = D.party(); return ps.slice().sort((a, b) => b.hp / b.max - a.hp / a.max)[0] || null; },
    // AI 배분: 죽음의 주사위는 맡은 사람, 나머지는 높은 값을 원하는 사람부터 (즉사 면은 예비로)
    allocate() {
      const S = D.st, ps = D.party(); S.alloc = new Map();
      const doomI = S.kinds.indexOf('doom'), free = S.dice.map((_, i) => i).filter(i => i !== doomI);
      if (doomI >= 0 && D.bearer && ps.includes(D.bearer)) S.alloc.set(D.bearer, doomI);
      const val = i => (S.dice[i].special === 'death' ? -1 : S.dice[i].value);
      free.sort((a, b) => val(b) - val(a));
      const order = ps.filter(p => !S.alloc.has(p)).sort((a, b) => want(b) - want(a));
      for (const p of order) { const i = free.shift(); if (i != null) S.alloc.set(p, i); }
      S.spare = free[0] ?? null;
    },
    reroll(idxs, rng = Math.random) { const S = D.st; if (!S || S.rerolled || !idxs.length) return false; for (const i of idxs) S.dice[i] = roll(S.kinds[i], rng); S.rerolled = true; D.allocate(); return true; },
    // 맞바꾸기: 두 사람(또는 사람과 예비 'spare'). 죽음의 주사위는 못 옮긴다
    swap(a, b) {
      const S = D.st, doomI = S.kinds.indexOf('doom'), ia = a === 'spare' ? S.spare : S.alloc.get(a), ib = b === 'spare' ? S.spare : S.alloc.get(b);
      if (ia == null || ib == null || ia === doomI || ib === doomI) return false;
      if (a === 'spare') S.spare = ib; else S.alloc.set(a, ib);
      if (b === 'spare') S.spare = ia; else S.alloc.set(b, ia);
      return true;
    },
    dieOf(p) { const S = D.st; if (!S) return null; const i = S.alloc.get(p); return i == null ? null : S.dice[i]; },
    // 차례가 바뀌면: 앞 사람의 내성 뒤집기를 끝낸다
    turnEnd(p) { const S = D.st; if (S && S.saveBy === p) { S.used.add(p); S.saveBy = null; } },
  };

  // ── 굴림에 끼우기 ──
  const N = G.Dnd, d20 = N.d20.bind(N), attack = N.attack, save = N.save;
  N.attack = function (att, tg, critAt) { const prev = D.ctx; D.ctx = { kind: 'attack', actor: att }; try { return attack.call(N, att, tg, critAt); } finally { D.ctx = prev; } };
  N.save = function (tg, k, dc) { const prev = D.ctx; D.ctx = { kind: 'save', target: tg }; try { return save.call(N, tg, k, dc); } finally { D.ctx = prev; } };
  N.d20 = function (adv) {
    const S = D.st, c = D.ctx; if (!S || !S.ready || !c) return d20(adv);
    if (c.kind === 'attack' && c.actor && !S.used.has(c.actor)) {
      const r = D.dieOf(c.actor); if (!r || r.special) return d20(adv);
      S.used.add(c.actor); const v = r.value;
      return adv > 0 ? Math.max(v, d20(0)) : adv < 0 ? Math.min(v, d20(0)) : v;
    }
    if (c.kind === 'save' && c.target && c.target.kind === 'mon') {
      const who = D.cur(); if (!who || who.kind === 'mon' || S.used.has(who)) return d20(adv);
      const r = D.dieOf(who); if (!r || r.special) return d20(adv);
      S.saveBy = who; const v = 21 - r.value;
      return adv > 0 ? Math.max(v, d20(0)) : adv < 0 ? Math.min(v, d20(0)) : v;
    }
    return d20(adv);
  };
  return D;
})();
