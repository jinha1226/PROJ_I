import type {HeroType} from '../types';

export const HERO_LABELS: Readonly<Record<HeroType, string>> = Object.freeze({
  Knight: '전사',
  Rogue_Hooded: '궁수',
  Mage: '마법사',
});

export function heroLabel(type: string): string {
  return (HERO_LABELS as Record<string, string>)[type] ?? type;
}

export const PARTY_SLOTS: readonly (readonly [number, number])[] = Object.freeze([
  [0, 0],
  [-0.55, 0.6],
  [0.55, 0.6],
]);

export function formationOffset(index: number): readonly [number, number] {
  return PARTY_SLOTS[index] ?? [0, 0];
}
