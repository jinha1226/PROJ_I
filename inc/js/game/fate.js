'use strict';
// 주사위를 다루는 탐사대 (설계 5-9 · 5-9-1): 전투가 시작되면 운명판(파티원 × 앞으로 3라운드)을 굴리고, 라운드가 끝날 때마다 다음 라운드 열을 굴려 옆에 붙인다.
// - 운명판: 줄 = 파티원(그 사람의 직업 주사위), 열 = 지금 라운드 · 다음 · 그다음. 라운드가 넘어가면 맨 앞 열이 빠지고 새 열이 굴러 들어온다
//   (사용자 2026-11-18: 「최초 3라운드는 처음 시작할때 돌리고 한 라운드 끝날때마다 다음라운드 다이스를 돌려서 옆으로 붙이는」 — 앞서의 "정해진 판을 되풀이"는 없앴다).
// - 판단(전투 전에 한 번): 칸을 골라 다시 굴리기(한 번 — 첫 칸은 공짜, 그 뒤 칸마다 금화 5 · 10 · 15…) · 열 순서 바꾸기. 원정 전에 고른 특수 주사위(2개까지)는 첫 판의 칸 하나씩에 들어간다.
// - 전투 중(한 번): 밀기 — 한 사람의 다음 칸을 버리고 그다음 칸을 당긴다. 빈 끝자리에는 새 주사위가 굴러 들어온다 (슬롯의 넛지 — 들어올 눈은 모른다).
// - 영웅적 영감 (SRD Heroic Inspiration): 가로줄 조합이 새로 맞거나 열 조합이 넷 이상이면 얻는다. 한 사람에 하나, 전투가 끝나도 남는다(merc.insp).
//   쓰면 운명판의 자기 칸 하나를 다시 굴린다 (탐험 판정은 prep.js가 실패했을 때 저절로). 인간은 판을 시작할 때 · 긴 휴식 뒤에 하나 (SRD 인간 — 수완).
// - SRD의 주사위 능력을 판에서 보인다: 하플링 행운(1이 나오면 그 칸을 다시 굴린다) · 치명타 범위(챔피언 19) · 축복 · 바드의 영감 등 — D.tags · D.mark · D.bonus. 규칙은 엔진 그대로다.
// - 직업 주사위 = SRD 그대로의 d20(1~20 고르게)에 면마다 기호를 새긴 것. 자연 20 치명타 · 자연 1 빗나감이 그대로 살아 있다.
// - 열 조합(팀): 지금 라운드 열에 같은 기호 둘 이상이면 효과 하나(★는 아무 기호). 둘 · 셋 · 넷 이상으로 세진다. AI가 고르고 플레이어가 바꿀 수 있다. 효과는 그 라운드 동안.
// - 가로줄 조합(개인): 한 사람의 보이는 세 칸이 같은 기호인 동안 그 사람만 큰 효과 — 혼자서도 맞는다. 새 열이 들어오면 깨질 수 있고, 다시 굴리기 · 밀기로 지키거나 맞춘다.
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
  // 조합 효과 (수치는 여기 한 곳): v = [둘, 셋, 넷 이상] (열 조합 — 아군 모두, 그 라운드) · row = 가로줄 조합 (그 사람만, 보이는 세 칸이 같은 동안). 기도는 heal = [[n, d, +], ...], 셋부터 아군 모두
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
  const ROUND_T = 1e6; // 조합 효과의 끝은 시계가 아니라 라운드 (useRound · end가 지운다)

  const D = {
    K: { SLOTS: 2, COLS: 3, REROLL_STEP: 5, PUSHES: 1, INSP_COL: 4 }, KINDS, SPECIAL, SYM, roll, face, rules,
    dieFor: p => DIE[srd(p)] || 'd20',
    loadout: [],        // 원정 전에 고른 특수 주사위 id
    bearer: null,       // 죽음의 주사위를 맡은 사람 (판을 굴리기 전에)
    board: null,        // 이번 전투의 운명판: { rows: [actor], cells: [[Roll × 3]] — 0열 = base 라운드, base, rerolled, pushes, ready, rowOn: Map(사람 → 가로줄 기호), got: [영감을 얻은 사람 — 화면이 비운다] }
    st: null,           // 이번 라운드(판의 한 열): { round, col, dice, alloc: Map<actor, row>, combo, comboUser, used: Set, saveBy, ready, rows: Map(사람 → 가로줄 기호), fx: { combo, rowsNew: [[사람, 기호]], insp: [사람] } — 화면이 연출에 쓴다 }
    ctx: null,          // 지금 굴리는 것: { kind: 'attack', actor } | { kind: 'save', target }
    fated: [],          // 이번 라운드 조합 효과를 받은 사람
    party: () => [],    // 앱이 채운다: 살아 있는 아군 목록
    cur: () => null,    // 앱이 채운다: 지금 차례인 인물
    // 전투 시작: 파티원마다 직업 주사위로 앞 3라운드 치를 굴린다 (줄 = 사람, 열 = 라운드).
    // 특수 주사위는 칸 하나씩 — 죽음의 주사위는 맡은 사람 줄, 나머지는 높은 값을 원하는 사람 줄 앞쪽부터
    newBoard(rng = Math.random) {
      D.end();
      const ps = D.party(), cells = ps.map(p => Array.from({ length: D.K.COLS }, () => roll(D.dieFor(p), rng, p)));
      const sp = [...new Set(D.loadout)].filter(k => SPECIAL.includes(k)).slice(0, D.K.SLOTS);
      if (sp.includes('doom') && (!D.bearer || !ps.includes(D.bearer))) D.bearer = D.suggestBearer();
      const top = ps.slice().sort((a, b) => want(b) - want(a))[0];
      for (const k of sp) { const r = ps.indexOf(k === 'doom' ? D.bearer : top), c = r < 0 ? -1 : cells[r].findIndex(x => !SPECIAL.includes(x.kind)); if (c >= 0) cells[r][c] = roll(k, rng); }
      D.board = { rows: ps, cells, base: 1, rerolled: false, ready: false, rowOn: new Map(), got: [] };
      return D.board;
    },
    // 다시 굴리기 값: 첫 칸은 공짜, 그 뒤 칸마다 금화 5 · 10 · 15… ("한 칸 더"에 값이 붙는다 — 슬롯의 오르는 스핀 값)
    rerollCost: n => D.K.REROLL_STEP * Math.max(0, n - 1) * n / 2,
    // 다시 굴리기(한 번, 규칙 카드 '두 번 굴리기'면 두 번): 고른 칸들 [[줄, 열], …]. gold = 낼 수 있는 금화. 굴렸으면 { cost }(금화는 부른 쪽이 뺀다), 아니면 null
    rerollCells(list, rng = Math.random, gold = Infinity) {
      const B = D.board, lim = rules.has('reroll2') ? 2 : 1, cost = D.rerollCost(list.length); if (!B || (B.rerolls || 0) >= lim || !list.length || cost > gold) return null;
      for (const [r, c] of list) B.cells[r][c] = roll(B.cells[r][c].kind, rng, B.rows[r]);
      B.rerolls = (B.rerolls || 0) + 1; B.rerolled = B.rerolls >= lim; return { cost };
    },
    // 밀기 (전투 중 한 번): 한 사람의 다음 칸을 버리고 그다음 칸을 당긴다. 끝자리에는 그 사람의 주사위를 새로 굴린다. 지금 라운드 칸(0열)은 그대로
    canPush: () => !!D.board && D.board.ready && (D.board.pushes || 0) < D.K.PUSHES,
    pushed: (row, fresh = null) => [row[0], ...row.slice(2), fresh],
    pushRow(r, rng = Math.random) { const B = D.board; if (!D.canPush() || !B.cells[r]) return false; B.cells[r] = D.pushed(B.cells[r], roll(D.dieFor(B.rows[r]), rng, B.rows[r])); B.pushes = (B.pushes || 0) + 1; return true; },
    // 라운드가 넘어간다: 맨 앞 열이 빠지고 새 열을 굴려 붙인다 (쓰러진 사람 줄도 굴려 둔다 — 조합에서는 colDice가 뺀다)
    advance(rng = Math.random) { const B = D.board; B.rows.forEach((p, r) => { B.cells[r].shift(); B.cells[r].push(roll(D.dieFor(p), rng, p)); }); B.base++; },
    // 영웅적 영감: 한 사람에 하나 (SRD). 얻었으면 true
    insp: p => !!p?.merc?.insp,
    giveInsp(p) { if (!p?.merc || p.merc.insp) return false; p.merc.insp = true; if (D.board) D.board.got.push(p); return true; },
    // 영감을 써서 자기 칸 하나를 다시 굴린다. 전투 전에는 어느 칸이든, 시작한 뒤에는 아직 오지 않은 칸(1 · 2열)만
    canInsp(r, c) { const B = D.board, p = B && B.rows[r]; return !!p && D.insp(p) && !p.dead && p.hp > 0 && !!B.cells[r][c] && (!B.ready || c >= 1); },
    inspReroll(r, c, rng = Math.random) { const B = D.board; if (!D.canInsp(r, c)) return false; B.rows[r].merc.insp = false; B.cells[r][c] = roll(B.cells[r][c].kind, rng, B.rows[r]); return true; },
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
    // 지금 그 사람의 d20에 얹히는 주사위 (SRD 축복 +d4 · 바드의 영감 +d6 …) — 지금 라운드 칸 곁에 보인다
    bonus(p) { const N = G.Dnd, out = []; if (!p?.bf) return out; if (N.bless?.(p)) out.push('+d4'); if (N.bon?.(p, 'insp')) out.push(`+d${p.bf.insp?.inspD || 6}`); return out; },
    // 가로줄 조합: 그 줄의 세 칸이 모두 같은 기호(★는 아무 기호 — 진짜 기호가 하나는 있어야). 특수 주사위 · 빈 면이 끼면 없다
    rowCombo(cells) {
      let s = null;
      for (const c of cells) { if (!c || !c.sym) return null; if (c.sym === 'wild') continue; if (s && s !== c.sym) return null; s = c.sym; }
      return s;
    },
    // 그 사람 주사위의 면 수: { atk, def, arc, holy, wild(★), blank } — 새긴 면 · 규칙 카드까지 (화면: 「검 ×10 · 방 ×5 · ★ ×1」)
    faces(p) { const kind = D.dieFor(p), out = { atk: 0, def: 0, arc: 0, holy: 0, wild: 0, blank: 0 }; if (!KINDS[kind]?.sym) return null; for (let v = 1; v <= 20; v++) out[face(kind, v, p).sym || 'blank']++; return out; },
    // 조합 표 (화면에 처음부터 보여 준다): 기호마다 [이름, 조합 이름, 둘 · 셋 · 넷의 효과, 한 줄(혼자 세 칸)의 효과]
    legend() { return ['atk', 'def', 'arc', 'holy'].map(s => ({ s, n: SYM[s].n, fx: SYM[s].fx, tiers: [2, 3, 4].map(n => SYM[s].txt(n)), row: D.rowTxt(s) })); },
    rowTxt(s) { const Y = SYM[s]; if (Y.prop) return `${Y.short} +${Y.row}`; const [k, d, b] = Y.rowHeal; return `라운드마다 ${k}d${d}+${b} 회복`; },
    // 열 순서 바꾸기 (공짜): 센 열을 앞에 몰지, 뒤로 아낄지
    swapCols(a, b) { const B = D.board; if (!B || a === b) return false; for (const row of B.cells) [row[a], row[b]] = [row[b], row[a]]; return true; },
    // 한 열의 주사위 (쓰러진 사람 칸은 빠진다)
    colDice(c) { const B = D.board, alive = new Set(D.party()); return B.rows.map((p, r) => (alive.has(p) ? B.cells[r][c] : null)); },
    // 라운드 시작: 지난 라운드에 **주사위를 쓴 사람의 줄만** 한 칸 당기고 끝에 새 주사위를 굴린다 (2026-11-19 — 걷기만 한 차례에 주사위가 그냥 사라지지 않게).
    // 안 쓴 사람의 맨 앞 칸은 그대로 다음 라운드에 남는다. B.fresh = 이번에 당겨진 줄 (화면이 그 줄만 굴린다). 앞 라운드 조합 효과는 지운다
    useRound(round, rng = Math.random) {
      const prev = D.st; D.clearFate();
      const B = D.board; B.fresh = new Set();
      if (B.base < round) { B.rows.forEach((p, r) => { if (prev && prev.used.has(p)) { B.cells[r].shift(); B.cells[r].push(roll(D.dieFor(p), rng, p)); B.fresh.add(r); } }); B.base = round; }
      const col = 0, dice = D.colDice(col).map(r => r || { kind: 'd20', face: 0, value: null, sym: null, special: 'gone' });
      D.st = { round, col, dice, alloc: new Map(B.rows.map((p, r) => [p, r])), combo: null, comboUser: false, used: new Set(), saveBy: null, ready: true };
      D.recombo(); D.rowFire();
      return D.st;
    },
    // 전투 끝: 판 · 라운드 · 조합 효과를 치운다
    end() { D.clearFate(); D.board = null; D.st = null; D.ctx = null; },
    clearFate() { for (const p of D.fated) if (p.bf) { delete p.bf.fate; delete p.bf.fateRow; } D.fated = []; },
    // 조합: 같은 기호 둘 이상 (★는 아무 기호 — 진짜 기호가 하나는 있어야). n은 3에서 멈춘다
    combos(dice = D.st ? D.st.dice : []) {
      const c = {}; let w = 0;
      for (const r of dice) if (!r) continue; else if (r.sym === 'wild') w++; else if (r.sym) c[r.sym] = (c[r.sym] || 0) + 1;
      return ['atk', 'def', 'arc', 'holy'].filter(s => c[s] && c[s] + w >= 2).map(s => ({ s, n: Math.max(rules.has('pairUp') ? 3 : 0, Math.min(4, c[s] + w)) })); // 규칙 카드 '맞물림': 둘도 셋처럼
    },
    inCombo: (d, s) => !!d && !!s && (d.sym === s || d.sym === 'wild'),
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
    // 가로줄 조합을 켠다 (라운드마다 다시 본다 — 보이는 세 칸이 같은 동안만, 빛은 라운드마다 자기 회복). 머리 위 글자는 fire가 열 조합과 함께 띄운다
    rowFire() {
      const B = D.board, S = D.st, N = G.Dnd, alive = new Set(D.party()), was = B.rowOn || new Map(); S.rows = new Map(); S.fx = { combo: null, rowsNew: [], insp: [] };
      B.rows.forEach((p, r) => {
        const s = alive.has(p) ? D.rowCombo(B.cells[r]) : null; if (!s) return; const Y = SYM[s]; S.rows.set(p, s); if (!was.has(p)) { S.fx.rowsNew.push([p, s]); D.giveInsp(p); } // 새로 맞은 줄: 영웅적 영감
        if (Y.prop) { N.buff(p, 'fateRow', ROUND_T, { [Y.prop]: Y.row }); D.fated.push(p); }
        else { const [k, d, b] = Y.rowHeal, h = Math.min(p.max - p.hp, N.dice(k, d) + b); if (h > 0) p.hp += h; }
      });
      B.rowOn = S.rows;
    },
    // 라운드 조합을 켠다 (이번 라운드 동안). 효과를 받은 사람 머리 위에 「AC +2」처럼 띄운다 — 가로줄 조합도 같은 글자에 (머리 위 글자는 한 사람에 하나씩)
    fire() {
      const S = D.st; if (!S) return null; const c = D.combos().find(x => x.s === S.combo);
      const N = G.Dnd, ps = D.party(), say = new Map(), add = (p, t) => say.set(p, say.has(p) ? say.get(p) + ' · ' + t : t);
      for (const [p, s] of S.rows || []) add(p, '★ ' + D.rowTxt(s).replace('라운드마다 ', ''));
      if (c) {
        const Y = SYM[c.s], i = tier(c.n);
        if (c.n >= D.K.INSP_COL) D.board.rows.forEach((p, r) => { const x = S.dice[r]; if (ps.includes(p) && x && (x.sym === c.s || x.sym === 'wild')) D.giveInsp(p); }); // 넷 이상: 기호를 낸 사람마다 영감
        if (Y.prop) for (const p of ps) { N.buff(p, 'fate', ROUND_T, { [Y.prop]: Y.v[i] }); D.fated.push(p); add(p, `${Y.short} +${Y.v[i]}`); }
        else {
          const [k, s, b] = Y.heal[i], heal = p => { const h = Math.min(p.max - p.hp, N.dice(k, s) + b); if (h > 0) { p.hp += h; add(p, `회복 +${h}`); } };
          if (c.n >= 3) ps.forEach(heal); else { const p = ps.slice().sort((a, b2) => a.hp / a.max - b2.hp / b2.max)[0]; if (p) heal(p); }
        }
      }
      for (const p of D.board.got) add(p, '✦ 영감'); if (S.fx) { S.fx.combo = c || null; S.fx.insp = D.board.got; } D.board.got = [];
      for (const [p, t] of say) { p._flipT = 0; N.flip?.(p, t, c && SYM[c.s].heal && !S.rows?.has(p) ? '#9fe08a' : '#ffe08a'); }
      return c || null;
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
