// 층 생성: 4×3 칸 격자에서 무작위 경로로 방을 고르고, 이웃한 방끼리 ㄱ자 통로로 잇는다.
// 방 순서 = 경로 순서 (첫 방이 시작, 마지막 방이 계단 또는 보스).
// 1단계의 수동 맵과 같은 MapDef 를 만들어 내므로 나머지 시스템은 그대로 쓴다.
import { Rng } from '../core/rng';
import { BOSS_GROUP, ENCOUNTERS, FLOORS } from '../data/encounters';
import type { MapDef } from '../data/maps';

const COLS = 4, ROWS = 3, CW = 13, CH = 10;

export function genFloor(seed: number, depth: number): MapDef {
  const rng = new Rng(seed * 7919 + depth * 104729);
  const final = depth >= FLOORS;
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

  const corridors: MapDef['corridors'] = [];
  const corridorTiles = new Set<number>();
  const W = COLS * CW + 1;
  const carve = (x1: number, y1: number, x2: number, y2: number) => {
    corridors.push([x1, y1, x2, y2]);
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) corridorTiles.add(y * W + x);
  };
  for (let i = 0; i + 1 < rooms.length; i++) {
    const [ax, ay] = center(rooms[i]);
    const [bx, by] = center(rooms[i + 1]);
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
    if (i === 0 || w < 8 || h < 6) return;
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
  const table = (d: number) => ENCOUNTERS[Math.min(FLOORS, Math.max(1, d))];
  rooms.forEach(([x, y, w, h], i) => {
    if (i === 0) return;
    const last = i === rooms.length - 1;
    const pool = last && !final ? table(depth + 1) : final ? table(depth - 1) : table(depth);
    const group = last && final ? BOSS_GROUP : pool[rng.int(0, pool.length - 1)];
    const used = new Set<number>();
    group.forEach((id, k) => {
      let tx = 0, ty = 0;
      if (last && final && k === 0) [tx, ty] = center(rooms[i]);
      else
        for (let t = 0; t < 30; t++) {
          tx = rng.int(x + 1, x + w - 2);
          ty = rng.int(y + 1, y + h - 2);
          if (!used.has(ty * W + tx) && !blocked.has(ty * W + tx)) break;
        }
      used.add(ty * W + tx);
      spawns.push({ id, x: tx, y: ty });
    });
  });

  return {
    width: W,
    height: ROWS * CH + 1,
    rooms, corridors, pillars, partyStart, spawns,
    stairs: final ? undefined : center(rooms[rooms.length - 1]),
    depth,
  };
}
