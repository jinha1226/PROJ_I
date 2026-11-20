'use strict';
// 자동 전투의 스킬 고르기 (유틸리티 AI, DESIGN.md 113): 차례마다 쓸 수 있는 스킬에 점수를 매겨 가장 높은 것을 쓴다.
// 점수 단위: 기본 공격 한 번 = 1. 피해는 넘치는 몫을 뺀 값, 회복은 파티 체력의 몫 × 위급함.
// 슬롯은 위협이 낮을수록 아낀다. 기본 공격보다 낮으면 행동에 쓰지 않는다.
G.SkillAI = (() => {
  const D = G.D, GD = () => G.Guild, SK = () => G.Skill.SK, H = () => G.Skill.H, DN = () => G.Dnd, F = () => G.Fantasy;
  const byEn = {}; for (const id in G.SRD_SP) byEn[G.SRD_SP[id].en] = G.SRD_SP[id];
  const meta = k => byEn[D.MSKILLS[k]?.en] || null;
  const diceAvg = s => { if (!s) return 0; let m = /^(\d+)×(\d+)d(\d+)/.exec(s); if (m) return m[1] * m[2] * (+m[3] + 1) / 2; m = /^(\d+)d(\d+)/.exec(s); return m ? m[1] * (+m[2] + 1) / 2 : 0; };
  const PARTY_ROUNDS = 3, HIT_P = 0.65, SAVE_FAIL = 0.6, SLOT_K = 0.4, HEAL_K = 12, COND_K = 3.5, BUFF_K = 1.5, SUMMON_K = 2, DEFAULT_K = 1;
  const alive = x => (x.rt.party || x.rt.allies || []).filter(p => !p.dead && p.merc);
  // ── 전술 판단 (2026-11-20): 숫자는 SRD DB(G.SRD_SP — 주사위 · 내성 · 범위 · 상태 이상 · 상향)에서 읽고, 여기엔 "그 효과가 전투에서 얼마나 값어치 있나"만 둔다 ──
  // 값의 단위는 적 체력(게임 단위): 남은 라운드 동안 깎거나 막는 양. 집중은 깨질 수 있어 CONC를 곱한다.
  // 막는 값 = 그 적의 라운드당 피해(SRD) × 막는 몫 × 라운드 → toE로 적 체력 단위. 묶인 적은 아군이 이점으로 더 친다(그 몫도 더한다)
  const CONC = 0.8, SUM_HIT = 0.6, NEXT_K = 0.85; // 소환수의 명중은 운명판과 상관없이 대충
  // ── 명중 · 내성 확률 (2026-11-20 — 예전엔 명중 65% · 내성 실패 60%로 고정): 실제 명중 보정 · AC · 이점/불리 · 주문 DC · 그 적의 내성으로.
  // 운명판: 이번 라운드 그 사람의 d20은 판에 이미 보이는 눈이다 (js/game/fate.js — 공격 = 눈, 적의 내성 = 21 − 눈). 눈을 알면 맞나 안 맞나가 정해진다 —
  // 눈이 낮은 라운드엔 굴림 없는 기술(마법 화살 · 축복 · 치유), 높은 라운드엔 큰 공격 주문. 다른 변수(엄폐 · 보너스 주사위)가 있어 1 · 0 대신 0.95 · 0.05
  const P20 = need => Math.max(0.05, Math.min(0.95, (21 - need) / 20)); // d20 ≥ need (1은 빗나감 · 20은 명중)
  let FORCE = null; // 다음 라운드 값을 잴 때 그 눈으로 바꿔 끼운다 (score의 내다보기)
  const fateV = a => { if (FORCE && FORCE.a === a) return FORCE.v; const Dc = G.Dice, S = Dc?.st; if (!S || !S.ready || !a?.merc) return 0; const r = S.die.has(a) ? S.die.get(a) : S.used.has(a) ? null : Dc.peek(a); return r && !r.special ? r.value : 0; };
  // 다음 라운드의 눈: 판에 보이는 그 사람 줄의 다음 칸 (이번 라운드 칸을 이미 썼으면 지금 칸). 줄이 끝나 새로 굴리게 되면 모른다 (0)
  const fateNext = a => { if (FORCE) return 0; const Dc = G.Dice, S = Dc?.st, L = S && S.ready && a?.merc ? Dc.line(a) : null; if (!L) return 0; const i = S.die.has(a) || S.used.has(a) ? L.at : L.at + 1, r = L.cells[i]; return i < L.cells.length && r && !r.special ? r.value : 0; };
  function pHit(a, o, fate = true) {
    const hb = DN().hit(a), ac = DN().ac(o), adv = DN().adv ? DN().adv(a, o) : 0, nat = P20(ac - hb), v = fate ? fateV(a) : 0;
    if (v) { const h = v === 20 || (v !== 1 && v + hb >= ac); return adv > 0 ? (h ? 0.95 : nat) : adv < 0 ? (h ? nat : 0.05) : h ? 0.95 : 0.05; }
    return adv > 0 ? 1 - (1 - nat) ** 2 : adv < 0 ? nat * nat : nat;
  }
  function pFail(a, o, ab) { const sv = o.stat?.save?.[ab] ?? 0, dc = DN().dc ? DN().dc(a) : 13, v = fateV(a); if (v) return 21 - v + sv < dc ? 0.95 : 0.05; return Math.max(0.05, Math.min(0.95, (dc - 1 - sv) / 20)); } // 내성에는 1 · 20 자동이 없다 (SRD)
  // 기본 공격이 맞을 확률: 내성 소마법(신성한 불꽃 · 잔인한 조롱)이면 내성 실패
  // 피해 · 치유 주사위도 운명판에서 (2026-11-20, 사용자: 「해당 라운드에 명중률이나 데미지를 계산할수 있으니까 그걸 기반으로 판단해야」): 이번 라운드 눈을 알면 dN = 올림(눈 × N ÷ 20) (js/rules/dnd.js),
  // 모르면 평균. 여러 라운드 이어지는 것(자리 피해 · 헥스)은 이번 라운드만 그 눈, 다음 라운드부터 평균. 눈 20이면 그 라운드 첫 공격은 치명타 (주사위 두 배)
  const face = (a, d) => { const v = fateV(a); return v ? Math.max(1, Math.ceil(v * d / 20)) : (d + 1) / 2; };
  const rollAvg = (a, s) => { if (!s) return 0; let m = /^(\d+)×(\d+)d(\d+)/.exec(s); if (m) return m[1] * m[2] * face(a, +m[3]); m = /^(\d+)d(\d+)/.exec(s); return m ? m[1] * face(a, +m[2]) : 0; };
  const crit2 = a => (fateV(a) === 20 && !G.Dice?.st?.crit?.has(a) ? 2 : 1);
  const faceNext = (a, d) => { const v = fateNext(a); return v ? Math.max(1, Math.ceil(v * d / 20)) : (d + 1) / 2; };
  const over = (C, d) => (face(C.a, d) + (C.R >= 2 ? faceNext(C.a, d) - (d + 1) / 2 : 0) + (d + 1) / 2 * Math.max(0, C.R - 1)) / Math.max(1, C.R); // 이번 라운드 눈 + 다음 라운드 눈(보이면) + 그 뒤 평균 — 라운드당
  const pBasic = (a, o) => (a.def?.saveAtk && DN().cantripAtk?.(a) ? pFail(a, o, a.def.saveAtk) : pHit(a, o));
  // 상태 이상 하나의 무게 (SRD 상태 규칙): [그 적이 못 하는 몫, 그 적을 치는 아군이 얻는 몫]. 공포 · 매혹 · 중독은 공격하는 쪽에 이점을 주지 않는다 — 이점은 마비 · 기절 · 속박 · 실명 · 넘어짐 · 빛남
  // 마비 · 의식 없음은 근접 공격이 치명타라 아군 몫이 크다
  const COND_W = { paralyzed: [1, 0.6], unconscious: [1, 0.6], stunned: [1, 0.3], petrified: [1, 0.3], incapacitated: [1, 0], restrained: [0.3, 0.3], frightened: [0.5, 0], charmed: [0.4, 0], blinded: [0.4, 0.3], prone: [0.2, 0.3], poisoned: [0.3, 0], grappled: [0.1, 0], deafened: [0.05, 0], outlined: [0, 0.3] };
  const condW = cs => [Math.max(0, ...(cs || []).map(c => (COND_W[c] || [0.3, 0])[0])), Math.max(0, ...(cs || []).map(c => (COND_W[c] || [0.3, 0])[1]))];
  const hits = C => { const a = C.a, mel = DN().melee(a); return (DN().ebOf(a.merc) && !mel ? DN().tier(a) : DN().caster(a) && !mel ? 1 : DN().attacks(a)) * C.ph; }; // 이 사람이 라운드에 맞히는 횟수 (헥스 · 표식이 붙는 수)
  const dis = (C, o, w, dur) => { const t = Math.min(C.R, dur); return (C.toE(C.fDPR(o)) * w[0] + C.pDPR * C.share(o) * w[1]) * t; }; // 그 적을 묶는 값: 그 적이 못 친 몫 + 아군이 이점으로 더 친 몫 (w = [못 하는 몫, 아군 몫])
  const repeat = (C, o, ab) => 1 / Math.max(0.15, 1 - C.pf(o, ab)); // 차례마다 다시 내성 — 묶여 있는 기대 라운드
  const one = (C, f) => Math.max(0, ...C.foes.map(o => f(o))); // 가장 좋은 한 놈
  const typeOk = { 'Hold Person': o => /humanoid/.test(o.stat?.ty || o.ty || ''), 'Hold Monster': o => !/undead/.test(o.stat?.ty || o.ty || '') }; // 대상 종류가 정해진 주문 (SRD 본문)
  const incoming = C => C.all.reduce((s, o) => s + C.fDPR(o), 0) / Math.max(1, C.ps.length); // 아군 한 사람이 라운드에 받는 피해 (SRD)
  // DB에서 읽는 값: 그 슬롯으로 쓰면 주사위 · 대상이 는다 (upR)
  const dbDice = (o, C, res, avgOnly, next) => { if (!o.dice) return 0; const up = C.up(res, o.lv), n = o.dice[0] + (o.upR?.d ? o.upR.d[0] * up : 0); return n * (next ? faceNext(C.a, o.dice[1]) : avgOnly ? (o.dice[1] + 1) / 2 : face(C.a, o.dice[1])) + (o.dice[2] || 0); }; // 이번 라운드 (운명판의 눈) · avgOnly = 다음 라운드부터
  // 쓰러뜨리는 값: 운명판으로 피해가 정해져 있으니 "이번에 확실히 쓰러진다"를 안다 — 그 적의 남은 공격이 사라진다 (그 적의 라운드당 피해 × 두 라운드쯤, 적 체력 단위)
  // sure = 쓰러뜨리는 피해(내성 절반 주문이면 버텨도 남는 몫), p = 맞을 확률 — 거의 확실할 때만
  const killV = (C, q, sure, p) => (p >= 0.9 && sure >= q.hp ? C.toE(C.fDPR(q)) * Math.min(C.R, 2) : 0);
  // 직업 기능의 재료: 그 직업 레벨 · 몽크 무술 주사위 · 나에게 들어오는 피해(붙어 있는 적의 몫, 없으면 평균의 절반) · 치유의 값
  const atkAll = C => F().allyAtk(C.x.f, C.a) * DN().attacks(C.a) * C.ph; // 공격 행동 전체 (추가 공격까지) — 무예 기술은 여기에 효과가 하나 붙는다
  const clv = (a, c) => (G.MC?.on(a.merc) ? G.MC.lvOf(a.merc, c) : a.merc.lv);
  const martial = a => { const L = clv(a, 'monk'); return L >= 17 ? 12 : L >= 11 ? 10 : L >= 5 ? 8 : 6; };
  const onMe = C => { const adj = C.near(1.8); return adj.length ? adj.reduce((s, o) => s + C.fDPR(o), 0) : incoming(C) * 0.5; };
  // 치유 amt(SRD)를 가장 다친 사람(spread면 여럿에게 나눠)에게: 채운 몫(SRD) → 적 체력 단위, 위급할수록 크게. 쓰러져 죽어 가는 사람을 일으키면 그 사람의 공격이 돌아온다
  function healV(C, who, amt, spread) {
    const L = who.filter(p => !p.dead && p.hp < p.max).sort((p, q) => p.hp / p.max - q.hp / q.max); if (!L.length) return 0;
    let left = amt, got = 0, low = L[0].hp / L[0].max; for (const p of spread ? L : L.slice(0, 1)) { const miss = (p.max - Math.max(0, p.hp)) * Math.max(1, DN().srdHP(p.merc)) / p.max, h = Math.min(miss, left); got += h; left -= h; if (left <= 0) break; }
    const dying = (C.x.rt.party || []).some(p => p.dying && who.includes(p));
    return C.toE(got) * (low < 0.25 ? 3 : low < 0.5 ? 1.5 : 0.4) + (dying ? C.pDPR / Math.max(1, C.ps.length) * C.R : 0);
  }
  // DB만으로 매기는 값: 피해(한 번 · 자리에 깔리면 라운드마다) + 상태 이상(묶는 값). 집중 주문은 차례마다 다시 내성을 굴린다고 본다
  function fromDB(o, C, res) {
    const d = dbDice(o, C, res), dA = dbDice(o, C, res, true), dN = dbDice(o, C, res, false, true), w = condW(o.conds), fct = w[0] + w[1], extra = o.upR?.n ? C.up(res, o.lv) : 0, ok = typeOk[o.en] || (() => true);
    const zone = o.conc && o.area && d > 0, keep = o.conc && !o.area && d > 0; // 자리 피해 (영혼 수호자 · 월광) · 한 대상에 이어지는 피해 (흡혈의 손길 · 금속 달구기)
    const per = q => { const p = o.save ? C.pf(q, o.save) : o.atk ? pHit(C.a, q) : 1, once = !zone && !keep, dmg = C.g * (p + (o.half ? (1 - p) * 0.5 : 0)) * (zone ? (d + (C.R >= 2 ? dN + dA * (C.R - 2) : 0)) * CONC : keep ? (d + (C.R >= 2 ? dN + dA * (C.R - 2) : 0)) * CONC * 0.6 : d * (o.atk ? crit2(C.a) : 1)), raw = d * C.g * (o.atk ? crit2(C.a) : 1), hold = fct && ok(q) ? dis(C, q, w, o.conc ? (o.save ? repeat(C, q, o.save) : C.R) : 1) * (o.save ? C.pf(q, o.save) : HIT_P) : 0; return (once ? Math.min(q.hp, dmg) + killV(C, q, raw * (o.half && o.save ? 0.5 : 1), o.half && o.save ? 1 : p) : dmg) + hold; };
    const L = o.area ? (o.rng === 0 ? C.near(o.area) : AI.best(C.x, o.area)) : C.foes;
    return o.area ? L.reduce((s, q) => s + per(q), 0) : L.map(per).sort((p, q) => q - p).slice(0, 1 + extra).reduce((s, v) => s + v, 0);
  }
  // DB 숫자로는 안 잡히는 것: 아군 강화 · 공격에 붙는 것 · 직업 기능 (효과가 본문에만 있다)
  const TAC = {
    sr_hex: C => over(C, 6) * C.g * hits(C) * C.R * CONC, // 맞힐 때마다 1d6
    sr_hmark: C => over(C, 6) * C.g * hits(C) * C.R * CONC,
    sp_divine_favor: C => over(C, 4) * C.g * hits(C) * C.R,
    sr_bless: C => C.ps.map(C.dprOf).sort((p, q) => q - p).slice(0, 3).reduce((s, d) => s + d * (2.5 / 20 / 0.6), 0) * C.R * CONC, // 아군 셋 명중 +1d4
    sr_haste: C => Math.max(0, ...C.ps.map(p => F().allyAtk(C.x.f, p) * C.allyP(p) * (DN().caster(p) ? 0.5 : 1))) * C.R * CONC + C.toE(incoming(C) * 0.1) * C.R, // 가장 센 무기 공격수에게 공격 한 번 더
    sr_sof: C => C.toE(incoming(C) * 0.1) * C.R * CONC, // AC +2
    sr_sweapon: (C, res) => (over(C, 8) * (1 + Math.floor(C.up(res, 2) / 2)) + C.mod()) * C.g * C.ph * C.R * CONC, // 추가 행동으로 라운드마다 한 번
    sr_spike: C => 7.5 * C.g * AI.best(C.x, 4).length * C.R * CONC, // 5피트마다 2d4 — 걸어 나오는 만큼
    // 용 소환 (SRD 5레벨 주문 · 용의 혈통 18 「용 동반자」는 슬롯 · 집중 없이 한 번): 용의 영혼 — 할퀴기 두 번(1d6 + 4 + 주문 레벨) + 맞는 몫을 나눠 받는다
    sp_summon_dragon: (C, res) => 2 * (7.5 + G.Res.castLevel(C.a.merc, res)) * C.g * SUM_HIT * C.R * CONC + C.toE(incoming(C) * 0.3) * C.R,
    ft_drcomp: C => 2 * (7.5 + 5) * C.g * SUM_HIT * C.R + C.toE(incoming(C) * 0.3) * C.R,
    sp_animate_dead: (C, res) => 5.5 * C.g * SUM_HIT * (1 + 2 * C.up(res, 3)) * C.R * 1.3, // 해골 — 전투가 끝나도 남는다
    sp_guardian_of_faith: C => Math.min(60, 20 * C.near(2).length) * C.g * 0.75,
    sp_banishment: C => one(C, o => (dis(C, o, [1, 0], C.R) + o.hp * 0.3) * C.pf(o, 'cha')), // 가장 센 놈을 판 밖으로
    sr_slow: C => AI.best(C.x, 8).slice(0, 6).reduce((s, o) => s + dis(C, o, [0.5, 0.1], repeat(C, o, 'wis')) * C.pf(o, 'wis'), 0),
    sr_faerie: C => AI.best(C.x, 4).reduce((s, o) => s + C.pDPR * C.share(o) * 0.25 * C.pf(o, 'dex'), 0) * C.R * CONC, // 빛남: 아군이 이점
    sp_bane: C => AI.best(C.x, 6).slice(0, 3).reduce((s, o) => s + C.toE(C.fDPR(o)) * 0.15 * C.pf(o, 'cha'), 0) * C.R * CONC,
    sr_dark: C => (G.Opt.has(C.a, 'iv_dsight') ? C.dprOf(C.a) * 0.3 * C.R + C.toE(C.near(3).reduce((s, o) => s + C.fDPR(o), 0) * 0.3) * C.R : 0.1), // 악마의 시야가 있을 때만
    sp_mirror_image: C => C.toE(incoming(C) * 0.55) * Math.min(C.R, 3),
    sp_blur: C => C.toE(incoming(C) * 0.25) * C.R * CONC,
    // ── 직업 기능 (주문이 아니라 SRD DB에 효과 숫자가 없다): 직업 레벨에 따라 커지는 수치는 SRD 표대로 ──
    // 파이터: 행동 쇄도 = 이번 차례에 행동 하나 더 · 재기 = 1d10 + 파이터 레벨 회복 (다쳤을 때)
    sr_surge: C => C.dprOf(C.a) / Math.max(0.05, C.allyP(C.a)) * C.ph,
    sr_second: C => healV(C, [C.a], face(C.a, 10) + clv(C.a, 'dragoon')),
    // 바바리안: 격노 = 맞힐 때마다 +2/+3/+4 · 베기 · 찌르기 · 때리기 저항 (받는 피해 절반) / 무모한 공격 = 내 공격에 이점, 나를 치는 공격도 이점
    sr_rage: C => { const L = clv(C.a, 'barbarian'), b = L >= 16 ? 4 : L >= 9 ? 3 : 2; return b * C.g * hits(C) * C.R + C.toE(onMe(C) * 0.5) * C.R; },
    sr_reckless: C => { const p = C.ph, pa = Math.min(0.95, 1 - (1 - p) * (1 - p)); return C.dprOf(C.a) / Math.max(0.05, C.allyP(C.a)) * (pa - p) - C.toE(onMe(C) * 0.25 * (C.a.bf?.rage ? 0.5 : 1)); }, // 격노 중이면 받는 피해가 절반이라 대가도 절반
    sr_brutal: C => atkAll(C) + face(C.a, 10) * C.g * C.ph + one(C, o => dis(C, o, [0.2, 0.2], 1)), // 잔혹한 일격: 공격 행동 그대로 + 한 번 +1d10 · 밀치기 · 느리게 (무모한 공격의 이점은 내준다)
    sr_intim: C => C.near(6).reduce((s, o) => s + dis(C, o, COND_W.frightened, repeat(C, o, 'wis')) * C.pf(o, 'wis'), 0),
    // 로그: 정밀 조준 = 다음 공격에 이점 (암습이 확실해진다) / 교활한 행동 = 질주 · 물러나기 · 숨기 — 붙어 있으면 물러날 값
    sr_steady: C => { const L = clv(C.a, 'rogue'), sn = Math.ceil(L / 2) * face(C.a, 6) * C.g, p = C.ph, pa = Math.min(0.95, 1 - (1 - p) * (1 - p)); return sn * 0.4 * pa + F().allyAtk(C.x.f, C.a) * (pa - p); },
    sr_cunning: C => (C.near(1.8).length ? C.toE(onMe(C)) * 0.5 : C.dprOf(C.a) * 0.15),
    // 몽크: 연타 = 맨손 두 번 (무술 주사위) / 인내의 방어 = 나를 치는 공격에 불리 / 바람의 발걸음 = 질주 · 물러나기 / 신체의 완전함 = 무술 주사위 + 지혜 회복
    sr_flurry: C => 2 * (face(C.a, martial(C.a)) + DN().mod(DN().ab(C.a.merc).dex)) * C.g * C.ph,
    sr_patient: C => C.toE(onMe(C) * 0.4),
    sr_wind: C => (C.near(1.8).length > 1 ? C.toE(onMe(C)) * 0.4 : 0), // 둘 이상에게 둘러싸였을 때 빠져나온다 — 아니면 걸어서 붙는다
    sr_whole: C => healV(C, [C.a], face(C.a, martial(C.a)) + DN().mod(DN().ab(C.a.merc).wis)),
    // 팔라딘: 안수 = 치유 5 × 팔라딘 레벨 (쓰러진 사람을 일으키는 것이 가장 크다) / 신성한 무기 = 명중 + 매력 / 생명의 오라 = 쓰러진 아군이 차례마다 1로 일어난다
    sr_lay: C => healV(C, C.ps, 5 * clv(C.a, 'paladin')),
    sr_sacred: C => C.dprOf(C.a) * (Math.max(1, DN().mod(DN().ab(C.a.merc).cha)) / 20 / Math.max(0.05, C.allyP(C.a))) * C.R,
    sp_aura_of_life: C => ((C.x.rt.party || []).some(p => p.dying) ? C.pDPR * 2 : C.toE(incoming(C) * 0.1) * C.R),
    // 레인저: 자연의 장막 = 다음 차례까지 투명 (내 공격 이점 · 나를 치는 공격 불리) / 나무 껍질 = AC 17
    ft_veil: C => C.dprOf(C.a) * 0.25 + C.toE(onMe(C) * 0.5),
    sp_barkskin: C => C.toE(incoming(C) * 0.15) * C.R,
    // 클레릭: 생명 보존 = 5 × 클레릭 레벨을 체력 절반 아래 아군에게 나눠 / 언데드 퇴치 = 언데드가 지혜 내성 — 실패하면 겁먹고 행동 불능
    sr_preserve: C => healV(C, C.ps.filter(p => p.hp < p.max / 2), 5 * clv(C.a, 'cleric'), true),
    sr_turn: C => C.near(6).filter(o => /undead/.test(o.stat?.ty || o.ty || '')).reduce((s, o) => s + dis(C, o, [1, 0], 2) * C.pf(o, 'wis'), 0),
    // 드루이드: 야생 변신 = 변신 체력(임시) — 주문을 못 쓰니 슬롯이 남았으면 손해
    sr_wild: C => C.toE(onMe(C) * 0.5) * Math.min(C.R, 3) - ([1, 2, 3, 4, 5].some(L => G.Res.left(C.a.merc, { slot: L }) > 0) ? C.dprOf(C.a) * C.R : 0),
    // 바드: 바드의 영감 = 아군 하나의 다음 굴림에 영감 주사위 (가장 센 공격수의 명중에)
    sr_insp: C => { const L = clv(C.a, 'bard'), d = L >= 15 ? 12 : L >= 10 ? 10 : L >= 5 ? 8 : 6; return Math.max(0, ...C.ps.filter(p => p !== C.a).map(p => C.dprOf(p) * ((d + 1) / 2 / 20) / Math.max(0.05, C.allyP(p)))); },
    // 안개 걸음: 붙어 있는 적에게서 빠져나온다 (주문 직업이 근접에 잡혔을 때)
    sr_misty: C => (C.near(1.8).length && DN().caster(C.a) ? C.toE(onMe(C)) * 1.2 : 0),
    // 시간 정지: 차례를 1d4 + 1번 더 (그동안 가장 좋은 공격)
    sp_time_stop: C => C.dprOf(C.a) * 3.5,
    sr_stun: C => one(C, o => dis(C, o, COND_W.stunned, 1) * C.pf(o, 'con') * pHit(C.a, o)) + atkAll(C), // 공격 행동 그대로 + 맞으면 기절 (srd.js weaponAtk) // 기절 타격
    sr_cstrike: C => one(C, o => dis(C, o, COND_W.prone, 1) * C.pf(o, 'dex')) + atkAll(C) - face(C.a, 6) * C.g * 0.5, // 교활한 일격: 암습 주사위 하나와 바꾼다
  };
  const AI = {
    // 위협: 파티가 이 전투를 끝내는 데 드는 라운드 ÷ 3, 체력이 낮거나 보스면 더 높다
    threat(a, x) {
      const foes = x.rt.mons.filter(o => o.hp > 0 && (o.aggro || x.seen.includes(o))), ps = alive(x); if (!foes.length || !ps.length) return 0;
      const hp = foes.reduce((s, o) => s + o.hp, 0), dpr = Math.max(1, ps.reduce((s, p) => s + F().allyAtk(x.f, p) * DN().attacks(p) * 0.65, 0)), hpK = ps.reduce((s, p) => s + p.hp / p.max, 0) / ps.length;
      return Math.max(0, hp / dpr / PARTY_ROUNDS) + (1 - hpK) + (foes.some(o => o.boss) ? 0.5 : 0);
    },
    // 범위 안에 가장 많이 잡히는 적
    best(x, r) { let top = []; for (const o of x.seen) { const q = x.seen.filter(t => Math.hypot(t.x - o.x, t.y - o.y) <= r); if (q.length > top.length) top = q; } return top; },
    // 기본 공격 한 번의 피해 (넘치는 몫은 뺀다)
    // 워락의 기본 공격은 섬뜩한 폭발 — 광선이 단계만큼 나간다 (근접 계약 무기가 아니면). 한 줄기로 세면 다른 소마법이 더 좋아 보여 폭발을 안 쓴다
    basic(a, x) { const t = x.seen[0]; if (!t) return 1; const n = !DN().caster(a) ? DN().attacks(a) : DN().ebOf(a.merc) ? (DN().melee(a) ? DN().attacks(a) : DN().tier(a)) : DN().tier(a) * DN().attacks(a); const p = pBasic(a, t), w = DN().weapon(a) || { n: 1, d: 6, b: 0 }, avgW = w.n * (w.d + 1) / 2 + (w.b || 0), fw = w.n * face(a, w.d), k = avgW > 0 ? (fw + (w.b || 0)) / avgW : 1, cr = crit2(a) > 1 ? fw / Math.max(1, avgW) : 0; // 무기 주사위도 그 눈 · 눈 20이면 첫 공격 치명타
      const raw = F().allyAtk(x.f, a) * (n * k + cr), rd = AI.rider(a, x, n, 1); // 기본 공격(+ 강타)으로 확실히 쓰러뜨리면 그 값 — 강타 팔라딘은 그 슬롯을 강타에
      return Math.max(1, Math.min(t.hp, raw * p + rd * (fateV(a) ? p : 1 - Math.pow(1 - p, n))) + (p >= 0.9 && raw + rd >= t.hp ? killV(AI.ctx(a, x), t, raw + rd, p) : 0)); },
    // 무기로 맞히면 붙는 기술(신성 강타 · 섬뜩한 강타 · 작열 강타): 그 슬롯을 주문에 쓰면 이것을 잃는다 — 무기 공격의 값에 더한다 (근접 팔라딘이 화염구보다 강타를 고르게)
    rider(a, x, n, p = 0.65) { if (!a.merc || a.slotUsed || (DN().caster(a) && !DN().melee(a))) return 0; let best = 0; for (const k of G.Guild.active(a.merc)) { const S = SK()[k]; if (!S?.rider || !G.Res.can(a.merc, k, S.res)) continue; const num = G.SkillNum_at?.(k, a.merc.cls, a.merc.lv); best = Math.max(best, (rollAvg(a, num?.d) || 9) * crit2(a) * (H().G0 ? H().G0(x, a) : 1)); } return best * (fateV(a) ? p : 1 - Math.pow(1 - p, n)); }, // 운명판: 그 라운드 공격은 모두 같은 눈 — 하나가 맞으면 다 맞는다
    // 전술 판단의 재료 (그 차례 · 그 기술의 사거리 안 적 x.seen): 남은 라운드 R · 아군 · 적의 라운드당 피해 · 내성 실패 확률
    ctx(a, x) {
      const ps = alive(x), foes = x.seen.filter(o => o.hp > 0), all = x.rt.mons.filter(o => o.hp > 0 && (o.aggro || x.seen.includes(o))), g = H().G0 ? H().G0(x, a) : 1;
      const acs = all.map(o => DN().ac(o)), acF = acs.length ? acs.reduce((s, v) => s + v, 0) / acs.length : 13, allyP = p => P20(acF - DN().hit(p)); // 아군의 명중 (운명판 눈은 그 사람 것이라 아군 값엔 쓰지 않는다)
      const dprOf = p => F().allyAtk(x.f, p) * (!DN().caster(p) ? DN().attacks(p) : DN().ebOf(p.merc) && !DN().melee(p) ? DN().tier(p) : DN().caster(p) ? DN().tier(p) : 1) * allyP(p);
      const pDPR = Math.max(1, ps.reduce((s, p) => s + dprOf(p), 0)), eHP = Math.max(1, all.reduce((s, o) => s + o.hp, 0));
      const pHP = Math.max(1, ps.reduce((s, p) => s + Math.max(1, DN().srdHP(p.merc)) * Math.max(0, p.hp) / p.max, 0)); // 우리 체력 (SRD 단위 — 적의 SRD 주사위와 견준다)
      const acP = ps.length ? ps.reduce((s, p) => s + DN().ac(p), 0) / ps.length : 15, fDPR = o => { let d = 0; try { for (const q of G.Foe.attacks(o) || []) d += ((q.n || 1) * ((q.d || 4) + 1) / 2 + (q.b || 0)) * P20(acP - (q.hit ?? 4)); } catch (e) { d = 4 * 0.5; } return d; }; // 적이 우리를 칠 확률은 우리 AC로
      const pf = (o, ab) => pFail(a, o, ab), ph = foes.length ? foes.reduce((s, o) => s + pHit(a, o), 0) / foes.length : 0.6; // 그 적이 내성에 실패할 확률 · 내 공격이 맞을 확률 (운명판의 눈까지)
      return { a, x, ps, foes, all, g, pDPR, eHP, dprOf, fDPR, pf, ph, allyP, R: Math.max(1, Math.min(6, eHP / pDPR)),
        toE: d => d / pHP * eHP, // 우리가 덜 받은 피해(SRD) → 적 체력으로 (싸움은 경주 — 우리 체력의 몫 = 적 체력의 몫)
        share: o => o.hp / eHP, near: r => foes.filter(o => Math.hypot(o.x - a.x, o.y - a.y) <= r), up: (res, b) => Math.max(0, G.Res.castLevel(a.merc, res) - (b || 1)),
        mod: () => DN().mod(DN().ab(a.merc)[G.SrdX?.castAb?.(a.merc) || ({ cleric: 'wis', scout: 'wis', archer: 'wis', archmage: 'int' })[a.merc.cls] || 'cha'] || 10) };
    },
    // 한 수 내다보기 (2026-11-20, 사용자: 「다음라운드정도는 예측 해도 괜찮을거같기도… 한 두수 정도는 사람도 예측하잖아」):
    // 슬롯 주문은 다음 라운드 눈으로도 값을 잰다. 다음 라운드가 훨씬 좋으면 지금 값을 깎는다 — 이번엔 굴림 없는 기술 · 소마법, 큰 주문은 다음 라운드에.
    // 다음 라운드는 적이 움직이거나 전투가 끝날 수 있어 NEXT_K로 깎아서 본다
    score(k, a, x, threat) {
      const v = AI.scoreNow(k, a, x, threat), S = SK()[k], vn = fateNext(a);
      if (!S?.res?.slot || !vn || FORCE) return v;
      // 미룰 이유는 슬롯이 모자랄 때뿐: 그 레벨 슬롯이 마지막 하나이거나 이번 전투의 몫을 다 썼다 (넉넉하면 지금 쓰고 다음 라운드에 또 쓴다)
      { const m = a.merc, fr = G.Res.slotFrac ? G.Res.slotFrac(m) : 1, f0 = m.frac0 ?? fr, share = f0 / Math.max(1, G.Res.fightsLeft ? G.Res.fightsLeft() : 3); if (G.Res.left(m, S.res, k) > 1 && f0 - fr < share) return v; }
      const b0 = AI.basic(a, x); FORCE = { a, v: vn }; let w = v, b1 = b0; try { w = AI.scoreNow(k, a, x, threat); b1 = AI.basic(a, x); } catch (e) { w = v; } finally { FORCE = null; }
      return v - Math.max(0, NEXT_K * w * b1 - v * b0) * 0.6 / b0; // 값은 그 라운드 기본 공격 대비라 절대량(× 기본 공격)으로 견준다
    },
    scoreNow(k, a, x, threat) {
      const S = SK()[k], M = D.MSKILLS[k], m = a.merc, o = meta(k), num = G.SkillNum_at?.(k, m.cls, m.lv), res = S.res; if (S.prio && !TAC[k]) return 2 + S.prio; // 우선 기술 — 값을 매길 수 있는 것(용 동반자)은 값으로
      let v;
      const ps = alive(x), tot = Math.max(1, x.seen.reduce((s, q) => s + q.hp, 0)), base = AI.basic(a, x);
      // 전술 판단: 직업 기능 · 강화는 TAC, 주문은 SRD DB (피해 주사위가 코드 기록표에 있고 상태 이상 · 집중이 없는 한 번짜리 피해 주문은 예전 계산 그대로)
      const useDB = o && !S.heal && !o.heal && (o.conds?.length || (o.dice && (o.conc || !num?.d)));
      if ((TAC[k] || useDB) && x.seen.length) { let t = 0; try { const C = AI.ctx(a, x); t = TAC[k] ? TAC[k](C, res) : fromDB(o, C, res); } catch (e) { t = 0; } v = t / base; }
      else if (S.heal || o?.k === 'heal' || o?.heal) {
        const hurt = ps.filter(p => p.hp < p.max).sort((p, q) => p.hp / p.max - q.hp / q.max), n = o?.n || 1, g = H().G0 ? H().G0(x, a) : 1, each = rollAvg(a, num?.d) * (p => p.max / Math.max(1, DN().srdHP(p.merc)))(a), healed = hurt.slice(0, n).reduce((s, p) => s + Math.min(p.max - p.hp, each || p.max * 0.2), 0), whole = Math.max(1, ps.reduce((s, p) => s + p.max, 0)), low = hurt[0] ? hurt[0].hp / hurt[0].max : 1, dying = (x.rt.party || []).some(p => p.dying);
        v = hurt.length ? (healed / whole) * HEAL_K * (dying ? 6 : low < 0.25 ? 4 : low < 0.5 ? 2 : 0.6) + (dying ? 12 : low < 0.25 ? 8 : low < 0.5 ? 2 : 0) : 0;
      } else if (num?.d && !S.heal) { let kill = 0;
        // 명중 굴림도 내성도 없는 피해 주문(마법 화살 · 금속 달구기 — SRD DB에 atk · save가 없다)은 자동 명중
        const r = o?.area || (M.d && /반경 (\d+)칸|곁 (\d+)칸/.exec(M.d)?.slice(1).find(Boolean)) || 0, list = r ? AI.best(x, +r) : o?.n > 1 ? x.seen.slice(0, o.n) : x.seen.slice(0, 1), ab = o?.save || num.sv, half = o?.half, auto = o && !o.atk && !ab && GD().spLv(k) > 0, pt = q => (ab ? pFail(a, q, ab) * (half ? 0.5 : 1) + (half ? 0.5 : 0) : auto ? 1 : pHit(a, q)), g = H().G0(x, a), ty = G.Skill.spellType(k), upD = res?.slot && G.Skill.UP?.[k] ? rollAvg(a, G.Skill.UP[k]) * Math.max(0, G.Res.castLevel(m, res) - (S.base || 1)) : 0, dmg = list.reduce((s, q) => s + Math.min(q.hp, (rollAvg(a, num.d) * (!ab && !auto ? crit2(a) : 1) + upD) * g * pt(q) * (ty ? G.Foe.dealK(a, q, ty) : 1)), 0);
        { const C = AI.ctx(a, x); for (const q of list) { const one = (rollAvg(a, num.d) * (!ab && !auto ? crit2(a) : 1) + upD) * g * (ty ? G.Foe.dealK(a, q, ty) : 1), sure = ab ? (half ? one * 0.5 : pFail(a, q, ab) >= 0.9 ? one : 0) : one; kill += killV(C, q, sure, ab ? 1 : auto ? 1 : pHit(a, q)); } } // 확실히 쓰러뜨리는 적 /* 높은 슬롯으로 쓰면 주사위가 는다 (SRD) — 예전 스킬 레벨 배율 대신 */
        v = (dmg + kill) / base;
        if (GD().spLv(k) === 0 && (!DN().caster(a) || (DN().ebOf(a.merc) && k !== 'sr_eb'))) v *= 0.5; // 고통의 폭발이 있는 워락도 섬뜩한 폭발이 먼저 // 무기 직업이 재주 · 종족으로 얻은 소마법: 무기를 먼저 쓴다 (강타 · 암습 · 표식이 무기에 붙는다 — 그 값은 위 계산에 없다)
        if (num.t && x.seen.every(q => G.Foe.typeK(q, num.t, a) <= 0)) v = -1; // 다 면역이면 쓰지 않는다
      } else if (o?.k === 'cond' || num?.c?.length) {
        const r = o?.area || 0, list = r ? AI.best(x, r) : x.seen.slice(0, 1), share = list.reduce((s, q) => s + q.hp, 0) / tot; v = COND_K * (list.length ? list.reduce((s, q) => s + pFail(a, q, o?.save || num?.sv || 'wis'), 0) / list.length : 0.6) * share * Math.min(1, threat) * Math.min(4, Math.max(1, list.length));
      } else if (o?.k === 'buff' || /축복|방패|신앙/.test(M.n)) v = BUFF_K * Math.min(1, threat) * (o?.props?.self ? 0.7 : 1);
      else if (o?.k === 'summon' || o?.k === 'field') v = SUMMON_K * Math.min(1, threat);
      else if (!res) v = DEFAULT_K; else v = DEFAULT_K * Math.min(1.5, 0.5 + threat);
      if (!TAC[k] && !useDB && S.conc && !S.heal) v *= 0.5; // 값을 모르는 집중 주문(선악 보호 · 저항 …)이 집중을 차지해 축복 · 헥스를 막지 않게
      // 슬롯 값: 이번 전투의 몫 = 전투를 시작할 때 남은 슬롯 ÷ 다음 긴 휴식까지 남은 전투(G.Res.fightsLeft). 몫 안에서는 과감하게, 넘으면 아낀다. 쉬운 전투일수록 아끼는 것은 그대로 (위협이 크면 몫과 상관없이 쓴다)
      if (res?.slot) { const L = G.Res.castLevel(m, res), left = G.Res.left(m, res, k), fr = G.Res.slotFrac ? G.Res.slotFrac(m) : 0.5, f0 = m.frac0 ?? fr, share = f0 / Math.max(1, G.Res.fightsLeft ? G.Res.fightsLeft() : 3), spent = Math.max(0, f0 - fr), keep = spent < share ? 0.2 : spent < share * 1.6 ? 0.7 : 1.5, need = Math.max(0, 1.2 - Math.min(1, threat)) * keep; v -= SLOT_K * L * need * (left <= 1 ? 1.5 : 1); }
      else if (res) v -= 0.1 * Math.max(0, 1 - threat);
      if (S.conc && a.concK && !G.Res.concSpent(a)) v -= 0.5;
      return v;
    },
    // 스킬 순서와 값: 값이 낮으면 쓰지 않는다 (행동은 기본 공격보다 높아야)
    rank(list, a, x0, bonus) {
      const threat = AI.threat(a, x0), base = bonus ? 0 : 1, out = [];
      // 주문 가속 (SRD 소서러): 행동은 소마법, 추가 행동으로 가속한 슬롯 주문 — 행동에 슬롯 주문을 쓰면 가속할 자리가 없다. 추가 행동이 남아 있고 마력 점수가 있으면 행동에서는 슬롯 주문을 미룬다
      const later = !bonus && !a.lastBonus && G.Opt.can(a, 'sr_quicken');
      for (const k of list) { const S = SK()[k]; if (!S || S.rider) continue; const reach = D.SK_RANGE[k], x = { ...x0, reach, seen: reach == null ? x0.seen : x0.seen.filter(o => Math.hypot(o.x - a.x, o.y - a.y) <= Math.max(reach, 1.5) + 0.5) }; let v; try { v = AI.score(k, a, x.seen.length ? x : x0, threat); } catch (e) { v = 0; } if (later && S.res?.slot && !S.bonus && !S.heal) v = Math.min(v, 0.5); out.push([k, v]); }
      out.sort((p, q) => q[1] - p[1]); AI.last = { threat, base, out: out.slice(0, 6) };
      return out.filter(q => (bonus ? q[1] > 0.05 : q[1] > base * 0.9) || !x0.seen.length || SK()[q[0]].heal).map(q => q[0]); // 추가 행동 · 자유 행동도 값이 있을 때만 (예전엔 문턱이 없어 값 없는 기술 — 적이 멀 때의 바람의 발걸음 — 이 남는 칸을 채웠다)
    },
  };
  return AI;
})();
