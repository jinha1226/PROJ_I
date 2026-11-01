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

  // D&D 상태이상 규칙으로 잇는다 (DESIGN.md 56 ③): 한 사람이 걸고 다른 사람이 그 규칙으로 터뜨린다.
  // on = 계기들(상태이상 · hm 표식 · web_fire 불붙은 거미줄 · ally_down 동료가 넘어짐/마비 · song_end), who = 받는 몸 조건, cls = 받는 직업(먼저)
  const DN = () => G.Dnd;
  const melee = a => a.def.range < 2 && !a.def.heal, ranged = a => a.def.range >= 3 && !a.def.heal;
  // 명중 굴림으로 친다 (상태이상이 이점 · 치명을 준다)
  const roll = (f, rt, c, o, k) => { const r = DN().attack(c, o); if (!r.hit) return DN().miss(rt, o); hit(f, rt, c, o, k * (r.crit ? F().critD() : 1), r.crit ? 'crit' : 'smite'); };
  const CB = {
    // 넘어진 적은 근접 공격에 이점 (Prone)
    cb_aim: { n: '넘어진 적 강타', on: ['prone'], who: melee, run(f, rt, c, o) { reach(rt, c, o, 1.2); G.J.shake('fantasy', 6, 0, 1, 0.2); roll(f, rt, c, o, 5); } },
    // 이점이 있으면 기습 (Sneak Attack) — 로그가 뛰어들어 기습 주사위를 두 배로
    cb_back: { n: '급습', on: ['stunned', 'restrained', 'blinded', 'outlined'], cls: 'rogue', run(f, rt, c, o) {
      reach(rt, c, o, 0);
      roll(f, rt, c, o, 2 * (1 + 0.5 * Math.ceil((c.merc?.lv || 1) / 2)));
    } },
    // 속박 · 빛나는 적은 맞히기 쉽다 — 원거리 전원 이점 사격
    cb_volley: { n: '집중 사격', on: ['restrained', 'outlined'], cls: 'archer', run(f, rt, c, o) {
      for (const a of rt.allies) if (!a.dead && ranged(a)) { G.fx(rt, { k: 'proj', key: a.def.proj || 'fx_arrow', x: a.x, y: a.y, x2: o.x, y2: o.y, t: 0.25 }); roll(f, rt, a, o, 1.5); }
    } },
    // 마비된 적을 근접으로 맞히면 치명타 (Paralyzed) — 팔라딘이 먼저
    cb_drop: { n: '마비 강타', on: ['paralyzed'], who: melee, cls: 'paladin', run(f, rt, c, o) { reach(rt, c, o, 1.2); G.J.shake('fantasy', 9, 0, 1, 0.25); roll(f, rt, c, o, 4); } },
    cb_toxin: { n: '독 연소', on: ['poisoned', 'poison'], cls: 'mage', run(f, rt, c, o) {
      const d = o.dots.find(q => q.kind === 'poison'), dmg = (d ? d.dps * d.t : 0) * 2 + F().allyAtk(f, c) * 2 * pow(c);
      if (d) o.dots = o.dots.filter(q => q !== d);
      G.fx(rt, { k: 'ring', x: o.x, y: o.y, r: 2, t: 0.5, col: '#b0ff5a' });
      G.J.sfx('fantasy', 'boom');
      for (const q of [...rt.mons]) if (GR.dist(q, o) <= 2) F().hurt(f, rt, q, dmg, 'smite', c);
    } },
    cb_over: { n: '과전류', on: ['burn'], cls: 'archmage', run(f, rt, c, o) {
      const hits = rt.mons.slice().sort((p, q) => GR.dist(p, o) - GR.dist(q, o)).slice(0, 6);
      G.fx(rt, { k: 'chain', pts: [[c.x, c.y], ...hits.map(q => [q.x, q.y])], col: '#ffe08a', t: 0.3 });
      for (const q of hits) hit(f, rt, c, q, 2, 'smite');
    } },
    // 겁먹은 적이 물러나면 곁의 근접 동료가 기회 공격 (Opportunity Attack)
    cb_net: { n: '기회 공격', on: ['frightened'], run(f, rt, c, o) {
      for (const a of rt.allies) if (!a.dead && melee(a) && GR.dist(a, o) <= 3) { G.fx(rt, { k: 'slash', x: o.x, y: o.y, t: 0.25, rot: Math.random() - 0.5, flip: a.x > o.x }); roll(f, rt, a, o, 1.5); }
    } },
    // 기절한 적 — 파이터 행동 쇄도
    cb_shatter: { n: '쇄도 일격', on: ['stunned'], cls: 'dragoon', run(f, rt, c, o) { reach(rt, c, o, 1.5); G.fx(rt, { k: 'impact', x: o.x, y: o.y, s: 2, col: '#c9e8ff', t: 0.3 }); roll(f, rt, c, o, 8); } },
    // 거미줄은 불에 탄다 (Web) — 속박된 적에게 불이 붙으면 근처 속박된 적 모두
    cb_blood: { n: '불붙은 거미줄', on: ['web_fire'], run(f, rt, c, o) {
      for (const q of rt.mons.filter(q => GR.dist(q, o) <= 4 && DN().held(q))) {
        G.fx(rt, { k: 'tile', key: 'fx_flame', x: q.x, y: q.y, t: 0.7, s: 1.4 });
        hit(f, rt, c, q, 3, 'smite');
        F().inflict(f, rt, q, 'burn', 3, c, F().allyAtk(f, c) * 0.5, true);
      }
    } },
    // 동료가 넘어지거나 마비되면 팔라딘이 달려가 지킨다 (신앙의 방패 · 주변 기절)
    cb_shield: { n: '수호', on: ['ally_down'], cls: 'paladin', run(f, rt, c, o) {
      reach(rt, c, o, 1.2);
      DN().buff(o, 'sof', 6, { ac: 2 });
      G.fx(rt, { k: 'ring', x: o.x, y: o.y, r: 2, t: 0.5, col: '#8fc4ef' });
      for (const q of rt.mons.filter(q => GR.dist(q, o) <= 2)) if (!DN().save(q, 'con', DN().dc(c))) q.stun = Math.max(q.stun || 0, 2);
    } },
    // 사냥꾼의 표식 · 헥스가 붙은 적 — 모두가 그 적을 친다
    cb_burn: { n: '집중 포화', on: ['hm'], run(f, rt, c, o) {
      for (const a of rt.allies) if (!a.dead && !a.def.heal && GR.dist(a, o) <= 8) { G.fx(rt, { k: 'beam', x: a.x, y: a.y, x2: o.x, y2: o.y, col: COL, w: 2, t: 0.25 }); roll(f, rt, a, o, 1); }
    } },
    // 바드의 영감을 받은 순간 — 모두 함께 친다
    cb_finale: { n: '영감 일제 공격', on: ['insp'], run(f, rt, c, o) {
      for (const a of rt.allies) if (!a.dead && !a.def.heal) {
        const tg = F().nearestMon(rt, a, 8);
        if (!tg) continue;
        G.fx(rt, { k: 'beam', x: a.x, y: a.y, x2: tg.x, y2: tg.y, col: COL, w: 2, t: 0.25 });
        hit(f, rt, a, tg, 2);
      }
    } },
  };
  // 무엇이 그 계기를 거나 (마을 표시용): 기술 키
  const BY = {
    prone: ['sr_topple', 'sr_ohtech', 'sr_cstrike'],
    stunned: ['sr_stun', 'sr_devious', 'sr_sleep', 'sr_hypno', 'sr_turn', 'sr_hurl'],
    paralyzed: ['sr_hold'],
    restrained: ['sr_ensnare', 'sr_entangle', 'sr_web'],
    frightened: ['sr_intim', 'sr_whisper', 'sr_fear', 'sr_turn'],
    poisoned: ['sr_cstrike'],
    burn: ['sr_searing', 'm_burn'],
    blinded: ['sr_dark'],
    outlined: ['sr_gbolt'],
    hm: ['sr_hmark', 'sr_hex'],
    web_fire: ['sr_web', 'sr_entangle', 'sr_ensnare'],
  };
  // 옛 이름 → 상태이상 이름
  const NORM = { stun: 'stunned', stop: 'paralyzed' };
  const ON = {};
  for (const [k, c] of Object.entries(CB)) for (const on of c.on) (ON[on] = ON[on] || []).push(k);
  // 받을 수 있는 몸 · 사람 (마을 표시는 직업 몸 성질로)
  const can = (cb, a) => (!cb.who || cb.who(a)) && (!cb.cls || cb.who || C.cls(a) === cb.cls);
  const canM = (cb, m) => can(cb, { def: G.Guild.def(m), merc: m, id: m.cls });

  const C = {
    CB,
    cls: a => a.merc?.cls || a.id,
    open: k => ta(k) > 0,
    // 이 편성으로 나갈 수 있는 연계기 (마을 표시): 받는 직업이 있고, 그 계기를 거는 다른 사람이 있다. open = 트리에서 열었나
    possible(mercs) {
      const gives = (m, on) => on === 'insp' ? m.cls === 'bard' : on === 'ally_down' ? true : (BY[on] || []).some(k => G.Guild.skill(m, k) || (m.skills || []).includes(k));
      const recv = cb => !cb.cls && !cb.who ? null : cb;
      return Object.entries(CB).filter(([, cb]) => mercs.some(g => cb.on.some(on => gives(g, on)) && (!recv(cb) || mercs.some(r => r !== g && canM(cb, r)))))
        .map(([k, cb]) => ({ k, cb, open: C.open(k) }));
    },
    // 무엇이 걸렸다 — from: 건 사람(동료), o: 대상(몬스터, 스킬 연계면 동료)
    on(f, rt, key, from, o) {
      key = NORM[key] || key;
      if (!from || from.kind !== 'ally' || !ON[key] || rt.phase === 'dead') return;
      const now = G.S.runTime;
      // 파티 3초 제한: 전우끼리는 건너뛴다 (DESIGN.md 49)
      const gated = rt.cbGate > now;
      const cds = rt.cbCd || (rt.cbCd = {});
      for (const k of ON[key]) {
        const cb = CB[k];
        if (!C.open(k) || cds[k] > now) continue;
        // 앙숙은 서로의 연계기를 잇지 않는다 (DESIGN.md 46) — 같은 직업이 둘이면 전우를 먼저
        const any = !cb.cls && !cb.who;
        const cands = any ? [] : rt.allies.filter(a => !a.dead && a !== from && can(cb, a) && G.Bond.canLink(f, from, a) && (!gated || G.Bond.cdK(f, from, a) < 1));
        // 받는 직업(cls)이 있으면 그 직업을 먼저, 그다음 전우
        const c = cands.sort((p, q) => (cb.cls ? (C.cls(q) === cb.cls) - (C.cls(p) === cb.cls) : 0) || G.Bond.cdK(f, from, p) - G.Bond.cdK(f, from, q))[0] || (any && !gated ? from : null);
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
