'use strict';
// 수선 · 구천등선 (동부 진법 — Cultivation Idle 계열 + 오행 배치 퍼즐)
// 수도자는 동부 한가운데 좌선대에서 좌선한다. 주변 진법 칸에 오행 진기(목·화·토·금·수)를 놓는다.
// 상생으로 이웃하면 세지고(+50%) 상극이면 약해진다(-40%). 영맥 칸 위면 ×2.
//   수 → 영기, 금 → 영석, 목 → 영초 성장, 화 → 연단 속도, 토 → 요수 방어·천겁 성공률
// 요수가 입구로 들어와 진기를 깨뜨린다(잠시 꺼짐). 수도자의 비검이 막고, 클릭하면 크게 벤다.
// 영기가 차면 천겁: 먼저 심마가 몰려오고(클릭으로 벤다), 닿을 때마다 성공률이 깎인다. 그다음 벼락.
// 천겁은 리스크다: 실패하면 그 경지의 영기를 처음부터 다시 쌓는다(진행은 잃지 않고 시간만).
// 경지가 오르면 무대가 위로 올라간다(산기슭 동굴 → 영산 중턱 → 구름 위 봉우리 → 선궁 → 선계) — 진법도 새 판.
// 최종 목적지는 등선: 진선 경지에 닿으면 신선이 되어 하늘로 오른다. 그 뒤 선계(선제 n중천)는 끝없이.
G.RT = G.RT || {};
G.Xianxia = (() => {
  const D = G.D.X, U = G.U, GR = G.Grid, ELS = D.els;
  const tm = k => G.Tree.mul('xianxia', G.S.w.xianxia.tree, k);
  const ta = k => G.Tree.add('xianxia', G.S.w.xianxia.tree, k);
  const BASE_SLOTS = 6, BEAST_T = 9, HERB_T = 20, ALCH_T = 10, DEVIATION = 20, BREAK_T = 10, AUTO_SWORD = 2.5;
  // gen[a] = a를 낳는 오행(상생), over[a] = a를 이기는 오행(상극)
  const gen = { fire: 'wood', earth: 'fire', metal: 'earth', water: 'metal', wood: 'water' };
  const over = { earth: 'wood', water: 'earth', fire: 'water', metal: 'fire', wood: 'metal' };

  const X = {
    gen, over,
    init(head = 0) {
      return { qi: 0, stone: 10 * Math.pow(10, head), realm: 0, pills: 0, herbs: 0, devT: 0, tree: G.Tree.init('xianxia'), autoBreak: true, autoThr: 0.6, fails: 0, arr: {}, autoArr: true, arrN: 0 };
    },
    rt(x) { return G.RT.xianxia || (G.RT.xianxia = X.boot(x)); },
    boot(x) {
      const stage = X.stageOf(x.realm), ST = D.stages[stage];
      const map = GR.fromAscii(ST.map || D.map, D.pass);
      const [vx, vy] = map.poi.V[0];
      // 진법 칸: 좌선대에서 가까운 순서로 열린다
      const slots = [...(map.poi.o || []), ...(map.poi.v || [])].map(([sx, sy]) => ({ x: sx, y: sy, vein: GR.at(map, sx, sy) === 'v', off: 0 }))
        .sort((a, b) => Math.hypot(a.x - vx, a.y - vy) - Math.hypot(b.x - vx, b.y - vy) || a.y - b.y || a.x - b.x);
      const at = {};
      slots.forEach((s, i) => { s.i = i; at[s.x + ',' + s.y] = i; });
      const rt = {
        map, slots, at, fx: [], me: { kind: 'hero', t: 'cultivator', x: vx, y: vy, s: 1.15, bar: false }, beasts: [], disciples: [], demons: [],
        plots: (map.poi.h || []).map(([px, py]) => ({ x: px, y: py, g: Math.random() * HERB_T })),
        state: 'meditate', beastT: 4, alchT: 0, swordT: 0, trib: 0, penalty: 0, zapT: 0, ver: 0, stage,
      };
      if (x.autoArr) X.autoArrange(x, rt);
      return rt;
    },
    realmName: r => (r < D.realms.length ? D.realms[r] : `선제 ${r - D.realms.length + 1}중천`),
    stageOf(r) { let i = 0; D.stages.forEach((st, k) => { if (r >= st.from) i = k; }); return i; },
    ASCEND: 9,
    // 영구 배율은 출처끼리 더한다 (트리·차원·유물·시너지). 트리 안의 같은 효과 노드끼리도 더한다 (곱하면 노드 수만큼 폭주)
    sum: parts => 1 + parts.reduce((a, p) => a + p[1] - 1, 0),
    parts(k) {
      const dim = ['차원', G.globalMult()];
      if (k === 'qi') return [['트리', 1 + ta('qi')], dim, ['유물', 1 + G.relicVal('x_qi')], ['시너지', G.synergy('syn_tactics') ? 1 + 0.04 * (G.S.w.scifi.maxWave - 1) : 1]];
      if (k === 'stone') return [['트리', 1 + ta('stone')], dim, ['유물', 1 + G.relicVal('x_stone')]];
      if (k === 'power') return [['트리', 1 + ta('power')], dim, ['유물', 1 + G.relicVal('x_power')]];
      return [];
    },
    slotCount: () => BASE_SLOTS + ta('slots'),
    // 오행 하나의 세기: 혈자리(+20%씩) × 경맥 개통 ×2
    elMult: el => (1 + ta(el)) * (ta(el + 'Open') ? 2 : 1),

    // ── 진법 ──
    place(x, i, el) {
      const rt = X.rt(x);
      if (i < 0 || i >= X.slotCount()) return false;
      if (el) x.arr[i] = el; else delete x.arr[i];
      rt.ver++;
      return true;
    },
    // 상생 사슬: 좌선대 근처에서 시작해 이웃 칸을 따라가며 목→화→토→금→수 순서로 채운다
    autoArrange(x, rt = X.rt(x)) {
      const n = Math.min(X.slotCount(), rt.slots.length), left = new Set(rt.slots.slice(0, n).map(s => s.i)), path = [];
      let cur = rt.slots[0];
      while (cur) {
        path.push(cur);
        left.delete(cur.i);
        let next = null;
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
          const j = rt.at[(cur.x + dx) + ',' + (cur.y + dy)];
          if (j != null && left.has(j)) { next = rt.slots[j]; break; }
        }
        if (!next && left.size) next = [...left].map(j => rt.slots[j]).reduce((a, b) => (Math.hypot(a.x - cur.x, a.y - cur.y) <= Math.hypot(b.x - cur.x, b.y - cur.y) ? a : b));
        cur = next;
      }
      x.arr = {};
      path.forEach((s, k) => { x.arr[s.i] = ELS[k % 5]; });
      x.arrN = n;
      rt.ver++;
    },
    // 진기마다 출력과 이웃 관계(선)를 계산한다
    layout(x) {
      const rt = X.rt(x), n = X.slotCount(), key = rt.ver + ':' + n + ':' + rt.slots.map(s => (s.off > 0 ? 1 : 0)).join('') + ':' + JSON.stringify(x.tree);
      if (rt._lay && rt._layKey === key) return rt._lay;
      const sum = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }, per = [], links = [];
      for (let i = 0; i < n && i < rt.slots.length; i++) {
        const el = x.arr[i];
        if (!el) continue;
        const s = rt.slots[i];
        let g = 0, o = 0;
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
          const j = rt.at[(s.x + dx) + ',' + (s.y + dy)];
          if (j == null || j >= n || !x.arr[j] || rt.slots[j].off > 0) continue;
          const nb = x.arr[j];
          if (gen[el] === nb) { g++; links.push({ x: rt.slots[j].x, y: rt.slots[j].y, x2: s.x, y2: s.y, good: true, col: D.el[nb].col }); }
          if (over[el] === nb) { o++; links.push({ x: rt.slots[j].x, y: rt.slots[j].y, x2: s.x, y2: s.y, good: false }); }
        }
        const out = s.off > 0 ? 0 : (s.vein ? 2 + ta('vein') : 1) * Math.max(0.2, 1 + (0.5 + ta('gen')) * g - 0.4 * (1 - Math.min(0.9, ta('over'))) * o) * X.elMult(el);
        sum[el] += out;
        per.push({ i, el, out, g, o });
      }
      rt._lay = { sum, per, links };
      rt._layKey = key;
      return rt._lay;
    },

    // ── 수치 ──
    qiBase(x) {
      const m = Math.pow(2.6, x.realm) * X.sum(X.parts('qi'));
      return x.devT > 0 ? m * 0.3 : m;
    },
    qiRate: x => X.qiBase(x) * (1 + 0.35 * X.layout(x).sum.water),
    stoneMult: () => X.sum(X.parts('stone')),
    stoneRate: x => 0.4 * Math.pow(1.7, x.realm) * X.layout(x).sum.metal * X.stoneMult(),
    power: x => 10 * Math.pow(3, x.realm) * X.sum(X.parts('power')),
    breakCost: r => 40 * Math.pow(9.5, r) * (1 - Math.min(0.5, ta('tribCost'))),
    // 천겁 성공률: 경지가 오를수록 낮아지고(벼락이 세진다), 단약·토 진기·트리로 올린다. 늘 조금은 위험하다(최대 95%)
    pillUse: () => 4 + ta('pillMax'),
    breakChance(x, pills = Math.min(X.pillUse(), x.pills)) {
      let c = Math.max(0.2, 0.62 - 0.04 * x.realm) + (0.08 + ta('pillPow')) * pills + ta('trib') + Math.min(0.15, 0.015 * X.layout(x).sum.earth);
      if (G.synergy('syn_regress')) c += 0.03 * Math.min(10, G.S.w.wuxia.lives);
      return Math.min(0.95, c);
    },
    beastHp: r => 12 * Math.pow(2.8, r),
    beastStone: r => 6 * Math.pow(1.7, r),
    beastEss: r => 0.15 * Math.pow(1 + r, 1.5),
    demonCount: x => Math.max(1, Math.round((3 + x.realm / 2) * (1 - ta('demon')))),
    gain(x, n) { x.stone += n; G.tally('xianxia', n); },

    // ── 클릭 ──
    meditateClick(x) {
      const rt = X.rt(x), g = (1 + X.qiBase(x) * 3) * (1 + ta('click'));
      x.qi += g;
      G.fx(rt, { k: 'text', x: rt.me.x, y: rt.me.y - 1, s: '+' + U.fmt(g), col: '#9fe0ff', t: 0.8, sz: 1.2, pop: true });
      G.fx(rt, { k: 'ring', x: rt.me.x, y: rt.me.y, r: 1.2, t: 0.4, col: '#9fe0ff' });
      G.J.hit('xianxia', rt.me);
      G.J.sfx('xianxia', 'bell');
    },
    // 비검: 대상(요수·심마)을 베고, 만검귀종이면 가까운 둘을 더 꿰뚫는다
    flySword(x, b, power) {
      const rt = X.rt(x), dmg = X.power(x) * (power ? 1.5 * tm('fly') : 1);
      const pool = [...rt.beasts, ...rt.demons].filter(o => o !== b && o.hp > 0);
      const hit = [b, ...(ta('flyChain') ? pool.sort((p, q) => GR.dist(p, b) - GR.dist(q, b)).slice(0, 2) : [])];
      let from = rt.me;
      G.J.sfx('xianxia', power ? 'sword' : 'tap');
      for (const o of hit) {
        G.fx(rt, { k: 'proj', key: 'fx_sword', x: from.x, y: from.y, x2: o.x, y2: o.y, t: 0.25 });
        X.hurt(x, rt, o, dmg, power ? 0.45 : 0, from);
        from = o;
      }
    },
    hurt(x, rt, b, dmg, power = 0, from) {
      if (b.hp <= 0) return;
      b.hp -= dmg;
      G.fx(rt, { k: 'text', x: b.x, y: b.y - 0.6, s: U.fmt(dmg), col: '#cfe9ff', t: 0.7, sz: (power ? 1.3 : 0.85) + 0.5 * Math.min(1, dmg / b.max), pop: power > 0 });
      G.J.hit('xianxia', b, power, from);
      G.fx(rt, { k: 'splat', x: b.x, y: b.y, dx: from ? b.x - from.x : 0, dy: from ? b.y - from.y : 0, n: power ? 8 : 4, ichor: !!b.demon, t: 0.5 });
      if (power) G.fx(rt, { k: 'impact', x: b.x, y: b.y - 0.1, s: 1.4, col: '#d8f0ff', t: 0.22 });
      if (b.hp > 0) return;
      G.fx(rt, { k: 'die', spr: b.t, x: b.x, y: b.y, s: b.s, flip: b.flip, t: 0.45 });
      if (b.demon) {
        rt.demons = rt.demons.filter(o => o !== b);
        G.J.sfx('xianxia', 'banish');
        return;
      }
      const g = X.beastStone(b.r) * X.stoneMult() * tm('beast');
      X.gain(x, g);
      G.addEss(X.beastEss(b.r), 'xianxia');
      G.fx(rt, { k: 'text', x: b.x, y: b.y - 1, s: '+' + U.fmt(g), col: '#e8b8ff', t: 1.1 });
      G.J.sfx('xianxia', 'coin');
      rt.beasts = rt.beasts.filter(o => o !== b);
    },
    slotAt(x, cx, cy) {
      const j = X.rt(x).at[Math.round(cx) + ',' + Math.round(cy)];
      return j == null ? -1 : j;
    },
    // 맵 클릭: 심마·요수 → 비검, 수도자 → 운기, 익은 영초 → 수확. 진법 칸은 화면(v_xianxia)이 처리한다.
    click(x, cx, cy) {
      const rt = X.rt(x);
      for (const b of [...rt.demons, ...rt.beasts]) if (Math.hypot(b.x - cx, b.y - cy) < 0.9) { X.flySword(x, b, true); return true; }
      for (const p of rt.plots) if (Math.hypot(p.x - cx, p.y - cy) < 0.8 && p.g >= HERB_T) {
        p.g = 0; x.herbs++;
        G.fx(rt, { k: 'text', x: p.x, y: p.y - 0.6, s: '+1', col: '#9fe79f', t: 0.9, pop: true });
        G.J.sfx('xianxia', 'pop');
        return true;
      }
      if (Math.hypot(rt.me.x - cx, rt.me.y - cy) < 0.8) { X.meditateClick(x); return true; }
      return false;
    },

    // ── 천겁: 심마 → 벼락 ──
    breakthrough(x) {
      const rt = X.rt(x);
      if (x.qi < X.breakCost(x.realm) || rt.state === 'trib') return false;
      rt.state = 'trib';
      rt.trib = 0;
      rt.penalty = 0;
      const n = X.demonCount(x), hp = X.power(x) * 1.2;
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2 + Math.random() * 0.5, r = 4.5;
        rt.demons.push({ kind: 'mon', demon: true, t: 'q_demon', x: rt.me.x + Math.cos(a) * r * 1.4, y: rt.me.y + Math.sin(a) * r * 0.8, s: 1, hp, max: hp, bar: true, alpha: 0.85, spd: 0.55 + Math.random() * 0.3 });
      }
      G.fx(rt, { k: 'text', x: rt.me.x, y: rt.me.y - 1.4, s: '심마', col: '#c7a6ff', t: 1.5, sz: 1.4, pop: true });
      G.J.sfx('xianxia', 'gurgle');
      return true;
    },
    resolveTrib(x, rt) {
      const used = Math.min(X.pillUse(), x.pills), cost = X.breakCost(x.realm);
      const ok = U.chance(Math.max(0.05, X.breakChance(x, used) - rt.penalty));
      x.pills -= used;
      if (ok) {
        x.qi -= cost;
        x.realm++;
        x.fails = 0;
        G.addEss(3 * Math.pow(x.realm, 2.2), 'xianxia');
        G.addSigns(2, 'xianxia');
        const asc = x.realm === X.ASCEND && !x.ascended;
        if (asc) { x.ascended = true; G.addEss(500, 'xianxia'); G.log('등선! 신선이 되어 하늘로 오른다', 'xianxia', 'good'); }
        else G.log(`천겁을 넘었다! 「${X.realmName(x.realm)}」 경지`, 'xianxia', 'good');
        for (let i = 0; i < 2 + Math.min(6, x.realm); i++) G.fx(rt, { k: 'ring', x: rt.me.x, y: rt.me.y, r: 1.5 + i * 1.1, t: 0.7 + i * 0.2, col: '#ffe08a' });
        G.J.finish('xianxia', rt.me.x, rt.me.y, 1.3 + Math.min(0.8, x.realm * 0.07));
        G.J.flash('xianxia', '#fff3c4');
        if (x.realm >= 4) G.J.shake('xianxia', 4 + x.realm, 0, 0, 0.5);
        G.J.sfx('xianxia', 'finish');
        G.emit('xx_realm', { r: x.realm, asc, stage: X.stageOf(x.realm) !== rt.stage });
      } else {
        // 실패: 그 경지의 영기를 처음부터 (「백회혈」이면 일부 남긴다)
        x.qi = Math.min(x.qi, cost) * Math.min(0.6, ta('tribSafe'));
        x.devT = DEVIATION * (1 - Math.min(0.7, ta('dev')));
        x.fails++;
        x.failsT = (x.failsT || 0) + 1;
        G.fx(rt, { k: 'text', x: rt.me.x, y: rt.me.y - 1.4, s: '천겁 실패 · 영기 흩어짐', col: '#ff8a8a', t: 2, sz: 1.3, pop: true });
        G.J.flash('xianxia', '#ff3a3a');
        G.J.sfx('xianxia', 'lose');
        G.J.shake('xianxia', 12, 0, 0, 0.6);
        G.log('천겁에 실패했다… 영기가 흩어져 다시 쌓아야 한다', 'xianxia', 'bad');
        G.emit('xx_fail', { r: x.realm });
      }
      rt.demons = [];
      rt.state = 'meditate';
    },

    tick(x, dt) {
      // 경지가 무대 경계를 넘으면 새 동부로 (진법은 자동 배치면 새로 깐다)
      if (G.RT.xianxia && G.RT.xianxia.stage !== X.stageOf(x.realm) && G.RT.xianxia.state !== 'trib') { G.RT.xianxia = null; x.arrN = -1; }
      const rt = X.rt(x), m = rt.map, me = rt.me;
      G.fxTick(rt, dt);
      if (x.devT > 0) x.devT -= dt;
      // 진법 칸이 늘면 자동 배치를 다시 한다
      if (x.autoArr && x.arrN !== X.slotCount()) X.autoArrange(x, rt);
      for (const s of rt.slots) if (s.off > 0 && (s.off -= dt) <= 0) { s.off = 0; rt.ver++; }
      const L = X.layout(x);
      x.qi += X.qiRate(x) * dt;
      X.gain(x, X.stoneRate(x) * dt);
      // 영기 흐름: 진기에서 좌선대로 빛 알갱이가 흘러간다 (그리기 전용)
      if (G.J.live('xianxia')) for (const p of L.per) if (p.out > 0 && Math.random() < dt * 0.6 * Math.min(3, p.out)) {
        const s = rt.slots[p.i];
        G.fx(rt, { k: 'mote', x: s.x, y: s.y, x2: me.x, y2: me.y, col: D.el[p.el].col, t: 1.2 });
      }
      // 영초(목)와 단로(화)
      for (const p of rt.plots) if (p.g < HERB_T) p.g += dt * (1 + 0.5 * L.sum.wood) * (1 + ta('herb'));
      if (x.herbs >= 3 && (rt.alchT += dt * (1 + 0.5 * L.sum.fire) * (1 + ta('alch'))) >= ALCH_T) {
        rt.alchT = 0; x.herbs -= 3; x.pills = Math.min(20, x.pills + 1);
        const [fx, fy] = m.poi.F[0];
        G.fx(rt, { k: 'tile', key: 'fx_fire', x: fx, y: fy, t: 0.8 });
        G.fx(rt, { k: 'text', x: fx, y: fy - 1, s: '단약 +1', col: '#ffd24a', t: 1.2 });
      }
      // 제자: 익은 영초를 캐서 단로로 나른다
      const nd = Math.min(6, ta('disciple'));
      while (rt.disciples.length < nd) {
        const [qx, qy] = m.poi.Q[0];
        rt.disciples.push({ kind: 'ally', t: ['wb_human', 'wl_white', 'q_disciple', 'wh_topknot'], art: 'x_disciple', x: qx, y: qy, s: 0.9, carry: 0, goal: null });
      }
      for (const d of rt.disciples) {
        d.moving = false;
        if (d.carry) {
          const [fx, fy] = m.poi.F[0];
          if (GR.moveTo(m, d, fx - 1, fy, 3, dt, 0.3)) { x.herbs += d.carry; d.carry = 0; }
          continue;
        }
        if (!d.goal || d.goal.g < HERB_T) d.goal = rt.plots.find(p => p.g >= HERB_T && !rt.disciples.some(o => o !== d && o.goal === p)) || null;
        if (d.goal) { if (GR.moveTo(m, d, d.goal.x + 1, d.goal.y, 3, dt, 0.3)) { d.goal.g = 0; d.carry = 1; d.goal = null; } }
        else { const [qx, qy] = m.poi.Q[0]; GR.moveTo(m, d, qx + 1, qy, 2, dt, 0.5); }
      }
      // 요수: 입구로 들어와 가장 가까운 켜진 진기를 깨뜨린다
      const cap = Math.min(6, 2 + Math.floor(x.realm / 2)), n = X.slotCount();
      if (rt.state !== 'trib' && (rt.beastT -= dt) <= 0 && rt.beasts.length < cap) {
        rt.beastT = BEAST_T;
        const [gx, gy] = m.poi.G[0], hp = X.beastHp(x.realm);
        rt.beasts.push({ kind: 'mon', t: { k: 'q_beast', v: x.realm % 6 }, x: gx, y: gy, s: 1, hp, max: hp, r: x.realm, bar: true, atkT: 2, goal: null });
      }
      for (const b of rt.beasts) {
        b.moving = false;
        if (!b.goal || !x.arr[b.goal.i] || b.goal.off > 0 || b.goal.i >= n) {
          b.goal = null;
          let bd = 1e9;
          for (const s of rt.slots) if (s.i < n && x.arr[s.i] && !(s.off > 0)) { const d = Math.hypot(s.x - b.x, s.y - b.y); if (d < bd) { bd = d; b.goal = s; } }
        }
        if (!b.goal) { GR.moveTo(m, b, me.x, me.y + 1, 1.5, dt, 1.2); continue; }
        if (!GR.moveTo(m, b, b.goal.x, b.goal.y, 1.6, dt, 0.7)) continue;
        b.flip = b.goal.x < b.x;
        if ((b.atkT -= dt) <= 0) {
          b.atkT = 2.5;
          G.J.lunge('xianxia', b, b.goal);
          b.goal.off = BREAK_T * (1 - Math.min(0.7, ta('guard')));
          rt.ver++;
          G.fx(rt, { k: 'ring', x: b.goal.x, y: b.goal.y, r: 0.8, t: 0.5, col: '#ff6a6a' });
          G.J.sfx('xianxia', 'hurt');
          b.goal = null;
        }
      }
      // 토 진기: 2.5칸 안의 요수·심마를 친다
      if (L.sum.earth > 0 && (rt.zapT -= dt) <= 0) {
        rt.zapT = 1;
        for (const p of L.per) {
          if (p.el !== 'earth' || p.out <= 0) continue;
          const s = rt.slots[p.i], tg = [...rt.beasts, ...rt.demons].find(o => Math.hypot(o.x - s.x, o.y - s.y) <= 2.5);
          if (tg) { G.fx(rt, { k: 'beam', x: s.x, y: s.y, x2: tg.x, y2: tg.y, col: D.el.earth.col, w: 2, t: 0.15 }); X.hurt(x, rt, tg, X.power(x) * 0.15 * p.out, 0, s); }
        }
      }
      // 수도자: 좌선하며 비검으로 가까운 적을 친다
      if ((rt.swordT -= dt) <= 0) {
        const foes = [...rt.demons, ...rt.beasts];
        if (foes.length) {
          rt.swordT = AUTO_SWORD / (1 + ta('sword')) / (rt.state === 'trib' ? 2 : 1);
          X.flySword(x, foes.reduce((a, b) => (GR.dist(me, a) <= GR.dist(me, b) ? a : b)), false);
        }
      }
      if (rt.state === 'trib') {
        // 심마가 다가온다. 닿으면 성공률 -10%
        for (const d of rt.demons) {
          const dx = me.x - d.x, dy = me.y - d.y, l = Math.hypot(dx, dy);
          d.flip = dx < 0;
          if (l < 0.7) {
            d.hp = 0;
            rt.penalty += 0.1;
            G.fx(rt, { k: 'text', x: me.x, y: me.y - 1, s: '-10%', col: '#c7a6ff', t: 1, sz: 1.2, pop: true });
            G.J.hit('xianxia', me, 0.3, d);
            G.J.sfx('xianxia', 'hurt');
          } else { d.x += dx / l * d.spd * dt; d.y += dy / l * d.spd * dt; }
        }
        rt.demons = rt.demons.filter(d => d.hp > 0);
        if (!rt.demons.length) {
          rt.trib += dt;
          // 벼락: 경지가 높을수록 많고 굵고 길다 (구천뇌겁)
          const r = x.realm, spread = 3 + r * 0.4;
          if (Math.random() < dt * (5 + r * 1.5)) {
            G.fx(rt, { k: 'bolt', x: me.x + (Math.random() - 0.5) * spread, y: me.y + (Math.random() - 0.5) * spread * 0.6, t: 0.3 + r * 0.02, col: r >= 6 ? '#fff3c4' : '#d9c2ff' });
            G.J.sfx('xianxia', 'thunder');
            G.J.shake('xianxia', 3 + r * 0.6, 0, 1, 0.15);
          }
          if (r >= 3 && Math.random() < dt * (0.6 + r * 0.15)) { G.fx(rt, { k: 'bolt', x: me.x, y: me.y, t: 0.5, col: '#ffffff' }); G.J.flash('xianxia', '#e8dcff'); }
          if (rt.trib >= 2.5 + r * 0.25) X.resolveTrib(x, rt);
        }
      } else if (x.autoBreak && x.devT <= 0 && x.qi >= X.breakCost(x.realm) && X.breakChance(x) >= x.autoThr) X.breakthrough(x);
      if (Math.random() < dt * 1.5) G.fx(rt, { k: 'text', x: me.x + (Math.random() - 0.5) * 1.4, y: me.y - 0.6, s: '氣', col: '#9fe0ff', t: 0.9 });
    },
    view(x) {
      const rt = X.rt(x), L = X.layout(x), n = X.slotCount();
      const ents = [];
      for (const p of rt.plots) if (p.g >= HERB_T) ents.push({ t: 'q_herb', x: p.x, y: p.y, s: 0.9 });
      // 진법 칸: 빈 칸은 고리, 놓인 진기는 보석(꺼진 것은 어둡게), 잠긴 칸은 아무것도 없다
      for (const s of rt.slots) {
        if (s.i >= n) continue;
        const el = x.arr[s.i];
        if (!el) ents.push({ t: 'q_peak', x: s.x, y: s.y, s: 0.8, alpha: 0.35, under: true });
        else ents.push({ t: D.el[el].t, x: s.x, y: s.y, s: 0.72, glow: s.off > 0 ? null : D.el[el].col, dim: s.off > 0, under: true });
      }
      ents.push({ t: { k: 'q_aura' + Math.min(3, Math.floor(x.realm / 3)), v: Math.floor(Date.now() / 250) }, x: rt.me.x, y: rt.me.y, s: 2.2, alpha: 0.6, under: true });
      ents.push(...rt.disciples, ...rt.beasts, ...rt.demons, rt.me);
      return {
        map: rt.map, ents, fx: rt.fx, fit: true, cam: rt.me, links: L.links,
        terrain: (cx, cy) => (D.stages[rt.stage].tiles || D.tiles)[GR.at(rt.map, cx, cy)] || null,
        tint: x.devT > 0 ? 'rgba(120,0,40,0.18)' : rt.state === 'trib' ? `rgba(40,10,60,${0.25 + Math.min(0.3, x.realm * 0.03)})` : D.stages[rt.stage].tint || null,
      };
    },
    status: x => X.realmName(x.realm),
    stageName: x => D.stages[X.stageOf(x.realm)].n,
  };
  return X;
})();
