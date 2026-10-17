import type { MapDef } from '../data/maps';

export interface Pt {
  x: number;
  y: number;
}

/** 타일맵. 좌표 단위는 타일이며 타일 (tx,ty)의 중심은 (tx+0.5, ty+0.5). */
export class GameMap {
  readonly w: number;
  readonly h: number;
  readonly tiles: Uint8Array; // 0 = 바닥, 1 = 벽

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.tiles = new Uint8Array(w * h).fill(1);
  }

  static fromDef(def: MapDef): GameMap {
    const m = new GameMap(def.width, def.height);
    for (const [x, y, w, h] of def.rooms) {
      for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) m.set(tx, ty, 0);
    }
    for (const [x1, y1, x2, y2] of def.corridors) {
      for (let ty = Math.min(y1, y2); ty <= Math.max(y1, y2); ty++)
        for (let tx = Math.min(x1, x2); tx <= Math.max(x1, x2); tx++) m.set(tx, ty, 0);
    }
    for (const [x, y] of def.pillars) m.set(x, y, 1);
    return m;
  }

  set(tx: number, ty: number, v: number) {
    if (tx >= 0 && ty >= 0 && tx < this.w && ty < this.h) this.tiles[ty * this.w + tx] = v;
  }

  isWall(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return true;
    return this.tiles[ty * this.w + tx] === 1;
  }

  isWallAt(x: number, y: number): boolean {
    return this.isWall(Math.floor(x), Math.floor(y));
  }

  /** 시야/사선 판정 (끝점 제외 샘플링) */
  los(x0: number, y0: number, x1: number, y1: number): boolean {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.ceil(d / 0.2);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.isWallAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }

  /** 반지름 r 인 원이 직선으로 지나갈 수 있는지 */
  clearPath(x0: number, y0: number, x1: number, y1: number, r: number): boolean {
    const dx = x1 - x0, dy = y1 - y0;
    const d = Math.hypot(dx, dy);
    if (d < 1e-4) return true;
    const nx = -dy / d, ny = dx / d;
    const steps = Math.ceil(d / 0.2);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x0 + dx * t, py = y0 + dy * t;
      if (this.isWallAt(px + nx * r, py + ny * r) || this.isWallAt(px - nx * r, py - ny * r)) return false;
    }
    return true;
  }

  nearestFloor(x: number, y: number): Pt {
    const cx = Math.floor(x), cy = Math.floor(y);
    if (!this.isWall(cx, cy)) return { x, y };
    for (let r = 1; r < 6; r++) {
      let best: Pt | null = null;
      let bd = Infinity;
      for (let ty = cy - r; ty <= cy + r; ty++)
        for (let tx = cx - r; tx <= cx + r; tx++) {
          if (this.isWall(tx, ty)) continue;
          const d = Math.hypot(tx + 0.5 - x, ty + 0.5 - y);
          if (d < bd) { bd = d; best = { x: tx + 0.5, y: ty + 0.5 }; }
        }
      if (best) return best;
    }
    return { x, y };
  }

  /** (x,y) 에서 가까운 순으로 서로 다른 바닥 타일 중심 n 개 (BFS, 벽 너머 제외) */
  nearbyFloorSlots(x: number, y: number, n: number): Pt[] {
    const start = this.nearestFloor(x, y);
    const W = this.w;
    const s = Math.floor(start.y) * W + Math.floor(start.x);
    const seen = new Set([s]);
    const queue = [s];
    const out: Pt[] = [start];
    while (queue.length && out.length < n) {
      const cur = queue.shift()!;
      const cx = cur % W, cy = (cur / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const nx = cx + dx, ny = cy + dy, ni = ny * W + nx;
        if (this.isWall(nx, ny) || seen.has(ni)) continue;
        if (dx && dy && (this.isWall(cx + dx, cy) || this.isWall(cx, cy + dy))) continue;
        seen.add(ni);
        queue.push(ni);
        if (out.length < n) out.push({ x: nx + 0.5, y: ny + 0.5 });
      }
    }
    return out;
  }

  /** (x,y) 에서 각 바닥 칸까지의 걸음 수 (벽을 돌아가는 실제 거리). 닿지 않으면 Infinity */
  distanceField(x: number, y: number): Float32Array {
    const W = this.w;
    const field = new Float32Array(W * this.h).fill(Infinity);
    const start = this.nearestFloor(x, y);
    const s = Math.floor(start.y) * W + Math.floor(start.x);
    field[s] = 0;
    const queue = [s];
    for (let qi = 0; qi < queue.length; qi++) {
      const cur = queue[qi];
      const cx = cur % W, cy = (cur / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy, ni = ny * W + nx;
        if (this.isWall(nx, ny) || field[ni] !== Infinity) continue;
        field[ni] = field[cur] + 1;
        queue.push(ni);
      }
    }
    return field;
  }

  /** A* (8방향, 모서리 끼기 금지) 후 직선화한 경유점 목록. 마지막 점은 목표 좌표 그대로. */
  findPath(sx: number, sy: number, gx: number, gy: number, r: number): Pt[] | null {
    const W = this.w;
    const goal = this.nearestFloor(gx, gy);
    const s = Math.floor(sy) * W + Math.floor(sx);
    const g = Math.floor(goal.y) * W + Math.floor(goal.x);
    if (this.tiles[g] === 1) return null;
    if (s === g) return [goal];

    const n = W * this.h;
    const gScore = new Float32Array(n).fill(Infinity);
    const came = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const heap = new MinHeap();
    const gxT = g % W, gyT = (g / W) | 0;
    const hfn = (i: number) => {
      const dx = Math.abs((i % W) - gxT), dy = Math.abs(((i / W) | 0) - gyT);
      return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
    };
    gScore[s] = 0;
    heap.push(s, hfn(s));
    let found = false;
    while (heap.size) {
      const cur = heap.pop();
      if (cur === g) { found = true; break; }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cx = cur % W, cy = (cur / W) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx, ny = cy + dy;
          if (this.isWall(nx, ny)) continue;
          if (dx && dy && (this.isWall(cx + dx, cy) || this.isWall(cx, cy + dy))) continue;
          const ni = ny * W + nx;
          const ng = gScore[cur] + (dx && dy ? 1.414 : 1);
          if (ng < gScore[ni]) {
            gScore[ni] = ng;
            came[ni] = cur;
            heap.push(ni, ng + hfn(ni));
          }
        }
    }
    if (!found) return null;

    const raw: Pt[] = [];
    for (let i = g; i !== s && i !== -1; i = came[i]) raw.push({ x: (i % W) + 0.5, y: ((i / W) | 0) + 0.5 });
    raw.reverse();
    raw[raw.length - 1] = goal;

    // 직선화: 현재 점에서 직접 갈 수 있는 가장 먼 경유점으로 건너뛴다
    const out: Pt[] = [];
    let from: Pt = { x: sx, y: sy };
    let i = 0;
    while (i < raw.length) {
      let j = raw.length - 1;
      while (j > i && !this.clearPath(from.x, from.y, raw[j].x, raw[j].y, r)) j--;
      out.push(raw[j]);
      from = raw[j];
      i = j + 1;
    }
    return out;
  }
}

class MinHeap {
  private ids: number[] = [];
  private keys: number[] = [];
  get size() {
    return this.ids.length;
  }
  push(id: number, key: number) {
    const ids = this.ids, keys = this.keys;
    let i = ids.length;
    ids.push(id);
    keys.push(key);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= key) break;
      ids[i] = ids[p]; keys[i] = keys[p];
      i = p;
    }
    ids[i] = id; keys[i] = key;
  }
  pop(): number {
    const ids = this.ids, keys = this.keys;
    const top = ids[0];
    const lastId = ids.pop()!, lastKey = keys.pop()!;
    if (ids.length) {
      let i = 0;
      const n = ids.length;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && keys[c + 1] < keys[c]) c++;
        if (keys[c] >= lastKey) break;
        ids[i] = ids[c]; keys[i] = keys[c];
        i = c;
      }
      ids[i] = lastId; keys[i] = lastKey;
    }
    return top;
  }
}
