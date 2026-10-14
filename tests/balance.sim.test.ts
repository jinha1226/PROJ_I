import {it} from 'vitest';

/**
 * Balance simulation: full auto raids per auto-battle level, reporting
 * survival, haul and combat stats. Slow; run with `npm run sim`.
 */
const enabled = Boolean((globalThis as {process?: {env?: Record<string, string>}}).process?.env?.SIM);
import {emptyGrid, gridValue, makeItem} from '../src/items/inventory';
import {emptySlots} from '../src/items/stores';
import {AutoBattle} from '../src/sim/auto/autoBattle';
import {composeAutomation} from '../src/sim/auto/compose';
import {AutoExplore} from '../src/sim/auto/autoExplore';
import {AutoReturn} from '../src/sim/auto/autoReturn';
import {BASE_MODIFIERS} from '../src/sim/modifiers';
import {Raid} from '../src/sim/raid';
import {idleInput} from '../src/sim/types';
import {generateMap} from '../src/world/mapgen';
it.skipIf(!enabled)('balance simulation', () => {
  for (const lvl of [1, 2, 3]) {
    const res: Record<string, number> = {};
    let value = 0, kills = 0, time = 0;
    const ev: Record<string, number> = {};
    const N = 30;
    for (let seed = 1; seed <= N; seed++) {
      const stores = {grids: {backpack: emptyGrid(6, 5)}, slots: {...emptySlots(), weapon: makeItem('rusty_sword'), belt0: makeItem('bandage', 2), belt1: makeItem('health_potion')}};
      const raid = new Raid(generateMap(seed * 97), {seed, stores, modifiers: {...BASE_MODIFIERS, autoExplore: 2, autoReturn: 1, autoBattle: lvl}});
      let lastState = '';
      const b = new AutoBattle(raid, lvl), e = new AutoExplore(raid, 2), r = new AutoReturn(raid, 1);
      for (let t = 0; t < 900 && !raid.outcome; t += 1 / 30) {
        const inp = composeAutomation(idleInput(), 1 / 30, false, b, e, r);
        lastState = raid.player.state + (inp.dodge ? '+dodgeReq' : '');
        raid.update(1 / 30, inp);
        for (const x of raid.drainEvents()) {
          if (x.type === 'playerHurt') { ev.hurt = (ev.hurt ?? 0) + 1; ev.dmg = (ev.dmg ?? 0) + x.damage; const k = 'hurtIn_' + lastState + (x.heavy ? '_bolt' : ''); ev[k] = (ev[k] ?? 0) + 1; }
          if (x.type === 'dodge' && x.actor === 0) ev.dodge = (ev.dodge ?? 0) + 1;
          if (x.type === 'evade') ev.evade = (ev.evade ?? 0) + 1;
          if (x.type === 'healed' && x.actor === 0) ev.heal = (ev.heal ?? 0) + 1;
          if (x.type === 'windup') ev.windup = (ev.windup ?? 0) + 1;
          if (x.type === 'shoot') ev.shots = (ev.shots ?? 0) + 1;
          if (x.type === 'swing') ev.swing = (ev.swing ?? 0) + 1;
        }
      }
      res[raid.outcome ?? 'timeout'] = (res[raid.outcome ?? 'timeout'] ?? 0) + 1;
      if (raid.outcome === 'extracted') value += gridValue(raid.stores.grids.backpack);
      kills += raid.kills; time += raid.time;
    }
    console.log(`battle L${lvl}: ${JSON.stringify(res)} avgHaul(extracted)=${Math.round(value / Math.max(1, res.extracted ?? 0))} avgKills=${(kills / N).toFixed(1)} avgTime=${Math.round(time / N)}s ${JSON.stringify(ev)}`);
  }
}, 600000);
