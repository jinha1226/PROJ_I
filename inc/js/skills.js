'use strict';
// 개인 스킬 효과 (DESIGN.md 43): 직업마다 일곱, 한 사람 넷. 전부 자동 — 사람마다 쿨다운(a.cds)을 따로 돈다.
// when(c, x) = 지금 쓸 만한가, run(c, x) = 쓴다(false면 쓰지 않은 것으로 — 쿨다운도 돌지 않는다).
// 스킬은 주로 상태이상을 건다(F.inflict). 걸린 상태를 받아치는 것은 트리의 연계기(G.Combo).
G.Skill = (() => {
  const U = G.U, GR = G.Grid, D = G.D;
  const F = () => G.Fantasy;
  const GAP = 0.8, LV_K = 0.15;
  // 시전자 공격력 × 배율 × 스킬 레벨(+15%/레벨)
  const pow = c => 1 + LV_K * (G.Guild.skillLv(c.merc) - 1);
  const atk = (x, c, k) => F().allyAtk(x.f, c) * k * pow(c);
  const hit = (x, c, o, k, src = 'crit') => F().hurt(x.f, x.rt, o, atk(x, c, k), src, c);
  const st = (x, c, o, k, t, dps) => F().inflict(x.f, x.rt, o, k, t, c, dps);
  // 기술 표적(지정한 적 · 기사 곁) — 기사 자신이 돌아오면 보이는 첫 적으로
  const pick = x => { const t = F().skillTarget(x.rt); return t.dots ? t : x.seen[0]; };
  const strong = x => x.seen.slice().sort((p, q) => q.hp - p.hp)[0];
  const near = (x, c, r) => x.rt.mons.filter(o => GR.dist(o, c) <= r);
  const beam = (x, a, b, col, w = 3) => G.fx(x.rt, { k: 'beam', x: a.x, y: a.y, x2: b.x, y2: b.y, col, w, t: 0.25 });
  const ring = (x, c, r, col) => G.fx(x.rt, { k: 'ring', x: c.x, y: c.y, r, t: 0.5, col });
  const say = (x, c, s, col) => G.fx(x.rt, { k: 'text', x: c.x, y: c.y - 1.2, s, col, t: 1.2, sz: 1.1, pop: true });
  const sfx = k => G.J.sfx('fantasy', k);
  // 순간 이동: 그 칸이 막혔으면 대상 자리로
  const jump = (x, c, tx, ty) => { const m = x.rt.map; if (GR.pass(m, Math.round(tx), Math.round(ty))) { c.x = tx; c.y = ty; } };
  // 시전자에서 대상 쪽으로 len칸 일직선 위의 적
  const line = (x, c, tg, len) => {
    const dx = tg.x - c.x, dy = tg.y - c.y, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
    return x.rt.mons.filter(o => { const px = o.x - c.x, py = o.y - c.y, t = px * ux + py * uy; return t > 0 && t <= len && Math.abs(px * uy - py * ux) < 0.8; });
  };
  const allyLow = (x, c, r) => x.rt.party.filter(p => !p.dead && p !== c && p.hp < p.max * r).sort((p, q) => p.hp / p.max - q.hp / q.max)[0];
  const disabled = o => o.stun > 0 || o.stop > 0;
  const has = (o, k) => o.dots.some(d => d.kind === k);

  // 쓸 만한 때 (자주 쓰는 것)
  const W = {
    seen: (c, x) => x.seen.length > 0,
    pack: n => (c, x) => x.seen.length >= n,
    close: (r, n) => (c, x) => near(x, c, r).length >= n,
    fight: (c, x) => x.rt.mons.some(o => o.aggro && F().inView(x.rt, o.x, o.y)),
  };

  const SK = {
    // ── 레인저 ──
    sk_aimed: { when: W.seen, run(c, x) { const tg = strong(x); beam(x, c, tg, '#fff3b0'); hit(x, c, tg, 8); } },
    sk_volley: { when: W.seen, run(c, x) { const tg = pick(x); x.rt.volley = { x: tg.x, y: tg.y, t: 3, tick: 0, c }; sfx('chime'); } },
    sk_bind: { when: W.seen, run(c, x) { const tg = strong(x); beam(x, c, tg, '#ffe08a'); hit(x, c, tg, 3); st(x, c, tg, 'stun', 2); } },
    sk_toxcloud: { when: W.pack(2), run(c, x) {
      const tg = pick(x);
      G.fx(x.rt, { k: 'ring', x: tg.x, y: tg.y, r: 2, t: 0.7, col: '#7fe05a' });
      for (const o of near(x, tg, 2)) st(x, c, o, 'poison', 5, atk(x, c, 0.5));
    } },
    sk_pierce: { when: W.seen, run(c, x) {
      const tg = pick(x), hits = line(x, c, tg, 9);
      if (!hits.length) return false;
      G.fx(x.rt, { k: 'beam', x: c.x, y: c.y, x2: c.x + (tg.x - c.x) * 9 / (GR.dist(c, tg) || 1), y2: c.y + (tg.y - c.y) * 9 / (GR.dist(c, tg) || 1), col: '#fff3b0', w: 2, t: 0.25 });
      for (const o of hits) hit(x, c, o, 3);
    } },
    sk_weak: { when: (c, x) => x.seen.some(disabled), run(c, x) { const tg = x.seen.filter(disabled).sort((p, q) => q.hp - p.hp)[0]; beam(x, c, tg, '#ffd24a'); hit(x, c, tg, 5); } },
    sk_kite: { when: W.close(1.5, 1), run(c, x) {
      const o = F().nearestMon(x.rt, c, 1.5), dx = c.x - o.x, dy = c.y - o.y, l = Math.hypot(dx, dy) || 1;
      jump(x, o, o.x - dx / l * 2, o.y - dy / l * 2);
      jump(x, c, c.x + dx / l * 2, c.y + dy / l * 2);
      hit(x, c, o, 2, 'hit');
    } },
    // ── 수도사 ──
    sk_heal: { when: (c, x) => { const ph = F().partyHP(x.rt); return ph.hp < ph.max * 0.5; }, run(c, x) {
      for (const p of x.rt.party) if (!p.dead && !p.noHeal) { p.hp = Math.min(p.max, p.hp + p.max * 0.5 * pow(c)); G.fx(x.rt, { k: 'tile', key: 'fx_holy', x: p.x, y: p.y, t: 0.8 }); }
      sfx('bell');
    } },
    sk_bless: { when: (c, x) => { const ph = F().partyHP(x.rt); return ph.hp < ph.max * 0.8; }, run(c, x) { F().buff(x.f, x.rt, c, 'regen', 10); } },
    sk_aegis: { when: (c, x) => !!allyLow(x, null, 0.35), run(c, x) {
      const p = allyLow(x, null, 0.35);
      p.inv = 4;
      beam(x, c, p, '#fff3c4');
      ring(x, p, 1, '#fff3c4');
      G.Combo.on(x.f, x.rt, 'sk_aegis', c, p);
    } },
    sk_raise: { when: (c, x) => x.rt.allies.some(p => p.dead), run(c, x) {
      const p = x.rt.allies.find(q => q.dead);
      p.dead = false; p.hp = p.max * 0.5; p.reviveT = 0;
      beam(x, c, p, '#fff3c4');
      G.fx(x.rt, { k: 'tile', key: 'fx_holy', x: p.x, y: p.y, t: 0.8 });
      sfx('bell');
    } },
    sk_judge: { when: W.pack(2), run(c, x) { for (const o of x.seen) st(x, c, o, 'mark', 6); ring(x, c, 5, '#fff3c4'); } },
    sk_hammer: { when: W.seen, run(c, x) { const tg = pick(x); beam(x, c, tg, '#fff3c4'); hit(x, c, tg, 4); st(x, c, tg, 'mark', 4); } },
    sk_halo: { when: W.close(2.4, 1), run(c, x) {
      ring(x, c, 2.4, '#fff3c4');
      for (const o of near(x, c, 2.4)) hit(x, c, o, 2, 'smite');
      for (const p of x.rt.party) if (!p.dead && !p.noHeal && GR.dist(p, c) <= 3) p.hp = Math.min(p.max, p.hp + p.max * 0.1);
    } },
    // ── 음유시인 ──
    sk_rhap: { when: W.seen, run(c, x) { for (const k of F().songs()) F().buff(x.f, x.rt, c, k, 10); } },
    sk_hymn: { when: W.seen, run(c, x) { F().buff(x.f, x.rt, c, 'haste', 6); } },
    sk_ward: { when: W.fight, run(c, x) { F().buff(x.f, x.rt, c, 'ward', 8); } },
    sk_luck: { when: W.seen, run(c, x) { F().buff(x.f, x.rt, c, 'gold', 10); } },
    sk_lull: { when: W.close(3, 2), run(c, x) { ring(x, c, 3, '#e0a040'); for (const o of near(x, c, 3)) st(x, c, o, 'stun', 3); } },
    sk_disc: { when: W.pack(2), run(c, x) { ring(x, c, 5, '#8fd8ff'); for (const o of x.seen) st(x, c, o, 'shock', 4); } },
    sk_mock: { when: W.seen, run(c, x) { const tg = strong(x); beam(x, c, tg, '#ff8a6a', 2); st(x, c, tg, 'mark', 6); } },
    // ── 화염 마법사 ──
    sk_meteor: { when: W.seen, run(c, x) {
      const tg = pick(x);
      G.Skill.meteor(x.f, x.rt, c, tg.x, tg.y, 30);
    } },
    sk_nova: { when: W.close(2.4, 2), run(c, x) {
      ring(x, c, 2.5, '#ff8a3a');
      for (const o of near(x, c, 2.5)) hit(x, c, o, 6, 'smite');
      sfx('boom');
    } },
    sk_fireball: { when: W.seen, run(c, x) {
      const tg = pick(x);
      G.fx(x.rt, { k: 'proj', key: 'fx_fire', x: c.x, y: c.y, x2: tg.x, y2: tg.y, t: 0.25 });
      ring(x, tg, 1.5, '#ff8a3a');
      for (const o of near(x, tg, 1.5)) { hit(x, c, o, 4, 'smite'); st(x, c, o, 'burn', 3, atk(x, c, 0.4)); }
    } },
    sk_pillar: { when: W.seen, run(c, x) { const tg = strong(x); G.fx(x.rt, { k: 'tile', key: 'fx_flame', x: tg.x, y: tg.y, t: 0.8, s: 1.6 }); st(x, c, tg, 'burn', 6, atk(x, c, 2)); } },
    sk_firewall: { when: W.close(5, 2), run(c, x) {
      const o = F().nearestMon(x.rt, c, 5), mx = (o.x + c.x) / 2, my = (o.y + c.y) / 2;
      x.rt.fields.push({ x: mx, y: my, r: 1.8, t: 5, dps: atk(x, c, 1), burn: c });
    } },
    sk_heatwave: { when: W.close(2, 1), run(c, x) {
      ring(x, c, 2.5, '#ffb36b');
      for (const o of near(x, c, 2.5)) {
        const dx = o.x - c.x, dy = o.y - c.y, l = Math.hypot(dx, dy) || 1;
        jump(x, o, o.x + dx / l * 2, o.y + dy / l * 2);
        st(x, c, o, 'burn', 3, atk(x, c, 0.5));
      }
    } },
    sk_ignite: { when: (c, x) => x.seen.some(o => has(o, 'burn')), run(c, x) {
      for (const o of x.seen.filter(o => has(o, 'burn'))) {
        const d = o.dots.find(q => q.kind === 'burn');
        o.dots = o.dots.filter(q => q !== d);
        G.fx(x.rt, { k: 'impact', x: o.x, y: o.y, s: 1.4, col: '#ff8a3a', t: 0.25 });
        F().hurt(x.f, x.rt, o, d.dps * d.t * 1.5 * pow(c), 'smite', c);
      }
      sfx('boom');
    } },
    // ── 성기사 ──
    sk_wall: { when: W.fight, run(c, x) { F().buff(x.f, x.rt, c, 'wall', 8); x.rt.wallBy = c; for (const o of x.rt.mons) if (GR.dist(o, c) < 6) o.aggro = true; } },
    sk_smash: { when: W.close(1.8, 1), run(c, x) { const tg = F().nearestMon(x.rt, c, 1.8); hit(x, c, tg, 5); st(x, c, tg, 'stun', 2); G.J.shake('fantasy', 6, 0, 1, 0.2); } },
    sk_oath: { when: (c, x) => !!allyLow(x, c, 0.5), run(c, x) { const p = allyLow(x, c, 0.5); c.guardOf = p; c.guardT = 6; beam(x, c, p, '#8fc4ef'); } },
    sk_shout: { when: W.close(6, 2), run(c, x) {
      c.shoutT = 6;
      for (const o of near(x, c, 6)) o.aggro = true;
      ring(x, c, 6, '#ff8a6a');
      say(x, c, '덤벼라!', '#ff8a6a');
      G.Combo.on(x.f, x.rt, 'sk_shout', c, c);
    } },
    sk_slam: { when: W.close(2, 2), run(c, x) { ring(x, c, 2, '#ffe08a'); for (const o of near(x, c, 2)) { hit(x, c, o, 2, 'smite'); st(x, c, o, 'stun', 1.5); } G.J.shake('fantasy', 7, 0, 1, 0.2); } },
    sk_retri: { when: (c, x) => W.fight(c, x) && c.hp < c.max * 0.7, run(c, x) { c.retT = 5; ring(x, c, 1, '#ffe08a'); } },
    sk_bastion: { when: (c, x) => c.hp < c.max * 0.3, run(c, x) { c.inv = 4; ring(x, c, 1.2, '#fff3c4'); say(x, c, '버틴다!', '#fff3c4'); } },
    // ── 용기병 ──
    sk_leap: { when: W.seen, run(c, x) {
      const tg = strong(x);
      beam(x, c, tg, '#ffe08a', 4);
      jump(x, c, tg.x + (c.x > tg.x ? 0.8 : -0.8), tg.y);
      G.J.shake('fantasy', 9, 0, 1, 0.25);
      hit(x, c, tg, 10);
    } },
    sk_spin: { when: W.close(2.4, 2), run(c, x) { ring(x, c, 1.8, '#ffe08a'); for (const o of near(x, c, 1.8)) hit(x, c, o, 4, 'smite'); sfx('crit'); } },
    sk_lance: { when: W.seen, run(c, x) {
      const tg = pick(x), hits = line(x, c, tg, 5);
      if (!hits.length) return false;
      beam(x, c, tg, '#ffe08a', 4);
      for (const o of hits) { hit(x, c, o, 4); st(x, c, o, 'bleed', 2, atk(x, c, 0.8)); }
    } },
    sk_rend: { when: W.close(2, 1), run(c, x) { const tg = F().nearestMon(x.rt, c, 2); hit(x, c, tg, 3); st(x, c, tg, 'bleed', 2, atk(x, c, 1.6)); } },
    sk_charge: { when: (c, x) => x.seen.some(o => GR.dist(o, c) > 3 && GR.dist(o, c) <= 8), run(c, x) {
      const tg = x.seen.filter(o => GR.dist(o, c) > 3 && GR.dist(o, c) <= 8).sort((p, q) => GR.dist(q, c) - GR.dist(p, c))[0];
      const path = line(x, c, tg, GR.dist(c, tg));
      beam(x, c, tg, '#ffe08a', 5);
      jump(x, c, tg.x + (c.x > tg.x ? 0.8 : -0.8), tg.y);
      for (const o of path) hit(x, c, o, 2);
      G.J.shake('fantasy', 6, 0, 1, 0.2);
    } },
    sk_fury: { when: W.fight, run(c, x) { c.furyT = 6; ring(x, c, 1, '#ff5a3a'); say(x, c, '분노', '#ff5a3a'); } },
    sk_doom: { when: (c, x) => x.seen.some(o => has(o, 'bleed')), run(c, x) { const tg = x.seen.filter(o => has(o, 'bleed')).sort((p, q) => q.hp - p.hp)[0]; beam(x, c, tg, '#ff5a5a', 4); hit(x, c, tg, 5); } },
    // ── 대현자 ──
    sk_tstorm: { when: W.seen, run(c, x) { x.rt.tstorm = { t: 5, tick: 0, c }; sfx('smite'); } },
    sk_freeze: { when: W.pack(2), run(c, x) { for (const o of x.seen) st(x, c, o, 'stop', 3); ring(x, c, 6, '#c9a6ff'); sfx('chime'); } },
    sk_chainl: { when: W.pack(2), run(c, x) {
      const hits = x.seen.slice().sort((p, q) => GR.dist(p, c) - GR.dist(q, c)).slice(0, 10);
      G.fx(x.rt, { k: 'chain', pts: [[c.x, c.y], ...hits.map(o => [o.x, o.y])], col: '#8fd8ff', t: 0.3 });
      for (const o of hits) { hit(x, c, o, 3, 'smite'); st(x, c, o, 'shock', 2); }
    } },
    sk_jolt: { when: W.seen, run(c, x) { const tg = strong(x); G.fx(x.rt, { k: 'bolt', x: tg.x, y: tg.y, t: 0.3, col: '#8fd8ff' }); hit(x, c, tg, 4, 'smite'); st(x, c, tg, 'shock', 4); } },
    sk_slowf: { when: W.pack(3), run(c, x) { const tg = pick(x); G.fx(x.rt, { k: 'ring', x: tg.x, y: tg.y, r: 3, t: 0.7, col: '#8fd8ff' }); for (const o of near(x, tg, 3)) st(x, c, o, 'shock', 5); } },
    sk_rewind: { when: (c, x) => { const h = x.rt.hpHist?.[0]; return !!h && x.rt.party.some(p => !p.dead && (h[p.uid || 'hero'] || 0) > p.hp + p.max * 0.25); }, run(c, x) {
      const h = x.rt.hpHist[0];
      for (const p of x.rt.party) if (!p.dead && !p.noHeal) { p.hp = Math.min(p.max, Math.max(p.hp, h[p.uid || 'hero'] || 0)); ring(x, p, 0.9, '#c9a6ff'); }
      say(x, c, '되감기', '#c9a6ff');
      sfx('chime');
    } },
    sk_blink: { when: (c, x) => c.hp < c.max * 0.4 && near(x, c, 1.5).length > 0, run(c, x) {
      const o = F().nearestMon(x.rt, c, 1.5), dx = c.x - o.x, dy = c.y - o.y, l = Math.hypot(dx, dy) || 1;
      G.fx(x.rt, { k: 'ring', x: c.x, y: c.y, r: 0.8, t: 0.3, col: '#c9a6ff' });
      jump(x, c, c.x + dx / l * 4, c.y + dy / l * 4);
      ring(x, c, 0.8, '#c9a6ff');
    } },
    // ── 암살자 ──
    sk_shadow: { when: W.seen, run(c, x) {
      // 체력 30% 이하인 적을 차례로 (최대 5), 없으면 가장 약한 적 ×5
      const low = x.seen.filter(o => o.hp < o.max * 0.3).slice(0, 5);
      let from = c;
      if (low.length) for (const o of low) { beam(x, from, o, '#b98aff', 2); F().hurt(x.f, x.rt, o, o.hp + 1, 'crit', from); from = o; }
      else { const o = x.seen.slice().sort((p, q) => p.hp - q.hp)[0]; hit(x, c, o, 5); }
      if (from !== c) jump(x, c, from.x, from.y);
      sfx('crit');
    } },
    sk_fan: { when: W.seen, run(c, x) {
      for (const o of x.rt.mons.slice().sort((p, q) => GR.dist(p, c) - GR.dist(q, c)).slice(0, 5)) {
        G.fx(x.rt, { k: 'proj', key: 'fx_arrow', x: c.x, y: c.y, x2: o.x, y2: o.y, t: 0.2 });
        hit(x, c, o, 2, 'hit');
      }
    } },
    sk_smoke: { when: W.close(2.5, 2), run(c, x) { G.fx(x.rt, { k: 'ring', x: c.x, y: c.y, r: 2.5, t: 0.8, col: '#9aa4ad' }); for (const o of near(x, c, 2.5)) st(x, c, o, 'stun', 2); c.nextX = 3; } },
    sk_venom: { when: W.fight, run(c, x) { c.venomT = 8; ring(x, c, 0.9, '#7fe05a'); } },
    sk_vital: { when: W.seen, run(c, x) { const tg = pick(x); beam(x, c, tg, '#ffd24a', 2); hit(x, c, tg, 6); st(x, c, tg, 'mark', 4); } },
    sk_bleedcut: { when: W.close(2, 1), run(c, x) { const tg = F().nearestMon(x.rt, c, 2); hit(x, c, tg, 2, 'hit'); st(x, c, tg, 'bleed', 2, atk(x, c, 1)); } },
    sk_step: { when: W.seen, run(c, x) {
      const tg = x.seen.slice().sort((p, q) => p.hp - q.hp)[0];
      beam(x, c, tg, '#b98aff', 2);
      jump(x, c, tg.x + (c.x > tg.x ? -0.8 : 0.8), tg.y);
      hit(x, c, tg, 3);
    } },
    // ── 길잡이 ──
    sk_scan: { when: (c, x) => G.Season.coverage(x.f, x.f.floor) < 0.9, run(c, x) { G.Skill.reveal(x.rt, c.x, c.y, 14); ring(x, c, 5, '#7fcf8a'); } },
    sk_path: { when: (c, x) => !x.rt.pathShown && !x.rt.mons.some(o => o.aggro), run(c, x) {
      const e = x.rt.map.end;
      x.rt.pathShown = true;
      G.Skill.reveal(x.rt, e.cx, e.cy, 3);
      F().buff(x.f, x.rt, c, 'path', 8);
    } },
    // 보물 감지: 상자 · 보물방 위치를 밝히고, 이 층 처치 골드를 잠시 두 배로
    sk_sense: { when: W.seen, run(c, x) {
      for (const ch of x.rt.chests) G.Skill.reveal(x.rt, ch.x, ch.y, 1.5);
      for (const r of x.rt.map.treasure || []) G.Skill.reveal(x.rt, r.cx, r.cy, 2);
      F().buff(x.f, x.rt, c, 'gold', 8);
    } },
    sk_trap: { when: W.fight, run(c, x) {
      x.rt.traps.push({ shape: 'trap', under: true, x: Math.round(c.x), y: Math.round(c.y), t: 25, c, s: 0.8 });
      F().refreshEnts(x.rt);
    } },
    sk_net: { when: W.seen, run(c, x) { const tg = strong(x); G.fx(x.rt, { k: 'proj', key: 'a_seal', x: c.x, y: c.y, x2: tg.x, y2: tg.y, t: 0.3 }); st(x, c, tg, 'stop', 3); } },
    sk_saw: { when: W.seen, run(c, x) { const tg = pick(x); G.fx(x.rt, { k: 'proj', key: 'fx_arrow', x: c.x, y: c.y, x2: tg.x, y2: tg.y, t: 0.25 }); hit(x, c, tg, 2, 'hit'); st(x, c, tg, 'bleed', 2, atk(x, c, 0.8)); } },
    sk_hunt: { when: W.seen, run(c, x) { const tg = strong(x); beam(x, c, tg, '#ff8a6a', 2); st(x, c, tg, 'mark', 8); } },
  };

  const Sk = {
    SK, pow,
    // 동료 한 명: 열린 칸의 스킬 중 쿨다운이 끝났고 쓸 만한 것 하나 (한 번 쓰면 GAP초 쉰다)
    tick(f, rt, a, dt, seen) {
      const cds = a.cds || (a.cds = {});
      for (const k in cds) if ((cds[k] -= dt) <= 0) delete cds[k];
      if ((a.gcd -= dt) > 0 || !a.merc || a.dead) return;
      const x = { f, rt, seen };
      for (const k of G.Guild.slots(a.merc)) {
        const S = SK[k];
        if (!S || cds[k] > 0 || !S.when(a, x)) continue;
        if (S.run(a, x) === false) continue;
        cds[k] = D.MSKILLS[k].cool;
        a.gcd = GAP;
        a.lastSk = k;
        if (G.Sim) G.Sim.casts[k] = (G.Sim.casts[k] || 0) + 1;
        return;
      }
    },
    // 유성 낙하 (연계기 「모아서 태우기」도 쓴다)
    meteor(f, rt, c, x, y, k) {
      G.fx(rt, { k: 'tile', key: 'fx_fire', x, y, t: 0.9, s: 3 });
      G.J.sfx('fantasy', 'boom');
      G.J.shake('fantasy', 10, 0, 1, 0.35);
      const dmg = F().allyAtk(f, c) * k * pow(c);
      for (const m of [...rt.mons]) if (Math.hypot(m.x - x, m.y - y) <= 2.5) F().hurt(f, rt, m, dmg, 'smite', c);
      if (F().sk(c, 'm_storm')) rt.fields.push({ x, y, r: 2.5, t: 8, dps: F().allyAtk(f, c) });
    },
    // 지도 밝히기 (정찰 · 지름길 · 보물 감지)
    reveal(rt, cx, cy, R) {
      const m = rt.map; cx = Math.round(cx); cy = Math.round(cy);
      for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) if (x >= 0 && y >= 0 && x < m.w && y < m.h && (x - cx) ** 2 + (y - cy) ** 2 <= R * R) rt.seen[y * m.w + x] = 1;
      rt.seenVer++;
    },
  };
  return Sk;
})();
