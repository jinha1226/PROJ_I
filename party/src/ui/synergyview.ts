// 시너지 · 합동기 미리보기 (거점 파티 고르기 · 원정 지도)
import { COMBOS } from '../data/combos';
import { activeSynergies } from '../data/synergy';
import type { Hero } from '../sim/hero';

export function synergyChips(party: Hero[]): string {
  if (!party.length) return '';
  const comps = party.map((h) => h.comp);
  const syn = activeSynergies(comps).map((s) => `<span class="syn" style="border-color:${s.color}88;color:${s.color}" title="${s.desc}">${s.name}</span>`);
  const cls = party.map((h) => h.cls);
  const combos = COMBOS.filter((c) => {
    const i = cls.indexOf(c.pair[0]);
    if (i < 0) return false;
    return cls.some((x, j) => x === c.pair[1] && j !== i);
  }).map((c) => `<span class="syn combo" style="color:${c.ability.color}" title="합동기: ${c.ability.desc}">⚡${c.ability.name}</span>`);
  if (!syn.length && !combos.length) return '<div class="synrow dim">시너지 없음 — 직업 · 종족 조합을 맞춰 보자</div>';
  return `<div class="synrow">${syn.join('')}${combos.join('')}</div>`;
}
