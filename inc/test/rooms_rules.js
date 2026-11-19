'use strict';
// 손으로 짠 방 (js/explore/rooms.js) 검사: node test/rooms_rules.js
// 크기 · 문 자리 · 연결 · 몬스터 자리 · 적 이름, 생성기의 방 바꾸기(fromTemplate), 쿼터뷰 지도 바꾸기(장애물 'o' · 물 '~')
const fs = require('fs'), vm = require('vm'), path = require('path'), LOAD = require('./_load.js');
let ok = 0, bad = 0; const t = (name, v, extra = '') => { if (v) ok++; else { bad++; console.log('  실패:', name, extra); } };
const ctx = { console, Math, JSON, G: {} }; vm.createContext(ctx);
for (const n of ['run/core', 'run/data', 'run/rooms', 'run/combat', 'run/gen', 'run/rules', 'run/layout']) vm.runInContext(fs.readFileSync(LOAD.jsPath(n), 'utf8'), ctx, { filename: n });
vm.runInContext(fs.readFileSync(path.join(LOAD.ROOT, 'js/game/floor.js'), 'utf8'), ctx, { filename: 'floor.js' });
const R = ctx.RUN, K = R.ROOM_K, TILE = R.TILE, KNOWN = new Set(' .~123' + TILE.solid + Object.keys(TILE.decor).join('') + 'P'), TAGS = new Set(['start', 'fight', 'elite', 'event', 'treasure', 'camp', 'shop', 'boss']);
t('템플릿 칸 = 쿼터뷰 지도 칸 (RUN.ROOM_K = G.Floor.K)', K === ctx.G.Floor.K, [K, ctx.G.Floor.K]);
t('방이 있다', R.ROOMS.length >= 12, R.ROOMS.length);
const ids = new Set();
for (const rm of R.ROOMS) {
  const g = rm.map, H = g.length, W = g[0].length, tag = rm.id, Z = R.ZONES.find(z => z.id === rm.zone);
  t(`${tag}: 이름이 겹치지 않는다`, !ids.has(rm.id)); ids.add(rm.id);
  t(`${tag}: 줄 길이가 같다`, g.every(r => r.length === W));
  t(`${tag}: 크기는 칸(${K}타일)의 배수 · 칸 수는 홀수`, W % K === 0 && H % K === 0 && (W / K) % 2 === 1 && (H / K) % 2 === 1, [W, H]);
  t(`${tag}: 아는 글자만`, g.every(r => [...r].every(c => KNOWN.has(c))), [...new Set(g.join('').split(''))].filter(c => !KNOWN.has(c)).join(''));
  t(`${tag}: 자리 이름이 맞다`, rm.tags.length && rm.tags.every(x => TAGS.has(x)), rm.tags.join());
  t(`${tag}: 구역이 있다`, !!Z, rm.zone);
  const walk = (x, y) => y >= 0 && y < H && x >= 0 && x < W && !TILE.solid.includes(g[y][x]) && !' ~P'.includes(g[y][x]);
  const cx = (W / K - 1) / 2, cy = (H / K - 1) / 2, doors = [];
  for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) doors.push([cx * K + i, j], [cx * K + i, H - K + j], [i, cy * K + j], [W - K + i, cy * K + j]);
  t(`${tag}: 네 변 가운데 칸(문 자리)은 바닥`, doors.every(([x, y]) => walk(x, y)), JSON.stringify(doors.filter(([x, y]) => !walk(x, y)).slice(0, 3)));
  const seen = new Set([doors[0].join()]), q = [doors[0]];
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k) && walk(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); } } }
  let floor = 0, cut = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (walk(x, y)) { floor++; if (!seen.has(x + ',' + y)) cut++; }
  t(`${tag}: 모든 바닥이 문에서 닿는다`, cut === 0, `${cut}/${floor}`);
  const spawns = g.join('').split('').filter(c => TILE.spawn.includes(c)).length, most = Math.max(0, ...rm.enc.map(e => e.u.reduce((a, u) => a + u[1], 0)));
  t(`${tag}: 몬스터 자리가 적 구성보다 많거나 같다`, spawns >= most, [spawns, most]);
  t(`${tag}: 적 이름은 구역 규칙표에 있다`, rm.enc.every(e => e.u.every(([n]) => Z && Z.cost[n] != null)), JSON.stringify(rm.enc.flatMap(e => e.u.map(u => u[0])).filter(n => !(Z && Z.cost[n] != null))));
  t(`${tag}: 싸우는 방(전투 · 정예 · 우두머리)은 적 구성이 있다`, !rm.tags.some(x => x === 'fight' || x === 'elite' || x === 'boss') || rm.enc.length > 0);
}
// 생성기의 방 바꾸기
{
  const rm = R.ROOMS.find(r => r.id === 'g_colonnade'), a = R.gen.fromTemplate(rm, 10, 5), pillars = rm.map.join('').split('').filter(c => c === 'P').length;
  t('fromTemplate: 칸 좌표 · 크기', a.x === 10 && a.y === 5 && a.w === rm.map[0].length / K && a.h === rm.map.length / K);
  t('fromTemplate: 기둥 2×2 묶음은 장식 하나', a.decor.filter(o => o.k === 'pillar').length === pillars / 4 && a.decor.every(o => o.k !== 'pillar' || o.s === 2), [a.decor.filter(o => o.k === 'pillar').length, pillars / 4]);
  t('fromTemplate: 장식 · 몬스터 자리는 타일 좌표(놓은 자리만큼 옮김)', a.decor.every(o => o.tx >= 10 * K && o.ty >= 5 * K) && a.spawns.length === rm.map.join('').split('').filter(c => '123'.includes(c)).length);
  const f = R.gen.fromTemplate(rm, 0, 0, true);
  t('fromTemplate: 좌우 뒤집기', f.tmap.every((row, j) => row === [...rm.map[j]].reverse().join('')));
}
// 쿼터뷰 지도로: 장애물 'o' · 물 '~' · 방 밖 '#'
{
  const rm = R.ROOMS.find(r => r.id === 'g_pool'), room = R.gen.fromTemplate(rm, 2, 2), W = rm.map[0].length / K + 4, H = rm.map.length / K + 4;
  const m = { nodes: [{ id: 0, type: 'fight' }], edges: [], floor: 1, zone: 'goblin', _lay: { COLS: W, ROWS: H, room: { 0: room }, cor: {} } };
  const { iso, roomAt } = ctx.G.Floor.fromRun(m, R.TYPE), at = (x, y) => iso.c[(2 * K + y) * iso.w + 2 * K + x];
  let okAll = true, water = 0, solid = 0;
  rm.map.forEach((row, y) => [...row].forEach((ch, x) => { const c = at(x, y), want = ch === ' ' ? '#' : TILE.solid.includes(ch) ? 'o' : ch === '~' ? '~' : '.'; if (c !== want) okAll = false; if (c === '~') water++; if (c === 'o') solid++; }));
  t('지도: 글자마다 바닥 · 장애물(o) · 물(~) · 방 밖(#)', okAll);
  t('지도: 웅덩이 방에 물 · 장애물이 있다', water > 20 && solid > 0, [water, solid]);
  t('지도: 방 타일은 그 방 번호', roomAt[(2 * K + 10) * iso.w + 2 * K + 2] === 0);
}
// 생성기가 손으로 짠 방으로 층을 짓는다 (템플릿이 있는 구역): 길 · 방 종류 · 몬스터 자리
{
  let floors = 0, rooms = 0, tpl = 0, own = 0, pathBad = 0, short = 0, fail = 0;
  for (let s = 1; s <= 60; s++) for (const floor of [1, 2]) {
    let m; try { m = R.gen.make(s, floor); } catch (e) { fail++; continue; } floors++;
    if (!R.gen.path(m) || !R.gen.path(m, n => n.type === 'elite')) pathBad++;
    for (const n of m.nodes) { const r = m._lay.room[n.id]; rooms++; if (!r.tmap) continue; tpl++; const t = R.ROOMS.find(q => q.id === r.tpl); if (t.tags.includes(n.type)) own++; if (n.g && (n.type === 'fight' || n.type === 'elite') && n.g.count > r.spawns.length) short++; }
    ctx.G.Floor.fromRun(m, R.TYPE);
  }
  t('층 짓기: 실패 없음', fail === 0, fail);
  t('층 짓기: 열쇠 없이 · 정예를 피해서도 끝까지', pathBad === 0, pathBad);
  t('층 짓기: 고블린 굴의 방은 모두 손으로 짠 방', tpl === rooms, [tpl, rooms]);
  t('층 짓기: 방 종류가 맞는 템플릿이 대부분 (85% 이상)', own / tpl >= 0.85, (own / tpl).toFixed(2));
  t('층 짓기: 싸우는 방은 몬스터 자리가 적 수보다 많거나 같다', short === 0, short);
  const m3 = R.gen.make(1, 3); t('층 짓기: 템플릿이 없는 구역(드워프 폐성채)은 예전 방', Object.values(m3._lay.room).every(r => !r.tmap));
}
console.log(`rooms_rules: 통과 ${ok} · 실패 ${bad}`);
process.exit(bad ? 1 : 0);
