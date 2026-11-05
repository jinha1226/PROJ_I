'use strict';
// The Astral Tower (Doomed Zone, CC0 원작 글): 지도 구성을 격자로 옮겨 우리 타일로 그린다. 원본 지도 그림은 쓰지 않는다 (data/scenarios/astral_tower)
// 격자: 벽선을 칸으로. 1칸 = 5피트. 지하 동굴만 원본이 커서 2칸을 1칸으로 줄였다
// 층 순서는 F1 → F2 → F3 → F4 → B1. 실제 계단은 4번 방에서 위아래로 갈라지지만 게임 층이 한 줄이라 순서로 폈다
G.Scn = (() => {
  const D = G.D, F = () => G.Fantasy, U = G.U;
  // 방: id, 이름, 사각형들 [x0, y0, x1, y1] (벽선 포함), 태그
  const FLOORS = [
    { id: 'F1', w: 42, h: 42, start: ['R01', 15, 34], end: ['R04S', 15, 16], rooms: [
      ['R01', '대전당', [[9, 22, 21, 40]], ['hall']], ['R02', '식료품 창고', [[3, 27, 9, 33]], ['storage']], ['R03', '주방', [[0, 21, 9, 27]], ['kitchen']], ['R04', '1층 계단 복도', [[9, 10, 21, 22]], ['hall']], ['R04S', '안쪽 계단', [[11, 12, 19, 20]], ['stairs']], ['R05', '도서관', [[21, 10, 40, 22]], ['library']], ['R06', '옆문 복도', [[0, 10, 9, 21]], ['hall']], ['R07', '경비실 금고', [[5, 12, 9, 19]], ['vault']], ['R08', '제자의 침실', [[0, 4, 5, 10]], ['bedroom']], ['R09', '경비 침실', [[5, 4, 9, 10]], ['bedroom']], ['R10', '사육실', [[9, 4, 15, 10]], ['lab']], ['R11', '수목원', [[9, 0, 18, 4], [15, 3, 18, 10]], ['garden']], ['RC1', '좁은 복도', [[18, 0, 20, 10]], ['hall']], ['R12', '프리즘 작업실', [[20, 5, 23, 10], [22, 6, 26, 10]], ['lab']], ['R13', '약제실', [[20, 0, 26, 5], [22, 4, 26, 6]], ['lab']],
    ], doors: [[12, 22], [19, 22], [9, 25], [9, 30], [8, 27], [4, 21], [9, 11], [9, 20], [5, 16], [3, 10], [7, 10], [21, 16], [21, 11], [21, 21], [13, 10], [19, 10], [18, 8], [20, 8], [20, 3], [15, 12], [15, 20]], pillars: [[24, 14], [28, 14], [32, 14], [36, 14], [24, 17], [24, 19], [28, 19], [32, 19], [36, 19], ...[24, 27, 30, 33, 36].flatMap(y => [[12, y], [18, y]])] },
    { id: 'F2', w: 40, h: 42, start: ['R14', 10, 16], end: ['R14S', 15, 16], rooms: [
      ['R14', '2층 계단 복도', [[9, 10, 21, 22]], ['hall']], ['R14S', '안쪽 계단', [[11, 12, 19, 20]], ['stairs']], ['RH2', '서쪽 복도', [[4, 10, 9, 21]], ['hall']], ['R15', '물품 창고', [[6, 17, 9, 20]], ['storage']], ['R16', '하인 숙소', [[6, 12, 9, 17]], ['bedroom']], ['R17', '서재', [[0, 21, 9, 27]], ['study']], ['R18', '약초실', [[0, 15, 4, 21]], ['lab']], ['R19', '성유물실', [[0, 10, 4, 15]], ['crypt']], ['R20', '호화 침실', [[0, 4, 9, 10]], ['bedroom']], ['R21', '비전 서고', [[9, 0, 26, 10]], ['library']], ['R05U', '도서관 위층', [[21, 11, 38, 21]], ['library']], ['R01L', '서쪽 회랑', [[9, 22, 11, 40]], ['hall']], ['R01R', '동쪽 회랑', [[19, 22, 21, 40]], ['hall']],
    ], doors: [[11, 16], [19, 16], [9, 11], [9, 20], [9, 14], [6, 18], [6, 10], [6, 21], [4, 12], [4, 18], [10, 22], [20, 22], [21, 16], [9, 7]], pillars: [[12, 3], [24, 3], [12, 7], [24, 7]], secret: [[9, 7]], locked: [[4, 12]] },
    { id: 'F3', w: 17, h: 17, start: ['R22R', 2, 8], end: ['R22E', 14, 8], disc: { cx: 8, cy: 8, r: 7, inner: 3 }, rooms: [['R22R', '계단', [[1, 1, 15, 15]], ['stairs']], ['R22', '폭풍의 방', [[5, 5, 11, 11]], ['elemental']], ['R22E', '위층 계단', [[13, 7, 15, 9]], ['stairs']]], doors: [[11, 8]] },
    { id: 'F4', w: 17, h: 17, start: ['R23S', 2, 8], end: ['R23E', 14, 8], disc: { cx: 8, cy: 8, r: 7 }, rooms: [['R23S', '계단', [[1, 7, 3, 9]], ['stairs']], ['R23', '관측소', [[3, 3, 13, 13]], ['observatory']], ['R23E', '내려가는 계단', [[13, 7, 15, 9]], ['stairs']]], doors: [] },
    { id: 'B1', w: 30, h: 48, start: ['R24', 20, 37], end: ['R25', 13, 3], rooms: [['R25', '수정 동굴', [[8, 1, 18, 11]], ['cave']], ['RB1', '굽은 통로', [[7, 10, 11, 22], [7, 17, 22, 23], [15, 20, 21, 30]], ['cave']], ['R24', '지진의 방', [[12, 29, 27, 45]], ['elemental', 'cave']], ['R26', '이계 식물 동굴', [[1, 34, 13, 43]], ['cave']]], doors: [[12, 38]], pool: [[7, 37, 8, 39]] },
  ];
  const build = (i) => {
    const d = FLOORS[i], w = d.w, h = d.h, c = new Array(w * h).fill('#'), ix = (x, y) => y * w + x, cut = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h) c[ix(x, y)] = '.'; };
    if (d.disc) { const q = d.disc; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const r0 = Math.hypot(x - q.cx, y - q.cy); if (r0 <= q.r - 0.5) c[ix(x, y)] = '.'; } if (q.inner) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const r0 = Math.hypot(x - q.cx, y - q.cy); if (r0 <= q.inner + 0.5 && r0 > q.inner - 0.5) c[ix(x, y)] = '#'; } }
    const rooms = d.rooms.map(([id, title, rects, tags]) => { if (!d.disc) for (const [x0, y0, x1, y1] of rects) for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) cut(x, y); const x = Math.min(...rects.map(r => r[0])) + 1, y = Math.min(...rects.map(r => r[1])) + 1, X = Math.max(...rects.map(r => r[2])), Y = Math.max(...rects.map(r => r[3])); return { id, title, x, y, w: X - x, h: Y - y, cx: (x + X - 1) >> 1, cy: (y + Y - 1) >> 1, tags: tags.slice(), shape: 'room' }; });
    if (d.id === 'F1' || d.id === 'F2') { for (let y = 12; y <= 20; y++) for (let x = 11; x <= 19; x++) { const edge = x === 11 || x === 19 || y === 12 || y === 20; c[ix(x, y)] = edge ? '#' : '.'; } }
    if (d.id === 'F1') { for (let x = 22; x <= 38; x++) if ((x - 22) % 5 < 4) { c[ix(x, 12)] = '#'; c[ix(x, 20)] = '#'; } for (const [x, y] of [[5, 11]]) c[ix(x, y)] = '.'; }
    if (d.id === 'F2') { for (let y = 23; y < 40; y++) for (let x = 11; x <= 19; x++) c[ix(x, y)] = '#'; }
    for (const [x, y] of d.pillars || []) c[ix(x, y)] = '#';
    for (const [x, y] of d.doors) cut(x, y);
    for (const [x0, y0, x1, y1] of d.pool || []) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) c[ix(x, y)] = '~';
    const byId = id => rooms.find(r => r.id === id), start = byId(d.start[0]), end = byId(d.end[0]);
    Object.assign(start, { cx: d.start[1], cy: d.start[2] }); Object.assign(end, { cx: d.end[1], cy: d.end[2] }); cut(start.cx, start.cy); cut(end.cx, end.cy); c[ix(end.cx, end.cy)] = '>';
    return { w, h, c, kindAt: new Uint8Array(w * h), poi: {}, passChars: '.>,', ver: 1, dist: {}, rooms: [start, ...rooms.filter(r => r !== start && r !== end), end], start, end, fixed: true, scn: d.id, secret: d.secret || [], locked: d.locked || [] };
  };
  // 원문 몬스터 → SRD 몬스터 (adaptation.json)
  const MON = { '움직이는 갑옷': ['animated-armor', 'm_golem', 'construct'], '스터지': ['stirge', 'm_bat', 'beast'], '거대 쥐': ['giant-rat', 'm_rat', 'beast'], '도깨비불': ['will-o-wisp', 'm_phantom', 'undead'], '거대 거미': ['giant-spider', 'm_spider', 'beast'], '유령': ['ghost', 'm_phantom', 'undead'], '도플갱어': ['doppelganger', 'm_ghoul', 'humanoid'], '로크': ['roc', 'm_bat', 'beast'], '가고일': ['gargoyle', 'm_golem', 'construct'], '아스트랄 덴드론': ['awakened-tree', 'm_mandrake', 'plant'], '아스트랄 버섯': ['violet-fungus', 'm_shroom', 'plant'] };
  for (const n in MON) { const [st, t, ty] = MON[n]; if (!G.SRD_MON[st]) continue; D.F.mon[n] = { t, ty, r: 'brute' }; D.F.STAT[n] = [st]; }
  const dice = (a, b) => { let s = 0; for (let i = 0; i < a; i++) s += 1 + U.rand(b); return s; };
  // 원문 조우표 (쓰러뜨릴 것만: 빗자루 · 패밀리어 · 유령은 처음엔 싸우지 않는다)
  const TOWER = [['진흙 점액', 1], ['움직이는 갑옷', 1], ['스터지', () => dice(2, 4)], ['거대 쥐', () => dice(1, 6)], ['도깨비불', 1], ['거대 거미', () => dice(1, 6)], ['도플갱어', 1]];
  const ASTEROID = [['아스트랄 덴드론', 1], ['아스트랄 버섯', () => dice(1, 4)], ['스터지', () => dice(2, 4)], ['해골', () => dice(1, 6)]];
  const FIXED = { F2: [['R18', '아스트랄 덴드론', 1], ['R21', '미믹', 1]], B1: [['R26', '아스트랄 덴드론', 6], ['R26', '아스트랄 버섯', 5]] };
  const LOOT = { F1: [['R07', 2]], F2: [['R21', 1]], F4: [['R23', 1]] };
  const put = (f, rt, r, n, cnt) => { const m = rt.map, cells = []; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (m.c[y * m.w + x] === '.' && Math.hypot(x - r.cx, y - r.cy) > 1) cells.push([x, y]); U.shuffle(cells); for (let i = 0; i < cnt; i++) { const p = cells[i % Math.max(1, cells.length)] || [r.cx, r.cy]; F().spawnMon(rt, f.floor, { n, ...D.F.mon[n] }, p[0], p[1], false, { major: true }); } };
  const Scn = {
    FLOORS, build,
    idx: f => Math.max(0, f.floor - (f.runStart || f.floor)),
    stage(f, rt) {
      const m = rt.map, rooms = m.rooms.filter(r => r !== m.start && r !== m.end && !r.tags.includes('stairs')), id = m.scn;
      for (const [rid, n, cnt] of FIXED[id] || []) { const r = m.rooms.find(q => q.id === rid); if (r && D.F.mon[n]) put(f, rt, r, n, cnt); }
      const T = id === 'B1' ? ASTEROID : TOWER, free = U.shuffle(rooms.filter(r => !(FIXED[id] || []).some(q => q[0] === r.id))).slice(0, id === 'F1' ? 3 : 2);
      for (const r of free) { const [n, c] = U.pick(T.filter(q => D.F.mon[q[0]])); put(f, rt, r, n, typeof c === 'function' ? c() : c); }
      for (const [rid, cnt] of LOOT[id] || []) { const r = m.rooms.find(q => q.id === rid); if (!r) continue; for (let i = 0; i < cnt; i++) rt.chests.push({ kind: 'obj', chest: true, t: 'x_chest', x: r.cx + i, y: r.cy, s: 0.9 }); }
    },
  };
  G.Region.REGIONS.astral = { n: '아스트랄 타워', len: FLOORS.length, gen: (w, h, rng, f) => build(Math.min(FLOORS.length - 1, Scn.idx(f))), stage: Scn.stage, note: '', pool: ['스터지', '거대 쥐', '움직이는 갑옷', '거대 거미'].filter(n => D.F.mon[n]) };
  return Scn;
})();
