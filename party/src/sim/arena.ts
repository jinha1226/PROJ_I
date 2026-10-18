// 전장 (배틀하트 식): 벽으로 둘린 방 하나. 적은 양옆 문으로 웨이브마다 들어온다. 걷는 시간이 없다.
import { Rng } from '../core/rng';
import { BOSS_GROUPS } from '../data/encounters';
import type { MapDef, ObjectKind, Palette } from '../data/maps';
import type { NodeKind } from './expedition';
import { pickEncounter } from './gen';

export const ARENA_W = 20, ARENA_H = 11;

export interface ArenaOpts {
  kind: NodeKind;
  theme?: string[];
  bossId?: string;
  palette?: Palette;
  /** 구출 계약의 목표 방 */
  captive?: boolean;
}

export function genArena(seed: number, depth: number, o: ArenaOpts): MapDef {
  const rng = new Rng(seed);
  const W = ARENA_W, H = ARENA_H;
  const midY = Math.floor(H / 2);
  // 문: 왼쪽 · 오른쪽 벽 가운데 두 칸 (적이 들어오는 곳)
  const gates: [number, number][] = [[0, midY - 1], [0, midY], [W - 1, midY - 1], [W - 1, midY]];
  const pillars: [number, number][] = [];
  for (let k = rng.int(0, 2); k > 0; k--) {
    const px = rng.int(6, W - 7), py = rng.chance(0.5) ? rng.int(2, 3) : rng.int(H - 4, H - 3);
    pillars.push([px, py]);
  }
  const cx = Math.floor(W / 2);
  const partyStart: [number, number][] = [[cx - 1, midY - 1], [cx - 1, midY], [cx - 2, midY - 1], [cx - 2, midY]];
  const objects: NonNullable<MapDef['objects']> = [];
  const waves: string[][] = [];
  const wave = (d: number) => waves.push(pickEncounter(rng, d, o.theme));
  switch (o.kind) {
    case 'battle':
      wave(depth);
      wave(Math.max(1, depth - 1));
      break;
    case 'elite':
    case 'goal':
      wave(Math.max(1, depth - 1));
      wave(depth);
      wave(depth);
      if (o.captive) objects.push({ kind: 'captive', x: cx + 3, y: 2 });
      break;
    case 'boss':
      wave(Math.max(1, depth - 1));
      waves.push(BOSS_GROUPS[o.bossId ?? 'ogre_chief'] ?? BOSS_GROUPS.ogre_chief);
      break;
    case 'treasure':
      objects.push({ kind: rng.chance(0.15) ? 'mimic' : 'chest', x: cx + 3, y: midY });
      if (rng.chance(0.5)) wave(depth);
      break;
    case 'event': {
      const kinds: ObjectKind[] = ['fountain', 'altar', 'prisoner'];
      objects.push({ kind: kinds[rng.int(0, kinds.length - 1)], x: cx + 3, y: midY });
      break;
    }
    default:
      break;
  }
  return {
    width: W, height: H,
    rooms: [[1, 1, W - 2, H - 2]],
    corridors: gates.map(([x, y]) => [x, y, x, y] as [number, number, number, number]),
    pillars, partyStart, spawns: [], roles: ['start'], objects, depth, palette: o.palette,
    arena: true, waves, gates,
  };
}
