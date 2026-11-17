'use strict';
// 길드 (DESIGN.md 31): 용병 명단 · 선술집 · 성장 · 부상
// 용병은 한 사람 한 사람이다 — 직업(트리 면허), 이름, 레벨, 특성. 출전 칸에 넣은 사람만 던전에서 싸운다.
// 싸우면 경험치가 쌓여 레벨이 오르고, 한 층에서 두 번 쓰러지면 부상으로 한동안 빠진다(대기 인원을 돌려 쓰는 이유).
// 선술집 후보는 시간이 지나거나 보스를 잡으면 바뀐다. 라이벌을 이기면 그 파티 출신이 입단을 원하기도 한다.
G.Guild = (() => {
  const U = G.U, D = G.D;
  // 선술집에 나오는 직업: 기본 넷은 처음부터, 나머지는 이번 시즌 최고층으로 (트리와 상관없다 — DESIGN.md 38)
  // 해금 순서는 나중에 정한다 (사용자) — 지금은 임시
  const BASE = ['archer', 'cleric', 'bard', 'scout'], TIER = { mage: 4, paladin: 4, barbarian: 4, dragoon: 8, monk: 8, warlock: 8, archmage: 12, rogue: 12 };
  const XP_TOTAL = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
  const TRAIT_MEMO = new Map();
  const TRAIN_K = 0.1, TEMPLE_K = 0.12, RETIRE_LV = 20, LV_MAX = 20, BOON_LV = 19, BOON_EVERY = 5, ROSTER_BASE = 8, OFFERS_BASE = 3, SLOT_LV = [1, 1, 3, 5, 7], SKILL_N = 5, PROMO_LV = 3, PROMO_K = 60, LOOKS = 3, TAVERN_T = 150, INJURY_T = 90, DOWNS_TO_INJURY = 1, LV_STEP = 0.08;
  // 직업별 몸값 무게 (트리 면허 값 순서와 같다)
  const CLS_W = { archer: 1, scout: 1.1, bard: 1.2, cleric: 1.5, mage: 2, paladin: 2.5, barbarian: 2.5, dragoon: 3, monk: 3, warlock: 3, archmage: 4, rogue: 4 };
  const F = () => G.Fantasy;

  const ADEF = {};
  const Gd = {
    TIER, PROMO_LV,
    // 신전 축복: 층에 들어선 뒤 이 초 동안 명중 · 내성 +2 (SRD 「Bless」 1d4의 평균쯤)
    blessT: () => 20 * Gd.fac(null, 'temple'),
    get ROSTER_MAX() { return ROSTER_BASE + 4 * Gd.fac(null, 'hall'); },
    // 명성: 쓰지 않고 쌓인다. 등급이 오르면 더 좋은 용병과 건물이 열린다
    FAME_RANK: [[0, '무명', 2], [30, '알려진', 4], [100, '이름난', 7], [300, '유명한', 11], [800, '전설의', 16]],
    rank(f) { const v = f.fameAll || 0, R = Gd.FAME_RANK; let i = 0; while (i + 1 < R.length && v >= R[i + 1][0]) i++; return { i, n: R[i][1], cap: R[i][2], next: R[i + 1]?.[0] ?? null }; },
    facNeed: (f, k) => { const l = Gd.fac(f, k), N = D.FAC[k].need; return N ? N[l] ?? 0 : 0; },
    canBuild: (f, k) => Gd.fac(f, k) < D.FAC[k].max && (f.fameAll || 0) >= Gd.facNeed(f, k) && (f.gold || 0) >= Gd.facCost(f, k),
    // 신전 · 주점: 귀환해서 금화로
    treatCost: m => 20 * m.lv,
    treat(f, m) { const c = Gd.treatCost(m); if (Gd.fac(f, 'temple') < 1 || !(m.inj > 0) || f.gold < c) return false; f.gold -= c; m.inj = 0; G.Fantasy.syncAllies(f); return true; },
    drinkCost: m => 5 * m.lv,
    drink(f, m) { const c = Gd.drinkCost(m), l = Gd.fac(f, 'pub'); if (l < 1 || !(m.stress > 0) || f.gold < c || m.drank === (f.lastHome || 0)) return false; f.gold -= c; m.stress = Math.max(0, m.stress - (20 + 10 * l)); m.drank = f.lastHome || 0; return true; },
    offersN: () => OFFERS_BASE + Math.floor(Gd.fac(null, 'tavern') / 2),
    licensed: () => { const fl = G.S.w.fantasy.maxFloor; return Object.keys(D.F.allies).filter(id => BASE.includes(id) || fl >= (TIER[id] || 1e9)); },
    // 다음에 열리는 직업과 그 층 (선술집 머리줄)
    nextTier() { const fl = G.S.w.fantasy.maxFloor, n = Object.entries(TIER).filter(([, t]) => t > fl).sort((a, b) => a[1] - b[1])[0]; return n ? { cls: n[0], at: n[1] } : null; },
    get: (f, uid) => f.mercs.find(m => m.uid === uid) || (f.leader && f.leader.uid === uid ? f.leader : undefined),
    // ── 단장 (DESIGN.md 63): 플레이어가 만든 캐릭터. 명단(f.mercs) 밖에 따로 — 늘 출전하고 원정대를 이끈다(던전의 rt.hero) ──
    // 없으면(새 게임 · 옛 저장) 기본 파이터로 하나 만들고 f.leaderNew — 마을에서 만들기 화면이 뜬다
    leader(f) {
      if (!f.leader) {
        const top = f.mercs.reduce((a, m) => Math.max(a, m.lv), 1);
        f.leader = Gd.make(f, 'dragoon', { lv: Math.max(1, top), lead: true, name: '단장', look: 0, pers: [] });
        f.leader.lv = Math.max(1, top);
        f.leaderNew = true;
      }
      return f.leader;
    },
    // 단장 + 명단 (대장간 · 마법 물건 · 경험치처럼 모두에게 해당하는 것)
    crew: f => [Gd.leader(f), ...f.mercs],
    // 만들기 (D&D 캐릭터 생성): 직업 · 이름 · 능력치 배치 · 출신 재주 · 모습 · 기술 넷. 처음(f.leaderNew)에만
    createLeader(f, o) {
      const L = Gd.leader(f);
      if (!f.leaderNew) return false;
      const sig = D.MSIG[o.cls], rest = o.skills.filter(k => k !== sig).sort((a, b) => Gd.skLv(o.cls, a) - Gd.skLv(o.cls, b));
      Object.assign(L, { cls: o.cls, name: o.name || L.name, ab: { ...o.ab }, abCls: o.cls, feat: o.feat, look: o.look || 0, skills: o.manual || o.bg ? o.skills.slice() : [sig, ...rest].slice(0, SKILL_N), adv: null }); // o.bg: G.Create가 만든 값은 SRD 주문 수를 그대로 둔다
      if (o.fs && G.Create?.FS[o.cls]?.includes(o.fs)) G.Opt.setFs(L, o.fs, true);
      if (o.bg) Object.assign(L, { bg: o.bg, sp: o.sp, line: o.line || undefined, bgAdj: o.bgAdj, skillPick: o.skillPick || undefined, skManual: !!o.manual });
      f.leaderNew = false;
      G.log(`단장 · ${L.name} (${Gd.def(L).n})`, 'fantasy', 'good');
      const rt = G.RT.fantasy;
      if (rt) rt.resyncHero = true;
      return true;
    },
    // 출전할 수 있는 사람: 다치지 않은 사람
    ready: f => f.mercs.filter(m => !(m.inj > 0)),
    // 다음 레벨까지 경험치 (SRD Character Advancement). 20레벨 뒤는 마지막 칸과 같다
    need: lv => (XP_TOTAL[Math.min(lv, 19)] - XP_TOTAL[Math.min(lv, 19) - 1]),
    // ── 길드 시설 (DESIGN.md 60): f.fac = { 키: 레벨 }. 명성으로 짓고 시즌을 넘어 남는다 ──
    earnFame(f, n, why) { const r0 = Gd.rank(f).i; f.fame = (f.fame || 0) + n; f.fameAll = (f.fameAll || 0) + n; if (why) G.log(`명성 +${n} · ${why}`, 'fantasy', 'good'); const r = Gd.rank(f); if (r.i > r0) G.log(`용병단 등급: ${r.n}`, 'fantasy', 'good'); },
    fac: (f, k) => Math.max(D.FAC[k] ? 1 : 0, ((f || G.S.w.fantasy).fac || {})[k] || 0), // 완성된 마을 (DESIGN.md 155): 건물은 처음부터 1단계로 서 있다
    facCost: (f, k) => (Gd.fac(f, k) >= D.FAC[k].max ? Infinity : Math.ceil(D.FAC[k].base * Math.pow(D.FAC[k].g, Gd.fac(f, k)))),
    build(f, k) {
      const c = Gd.facCost(f, k);
      if ((f.gold || 0) < c || (f.fameAll || 0) < Gd.facNeed(f, k)) return false; // 금화로 짓되 명성이 있어야 한다
      f.gold -= c;
      (f.fac = f.fac || {})[k] = Gd.fac(f, k) + 1;
      G.log(`시설 · ${D.FAC[k].n} ${f.fac[k]}`, 'fantasy', 'good');
      return true;
    },
    // ── 서사 (DESIGN.md 59): 레벨은 20에서 멈추고, 그 뒤 경험치는 서사 단계(m.bt)로 — 단계마다 피해 · 체력 ×1.06, 끝없이 ──
    LV_MAX,
    needOf: m => Gd.need(m.lv),
    // 은혜: Lv 19에 하나, 서사 단계 5마다 하나 더. 직업이 먼저 고르는 것부터
    boonsDue: m => (m.lv >= BOON_LV ? 1 : 0) + Math.floor((m.bt || 0) / BOON_EVERY),
    giveBoons(m) {
      const own = m.boons || (m.boons = []), all = Object.keys(D.BOONS);
      while (own.length < Math.min(all.length, Gd.boonsDue(m))) {
        const left = all.filter(k => !own.includes(k)), pre = left.filter(k => D.BOONS[k].pref.includes(m.cls));
        const k = U.pick(pre.length ? pre : left);
        own.push(k);
        G.log(`서사 은혜 · ${m.name} · ${D.BOONS[k].n}`, 'fantasy', 'good');
      }
    },
    // 옛 저장: Lv 20을 넘은 사람은 넘은 만큼 서사 단계로
    capLv(m) { if (m.lv > LV_MAX) { m.bt = (m.bt || 0) + m.lv - LV_MAX; m.lv = LV_MAX; } Gd.giveBoons(m); },
    // 사람마다의 배율: 레벨(+8%/레벨) · 기벽 · 장신구 · 전직 · 전직 스킬의 수치(G.D.MSKILLS의 atk·hp·cd·heal)
    mult(m, k) {
      if (k === 'atk' || k === 'hp') return 1; // 피해 · 체력은 SRD 계산 그대로 (DESIGN.md 121)
      let v = 1;
      v *= G.Trinket.prod(m, k);
      const A = m.adv && D.ADV[m.adv];
      if (A && A[k] != null) v *= A[k];
      v *= G.Story.scarMul(m, k);
      for (const s of Gd.active(m)) { const S = D.MSKILLS[s]; if (S && typeof S[k] === 'number' && k !== 'move' && k !== 'splash' && k !== 'sight') v *= S[k]; }
      return v;
    },
    // 마법 무기 (SRD): 장착한 마법 물건(+1 무기 · 명중 보너스)이 있으면. 옛 강화 단계(m.gear)는 지웠다
    magicW: m => !!(G.Trinket.weapon(m) || G.Trinket.sum(m, 'hit') > 0),
    // 장비 이름 (DESIGN.md 58): 아티팩트를 끼면 그 이름. 방패 직업의 무기 칸은 「무기 + 방패」 — 마법 무기 + 방패 / 무기 + 마법 방패
    gearName(m, slot) {
      const SR = G.SRD, g = { w: [SR.weaponOf(m).n], a: [SR.armorOf(m).cat === 'none' && (m.cls === 'barbarian' || m.cls === 'monk') ? '비무장 방어' : SR.armorOf(m).n] }, art = slot === 'w' ? G.Trinket.weapon(m) : G.Trinket.armor(m), pre = '';
      if (slot !== 'w' || !SR.eq(m).shield) return pre + (art ? G.Trinket.name(art) : g[slot][0]);
      if (art && G.Trinket.def(art).shield) return `${pre}${g.w[0]} + ${G.Trinket.name(art)}`;
      return `${pre}${art ? G.Trinket.name(art) : g.w[0]} + 방패`;
    },
    // ── 개인 스킬 (DESIGN.md 43): 직업 일곱 중 넷. 칸은 Lv 1에 둘 · Lv 3에 셋 · Lv 5에 넷 ──
    // 넷을 뽑아 배우는 레벨 순으로 (DESIGN.md 56 ②: SRD 주문 · 기술은 그 레벨이 되어야 쓴다)
    // 첫 칸은 대표 기술(D.MSIG), 나머지 셋은 풀에서 — 배우는 레벨 순
    // 고르는 것은 행동 · 추가 행동뿐 (사용자 결정). 소모 없음 · 반응 · 늘 적용은 레벨이 되면 저절로 (Gd.traits)
    isPick: k => { const q = G.Skill.kindOf(k); return (q === '행동' || q === '추가 행동') && !G.Skill.SK[k]?.auto; },
    pickable: cls => (Gd._pk = Gd._pk || {})[cls] || (Gd._pk[cls] = [...new Set(G.Pool.POOL[cls].concat(Gd.spellList(cls).filter(k => G.Skill.SK[k]?.run && (!D.MSKILLS[k]?.noAuto || D.MSKILLS[k]?.util) && !G.Skill.SK[k]?.noCombat)))].filter(Gd.isPick)), // SRD: 그 직업 주문 목록 전체에서 준비한다 (전투 효과가 있는 것)
    // 레벨 · 전직이 같으면 같은 목록이라 저장해 두고 (전투 중 수없이 부른다), 사람마다 굴린 선택 기능(G.Opt)을 뒤에 붙인다
    traits: m => { const key = `${m.cls}|${m.lv}|${m.adv || ''}`; let b = TRAIT_MEMO.get(key); if (!b) { const auto = k => !Gd.isPick(k) && !D.MSKILLS[k]?.explore && m.lv >= Gd.skLv(m.cls, k); b = [...new Set(D.MPOOL[m.cls].filter(k => auto(k) && !Gd.subOnly(k)).concat(m.adv ? D.ADV[m.adv].sig.filter(auto) : []))]; TRAIT_MEMO.set(key, b); } const o = G.Opt.of(m); return o.length ? b.concat(o) : b; },
    roll: (cls, lv = 1) => {
      const L = Gd.limits(cls, lv), pool = Gd.pickable(cls).filter(k => !D.MSKILLS[k]?.noAuto && Gd.spLv(k) != null && Gd.skLv(cls, k) <= lv), sig = D.MSIG[cls], pick = (list, n) => { const first = list.includes(sig) ? [sig] : []; return [...first, ...U.shuffle(list.filter(k => k !== sig)).sort((a, b) => Gd.skLv(cls, b) - Gd.skLv(cls, a) + (Math.random() - 0.5) * 8)].slice(0, n); };
      return [...pick(pool.filter(k => Gd.spLv(k) === 0), L.cantrip), ...pick(pool.filter(k => Gd.spLv(k) > 0), L.prepared)];
    },
    // 레벨이 오르면 쓸 수 없던 칸 · 낮은 기술 하나를 새 기술로 (사람이 고른 칸은 그대로)
    grow(m) { Gd.fillSlots(m); },
    skLv(cls, k) { const L = D.MSKILLS[k]?.lv; return typeof L === 'object' ? L[cls] || 1 : L || 1; },
    // 주문 레벨 (0 소마법 · 없으면 주문이 아닌 기능)
    spLv(k) { const e = D.MSKILLS[k]?.en; if (!e) return null; if (!Gd._lvOf) { Gd._lvOf = {}; for (const id in G.SRD_SP) Gd._lvOf[G.SRD_SP[id].en] = G.SRD_SP[id].lv; } return Gd._lvOf[e] ?? null; },
    // 고르는 수 (SRD 직업 표): 소마법 · 준비 주문
    limits(cls, lv) { const o = G.SRD_RAW.CLASS_LV[G.SRD.RAW_CLS[cls]]?.[lv] || {}; return { cantrip: parseInt(o.Cantrips) || 0, prepared: parseInt(o['Prepared Spells']) || 0 }; },
    nSlots(cls, lv) { const L = Gd.limits(cls, lv); return L.cantrip + L.prepared; },
    // 그 직업 주문 전체: 전투 동작이 없는 것은 칸에 넣어도 전투에서 쓰지 않는다
    // 만들기 화면의 미리보기: 단장 몸에 고른 값을 얹는다. 실제 단장은 건드리지 않는다
    preview: (f, o) => ({ ...Gd.leader(f), ...o, ab: { ...o.ab }, abCls: o.cls, feat: o.feat || (o.bg && G.SRD.BG[o.bg].feat), skills: o.skills || [], adv: null, lv: 1, mi: undefined, ...(o.fs && G.Create?.FS[o.cls]?.includes(o.fs) ? { opts: { fs: [o.fs] }, eq: null, eqFs: null } : {}) }),
    spellList(cls) { if (!Gd._sp) Gd._sp = {}; if (Gd._sp[cls]) return Gd._sp[cls]; const RAW = G.SRD.RAW_CLS[cls], have = new Set(), out = []; for (const k of G.Pool.POOL[cls].concat(D.MPOOL[cls])) { const L = Gd.spLv(k); if (L != null && !have.has(D.MSKILLS[k].en)) { have.add(D.MSKILLS[k].en); out.push(k); } } for (const id in G.SRD_SP) { const o = G.SRD_SP[id]; if (!o.cls.includes(RAW) || have.has(o.en)) continue; const k = 'su_' + id.replace(/-/g, '_'); D.MSKILLS[k] = D.MSKILLS[k] || { n: o.ko, en: o.en, t: 'fx_zap', d: '', lv: { [cls]: Gd.lvAtSpell(cls, o.lv) }, noAuto: true }; D.MSKILLS[k].lv[cls] = Gd.lvAtSpell(cls, o.lv); G.Skill.SK[k] = G.Skill.SK[k] || { when: () => false, run() {}, noCombat: true }; D.SK_RANGE[k] = o.rng || 0; have.add(o.en); out.push(k); } return (Gd._sp[cls] = out); },
    lvAtSpell(cls, L) { if (!L) return 1; const T = G.SRD_RAW.CLASS_LV[G.SRD.RAW_CLS[cls]]; if (cls === 'warlock') return L > 5 ? [11, 13, 15, 17][L - 6] : [1, 3, 5, 7, 9][L - 1]; for (let i = 1; i <= 20; i++) if (T[i]?.[String(L)] && T[i][String(L)] !== '—') return i; return 21; },
    // 주문이 아닌 기능은 레벨이 되면 다 쓴다 (SRD)
    feats: m => [...new Set(Gd.pickable(m.cls).concat(D.MPOOL[m.cls].filter(Gd.isPick)))].filter(k => Gd.spLv(k) == null && m.lv >= Gd.skLv(m.cls, k) && (!Gd.subOnly(k) || D.ADV[m.adv]?.sig.includes(k))), // 하위 직업 기능은 그 하위 직업만 (SRD)
    subOnly: k => { if (!Gd._subK) { Gd._subK = new Set(); for (const a of Object.values(D.ADV)) for (const q of a.sig) Gd._subK.add(q); } return Gd._subK.has(k); },
    // 칸 하나 넣고 빼기 (상태창)
    toggle(m, k) { const s = (m.skills = (m.skills || []).slice()), i = s.indexOf(k); if (i >= 0) { s.splice(i, 1); m.skManual = true; return true; } const L = Gd.limits(m.cls, m.lv), cant = Gd.spLv(k) === 0, n = s.filter(q => (Gd.spLv(q) === 0) === cant).length; if (n >= (cant ? L.cantrip : L.prepared)) return false; if (m.lv < Gd.skLv(m.cls, k)) return false; s.push(k); m.skManual = true; return true; },
    // 그 칸의 기술이 열리는 레벨
    slotLv: (i, m, k) => (m && k ? Gd.skLv(m.cls, k) : 1),
    slots: m => (m.skills || []).filter((s, i) => m.lv >= Gd.slotLv(i, m, s)),
    // 옛 저장: 네 칸뿐이면 다섯째를 채운다
    fillSlots(m) { if (m.skManual) return; const L = Gd.limits(m.cls, m.lv), cur = (m.skills || []).filter(k => Gd.spLv(k) != null), c = cur.filter(k => Gd.spLv(k) === 0), p = cur.filter(k => Gd.spLv(k) > 0), add = Gd.roll(m.cls, m.lv).filter(k => !cur.includes(k)); for (const k of add) { if (Gd.spLv(k) === 0 && c.length < L.cantrip) c.push(k); else if (Gd.spLv(k) > 0 && p.length < L.prepared) p.push(k); } m.skills = [...c, ...p]; },
    // 사람이 고르는 칸 (상태창 끌어 놓기): 순서가 곧 쓰는 순서
    SKILL_N,
    setSlot(m, i, k) { const s = (m.skills = (m.skills || []).slice()), j = s.indexOf(k); if (j === i) return; if (j >= 0) { s[j] = s[i]; s[i] = k; if (s[j] == null) s.splice(j, 1); } else if (i < s.length) s[i] = k; else s.push(k); m.skManual = true; m.skPri = s.slice(); },
    dropSlot(m, k) { const s = (m.skills || []).filter(q => q !== k); m.skills = s; m.skManual = true; m.skPri = s.slice(); },
    // 추천: 지금 쓸 수 있는 전투 주문 중 수치가 있고 레벨 높은 것부터 · 회복 직업은 회복을 먼저
    recommend(m) { const L = Gd.limits(m.cls, m.lv), pool = Gd.pickable(m.cls).filter(k => Gd.skLv(m.cls, k) <= m.lv && !D.MSKILLS[k]?.noAuto && Gd.spLv(k) != null), num = k => (G.SkillNum_at?.(k, m.cls, m.lv)?.d ? 1 : 0), heal = k => (G.Skill.SK[k]?.heal ? 1 : 0), by = l => l.slice().sort((a, b) => heal(b) - heal(a) || num(b) - num(a) || Gd.skLv(m.cls, b) - Gd.skLv(m.cls, a)); return [...by(pool.filter(k => Gd.spLv(k) === 0)).slice(0, L.cantrip), ...by(pool.filter(k => Gd.spLv(k) > 0)).slice(0, L.prepared)]; },
    useRecommend(m) { m.skills = Gd.recommend(m); m.skManual = false; m.skPri = m.skills.slice(); },
    // 스킬 레벨 1~5: 용병 Lv 1 · 4 · 7 · 10 · 13 (DESIGN.md 43)
    skillLv: m => Math.min(5, 1 + Math.floor(((m?.lv || 1) - 1) / 3)),
    // 쓸 수 있는 기술: 열린 칸 + 서브클래스 기능 중 그 레벨이 된 것
    // + 마법 입문 (출신 재주) 주문
    picks: m => { const words = m.cls === 'bard' && m.lv >= 20 ? ['sp_power_word_heal', 'sp_power_word_kill'].filter(k => D.MSKILLS[k]) : []; /* 창조의 말 (SRD 바드 20): 늘 준비 */ const sig = m.adv ? D.ADV[m.adv].sig.filter(k => m.lv >= Gd.skLv(m.cls, k) && Gd.isPick(k)) : []; return [...new Set(sig.concat(Gd.slots(m), G.Feat.spell(m) || [], Gd.feats(m), words))]; },
    active: m => [...new Set(Gd.picks(m).concat(Gd.traits(m), G.SrdX ? G.SrdX.skills(m) : [], ['it_wonder', 'it_sphere'].filter(k => G.Skill.SK[k])))], // 들고 있는 마법 물건 (경이의 완드 · 소멸의 구)
    // 기술 쓰는 순서: 사람이 정했으면 그 순서(왼쪽부터), 아니면 큰 것부터
    order(m, list) { const pri = m.skPri, rank = k => { const i = pri ? pri.indexOf(k) : -1; return i >= 0 ? i : pri ? 99 : -G.Res.cost(m, G.Skill.SK[k]?.res); }; return list.map((k, i) => [k, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(x => x[0]); },
    // 이 기술을 맨 앞으로
    first(m, k) { const cur = Gd.order(m, m.skills.slice()); m.skPri = [k, ...cur.filter(q => q !== k)]; },
    // ── 상위 직업 (DESIGN.md 40): 몸 수치 = 기본 직업 + 전직 덮어쓰기 ──
    def(m) {
      if (!m.adv) return G.Opt.defOf(m, D.F.allies[m.cls]);
      const A = D.ADV[m.adv];
      return G.Opt.defOf(m, ADEF[m.adv] || (ADEF[m.adv] = { ...D.F.allies[A.base], ...(A.def || {}), t: A.t, col: A.col, n: A.n }));
    },
    // 그림: 직업(전직) 그림 + 고용 때 정해진 색 변형 (DESIGN.md 41)
    tile: m => { const t = Gd.def(m).t, c = m.look ? t + '_c' + m.look : t; return G.ARTSET && !G.ARTSET[c] ? t : c; },
    advs: cls => Object.keys(D.ADV).filter(k => D.ADV[k].base === cls),
    canPromote: m => !m.adv && m.lv >= PROMO_LV,
    promoCost: (f, m) => Math.ceil((CLS_W[m.cls] || 1) * F().monGold(f.maxFloor) * PROMO_K),
    promote(f, m, adv) {
      const c = Gd.promoCost(f, m);
      if (!Gd.canPromote(m) || D.ADV[adv]?.base !== m.cls || f.gold < c) return false;
      f.gold -= c;
      m.adv = adv;
      G.log(`전직 · ${m.name} · ${D.ADV[adv].n}`, 'fantasy', 'good');
      const a = G.RT.fantasy?.party?.find(q => q.merc === m);
      if (a) Object.assign(a, { def: Gd.def(m), t: Gd.tile(m), wpn: Gd.def(m).wpn });
      return true;
    },
    skill: (m, key) => !!m && Gd.active(m).includes(key),
    // 수치 패시브 합 (splash·sight·move처럼 더하는 것)
    sum(m, k) { let v = k === 'move' ? G.Trinket.sum(m, k) : 0; for (const s of Gd.active(m)) { const S = D.MSKILLS[s]; if (S && typeof S[k] === 'number') v += S[k]; } return v + G.Story.scarSum(m, k); },
    name(f) {
      const used = new Set(f.mercs.map(m => m.name).concat((f.tavern?.offers || []).map(o => o.m.name)));
      for (let i = 0; i < 20; i++) { const n = U.pick(D.NAMES[0]) + U.pick(D.NAMES[1]); if (!used.has(n)) return n; }
      return U.pick(D.NAMES[0]) + U.pick(D.NAMES[1]) + U.pick(D.NAMES[1]);
    },
    // 새 용병: 레벨은 지금 깊이를 따라간다. 기벽 긍정 하나 · 부정 하나 (DESIGN.md 44 — 몸값에 곱해진다)
    make(f, cls, extra = {}) {
      const tv = Gd.fac(f, 'tavern'), rk = Gd.rank(f), lv = Math.min(rk.cap + tv, LV_MAX - 2, Math.max(1, Math.round(F().depth(f.maxFloor) / 4) + U.rand(3) - 1) + tv);
      // 선술집 등급: 능력치를 등급+1번 굴려 합이 큰 쪽
      let ab = G.Dnd.rollAb(cls);
      for (let i = 0; i < tv + rk.i; i++) { const b = G.Dnd.rollAb(cls); if (G.Dnd.sumAb(b) > G.Dnd.sumAb(ab)) ab = b; }
      return Object.assign({ uid: f.nextUid = (f.nextUid || 0) + 1, cls, name: Gd.name(f), lv, xp: 0, feat: G.Feat.roll(), pers: G.Persona.roll(), ab, abCls: cls, skills: Gd.roll(cls, extra.lv || 1), look: U.rand(LOOKS), inj: 0, downs: 0 }, extra);
    },
    price(f, m) {
      let p = (CLS_W[m.cls] || 1) * F().monGold(f.maxFloor) * 15 * (1 + 0.15 * (m.lv + (m.bt || 0) - 1));
      // 능력치 합이 평균(73)보다 1 높을 때마다 +4%
      if (m.ab) p *= Math.pow(1.04, G.Dnd.total(m) - 73);
      // 설득 (DESIGN.md 56): 명단에서 가장 말 잘하는 사람이 깎는다
      p *= G.Dnd.haggle(f);
      return Math.ceil(p * (m.from ? 0.8 : 1));
    },
    // 선술집: 열린 직업에서 후보 offersN()명
    tavern(f) {
      if (!f.tavern) Gd.refresh(f);
      return f.tavern;
    },
    refresh(f) {
      const lic = Gd.licensed();
      const keep = (f.tavern?.offers || []).filter(o => o.m.from); // 라이벌 출신은 한 번 더 기다려 준다
      const offers = keep.slice(0, 1);
      while (lic.length && offers.length < Gd.offersN()) { const m = Gd.make(f, U.pick(lic)); offers.push({ m, price: Gd.price(f, m) }); }
      f.tavern = { offers, t: TAVERN_T };
    },
    hire(f, i) {
      const T = Gd.tavern(f), o = T.offers[i];
      if (!o || f.gold < o.price || f.mercs.length >= Gd.ROSTER_MAX) return false;
      f.gold -= o.price;
      f.mercs.push(o.m);
      T.offers.splice(i, 1);
      G.log(`고용 · ${o.m.name} (${Gd.def(o.m).n} Lv ${o.m.lv})`, 'fantasy', 'good');
      F().syncAllies(f);
      return true;
    },
    lvText: m => (m.bt ? `Lv 20 ★${m.bt}` : `Lv ${m.lv}`),
    // 은퇴 (DESIGN.md 48 · 59): Lv 20부터 마을에서. 명단에서 빠지고 명성 +(레벨 + 서사 단계), 명예의 전당(f.hall, 시즌을 넘어 남는다)에 이름이 남는다
    RETIRE_LV,
    retireFame: m => m.lv + (m.bt || 0),
    canRetire: m => !m.lead && m.lv >= RETIRE_LV && !(m.inj > 0),
    retire(f, uid) {
      const m = Gd.get(f, uid);
      if (!m || !Gd.canRetire(m)) return false;
      const fm = Gd.retireFame(m);
      Gd.earnFame(f, fm);
      (f.hall = f.hall || []).unshift({ name: m.name, cls: m.cls, adv: m.adv, look: m.look, lv: m.lv, bt: m.bt || 0, boons: (m.boons || []).slice(), season: G.Season.st(f).n, best: f.maxFloor });
      G.log(`은퇴 · ${m.name} (${Gd.def(m).n} ${Gd.lvText(m)}) · 명성 +${fm}`, 'fantasy', 'good');
      Gd.dismiss(f, uid);
      return true;
    },
    dismiss(f, uid) {
      G.Trinket.free(f, uid);
      G.Bond.free(f, uid);
      f.mercs = f.mercs.filter(m => m.uid !== uid);
      f.lineup = (f.lineup || []).filter(u => u !== uid);
      F().syncAllies(f);
    },
    // 자동 편성: 직업마다 한 명씩 먼저(치유가 있어야 오염을 버티므로 수도사부터 — F.AUTO 순서), 남는 칸은 레벨 순
    autoPick(f, n) {
      const order = F().AUTO, ok = Gd.ready(f).slice().sort((a, b) => order.indexOf(a.cls) - order.indexOf(b.cls) || b.lv - a.lv);
      const out = [], seen = new Set();
      for (const m of ok) if (out.length < n && !seen.has(m.cls)) { out.push(m.uid); seen.add(m.cls); }
      for (const m of ok.sort((a, b) => b.lv - a.lv)) if (out.length < n && !out.includes(m.uid)) out.push(m.uid);
      // 트리에서 연 연계기가 나가도록 · 전우는 같이 · 앙숙은 떼어 한 명씩 바꿔 본다 (수도사는 남긴다 — 치유가 있어야 오염을 버틴다)
      // 다가오는 임무의 적성 (DESIGN.md 66): 맞는 사람 하나에 +2
      const ahead = G.Mission ? G.Mission.ahead(f, f.start || 1, 4).map(x => x.k) : [];
      const fit = ms => ms.reduce((a, m) => a + ahead.filter(k => D.APT[k].cls.includes(m.cls)).length * 2, 0);
      const score = ids => { const ms = ids.map(u => Gd.get(f, u)); return fit(ms) + G.Bond.pairs(f, ms).reduce((a, p) => a + (p.r === 'friend' ? 3 : -8), 0) + ms.reduce((a, m) => a + m.lv * 0.1 + (m.cls === 'cleric' ? 100 : 0), 0); };
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i < out.length; i++) for (const m of ok) {
        if (out.includes(m.uid)) continue;
        const t = out.slice(); t[i] = m.uid;
        if (score(t) > score(out)) out[i] = m.uid;
      }
      return out;
    },

    // ── 던전에서 일어나는 일 ──
    // 처치: 그 몬스터의 경험치(SRD CR 표)를 살아 있는 출전 용병이 나눈다
    onKill(f, rt, mo) {
      if (mo.boss && !rt.tutorial) Gd.earnFame(f, Math.max(5, Math.round((mo.stat?.cr || 1) * 2 + 5)), `${mo.n} 처치`);
      const alive = Math.max(1, (rt.party || rt.allies).filter(a => a.merc && !a.dead).length), base = (G.Region.XP[mo.stat?.cr] || 10) / alive * (mo.xpK || 1) * (1 + 0.2 * Gd.fac(f, 'train'));
      // 훈련장: 출전하지 않은 사람(부상 제외)도 경험치 일부
      const tr = TRAIN_K * Gd.fac(f, 'train');
      const body = rt.party || rt.allies;
      if (tr) { const on = new Set(body.map(a => a.merc && a.merc.uid)); for (const m of f.mercs) if (!on.has(m.uid) && !(m.inj > 0)) Gd.addXp(m, base * tr * Gd.mult(m, 'xp')); }
      // 단장도 같이 (rt.party[0] = 단장)
      for (const a of body) {
        const m = a.merc;
        if (!m || a.dead) continue;
        m.xp += base * Gd.mult(m, 'xp');
        while (m.xp >= Gd.needOf(m)) {
          m.xp -= Gd.needOf(m);
          if (m.lv < LV_MAX) { m.lv++; Gd.grow(m); } else m.bt = (m.bt || 0) + 1;
          Gd.giveBoons(m);
          a.max = a.kind === 'hero' ? F().heroHP(f) : F().allyHP(f, a);
          G.fx(rt, { k: 'text', x: a.x, y: a.y - 1.2, s: Gd.lvText(m), col: m.bt ? '#ffd27a' : '#9fe79f', t: 1.2, sz: 1.1, pop: true });
          G.Banter.line(rt, 'levelup', a);
          G.log(`${m.name || '단장'} ${m.lv}레벨`, 'fantasy', 'good');
        }
      }
    },
    // 대기 인원 경험치 (훈련장): 레벨이 오르면 은혜도
    addXp(m, x) {
      m.xp += x;
      while (m.xp >= Gd.needOf(m)) { m.xp -= Gd.needOf(m); if (m.lv < LV_MAX) { m.lv++; Gd.grow(m); } else m.bt = (m.bt || 0) + 1; Gd.giveBoons(m); }
    },
    // 쓰러짐: 한 번 쓰러지면 부상 (DESIGN.md 155) — 출전에서 빠지고 대기 중에 낫는다. 단장도 같다
    // 단장은 지도 위에서 일행을 이끄는 몸이라 원정 중엔 빠지지 않고, 다 나을 때까지 다음 출발을 못 한다 (G.Exp.depart)
    onDown(f, rt, a) {
      const m = a.merc;
      if (!m || ++m.downs < DOWNS_TO_INJURY) return;
      m.inj = INJURY_T * Gd.mult(m, 'revive') * (1 - TEMPLE_K * Gd.fac(f, 'temple'));
      G.fx(rt, { k: 'text', x: a.x, y: a.y - 1.2, s: '부상!', col: '#ff8a8a', t: 1.4, sz: 1.2, pop: true });
      G.log(`부상 · ${m.name}`, 'fantasy', 'bad');
      rt.resync = true;
    },
    newFloor(f) { for (const m of Gd.crew(f)) m.downs = 0; },
    tick(f, rt, dt) {
      // 처음 시작하면 견습 레인저 한 명이 길드에 있다
      if (!f.starter) {
        f.starter = 1;
        if (!f.mercs.length) { f.mercs.push(Gd.make(f, 'archer', { lv: 1 })); rt.resync = true; }
        Gd.refresh(f);
      }
      for (const m of Gd.crew(f)) if (m.inj > 0 && (m.inj -= dt) <= 0) { m.inj = 0; rt.resync = true; }
      const T = Gd.tavern(f);
      if ((T.t -= dt) <= 0) Gd.refresh(f);
    },
    // 불러온 저장의 빈칸만 채운다 (옛 방치형 저장의 이전 · 환불 코드는 지웠다)
    migrate(f) {
      if (!f.mercs) f.mercs = [];
      for (const m of f.mercs.concat((f.tavern?.offers || []).map(o => o.m), f.leader ? [f.leader] : [])) {
        if (m.look == null) m.look = U.rand(LOOKS);
        if (!m.feat) m.feat = G.Feat.roll();
        if (!m.pers) m.pers = G.Persona.roll();
        if (m.skills) { const pool = Gd.pickable(m.cls), keep = m.skills.filter(k => pool.includes(k) || D.MSKILLS[k]); if (keep.length < m.skills.length) m.skills = keep.concat(Gd.roll(m.cls, m.lv).filter(k => !keep.includes(k))).slice(0, Math.max(SKILL_N, keep.length)); } // 없어진 기술은 풀에서 채운다
        delete m.gear; delete m.job; delete m.traits; delete m.qlock;
        Gd.capLv(m);
      }
      if (f.fameAll == null) f.fameAll = f.fame || 0;
    },
  };
  return Gd;
})();
