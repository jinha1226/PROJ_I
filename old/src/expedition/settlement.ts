import type {Actor, Guild} from '../types';
import {expeditionReward, type RewardInput} from './rules';

export interface SettlementInput {
  guild: Guild;
  actors: readonly Pick<Actor, 'team' | 'dead' | 'hp'>[];
  successful: boolean;
  discoveredTiles: number;
  loot: number;
  steps: number;
  kills: number;
  rewardCalculator?: (input: RewardInput) => number;
}

export interface Settlement {
  survivors: number;
  reward: number;
  steps: number;
  kills: number;
}

export function settleExpedition({
  guild,
  actors,
  successful,
  discoveredTiles,
  loot,
  steps,
  kills,
  rewardCalculator = expeditionReward,
}: SettlementInput): Settlement {
  const survivors = actors.filter(a => a.team === 'hero' && !a.dead && a.hp > 0).length;
  const reward = rewardCalculator({successful, survivors, discoveredTiles, loot});
  guild.expeditions++;
  guild.deepest = Math.max(guild.deepest, steps);
  guild.supplies += reward;
  guild.activeExpedition = false;
  return {survivors, reward, steps, kills};
}

export function expeditionSummary(message: string, {survivors, reward, steps, kills}: Settlement): string {
  return `${message} · 생존 ${survivors}명 · 처치 ${kills} · 이동 ${steps}칸 · 보급품 +${reward}${reward ? '' : ' (전리품 미회수)'}`;
}
