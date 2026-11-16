'use strict';
// 탐사 시제품 전투: 라운드마다 자동으로 굴린다 (전투 구조 A·B·C를 정하기 전까지 쓰는 임시 규칙).
// SRD 그대로의 뼈대 — d20 + 명중 보너스 vs AC, 맞으면 피해 주사위, 20은 치명타(주사위 두 배), 1은 빗나감.
// 파티가 먼저, 적이 나중에 움직인다. 기습하면 적이 첫 라운드를 놓치고, 기습당하면 파티가 놓친다.
(() => {
  const C = RUN.CLS, MON = RUN.MON;
  const alive = xs => xs.filter(x => x.hp > 0);
  const roll = (rng, e, crit) => { const p = RUN.parse(e); let t = p.b; for (let i = 0; i < p.n * (crit ? 2 : 1); i++) t += RUN.d(rng, p.s); return t; };
  const d20 = (rng, adv) => { const a = RUN.d(rng, 20); if (!adv) return a; const b = RUN.d(rng, 20); return adv > 0 ? Math.max(a, b) : Math.min(a, b); };

  // st: 판 상태, units: [['고블린', 4], ['오우거', 1]], mod: { ambush, surprised, alert, dark, small, boss, elite, bossHint }
  RUN.combat = (st, units, mod = {}) => {
    const rng = st.rng, lines = [], rounds = [];
    let cur = null; const say = (o) => cur.push(o);
    // 적 만들기
    const foes = [];
    for (const [name, cnt] of units) for (let i = 0; i < cnt; i++) {
      const m = MON[name]; let hp = m.hp; if (mod.bossHint && mod.boss) hp = Math.round(hp * 0.8);
      foes.push({ n: cnt > 1 ? `${name} ${i + 1}` : name, base: name, hp, max: hp, ac: m.ac, atk: m.atk + (mod.alert ? 2 : 0), dmg: m.dmg, pack: m.pack });
    }
    const start = foes.map(f => ({ n: f.n, hp: f.hp, max: f.max, ac: f.ac }));
    const party = st.party.filter(m => !m.dead);
    const hp0 = new Map(party.map(m => [m, m.hp]));
    const big = mod.boss || mod.elite;
    const bless = st.flags.bless ? (st.flags.bless = false, true) : false;
    const curse = st.flags.curse ? (st.flags.curse = false, true) : false;
    const st2 = { weapon: null, mark: null, wind: new Set() };

    const target = () => alive(foes).sort((a, b) => a.hp - b.hp)[0]; // 다 죽어 가는 놈부터 끝낸다
    const hitFoe = (f, dmg) => { f.hp = Math.max(0, f.hp - dmg); return f.hp === 0; };

    function attack(m, cb, f, opt = {}) {
      let b = cb.atk; if (opt.ranged && mod.small) b -= 2;
      const adv = mod.dark && !C[m.cls].dv ? -1 : 0;
      const r = d20(rng, adv), bl = bless ? RUN.d(rng, 4) : 0, tot = r + b + bl;
      const crit = r === 20, hit = crit || (r !== 1 && tot >= f.ac);
      const o = { side: 'p', a: m.n, t: f.n, kind: 'atk', d20: r, b: b + bl, ac: f.ac, hit, crit, what: opt.what || cb.what, adv, bless: bl };
      if (hit) {
        let dmg = roll(rng, cb.dmg, crit), ex = cb.dmg;
        if (opt.sneak) { dmg += roll(rng, opt.sneak, crit); ex += `+${opt.sneak}`; o.sneak = true; }
        if (st2.mark === m && f === st2.markOn) { dmg += roll(rng, '1d6', crit); ex += '+1d6'; }
        o.dmg = dmg; o.expr = ex; o.down = hitFoe(f, dmg);
      }
      say(o);
    }

    function partyTurn(m) {
      const cb = C[m.cls].cb, f = target(); if (!f) return;
      const hurtAlly = alive(party).filter(x => x.hp < x.max * 0.3).sort((a, b) => a.hp - b.hp)[0];
      switch (m.cls) {
        case 'fighter':
          if (m.hp < m.max * 0.4 && !st2.wind.has(m)) { st2.wind.add(m); const h = roll(rng, '1d10+3'); m.hp = Math.min(m.max, m.hp + h); say({ side: 'p', a: m.n, kind: 'heal', t: m.n, what: '재기의 바람', dmg: h, expr: '1d10+3' }); }
          return attack(m, cb, f);
        case 'rogue': return attack(m, cb, f, { sneak: '2d6' });
        case 'ranger':
          if (big && !st2.mark && m.sl[1] > 0) { m.sl[1]--; st2.mark = m; st2.markOn = f; say({ side: 'p', a: m.n, kind: 'spell', what: '사냥꾼의 표식', t: f.n, txt: `${f.n}에게 표식 — 맞힐 때마다 +1d6`, slot: 1 }); }
          if (st2.mark === m && st2.markOn.hp <= 0) st2.markOn = f; // 표식 옮기기
          return attack(m, cb, f, { ranged: true });
        case 'cleric':
          if (hurtAlly && m.sl[1] > 0) { m.sl[1]--; const h = roll(rng, '2d4+3'); hurtAlly.hp = Math.min(hurtAlly.max, hurtAlly.hp + h); say({ side: 'p', a: m.n, kind: 'heal', t: hurtAlly.n, what: '치유의 말', dmg: h, expr: '2d4+3', slot: 1 }); }
          if (big && !st2.weapon && m.sl[2] > 0) { m.sl[2]--; st2.weapon = m; say({ side: 'p', a: m.n, kind: 'spell', what: '영체 무기', txt: '떠다니는 영체 무기를 부른다 — 매 라운드 함께 친다', slot: 2 }); }
          attack(m, cb, f);
          if (st2.weapon === m && target()) attack(m, { atk: 5, dmg: '1d8+3', what: '영체 무기' }, target());
          return;
        case 'wizard': {
          const live = alive(foes);
          if ((big ? live.length >= 2 : live.length >= 3) && m.sl[2] > 0) { // 무리가 크면 일반 전투에도 쓴다
            m.sl[2]--; const hit3 = live.slice(0, 3), base = roll(rng, '3d8'), out = [], hits = [];
            for (const x of hit3) { const save = d20(rng) + 1 >= 13; const dm = save ? Math.floor(base / 2) : base; const dn = hitFoe(x, dm); hits.push({ t: x.n, dmg: dm }); out.push(`${x.n} ${dm}${save ? '(내성 절반)' : ''}${dn ? ' 쓰러짐' : ''}`); }
            return say({ side: 'p', a: m.n, kind: 'spell', what: '파쇄', expr: '3d8', dmg: base, txt: out.join(' · '), hits, slot: 2 });
          }
          if (big && m.sl[1] > 0 && f.hp > 8) { m.sl[1]--; const dm = roll(rng, '3d4+3'); const down = hitFoe(f, dm); return say({ side: 'p', a: m.n, kind: 'spell', what: '마법 화살', t: f.n, expr: '3d4+3', dmg: dm, down, txt: '반드시 맞는다', slot: 1 }); }
          return attack(m, cb, f, { ranged: true });
        }
      }
    }

    function foeTurn(f) {
      const live = alive(party); if (!live.length) return;
      // 앞줄(무게 w)이 더 자주 맞는다
      const ws = live.map(m => C[m.cls].w), sum = ws.reduce((a, b) => a + b, 0); let r = rng() * sum, m = live[0];
      for (let i = 0; i < live.length; i++) { r -= ws[i]; if (r <= 0) { m = live[i]; break; } }
      const ac = C[m.cls].cb.ac, adv = f.pack && alive(foes).length > 1 ? 1 : 0;
      const d = d20(rng, adv), tot = d + f.atk, crit = d === 20, hit = crit || (d !== 1 && tot >= ac);
      const o = { side: 'e', a: f.n, t: m.n, kind: 'atk', d20: d, b: f.atk, ac, hit, crit, adv, what: MON[f.base].what };
      if (hit) {
        let dmg = roll(rng, f.dmg, crit) + (curse ? 2 : 0); o.dmg = dmg; o.expr = f.dmg + (curse ? '+2' : '');
        m.hp -= dmg; if (m.hp <= 0) { m.hp = 0; m.dead = true; o.down = true; }
      }
      say(o);
    }

    let R = 0;
    while (alive(foes).length && alive(party).length && R < 12) {
      R++; cur = []; rounds.push(cur);
      if (R === 1 && mod.surprised) say({ kind: 'info', txt: '기습당했다 — 파티는 첫 라운드에 손을 쓰지 못한다.' });
      else { for (const m of party) if (!m.dead && alive(foes).length) partyTurn(m); }
      if (R === 1 && mod.ambush) { say({ kind: 'info', txt: '기습 — 적은 첫 라운드에 반응하지 못한다.' }); continue; }
      for (const f of foes) if (f.hp > 0) foeTurn(f);
    }
    const fled = alive(foes).length > 0 && alive(party).length > 0;
    if (fled) { foes.forEach(f => f.hp = 0); rounds[rounds.length - 1].push({ kind: 'info', txt: '적이 물러난다.' }); }
    const loss = party.map(m => ({ n: m.n, d: hp0.get(m) - m.hp, dead: m.dead }));
    return { start, pstart: party.map(m => ({ n: m.n, hp: hp0.get(m), max: m.max })), foes: foes.map(f => ({ n: f.n, hp: f.hp, max: f.max })), rounds, win: alive(party).length > 0, loss, bless, curse };
  };
})();
