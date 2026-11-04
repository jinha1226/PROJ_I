'use strict';
// 마법 물건 (DESIGN.md 58 — DCSS 고정 아티팩트 · 랜다트 느낌): 용병마다 무기 · 갑옷 · 장신구 한 칸씩.
// f.trinkets = [{ id, k?, rand?, lv, on }] — k = 고정 물건(G.D.ARTS, 시즌에 하나씩만) · rand = 랜다트 { n, ic, slot, fit, r, props } · lv = 주운 층 · on = 낀 용병 uid.
// 얻는 곳: 보스 전리품 · 라이벌 노획물 · 상자 가끔. 창고는 CAP개 — 넘치면 약한 것부터 짐 골드로 판다. 전멸하면 낀 것 몇 개를 잃는다.
// 기본은 자동 장착(f.autoTr). 마을 「마법 물건」 탭에서 직접 바꾸면 자동이 꺼진다.
G.Trinket = (() => {
  const U = G.U, D = G.D;
  const SLOT_KEYS = ['w', 'a', 't'], CAP = 12, BOSS_P = 0.6, RIVAL_P = 0.4, CHEST_P = 0.06, WIPE_LOSE = 0.25, FIXED_P = 0.3, R_W = { 1: 8, 2: 4, 3: 2, 4: 1 };
  const F = () => G.Fantasy;
  const now = () => G.S.runTime;
  // 속성: 이름표(DCSS 각인처럼 짧게) · 값 쓰는 법 · 랜다트 무게와 굴림(gen) · 값어치(sc)
  const AB_N = { str: '근력', dex: '민첩', con: '건강', int: '지능', wis: '지혜', cha: '매력' };
  const COND_N = { burn: '화상', poison: '독', shock: '느려짐', prone: '넘어짐', restrained: '속박', frightened: '공포', paralyzed: '마비', blinded: '실명', poisoned: '중독' };
  const TY_N = { undead: '언데드', fiend: '악마', giant: '거인', beast: '야수', humanoid: '인간형', ooze: '점액', plant: '식물' };
  const pct = v => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
  const DT_N = { acid: '산성', bludgeoning: '둔기', cold: '냉기', fire: '화염', force: '역장', lightning: '번개', necrotic: '사령', piercing: '관통', poison: '독', psychic: '정신', radiant: '광휘', slashing: '베기', thunder: '천둥' };
  const RES_TABLE = ['acid', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'poison', 'psychic', 'radiant', 'thunder']; // SRD 표
  const sign = v => `${v > 0 ? '+' : ''}${v}`;
  const PROPS = {
    ac: { t: v => `AC${sign(v)}`, sc: v => v * 3 },
    hit: { t: v => `명중${sign(v)}`, sc: v => v * 3 },
    dmgB: { t: v => `피해${sign(v)}`, sc: v => v * 2.5 },
    save: { t: v => `내성${sign(v)}`, sc: v => v * 2 },
    ab: { t: (k, v) => `${AB_N[k]}${sign(v)}`, sc: (k, v) => v * 1.5 },
    set: { t: (k, v) => `${AB_N[k]} ${v}`, sc: (k, v) => (v - 15) * 1.2 },
    dc: { t: v => `주문 DC${sign(v)}`, sc: v => v * 3 },
    ex: { t: (n, d, ty, only) => `${only ? only.map(q => TY_N[q] || q).join('·') + '에 ' : ''}${n}d${d}${ty ? ' ' + DT_N[ty] : ''}`, sc: (n, d, ty, only) => n * (d + 1) / 2 * (only ? 0.5 : 1) },
    res: { t: k => `${DT_N[k]} 저항`, sc: () => 3 },
    resPick: { t: () => '피해 종류 저항', sc: () => 3 },
    immT: { t: k => `${DT_N[k]} 피해 면역`, sc: () => 3 },
    imm: { t: k => `${COND_N[k] || k} 면역`, sc: () => 2.5 },
    magicRes: { t: () => '주문 내성 이점', sc: () => 6 },
    hitDis: { t: () => '맞기 전까지 나를 노리면 불리', sc: () => 6 },
    nocrit: { t: () => '치명타 무시', sc: () => 5 },
    init: { t: () => '선제권 이점', sc: () => 3 },
    move: { t: v => `이동 ${pct(v)}`, sc: v => v * 10 },
    oaDis: { t: () => '기회 공격에 불리', sc: () => 1 },
    deathTen: { t: () => '사망 내성 최소 10', sc: () => 3 },
    hdX2: { t: () => '전투 뒤 회복 ×2', sc: () => 1 },
    regenRest: { t: v => `전투 뒤 ${v}d6 회복`, sc: () => 4 },
    evade: { t: v => `민첩 내성 실패를 성공으로 (전투당 ${v}번)`, sc: v => v * 1.5 },
    noCover: { t: () => '절반 엄폐 무시', sc: () => 1 },
    acSet: { t: v => `기본 AC ${v} + 민첩`, sc: () => 6 },
    snare: { t: () => '원거리 피해 −1d10 − 민첩', sc: () => 3 },
    beads: { t: () => '화염구 구슬', sc: () => 6 },
    stand: { t: () => '끌려가는 거리 −2칸', sc: () => 1 },
    acFar: { t: v => `원거리 공격에 AC+${v}`, sc: v => v * 1.5 },
    wtype: { t: k => `${DT_N[k]} 피해`, sc: () => 1 },
    vorpal: { t: () => '20: 머리를 벤다', sc: () => 9 },
    destroy: { t: v => `체력 ${v} 이하면 파괴 (지혜 DC 15)`, sc: () => 2 },
    giantProne: { t: v => `거인 넘어뜨림 (근력 DC ${v})`, sc: () => 1 },
    oath: { t: () => '맹세한 적: 이점 · 3d6', sc: () => 7 },
    reroll: { t: () => '실패한 내성 다시 굴림', sc: () => 2 },
    nine: { t: () => '20: 체력 100 미만 즉사 (건강 DC 15)', sc: () => 6 },
    venom: { t: () => '독: 건강 DC 15 · 2d10 · 중독', sc: () => 3 },
    hpLv: { t: () => '최대 체력 + 레벨', sc: () => 3 },
    sharp: { t: v => `20: 베기 ${v}`, sc: () => 5 },
    lifeS: { t: v => `20: 사령 ${v} · 임시 체력`, sc: () => 5 },
    extraAtk: { t: () => '추가 행동 공격', sc: () => 8 },
  };
  // 피해 % · 체력 % · 치유 %는 없다 (DESIGN.md 62): 그 숫자는 대장간 몫. 물건은 할 수 있는 일을 바꾼다
  // 랜다트 좋은 속성 (무게, 굴림) · 나쁜 속성 (DCSS 랜다트의 단점처럼)
  const r2 = (a, b) => a + Math.random() * (b - a);
  const IMM = ['poisoned', 'frightened', 'restrained', 'paralyzed'];
  const GOOD = [
    [3, () => ['ac', 1 + U.rand(2)]], [3, () => ['save', 1 + U.rand(2)]],
    [4, () => ['ab', U.pick(Object.keys(AB_N)), 1 + U.rand(3)]],
    [1, () => ['imm', U.pick(IMM)]], [1, () => ['res', U.pick(RES_TABLE)]], [1, () => ['init', 1]], [0.5, () => ['magicRes', 1]],
  ];
  const AGOOD = [[4, () => ['ac', 1 + U.rand(2)]], [3, () => ['res', U.pick(RES_TABLE)]], [2, () => ['save', 1 + U.rand(2)]], [2, () => ['imm', U.pick(IMM)]], [1, () => ['nocrit', 1]]];
  const WGOOD = [[3, () => ['hit', 1 + U.rand(3)]], [3, () => ['dmgB', 1 + U.rand(3)]], [2, () => ['ex', 1 + U.rand(2), U.pick([4, 6]), U.pick(['fire', 'cold', 'lightning', 'radiant', 'necrotic'])]], [1, () => ['ex', 2, 6, 'radiant', ['undead', 'fiend']]]];
  const BAD = [[1, () => ['ac', -1 - U.rand(2)]], [1, () => ['save', -1 - U.rand(2)]], [1, () => ['hit', -1 - U.rand(2)]]];
  const wpick = list => { const tot = list.reduce((a, x) => a + x[0], 0); let r = Math.random() * tot; for (const x of list) if ((r -= x[0]) <= 0) return x[1]; return list[0][1]; };

  const T = {
    SLOT_KEYS, CAP, PROPS, DT_N,
    all: f => f.trinkets || (f.trinkets = []),
    // 물건의 모양: 이름 · 아이콘 · 칸 · 직업 · 희귀도 · 속성
    def(t) {
      if (t.rand) return t.rand;
      const A = D.ARTS[t.k];
      return A ? { n: A.n, en: A.en, ic: A.ic, slot: A.slot || 't', fit: A.fit, r: A.r, shield: A.shield, props: A.props.map(p => (p[0] === 'resPick' ? ['res', RES_TABLE[(t.id || 0) % RES_TABLE.length]] : p)), fixed: true } : null;
    },
    name: t => T.def(t)?.n || '?',
    tags: t => T.def(t).props.map(p => { const P = PROPS[p[0]]; return P ? P.t(p[1], p[2], p[3], p[4]) : p[0]; }),
    tip: t => { const d = T.def(t); return `${d.n}${d.en ? ` (${d.en})` : ''}${d.fixed ? '' : ' · 랜다트'} · ${T.tags(t).join(' · ')}${d.fit ? ' · ' + d.fit.map(c => G.D.F.allies[c].n).join('/') : ''}`; },
    fits: (t, m) => { const d = T.def(t); return !d.fit || d.fit.includes(m.cls); },
    worn: (f, uid) => T.all(f).filter(t => t.on === uid),
    store: f => T.all(f).filter(t => t.on == null),
    of(m) { const f = G.S.w.fantasy; return f && f.trinkets ? f.trinkets.filter(t => t.on === m.uid) : []; },
    slot: t => T.def(t).slot || 't',
    weapon: m => T.of(m).find(t => T.slot(t) === 'w'),
    armor: m => T.of(m).find(t => T.slot(t) === 'a'),
    // 그 사람이 낀 것의 속성 (p[0] === k)
    props(m, k) { const out = []; for (const t of T.of(m)) for (const p of T.def(t).props) if (p[0] === k) out.push(p); return out; },
    // 배율 (G.Guild.mult): atk · hp · cd · heal · xp(+) — xp는 더하기라 1+Σ
    prod(m, k) {
      if (k === 'xp') return 1 + T.props(m, 'xp').reduce((a, p) => a + p[1], 0);
      let v = 1; for (const p of T.props(m, k)) v *= p[1]; return v;
    },
    // 더하기 (G.Guild.sum · G.Dnd): gold · move · ac · hit · save · regen · crit
    sum(m, k) { return T.props(m, k).reduce((a, p) => a + p[1], 0); },
    // 능력치: 더하기(ab) 뒤에 고정(set — 오우거 힘의 건틀릿처럼 그 값보다 낮으면 올린다)
    ability(m, ab) {
      for (const p of T.props(m, 'ab')) if (ab[p[1]] != null) ab[p[1]] += p[2];
      for (const p of T.props(m, 'set')) if (ab[p[1]] != null) ab[p[1]] = Math.max(ab[p[1]], p[2]);
      return ab;
    },
    imm: (m, cond) => T.props(m, 'imm').some(p => p[1] === cond),
    has: (m, k) => T.props(m, k).length > 0,
    // 맞혔을 때 (SRD 물건 효과): 추가 주사위 · 20의 효과. k = 피해 1점의 값 (주사위 → 게임 수치)
    onHit(f, rt, a, o, k, nat) {
      const m = a.merc, D = G.Dnd, hit = (v, ty) => { G.Foe.dtype = ty || D.weapon(a).t; F().hurt(f, rt, o, v * k, 'extra', a); G.Foe.dtype = null; }, sc = o.scale || 1;
      if (!m || o.kind !== 'mon') return;
      for (const p of T.props(m, 'ex')) if (o.hp > 0 && (!p[4] || p[4].includes(o.ty))) hit(D.dice(p[1], p[2]), p[3]);
      if (T.has(m, 'oath') && o.hp > 0) { if (!a.sworn || a.sworn.hp <= 0) a.sworn = o; if (a.sworn === o) hit(D.dice(3, 6), 'piercing'); }
      if (T.has(m, 'destroy') && o.hp > 0 && (o.ty === 'undead' || o.ty === 'fiend') && o.hp <= 25 * sc && !D.save(o, 'wis', 15)) { G.fx(rt, { k: 'text', x: o.x, y: o.y - 1.2, s: '파괴', col: '#ffe08a', t: 1, sz: 1, pop: true }); F().hurt(f, rt, o, o.hp * 9, 'extra', a); }
      if (T.has(m, 'giantProne') && o.hp > 0 && o.ty === 'giant' && !D.save(o, 'str', 15)) D.give(rt, o, 'prone', 10, a);
      if (T.has(m, 'venom') && o.hp > 0) { if (G.Res.once(m, 'venom')) { if (!D.save(o, 'con', 15)) { hit(D.dice(2, 10), 'poison'); if (o.hp > 0) D.give(rt, o, 'poisoned', 10, a); } } } // SRD는 새벽까지 한 번 → 전투당
      if (nat !== 20 || o.hp <= 0) return;
      if (D.boon(m, 'irresistible')) { const ab = D.ab(m); hit(Math.max(ab.str, ab.dex)); if (o.hp <= 0) return; }
      for (const p of T.props(m, 'sharp')) hit(p[1], 'slashing');
      for (const p of T.props(m, 'lifeS')) if (o.ty !== 'undead' && o.ty !== 'construct') { hit(p[1], 'necrotic'); a.thp = Math.max(a.thp || 0, p[1] * a.max / Math.max(1, D.srdHP(m))); }
      if (T.has(m, 'vorpal') && o.hp > 0 && o.ty !== 'ooze' && o.ty !== 'plant') { G.fx(rt, { k: 'text', x: o.x, y: o.y - 1.2, s: '참수', col: '#ff6a6a', t: 1, sz: 1.1, pop: true }); F().hurt(f, rt, o, o.hp * 9, 'extra', a); }
      if (T.has(m, 'nine') && o.hp > 0 && o.hp < 100 * sc) { const t = T.weapon(m); if (t) { if (t.ch == null) t.ch = 2 + U.rand(8); if (t.ch > 0 && !D.save(o, 'con', 15)) { t.ch--; G.fx(rt, { k: 'text', x: o.x, y: o.y - 1.2, s: '목숨을 앗다', col: '#ff6a6a', t: 1, sz: 1, pop: true }); F().hurt(f, rt, o, o.hp * 9, 'extra', a); } } }
    },
    // 화염구 구슬 (SRD): 3레벨 화염구 8d6, DC 15, 구슬 1d6 + 3개. 적이 셋 이상 모였을 때 던진다. 그 차례의 행동을 쓴다
    beads(f, rt, a) {
      const m = a.merc; if (!m || !T.has(m, 'beads')) return false;
      const t = T.of(m).find(q => T.def(q).props.some(p => p[0] === 'beads')); if (t.beads == null) t.beads = 4 + U.rand(6);
      if (t.beads <= 0) return false;
      const fs = rt.mons.filter(o => o.hp > 0 && o.aggro && F().sees(rt.map, a, o) && Math.hypot(o.x - a.x, o.y - a.y) <= 6), around = c => fs.filter(o => Math.hypot(o.x - c.x, o.y - c.y) <= 4);
      if (!fs.length) return false;
      const c = fs.reduce((p, q) => (around(q).length > around(p).length ? q : p)), list = around(c);
      if (list.length < 3 || list.some(o => Math.hypot(o.x - a.x, o.y - a.y) <= 1.5)) return false;
      t.beads--;
      G.fx(rt, { k: 'ring', x: c.x, y: c.y, r: 4, t: 0.5, col: '#ff8a3a' });
      const roll = G.Dnd.dice(8, 6), k = F().allyAtk(f, a) / Math.max(1, G.Dnd.avg(G.Dnd.weapon(a))) * G.Turn.pace;
      G.Foe.dtype = 'fire';
      for (const o of list) F().hurt(f, rt, o, roll * k * (G.Dnd.save(o, 'dex', 15) ? 0.5 : 1), 'extra', a);
      G.Foe.dtype = null;
      return true;
    },
    // 값어치 (자동 장착 · 넘칠 때 팔 순서)
    score: t => T.def(t).props.reduce((a, p) => { const P = PROPS[p[0]]; return a + (P ? P.sc(p[1], p[2], p[3], p[4]) : 0); }, 0),
    rarity: t => T.def(t).r,
    price: (f, t) => Math.ceil(F().monGold(Math.max(1, t.lv || f.maxFloor)) * 15 * Math.max(1, T.score(t))),

    // ── 만들기 ──
    // 이 깊이에서 나올 수 있는 가장 높은 희귀도
    maxR: fl => (fl >= 40 ? 4 : fl >= 25 ? 3 : fl >= 10 ? 2 : 1),
    // 고정 물건: 이번 시즌에 아직 없는 것 중, 희귀할수록 드물게
    fixed(f, fl) {
      const own = new Set(T.all(f).map(t => t.k).concat(f.artSeen || [])), mr = T.maxR(fl);
      const ks = Object.keys(D.ARTS).filter(k => !own.has(k) && D.ARTS[k].r <= mr);
      if (!ks.length) return null;
      const tot = ks.reduce((a, k) => a + R_W[D.ARTS[k].r], 0);
      let r = Math.random() * tot;
      for (const k of ks) if ((r -= R_W[D.ARTS[k].r]) <= 0) return k;
      return ks[0];
    },
    // 랜다트: 무기 30% · 갑옷 30% · 장신구 40%. 바탕 · 좋은 속성 2~4(깊을수록 많이) · 30%로 단점 하나(대신 좋은 것 하나 더) · 무작위 이름
    randart(fl) {
      const RA = D.RANDART, roll = Math.random(), slot = roll < 0.3 ? 'w' : roll < 0.6 ? 'a' : 't';
      // 무기 칸의 15%는 방패(방패 직업용 — 방어 속성)
      const shield = slot === 'w' && Math.random() < 0.15, weap = slot === 'w' && !shield;
      const base = shield ? RA.sbase : slot === 'w' ? U.pick(RA.wbase) : slot === 'a' ? U.pick(RA.abase) : U.pick(RA.base);
      const n = 2 + U.rand(Math.min(3, 1 + Math.floor(fl / 15))), bad = Math.random() < 0.3, props = [], used = new Set();
      for (let i = 0, guard = 0; i < n + (bad ? 1 : 0) && guard < 40; guard++) {
        const p = wpick(weap && Math.random() < 0.35 ? WGOOD : (slot === 'a' || shield) && Math.random() < 0.6 ? AGOOD : GOOD)(fl), key = p[0] + (p[0] === 'ab' || p[0] === 'proc' || p[0] === 'imm' || p[0] === 'slay' ? p[1] : '');
        if (used.has(key)) continue;
        used.add(key); props.push(p); i++;
      }
      if (bad) { const p = wpick(BAD)(fl); if (!used.has(p[0])) props.push(p); }
      const rd = { n: `${U.pick(RA.adj)} ${U.pick(RA.noun)}의 ${base[0]}`, ic: base[1], slot, fit: base[2], props, shield: shield || undefined };
      rd.r = U.clamp(Math.round(T.score({ rand: rd }) / 9), 1, 4);
      return rd;
    },
    // 하나 주웠다: 고정 물건 30%(남은 게 있으면) · 아니면 랜다트. 가장 가까운 동료 머리 위에 현판
    gain(f, rt, x, y) {
      const fl = f.floor || 1, k = Math.random() < FIXED_P ? T.fixed(f, fl) : null;
      const t = { id: f.trUid = (f.trUid || 0) + 1, lv: fl, on: null };
      if (k) { t.k = k; (f.artSeen = f.artSeen || []).push(k); } else t.rand = T.randart(fl);
      T.all(f).push(t);
      const d = T.def(t), col = ['#f4efe2', '#6fb4ff', '#c06bff', '#ffb547'][d.r - 1];
      const who = rt && x != null && rt.allies.filter(a => !a.dead).sort((p, q) => Math.hypot(p.x - x, p.y - y) - Math.hypot(q.x - x, q.y - y))[0];
      if (who) { G.Feat.banner(rt, who, d.ic, d.n, 'loot', col); G.Banter.line(rt, 'loot', who, { m: d.n }); }
      G.log(`마법 물건 · ${d.ic} ${d.n}`, 'fantasy', 'good');
      T.overflow(f);
      if (f.autoTr !== false) T.auto(f);
      return t;
    },
    // 보스 · 라이벌 · 상자: 확률로 물건, 아니면 잡템(짐 골드)
    drop(f, rt, src, x, y) {
      if (U.chance(src === 'boss' ? BOSS_P : src === 'chest' ? CHEST_P : RIVAL_P)) return T.gain(f, rt, x, y);
      if (src !== 'chest') F().gain(f, F().monGold(f.floor) * 5 * F().goldMult(f));
    },
    overflow(f) {
      const st = T.store(f).sort((a, b) => T.score(a) - T.score(b));
      while (st.length > CAP) {
        const t = st.shift(), p = T.price(f, t);
        f.trinkets = f.trinkets.filter(q => q !== t);
        if (f.town) f.gold += p; else F().gain(f, p);
      }
    },
    wipe(f, rt) {
      const uids = new Set(rt.allies.filter(a => a.merc).map(a => a.merc.uid)), lost = [];
      for (const t of T.all(f)) if (uids.has(t.on) && U.chance(WIPE_LOSE)) lost.push(t);
      if (!lost.length) return;
      f.trinkets = f.trinkets.filter(t => !lost.includes(t));
      G.log(`마법 물건 잃음 · ${lost.map(T.name).join(' · ')}`, 'fantasy', 'bad');
    },
    // 자동 장착: 출전하는 사람부터, 값어치 높은 것부터. 무기는 맞는 직업에게만 · 치유 속성은 치유 직업에게
    auto(f) {
      const all = T.all(f), line = F().lineup(f), ms = [G.Guild.leader(f), ...f.mercs.slice().sort((a, b) => line.includes(b.uid) - line.includes(a.uid) || b.lv - a.lv)];
      for (const t of all) t.on = null;
      const ok = (m, t) => T.fits(t, m);
      const pool = all.slice().sort((a, b) => T.score(b) - T.score(a));
      for (const m of ms) for (const sl of SLOT_KEYS) { const t = pool.find(t => t.on == null && T.slot(t) === sl && ok(m, t)); if (t) t.on = m.uid; }
      T.sync(f);
    },
    // 직접 끼우기 · 빼기: 그 칸에 낀 것을 밀어낸다
    equip(f, id, uid) {
      const t = T.all(f).find(q => q.id === id);
      if (!t) return false;
      f.autoTr = false;
      if (uid == null) { t.on = null; T.sync(f); return true; }
      const m = G.Guild.get(f, uid);
      if (!m || !T.fits(t, m)) return false;
      for (const q of T.worn(f, uid)) if (q !== t && T.slot(q) === T.slot(t)) q.on = null;
      t.on = uid;
      T.sync(f);
      return true;
    },
    sync(f) { const rt = G.RT.fantasy; if (rt) for (const a of rt.allies) if (a.merc) { const r = a.hp / (a.max || 1); a.max = F().allyHP(f, a); a.hp = Math.min(a.max, a.max * r); } },
    free(f, uid) { for (const t of T.all(f)) if (t.on === uid) t.on = null; T.overflow(f); },
    // 옛 장신구(등급 ★ — DESIGN.md 45): 같은 희귀도의 랜다트로 바꾼다
    migrate(f) {
      for (const t of T.all(f)) if (!t.rand && !(t.k && D.ARTS[t.k])) { t.rand = T.randart(f.maxFloor || 1); t.lv = f.maxFloor || 1; delete t.k; delete t.g; }
      // 옛 랜다트의 피해 % · 체력 % · 치유 %는 지운다 (다 지워지면 명중 +1 하나)
      for (const t of T.all(f)) if (t.rand) { t.rand.props = t.rand.props.filter(p => PROPS[p[0]]); if (!t.rand.props.length) t.rand.props.push(['hit', 1]); }
      // 장신구 두 칸 → 한 칸 (DESIGN.md 58): 칸마다 하나만 남긴다
      for (const m of f.mercs) { const seen = new Set(); for (const t of T.worn(f, m.uid)) { if (seen.has(T.slot(t))) t.on = null; else seen.add(T.slot(t)); } }
    },
  };
  return T;
})();
