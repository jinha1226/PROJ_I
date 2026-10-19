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

  function init(canvas) { cv = canvas; ctx = cv.getContext('2d'); resize(); }
  function resize() {
    const wrap = cv.parentElement;
    dpr = window.devicePixelRatio || 1;
    cssW = wrap.clientWidth; cssH = wrap.clientHeight;
    cv.width = Math.floor(cssW * dpr); cv.height = Math.floor(cssH * dpr);
    cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
  }
  function layout(W, H, fx, fy) {
    mapW = W; mapH = H;
    cell = Math.max(12, Math.min(28, Math.floor(Math.min(cssW / W, cssH / H))));
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
  }
  const px = x => offX + (x - camX) * cell, py = y => offY + (y - camY) * cell;
  const inView = (x, y) => x >= camX && y >= camY && x < camX + cols && y < camY + rows;
  function bg(x, y, c) { ctx.fillStyle = c; ctx.fillRect(px(x), py(y), cell, cell); }
  function gl(x, y, ch, c) { if (!ch || ch === ' ') return; ctx.fillStyle = c; ctx.fillText(ch, px(x) + cell / 2, py(y) + cell / 2 + 1); }
  function box(x, y, c, w) { ctx.strokeStyle = c; ctx.lineWidth = w || 1.5; ctx.strokeRect(px(x) + 1, py(y) + 1, cell - 2, cell - 2); }
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
    layout(W, H, ui.camX != null ? ui.camX : W / 2, ui.camY != null ? ui.camY : H / 2);
    begin();
    const light = daylight(s);
    const pileAt = new Map();
    for (const p of s.piles) pileAt.set(p.y * W + p.x, p);
    const grave = new Map();
    for (const g of s.graves) grave.set(g.y * W + g.x, g);
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
    // 도구 미리보기
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
    const night = 1 - light;
    if (night > 0.05) { ctx.fillStyle = `rgba(8,12,40,${night * 0.5})`; ctx.fillRect(0, 0, cssW, cssH); }
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
    layout(W, H, ctrl ? ctrl.x : W / 2, ctrl ? ctrl.y : H / 2);
    begin();
    const th = G.Dun.theme(lv.depth);
    const vis = d.vis, li = d.light;
    const now = Date.now();
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

  function gearGlyph(it) {
    const d = G.GEAR[it.base];
    if (d.slot === 'armor') return '[';
    if (d.slot === 'shield') return ']';
    if (d.slot === 'pack') return '&';
    if (d.ranged) return '}';
    return '(';
  }

  return { init, resize, drawSettle, drawDungeon, toMap, shade, gearGlyph };
})();
