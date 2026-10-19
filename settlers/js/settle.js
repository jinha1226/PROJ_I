'use strict';
// 정착지 시뮬레이션: 지형, 작업 AI, 욕구, 생산, 습격
G.Settle = (function () {
  const W = 72, H = 40, DAY = 1200;
  let s = null; // 현재 정착지 상태 (각 진입점에서 바인딩)
  const bind = () => (s = G.S.settle);
  const I = (x, y) => y * W + x;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

  const TERR = {
    grass: { n: '풀밭', pass: true }, dirt: { n: '흙', pass: true }, tree: { n: '나무', pass: false },
    rock: { n: '바위', pass: false }, ore: { n: '철광맥', pass: false }, water: { n: '연못', pass: false },
    shallow: { n: '개울', pass: true }, bush: { n: '열매 덤불', pass: true }, bush_e: { n: '빈 덤불', pass: true },
    herb: { n: '야생 약초', pass: true }, herb_e: { n: '약초 그루터기', pass: true }, entrance: { n: '던전 입구', pass: true },
  };

  // ───────── 저장소 ─────────
  const Store = {
    has(cost) { for (const k in cost) if ((G.S.store[k] || 0) < cost[k]) return false; return true; },
    take(cost) { for (const k in cost) G.S.store[k] = (G.S.store[k] || 0) - cost[k]; },
    give(k, q) { G.S.store[k] = (G.S.store[k] || 0) + q; },
    giveAll(cost) { if (cost) for (const k in cost) Store.give(k, cost[k]); },
  };

  // ───────── 지형 생성 ─────────
  function gen() {
    const st = {
      w: W, h: H, tick: Math.floor(DAY * 0.3), terrain: [], bld: new Array(W * H).fill(null), zone: new Array(W * H).fill(null),
      desig: new Array(W * H).fill(null), crop: {}, piles: [], mons: [], regrow: [], threat: 0, raidStart: 0,
      nextRecruit: DAY * 2.5, entrance: null, graves: [], res: {},
    };
    const nR = G.noise(W, H, 9), nT = G.noise(W, H, 6), nD = G.noise(W, H, 7), nO = G.noise(W, H, 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let t = 'grass';
      const r = nR(x, y) * 0.75 + (1 - y / H) * 0.55;
      if (r > 0.8) t = nO(x, y) > 0.66 ? 'ore' : 'rock';
      else if (nT(x, y) > 0.58 && Math.random() < 0.6) t = 'tree';
      else if (Math.random() < 0.025) t = 'tree';
      else if (nD(x, y) > 0.62) t = 'dirt';
      st.terrain.push(t);
    }
    const T = st.terrain;
    // 개울
    if (U.chance(0.7)) {
      let x = U.chance(0.5) ? U.randi(6, 18) : U.randi(W - 18, W - 6);
      for (let y = 0; y < H; y++) {
        for (let k = 0; k < 2; k++) if (inb(x + k, y) && TERR[T[I(x + k, y)]].pass) T[I(x + k, y)] = 'shallow';
        x += U.randi(-1, 1);
      }
    }
    // 연못
    const px = U.randi(8, W - 8), py = U.randi(H / 2, H - 6);
    for (let y = -3; y <= 3; y++) for (let x = -4; x <= 4; x++)
      if (inb(px + x, py + y) && (x * x) / 16 + (y * y) / 9 < 1 - Math.random() * 0.3) T[I(px + x, py + y)] = 'water';
    // 바위가 너무 적으면 북쪽에 덩어리를 만든다
    if (T.filter(t => t === 'rock' || t === 'ore').length < 80) {
      const bx = U.randi(15, W - 15);
      for (let y = 0; y < 10; y++) for (let x = -12; x <= 12; x++)
        if (inb(bx + x, y) && Math.abs(x) < 12 - y + U.randi(0, 2)) T[I(bx + x, y)] = Math.random() < 0.12 ? 'ore' : 'rock';
    }
    const cx = W >> 1, cy = (H >> 1) + 5;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      if (Math.hypot(x - cx, (y - cy) * 1.3) < 7.5 && !TERR[T[I(x, y)]].pass) T[I(x, y)] = 'grass';
    // 던전 입구: 바위 가장자리 중 중앙에 가까운 곳
    let best = null, bd = 1e9;
    for (let y = 1; y < H - 1; y++) for (let x = 2; x < W - 2; x++) {
      const t = T[I(x, y)];
      if (t !== 'rock') continue;
      if (!TERR[T[I(x, y + 1)]].pass) continue;
      const d = Math.abs(x - cx) + Math.abs(y - 8) * 0.6;
      if (d < bd) { bd = d; best = [x, y]; }
    }
    if (!best) best = [cx, 6];
    st.entrance = { x: best[0], y: best[1] };
    T[I(best[0], best[1])] = 'entrance';
    for (let y = 1; y <= 2; y++) for (let x = -1; x <= 1; x++) if (inb(best[0] + x, best[1] + y)) T[I(best[0] + x, best[1] + y)] = 'dirt';
    // 덤불과 약초
    let n = 0;
    for (let k = 0; k < 2000 && n < 22; k++) {
      const x = U.rand(W), y = U.rand(H);
      if (T[I(x, y)] === 'grass' && Math.hypot(x - cx, y - cy) > 5) { T[I(x, y)] = 'bush'; n++; }
    }
    n = 0;
    for (let k = 0; k < 2000 && n < 9; k++) {
      const x = U.rand(W), y = U.rand(H);
      if (T[I(x, y)] === 'grass' && Math.hypot(x - cx, y - cy) > 8) { T[I(x, y)] = 'herb'; n++; }
    }
    // 입구와 중앙 연결 보장
    s = st;
    const r = G.bfs(W, H, cx, cy, (x, y) => TERR[T[I(x, y)]].pass, (x, y) => x === best[0] && y === best[1]);
    if (!r) {
      for (const [x, y] of G.line(cx, cy, best[0], best[1])) if (!TERR[T[I(x, y)]].pass) T[I(x, y)] = 'dirt';
    }
    return st;
  }

  function setupNew(colonists) {
    G.S.settle = gen();
    bind();
    const cx = W >> 1, cy = (H >> 1) + 5;
    for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 7; x <= cx - 3; x++) s.zone[I(x, y)] = 'stock';
    s.bld[I(cx + 3, cy - 1)] = { type: 'stove', built: true, hp: G.BUILD.stove.hp, prog: 0 };
    G.S.store = { wood: 45, stone: 12, food: 40, meal: 6, ration: 6, herb: 2 };
    G.S.armory = [G.Chars.makeGear('club'), G.Chars.makeGear('leather_armor')];
    for (const k in G.RECIPES) G.S.bills[k] = G.RECIPES[k].def || 0;
    for (const c of colonists) {
      G.S.colonists.push(c);
      placeNear(c, cx, cy);
    }
  }

  // ───────── 질의 ─────────
  function passable(x, y) {
    if (!inb(x, y)) return false;
    const i = I(x, y);
    if (!TERR[s.terrain[i]].pass) return false;
    const b = s.bld[i];
    if (b && b.built && G.BUILD[b.type].block) return false;
    return true;
  }
  const home = () => G.S.colonists.filter(c => c.loc === 'home');
  const dayNum = () => Math.floor(s.tick / DAY) + 1;
  const isNight = () => { const t = s.tick % DAY; return t < DAY * 0.25 || t >= DAY * 0.9; };
  const monAt = (x, y) => s.mons.find(m => m.hp > 0 && m.x === x && m.y === y);
  const find = (c, goal, max) => G.bfs(W, H, c.x, c.y, (x, y) => passable(x, y) && !monAt(x, y), goal, max || 3000);
  const isRes = (k, c) => s.res[k] != null && s.res[k] !== c.id;
  const reserve = (k, c) => { s.res[k] = c.id; };
  const unreserve = k => { delete s.res[k]; };
  const bldCount = type => s.bld.filter(b => b && b.built && b.type === type).length;

  function placeNear(c, x, y) {
    const r = G.bfs(W, H, x, y, (a, b) => inb(a, b) && TERR[s.terrain[I(a, b)]].pass, (a, b) => passable(a, b) && !home().some(o => o !== c && o.x === a && o.y === b));
    c.x = r ? r.x : x; c.y = r ? r.y : y;
    c.path = []; c.job = null; c.wait = 0; c.carry = null;
  }

  // 수확물을 들고 곧장 창고로 간다. 창고가 없으면 바닥에 내려놓는다.
  function carryToStock(c, r, q) {
    if (c.job && c.job.resKey) unreserve(c.job.resKey);
    const p = s.zone.includes('stock') ? find(c, (x, y) => s.zone[I(x, y)] === 'stock') : null;
    if (!p) { dropPile(c.x, c.y, r, q); c.job = null; c.path = []; return; }
    c.carry = { [r]: q };
    c.job = { kind: 'haul', stage: 'drop' };
    c.path = p.path;
  }

  function dropPile(x, y, r, q) {
    if (q <= 0) return;
    if (s.zone[I(x, y)] === 'stock') { Store.give(r, q); return; }
    const p = s.piles.find(p => p.x === x && p.y === y && p.r === r);
    if (p) p.q += q;
    else s.piles.push({ id: U.uid(), x, y, r, q });
  }

  // ───────── 작업 관리 ─────────
  function abortJob(c) {
    const j = c.job;
    if (j) {
      if (j.resKey) unreserve(j.resKey);
      if (c.carry) {
        if (j.kind === 'haul') for (const k in c.carry) dropPile(c.x, c.y, k, c.carry[k]);
        else Store.giveAll(c.carry);
      }
    }
    c.carry = null; c.job = null; c.path = [];
  }
  function endJob(c) { if (c.job && c.job.resKey) unreserve(c.job.resKey); c.job = null; c.path = []; c.carry = null; }

  function recipeUnlocked(r) { return !r.res || G.S.research.done[r.res]; }
  function recipeCount(r) { return r.gear ? G.S.armory.filter(g => g.base === r.gear).length : G.S.store[r.out] || 0; }
  function recipeWanted(id) { const r = G.RECIPES[id]; return recipeUnlocked(r) && recipeCount(r) < (G.S.bills[id] || 0); }

  const FIND = {
    build(c) {
      let any = false;
      for (let i = 0; i < s.bld.length && !any; i++) {
        const b = s.bld[i];
        if (b && !b.built && !isRes('b' + i, c) && Store.has(G.BUILD[b.type].cost)) any = true;
      }
      if (!any) return null;
      const r = find(c, (x, y) => {
        for (let k = -1; k < 8; k++) {
          const nx = k < 0 ? x : x + G.DIRS8[k][0], ny = k < 0 ? y : y + G.DIRS8[k][1];
          if (!inb(nx, ny)) continue;
          const i = I(nx, ny), b = s.bld[i];
          if (!b || b.built || isRes('b' + i, c)) continue;
          const d = G.BUILD[b.type];
          if (d.block && k < 0) continue;
          if (!Store.has(d.cost)) continue;
          return { i };
        }
        return null;
      });
      if (!r) return null;
      const j = { kind: 'build', i: r.target.i, stage: 'fetch', work: 0, resKey: 'b' + r.target.i };
      reserve(j.resKey, c);
      return j;
    },
    mine(c) { return findDesig(c, 'mine'); },
    chop(c) { return findDesig(c, 'chop'); },
    farm(c) {
      const r = find(c, (x, y) => {
        const i = I(x, y);
        if (isRes('t' + i, c)) return null;
        const t = s.terrain[i];
        if (t === 'bush' || t === 'herb') return { i, act: 'wild' };
        if (s.zone[i] === 'farm' && !s.bld[i]) {
          const cr = s.crop[i];
          if (!cr) return { i, act: 'sow' };
          if (cr.g >= 1) return { i, act: 'harvest' };
        }
        return null;
      }, 2500);
      if (!r) return null;
      const j = { kind: 'farm', i: r.target.i, act: r.target.act, stage: 'work', work: 0, resKey: 't' + r.target.i };
      reserve(j.resKey, c);
      c.path = r.path;
      return j;
    },
    cook(c) { return findCraft(c, 'cook'); },
    craft(c) { return findCraft(c, 'craft'); },
    research(c) {
      const R = G.S.research;
      if (!R.cur) return null;
      const r = find(c, (x, y) => { const i = I(x, y), b = s.bld[i]; return b && b.built && b.type === 'research_desk' && !isRes('b' + i, c) ? { i } : null; });
      if (!r) return null;
      const j = { kind: 'research', i: r.target.i, stage: 'work', work: 0, resKey: 'b' + r.target.i };
      reserve(j.resKey, c);
      c.path = r.path;
      return j;
    },
    haul(c) {
      if (!s.piles.length || !s.zone.includes('stock')) return null;
      const pm = new Map();
      for (const p of s.piles) if (!isRes('p' + p.id, c)) pm.set(I(p.x, p.y), p);
      if (!pm.size) return null;
      const r = find(c, (x, y) => pm.get(I(x, y)) || null);
      if (!r) return null;
      const j = { kind: 'haul', pid: r.target.id, stage: 'pick', resKey: 'p' + r.target.id };
      reserve(j.resKey, c);
      c.path = r.path;
      return j;
    },
  };

  function findDesig(c, kind) {
    if (!s.desig.includes(kind)) return null;
    const r = find(c, (x, y) => {
      for (let k = 0; k < 8; k++) {
        const nx = x + G.DIRS8[k][0], ny = y + G.DIRS8[k][1];
        if (!inb(nx, ny)) continue;
        const i = I(nx, ny);
        if (s.desig[i] === kind && !isRes('t' + i, c)) return { i };
      }
      return null;
    });
    if (!r) return null;
    const j = { kind, i: r.target.i, stage: 'work', work: 0, resKey: 't' + r.target.i };
    reserve(j.resKey, c);
    c.path = r.path;
    return j;
  }

  function findCraft(c, wt) {
    const recs = Object.keys(G.RECIPES).filter(id => {
      const r = G.RECIPES[id];
      return G.BUILD[r.st].station === wt && recipeWanted(id) && Store.has(r.in);
    });
    if (!recs.length) return null;
    const sts = new Set(recs.map(id => G.RECIPES[id].st));
    const r = find(c, (x, y) => { const i = I(x, y), b = s.bld[i]; return b && b.built && sts.has(b.type) && !isRes('b' + i, c) ? { i, type: b.type } : null; });
    if (!r) return null;
    const rec = recs.find(id => G.RECIPES[id].st === r.target.type);
    const j = { kind: 'craft', i: r.target.i, rec, stage: 'fetch', work: 0, resKey: 'b' + r.target.i };
    reserve(j.resKey, c);
    return j;
  }

  const EDIBLE = ['fine_meal', 'meal', 'food', 'hearty_ration', 'ration'];
  function startEat(c) {
    const food = EDIBLE.find(k => (G.S.store[k] || 0) > 0);
    if (food) { c.job = { kind: 'eat', stage: 'fetch', food }; return true; }
    const pm = new Map();
    for (const p of s.piles) if (EDIBLE.includes(p.r) && !isRes('p' + p.id, c)) pm.set(I(p.x, p.y), p);
    if (!pm.size) return false;
    const r = find(c, (x, y) => pm.get(I(x, y)) || null);
    if (!r) return false;
    c.job = { kind: 'eat', stage: 'pile', pid: r.target.id, resKey: 'p' + r.target.id };
    reserve(c.job.resKey, c);
    c.path = r.path;
    return true;
  }

  function startSleep(c) {
    let bi = c.bed;
    if (bi != null && !(s.bld[bi] && s.bld[bi].built && G.BUILD[s.bld[bi].type].bed)) bi = c.bed = null;
    if (bi == null) {
      const owned = new Set(G.S.colonists.filter(o => o.loc !== 'dead' && o.bed != null).map(o => o.bed));
      for (let i = 0; i < s.bld.length; i++) {
        const b = s.bld[i];
        if (b && b.built && G.BUILD[b.type].bed && !owned.has(i)) { bi = c.bed = i; break; }
      }
    }
    c.job = { kind: 'sleep', bed: bi, stage: bi != null ? 'go' : 'sleep' };
    if (bi != null) {
      const r = find(c, (x, y) => I(x, y) === bi);
      if (r) c.path = r.path; else { c.job.bed = null; c.job.stage = 'sleep'; }
    }
  }

  function wander(c) {
    const tx = c.x + U.randi(-5, 5), ty = c.y + U.randi(-5, 5);
    if (!passable(tx, ty)) return;
    const r = find(c, (x, y) => x === tx && y === ty, 300);
    if (r) { c.job = { kind: 'wander' }; c.path = r.path; }
  }

  function chooseJob(c) {
    if (c.breakT > s.tick) { if (U.chance(0.1)) wander(c); return; }
    if (c.food < 30 && startEat(c)) return;
    if (c.rest < 15 || (isNight() && c.rest < 75)) { startSleep(c); return; }
    if (c.idleUntil > s.tick) { if (U.chance(0.03)) wander(c); return; }
    for (let p = 1; p <= 3; p++) for (const w of G.WORK) {
      if (c.pri[w] !== p) continue;
      const j = FIND[w](c);
      if (j) { c.job = j; return; }
    }
    c.idleUntil = s.tick + 25;
    if (U.chance(0.3)) wander(c);
  }

  function stepPath(c) {
    const [nx, ny] = c.path[0];
    if (!passable(nx, ny) || monAt(nx, ny)) { abortJob(c); return; }
    c.x = nx; c.y = ny; c.path.shift();
    c.wait += G.Chars.moveCost(c) - 10;
  }

  // 창고에서 재료 가져오기. 다 가져왔으면 true
  function fetch(c, cost) {
    if (s.zone[I(c.x, c.y)] !== 'stock' && s.zone.includes('stock') && !c.job.fetchTried) {
      const r = find(c, (x, y) => s.zone[I(x, y)] === 'stock');
      c.job.fetchTried = true;
      if (r && r.path.length) { c.path = r.path; return false; }
    }
    if (!Store.has(cost)) { abortJob(c); return false; }
    Store.take(cost);
    c.carry = Object.assign({}, cost);
    return true;
  }

  function adjOrOn(c, i, allowOn) {
    const x = i % W, y = (i / W) | 0, d = U.cheb(c.x, c.y, x, y);
    return d === 1 || (allowOn && d === 0);
  }

  function goAdj(c, i, allowOn) {
    const tx = i % W, ty = (i / W) | 0;
    const r = find(c, (x, y) => { const d = U.cheb(x, y, tx, ty); return d === 1 || (allowOn && d === 0); });
    if (!r) { abortJob(c); return false; }
    c.path = r.path;
    return true;
  }

  function doJob(c) {
    if (c.path.length) { stepPath(c); return; }
    const j = c.job;
    switch (j.kind) {
      case 'wander': case 'flee': case 'fight': endJob(c); return;
      case 'build': {
        const b = s.bld[j.i];
        if (!b || b.built) { abortJob(c); return; }
        const d = G.BUILD[b.type];
        if (j.stage === 'fetch') { if (fetch(c, d.cost)) j.stage = 'go'; return; }
        if (j.stage === 'go') { if (adjOrOn(c, j.i, !d.block)) j.stage = 'work'; else goAdj(c, j.i, !d.block); return; }
        j.work += G.Chars.workSpeed(c, 'construction');
        G.Chars.train(c, 'construction', 0.03);
        if (j.work >= d.work) {
          b.built = true;
          b.hp = Math.round(d.hp * (d.block && G.S.research.done.fortify ? 1.5 : 1));
          c.carry = null;
          if (d.block) {
            const bx = j.i % W, by = (j.i / W) | 0;
            for (const o of home()) if (o.x === bx && o.y === by) placeNear(o, bx, by);
            for (const p of s.piles) if (p.x === bx && p.y === by) {
              const r = G.bfs(W, H, bx, by, () => true, (x, y) => passable(x, y));
              if (r) { p.x = r.x; p.y = r.y; }
            }
          }
          endJob(c);
        }
        return;
      }
      case 'mine': case 'chop': {
        if (s.desig[j.i] !== j.kind) { abortJob(c); return; }
        if (!adjOrOn(c, j.i, false)) { goAdj(c, j.i, false); return; }
        const t = s.terrain[j.i];
        const sk = j.kind === 'mine' ? 'mining' : 'plants';
        j.work += G.Chars.workSpeed(c, sk);
        G.Chars.train(c, sk, 0.025);
        const need = j.kind === 'chop' ? 45 : t === 'ore' ? 95 : 70;
        if (j.work >= need) {
          const x = j.i % W, y = (j.i / W) | 0;
          s.desig[j.i] = null;
          if (j.kind === 'chop') { s.terrain[j.i] = 'grass'; dropPile(x, y, 'wood', U.randi(4, 6)); }
          else {
            s.terrain[j.i] = 'dirt';
            if (t === 'ore') { dropPile(x, y, 'iron_ore', U.randi(2, 3)); dropPile(x, y, 'stone', 1); }
            else dropPile(x, y, 'stone', U.randi(2, 3));
          }
          endJob(c);
        }
        return;
      }
      case 'farm': {
        const i = j.i, x = i % W, y = (i / W) | 0;
        if (c.x !== x || c.y !== y) { abortJob(c); return; }
        j.work += G.Chars.workSpeed(c, 'plants');
        G.Chars.train(c, 'plants', 0.03);
        if (j.work < (j.act === 'sow' ? 15 : 20)) return;
        if (j.act === 'sow') { if (s.zone[i] === 'farm') s.crop[i] = { g: 0 }; }
        else if (j.act === 'harvest') { if (s.crop[i] && s.crop[i].g >= 1) { delete s.crop[i]; carryToStock(c, 'food', c.skills.plants >= 6 ? 4 : 3); return; } }
        else {
          const t = s.terrain[i];
          if (t === 'bush') { s.terrain[i] = 'bush_e'; s.regrow.push({ i, t: s.tick + DAY * 3, to: 'bush' }); carryToStock(c, 'food', 3); return; }
          if (t === 'herb') { s.terrain[i] = 'herb_e'; s.regrow.push({ i, t: s.tick + DAY * 4, to: 'herb' }); carryToStock(c, 'herb', 2); return; }
        }
        endJob(c);
        return;
      }
      case 'craft': {
        const b = s.bld[j.i], r = G.RECIPES[j.rec];
        if (!b || !b.built) { abortJob(c); return; }
        if (j.stage === 'fetch') {
          if (!recipeWanted(j.rec)) { abortJob(c); return; }
          if (fetch(c, r.in)) {
            j.stage = 'go';
            const bx = j.i % W, by = (j.i / W) | 0;
            const p = find(c, (x, y) => x === bx && y === by);
            if (!p) { abortJob(c); return; }
            c.path = p.path;
          }
          return;
        }
        const sk = G.BUILD[r.st].station === 'cook' ? 'cooking' : 'crafting';
        j.work += G.Chars.workSpeed(c, sk);
        G.Chars.train(c, sk, 0.03);
        if (j.work >= r.work) {
          if (r.gear) {
            const plus = c.skills.crafting >= 8 && U.chance(0.3) ? 1 : 0;
            const it = G.Chars.makeGear(r.gear, plus);
            G.S.armory.push(it);
            G.msg(`${c.name}이(가) ${G.Chars.gearName(it)}을(를) 만들었다.`);
          } else Store.give(r.out, r.q);
          c.carry = null;
          endJob(c);
        }
        return;
      }
      case 'research': {
        const R = G.S.research;
        if (!R.cur) { endJob(c); return; }
        const rate = 0.22 * G.Chars.workSpeed(c, 'research') * (0.5 + c.int / 20);
        R.prog[R.cur] = (R.prog[R.cur] || 0) + rate;
        G.Chars.train(c, 'research', 0.03);
        checkResearch();
        if (++j.work > 300 || c.food < 25 || (isNight() && c.rest < 60)) endJob(c);
        return;
      }
      case 'haul': {
        if (j.stage === 'pick') {
          const p = s.piles.find(p => p.id === j.pid);
          if (!p || p.x !== c.x || p.y !== c.y) { abortJob(c); return; }
          s.piles.splice(s.piles.indexOf(p), 1);
          c.carry = { [p.r]: p.q };
          j.stage = 'drop';
          const r = find(c, (x, y) => s.zone[I(x, y)] === 'stock');
          if (!r) { abortJob(c); return; }
          c.path = r.path;
          return;
        }
        if (s.zone[I(c.x, c.y)] === 'stock') { Store.giveAll(c.carry); c.carry = null; endJob(c); }
        else abortJob(c);
        return;
      }
      case 'eat': {
        if (j.stage === 'pile') {
          const p = s.piles.find(p => p.id === j.pid);
          if (!p || p.x !== c.x || p.y !== c.y) { abortJob(c); return; }
          if (--p.q <= 0) s.piles.splice(s.piles.indexOf(p), 1);
          unreserve(j.resKey); j.resKey = null;
          j.food = p.r; j.stage = 'eat'; j.work = 0;
          return;
        }
        if (j.stage === 'fetch') {
          const food = ['fine_meal', 'meal', 'food', 'hearty_ration', 'ration'].find(k => (G.S.store[k] || 0) > 0);
          if (!food) { abortJob(c); return; }
          if (!fetch(c, { [food]: 1 })) return;
          j.food = food;
          j.stage = 'table';
          const t = find(c, (x, y) => { const i = I(x, y), b = s.bld[i]; return b && b.built && b.type === 'table' && !isRes('b' + i, c) ? { i } : null; }, 900);
          if (t) { j.table = true; j.resKey = 'b' + t.target.i; reserve(j.resKey, c); c.path = t.path; }
          return;
        }
        if (j.stage === 'table') { j.stage = 'eat'; j.work = 0; return; }
        if (++j.work < 15) return;
        const fd = G.RES[j.food];
        c.food = Math.min(100, c.food + fd.eat);
        c.carry = null;
        if (fd.raw) G.Chars.addThought(c, 'ate', -6, DAY, '날것을 먹음');
        else if (fd.fine) G.Chars.addThought(c, 'ate', j.table ? 9 : 5, DAY, '맛있는 식사');
        else if (j.table) G.Chars.addThought(c, 'ate', 3, DAY, '식탁에서 식사');
        else G.Chars.addThought(c, 'ate', -3, DAY, '바닥에서 식사');
        endJob(c);
        return;
      }
      case 'sleep': {
        if (j.stage === 'go') { j.stage = 'sleep'; return; }
        const done = c.rest >= 100 || (!isNight() && c.rest >= 70);
        if (done) {
          if (j.bed != null) G.Chars.addThought(c, 'slept', 2, DAY, '침대에서 잠');
          else G.Chars.addThought(c, 'slept', -6, DAY, '맨바닥에서 잠');
          endJob(c);
        }
        return;
      }
    }
  }

  function checkResearch() {
    const R = G.S.research;
    if (!R.cur) return;
    const def = G.RESEARCH[R.cur];
    if (R.bank > 0) {
      const need = def.pts - (R.prog[R.cur] || 0), mv = Math.min(R.bank, need);
      R.prog[R.cur] = (R.prog[R.cur] || 0) + mv; R.bank -= mv;
    }
    if ((R.prog[R.cur] || 0) >= def.pts) {
      R.done[R.cur] = true;
      G.msg(`🔬 연구 완료: ${def.n} — ${def.d}`, 'good');
      R.cur = null;
      if (G.onEvent) G.onEvent('research');
    }
  }

  // ───────── 사망 / 기분 ─────────
  function die(c, cause) {
    if (c.loc === 'dead') return;
    abortJob(c);
    c.loc = 'dead'; c.hp = 0; c.deathCause = cause; c.deathDay = dayNum();
    c.bed = null;
    s.graves.push({ x: c.x, y: c.y, name: c.name });
    G.msg(`☠ ${c.name}이(가) 죽었다. (${cause})`, 'bad');
    mourn(c);
    if (G.onEvent) G.onEvent('death');
  }
  function mourn(dead) {
    for (const o of G.S.colonists) {
      if (o.loc === 'dead' || o === dead) continue;
      G.Chars.addThought(o, 'death' + dead.id, G.Chars.has(o, 'brave') ? -6 : -12, DAY * 3, `${dead.name}의 죽음`);
    }
  }

  function updateMood(c) {
    let t = 50;
    if (G.Chars.has(c, 'optimist')) t += 10;
    if (G.Chars.has(c, 'pessimist')) t -= 10;
    c.thoughts = c.thoughts.filter(th => th.until > s.tick);
    for (const th of c.thoughts) t += th.v;
    if (c.food < 15) t -= 10;
    if (c.hp < G.Chars.maxHP(c) * 0.5) t -= 6;
    if (c.rest < 15) t -= 6;
    c.mood += (U.clamp(t, 0, 100) - c.mood) * 0.15;
    if (c.mood < 18 && !(c.breakT > s.tick) && U.chance(0.03)) {
      abortJob(c);
      c.breakT = s.tick + 300;
      G.msg(`${c.name}이(가) 정신적 한계에 부딪혀 멍하니 배회한다.`, 'warn');
    }
  }

  // ───────── 습격 ─────────
  function spawnRaid() {
    const day = dayNum();
    const depth = U.clamp(1 + Math.floor(G.S.maxDepth * 0.5) + Math.floor(day / 15), 1, 9);
    // 습격 규모는 지금 정착지를 지키는 정착민의 힘에 맞춘다 (림월드식)
    let guard = 0;
    for (const c of home()) {
      const w = c.equip.weapon ? G.GEAR[c.equip.weapon.base].dmg : 2, a = c.equip.armor ? G.GEAR[c.equip.armor.base].ac : 0;
      guard += c.xl + w / 3 + a / 2;
    }
    let pts = 2 + day * 0.25 + guard * 0.55, n = 0;
    const cap = Math.max(3, pts * 0.4);
    const pool = {};
    for (const k in G.MON) {
      const d = G.MON[k];
      if (d.immobile || !d.w || d.d[0] > depth || d.d[1] < depth - 3 || d.xp > cap) continue;
      pool[k] = d.w * (1 + d.d[0] / 3);
    }
    if (!Object.keys(pool).length) pool.rat = 1;
    const e = s.entrance;
    while (pts > 0 && n < 14) {
      const k = U.wpick(pool);
      const r = G.bfs(W, H, e.x, e.y, (x, y) => inb(x, y) && TERR[s.terrain[I(x, y)]].pass, (x, y) => passable(x, y) && !monAt(x, y));
      if (!r) break;
      const d = G.MON[k];
      s.mons.push({ id: U.uid(), isMon: true, type: k, x: r.x, y: r.y, hp: d.hp, maxhp: d.hp, wait: n * 3, status: {}, state: 'hunt' });
      pts -= Math.max(1, d.xp);
      n++;
    }
    s.threat = 0;
    s.raidStart = s.tick;
    G.msg(`⚠ 던전에서 괴물 ${n}마리가 쏟아져 나왔다! 습격이다!`, 'bad');
    if (G.onEvent) G.onEvent('raid');
  }

  function monCost(x, y) {
    const i = I(x, y);
    if (!TERR[s.terrain[i]].pass) return Infinity;
    const b = s.bld[i];
    if (b && b.built && (G.BUILD[b.type].block || G.BUILD[b.type].door)) return 1 + b.hp / 8;
    return 1;
  }

  function killMon(m, killer) {
    m.hp = 0;
    const d = G.MON[m.type];
    G.msg(`${killer ? killer.name + '이(가) ' : ''}${d.n}을(를) 쓰러뜨렸다.`, 'good');
    if (d.drops) for (const r in d.drops) {
      const p = d.drops[r];
      const q = Math.floor(p) + (U.chance(p % 1) ? 1 : 0);
      if (q > 0) dropPile(m.x, m.y, r, q);
    }
    if (killer) { killer.kills++; G.Chars.gainXP(killer, d.xp); }
  }

  function tickMons() {
    const H_ = home();
    let srcs = H_.map(c => [c.x, c.y]);
    if (!srcs.length) for (let i = 0; i < s.bld.length; i++) if (s.bld[i] && s.bld[i].built) srcs.push([i % W, (i / W) | 0]);
    const raidOver = s.tick - s.raidStart > DAY * 0.8 || !srcs.length;
    if (raidOver) {
      G.msg('습격자들이 던전으로 물러갔다.', 'warn');
      s.mons = [];
      return;
    }
    const dist = G.dijkstra(W, H, srcs, monCost);
    for (const m of s.mons) {
      if (m.hp <= 0) continue;
      if (m.wait >= 10) { m.wait -= 10; continue; }
      const d = G.MON[m.type];
      if (m.status.stun) { m.status.stun--; continue; }
      if (d.regen) m.hp = Math.min(m.maxhp, m.hp + d.regen);
      // 인접한 정착민 공격
      const adj = H_.find(c => c.loc === 'home' && U.cheb(c.x, c.y, m.x, m.y) <= 1);
      if (adj) { monHit(m, adj); continue; }
      if (d.bolt) {
        const tg = H_.find(c => c.loc === 'home' && U.cheb(c.x, c.y, m.x, m.y) <= d.bolt.range && G.los(m.x, m.y, c.x, c.y, (x, y) => !passable(x, y)));
        if (tg && U.chance(0.5)) { monHit(m, tg, d.bolt); continue; }
      }
      let best = null, bv = dist[I(m.x, m.y)];
      for (const [dx, dy] of G.DIRS8) {
        const nx = m.x + dx, ny = m.y + dy;
        if (!inb(nx, ny) || monAt(nx, ny)) continue;
        const v = dist[I(nx, ny)];
        if (v < bv) { bv = v; best = [nx, ny]; }
      }
      if (!best) continue;
      const bi = I(best[0], best[1]), b = s.bld[bi];
      if (b && b.built && (G.BUILD[b.type].block || G.BUILD[b.type].door)) {
        b.hp -= U.randi(1, d.dmg);
        if (b.hp <= 0) { s.bld[bi] = null; G.msg(`${d.n}이(가) ${G.BUILD[b.type].n}을(를) 부쉈다!`, 'warn'); }
      } else {
        m.x = best[0]; m.y = best[1];
        if (b && b.built && G.BUILD[b.type].trap) {
          const dmg = U.randi(4, 12);
          m.hp -= dmg;
          if (m.hp <= 0) killMon(m, null);
        }
      }
      m.wait += d.spd - 10;
    }
    s.mons = s.mons.filter(m => m.hp > 0);
    if (!s.mons.length) {
      G.msg('습격을 막아냈다!', 'good');
      for (const c of home()) G.Chars.addThought(c, 'raidwin', 5, DAY * 2, '습격 격퇴');
      if (G.onEvent) G.onEvent('raidover');
    }
  }

  function monHit(m, c, bolt) {
    if (c.loc !== 'home') return;
    const d = G.MON[m.type];
    const r = G.Combat.attack(m, c, bolt ? { dmgOverride: bolt.dmg, sure: false } : {});
    if (r.hit) G.msg(`${d.n}의 ${bolt ? bolt.n : '공격'}: ${c.name}에게 ${r.dmg} 피해${r.extra ? ' (' + r.extra + ')' : ''}.`, 'hurt');
    if (c.hp <= 0) die(c, `습격한 ${d.n}`);
  }

  function colonistAttack(c, tgt, cs) {
    const r = G.Combat.attack(c, tgt);
    if (r.hit) G.msg(`${c.name}의 공격: ${G.MON[tgt.type].n}에게 ${r.dmg} 피해.`);
    if (tgt.hp <= 0) killMon(tgt, c);
    c.wait += cs.delay - 10;
  }

  function inReach(c, cs) {
    const reach = cs.ranged ? cs.range : 1;
    const op = (x, y) => !passable(x, y);
    return s.mons.filter(m => m.hp > 0 && U.cheb(c.x, c.y, m.x, m.y) <= reach && (reach === 1 || G.los(c.x, c.y, m.x, m.y, op)))
      .sort((a, b) => U.cheb(c.x, c.y, a.x, a.y) - U.cheb(c.x, c.y, b.x, b.y))[0];
  }

  // 징집: 일하지 않고, 명령받은 곳으로 가서, 닿는 적을 공격한다
  function draftAct(c) {
    if (c.job) abortJob(c);
    if (c.wait >= 10) { c.wait -= 10; return; }
    const cs = G.Chars.stats(c);
    const tgt = inReach(c, cs);
    if (tgt) { colonistAttack(c, tgt, cs); return; }
    if (!c.order) return;
    if (c.x === c.order.x && c.y === c.order.y) { c.order = null; c.path = []; return; }
    if (!c.path.length) {
      const r = find(c, (x, y) => x === c.order.x && y === c.order.y);
      if (!r) { c.order = null; return; }
      c.path = r.path;
    }
    const [nx, ny] = c.path[0];
    if (passable(nx, ny) && !monAt(nx, ny) && !home().some(o => o !== c && o.drafted && o.x === nx && o.y === ny && !o.path.length)) {
      c.x = nx; c.y = ny; c.path.shift(); c.wait += G.Chars.moveCost(c) - 10;
    } else c.path = [];
  }

  function raidAct(c) {
    if (c.job && c.job.kind !== 'fight' && c.job.kind !== 'flee') abortJob(c);
    if (c.wait >= 10) { c.wait -= 10; return; }
    const live = s.mons.filter(m => m.hp > 0);
    if (!live.length) return;
    let near = live[0], nd = 1e9;
    for (const m of live) { const d = U.cheb(c.x, c.y, m.x, m.y); if (d < nd) { nd = d; near = m; } }
    const flee = G.Chars.has(c, 'coward') || c.hp < G.Chars.maxHP(c) * 0.3;
    if (flee) {
      c.job = { kind: 'flee' };
      if (nd > 12) return;
      let best = null, bv = nd;
      for (const [dx, dy] of G.DIRS8) {
        const nx = c.x + dx, ny = c.y + dy;
        if (!passable(nx, ny) || monAt(nx, ny)) continue;
        const v = Math.min(...live.map(m => U.cheb(nx, ny, m.x, m.y)));
        if (v > bv) { bv = v; best = [nx, ny]; }
      }
      if (best) { c.x = best[0]; c.y = best[1]; c.wait += G.Chars.moveCost(c) - 10; }
      return;
    }
    c.job = { kind: 'fight' };
    const cs = G.Chars.stats(c);
    const reach = cs.ranged ? cs.range : 1;
    const tgt = inReach(c, cs);
    if (tgt) { colonistAttack(c, tgt, cs); return; }
    if (!c.path.length || s.tick % 4 === 0) {
      const r = find(c, (x, y) => live.some(m => U.cheb(x, y, m.x, m.y) <= Math.max(1, reach - 1)), 2500);
      c.path = r ? r.path : [];
    }
    if (c.path.length) {
      const [nx, ny] = c.path[0];
      if (passable(nx, ny) && !monAt(nx, ny)) { c.x = nx; c.y = ny; c.path.shift(); c.wait += G.Chars.moveCost(c) - 10; }
      else c.path = [];
    }
  }

  // ───────── 틱 ─────────
  function tickColonist(c) {
    const mx = G.Chars.maxHP(c);
    c.food = Math.max(0, c.food - G.Chars.foodRate(c));
    const sleeping = c.job && c.job.kind === 'sleep' && c.job.stage === 'sleep';
    if (sleeping) c.rest = Math.min(100, c.rest + 100 / (DAY * 0.28));
    else c.rest = Math.max(0, c.rest - 100 / (DAY * 0.85));
    if (c.hp < mx && c.food > 0) {
      let mul = 1;
      if (sleeping && c.job.bed != null && s.bld[c.job.bed]) mul = G.BUILD[s.bld[c.job.bed].type].heal || 2;
      c.hpAcc = (c.hpAcc || 0) + 0.012 * mul * (1 + mx / 50);
      if (c.hpAcc >= 1) { c.hp = Math.min(mx, c.hp + Math.floor(c.hpAcc)); c.hpAcc %= 1; }
    }
    const mm = G.Chars.maxMP(c);
    if (c.mp < mm) c.mp = Math.min(mm, c.mp + 0.02);
    if (c.food <= 0 && s.tick % 60 === 0) {
      c.hp -= 1;
      if (c.hp <= 0) { die(c, '굶주림'); return; }
    }
    if (s.tick % 30 === c.id % 30) updateMood(c);
    if (c.drafted) { draftAct(c); return; }
    if (s.mons.length) { raidAct(c); return; }
    if (c.job && (c.job.kind === 'fight' || c.job.kind === 'flee')) endJob(c);
    if (c.wait >= 10) { c.wait -= 10; return; }
    if (!c.job) chooseJob(c);
    if (c.job) doJob(c);
  }

  function tick() {
    bind();
    s.tick++;
    if (s.tick % DAY === 0) { G.msg(`— ${dayNum()}일째 아침 —`, 'dim'); if (G.onEvent) G.onEvent('newday'); }
    for (const c of home()) tickColonist(c);
    if (s.mons.length) tickMons();
    for (const k in s.crop) if (s.crop[k].g < 1) s.crop[k].g += 1 / (DAY * 2.2);
    if (s.regrow.length && s.tick % 20 === 0) {
      s.regrow = s.regrow.filter(r => {
        if (r.t > s.tick) return true;
        if (s.terrain[r.i] === r.to + '_e') s.terrain[r.i] = r.to;
        return false;
      });
    }
    if (G.S.research.cur && G.S.research.bank > 0) checkResearch();
    // 위협: 시간이 지날수록 차오른다
    if (!s.mons.length && !G.S.won) {
      const before = s.threat;
      s.threat += (100 / (DAY * 3.5)) * (1 + dayNum() * 0.04);
      if (before < 85 && s.threat >= 85) { G.msg('⚠ 던전 깊은 곳에서 웅성거림이 들려온다. 곧 습격이 온다!', 'warn'); if (G.onEvent) G.onEvent('rumble'); }
      if (s.threat >= 100) spawnRaid();
    }
    // 지원자
    if (s.tick >= s.nextRecruit) {
      const board = bldCount('notice_board') > 0;
      s.nextRecruit = s.tick + DAY * (board ? 1.3 : 2.2) * (0.8 + Math.random() * 0.4);
      const alive = G.S.colonists.filter(c => c.loc !== 'dead').length;
      if (alive < 14 && G.S.pendingRecruits.length < 2) {
        const cands = [];
        for (let k = 0; k < (board ? 3 : 1); k++) cands.push(G.Chars.create());
        G.S.pendingRecruits.push(cands);
        G.msg('정착지 입구에 지원자가 찾아왔다.', 'good');
        if (G.onEvent) G.onEvent('recruit');
      }
    }
  }

  // ───────── 플레이어 명령 ─────────
  function canPlace(type, x, y) {
    if (!inb(x, y)) return false;
    const i = I(x, y);
    const t = s.terrain[i];
    if (!TERR[t].pass || t === 'entrance') return false;
    if (s.bld[i]) return false;
    const d = G.BUILD[type];
    if (d.res && !G.S.research.done[d.res]) return false;
    return true;
  }
  function placeBlueprint(type, x, y) {
    if (!canPlace(type, x, y)) return false;
    const i = I(x, y);
    s.bld[i] = { type, built: false, hp: 1 };
    if (s.zone[i] === 'farm') { s.zone[i] = null; delete s.crop[i]; }
    return true;
  }
  function forRect(x0, y0, x1, y1, fn) {
    const ax = Math.min(x0, x1), bx = Math.max(x0, x1), ay = Math.min(y0, y1), by = Math.max(y0, y1);
    for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) if (inb(x, y)) fn(x, y, I(x, y), x === ax || x === bx || y === ay || y === by);
  }
  function applyTool(tool, x0, y0, x1, y1) {
    bind();
    let n = 0;
    if (tool.startsWith('b:')) {
      const type = tool.slice(2);
      const d = G.BUILD[type];
      if (d.block) forRect(x0, y0, x1, y1, (x, y, i, edge) => { if (edge && placeBlueprint(type, x, y)) n++; });
      else forRect(x0, y0, x1, y1, (x, y) => { if (placeBlueprint(type, x, y)) n++; });
      return n;
    }
    forRect(x0, y0, x1, y1, (x, y, i) => {
      const t = s.terrain[i];
      switch (tool) {
        case 'chop': if (t === 'tree') { s.desig[i] = 'chop'; n++; } break;
        case 'mine': if (t === 'rock' || t === 'ore') { s.desig[i] = 'mine'; n++; } break;
        case 'stock': if (TERR[t].pass && t !== 'entrance' && !(s.bld[i] && G.BUILD[s.bld[i].type].block)) {
          s.zone[i] = 'stock'; delete s.crop[i]; n++;
          for (const p of s.piles.slice()) if (p.x === x && p.y === y && !s.res['p' + p.id]) { Store.give(p.r, p.q); s.piles.splice(s.piles.indexOf(p), 1); }
        } break;
        case 'farm': if ((t === 'grass' || t === 'dirt') && !s.bld[i]) { s.zone[i] = 'farm'; n++; } break;
        case 'unzone': if (s.zone[i]) { s.zone[i] = null; delete s.crop[i]; n++; } break;
        case 'cancel':
          if (s.desig[i]) { s.desig[i] = null; n++; }
          if (s.bld[i] && !s.bld[i].built) { s.bld[i] = null; n++; }
          break;
        case 'decon':
          if (s.bld[i] && s.bld[i].built) {
            const d = G.BUILD[s.bld[i].type];
            for (const k in d.cost) dropPile(x, y, k, Math.floor(d.cost[k] / 2));
            for (const c of G.S.colonists) if (c.bed === i) c.bed = null;
            s.bld[i] = null; n++;
          }
          break;
      }
    });
    return n;
  }

  function tileInfo(x, y) {
    bind();
    if (!inb(x, y)) return null;
    const i = I(x, y), out = [];
    out.push(TERR[s.terrain[i]].n);
    const b = s.bld[i];
    if (b) out.push(G.BUILD[b.type].n + (b.built ? ` (${Math.max(0, Math.round(b.hp))})` : ' [설계도]'));
    if (s.zone[i] === 'stock') out.push('창고 구역');
    if (s.zone[i] === 'farm') out.push('농지' + (s.crop[i] ? ` (감자 ${Math.floor(Math.min(1, s.crop[i].g) * 100)}%)` : ' (빈 땅)'));
    if (s.desig[i]) out.push(s.desig[i] === 'chop' ? '벌목 지정' : '채굴 지정');
    for (const p of s.piles) if (p.x === x && p.y === y) out.push(`${G.RES[p.r].n} ×${p.q}`);
    for (const c of home()) if (c.x === x && c.y === y) out.push(`${c.name} — ${jobLabel(c)}`);
    for (const m of s.mons) if (m.x === x && m.y === y) out.push(`${G.MON[m.type].n} HP ${m.hp}/${m.maxhp}`);
    for (const g of s.graves) if (g.x === x && g.y === y && !b) out.push(`${g.name}의 무덤`);
    return out;
  }

  function jobLabel(c) {
    if (c.drafted) return c.order ? '징집: 이동 중' : '징집: 대기';
    if (c.breakT > s.tick) return '정신적 한계 (배회)';
    const j = c.job;
    if (!j) return '대기';
    switch (j.kind) {
      case 'build': return `건설: ${s.bld[j.i] ? G.BUILD[s.bld[j.i].type].n : ''}`;
      case 'mine': return '채굴'; case 'chop': return '벌목';
      case 'farm': return j.act === 'sow' ? '씨 뿌리기' : '수확';
      case 'craft': return `제작: ${G.RECIPES[j.rec].n}`;
      case 'research': return `연구: ${G.S.research.cur ? G.RESEARCH[G.S.research.cur].n : ''}`;
      case 'haul': return '운반'; case 'eat': return '식사'; case 'sleep': return j.stage === 'sleep' ? '수면' : '잠자리로 이동';
      case 'wander': return '산책'; case 'fight': return '전투!'; case 'flee': return '도망!';
    }
    return j.kind;
  }

  // 원정에서 돌아온 정착민 배치
  function arrive(c) {
    bind();
    c.loc = 'home';
    placeNear(c, s.entrance.x, s.entrance.y + 1);
  }

  function setDraft(c, on) {
    bind();
    c.drafted = !!on;
    c.order = null;
    if (c.job) abortJob(c);
    c.path = [];
  }
  function orderMove(c, x, y) {
    bind();
    if (!c.drafted || !passable(x, y)) return false;
    c.order = { x, y }; c.path = [];
    return true;
  }

  function onLoad() {
    bind();
    s.res = {};
    for (const c of G.S.colonists) { c.job = null; c.path = []; c.carry = null; c.wait = 0; c.order = null; }
  }

  return {
    W, H, DAY, TERR, Store, gen, setupNew, tick, passable: (x, y) => (bind(), passable(x, y)), applyTool, canPlace: (t, x, y) => (bind(), canPlace(t, x, y)),
    setDraft, orderMove, tileInfo, jobLabel: c => (bind(), jobLabel(c)), arrive, placeNear: (c, x, y) => (bind(), placeNear(c, x, y)), onLoad, recipeCount, recipeUnlocked,
    day: () => (bind(), dayNum()), isNight: () => (bind(), isNight()), bldCount: t => (bind(), bldCount(t)), mourn, die: (c, cause) => (bind(), die(c, cause)),
  };
})();
