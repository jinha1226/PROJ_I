'use strict';
// SRD 직업 기술 · 주문 효과 (DESIGN.md 56 ②): G.D.MSKILLS의 sr_* — G.Skill.SK에 더한다.
// 규칙대로 굴린다: 명중 주문은 d20 vs AC, 범위 · 상태이상 주문은 맞는 쪽 내성(실패하면 다 · 성공하면 절반 또는 없음).
// 몇 초 이어지는 것(영적 무기 · 영혼 수호자 · 월광 · 번개 부르기 · 어둠 · 야생 변신)은 시전자 몸에 c.pe로 달고 G.Skill.tick이 돌린다.
(() => {
  const U = G.U, GR = G.Grid, DN = G.Dnd;
  const F = () => G.Fantasy, P = () => G.Skill.pow;
  const now = () => G.S.runTime;
  const atk = (x, c, k) => F().allyAtk(x.f, c) * k * P()(c);
  const near = (x, p, r) => x.rt.mons.filter(o => GR.dist(o, p) <= r);
  const pick = x => { const t = F().skillTarget(x.rt); return t.dots ? t : x.seen[0]; };
  const strong = x => x.seen.slice().sort((p, q) => q.hp - p.hp)[0];
  const nearest = (x, c, r) => F().nearestMon(x.rt, c, r);
  const beam = (x, a, b, col, w = 3) => G.fx(x.rt, { k: 'beam', x: a.x, y: a.y, x2: b.x, y2: b.y, col, w, t: 0.25 });
  const ring = (x, p, r, col) => G.fx(x.rt, { k: 'ring', x: p.x, y: p.y, r, t: 0.5, col });
  const say = (x, c, s, col) => G.fx(x.rt, { k: 'text', x: c.x, y: c.y - 1.2, s, col, t: 1.1, sz: 1, pop: true });
  const sfx = k => G.J.sfx('fantasy', k);
  const jump = (x, c, tx, ty) => { if (GR.pass(x.rt.map, Math.round(tx), Math.round(ty))) { c.x = tx; c.y = ty; } };
  const push = (x, c, o, d) => { const dx = o.x - c.x, dy = o.y - c.y, l = Math.hypot(dx, dy) || 1; jump(x, o, o.x + dx / l * d, o.y + dy / l * d); };
  const alive = x => x.rt.party.filter(p => !p.dead);
  const lowest = (x, r) => alive(x).filter(p => !p.noHeal && p.hp < p.max * r).sort((p, q) => p.hp / p.max - q.hp / q.max)[0];
  // 생명의 제자 (생명 권역): 치유 ×1.3
  const heal = (x, c, p, k) => { p.hp = Math.min(p.max, p.hp + p.max * k * P()(c) * (F().sk(c, 'sr_disciple') ? 1.3 : 1)); G.fx(x.rt, { k: 'tile', key: 'fx_holy', x: p.x, y: p.y, t: 0.7 }); };
  const fire = (c, k) => (F().sk(c, 'sr_affinity') ? k * 1.3 : k);
  // 강화된 방출 (방출계): 방출계 주문 ×1.3
  const evo = (c, k) => (F().sk(c, 'sr_empower') ? k * 1.3 : k);
  // 명중 주문 · 무기 기술: 굴려서 맞으면 피해 (치명이면 F.critD 배). 결과를 돌려준다
  const strike = (x, c, o, k, src = 'smite') => {
    const r = DN.attack(c, o);
    // 강력한 소마법 (방출계): 빗나가도 절반
    if (!r.hit) { DN.miss(x.rt, o); if (F().sk(c, 'sr_potent')) F().hurt(x.f, x.rt, o, atk(x, c, k) / 2, 'hit', c); return r; }
    F().hurt(x.f, x.rt, o, atk(x, c, k) * (r.crit ? F().critD() : 1), r.crit ? 'crit' : src, c);
    return r;
  };
  // 내성 주문: 실패하면 k배, 성공하면 half면 절반 · 아니면 없음. 성공했는지 돌려준다
  const saveHit = (x, c, o, ab, k, half = true) => {
    const ok = DN.save(o, ab, DN.dc(c));
    const d = ok ? (half || F().sk(c, 'sr_potent') ? k / 2 : 0) : k;
    if (d > 0) F().hurt(x.f, x.rt, o, atk(x, c, d), 'smite', c);
    return ok;
  };
  // 상태이상 주문: 내성에 실패하면 건다. 기절 · 마비는 몬스터의 옛 타이머(연계기가 받아친다), 나머지는 G.Dnd 상태이상
  const cond = (x, c, o, ab, k, t) => {
    if (o.hp <= 0 || DN.save(o, ab, DN.dc(c))) { G.fx(x.rt, { k: 'text', x: o.x, y: o.y - 1, s: '저항', col: '#9aa0a8', t: 0.7, sz: 0.7 }); return false; }
    if (k === 'stunned' || k === 'paralyzed') {
      const f = k === 'stunned' ? 'stun' : 'stop';
      o[f] = Math.max(o[f] || 0, t);
      G.fx(x.rt, { k: 'text', x: o.x, y: o.y - 1.1, s: DN.COND[k].n, col: '#c9a6ff', t: 1, sz: 0.85, pop: true });
      G.Combo.on(x.f, x.rt, f, c, o);
    } else DN.give(x.rt, o, k, t, c);
    return true;
  };
  const W = {
    seen: (c, x) => x.seen.length > 0,
    pack: n => (c, x) => x.seen.length >= n,
    close: (r, n = 1) => (c, x) => near(x, c, r).length >= n,
    fight: (c, x) => x.rt.mons.some(o => o.aggro && F().inView(x.rt, o.x, o.y)),
    low: r => (c, x) => !!lowest(x, r),
    self: r => c => c.hp < c.max * r,
  };
  // 이어지는 효과 하나 달기
  const persist = (c, k, t, extra) => { (c.pe = c.pe || []).push(Object.assign({ k, t, tick: 0 }, extra)); };

  Object.assign(G.Skill.SK, {
    // ── 공용 ──
    sr_cure: { when: W.low(0.5), run(c, x) { heal(x, c, lowest(x, 0.5), 0.5); sfx('bell'); } },
    sr_hword: { when: W.low(0.6), run(c, x) { const p = lowest(x, 0.6); beam(x, c, p, '#9fe79f', 2); heal(x, c, p, 0.3); } },
    sr_bless: { when: W.fight, run(c, x) {
      for (const p of alive(x).sort((p, q) => GR.dist(p, c) - GR.dist(q, c)).slice(0, 3)) { DN.buff(p, 'bless', 10, { hit: 2.5, save: 2.5 }); ring(x, p, 0.8, '#ffe08a'); }
    } },
    sr_spike: { when: W.pack(2), run(c, x) { const tg = pick(x); x.rt.fields.push({ x: tg.x, y: tg.y, r: 2, t: 8, dps: atk(x, c, 0.8), key: 'q_herb', c }); ring(x, tg, 2, '#7fcf8a'); } },
    sr_fireball: { when: W.pack(2), run(c, x) {
      const tg = pick(x);
      G.fx(x.rt, { k: 'proj', key: 'fx_fire', x: c.x, y: c.y, x2: tg.x, y2: tg.y, t: 0.25 });
      G.fx(x.rt, { k: 'tile', key: 'fx_fire', x: tg.x, y: tg.y, t: 0.6, s: 2.2 });
      for (const o of near(x, tg, 2)) saveHit(x, c, o, 'dex', evo(c, fire(c, 5)));
      sfx('boom');
    } },
    // ── 바바리안 ──
    sr_rage: { when: W.fight, run(c, x) { DN.buff(c, 'rage', 10, { dmg: 1.5, taken: 0.5 }); ring(x, c, 1, '#ff5a3a'); say(x, c, '격노', '#ff5a3a'); } },
    sr_reckless: { when: W.close(1.8), run(c, x) { DN.buff(c, 'reckless', 8, { adv: 1, hitAdv: 1 }); ring(x, c, 0.9, '#ff8a3a'); } },
    sr_brutal: { when: W.close(1.8), run(c, x) {
      const o = nearest(x, c, 1.8), r = strike(x, c, o, 4, 'crit');
      if (r.hit && o.hp > 0) { push(x, c, o, 2); o.shock = Math.max(o.shock || 0, 3); G.J.shake('fantasy', 6, 0, 1, 0.2); }
    } },
    sr_intim: { when: W.close(4, 2), run(c, x) { ring(x, c, 4, '#ff5a3a'); for (const o of near(x, c, 4)) cond(x, c, o, 'wis', 'frightened', 6); } },
    // ── 파이터 ──
    sr_second: { when: W.self(0.5), run(c, x) { heal(x, c, c, 0.3); } },
    sr_surge: { when: (c, x) => !!nearest(x, c, c.def.range + 0.5), run(c, x) { say(x, c, '쇄도', '#ffe08a'); F().allyAttack(x.f, x.rt, c, nearest(x, c, c.def.range + 0.5)); } },
    sr_cleave: { when: W.close(1.8), run(c, x) {
      const o = nearest(x, c, 1.8);
      strike(x, c, o, 2, 'hit');
      const o2 = x.rt.mons.find(q => q !== o && q.hp > 0 && GR.dist(q, c) <= 1.8);
      if (o2) strike(x, c, o2, 2, 'hit');
    } },
    sr_topple: { when: W.close(1.8), run(c, x) { const o = nearest(x, c, 1.8); if (strike(x, c, o, 2, 'hit').hit) cond(x, c, o, 'con', 'prone', 2); } },
    sr_push: { when: W.close(1.8), run(c, x) { const o = nearest(x, c, 1.8); if (strike(x, c, o, 2, 'hit').hit && o.hp > 0) push(x, c, o, 3); } },
    sr_sap: { when: W.close(1.8), run(c, x) { const o = nearest(x, c, 1.8); if (strike(x, c, o, 2, 'hit').hit && o.hp > 0) DN.give(x.rt, o, 'sapped', 4, c); } },
    // ── 로그 ──
    sr_cunning: { when: W.seen, run(c, x) {
      const o = x.seen.slice().sort((p, q) => p.hp - q.hp)[0];
      beam(x, c, o, '#b98aff', 2);
      jump(x, c, o.x + (c.x > o.x ? -0.8 : 0.8), o.y);
      DN.buff(c, 'cunning', 3, { adv: 1 });
    } },
    sr_steady: { when: W.seen, run(c, x) { DN.buff(c, 'steady', 2.5, { adv: 1 }); c.nextX = 2; ring(x, c, 0.7, '#ffd24a'); } },
    sr_cstrike: { when: W.close(2), run(c, x) {
      const o = nearest(x, c, 2), r = strike(x, c, o, 3 * DN.sneak(x.rt, c, o, 1), 'crit');
      if (r.hit) { if (DN.has(o, 'poisoned')) cond(x, c, o, 'dex', 'prone', 2); else cond(x, c, o, 'con', 'poisoned', 4); }
    } },
    sr_devious: { when: W.close(2), run(c, x) { const o = nearest(x, c, 2); if (strike(x, c, o, 4, 'crit').hit) cond(x, c, o, 'con', 'stunned', 3); } },
    // ── 몽크 ──
    sr_flurry: { when: W.close(1.8), run(c, x) {
      const o = nearest(x, c, 1.8);
      for (let i = 0; i < 3 && o.hp > 0; i++) {
        G.fx(x.rt, { k: 'slash', x: o.x, y: o.y, t: 0.2, rot: Math.random() - 0.5, flip: i % 2 === 0 });
        if (strike(x, c, o, 0.8, 'hit').hit && F().sk(c, 'sr_ohtech') && !DN.has(o, 'prone')) cond(x, c, o, 'dex', 'prone', 1.5);
      }
    } },
    sr_patient: { when: W.close(1.8), run(c, x) { DN.buff(c, 'dodge', 5, { hitDis: 1 }); ring(x, c, 0.9, '#e8c860'); } },
    sr_wind: { when: (c, x) => x.seen.some(o => GR.dist(o, c) > 3 && GR.dist(o, c) <= 8), run(c, x) {
      const o = x.seen.filter(o => GR.dist(o, c) > 3 && GR.dist(o, c) <= 8).sort((p, q) => q.hp - p.hp)[0];
      beam(x, c, o, '#e8c860', 3);
      jump(x, c, o.x + (c.x > o.x ? 0.8 : -0.8), o.y);
      strike(x, c, o, 3);
    } },
    sr_stun: { when: W.close(1.8), run(c, x) { const o = x.seen.filter(q => GR.dist(q, c) <= 1.8 && !(q.stun > 0)).sort((p, q) => q.hp - p.hp)[0]; if (!o) return false; if (strike(x, c, o, 2, 'hit').hit) cond(x, c, o, 'con', 'stunned', 2); } },
    sr_whole: { when: W.self(0.5), run(c, x) { heal(x, c, c, 0.4); } },
    sr_quiver: { when: W.close(2), run(c, x) {
      const o = near(x, c, 2).sort((p, q) => q.hp - p.hp)[0];
      if (!DN.attack(c, o).hit) return DN.miss(x.rt, o);
      G.fx(x.rt, { k: 'impact', x: o.x, y: o.y, s: 2, col: '#e8c860', t: 0.3 });
      saveHit(x, c, o, 'con', 20);
      G.J.shake('fantasy', 8, 0, 1, 0.25);
    } },
    // ── 팔라딘 ──
    sr_lay: { when: W.low(0.5), run(c, x) { const p = lowest(x, 0.5); beam(x, c, p, '#fff3c4', 2); heal(x, c, p, 0.5); } },
    sr_sof: { when: W.fight, run(c, x) { const p = alive(x).sort((p, q) => p.hp / p.max - q.hp / q.max)[0]; DN.buff(p, 'sof', 10, { ac: 2 }); ring(x, p, 0.9, '#8fc4ef'); } },
    sr_smite: { when: W.close(1.8), run(c, x) {
      const o = nearest(x, c, 1.8);
      if (strike(x, c, o, DN.undead(o) || DN.fiend(o) ? 4 : 3).hit) G.fx(x.rt, { k: 'impact', x: o.x, y: o.y, s: 1.8, col: '#fff3c4', t: 0.25 });
    } },
    sr_searing: { when: W.close(1.8), run(c, x) { const o = nearest(x, c, 1.8); if (strike(x, c, o, 2).hit) F().inflict(x.f, x.rt, o, 'burn', 4, c, atk(x, c, 0.5)); } },
    sr_sacred: { when: W.fight, run(c, x) { DN.buff(c, 'sacred', 10, { hit: Math.max(1, DN.mod(DN.ab(c.merc).cha)) }); ring(x, c, 1, '#fff3c4'); } },
    // ── 레인저 · 워락: 표식 (내가 맞히면 +40%, F.hurt) ──
    sr_hmark: { when: (c, x) => x.seen.some(o => !(o.hm && o.hm.by === c && o.hm.until > now())), run(c, x) { const o = strong(x); o.hm = { by: c, until: now() + 15 }; G.Combo.on(x.f, x.rt, 'hm', c, o); beam(x, c, o, '#ff8a6a', 2); } },
    sr_hex: { when: (c, x) => x.seen.some(o => !(o.hm && o.hm.by === c && o.hm.until > now())), run(c, x) { const o = strong(x); o.hm = { by: c, until: now() + 15 }; G.Combo.on(x.f, x.rt, 'hm', c, o); beam(x, c, o, '#9a5ad0', 2); } },
    sr_ensnare: { when: W.seen, run(c, x) { const o = strong(x); if (strike(x, c, o, 2, 'hit').hit) cond(x, c, o, 'str', 'restrained', 4); } },
    // ── 클레릭 ──
    sr_gbolt: { when: W.seen, run(c, x) { const o = strong(x); beam(x, c, o, '#fff3c4', 3); if (strike(x, c, o, 5).hit && o.hp > 0) DN.give(x.rt, o, 'outlined', 4, c); } },
    sr_sflame: { when: W.seen, run(c, x) { const o = pick(x); G.fx(x.rt, { k: 'tile', key: 'fx_holy', x: o.x, y: o.y, t: 0.6, s: 1.3 }); saveHit(x, c, o, 'dex', 3 * DN.tier(c), false); } },
    sr_turn: { when: (c, x) => x.seen.some(o => DN.undead(o) && GR.dist(o, c) <= 6), run(c, x) {
      ring(x, c, 6, '#fff3c4');
      for (const o of x.seen.filter(o => DN.undead(o) && GR.dist(o, c) <= 6)) if (cond(x, c, o, 'wis', 'frightened', 5)) o.stun = Math.max(o.stun || 0, 5);
    } },
    sr_sweapon: { when: W.fight, run(c, x) { persist(c, 'sw', 10); } },
    sr_guard: { when: W.close(3), run(c, x) { persist(c, 'sg', 10); ring(x, c, 3, '#fff3c4'); } },
    sr_revive: { when: (c, x) => x.rt.allies.some(p => p.dead), run(c, x) {
      const p = x.rt.allies.find(q => q.dead);
      p.dead = false; p.hp = p.max * 0.3; p.reviveT = 0;
      beam(x, c, p, '#fff3c4');
      G.fx(x.rt, { k: 'tile', key: 'fx_holy', x: p.x, y: p.y, t: 0.8 });
      sfx('bell');
    } },
    // 생명 보존: 절반 아래 동료가 둘 이상이면 모두 절반까지
    sr_preserve: { when: (c, x) => alive(x).filter(p => !p.noHeal && p.hp < p.max * 0.5).length >= 2, run(c, x) {
      for (const p of alive(x)) if (!p.noHeal && p.hp < p.max * 0.5) { p.hp = p.max * 0.5; G.fx(x.rt, { k: 'tile', key: 'fx_holy', x: p.x, y: p.y, t: 0.8 }); }
      ring(x, c, 4, '#fff3c4');
      sfx('bell');
    } },
    sr_mhw: { when: (c, x) => { const ph = F().partyHP(x.rt); return ph.hp < ph.max * 0.6; }, run(c, x) { for (const p of alive(x)) if (!p.noHeal) heal(x, c, p, 0.25); sfx('bell'); } },
    // ── 바드 ──
    sr_insp: { when: W.fight, run(c, x) {
      const p = alive(x).filter(p => p !== c && p.kind === 'ally' && !DN.bon(p, 'insp')).sort((p, q) => F().allyAtk(x.f, q) - F().allyAtk(x.f, p))[0];
      if (!p) return false;
      DN.buff(p, 'insp', 10, { hit: 3.5, save: 3.5 });
      beam(x, c, p, '#e0a040', 2);
      G.fx(x.rt, { k: 'tile', key: 'fx_song', x: p.x, y: p.y - 0.8, t: 0.8 });
    } },
    sr_faerie: { when: W.pack(2), run(c, x) { const tg = pick(x); ring(x, tg, 2, '#e08aff'); for (const o of near(x, tg, 2)) cond(x, c, o, 'dex', 'outlined', 6); } },
    sr_mock: { when: W.seen, run(c, x) { const o = strong(x); beam(x, c, o, '#ff8a6a', 1); if (!saveHit(x, c, o, 'wis', 2 * DN.tier(c), false)) DN.give(x.rt, o, 'sapped', 4, c); } },
    sr_whisper: { when: W.seen, run(c, x) { const o = strong(x); beam(x, c, o, '#c9a6ff', 2); if (!saveHit(x, c, o, 'wis', 4)) DN.give(x.rt, o, 'frightened', 3, c); } },
    sr_tw: { when: W.close(2), run(c, x) {
      ring(x, c, 2, '#8fd8ff');
      for (const o of near(x, c, 2)) if (!saveHit(x, c, o, 'con', 3)) push(x, c, o, 2);
      G.J.shake('fantasy', 5, 0, 1, 0.15);
    } },
    sr_sleep: { when: W.pack(2), run(c, x) { const tg = pick(x); ring(x, tg, 2, '#c9a6ff'); for (const o of near(x, tg, 2)) cond(x, c, o, 'wis', 'stunned', 4); } },
    sr_shatter: { when: W.pack(2), run(c, x) { const tg = pick(x); G.fx(x.rt, { k: 'impact', x: tg.x, y: tg.y, s: 2, col: '#8fd8ff', t: 0.3 }); for (const o of near(x, tg, 1.5)) saveHit(x, c, o, 'con', 4); } },
    sr_hypno: { when: W.pack(3), run(c, x) { const tg = pick(x); ring(x, tg, 3, '#e08aff'); for (const o of near(x, tg, 3)) cond(x, c, o, 'wis', 'stunned', 5); } },
    // ── 드루이드 ──
    sr_pflame: { when: W.seen, run(c, x) { const o = pick(x); G.fx(x.rt, { k: 'proj', key: 'fx_flame', x: c.x, y: c.y, x2: o.x, y2: o.y, t: 0.25 }); strike(x, c, o, 2.5 * DN.tier(c)); } },
    sr_entangle: { when: W.pack(2), run(c, x) { const tg = pick(x); ring(x, tg, 2, '#7fcf8a'); for (const o of near(x, tg, 2)) cond(x, c, o, 'str', 'restrained', 5); } },
    sr_wild: { when: (c, x) => W.fight(c, x) && !c.wild, run(c, x) {
      c.wild = { t: c.t, def: c.def };
      c.t = 'm_bear';
      c.def = Object.assign({}, c.def, { range: 1.3, proj: null, wpn: null });
      c.thp = (c.thp || 0) + c.max * 0.5;
      DN.buff(c, 'wild', 12, { dmg: 2 });
      persist(c, 'wild', 12);
      ring(x, c, 1.2, '#7fcf8a');
      G.J.shake('fantasy', 4, 0, 1, 0.15);
    } },
    sr_landaid: { when: W.pack(2), run(c, x) { const tg = pick(x); ring(x, tg, 1.5, '#7fcf8a'); for (const o of near(x, tg, 1.5)) saveHit(x, c, o, 'con', 3); const p = lowest(x, 0.9); if (p) heal(x, c, p, 0.2); } },
    sr_moon: { when: W.seen, run(c, x) { persist(c, 'moon', 8, { tg: strong(x) }); } },
    sr_call: { when: W.fight, run(c, x) { persist(c, 'call', 6); } },
    sr_ice: { when: W.pack(2), run(c, x) {
      const tg = pick(x);
      G.fx(x.rt, { k: 'ring', x: tg.x, y: tg.y, r: 2, t: 0.6, col: '#bfe8ff' });
      for (const o of near(x, tg, 2)) { saveHit(x, c, o, 'dex', 5); o.shock = Math.max(o.shock || 0, 3); }
    } },
    // ── 소서러 ──
    sr_firebolt: { when: W.seen, run(c, x) {
      const ts = F().sk(c, 'sr_twin') ? x.seen.slice(0, 2) : [pick(x)];
      for (const o of ts) { G.fx(x.rt, { k: 'proj', key: 'fx_flame', x: c.x, y: c.y, x2: o.x, y2: o.y, t: 0.25 }); strike(x, c, o, fire(c, 3 * DN.tier(c))); }
    } },
    sr_chroma: { when: W.seen, run(c, x) {
      const ts = F().sk(c, 'sr_twin') ? x.seen.slice().sort((p, q) => q.hp - p.hp).slice(0, 2) : [strong(x)];
      for (const o of ts) { G.fx(x.rt, { k: 'proj', key: 'fx_zap', x: c.x, y: c.y, x2: o.x, y2: o.y, t: 0.25 }); strike(x, c, o, 5); }
    } },
    sr_sray: { when: W.seen, run(c, x) {
      const ts = x.seen.slice().sort((p, q) => GR.dist(p, c) - GR.dist(q, c));
      for (let i = 0; i < 3; i++) { const o = ts[i % ts.length]; if (o.hp <= 0) continue; beam(x, c, o, '#ff8a3a', 2); strike(x, c, o, fire(c, 2)); }
    } },
    sr_lbolt: { when: W.seen, run(c, x) {
      const tg = pick(x), dx = tg.x - c.x, dy = tg.y - c.y, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
      const hits = x.rt.mons.filter(o => { const px = o.x - c.x, py = o.y - c.y, t = px * ux + py * uy; return t > 0 && t <= 9 && Math.abs(px * uy - py * ux) < 0.8; });
      if (!hits.length) return false;
      G.fx(x.rt, { k: 'beam', x: c.x, y: c.y, x2: c.x + ux * 9, y2: c.y + uy * 9, col: '#8fd8ff', w: 4, t: 0.3 });
      for (const o of hits) saveHit(x, c, o, 'dex', 5);
      sfx('smite');
    } },
    sr_chain: { when: W.pack(2), run(c, x) {
      const tg = strong(x), hits = [tg, ...x.rt.mons.filter(o => o !== tg).sort((p, q) => GR.dist(p, tg) - GR.dist(q, tg)).slice(0, 3)];
      G.fx(x.rt, { k: 'chain', pts: [[c.x, c.y], ...hits.map(o => [o.x, o.y])], col: '#8fd8ff', t: 0.3 });
      for (const o of hits) saveHit(x, c, o, 'dex', 8);
      sfx('smite');
    } },
    // ── 워락 ──
    sr_eb: { when: W.seen, run(c, x) {
      const o = pick(x), k = 2 * (F().sk(c, 'sr_agon') ? 1.5 : 1);
      for (let i = 0; i < DN.tier(c) && o.hp > 0; i++) { beam(x, c, o, '#b98aff', 2); strike(x, c, o, k); }
    } },
    // 지옥 던지기: 최강 적 매력 내성 — 실패하면 ×12 · 기절 2초
    sr_hurl: { when: W.seen, run(c, x) {
      const o = strong(x);
      G.fx(x.rt, { k: 'tile', key: 'fx_fire', x: o.x, y: o.y, t: 0.8, s: 2 });
      if (!saveHit(x, c, o, 'cha', 12, false)) o.stun = Math.max(o.stun || 0, 2);
    } },
    sr_dark: { when: W.pack(2), run(c, x) { const tg = pick(x); persist(c, 'dark', 8, { x: tg.x, y: tg.y }); } },
    sr_fear: { when: W.close(4), run(c, x) { ring(x, c, 4, '#9a5ad0'); for (const o of near(x, c, 4)) cond(x, c, o, 'wis', 'frightened', 6); } },
    sr_vtouch: { when: W.close(4), run(c, x) {
      const o = nearest(x, c, 4), hp0 = o.hp;
      beam(x, c, o, '#ff5a7a', 3);
      if (strike(x, c, o, 4).hit) c.hp = Math.min(c.max, c.hp + Math.min(c.max * 0.3, Math.max(0, hp0 - Math.max(0, o.hp)) * 0.5));
    } },
    // ── 위저드 ──
    sr_rof: { when: W.seen, run(c, x) { const o = pick(x); beam(x, c, o, '#bfe8ff', 3); if (strike(x, c, o, evo(c, 2.5 * DN.tier(c))).hit) o.shock = Math.max(o.shock || 0, 2); } },
    sr_mm: { when: W.seen, run(c, x) {
      const ts = x.seen.slice().sort((p, q) => p.hp - q.hp);
      for (let i = 0; i < 3; i++) { const o = ts[i % ts.length]; if (o.hp <= 0) continue; G.fx(x.rt, { k: 'proj', key: 'fx_zap', x: c.x, y: c.y, x2: o.x, y2: o.y, t: 0.2 + i * 0.05 }); F().hurt(x.f, x.rt, o, atk(x, c, evo(c, 1.5)), 'smite', c); }
    } },
    sr_misty: { when: (c, x) => c.hp < c.max * 0.4 && near(x, c, 1.5).length > 0, run(c, x) {
      const o = nearest(x, c, 1.5), dx = c.x - o.x, dy = c.y - o.y, l = Math.hypot(dx, dy) || 1;
      ring(x, c, 0.8, '#c9a6ff');
      jump(x, c, c.x + dx / l * 4, c.y + dy / l * 4);
      ring(x, c, 0.8, '#c9a6ff');
    } },
    sr_hold: { when: (c, x) => x.seen.some(o => DN.humanoid(o) && !(o.stop > 0)), run(c, x) {
      const os = x.seen.filter(o => DN.humanoid(o) && !(o.stop > 0)).sort((p, q) => q.hp - p.hp).slice(0, F().sk(c, 'sr_twin') ? 2 : 1);
      for (const o of os) { beam(x, c, o, '#c9a6ff', 2); cond(x, c, o, 'wis', 'paralyzed', 4); }
    } },
    sr_web: { when: W.pack(2), run(c, x) { const tg = pick(x); ring(x, tg, 2, '#e8e8e8'); for (const o of near(x, tg, 2)) cond(x, c, o, 'dex', 'restrained', 6); } },
    sr_haste: { when: W.fight, run(c, x) {
      const p = alive(x).filter(p => !p.def?.heal).sort((p, q) => (q.kind === 'ally' ? F().allyAtk(x.f, q) : 0) - (p.kind === 'ally' ? F().allyAtk(x.f, p) : 0))[0];
      DN.buff(p, 'haste', 10, { ac: 2, cd: 0.5 });
      ring(x, p, 0.9, '#8fd8ff');
    } },
    sr_slow: { when: W.pack(2), run(c, x) {
      const tg = pick(x);
      ring(x, tg, 3, '#8fd8ff');
      for (const o of near(x, tg, 3).slice(0, 6)) if (!DN.save(o, 'wis', DN.dc(c))) { o.shock = Math.max(o.shock || 0, 8); DN.buff(o, 'slow', 8, { ac: -2 }); }
    } },
    sr_cone: { when: W.close(4), run(c, x) { ring(x, c, 4, '#bfe8ff'); for (const o of near(x, c, 4)) saveHit(x, c, o, 'con', evo(c, 8)); sfx('chime'); } },
    sr_meteor: { when: W.seen, run(c, x) {
      const tg = strong(x);
      G.fx(x.rt, { k: 'tile', key: 'fx_fire', x: tg.x, y: tg.y, t: 0.9, s: 3.5 });
      G.J.shake('fantasy', 10, 0, 1, 0.35);
      for (const o of near(x, tg, 3)) saveHit(x, c, o, 'dex', evo(c, 30));
      sfx('boom');
    } },
  });

  // 이어지는 효과: 시전자 몸마다 (G.Skill.tick 앞에서)
  G.Skill.persist = (f, rt, c, dt) => {
    // 늘 켜진 것: 생존자 (절반 아래 초당 2%) · 지치지 않음 (싸우는 동안 10초마다 임시 체력 10%) · 신성한 후광 (2칸 안 적 초당)
    if (c.merc && !c.dead) {
      // 재생 (마법 물건)
      const rg = G.Trinket.sum(c.merc, 'regen');
      if (rg && c.hp < c.max) c.hp = Math.min(c.max, c.hp + c.max * rg * dt);
      if (F().sk(c, 'sr_survivor') && c.hp < c.max * 0.5) c.hp = Math.min(c.max, c.hp + c.max * 0.02 * dt);
      const fighting = rt.mons.some(o => o.aggro && GR.dist(o, c) <= 8);
      if (F().sk(c, 'sr_tireless') && fighting && !(c.tireT > now())) { c.tireT = now() + 10; c.thp = Math.max(c.thp || 0, c.max * 0.1); }
      if (F().sk(c, 'sr_nimbus') && fighting && !(c.nimT > now())) { c.nimT = now() + 1; for (const o of rt.mons.filter(o => GR.dist(o, c) <= 2)) F().hurt(f, rt, o, F().allyAtk(f, c), 'dot', c); }
    }
    if (!c.pe || !c.pe.length) return;
    const x = { f, rt, seen: rt.mons.filter(o => F().inView(rt, o.x, o.y)) };
    for (const e of c.pe) {
      e.t -= dt;
      e.tick -= dt;
      if (e.k === 'wild') { if (e.t <= 0 && c.wild) { c.t = c.wild.t; c.def = c.wild.def; c.wild = null; c.thp = 0; } continue; }
      if (e.tick > 0) continue;
      if (e.k === 'sw') {
        // 영적 무기: 1초마다 시전자 곁(6칸) 적 하나에 명중 굴림
        e.tick = 1;
        const o = nearest(x, c, 6);
        if (o) { G.fx(rt, { k: 'tile', key: 'w_holymace', x: o.x - 0.4, y: o.y - 0.5, t: 0.35 }); strike(x, c, o, 1); }
      } else if (e.k === 'sg') {
        // 영혼 수호자: 1초마다 3칸 안 적 지혜 내성 · 느려짐
        e.tick = 1;
        if (Math.random() < 0.5) ring(x, c, 3, 'rgba(255,243,196,0.5)');
        for (const o of near(x, c, 3)) { saveHit(x, c, o, 'wis', 1); o.shock = Math.max(o.shock || 0, 1.2); }
      } else if (e.k === 'moon') {
        // 월광: 표적을 따라간다(죽으면 가장 센 적) · 1초마다 1칸 안 건강 내성
        e.tick = 1;
        if (!e.tg || e.tg.hp <= 0) e.tg = x.seen.slice().sort((p, q) => q.hp - p.hp)[0];
        if (!e.tg) continue;
        G.fx(rt, { k: 'tile', key: 'fx_holy', x: e.tg.x, y: e.tg.y, t: 0.6, s: 1.4 });
        for (const o of near(x, e.tg, 1)) saveHit(x, c, o, 'con', 1.5);
      } else if (e.k === 'call') {
        // 번개 부르기: 1.5초마다 보이는 적 하나 자리에 1칸 민첩 내성
        e.tick = 1.5;
        const o = U.pick(x.seen);
        if (!o) continue;
        G.fx(rt, { k: 'bolt', x: o.x, y: o.y, t: 0.3, col: '#8fd8ff' });
        for (const q of near(x, o, 1)) saveHit(x, c, q, 'dex', 3);
      } else if (e.k === 'dark') {
        // 어둠: 0.5초마다 2칸 안 적 실명
        e.tick = 0.5;
        G.fx(rt, { k: 'ring', x: e.x, y: e.y, r: 2, t: 0.5, col: 'rgba(40,20,60,0.8)' });
        for (const o of rt.mons) if (Math.hypot(o.x - e.x, o.y - e.y) <= 2) DN.give(rt, o, 'blinded', 0.8, c);
      }
    }
    c.pe = c.pe.filter(e => e.t > 0);
  };
})();
