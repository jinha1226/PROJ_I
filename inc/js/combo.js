'use strict';
// 연계기 (DESIGN.md 43): 누군가 스킬로 상태를 걸면, 트리에서 연 연계기의 받는 직업이 곧바로 이어 받아친다.
// 트리는 수치를 올리지 않는다 — 두 사람이 함께 하는 공격을 연다. 누구와 누구를 함께 보내느냐가 결정이 된다.
// 규칙: 연계기마다 쿨다운 CD초 · 파티에서 한 번에 하나(GATE초) · 거는 사람과 받는 사람은 다른 사람 · 둘 다 살아 있어야.
// 관계(G.Bond): 앙숙끼리는 잇지 않는다 · 전우끼리는 쿨다운 ×0.6 · 피해 ×1.3.
G.Combo = (() => {
  const U = G.U, GR = G.Grid;
  const F = () => G.Fantasy;
  const CD = 15, GATE = 3, COL = '#ffd24a';
  const ta = k => G.Tree.add('fantasy', G.S.w.fantasy.tree, k);
  const pow = c => G.Skill.pow(c);
  const hit = (f, rt, c, o, k, src = 'crit') => F().hurt(f, rt, o, F().allyAtk(f, c) * k * pow(c) * (c._bondK || 1), src, c);
  // 받는 사람이 멀면 대상 곁으로 뛰어간다
  const reach = (rt, c, o, r) => {
    if (GR.dist(c, o) <= r) return;
    G.fx(rt, { k: 'beam', x: c.x, y: c.y, x2: o.x, y2: o.y, col: COL, w: 3, t: 0.25 });
    if (GR.pass(rt.map, Math.round(o.x + (c.x > o.x ? 0.8 : -0.8)), Math.round(o.y))) { c.x = o.x + (c.x > o.x ? 0.8 : -0.8); c.y = o.y; }
  };

  // on = 무엇이 걸렸을 때(상태 키 · 스킬 키 · song_end), cls = 받는 직업(없으면 누구든)
  const CB = {
    cb_aim: { n: '정조준', on: 'stun', cls: 'archer', run(f, rt, c, o) { G.fx(rt, { k: 'beam', x: c.x, y: c.y, x2: o.x, y2: o.y, col: '#fff3b0', w: 4, t: 0.3 }); hit(f, rt, c, o, 6); } },
    cb_back: { n: '뒤치기', on: 'stun', cls: 'rogue', run(f, rt, c, o) {
      reach(rt, c, o, 0);
      if (o.hp < o.max * 0.2 && !o.boss) F().hurt(f, rt, o, o.hp + 1, 'crit', c); else hit(f, rt, c, o, 4);
    } },
    cb_drop: { n: '낙하 창', on: 'mark', cls: 'dragoon', run(f, rt, c, o) {
      reach(rt, c, o, 0);
      G.J.shake('fantasy', 9, 0, 1, 0.25);
      hit(f, rt, c, o, 6);
      for (const q of rt.mons.filter(q => q !== o && GR.dist(q, o) <= 1.6)) F().inflict(f, rt, q, 'bleed', 2, c, F().allyAtk(f, c) * 0.8, true);
    } },
    cb_volley: { n: '일제 사격', on: 'mark', cls: 'archer', run(f, rt, c, o) {
      for (const a of rt.allies) if (!a.dead && a.def.range >= 3 && !a.def.heal) {
        G.fx(rt, { k: 'proj', key: a.def.proj || 'fx_arrow', x: a.x, y: a.y, x2: o.x, y2: o.y, t: 0.25 });
        hit(f, rt, a, o, 1.5, 'hit');
      }
    } },
    cb_toxin: { n: '독 연소', on: 'poison', cls: 'mage', run(f, rt, c, o) {
      const d = o.dots.find(q => q.kind === 'poison'), dmg = (d ? d.dps * d.t : 0) * 2 + F().allyAtk(f, c) * 2 * pow(c);
      if (d) o.dots = o.dots.filter(q => q !== d);
      G.fx(rt, { k: 'ring', x: o.x, y: o.y, r: 2, t: 0.5, col: '#b0ff5a' });
      G.J.sfx('fantasy', 'boom');
      for (const q of [...rt.mons]) if (GR.dist(q, o) <= 2) F().hurt(f, rt, q, dmg, 'smite', c);
    } },
    cb_over: { n: '과전류', on: 'burn', cls: 'archmage', run(f, rt, c, o) {
      const hits = rt.mons.slice().sort((p, q) => GR.dist(p, o) - GR.dist(q, o)).slice(0, 6);
      G.fx(rt, { k: 'chain', pts: [[c.x, c.y], ...hits.map(q => [q.x, q.y])], col: '#ffe08a', t: 0.3 });
      for (const q of hits) hit(f, rt, c, q, 2, 'smite');
    } },
    cb_net: { n: '쇠 그물', on: 'shock', cls: 'scout', run(f, rt, c, o) {
      G.fx(rt, { k: 'ring', x: o.x, y: o.y, r: 2, t: 0.6, col: '#c9e8ff' });
      for (const q of rt.mons.filter(q => GR.dist(q, o) <= 2)) F().inflict(f, rt, q, 'stop', 2, c, 0, true);
    } },
    cb_shatter: { n: '산산조각', on: 'stop', cls: 'dragoon', run(f, rt, c, o) { reach(rt, c, o, 1.5); G.fx(rt, { k: 'impact', x: o.x, y: o.y, s: 2, col: '#c9e8ff', t: 0.3 }); hit(f, rt, c, o, 8); } },
    cb_blood: { n: '피의 기도', on: 'bleed', cls: 'cleric', run(f, rt, c, o) {
      const d = o.dots.find(q => q.kind === 'bleed'), amt = d ? d.dps * d.t : 0;
      for (const p of rt.party) if (!p.dead && !p.noHeal) { p.hp = Math.min(p.max, p.hp + Math.min(p.max * 0.15, amt / rt.party.length + p.max * 0.03)); G.fx(rt, { k: 'tile', key: 'fx_holy', x: p.x, y: p.y, t: 0.5 }); }
    } },
    cb_burn: { n: '모아서 태우기', on: 'sk_shout', cls: 'mage', run(f, rt, c, o) { G.Skill.meteor(f, rt, c, o.x, o.y, 15); } },
    cb_finale: { n: '피날레', on: 'song_end', run(f, rt, c, o) {
      for (const a of rt.allies) if (!a.dead && !a.def.heal) {
        const tg = F().nearestMon(rt, a, 8);
        if (!tg) continue;
        G.fx(rt, { k: 'beam', x: a.x, y: a.y, x2: tg.x, y2: tg.y, col: COL, w: 2, t: 0.25 });
        hit(f, rt, a, tg, 2);
      }
    } },
    cb_shield: { n: '방패 너머', on: 'sk_aegis', cls: 'paladin', run(f, rt, c, o) {
      reach(rt, c, o, 1.2);
      G.fx(rt, { k: 'ring', x: c.x, y: c.y, r: 2, t: 0.5, col: '#8fc4ef' });
      for (const q of rt.mons.filter(q => GR.dist(q, c) <= 2)) F().inflict(f, rt, q, 'stun', 2, c, 0, true);
    } },
  };
  // 무엇이 그 계기를 거나 (마을 표시용): 스킬 · 전직 스킬 키. 노래 끝은 음유시인 몸 성질
  const BY = {
    stun: ['sk_bind', 'sk_lull', 'sk_smash', 'sk_slam', 'sk_smoke', 'sk_trap'],
    mark: ['sk_judge', 'sk_hammer', 'sk_mock', 'sk_vital', 'sk_hunt', 'ro_mark'],
    poison: ['sk_toxcloud', 'sk_venom', 'r_poison'],
    burn: ['sk_fireball', 'sk_pillar', 'sk_firewall', 'sk_heatwave', 'm_burn'],
    shock: ['sk_disc', 'sk_chainl', 'sk_jolt', 'sk_slowf'],
    stop: ['sk_freeze', 'sk_net', 'a_stop'],
    bleed: ['sk_lance', 'sk_rend', 'sk_bleedcut', 'sk_trap', 'sk_saw'],
    sk_shout: ['sk_shout'], sk_aegis: ['sk_aegis'],
  };
  const ON = {};
  for (const [k, c] of Object.entries(CB)) (ON[c.on] = ON[c.on] || []).push(k);

  const C = {
    CB,
    cls: a => a.merc?.cls || a.id,
    open: k => ta(k) > 0,
    // 이 편성으로 나갈 수 있는 연계기 (마을 표시): 받는 직업이 있고, 그 계기를 거는 다른 사람이 있다. open = 트리에서 열었나
    possible(mercs) {
      const gives = (m, on) => on === 'song_end' ? m.cls === 'bard' : (BY[on] || []).some(k => G.Guild.skill(m, k) || (m.skills || []).includes(k));
      return Object.entries(CB).filter(([, cb]) => mercs.some(r => (!cb.cls || r.cls === cb.cls) && mercs.some(g => (g !== r || !cb.cls) && gives(g, cb.on))))
        .map(([k, cb]) => ({ k, cb, open: C.open(k) }));
    },
    // 무엇이 걸렸다 — from: 건 사람(동료), o: 대상(몬스터, 스킬 연계면 동료)
    on(f, rt, key, from, o) {
      if (!from || from.kind !== 'ally' || !ON[key] || rt.phase === 'dead') return;
      const now = G.S.runTime;
      // 파티 3초 제한: 전우끼리는 건너뛴다 (DESIGN.md 49)
      const gated = rt.cbGate > now;
      const cds = rt.cbCd || (rt.cbCd = {});
      for (const k of ON[key]) {
        const cb = CB[k];
        if (!C.open(k) || cds[k] > now) continue;
        // 앙숙은 서로의 연계기를 잇지 않는다 (DESIGN.md 46) — 같은 직업이 둘이면 전우를 먼저
        const cands = rt.allies.filter(a => !a.dead && a !== from && (!cb.cls || C.cls(a) === cb.cls) && G.Bond.canLink(f, from, a) && (!gated || G.Bond.cdK(f, from, a) < 1));
        const c = cands.sort((p, q) => G.Bond.cdK(f, from, p) - G.Bond.cdK(f, from, q))[0] || (!cb.cls && !gated ? from : null);
        if (!c || (o.kind === 'mon' && o.hp <= 0)) continue;
        cds[k] = now + CD * G.Bond.cdK(f, from, c);
        rt.cbGate = now + GATE;
        G.fx(rt, { k: 'beam', x: from.x, y: from.y, x2: c.x, y2: c.y, col: COL, w: 3, t: 0.4 });
        G.fx(rt, { k: 'text', x: c.x, y: c.y - 1.6, s: cb.n, col: COL, t: 1.4, sz: 1.3, pop: true });
        from._combo = c._combo = now;
        G.J.sfx('fantasy', 'chime');
        c._bondK = c === from ? 1 : G.Bond.linked(f, rt, from, c);
        cb.run(f, rt, c, o);
        c._bondK = 0;
        if (G.Sim) G.Sim.combos[k] = (G.Sim.combos[k] || 0) + 1;
        return;
      }
    },
  };
  return C;
})();
