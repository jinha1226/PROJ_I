// 시너지 미리보기 (거점 파티 고르기 · 원정 지도)
import { activeSynergies } from '../data/synergy';
import type { Hero } from '../sim/hero';

export function synergyChips(party: Hero[]): string {
  if (!party.length) return '';
  const syn = activeSynergies(party.map((h) => h.comp));
  if (!syn.length) return '<div class="synrow dim">시너지 없음 — 직업 · 종족 조합을 맞춰 보자</div>';
  return `<div class="synrow">${syn.map((s) => `<span class="syn" style="border-color:${s.color}88;color:${s.color}" title="${s.desc}">${s.name}</span>`).join('')}</div>`;
}
