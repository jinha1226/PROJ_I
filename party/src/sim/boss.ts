// 레이드 보스 스크립트 (와우식): 페이즈 · 기믹 · 광폭화 타이머.
// 보스는 평소엔 AI 로 싸우고(어그로 대상을 친다), 스크립트가 시간과 체력에 맞춰 기믹을 건다.
import { dist } from '../core/rng';
import { beginCast } from './abilities';
import type { Unit } from './unit';
import type { World } from './world';

export interface BossState {
  phase: number;
  /** 풀링 시각 */
  pullAt: number;
  /** 기믹별 남은 시간 */
  timers: Record<string, number>;
  frenzy: boolean;
}

export interface BossScript {
  /** 광폭화(사실상 전멸)까지 초 */
  enrage: number;
  /** 체력 표시줄의 페이즈 경계 */
  marks: number[];
  /** 다음 기믹 이름 (HUD) */
  names: Record<string, string>;
  init(): Record<string, number>;
  step(w: World, b: Unit, s: BossState, dt: number): void;
}

const slotOf = (u: Unit, id: string) => u.abilities.findIndex((a) => a.def.id === id);
const free = (b: Unit) => !b.cast && !b.stats.stunned && b.dashT <= 0;

export const BOSS_SCRIPTS: Record<string, BossScript> = {
  ogre_chief: {
    enrage: 180,
    marks: [0.7, 0.3],
    names: { leap: '족장의 도약', roar: '분노의 포효' },
    init: () => ({ leap: 12 }),
    step(w, b, s, dt) {
      // 2페이즈 (70%): 부족 소집 — 주술사가 살아 있는 동안 족장은 보호막, 북으로 족장을 치유
      if (s.phase === 1 && b.hpFrac <= 0.7) {
        s.phase = 2;
        w.say(b, '부족이여, 일어나라!', '#ff8866', 2);
        w.log('오우거 족장: 부족 소집 — 주술사를 쓰러뜨려 보호막을 깨라', '#ff8866');
        const gates = w.gates;
        ['tribal_shaman', 'tribal_shaman', 'goblin', 'goblin'].forEach((id, i) => {
          const [gx, gy] = gates[i % gates.length];
          const m = w.spawn(id, 'enemy', gx + 0.5 + (gx === 0 ? 0.4 : -0.4), gy + 0.5);
          m.aware = true;
          m.summoner = b;
        });
      }
      // 3페이즈 (30%): 광폭화 + 분노의 포효 (전원 피해, 치유 확인)
      if (s.phase === 2 && b.hpFrac <= 0.3) {
        s.phase = 3;
        w.say(b, '으아아아!', '#ff4444', 2);
        w.log('오우거 족장: 광폭화 — 공격이 빨라진다', '#ff4444');
        b.statuses = b.statuses.filter((x) => x.def.id !== 'enraged');
        w.applyStatus(b, 'enraged', 9999);
        s.timers.roar = 4;
      }
      const shamans = w.units.some((u) => u.alive && u.def.id === 'tribal_shaman' && u.summoner === b);
      if (shamans) w.applyStatus(b, 'warded', 0.5);
      // 족장의 도약: 가장 멀리 있는 파티원 자리에 (뭉쳐 있으면 같이 맞는다)
      s.timers.leap -= dt;
      if (s.timers.leap <= 0 && free(b)) {
        const far = w.party.filter((p) => p.alive).sort((p, q) => dist(b, q) - dist(b, p))[0];
        const slot = slotOf(b, 'chief_leap');
        if (far && slot >= 0) beginCast(w, b, slot, null, far.x, far.y);
        s.timers.leap = s.phase === 3 ? 14 : 18;
      }
      if (s.phase === 3) {
        s.timers.roar -= dt;
        if (s.timers.roar <= 0 && free(b)) {
          const slot = slotOf(b, 'rage_roar');
          if (slot >= 0) beginCast(w, b, slot, null, b.x, b.y);
          s.timers.roar = 12;
        }
      }
    },
  },
};

export function initBoss(w: World, b: Unit) {
  const sc = BOSS_SCRIPTS[b.def.id];
  if (!sc) return;
  b.script = { phase: 1, pullAt: w.time, timers: sc.init(), frenzy: false };
}

export function bossStep(w: World, dt: number) {
  for (const b of w.units) {
    if (!b.alive || !b.script) continue;
    const sc = BOSS_SCRIPTS[b.def.id];
    const s = b.script;
    sc.step(w, b, s, dt);
    // 광란 (광폭화 타이머): 시간 안에 못 잡으면 사실상 전멸
    if (!s.frenzy && w.time - s.pullAt >= sc.enrage) {
      s.frenzy = true;
      w.applyStatus(b, 'frenzy', 9999);
      w.say(b, '모두 짓밟아 주마!', '#ff0000', 2.5);
      w.log(`${b.name}: 광란 — 시간이 다 됐다!`, '#ff0000');
    }
  }
}
