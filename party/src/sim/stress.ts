// 스트레스 (다키스트 던전 단순화). 영웅 데이터에 남아 층을 넘어 이어진다.
//  - 오른다: 큰 피해, 체력 위험, 동료가 쓰러짐, 미믹 · 매복 · 제단, 곁가지 방 탐험
//  - 내린다: 전투 종료, 처치, 상자, 샘, 진정 향초, 층 사이 휴식
//  - 100 이 되면 판정: 대개 붕괴(자동전투 행동이 망가짐), 가끔 각성(강해짐)
import { clamp, dist } from '../core/rng';
import { AFFLICTIONS, MOODS, VIRTUES, type MoodId } from '../data/moods';
import type { Hero } from './hero';
import type { Unit } from './unit';
import type { World } from './world';

export const MAX_STRESS = 100;
const VIRTUE_CHANCE = 0.25;
/** 층 사이 휴식으로 줄어드는 양 */
const REST_RELIEF = 30;
/** 명령 거부 확률 (붕괴 상태). 한 번 판정하면 몇 초간 유지된다 */
const REFUSE_CHANCE = 0.35;
/** 이 이상이면 경고 (카드 깜빡임 · 대사) */
export const WARN_STRESS = 70;

export const isAfflicted = (u: Unit) => !!u.hero?.mood && !MOODS[u.hero.mood].virtue;
export const moodOf = (u: Unit): MoodId | null => u.hero?.mood ?? null;

/** 스트레스 증감. 의지력이 높을수록 덜 받는다 */
export function addStress(w: World, u: Unit, amount: number) {
  const h = u.hero;
  if (!h || !u.alive || !amount) return;
  if (amount > 0) {
    // 이미 무너졌으면 더 쌓이지 않는다
    if (isAfflicted(u)) return;
    amount *= clamp(1 - (u.stats.will - 12) * 0.015, 0.75, 1.15) * w.difficulty.stress;
    if (h.mood === 'stalwart') amount *= 0.5;
    amount *= Math.pow(0.6, u.tagCount('stress_ward'));
    if (amount >= 5) w.float(u, `스트레스 +${Math.round(amount)}`, '#b98cff', 0.85);
  }
  const before = h.stress;
  h.stress = clamp(h.stress + amount, 0, MAX_STRESS);
  // 경고: 곧 무너진다
  if (before < WARN_STRESS && h.stress >= WARN_STRESS && h.stress < MAX_STRESS && !h.mood) {
    w.say(u, '더는 못 버티겠어…', '#d070ff');
    w.log(`${u.name}이(가) 한계에 가까워졌다 (스트레스 ${Math.round(h.stress)})`, '#d070ff');
  }
  if (amount < 0 && isAfflicted(u) && h.stress < MAX_STRESS * 0.75) {
    // 진정되면 붕괴에서 벗어난다
    w.log(`${u.name}이(가) 정신을 추슬렀다 (${MOODS[h.mood!].name} 해소)`, '#b98cff');
    w.float(u, '진정됨', '#b98cff');
    h.mood = null;
  }
  if (h.stress >= MAX_STRESS && !h.mood) resolve(w, u);
}

export function partyStress(w: World, amount: number, except: Unit | null = null) {
  for (const p of w.party) if (p !== except) addStress(w, p, amount);
}

