import {STORAGE_KEYS, HERO_TYPES} from '../config';
import {
  BASE_LOADOUT_SLOTS,
  DEFAULT_LOADOUT,
  MAX_TACTIC_LEVEL,
  TACTIC_IDS,
  TACTIC_INFO,
  TACTIC_UPGRADE_COSTS,
  UNLOCKED_LOADOUT_SLOTS,
  tacticsForRole,
} from '../data/tactics';
import {MAX_SAVED_UPGRADE_LEVEL, UPGRADES, UPGRADE_COST_GROWTH, UPGRADE_KEYS} from '../data/upgrades';
import {readJson, writeJson, type KeyValueStore} from '../persistence/store';
import type {HeroType, Progress, TacticId, UpgradeKey} from '../types';

const toInt = (value: unknown, fallback: number): number => Math.floor(Number(value) || fallback);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export function createDefaultProgress(): Progress {
  return {
    wins: 0,
    gold: 0,
    stage: 1,
    highestStage: 1,
    farming: false,
    tacticLevels: Object.fromEntries(TACTIC_IDS.map(id => [id, 1])) as Record<TacticId, number>,
    upgrades: {attack: 0, health: 0, healing: 0, dodge: 0},
    loadout: {
      Knight: [...DEFAULT_LOADOUT.Knight],
      Rogue_Hooded: [...DEFAULT_LOADOUT.Rogue_Hooded],
      Mage: [...DEFAULT_LOADOUT.Mage],
    },
  };
}

/** Validates untrusted save data, falling back to defaults field by field. */
export function parseProgress(raw: unknown): Progress {
  const progress = createDefaultProgress();
  if (!isRecord(raw) || !Number.isInteger(raw.wins) || (raw.wins as number) < 0) return progress;

  progress.wins = raw.wins as number;
  progress.gold = Math.max(0, toInt(raw.gold, 0));
  progress.stage = Math.max(1, toInt(raw.stage, 1));
  progress.highestStage = Math.max(progress.stage, toInt(raw.highestStage, progress.stage));
  progress.farming = Boolean(raw.farming);

  const levels = isRecord(raw.tacticLevels) ? raw.tacticLevels : {};
  for (const id of TACTIC_IDS) progress.tacticLevels[id] = Math.max(1, Math.min(MAX_TACTIC_LEVEL, toInt(levels[id], 1)));

  const upgrades = isRecord(raw.upgrades) ? raw.upgrades : {};
  for (const key of UPGRADE_KEYS) progress.upgrades[key] = Math.max(0, Math.min(MAX_SAVED_UPGRADE_LEVEL, toInt(upgrades[key], 0)));

  const loadout = isRecord(raw.loadout) ? raw.loadout : {};
  for (const role of HERO_TYPES) {
    const choices = tacticsForRole(role);
    const saved = loadout[role];
    const selected = Array.isArray(saved) ? saved.filter((id): id is TacticId => choices.includes(id as TacticId)) : [];
    if (selected.length) progress.loadout[role] = [...new Set(selected)].slice(0, UNLOCKED_LOADOUT_SLOTS);
  }
  return progress;
}

export interface BattleResult {
  victory: boolean;
  /** Gold actually added to the purse. */
  goldAwarded: number;
}

/** Owns the permanent (cross-expedition) progression and its persistence. */
export class Progression {
  readonly data: Progress;

  constructor(private readonly store: KeyValueStore) {
    this.data = parseProgress(readJson(store, STORAGE_KEYS.progress));
  }

  save(): void {
    writeJson(this.store, STORAGE_KEYS.progress, this.data);
  }

  get stage(): number {
    return this.data.stage;
  }

  tacticLevel(id: TacticId): number {
    return this.data.tacticLevels[id] || 1;
  }

  tacticCost(id: TacticId): number {
    const level = this.tacticLevel(id);
    return level >= MAX_TACTIC_LEVEL ? Infinity : TACTIC_UPGRADE_COSTS[level - 1];
  }

  loadoutSlots(): number {
    return this.data.wins >= 1 ? UNLOCKED_LOADOUT_SLOTS : BASE_LOADOUT_SLOTS;
  }

  upgradeCost(key: UpgradeKey): number {
    const info = UPGRADES[key];
    if (this.data.upgrades[key] >= info.maxLevel) return Infinity;
    return Math.ceil(info.baseCost * Math.pow(UPGRADE_COST_GROWTH, this.data.upgrades[key]));
  }

  buyUpgrade(key: UpgradeKey): boolean {
    const cost = this.upgradeCost(key);
    if (this.data.gold < cost || !Number.isFinite(cost)) return false;
    this.data.gold -= cost;
    this.data.upgrades[key]++;
    this.save();
    return true;
  }

  levelUpTactic(id: TacticId): boolean {
    const cost = this.tacticCost(id);
    if (this.tacticLevel(id) >= MAX_TACTIC_LEVEL || this.data.gold < cost) return false;
    this.data.gold -= cost;
    this.data.tacticLevels[id]++;
    this.save();
    return true;
  }

  /** Equips or unequips a tactic. A role must always keep at least one. */
  toggleTactic(role: HeroType, id: TacticId): boolean {
    if (TACTIC_INFO[id].role !== role) return false;
    const equipped = this.data.loadout[role];
    const index = equipped.indexOf(id);
    if (index >= 0) {
      if (equipped.length <= 1) return false;
      equipped.splice(index, 1);
    } else if (equipped.length < this.loadoutSlots()) {
      equipped.push(id);
    }
    this.save();
    return true;
  }

  recordBattle(heroesSurvived: boolean): BattleResult {
    const p = this.data;
    if (heroesSurvived) {
      const goldAwarded = 10 + p.stage * 5;
      p.wins++;
      p.gold += goldAwarded;
      if (p.farming) {
        p.farming = false;
        p.stage = p.highestStage;
      } else {
        p.stage++;
        p.highestStage = Math.max(p.highestStage, p.stage);
      }
      this.save();
      return {victory: true, goldAwarded};
    }
    p.farming = true;
    p.stage = Math.max(1, p.highestStage - 1);
    this.save();
    return {victory: false, goldAwarded: 0};
  }
}
