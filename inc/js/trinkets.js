'use strict';
// 장신구 (DESIGN.md 45, Darkest Dungeon 장신구): 용병마다 2칸. 얻는 것과 잃는 것이 함께 온다.
// f.trinkets = [{ id, k, g, on }] — g 등급(1~3, 같은 것을 또 얻으면 겹쳐 오른다) · on = 낀 용병 uid(없으면 창고).
// 얻는 곳: 보스 전리품 · 라이벌 노획물. 창고는 CAP개 — 넘치면 약한 것부터 짐 골드로 판다. 전멸하면 낀 것 몇 개를 잃는다.
// 기본은 자동 장착(f.autoTr) — 방치해도 알아서 낀다. 마을 「장신구」 탭에서 직접 바꾸면 자동이 꺼진다.
G.Trinket = (() => {
  const U = G.U, D = G.D;
  const SLOTS = 2, CAP = 12, G_MAX = 3, UP = 0.5, BOSS_P = 0.6, RIVAL_P = 0.4, WIPE_LOSE = 0.25, R_W = { 1: 4, 2: 2, 3: 1 };
  const F = () => G.Fantasy;
  const T = {
    SLOTS, CAP,
    def: k => D.TRINKETS[k],
    all: f => f.trinkets || (f.trinkets = []),
    worn: (f, uid) => T.all(f).filter(t => t.on === uid),
    store: f => T.all(f).filter(t => t.on == null),
    // 등급으로 커진 수치: up 쪽만 (1 + (v−1) × (1 + UP × (g−1)))
    val(t, key) {
      const Df = D.TRINKETS[t.k], v = Df[key];
      if (typeof v !== 'number' || Df.up !== key || t.g <= 1) return v;
      const s = 1 + UP * (t.g - 1);
      return key === 'gold' || key === 'move' ? v * s : 1 + (v - 1) * s;
    },
    // 그 용병이 낀 것 (G.Guild.mult · sum이 읽는다)
    of(m) { const f = G.S.w.fantasy; return f && f.trinkets ? f.trinkets.filter(t => t.on === m.uid) : []; },
    prod(m, k) { let v = 1; for (const t of T.of(m)) { const Df = D.TRINKETS[t.k]; if (!Df.w && typeof Df[k] === 'number') v *= T.val(t, k); } return v; },
    sum(m, k) { let v = 0; for (const t of T.of(m)) if (typeof D.TRINKETS[t.k][k] === 'number') v += T.val(t, k); return v; },
    dmg(rt, a, o) { let v = 1; for (const t of T.of(a.merc)) { const Df = D.TRINKETS[t.k]; if (Df.dmg && G.Quirk.on(Df.w, rt, a, o, Df)) v *= T.val(t, 'dmg'); } return v; },
    taken(rt, a) { let v = 1; for (const t of T.of(a.merc)) if (D.TRINKETS[t.k].taken) v *= T.val(t, 'taken'); return v; },
    // 기본 공격에 확률로 상태이상 (F.allyAttack) — 걸리면 연계기가 받아칠 수 있다
    proc(f, rt, a, o, dmg) {
      for (const t of T.of(a.merc)) {
        const P = D.TRINKETS[t.k].proc;
        if (P && U.chance(P[1] * (1 + UP * (t.g - 1)))) F().inflict(f, rt, o, P[0], P[0] === 'stop' || P[0] === 'stun' ? 1.5 : 4, a, dmg * 0.3);
      }
    },
    // 값어치 (자동 장착 · 넘칠 때 팔 순서): 희귀도 + 등급
    score: t => D.TRINKETS[t.k].r * 2 + t.g * 1.5,
    price: (f, t) => Math.ceil(F().monGold(f.maxFloor) * 20 * D.TRINKETS[t.k].r * t.g),
    // 얻었다: 같은 것이 있으면(창고든 낀 것이든) 등급을 올리고, 다 올랐으면 새로. 넘치면 판다
    gain(f, rt, k, x, y) {
      const Df = D.TRINKETS[k], all = T.all(f), same = all.filter(t => t.k === k && t.g < G_MAX).sort((a, b) => b.g - a.g)[0];
      if (same) same.g++;
      else all.push({ id: f.trUid = (f.trUid || 0) + 1, k, g: 1, on: null });
      // 줍는 사람: 보스 · 라이벌 자리에서 가장 가까운 동료 머리 위에 현판
      const who = rt && x != null && rt.allies.filter(a => !a.dead).sort((p, q) => Math.hypot(p.x - x, p.y - y) - Math.hypot(q.x - x, q.y - y))[0];
      if (who) G.Quirk.banner(rt, who, Df.ic, `${Df.n}${same ? ' ' + '★'.repeat(same.g) : ''}`, 'loot', Df.r >= 3 ? '#e08aff' : Df.r >= 2 ? '#6fb4ff' : '#f4efe2');
      G.log(`장신구 · ${Df.ic} ${Df.n}${same ? ` ★${same.g}` : ''}`, 'fantasy', 'good');
      T.overflow(f);
      if (f.autoTr !== false) T.auto(f);
    },
    // 무작위 하나 (희귀도 무게) — 깊을수록 드문 것이 조금 더
    roll(f) {
      const deep = Math.min(1, (f.floor || 1) / 30), w = k => R_W[D.TRINKETS[k].r] * (D.TRINKETS[k].r > 1 ? 1 + deep : 1);
      const ks = Object.keys(D.TRINKETS), tot = ks.reduce((a, k) => a + w(k), 0);
      let r = Math.random() * tot;
      for (const k of ks) if ((r -= w(k)) <= 0) return k;
      return ks[0];
    },
    // 보스 · 라이벌을 이겼다: 확률로 장신구, 아니면 잡템(짐 골드)
    drop(f, rt, src, x, y) {
      if (U.chance(src === 'boss' ? BOSS_P : RIVAL_P)) return T.gain(f, rt, T.roll(f), x, y);
      const g = F().monGold(f.floor) * 5 * F().goldMult(f);
      F().gain(f, g);
    },
    // 창고가 넘치면 가장 약한 것부터 짐 골드로
    overflow(f) {
      const st = T.store(f).sort((a, b) => T.score(a) - T.score(b));
      while (st.length > CAP) {
        const t = st.shift(), p = T.price(f, t);
        f.trinkets = f.trinkets.filter(q => q !== t);
        if (f.town) f.gold += p; else F().gain(f, p);
      }
    },
    // 전멸: 출전한 사람이 낀 것마다 WIPE_LOSE로 잃는다
    wipe(f, rt) {
      const uids = new Set(rt.allies.filter(a => a.merc).map(a => a.merc.uid)), lost = [];
      for (const t of T.all(f)) if (uids.has(t.on) && U.chance(WIPE_LOSE)) lost.push(t);
      if (!lost.length) return;
      f.trinkets = f.trinkets.filter(t => !lost.includes(t));
      G.log(`장신구 잃음 · ${lost.map(t => D.TRINKETS[t.k].n).join(' · ')}`, 'fantasy', 'bad');
    },
    // 자동 장착: 출전하는 사람부터, 값어치 높은 것부터. 치유 전용은 치유 직업에게만, 상태이상은 치유 직업에게 주지 않는다. 한 사람에 같은 것 둘은 안 된다
    auto(f) {
      const all = T.all(f), line = F().lineup(f), ms = f.mercs.slice().sort((a, b) => line.includes(b.uid) - line.includes(a.uid) || b.lv - a.lv);
      for (const t of all) t.on = null;
      const fits = (m, t) => { const Df = D.TRINKETS[t.k], heal = !!G.Guild.def(m).heal; return Df.only === 'heal' ? heal : !(heal && (Df.proc || Df.dmg || (Df.atk || 1) > 1)); };
      const pool = all.slice().sort((a, b) => T.score(b) - T.score(a));
      for (const m of ms) for (let i = 0; i < SLOTS; i++) {
        const t = pool.find(t => t.on == null && fits(m, t) && !all.some(q => q.on === m.uid && q.k === t.k));
        if (t) t.on = m.uid;
      }
      T.sync(f);
    },
    // 직접 끼우기 · 빼기 (마을): 그 사람 칸이 차 있으면 가장 약한 것을 빼고 끼운다
    equip(f, id, uid) {
      const t = T.all(f).find(q => q.id === id);
      if (!t) return false;
      f.autoTr = false;
      if (uid == null) { t.on = null; T.sync(f); return true; }
      const w = T.worn(f, uid).filter(q => q !== t);
      if (w.some(q => q.k === t.k)) return false;
      if (w.length >= SLOTS) w.sort((a, b) => T.score(a) - T.score(b))[0].on = null;
      t.on = uid;
      T.sync(f);
      return true;
    },
    // 체력 배율이 바뀌었을 수 있다 — 던전 몸에 다시
    sync(f) { const rt = G.RT.fantasy; if (rt) for (const a of rt.allies) if (a.merc) { const r = a.hp / (a.max || 1); a.max = F().allyHP(f, a); a.hp = Math.min(a.max, a.max * r); } },
    // 해고: 그 사람이 낀 것은 창고로
    free(f, uid) { for (const t of T.all(f)) if (t.on === uid) t.on = null; T.overflow(f); },
  };
  return T;
})();
