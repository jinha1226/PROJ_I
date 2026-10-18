// 전장 (배틀하트 식): 벽으로 둘린 방 하나. 적은 양옆 문으로 웨이브마다 들어온다. 걷는 시간이 없다.
// 웨이브마다 성격(떼거리 · 사냥개 · 궁수진 · 주술사 · 덩치)이 달라 요구하는 대응이 바뀐다.
import { Rng } from '../core/rng';
import { BOSS_GROUPS, ENCOUNTERS, FLOORS } from '../data/encounters';
import type { ArenaWave, MapDef, ObjectKind, Palette } from '../data/maps';
import { MONSTERS } from '../data/units';
import { WAVE_KINDS, foeKind, type FoeKind, type WaveKindDef } from '../data/waves';
import type { NodeKind } from './expedition';

export const ARENA_W = 18, ARENA_H = 10;

export interface ArenaOpts {
  kind: NodeKind;
  theme?: string[];
  bossId?: string;
  palette?: Palette;
  /** 구출 계약의 목표 방 */
  captive?: boolean;
}

const xpOf = (id: string) => MONSTERS[id]?.xp ?? 10;

/** 깊이까지 나오는 몬스터를 역할별로 */
function poolAt(depth: number): Record<FoeKind, string[]> {
  const pool: Record<FoeKind, string[]> = { swarm: [], diver: [], ranged: [], caster: [], brute: [] };
  for (let d = 1; d <= Math.min(FLOORS, depth); d++)
    for (const g of ENCOUNTERS[d])
      for (const id of g) {
        const k = foeKind(id);
        if (k && !pool[k].includes(id)) pool[k].push(id);
      }
  return pool;
}

/** 깊이의 무리 하나 평균 경험치 = 웨이브 예산 */
function budgetAt(depth: number): number {
  const groups = ENCOUNTERS[Math.min(FLOORS, Math.max(1, depth))];
  const sum = groups.reduce((s, g) => s + g.reduce((a, id) => a + xpOf(id), 0), 0);
  // 얕은 층은 무리가 작아 금방 끝나니 머릿수를 더 (1층 ×1.6, 2층 ×1.3)
  const shallow = 1 + Math.max(0, 3 - depth) * 0.3;
  return (sum / groups.length) * 0.9 * shallow * (depth > FLOORS ? 1 + (depth - FLOORS) * 0.25 : 1);
}

function buildWave(rng: Rng, depth: number, kind: WaveKindDef, theme: string[] | undefined, scale: number): ArenaWave | null {
  const pool = poolAt(depth);
  // 테마 몬스터를 더 자주 (같은 역할 안에서)
  const pick = (k: FoeKind): string | null => {
    const list = pool[k];
    if (!list.length) return null;
    const themed = theme ? list.filter((id) => theme.includes(id)) : [];
    const from = themed.length && rng.chance(0.7) ? themed : list;
    // 최근 깊이 몬스터일수록 자주: 목록 뒤쪽 가중
    return from[Math.min(from.length - 1, Math.floor(Math.sqrt(rng.next()) * from.length))];
  };
  if (!pool[kind.core].length) return null;
  const budget = budgetAt(depth) * scale;
  const ids: string[] = [];
  let spent = 0;
  // 주력: 같은 종류를 묶어 성격이 또렷하게 (한두 종)
  const coreA = pick(kind.core)!, coreB = pick(kind.core)!;
  while (spent < budget * kind.coreShare && ids.length < 7) {
    const id = ids.length % 3 === 2 ? coreB : coreA;
    ids.push(id);
    spent += xpOf(id);
  }
  if (kind.escort && pool[kind.escort].length) {
    const esc = pick(kind.escort)!;
    while (spent < budget * 0.95 && ids.length < 7) {
      ids.push(esc);
      spent += xpOf(esc);
    }
  }
  return { ids, name: kind.name, hint: kind.hint, color: kind.color, sides: kind.sides };
}

/** 방 하나의 웨이브들: 성격이 겹치지 않게 */
function planWaves(rng: Rng, depth: number, n: number, theme: string[] | undefined, lastScale = 1): ArenaWave[] {
  const kinds = [...WAVE_KINDS];
  const out: ArenaWave[] = [];
  for (let i = 0; i < n; i++) {
    for (let tries = 0; tries < 8 && kinds.length; tries++) {
      const k = kinds.splice(rng.int(0, kinds.length - 1), 1)[0];
      const wv = buildWave(rng, depth, k, theme, i === n - 1 ? lastScale : 1);
      if (wv) {
        out.push(wv);
        break;
      }
    }
  }
  return out;
}

export function genArena(seed: number, depth: number, o: ArenaOpts): MapDef {
  const rng = new Rng(seed);
  const W = ARENA_W, H = ARENA_H;
  const midY = Math.floor(H / 2);
  // 배틀하트식: 양옆이 다 열려 있다. 맨 바깥 열은 무대 밖(어둠) — 적이 여러 높이에서 걸어 들어온다
  const gates: [number, number][] = [];
  for (let y = 1; y < H - 1; y++) gates.push([0, y], [W - 1, y]);
  const pillars: [number, number][] = [];
  for (let k = rng.int(0, 2); k > 0; k--) {
    const px = rng.int(6, W - 7), py = rng.chance(0.5) ? rng.int(2, 3) : rng.int(H - 4, H - 3);
    pillars.push([px, py]);
  }
  const cx = Math.floor(W / 2);
  const partyStart: [number, number][] = [[cx - 1, midY - 1], [cx - 1, midY], [cx - 2, midY - 1], [cx - 2, midY]];
  const objects: NonNullable<MapDef['objects']> = [];
  let waves: ArenaWave[] = [];
  switch (o.kind) {
    case 'battle':
      waves = planWaves(rng, depth, 2, o.theme);
      break;
    case 'elite':
    case 'goal':
      // 마지막 웨이브는 정예 (예산 1.4배)
      waves = planWaves(rng, depth, 3, o.theme, 1.4);
      if (waves.length) waves[waves.length - 1].name = `정예 ${waves[waves.length - 1].name}`;
      if (o.captive) objects.push({ kind: 'captive', x: cx + 3, y: 2 });
      break;
    case 'boss':
      waves = planWaves(rng, depth, 1, o.theme);
      waves.push({ ids: BOSS_GROUPS[o.bossId ?? 'ogre_chief'] ?? BOSS_GROUPS.ogre_chief, name: '보스', hint: '보스의 예고(빨간 원)를 피하고 졸개부터', color: '#ff4444', sides: 'both' });
      break;
    case 'treasure':
      objects.push({ kind: rng.chance(0.15) ? 'mimic' : 'chest', x: cx + 3, y: midY });
      if (rng.chance(0.5)) waves = planWaves(rng, depth, 1, o.theme);
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
