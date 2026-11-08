'use strict';
// The Astral Tower (Doomed Zone, CC0 원작 글): 지도 구성을 격자로 옮겨 우리 타일로 그린다. 원본 지도 그림은 쓰지 않는다 (data/scenarios/astral_tower)
// 격자: 벽선을 칸으로. 1칸 = 5피트. 지하 동굴만 원본이 커서 2칸을 1칸으로 줄였다
// 다섯 구역(F1 · F2 · F3 · F4 · B1)을 한 층에 놓고 계단으로 오간다: 원작처럼 위아래로 갈라지고 돌아갈 수 있다. 탈출은 비전 서고의 전송 원
G.Scn = (() => {
  const D = G.D, F = () => G.Fantasy, U = G.U;
  // 방: id, 이름, 사각형들 [x0, y0, x1, y1] (벽선 포함), 태그
  const FLOORS = [
    { id: 'F1', w: 42, h: 42, ox: 1, oy: 1, stair: [15, 16], start: ['R01', 15, 34], rooms: [
      ['R01', '대전당', [[9, 22, 21, 40]], ['hall']], ['R02', '식료품 창고', [[3, 27, 9, 33]], ['storage']], ['R03', '주방', [[0, 21, 9, 27]], ['kitchen']], ['R04', '1층 계단 복도', [[9, 10, 21, 22]], ['hall']], ['R04S', '안쪽 계단', [[11, 12, 19, 20]], ['stairs']], ['R05', '도서관', [[21, 10, 40, 22]], ['library']], ['R06', '옆문 복도', [[0, 10, 9, 21]], ['hall']], ['R07', '경비실', [[5, 12, 9, 16]], ['vault']], ['R07V', '금고', [[5, 16, 9, 19]], ['vault']], ['R08', '제자의 침실', [[0, 4, 5, 10]], ['bedroom']], ['R09', '경비 침실', [[5, 4, 9, 10]], ['bedroom']], ['R10', '사육실', [[9, 4, 15, 10]], ['lab']], ['R11', '수목원', [[9, 0, 18, 4], [15, 3, 18, 10]], ['garden']], ['RC1', '좁은 복도', [[18, 0, 20, 10]], ['hall']], ['R12', '프리즘 작업실', [[20, 5, 23, 10], [22, 6, 26, 10]], ['lab']], ['R13', '약제실', [[20, 0, 26, 5], [22, 4, 26, 6]], ['lab']],
    ], doors: [[12, 22], [19, 22], [9, 25], [9, 30], [8, 27], [4, 21], [9, 11], [9, 20], [5, 14], [3, 10], [7, 10], [21, 16], [21, 11], [21, 21], [13, 10], [19, 10], [18, 8], [20, 8], [20, 3], [15, 12], [15, 20]], pillars: [[24, 14], [28, 14], [32, 14], [36, 14], [24, 17], [24, 19], [28, 19], [32, 19], [36, 19], ...[24, 27, 30, 33, 36].flatMap(y => [[12, y], [18, y]])] },
    { id: 'F2', w: 40, h: 42, ox: 45, oy: 1, stair: [15, 16], end: ['R21', 24, 2], rooms: [
      ['R14', '2층 계단 복도', [[9, 10, 21, 22]], ['hall']], ['R14S', '안쪽 계단', [[11, 12, 19, 20]], ['stairs']], ['RH2', '서쪽 복도', [[4, 10, 9, 21]], ['hall']], ['R15', '물품 창고', [[6, 17, 9, 19]], ['storage']], ['R16', '하인 숙소', [[6, 12, 9, 17]], ['bedroom']], ['R17', '서재', [[0, 21, 9, 27]], ['study']], ['R18', '약초실', [[0, 15, 4, 21]], ['lab']], ['R19', '성유물실', [[0, 10, 4, 15]], ['crypt']], ['R20', '호화 침실', [[0, 4, 9, 10]], ['bedroom']], ['R21', '비전 서고', [[9, 0, 26, 10]], ['library']], ['R05U', '도서관 위층', [[21, 11, 38, 21]], ['library']], ['R01L', '서쪽 회랑', [[9, 22, 11, 40]], ['hall']], ['R01R', '동쪽 회랑', [[19, 22, 21, 40]], ['hall']],
    ], doors: [[11, 16], [19, 16], [9, 11], [9, 20], [9, 14], [6, 18], [6, 10], [6, 21], [4, 12], [4, 18], [10, 22], [20, 22], [21, 16], [9, 7]], pillars: [[12, 3], [24, 3], [12, 7], [24, 7]], secret: [[9, 7]], locked: [[4, 12]] },
    { id: 'F3', w: 17, h: 17, ox: 87, oy: 1, stair: [2, 8], disc: { cx: 8, cy: 8, r: 7, inner: 3 }, rooms: [['R22R', '계단', [[1, 1, 15, 15]], ['stairs']], ['R22', '폭풍의 방', [[5, 5, 11, 11]], ['elemental']]], doors: [[11, 8]] },
    { id: 'F4', w: 17, h: 17, ox: 87, oy: 22, stair: [2, 8], disc: { cx: 8, cy: 8, r: 7 }, rooms: [['R23', '관측소', [[1, 1, 15, 15]], ['observatory']]], doors: [] },
    { id: 'B1', w: 30, h: 48, ox: 45, oy: 45, stair: [20, 37], rooms: [['R25', '수정 동굴', [[8, 1, 18, 11]], ['cave']], ['RB1', '굽은 통로', [[7, 10, 11, 22], [7, 17, 22, 23], [15, 20, 21, 30]], ['cave']], ['R24', '지진의 방', [[12, 29, 27, 45]], ['elemental', 'cave']], ['R26', '이계 식물 동굴', [[1, 34, 13, 43]], ['cave']]], doors: [[12, 38]], pool: [[3, 37, 4, 39]] },
  ];
  const LINKS = [['F1', 'F2'], ['F2', 'F3'], ['F3', 'F4'], ['F1', 'B1']], OW = 106, OH = 95;
  const build = () => {
    const w = OW, h = OH, c = new Array(w * h).fill('#'), ix = (x, y) => y * w + x, rooms = [], stairs = {}; let start = null, end = null; const doors = [], locks = [];
    for (const d of FLOORS) {
      const O = (x, y) => ix(x + d.ox, y + d.oy), cut = (x, y) => { if (x >= 0 && y >= 0 && x < d.w && y < d.h) c[O(x, y)] = '.'; }, wall = (x, y) => { c[O(x, y)] = '#'; };
      if (d.disc) { const q = d.disc; for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) { const r0 = Math.hypot(x - q.cx, y - q.cy); if (r0 <= q.r - 0.5) cut(x, y); } if (q.inner) for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) { const r0 = Math.hypot(x - q.cx, y - q.cy); if (r0 <= q.inner + 0.5 && r0 > q.inner - 0.5) wall(x, y); } }
      for (const [id, title, rects, tags] of d.rooms) { if (!d.disc) for (const [x0, y0, x1, y1] of rects) for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) cut(x, y); const x = Math.min(...rects.map(r => r[0])) + 1, y = Math.min(...rects.map(r => r[1])) + 1, X = Math.max(...rects.map(r => r[2])), Y = Math.max(...rects.map(r => r[3])); rooms.push({ id, title, zone: d.id, x: x + d.ox, y: y + d.oy, w: X - x, h: Y - y, cx: ((x + X - 1) >> 1) + d.ox, cy: ((y + Y - 1) >> 1) + d.oy, tags: tags.slice(), shape: 'room' }); }
      if (d.id === 'F1' || d.id === 'F2') for (let y = 12; y <= 20; y++) for (let x = 11; x <= 19; x++) (x === 11 || x === 19 || y === 12 || y === 20 ? wall : cut)(x, y);
      if (d.id === 'F1') { for (let x = 22; x <= 38; x++) if ((x - 22) % 5 < 4) { wall(x, 12); wall(x, 20); } for (let x = 5; x <= 9; x++) { wall(x, 12); wall(x, 16); wall(x, 19); } for (let y = 12; y <= 19; y++) wall(5, y); }
      if (d.id === 'F2') { for (let y = 23; y < 40; y++) for (let x = 11; x <= 19; x++) wall(x, y); for (let x = 6; x <= 9; x++) { wall(x, 12); wall(x, 17); wall(x, 19); } for (let y = 12; y <= 19; y++) wall(6, y); }
      for (const [x, y] of d.pillars || []) wall(x, y);
      for (const [x, y] of d.doors) cut(x, y);
      for (const [x0, y0, x1, y1] of d.pool || []) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) c[O(x, y)] = '~';
      stairs[d.id] = { x: d.stair[0] + d.ox, y: d.stair[1] + d.oy }; c[ix(stairs[d.id].x, stairs[d.id].y)] = '.';
      if (d.start) { start = rooms.find(r => r.id === d.start[0]); start.cx = d.start[1] + d.ox; start.cy = d.start[2] + d.oy; }
      if (d.end) { end = rooms.find(r => r.id === d.end[0]); end.cx = d.end[1] + d.ox; end.cy = d.end[2] + d.oy; }
      if (d.id === 'F1') locks.push({ x: 7 + d.ox, y: 16 + d.oy, needs: 'vaultKey', n: '금고 철창' });
      if (d.id === 'F2') { locks.push({ x: 4 + d.ox, y: 12 + d.oy, needs: 'reliqKey', n: '성유물실 문' }, { x: 9 + d.ox, y: 7 + d.oy, needs: 'secret', n: '벽난로 뒤' }); }
    }
    for (const q of locks) c[ix(q.x, q.y)] = '#';
    // 방 가운데가 벽이면 가장 가까운 바닥으로
    for (const r of rooms) { if (c[ix(r.cx, r.cy)] === '.') continue; let b = null, bd = 1e9; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (c[ix(x, y)] === '.') { const q = Math.hypot(x - r.cx, y - r.cy); if (q < bd) { bd = q; b = [x, y]; } } if (b) { r.cx = b[0]; r.cy = b[1]; } }
    c[ix(end.cx, end.cy)] = '>';
    return { w, h, c, kindAt: new Uint8Array(w * h), poi: {}, passChars: '.>,', ver: 1, dist: {}, rooms: [start, ...rooms.filter(r => r !== start && r !== end), end], start, end, fixed: true, scn: 'astral', stairs, locks };
  };
  // 원문 몬스터 → SRD 몬스터 (adaptation.json)
  const MON = { '움직이는 갑옷': ['animated-armor', 'm_golem', 'construct'], '스터지': ['stirge', 'm_bat', 'beast'], '거대 쥐': ['giant-rat', 'm_rat', 'beast'], '도깨비불': ['will-o-wisp', 'm_phantom', 'undead'], '거대 거미': ['giant-spider', 'm_spider', 'beast'], '유령': ['ghost', 'm_phantom', 'undead'], '도플갱어': ['doppelganger', 'm_ghoul', 'humanoid'], '로크': ['roc', 'm_bat', 'beast'], '가고일': ['gargoyle', 'm_golem', 'construct'], '각성한 나무': ['awakened-tree', 'm_mandrake', 'plant'], '보라 버섯': ['violet-fungus', 'm_shroom', 'plant'] };
  for (const n in MON) { const [st, t, ty] = MON[n]; if (!G.SRD_MON[st]) continue; D.F.mon[n] = { t, ty, r: 'brute' }; D.F.STAT[n] = [st]; }
  const dice = (a, b) => { let s = 0; for (let i = 0; i < a; i++) s += 1 + U.rand(b); return s; };
  // 원문 조우표 (쓰러뜨릴 것만: 빗자루 · 패밀리어 · 유령은 처음엔 싸우지 않는다)
  const TOWER = [['블랙 푸딩', 1], ['움직이는 갑옷', 1], ['스터지', () => dice(2, 4)], ['거대 쥐', () => dice(1, 6)], ['도깨비불', 1], ['거대 거미', () => dice(1, 6)], ['도플갱어', 1]];
  const ASTEROID = [['각성한 나무', 1], ['보라 버섯', () => dice(1, 4)], ['스터지', () => dice(2, 4)], ['해골', () => dice(1, 6)]];
  const FIXED = { R18: [['각성한 나무', 1]], R21: [['미믹', 1]], R26: [['각성한 나무', 6], ['보라 버섯', 5]] };
  const LOOT = { R07V: 2, R21: 1, R23: 1 };
  const put = (f, rt, r, n, cnt) => { const m = rt.map, cells = [], from = G.Grid.field(m, r.cx, r.cy); /* 겹친 방의 벽 너머에는 두지 않는다 */ for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (m.c[y * m.w + x] === '.' && from[y * m.w + x] >= 0 && Math.hypot(x - r.cx, y - r.cy) > 1) cells.push([x, y]); U.shuffle(cells); for (let i = 0; i < cnt; i++) { const p = cells[i % Math.max(1, cells.length)] || [r.cx, r.cy]; F().spawnMon(rt, f.floor, { n, ...D.F.mon[n] }, p[0], p[1], false, { major: true }); } };
  // 방에 들어서면: 물건 · 단서 (원문 astral_tower.normalized.json)
  const GOT = {
    R09: { dm: '탁자 위 경비 기록: 금고 열쇠를 관측소에 두었다.', fact: 'keyLoc' }, R23: { dm: '종이 더미 아래에서 금고 열쇠를 찾았다.', item: 'vaultKey' }, R07V: { dm: '금고 안에 성유물실 열쇠가 있다.', item: 'reliqKey', gold: 8 }, R18: { dm: '연구 기록: 제자가 이계 식물 동굴로 돌아갔다.', fact: 'cavern' }, R08: { dm: '제자의 책장에 찢긴 연구 기록과 망가진 주문 두루마리가 있다.' }, R26: { dm: '제자의 유골 곁에 일지가 있다. 전송 원 쓰는 법이 적혀 있다.', fact: 'ritual' }, R20: { dm: '벽난로에 긁힌 자국이 있다. 뒤쪽이 밀린다.', item: 'secret' }, R02: { dm: '봉인된 소금 돼지고기 두 통은 아직 먹을 만하다.', heal: 0.1 }, R03: { dm: '물통 두 개가 멀쩡하다.', heal: 0.05 }, R11: { dm: '과일이 열려 있다. 하루면 다시 맺힌다.', heal: 0.1 }, R05: { dm: '책 9,900권. 옮길 수 있는 무게가 아니다.', gold: 4 }, R19: { dm: '평온한 기운이 감돈다. 조각상과 관을 건드리지 않고 쉬었다.', rest: true }, R21: { dm: '바닥에 분필로 그린 원이 있다.' }, R13: { dm: '약을 달일 도구와 재료가 남아 있다.' },
  };
  // 비적대 조우 (원문 조우표): 싸우지 않는다. 패밀리어가 아는 것은 원문에 없어 전송 원 사용법으로 정했다 (단서 대체 경로)
  const MEET = [{ dm: '빗자루가 혼자 먼지를 쓸고 있다. 우리를 신경 쓰지 않는다.' }, { dm: '옛 하인의 유령이 중얼거리며 지나간다.' }, { dm: '묶여 있던 작은 임프를 풀어 주자, 서고의 원을 쓰는 법을 알려 주었다.', fact: 'ritual', p: 0.34 }];
  const WORLD = { R22: { key: 'air', title: '공기 정령의 봉인', mon: '공기 정령', steps: () => (dice(1, 4) + 1) * 3, stages: ['공기가 탁해진다.', '숨쉬기가 힘들다.', '숨을 쉴 수 없다!'] }, R24: { key: 'earth', title: '대지 정령의 사슬', mon: '대지 정령', steps: () => 4, stages: ['몸이 가벼워지고 바람이 빠져나간다.', '숨이 차고 기온이 떨어진다.', '대기가 거의 사라졌다!'] } };
  const HAZ = { R12: { d: 4 }, R25: { d: 8 } };
  D.F.mon['공기 정령'] = { t: 'm_phantom', ty: 'elemental', r: 'brute' }; D.F.STAT['공기 정령'] = ['air-elemental']; D.F.mon['대지 정령'] = { t: 'm_golem', ty: 'elemental', r: 'brute' }; D.F.STAT['대지 정령'] = ['earth-elemental'];
  const st = rt => rt.scnS || (rt.scnS = { has: {}, clocks: [], haz: 0, hazIn: null, meet: 0 });
  const dm = (rt, s) => { if (!G.quiet) G.Turn.dm(rt, s); };
  const openLocks = (rt) => { const m = rt.map, S = st(rt); let ch = false; for (const q of m.locks) if (!q.open && S.has[q.needs]) { q.open = true; m.c[q.y * m.w + q.x] = '.'; ch = true; dm(rt, `${q.n}이(가) 열렸다.`); } if (ch) { m.ver++; m.dist = {}; m.redraw = true; } };
  const zoneOf = (rt, e) => { const m = rt.map; for (const d of FLOORS) if (e.x >= d.ox && e.x < d.ox + d.w && e.y >= d.oy && e.y < d.oy + d.h) return d.id; return 'F1'; };
  const hop = (a, b) => { const q = [[a]], seen = new Set([a]); while (q.length) { const p = q.shift(), l = p[p.length - 1]; if (l === b) return p; for (const [u, v] of LINKS) for (const n of l === u ? [v] : l === v ? [u] : []) if (!seen.has(n)) { seen.add(n); q.push([...p, n]); } } return [a]; };
  const Scn = {
    FLOORS, build, GOT, WORLD, zoneOf, hop, st,
    stage(f, rt) {
      const m = rt.map; rt.scnS = null;
      for (const r of m.rooms) for (const [n, cnt] of FIXED[r.id] || []) if (D.F.mon[n]) put(f, rt, r, n, cnt);
      for (const r of U.shuffle(m.rooms.filter(q => !FIXED[q.id] && q.zone !== 'B1' && q !== m.start && !q.tags.includes('stairs') && !WORLD[q.id] && !['R19', 'R07V'].includes(q.id))).slice(0, 5)) { const [n, c] = U.pick(TOWER.filter(q => D.F.mon[q[0]])); put(f, rt, r, n, typeof c === 'function' ? c() : c); }
      const b = m.rooms.find(q => q.id === 'RB1'); if (b) { const [n, c] = U.pick(ASTEROID.filter(q => D.F.mon[q[0]])); put(f, rt, b, n, typeof c === 'function' ? c() : c); }
      for (const r of m.rooms) for (let i = 0; i < (LOOT[r.id] || 0); i++) rt.chests.push({ kind: 'obj', chest: true, t: 'x_chest', x: r.cx + i, y: r.cy, s: 0.9 });
      rt.chests = rt.chests.filter(c => m.rooms.some(r => LOOT[r.id] && F().inRoom(r, c)));
      for (const r of m.rooms) r.evSlot = r !== m.start && r !== m.end;
    },
    // 방에 들어섬
    enter(f, rt, r) {
      const S = st(rt), g = GOT[r.id];
      for (const c of S.clocks) { c.left--; const i = c.left <= 0 ? 2 : c.left <= c.max / 2 ? 1 : 0; if (i !== c.i) { c.i = i; dm(rt, c.stages[i]); } if (c.left <= 0) for (const p of rt.party) if (!p.dead && p.merc) { /* 호흡 불가 (시나리오) → 질식 (SRD Suffocation): 1 + 건강 수정치 분(최소 30초)만큼 숨을 참고, 그 뒤로는 시간이 흐를 때마다 탈진 1단계. 방 하나 = 한 단위 */ if (p.breath == null) p.breath = Math.max(1, 1 + G.Dnd.mod(G.Dnd.ab(p.merc).con)); if (p.breath > 0) p.breath--; else G.Dnd.addExh(f, rt, p, 1, 'suffoc'); } }
      if (g && !r.scnDone) { r.scnDone = true; dm(rt, g.dm); if (g.item) S.has[g.item] = true; if (g.fact) S.has[g.fact] = true; if (g.gold) { F().gain(f, F().monGold(f.floor) * g.gold); } if (g.heal) for (const p of rt.party) if (!p.dead) p.hp = Math.min(p.max, p.hp + p.max * g.heal); if (g.rest) G.Res.shortRest(rt, rt.party.filter(p => p.merc && !p.dead)); openLocks(rt); }
      if (r.id === 'R26') for (const p of rt.party) if (!p.dead && p.merc && !G.Dnd.save(p, 'wis', 12)) G.Dnd.buff(p, 'daze', G.Res_ROUND * (1 + U.rand(4)), {});
      if (!r.scnMeet && !FIXED[r.id] && !g && r.zone !== 'B1' && S.meet < 3 && Math.random() < 0.3) { r.scnMeet = true; const q = MEET[S.meet]; S.meet++; if (!q.p || Math.random() < 1) { dm(rt, q.dm); if (q.fact) S.has[q.fact] = true; } }
      const W = WORLD[r.id]; if (W && !S.has[W.key] && !r.scnAsk) { r.scnAsk = true; const free = i => { if (i !== 1) return; S.has[W.key] = true; const n = W.steps(); S.clocks.push({ left: n, max: n, i: -1, stages: W.stages }); put(f, rt, r, W.mon, 1); dm(rt, `${W.mon}이(가) 풀려났다!`); }; G.Story.ask(f, rt, W.title, [{ label: '그대로 둔다', sub: '' }, { label: '풀어 준다', sub: '' }], 0, free); }
    },
    // 프레임마다: 위험 지형 (들어간 뒤 첫 라운드 뒤부터 라운드마다)
    frame(f, rt, dt) {
      if (rt.map.scn !== 'astral' || !rt.party?.length) return; const S = st(rt), lead = rt.party.find(p => !p.dead) || rt.hero, r = rt.map.rooms.find(q => HAZ[q.id] && F().inRoom(q, lead));
      if (r !== S.hazIn) { S.hazIn = r; S.haz = G.Res_ROUND; if (r) dm(rt, '따뜻한 기운이 몸을 파고든다.'); } if (!r) return;
      S.haz -= (rt.gdt ?? dt); if (S.haz <= 0) { S.haz = G.Res_ROUND; for (const p of rt.party) if (!p.dead && p.merc && F().inRoom(r, p)) G.Event.hit(f, rt, p, 1 + U.rand(HAZ[r.id].d)); }
    },
    // 다음 갈 곳: 다른 구역이면 계단으로 가서 옮긴다. 닿을 수 없는 방은 안 간다. 탈출은 사용법을 알아야
    // 지금 갈 수 있는 방인가 (잠긴 방 · 비밀문 뒤는 아니다). 구역마다 계단에서 잰다
    reachable(rt, r, lead) { const m = rt.map, s0 = m.stairs[r.zone], d = G.Grid.field(m, s0.x, s0.y); return d[r.cy * m.w + r.cx] >= 0; },
    route(f, rt, lead) {
      const m = rt.map;
      for (const r of m.rooms) if (!r.scnSeen && this.inside(rt, r, lead)) { r.scnSeen = true; this.enter(f, rt, r); }
      for (const r of m.rooms) if (r !== m.start && r !== m.end) r.evSlot = !r.scnSeen;
      m.end.evSlot = false;
      return null;
    },
    // 그 방이 다른 구역이면 계단까지 걷고, 도착하면 파티를 옮긴다. true면 이번 프레임 이동을 대신했다
    walk(f, rt, lead, tgt, speed, dt) {
      const z = zoneOf(rt, lead), z2 = zoneOf(rt, { x: tgt.cx, y: tgt.cy }); if (z === z2) return false;
      const m = rt.map, path = hop(z, z2), s0 = m.stairs[z], s1 = m.stairs[path[1]];
      if (G.Grid.moveTo(m, lead, s0.x, s0.y, speed, dt, 0.5)) { rt.party.forEach((p, i) => { if (p.dead) return; p.x = s1.x + (i % 3) - 1 * (m.c[s1.y * m.w + s1.x + ((i % 3) - 1)] === '.' ? 1 : 0) * 1; p.y = s1.y; if (m.c[Math.round(p.y) * m.w + Math.round(p.x)] !== '.') { p.x = s1.x; p.y = s1.y; } }); dm(rt, path[1] === 'B1' ? '계단을 내려간다.' : path[0] === 'B1' ? '계단을 올라간다.' : FLOORS.findIndex(q => q.id === path[1]) > FLOORS.findIndex(q => q.id === z) ? '계단을 올라간다.' : '계단을 내려간다.'); G.Sight.update(rt); }
      return true;
    },
    // 벽 너머 방에 들어선 것으로 치지 않는다: 칸이 방 안이고 길이 있어야
    inside(rt, r, e) { const m = rt.map, x = Math.round(e.x), y = Math.round(e.y); if (x < r.x || x >= r.x + r.w || y < r.y || y >= r.y + r.h) return false; const d = G.Grid.field(m, x, y); return d[r.cy * m.w + r.cx] >= 0; },
    // 그 칸에 길이 있나 (잠긴 금고의 상자는 아직 못 연다)
    open(rt, c) { const m = rt.map, s0 = m.stairs[zoneOf(rt, c)]; return G.Grid.field(m, s0.x, s0.y)[Math.round(c.y) * m.w + Math.round(c.x)] >= 0; },
    canExit: rt => !!st(rt).has.ritual,
  };
  G.Region.REGIONS.astral = { n: '아스트랄 타워', len: 1, gen: () => build(), stage: Scn.stage, note: '', pool: ['스터지', '거대 쥐', '움직이는 갑옷', '거대 거미'].filter(n => D.F.mon[n]) };
  return Scn;
})();
