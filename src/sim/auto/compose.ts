import type {SimInput} from '../types';
import type {AutoBattle} from './autoBattle';
import type {AutoExplore} from './autoExplore';
import type {AutoReturn} from './autoReturn';

/**
 * Who drives this frame, in priority order:
 * 1. the auto-return (walking home; battle only dodges),
 * 2. the auto-battle while enemies are engaged,
 * 3. the auto-explore otherwise.
 * Manual input always wins inside each of them.
 */
export function composeAutomation(human: SimInput, dt: number, manual: boolean, battle: AutoBattle, explore: AutoExplore, ret: AutoReturn): SimInput {
  if (ret.returning) return battle.defend(ret.apply(human, dt, manual));
  const fought = battle.apply(human, dt, manual);
  const driven = battle.engaged ? fought : explore.apply(human, dt, manual);
  const next = ret.apply(driven, dt, manual);
  return ret.returning ? battle.defend(next) : next;
}