/** 한계 판정: 붕괴 또는 각성 */
function resolve(w: World, u: Unit) {
  const h = u.hero!;
  const virtue = w.rng.chance(VIRTUE_CHANCE);
  let pool = virtue ? VIRTUES : AFFLICTIONS;
  // 이기적은 남을 돕는 기술이 있을 때만 의미가 있다
  if (!virtue && !u.abilities.some((a) => a.def.target === 'ally' || a.def.aiRole === 'heal')) pool = pool.filter((m) => m !== 'selfish');
  const id = pool[w.rng.int(0, pool.length - 1)];
  const m = MOODS[id];
  h.mood = id;
  h.stress = virtue ? 45 : MAX_STRESS;
  w.log(`${u.name}의 정신이 한계에 달했다… ${virtue ? '각성' : '붕괴'} — ${m.name}: ${m.desc}`, m.color);
  const line = m.barks[w.rng.int(0, m.barks.length - 1)];
  w.say(u, line, m.color, 3);
  w.sound('break');
  w.moodBreaks.push({
    unit: u, color: m.color, line, desc: m.desc,
    title: virtue ? `${u.name}, 각성 — ${m.name}!` : `${u.name}이(가) 무너졌다 — ${m.name}!`,
  });
  if (w.moodBreaks.length > 4) w.moodBreaks.shift();
  // 동료의 붕괴는 번지고, 각성은 힘이 된다
  for (const p of w.party) if (p !== u) addStress(w, p, virtue ? -10 : 6);
  moodTimer.set(u, 6);
}

function bark(w: World, u: Unit) {
  const m = MOODS[u.hero!.mood!];
  w.say(u, m.barks[w.rng.int(0, m.barks.length - 1)], m.color);
}

const moodTimer = new WeakMap<Unit, number>();

const calmTimer = new WeakMap<Unit, number>();

/** 0.2초마다: 전투 중 붕괴한 파티원은 동료를 불안하게, 각성한 파티원은 다독인다 */
export function tickStress(w: World, dt: number) {
  if (!w.inCombat) return;
  // 평온의 기도 (특성)
  for (const u of w.party) {
    if (!u.alive || !u.tags.includes('calming')) continue;
    const t = (calmTimer.get(u) ?? 6) - dt;
    calmTimer.set(u, t > 0 ? t : 6);
    if (t <= 0) for (const p of w.party) if (p.alive && dist(p, u) < 7) addStress(w, p, -4);
  }
  for (const u of w.party) {
    const mood = moodOf(u);
    if (!u.alive || !mood) continue;
    const t = (moodTimer.get(u) ?? 8) - dt;
    if (t > 0) {
      moodTimer.set(u, t);
      continue;
    }
    moodTimer.set(u, 5 + w.rng.next() * 3);
    bark(w, u);
    const virtue = MOODS[mood].virtue;
    if (mood === 'focused') continue;
    for (const p of w.party) if (p !== u && p.alive && dist(p, u) < 7) addStress(w, p, virtue ? -5 : 3);
  }
}

const REFUSALS = ['싫어!', '네가 가!', '못 해!', '안 가!'];

/** 붕괴한 파티원이 플레이어의 명령을 따르는가 */
export function obeys(w: World, u: Unit): boolean {
  if (!isAfflicted(u)) return true;
  if (w.time < u.obeyUntil) return true;
  if (w.time < u.refuseUntil) return false;
  if (w.rng.chance(REFUSE_CHANCE)) {
    u.refuseUntil = w.time + 2;
    w.say(u, REFUSALS[w.rng.int(0, REFUSALS.length - 1)], MOODS[u.hero!.mood!].color, 1.8);
    w.float(u, '명령 거부!', MOODS[u.hero!.mood!].color, 1.2);
    return false;
  }
  u.obeyUntil = w.time + 3;
  return true;
}

/** 층 사이 휴식: 스트레스가 줄고 붕괴 · 각성이 풀린다. 쉬는 화면에 보일 문구를 남긴다 */
export function restRelief(h: Hero) {
  const before = h.stress;
  h.stress = Math.max(0, h.stress - REST_RELIEF);
  const mood = h.mood ? MOODS[h.mood] : null;
  h.mood = null;
  h.restNote = before < 1 && !mood ? '' :
    `스트레스 ${Math.round(before)}→<b>${Math.round(h.stress)}</b>` +
    (mood ? ` · ${mood.name} ${mood.virtue ? '사라짐' : '해소'}` : '');
}
