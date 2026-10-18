// 원정 지도 (다키스트 던전 · 슬레이 더 스파이어 식): 왼쪽에서 오른쪽으로 열을 따라 방을 골라 나아간다.
// 방 종류: 전투 · 정예 · 보물 · 이벤트(샘 · 제단 · 포로) · 야영 · 보스(또는 마지막 목표 방).
// 방에 들어가면 한 화면 전장(sim/arena.ts)에서 싸우거나, 야영이면 쉬는 화면.
import type { Rng } from '../core/rng';
import type { ContractDef } from '../data/contracts';

export type NodeKind = 'battle' | 'elite' | 'treasure' | 'event' | 'camp' | 'boss' | 'goal';

export interface ExNode {
  id: number;
  col: number;
  row: number;
  kind: NodeKind;
  next: number[];
}

export interface Expedition {
  nodes: ExNode[];
  cols: number;
  /** 지금 있는 방 (출발 전 null) */
  at: number | null;
  done: number[];
}

export const NODE_INFO: Record<NodeKind, { name: string; icon: string; color: string }> = {
  battle: { name: '전투', icon: '전', color: '#d8d0c0' },
  elite: { name: '정예', icon: '정', color: '#ff8866' },
  treasure: { name: '보물', icon: '보', color: '#ffd76a' },
  event: { name: '이벤트', icon: '?', color: '#9ad0ff' },
  camp: { name: '야영', icon: '야', color: '#7ddc7d' },
  boss: { name: '보스', icon: '왕', color: '#ff4444' },
  goal: { name: '목표', icon: '목', color: '#ffaa44' },
};

/** 계약 → 지도. 층 수 × 2 열 (+ 보스 열) */
export function genExpedition(rng: Rng, def: ContractDef): Expedition {
  const cols = def.floors * 2 + 1;
  const nodes: ExNode[] = [];
  const byCol: ExNode[][] = [];
  for (let c = 0; c < cols; c++) {
    const last = c === cols - 1;
    // 보스 바로 앞 열은 야영 하나뿐 (숨 고르고 보스로)
    const preBoss = def.boss && cols >= 5 && c === cols - 2;
    const n = c === 0 || last || preBoss ? 1 : rng.int(2, 3);
    byCol[c] = [];
    for (let r = 0; r < n; r++) {
      let kind: NodeKind;
      if (c === 0) kind = 'battle';
      else if (preBoss) kind = 'camp';
      else if (last) kind = def.boss ? 'boss' : 'goal';
      else {
        const roll = rng.next();
        const campOk = c >= 2 && c < cols - 1;
        kind = roll < 0.48 ? 'battle' : roll < 0.62 ? 'event' : roll < 0.74 ? 'treasure' : roll < 0.87 ? 'elite' : campOk ? 'camp' : 'battle';
      }
      const node: ExNode = { id: nodes.length, col: c, row: r, kind, next: [] };
      nodes.push(node);
      byCol[c].push(node);
    }
  }
  // 긴 원정이면 중간쯤에 야영 하나는 보장
  if (cols >= 7 && !nodes.some((n) => n.kind === 'camp')) {
    const mid = byCol[Math.floor(cols * 0.6)];
    mid[rng.int(0, mid.length - 1)].kind = 'camp';
  }
  // 길: 다음 열에서 가까운 칸 1~2개로. 들어오는 길이 없는 칸은 하나 이어 준다
  for (let c = 0; c + 1 < cols; c++) {
    const cur = byCol[c], nxt = byCol[c + 1];
    const pos = (n: ExNode, list: ExNode[]) => (list.length === 1 ? 0.5 : n.row / (list.length - 1));
    for (const n of cur) {
      const sorted = [...nxt].sort((a, b) => Math.abs(pos(a, nxt) - pos(n, cur)) - Math.abs(pos(b, nxt) - pos(n, cur)));
      n.next.push(sorted[0].id);
      if (sorted[1] && rng.chance(0.45)) n.next.push(sorted[1].id);
    }
    for (const m of nxt)
      if (!cur.some((n) => n.next.includes(m.id))) {
        const near = [...cur].sort((a, b) => Math.abs(pos(a, cur) - pos(m, nxt)) - Math.abs(pos(b, cur) - pos(m, nxt)))[0];
        near.next.push(m.id);
      }
  }
  return { nodes, cols, at: null, done: [] };
}

/** 방의 난이도 깊이: 계약의 시작 깊이에서 마지막 열까지 고르게 깊어진다 */
export function nodeDepth(def: ContractDef, ex: Expedition, node: ExNode): number {
  const k = ex.cols <= 1 ? 1 : node.col / (ex.cols - 1);
  return def.startDepth + Math.round(k * (def.floors - 1));
}

/** 지금 갈 수 있는 방 */
export function reachable(ex: Expedition): number[] {
  if (ex.at === null) return ex.nodes.filter((n) => n.col === 0).map((n) => n.id);
  return ex.nodes[ex.at].next;
}

/** 방을 정리하면 숨을 돌려 최대 체력의 이만큼 회복 */
export const ROOM_HEAL = 0.15;
