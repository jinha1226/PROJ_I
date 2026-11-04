'use strict';
// SRD 직업 기술 · 주문 효과 (DESIGN.md 56 ②): G.D.MSKILLS의 sr_* — G.Skill.SK에 더한다.
// 규칙대로 굴린다: 명중 주문은 d20 vs AC, 범위 · 상태이상 주문은 맞는 쪽 내성(실패하면 다 · 성공하면 절반 또는 없음).
// 몇 초 이어지는 것(영적 무기 · 영혼 수호자 · 월광 · 번개 부르기 · 어둠 · 야생 변신)은 시전자 몸에 c.pe로 달고 G.Skill.tick이 돌린다.
(() => {
  const U = G.U, GR = G.Grid, DN = G.Dnd;
  const F = () => G.Fantasy, P = () => G.Skill.pow;
  const now = () => G.S.runTime;
  // ── 피해 · 치유는 SRD 주사위: [개수, 면, 더함]. 장비 · 트리 · 스킬 레벨 배율은 그 위에 곱한다 ──
  const G0 = (x, c) => F().allyAtk(x.f, c) / Math.max(1, DN.avg(DN.weapon(c))) * P()(c) * G.Turn.skK(x.rt);
  const roll = (s, crit) => (G.Skill.maxDice ? s[0] * (crit ? 2 : 1) * s[1] + (s[3] ? s[3][0] * (crit ? 2 : 1) * s[3][1] : 0) : DN.dice(s[0] * (crit ? 2 : 1), s[1]) + (s[3] ? DN.dice(s[3][0] * (crit ? 2 : 1), s[3][1]) : 0)) + (s[2] || 0); // s[3]: 둘째 주사위 (얼음 폭풍 · 유성 폭풍)
  const dmg = (x, c, s, crit) => Math.max(1, roll(s, crit)) * G0(x, c);
  const avgS = s => s[0] * (s[1] + 1) / 2 + (s[2] || 0);
  const R6 = n => n * G.Res_ROUND * (G.Skill.ext && n >= 10 ? 2 : 1); // 라운드 → 초 (연장 주문: 1분 이상만 2배)
  const pmod = c => DN.mod(DN.ab(c.merc)[DN.cls(c.merc).pri]);
  const tierS = (c, s) => [s[0] * DN.tier(c), s[1], s[2] || 0];
  const lvUp = (x, s, per) => [s[0] + Math.max(0, (x.slot || 1) - (x.base || 1)) * per, s[1], s[2] || 0]; // 높은 슬롯: 주사위가 늘어난다
  const near = (x, p, r) => { const lim = x.reach === 1.5 && p === x.c ? 1.5 : r; return x.rt.mons.filter(o => GR.dist(o, p) <= lim); };
  const pick = x => { const t = x.rt.focus; return t && t.hp > 0 && x.seen.includes(t) ? t : G.Tactics.pick(x.rt, x.seen, x.c); };
  const strong = x => (G.Tactics.of(x.c).target === 'near' ? x.seen.slice().sort((p, q) => q.hp - p.hp)[0] : G.Tactics.pick(x.rt, x.seen, x.c));
  const nearest = (x, c, r) => F().nearestMon(x.rt, c, r);
  const beam = (x, a, b, col, w = 3) => G.fx(x.rt, { k: 'beam', x: a.x, y: a.y, x2: b.x, y2: b.y, col, w, t: 0.25 });
  const ring = (x, p, r, col) => G.fx(x.rt, { k: 'ring', x: p.x, y: p.y, r, t: 0.5, col });
  const say = (x, c, s, col) => G.fx(x.rt, { k: 'text', x: c.x, y: c.y - 1.2, s, col, t: 1.1, sz: 1, pop: true });
  const sfx = k => G.J.sfx('fantasy', k);
  const jump = (x, c, tx, ty) => { if (GR.pass(x.rt.map, Math.round(tx), Math.round(ty))) { c.x = tx; c.y = ty; } };
  const push = (x, c, o, d) => { const dx = o.x - c.x, dy = o.y - c.y, l = Math.hypot(dx, dy) || 1; jump(x, o, o.x + dx / l * d, o.y + dy / l * d); };
  const alive = x => x.rt.party.filter(p => !p.dead && (x.reach == null || Math.hypot(p.x - x.c.x, p.y - x.c.y) <= x.reach));
  const alive2 = x => x.rt.party.filter(p => p.dying && Math.hypot(p.x - x.c.x, p.y - x.c.y) <= x.reach);
  const lowest = (x, r) => alive(x).filter(p => !p.noHeal && p.hp < p.max * Math.min(r, G.Tactics.healAt(x.c) === 0.35 ? 0.35 : r)).sort((p, q) => p.hp / p.max - q.hp / q.max)[0];
  // 치유: 주사위 + 시전 능력 (생명의 제자: 2 + 슬롯 레벨). 체력 배율만큼 함께 자란다
  const heal = (x, c, p, s) => { const k = p.merc ? p.max / Math.max(1, DN.srdHP(p.merc)) : 1, amt = (Math.max(1, F().sk(c, 'ft_supreme') ? s[0] * s[1] + (s[2] || 0) : roll(s)) + (F().sk(c, 'sr_disciple') ? 2 + (x.slot || 1) : 0)) * k * (c.merc ? G.Guild.mult(c.merc, 'heal') : 1); if (p !== c && F().sk(c, 'ft_bhealer')) c.hp = Math.min(c.max, c.hp + (2 + (x.slot || 1)) * (c.merc ? c.max / Math.max(1, DN.srdHP(c.merc)) : 1)); p.hp = Math.min(p.max, p.hp + amt); G.fx(x.rt, { k: 'tile', key: 'fx_holy', x: p.x, y: p.y, t: 0.7 }); };
  const fireB = (c, s) => (F().sk(c, 'sr_affinity') ? [s[0], s[1], (s[2] || 0) + pmod(c), s[3]] : s); // 원소 친화: 화염 + 매력
  const evo = (c, s) => (F().sk(c, 'sr_empower') ? [s[0], s[1], (s[2] || 0) + pmod(c), s[3]] : s); // 강화된 방출: 방출계 + 지능
  // 명중 주문: 굴려서 맞으면 주사위 (치명타는 주사위 두 배)
  const strike = (x, c, o, s, src = 'smite') => {
    const r = DN.attack(c, o);
    if (!r.hit) { DN.miss(x.rt, o); if (F().sk(c, 'sr_potent')) F().hurt(x.f, x.rt, o, dmg(x, c, s) / 2, 'hit', c); return r; }
    F().hurt(x.f, x.rt, o, dmg(x, c, s, r.crit), r.crit ? 'crit' : src, c);
    return r;
  };
  // 무기 공격 (추가 공격 횟수만큼): extra = 맞을 때마다 더하는 주사위 · then = 맞은 뒤
  const weaponAtk = (x, c, o, extra, then) => {
    const w = DN.weapon(c), base = [w.n, w.d, w.b + DN.bsum(c, 'dmgB')]; let any = null;
    for (let i = 0; i < DN.attacks(c) && o.hp > 0; i++) {
      if (Math.hypot(o.x - c.x, o.y - c.y) > Math.max(c.def.range || 0, 1.5) + 0.3) break; // 밀려나 닿지 않으면 남은 공격은 못 한다
      const r = DN.attack(c, o); if (!any || r.hit) any = r;
      if (!r.hit) { DN.miss(x.rt, o); continue; }
      DN.dieMin = DN.melee(c) && F().sk(c, 'fs_gwf') ? 3 : 0; let d = dmg(x, c, base, r.crit); DN.dieMin = 0; if (extra) d += dmg(x, c, extra, r.crit);
      const sn = Math.max(0, DN.sneak(x.rt, c, o, r.adv) - (c.snMinus || 0)); if (sn) d += DN.dice(sn * (r.crit ? 2 : 1), 6) * G0(x, c); d += DN.frenzy(c) * G0(x, c);
      F().hurt(x.f, x.rt, o, d, r.crit ? 'crit' : 'hit', c);
      if (o.hp > 0) G.Skill.onHit(x.f, x.rt, c, o);
      if (then && o.hp > 0) then(r);
    }
    return any || { hit: false };
  };
  // 내성 주문: 실패하면 다 · half면 성공 때 절반. 성공했는지 돌려준다
  const saveHit = (x, c, o, ab, s, half = true) => {
    const ok = DN.save(o, ab, DN.dc(c)), d = dmg(x, c, s);
    const v = ok ? (half || F().sk(c, 'sr_potent') ? d / 2 : 0) : d;
    if (v > 0) F().hurt(x.f, x.rt, o, v, 'smite', c);
    return ok;
  };
  // 상태이상 주문: 내성 실패면 건다 (n라운드)
  const cond = (x, c, o, ab, k, n) => {
    if (o.hp <= 0 || DN.save(o, ab, DN.dc(c))) { G.fx(x.rt, { k: 'text', x: o.x, y: o.y - 1, s: '저항', col: '#9aa0a8', t: 0.7, sz: 0.7 }); return false; }
    if (k === 'stunned' || k === 'paralyzed') {
      const f = k === 'stunned' ? 'stun' : 'stop';
      o[f] = Math.max(o[f] || 0, n * 6);
      G.fx(x.rt, { k: 'text', x: o.x, y: o.y - 1.1, s: DN.COND[k].n, col: '#c9a6ff', t: 1, sz: 0.85, pop: true });
      G.Combo.on(x.f, x.rt, f, c, o);
    } else DN.give(x.rt, o, k, R6(n), c);
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
  const persist = (c, k, t, extra) => { (c.pe = c.pe || []).push(Object.assign({ k, t, tick: 0 }, extra)); };
  const SL = n => ({ slot: n }), LONG = n => ({ long: n }), SHORT = n => ({ short: n }), FOCUS = n => ({ focus: n });
  const chaUses = m => Math.max(1, DN.mod(DN.ab(m).cha)), wisUses = m => Math.max(1, DN.mod(DN.ab(m).wis)), profUses = m => DN.prof(m.lv);
  // base = 주문 원래 레벨 · bonus = 추가 행동 · conc = 집중 (SRD)
  Object.assign(G.Skill.SK, {
    // ── 공용 주문 ──
    sr_cure: { heal: true, res: SL(1), base: 1, when: W.low(0.5), run(c, x) { heal(x, c, lowest(x, 0.5), lvUp(x, [2, 8, pmod(c)], 2)); sfx('bell'); } },
    sr_hword: { heal: true, res: SL(1), base: 1, bonus: true, when: W.low(0.6), run(c, x) { const p = lowest(x, 0.6); beam(x, c, p, '#9fe79f', 2); heal(x, c, p, lvUp(x, [2, 4, pmod(c)], 2)); } },
    sr_bless: { res: SL(1), base: 1, conc: true, when: W.fight, run(c, x) { for (const p of alive(x).sort((p, q) => GR.dist(p, c) - GR.dist(q, c)).slice(0, 3)) { G.Res.concOn(c, p, 'bless', R6(10), { hit: 2.5, save: 2.5 }); ring(x, p, 0.8, '#ffe08a'); } } },
    sr_spike: { res: SL(2), base: 2, conc: true, when: W.pack(2), run(c, x) { const tg = pick(x); x.rt.fields.push({ x: tg.x, y: tg.y, r: 4, t: R6(10), dps: avgS([2, 4]) * G0(x, c) / G.Res_ROUND, key: 'q_herb', c }); ring(x, tg, 4, '#7fcf8a'); } },
    sr_fireball: { res: SL(3), base: 3, when: W.pack(2), run(c, x) {
      const tg = pick(x), s = fireB(c, evo(c, lvUp(x, [8, 6], 1)));
      G.fx(x.rt, { k: 'proj', key: 'fx_fire', x: c.x, y: c.y, x2: tg.x, y2: tg.y, t: 0.25 });
      G.fx(x.rt, { k: 'tile', key: 'fx_fire', x: tg.x, y: tg.y, t: 0.6, s: 2.2 });
      for (const o of near(x, tg, 4)) saveHit(x, c, o, 'dex', s);
      sfx('boom');
    } },
    // ── 바바리안 ──
    sr_rage: { res: { rage: 1 }, bonus: true, when: (c, x) => W.fight(c, x) && !DN.bon(c, 'rage'), run(c, x) { DN.buff(c, 'rage', R6(10), { dmgB: G.Res.rageDmg(c.merc.lv) }); if (F().sk(c, 'ft_pounce')) DN.buff(c, 'pounce', R6(1), { moveK: 0.5 }); ring(x, c, 1, '#ff5a3a'); say(x, c, '격노', '#ff5a3a'); } },
    sr_reckless: { free: true, when: (c, x) => W.close(1.8)(c, x) && !DN.bon(c, 'reckless'), run(c, x) { DN.buff(c, 'reckless', R6(1), { adv: 1, hitAdv: 1 }); ring(x, c, 0.9, '#ff8a3a'); } },
    // 잔혹한 일격 (SRD): 이점을 포기하고 한 번 +1d10 (17레벨 2d10) + 효과 하나 (17레벨 둘). 13레벨부터 비틀거림 · 가르기
    sr_brutal: { when: (c, x) => W.close(1.8)(c, x) && DN.bon(c, 'reckless'), run(c, x) { const o = nearest(x, c, 1.8), L = c.merc.lv; DN.buff(c, 'reckless', 0, {}); let done = false; weaponAtk(x, c, o, null, () => { if (done) return; done = true;
      F().hurt(x.f, x.rt, o, DN.dice(F().sk(c, 'ft_ibrutal2') ? 2 : 1, 10) * G0(x, c), 'extra', c); if (o.hp <= 0) return;
      const others = x.rt.party.filter(p => p !== c && !p.dead), fx = [];
      if (F().sk(c, 'ft_ibrutal') && others.length) { DN.buff(o, 'sunder', R6(1), { by: 0 }); o.sunderBy = c; fx.push('가르기'); }
      if (F().sk(c, 'ft_ibrutal') && (fx.length === 0 || F().sk(c, 'ft_ibrutal2'))) { DN.buff(o, 'stagger', R6(1), {}); fx.push('비틀거림'); }
      if (!fx.length || (F().sk(c, 'ft_ibrutal2') && fx.length < 2)) { if (others.some(p => Math.hypot(p.x - o.x, p.y - o.y) <= 1.8)) { push(x, c, o, 3); fx.push('밀침'); } else { o.shock = Math.max(o.shock || 0, 6); fx.push('느려짐'); } }
      say(x, o, fx.join(' · '), '#ff8a3a'); }); } },
    sr_intim: { res: LONG(1), bonus: true, when: W.close(6, 2), run(c, x) { ring(x, c, 6, '#ff5a3a'); for (const o of near(x, c, 6)) cond(x, c, o, 'wis', 'frightened', 10); } },
    // ── 파이터 ──
    sr_second: { res: SHORT(m => (m.lv >= 10 ? 4 : m.lv >= 4 ? 3 : 2)), bonus: true, when: W.self(0.5), run(c, x) { heal(x, c, c, [1, 10, c.merc.lv]); if (F().sk(c, 'ft_tshift')) G.Opt.shift(x, c); } },
    sr_surge: { res: SHORT(m => (m.lv >= 17 ? 2 : 1)), free: true, when: (c, x) => !!nearest(x, c, c.def.range + 0.5), run(c, x) { say(x, c, '쇄도', '#ffe08a'); F().allyAttack(x.f, x.rt, c, nearest(x, c, c.def.range + 0.5)); } },
    sr_cleave: { when: W.close(1.8, 2), run(c, x) { const o = nearest(x, c, 1.8), o2 = x.rt.mons.find(q => q !== o && q.hp > 0 && GR.dist(q, c) <= 1.8); weaponAtk(x, c, o); if (o2) strike(x, c, o2, (w => [w.n, w.d])(DN.weapon(c)), 'hit'); } },
    sr_topple: { when: W.close(1.8), run(c, x) { const o = nearest(x, c, 1.8); weaponAtk(x, c, o, null, () => { if (!DN.has(o, 'prone')) cond(x, c, o, 'con', 'prone', 1); }); } },
    sr_push: { when: W.close(1.8), run(c, x) { const o = nearest(x, c, 1.8); weaponAtk(x, c, o, null, () => push(x, c, o, 2)); } },
    sr_sap: { when: W.close(1.8), run(c, x) { const o = nearest(x, c, 1.8); weaponAtk(x, c, o, null, () => DN.give(x.rt, o, 'sapped', R6(1), c)); } },
    // ── 로그 ──
    sr_cunning: { bonus: true, when: (c, x) => W.seen(c, x) && !DN.bon(c, 'cunning'), run(c, x) { const o = x.seen.slice().sort((p, q) => p.hp - q.hp)[0]; beam(x, c, o, '#b98aff', 2); jump(x, c, o.x + (c.x > o.x ? -0.8 : 0.8), o.y); DN.buff(c, 'cunning', R6(1), { adv: 1 }); } },
    sr_steady: { bonus: true, when: (c, x) => W.seen(c, x) && !DN.bon(c, 'steady'), run(c, x) { DN.buff(c, 'steady', R6(1), { adv: 1 }); ring(x, c, 0.7, '#ffd24a'); } },
    // 교활한 일격 (SRD): 기습 주사위를 줄여 효과. 위험하면 물러나기, 아니면 중독 · 넘어뜨리기. 11레벨부터 효과 둘
    sr_cstrike: { when: W.close(2), run(c, x) { const o = nearest(x, c, 2), two = F().sk(c, 'ft_icunning'), low = c.hp < c.max * 0.4; c.snMinus = two ? 2 : 1; let done = false; weaponAtk(x, c, o, null, () => { if (done) return; done = true; const eff = [].concat(low ? ['out'] : [], DN.has(o, 'poisoned') ? [] : ['poison'], DN.has(o, 'prone') ? [] : ['trip']).slice(0, two ? 2 : 1); for (const e of eff) { if (o.hp <= 0) break; if (e === 'poison') cond(x, c, o, 'con', 'poisoned', 10); else if (e === 'trip') cond(x, c, o, 'dex', 'prone', 1); else G.Opt.away(x, c, 3); } }); c.snMinus = 0; } },
    // 교묘한 일격 (SRD): 무리에서 하나를 재운다(6d6) · 눈을 가린다(3d6) · 멍하게 한다(2d6). 기습 주사위가 남을 때만
    sr_devious: { when: W.close(2), run(c, x) { const o = nearest(x, c, 2), sn = Math.ceil(c.merc.lv / 2), many = x.rt.mons.filter(q => q.hp > 0 && q.aggro).length >= 2, k = sn >= 7 && many && !o.boss ? 'ko' : sn >= 4 && !DN.has(o, 'blinded') ? 'blind' : 'daze'; c.snMinus = { ko: 6, blind: 3, daze: 2 }[k]; let done = false; weaponAtk(x, c, o, null, () => { if (done || o.hp <= 0) return; done = true; if (k === 'ko') { if (cond(x, c, o, 'con', 'paralyzed', 10)) { o.koHit = true; say(x, o, '기절', '#c9a6ff'); } } else if (k === 'blind') cond(x, c, o, 'dex', 'blinded', 1); else if (!DN.save(o, 'con', DN.dc(c))) { DN.buff(o, 'daze', R6(1), {}); say(x, o, '멍함', '#c9a6ff'); } }); c.snMinus = 0; } },
    // ── 몽크 ──
    sr_flurry: { res: FOCUS(1), bonus: true, when: W.close(1.8), run(c, x) {
      const o = nearest(x, c, 1.8), w = DN.weapon(c);
      for (let i = 0; i < (c.merc.lv >= 10 ? 3 : 2) && o.hp > 0; i++) { G.fx(x.rt, { k: 'slash', x: o.x, y: o.y, t: 0.2, rot: Math.random() - 0.5, flip: i % 2 === 0 }); if (strike(x, c, o, [w.n, w.d, w.b], 'hit').hit && F().sk(c, 'sr_ohtech') && !DN.has(o, 'prone')) cond(x, c, o, 'dex', 'prone', 1); }
    } },
    sr_patient: { res: FOCUS(1), bonus: true, when: (c, x) => W.close(1.8)(c, x) && !DN.bon(c, 'dodge'), run(c, x) { DN.buff(c, 'dodge', R6(1), { hitDis: 1 }); ring(x, c, 0.9, '#e8c860'); } },
    sr_wind: { res: FOCUS(1), bonus: true, when: (c, x) => x.seen.some(o => GR.dist(o, c) > 3 && GR.dist(o, c) <= 8), run(c, x) { const o = x.seen.filter(o => GR.dist(o, c) > 3 && GR.dist(o, c) <= 8).sort((p, q) => q.hp - p.hp)[0]; beam(x, c, o, '#e8c860', 3); jump(x, c, o.x + (c.x > o.x ? 0.8 : -0.8), o.y); } },
    sr_stun: { res: FOCUS(1), when: W.close(1.8), run(c, x) { const o = x.seen.filter(q => GR.dist(q, c) <= 1.8 && !(q.stun > 0)).sort((p, q) => q.hp - p.hp)[0]; if (!o) return false; weaponAtk(x, c, o, null, () => cond(x, c, o, 'con', 'stunned', 1)); } },
    sr_whole: { res: LONG(wisUses), bonus: true, when: W.self(0.5), run(c, x) { heal(x, c, c, [1, DN.weapon(c).d, DN.mod(DN.ab(c.merc).wis)]); } },
    sr_quiver: { res: FOCUS(4), when: W.close(2), run(c, x) { const o = near(x, c, 2).sort((p, q) => q.hp - p.hp)[0]; if (!DN.attack(c, o).hit) return DN.miss(x.rt, o); G.fx(x.rt, { k: 'impact', x: o.x, y: o.y, s: 2, col: '#e8c860', t: 0.3 }); saveHit(x, c, o, 'con', [10, 12]); G.J.shake('fantasy', 8, 0, 1, 0.25); } },
    // ── 팔라딘 ──
    sr_lay: { bonus: true, when: (c, x) => W.low(0.5)(c, x) && (G.Res.of(c.merc).sp.lay ?? 5 * c.merc.lv) > 0, run(c, x) { const p = lowest(x, 0.5), s = G.Res.of(c.merc), pool = s.sp.lay ?? 5 * c.merc.lv, k = p.merc ? p.max / Math.max(1, DN.srdHP(p.merc)) : 1, need = Math.ceil((p.max - p.hp) / k), use = Math.min(pool, need); s.sp.lay = pool - use; beam(x, c, p, '#fff3c4', 2); heal(x, c, p, [0, 1, use]); if (F().sk(c, 'ft_restore')) p.cond = {}; } }, // 5.2.1: 5 × 레벨 저장고
    sr_sof: { res: SL(1), base: 1, bonus: true, conc: true, when: (c, x) => W.fight(c, x) && !alive(x).some(p => DN.bon(p, 'sof')), run(c, x) { const p = alive(x).sort((p, q) => p.hp / p.max - q.hp / q.max)[0]; G.Res.concOn(c, p, 'sof', R6(10), { ac: 2 }); ring(x, p, 0.9, '#8fc4ef'); } },
    // ── 맞힌 뒤에 붙는 기술 (SRD): 무기 공격이 맞으면 G.Skill.onHit이 부른다 ──
    sr_smite: { res: { slot: 1 }, base: 1, bonus: true, rider(c, x, o) { const s = lvUp(x, [2 + (DN.undead(o) || DN.fiend(o) ? 1 : 0), 8], 1); G.Foe.dtype = 'radiant'; F().hurt(x.f, x.rt, o, dmg(x, c, s), 'smite', c); G.Foe.dtype = null; G.fx(x.rt, { k: 'impact', x: o.x, y: o.y, s: 1.8, col: '#fff3c4', t: 0.25 }); if (F().sk(c, 'ft_sprotect')) for (const p of alive(x)) DN.buff(p, 'sprot', R6(1), { ac: 2 }); } },
    sr_searing: { res: SL(1), base: 1, bonus: true, rider(c, x, o) { G.Foe.dtype = 'fire'; F().hurt(x.f, x.rt, o, dmg(x, c, lvUp(x, [1, 6], 1)), 'smite', c); G.Foe.dtype = null; if (o.hp > 0) F().inflict(x.f, x.rt, o, 'burn', R6(2), c, avgS([1, 6]) * G0(x, c) / G.Res_ROUND); } },
    sr_sacred: { res: SHORT(m => (m.lv >= 11 ? 3 : 2)), free: true, when: (c, x) => W.fight(c, x) && !DN.bon(c, 'sacred'), run(c, x) { DN.buff(c, 'sacred', R6(10), { hit: Math.max(1, DN.mod(DN.ab(c.merc).cha)) }); ring(x, c, 1, '#fff3c4'); } },
    // ── 레인저 · 워락: 표식 (내가 맞히면 +1d6, F.hurt) ──
    sr_hmark: { res: { long: m => (m.lv >= 17 ? 6 : m.lv >= 13 ? 5 : m.lv >= 9 ? 4 : m.lv >= 5 ? 3 : 2) }, base: 1, bonus: true, conc: true, when: (c, x) => x.seen.some(o => !(o.hm && o.hm.by === c && o.hm.until > now())) && !x.seen.some(o => o.hm && o.hm.by === c && o.hm.until > now()), run(c, x) { const o = strong(x); o.hm = { by: c, until: now() + R6(100) }; G.Combo.on(x.f, x.rt, 'hm', c, o); beam(x, c, o, '#ff5a3a', 1); } },
    sr_hex: { res: SL(1), base: 1, bonus: true, conc: true, when: (c, x) => x.seen.some(o => !(o.hm && o.hm.by === c && o.hm.until > now())) && !x.seen.some(o => o.hm && o.hm.by === c && o.hm.until > now()), run(c, x) { const o = strong(x); o.hm = { by: c, until: now() + R6(100) }; G.Combo.on(x.f, x.rt, 'hm', c, o); beam(x, c, o, '#9a5ad0', 1); } },
    sr_ensnare: { res: SL(1), base: 1, bonus: true, conc: true, rider(c, x, o) { cond(x, c, o, 'str', 'restrained', 2); } },
    // ── 클레릭 ──
    sr_gbolt: { res: SL(1), base: 1, when: W.seen, run(c, x) { const o = strong(x); beam(x, c, o, '#fff3c4', 3); if (strike(x, c, o, lvUp(x, [4, 6], 1)).hit && o.hp > 0) DN.give(x.rt, o, 'outlined', R6(1), c); } },
    sr_sflame: { when: W.seen, run(c, x) { const o = pick(x); G.fx(x.rt, { k: 'tile', key: 'fx_holy', x: o.x, y: o.y, t: 0.6, s: 1.3 }); saveHit(x, c, o, 'dex', tierS(c, [1, 8]), false); } },
    sr_turn: { res: SHORT(m => (m.lv >= 18 ? 4 : m.lv >= 6 ? 3 : 2)), when: (c, x) => x.seen.some(o => DN.undead(o) && GR.dist(o, c) <= 6), run(c, x) { ring(x, c, 6, '#fff3c4'); for (const o of x.seen.filter(o => DN.undead(o) && GR.dist(o, c) <= 6)) if (cond(x, c, o, 'wis', 'frightened', 10)) o.stun = Math.max(o.stun || 0, 6); } },
    sr_sweapon: { res: SL(2), base: 2, bonus: true, conc: true, when: (c, x) => W.fight(c, x) && !(c.pe || []).some(e => e.k === 'sw'), run(c, x) { persist(c, 'sw', 60, { conc: true }); } },
    sr_guard: { res: SL(3), base: 3, conc: true, when: W.close(3), run(c, x) { persist(c, 'sg', 60, { conc: true, slot: x.slot }); ring(x, c, 3, '#fff3c4'); } },
    sr_revive: { res: SL(3), base: 3, when: (c, x) => alive2(x).length > 0, run(c, x) { const p = alive2(x)[0]; G.Story.wake(x.f, x.rt, p, 1 / Math.max(1, p.max)); beam(x, c, p, '#fff3c4'); G.fx(x.rt, { k: 'tile', key: 'fx_holy', x: p.x, y: p.y, t: 0.8 }); sfx('bell'); } },
    sr_preserve: { res: SHORT(m => (m.lv >= 18 ? 4 : m.lv >= 6 ? 3 : 2)), when: (c, x) => alive(x).filter(p => !p.noHeal && p.hp < p.max * 0.5).length >= 2, run(c, x) { let pool = c.merc.lv * 5 * (c.max / Math.max(1, DN.srdHP(c.merc))); for (const p of alive(x)) if (!p.noHeal && p.hp < p.max * 0.5) { const a = Math.min(pool, p.max * 0.5 - p.hp); p.hp += a; pool -= a; G.fx(x.rt, { k: 'tile', key: 'fx_holy', x: p.x, y: p.y, t: 0.8 }); } ring(x, c, 4, '#fff3c4'); sfx('bell'); } },
    sr_mhw: { heal: true, res: SL(3), base: 3, bonus: true, when: (c, x) => { const ph = F().partyHP(x.rt); return ph.hp < ph.max * 0.6; }, run(c, x) { for (const p of alive(x).slice(0, 6)) if (!p.noHeal) heal(x, c, p, lvUp(x, [2, 4, pmod(c)], 2)); sfx('bell'); } },
    // ── 바드 ──
    sr_insp: { res: LONG(chaUses), bonus: true, when: W.fight, run(c, x) { const p = alive(x).filter(p => p !== c && p.kind === 'ally' && !DN.bon(p, 'insp')).sort((p, q) => F().allyAtk(x.f, q) - F().allyAtk(x.f, p))[0]; if (!p) return false; const d = c.merc.lv >= 15 ? 12 : c.merc.lv >= 10 ? 10 : c.merc.lv >= 5 ? 8 : 6; DN.buff(p, 'insp', R6(10), { hit: (d + 1) / 2, save: (d + 1) / 2 }); beam(x, c, p, '#e0a040', 2); G.fx(x.rt, { k: 'tile', key: 'fx_song', x: p.x, y: p.y - 0.8, t: 0.8 }); } },
    sr_faerie: { res: SL(1), base: 1, conc: true, when: W.pack(2), run(c, x) { const tg = pick(x); ring(x, tg, 2, '#e08aff'); for (const o of near(x, tg, 2)) cond(x, c, o, 'dex', 'outlined', 10); } },
    sr_mock: { when: W.seen, run(c, x) { const o = strong(x); beam(x, c, o, '#ff8a6a', 1); if (!saveHit(x, c, o, 'wis', tierS(c, [1, 6]), false)) DN.give(x.rt, o, 'sapped', R6(1), c); } },
    sr_whisper: { res: SL(1), base: 1, when: W.seen, run(c, x) { const o = strong(x); beam(x, c, o, '#c9a6ff', 2); if (!saveHit(x, c, o, 'wis', lvUp(x, [3, 6], 1))) DN.give(x.rt, o, 'frightened', R6(1), c); } },
    sr_tw: { res: SL(1), base: 1, when: W.close(2), run(c, x) { ring(x, c, 2, '#8fd8ff'); for (const o of near(x, c, 2)) if (!saveHit(x, c, o, 'con', lvUp(x, [2, 8], 1))) push(x, c, o, 2); G.J.shake('fantasy', 5, 0, 1, 0.15); } },
    sr_sleep: { res: SL(1), base: 1, conc: true, when: W.seen, run(c, x) { const tg = pick(x); ring(x, tg, 1, '#c9a6ff'); for (const o of near(x, tg, 1).filter(o => !DN.undead(o) && o.ty !== 'construct')) cond(x, c, o, 'wis', 'stunned', 2); } }, // 5.2.1: 5피트 반경, 지혜 내성, 행동 불능
    sr_shatter: { res: SL(2), base: 2, when: W.pack(2), run(c, x) { const tg = pick(x); G.fx(x.rt, { k: 'impact', x: tg.x, y: tg.y, s: 2, col: '#8fd8ff', t: 0.3 }); for (const o of near(x, tg, 2)) saveHit(x, c, o, 'con', lvUp(x, [3, 8], 1)); } },
    sr_hypno: { res: SL(3), base: 3, conc: true, when: W.pack(3), run(c, x) { const tg = pick(x); ring(x, tg, 3, '#e08aff'); for (const o of near(x, tg, 3)) cond(x, c, o, 'wis', 'stunned', 3); } },
    // ── 드루이드 ──
    sr_pflame: { when: W.seen, run(c, x) { const o = pick(x); G.fx(x.rt, { k: 'proj', key: 'fx_flame', x: c.x, y: c.y, x2: o.x, y2: o.y, t: 0.25 }); strike(x, c, o, tierS(c, [1, 8])); } },
    sr_entangle: { res: SL(1), base: 1, conc: true, when: W.pack(2), run(c, x) { const tg = pick(x); ring(x, tg, 2, '#7fcf8a'); for (const o of near(x, tg, 2)) cond(x, c, o, 'str', 'restrained', 3); } },
    sr_wild: { res: SHORT(m => (m.lv >= 17 ? 4 : m.lv >= 6 ? 3 : 2)), bonus: true, when: (c, x) => W.fight(c, x) && !c.wild, run(c, x) {
      c.wild = { t: c.t, def: c.def }; c.t = 'm_bear'; c.def = Object.assign({}, c.def, { range: 1.3, proj: null, wpn: null });
      c.thp = (c.thp || 0) + c.merc.lv * (c.max / Math.max(1, DN.srdHP(c.merc))); // 임시 체력: 드루이드 레벨
      persist(c, 'wild', R6(100)); ring(x, c, 1.2, '#7fcf8a'); G.J.shake('fantasy', 4, 0, 1, 0.15);
    } },
    sr_landaid: { heal: true, res: SHORT(m => (m.lv >= 17 ? 4 : m.lv >= 6 ? 3 : 2)), when: W.pack(2), run(c, x) { const tg = pick(x); ring(x, tg, 2, '#7fcf8a'); for (const o of near(x, tg, 2)) saveHit(x, c, o, 'con', [2, 6]); const p = lowest(x, 0.9); if (p) heal(x, c, p, [2, 6]); } },
    sr_moon: { res: SL(2), base: 2, conc: true, when: W.seen, run(c, x) { persist(c, 'moon', 60, { tg: strong(x), conc: true, slot: x.slot }); } },
    sr_call: { res: SL(3), base: 3, conc: true, when: W.fight, run(c, x) { persist(c, 'call', 60, { conc: true, slot: x.slot }); } },
    sr_ice: { res: SL(4), base: 4, when: W.pack(2), run(c, x) { const tg = pick(x); G.fx(x.rt, { k: 'ring', x: tg.x, y: tg.y, r: 4, t: 0.6, col: '#bfe8ff' }); for (const o of near(x, tg, 4)) { saveHit(x, c, o, 'dex', [2 + Math.max(0, (x.slot || 4) - 4), 10, 0, [4, 6]]); o.shock = Math.max(o.shock || 0, 6); } } },
    // ── 소서러 ──
    sr_firebolt: { when: W.seen, run(c, x) { for (const o of [pick(x)]) { G.fx(x.rt, { k: 'proj', key: 'fx_flame', x: c.x, y: c.y, x2: o.x, y2: o.y, t: 0.25 }); strike(x, c, o, fireB(c, tierS(c, [1, 10]))); } } },
    sr_chroma: { res: SL(1), base: 1, when: W.seen, run(c, x) { const ts = G.Skill.twin && x.seen.length > 1 ? (G.Skill.twinUsed = true, x.seen.slice().sort((p, q) => q.hp - p.hp).slice(0, 2)) : [strong(x)]; for (const o of ts) { G.fx(x.rt, { k: 'proj', key: 'fx_zap', x: c.x, y: c.y, x2: o.x, y2: o.y, t: 0.25 }); strike(x, c, o, lvUp(x, [3, 8], 1)); } } },
    sr_sray: { res: SL(2), base: 2, when: W.seen, run(c, x) { const ts = x.seen.slice().sort((p, q) => GR.dist(p, c) - GR.dist(q, c)), n = 3 + Math.max(0, (x.slot || 2) - 2); for (let i = 0; i < n; i++) { const o = ts[i % ts.length]; if (o.hp <= 0) continue; beam(x, c, o, '#ff8a3a', 2); strike(x, c, o, fireB(c, [2, 6])); } } },
    sr_lbolt: { res: SL(3), base: 3, when: W.seen, run(c, x) {
      const tg = pick(x), dx = tg.x - c.x, dy = tg.y - c.y, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, len = x.reach == null ? 9 : x.reach; let reach = len;
      for (let t = 0.5; t <= len; t += 0.25) if (!GR.pass(x.rt.map, Math.round(c.x + ux * t), Math.round(c.y + uy * t))) { reach = t; break; }
      const hits = x.rt.mons.filter(o => { const px = o.x - c.x, py = o.y - c.y, t = px * ux + py * uy; return t > 0 && t <= reach && Math.abs(px * uy - py * ux) < 0.8; });
      if (!hits.length) return false;
      G.fx(x.rt, { k: 'beam', x: c.x, y: c.y, x2: c.x + ux * reach, y2: c.y + uy * reach, col: '#8fd8ff', w: 4, t: 0.3 });
      for (const o of hits) saveHit(x, c, o, 'dex', evo(c, lvUp(x, [8, 6], 1)));
      sfx('smite');
    } },
    sr_chain: { res: SL(6), base: 6, when: W.pack(2), run(c, x) { const tg = strong(x), hits = F().chainFrom(x.rt, tg, 4, 3); G.fx(x.rt, { k: 'chain', pts: [[c.x, c.y], ...hits.map(o => [o.x, o.y])], col: '#8fd8ff', t: 0.3 }); for (const o of hits) saveHit(x, c, o, 'dex', evo(c, [10, 8])); sfx('smite'); } },
    // ── 워락 ──
    sr_eb: { when: (c, x) => W.seen(c, x) && !(F().sk(c, 'iv_pblade') && near(x, c, 1.8).length), run(c, x) { const o = pick(x), s = [1, 10, F().sk(c, 'sr_agon') ? pmod(c) : 0]; for (let i = 0; i < DN.tier(c) && o.hp > 0; i++) { beam(x, c, o, '#b98aff', 2); if (strike(x, c, o, s).hit && o.hp > 0 && F().sk(c, 'iv_repel')) push(x, c, o, 2); } } },
    sr_hurl: { res: LONG(1), free: true, rider(c, x, o) { G.fx(x.rt, { k: 'tile', key: 'fx_fire', x: o.x, y: o.y, t: 0.8, s: 2 }); if (!saveHit(x, c, o, 'cha', [8, 10], false)) o.stun = Math.max(o.stun || 0, 6); } },
    sr_dark: { res: SL(2), base: 2, conc: true, when: W.pack(2), run(c, x) { const tg = pick(x); persist(c, 'dark', 60, { x: tg.x, y: tg.y, conc: true }); } },
    sr_fear: { res: SL(3), base: 3, conc: true, when: W.close(4), run(c, x) { ring(x, c, 4, '#9a5ad0'); for (const o of near(x, c, 4)) cond(x, c, o, 'wis', 'frightened', 3); } },
    sr_vtouch: { res: SL(3), base: 3, conc: true, when: W.close(1.8), run(c, x) { const o = nearest(x, c, 1.8), hp0 = o.hp; beam(x, c, o, '#ff5a7a', 3); if (strike(x, c, o, lvUp(x, [3, 6], 1)).hit) c.hp = Math.min(c.max, c.hp + Math.max(0, hp0 - Math.max(0, o.hp)) * 0.5); } },
    // ── 위저드 ──
    sr_rof: { when: W.seen, run(c, x) { const o = pick(x); beam(x, c, o, '#bfe8ff', 3); if (strike(x, c, o, tierS(c, [1, 8])).hit) o.shock = Math.max(o.shock || 0, 6); } },
    sr_mm: { res: SL(1), base: 1, when: W.seen, run(c, x) { const ts = x.seen.slice().sort((p, q) => p.hp - q.hp), n = 3 + Math.max(0, (x.slot || 1) - 1); for (let i = 0; i < n; i++) { const o = ts[i % ts.length]; if (o.hp <= 0) continue; G.fx(x.rt, { k: 'proj', key: 'fx_zap', x: c.x, y: c.y, x2: o.x, y2: o.y, t: 0.2 + i * 0.05 }); F().hurt(x.f, x.rt, o, dmg(x, c, evo(c, [1, 4, 1])), 'hit', c); } } },
    sr_misty: { res: SL(2), base: 2, bonus: true, when: (c, x) => c.hp < c.max * 0.4 && near(x, c, 1.5).length > 0, run(c, x) { const o = nearest(x, c, 1.5), dx = c.x - o.x, dy = c.y - o.y, l = Math.hypot(dx, dy) || 1; ring(x, c, 0.8, '#c9a6ff'); jump(x, c, c.x + dx / l * 6, c.y + dy / l * 6); ring(x, c, 0.8, '#c9a6ff'); } },
    sr_hold: { res: SL(2), base: 2, conc: true, when: (c, x) => x.seen.some(o => DN.humanoid(o) && !(o.stop > 0)), run(c, x) { const os = x.seen.filter(o => DN.humanoid(o) && !(o.stop > 0)).sort((p, q) => q.hp - p.hp).slice(0, F().sk(c, 'sr_twin') ? 2 : 1); for (const o of os) { beam(x, c, o, '#c9a6ff', 2); cond(x, c, o, 'wis', 'paralyzed', 2); } } },
    sr_web: { res: SL(2), base: 2, conc: true, when: W.pack(2), run(c, x) { const tg = pick(x); ring(x, tg, 2, '#e8e8e8'); for (const o of near(x, tg, 2)) cond(x, c, o, 'dex', 'restrained', 3); } },
    sr_haste: { res: SL(3), base: 3, conc: true, when: (c, x) => W.fight(c, x) && !alive(x).some(p => DN.bon(p, 'haste')), run(c, x) { const p = alive(x).filter(p => !p.def?.heal).sort((p, q) => (q.kind === 'ally' ? F().allyAtk(x.f, q) : 0) - (p.kind === 'ally' ? F().allyAtk(x.f, p) : 0))[0]; G.Res.concOn(c, p, 'haste', R6(10), { ac: 2, extraAtk: 1 }); ring(x, p, 0.9, '#8fd8ff'); } },
    sr_slow: { res: SL(3), base: 3, conc: true, when: W.pack(2), run(c, x) { const tg = pick(x); ring(x, tg, 3, '#8fd8ff'); for (const o of near(x, tg, 3).slice(0, 6)) if (!DN.save(o, 'wis', DN.dc(c))) { o.shock = Math.max(o.shock || 0, 60); DN.buff(o, 'slow', R6(10), { ac: -2 }); } } },
    sr_cone: { res: SL(5), base: 5, when: W.close(4), run(c, x) { ring(x, c, 4, '#bfe8ff'); for (const o of near(x, c, 4)) saveHit(x, c, o, 'con', evo(c, lvUp(x, [8, 8], 1))); sfx('chime'); } },
    sr_meteor: { res: SL(9), base: 9, when: W.seen, run(c, x) { const tg = strong(x); G.fx(x.rt, { k: 'tile', key: 'fx_fire', x: tg.x, y: tg.y, t: 0.9, s: 3.5 }); G.J.shake('fantasy', 10, 0, 1, 0.35); for (const o of near(x, tg, 8)) saveHit(x, c, o, 'dex', evo(c, [20, 6, 0, [20, 6]])); sfx('boom'); } },
    // ── 종족 ──
    sr_breath: { res: LONG(profUses), when: W.close(3), run(c, x) { ring(x, c, 3, '#ff8a3a'); const sp = [DN.tier(c), 10], dc = 8 + DN.mod(DN.ab(c.merc).con) + DN.prof(c.merc.lv); for (const o of near(x, c, 3)) { const ok = DN.save(o, 'dex', dc), v = dmg(x, c, sp) * (ok ? 0.5 : 1); F().hurt(x.f, x.rt, o, v, 'smite', c); } } },
  });

  G.Skill.H = { weaponAtk, roll, dmg, G0, near, pick, strong, alive, alive2, lowest, heal, strike, saveHit, cond, W, persist, R6, lvUp, tierS, ring, beam, push, pmod, nearest };
  // 이어지는 효과: 시전자의 차례마다 한 번
  G.Skill.persist = (f, rt, c, dt) => {
    if (c.merc && !c.dead) {
      const rg = G.Trinket.sum(c.merc, 'regen'); if (rg && c.hp < c.max) c.hp = Math.min(c.max, c.hp + c.max * rg * dt);
      const kHP = c.max / Math.max(1, DN.srdHP(c.merc)), xg = { f, c };
      // 생존자: 절반 아래면 차례마다 5 + 건강 · 지치지 않음: 임시 체력 1d8 + 지혜 · 신성한 후광: 곁의 적 10 광휘
      if (F().sk(c, 'sr_survivor') && c.hp < c.max * 0.5) c.hp = Math.min(c.max, c.hp + (5 + DN.mod(DN.ab(c.merc).con)) * kHP);
      const fighting = rt.mons.some(o => o.aggro && GR.dist(o, c) <= 8);
      if (F().sk(c, 'sr_tireless') && fighting && !(c.thp > 0)) c.thp = (1 + U.rand(8) + Math.max(0, DN.mod(DN.ab(c.merc).wis))) * kHP;
      if (F().sk(c, 'sr_nimbus') && fighting) for (const o of rt.mons.filter(o => GR.dist(o, c) <= 6)) { G.Foe.dtype = 'radiant'; F().hurt(f, rt, o, 10 * F().allyAtk(f, c) / Math.max(1, DN.avg(DN.weapon(c))), 'dot', c); G.Foe.dtype = null; }
    }
    if (!c.pe || !c.pe.length) return;
    const x = { f, rt, c, seen: rt.mons.filter(o => F().inView(rt, o.x, o.y)) };
    for (const e of c.pe) {
      e.t -= dt; e.tick -= dt;
      if (e.k === 'wild') { if (e.t <= 0 && c.wild) { c.t = c.wild.t; c.def = c.wild.def; c.wild = null; c.thp = 0; } continue; }
      if (e.tick > 0) continue;
      e.tick = 1; x.slot = e.slot;
      if (e.fn) { x.slot = e.slot; e.fn(x, e); continue; }
      if (e.k === 'sw') { const o = nearest(x, c, 6); if (o) { G.Foe.dtype = 'force'; G.fx(rt, { k: 'tile', key: 'w_holymace', x: o.x - 0.4, y: o.y - 0.5, t: 0.35 }); strike(x, c, o, [1, 8, pmod(c)]); G.Foe.dtype = null; } }
      else if (e.k === 'sg') { G.Foe.dtype = 'radiant'; ring(x, c, 3, 'rgba(255,243,196,0.5)'); for (const o of near(x, c, 3)) { saveHit(x, c, o, 'wis', [3 + Math.max(0, (e.slot || 3) - 3), 8]); o.shock = Math.max(o.shock || 0, 6); } G.Foe.dtype = null; }
      else if (e.k === 'moon') { if (!e.tg || e.tg.hp <= 0) e.tg = x.seen.slice().sort((p, q) => q.hp - p.hp)[0]; if (!e.tg) continue; G.Foe.dtype = 'radiant'; G.fx(rt, { k: 'tile', key: 'fx_holy', x: e.tg.x, y: e.tg.y, t: 0.6, s: 1.4 }); for (const o of near(x, e.tg, 1)) saveHit(x, c, o, 'con', [2 + Math.max(0, (e.slot || 2) - 2), 10]); G.Foe.dtype = null; }
      else if (e.k === 'call') { const o = U.pick(x.seen); if (!o) continue; G.Foe.dtype = 'lightning'; G.fx(rt, { k: 'bolt', x: o.x, y: o.y, t: 0.3, col: '#8fd8ff' }); for (const q of near(x, o, 1)) saveHit(x, c, q, 'dex', [3 + Math.max(0, (e.slot || 3) - 3), 10]); G.Foe.dtype = null; }
      else if (e.k === 'dark') { G.fx(rt, { k: 'ring', x: e.x, y: e.y, r: 3, t: 0.5, col: 'rgba(40,20,60,0.8)' }); for (const o of rt.mons) if (Math.hypot(o.x - e.x, o.y - e.y) <= 3) DN.give(rt, o, 'blinded', G.Res_ROUND, c); }
    }
    c.pe = c.pe.filter(e => e.t > 0);
  };
})();
