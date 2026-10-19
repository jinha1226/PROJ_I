'use strict';
// 수선 · 구천등선 (선문 산 지도 — Cultivation Idle, Xiuzhen Idle 계열)
// 수도자는 동굴 영맥에서 좌선해 영기를 모으고, 틈틈이 숲의 요수를 사냥해 영석을 번다.
// 천교방의 도전자가 산문으로 찾아오면 내려가 비무한다. 영기가 차면 정상에 올라 천겁을 맞는다.
// 제자(스킬트리)는 영초밭을 돌보고 단로에 넣어 단약을 만든다. 단약은 천겁 성공률을 올린다.
G.RT = G.RT || {};
G.Xianxia = (() => {
  const D = G.D.X, U = G.U, GR = G.Grid;
  const tm = k => G.Tree.mul('xianxia', G.S.w.xianxia.tree, k);
  const ta = k => G.Tree.add('xianxia', G.S.w.xianxia.tree, k);
  const MED_T = 12, RIVAL_T = 20, TRIB_T = 3.5, DEVIATION = 20, HERB_T = 25, ALCH_T = 8;

  const X = {
    init(head = 0) {
      return { qi: 0, stone: 10 * Math.pow(10, head), realm: 0, k: 0, pills: 0, herbs: 0, devT: 0, tree: G.Tree.init('xianxia'), autoBreak: true, autoThr: 0.6, fails: 0 };
    },
    rt(x) { return G.RT.xianxia || (G.RT.xianxia = X.boot(x)); },
    boot(x) {
      const map = GR.fromAscii(D.map, D.pass);
      const [vx, vy] = map.poi.V[0];
      const rt = {
        map, fx: [], me: { kind: 'hero', t: 'cultivator', x: vx, y: vy, s: 1.15, bar: true }, beasts: [], disciples: [],
        plots: (map.poi.h || []).map(([px, py]) => ({ x: px, y: py, g: Math.random() * HERB_T })),
        state: 'meditate', stT: 0, beastT: 2, rivalT: 8, rival: null, alchT: 0, trib: 0, target: null,
      };
      X.heal(x, rt);
      return rt;
    },
    realmName: r => (r < D.realms.length ? D.realms[r] : `선제 ${r - D.realms.length + 1}중천`),
    qiBase(x) {
      let m = Math.pow(2.6, x.realm) * tm('qi') * G.globalMult() * (1 + G.relicVal('x_qi'));
      if (G.synergy('syn_tactics')) m *= 1 + 0.04 * (G.S.w.scifi.maxWave - 1);
      return x.devT > 0 ? m * 0.3 : m;
    },
    meditating: x => { const rt = X.rt(x); return rt.state === 'meditate' && rt.stT > 0; },
    qiRate: x => X.qiBase(x) * (X.meditating(x) ? 2 + ta('medit') : 0.5),
    power: x => 10 * Math.pow(3, x.realm) * tm('power') * G.globalMult() * (1 + G.relicVal('x_power')),
    stoneMult: () => tm('stone') * G.globalMult() * (1 + G.relicVal('x_stone')),
    breakCost: r => 40 * Math.pow(9, r),
    breakChance(x, pills = Math.min(4, x.pills)) {
      let c = Math.max(0.25, 0.8 - 0.06 * x.realm) + 0.12 * pills + ta('trib');
      if (G.synergy('syn_regress')) c += 0.03 * Math.min(10, G.S.w.wuxia.lives);
      return Math.min(1, c);
    },
    beastHp: r => 12 * Math.pow(2.8, r),
    beastStone: r => 4 * Math.pow(1.7, r),
    opp(k) {
      const ti = D.titles.findIndex(t => k < t[0]);
      const rank = 1000 * Math.pow(0.955, k);
      return {
        k, tier: ti, title: D.titles[ti][1],
        name: D.sur[(k * 7 + 3) % D.sur.length] + D.giv[(k * 13 + 5) % D.giv.length],
        sect: D.sects[(k * 11 + 1) % D.sects.length],
        rank: rank >= 1.5 ? `천교방 ${Math.round(rank)}위` : `선계 ${k - 158}층`,
        power: 12 * Math.pow(1.12, k), stone: 6 * Math.pow(1.105, k),
      };
    },
    duelEss: k => 0.3 * Math.pow(1 + k / 8, 1.3),
    gain(x, n) { x.stone += n; G.tally('xianxia', n); },
    heal(x, rt) { rt.me.max = X.power(x) * 6; rt.me.hp = rt.me.max; },

    meditateClick(x) {
      const g = 1 + X.qiBase(x) * 1.5;
      x.qi += g;
      const rt = X.rt(x);
      G.fx(rt, { k: 'text', x: rt.me.x, y: rt.me.y - 1, s: '+' + U.fmt(g), col: '#9fe0ff', t: 0.8, sz: 1.2, pop: true });
      G.fx(rt, { k: 'ring', x: rt.me.x, y: rt.me.y, r: 1.2, t: 0.4, col: '#9fe0ff' });
      G.J.hit('xianxia', rt.me);
      G.J.sfx('xianxia', 'bell');
    },
    flySword(x, b) {
      const rt = X.rt(x), dmg = X.power(x) * 1.5 * tm('fly');
      const hit = [b];
      if (ta('flyChain')) hit.push(...rt.beasts.filter(o => o !== b).sort((p, q) => GR.dist(p, b) - GR.dist(q, b)).slice(0, 2));
      let from = rt.me;
      G.J.sfx('xianxia', 'sword');
      for (const o of hit) {
        G.fx(rt, { k: 'proj', key: 'fx_sword', x: from.x, y: from.y, x2: o.x, y2: o.y, t: 0.3 });
        X.hurtBeast(x, rt, o, dmg, 0.45);
        from = o;
      }
    },
    // power > 0: 직접 날린 비검 (크게 튀고 히트스톱)
    hurtBeast(x, rt, b, dmg, power = 0) {
      if (b.hp <= 0) return;
      b.hp -= dmg;
      b.aggro = true;
      G.fx(rt, { k: 'text', x: b.x, y: b.y - 0.6, s: U.fmt(dmg), col: '#cfe9ff', t: 0.7, sz: (power ? 1.3 : 0.85) + 0.5 * Math.min(1, dmg / b.max), pop: power > 0 });
      G.J.hit('xianxia', b, power);
      if (b.hp <= 0) {
        G.J.sfx('xianxia', 'coin');
        const g = X.beastStone(b.r) * X.stoneMult() * tm('beast');
        X.gain(x, g);
        G.fx(rt, { k: 'text', x: b.x, y: b.y - 1, s: '+' + U.fmt(g), col: '#e8b8ff', t: 1.1 });
        rt.beasts = rt.beasts.filter(o => o !== b);
        if (rt.target === b) rt.target = null;
      }
    },
    click(x, cx, cy) {
      const rt = X.rt(x);
      for (const b of rt.beasts) if (Math.hypot(b.x - cx, b.y - cy) < 1) { X.flySword(x, b); return true; }
      for (const p of rt.plots) if (Math.hypot(p.x - cx, p.y - cy) < 0.8 && p.g >= HERB_T) { p.g = 0; x.herbs++; G.fx(rt, { k: 'text', x: p.x, y: p.y - 0.6, s: '영초 +1', col: '#9fe79f', t: 0.9, pop: true }); G.J.sfx('xianxia', 'pop'); return true; }
      if (Math.hypot(rt.me.x - cx, rt.me.y - cy) < 1.2) { X.meditateClick(x); return true; }
      return false;
    },
    // 천겁: 정상에서 번개를 맞는다
    breakthrough(x) {
      const rt = X.rt(x);
      if (x.qi < X.breakCost(x.realm) || rt.state === 'trib') return false;
      rt.state = 'trib';
      rt.trib = 0;
      rt.stT = 0;
      return true;
    },
    resolveTrib(x, rt) {
      const used = Math.min(4, x.pills), cost = X.breakCost(x.realm);
      const ok = U.chance(X.breakChance(x, used));
      x.pills -= used;
      if (ok) {
        x.qi -= cost;
        x.realm++;
        x.fails = 0;
        G.addEss(3 * Math.pow(x.realm, 2.2), 'xianxia');
        G.addSigns(2, 'xianxia');
        G.log(`천겁을 넘었다! 「${X.realmName(x.realm)}」 경지`, 'xianxia', 'good');
        G.fx(rt, { k: 'ring', x: rt.me.x, y: rt.me.y, r: 4, t: 1.2, col: '#ffe08a' });
        G.J.finish('xianxia', rt.me.x, rt.me.y);
        G.J.sfx('xianxia', 'finish');
      } else {
        x.qi -= cost * 0.4 * (1 - ta('tribSafe'));
        x.devT = DEVIATION;
        x.fails++;
        G.J.sfx('xianxia', 'lose');
        G.J.shake('xianxia', 10, 0, 0, 0.5);
        G.log('천겁에 실패했다… 도심이 흔들린다', 'xianxia', 'bad');
      }
      X.heal(x, rt);
      rt.state = 'meditate';
      rt.stT = 0;
    },

    tick(x, dt) {
      const rt = X.rt(x), m = rt.map, me = rt.me;
      G.fxTick(rt, dt);
      me.moving = false;
      if (x.devT > 0) x.devT -= dt;
      x.qi += X.qiRate(x) * dt;
      me.max = X.power(x) * 6;
      const speed = 4.2;
      // 영초와 단로
      for (const p of rt.plots) if (p.g < HERB_T) p.g += dt * tm('herb');
      if (x.herbs >= 3 && (rt.alchT += dt * tm('alch')) >= ALCH_T) {
        rt.alchT = 0; x.herbs -= 3; x.pills = Math.min(20, x.pills + 1);
        const [fx, fy] = m.poi.F[0];
        G.fx(rt, { k: 'tile', key: 'fx_fire', x: fx, y: fy, t: 0.8 });
        G.fx(rt, { k: 'text', x: fx, y: fy - 1, s: '단약 +1', col: '#ffd24a', t: 1.2 });
      }
      // 제자
      const nd = Math.min(6, ta('disciple'));
      while (rt.disciples.length < nd) {
        const [qx, qy] = m.poi.Q[0];
        rt.disciples.push({ kind: 'ally', t: ['wb_human', 'wl_white', 'q_disciple', 'wh_topknot'], x: qx, y: qy, s: 0.95, carry: 0, goal: null });
      }
      for (const d of rt.disciples) {
        d.moving = false;
        if (d.carry) {
          const [fx, fy] = m.poi.F[0];
          if (GR.moveTo(m, d, fx, fy + 1, 3, dt, 0.3)) { x.herbs += d.carry; d.carry = 0; }
          continue;
        }
        if (!d.goal || d.goal.g < HERB_T) d.goal = rt.plots.find(p => p.g >= HERB_T && !rt.disciples.some(o => o !== d && o.goal === p)) || null;
        if (d.goal) { if (GR.moveTo(m, d, d.goal.x, d.goal.y, 3, dt, 0.3)) { d.goal.g = 0; d.carry = 1; d.goal = null; } }
        else { const [qx, qy] = m.poi.Q[0]; GR.moveTo(m, d, qx, qy, 2, dt, 0.5); }
      }
      // 요수
      const cap = Math.min(8, 3 + Math.floor(x.realm / 2));
      if ((rt.beastT -= dt) <= 0 && rt.beasts.length < cap) {
        rt.beastT = 6;
        const [bx, by] = U.pick(m.poi.B), hp = X.beastHp(x.realm);
        rt.beasts.push({ kind: 'mon', t: { k: 'q_beast', v: x.realm % 6 }, x: bx, y: by, s: 1, hp, max: hp, r: x.realm, bar: true, goal: null, atkT: 1 });
      }
      for (const b of rt.beasts) {
        b.moving = false;
        if (b.aggro && GR.dist(b, me) < 1.4) {
          if ((b.atkT -= dt) <= 0) { b.atkT = 1; me.hp -= b.max * 0.08; }
        } else if (!b.goal || GR.moveTo(m, b, b.goal[0], b.goal[1], 1.2, dt)) b.goal = U.pick(m.poi.B.concat(m.poi.d || []).slice(0, 200));
      }
      // 도전자
      if (!rt.rival && (rt.rivalT -= dt) <= 0) {
        const o = X.opp(x.k), [gx, gy] = m.poi.G[0];
        rt.rival = { kind: 'mon', t: 'o_' + Math.min(8, o.tier), x: gx, y: gy, s: 1.1, hp: o.power * 6, max: o.power * 6, o, bar: true, label: `${o.title} ${o.name}` };
        G.fx(rt, { k: 'text', x: gx, y: gy - 1.2, s: '도전자 등장', col: '#ff9a6a', t: 2, sz: 1.2, pop: true });
        G.J.sfx('xianxia', 'wave');
      }
      if (rt.rival && rt.state !== 'duel') {
        const [gx, gy] = m.poi.G[0];
        GR.moveTo(m, rt.rival, gx, gy - 3, 2, dt, 0.2);
      }
      // 수도자
      const [vx, vy] = m.poi.V[0];
      if (rt.state === 'trib') {
        const [px, py] = m.poi.p[0];
        if (GR.moveTo(m, me, px, py, speed, dt, 0.1)) {
          rt.trib += dt;
          if (Math.random() < dt * 4) {
            G.fx(rt, { k: 'bolt', x: px + (Math.random() - 0.5) * 3, y: py + (Math.random() - 0.5) * 2, t: 0.3, col: '#d9c2ff' });
            G.J.sfx('xianxia', 'thunder');
            G.J.shake('xianxia', 3, 0, 1, 0.15);
          }
          if (Math.random() < dt * 3) G.fx(rt, { k: 'tile', key: 'fx_storm', x: px + (Math.random() - 0.5) * 5, y: py - 1 + (Math.random() - 0.5) * 2, t: 1, s: 2 });
          if (rt.trib >= TRIB_T) X.resolveTrib(x, rt);
        }
      } else if (rt.state === 'duel') {
        const r = rt.rival;
        if (GR.dist(me, r) > 1.5) GR.moveTo(m, me, r.x, r.y, speed, dt, 1.4);
        else if ((rt.stT += dt) >= 0.6) {
          rt.stT = 0;
          const my = X.power(x) * (0.85 + Math.random() * 0.3), their = r.o.power * (0.85 + Math.random() * 0.3);
          r.hp -= my; me.hp -= their;
          G.fx(rt, { k: 'proj', key: 'fx_sword', x: me.x, y: me.y, x2: r.x, y2: r.y, t: 0.25 });
          G.fx(rt, { k: 'proj', key: 'fx_zap', x: r.x, y: r.y, x2: me.x, y2: me.y, t: 0.25 });
          G.J.hit('xianxia', r); G.J.hit('xianxia', me);
          G.J.sfx('xianxia', 'hit');
          if (r.hp <= 0 || me.hp <= 0) {
            const win = r.hp <= 0 && (me.hp > 0 || Math.random() < 0.5);
            if (win) {
              const g = r.o.stone * X.stoneMult() * tm('rival');
              X.gain(x, g);
              G.addEss(X.duelEss(x.k), 'xianxia');
              x.k++;
              if (x.k % 25 === 0) G.addSigns(1, 'xianxia');
              G.fx(rt, { k: 'text', x: me.x, y: me.y - 1.2, s: `승리 +${U.fmt(g)}`, col: '#ffd24a', t: 1.5, sz: 1.3, pop: true });
              G.J.hit('xianxia', r, 0.6);
              G.J.shake('xianxia', 6, r.x > me.x ? 1 : -1, 0, 0.25);
              G.J.sfx('xianxia', 'chime');
            } else { G.fx(rt, { k: 'text', x: me.x, y: me.y - 1.2, s: '패배', col: '#ff6b6b', t: 1.5, sz: 1.3, pop: true }); G.J.sfx('xianxia', 'lose'); }
            rt.rival = null;
            rt.rivalT = RIVAL_T;
            X.heal(x, rt);
            rt.state = 'meditate';
            rt.stT = 0;
          }
        }
      } else if (rt.state === 'hunt') {
        const b = rt.target;
        if (!b || b.hp <= 0) { rt.state = 'meditate'; rt.stT = 0; }
        else if (GR.dist(me, b) > 1.3) GR.moveTo(m, me, b.x, b.y, speed, dt, 1.2);
        else if ((rt.atkT = (rt.atkT || 0) - dt) <= 0) {
          rt.atkT = 0.7;
          me.flip = b.x < me.x;
          G.fx(rt, { k: 'slash', x: b.x, y: b.y, t: 0.18 });
          G.J.sfx('xianxia', 'tap');
          X.hurtBeast(x, rt, b, X.power(x));
        }
        if (me.hp <= 0) { G.log('요수에게 밀려 동부로 물러났다', 'xianxia', 'bad'); X.heal(x, rt); me.x = vx; me.y = vy; rt.state = 'meditate'; rt.stT = 0; rt.target = null; }
      } else {
        // 좌선: 영맥까지 가서 앉는다. 도전자가 기다리면 내려가고, 영기가 차면 천겁, 좌선이 끝나면 사냥.
        if (rt.rival && GR.dist(rt.rival, { x: m.poi.G[0][0], y: m.poi.G[0][1] - 3 }) < 0.5) { rt.state = 'duel'; rt.stT = 0; }
        else if (x.autoBreak && x.devT <= 0 && x.qi >= X.breakCost(x.realm) && X.breakChance(x) >= x.autoThr) X.breakthrough(x);
        else if (GR.moveTo(m, me, vx, vy, speed, dt, 0.1)) {
          rt.stT += dt;
          me.hp = Math.min(me.max, me.hp + me.max * 0.1 * dt);
          if (Math.random() < dt * 2) G.fx(rt, { k: 'text', x: me.x + (Math.random() - 0.5) * 1.4, y: me.y - 0.6, s: '氣', col: '#9fe0ff', t: 0.9 });
          if (rt.stT >= MED_T && rt.beasts.length) {
            rt.target = rt.beasts.reduce((a, b) => (GR.dist(me, a) < GR.dist(me, b) ? a : b));
            rt.state = 'hunt';
            rt.stT = 0;
          }
        }
      }
    },
    view(x) {
      const rt = X.rt(x);
      const ents = [];
      for (const p of rt.plots) if (p.g >= HERB_T) ents.push({ t: 'q_herb', x: p.x, y: p.y, s: 0.9 });
      if (X.meditating(x)) ents.push({ t: { k: 'q_aura' + Math.min(3, Math.floor(x.realm / 3)), v: Math.floor(Date.now() / 250) }, x: rt.me.x, y: rt.me.y, s: 2.2, alpha: 0.7, under: true });
      ents.push(...rt.disciples, ...rt.beasts);
      if (rt.rival) ents.push(rt.rival);
      ents.push(rt.me);
      return { map: rt.map, ents, fx: rt.fx, fit: true, cam: rt.me, terrain: (cx, cy) => D.tiles[GR.at(rt.map, cx, cy)] || null, tint: x.devT > 0 ? 'rgba(120,0,40,0.18)' : null };
    },
    status: x => X.realmName(x.realm),
  };
  return X;
})();
