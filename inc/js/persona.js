'use strict';
// 성격 (DESIGN.md 42): 타고나서 바뀌지 않는다. 용병단 방침(대열 · 귀환 · 라이벌)을 그 사람이 살짝 비튼다.
// 규칙: 지휘(집결 · 집중 표적 · 서둘러)가 걸려 있으면 나서지 않는다 · 한 사람은 한 층에 한 번 · 파티에서 한 번에 한 명.
// 나설 때마다 머리 위에 기호(ni_pe_*)가 뜬다 — 글 없이.
G.Persona = (() => {
  const U = G.U, D = G.D;
  // 한 사람의 성격 수: 없음 25% · 하나 60% · 둘 15% (같은 축에서는 하나만)
  const N_ODDS = [0.25, 0.6, 0.15], EMOTE_T = 1.5, BUSY_T = 2;
  // 자리 (DESIGN.md 49): 늘 서는 자리 — 앞장 · 가운데 · 뒤. 몸 둘레에 거는 스킬은 앞으로, 거리를 벌리거나 멀리서 노리는 스킬은 뒤로, 성격이 한 번 더 민다
  const CLOSE = new Set(['sk_halo', 'sk_lull', 'sk_nova', 'sk_heatwave', 'sk_firewall', 'sk_smash', 'sk_shout', 'sk_slam', 'sk_spin', 'sk_rend', 'sk_smoke', 'sk_bleedcut', 'sk_wall']);
  const FAR = new Set(['sk_kite', 'sk_blink', 'sk_step', 'sk_aimed', 'sk_tstorm', 'sk_meteor', 'sk_pierce']);
  const PERS_W = { hot: 2, coward: -2, brawler: 1, meek: -1 };
  const HOT_K = 1.5, COWARD_AT = 0.35, CAREFUL_AT = 0.5, GREEDY_P = 0.35, GREEDY_GOLD = 3;
  const P = {
    has: (m, k) => !!m && (m.pers || []).includes(k),
    // 원정대에서 그 성격을 가진 살아 있는 사람 (몸)
    who: (rt, k) => rt.allies.filter(a => !a.dead && P.has(a.merc, k)),
    roll() {
      const r = Math.random(), n = r < N_ODDS[0] ? 0 : r < N_ODDS[0] + N_ODDS[1] ? 1 : 2;
      const axes = U.shuffle([...new Set(Object.values(D.PERSONA).map(p => p.ax))]);
      return axes.slice(0, n).map(ax => U.pick(Object.keys(D.PERSONA).filter(k => D.PERSONA[k].ax === ax)));
    },
    // 지휘가 걸려 있나 (걸려 있으면 성격은 나서지 않는다)
    commanded: rt => !!(rt.rally || rt.rush || (rt.focus && !rt.focusAuto)),
    // 이 사람이 지금 나설 수 있나: 이 층에서 아직 · 파티에서 다른 사람이 나서는 중이 아님 · 지휘 없음
    free(rt, a, k, cmdOk) {
      return P.has(a.merc, k) && !a.dead && !(a.persUsed || {})[k] && !(rt.persT > G.S.runTime) && (cmdOk || !P.commanded(rt));
    },
    // 나섰다: 기호를 띄우고 이 층에서는 다시 나서지 않는다
    fire(rt, a, k, s) {
      (a.persUsed = a.persUsed || {})[k] = true;
      rt.persT = G.S.runTime + BUSY_T;
      G.fx(rt, { k: 'emote', key: 'ni_' + D.PERSONA[k].ic, ent: a, x: a.x, y: a.y, t: EMOTE_T });
      G.Banter.line(rt, s || 'p_' + k, a, null, { pri: true });
    },
    // 턴제 전투 (G.Turn): 성격이 몸으로 드러난다 — 다혈질은 먼저 달려들고, 겁쟁이는 물러나고, 욕심쟁이는 줍는다. true면 그 차례를 썼다
    turn(f, rt, st, e) {
      const low = e.hp / e.max;
      if (st.round === 1 && P.free(rt, e, 'hot')) { P.fire(rt, e, 'hot'); e.surge = HOT_K; return false; }
      if (st.round <= 2 && P.free(rt, e, 'brawler')) { P.fire(rt, e, 'brawler', 't_big'); e.bigT = true; return false; }
      if (low < COWARD_AT && P.free(rt, e, 'coward')) { P.fire(rt, e, 'coward'); G.Story.backOff(rt, e); return true; }
      if (low < CAREFUL_AT && P.free(rt, e, 'careful')) { P.fire(rt, e, 'careful', 't_guard'); e.guard = true; return true; }
      if (st.round >= 2 && P.free(rt, e, 'greedy') && Math.random() < GREEDY_P) {
        const g = G.Fantasy.monGold(f.floor) * GREEDY_GOLD * G.Fantasy.goldMult(f);
        P.fire(rt, e, 'greedy', 't_grab');
        G.Fantasy.gain(f, g);
        G.fx(rt, { k: 'text', x: e.x, y: e.y - 1.1, s: '+' + U.fmt(g), col: '#ffd24a', t: 1, sz: 0.85 });
        return true;
      }
      return false;
    },
    // 자리: 'front' 앞장 · 'mid' 가운데 · 'back' 뒤. 근접 직업 +1 · 치유 −1 (레벨이 올라 칸이 열리면 다시 잰다)
    // 진형 칸이 있으면 그 줄이 곧 자리다 (DESIGN.md 67). 칸이 없으면(레이드 둘째 파티) 성향대로
    ROWS: ['front', 'mid', 'back'],
    stance(a) {
      const m = a.merc;
      if (!m) return a.def.range >= 3 ? 'mid' : 'front';
      const c = G.S.w.fantasy.form?.[m.uid];
      if (c != null) return P.ROWS[c / 3 | 0];
      if (a._stLv === m.lv && a._st) return a._st;
      a._stLv = m.lv;
      return (a._st = P.pref(m, a.def));
    },
    pref(m, def) {
      let s = def.heal ? -1 : def.range >= 3 ? 0 : 1;
      for (const k of G.Guild.slots(m)) s += CLOSE.has(k) ? 1 : FAR.has(k) ? -1 : 0;
      for (const k of m.pers || []) s += PERS_W[k] || 0;
      return s >= 2 ? 'front' : s <= -1 ? 'back' : 'mid';
    },
    // 단짝: 원정대 안에서 정이 가장 깊은 전우 (G.Bond) — 붙어 다니고 서로 막아 준다
    buddy(f, rt, a) {
      if (!a.merc) return null;
      let best = null, bn = 0;
      for (const q of rt.allies) if (q !== a && !q.dead && q.merc && G.Bond.rel(f, a.merc, q.merc) === 'friend') { const n = G.Bond.n(f, a.merc.uid, q.merc.uid); if (n > bn) { bn = n; best = q; } }
      return best;
    },

    // ── 귀환 방침 (G.Exp.tick): 신중은 기준 +10%p, 욕심쟁이는 −10%p. 둘 다 있으면 상쇄 ──
    retreatAt(rt, at) {
      if (!at) return at;
      const n = P.who(rt, 'careful').length - P.who(rt, 'greedy').length;
      return U.clamp(at + 0.1 * U.clamp(n, -2, 2), 0.1, 0.7);
    },
  };
  return P;
})();
