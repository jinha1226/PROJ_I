// 층 생성: 4×3 칸 격자에서 무작위 경로로 방을 고르고, 이웃한 방끼리 ㄱ자 통로로 잇는다.
// 방 순서 = 경로 순서 (첫 방이 시작, 마지막 방이 계단 또는 보스).
// 1단계의 수동 맵과 같은 MapDef 를 만들어 내므로 나머지 시스템은 그대로 쓴다.
import { Rng } from '../core/rng';
import { BOSS_GROUP, BOSS_GROUPS, ENCOUNTERS, FLOORS } from '../data/encounters';
import type { MapDef, ObjectKind, Palette, RoomRole } from '../data/maps';

const COLS = 4, ROWS = 3, CW = 13, CH = 10;

export interface FloorOpts {
  /** 보스층 (계단 없음) */
  boss: boolean;
  /** 자주 나올 몬스터 */
  theme?: string[];
  /** 곁가지 방 수 범위 */
  sides?: [number, number];
  /** 마지막 방에 구출할 포로 */
  captive?: boolean;
  /** 보스 (BOSS_GROUPS 키) */
  bossId?: string;
  palette?: Palette;
}

export function genFloor(seed: number, depth: number, opts: FloorOpts = { boss: depth >= FLOORS }): MapDef {
  const rng = new Rng(seed * 7919 + depth * 104729);
  const final = opts.boss;
  const nRooms = final ? 5 : 6;

  // 격자 위 무작위 경로 (막히면 다시)
  let path: [number, number][] = [];
  for (let attempt = 0; attempt < 100 && path.length < nRooms; attempt++) {
    path = [[0, rng.int(0, ROWS - 1)]];
    while (path.length < nRooms) {
      const [cx, cy] = path[path.length - 1];
      const next = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const)
        .map(([dx, dy]) => [cx + dx, cy + dy] as [number, number])
        .filter(([x, y]) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !path.some(([px, py]) => px === x && py === y));
      if (!next.length) break;
      // 오른쪽으로 나아가는 쪽을 조금 선호해 경로가 길게 퍼지게 한다
      next.sort((a, b) => b[0] - a[0]);
      path.push(rng.chance(0.45) ? next[0] : next[rng.int(0, next.length - 1)]);
    }
  }

  const rooms: MapDef['rooms'] = path.map(([cx, cy], i) => {
    const last = i === path.length - 1;
    const w = last ? CW - 2 : rng.int(6, CW - 3);
    const h = last ? CH - 2 : rng.int(5, CH - 3);
    const x = cx * CW + 1 + rng.int(0, CW - 2 - w);
    const y = cy * CH + 1 + rng.int(0, CH - 2 - h);
    return [x, y, w, h];
  });
  const center = (r: number[]) => [r[0] + Math.floor(r[2] / 2), r[1] + Math.floor(r[3] / 2)] as [number, number];
  const roles: RoomRole[] = rooms.map((_, i) => (i === 0 ? 'start' : i === rooms.length - 1 ? 'end' : 'main'));
  const nMain = rooms.length;

  // 곁가지 방: 경로 중간 방 옆의 빈 칸에 붙인다. 자동 탐험은 들르지 않고, 털지 말지는 플레이어가 정한다
  const sideOf: number[] = [];
  const used = new Set(path.map(([x, y]) => `${x},${y}`));
  const wantSide = rng.int(...(opts.sides ?? [1, 2]));
  for (let tries = 0; tries < 40 && sideOf.length < wantSide; tries++) {
    const from = rng.int(1, nMain - 2);
    const [cx, cy] = path[from];
    const free = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const)
      .map(([dx, dy]) => [cx + dx, cy + dy] as [number, number])
      .filter(([x, y]) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !used.has(`${x},${y}`));
    if (!free.length) continue;
    const [sx, sy] = free[rng.int(0, free.length - 1)];
    used.add(`${sx},${sy}`);
    const w = rng.int(5, 8), h = rng.int(4, 6);
    rooms.push([sx * CW + 1 + rng.int(0, CW - 2 - w), sy * CH + 1 + rng.int(0, CH - 2 - h), w, h]);
    roles.push('side');
    sideOf.push(from);
  }

  const corridors: MapDef['corridors'] = [];
  const corridorTiles = new Set<number>();
  const W = COLS * CW + 1;
  const carve = (x1: number, y1: number, x2: number, y2: number) => {
    corridors.push([x1, y1, x2, y2]);
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) corridorTiles.add(y * W + x);
  };
  const links: [number, number][] = [];
  for (let i = 0; i + 1 < nMain; i++) links.push([i, i + 1]);
  sideOf.forEach((from, k) => links.push([from, nMain + k]));
  for (const [ia, ib] of links) {
    const [ax, ay] = center(rooms[ia]);
    const [bx, by] = center(rooms[ib]);
    const wide = rng.chance(0.35);
    if (rng.chance(0.5)) {
      carve(ax, ay, bx, ay);
      carve(bx, ay, bx, by);
      if (wide) { carve(ax, ay + 1, bx, ay + 1); carve(bx + 1, ay, bx + 1, by); }
    } else {
      carve(ax, ay, ax, by);
      carve(ax, by, bx, by);
      if (wide) { carve(ax + 1, ay, ax + 1, by); carve(ax, by + 1, bx, by + 1); }
    }
  }

  // 기둥: 큰 방에만, 통로가 지나가는 칸은 피한다
  const pillars: [number, number][] = [];
  rooms.forEach(([x, y, w, h], i) => {
    if (i === 0 || roles[i] === 'side' || w < 8 || h < 6) return;
    const [cx, cy] = center(rooms[i]);
    for (let k = rng.int(0, 2); k > 0; k--) {
      const px = rng.int(x + 2, x + w - 3), py = rng.int(y + 2, y + h - 3);
      if (px === cx || py === cy || corridorTiles.has(py * W + px)) continue;
      pillars.push([px, py]);
    }
  });
  const blocked = new Set(pillars.map(([x, y]) => y * W + x));

  const [sx, sy] = center(rooms[0]);
  const partyStart: [number, number][] = [[sx - 1, sy - 1], [sx - 1, sy], [sx, sy - 1], [sx, sy]];

  const spawns: MapDef['spawns'] = [];
  const objects: NonNullable<MapDef['objects']> = [];
  const table = (d: number) => ENCOUNTERS[Math.min(FLOORS, Math.max(1, d))];
  /** 무리 고르기: 테마 몬스터가 많은 무리일수록 자주 */
  const pickGroup = (pool: string[][]) => {
    const theme = opts.theme;
    if (!theme) return pool[rng.int(0, pool.length - 1)];
    const weights = pool.map((g) => 0.15 + (g.filter((id) => theme.includes(id)).length / g.length) ** 2 * 4);
    let r = rng.next() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) if ((r -= weights[i]) <= 0) return pool[i];
    return pool[pool.length - 1];
  };
  const place = (room: number[], ids: string[], usedTiles: Set<number>, centerFirst = false) => {
    const [x, y, w, h] = room;
    ids.forEach((id, k) => {
      let tx = 0, ty = 0;
      if (centerFirst && k === 0) [tx, ty] = center(room);
      else
        for (let t = 0; t < 30; t++) {
          tx = rng.int(x + 1, x + w - 2);
          ty = rng.int(y + 1, y + h - 2);
          if (!usedTiles.has(ty * W + tx) && !blocked.has(ty * W + tx)) break;
        }
      usedTiles.add(ty * W + tx);
      spawns.push({ id, x: tx, y: ty });
    });
  };
  rooms.forEach((room, i) => {
    const role = roles[i];
    if (role === 'start') return;
    const usedTiles = new Set<number>();
    if (role === 'side') {
      // 곁가지 방: 상자 + 지키는 무리 / 미믹 / 이벤트
      const [cx, cy] = center(room);
      usedTiles.add(cy * W + cx);
      const r = rng.next();
      const kind: ObjectKind = r < 0.5 ? 'chest' : r < 0.62 ? 'mimic' : (['fountain', 'altar', 'prisoner'] as const)[rng.int(0, 2)];
      objects.push({ kind, x: cx, y: cy });
      if (kind === 'chest') {
        const pool = table(depth + 1);
        place(room, pickGroup(pool), usedTiles);
      }
      return;
    }
    const last = role === 'end';
    const pool = last && !final ? table(depth + 1) : final ? table(depth - 1) : table(depth);
    const group = last && final ? BOSS_GROUPS[opts.bossId ?? 'ogre_chief'] ?? BOSS_GROUP : pickGroup(pool);
    place(room, group, usedTiles, last && final);
    // 구출 계약: 마지막 방 구석에 포로 (지키는 무리를 쓰러뜨린 뒤 풀어 준다)
    if (last && opts.captive) objects.push({ kind: 'captive', x: room[0] + 1, y: room[1] + 1 });
  });
  // 가끔 길 위의 방에도 상자 하나
  if (rng.chance(0.35) && nMain > 3) {
    const [x, y, w, h] = rooms[rng.int(1, nMain - 2)];
    objects.push({ kind: 'chest', x: x + rng.int(1, w - 2), y: y + rng.int(1, h - 2) });
  }

  return {
    width: W,
    height: ROWS * CH + 1,
    rooms, corridors, pillars, partyStart, spawns, roles, objects,
    stairs: final ? undefined : center(rooms[nMain - 1]),
    palette: opts.palette,
    depth,
  };
}

/** 무리 하나 고르기 (전장 웨이브용): 깊이의 무리 중에서, 테마가 있으면 테마 몬스터가 많은 무리일수록 자주 */
export function pickEncounter(rng: Rng, depth: number, theme?: string[]): string[] {
  const pool = ENCOUNTERS[Math.min(FLOORS, Math.max(1, depth))];
  if (!theme) return pool[rng.int(0, pool.length - 1)];
  const weights = pool.map((g) => 0.15 + (g.filter((id) => theme.includes(id)).length / g.length) ** 2 * 4);
  let r = rng.next() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) if ((r -= weights[i]) <= 0) return pool[i];
  return pool[pool.length - 1];
}
