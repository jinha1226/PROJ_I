'use strict';
// 크툴루 · 인스머스의 밤 (심해 낚시 — Tiny Fishing, Dredge 계열)
// 바다를 옆에서 자른 맵. 배에서 바늘을 내린다(줄 길이까지). 내려가다 물고기에 닿으면 거기서 감기 시작한다.
// 감아 올릴 때 닿는 물고기는 걸린다(바늘 수만큼). 수면에 닿으면 팔아서 동전, 처음 잡은 어종은 도감에 오른다.
// 깊을수록 값비싸고 기괴한 것들이 나온다. 이성은 한 번 출항의 한도(판타지의 체력, 무협의 나이): 물속에 있는 동안
// 깊이와 시간에 따라 깎이고 저절로 돌아오지 않는다. 낮을수록 값은 커지지만, 0이 되면 줄이 끊기고 항구에서 잠깐 쉰다.
// 해구부터는 촉수가 떠다닌다: 걸린 게 있을 때 닿으면 줄이 끊긴다. 클릭으로 퇴치.
// 바늘은 자동으로 피하고 노리지만, 맵을 누르거나 끌면 직접 조종한다.
G.RT = G.RT || {};
G.Cthulhu = (() => {
  const D = G.D.C, U = G.U, GR = G.Grid;
  const tm = k => G.Tree.mul('cthulhu', G.S.w.cthulhu.tree, k);
  const ta = k => G.Tree.add('cthulhu', G.S.w.cthulhu.tree, k);
  // W: 바다 폭 (양옆 벽 없음). 물고기·바늘은 LO~HI 안에서 움직인다
  const W = 16, LO = 1.5, HI = W - 2.5, MID = W / 2, SURF = 3, MAXD = 300, DOWN = 18, UP = 3, FULL_UP = 15, STEER = 7, IDLE_T = 1, REST = 10, LANE = 2;

  const C = {
    SURF,
    init(head = 0) {
      return { coins: 20 * Math.pow(10, head), san: 100, tree: G.Tree.init('cthulhu'), madT: 0, auto: true, dex: {}, best: 0, trips: 0, last: [] };
    },
    rt(c) { return G.RT.cthulhu || (G.RT.cthulhu = C.boot(c)); },
    boot() {
      // 바다 단면: 위 3줄 밤하늘, 수면, 깊이별 물, 맨 아래 바닥. 양옆은 벽 없이 탁 트인 바다.
      const rows = [];
      for (let y = 0; y < SURF + MAXD + 2; y++) {
        let r = '';
        const d = y - SURF, z = C.zoneOf(d);
        for (let x = 0; x < W; x++) {
          if (y < SURF) r += ' ';
          else if (y === SURF) r += '~';
          else if (y >= SURF + MAXD + 1) r += 'R';
          else r += String(z);
        }
        rows.push(r);
      }
      const map = GR.fromAscii(rows, '~0123');
      const boat = { shape: 'boat', x: MID - 0.5, y: SURF - 0.45, s: 1.6, rod: { x: MID + 0.6, y: SURF - 1.9 } };
      return {
        map, fx: [], phase: 'idle', t: IDLE_T, boat,
        // 낚시꾼: 주인공 외곽선 없이 어둡게 (0x72 그림 c_fisher, 없으면 DCSS 타일)
        fisher: { kind: 'ally', t: ['wb_human', 'c_investigator', 'c_hat'], art: 'c_fisher', x: MID - 0.9, y: SURF - 1.08, s: 0.85 },
        hook: { shape: 'hook', x: MID, y: SURF, s: 1 }, fish: [], tents: [], hooked: [], steerX: null, steerT: 0, deepest: 0,
      };
    },
    zoneOf: d => D.zones.findIndex(z => d <= z.to),
    lineD: () => Math.min(MAXD, 6 + ta('line')),
    maxCatch: () => 3 + ta('catch'),
    // 감는 속도는 느리게 고정 (올라오며 고르는 재미). 다 잡았거나 이성이 바닥나면 빠르게 끌어올린다
    reel: () => UP,
    upSpeed: (c, rt) => (rt.hooked.length >= C.maxCatch() || c.madT > 0 ? FULL_UP : UP),
    sink: () => DOWN * tm('sink'),
    maxSan: () => 100 + ta('sanMax'),
    // 낮은 이성의 물고기 값 배율: 바닥에서 ×(1 + 상한). 「공포의 탐닉」은 보너스 ×2, 「평정심」은 절반
    sanMult: c => 1 + (1.5 + ta('madVal')) * (1 - c.san / C.maxSan()) * (ta('pact') ? 2 : ta('calm') ? 0.5 : 1),
    // 물속에서 초당 깎이는 이성: 기본 0.5 + 깊이(m)의 제곱근 비례. 빨리 내리고 감을수록 덜 깎인다
    drain(hd) {
      const base = 0.5 * Math.max(0.1, 1 - ta('salt')), deep = 0.15 * Math.sqrt(hd * D.M_PER_TILE) * Math.max(0.1, 1 - ta('ward'));
      return (base + deep) * (1 + 0.3 * ta('pact')) * (1 - 0.3 * ta('calm')) / (1 + G.relicVal('c_san'));
    },
    restT: () => Math.max(2, REST - ta('bunk')),
    heal(c, n) { if (n > 0) c.san = Math.min(Math.max(C.maxSan(), c.san), c.san + n); },
    depthMult: d => Math.pow(1.06, d),
    // 어종별 배율: 얕은 바다 어부 · 대어 전문 · 수집가
    speciesMult(c, sp) {
      return (1 + (sp.z === 0 ? ta('shallow') : 0)) * (1 + (sp.v >= 60 ? ta('bigfish') : 0)) * (1 + ta('collector') * Object.keys(c.dex).length);
    },
    valueMult(c) {
      let m = tm('value') * (1 + G.relicVal('c_prize')) * G.globalMult() * C.sanMult(c);
      if (G.synergy('syn_heaven')) m *= 1 + 0.15 * G.S.w.xianxia.realm;
      return m;
    },
    value: (c, f) => f.sp.v * C.depthMult(f.d) * C.valueMult(c) * C.speciesMult(c, f.sp),
    // 도감 표시가: 그 어종이 나오는 가장 얕은 깊이, 이성 가득일 때 (더 깊이·이성이 낮을수록 비싸진다)
    dexPrice(c, sp) {
      const d = sp.z === 0 ? 3 : D.zones[sp.z - 1].to + 1;
      return sp.v * C.depthMult(d) * C.valueMult(c) / C.sanMult(c) * C.speciesMult(c, sp);
    },
    gain(c, n) { c.coins += n; G.tally('cthulhu', n); },

    // ── 던지기: 줄 길이까지 물고기와 촉수를 채운다 ──
    cast(c) {
      const rt = C.rt(c);
      if (rt.phase !== 'idle' || c.madT > 0) return false;
      const maxD = C.lineD(), rare = 1 + ta('bait') + (c.san < C.maxSan() * 0.3 ? ta('edge') : 0);
      rt.fish = []; rt.tents = []; rt.hooked = []; rt.deepest = 0;
      for (let d = 3; d <= maxD + 2 && d <= MAXD; d += LANE) {
        const z = C.zoneOf(d), y = SURF + d + Math.random() * 0.8;
        if (z >= 2 && U.chance(0.12)) {
          const hp = 3;
          rt.tents.push({ kind: 'mon', tent: true, t: { k: 'sea_tent', v: U.rand(8) }, x0: 2 + Math.random() * (W - 4), x: 0, y, s: 1.4, hp, max: hp, bar: true, ph: Math.random() * 6 });
          continue;
        }
        if (!U.chance(Math.min(0.95, 0.75 + ta('school')))) continue;
        const pool = D.fish.filter(f => (f.zMax != null ? z >= f.z && z <= f.zMax : f.z === z));
        const sp = U.wpick(pool, f => f.w * (f.sign ? (ta('deal') ? 2 : 1) * (1 + ta('runes')) : f.w < 1 ? rare : 1));
        const dir = U.chance(0.5) ? 1 : -1;
        rt.fish.push({ kind: 'mon', sp, t: sp.t, tint: sp.tint, x: 1.8 + Math.random() * (W - 3.6), y, d, dir, spd: sp.spd * (0.7 + Math.random() * 0.6), s: (sp.s || 0.9), glow: sp.sign ? '#c78bff' : null });
      }
      rt.phase = 'down';
      rt.hook.vy = C.sink();
      c.trips++;
      G.J.sfx('cthulhu', 'select');
      return true;
    },
    // 줄이 끊긴다: 걸린 것을 잃는다 (keep: 건지는 비율, 앞에 걸린 것부터)
    snap(c, rt, why, keep = 0) {
      const n = Math.floor(rt.hooked.length * keep);
      for (const f of rt.hooked.slice(n)) G.fx(rt, { k: 'die', spr: f.t, x: f.x, y: f.y, s: f.s, t: 0.6 });
      rt.hooked = rt.hooked.slice(0, n);
      G.fx(rt, { k: 'text', x: rt.hook.x, y: rt.hook.y - 0.6, s: why, col: '#ff7a7a', t: 1.2, sz: 1.2, pop: true });
      G.J.sfx('cthulhu', 'lose');
      G.J.shake('cthulhu', 9, 0, -1, 0.4);
    },
    hurt(c, n) {
      c.san -= n;
      if (c.san > 0) return;
      // 이성 바닥: 줄을 놓치고 서둘러 감아 올려 항구에서 쉰다 (그동안 던지지 않는다)
      c.san = 0;
      c.madT = C.restT();
      const rt = C.rt(c);
      if (rt.hooked.length) C.snap(c, rt, '광기', ta('bless'));
      if (rt.phase === 'down') rt.phase = 'up';
      G.log('이성이 바닥났다… 항구로 돌아가 쉰다', 'cthulhu', 'bad');
      G.J.sfx('cthulhu', 'mad');
      G.J.flash('cthulhu', '#8f2bd6');
    },
    // 수면 도착: 판다, 도감, 정수
    land(c, rt) {
      let sum = 0, big = null, signs = 0, fresh = 0;
      const got = [];
      const ess = 1 + (c.san < C.maxSan() * 0.5 ? ta('whisper') : 0);
      let fishN = 0;
      rt.hooked.forEach((f, i) => {
        const sp = f.sp;
        if (sp.sign) signs++;
        else {
          const v = C.value(c, f) * (1 + (fishN++ ? ta('chain') : 0));
          sum += v;
          G.fx(rt, { k: 'text', x: rt.boat.x + (i - rt.hooked.length / 2) * 0.6, y: SURF - 1.6 - i * 0.25, s: '+' + U.fmt(v), col: sp.v >= 60 ? '#ffd24a' : '#bfe8a0', t: 1.3, sz: sp.v >= 60 ? 1.4 : 1, pop: true });
          if (!big || sp.v > big.v) big = sp;
        }
        G.fx(rt, { k: 'proj', key: f.t, x: f.x, y: f.y, x2: rt.boat.x, y2: SURF - 0.6, t: 0.4 + i * 0.08 });
        if (!c.dex[sp.id]) {
          c.dex[sp.id] = 0;
          signs += ta('deal') ? 2 : 1;
          G.addEss(0.5 * Math.pow(1 + D.fish.indexOf(sp), 1.2) * ess, 'cthulhu');
          G.fx(rt, { k: 'text', x: rt.boat.x, y: SURF - 2.6 - fresh++ * 0.6, s: `도감 · ${sp.n}`, col: '#c7a6ff', t: 2, sz: 1.3, pop: true });
          G.J.sfx('cthulhu', 'chime');
        }
        c.dex[sp.id]++;
        got.push(sp.id);
      });
      C.gain(c, sum);
      if (signs) G.addSigns(signs, 'cthulhu');
      if (rt.deepest > 0) G.addEss(0.02 * Math.pow(rt.deepest, 1.3) * ess, 'cthulhu');
      // 뱃노래(올라올 때마다) · 독한 럼(물고기마다)
      if (c.madT <= 0) C.heal(c, ta('song') + ta('rum') * fishN);
      if (got.length) { c.last = got; G.J.sfx('cthulhu', big && big.v >= 60 ? 'jackpot' : 'coin'); }
      if (big && big.v >= 60) { G.J.finish('cthulhu', rt.boat.x, SURF - 0.5, 1.3); G.log(`${big.n}을(를) 낚았다!`, 'cthulhu', 'good'); }
      rt.hooked = [];
      rt.phase = 'idle';
      rt.t = IDLE_T;
    },

    // ── 바늘 조종 (감아 올릴 때만): 촉수는 피하고 값진 것을 노린다 ──
    autoX(c, rt) {
      const h = rt.hook, look = 1.5 + ta('skill');
      const vy = C.reel();
      const ahead = o => h.y - o.y;
      const px = (o, tt) => (o.tent ? o.x : U.clamp(o.x + o.dir * o.spd * tt, LO, HI));
      const danger = rt.tents.filter(o => ahead(o) > 0 && ahead(o) < look);
      const full = rt.hooked.length >= C.maxCatch();
      let goal = null;
      if (!full) {
        let bv = 0;
        for (const f of rt.fish) { const a = ahead(f); if (a > 0 && a < look + 1.5 && f.sp.v * C.depthMult(f.d) > bv) { bv = f.sp.v * C.depthMult(f.d); goal = f; } }
      }
      let best = h.x, bs = -1e9;
      for (let x = LO; x <= HI; x += 0.5) {
        let md = 9;
        for (const o of danger) md = Math.min(md, Math.abs(px(o, ahead(o) / vy) - x));
        let sc = Math.min(md, 2.2) * (rt.hooked.length ? 1 : 0.3) - Math.abs(x - h.x) * 0.04;
        if (goal) sc -= Math.abs(px(goal, ahead(goal) / vy) - x) * 0.8;
        if (sc > bs) { bs = sc; best = x; }
      }
      return best;
    },
    // 맵 클릭: 촉수 → 퇴치, 대기 중 → 던지기, 그 밖 → 바늘을 그쪽으로
    click(c, x, y) {
      const rt = C.rt(c);
      for (const o of rt.tents) if (Math.hypot(o.x - x, o.y - y) < 1.1) { C.hitTent(c, rt, o); return true; }
      if (rt.phase === 'idle') return C.cast(c);
      C.steer(c, x);
      return true;
    },
    // 촉수 한 대: 클릭 또는 「자동 퇴마」
    hitTent(c, rt, o) {
      o.hp--;
      G.J.hit('cthulhu', o, 0.4, rt.hook);
      G.fx(rt, { k: 'splat', x: o.x, y: o.y, n: 8, ichor: true, s: 1.3, t: 0.5 });
      G.fx(rt, { k: 'impact', x: o.x, y: o.y, s: 1.5, col: '#e8d48a', t: 0.22 });
      G.fx(rt, { k: 'beam', x: rt.boat.x, y: SURF - 1, x2: o.x, y2: o.y, col: '#e8d48a', w: 2, t: 0.15 });
      G.J.sfx('cthulhu', 'hit');
      if (o.hp <= 0) {
        rt.tents = rt.tents.filter(q => q !== o);
        if (c.madT <= 0) C.heal(c, 5);
        G.fx(rt, { k: 'die', spr: o.t, x: o.x, y: o.y, s: o.s, t: 0.5 });
        G.fx(rt, { k: 'text', x: o.x, y: o.y - 0.7, s: '퇴마', col: '#c7a6ff', t: 0.9, pop: true });
        G.J.sfx('cthulhu', 'banish');
      }
    },
    steer(c, x) { const rt = C.rt(c); rt.steerX = U.clamp(x, LO, HI); rt.steerT = 1.5; },

    tick(c, dt) {
      const rt = C.rt(c), h = rt.hook;
      G.fxTick(rt, dt);
      // 휴식이 끝나면 이성을 가득 채워 다시 출항 (「꿈 없는 잠」은 최대치보다 더)
      if (c.madT > 0 && (c.madT -= dt) <= 0) { c.madT = 0; c.san = C.maxSan() * (1 + ta('dream')); }
      // 물고기·촉수 움직임
      for (const f of rt.fish) {
        f.x += f.dir * f.spd * dt;
        if (f.x < LO || f.x > HI) { f.dir *= -1; f.x = U.clamp(f.x, LO, HI); }
        f.vx = f.dir * f.spd;
        f.flip = f.dir > 0;
        f.moving = true;
      }
      for (const o of rt.tents) { o.ph += dt; o.x = U.clamp(o.x0 + Math.sin(o.ph * 0.7) * 2, LO, HI); }
      // 이성: 물속에 있는 동안 깊이와 시간만큼 깎인다. 저절로 돌아오지 않는다
      const hd = h.y - SURF;
      if (c.madT <= 0 && hd > 0) C.hurt(c, C.drain(hd) * dt);
      // 자동 퇴마: 바늘 3칸 안의 촉수를 몇 초마다 친다
      if (ta('exorcise') && rt.phase !== 'idle' && (rt.exoT = (rt.exoT || 0) - dt) <= 0) {
        const o = rt.tents.filter(q => Math.hypot(q.x - h.x, q.y - h.y) < 3).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0];
        if (o) { C.hitTent(c, rt, o); rt.exoT = 6 / ta('exorcise'); }
      }
      // 바늘 조종: 내려갈 때는 곧장 수직으로, 감을 때만 좌우로
      if (rt.phase === 'up') {
        if (rt.steerT > 0) rt.steerT -= dt;
        const gx = rt.steerT > 0 ? rt.steerX : C.autoX(c, rt);
        const dx = U.clamp(gx - h.x, -STEER * dt, STEER * dt);
        h.x += dx; h.vx = dt > 0 ? dx / dt : 0;
      } else h.vx = 0;
      if (rt.phase === 'idle') {
        h.x += (rt.boat.x + 1.1 - h.x) * Math.min(1, dt * 5); h.y = SURF;
        if (c.madT <= 0 && c.auto && (rt.t -= dt) <= 0) C.cast(c);
      } else if (rt.phase === 'down') {
        // 물고기·촉수에 상관없이 줄 끝까지 곧장 내려간다
        h.y = Math.min(SURF + C.lineD(), h.y + C.sink() * dt);
        h.vy = Math.min(C.sink(), (SURF + C.lineD() - h.y) / 0.1);
        rt.deepest = Math.max(rt.deepest, h.y - SURF);
        c.best = Math.max(c.best, Math.round((h.y - SURF) * D.M_PER_TILE));
        if (h.y - SURF >= C.lineD()) rt.phase = 'up';
      } else if (rt.phase === 'up') {
        const up = C.upSpeed(c, rt);
        h.y -= up * dt;
        h.vy = -Math.min(up, (h.y - SURF) / 0.1);
        if (rt.hooked.length < C.maxCatch()) {
          const f = rt.fish.find(o => Math.hypot(o.x - h.x, o.y - h.y) < 0.65 * (1 + ta('net')));
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
        if (h.y <= SURF) { h.y = SURF; h.vy = 0; rt.phase = 'land'; C.land(c, rt); }
      }
      // 걸린 것들은 바늘 아래에 매달린다
      if (rt.phase === 'idle') h.vy = 0;
      rt.hooked.forEach((f, i) => { f.x = h.x + Math.sin(i * 2.1) * 0.25; f.y = h.y + 0.45 + i * 0.35; f.vx = h.vx; f.vy = h.vy; f.moving = true; });
    },
    view(c) {
      const rt = C.rt(c), h = rt.hook, hd = Math.max(0, h.y - SURF), lowSan = 1 - c.san / C.maxSan();
      const hy = h.y + (h.vy || 0) * (G.tickLead ? G.tickLead() : 0);  // 카메라도 바늘처럼 틱 사이를 미끄러진다
      // 카메라는 바늘에 딱 붙고(지연 없음), 앞을 내다보는 거리만 천천히 바뀐다 (내릴 때 아래 3.5칸, 감을 때 위 2칸)
      const now = typeof performance !== 'undefined' ? performance.now() : 0, fdt = Math.min(0.1, (now - (rt.camT || now)) / 1000);
      rt.camT = now;
      const goal = rt.phase === 'down' ? 3.5 : rt.phase === 'up' ? -2 : 0;
      rt.camOff = (rt.camOff || 0) + (goal - (rt.camOff || 0)) * (1 - Math.exp(-fdt * 3));
      const ents = [rt.boat, rt.fisher, ...rt.fish, ...rt.tents, ...rt.hooked, h];
      return {
        map: rt.map, ents, fx: rt.fx, cam: { x: MID, y: Math.max(SURF + 3, hy + rt.camOff), k: 1 }, viewH: 13,
        lines: [{ x: rt.boat.rod.x, y: rt.boat.rod.y, to: h, dy: -0.3, col: 'rgba(230,230,210,0.7)', w: 1 }],
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
