'use strict';
// 기벽 (DESIGN.md 44, Darkest Dungeon 기벽): 몸과 마음의 버릇. 원정이 사람을 바꾼다 — 성격(타고남)과 달리 생기고 없어진다.
// 용병 m.traits = 기벽 키 목록, m.qlock = 굳은 기벽(긍정은 요양소에서 고정한 것 하나, 부정은 고치지 않아 굳은 것).
// 이름 붙은 기벽은 사건에서만: 보스를 잡은 사람 → 보스 사냥꾼 · 라이벌을 쓰러뜨림 → 「○○ 천적」 · 라이벌에게 쓰러짐 → 「○○ 공포」 · 전멸에서 마지막으로 쓰러짐 → 악몽.
G.Quirk = (() => {
  const U = G.U, D = G.D;
  // 한쪽 최대 · 원정 뒤 확률(성공 → 긍정, 전멸 · 부상 → 부정) · 부정이 굳는 확률 · 사건 확률
  const MAX = 3, GOOD_P = 0.15, BAD_WIPE = 0.35, BAD_INJ = 0.2, LOCK_P = 0.25, EV_P = { bosshunt: 0.5, foe: 0.3, fear: 0.35, nightmare: 0.5 };
  // 요양소 값: 지금 최고층 몬스터 골드 × K (굳은 부정은 ×3, 고정은 ×1.5)
  const COST_K = 40, LOCKED_K = 3, PIN_K = 1.5, FRESH_T = 10, LATE_T = 60;
  // 서로 반대인 짝: 하나를 얻으면 다른 하나가 없어진다 (두려워하던 라이벌단을 쓰러뜨리면 공포가 천적으로 바뀐다)
  const OPP = { fear: 'foe', foe: 'fear', bosshunt: 'giantfear', giantfear: 'bosshunt', clutch: 'nightmare', nightmare: 'clutch', pioneer: 'dread', dread: 'pioneer', rivalry: 'shy', shy: 'rivalry' };
  const DEFS = {};
  const Q = {
    MAX,
    // 'fear:<라이벌 id>'처럼 대상이 붙은 기벽은 이름에 그 라이벌단 이름을 붙인다
    def(k) {
      if (DEFS[k]) return DEFS[k];
      const [b, id] = k.split(':'), B = D.QUIRKS[b];
      if (!B) return null;
      const R = id && D.RIVALS.find(d => d.id === id);
      return (DEFS[k] = R ? { ...B, n: `${R.n} ${B.n}`, foe: id } : B);
    },
    bad: k => !!Q.def(k)?.bad,
    locked: (m, k) => (m.qlock || []).includes(k),
    side: (m, bad) => m.traits.filter(k => Q.bad(k) === bad),
    // 선술집 신참: 긍정 하나 · 부정 하나 (DD 역마차). 사건 기벽은 굴리지 않는다
    pool: bad => Object.keys(D.QUIRKS).filter(k => !D.QUIRKS[k].ev && !!D.QUIRKS[k].bad === bad),
    roll() { const g = U.pick(Q.pool(false)); return [g, U.pick(Q.pool(true).filter(k => OPP[g] !== k))]; },
    // 얻는다: 이미 있으면 그만. 반대 짝(OPP)이 있으면 그것을 지운다(굳었어도). 그쪽이 가득이면 굳지 않은 하나를 밀어낸다(다 굳었으면 못 얻는다)
    add(f, m, k, rt, a) {
      const Df = Q.def(k);
      if (!Df || m.traits.includes(k)) return false;
      const [b, id] = k.split(':'), opp = OPP[b] && OPP[b] + (id ? ':' + id : '');
      if (opp && m.traits.includes(opp)) { m.traits = m.traits.filter(q => q !== opp); m.qlock = (m.qlock || []).filter(q => q !== opp); }
      const same = Q.side(m, !!Df.bad);
      if (same.length >= MAX) {
        const out = same.filter(q => !Q.locked(m, q));
        if (!out.length) return false;
        const o = U.pick(out);
        m.traits = m.traits.filter(q => q !== o);
      }
      m.traits.push(k);
      (f.qlog = f.qlog || []).push({ uid: m.uid, k, at: G.S.runTime });
      if (f.qlog.length > 12) f.qlog.shift();
      G.log(`기벽 · ${m.name} · ${Df.ic} ${Df.n}`, 'fantasy', Df.bad ? 'bad' : 'good');
      if (rt && a) Q.banner(rt, a, Df.ic, Df.n, Df.bad ? 'bad' : 'good');
      return true;
    },
    // 그 자리에서 생긴 일 (DESIGN.md 50, DD 기벽 획득 연출): 머리 위 현판(아이콘 + 이름) · 빛기둥 · 초상 번쩍 · 소리.
    // kind: good 초록 · bad 붉은 · loot 장신구(희귀도 색) · bond 분홍
    BANNER_COL: { good: '#8fef8f', bad: '#ff6b6b', bond: '#ff9ac0', loot: '#f4efe2' },
    banner(rt, a, ic, s, kind, col) {
      // 한 번에 하나씩 (DD처럼): 앞 현판이 뜬 지 0.9초가 지나야 다음이 뜬다 — 그동안은 기다린다
      // 같은 사람 머리 위에서는 앞 현판이 거의 사라진 뒤에
      const c = col || Q.BANNER_COL[kind], now = G.S.runTime, wait = Math.max(0, (rt.bannerAt || 0) + 0.9 - now, (a._bannerEnd || 0) - 0.4 - now);
      rt.bannerAt = now + wait;
      a._bannerEnd = now + wait + 2.6;
      G.fx(rt, { k: 'banner', ent: a, x: a.x, y: a.y, ic, s, col: c, wait, t: 2.6 + wait });
      G.fx(rt, { k: 'ring', x: a.x, y: a.y, r: 1.2, t: 0.5, col: c });
      a._qfx = { t: now + wait, kind };
      G.J.sfx('fantasy', kind === 'bad' ? 'quirkBad' : 'quirkGood');
      if (kind === 'bad') G.J.shake('fantasy', 3);
    },
    // 죽을 고비 (F 동료 고리): 체력 15% 아래로 떨어졌다가 5초를 버티면 25% — 반은 배수진, 반은 유리턱
    brink(f, rt, a, dt) {
      if (!a.merc || a.dead) { a.brinkT = 0; return; }
      if (a.hp < a.max * 0.15) { if (!a.brinkT) a.brinkT = 0.001; }
      if (!a.brinkT || a.brinkDone) return;
      if ((a.brinkT += dt) < 5) return;
      a.brinkDone = true;
      if (U.chance(0.25)) Q.add(f, a.merc, U.chance(0.5) ? 'clutch' : 'glass', rt, a);
    },
    // 사건 (전투 중): 그 몸이 그 기벽을 확률로 얻는다
    event(f, rt, a, k) {
      if (!a?.merc) return;
      const base = k.split(':')[0];
      if (U.chance(EV_P[base] ?? 0.3)) Q.add(f, a.merc, k, rt, a);
    },

    // ── 전투 수치 ──
    // 조건이 지금 맞나: a = 기벽 가진 몸, o = 상대
    on(w, rt, a, o, Df) {
      if (w === 'boss') return !!o?.boss;
      if (w === 'rival') return o?.kind === 'rival';
      if (w === 'foe') return o?.kind === 'rival' && o.rival?.id === Df.foe;
      if (w === 'low') return a.hp < a.max * 0.5;
      if (w === 'front') { const f = G.S.w.fantasy; return f.floor >= f.maxFloor; }
      if (w === 'fresh') return rt.floorT < FRESH_T;
      if (w === 'late') return rt.floorT >= LATE_T;
      return false;
    },
    // 주는 피해 배율 (F.hurt): 조건부 dmg만 (늘 걸리는 atk는 G.Guild.mult가 allyAtk에 넣는다)
    dmg(rt, a, o) {
      let v = 1;
      for (const k of a.merc.traits) { const Df = Q.def(k); if (Df?.dmg && Q.on(Df.w, rt, a, o, Df)) v *= Df.dmg; }
      return v;
    },
    // 받는 피해 배율 (F.hurtMember): 조건 없는 taken은 늘, 조건 있는 taken은 그때만
    taken(rt, a, o) {
      let v = 1;
      for (const k of a.merc.traits) { const Df = Q.def(k); if (Df?.taken && (!Df.w || Q.on(Df.w, rt, a, o, Df))) v *= Df.taken; }
      return v;
    },
    // 늘 걸리는 수치 합 (gold · move · chest처럼 더하거나 곱하는 것)
    sum(m, k) { let v = 0; for (const t of m.traits) { const Df = Q.def(t); if (Df && !Df.w && typeof Df[k] === 'number') v += Df[k]; } return v; },
    prod(m, k) { let v = 1; for (const t of m.traits) { const Df = Q.def(t); if (Df && !Df.w && typeof Df[k] === 'number') v *= Df[k]; } return v; },

    // ── 원정이 끝났다 (G.Exp.home): 고치지 않은 부정은 굳고, 결과에 따라 새 기벽 (ok = 출발층보다 내려갔다) ──
    after(f, rt, why, ok) {
      const went = rt.allies.filter(a => a.merc).map(a => a.merc);
      for (const m of went) {
        for (const k of Q.side(m, true)) if (!Q.locked(m, k) && U.chance(LOCK_P)) (m.qlock = m.qlock || []).push(k);
        const wipe = why === 'wipe', hurt = m.inj > 0;
        if (wipe ? U.chance(BAD_WIPE) : hurt ? U.chance(BAD_INJ) : false) Q.add(f, m, U.pick(Q.pool(true).filter(k => !m.traits.includes(k))));
        else if (!wipe && ok && U.chance(GOOD_P)) Q.add(f, m, U.pick(Q.pool(false).filter(k => !m.traits.includes(k))));
      }
    },

    // ── 요양소: 부정 하나 제거 · 긍정 하나 고정(한 사람에 하나) ──
    cost(f, m, k) {
      const b = G.Fantasy.monGold(f.maxFloor) * COST_K;
      return Math.ceil(Q.bad(k) ? b * (Q.locked(m, k) ? LOCKED_K : 1) : b * PIN_K);
    },
    canTreat: (m, k) => Q.bad(k) || (!Q.locked(m, k) && !Q.side(m, false).some(q => Q.locked(m, q))),
    treat(f, m, k) {
      const c = Q.cost(f, m, k);
      if (!m.traits.includes(k) || !Q.canTreat(m, k) || f.gold < c) return false;
      f.gold -= c;
      const Df = Q.def(k);
      if (Df.bad) { m.traits = m.traits.filter(q => q !== k); m.qlock = (m.qlock || []).filter(q => q !== k); G.log(`요양소 · ${m.name} · ${Df.n} 제거`, 'fantasy', 'good'); }
      else { (m.qlock = m.qlock || []).push(k); G.log(`요양소 · ${m.name} · ${Df.n} 고정`, 'fantasy', 'good'); }
      return true;
    },
  };
  return Q;
})();
