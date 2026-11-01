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
  const GEAR_K = 1.1, GEAR_BASE = 30, GEAR_G = 1.25, AUTO_FORGE = 0.5;
  const TRAIN_K = 0.1, TEMPLE_K = 0.12, RETIRE_LV = 20, LV_MAX = 20, BOON_LV = 19, BOON_EVERY = 5, EPIC_K = 1.06, ROSTER_BASE = 8, OFFERS_BASE = 3, SLOT_LV = [1, 1, 3, 5], SKILL_N = 4, PROMO_LV = 3, PROMO_K = 60, LOOKS = 3, TAVERN_T = 150, INJURY_T = 90, DOWNS_TO_INJURY = 2, LV_STEP = 0.08;
  // 직업별 몸값 무게 (트리 면허 값 순서와 같다)
  const CLS_W = { archer: 1, scout: 1.1, bard: 1.2, cleric: 1.5, mage: 2, paladin: 2.5, barbarian: 2.5, dragoon: 3, monk: 3, warlock: 3, archmage: 4, rogue: 4 };
  const F = () => G.Fantasy;
  const ta = k => G.Tree.add('fantasy', G.S.w.fantasy.tree, k);

  const ADEF = {};
  const Gd = {
    TIER, PROMO_LV,
    // 신전 축복: 층에 들어선 뒤 이 초 동안 명중 · 내성 +2 (SRD 「Bless」 1d4의 평균쯤)
    blessT: () => 20 * Gd.fac(null, 'temple'),
    get ROSTER_MAX() { return ROSTER_BASE + 2 * Gd.fac(null, 'hall'); },
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
        if (f.heroGear) { f.leader.gear = { w: f.heroGear.w || 0, a: f.heroGear.a || 0 }; delete f.heroGear; }
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
      Object.assign(L, { cls: o.cls, name: o.name || L.name, ab: { ...o.ab }, abCls: o.cls, feat: o.feat, look: o.look || 0, skills: [sig, ...rest].slice(0, SKILL_N), adv: null });
      f.leaderNew = false;
      G.log(`단장 · ${L.name} (${Gd.def(L).n})`, 'fantasy', 'good');
      const rt = G.RT.fantasy;
      if (rt) rt.resyncHero = true;
      return true;
    },
    // 출전할 수 있는 사람: 다치지 않았고 대기실 일을 맡지 않은 사람
    ready: f => f.mercs.filter(m => !(m.inj > 0) && !m.job),
    // ── 대기실 배치 (DESIGN.md 64 · 픽 미 업의 대기실): 자리마다 한 사람, 그 능력치가 효과를 키운다 ──
    jobOf: (f, k) => (f || G.S.w.fantasy).mercs.find(m => m.job === k) || null,
    jobOpen: (f, k) => !D.JOBS[k].fac || Gd.fac(f, D.JOBS[k].fac) > 0,
    jobPow(f, k, m) { m = m || Gd.jobOf(f, k); return m && Gd.jobOpen(f, k) ? Math.max(0.5, 1 + 0.15 * G.Dnd.mod(G.Dnd.ab(m)[D.JOBS[k].ab])) : 0; },
    assign(f, k, uid) {
      if (!Gd.jobOpen(f, k)) return false;
      for (const m of f.mercs) if (m.job === k) delete m.job;
      const m = uid != null && Gd.get(f, uid);
      if (m && !m.lead) { delete m.job; for (const q of f.mercs) if (q.job === k) delete q.job; m.job = k; f.lineup = (f.lineup || []).filter(u => u !== uid); }
      F().syncAllies(f);
      return true;
    },
    need: lv => Math.round(6 * Math.pow(lv, 1.5)),
    // ── 길드 시설 (DESIGN.md 60): f.fac = { 키: 레벨 }. 명성으로 짓고 시즌을 넘어 남는다 ──
    // 이름값: 지금까지 번 명성(f.fameAll) 1마다 피해·체력 +1% — 시설과 따로 늘 붙는 프레스티지 배율
    renown: f => 1 + 0.01 * ((f || G.S.w.fantasy).fameAll || 0),
    earnFame(f, n) { f.fame = (f.fame || 0) + n; f.fameAll = (f.fameAll || 0) + n; },
    fac: (f, k) => ((f || G.S.w.fantasy).fac || {})[k] || 0,
    facCost: (f, k) => (Gd.fac(f, k) >= D.FAC[k].max ? Infinity : Math.ceil(D.FAC[k].base * Math.pow(D.FAC[k].g, Gd.fac(f, k)))),
    build(f, k) {
      const c = Gd.facCost(f, k);
      if ((f.fame || 0) < c) return false;
      f.fame -= c;
      (f.fac = f.fac || {})[k] = Gd.fac(f, k) + 1;
      G.log(`시설 · ${D.FAC[k].n} ${f.fac[k]}`, 'fantasy', 'good');
      return true;
    },
    // ── 서사 (DESIGN.md 59): 레벨은 20에서 멈추고, 그 뒤 경험치는 서사 단계(m.bt)로 — 단계마다 피해 · 체력 ×1.06, 끝없이 ──
    LV_MAX,
    needOf: m => Gd.need(m.lv + (m.bt || 0)),
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
      let v = k === 'atk' || k === 'hp' ? (1 + LV_STEP * (m.lv - 1)) * Math.pow(EPIC_K, m.bt || 0) : 1;
      // 장비 강화 (DESIGN.md 57): 무기 단계마다 피해 ×1.1 · 갑옷 단계마다 체력 ×1.1
      if (k === 'atk') v *= Math.pow(GEAR_K, Gd.gear(m).w);
      if (k === 'hp') v *= Math.pow(GEAR_K, Gd.gear(m).a);
      v *= G.Trinket.prod(m, k);
      const A = m.adv && D.ADV[m.adv];
      if (A && A[k] != null) v *= A[k];
      for (const s of Gd.active(m)) { const S = D.MSKILLS[s]; if (S && typeof S[k] === 'number' && k !== 'move' && k !== 'splash' && k !== 'sight') v *= S[k]; }
      return v;
    },
    // ── 장비 (DESIGN.md 57): 무기 · 갑옷 강화 단계 m.gear = { w, a }. 끝없이 오르고, 10단계마다 마법 +1(명중 · AC, 최대 +3) ──
    gear: m => m.gear || (m.gear = { w: 0, a: 0 }),
    magic: n => Math.min(3, Math.floor(n / 10)),
    gearCost: (m, slot) => Math.ceil(GEAR_BASE * (CLS_W[m.cls] || 1) * Math.pow(GEAR_G, Gd.gear(m)[slot]) * (1 - 0.08 * Gd.jobPow(null, 'smith'))),
    // 장비 이름 (DESIGN.md 58): 아티팩트를 끼면 그 이름. 방패 직업의 무기 칸은 「무기 + 방패」 — 마법 무기 + 방패 / 무기 + 마법 방패
    gearName(m, slot) {
      const g = D.GEAR[m.cls] || D.GEAR.archer, mg = Gd.magic(Gd.gear(m)[slot]), art = slot === 'w' ? G.Trinket.weapon(m) : G.Trinket.armor(m), pre = mg ? '+' + mg + ' ' : '';
      if (slot !== 'w' || !G.Dnd.cls(m).shield) return pre + (art ? G.Trinket.name(art) : g[slot][0]);
      if (art && G.Trinket.def(art).shield) return `${pre}${g.w[0]} + ${G.Trinket.name(art)}`;
      return `${pre}${art ? G.Trinket.name(art) : g.w[0]} + 방패`;
    },
    upgrade(f, m, slot) {
      const c = Gd.gearCost(m, slot);
      if (f.gold < c) return false;
      f.gold -= c;
      Gd.gear(m)[slot]++;
      const a = G.RT.fantasy?.party?.find(q => q.merc === m);
      if (a && slot === 'a') { const r = a.hp / (a.max || 1); a.max = F().allyHP(f, a); a.hp = a.max * r; }
      return true;
    },
    // 자동 강화 (f.autoForge, 기본 켜짐 — 자동 장착처럼): 출발할 때 금고의 AUTO_FORGE까지, 출전하는 사람의 가장 싼 강화부터
    autoForge(f) {
      if (f.autoForge === false) return;
      const line = [Gd.leader(f), ...F().lineup(f).map(u => Gd.get(f, u)).filter(Boolean)], budget = f.gold * AUTO_FORGE;
      let spent = 0;
      for (let i = 0; i < 200; i++) {
        let best = null;
        for (const m of line) for (const s of ['w', 'a']) { const c = Gd.gearCost(m, s); if (!best || c < best.c) best = { m, s, c }; }
        if (!best || spent + best.c > budget) break;
        spent += best.c;
        Gd.upgrade(f, best.m, best.s);
      }
    },
    // ── 개인 스킬 (DESIGN.md 43): 직업 일곱 중 넷. 칸은 Lv 1에 둘 · Lv 3에 셋 · Lv 5에 넷 ──
    // 넷을 뽑아 배우는 레벨 순으로 (DESIGN.md 56 ②: SRD 주문 · 기술은 그 레벨이 되어야 쓴다)
    // 첫 칸은 대표 기술(D.MSIG), 나머지 셋은 풀에서 — 배우는 레벨 순
    roll: cls => { const sig = D.MSIG[cls]; return [sig, ...U.shuffle(D.MPOOL[cls].filter(k => k !== sig)).slice(0, SKILL_N - 1).sort((a, b) => Gd.skLv(cls, a) - Gd.skLv(cls, b))]; },
    skLv(cls, k) { const L = D.MSKILLS[k]?.lv; return typeof L === 'object' ? L[cls] || 1 : L || 1; },
    // 그 칸이 열리는 레벨: 칸 레벨(1 · 1 · 3 · 5)과 기술 레벨 중 큰 쪽
    slotLv: (i, m, k) => Math.max(SLOT_LV[i], m && k ? Gd.skLv(m.cls, k) : 1),
    slots: m => (m.skills || []).filter((s, i) => m.lv >= Gd.slotLv(i, m, s)),
    // 스킬 레벨 1~5: 용병 Lv 1 · 4 · 7 · 10 · 13 (DESIGN.md 43)
    skillLv: m => Math.min(5, 1 + Math.floor(((m?.lv || 1) - 1) / 3)),
    // 쓸 수 있는 기술: 열린 칸 + 서브클래스 기능 중 그 레벨이 된 것
    // + 마법 입문 (출신 재주) 주문
    active: m => [...new Set(Gd.slots(m).concat(m.adv ? D.ADV[m.adv].sig.filter(k => m.lv >= Gd.skLv(m.cls, k)) : [], G.Feat.spell(m) || []))],
    // ── 상위 직업 (DESIGN.md 40): 몸 수치 = 기본 직업 + 전직 덮어쓰기 ──
    def(m) {
      if (!m.adv) return D.F.allies[m.cls];
      const A = D.ADV[m.adv];
      return ADEF[m.adv] || (ADEF[m.adv] = { ...D.F.allies[A.base], ...(A.def || {}), t: A.t, col: A.col, n: A.n });
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
    sum(m, k) { let v = k === 'move' ? G.Trinket.sum(m, k) + (G.Dnd.boon(m, 'dimension') ? 1 : 0) : 0; for (const s of Gd.active(m)) { const S = D.MSKILLS[s]; if (S && typeof S[k] === 'number') v += S[k]; } return v; },
    goldBonus(rt) { let g = 0; for (const a of rt.allies) if (a.merc && !a.dead) g += G.Trinket.sum(a.merc, 'gold'); return g; },
    name(f) {
      const used = new Set(f.mercs.map(m => m.name).concat((f.tavern?.offers || []).map(o => o.m.name)));
      for (let i = 0; i < 20; i++) { const n = U.pick(D.NAMES[0]) + U.pick(D.NAMES[1]); if (!used.has(n)) return n; }
      return U.pick(D.NAMES[0]) + U.pick(D.NAMES[1]) + U.pick(D.NAMES[1]);
    },
    // 새 용병: 레벨은 지금 깊이를 따라간다. 기벽 긍정 하나 · 부정 하나 (DESIGN.md 44 — 몸값에 곱해진다)
    make(f, cls, extra = {}) {
      const tv = Gd.fac(f, 'tavern'), lv = Math.min(LV_MAX - 2, Math.max(1, Math.round(F().depth(f.maxFloor) / 4) + U.rand(3) - 1) + tv);
      // 선술집 등급: 능력치를 등급+1번 굴려 합이 큰 쪽
      let ab = G.Dnd.rollAb(cls);
      for (let i = 0; i < tv; i++) { const b = G.Dnd.rollAb(cls); if (G.Dnd.sumAb(b) > G.Dnd.sumAb(ab)) ab = b; }
      return Object.assign({ uid: f.nextUid = (f.nextUid || 0) + 1, cls, name: Gd.name(f), lv, xp: 0, feat: G.Feat.roll(), pers: G.Persona.roll(), ab, abCls: cls, skills: Gd.roll(cls), look: U.rand(LOOKS), inj: 0, downs: 0 }, extra);
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
      const score = ids => { const ms = ids.map(u => Gd.get(f, u)); return fit(ms) + 10 * G.Combo.possible(ms).filter(c => c.open).length + G.Bond.pairs(f, ms).reduce((a, p) => a + (p.r === 'friend' ? 3 : -8), 0) + ms.reduce((a, m) => a + m.lv * 0.1 + (m.cls === 'cleric' ? 100 : 0), 0); };
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i < out.length; i++) for (const m of ok) {
        if (out.includes(m.uid)) continue;
        const t = out.slice(); t[i] = m.uid;
        if (score(t) > score(out)) out[i] = m.uid;
      }
      return out;
    },

    // ── 던전에서 일어나는 일 ──
    // 처치: 살아 있는 출전 용병 모두 경험치 (보스 10)
    onKill(f, rt, mo) {
      const base = (mo.boss ? 10 : 1) * (1 + 0.2 * Gd.fac(f, 'train'));
      // 훈련장: 출전하지 않은 사람(부상 제외)도 경험치 일부
      const tr = TRAIN_K * Gd.fac(f, 'train') + 0.1 * Gd.jobPow(f, 'coach');
      const body = rt.party || rt.allies;
      if (tr) { const on = new Set(body.map(a => a.merc && a.merc.uid)); for (const m of f.mercs) if (!on.has(m.uid) && !(m.inj > 0)) Gd.addXp(m, base * tr * Gd.mult(m, 'xp')); }
      // 단장도 같이 (rt.party[0] = 단장)
      for (const a of body) {
        const m = a.merc;
        if (!m || a.dead) continue;
        m.xp += base * Gd.mult(m, 'xp');
        while (m.xp >= Gd.needOf(m)) {
          m.xp -= Gd.needOf(m);
          if (m.lv < LV_MAX) m.lv++; else m.bt = (m.bt || 0) + 1;
          Gd.giveBoons(m);
          a.max = a.kind === 'hero' ? F().heroHP(f) : F().allyHP(f, a);
          G.fx(rt, { k: 'text', x: a.x, y: a.y - 1.2, s: Gd.lvText(m), col: m.bt ? '#ffd27a' : '#9fe79f', t: 1.2, sz: 1.1, pop: true });
        }
      }
    },
    // 대기 인원 경험치 (훈련장): 레벨이 오르면 은혜도
    addXp(m, x) {
      m.xp += x;
      while (m.xp >= Gd.needOf(m)) { m.xp -= Gd.needOf(m); if (m.lv < LV_MAX) m.lv++; else m.bt = (m.bt || 0) + 1; Gd.giveBoons(m); }
    },
    // 쓰러짐: 한 층에서 DOWNS_TO_INJURY번이면 부상 — 출전에서 빠지고 대기 중에 낫는다
    onDown(f, rt, a) {
      const m = a.merc;
      // 단장은 다치지 않는다 (늘 이끈다)
      if (m && m.lead) return;
      if (!m || ++m.downs < DOWNS_TO_INJURY) return;
      m.inj = INJURY_T * Gd.mult(m, 'revive') * (1 - TEMPLE_K * Gd.fac(f, 'temple')) * (1 - 0.12 * Gd.jobPow(f, 'priest'));
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
      for (const m of f.mercs) if (m.inj > 0 && (m.inj -= dt) <= 0) { m.inj = 0; rt.resync = true; }
      const T = Gd.tavern(f);
      if ((T.t -= dt) <= 0) Gd.refresh(f);
    },
    // 라이벌을 이겼다: 가끔 그 파티 출신이 입단을 원한다 (긍정 기벽 하나)
    defector(f, d) {
      if (!U.chance(0.35 + ta('t_recruit'))) return;
      const cls = U.pick([d.lead, ...d.crew]);
      const m = Gd.make(f, cls, { from: d.id });
      m.lv += 1;
      const T = Gd.tavern(f);
      T.offers.unshift({ m, price: Gd.price(f, m) });
      if (T.offers.length > Gd.offersN() + 1) T.offers.pop();
      G.Rivals.say(`입단 희망 · ${m.name} (전 ${d.n} ${D.F.allies[cls].n})`, d.col);
    },
    // 동료 노드만 있던 옛 저장: 면허가 있는 직업마다 한 명씩 들인다
    migrate(f) {
      if (!f.mercs) f.mercs = [];
      // 스킬 일곱 중 넷(DESIGN.md 43) 전의 용병: 풀에 남은 것은 두고 나머지를 풀에서 채운다
      for (const m of f.mercs.concat((f.tavern?.offers || []).map(o => o.m), f.leader ? [f.leader] : [])) {
        const pool = D.MPOOL[m.cls], sig = D.MSIG[m.cls], keep = (m.skills || []).filter(k => pool.includes(k) && k !== sig);
        // 대표 기술이 첫 칸 (DESIGN.md 66) · 풀에서 빠진 기술은 새로
        m.skills = [sig, ...keep.concat(U.shuffle(pool.filter(k => k !== sig && !keep.includes(k))))].slice(0, SKILL_N);
        if (m.look == null) m.look = U.rand(LOOKS);
        // 기벽 · 요양소를 뺐다 (DESIGN.md 61): 옛 기벽은 지우고 출신 재주를 굴린다
        if (!m.feat) m.feat = G.Feat.roll();
        // 옛 전직 → SRD 서브클래스 (DESIGN.md 56)
        if (m.adv && !D.ADV[m.adv]) m.adv = D.ADV_OLD[m.adv] && D.ADV[D.ADV_OLD[m.adv]].base === m.cls ? D.ADV_OLD[m.adv] : null;
        Gd.capLv(m);
      }
      // 성격이 생기기 전 용병 (DESIGN.md 42): 옛 특성 겁쟁이 · 탐욕은 성격으로 옮기고, 나머지는 성격을 굴린다
      for (const m of f.mercs.concat((f.tavern?.offers || []).map(o => o.m))) {
        if (m.pers) continue;
        const old = { coward: 'coward', greedy: 'greedy' }, moved = (m.traits || []).filter(t => old[t]).map(t => old[t]);
        m.pers = moved.length ? moved : G.Persona.roll();
      }
      for (const m of f.mercs.concat((f.tavern?.offers || []).map(o => o.m))) { delete m.traits; delete m.qlock; }
      delete f.qlog;
      // 명성 트리 → 길드 시설 (DESIGN.md 60): 같은 노드는 그 레벨 그대로, 이름값(fm_power)에 쓴 명성은 돌려준다
      if (f.fameTree) {
        const T = f.fameTree, map = { fm_roster: 'hall', fm_slot: 'elite', fm_tavern: 'tavern', fm_xp: 'train', fm_start: 'vault', fm_keep: 'archive', fm_gold: 'trade' };
        f.fac = f.fac || {};
        for (const k in map) if (T[k] > 0) f.fac[map[k]] = Math.max(f.fac[map[k]] || 0, Math.min(D.FAC[map[k]].max, T[k]));
        let back = 0;
        for (let i = 0; i < (T.fm_power || 0); i++) back += 2 * Math.pow(1.455, i);
        f.fame = (f.fame || 0) + Math.round(back);
        if (f.fameAll == null) f.fameAll = f.fame;
        delete f.fameTree;
      }
      if (f.fameAll == null) f.fameAll = f.fame || 0;
      if (f.mercs.length) return;
      for (const cls of Object.keys(D.F.allies).filter(id => ta('ally_' + id))) f.mercs.push(Gd.make(f, cls));
      f.lineup = [];
    },
  };
  return Gd;
})();
