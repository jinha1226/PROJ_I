// 런과 런 사이에 남는 기록 (브라우저 저장소). 저장소를 못 쓰면 이번 세션 동안만 유지된다.
import { BASE_UNLOCKED, UNLOCKS, type MetaProgress, type UnlockDef } from '../data/unlocks';

const KEY = 'bh.meta.v1';

export function loadMeta(): MetaProgress {
  const fresh: MetaProgress = { unlocked: [...BASE_UNLOCKED], kills: {}, bestDepth: 0, runs: 0, wins: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh;
    const m = JSON.parse(raw) as Partial<MetaProgress>;
    return {
      unlocked: [...new Set([...BASE_UNLOCKED, ...(m.unlocked ?? [])])],
      kills: m.kills ?? {},
      bestDepth: m.bestDepth ?? 0,
      runs: m.runs ?? 0,
      wins: m.wins ?? 0,
    };
  } catch {
    return fresh;
  }
}

export function saveMeta(m: MetaProgress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    // 저장소를 못 쓰면 무시
  }
}

export function isUnlocked(m: MetaProgress, id: string) {
  return m.unlocked.includes(id);
}

/** 처치 수 · 도달 층을 더하고 새로 열린 해금을 돌려준다 */
export function recordProgress(m: MetaProgress, kills: Record<string, number>, depth: number): UnlockDef[] {
  for (const [id, n] of Object.entries(kills)) m.kills[id] = (m.kills[id] ?? 0) + n;
  m.bestDepth = Math.max(m.bestDepth, depth);
  const fresh: UnlockDef[] = [];
  for (const u of UNLOCKS) {
    if (m.unlocked.includes(u.id)) continue;
    if (u.progress(m).v >= 1) {
      m.unlocked.push(u.id);
      fresh.push(u);
    }
  }
  saveMeta(m);
  return fresh;
}
