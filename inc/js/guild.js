'use strict';
// 길드 (DESIGN.md 31): 용병 명단 · 선술집 · 성장 · 부상
// 용병은 한 사람 한 사람이다 — 직업(트리 면허), 이름, 레벨, 특성. 출전 칸에 넣은 사람만 던전에서 싸운다.
// 싸우면 경험치가 쌓여 레벨이 오르고, 한 층에서 두 번 쓰러지면 부상으로 한동안 빠진다(대기 인원을 돌려 쓰는 이유).
// 선술집 후보는 시간이 지나거나 보스를 잡으면 바뀐다. 라이벌을 이기면 그 파티 출신이 입단을 원하기도 한다.
G.Guild = (() => {
  const U = G.U, D = G.D;
  // 선술집에 나오는 직업: 기본 넷은 처음부터, 나머지는 이번 시즌 최고층으로 (트리와 상관없다 — DESIGN.md 38)
  const BASE = ['archer', 'cleric', 'bard', 'scout'], TIER = { mage: 4, paladin: 4, dragoon: 8, archmage: 12, rogue: 12 };
  const RETIRE_LV = 15, ROSTER_BASE = 8, OFFERS_BASE = 3, SLOT_LV = [1, 1, 3, 5], SKILL_N = 4, PROMO_LV = 10, PROMO_K = 60, LOOKS = 3, TAVERN_T = 150, INJURY_T = 90, DOWNS_TO_INJURY = 2, LV_STEP = 0.08;
  // 직업별 몸값 무게 (트리 면허 값 순서와 같다)
  const CLS_W = { archer: 1, scout: 1.1, bard: 1.2, cleric: 1.5, mage: 2, paladin: 2.5, dragoon: 3, archmage: 4, rogue: 4 };
  const F = () => G.Fantasy;
  const ta = k => G.Tree.add('fantasy', G.S.w.fantasy.tree, k);

  const ADEF = {};
  const Gd = {
    TIER, PROMO_LV,
    get ROSTER_MAX() { return ROSTER_BASE + 2 * G.Season.fameAdd('fm_roster'); },
    offersN: () => OFFERS_BASE + G.Season.fameAdd('fm_tavern'),
    licensed: () => { const fl = G.S.w.fantasy.maxFloor; return Object.keys(D.F.allies).filter(id => BASE.includes(id) || fl >= (TIER[id] || 1e9)); },
    // 다음에 열리는 직업과 그 층 (선술집 머리줄)
    nextTier() { const fl = G.S.w.fantasy.maxFloor, n = Object.entries(TIER).filter(([, t]) => t > fl).sort((a, b) => a[1] - b[1])[0]; return n ? { cls: n[0], at: n[1] } : null; },
    get: (f, uid) => f.mercs.find(m => m.uid === uid),
    ready: f => f.mercs.filter(m => !(m.inj > 0)),
    need: lv => Math.round(6 * Math.pow(lv, 1.5)),
    // 사람마다의 배율: 레벨(+8%/레벨) · 기벽 · 장신구 · 전직 · 전직 스킬의 수치(G.D.MSKILLS의 atk·hp·cd·heal)
    mult(m, k) {
      let v = k === 'atk' || k === 'hp' ? 1 + LV_STEP * (m.lv - 1) : 1;
      for (const t of m.traits) { const T = G.Quirk.def(t); if (T && !T.w && typeof T[k] === 'number') v *= T[k]; }
      v *= G.Trinket.prod(m, k);
      const A = m.adv && D.ADV[m.adv];
      if (A && A[k] != null) v *= A[k];
      for (const s of Gd.active(m)) { const S = D.MSKILLS[s]; if (S && typeof S[k] === 'number' && k !== 'move' && k !== 'splash' && k !== 'sight') v *= S[k]; }
      return v;
    },
    // ── 개인 스킬 (DESIGN.md 43): 직업 일곱 중 넷. 칸은 Lv 1에 둘 · Lv 3에 셋 · Lv 5에 넷 ──
    roll: cls => U.shuffle(D.MPOOL[cls].slice()).slice(0, SKILL_N),
    slotLv: i => SLOT_LV[i],
    slots: m => (m.skills || []).filter((s, i) => m.lv >= SLOT_LV[i]),
    // 스킬 레벨 1~5: 용병 Lv 1 · 4 · 7 · 10 · 13 (DESIGN.md 43)
    skillLv: m => Math.min(5, 1 + Math.floor(((m?.lv || 1) - 1) / 3)),
    active: m => [...new Set(Gd.slots(m).concat(m.adv ? D.ADV[m.adv].sig : []))],
    // ── 상위 직업 (DESIGN.md 40): 몸 수치 = 기본 직업 + 전직 덮어쓰기 ──
    def(m) {
      if (!m.adv) return D.F.allies[m.cls];
      const A = D.ADV[m.adv];
      return ADEF[m.adv] || (ADEF[m.adv] = { ...D.F.allies[A.base], ...(A.def || {}), t: A.t, col: A.col, n: A.n });
    },
    // 그림: 직업(전직) 그림 + 고용 때 정해진 색 변형 (DESIGN.md 41)
    tile: m => Gd.def(m).t + (m.look ? '_c' + m.look : ''),
    advs: cls => Object.keys(D.ADV).filter(k => D.ADV[k].base === cls),
    canPromote: m => !m.adv && m.lv >= PROMO_LV,
    promoCost: (f, m) => Math.ceil((CLS_W[m.cls] || 1) * F().monGold(f.maxFloor) * PROMO_K),
    promote(f, m, adv) {
      const c = Gd.promoCost(f, m);
      if (!Gd.canPromote(m) || D.ADV[adv]?.base !== m.cls || f.gold < c) return false;
      f.gold -= c;
      m.adv = adv;
      G.log(`전직 · ${m.name} · ${D.ADV[adv].n}`, 'fantasy', 'good');
      const a = G.RT.fantasy?.allies.find(q => q.uid === m.uid);
      if (a) Object.assign(a, { def: Gd.def(m), t: Gd.tile(m), wpn: Gd.def(m).wpn });
      return true;
    },
    skill: (m, key) => !!m && Gd.active(m).includes(key),
    // 수치 패시브 합 (splash·sight·move처럼 더하는 것)
    sum(m, k) { let v = k === 'move' ? G.Quirk.sum(m, k) + G.Trinket.sum(m, k) : 0; for (const s of Gd.active(m)) { const S = D.MSKILLS[s]; if (S && typeof S[k] === 'number') v += S[k]; } return v; },
    goldBonus(rt) { let g = 0; for (const a of rt.allies) if (a.merc && !a.dead) g += G.Quirk.sum(a.merc, 'gold') + G.Trinket.sum(a.merc, 'gold'); return g; },
    name(f) {
      const used = new Set(f.mercs.map(m => m.name).concat((f.tavern?.offers || []).map(o => o.m.name)));
      for (let i = 0; i < 20; i++) { const n = U.pick(D.NAMES[0]) + U.pick(D.NAMES[1]); if (!used.has(n)) return n; }
      return U.pick(D.NAMES[0]) + U.pick(D.NAMES[1]) + U.pick(D.NAMES[1]);
    },
    // 새 용병: 레벨은 지금 깊이를 따라간다. 기벽 긍정 하나 · 부정 하나 (DESIGN.md 44 — 몸값에 곱해진다)
    make(f, cls, extra = {}) {
      const lv = Math.max(1, Math.round(F().depth(f.maxFloor) / 4) + U.rand(3) - 1);
      return Object.assign({ uid: f.nextUid = (f.nextUid || 0) + 1, cls, name: Gd.name(f), lv, xp: 0, traits: G.Quirk.roll(), qlock: [], pers: G.Persona.roll(), skills: Gd.roll(cls), look: U.rand(LOOKS), inj: 0, downs: 0 }, extra);
    },
    price(f, m) {
      let p = (CLS_W[m.cls] || 1) * F().monGold(f.maxFloor) * 15 * (1 + 0.15 * (m.lv - 1));
      for (const t of m.traits) p *= G.Quirk.def(t)?.price || 1;
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
    // 은퇴 (DESIGN.md 48): Lv 15부터 마을에서. 명단에서 빠지고 명성 +레벨, 명예의 전당(f.hall, 시즌을 넘어 남는다)에 이름이 남는다
    RETIRE_LV,
    canRetire: m => m.lv >= RETIRE_LV && !(m.inj > 0),
    retire(f, uid) {
      const m = Gd.get(f, uid);
      if (!m || !Gd.canRetire(m)) return false;
      f.fame = (f.fame || 0) + m.lv;
      (f.hall = f.hall || []).unshift({ name: m.name, cls: m.cls, adv: m.adv, look: m.look, lv: m.lv, season: G.Season.st(f).n, best: f.maxFloor });
      G.log(`은퇴 · ${m.name} (${Gd.def(m).n} Lv ${m.lv}) · 명성 +${m.lv}`, 'fantasy', 'good');
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
      const score = ids => { const ms = ids.map(u => Gd.get(f, u)); return 10 * G.Combo.possible(ms).filter(c => c.open).length + G.Bond.pairs(f, ms).reduce((a, p) => a + (p.r === 'friend' ? 3 : -8), 0) + ms.reduce((a, m) => a + m.lv * 0.1 + (m.cls === 'cleric' ? 100 : 0), 0); };
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
      for (const a of rt.allies) {
        const m = a.merc;
        if (!m || a.dead) continue;
        m.xp += (mo.boss ? 10 : 1) * Gd.mult(m, 'xp') * (1 + 0.25 * G.Season.fameAdd('fm_xp'));
        while (m.xp >= Gd.need(m.lv)) {
          m.xp -= Gd.need(m.lv);
          m.lv++;
          a.max = F().allyHP(f, a);
          G.fx(rt, { k: 'text', x: a.x, y: a.y - 1.2, s: `Lv ${m.lv}`, col: '#9fe79f', t: 1.2, sz: 1.1, pop: true });
        }
      }
    },
    // 쓰러짐: 한 층에서 DOWNS_TO_INJURY번이면 부상 — 출전에서 빠지고 대기 중에 낫는다
    onDown(f, rt, a) {
      const m = a.merc;
      if (!m || ++m.downs < DOWNS_TO_INJURY) return;
      m.inj = INJURY_T * Gd.mult(m, 'revive');
      G.fx(rt, { k: 'text', x: a.x, y: a.y - 1.2, s: '부상!', col: '#ff8a8a', t: 1.4, sz: 1.2, pop: true });
      G.log(`부상 · ${m.name}`, 'fantasy', 'bad');
      // 크게 다치면 30%로 부정 기벽이 그 자리에서 (DESIGN.md 50)
      if (U.chance(0.3)) G.Quirk.add(f, m, U.pick(G.Quirk.pool(true).filter(k => !m.traits.includes(k))), rt, a);
      rt.resync = true;
    },
    newFloor(f) { for (const m of f.mercs) m.downs = 0; },
    tick(f, rt, dt) {
      // 처음 시작하면 견습 레인저 한 명이 길드에 있다
      if (!f.starter) {
        f.starter = 1;
        if (!f.mercs.length) { f.mercs.push(Gd.make(f, 'archer', { lv: 1, traits: [] })); rt.resync = true; }
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
      m.traits = [U.pick(G.Quirk.pool(false))];
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
      for (const m of f.mercs.concat((f.tavern?.offers || []).map(o => o.m))) {
        const pool = D.MPOOL[m.cls], keep = (m.skills || []).filter(k => pool.includes(k));
        if (keep.length !== SKILL_N) m.skills = keep.concat(U.shuffle(pool.filter(k => !keep.includes(k)))).slice(0, SKILL_N);
        if (m.look == null) m.look = U.rand(LOOKS);
        if (!m.qlock) m.qlock = [];
      }
      // 성격이 생기기 전 용병 (DESIGN.md 42): 옛 특성 겁쟁이 · 탐욕은 성격으로 옮기고, 나머지는 성격을 굴린다
      for (const m of f.mercs.concat((f.tavern?.offers || []).map(o => o.m))) {
        if (m.pers) continue;
        const old = { coward: 'coward', greedy: 'greedy' }, moved = m.traits.filter(t => old[t]).map(t => old[t]);
        m.traits = m.traits.filter(t => D.QUIRKS[t]);
        m.pers = moved.length ? moved : G.Persona.roll();
      }
      if (f.mercs.length) return;
      for (const cls of Object.keys(D.F.allies).filter(id => ta('ally_' + id))) f.mercs.push(Gd.make(f, cls));
      f.lineup = [];
    },
  };
  return Gd;
})();
