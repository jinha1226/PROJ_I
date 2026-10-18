// 몬스터를 한눈에: 약점 · 저항 · 면역 · 위험 행동 · 대처법, 그리고 "우리 파티의 무엇이 잘 통하고 안 통하는지".
// 정보 창과 첫 조우 카드가 같이 쓴다. 수치는 combat.resistMult 와 같은 규칙.
import { RES_NAME } from '../data/names';
import { STATUSES } from '../data/statuses';
import { ELEMENT_NAME } from './combat';
import { RESIST_KEYS, type Element, type ResistKey } from './defs';
import type { Unit } from './unit';

export interface Chip {
  text: string;
  /** good = 우리에게 유리, bad = 불리, warn = 조심 */
  kind: 'good' | 'bad' | 'warn';
}

export interface FoeNotes {
  weak: Chip[];
  strong: Chip[];
  danger: Chip[];
  /** 우리 파티 기술 · 평타별 상성 (눈에 띄는 것만) */
  vs: Chip[];
  tip: string;
}

/** 대상의 원소 피해 배율 (resistMult 와 같은 규칙, 상태 없이 정의 + 장비 기준) */
function mult(t: Unit, el: Element): number {
  if (el === 'physical' || el === 'holy') return 1;
  const lvl = t.stats.resists[el as ResistKey];
  if (el === 'poison') return lvl >= 1 ? 0 : 1;
  return lvl <= -1 ? 1.5 : lvl === 0 ? 1 : lvl === 1 ? 0.5 : lvl === 2 ? 0.33 : 0.2;
}

export function foeNotes(t: Unit, party: Unit[]): FoeNotes {
  const weak: Chip[] = [], strong: Chip[] = [], danger: Chip[] = [];
  for (const k of RESIST_KEYS) {
    const v = t.stats.resists[k];
    if (!v) continue;
    if (v < 0) weak.push({ text: `${RES_NAME[k]} 약점 (×1.5)`, kind: 'good' });
    else if (k === 'poison') strong.push({ text: '독 면역', kind: 'bad' });
    else if (v >= 3) strong.push({ text: `${RES_NAME[k]} 거의 면역`, kind: 'bad' });
    else strong.push({ text: `${RES_NAME[k]} 저항 (×${v === 1 ? '½' : '⅓'})`, kind: 'bad' });
  }
  if (t.tags.includes('mindless')) strong.push({ text: '공포 · 저주 안 통함', kind: 'bad' });
  if (t.tags.includes('unstunnable')) strong.push({ text: '기절 면역', kind: 'bad' });
  if (t.stats.ac >= 5) strong.push({ text: '갑옷 두꺼움 (물리 피해 감소)', kind: 'bad' });
  if (t.stats.ev >= 9) strong.push({ text: '날렵함 (자주 빗나감)', kind: 'bad' });
  if (t.stats.ac <= 1 && t.stats.ev <= 6) weak.push({ text: '맷집 약함', kind: 'good' });
  if (!t.tags.includes('mindless') && t.stats.will <= 10) weak.push({ text: '정신 약함 (저주 · 공포 잘 통함)', kind: 'good' });

  const w = t.weapon;
  if (w.element && w.element !== 'physical') danger.push({ text: `공격이 ${ELEMENT_NAME[w.element]} 피해`, kind: 'warn' });
  if (w.onHit) danger.push({ text: `맞으면 ${STATUSES[w.onHit.status].name}`, kind: 'warn' });
  if (w.range > 1.5) danger.push({ text: '원거리 공격', kind: 'warn' });
  if (t.def.speed >= 3.2) danger.push({ text: '매우 빠름', kind: 'warn' });
  if (t.def.targetPref === 'backline') danger.push({ text: '후열을 노림', kind: 'warn' });
  if (t.def.regen) danger.push({ text: '빠르게 재생 — 불을 붙이면 멈춘다', kind: 'warn' });
  if (t.def.lifesteal) danger.push({ text: '때리면 체력을 빨아들인다', kind: 'warn' });
  if (t.def.splitInto) danger.push({ text: '쓰러지면 둘로 갈라진다', kind: 'warn' });
  if (t.def.regen) weak.push({ text: '화상에 약함 (재생 멈춤)', kind: 'good' });
  for (const a of t.abilities) danger.push({ text: `${a.def.name}: ${a.def.desc}`, kind: 'warn' });

  // 우리 파티: 원소 피해 기술 · 원소 평타 · 독 · 정신 효과
  const vs: Chip[] = [];
  const seen = new Set<string>();
  for (const p of party) {
    if (!p.alive) continue;
    const add = (name: string, m: number) => {
      const key = `${p.name}:${name}`;
      if (seen.has(key) || m === 1) return;
      seen.add(key);
      vs.push(m > 1 ? { text: `${p.name} ${name} ✓ 잘 통함`, kind: 'good' } : { text: `${p.name} ${name} ✗ ${m === 0 ? '안 통함' : '약함'}`, kind: 'bad' });
    };
    if (p.weapon.element) add(`평타(${ELEMENT_NAME[p.weapon.element]})`, mult(t, p.weapon.element));
    for (const st of p.abilities) {
      if (st.hidden) continue;
      for (const e of st.def.effects) {
        if (e.kind === 'damage') add(st.def.name, mult(t, e.element));
        if (e.kind === 'status' && e.status === 'poison') add(st.def.name, mult(t, 'poison') === 0 ? 0 : 1);
        if (e.kind === 'status' && e.will && t.tags.includes('mindless')) add(st.def.name, 0);
      }
    }
  }
  return { weak, strong, danger, vs, tip: t.def.tip ?? '' };
}

/** 첫 조우 카드용 한 줄 요약 */
export function foeSummary(t: Unit, party: Unit[]): string {
  const n = foeNotes(t, party);
  const parts: string[] = [];
  if (n.weak.length) parts.push(`약점: ${n.weak.map((c) => c.text).join(', ')}`);
  if (n.strong.length) parts.push(`강함: ${n.strong.map((c) => c.text).join(', ')}`);
  return parts.join(' · ');
}
