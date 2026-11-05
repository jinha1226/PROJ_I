'use strict';
// 지역 (DESIGN.md 89): 세력마다 지역이 있고, 지역은 짧은 층 던전이다. 맵 · 타일 · 몬스터 배치가 지역마다 다르다.
// 몬스터 배치는 SRD 5.2.1 「Combat Encounter Difficulty」의 XP 예산으로 짠다. 맵 생성은 DCSS 브랜치의 생각만 빌려 새로 썼다 (코드 · 사전 제작 맵은 쓰지 않는다).
G.Region = (() => {
  const U = G.U, F = () => G.Fantasy;
  // 1인당 XP 예산 [쉬움, 보통, 어려움] · 레벨 1~20 (SRD 5.2.1)
  const BUDGET = [[50, 75, 100], [100, 150, 200], [150, 225, 400], [250, 375, 500], [500, 750, 1100], [600, 1000, 1400], [750, 1300, 1700], [1000, 1700, 2100], [1300, 2000, 2600], [1600, 2300, 3100], [1900, 2900, 4100], [2200, 3700, 4700], [2600, 4200, 5400], [2900, 4900, 6200], [3300, 5400, 7800], [3800, 6100, 9800], [4500, 7200, 11700], [5000, 8700, 14200], [5500, 10700, 17200], [6400, 13200, 22000]];
  const XP = { 0: 10, 0.125: 25, 0.25: 50, 0.5: 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900, 11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000, 16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000 };
  const MAX_FOES = 6, ROOM_FIGHTS = 2;
  const xpOf = n => XP[G.SRD_MON[G.D.F.STAT[n][0]].cr];
  const REGIONS = {
    swamp: {
      n: '늪', len: 3, gen: (w, h, rng) => swamp(w, h, rng), note: '얕은 물: 이동 2배 소모',
      pool: ['독사', '작은 버섯', '큰 개구리', '늪 점액', '악어', '왕뱀', '황토 젤리', '진흙 점액', '버섯 거인', '대왕 악어', '히드라', '고목 엔트'],
    },
  };

  // ── 늪 지도: 높낮이 잡음으로 물과 땅을 나누고, 빈터를 얕은 물길로 잇는다 ──
  // 문자: '.' 땅 · ',' 얕은 물 (이동 2배) · '~' 깊은 물 (못 건넘, 시야는 트임) · '#' 맹그로브 (못 지남, 시야 막힘)
  function noise2(w, h, cell, rng) {
    const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, g = new Float32Array(gw * gh).map(() => rng()), s = t => t * t * (3 - 2 * t), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy), a = s(fx - ix), b = s(fy - iy), at = (i, j) => g[j * gw + i];
      out[y * w + x] = (at(ix, iy) * (1 - a) + at(ix + 1, iy) * a) * (1 - b) + (at(ix, iy + 1) * (1 - a) + at(ix + 1, iy + 1) * a) * b;
    }
    return out;
  }
  function swamp(w, h, rng) {
    const rand = n => Math.floor(rng() * n), low = noise2(w, h, 11, rng), mid = noise2(w, h, 5, rng), wood = noise2(w, h, 4, rng), c = new Array(w * h), kindAt = new Uint8Array(w * h), ix = (x, y) => y * w + x;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = low[ix(x, y)] * 0.7 + mid[ix(x, y)] * 0.3, edge = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
      c[ix(x, y)] = edge ? '#' : v < 0.4 ? '~' : v < 0.54 ? ',' : wood[ix(x, y)] > 0.6 ? '#' : '.';
    }
    // 빈터: 왼쪽에서 오른쪽으로 고르게 (앞에서 뒤로 나아가는 느낌)
    const rooms = [], COLS = 4, GAP = 10;
    for (let col = 0; col < COLS; col++) {
      const n = col === 0 || col === COLS - 1 ? 1 : 2;
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < 30; t++) {
          const rw = 4 + rand(2), rh = 3 + rand(2), cx = Math.floor((col + 0.2 + rng() * 0.6) * (w - 8) / COLS) + 4, cy = Math.floor(((i + 0.2 + rng() * 0.6) / n) * (h - rh * 2 - 6)) + rh + 3;
          if (rooms.some(r => Math.hypot(r.cx - cx, r.cy - cy) < GAP)) continue;
          rooms.push({ x: Math.max(3, cx - rw), y: Math.max(3, cy - rh), w: rw * 2 + 1, h: rh * 2 + 1, cx, cy, shape: 'glade', col });
          break;
        }
      }
    }
    for (const r of rooms) for (let y = r.y - 2; y < r.y + r.h + 2; y++) for (let x = r.x - 2; x < r.x + r.w + 2; x++) {
      if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) continue;
      const d = Math.hypot((x - r.cx) / (r.w / 2), (y - r.cy) / (r.h / 2)) + (mid[ix(x, y)] - 0.5) * 0.5;
      if (d < 0.95) c[ix(x, y)] = '.'; else if (d < 1.3 && c[ix(x, y)] !== '.') c[ix(x, y)] = ',';
    }
    // 물길: 빈터를 차례로 잇는다. 구불구불한 두 칸 너비, 깊은 물과 나무는 뚫고 얕은 물로
    const dig = (x, y) => { for (let v = 0; v < 2; v++) for (let u = 0; u < 2; u++) { const X = x + u, Y = y + v; if (X > 1 && Y > 1 && X < w - 2 && Y < h - 2 && (c[ix(X, Y)] === '#' || c[ix(X, Y)] === '~')) c[ix(X, Y)] = ','; } };
    const link = (a, b) => { let x = a.cx, y = a.cy; for (let t = 0; t < 400 && (x !== b.cx || y !== b.cy); t++) { dig(x, y); const dx = Math.sign(b.cx - x), dy = Math.sign(b.cy - y); if (dx && (!dy || rng() < 0.55 + (rng() - 0.5) * 0.4)) x += dx; else if (dy) y += dy; if (rng() < 0.12) { const s = rng() < 0.5 ? 1 : -1; if (y + s > 2 && y + s < h - 3) y += s; } } };
    rooms.sort((p, q) => p.cx - q.cx);
    const inT = new Set([0]), d2 = (a, b) => (a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2;
    while (inT.size < rooms.length) { let best = null; for (const i of inT) for (let j = 0; j < rooms.length; j++) if (!inT.has(j) && (!best || d2(rooms[i], rooms[j]) < best[2])) best = [i, j, d2(rooms[i], rooms[j])]; inT.add(best[1]); link(rooms[best[0]], rooms[best[1]]); }
    for (let t = 0; t < 2 && rooms.length > 3; t++) { const a = rand(rooms.length), b = rand(rooms.length); if (a !== b) link(rooms[a], rooms[b]); } // 돌아가는 길
    const m = { w, h, c, kindAt, poi: {}, passChars: '.>,', ver: 1, dist: {}, rooms, theme: 'swamp' };
    const start = rooms[0], end = rooms[rooms.length - 1];
    m.rooms = rooms; m.start = start; m.end = end;
    c[ix(start.cx, start.cy)] = '.'; c[ix(end.cx, end.cy)] = '>';
    // 닿지 못하는 땅은 나무로 메운다 (보이는데 갈 수 없는 곳이 없게. 깊은 물은 원래 못 가니 둔다)
    const d = G.Grid.field(m, start.cx, start.cy);
    for (let i = 0; i < c.length; i++) if ((c[i] === '.' || c[i] === ',') && d[i] < 0) c[i] = '#';
    m.dist = {};
    return m;
  }

  const R = {
    REGIONS, BUDGET, xpOf, ROOM_FIGHTS,
    of: f => (f.front && REGIONS[f.front]) || null,
    // 파티 평균 레벨과 인원
    party(f) { const ms = [G.Guild.leader(f), ...F().lineup(f).map(u => G.Guild.get(f, u))].filter(Boolean), lv = Math.round(ms.reduce((a, m) => a + m.lv, 0) / Math.max(1, ms.length)); return { lv: U.clamp(lv, 1, 20), n: ms.length }; },
    budget(f, diff) { const p = R.party(f); return BUDGET[p.lv - 1][diff] * p.n; },
    // 예산 안에서 무리를 짠다: 큰 놈부터 뽑고 남은 돈을 작은 놈으로 채운다. 한 전투 최대 MAX_FOES
    pick(reg, budget, nMax = MAX_FOES) {
      const pool = reg.pool.filter(n => xpOf(n) <= budget), out = [];
      if (!pool.length) return [reg.pool[0]];
      let left = budget;
      const top = pool.slice(-3);
      while (out.length < nMax) {
        const can = out.length ? pool.filter(n => xpOf(n) <= left) : top;
        if (!can.length) break;
        const n = U.pick(can.slice(-3)); out.push(n); left -= xpOf(n);
      }
      return out;
    },
    defs: names => names.map(n => ({ n, ...G.D.F.mon[n] })),
    // 원정 카드: 이 파티가 만날 몬스터 (쉬움~어려움 예산에 드는 것 중 위쪽)
    preview(f, key) { const reg = REGIONS[key]; if (!reg) return null; const hi = R.budget({ ...f, front: key }, 2), l = reg.pool.filter(n => xpOf(n) <= hi); return l.slice(-4); },
    // 층을 세울 때 (G.Turn.stage): 층이 깊을수록 어렵게. 끝 빈터엔 어려움 전투
    stage(f, rt, reg) {
      if (reg.stage) { reg.stage(f, rt); return; }
      const m = rt.map, idx = Math.max(0, f.floor - (f.runStart || f.floor)), last = idx >= reg.len - 1, diff = Math.min(2, idx), mid = U.shuffle(m.rooms.slice(1, -1)).slice(0, ROOM_FIGHTS - (last ? 1 : 0)), rooms = last ? mid.concat(m.end) : mid;
      for (const r of rooms) {
        const names = R.pick(reg, R.budget(f, r === m.end ? 2 : diff)), cells = [];
        for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (m.c[y * m.w + x] === '.' && Math.hypot(x - r.cx, y - r.cy) > 1) cells.push([x, y]);
        U.shuffle(cells);
        names.forEach((n, i) => { const p = cells[i % Math.max(1, cells.length)] || [r.cx, r.cy]; F().spawnMon(rt, f.floor, { n, ...G.D.F.mon[n] }, p[0], p[1], false, { major: true }); });
      }
    },
    // 끝까지 왔나 (F.nextFloor)
    done(f, reg) { return f.floor - (f.runStart || f.floor) + 1 >= reg.len; },
  };
  return R;
})();
