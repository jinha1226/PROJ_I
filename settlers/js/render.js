'use strict';
// 캔버스 렌더링: 브로그식 글리프 + 배경색
G.R = (function () {
  let cv, ctx, dpr = 1, cssW = 0, cssH = 0;
  let cell = 18, cols = 0, rows = 0, offX = 0, offY = 0, camX = 0, camY = 0, mapW = 0, mapH = 0;
  const cache = new Map();
  const FONT = '"DejaVu Sans Mono", "Cascadia Mono", Consolas, "Noto Sans Mono", monospace';

  function rgb(hex) {
    let h = hex.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // 밝기 f, 회색 섞기 g
  function shade(hex, f, g) {
    const k = hex + '|' + f.toFixed(2) + '|' + (g || 0);
    let v = cache.get(k);
    if (v) return v;
    let [r, gg, b] = rgb(hex);
    if (g) { const m = (r + gg + b) / 3; r = r + (m - r) * g; gg = gg + (m - gg) * g; b = b + (m - b) * g + 12 * g; }
    v = `rgb(${Math.min(255, r * f) | 0},${Math.min(255, gg * f) | 0},${Math.min(255, b * f) | 0})`;
    if (cache.size > 20000) cache.clear();
    cache.set(k, v);
    return v;
  }
  function mix(a, b, t) {
    const A = rgb(a), B = rgb(b);
    const h = x => Math.round(x).toString(16).padStart(2, '0');
    return '#' + h(A[0] + (B[0] - A[0]) * t) + h(A[1] + (B[1] - A[1]) * t) + h(A[2] + (B[2] - A[2]) * t);
  }
  const hash = i => { let x = (i * 2654435761) >>> 0; x ^= x >>> 13; return (x * 1274126177) >>> 0; };

  // ───────── 타일 (DCSS rltiles) ─────────
  const TI = {};
  let tilesTotal = 0, tilesDone = 0, gfx = 'tiles';
  try { gfx = localStorage.getItem('dp_gfx') || 'tiles'; } catch (e) { /* 저장소 없음 */ }
  const zoom = { settle: 0, dungeon: 0 }; // 0 = 자동
  function loadTiles() {
    if (!G.TILESET) return;
    for (const k in G.TILESET) {
      const n = G.TILESET[k];
      TI[k] = [];
      for (let i = 0; i < n; i++) {
        const im = new Image();
        im.onload = im.onerror = () => { tilesDone++; };
        im.src = `assets/tiles/${k}${n > 1 ? '_' + i : ''}.png`;
        TI[k].push(im);
        tilesTotal++;
      }
    }
  }
  const useTiles = () => gfx === 'tiles' && tilesTotal > 0 && tilesDone >= tilesTotal;
  function setGfx(m) { gfx = m; zoom.settle = zoom.dungeon = 0; try { localStorage.setItem('dp_gfx', m); } catch (e) { /* 무시 */ } }
  function tImg(key, v) {
    const a = TI[key];
    if (!a) return null;
    const im = a[((v || 0) >>> 0) % a.length];
    return im.naturalWidth ? im : null;
  }
  // 칸에 타일 그리기 (s: 크기 비율)
  function ti(x, y, key, v, s) {
    const im = tImg(key, v);
    if (!im) return false;
    if (s && s !== 1) { const o = cell * (1 - s) / 2; ctx.drawImage(im, px(x) + o, py(y) + o, cell * s, cell * s); }
    else ctx.drawImage(im, px(x), py(y), cell, cell);
    return true;
  }
  function fill(x, y, c) { ctx.fillStyle = c; ctx.fillRect(px(x), py(y), cell, cell); }

  // 정착민 인형: 종족·성별·옷·머리·무기·방패 레이어를 합쳐 캐시
  const dolls = new Map();
  function dollLayers(c) {
    const h = hash(c.id * 7 + 3), sex = h & 1 ? 'f' : 'm';
    const L = [['pb_' + c.race + '_' + sex, h >> 3], ['pl_boots', h >> 5], ['pl_pants', h >> 7]];
    const ar = c.equip.armor;
    L.push(ar && TI['pc_' + ar.base] ? ['pc_' + ar.base, h >> 9] : ['pc_shirt', h >> 9]);
    const w = c.equip.weapon;
    if (w && TI['pw_' + w.base]) L.push(['pw_' + w.base, 0]);
    else if (c.loc === 'home' && c.job && c.job.kind === 'farm') L.push(['pw_tool', 0]);
    const sh = c.equip.shield;
    if (sh && TI['ps_' + sh.base]) L.push(['ps_' + sh.base, 0]);
    if (c.race !== 'orc') L.push(['ph_hair', h >> 11]);
    return L;
  }
  function dollOf(c) {
    const L = dollLayers(c);
    const key = L.map(l => l[0] + ':' + ((l[1] >>> 0) % TI[l[0]].length)).join('|');
    let cv2 = dolls.get(key);
    if (!cv2) {
      cv2 = document.createElement('canvas');
      cv2.width = cv2.height = 32;
      const g = cv2.getContext('2d');
      for (const [k, v] of L) { const im = tImg(k, v); if (im) g.drawImage(im, 0, 0); }
      if (dolls.size > 300) dolls.clear();
      dolls.set(key, cv2);
    }
    return cv2;
  }
  function drawDoll(c, x, y, dim) {
    ctx.drawImage(dollOf(c), px(x), py(y), cell, cell);
    if (dim) fill(x, y, `rgba(0,0,20,${dim})`);
  }
  function hpBar(x, y, hp, mx, back, front) {
    ctx.fillStyle = back; ctx.fillRect(px(x) + 1, py(y) + cell - 3, cell - 2, 3);
    ctx.fillStyle = front; ctx.fillRect(px(x) + 1, py(y) + cell - 3, (cell - 2) * Math.max(0, hp) / mx, 3);
  }
  function zzz(x, y, c) { ctx.font = `bold ${Math.round(cell * 0.45)}px ${FONT}`; ctx.fillStyle = c; ctx.fillText('z', px(x) + cell - 4, py(y) + 5); ctx.font = `${Math.round(cell * 0.82)}px ${FONT}`; }

  function init(canvas) { cv = canvas; ctx = cv.getContext('2d'); resize(); loadTiles(); }
  function resize() {
    const wrap = cv.parentElement;
    dpr = window.devicePixelRatio || 1;
    cssW = wrap.clientWidth; cssH = wrap.clientHeight;
    cv.width = Math.floor(cssW * dpr); cv.height = Math.floor(cssH * dpr);
    cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
  }
  function layout(W, H, fx, fy, view) {
    mapW = W; mapH = H;
    const fit = Math.floor(Math.min(cssW / W, cssH / H));
    if (zoom[view]) cell = zoom[view];
    else if (useTiles()) cell = view === 'dungeon' ? Math.max(32, Math.min(48, fit)) : Math.max(16, Math.min(48, fit));
    else cell = Math.max(12, Math.min(28, fit));
    cols = Math.floor(cssW / cell); rows = Math.floor(cssH / cell);
    offX = cols >= W ? Math.floor((cssW - W * cell) / 2) : 0;
    offY = rows >= H ? Math.floor((cssH - H * cell) / 2) : 0;
    camX = cols >= W ? 0 : U.clamp(Math.round(fx - cols / 2), 0, W - cols);
    camY = rows >= H ? 0 : U.clamp(Math.round(fy - rows / 2), 0, H - rows);
  }
  function begin() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.font = `${Math.round(cell * 0.82)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.imageSmoothingEnabled = cell < 32;
  }
  const px = x => offX + (x - camX) * cell, py = y => offY + (y - camY) * cell;
  const inView = (x, y) => x >= camX && y >= camY && x < camX + cols && y < camY + rows;
  function bg(x, y, c) { ctx.fillStyle = c; ctx.fillRect(px(x), py(y), cell, cell); }
  function gl(x, y, ch, c) { if (!ch || ch === ' ') return; ctx.fillStyle = c; ctx.fillText(ch, px(x) + cell / 2, py(y) + cell / 2 + 1); }
  function box(x, y, c, w) { ctx.strokeStyle = c; ctx.lineWidth = w || 1.5; ctx.strokeRect(px(x) + 1, py(y) + 1, cell - 2, cell - 2); }
  // 휠 확대/축소. 마우스 아래 칸이 제자리에 남도록 새 카메라 중심을 돌려준다
  function zoomAt(view, dir, mx, my) {
    const m = toMap(mx, my);
    const nc = U.clamp(cell + dir * 4, 12, 64);
    zoom[view] = nc;
    return { x: m.x + 0.5 - (mx - cssW / 2) / nc, y: m.y + 0.5 - (my - cssH / 2) / nc };
  }
  function toMap(cx, cy) { return { x: Math.floor((cx - offX) / cell) + camX, y: Math.floor((cy - offY) / cell) + camY }; }

  // ───────── 정착지 ─────────
  const ST = {
    grass: { g: ['"', ',', '.', "'", '.'], fg: '#4c8a3c', bg: '#13230e' },
    dirt: { g: ['.', '.', ','], fg: '#7a6040', bg: '#211a10' },
    tree: { g: ['♣'], fg: '#3fa040', bg: '#0f1f0c' },
    rock: { g: ['#'], fg: '#8a8a8a', bg: '#3a3a3c' },
    ore: { g: ['%'], fg: '#ffa050', bg: '#3a3a3c' },
    water: { g: ['≈'], fg: '#5a9aff', bg: '#0e2a5a' },
    shallow: { g: ['~'], fg: '#70a8e0', bg: '#16324e' },
    bush: { g: ['♠'], fg: '#e04848', bg: '#13230e' },
    bush_e: { g: ['♠'], fg: '#3e5a32', bg: '#13230e' },
    herb: { g: ['ψ'], fg: '#90ff80', bg: '#13230e' },
    herb_e: { g: [','], fg: '#4a7a3a', bg: '#13230e' },
    entrance: { g: ['Ω'], fg: '#ff4040', bg: '#140404' },
  };

  function daylight(s) {
    const t = (s.tick % G.Settle.DAY) / G.Settle.DAY; // 0 = 자정
    const sun = Math.cos((t - 0.55) * Math.PI * 2); // 정오 무렵 최대
    return U.clamp(0.55 + sun * 0.7, 0.45, 1);
  }

  function drawSettle(ui) {
    const s = G.S.settle, W = G.Settle.W, H = G.Settle.H;
    layout(W, H, ui.camX != null ? ui.camX : W / 2, ui.camY != null ? ui.camY : H / 2, 'settle');
    begin();
    const light = daylight(s);
    const pileAt = new Map();
    for (const p of s.piles) pileAt.set(p.y * W + p.x, p);
    const grave = new Map();
    for (const g of s.graves) grave.set(g.y * W + g.x, g);
    if (useTiles()) { settleTiles(ui, s, W, H, light, pileAt, grave); return; }
    for (let y = camY; y < Math.min(H, camY + rows); y++) for (let x = camX; x < Math.min(W, camX + cols); x++) {
      const i = y * W + x, t = s.terrain[i], st = ST[t], h = hash(i);
      const vf = 0.85 + (h % 100) / 100 * 0.3;
      let bgc = st.bg, fg = st.fg, ch = st.g[h % st.g.length];
      const z = s.zone[i];
      if (z === 'stock') bgc = mix(bgc, '#5a5020', 0.45);
      if (z === 'farm') {
        bgc = '#33220e';
        const cr = s.crop[i];
        if (!cr) { ch = '·'; fg = '#6a5030'; }
        else if (cr.g < 0.4) { ch = ','; fg = '#6aa040'; }
        else if (cr.g < 1) { ch = '"'; fg = '#80c048'; }
        else { ch = '♣'; fg = '#e0d060'; }
      }
      if (t === 'entrance') { const p = 0.75 + Math.sin(Date.now() / 300) * 0.25; fg = shade('#ff4040', p); }
      bg(x, y, shade(bgc, light * vf));
      const b = s.bld[i];
      if (b) {
        const d = G.BUILD[b.type];
        if (b.built) {
          if (d.bg) bg(x, y, shade(d.bg, light));
          gl(x, y, d.g, shade(d.c, light));
        } else {
          bg(x, y, shade('#0c1a30', light));
          gl(x, y, d.g, '#4a8ae0');
        }
      } else if (pileAt.has(i)) {
        const p = pileAt.get(i);
        gl(x, y, G.RES[p.r].g, shade(G.RES[p.r].c, light));
      } else if (grave.has(i)) gl(x, y, '†', shade('#b0b0b0', light));
      else gl(x, y, ch, shade(fg, light * vf));
      const ds = s.desig[i];
      if (ds) box(x, y, ds === 'chop' ? '#ffd040' : '#ff7040', 1.2);
    }
    // 정착민
    for (const c of G.S.colonists) {
      if (c.loc !== 'home' || !inView(c.x, c.y)) continue;
      const sleeping = c.job && c.job.kind === 'sleep' && c.job.stage === 'sleep';
      if (c.drafted) bg(c.x, c.y, '#4a1818');
      if (ui.sel === c.id) box(c.x, c.y, '#ffe040', 2);
      if (c.drafted && c.order) box(c.order.x, c.order.y, 'rgba(255,90,90,0.7)', 1.2);
      gl(c.x, c.y, '@', sleeping ? shade(c.color, 0.5) : c.color);
      if (c.carry) { ctx.fillStyle = '#ffd040'; ctx.fillRect(px(c.x) + cell - 5, py(c.y) + 2, 3, 3); }
      const mx = G.Chars.maxHP(c);
      if (c.hp < mx) { ctx.fillStyle = '#400'; ctx.fillRect(px(c.x) + 1, py(c.y) + cell - 3, cell - 2, 2); ctx.fillStyle = '#e33'; ctx.fillRect(px(c.x) + 1, py(c.y) + cell - 3, (cell - 2) * c.hp / mx, 2); }
      if (sleeping) { ctx.font = `${Math.round(cell * 0.45)}px ${FONT}`; ctx.fillStyle = '#9ab'; ctx.fillText('z', px(c.x) + cell - 3, py(c.y) + 4); ctx.font = `${Math.round(cell * 0.82)}px ${FONT}`; }
    }
    for (const m of s.mons) {
      if (!inView(m.x, m.y)) continue;
      const d = G.MON[m.type];
      bg(m.x, m.y, '#3a0808');
      gl(m.x, m.y, d.g, d.c);
    }
    toolPreview(ui);
    const night = 1 - light;
    if (night > 0.05) { ctx.fillStyle = `rgba(8,12,40,${night * 0.5})`; ctx.fillRect(0, 0, cssW, cssH); }
  }

  const GROUND = { grass: 'grass', bush: 'grass', bush_e: 'grass', herb: 'grass', herb_e: 'grass', tree: 'grass', dirt: 'dirt', rock: 'rock', ore: 'rock', water: 'water', shallow: 'shallow', entrance: 'dirt' };
  const PLANT = { tree: 'tree', bush: 'bush', bush_e: 'bush_e', herb: 'herb' };
  function settleTiles(ui, s, W, H, light, pileAt, grave) {
    const now = Date.now();
    const occ = new Set();
    for (const c of G.S.colonists) if (c.loc === 'home') occ.add(c.y * W + c.x);
    for (const m of s.mons) occ.add(m.y * W + m.x);
    for (let y = camY; y < Math.min(H, camY + rows); y++) for (let x = camX; x < Math.min(W, camX + cols); x++) {
      const i = y * W + x, t = s.terrain[i], h = hash(i), z = s.zone[i];
      if (z === 'farm') {
        ti(x, y, 'soil', h);
        const cr = s.crop[i];
        if (cr) {
          if (cr.g < 0.4) ti(x, y, 'sprout', 0, 0.55);
          else if (cr.g < 1) ti(x, y, 'herb', h, 0.85);
          else ti(x, y, 'crop', 0);
        }
      } else {
        const gk = GROUND[t];
        ti(x, y, gk === 'grass' && h % 29 === 0 ? 'grass_fl' : gk, h);
        if (PLANT[t]) {
          ti(x, y, PLANT[t], h >> 4);
          if (t === 'bush') { ctx.fillStyle = '#e83040'; for (let k = 0; k < 3; k++) ctx.fillRect(px(x) + cell * (0.3 + 0.2 * k), py(y) + cell * (0.35 + 0.15 * (k & 1)), Math.max(2, cell / 10), Math.max(2, cell / 10)); }
        }
        if (t === 'ore') ti(x, y, 'r_iron_ore', 0, 0.62);
        if (t === 'entrance') ti(x, y, 'entrance', Math.floor(now / 220) % 3);
        if (z === 'stock') fill(x, y, 'rgba(230,200,80,0.16)');
      }
      const b = s.bld[i];
      if (b) {
        const key = b.type === 'med_bed' ? 'bed' : b.type === 'door' && occ.has(i) ? 'door_open' : b.type;
        if (!b.built) ctx.globalAlpha = 0.4;
        ti(x, y, key, h);
        ctx.globalAlpha = 1;
        if (b.type === 'med_bed') { ctx.fillStyle = '#40e060'; const u = cell / 8; ctx.fillRect(px(x) + cell - 3 * u, py(y) + u * 0.5, u, 3 * u); ctx.fillRect(px(x) + cell - 4 * u, py(y) + 1.5 * u, 3 * u, u); }
        if (!b.built) { fill(x, y, 'rgba(60,140,255,0.22)'); box(x, y, 'rgba(110,170,255,0.7)', 1); }
      } else if (pileAt.has(i)) ti(x, y, 'r_' + pileAt.get(i).r, 0, 0.85);
      else if (grave.has(i)) ti(x, y, 'grave', 0);
      const ds = s.desig[i];
      if (ds) box(x, y, ds === 'chop' ? '#ffd040' : '#ff7040', 1.5);
    }
    for (const c of G.S.colonists) {
      if (c.loc !== 'home' || !inView(c.x, c.y)) continue;
      const sleeping = c.job && c.job.kind === 'sleep' && c.job.stage === 'sleep';
      if (c.drafted) fill(c.x, c.y, 'rgba(200,40,40,0.35)');
      drawDoll(c, c.x, c.y, sleeping ? 0.45 : 0);
      if (ui.sel === c.id) box(c.x, c.y, '#ffe040', 2);
      if (c.drafted && c.order) box(c.order.x, c.order.y, 'rgba(255,90,90,0.8)', 1.5);
      if (c.carry) {
        const r = Object.keys(c.carry)[0], im = r && tImg('r_' + r, 0);
        if (im) ctx.drawImage(im, px(c.x) + cell * 0.5, py(c.y), cell * 0.5, cell * 0.5);
      }
      const mx = G.Chars.maxHP(c);
      if (c.hp < mx) hpBar(c.x, c.y, c.hp, mx, '#400', '#e33');
      if (sleeping) zzz(c.x, c.y, '#bcd');
    }
    for (const m of s.mons) {
      if (!inView(m.x, m.y)) continue;
      fill(m.x, m.y, 'rgba(160,20,20,0.3)');
      ti(m.x, m.y, 'm_' + m.type, 0);
      if (m.type === 'orc_archer') ti(m.x, m.y, 'ov_bow', 0);
      if (m.hp < m.maxhp) hpBar(m.x, m.y, m.hp, m.maxhp, '#400', '#f44');
    }
    toolPreview(ui);
    const night = 1 - light;
    if (night > 0.05) { ctx.fillStyle = `rgba(8,12,40,${night * 0.62})`; ctx.fillRect(0, 0, cssW, cssH); }
  }
  function toolPreview(ui) {
    if (ui.drag && ui.tool !== 'select') {
      const a = ui.drag, b = ui.hover || a;
      const ax = Math.min(a.x, b.x), bx = Math.max(a.x, b.x), ay = Math.min(a.y, b.y), by = Math.max(a.y, b.y);
      const wall = ui.tool.startsWith('b:') && G.BUILD[ui.tool.slice(2)].block;
      ctx.fillStyle = 'rgba(120,180,255,0.25)';
      for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
        if (wall && !(x === ax || x === bx || y === ay || y === by)) continue;
        ctx.fillRect(px(x), py(y), cell, cell);
      }
    } else if (ui.hover && ui.tool !== 'select') box(ui.hover.x, ui.hover.y, '#80c0ff', 2);
  }

  // ───────── 던전 ─────────
  const DT = {
    door: ['#d09050', '#2a1a0a'], door_open: ['#d09050', '#2a1a0a'], up: ['#ffe060', null], down: ['#ffe060', null],
    shallow: ['#5080d0', '#102040'], deep: ['#3060c0', '#061430'], lava: ['#ffd040', '#a02800'],
    ore: ['#ff9850', null], crystal: ['#60e8ff', '#1a3040'], mandrake: ['#d070ff', null], bloodtree: ['#ff3040', '#200808'],
    deadtree: ['#605050', null], captive: ['#c0c0c0', null], chest: ['#e0b040', null],
  };

  function drawDungeon(ui) {
    const d = G.S.dun, lv = G.Dun.level(), W = G.Dun.W, H = G.Dun.H;
    const ctrl = G.Dun.ctrl();
    layout(W, H, ctrl ? ctrl.x : W / 2, ctrl ? ctrl.y : H / 2, 'dungeon');
    begin();
    const th = G.Dun.theme(lv.depth);
    const vis = d.vis, li = d.light;
    const now = Date.now();
    if (useTiles()) { dungeonTiles(ui, d, lv, W, H, th, ctrl, now); return; }
    for (let y = camY; y < Math.min(H, camY + rows); y++) for (let x = camX; x < Math.min(W, camX + cols); x++) {
      const i = y * W + x;
      if (!lv.seen[i]) continue;
      const t = lv.t[i], tt = G.Dun.TT[t], h = hash(i);
      const isWallish = t === 'wall' || t === 'ore';
      let fg = isWallish ? th.wall[0] : th.floor[0], bgc = isWallish ? th.wall[1] : th.floor[1];
      if (DT[t]) { fg = DT[t][0]; if (DT[t][1]) bgc = DT[t][1]; }
      const fl = t === 'lava' ? 0.85 + Math.sin(now / 400 + (h % 7)) * 0.15 : 1;
      const v = vis && vis[i];
      const f = v ? (0.35 + li[i] * 0.75) * (0.92 + (h % 16) / 100) : 0.34;
      const g = v ? 0 : 0.6;
      bg(x, y, shade(bgc, f * fl, g));
      let ch = tt.g;
      if (t === 'floor' && h % 11 === 0) ch = ',';
      gl(x, y, ch, shade(fg, f, g));
    }
    for (const it of lv.items) {
      const i = it.y * W + it.x;
      if (!lv.seen[i]) continue;
      const v = vis && vis[i];
      const g = it.k === 'stack' ? G.RES[it.id].g : gearGlyph(it.item);
      const c = it.k === 'stack' ? G.RES[it.id].c : '#e0e0e0';
      gl(it.x, it.y, g, v ? c : shade(c, 0.4, 0.5));
    }
    // 대상 지정 강조
    if (ui.target) {
      for (const t of ui.target.list) box(t.x, t.y, '#806020', 1.2);
      const cur = ui.target.list[ui.target.idx];
      if (cur && ctrl) {
        ctx.fillStyle = 'rgba(255,220,80,0.18)';
        for (const [x, y] of G.line(ctrl.x, ctrl.y, cur.x, cur.y)) ctx.fillRect(px(x), py(y), cell, cell);
        box(cur.x, cur.y, '#ffe040', 2.5);
      }
    }
    for (const m of lv.mons) {
      if (m.hp <= 0 || !vis || !vis[m.y * W + m.x]) continue;
      const md = G.MON[m.type];
      if (md.boss) { const p = 0.7 + Math.sin(now / 250) * 0.3; bg(m.x, m.y, shade('#600010', p)); }
      gl(m.x, m.y, md.g, m.state === 'sleep' ? shade(md.c, 0.6) : md.c);
      if (m.hp < m.maxhp) { ctx.fillStyle = '#400'; ctx.fillRect(px(m.x) + 1, py(m.y) + cell - 3, cell - 2, 2); ctx.fillStyle = '#f44'; ctx.fillRect(px(m.x) + 1, py(m.y) + cell - 3, (cell - 2) * Math.max(0, m.hp) / m.maxhp, 2); }
      if (m.state === 'sleep') { ctx.font = `${Math.round(cell * 0.45)}px ${FONT}`; ctx.fillStyle = '#89a'; ctx.fillText('z', px(m.x) + cell - 3, py(m.y) + 4); ctx.font = `${Math.round(cell * 0.82)}px ${FONT}`; }
      if (d.focus === m.id) box(m.x, m.y, '#ff6060', 1);
    }
    for (const c of G.Dun.alive()) {
      if (c.id === d.ctrl) bg(c.x, c.y, '#2a3a60');
      gl(c.x, c.y, '@', c.color);
      const mx = G.Chars.maxHP(c);
      ctx.fillStyle = '#300'; ctx.fillRect(px(c.x) + 1, py(c.y) + cell - 3, cell - 2, 2);
      ctx.fillStyle = c.hp < mx * 0.3 ? '#f33' : '#4d4'; ctx.fillRect(px(c.x) + 1, py(c.y) + cell - 3, (cell - 2) * c.hp / mx, 2);
    }
    if (ui.hover && !ui.target && lv.seen[ui.hover.y * W + ui.hover.x]) box(ui.hover.x, ui.hover.y, 'rgba(160,200,255,0.6)', 1);
  }

  const DFEAT = { door: 'door', door_open: 'door_open', mandrake: 'mandrake', bloodtree: 'bloodtree', deadtree: 'deadtree', chest: 'chest', captive: 'captive' };
  const DFULL = { up: 'stairs_up', down: 'stairs_down', shallow: 'shallow', deep: 'water', crystal: 'crystal_wall' };
  function dungeonTiles(ui, d, lv, W, H, th, ctrl, now) {
    const vis = d.vis, li = d.light, wk = 'dwall' + th.tile, fk = 'dfloor' + th.tile;
    for (let y = camY; y < Math.min(H, camY + rows); y++) for (let x = camX; x < Math.min(W, camX + cols); x++) {
      const i = y * W + x;
      if (!lv.seen[i]) continue;
      const t = lv.t[i], h = hash(i);
      if (t === 'wall') ti(x, y, wk, h);
      else if (t === 'ore') { ti(x, y, wk, h); ti(x, y, 'r_iron_ore', 0, 0.62); }
      else if (t === 'lava') ti(x, y, 'lava', (h + Math.floor(now / 350)) % 4);
      else if (DFULL[t]) { if (t === 'up' || t === 'down') ti(x, y, fk, h); ti(x, y, DFULL[t], h); }
      else {
        ti(x, y, fk, h);
        if (DFEAT[t]) ti(x, y, DFEAT[t], h);
        if (t === 'captive') ti(x, y, 'cage', 0);
      }
      const v = vis && vis[i];
      if (v) {
        const f = (0.35 + li[i] * 0.75) * (0.92 + (h % 16) / 100);
        if (f < 1) fill(x, y, `rgba(0,0,0,${Math.min(0.5, (1 - f) * 0.6).toFixed(2)})`);
      } else fill(x, y, 'rgba(8,8,22,0.55)');
    }
    for (const it of lv.items) {
      const i = it.y * W + it.x;
      if (!lv.seen[i]) continue;
      ti(it.x, it.y, it.k === 'stack' ? 'r_' + it.id : 'g_' + it.item.base, 0, it.k === 'stack' ? 0.8 : 0.9);
      if (!(vis && vis[i])) fill(it.x, it.y, 'rgba(8,8,22,0.5)');
    }
    if (ui.target) {
      for (const t of ui.target.list) box(t.x, t.y, '#806020', 1.2);
      const cur = ui.target.list[ui.target.idx];
      if (cur && ctrl) {
        ctx.fillStyle = 'rgba(255,220,80,0.18)';
        for (const [x, y] of G.line(ctrl.x, ctrl.y, cur.x, cur.y)) ctx.fillRect(px(x), py(y), cell, cell);
        box(cur.x, cur.y, '#ffe040', 2.5);
      }
    }
    for (const m of lv.mons) {
      if (m.hp <= 0 || !vis || !vis[m.y * W + m.x]) continue;
      const md = G.MON[m.type];
      if (md.boss) fill(m.x, m.y, `rgba(150,0,30,${(0.35 + Math.sin(now / 250) * 0.25).toFixed(2)})`);
      ti(m.x, m.y, 'm_' + m.type, 0);
      if (m.type === 'orc_archer') ti(m.x, m.y, 'ov_bow', 0);
      if (m.state === 'sleep') { fill(m.x, m.y, 'rgba(0,0,30,0.3)'); zzz(m.x, m.y, '#9ab'); }
      if (m.hp < m.maxhp) hpBar(m.x, m.y, m.hp, m.maxhp, '#400', '#f44');
      if (d.focus === m.id) box(m.x, m.y, '#ff6060', 1.5);
    }
    for (const c of G.Dun.alive()) {
      if (c.id === d.ctrl) { fill(c.x, c.y, 'rgba(70,110,220,0.3)'); box(c.x, c.y, 'rgba(140,180,255,0.9)', 1.5); }
      drawDoll(c, c.x, c.y, 0);
      const mx = G.Chars.maxHP(c);
      hpBar(c.x, c.y, c.hp, mx, '#300', c.hp < mx * 0.3 ? '#f33' : '#4d4');
    }
    if (ui.hover && !ui.target && lv.seen[ui.hover.y * W + ui.hover.x]) box(ui.hover.x, ui.hover.y, 'rgba(160,200,255,0.6)', 1);
  }

  function gearGlyph(it) {
    const d = G.GEAR[it.base];
    if (d.slot === 'armor') return '[';
    if (d.slot === 'shield') return ']';
    if (d.slot === 'pack') return '&';
    if (d.ranged) return '}';
    return '(';
  }

  return { init, resize, drawSettle, drawDungeon, toMap, shade, gearGlyph, zoomAt, setGfx, view: () => ({ cell, cx: camX + Math.min(cols, mapW) / 2, cy: camY + Math.min(rows, mapH) / 2 }), gfx: () => gfx, tilesReady: useTiles };
})();
