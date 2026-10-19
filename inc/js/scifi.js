'use strict';
// SF · 최후의 방어선 (경로형 타워디펜스 — The Tower, Sir We Have an Orc Problem 계열)
// 적은 출현 지점(S)에서 금속 통로(=)를 따라 코어(C)로 간다. 포대 자리(O)에 포탑을 짓는다.
// 포탑 종류와 위력은 스킬트리로 연다. 맵 빈 곳 클릭 = 궤도 폭격. 코어가 무너지면 3웨이브 물러난다.
G.RT = G.RT || {};
G.Scifi = (() => {
  const D = G.D.S, U = G.U, GR = G.Grid;
  const tm = k => G.Tree.mul('scifi', G.S.w.scifi.tree, k);
  const ta = k => G.Tree.add('scifi', G.S.w.scifi.tree, k);
  const PAUSE = 2.5, BASE_PADS = 4;

  const S = {
    init(head = 0) {
      return { wave: 1, maxWave: 1, credits: 30 * Math.pow(10, head), core: 100, towers: {}, tree: G.Tree.init('scifi'), auto: true };
    },
    rt(s) { return G.RT.scifi || (G.RT.scifi = S.boot(s)); },
    boot(s) {
      const map = GR.fromAscii(D.map, D.pass);
      // 통로를 S에서 C까지 따라가며 경로를 만든다
      const path = [map.poi.S[0]], seen = new Set([path[0].join()]);
      for (let guard = 0; guard < 500; guard++) {
        const [x, y] = path[path.length - 1];
        if (GR.at(map, x, y) === 'C') break;
        const nx = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).find(p => '=C'.includes(GR.at(map, p[0], p[1])) && !seen.has(p.join()));
        if (!nx) break;
        seen.add(nx.join());
        path.push(nx);
      }
      // 포대 자리: 사거리 3 안에 통로가 많은 자리부터 쓴다
      const cover = ([px, py]) => path.filter(([x, y]) => Math.hypot(x - px, y - py) <= 3).length;
      const pads = (map.poi.O || []).slice().sort((a, b) => cover(b) - cover(a));
      const rt = { map, path, pads, fx: [], en: [], queue: [], spawnT: 0, state: 'pause', pauseT: PAUSE, cds: {}, strikeCd: 0, frame: 0 };
      return rt;
    },
    padCount: () => BASE_PADS + ta('pads'),
    unlocked: t => !D.turrets[t].unlock || ta(D.turrets[t].unlock) > 0,
    built: (s, t) => Object.values(s.towers).filter(x => x === t).length,
    buildCost: (s, t) => D.turrets[t].cost * Math.pow(1.5, S.built(s, t)),
    coreMax: () => 100 * tm('core') * (1 + G.relicVal('s_core')),
    dmgMult() {
      let m = G.globalMult() * (1 + G.relicVal('s_dmg')) * tm('allDmg');
      if (G.synergy('syn_magitech')) m *= 1 + 0.03 * (G.S.w.fantasy.maxFloor - 1);
      return m;
    },
    creditMult() {
      let m = G.globalMult() * (1 + G.relicVal('s_credit')) * tm('credit');
      if (G.synergy('syn_void')) m *= 1 + Math.min(2, 0.02 * G.S.signs);
      return m;
    },
    turretDmg: t => D.turrets[t].dmg * tm(t) * S.dmgMult(),
    rate: t => D.turrets[t].rate * tm('rate'),
    hpScale: w => 6 * Math.pow(1.14, w - 1),
    bounty: w => 1.5 * Math.pow(1.12, w - 1),
    clearBonus: w => 4 * Math.pow(1.12, w),
    waveEss: w => 0.3 * Math.pow(w / 3, 1.4),
    strikeDmg: s => 15 * Math.pow(1.14, s.wave - 1) * tm('strike') * G.globalMult(),
    strikeCdMax: () => 4 * Math.max(0.3, 1 - ta('strikeCd')),
    gain(s, n) { s.credits += n; G.tally('scifi', n); },

    genWave(w) {
      const q = [], n = Math.min(8 + Math.floor(w * 0.7), 40);
      for (let i = 0; i < n; i++) {
        const t = U.wpick(['drone', 'walker', 'swarm', 'shield'], k =>
          k === 'drone' ? 1 : k === 'walker' ? (w >= 4 ? 0.45 : 0) : k === 'swarm' ? (w >= 7 ? 0.35 : 0) : (w >= 15 ? 0.2 : 0));
        if (t === 'swarm') q.push('swarm', 'swarm', 'swarm'); else q.push(t);
      }
      if (w % 10 === 0) q.push('boss');
      return q;
    },
    startWave(s) {
      const rt = S.rt(s);
      if (rt.state === 'wave') return;
      rt.state = 'wave';
      rt.queue = S.genWave(s.wave);
      G.J.sfx('scifi', 'wave');
      rt.spawnT = 0;
    },
    // 경로 위 거리 d(칸)의 좌표
    pos(rt, d) {
      const p = rt.path, i = Math.min(p.length - 2, Math.max(0, Math.floor(d))), f = Math.min(1, d - i);
      return [p[i][0] + (p[i + 1][0] - p[i][0]) * f, p[i][1] + (p[i + 1][1] - p[i][1]) * f];
    },
    spawn(s, rt, type) {
      const T = D.enemies[type], hp = T.hp * S.hpScale(s.wave);
      const e = { kind: 'mon', type, t: 'e_' + type, s: T.s, hp, max: hp, d: 0, spd: T.spd * Math.min(1.6, 1 + s.wave * 0.004), slow: 0, bounty: T.bounty * S.bounty(s.wave), dmg: T.dmg, bar: true };
      [e.x, e.y] = S.pos(rt, 0);
      rt.en.push(e);
    },
    // power > 0: 궤도 폭격처럼 직접 때린 것 (히트스톱)
    hit(s, rt, e, dmg, power = 0) {
      if (e.hp <= 0) return;
      e.hp -= dmg;
      G.J.hit('scifi', e, power);
      if (e.hp <= 0) {
        const g = e.bounty * S.creditMult();
        S.gain(s, g);
        G.fx(rt, { k: 'text', x: e.x, y: e.y - 0.7, s: '+' + U.fmt(g), col: '#7ff0ff', t: 0.9, sz: e.type === 'boss' ? 1.6 : 1, pop: e.type === 'boss' });
        G.J.sfx('scifi', 'pop');
        if (e.type === 'boss') { G.J.finish('scifi', e.x, e.y); G.J.sfx('scifi', 'finish'); }
      }
    },
    fire(s, rt, i, t) {
      const T = D.turrets[t], [px, py] = rt.pads[i];
      const tg = rt.en.filter(e => e.hp > 0 && Math.hypot(e.x - px, e.y - py) <= T.range).sort((a, b) => b.d - a.d);
      if (!tg.length) return false;
      const dmg = S.turretDmg(t), from = { x: px, y: py };
      G.J.sfx('scifi', 'zap');
      if (T.pierce) {
        for (const e of tg.slice(0, T.pierce)) S.hit(s, rt, e, dmg);
        G.fx(rt, { k: 'beam', x: px, y: py, x2: tg[0].x, y2: tg[0].y, col: T.col, w: 3, t: 0.25 });
      } else if (T.splash) {
        const c = tg[0];
        for (const e of rt.en) if (Math.hypot(e.x - c.x, e.y - c.y) <= T.splash) S.hit(s, rt, e, dmg);
        G.fx(rt, { k: 'proj', key: 'fx_dart', x: px, y: py, x2: c.x, y2: c.y, t: 0.3 });
        G.fx(rt, { k: 'ring', x: c.x, y: c.y, r: T.splash, t: 0.4, col: T.col });
      } else if (T.slow) {
        for (const e of tg) { S.hit(s, rt, e, dmg); e.slow = 1.5; }
        G.fx(rt, { k: 'ring', x: px, y: py, r: T.range, t: 0.3, col: T.col });
      } else if (T.chain) {
        let d = dmg;
        const pts = [from];
        for (const e of tg.slice(0, T.chain)) { S.hit(s, rt, e, d); d *= 0.85; pts.push(e); }
        G.fx(rt, { k: 'chain', pts: pts.map(p => [p.x, p.y]), col: T.col, t: 0.2 });
      } else {
        S.hit(s, rt, tg[0], dmg);
        G.fx(rt, { k: 'beam', x: px, y: py, x2: tg[0].x, y2: tg[0].y, col: T.col, w: 1.5, t: 0.12 });
      }
      return true;
    },
    build(s, i, t) {
      if (i >= S.padCount() || s.towers[i] || !S.unlocked(t)) return false;
      const c = S.buildCost(s, t);
      if (s.credits < c) return false;
      s.credits -= c;
      s.towers[i] = t;
      const [px, py] = S.rt(s).pads[i];
      G.fx(S.rt(s), { k: 'ring', x: px, y: py, r: 1.2, t: 0.5, col: '#3ef0ff' });
      G.J.sfx('scifi', 'build');
      return true;
    },
    scrap(s, i) { delete s.towers[i]; },
    padAt(s, x, y) {
      const rt = S.rt(s);
      return rt.pads.findIndex(([px, py]) => Math.abs(px - x) < 0.6 && Math.abs(py - y) < 0.6);
    },
    // 빈 곳 클릭 = 궤도 폭격
    strike(s, x, y) {
      const rt = S.rt(s);
      if (rt.strikeCd > 0) { G.J.sfx('scifi', 'error'); return false; }
      rt.strikeCd = S.strikeCdMax();
      const dmg = S.strikeDmg(s);
      G.fx(rt, { k: 'bolt', x, y, t: 0.4, col: '#ff9a3a' });
      G.fx(rt, { k: 'ring', x, y, r: 1.5, t: 0.4, col: '#ff9a3a' });
      G.J.sfx('scifi', 'boom');
      G.J.shake('scifi', 7, 0, 1, 0.3);
      for (const e of rt.en) if (Math.hypot(e.x - x, e.y - y) <= 1.5) {
        G.fx(rt, { k: 'text', x: e.x, y: e.y - 0.5, s: U.fmt(dmg), col: '#ffb36b', t: 0.7, sz: 1.3, pop: true });
        S.hit(s, rt, e, dmg, 0.4);
      }
      return true;
    },
    clearWave(s, rt) {
      const w = s.wave;
      S.gain(s, S.clearBonus(w) * S.creditMult());
      G.addEss(S.waveEss(w), 'scifi');
      G.J.sfx('scifi', 'chime');
      if (w % 10 === 0) { G.addSigns(1, 'scifi'); G.log(`WAVE ${w} 모선 격추!`, 'scifi', 'good'); }
      s.wave++;
      if (s.wave > s.maxWave) s.maxWave = s.wave;
      rt.state = 'pause';
      rt.pauseT = PAUSE;
      s.core = Math.min(S.coreMax(), s.core + S.coreMax() * 0.25);
    },
    failWave(s, rt) {
      G.log(`WAVE ${s.wave} 방어 실패 — 코어 재가동, 3웨이브 후퇴`, 'scifi', 'bad');
      G.J.sfx('scifi', 'lose');
      G.J.shake('scifi', 10, 0, 0, 0.5);
      s.wave = Math.max(1, s.wave - 3);
      rt.en = [];
      rt.queue = [];
      s.core = S.coreMax();
      rt.state = 'pause';
      rt.pauseT = PAUSE * 2;
    },

    tick(s, dt) {
      const rt = S.rt(s);
      G.fxTick(rt, dt);
      rt.frame += dt;
      if (rt.strikeCd > 0) rt.strikeCd -= dt;
      const cm = S.coreMax();
      s.core = Math.min(cm, s.core + cm * ta('coreRegen') * dt);
      if (rt.state === 'pause') {
        if (s.auto && (rt.pauseT -= dt) <= 0) S.startWave(s);
        return;
      }
      if (rt.queue.length && (rt.spawnT -= dt) <= 0) {
        S.spawn(s, rt, rt.queue.shift());
        rt.spawnT = s.wave < 20 ? 0.7 : 0.5;
      }
      const end = rt.path.length - 1;
      for (const e of rt.en) {
        e.d += e.spd * (e.slow > 0 ? 1 - D.turrets.cryo.slow - ta('slow') : 1) * dt;
        if (e.slow > 0) e.slow -= dt;
        const [nx, ny] = S.pos(rt, e.d);
        if (Math.abs(nx - e.x) > 0.001) e.flip = nx < e.x;
        e.x = nx; e.y = ny;
        e.moving = true;
        if (e.d >= end && e.hp > 0) {
          s.core -= e.dmg;
          e.hp = 0;
          e.leak = true;
          G.fx(rt, { k: 'ring', x: e.x, y: e.y, r: 1, t: 0.4, col: '#ff5a6e' });
          G.J.sfx('scifi', 'hurt');
          G.J.shake('scifi', 4, 1, 0, 0.2);
        }
      }
      for (const [i, t] of Object.entries(s.towers)) {
        if (+i >= S.padCount()) continue;
        rt.cds[i] = (rt.cds[i] || 0) - dt;
        while (rt.cds[i] <= 0) {
          if (!S.fire(s, rt, +i, t)) { rt.cds[i] = 0; break; }
          rt.cds[i] += 1 / S.rate(t);
        }
      }
      rt.en = rt.en.filter(e => e.hp > 0);
      if (s.core <= 0) return S.failWave(s, rt);
      if (!rt.queue.length && !rt.en.length) S.clearWave(s, rt);
    },
    view(s) {
      const rt = S.rt(s), ents = [];
      const [cx, cy] = rt.map.poi.C[0];
      ents.push({ t: { k: 's_core', v: Math.floor(rt.frame * 7) }, x: cx, y: cy, s: 1.6, glow: s.core / S.coreMax() > 0.3 ? '#3ef0ff' : '#ff5a6e' });
      rt.pads.forEach(([px, py], i) => {
        const t = s.towers[i];
        if (i >= S.padCount()) ents.push({ t: 'ui_lock', x: px, y: py, s: 0.6, alpha: 0.5 });
        else if (t) ents.push({ t: { k: D.turrets[t].t, v: Math.floor(rt.frame * 6) }, x: px, y: py, s: 1.05 });
        else ents.push({ x: px, y: py, s: 1, pad: true });
        if (i === s.selPad) ents.push({ x: px, y: py, s: 1.15, pad: true, sel: true });
      });
      ents.push(...rt.en);
      return { map: rt.map, ents, fx: rt.fx, fit: true, terrain: (x, y) => D.tiles[GR.at(rt.map, x, y)] || null };
    },
    status: s => `WAVE ${s.wave}`,
  };
  return S;
})();
