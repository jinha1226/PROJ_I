'use strict';
// 크툴루 · 인스머스의 밤 (심해 낚시 — Tiny Fishing, Dredge 계열)
// 바다를 옆에서 자른 맵. 배에서 바늘을 내린다(줄 길이까지). 내려가다 물고기에 닿으면 거기서 감기 시작한다.
// 감아 올릴 때 닿는 물고기는 걸린다(바늘 수만큼). 수면에 닿으면 팔아서 동전, 처음 잡은 어종은 도감에 오른다.
// 깊을수록 값비싸고 기괴한 것들이 나오고, 이성이 깎인다. 이성이 낮을수록 값은 커지지만 0이 되면 줄이 끊기고 광기.
// 해구부터는 촉수가 떠다닌다: 걸린 게 있을 때 닿으면 줄이 끊긴다. 클릭으로 퇴치.
// 바늘은 자동으로 피하고 노리지만, 맵을 누르거나 끌면 직접 조종한다.
G.RT = G.RT || {};
G.Cthulhu = (() => {
  const D = G.D.C, U = G.U, GR = G.Grid;
  const tm = k => G.Tree.mul('cthulhu', G.S.w.cthulhu.tree, k);
  const ta = k => G.Tree.add('cthulhu', G.S.w.cthulhu.tree, k);
  const W = 16, SURF = 3, MAXD = 300, DOWN = 7, UP = 4.5, STEER = 7, IDLE_T = 1, MAD = 12, LANE = 2, CALM = 12;

  const C = {
    SURF,
    init(head = 0) {
      return { coins: 20 * Math.pow(10, head), san: 100, tree: G.Tree.init('cthulhu'), madT: 0, auto: true, dex: {}, best: 0, trips: 0, last: [] };
    },
    rt(c) { return G.RT.cthulhu || (G.RT.cthulhu = C.boot(c)); },
    boot() {
      // 바다 단면: 위 3줄 밤하늘, 수면, 깊이별 물. 양옆은 들쭉날쭉한 절벽.
      const rows = [];
      for (let y = 0; y < SURF + MAXD + 2; y++) {
        let r = '';
        const d = y - SURF, z = C.zoneOf(d), cl = d > 2 ? 1 + (Math.sin(y * 0.37) + Math.sin(y * 0.13) > 1.2 ? 1 : 0) : 0;
        for (let x = 0; x < W; x++) {
          if (y < SURF) r += ' ';
          else if (y === SURF) r += '~';
          else if (y >= SURF + MAXD + 1 || x < cl || x >= W - cl) r += 'R';
          else r += String(z);
        }
        rows.push(r);
      }
      const map = GR.fromAscii(rows, '~0123');
      const boat = { shape: 'boat', x: W / 2 - 0.5, y: SURF - 0.45, s: 1.6, rod: { x: W / 2 + 0.6, y: SURF - 1.9 } };
      return {
        map, fx: [], phase: 'idle', t: IDLE_T, boat,
        fisher: { kind: 'hero', t: ['wb_human', 'c_investigator', 'c_hat'], art: 'c_fisher', x: W / 2 - 0.9, y: SURF - 1.15, s: 1 },
        hook: { shape: 'hook', x: W / 2, y: SURF, s: 1 }, fish: [], tents: [], hooked: [], steerX: null, steerT: 0, deepest: 0,
      };
    },
    zoneOf: d => D.zones.findIndex(z => d <= z.to),
    lineD: () => Math.min(MAXD, 6 + ta('line')),
    maxCatch: () => 3 + ta('catch'),
    reel: () => UP * tm('reel'),
    maxSan: () => 100 + 20 * ta('mind'),
    sanMult: c => 1 + 1.5 * (1 - c.san / C.maxSan()),
    depthMult: d => Math.pow(1.06, d),
    valueMult(c) {
      let m = tm('value') * (1 + G.relicVal('c_prize')) * G.globalMult() * C.sanMult(c);
      if (G.synergy('syn_heaven')) m *= 1 + 0.15 * G.S.w.xianxia.realm;
      return m;
    },
    value: (c, f) => f.sp.v * C.depthMult(f.d) * C.valueMult(c),
    gain(c, n) { c.coins += n; G.tally('cthulhu', n); },

    // ── 던지기: 줄 길이까지 물고기와 촉수를 채운다 ──
    cast(c) {
      const rt = C.rt(c);
      if (rt.phase !== 'idle' || c.madT > 0) return false;
      const maxD = C.lineD();
      rt.fish = []; rt.tents = []; rt.hooked = []; rt.deepest = 0;
      for (let d = 3; d <= maxD + 2 && d <= MAXD; d += LANE) {
        const z = C.zoneOf(d), y = SURF + d + Math.random() * 0.8;
        if (z >= 2 && U.chance(0.12)) {
          const hp = 3;
          rt.tents.push({ kind: 'mon', tent: true, t: { k: 'sea_tent', v: U.rand(8) }, x0: 2 + Math.random() * (W - 4), x: 0, y, s: 1.4, hp, max: hp, bar: true, ph: Math.random() * 6 });
          continue;
        }
        if (!U.chance(0.75)) continue;
        const pool = D.fish.filter(f => (f.zMax != null ? z >= f.z && z <= f.zMax : f.z === z));
        const sp = U.wpick(pool, f => f.w * (f.sign ? (ta('deal') ? 2 : 1) : f.w < 1 ? 1 + ta('bait') : 1));
        const dir = U.chance(0.5) ? 1 : -1;
        rt.fish.push({ kind: 'mon', sp, t: sp.t, tint: sp.tint, x: 1.8 + Math.random() * (W - 3.6), y, d, dir, spd: sp.spd * (0.7 + Math.random() * 0.6), s: (sp.s || 0.9), glow: sp.sign ? '#c78bff' : null });
      }
      rt.phase = 'down';
      c.trips++;
      G.J.sfx('cthulhu', 'select');
      return true;
    },
    // 줄이 끊긴다: 걸린 것을 모두 잃는다
    snap(c, rt, why) {
      for (const f of rt.hooked) G.fx(rt, { k: 'die', spr: f.t, x: f.x, y: f.y, s: f.s, t: 0.6 });
      rt.hooked = [];
      G.fx(rt, { k: 'text', x: rt.hook.x, y: rt.hook.y - 0.6, s: why, col: '#ff7a7a', t: 1.2, sz: 1.2, pop: true });
      G.J.sfx('cthulhu', 'lose');
      G.J.shake('cthulhu', 9, 0, -1, 0.4);
    },
    hurt(c, n) {
      c.san -= n;
      if (c.san > 0) return;
      c.san = 0;
      c.madT = MAD;
      const rt = C.rt(c);
      if (rt.hooked.length) C.snap(c, rt, '광기');
      if (rt.phase === 'down') rt.phase = 'up';
      G.log('광기 발작! 줄을 놓쳤다…', 'cthulhu', 'bad');
      G.J.sfx('cthulhu', 'mad');
      G.J.flash('cthulhu', '#8f2bd6');
    },
    // 수면 도착: 판다, 도감, 정수
    land(c, rt) {
      let sum = 0, big = null, signs = 0, fresh = 0;
      const got = [];
      rt.hooked.forEach((f, i) => {
        const sp = f.sp;
        if (sp.sign) signs++;
        else {
          const v = C.value(c, f);
          sum += v;
          G.fx(rt, { k: 'text', x: rt.boat.x + (i - rt.hooked.length / 2) * 0.6, y: SURF - 1.6 - i * 0.25, s: '+' + U.fmt(v), col: sp.v >= 60 ? '#ffd24a' : '#bfe8a0', t: 1.3, sz: sp.v >= 60 ? 1.4 : 1, pop: true });
          if (!big || sp.v > big.v) big = sp;
        }
        G.fx(rt, { k: 'proj', key: f.t, x: f.x, y: f.y, x2: rt.boat.x, y2: SURF - 0.6, t: 0.4 + i * 0.08 });
        if (!c.dex[sp.id]) {
          c.dex[sp.id] = 0;
          signs += ta('deal') ? 2 : 1;
          G.addEss(0.5 * Math.pow(1 + D.fish.indexOf(sp), 1.2), 'cthulhu');
          G.fx(rt, { k: 'text', x: rt.boat.x, y: SURF - 2.6 - fresh++ * 0.6, s: `도감 · ${sp.n}`, col: '#c7a6ff', t: 2, sz: 1.3, pop: true });
          G.J.sfx('cthulhu', 'chime');
        }
        c.dex[sp.id]++;
        got.push(sp.id);
      });
      C.gain(c, sum);
      if (signs) G.addSigns(signs, 'cthulhu');
      if (rt.deepest > 0) G.addEss(0.02 * Math.pow(rt.deepest, 1.3), 'cthulhu');
      if (got.length) { c.last = got; G.J.sfx('cthulhu', big && big.v >= 60 ? 'jackpot' : 'coin'); }
      if (big && big.v >= 60) { G.J.finish('cthulhu', rt.boat.x, SURF - 0.5, 1.3); G.log(`${big.n}을(를) 낚았다!`, 'cthulhu', 'good'); }
      rt.hooked = [];
      rt.phase = 'idle';
      rt.t = IDLE_T;
    },

    // ── 바늘 조종: 내려갈 때는 피하고, 올라올 때는 값진 것을 노린다 ──
    autoX(c, rt) {
      const h = rt.hook, look = 1.5 + ta('skill'), down = rt.phase === 'down';
      const vy = down ? DOWN : C.reel();
      const ahead = o => (down ? o.y - h.y : h.y - o.y);
      const px = (o, tt) => (o.tent ? o.x : U.clamp(o.x + o.dir * o.spd * tt, 1.5, W - 2.5));
      const danger = [...(down ? rt.fish : []), ...rt.tents].filter(o => ahead(o) > 0 && ahead(o) < look);
      const full = rt.hooked.length >= C.maxCatch();
      let goal = null;
      if (!down && !full) {
        let bv = 0;
        for (const f of rt.fish) { const a = ahead(f); if (a > 0 && a < look + 1.5 && f.sp.v * C.depthMult(f.d) > bv) { bv = f.sp.v * C.depthMult(f.d); goal = f; } }
      }
      let best = h.x, bs = -1e9;
      for (let x = 1.5; x <= W - 2.5; x += 0.5) {
        let md = 9;
        for (const o of danger) md = Math.min(md, Math.abs(px(o, ahead(o) / vy) - x));
        let sc = Math.min(md, 2.2) * (down || rt.hooked.length ? 1 : 0.3) - Math.abs(x - h.x) * 0.04;
        if (goal) sc -= Math.abs(px(goal, ahead(goal) / vy) - x) * 0.8;
        if (sc > bs) { bs = sc; best = x; }
      }
      return best;
    },
    // 맵 클릭: 촉수 → 퇴치, 대기 중 → 던지기, 그 밖 → 바늘을 그쪽으로
    click(c, x, y) {
      const rt = C.rt(c);
      for (const o of rt.tents) if (Math.hypot(o.x - x, o.y - y) < 1.1) {
        o.hp--;
        G.J.hit('cthulhu', o, 0.4, rt.hook);
        G.fx(rt, { k: 'splat', x: o.x, y: o.y, n: 8, ichor: true, s: 1.3, t: 0.5 });
        G.fx(rt, { k: 'impact', x: o.x, y: o.y, s: 1.5, col: '#e8d48a', t: 0.22 });
        G.fx(rt, { k: 'beam', x: rt.boat.x, y: SURF - 1, x2: o.x, y2: o.y, col: '#e8d48a', w: 2, t: 0.15 });
        G.J.sfx('cthulhu', 'hit');
        if (o.hp <= 0) {
          rt.tents = rt.tents.filter(q => q !== o);
          c.san = Math.min(C.maxSan(), c.san + 5);
          G.fx(rt, { k: 'die', spr: o.t, x: o.x, y: o.y, s: o.s, t: 0.5 });
          G.fx(rt, { k: 'text', x: o.x, y: o.y - 0.7, s: '퇴마', col: '#c7a6ff', t: 0.9, pop: true });
          G.J.sfx('cthulhu', 'banish');
        }
        return true;
      }
      if (rt.phase === 'idle') return C.cast(c);
      C.steer(c, x);
      return true;
    },
    steer(c, x) { const rt = C.rt(c); rt.steerX = U.clamp(x, 1.5, W - 2.5); rt.steerT = 1.5; },

    tick(c, dt) {
      const rt = C.rt(c), h = rt.hook;
      G.fxTick(rt, dt);
      if (c.madT > 0 && (c.madT -= dt) <= 0) { c.madT = 0; c.san = C.maxSan() * 0.5; }
      // 물고기·촉수 움직임
      for (const f of rt.fish) {
        f.x += f.dir * f.spd * dt;
        if (f.x < 1.5 || f.x > W - 2.5) { f.dir *= -1; f.x = U.clamp(f.x, 1.5, W - 2.5); }
        f.flip = f.dir > 0;
        f.moving = true;
      }
      for (const o of rt.tents) { o.ph += dt; o.x = U.clamp(o.x0 + Math.sin(o.ph * 0.7) * 2, 1.5, W - 2.5); }
      // 이성: 60m 아래에서는 깎이고, 얕은 곳·수면에서는 돌아온다
      const hd = h.y - SURF;
      if (c.madT <= 0) {
        if (hd > CALM) C.hurt(c, (hd - CALM) * 0.05 * Math.max(0.1, 1 - ta('ward')) * dt);
        else c.san = Math.min(C.maxSan(), c.san + (3 + ta('mind')) * dt);
      }
      // 바늘 조종
      if (rt.phase === 'down' || rt.phase === 'up') {
        if (rt.steerT > 0) rt.steerT -= dt;
        const gx = rt.steerT > 0 ? rt.steerX : C.autoX(c, rt);
        h.x += U.clamp(gx - h.x, -STEER * dt, STEER * dt);
      }
      if (rt.phase === 'idle') {
        h.x += (rt.boat.x + 1.1 - h.x) * Math.min(1, dt * 5); h.y = SURF;
        if (c.madT <= 0 && c.auto && (rt.t -= dt) <= 0) C.cast(c);
      } else if (rt.phase === 'down') {
        h.y += DOWN * dt;
        rt.deepest = Math.max(rt.deepest, h.y - SURF);
        c.best = Math.max(c.best, Math.round((h.y - SURF) * D.M_PER_TILE));
        const f = rt.fish.find(o => Math.hypot(o.x - h.x, o.y - h.y) < 0.6);
        const tn = rt.tents.find(o => Math.hypot(o.x - h.x, o.y - h.y) < 0.8);
        if (f) {
          // 내려가다 물렸다: 여기서 감는다
          rt.fish = rt.fish.filter(o => o !== f);
          rt.hooked.push(f);
          G.J.hit('cthulhu', f, 0.2, h);
          G.J.sfx('cthulhu', 'pop');
          rt.phase = 'up';
        } else if (tn) {
          C.hurt(c, 8);
          G.J.hit('cthulhu', tn, 0.3, h);
          G.J.shake('cthulhu', 5);
          G.J.sfx('cthulhu', 'hurt');
          rt.phase = 'up';
        } else if (h.y - SURF >= C.lineD()) rt.phase = 'up';
      } else if (rt.phase === 'up') {
        h.y -= C.reel() * (c.madT > 0 ? 3 : 1) * dt;
        if (rt.hooked.length < C.maxCatch()) {
          const f = rt.fish.find(o => Math.hypot(o.x - h.x, o.y - h.y) < 0.65);
          if (f) {
            rt.fish = rt.fish.filter(o => o !== f);
            rt.hooked.push(f);
            G.J.hit('cthulhu', f, 0.15, h);
            G.J.sfx('cthulhu', 'pop');
          }
        }
        const tn = rt.tents.find(o => Math.hypot(o.x - h.x, o.y - h.y) < 0.8);
        if (tn && rt.hooked.length && !tn.hitT) {
          tn.hitT = 1;
          if (U.chance(ta('charm'))) G.fx(rt, { k: 'text', x: h.x, y: h.y - 0.6, s: '부적!', col: '#e8d48a', t: 1, pop: true });
          else { C.snap(c, rt, '줄이 끊겼다'); C.hurt(c, 10); }
        }
        if (h.y <= SURF) { h.y = SURF; rt.phase = 'land'; C.land(c, rt); }
      }
      // 걸린 것들은 바늘 아래에 매달린다
      rt.hooked.forEach((f, i) => { f.x = h.x + Math.sin(i * 2.1) * 0.25; f.y = h.y + 0.45 + i * 0.35; f.moving = true; });
    },
    view(c) {
      const rt = C.rt(c), h = rt.hook, hd = Math.max(0, h.y - SURF), lowSan = 1 - c.san / C.maxSan();
      const ents = [rt.boat, rt.fisher, ...rt.fish, ...rt.tents, ...rt.hooked, h];
      return {
        map: rt.map, ents, fx: rt.fx, cam: { x: W / 2, y: Math.max(SURF + 3, h.y + (rt.phase === 'down' ? 3.5 : rt.phase === 'up' ? -2 : 0)) }, viewH: 13,
        lines: [{ x: rt.boat.rod.x, y: rt.boat.rod.y, x2: h.x, y2: h.y - 0.3, col: 'rgba(230,230,210,0.7)', w: 1 }],
        lamp: { x: h.x, y: h.y, r: 3 + ta('lamp'), a: Math.min(0.9, Math.max(0, (hd - 6) / 70)) },
        terrain(x, y) {
          const ch = GR.at(rt.map, x, y);
          if (ch === ' ') return null;
          if (ch === '~') return ['sea_w0', 'sea_wave'];
          if (ch === 'R') return ['sea_rock'];
          return [D.zones[+ch].t];
        },
        tint: c.madT > 0 ? 'rgba(90,20,120,0.35)' : lowSan > 0.3 ? `rgba(20,60,40,${(lowSan - 0.3) * 0.35})` : null,
      };
    },
    status: c => `${c.best}m`,
  };
  return C;
})();
