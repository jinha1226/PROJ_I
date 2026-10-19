'use strict';
// 던전 원정: 층 생성, 턴 스케줄러, 몬스터·동료 AI, 행동
G.Dun = (function () {
  const W = 66, H = 36, FOV_R = 8;
  let d = null, lv = null;
  const bind = () => { d = G.S.dun; lv = d ? d.levels[d.depth] : null; };
  const I = (x, y) => y * W + x;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

  const TT = {
    wall: { n: '암벽', g: '#', pass: 0, op: 1 },
    floor: { n: '바닥', g: '.', pass: 1 },
    door: { n: '닫힌 문', g: '+', pass: 1, op: 1 },
    door_open: { n: '열린 문', g: "'", pass: 1 },
    up: { n: '올라가는 계단', g: '<', pass: 1 },
    down: { n: '내려가는 계단', g: '>', pass: 1 },
    shallow: { n: '얕은 물', g: '~', pass: 1 },
    deep: { n: '깊은 물', g: '≈', pass: 0 },
    lava: { n: '용암', g: '≈', pass: 0 },
    ore: { n: '철광맥', g: '%', pass: 0, op: 1, mine: 'iron_ore', mhp: 3 },
    crystal: { n: '수정 군락', g: '♦', pass: 0, op: 1, mine: 'crystal', mhp: 4 },
    mandrake: { n: '만드라고라', g: 'ψ', pass: 0, act: 'mandrake' },
    bloodtree: { n: '피를 갈구하는 고목', g: '♠', pass: 0, act: 'bloodtree' },
    deadtree: { n: '메마른 고목', g: '♠', pass: 0 },
    captive: { n: '사슬에 묶인 모험가', g: '@', pass: 0, act: 'captive' },
    chest: { n: '낡은 보물상자', g: '■', pass: 0, act: 'chest' },
  };
  const THEMES = [
    { n: '흙빛 굴', wall: ['#c8ae90', '#4e3c2c'], floor: ['#8a7c6c', '#211a14'] },
    { n: '이끼 동굴', wall: ['#90c8a8', '#264432'], floor: ['#6a8a7c', '#11221b'] },
    { n: '뼈의 회랑', wall: ['#d0c0e0', '#3c3250'], floor: ['#867ea0', '#1a1622'] },
    { n: '심장부', wall: ['#e88888', '#562020'], floor: ['#9a6464', '#260d0d'] },
  ];
  const theme = depth => THEMES[depth >= 10 ? 3 : depth >= 7 ? 2 : depth >= 4 ? 1 : 0];

  // ───────── 층 생성 ─────────
  function carveRooms(L) {
    const rooms = [];
    for (let k = 0; k < 400 && rooms.length < 14; k++) {
      const rw = U.randi(4, 11), rh = U.randi(3, 7), x = U.randi(1, W - rw - 2), y = U.randi(1, H - rh - 2);
      if (rooms.some(r => x < r.x + r.w + 1 && x + rw + 1 > r.x && y < r.y + r.h + 1 && y + rh + 1 > r.y)) continue;
      rooms.push({ x, y, w: rw, h: rh });
      for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) L.t[I(xx, yy)] = 'floor';
    }
    const cen = r => [r.x + (r.w >> 1), r.y + (r.h >> 1)];
    const hl = (x0, x1, y) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (L.t[I(x, y)] === 'wall') L.t[I(x, y)] = 'cor'; };
    const vl = (y0, y1, x) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) if (L.t[I(x, y)] === 'wall') L.t[I(x, y)] = 'cor'; };
    const link = (a, b) => {
      const [ax, ay] = cen(a), [bx, by] = cen(b);
      if (U.chance(0.5)) { hl(ax, bx, ay); vl(ay, by, bx); } else { vl(ay, by, ax); hl(ax, bx, by); }
    };
    rooms.sort((a, b) => a.x - b.x);
    for (let i = 1; i < rooms.length; i++) link(rooms[i - 1], rooms[i]);
    for (let k = 0; k < 3; k++) link(U.pick(rooms), U.pick(rooms));
    // 방 입구에 문
    for (let i = 0; i < W * H; i++) {
      if (L.t[i] !== 'cor') continue;
      const x = i % W, y = (i / W) | 0;
      const f = (a, b) => inb(a, b) && L.t[I(a, b)] === 'floor';
      const w = (a, b) => !inb(a, b) || L.t[I(a, b)] === 'wall';
      const nextToRoom = f(x + 1, y) || f(x - 1, y) || f(x, y + 1) || f(x, y - 1);
      const choke = (w(x - 1, y) && w(x + 1, y)) || (w(x, y - 1) && w(x, y + 1));
      L.t[i] = nextToRoom && choke && U.chance(0.45) ? 'door' : 'floor';
    }
    L.rooms = rooms;
  }

  function carveCave(L) {
    for (let tries = 0; tries < 10; tries++) {
      let g = [];
      for (let i = 0; i < W * H; i++) { const x = i % W, y = (i / W) | 0; g.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 || Math.random() < 0.45 ? 1 : 0); }
      for (let it = 0; it < 5; it++) {
        const n = g.slice();
        for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
          let c = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c += g[I(x + dx, y + dy)];
          n[I(x, y)] = c >= 5 ? 1 : 0;
        }
        g = n;
      }
      // 가장 큰 영역만 남김
      const reg = new Int32Array(W * H).fill(-1);
      let best = -1, bs = 0, id = 0;
      for (let i = 0; i < W * H; i++) {
        if (g[i] || reg[i] >= 0) continue;
        const st = [i]; reg[i] = id; let sz = 0;
        while (st.length) {
          const k = st.pop(); sz++;
          const x = k % W, y = (k / W) | 0;
          for (const [dx, dy] of G.DIRS8.slice(0, 4)) {
            const ni = I(x + dx, y + dy);
            if (!g[ni] && reg[ni] < 0) { reg[ni] = id; st.push(ni); }
          }
        }
        if (sz > bs) { bs = sz; best = id; }
        id++;
      }
      if (bs < 700) continue;
      for (let i = 0; i < W * H; i++) L.t[i] = reg[i] === best ? 'floor' : 'wall';
      L.rooms = [];
      return;
    }
    carveRooms(L);
  }

  function floorCells(L, pred) {
    const out = [];
    for (let i = 0; i < W * H; i++) if (L.t[i] === 'floor' && (!pred || pred(i % W, (i / W) | 0, i))) out.push(i);
    return out;
  }
  const openCount = (L, x, y) => G.DIRS8.filter(([dx, dy]) => inb(x + dx, y + dy) && TT[L.t[I(x + dx, y + dy)]].pass).length;

  function reachable(L, a, b) {
    return !!G.bfs(W, H, a.x, a.y, (x, y) => TT[L.t[I(x, y)]].pass, (x, y) => x === b.x && y === b.y);
  }

  function gen(depth) {
    const L = { depth, t: new Array(W * H).fill('wall'), seen: new Array(W * H).fill(0), items: [], mons: [], mhp: {}, up: null, down: null, captive: null, theme: theme(depth).n };
    if (depth === 10) carveCave(L);
    else if (depth >= 4 && U.chance(0.45)) carveCave(L);
    else carveRooms(L);
    // 계단
    const fl = floorCells(L);
    const ui = U.pick(fl);
    L.up = { x: ui % W, y: (ui / W) | 0 };
    L.t[ui] = 'up';
    // 가장 먼 칸 찾기
    const dist = new Int32Array(W * H).fill(-1);
    { const q = [ui]; dist[ui] = 0; let h = 0; while (h < q.length) { const k = q[h++]; const x = k % W, y = (k / W) | 0; for (const [dx, dy] of G.DIRS8) { const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) continue; const ni = I(nx, ny); if (dist[ni] >= 0 || !TT[L.t[ni]].pass) continue; dist[ni] = dist[k] + 1; q.push(ni); } } }
    let far = ui;
    for (let i = 0; i < W * H; i++) if (dist[i] > dist[far] && L.t[i] === 'floor') far = i;
    if (depth < 10) { L.down = { x: far % W, y: (far / W) | 0 }; L.t[far] = 'down'; }
    // 물·용암 웅덩이 (연결성을 깨면 되돌림)
    const pools = [];
    if (U.chance(0.4)) pools.push('water');
    if (depth >= 6 && U.chance(0.35)) pools.push('lava');
    for (const kind of pools) {
      const c = U.pick(floorCells(L)), cx = c % W, cy = (c / W) | 0, rad = U.randi(2, 4);
      const backup = L.t.slice();
      for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
        const nx = cx + x, ny = cy + y;
        if (!inb(nx, ny) || L.t[I(nx, ny)] !== 'floor') continue;
        const dd = Math.hypot(x, y) + Math.random() * 0.8;
        if (dd > rad) continue;
        L.t[I(nx, ny)] = kind === 'lava' ? 'lava' : dd < rad - 1.5 ? 'deep' : 'shallow';
      }
      if (L.down && !reachable(L, L.up, L.down)) L.t = backup;
    }
    // 광맥
    const walls = [];
    for (let i = 0; i < W * H; i++) {
      if (L.t[i] !== 'wall') continue;
      const x = i % W, y = (i / W) | 0;
      if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && openCount(L, x, y) >= 2) walls.push(i);
    }
    U.shuffle(walls);
    const nOre = U.randi(2, 5), nCry = depth >= 3 ? U.randi(1, 2 + Math.floor(depth / 3)) : U.chance(0.3) ? 1 : 0;
    for (let k = 0; k < nOre && walls.length; k++) L.t[walls.pop()] = 'ore';
    for (let k = 0; k < nCry && walls.length; k++) L.t[walls.pop()] = 'crystal';
    // 특수 지형
    const roomy = () => {
      const c = floorCells(L, (x, y) => openCount(L, x, y) === 8 && U.cheb(x, y, L.up.x, L.up.y) > 3);
      return c.length ? U.pick(c) : null;
    };
    const place = (kind, p) => { if (U.chance(p)) { const c = roomy(); if (c != null) { L.t[c] = kind; return c; } } return null; };
    place('mandrake', 0.5);
    place('bloodtree', depth >= 2 ? 0.3 : 0);
    place('chest', 0.35);
    const ci = place('captive', depth >= 2 && depth < 10 ? 0.2 : 0);
    if (ci != null) L.captive = makeCaptive(depth);
    // 아이템
    const nItems = U.randi(3, 5) + Math.floor(depth / 3);
    for (let k = 0; k < nItems; k++) {
      const c = U.pick(floorCells(L));
      dropItem(L, c % W, (c / W) | 0, randItem(depth));
    }
    // 몬스터
    const pool = {};
    for (const k in G.MON) { const m = G.MON[k]; if (m.w && m.d[0] <= depth && m.d[1] >= depth) pool[k] = m.w; }
    // 깊이 밖 몬스터는 드물게, 한 층 정도만 깊게
    const deepPool = {}, ood = depth + (depth >= 5 ? 2 : 1);
    for (const k in G.MON) { const m = G.MON[k]; if (m.w && m.d[0] <= ood && m.d[1] >= ood) deepPool[k] = m.w; }
    const nGroups = 4 + Math.floor(depth * 1.2) + U.rand(3);
    for (let k = 0; k < nGroups; k++) {
      const type = U.chance(0.025) && Object.keys(deepPool).length ? U.wpick(deepPool) : U.wpick(pool);
      const cand = floorCells(L, (x, y) => U.cheb(x, y, L.up.x, L.up.y) > 7 && !monAtL(L, x, y));
      if (!cand.length) break;
      const c = U.pick(cand), x = c % W, y = (c / W) | 0;
      const md = G.MON[type];
      const asleep = U.chance(0.65);
      const m = spawnMon(L, type, x, y, asleep ? 'sleep' : 'wander');
      if (md.pack) {
        const n = U.randi(md.pack[0], md.pack[1]) - 1;
        for (let j = 0; j < n; j++) {
          const spot = freeNear(L, x, y);
          if (spot) spawnMon(L, type, spot[0], spot[1], m.state);
        }
      }
    }
    if (depth === 10) {
      // 심장: 가장 먼 곳에, 수호자와 함께
      const hx = far % W, hy = (far / W) | 0;
      L.t[far] = 'floor';
      spawnMon(L, 'heart', hx, hy, 'hunt');
      for (const g of ['golem', 'wraith', 'wraith', 'troll']) { const sp = freeNear(L, hx, hy); if (sp) spawnMon(L, g, sp[0], sp[1], 'sleep'); }
      L.heart = { x: hx, y: hy };
    }
    return L;
  }

  function makeCaptive(depth) {
    const c = G.Chars.create();
    c.loc = 'captive';
    c.equip = { weapon: null, armor: null, shield: null, pack: null };
    while (c.xl < Math.max(1, Math.floor(depth * 0.8))) G.Chars.gainXPQuiet(c);
    for (let k = 0; k < depth; k++) c.skills[U.pick(G.COMBAT_SKILLS)]++;
    c.hp = Math.ceil(G.Chars.maxHP(c) * 0.4);
    return c;
  }

  function freeNear(L, x, y) {
    const r = G.bfs(W, H, x, y, (a, b) => TT[L.t[I(a, b)]].pass, (a, b) => L.t[I(a, b)] === 'floor' && !monAtL(L, a, b) && !(a === x && b === y), 200);
    return r ? [r.x, r.y] : null;
  }
  const monAtL = (L, x, y) => L.mons.find(m => m.hp > 0 && m.x === x && m.y === y);

  function spawnMon(L, type, x, y, state) {
    const md = G.MON[type];
    const m = { id: U.uid(), isMon: true, type, x, y, hp: md.hp, maxhp: md.hp, nextT: d ? d.T + U.rand(10) : U.rand(10), status: {}, state, lk: null, spawnT: 0 };
    L.mons.push(m);
    return m;
  }

  function randGear(depth, bonus) {
    const low = ['dagger', 'club', 'short_sword', 'hand_axe', 'shortbow', 'leather_armor', 'buckler', 'robe', 'staff'];
    const mid = ['mace', 'chain_mail', 'kite_shield', 'longbow', 'short_sword', 'hand_axe'];
    const high = ['long_sword', 'war_hammer', 'battle_axe', 'plate_armor', 'chain_mail'];
    const pool = depth >= 7 && U.chance(0.6) ? high : depth >= 4 && U.chance(0.6) ? mid : low;
    const base = U.pick(pool);
    const gd = G.GEAR[base];
    let plus = U.randi(-1, Math.floor(depth / 3) + 1) + (bonus || 0);
    if (gd.slot === 'pack') plus = 0;
    let ego = null;
    if (U.chance(0.1 + depth * 0.015 + (bonus ? 0.4 : 0))) {
      if (gd.slot === 'weapon') ego = U.pick(['flaming', 'freezing', 'venom']);
      else if (gd.slot === 'armor' || gd.slot === 'shield') ego = 'protection';
    }
    return G.Chars.makeGear(base, plus, ego);
  }

  function randItem(depth) {
    const r = Math.random();
    if (r < 0.38) {
      const k = U.wpick({ potion_heal: 10, ration: 7, potion_might: 3, potion_haste: 3, scroll_blink: 4, scroll_mapping: 3, scroll_return: 1.3, herb: 6, book_fire: 0.4, book_heal: 0.4, book_blink: 0.4, book_slow: 0.4, book_dart: 0.5 });
      return { k: 'stack', id: k, q: k === 'herb' ? U.randi(2, 3) : k === 'ration' ? U.randi(1, 2) : 1 };
    }
    if (r < 0.65) {
      const k = U.wpick({ iron_ore: 5, hide: 4, bone: depth >= 3 ? 5 : 1, crystal: depth >= 4 ? 4 : 1, essence: depth >= 5 ? 3 : 0.6, relic: 0.7 });
      return { k: 'stack', id: k, q: k === 'relic' ? 1 : U.randi(1, 3) };
    }
    return { k: 'gear', item: randGear(depth) };
  }

  function dropItem(L, x, y, it) {
    it.x = x; it.y = y;
    if (it.k === 'stack') {
      const ex = L.items.find(o => o.k === 'stack' && o.id === it.id && o.x === x && o.y === y);
      if (ex) { ex.q += it.q; return; }
    }
    L.items.push(it);
  }

  // ───────── 원정 시작 / 층 이동 ─────────
  function start(ids, supplies, startDepth) {
    G.S.dun = {
      depth: 0, startDepth: startDepth || 1, levels: {}, party: ids.slice(), ctrl: ids[0],
      bag: { stacks: Object.assign({}, supplies), gear: [] }, T: 0, lastTick: 0, turn: 0, waiting: false, auto: null,
      hold: false, manual: false, kills: 0, dead: [], rescued: [], deepest: 0, over: false, focus: null, startDay: G.Settle.day(),
    };
    bind();
    for (const id of ids) {
      const c = byId(id);
      c.loc = 'away'; c.status = {}; c.nextT = 0; c.path = []; c.job = null; c.drafted = false; c.order = null;
    }
    enterLevel(d.startDepth, 'down');
    G.msg(`⚔ 원정대가 던전 지하 ${d.depth}층에 들어섰다.`, 'good');
    run();
  }

  function byId(id) { return G.S.colonists.find(c => c.id === id); }
  function alive() { return d.party.map(byId).filter(c => c && c.loc === 'away' && c.hp > 0); }
  function ctrlChar() { return byId(d.ctrl); }

  function enterLevel(depth, dir) {
    d.depth = depth;
    if (!d.levels[depth]) d.levels[depth] = gen(depth);
    bind();
    const pos = dir === 'down' ? lv.up : lv.down || lv.up;
    const party = alive();
    const ctrl = ctrlChar() && ctrlChar().hp > 0 ? ctrlChar() : party[0];
    const order = [ctrl].concat(party.filter(c => c !== ctrl));
    for (const c of order) {
      const r = G.bfs(W, H, pos.x, pos.y, (x, y) => TT[lv.t[I(x, y)]].pass, (x, y) => !monAt(x, y) && !order.some(o => o !== c && o.placed && o.x === x && o.y === y));
      c.x = r ? r.x : pos.x; c.y = r ? r.y : pos.y; c.placed = true;
      c.nextT = d.T;
    }
    for (const c of order) delete c.placed;
    for (const m of lv.mons) m.nextT = Math.max(m.nextT, d.T + U.rand(10));
    d.auto = null;
    if (depth > d.deepest) d.deepest = depth;
    if (depth > G.S.maxDepth) {
      G.S.maxDepth = depth;
      G.S.settle.threat = Math.max(0, G.S.settle.threat - 12);
      G.msg(`새로운 깊이에 도달했다: 지하 ${depth}층 (${lv.theme}). 던전의 압력이 약해진다.`, 'good');
    } else G.msg(`지하 ${depth}층 (${lv.theme}).`, 'dim');
    for (const c of party) c.deepest = Math.max(c.deepest || 0, depth);
    updateVis();
  }

  // ───────── 시야 ─────────
  const opaque = (x, y) => !!TT[lv.t[I(x, y)]].op;
  const passT = (x, y) => inb(x, y) && !!TT[lv.t[I(x, y)]].pass;
  const monAt = (x, y) => lv.mons.find(m => m.hp > 0 && m.x === x && m.y === y);
  const partyAt = (x, y) => alive().find(c => c.x === x && c.y === y);
  const actorAt = (x, y) => monAt(x, y) || partyAt(x, y);

  function updateVis() {
    if (!d || !lv) return;
    const vis = new Uint8Array(W * H), light = new Float32Array(W * H);
    for (const c of alive()) {
      G.fov(c.x, c.y, FOV_R, W, H, opaque, (x, y) => {
        const i = I(x, y);
        vis[i] = 1;
        const l = 1 - (Math.hypot(x - c.x, y - c.y) / (FOV_R + 1)) * 0.6;
        if (l > light[i]) light[i] = l;
        lv.seen[i] = 1;
      });
    }
    d.vis = vis; d.light = light;
  }
  const visible = (x, y) => d.vis && d.vis[I(x, y)];

  function visibleMons() { return lv.mons.filter(m => m.hp > 0 && visible(m.x, m.y)); }

  // ───────── 스케줄러 ─────────
  function advanceTo(t) {
    while (d.lastTick + 10 <= t) {
      d.lastTick += 10;
      turnTick();
      if (!G.S.dun || d.over) return false;
    }
    if (t > d.T) d.T = t;
    return true;
  }

  function run() {
    bind();
    if (!d) return;
    for (let guard = 0; guard < 4000; guard++) {
      if (!G.S.dun || d.over) return;
      bind();
      const party = alive();
      if (!party.length) { endExpedition('wipe'); return; }
      let next = null;
      for (const c of party) if (!next || c.nextT < next.nextT) next = c;
      for (const m of lv.mons) if (m.hp > 0 && m.nextT < next.nextT) next = m;
      if (!advanceTo(next.nextT)) return;
      bind();
      if (next.hp <= 0) continue;
      if (!next.isMon) {
        if (next.id === d.ctrl || d.manual) {
          d.ctrl = next.id; d.waiting = true; updateVis();
          if (G.onEvent) G.onEvent('turn');
          return;
        }
        partyAI(next);
        updateVis();
      } else monAI(next);
    }
    d.waiting = true;
  }

  function turnTick() {
    d.turn++;
    for (const c of alive()) {
      c.food -= G.Chars.foodRate(c);
      if (c.food < 22) autoEat(c);
      if (c.food <= 0) {
        c.food = 0;
        if (d.turn % 8 === 0) {
          c.hp--;
          if (d.turn % 80 === 0) G.msg(`${c.name}이(가) 굶주리고 있다!`, 'bad');
          if (c.hp <= 0) { killChar(c, '굶주림'); continue; }
        }
      }
      const mx = G.Chars.maxHP(c), mm = G.Chars.maxMP(c);
      if (c.hp < mx && c.food > 0 && !c.status.poison) {
        c.hpAcc = (c.hpAcc || 0) + 0.04 + mx * 0.004;
        if (c.hpAcc >= 1) { c.hp = Math.min(mx, c.hp + Math.floor(c.hpAcc)); c.hpAcc %= 1; }
      }
      if (c.mp < mm) c.mp = Math.min(mm, c.mp + 0.03 + c.skills.magic * 0.008 + c.int * 0.002);
      tickStatus(c);
      if (c.hp <= 0) killChar(c, '독');
    }
    for (const m of lv.mons) {
      if (m.hp <= 0) continue;
      const md = G.MON[m.type];
      if (md.regen && m.hp < m.maxhp) m.hp = Math.min(m.maxhp, m.hp + md.regen);
      tickStatus(m);
      if (m.hp <= 0) { killMon(m, null); continue; }
      if (m.state === 'sleep') {
        for (const c of alive()) {
          const dist = U.cheb(c.x, c.y, m.x, m.y);
          if (dist > 8) continue;
          const p = 0.11 + (8 - dist) * 0.012 - G.Chars.stealth(c) * 0.005;
          if (U.chance(p) && G.los(m.x, m.y, c.x, c.y, opaque)) { m.state = 'hunt'; m.lk = { x: c.x, y: c.y }; break; }
        }
      }
    }
    lv.mons = lv.mons.filter(m => m.hp > 0);
    G.Settle.tick();
  }

  function tickStatus(e) {
    const st = e.status;
    for (const k in st) {
      if (k === 'poison' && st.poison > 0) e.hp -= 1;
      if (k === 'tauntBy') continue;
      st[k]--;
      if (st[k] <= 0) delete st[k];
    }
  }

  function autoEat(c) {
    const k = ['hearty_ration', 'ration', 'meal', 'fine_meal', 'food'].find(k => (d.bag.stacks[k] || 0) > 0);
    if (!k) return;
    d.bag.stacks[k]--;
    c.food = Math.min(100, c.food + G.RES[k].eat);
    G.msg(`${c.name}이(가) ${G.RES[k].n}을(를) 먹었다.`, 'dim');
  }

  // ───────── 전투 공용 ─────────
  const nm = e => (e.isMon ? G.MON[e.type].n : e.name);
  function actCost(e, base) {
    let c = base;
    if (e.status.haste) c *= 0.6;
    if (e.status.slow) c *= 1.5;
    return Math.round(c);
  }

  function noise(x, y, r) {
    for (const m of lv.mons) {
      if (m.hp <= 0 || U.cheb(m.x, m.y, x, y) > r) continue;
      if (m.state === 'sleep' && !U.chance(0.55)) continue;
      if (m.state !== 'hunt') { m.state = 'hunt'; m.lk = { x, y }; }
    }
  }

  function melee(att, def, opts) {
    const r = G.Combat.attack(att, def, opts);
    const party = !att.isMon;
    if (!r.hit) G.msg(`${U.josa(nm(att), '이/가')} ${U.josa(nm(def), '을/를')} 공격했지만 빗나갔다.`, 'dim');
    else G.msg(`${U.josa(nm(att), '이/가')} ${U.josa(nm(def), '을/를')} 공격해 ${r.dmg} 피해${r.extra ? ' (' + r.extra + ')' : ''}.`, party ? '' : 'hurt');
    if (def.isMon && def.state !== 'hunt') { def.state = 'hunt'; def.lk = { x: att.x, y: att.y }; }
    noise(def.x, def.y, 5);
    if (def.hp <= 0) { if (def.isMon) killMon(def, att); else killChar(def, nm(att)); }
    return r;
  }

  // 투사체: 경로상 첫 번째 대상에 맞는다
  function projectileTarget(a, tx, ty, hitParty) {
    for (const [x, y] of G.line(a.x, a.y, tx, ty)) {
      if (opaque(x, y)) return null;
      const m = monAt(x, y);
      if (m) return m;
      if (hitParty) { const p = partyAt(x, y); if (p) return p; }
      if (x === tx && y === ty) break;
    }
    return null;
  }

  function shoot(c, target, opts) {
    const t = projectileTarget(c, target.x, target.y, false) || target;
    return melee(c, t, opts);
  }

  function killMon(m, killer) {
    m.hp = 0;
    const md = G.MON[m.type];
    if (visible(m.x, m.y) || killer) G.msg(`${U.josa(md.n, '이/가')} 쓰러졌다.`, 'good');
    if (md.drops) for (const r in md.drops) {
      const p = md.drops[r], q = Math.floor(p) + (U.chance(p % 1) ? 1 : 0);
      if (q > 0) dropItem(lv, m.x, m.y, { k: 'stack', id: r, q });
    }
    if (md.gear && U.chance(md.gear)) dropItem(lv, m.x, m.y, { k: 'gear', item: randGear(lv.depth) });
    const party = alive();
    for (const c of party) G.Chars.gainXP(c, md.xp);
    if (killer && !killer.isMon) killer.kills++;
    d.kills++;
    G.S.settle.threat = Math.max(0, G.S.settle.threat - md.xp * 0.35);
    if (md.boss) victory();
  }

  function killChar(c, cause) {
    if (c.loc === 'dead') return;
    c.hp = 0; c.loc = 'dead';
    c.deathCause = `${cause} (지하 ${d.depth}층)`;
    c.deathDay = G.Settle.day();
    c.bed = null;
    for (const s in c.equip) if (c.equip[s]) { dropItem(lv, c.x, c.y, { k: 'gear', item: c.equip[s] }); c.equip[s] = null; }
    G.msg(`☠ ${c.name}이(가) 쓰러졌다! (${cause})`, 'bad');
    G.Settle.mourn(c);
    d.dead.push(c.id);
    if (d.ctrl === c.id) { const a = alive()[0]; if (a) d.ctrl = a.id; }
    if (d.auto) d.auto = null;
    if (G.onEvent) G.onEvent('death');
  }

  function victory() {
    G.S.won = true;
    G.msg('♥ 던전의 심장이 산산이 부서졌다! 땅의 울음이 멎는다. 승리!', 'good');
    if (G.onEvent) G.onEvent('victory');
  }

  // ───────── 능력·주문 ─────────
  function abilities(c) {
    const out = [];
    const cs = G.Chars.stats(c);
    if (cs.ranged) out.push({ id: 'fire', n: '사격', mp: 0, tgt: 'enemy', range: cs.range });
    for (const k in G.ABIL) {
      const a = G.ABIL[k];
      if (a.skill) {
        const wd = G.Chars.weaponDef(c);
        if (wd.skill !== a.skill || c.skills[a.skill] < a.min) continue;
      }
      if (a.shield && !c.equip.shield) continue;
      out.push({ id: k, n: a.n, mp: a.mp, tgt: a.tgt, range: k === 'aimed' ? cs.range : 1 });
    }
    for (const k of c.spells) { const s = G.SPELLS[k]; out.push({ id: k, n: s.n, mp: s.mp, tgt: s.tgt, range: s.range || 0, spell: true }); }
    return out;
  }

  function targetsFor(c, ab) {
    if (ab.tgt === 'self') return [c];
    if (ab.tgt === 'ally') return alive().filter(o => U.cheb(o.x, o.y, c.x, c.y) <= ab.range && G.los(c.x, c.y, o.x, o.y, opaque)).sort((a, b) => a.hp / G.Chars.maxHP(a) - b.hp / G.Chars.maxHP(b));
    const r = ab.tgt === 'adj' ? 1 : ab.range;
    return visibleMons().filter(m => U.cheb(m.x, m.y, c.x, c.y) <= r && G.los(c.x, c.y, m.x, m.y, opaque)).sort((a, b) => U.cheb(a.x, a.y, c.x, c.y) - U.cheb(b.x, b.y, c.x, c.y));
  }

  function blink(c) {
    const cand = [];
    for (let y = c.y - 6; y <= c.y + 6; y++) for (let x = c.x - 6; x <= c.x + 6; x++) {
      if (!passT(x, y) || actorAt(x, y) || !visible(x, y)) continue;
      const dm = Math.min(99, ...lv.mons.filter(m => m.hp > 0).map(m => U.cheb(x, y, m.x, m.y)));
      cand.push({ x, y, v: dm + Math.random() });
    }
    if (!cand.length) return;
    cand.sort((a, b) => b.v - a.v);
    c.x = cand[0].x; c.y = cand[0].y;
    G.msg(`${U.josa(c.name, '이/가')} 순간이동했다.`);
  }

  // 반환값: 소모 시간(0이면 실패)
  function doAbility(c, id, t) {
    const cs = G.Chars.stats(c);
    const ab = abilities(c).find(a => a.id === id);
    if (!ab) return 0;
    if (c.mp < ab.mp) { if (c.id === d.ctrl) G.msg('MP가 부족하다.', 'warn'); return 0; }
    c.mp -= ab.mp;
    const sp = G.Chars.spellPower(c);
    switch (id) {
      case 'fire': shoot(c, t); return actCost(c, cs.delay);
      case 'aimed': G.msg(`${c.name}의 조준 사격!`); shoot(c, t, { sure: true, mul: 1.8 }); return actCost(c, cs.delay * 1.2);
      case 'double_slash': G.msg(`${c.name}의 연속 베기!`); melee(c, t); if (t.hp > 0) melee(c, t); return actCost(c, cs.delay * 1.3);
      case 'stun_blow': {
        G.msg(`${c.name}의 기절 강타!`);
        const r = melee(c, t, { mul: 1.2 });
        if (r.hit && t.hp > 0 && !G.MON[t.type].boss) { t.status.stun = 2; G.msg(`${U.josa(nm(t), '이/가')} 기절했다.`); }
        return actCost(c, cs.delay * 1.2);
      }
      case 'whirl': {
        G.msg(`${c.name}의 휩쓸기!`);
        for (const m of lv.mons.filter(m => m.hp > 0 && U.cheb(m.x, m.y, c.x, c.y) <= 1)) melee(c, m, { mul: 0.9 });
        return actCost(c, cs.delay * 1.3);
      }
      case 'taunt': {
        let n = 0;
        for (const m of lv.mons) if (m.hp > 0 && U.cheb(m.x, m.y, c.x, c.y) <= 6 && G.los(m.x, m.y, c.x, c.y, opaque)) { m.status.taunt = 6; m.status.tauntBy = c.id; m.state = 'hunt'; n++; }
        G.msg(`${U.josa(c.name, '이/가')} 적 ${n}마리를 도발했다!`);
        return actCost(c, 10);
      }
      case 'magic_dart': {
        const tg = projectileTarget(c, t.x, t.y, false) || t;
        const dmg = Math.max(1, U.randi(1, Math.round(3 + sp * 0.7)) - U.randi(0, Math.floor(G.MON[tg.type].ac / 2)));
        tg.hp -= dmg;
        G.msg(`${c.name}의 마법 화살이 ${nm(tg)}에게 ${dmg} 피해.`);
        afterSpellHit(c, tg); return actCost(c, 10);
      }
      case 'fire_bolt': {
        const tg = projectileTarget(c, t.x, t.y, false) || t;
        const dmg = Math.max(1, U.randi(4, Math.round(8 + sp * 1.3)) - U.randi(0, Math.floor(G.MON[tg.type].ac / 2)));
        tg.hp -= dmg;
        G.msg(`${c.name}의 화염 화살! ${nm(tg)}에게 ${dmg} 피해.`);
        afterSpellHit(c, tg); return actCost(c, 10);
      }
      case 'heal_other': {
        const mx = G.Chars.maxHP(t), amt = U.randi(5, Math.round(8 + sp * 1.5));
        t.hp = Math.min(mx, t.hp + amt);
        G.msg(`${c.name}이(가) ${t.name}을(를) 치유했다 (+${amt}).`, 'good');
        G.Chars.train(c, 'magic', 1); return actCost(c, 10);
      }
      case 'blink': blink(c); G.Chars.train(c, 'magic', 1); return actCost(c, 10);
      case 'slow': {
        const md = G.MON[t.type];
        if (md.boss || U.chance(0.2 + md.lv * 0.03 - sp * 0.03)) G.msg(`${U.josa(md.n, '이/가')} 감속 마법을 저항했다.`, 'dim');
        else { t.status.slow = 8; G.msg(`${U.josa(md.n, '이/가')} 느려졌다.`); }
        if (t.state !== 'hunt') { t.state = 'hunt'; t.lk = { x: c.x, y: c.y }; }
        G.Chars.train(c, 'magic', 1); return actCost(c, 10);
      }
    }
    return 0;
  }
  function afterSpellHit(c, tg) {
    G.Chars.train(c, 'magic', 1);
    if (tg.state !== 'hunt') { tg.state = 'hunt'; tg.lk = { x: c.x, y: c.y }; }
    noise(tg.x, tg.y, 4);
    if (tg.hp <= 0) killMon(tg, c);
  }

  // ───────── 이동 ─────────
  function stepToward(a, tx, ty, opts) {
    opts = opts || {};
    const isP = !a.isMon;
    const r = G.bfs(W, H, a.x, a.y, (x, y) => {
      if (!passT(x, y)) return false;
      if (x === tx && y === ty) return true;
      if (isP) return !monAt(x, y);
      return !partyAt(x, y);
    }, (x, y) => x === tx && y === ty, 1800);
    let step = r && r.path.length ? r.path[0] : null;
    if (!step) return false;
    return tryStep(a, step[0], step[1], opts);
  }

  function tryStep(a, nx, ny) {
    const isP = !a.isMon;
    const m = monAt(nx, ny);
    if (m) {
      if (!isP) {
        // 다른 몬스터가 막으면 우회 칸 시도
        for (const [dx, dy] of U.shuffle(G.DIRS8.slice())) {
          const ax = a.x + dx, ay = a.y + dy;
          if (U.cheb(ax, ay, nx, ny) <= 1 && passT(ax, ay) && !actorAt(ax, ay)) { moveTo(a, ax, ay); return true; }
        }
      }
      return false;
    }
    const p = partyAt(nx, ny);
    if (p) {
      if (!isP) return false;
      if (p.id === d.ctrl && a.id !== d.ctrl) return false;
      p.x = a.x; p.y = a.y; a.x = nx; a.y = ny;
      return true;
    }
    if (!passT(nx, ny)) return false;
    moveTo(a, nx, ny);
    return true;
  }

  function moveTo(a, x, y) {
    a.x = x; a.y = y;
    if (lv.t[I(x, y)] === 'door') lv.t[I(x, y)] = 'door_open';
  }

  // ───────── 몬스터 AI ─────────
  function monAI(m) {
    const md = G.MON[m.type];
    if (m.status.stun || m.state === 'sleep') { m.nextT += 10; return; }
    const moveCost = actCost(m, md.spd || 10);
    if (md.immobile) { heartAI(m); return; }
    // 대상 선택
    const party = alive();
    let tgt = null;
    if (m.status.taunt) { tgt = party.find(c => c.id === m.status.tauntBy); }
    if (!tgt) {
      let bd = 99;
      for (const c of party) {
        const dist = U.cheb(c.x, c.y, m.x, m.y);
        if (dist > 9 || dist >= bd) continue;
        if (!G.los(m.x, m.y, c.x, c.y, opaque)) continue;
        bd = dist; tgt = c;
      }
    }
    if (tgt) { m.state = 'hunt'; m.lk = { x: tgt.x, y: tgt.y }; }
    if (md.erratic && U.chance(0.4)) {
      const [dx, dy] = U.pick(G.DIRS8);
      if (passT(m.x + dx, m.y + dy) && !actorAt(m.x + dx, m.y + dy)) moveTo(m, m.x + dx, m.y + dy);
      m.nextT += moveCost; return;
    }
    if (tgt) {
      const dist = U.cheb(tgt.x, tgt.y, m.x, m.y);
      if (md.healer) {
        const hurt = lv.mons.find(o => o !== m && o.hp > 0 && o.hp < o.maxhp * 0.6 && U.cheb(o.x, o.y, m.x, m.y) <= 6 && G.los(m.x, m.y, o.x, o.y, opaque));
        if (hurt && U.chance(0.5)) {
          const amt = U.randi(6, 12); hurt.hp = Math.min(hurt.maxhp, hurt.hp + amt);
          if (visible(m.x, m.y)) G.msg(`${U.josa(md.n, '이/가')} ${U.josa(nm(hurt), '을/를')} 치유했다.`, 'warn');
          m.nextT += 10; return;
        }
      }
      if (md.summon && U.chance(0.12) && lv.mons.filter(o => o.hp > 0 && o.summoner === m.id).length < 3) {
        const sp = freeNear(lv, m.x, m.y);
        if (sp) {
          const s = spawnMon(lv, md.summon, sp[0], sp[1], 'hunt');
          s.summoner = m.id; s.nextT = d.T + 10;
          if (visible(m.x, m.y)) G.msg(`${U.josa(md.n, '이/가')} 죽은 자를 일으켰다!`, 'warn');
          m.nextT += 10; return;
        }
      }
      if (md.bolt && dist > 1 && dist <= md.bolt.range && U.chance(0.65)) {
        const hit = projectileTargetMon(m, tgt);
        if (hit) { monBolt(m, hit); m.nextT += 10; return; }
      }
      if (dist <= 1) { melee(m, tgt); m.nextT += actCost(m, 10); return; }
      if (md.keep && dist < 3) {
        let best = null, bv = dist;
        for (const [dx, dy] of G.DIRS8) {
          const nx = m.x + dx, ny = m.y + dy;
          if (!passT(nx, ny) || actorAt(nx, ny)) continue;
          const v = U.cheb(nx, ny, tgt.x, tgt.y);
          if (v > bv) { bv = v; best = [nx, ny]; }
        }
        if (best) { moveTo(m, best[0], best[1]); m.nextT += moveCost; return; }
      }
      stepToward(m, tgt.x, tgt.y);
      m.nextT += moveCost; return;
    }
    if (m.state === 'hunt' && m.lk) {
      if ((m.x === m.lk.x && m.y === m.lk.y) || !stepToward(m, m.lk.x, m.lk.y)) { m.state = 'wander'; m.lk = null; }
      m.nextT += moveCost; return;
    }
    // 배회
    if (!m.wt || (m.x === m.wt.x && m.y === m.wt.y) || U.chance(0.02)) {
      const c = U.pick(floorCells(lv));
      m.wt = { x: c % W, y: (c / W) | 0 };
    }
    if (U.chance(0.6)) stepToward(m, m.wt.x, m.wt.y);
    m.nextT += moveCost;
  }

  function projectileTargetMon(m, tgt) {
    for (const [x, y] of G.line(m.x, m.y, tgt.x, tgt.y)) {
      if (opaque(x, y)) return null;
      if (monAt(x, y)) return null; // 아군 몬스터가 가로막음
      const p = partyAt(x, y);
      if (p) return p;
    }
    return null;
  }

  function monBolt(m, c) {
    const md = G.MON[m.type];
    const r = G.Combat.attack(m, c, { dmgOverride: md.bolt.dmg });
    if (r.hit) G.msg(`${md.n}의 ${md.bolt.n}이(가) ${c.name}에게 ${r.dmg} 피해.`, 'hurt');
    else G.msg(`${md.n}의 ${md.bolt.n}이(가) ${c.name}을(를) 빗나갔다.`, 'dim');
    if (c.hp <= 0) killChar(c, md.n);
  }

  function heartAI(m) {
    const md = G.MON[m.type];
    m.spawnT = (m.spawnT || 0) + 1;
    const party = alive();
    const seen = party.filter(c => U.cheb(c.x, c.y, m.x, m.y) <= md.bolt.range && G.los(m.x, m.y, c.x, c.y, opaque));
    const adj = party.find(c => U.cheb(c.x, c.y, m.x, m.y) <= 1);
    if (adj) melee(m, adj);
    else if (seen.length && U.chance(0.5)) monBolt(m, U.pick(seen));
    if (m.spawnT % 7 === 0 && lv.mons.filter(o => o.hp > 0).length < 16) {
      const sp = freeNear(lv, m.x, m.y);
      if (sp) {
        const s = spawnMon(lv, U.pick(['skeleton', 'orc', 'acid_blob', 'wraith', 'spider']), sp[0], sp[1], 'hunt');
        s.nextT = d.T + 10;
        if (visible(m.x, m.y)) G.msg('심장이 고동치며 하수인을 낳았다!', 'warn');
      }
    }
    m.nextT += 10;
  }

  // ───────── 동료 AI ─────────
  function partyAI(c) {
    if (c.status.stun) { c.nextT += 10; return; }
    const cs = G.Chars.stats(c);
    const mx = G.Chars.maxHP(c);
    const foes = lv.mons.filter(m => m.hp > 0 && m.state !== 'sleep' && visible(m.x, m.y) && U.cheb(m.x, m.y, c.x, c.y) <= 8)
      .sort((a, b) => U.cheb(a.x, a.y, c.x, c.y) - U.cheb(b.x, b.y, c.x, c.y));
    const leader = ctrlChar();
    // 위급 시 물약
    if (foes.length && c.hp < mx * 0.3 && (d.bag.stacks.potion_heal || 0) > 0) { useItem(c, 'potion_heal', c); c.nextT += 10; return; }
    const abs = abilities(c);
    const has = id => abs.find(a => a.id === id);
    // 아군 치유
    if (has('heal_other') && c.mp >= 3) {
      const hurt = alive().filter(o => o.hp < G.Chars.maxHP(o) * 0.55 && U.cheb(o.x, o.y, c.x, c.y) <= 6 && G.los(c.x, c.y, o.x, o.y, opaque))
        .sort((a, b) => a.hp / G.Chars.maxHP(a) - b.hp / G.Chars.maxHP(b))[0];
      if (hurt) { const t = doAbility(c, 'heal_other', hurt); if (t) { c.nextT += t; return; } }
    }
    if (foes.length) {
      let tgt = foes.find(m => m.id === d.focus) || foes[0];
      const dist = U.cheb(tgt.x, tgt.y, c.x, c.y);
      const los = G.los(c.x, c.y, tgt.x, tgt.y, opaque);
      const caster = !cs.ranged && (c.skills.magic > (c.skills[cs.skill] || 0) || !c.equip.weapon || G.Chars.weaponDef(c).spell);
      if (cs.ranged && los && dist <= cs.range) {
        const t = has('aimed') && c.mp >= 4 && U.chance(0.3) ? doAbility(c, 'aimed', tgt) : doAbility(c, 'fire', tgt);
        if (t) { c.nextT += t; return; }
      }
      if (los && dist <= 7) {
        if (has('slow') && c.mp >= 5 && G.MON[tgt.type].lv >= c.xl && !tgt.status.slow && U.chance(0.3)) { const t = doAbility(c, 'slow', tgt); if (t) { c.nextT += t; return; } }
        if (has('fire_bolt') && c.mp >= 4 && (caster || dist > 1) && U.chance(0.75)) { const t = doAbility(c, 'fire_bolt', tgt); if (t) { c.nextT += t; return; } }
        if (has('magic_dart') && c.mp >= 1 && (caster || dist > 1) && U.chance(caster ? 0.9 : 0.4)) { const t = doAbility(c, 'magic_dart', tgt); if (t) { c.nextT += t; return; } }
      }
      const adj = foes.filter(m => U.cheb(m.x, m.y, c.x, c.y) <= 1);
      if (adj.length) {
        const t0 = adj.find(m => m.id === d.focus) || adj[0];
        if (has('whirl') && adj.length >= 2 && c.mp >= 3) { c.nextT += doAbility(c, 'whirl', c); return; }
        if (has('stun_blow') && c.mp >= 4 && U.chance(0.35)) { c.nextT += doAbility(c, 'stun_blow', t0); return; }
        if (has('double_slash') && c.mp >= 4 && U.chance(0.35)) { c.nextT += doAbility(c, 'double_slash', t0); return; }
        if (has('taunt') && c.mp >= 2 && foes.length >= 2 && !foes.some(m => m.status.taunt) && U.chance(0.4)) { c.nextT += doAbility(c, 'taunt', c); return; }
        melee(c, t0); c.nextT += actCost(c, cs.delay); return;
      }
      if (!d.hold && !(caster && dist <= 4)) {
        if (stepToward(c, tgt.x, tgt.y)) { c.nextT += actCost(c, G.Chars.moveCost(c)); return; }
      }
      c.nextT += 10; return;
    }
    // 따라가기
    if (leader && leader !== c && !d.hold) {
      const dist = U.cheb(leader.x, leader.y, c.x, c.y);
      if (dist > 2 || (dist > 1 && !G.los(c.x, c.y, leader.x, leader.y, opaque))) {
        if (stepToward(c, leader.x, leader.y)) { c.nextT += actCost(c, G.Chars.moveCost(c)); return; }
      }
    }
    c.nextT += 10;
  }

  // ───────── 가방 ─────────
  function bagCap() {
    let cap = 10;
    for (const c of alive()) { cap += c.str; if (c.equip.pack) cap += G.GEAR[c.equip.pack.base].cap; }
    return cap;
  }
  function bagWeight() {
    let w = 0;
    for (const k in d.bag.stacks) w += G.RES[k].w * d.bag.stacks[k];
    for (const g of d.bag.gear) w += Math.max(1, G.GEAR[g.base].w);
    return Math.round(w * 10) / 10;
  }

  function useItem(user, k, tgt) {
    const r = G.RES[k];
    if (!(d.bag.stacks[k] > 0)) return 0;
    tgt = tgt || user;
    const use = r.use || (r.eat ? 'eat' : null);
    if (!use) return 0;
    switch (use) {
      case 'heal': {
        const mx = G.Chars.maxHP(tgt), amt = U.randi(15, 25) + Math.round(mx * 0.25);
        tgt.hp = Math.min(mx, tgt.hp + amt); delete tgt.status.poison;
        G.msg(`${U.josa(tgt.name, '이/가')} 치유 물약을 마셨다 (+${amt}).`, 'good'); break;
      }
      case 'might': tgt.status.might = 20; G.msg(`${U.josa(tgt.name, '이/가')} 괴력으로 넘친다!`, 'good'); break;
      case 'haste': tgt.status.haste = 15; G.msg(`${U.josa(tgt.name, '이/가')} 빨라졌다!`, 'good'); break;
      case 'blink': blink(tgt); break;
      case 'mapping':
        for (let i = 0; i < W * H; i++) {
          const x = i % W, y = (i / W) | 0;
          if (lv.t[i] !== 'wall' || G.DIRS8.some(([dx, dy]) => inb(x + dx, y + dy) && lv.t[I(x + dx, y + dy)] !== 'wall')) lv.seen[i] = 1;
        }
        G.msg('층의 지형이 머릿속에 그려진다.', 'good'); break;
      case 'return':
        d.bag.stacks[k]--;
        G.msg('귀환 두루마리를 읽었다. 빛이 파티를 감싼다...', 'good');
        endExpedition('return');
        return -1;
      case 'learn': {
        if (tgt.spells.includes(r.spell)) { G.msg(`${U.josa(tgt.name, '은/는')} 이미 ${G.SPELLS[r.spell].n}을(를) 알고 있다.`, 'warn'); return 0; }
        tgt.spells.push(r.spell);
        G.msg(`${U.josa(tgt.name, '이/가')} ${G.SPELLS[r.spell].n} 주문을 익혔다!`, 'good'); break;
      }
      case 'eat': tgt.food = Math.min(100, tgt.food + r.eat); G.msg(`${U.josa(tgt.name, '이/가')} ${U.josa(r.n, '을/를')} 먹었다.`); break;
    }
    d.bag.stacks[k]--;
    if (d.bag.stacks[k] <= 0) delete d.bag.stacks[k];
    return 10;
  }

  function equip(gid, cid) {
    const g = d.bag.gear.find(o => o.id === gid), c = byId(cid);
    if (!g || !c) return 0;
    const gd = G.GEAR[g.base];
    d.bag.gear.splice(d.bag.gear.indexOf(g), 1);
    const unequip = s => { if (c.equip[s]) { d.bag.gear.push(c.equip[s]); c.equip[s] = null; } };
    unequip(gd.slot);
    if (gd.slot === 'weapon' && gd.two) unequip('shield');
    if (gd.slot === 'shield' && c.equip.weapon && G.GEAR[c.equip.weapon.base].two) unequip('weapon');
    c.equip[gd.slot] = g;
    c.hp = Math.min(c.hp, G.Chars.maxHP(c)); c.mp = Math.min(c.mp, G.Chars.maxMP(c));
    G.msg(`${U.josa(c.name, '이/가')} ${U.josa(G.Chars.gearName(g), '을/를')} 장비했다.`);
    return 10;
  }

  function pickupAt(c, all) {
    const here = lv.items.filter(it => it.x === c.x && it.y === c.y);
    let got = false;
    for (const it of here) {
      if (it.k === 'gear' && !all) { if (!it.noted) { G.msg(`여기에 ${G.Chars.gearName(it.item)}이(가) 있다. (g: 줍기)`, 'warn'); it.noted = true; } continue; }
      const w = it.k === 'stack' ? G.RES[it.id].w * it.q : Math.max(1, G.GEAR[it.item.base].w);
      if (bagWeight() + w > bagCap()) {
        if (it.k === 'stack' && G.RES[it.id].w * 1 + bagWeight() <= bagCap()) {
          const n = Math.floor((bagCap() - bagWeight()) / G.RES[it.id].w);
          if (n > 0) { d.bag.stacks[it.id] = (d.bag.stacks[it.id] || 0) + n; it.q -= n; G.msg(`${G.RES[it.id].n} ${n}개만 챙겼다. 가방이 가득 찼다.`, 'warn'); got = true; }
        } else if (!it.full) { G.msg(`가방이 가득 찼다! (${G.RES[it.id] ? G.RES[it.id].n : G.Chars.gearName(it.item)})`, 'warn'); it.full = true; }
        it.noted = true;
        continue;
      }
      if (it.k === 'stack') { d.bag.stacks[it.id] = (d.bag.stacks[it.id] || 0) + it.q; G.msg(`${G.RES[it.id].n} ×${it.q}을(를) 챙겼다.`); }
      else { d.bag.gear.push(it.item); G.msg(`${G.Chars.gearName(it.item)}을(를) 챙겼다.`); }
      it.q = 0; it.gone = true; got = true;
    }
    lv.items = lv.items.filter(it => !it.gone && !(it.k === 'stack' && it.q <= 0));
    return got;
  }

  // ───────── 상호작용 ─────────
  function interact(c, x, y) {
    const i = I(x, y), t = lv.t[i];
    switch (t) {
      case 'mandrake':
        lv.t[i] = 'floor';
        dropItem(lv, x, y, { k: 'stack', id: 'herb', q: 3 });
        G.msg('만드라고라가 귀를 찢는 비명을 지른다! 층 전체가 깨어난다!', 'bad');
        for (const m of lv.mons) if (m.hp > 0) { m.state = 'hunt'; m.lk = { x, y }; }
        return 10;
      case 'bloodtree': {
        const mx = G.Chars.maxHP(c), cost = Math.round(mx * 0.3);
        if (c.hp <= cost) { G.msg('피가 부족하다. (HP 30% 이상 필요)', 'warn'); return 0; }
        c.hp -= cost;
        lv.t[i] = 'deadtree';
        const roll = Math.random();
        if (roll < 0.35) dropItem(lv, c.x, c.y, { k: 'stack', id: 'relic', q: 1 });
        else if (roll < 0.75) dropItem(lv, c.x, c.y, { k: 'gear', item: randGear(lv.depth + 2, 2) });
        else { dropItem(lv, c.x, c.y, { k: 'stack', id: 'potion_heal', q: 2 }); dropItem(lv, c.x, c.y, { k: 'stack', id: U.pick(['potion_might', 'potion_haste', 'scroll_return']), q: 1 }); }
        G.msg(`${U.josa(c.name, '이/가')} 고목에 피를 바쳤다 (-${cost} HP). 뿌리 사이에서 무언가가 떠오른다.`, 'warn');
        return 10;
      }
      case 'chest': {
        lv.t[i] = 'floor';
        const n = U.randi(2, 3);
        for (let k = 0; k < n; k++) dropItem(lv, x, y, randItem(lv.depth + 1));
        G.msg('보물상자를 열었다.', 'good');
        return 10;
      }
      case 'captive': {
        const nc = lv.captive;
        lv.t[i] = 'floor';
        if (!nc) return 10;
        lv.captive = null;
        nc.x = x; nc.y = y; nc.nextT = d.T + 10; nc.status = {};
        G.S.colonists.push(nc);
        if (alive().length < 4) { nc.loc = 'away'; d.party.push(nc.id); G.msg(`${nc.name}(${G.Chars.title(nc)})을(를) 구출했다! 원정대에 합류한다.`, 'good'); }
        else { nc.loc = 'rescued'; G.msg(`${nc.name}(${G.Chars.title(nc)})을(를) 구출했다! 정착지로 향한다.`, 'good'); }
        d.rescued.push(nc.id);
        return 10;
      }
    }
    return 0;
  }

  // ───────── 플레이어 명령 ─────────
  function bump(c, dx, dy) {
    const nx = c.x + dx, ny = c.y + dy;
    if (!inb(nx, ny)) return 0;
    const m = monAt(nx, ny);
    if (m) {
      d.focus = m.id;
      const cs = G.Chars.stats(c);
      if (cs.ranged) return doAbility(c, 'fire', m);
      melee(c, m);
      return actCost(c, cs.delay);
    }
    const t = lv.t[I(nx, ny)], tt = TT[t];
    if (tt.mine) {
      const i = I(nx, ny);
      if (lv.mhp[i] == null) lv.mhp[i] = tt.mhp;
      lv.mhp[i]--;
      G.Chars.train(c, 'mining', 0.5);
      noise(nx, ny, 3);
      if (lv.mhp[i] <= 0) {
        lv.t[i] = 'floor';
        dropItem(lv, nx, ny, { k: 'stack', id: tt.mine, q: tt.mine === 'crystal' ? U.randi(1, 2) : U.randi(2, 3) });
        G.msg(`${tt.n}을(를) 캐냈다.`, 'good');
        updateVis();
      } else G.msg(`${tt.n}을(를) 캐는 중... (${lv.mhp[i]})`, 'dim');
      return 10;
    }
    if (tt.act) {
      const txt = {
        mandrake: '만드라고라를 뽑을까? 약초를 얻지만, 비명이 층 전체를 깨운다.',
        bloodtree: `고목이 피를 원한다. ${c.name}의 최대 HP 30%를 바칠까? 무언가를 돌려줄 것이다.`,
        chest: '보물상자를 열까?',
        captive: '사슬에 묶인 모험가가 도움을 청한다. 풀어줄까?',
      }[tt.act];
      if (G.onPrompt) G.onPrompt(txt, () => cmd('interact', nx, ny));
      return 0;
    }
    if (!tt.pass) return 0;
    if (!tryStep(c, nx, ny)) return 0;
    pickupAt(c, false);
    const here = lv.t[I(c.x, c.y)];
    if (here === 'down') G.msg('내려가는 계단이 있다. (>)', 'dim');
    if (here === 'up') G.msg(d.depth === d.startDepth ? '지상으로 가는 계단이 있다. (<: 귀환)' : '올라가는 계단이 있다. (<)', 'dim');
    return actCost(c, G.Chars.moveCost(c));
  }

  function stairs(dir) {
    const c = ctrlChar();
    const t = lv.t[I(c.x, c.y)];
    if (dir === '>' && t === 'down') { enterLevel(d.depth + 1, 'down'); return 'level'; }
    if (dir === '<' && t === 'up') {
      if (d.depth === d.startDepth) { endExpedition('return'); return 'end'; }
      enterLevel(d.depth - 1, 'up'); return 'level';
    }
    // 계단 위가 아니면 알려진 계단으로 자동 이동
    const tgt = dir === '>' ? lv.down : lv.up;
    if (tgt && lv.seen[I(tgt.x, tgt.y)]) { d.auto = { kind: 'travel', x: tgt.x, y: tgt.y }; return 'auto'; }
    G.msg(dir === '>' ? '아직 내려가는 계단을 찾지 못했다.' : '올라가는 계단 위치를 모른다.', 'warn');
    return 0;
  }

  function cmd(name, a, b, e) {
    bind();
    if (!d || d.over || !d.waiting) return false;
    const c = ctrlChar();
    if (!c || c.hp <= 0) return false;
    let cost = 0;
    switch (name) {
      case 'move': cost = bump(c, a, b); break;
      case 'wait': cost = 10; break;
      case 'pickup': if (pickupAt(c, true)) cost = 10; else G.msg('주울 것이 없다.', 'dim'); break;
      case 'ability': cost = doAbility(c, a, b); if (cost && b && b.isMon) d.focus = b.id; break;
      case 'use': cost = useItem(c, a, b); break;
      case 'equip': cost = equip(a, b); break;
      case 'interact': cost = interact(c, a, b); break;
      case 'drop': {
        if (a === 'gear') { const g = d.bag.gear.find(o => o.id === b); if (g) { d.bag.gear.splice(d.bag.gear.indexOf(g), 1); dropItem(lv, c.x, c.y, { k: 'gear', item: g, noted: true }); cost = 10; } }
        else if (d.bag.stacks[a] > 0) { const q = d.bag.stacks[a]; delete d.bag.stacks[a]; dropItem(lv, c.x, c.y, { k: 'stack', id: a, q, noted: true }); cost = 10; }
        break;
      }
      case 'stairs': {
        const r = stairs(a);
        if (r === 'level') { d.waiting = false; c.nextT = d.T + 10; run(); }
        return !!r;
      }
    }
    if (cost < 0) return true; // 원정 종료
    if (!G.S.dun) return true;
    if (cost > 0) {
      c.nextT += cost;
      d.waiting = false;
      updateVis();
      run();
      return true;
    }
    return false;
  }

  function switchCtrl(id) {
    bind();
    const c = byId(id);
    if (!c || c.loc !== 'away' || c.hp <= 0) return;
    d.ctrl = id; d.auto = null;
    // 조종 대상의 차례가 아니면 차례가 올 때까지 진행
    if (d.waiting) {
      const party = alive();
      const minT = Math.min(...party.map(o => o.nextT), ...lv.mons.filter(m => m.hp > 0).map(m => m.nextT));
      if (c.nextT > minT) { d.waiting = false; run(); }
    }
  }

  // ───────── 자동 행동 (탐험·이동·휴식) ─────────
  function hostileInView() { return visibleMons().length > 0; }

  function autoStep() {
    bind();
    if (!d || !d.auto || !d.waiting) return false;
    const c = ctrlChar();
    const a = d.auto;
    if (hostileInView()) {
      const m = visibleMons()[0];
      G.msg(`${U.josa(G.MON[m.type].n, '이/가')} 보인다. 자동 행동을 멈춘다.`, 'warn');
      d.auto = null; return false;
    }
    if (a.kind === 'rest') {
      const full = alive().every(o => o.hp >= G.Chars.maxHP(o) && o.mp >= G.Chars.maxMP(o) - 0.5);
      if (full || ++a.n > 400) { G.msg(full ? '휴식을 마쳤다.' : '휴식을 중단했다.', 'dim'); d.auto = null; return false; }
      cmd('wait');
      return true;
    }
    let path = null;
    if (a.kind === 'travel') {
      if (c.x === a.x && c.y === a.y) { d.auto = null; return false; }
      const r = G.bfs(W, H, c.x, c.y, (x, y) => passT(x, y) && lv.seen[I(x, y)], (x, y) => x === a.x && y === a.y);
      path = r && r.path;
    } else if (a.kind === 'explore') {
      const r = G.bfs(W, H, c.x, c.y, (x, y) => passT(x, y) && lv.seen[I(x, y)], (x, y) => {
        if (lv.items.some(it => it.x === x && it.y === y && !it.noted)) return true;
        for (const [dx, dy] of G.DIRS8) { const nx = x + dx, ny = y + dy; if (inb(nx, ny) && !lv.seen[I(nx, ny)]) return true; }
        return false;
      });
      if (r && !r.path.length) {
        // 지금 칸이 목표: 아이템 확인
        for (const it of lv.items) if (it.x === c.x && it.y === c.y) it.noted = true;
        pickupAt(c, false);
        return true;
      }
      path = r && r.path;
      if (!path) { G.msg(lv.down && lv.seen[I(lv.down.x, lv.down.y)] ? '이 층은 다 둘러봤다. (> : 계단으로 이동)' : '더 탐험할 곳이 없다.', 'dim'); d.auto = null; return false; }
    }
    if (!path || !path.length) { d.auto = null; return false; }
    const [nx, ny] = path[0];
    if (!cmd('move', nx - c.x, ny - c.y)) { d.auto = null; return false; }
    return true;
  }

  function setAuto(kind, x, y) {
    bind();
    if (!d || !d.waiting) return;
    if (kind !== 'rest' && hostileInView()) { G.msg('근처에 적이 있다!', 'warn'); return; }
    if (kind === 'rest' && hostileInView()) { G.msg('적이 보이는 곳에서는 쉴 수 없다.', 'warn'); return; }
    d.auto = { kind, x, y, n: 0 };
  }

  // ───────── 원정 종료 ─────────
  function endExpedition(kind) {
    bind();
    const sum = { kind, loot: {}, gear: [], dead: d.dead.map(id => byId(id).name), rescued: [], deepest: d.deepest, kills: d.kills, turns: d.turn };
    if (kind !== 'wipe') {
      for (const k in d.bag.stacks) {
        const q = d.bag.stacks[k];
        if (q <= 0) continue;
        sum.loot[k] = q;
        if (k === 'relic') G.S.research.bank += 150 * q;
        else G.Settle.Store.give(k, q);
      }
      for (const g of d.bag.gear) { G.S.armory.push(g); sum.gear.push(G.Chars.gearName(g)); }
    }
    for (const id of d.party) {
      const c = byId(id);
      if (!c || c.loc !== 'away') continue;
      c.status = {}; c.expeditions = (c.expeditions || 0) + 1;
      G.Settle.arrive(c);
      if (kind !== 'wipe' && (Object.keys(sum.loot).length || sum.gear.length)) G.Chars.addThought(c, 'expedition', 8, G.Settle.DAY * 2, '원정 성공');
    }
    for (const id of d.rescued) {
      const c = byId(id);
      if (c && (c.loc === 'rescued' || c.loc === 'away')) { G.Settle.arrive(c); sum.rescued.push(c.name); }
    }
    d.over = true;
    G.S.dun = null;
    G.S.mode = 'settle';
    G.msg(kind === 'wipe' ? '원정대가 전멸했다. 아무것도 돌아오지 못했다.' : '원정대가 정착지로 돌아왔다.', kind === 'wipe' ? 'bad' : 'good');
    if (G.onEvent) G.onEvent('expedition_end', sum);
  }

  function tileInfo(x, y) {
    bind();
    if (!inb(x, y) || !lv.seen[I(x, y)]) return null;
    const out = [TT[lv.t[I(x, y)]].n];
    if (visible(x, y)) {
      const m = monAt(x, y);
      if (m) out.push(monLine(m));
      const p = partyAt(x, y);
      if (p) out.push(`${p.name} HP ${p.hp}/${G.Chars.maxHP(p)}`);
    }
    for (const it of lv.items) if (it.x === x && it.y === y) out.push(it.k === 'stack' ? `${G.RES[it.id].n} ×${it.q}` : G.Chars.gearName(it.item));
    return out;
  }

  function threat(m) {
    const party = alive();
    const xl = party.length ? party.reduce((s, c) => s + c.xl, 0) / party.length : 1;
    const lvM = G.MON[m.type].lv;
    if (lvM <= xl - 3) return { n: '쉬움', c: '#909090' };
    if (lvM <= xl) return { n: '보통', c: '#e0e0e0' };
    if (lvM <= xl + 3) return { n: '위험', c: '#ffd040' };
    return { n: '매우 위험', c: '#ff4040' };
  }
  function monLine(m) {
    const md = G.MON[m.type];
    const st = [];
    if (m.state === 'sleep') st.push('잠듦');
    else if (m.state !== 'hunt') st.push('배회');
    for (const k of ['stun', 'slow', 'poison', 'taunt']) if (m.status[k]) st.push({ stun: '기절', slow: '감속', poison: '중독', taunt: '도발됨' }[k]);
    return `${md.n} (${threat(m).n}) HP ${Math.max(0, m.hp)}/${m.maxhp}${st.length ? ' · ' + st.join(', ') : ''}`;
  }

  function onLoad() { bind(); if (d) { d.auto = null; updateVis(); if (!d.waiting) run(); } }

  return {
    W, H, TT, theme, start, cmd, run, autoStep, setAuto, switchCtrl, abilities, targetsFor, alive: () => (bind(), d ? alive() : []),
    ctrl: () => (bind(), d ? ctrlChar() : null), level: () => (bind(), lv), bagCap: () => (bind(), bagCap()), bagWeight: () => (bind(), bagWeight()),
    visibleMons: () => (bind(), visibleMons()), threat, monLine, tileInfo, onLoad, updateVis: () => (bind(), updateVis()), gen, randGear,
    passT: (x, y) => (bind(), passT(x, y)),
  };
})();
