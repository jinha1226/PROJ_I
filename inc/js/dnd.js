'use strict';
// D&D 규칙 바탕 (DESIGN.md 56): SRD 5.2.1 규칙을 그대로 — 12직업 · 능력치 6종 · d20 명중 · 내성 6종 · 상태이상 · 탐험 판정.
// 숫자 크기는 혼합형 — 맞느냐는 D&D 크기(AC는 층마다 천천히), 얼마나 아프냐는 성장 배율(G.Fantasy.allyAtk)이 정한다.
// 용병 능력치: 고용할 때 4d6에서 가장 낮은 하나를 버리고 여섯 번 굴려 직업 우선순위대로 놓는다(m.ab). 레벨 4·8·12·16·19에 주능력 +2(최대 20).
G.Dnd = (() => {
  const U = G.U;
  const AB = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const AB_N = { str: '근력', dex: '민첩', con: '건강', int: '지능', wis: '지혜', cha: '매력' };
  // Lv 19는 SRD 5.2.1에서 능력치 상승 대신 서사 은혜 (DESIGN.md 59) — 은혜와 서사 단계가 주능력을 30까지
  const ASI_LV = [4, 8, 12, 16], AB_MAX = 20, EPIC_MAX = 30;
  // 갑옷: 가벼움 12+민첩 · 중간 14+민첩(최대 2) · 무거움 16 · 마법 갑옷 13+민첩 · 비무장 방어 10+민첩+(건강 · 지혜) · 방패 +2 · 갑옷 강화 10단계마다 +1 (최대 +3)
  const ARMOR = {
    light: ab => 12 + N.mod(ab.dex), medium: ab => 14 + Math.min(2, N.mod(ab.dex)), heavy: () => 16, mage: ab => 13 + N.mod(ab.dex),
    barb: ab => 10 + N.mod(ab.dex) + N.mod(ab.con), monk: ab => 10 + N.mod(ab.dex) + N.mod(ab.wis),
  };
  // 12직업 (SRD 5.2.1 직업 표): 히트 다이스 · 주능력 · 능력치 놓는 순서 · 갑옷 · 방패 · 내성 숙련 · 기술 숙련(탐험 판정에 쓰는 셋만)
  // 내부 키는 옛 저장을 살리려고 그대로 둔다: archer = 레인저 · dragoon = 파이터 · mage = 소서러 · archmage = 위저드 · scout = 드루이드
  const CLS = {
    barbarian: { hd: 12, pri: 'str', order: ['str', 'con', 'dex', 'wis', 'cha', 'int'], armor: 'barb', saves: ['str', 'con'], sk: ['perception'] },
    bard: { hd: 8, pri: 'cha', order: ['cha', 'dex', 'con', 'wis', 'int', 'str'], armor: 'light', saves: ['dex', 'cha'], sk: ['perception', 'investigation', 'persuasion'] },
    cleric: { hd: 8, pri: 'wis', order: ['wis', 'con', 'str', 'cha', 'dex', 'int'], armor: 'medium', shield: true, saves: ['wis', 'cha'], sk: ['persuasion'] },
    scout: { hd: 8, pri: 'wis', order: ['wis', 'con', 'dex', 'int', 'cha', 'str'], armor: 'light', shield: true, saves: ['int', 'wis'], sk: ['perception'] },
    dragoon: { hd: 10, pri: 'str', order: ['str', 'con', 'dex', 'wis', 'cha', 'int'], armor: 'heavy', saves: ['str', 'con'], sk: ['perception'] },
    monk: { hd: 8, pri: 'dex', order: ['dex', 'wis', 'con', 'str', 'int', 'cha'], armor: 'monk', saves: ['str', 'dex'], sk: [] },
    paladin: { hd: 10, pri: 'str', order: ['str', 'cha', 'con', 'wis', 'dex', 'int'], armor: 'heavy', shield: true, saves: ['wis', 'cha'], sk: ['persuasion'] },
    archer: { hd: 10, pri: 'dex', order: ['dex', 'wis', 'con', 'str', 'int', 'cha'], armor: 'light', saves: ['str', 'dex'], sk: ['perception', 'investigation'] },
    rogue: { hd: 8, pri: 'dex', order: ['dex', 'con', 'cha', 'int', 'wis', 'str'], armor: 'light', saves: ['dex', 'int'], sk: ['perception', 'investigation', 'persuasion'] },
    mage: { hd: 6, pri: 'cha', order: ['cha', 'con', 'dex', 'wis', 'int', 'str'], armor: 'mage', saves: ['con', 'cha'], sk: ['persuasion'] },
    warlock: { hd: 8, pri: 'cha', order: ['cha', 'con', 'dex', 'wis', 'int', 'str'], armor: 'light', saves: ['wis', 'cha'], sk: ['investigation'] },
    archmage: { hd: 6, pri: 'int', order: ['int', 'con', 'dex', 'wis', 'cha', 'str'], armor: 'mage', saves: ['int', 'wis'], sk: ['investigation'] },
  };
  const SKILL_AB = { perception: 'wis', investigation: 'int', persuasion: 'cha' };
  // 단장(기사): 파이터처럼 — 근력 16 · 무거운 갑옷 + 방패 · 근력 · 건강 내성
  const HERO_AB = { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 13 }, HERO_SAVES = ['str', 'con'];
  // 몬스터: 층이 곧 도전 등급. AC 12 + 층/5 (최대 20) · 명중 +3 + 층/4 (최대 +13) · 내성 +1 + 층/5 · 능력 DC 10 + 층/4 (최대 19). 보스 AC +1 · 명중 · 내성 · DC +2
  const MON_AC = (fl, boss) => Math.min(20, 12 + Math.floor(fl / 5)) + (boss ? 1 : 0);
  const MON_HIT = (fl, boss) => 3 + Math.min(10, Math.floor(fl / 4)) + (boss ? 2 : 0);
  const MON_SAVE = (fl, boss) => 1 + Math.floor(fl / 5) + (boss ? 2 : 0);
  const MON_DC = (fl, boss) => Math.min(19, 10 + Math.floor(fl / 4)) + (boss ? 2 : 0);
  // 상태이상 (SRD 부록 「Conditions」): 손을 못 씀 · 공격 불리 · 맞을 때 상대 이점 · 근접 명중은 치명타
  const COND = {
    stunned: { n: '기절', out: true, hitAdv: true },
    paralyzed: { n: '마비', out: true, hitAdv: true, meleeCrit: true },
    prone: { n: '넘어짐', out: true, hitAdv: true },
    restrained: { n: '속박', atkDis: true, hitAdv: true },
    frightened: { n: '공포', atkDis: true },
    poisoned: { n: '중독', atkDis: true },
    blinded: { n: '실명', atkDis: true, hitAdv: true },
    // 무기 숙련 「약화」(Sap) · 잔인한 조롱: 다음 공격 불리 / 인도의 화살: 다음에 맞는 공격 이점
    sapped: { n: '약화', atkDis: true },
    outlined: { n: '빛남', hitAdv: true },
  };
  // 직업 기본 규칙: 추가 공격(파이터 · 팔라딘 · 레인저 · 바바리안 · 몽크, Lv 5 — 파이터는 11에 셋 · 20에 넷) · 소마법 강화(Lv 5 · 11 · 17)
  const MARTIAL = new Set(['dragoon', 'paladin', 'archer', 'barbarian', 'monk']), CASTER = new Set(['mage', 'archmage', 'warlock', 'scout', 'bard']);
  // 몬스터 고유 능력 (data.js bands · bosses의 fx): 맞히면 PROC 확률로 내성 굴림 — 실패하면 상태이상
  const PROC = 0.3;
  // 우리가 몬스터에게 거는 것 (F.inflict): 기절 = 건강 내성 · 정지(마비) = 지혜 내성 · 감전(느려짐) = 건강 내성. 지속 피해 · 표식은 굴림 없이
  const INFLICT_SAVE = { stun: 'con', stop: 'wis', shock: 'con' };
  const fl = () => G.S.w.fantasy.floor || 1;
  const now = () => G.S.runTime;
  const N = {
    AB, AB_N, CLS, COND, SKILL_AB,
    // 기본 공격은 이제 빗나갈 수 있다(평균 명중 약 70%) — 그만큼 한 방을 키워 처치 속도를 예전과 맞춘다
    HIT_K: 1.4,
    mod: s => Math.floor((s - 10) / 2),
    prof: lv => 2 + Math.floor((Math.max(1, lv) - 1) / 4),
    // 4d6 가장 낮은 것 버림
    roll4: () => { const d = [0, 0, 0, 0].map(() => 1 + U.rand(6)).sort((a, b) => a - b); return d[1] + d[2] + d[3]; },
    rollAb(cls) {
      const c = CLS[cls] || CLS.archer, v = AB.map(() => N.roll4()).sort((a, b) => b - a), ab = {};
      c.order.forEach((k, i) => (ab[k] = v[i]));
      return ab;
    },
    // 레벨이 올린 능력치 포함 (주능력부터 20까지, 다 차면 다음 순서)
    ab(m) {
      if (!m.ab || m.abCls !== m.cls) { m.ab = N.rollAb(m.cls); m.abCls = m.cls; }
      const c = N.cls(m), ab = { ...m.ab };
      let pts = 2 * ASI_LV.filter(l => m.lv >= l).length;
      for (const k of c.order) { const up = Math.min(pts, AB_MAX - ab[k]); if (up > 0) { ab[k] += up; pts -= up; } if (!pts) break; }
      const ep = (m.boons || []).length + (m.bt || 0);
      if (ep) ab[c.pri] = Math.max(ab[c.pri], Math.min(EPIC_MAX, ab[c.pri] + ep));
      // 마법 물건: 능력치 더하기 · 고정 (DESIGN.md 58)
      return G.Trinket.ability(m, ab);
    },
    // 이 직업에게 그 능력치가 무엇에 쓰이나 (화면 설명 — DESIGN.md 65). 주능력 = 공격
    role(cls, k) {
      const c = CLS[cls] || CLS.archer, out = [];
      if (k === c.pri) out.push('공격');
      if (k === 'con') out.push('체력');
      if (k === 'dex' && c.armor !== 'heavy') out.push('방어');
      if ((k === 'con' && c.armor === 'barb') || (k === 'wis' && c.armor === 'monk')) out.push('방어');
      if (out.length) return out.join(' · ');
      return { str: '넘어짐 버티기', dex: '선제', int: '미믹 알아채기', wis: '기습 알아채기', cha: '흥정' }[k];
    },
    // 공격 · 체력 · 방어에 쓰이나 (만들기 · 상세에서 강조)
    key: (cls, k) => /공격|체력|방어/.test(N.role(cls, k)),
    // 능력치 합 (선술집 몸값 · 표시)
    total: m => { N.ab(m); return N.sumAb(m.ab); },
    sumAb: ab => AB.reduce((s, k) => s + ab[k], 0),
    // 신전 축복 (G.Guild.blessT)
    bless: e => (e.merc && G.RT.fantasy && G.RT.fantasy.floorT < G.Guild.blessT() ? 2 : 0),
    cls: m => CLS[m.cls] || CLS.archer,
    // 히트 다이스 → 몸 체력 배율 (d6 0.72 · d8 0.96 · d10 1.2 · d12 1.44)
    hdK: cls => (CLS[cls] || CLS.archer).hd * 0.12,

    // ── 몸(던전 위 엔티티)마다 ──
    abOf(e) { return e.merc ? N.ab(e.merc) : e.kind === 'hero' ? HERO_AB : null; },
    // 명중 보정: 숙련 + 주능력 수정치
    hit(e) {
      if (e.merc) return N.prof(e.merc.lv) + N.mod(N.ab(e.merc)[N.cls(e.merc).pri]) + G.Guild.sum(e.merc, 'hitB') + G.Guild.magic(G.Guild.gear(e.merc).w) + G.Trinket.sum(e.merc, 'hit') + N.bless(e);
      if (e.kind === 'hero') return 3 + N.mod(HERO_AB.str) + Math.floor(fl() / 5);
      if (e.kind === 'rival') return MON_HIT(fl(), false) + 1;
      return MON_HIT(fl(), e.boss);
    },
    ac(e) {
      if (e.merc) { const c = N.cls(e.merc), ab = N.ab(e.merc); return Math.max(ARMOR[c.armor](ab), G.Guild.skill(e.merc, 'sr_dres') ? 10 + N.mod(ab.dex) + N.mod(ab.cha) : 0) + (c.shield ? 2 : 0) + G.Guild.magic(G.Guild.gear(e.merc).a) + G.Trinket.sum(e.merc, 'ac') + N.bsum(e, 'ac'); }
      if (e.kind === 'hero') return 18 + Math.min(3, Math.floor(fl() / 10));
      if (e.kind === 'rival') return MON_AC(fl(), false) + N.bsum(e, 'ac');
      return MON_AC(fl(), e.boss) + N.bsum(e, 'ac');
    },
    // 피해 배율: 주능력 수정치마다 +10% (D&D는 주사위에 더하지만 피해가 배율로 자라므로 곱으로)
    dmgK(e) { return e.merc ? 1 + 0.1 * N.mod(N.ab(e.merc)[N.cls(e.merc).pri]) : 1; },
    // 체력 배율: 건강 수정치마다 +10%
    hpK(m) { return 1 + 0.1 * N.mod(N.ab(m).con); },
    // 주문 · 능력 내성 난이도: 8 + 숙련 + 주능력 (몬스터는 층으로)
    dc(e) { return e.merc || e.kind === 'hero' ? 8 + N.hit(e) : MON_DC(fl(), e.boss); },
    // 내성 보정: 능력 수정치 + 직업 내성 숙련
    saveBonus(e, k) {
      if (e.merc) return N.mod(N.ab(e.merc)[k]) + (N.cls(e.merc).saves.includes(k) ? N.prof(e.merc.lv) : 0) + G.Trinket.sum(e.merc, 'save') + N.bless(e);
      if (e.kind === 'hero') return N.mod(HERO_AB[k]) + (HERO_SAVES.includes(k) ? 2 + Math.floor(fl() / 8) : 0);
      return MON_SAVE(fl(), e.boss);
    },
    // 기술 판정 보정 (지각 · 조사 · 설득): 능력 수정치 + 숙련(직업에 있으면)
    // 숙련 (출신 재주): 셋 다 숙련
    skill(m, sk) { return N.mod(N.ab(m)[SKILL_AB[sk]]) + (N.cls(m).sk.includes(sk) || G.Feat.has(m, 'skilled') ? N.prof(m.lv) : 0); },
    // 방치형이라 파티에서 가장 잘하는 사람이 굴린다 (그 사람을 함께 돌려준다)
    best(list, sk) { let b = null, v = -99; for (const m of list) { const s = N.skill(m, sk) + (N.reliable(m) ? 5 : 0); if (s > v) { v = s; b = m; } } return { m: b, v }; },
    // 로그 믿음직한 재능 (Reliable Talent): 숙련 판정은 10 아래로 굴리지 않는다 — 방치형 판정에서는 +5로
    reliable: m => (G.Guild.slots(m) || []).includes('sr_reliable'),

    // ── 상태이상: e.cond = { 이름: 끝나는 시각 } (몬스터의 옛 기절 · 정지 타이머도 같이 읽는다) ──
    has(e, k) {
      if (k === 'stunned' && e.stun > 0) return true;
      if (k === 'paralyzed' && e.stop > 0) return true;
      return !!(e.cond && e.cond[k] > now());
    },
    // 생물 종류 (언데드 퇴치 · 신성 강타 · 인간형 포박)
    undead: e => e.ty === 'undead', fiend: e => e.ty === 'fiend', humanoid: e => e.kind === 'rival' || e.ty === 'humanoid',
    // ── 잠깐 붙는 효과: e.bf = { 키: { until, ac, hit, save, dmg, taken, cd, adv, dis } } — 같은 키는 덮어쓴다 ──
    buff(e, k, t, props) { (e.bf = e.bf || {})[k] = Object.assign({ until: now() + t }, props); },
    bsum(e, p) { let v = 0; if (e.bf) for (const k in e.bf) { const b = e.bf[k]; if (b.until > now() && b[p]) v += b[p]; } return v; },
    bprod(e, p) { let v = 1; if (e.bf) for (const k in e.bf) { const b = e.bf[k]; if (b.until > now() && b[p] != null) v *= b[p]; } return v; },
    bon: (e, k) => !!(e.bf && e.bf[k] && e.bf[k].until > now()),
    // 한 번에 몇 번 치나 (추가 공격) · 소마법 단계 (1~4)
    attacks(a) { const m = a.merc; if (!m || !MARTIAL.has(m.cls)) return 1; return m.cls === 'dragoon' ? (m.lv >= 20 ? 4 : m.lv >= 11 ? 3 : m.lv >= 5 ? 2 : 1) : m.lv >= 5 ? 2 : 1; },
    tier: a => (a.merc ? 1 + (a.merc.lv >= 5) + (a.merc.lv >= 11) + (a.merc.lv >= 17) : 1),
    caster: a => !!a.merc && CASTER.has(a.merc.cls),
    // 로그 기습 (Sneak Attack): 이점이 있거나 표적 곁(1.5칸)에 다른 동료가 있으면, 한 번에 (Lv/2 올림)d6 — 주사위 하나에 피해 +50%
    sneak(rt, a, tg, adv) {
      if (!a.merc || a.merc.cls !== 'rogue' || a.sneakT > now()) return 1;
      if (!(adv > 0) && !rt.party.some(p => p !== a && !p.dead && Math.hypot(p.x - tg.x, p.y - tg.y) <= 1.5)) return 1;
      a.sneakT = now() + 0.9;
      return 1 + 0.5 * Math.ceil(a.merc.lv / 2);
    },
    any(e, flag) { for (const k in COND) if (COND[k][flag] && N.has(e, k)) return true; return false; },
    // 손을 못 쓰는 중 (기절 · 마비 · 넘어짐)
    out: e => N.any(e, 'out'),
    // 움직이지 못함 (속박)
    held: e => N.has(e, 'restrained'),
    // from = 건 동료: 새로 걸렸으면 연계기 계기 (G.Combo)
    give(rt, e, k, t, from) {
      const had = N.has(e, k);
      (e.cond = e.cond || {})[k] = Math.max(e.cond[k] || 0, now() + t);
      if (!had && from && e.kind === 'mon') G.Combo.on(G.S.w.fantasy, rt, k, from, e);
      if (!had) G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.1, s: COND[k].n, col: '#c9a6ff', t: 1, sz: 0.85, pop: true });
    },
    // 이점(+1) · 불리(−1): 공격자가 중독 · 공포 · 속박이면 불리, 상대가 기절 · 마비 · 넘어짐 · 속박이면 이점. 둘 다면 상쇄
    adv(att, tg) {
      let a = (tg && (N.any(tg, 'hitAdv') || N.bsum(tg, 'hitAdv') > 0)) || (att && N.bsum(att, 'adv') > 0) ? 1 : 0;
      // 정밀한 사냥꾼: 내 표식 적에게 이점 · 종잡을 수 없음: 나를 노리는 공격에 이점 없음
      if (att && tg && tg.hm && tg.hm.by === att && G.Fantasy.sk(att, 'sr_precise')) a = 1;
      if (tg && tg.merc && G.Fantasy.sk(tg, 'sr_elusive')) a = 0;
      const d = (att && N.any(att, 'atkDis')) || (tg && (N.bsum(tg, 'hitDis') > 0 || (tg.merc && G.Trinket.has(tg.merc, 'hitDis')))) ? 1 : 0;
      return a - (d && !(att && att.merc && N.boon(att.merc, 'truesight')) ? 1 : 0);
    },
    boon: (m, k) => !!(m && m.boons && m.boons.includes(k)),
    d20(adv) { const a = 1 + U.rand(20); if (!adv) return a; const b = 1 + U.rand(20); return adv > 0 ? Math.max(a, b) : Math.min(a, b); },
    melee: e => e.kind === 'mon' || (e.def ? e.def.range < 2 : e.kind === 'hero'),
    // 명중 굴림: 1은 늘 빗나감 · 치명 범위(critAt 이상, 기본 20)는 늘 맞고 치명타 · 마비된 상대를 근접으로 맞히면 치명타
    attack(att, tg, critAt = 20) {
      const adv = N.adv(att, tg), nat = N.d20(adv);
      if (nat === 1) return { hit: false, crit: false, nat, adv };
      if (nat >= critAt) return { hit: true, crit: true, nat, adv };
      let tot = nat + N.hit(att) + N.bsum(att, 'hit');
      // 바드 베는 말 (Cutting Words): 근처(6칸) 동료를 노린 몬스터 명중에서 d6를 깎는다 (5초에 한 번)
      if (att.kind === 'mon' && tg.kind !== 'mon') tot -= N.cutting(att);
      const ac = N.ac(tg);
      // 위저드 방어막 (Shield): 맞을 공격이 5 이내로 넘었으면 AC +5로 막는다 (10초에 한 번)
      if (tot >= ac && tot < ac + 5 && tg.merc && G.Fantasy.sk(tg, 'sr_shield') && !(tg.shieldT > now())) {
        tg.shieldT = now() + 10;
        N.flip(tg, '방어막', '#c9a6ff');
        N.buff(tg, 'shield', 3, { ac: 5 });
        G.fx(G.RT.fantasy, { k: 'ring', x: tg.x, y: tg.y, r: 0.9, t: 0.4, col: '#c9a6ff' });
        return { hit: false, crit: false, nat, adv };
      }
      let hit = tot >= ac;
      // 전투 기량의 은혜: 빗나간 공격 하나를 명중으로 (6초에 한 번)
      if (!hit && att.merc && N.boon(att.merc, 'prowess') && !(att.prowT > now())) { att.prowT = now() + 6; hit = N.flip(att, '전투 기량'); }
      // 명중이 보정 덕분이었다면 그 이름을
      else if (hit && att.merc) {
        const pb = G.Guild.sum(att.merc, 'hitB'), ib = N.bon(att, 'insp') ? 3.5 : 0, bl = N.bless(att);
        if (pb && tot - pb < ac) N.flip(att, '비길 데 없는 기술');
        else if (ib && tot - ib < ac) N.flip(att, '바드의 영감');
        else if (bl && tot - bl < ac) N.flip(att, '신전의 축복');
      }
      return { hit, crit: hit && N.melee(att) && N.any(tg, 'meleeCrit'), nat, adv };
    },
    cutting(att) {
      const rt = G.RT.fantasy;
      if (!rt) return 0;
      const b = rt.allies.find(a => !a.dead && G.Fantasy.sk(a, 'sr_cutting') && !(a.cutT > now()) && Math.hypot(a.x - att.x, a.y - att.y) <= 6);
      if (!b) return 0;
      b.cutT = now() + 5;
      G.fx(rt, { k: 'text', x: att.x, y: att.y - 1, s: '베는 말', col: '#e0a040', t: 0.8, sz: 0.75 });
      return 1 + U.rand(6);
    },
    // 내성 굴림: 성공하면 true
    // 내성: 성공하면 true. 우리 쪽은 기술 · 오라 · 영감 덕분에 결과가 뒤집혔을 때 그 이름을 띄운다 (DESIGN.md 66)
    save(tg, k, dc) {
      const aura = N.aura(tg), insp = N.bon(tg, 'insp') ? 3.5 : 0, b = N.saveBonus(tg, k) + N.bsum(tg, 'save') + aura, r = N.d20(0);
      if (r + b >= dc) {
        if (tg.merc && aura && r + b - aura < dc) N.flip(tg, '보호의 오라');
        else if (tg.merc && insp && r + b - insp < dc) N.flip(tg, '바드의 영감');
        return true;
      }
      if (!tg.merc) return false;
      // 파이터 불굴 (Indomitable): 실패한 내성을 다시 (20초에 한 번)
      if (G.Fantasy.sk(tg, 'sr_indom') && !(tg.indomT > now())) { tg.indomT = now() + 20; if (N.d20(0) + b + N.prof(tg.merc.lv) >= dc) return N.flip(tg, '불굴'); return false; }
      // 운명의 은혜: 실패한 내성에 2d4 (10초에 한 번)
      if (N.boon(tg.merc, 'fate') && !(tg.fateT > now())) { tg.fateT = now() + 10; if (r + b + 2 + U.rand(4) + U.rand(4) >= dc) return N.flip(tg, '운명의 은혜'); }
      // 어둠의 행운 (악마 후원자): 실패한 내성에 d10 (20초에 한 번)
      if (G.Fantasy.sk(tg, 'sr_luck') && !(tg.luckT > now())) { tg.luckT = now() + 20; if (r + b + 1 + U.rand(10) >= dc) return N.flip(tg, '어둠의 행운'); }
      return false;
    },
    // 결과를 뒤집은 규칙의 이름을 머리 위에 (같은 사람은 1.2초에 하나). 늘 true — 성공한 판정에서 그대로 돌려준다
    flip(e, s, col = '#ffe08a') {
      const rt = G.RT.fantasy;
      if (rt && !(e._flipT > now())) { e._flipT = now() + 1.2; G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.4, s: '🎲 ' + s, col, t: 1.1, sz: 0.8, pop: true }); }
      return true;
    },
    // 팔라딘 보호의 오라 (Aura of Protection): 3칸 안 동료의 내성 + 매력 수정치(최소 1)
    aura(tg) {
      const rt = G.RT.fantasy;
      if (!rt || tg.kind === 'mon' || tg.kind === 'rival') return 0;
      let v = 0;
      for (const a of rt.allies) if (!a.dead && G.Fantasy.sk(a, 'sr_aura') && Math.hypot(a.x - tg.x, a.y - tg.y) <= 3) v = Math.max(v, Math.max(1, N.mod(N.ab(a.merc).cha)));
      return v;
    },
    // 빗나감 표시: 피해 숫자 자리에 작은 회색
    miss(rt, tg) { G.fx(rt, { k: 'text', x: tg.x, y: tg.y - 0.6, s: '빗나감', col: '#9aa0a8', t: 0.6, sz: 0.65 }); },
    // 판정에 성공한 사람 머리 위 주사위
    die(rt, e) { if (e) G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.3, s: '🎲', col: '#fff', t: 1, sz: 0.9, pop: true }); },

    // ── 전투에 끼어드는 규칙 ──
    // 우리가 거는 기절 · 정지 · 감전: 몬스터가 내성에 성공하면 걸리지 않는다
    resists(m, k, from) {
      const ab = INFLICT_SAVE[k];
      if (!ab || !from || m.kind !== 'mon') return false;
      return N.save(m, ab, N.dc(from));
    },
    // 몬스터가 우리를 맞혔다: 고유 능력 (F.hurtMember)
    onHit(rt, mo, p) {
      const fx = mo.fx;
      if (!fx || p.dead || !U.chance(PROC)) return;
      // 자기 회복 (몽크) · 자연의 수호 (대지): 공포 · 중독에 걸리지 않는다
      if ((fx[0] === 'frightened' || fx[0] === 'poisoned') && (G.Fantasy.sk(p, 'sr_selfrest') || G.Fantasy.sk(p, 'sr_ward'))) { N.flip(p, `${G.Fantasy.sk(p, 'sr_ward') ? '자연의 수호' : '자기 회복'} · ${COND[fx[0]].n} 무효`, '#9fe79f'); return; }
      if (p.merc && G.Trinket.imm(p.merc, fx[0])) { N.flip(p, `${COND[fx[0]].n} 면역`, '#9fe79f'); return; }
      if (N.save(p, fx[1], N.dc(mo))) return;
      N.give(rt, p, fx[0], fx[2]);
      // 동료가 넘어지거나 마비됐다 — 팔라딘 「수호」 계기
      if (p.kind === 'ally' && (fx[0] === 'prone' || fx[0] === 'paralyzed')) G.Combo.on(G.S.w.fantasy, rt, 'ally_down', p, p);
    },
    // 선제권 (SRD 「Initiative」): 몬스터가 우리를 알아챌 때 민첩 판정 대결. 우리 지각(수동 10+)이 몬스터 은신(10 + 층/5)보다 낮으면 기습당해 불리.
    // 이기면 그 몬스터가 1.5초 늦게 치고, 지면 바로 친다
    initiative(rt, mo) {
      const ms = rt.allies.filter(a => !a.dead && a.merc).map(a => a.merc);
      // 경계 (출신 재주): 선제권에 숙련 보너스
      const dexMs = ms.map(m => N.mod(N.ab(m).dex) + (G.Feat.has(m, 'alert') ? N.prof(m.lv) : 0)), ours = Math.max(N.mod(HERO_AB.dex), ...dexMs);
      const per = N.best(ms, 'perception'), surprised = 10 + per.v < 10 + Math.floor(fl() / 5);
      const feral = rt.allies.some(a => !a.dead && (G.Fantasy.sk(a, 'sr_feral') || (a.merc && G.Trinket.has(a.merc, 'init'))));
      const win = N.d20((surprised ? -1 : 0) + (feral ? 1 : 0)) + ours >= N.d20(0) + Math.floor(fl() / 6) + (mo.boss ? 2 : 0);
      mo.atkT = win ? 1.5 : 0;
      if (win && rt.allies.length) { const a = rt.allies.find(q => q.merc && N.mod(N.ab(q.merc).dex) + (G.Feat.has(q.merc, 'alert') ? N.prof(q.merc.lv) : 0) === ours && !q.dead); N.die(rt, a || rt.hero); }
    },
    // 미믹 알아채기 (SRD Mimic: 지능(조사) DC 15). 깊을수록 +층/10
    spotMimic(rt) {
      const ms = rt.allies.filter(a => !a.dead && a.merc).map(a => a.merc), b = N.best(ms, 'investigation');
      if (!b.m || N.d20(0) + b.v < 15 + Math.floor(fl() / 10)) return null;
      return rt.allies.find(a => a.merc === b.m);
    },
    // 설득 (선술집 몸값): 명단에서 가장 잘하는 사람의 보정마다 2% 깎는다 (최대 20%)
    haggle(f) { const b = N.best(f.mercs.filter(m => !(m.inj > 0)), 'persuasion'); return b.m ? 1 - U.clamp(0.02 * b.v, 0, 0.2) : 1; },
  };
  return N;
})();
