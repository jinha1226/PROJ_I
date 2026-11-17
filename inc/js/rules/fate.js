'use strict';
// 주사위를 다루는 탐사대 (설계 5-9 · 5-9-1): 전투가 시작되면 운명판(3명 × 3라운드)을 한 번 굴리고, 전투가 끝날 때까지 그 판을 되풀이한다.
// - 운명판: 줄 = 파티원(그 사람의 직업 주사위), 열 = 라운드. N라운드는 (N − 1) % 3번째 열 — 새로 굴리지 않는다 (사용자 2026-11-18: 「새로굴리지말고 정해진 운명판을 반복하라고」).
// - 판단(전투 전에 한 번): 칸을 골라 다시 굴리기(한 번) · 열 순서 바꾸기. 원정 전에 고른 특수 주사위(2개까지)는 칸 하나씩 들어간다.
// - 직업 주사위 = SRD 그대로의 d20(1~20 고르게)에 면마다 기호를 새긴 것. 자연 20 치명타 · 자연 1 빗나감이 그대로 살아 있다.
// - 조합: 그 라운드 열에 같은 기호 둘 이상이면 효과 하나(★는 아무 기호). AI가 고르고 플레이어가 바꿀 수 있다. 효과는 그 라운드 동안.
// - 공격: 그 라운드 열의 내 칸 값이 그 사람의 그 차례 첫 공격 d20 (이점이면 보통 d20과 큰 쪽, 불리면 작은 쪽 — SRD 대가는 살아 있다).
// - 내성 주문: 그 사람의 차례 동안 대상들의 내성 d20 = 21 − 칸 값.
// - 죽음의 주사위: 판을 굴리기 전에 맡을 사람을 정하고, 그 칸이 즉사면 그 라운드 그 사람이 차례 시작에 쓰러진다.
// - 적은 보통 d20. 이니셔티브에도 쓰지 않는다. 전투는 옛 턴제 오토배틀 그대로 — 공격 굴림만 판의 값이다.
// G.Dnd.attack · save · d20을 감싸서 끼운다 (원래 함수는 그대로 부른다).
G.Dice = (() => {
  const d = (rng, n) => 1 + Math.floor(rng() * n);
  const KINDS = {
    d20: { n: '보통', roll: r => d(r, 20) },
    gamble: { n: '모 아니면 도', faces: [1, 1, 1, 1, 20, 20] },
    doom: { n: '죽음의 주사위', faces: [20, 20, 20, 20, 'death'] },
    steady: { n: '고른 주사위', faces: [8, 9, 10, 11, 12, 13] },
    twin: { n: '쌍둥이', roll: r => Math.max(d(r, 20), d(r, 20)) },
    // 직업 주사위 (5-9-1): d20의 1면 ~ 20면에 새긴 기호. A 검 · D 방 · R 주 · H 빛 · * ★ · . 빈 면. 1면은 늘 빈 면, 20면은 늘 ★
    c_war: { n: '전사 주사위', sym: '.ADA.ADADA.ADADA.AD*' },
    c_skl: { n: '재주꾼 주사위', sym: '.ADA*A.ADA*A.ADA*A.*' },
    c_arc: { n: '비전 주사위', sym: '.RDR.RDRDR.RDRDR.RD*' },
    c_div: { n: '신성 주사위', sym: '.HRH.HDHRH.HDHRH.HD*' },
  };
  const SPECIAL = ['gamble', 'doom', 'steady', 'twin']; // 원정 전에 고를 수 있는 것
  const CH = { A: 'atk', D: 'def', R: 'arc', H: 'holy', '*': 'wild', '.': null };
  const face = (kind, v) => ({ kind, face: v, value: v, sym: CH[KINDS[kind].sym[v - 1]], special: null });
  const roll = (kind, rng = Math.random) => {
    const K = KINDS[kind]; if (!K) throw new Error('모르는 주사위: ' + kind);
    if (K.sym) return face(kind, d(rng, 20));
    const f = K.faces ? K.faces[Math.floor(rng() * K.faces.length)] : K.roll(rng);
    return f === 'death' ? { kind, face: f, value: null, special: 'death' } : { kind, face: f, value: f, special: null };
  };
  // 조합 효과 (수치는 여기 한 곳): v = [둘, 셋 이상]. 기도는 heal = [[n, d, +], ...]
  const SYM = {
    atk: { n: '검', fx: '합동 공격', prop: 'dmgB', v: [2, 4], txt: n => `아군 피해 +${SYM.atk.v[+(n >= 3)]}` },
    def: { n: '방', fx: '방진', prop: 'ac', v: [2, 3], txt: n => `아군 AC +${SYM.def.v[+(n >= 3)]}` },
    arc: { n: '주', fx: '공명', prop: 'dcB', v: [2, 3], txt: n => `아군 주문 DC +${SYM.arc.v[+(n >= 3)]}` },
    holy: { n: '빛', fx: '기도', heal: [[2, 4, 2], [1, 4, 2]], txt: n => { const [k, s, b] = SYM.holy.heal[+(n >= 3)]; return `${n >= 3 ? '아군 모두' : '가장 다친 아군'} ${k}d${s}+${b} 회복`; } },
    wild: { n: '★' },
  };
  // 직업 → 주사위 · 배분 우선은 SRD 직업으로 (게임 직업 id → G.SRD.RAW_CLS)
  const DIE = { fighter: 'c_war', barbarian: 'c_war', paladin: 'c_war', monk: 'c_war', rogue: 'c_skl', ranger: 'c_skl', sorcerer: 'c_arc', wizard: 'c_arc', warlock: 'c_arc', cleric: 'c_div', druid: 'c_div', bard: 'c_div' };
  // 특수 주사위를 넣을 줄: 무기를 휘두르는 사람 → 주문으로 공격하는 사람 → 치유하는 사람
  const WANT = { fighter: 3, barbarian: 3, paladin: 3, monk: 3, rogue: 3, ranger: 3, sorcerer: 2, wizard: 2, warlock: 2, druid: 2, bard: 1, cleric: 1 };
  const srd = p => G.SRD?.RAW_CLS?.[p.merc?.cls];
  const want = p => WANT[srd(p)] ?? 2;
  const ROUND_T = 1e6; // 조합 효과의 끝은 시계가 아니라 라운드 (useRound · end가 지운다)

  const D = {
    K: { SLOTS: 2, COLS: 3 }, KINDS, SPECIAL, SYM, roll, face,
    dieFor: p => DIE[srd(p)] || 'd20',
    loadout: [],        // 원정 전에 고른 특수 주사위 id
    bearer: null,       // 죽음의 주사위를 맡은 사람 (판을 굴리기 전에)
    board: null,        // 이번 전투의 운명판: { rows: [actor], cells: [[Roll × 3]], rerolled, ready }
    st: null,           // 이번 라운드(판의 한 열): { round, col, dice, alloc: Map<actor, row>, combo, comboUser, used: Set, saveBy, ready }
    ctx: null,          // 지금 굴리는 것: { kind: 'attack', actor } | { kind: 'save', target }
    fated: [],          // 이번 라운드 조합 효과를 받은 사람
    party: () => [],    // 앱이 채운다: 살아 있는 아군 목록
    cur: () => null,    // 앱이 채운다: 지금 차례인 인물
    // 전투 시작: 파티원마다 직업 주사위로 3라운드 치를 굴린다 (줄 = 사람, 열 = 라운드).
    // 특수 주사위는 칸 하나씩 — 죽음의 주사위는 맡은 사람 줄, 나머지는 높은 값을 원하는 사람 줄 앞쪽부터
    newBoard(rng = Math.random) {
      D.end();
      const ps = D.party(), cells = ps.map(p => Array.from({ length: D.K.COLS }, () => roll(D.dieFor(p), rng)));
      const sp = [...new Set(D.loadout)].filter(k => SPECIAL.includes(k)).slice(0, D.K.SLOTS);
      if (sp.includes('doom') && (!D.bearer || !ps.includes(D.bearer))) D.bearer = D.suggestBearer();
      const top = ps.slice().sort((a, b) => want(b) - want(a))[0];
      for (const k of sp) { const r = ps.indexOf(k === 'doom' ? D.bearer : top), c = r < 0 ? -1 : cells[r].findIndex(x => !SPECIAL.includes(x.kind)); if (c >= 0) cells[r][c] = roll(k, rng); }
      D.board = { rows: ps, cells, rerolled: false, ready: false };
      return D.board;
    },
    // 다시 굴리기(한 번): 고른 칸들 [[줄, 열], …]
    rerollCells(list, rng = Math.random) {
      const B = D.board; if (!B || B.rerolled || !list.length) return false;
      for (const [r, c] of list) B.cells[r][c] = roll(B.cells[r][c].kind, rng);
      B.rerolled = true; return true;
    },
    // 열 순서 바꾸기 (공짜): 센 열을 앞에 몰지, 뒤로 아낄지
    swapCols(a, b) { const B = D.board; if (!B || a === b) return false; for (const row of B.cells) [row[a], row[b]] = [row[b], row[a]]; return true; },
    colOf: round => (Math.max(1, round) - 1) % D.K.COLS,
    // 한 열의 주사위 (쓰러진 사람 칸은 빠진다)
    colDice(c) { const B = D.board, alive = new Set(D.party()); return B.rows.map((p, r) => (alive.has(p) ? B.cells[r][c] : null)); },
    // 라운드 시작: 판의 그 열을 이번 라운드 주사위로 (3라운드마다 처음 열부터 다시). 앞 라운드 조합 효과는 지운다
    useRound(round) {
      D.clearFate();
      const B = D.board, col = D.colOf(round), dice = D.colDice(col).map(r => r || { kind: 'd20', face: 0, value: null, sym: null, special: 'gone' });
      D.st = { round, col, dice, alloc: new Map(B.rows.map((p, r) => [p, r])), combo: null, comboUser: false, used: new Set(), saveBy: null, ready: true };
      D.recombo();
      return D.st;
    },
    // 전투 끝: 판 · 라운드 · 조합 효과를 치운다
    end() { D.clearFate(); D.board = null; D.st = null; D.ctx = null; },
    clearFate() { for (const p of D.fated) if (p.bf) delete p.bf.fate; D.fated = []; },
    // 조합: 같은 기호 둘 이상 (★는 아무 기호 — 진짜 기호가 하나는 있어야). n은 3에서 멈춘다
    combos(dice = D.st ? D.st.dice : []) {
      const c = {}; let w = 0;
      for (const r of dice) if (!r) continue; else if (r.sym === 'wild') w++; else if (r.sym) c[r.sym] = (c[r.sym] || 0) + 1;
      return ['atk', 'def', 'arc', 'holy'].filter(s => c[s] && c[s] + w >= 2).map(s => ({ s, n: Math.min(3, c[s] + w) }));
    },
    // AI 추천: 다친 사람(체력 절반 아래)이 있으면 기도, 아니면 가장 큰 조합 (같으면 검 → 방 → 주 → 빛)
    pickCombo(cs = D.combos()) {
      if (!cs.length) return null;
      const hurt = D.party().some(p => p.hp < p.max * 0.5), h = cs.find(c => c.s === 'holy');
      return hurt && h ? 'holy' : cs.slice().sort((a, b) => b.n - a.n)[0].s;
    },
    // 플레이어가 이번 라운드 조합을 고르거나 끈다 (같은 것을 다시 누르면 끔)
    setCombo(s) { const S = D.st; S.combo = S.combo === s ? null : s; S.comboUser = true; },
    // 플레이어가 고른 것(끈 것 포함)은 그대로, 고른 조합이 사라졌을 때만 추천으로
    recombo() {
      const S = D.st, cs = D.combos();
      if (S.comboUser && (S.combo === null || cs.some(c => c.s === S.combo))) return;
      S.comboUser = false; S.combo = D.pickCombo(cs);
    },
    // 라운드 조합을 켠다 (이번 라운드 동안)
    fire() {
      const S = D.st; if (!S) return null; const c = D.combos().find(x => x.s === S.combo); if (!c) return null;
      const N = G.Dnd, ps = D.party(), Y = SYM[c.s], big = +(c.n >= 3);
      if (Y.prop) for (const p of ps) { N.buff(p, 'fate', ROUND_T, { [Y.prop]: Y.v[big] }); D.fated.push(p); }
      else {
        const [k, s, b] = Y.heal[big], heal = p => { const h = Math.min(p.max - p.hp, N.dice(k, s) + b); if (h > 0) { p.hp += h; N.flip?.(p, `+${h}`, '#9fe08a'); } };
        if (big) ps.forEach(heal); else { const p = ps.slice().sort((a, b2) => a.hp / a.max - b2.hp / b2.max)[0]; if (p) heal(p); }
      }
      return c;
    },
    suggestBearer() { const ps = D.party(); return ps.slice().sort((a, b) => b.hp / b.max - a.hp / a.max)[0] || null; },
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
