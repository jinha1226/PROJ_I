'use strict';
// 운명판 (설계 5-9 · 5-9-1, 2026-11-19 다시 짬): 층에 들어설 때 파티원마다 직업 주사위 네 개를 굴려 둔다 (줄 = 사람, 4칸).
// - 각자 자기 줄을 앞에서부터 쓴다: 전투에서는 라운드의 첫 공격 d20(내성 주문은 21 − 눈), 탐험에서는 문 열기 · 능력 판정의 d20. 쓴 사람의 칸만 넘어간다.
// - 줄을 다 쓰면 그 줄만 새로 굴린다 (전투에서는 다음 라운드가 시작될 때, 탐험에서는 다음 판정 앞에). 「붙잡기」를 해 둔 줄은 유지비(금화 5 · 10 · 15… 이어서 붙잡을수록 오른다)를 내고 한 바퀴 더 쓴다.
// - 빙고 (판 전체의 효과 — 그 줄이 판에 있는 동안): 가로 = 한 사람의 네 칸이 모두 같은 기호 → 그 사람만 큰 효과.
//   세로 = 같은 자리 칸이 살아 있는 전원(둘 이상) 같은 기호 → 아군 모두, 사람 수(둘 · 셋 · 넷 이상)로 세진다. ★는 아무 기호(진짜 기호가 하나는 있어야), 빈 면 · 특수 주사위가 끼면 없다.
// - 한 칸 다시 굴리기: 아직 안 쓴 칸 하나. 층마다 첫 번은 공짜, 그 뒤 금화 5 · 10 · 15… (규칙 카드 '두 번 굴리기'면 두 번 공짜).
// - 영웅적 영감 (SRD Heroic Inspiration): 가로줄이 새로 맞거나 넷 이상의 세로줄이 새로 맞으면 얻는다. 한 사람에 하나(merc.insp). 쓰면 자기 줄의 안 쓴 칸 하나를 공짜로 다시 굴린다
//   (문 열기 판정은 prep.js가 실패했을 때 저절로). 인간은 판을 시작할 때 · 긴 휴식 뒤에 하나 (SRD 인간 — 수완).
// - 특수 주사위(원정 전에 고른 것, 2개까지): 줄을 굴릴 때마다 그 사람 줄의 칸 하나씩 — 죽음의 주사위는 맡은 사람 줄, 나머지는 무기를 휘두르는 사람 줄.
//   죽음의 주사위의 즉사 면이 다음 칸이면 그 사람이 차례 시작에 쓰러진다.
// - SRD의 주사위 능력을 판에서 보인다: 하플링 행운(1이 나오면 그 칸을 다시 굴린다) · 치명타 범위(챔피언 19) · 축복 · 바드의 영감 등 — D.tags · D.mark · D.bonus. 규칙은 엔진 그대로다.
// - 직업 주사위 = SRD 그대로의 d20(1~20 고르게)에 면마다 기호를 새긴 것. 자연 20 치명타 · 자연 1 빗나감이 그대로 살아 있다. 이점이면 보통 d20과 큰 쪽, 불리면 작은 쪽.
// - 적은 보통 d20. 이니셔티브에도 쓰지 않는다. 전투는 옛 턴제 오토배틀 그대로 — 공격 굴림만 판의 값이다.
// G.Dnd.attack · save · d20을 감싸서 끼운다 (원래 함수는 그대로 부른다). 금화는 D.purse(앱이 채운다)로 낸다.
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
  const rules = new Set(); // 운명판 규칙 카드 (정예 · 보스 3택1, G.Reward): reroll2 · wild19 · pairUp — 이번 판 내내
  // 면: 값은 SRD d20 그대로, 기호는 직업 주사위 표 → 그 사람이 새긴 면(merc.carve) → 규칙 카드(19면도 ★)
  const face = (kind, v, p) => { let sym = CH[(p?.merc?.dieSym || KINDS[kind].sym)[v - 1]]; // 사람마다 다른 주사위 (G.Party.forge)
    if (p?.merc?.carve?.[v]) sym = p.merc.carve[v]; if (v === 19 && rules.has('wild19')) sym = 'wild'; return { kind, face: v, value: v, sym, special: null }; };
  const lucky = p => !!p?.merc?.uid && G.Res?.species?.(p.merc) === 'halfling';
  const roll = (kind, rng = Math.random, p = null) => {
    const K = KINDS[kind]; if (!K) throw new Error('모르는 주사위: ' + kind);
    if (K.sym) { const v = d(rng, 20); if (v === 1 && lucky(p)) return Object.assign(face(kind, d(rng, 20), p), { lucky: true }); return face(kind, v, p); } // 하플링 행운 (SRD): 1이 나오면 다시 굴리고 새 눈을 쓴다
    const f = K.faces ? K.faces[Math.floor(rng() * K.faces.length)] : K.roll(rng);
    return f === 'death' ? { kind, face: f, value: null, special: 'death' } : { kind, face: f, value: f, special: null };
  };
  // 빙고 효과 (수치는 여기 한 곳): v = [둘, 셋, 넷 이상] (세로줄 — 아군 모두, 사람 수로) · row = 가로줄 (그 사람만). 기도는 heal = [[n, d, +], ...] — 세로줄 둘이면 가장 다친 아군, 셋부터 아군 모두 · rowHeal = 가로줄 (자기), 라운드마다
  const tier = n => Math.min(4, Math.max(2, n)) - 2;
  const SYM = {
    atk: { n: '검', fx: '합동 공격', prop: 'dmgB', v: [2, 4, 5], row: 4, short: '피해', txt: n => `아군 피해 +${SYM.atk.v[tier(n)]}` },
    def: { n: '방', fx: '방진', prop: 'ac', v: [2, 3, 4], row: 3, short: 'AC', txt: n => `아군 AC +${SYM.def.v[tier(n)]}` },
    arc: { n: '주', fx: '공명', prop: 'dcB', v: [2, 3, 4], row: 3, short: '주문 DC', txt: n => `아군 주문 DC +${SYM.arc.v[tier(n)]}` },
    holy: { n: '빛', fx: '기도', heal: [[2, 4, 2], [1, 4, 2], [2, 4, 2]], rowHeal: [1, 4, 2], txt: n => { const [k, s, b] = SYM.holy.heal[tier(n)]; return `${n >= 3 ? '아군 모두' : '가장 다친 아군'} ${k}d${s}+${b} 회복`; } },
    wild: { n: '★' },
  };
  // 직업 → 주사위 · 배분 우선은 SRD 직업으로 (게임 직업 id → G.SRD.RAW_CLS)
  const DIE = { fighter: 'c_war', barbarian: 'c_war', paladin: 'c_war', monk: 'c_war', rogue: 'c_skl', ranger: 'c_skl', sorcerer: 'c_arc', wizard: 'c_arc', warlock: 'c_arc', cleric: 'c_div', druid: 'c_div', bard: 'c_div' };
  // 특수 주사위를 넣을 줄: 무기를 휘두르는 사람 → 주문으로 공격하는 사람 → 치유하는 사람
  const WANT = { fighter: 3, barbarian: 3, paladin: 3, monk: 3, rogue: 3, ranger: 3, sorcerer: 2, wizard: 2, warlock: 2, druid: 2, bard: 1, cleric: 1 };
  const srd = p => G.SRD?.RAW_CLS?.[p.merc?.cls];
  const want = p => WANT[srd(p)] ?? 2;
  const ROUND_T = 1e6; // 빙고 효과의 끝은 시계가 아니라 라운드 (useRound · end가 지운다)

  const key = p => p?.merc?.uid ?? p; // 줄의 열쇠: 용병 번호 (층 내내 그 사람의 줄)
  const same = (a, b) => a.t === b.t && a.s === b.s && a.p === b.p && a.c === b.c; // 같은 빙고 줄인가

  const D = {
    K: { SLOTS: 2, COLS: 4, REROLL_STEP: 5, HOLD_STEP: 5, INSP_COL: 4 }, KINDS, SPECIAL, SYM, roll, face, rules,
    dieFor: p => DIE[srd(p)] || 'd20',
    loadout: [],        // 원정 전에 고른 특수 주사위 id
    bearer: null,       // 죽음의 주사위를 맡은 사람
    board: null,        // 이번 층의 운명판: { lines: Map(사람 → 줄), rerolls: 이 층에서 한 칸 다시 굴린 횟수, on: [맞아 있는 빙고 줄], news: [새로 맞은 줄 — fire가 비운다], got: [영감을 얻은 사람 — fire가 비운다],
                        //   turned: [{ p, kept, cost }] 마지막 turnover에서 넘어간 줄, uses: [{ p, c, d, how }] 쓴 칸 — 화면이 비운다 }. 줄 = { cells: [Roll × 4], at: 다음에 쓸 칸 (4 = 다 썼다), hold: 붙잡기, holds: 이어서 붙잡은 횟수 }
    st: null,           // 이번 전투 라운드: { round, first: 이 전투의 첫 라운드, used: Set(이번 라운드에 칸을 쓴 사람), saveBy, ready, fx: { lines, news, insp } — 화면이 연출에 쓴다 }
    ctx: null,          // 지금 굴리는 것: { kind: 'attack', actor } | { kind: 'save', target }
    fated: [],          // 이번 라운드 빙고 효과를 받은 사람
    party: () => [],    // 앱이 채운다: 살아 있는 아군 목록
    roster: () => D.party(), // 앱이 채운다: 줄을 가진 사람 모두 (쓰러진 사람도)
    cur: () => null,    // 앱이 채운다: 지금 차례인 인물
    purse: { gold: () => Infinity, pay() {} }, // 앱이 채운다: 유지비 · 다시 굴리기 값을 낼 주머니 (없으면 공짜)
    // 층에 들어선다: 모두의 줄을 새로 굴린다
    newBoard(rng = Math.random) {
      D.end(); const ps = D.roster();
      if (D.specials().includes('doom') && (!D.bearer || !ps.includes(D.bearer))) D.bearer = D.suggestBearer();
      D.board = { lines: new Map(), rerolls: 0, on: [], news: [], got: [], turned: [], uses: [] };
      for (const p of ps) D.rollLine(p, rng);
      D.settle(); return D.board;
    },
    // 파티가 바뀌었으면 맞춘다: 새 동료의 줄을 굴리고 떠난 사람의 줄을 지운다 (판이 없으면 새로)
    sync(rng = Math.random) {
      const B = D.board; if (!B) return D.newBoard(rng);
      const ps = D.roster(), keep = new Set(ps.map(key)); let ch = false;
      for (const k of [...B.lines.keys()]) if (!keep.has(k)) { B.lines.delete(k); ch = true; }
      for (const p of ps) if (!B.lines.has(key(p))) { D.rollLine(p, rng); ch = true; }
      if (ch) D.settle(); return B;
    },
    specials: () => [...new Set(D.loadout)].filter(k => SPECIAL.includes(k)).slice(0, D.K.SLOTS),
    // 한 사람의 줄을 굴린다. 특수 주사위는 칸 하나씩 — 죽음의 주사위는 맡은 사람 줄, 나머지는 높은 값을 원하는 사람 줄 앞쪽부터
    rollLine(p, rng = Math.random) {
      const cells = Array.from({ length: D.K.COLS }, () => roll(D.dieFor(p), rng, p)), top = D.roster().slice().sort((a, b) => want(b) - want(a))[0];
      for (const k of D.specials()) if ((k === 'doom' ? D.bearer : top) === p) { const c = cells.findIndex(x => !SPECIAL.includes(x.kind)); if (c >= 0) cells[c] = roll(k, rng); }
      const L = { cells, at: 0, hold: false, holds: 0 }; D.board.lines.set(key(p), L); return L;
    },
    line: p => D.board?.lines.get(key(p)) || null,
    rows: () => (D.board ? D.roster().filter(p => D.line(p)) : []), // 판의 줄 순서 (화면)
    // 다음에 쓸 칸 (다 썼으면 null)
    peek(p) { const L = D.line(p); return L && L.at < D.K.COLS ? L.cells[L.at] : null; },
    // 칸을 쓴다: 그 사람의 줄만 한 칸 넘어간다. 전투 중이면 그 라운드에 한 번만
    use(p, how) {
      const S = D.st, L = D.line(p); if (!L || L.at >= D.K.COLS || (S && S.used.has(p))) return null;
      if (S) S.used.add(p); const d = L.cells[L.at]; D.board.uses.push({ p, c: L.at, d, how }); L.at++; return d;
    },
    // 탐험 판정의 d20: 그 사람의 다음 칸 (없거나 즉사 면이면 null — 부른 쪽이 보통 d20을 굴린다)
    take(p, rng = Math.random) { if (!D.line(p)) return null; D.turnover(rng); const r = D.peek(p); if (!r || r.special) return null; return D.use(p, 'check').value; },
    // 다 쓴 줄을 넘긴다: 붙잡아 둔 줄은 유지비를 내고 처음부터 한 번 더, 아니면(금화가 모자라도) 새로 굴린다
    holdCost: L => D.K.HOLD_STEP * (L.holds + 1),
    setHold(p, on = !D.line(p)?.hold) { const L = D.line(p); if (!L) return false; L.hold = !!on; return L.hold; },
    turnover(rng = Math.random) {
      const B = D.board, out = []; if (!B) return out;
      for (const p of D.roster()) {
        const L = D.line(p); if (!L || L.at < D.K.COLS) continue; const cost = D.holdCost(L);
        if (L.hold && cost <= D.purse.gold()) { D.purse.pay(cost); L.at = 0; L.hold = false; L.holds++; out.push({ p, kept: true, cost }); }
        else { D.rollLine(p, rng); out.push({ p, kept: false, cost: 0 }); }
      }
      if (out.length) D.settle(); B.turned = out; return out;
    },
    // 한 칸 다시 굴리기 값: 이 층의 n번째 — 첫 번은 공짜(규칙 카드 '두 번 굴리기'면 두 번), 그 뒤 금화 5 · 10 · 15…
    rerollCost: n => D.K.REROLL_STEP * Math.max(0, n - (rules.has('reroll2') ? 2 : 1)),
    nextCost: () => D.rerollCost((D.board?.rerolls || 0) + 1),
    canReroll(p, c) { const L = D.line(p); return !!L && c >= L.at && c < D.K.COLS && !p.dead; }, // 아직 안 쓴 칸만
    // 굴렸으면 { cost } (금화는 여기서 낸다), 못 굴리면 null
    rerollCell(p, c, rng = Math.random) {
      const cost = D.nextCost(); if (!D.canReroll(p, c) || cost > D.purse.gold()) return null;
      const L = D.line(p); L.cells[c] = roll(L.cells[c].kind, rng, p); D.board.rerolls++; if (cost) D.purse.pay(cost); D.settle(); return { cost };
    },
    // 죽음의 주사위를 맡을 사람을 바꾼다: 앞사람 · 새 사람의 줄을 다시 굴린다
    setBearer(p, rng = Math.random) { const old = D.bearer; if (old === p) return; D.bearer = p; if (!D.board) return; for (const x of [old, p]) if (x && D.line(x)) D.rollLine(x, rng); D.settle(); },
    // 영웅적 영감: 한 사람에 하나 (SRD). 얻었으면 true
    insp: p => !!p?.merc?.insp,
    giveInsp(p) { if (!p?.merc || p.merc.insp) return false; p.merc.insp = true; if (D.board) D.board.got.push(p); return true; },
    // 영감을 써서 자기 줄의 안 쓴 칸 하나를 다시 굴린다 (공짜)
    canInsp(p, c) { return D.insp(p) && p.hp > 0 && D.canReroll(p, c); },
    inspReroll(p, c, rng = Math.random) { if (!D.canInsp(p, c)) return false; const L = D.line(p); p.merc.insp = false; L.cells[c] = roll(L.cells[c].kind, rng, p); D.settle(); return true; },
    // 긴 휴식 · 판 시작: 인간은 영웅적 영감을 얻는다 (SRD 인간 — 수완). ms = 용병들
    rested(ms) { for (const m of ms) if (m && G.Res?.species?.(m) === 'human') m.insp = true; },
    // 판에서 보일 SRD 주사위 능력 (규칙은 엔진이 한다): 그 사람의 이름표들
    tags(p) {
      const m = p?.merc, out = []; if (!m) return out; const sk = k => !!G.Fantasy?.sk?.(p, k), ca = D.critAt(p);
      if (D.insp(p)) out.push('✦ 영감'); if (lucky(p)) out.push('행운'); if (ca < 20) out.push(`치명 ${ca}+`);
      if (sk('ft_heroic')) out.push('영웅적 전사'); if (sk('sr_indom')) out.push('불굴'); if (sk('mm_seek')) out.push('추적 주문');
      return out;
    },
    critAt: p => (p?.merc?.uid && G.Fantasy?.critAt ? G.Fantasy.critAt(p) : 20),
    // 칸의 눈이 뜻하는 것: 치명타 범위면 'crit', 자연 1이면 'miss'
    mark: (p, c) => (!c || c.value == null ? null : c.value >= D.critAt(p) ? 'crit' : c.value === 1 ? 'miss' : null),
    // 지금 그 사람의 d20에 얹히는 주사위 (SRD 축복 +d4 · 바드의 영감 +d6 …) — 다음 칸 곁에 보인다
    bonus(p) { const N = G.Dnd, out = []; if (!p?.bf) return out; if (N.bless?.(p)) out.push('+d4'); if (N.bon?.(p, 'insp')) out.push(`+d${p.bf.insp?.inspD || 6}`); return out; },
    // 한 줄이 모두 같은 기호인가 (★는 아무 기호 — 진짜 기호가 하나는 있어야). 특수 주사위 · 빈 면이 끼면 없다
    rowCombo(cells) {
      let s = null;
      for (const c of cells) { if (!c || !c.sym) return null; if (c.sym === 'wild') continue; if (s && s !== c.sym) return null; s = c.sym; }
      return s;
    },
    // 지금 판에 맞아 있는 빙고 줄: { t: 'r', p, s } 가로 · { t: 'c', c, s, n: 사람 수 } 세로. 쓰러진 사람의 줄은 빠진다
    bingo() {
      const out = [], ps = D.party().filter(p => D.line(p)); if (!D.board) return out;
      for (const p of ps) { const s = D.rowCombo(D.line(p).cells); if (s) out.push({ t: 'r', p, s }); }
      if (ps.length >= 2) for (let c = 0; c < D.K.COLS; c++) { const s = D.rowCombo(ps.map(p => D.line(p).cells[c])); if (s) out.push({ t: 'c', c, s, n: ps.length }); }
      return out;
    },
    // 세로줄의 세기: 사람 수, 넷에서 멈춘다 (규칙 카드 '맞물림': 둘도 셋처럼)
    colN: x => Math.max(rules.has('pairUp') ? 3 : 0, Math.min(4, x.n)),
    lineTxt: x => (x.t === 'c' ? SYM[x.s].txt(D.colN(x)) : D.rowTxt(x.s)),
    // 판이 바뀌었다: 빙고를 다시 세고, 새로 맞은 줄은 영웅적 영감을 준다 (가로 = 그 사람, 넷 이상의 세로 = 모두)
    settle() {
      const B = D.board, now = D.bingo(), fresh = now.filter(x => !B.on.some(y => same(x, y)));
      for (const x of fresh) { if (x.t === 'r') D.giveInsp(x.p); else if (x.n >= D.K.INSP_COL) for (const p of D.party()) D.giveInsp(p); }
      B.news.push(...fresh); B.on = now; return now;
    },
    // 그 사람 주사위의 면 수: { atk, def, arc, holy, wild(★), blank } — 새긴 면 · 규칙 카드까지 (화면: 「검 ×10 · 방 ×5 · ★ ×1」)
    faces(p) { const kind = D.dieFor(p), out = { atk: 0, def: 0, arc: 0, holy: 0, wild: 0, blank: 0 }; if (!KINDS[kind]?.sym) return null; for (let v = 1; v <= 20; v++) out[face(kind, v, p).sym || 'blank']++; return out; },
    // 빙고 표 (화면에 처음부터 보여 준다): 기호마다 [이름, 효과 이름, 세로줄 둘 · 셋 · 넷의 효과, 가로줄의 효과]
    legend() { return ['atk', 'def', 'arc', 'holy'].map(s => ({ s, n: SYM[s].n, fx: SYM[s].fx, tiers: [2, 3, 4].map(n => SYM[s].txt(n)), row: D.rowTxt(s) })); },
    rowTxt(s) { const Y = SYM[s]; if (Y.prop) return `${Y.short} +${Y.row}`; const [k, d, b] = Y.rowHeal; return `라운드마다 ${k}d${d}+${b} 회복`; },
    // 전투 라운드 시작: 앞 라운드의 빙고 효과를 지우고, 다 쓴 줄을 넘긴다 (B.turned — 화면이 그 줄을 굴린다)
    useRound(round, rng = Math.random) {
      const first = !D.st; D.clearFate(); D.sync(rng); D.turnover(rng);
      D.st = { round, first, used: new Set(), saveBy: null, ready: true, fx: { lines: [], news: [], insp: [] } };
      return D.st;
    },
    // 전투 끝: 라운드 · 빙고 효과를 치운다 (판은 층 내내 남는다)
    end() { D.clearFate(); D.st = null; D.ctx = null; },
    clearFate() { for (const p of D.fated) if (p.bf) delete p.bf.fate; D.fated = []; },
    // 빙고 효과를 켠다 (이번 라운드 동안 — 줄이 판에 있는 한 라운드마다 다시). 같은 효과는 더해진다. 빛은 라운드마다 회복.
    // 머리 위 글자(「AC +2」)는 전투의 첫 라운드와 새로 맞은 줄에만. 돌려주는 것: 맞아 있는 줄들
    fire() {
      const S = D.st, B = D.board; if (!S || !B) return [];
      const N = G.Dnd, L = D.settle(), news = B.news.splice(0), ps = D.party(), sum = new Map(), say = new Map();
      const add = (p, t) => say.set(p, say.has(p) ? say.get(p) + ' · ' + t : t), bump = (p, k, v) => { const o = sum.get(p) || {}; o[k] = (o[k] || 0) + v; sum.set(p, o); };
      const heal = (p, [k, d, b]) => { const h = Math.min(p.max - p.hp, N.dice(k, d) + b); if (h > 0) { p.hp += h; add(p, `회복 +${h}`); } };
      for (const x of L) {
        x.fresh = news.some(y => same(x, y)); const Y = SYM[x.s], show = S.first || x.fresh; // fresh: 새로 맞은 줄 (화면이 이펙트를 터뜨린다)
        if (x.t === 'r') { if (Y.prop) { bump(x.p, Y.prop, Y.row); if (show) add(x.p, `★ ${Y.short} +${Y.row}`); } else heal(x.p, Y.rowHeal); continue; }
        const n = D.colN(x), i = tier(n);
        if (Y.prop) for (const p of ps) { bump(p, Y.prop, Y.v[i]); if (show) add(p, `${Y.short} +${Y.v[i]}`); }
        else if (n >= 3) ps.forEach(p => heal(p, Y.heal[i])); else { const p = ps.slice().sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; if (p) heal(p, Y.heal[i]); }
      }
      for (const [p, o] of sum) { N.buff(p, 'fate', ROUND_T, o); D.fated.push(p); }
      for (const p of B.got) add(p, '✦ 영감'); S.fx = { lines: L, news, insp: B.got }; B.got = [];
      for (const [p, t] of say) { p._flipT = 0; N.flip?.(p, t, '#ffe08a'); }
      return L;
    },
    suggestBearer() { const ps = D.party(); return ps.slice().sort((a, b) => b.hp / b.max - a.hp / a.max)[0] || null; },
    // 이번 라운드에 그 사람이 쓸 칸 (이미 썼으면 null) — 파티 카드에 보인다
    dieOf(p) { const S = D.st; return S && S.used.has(p) ? null : D.peek(p); },
    // 차례가 바뀌면: 앞 사람의 내성 뒤집기를 끝낸다 (그 칸을 썼다)
    turnEnd(p) { const S = D.st; if (S && S.saveBy === p) { S.saveBy = null; D.use(p, 'save'); } },
  };

  // ── 굴림에 끼우기 ──
  const N = G.Dnd, d20 = N.d20.bind(N), attack = N.attack, save = N.save;
  N.attack = function (att, tg, critAt) { const prev = D.ctx; D.ctx = { kind: 'attack', actor: att }; try { return attack.call(N, att, tg, critAt); } finally { D.ctx = prev; } };
  N.save = function (tg, k, dc) { const prev = D.ctx; D.ctx = { kind: 'save', target: tg }; try { return save.call(N, tg, k, dc); } finally { D.ctx = prev; } };
  N.d20 = function (adv) {
    const S = D.st, c = D.ctx; if (!S || !S.ready || !c) return d20(adv);
    const mix = v => (adv > 0 ? Math.max(v, d20(0)) : adv < 0 ? Math.min(v, d20(0)) : v); // SRD 이점 · 불리는 살아 있다
    if (c.kind === 'attack' && c.actor && !S.used.has(c.actor)) {
      const r = D.use(c.actor, 'atk'); return !r || r.special ? d20(adv) : mix(r.value); // 그 라운드의 첫 공격
    }
    if (c.kind === 'save' && c.target && c.target.kind === 'mon') {
      const who = D.cur(); if (!who || who.kind === 'mon' || S.used.has(who)) return d20(adv);
      const r = D.peek(who); if (!r || r.special) return d20(adv);
      S.saveBy = who; return mix(21 - r.value); // 그 차례의 내성 주문은 모두 같은 칸 — 차례가 끝나면 쓴 것이 된다 (turnEnd)
    }
    return d20(adv);
  };
  return D;
})();
