import type {UpgradeKey} from '../types';

export interface UpgradeInfo {
  label: string;
  detail: string;
  baseCost: number;
  /** Highest purchasable level. */
  maxLevel: number;
}

export const UPGRADES: Readonly<Record<UpgradeKey, UpgradeInfo>> = {
  attack: {label: '공격력', detail: '레벨당 +12%', baseCost: 20, maxLevel: Infinity},
  health: {label: '최대 HP', detail: '레벨당 +15%', baseCost: 20, maxLevel: Infinity},
  healing: {label: '치유 강화', detail: '레벨당 +20%', baseCost: 25, maxLevel: Infinity},
  dodge: {label: '위험 회피 AI', detail: 'Lv.1: 보스 충격파 예고 시 범위 밖으로 이동 (1회 구매)', baseCost: 120, maxLevel: 1},
};

export const UPGRADE_KEYS = Object.keys(UPGRADES) as UpgradeKey[];
export const UPGRADE_COST_GROWTH = 1.55;
/** Saved upgrade levels are clamped to this range when loading. */
export const MAX_SAVED_UPGRADE_LEVEL = 100;
