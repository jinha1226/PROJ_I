// 사례 4: 좁은 통로 차단 확인
import { MAP1 } from '../src/data/maps';
import { World } from '../src/sim/world';
const w = new World({ ...MAP1, spawns: [{ id: 'orc', x: 18, y: 4 }, { id: 'orc', x: 19, y: 5 }, { id: 'goblin', x: 18, y: 6 }, { id: 'hyena', x: 20, y: 4 }] }, 5);
const [war, mage, archer, healer] = w.party;
war.x = 11.5; war.y = 4.5; war.holdPos = { x: 11.5, y: 4.5 };
for (const p of [mage, archer, healer]) { p.x = 5.5; p.holdPos = { x: p.x, y: p.y }; }
for (const u of w.units) if (u.faction === 'enemy') u.aware = true;
let leaked = 0;
while (w.time < 40 && !w.outcome && w.units.some(u => u.faction === 'enemy' && u.alive)) {
  w.tick(1 / 60);
  for (const u of w.units) if (u.faction === 'enemy' && u.alive && u.x < war.x - 0.3 && war.alive) leaked++;
}
console.log('time', w.time.toFixed(1), 'leaked ticks', leaked, 'warrior', war.alive, Math.round(war.hp), 'enemies left', w.units.filter(u => u.faction==='enemy' && u.alive).length);
console.log(w.logs.map(l => l.text).join('\n'));
