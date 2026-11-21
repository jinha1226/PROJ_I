'use strict';
// 직접 조종 (js/game/ctrl.js): 조종하는 사람의 차례에 엔진이 멈추고, 명령(이동 · 공격 · 기술 · 끝 · 자동)으로 전투를 끝까지 치른다
//   node test/ctrl_rules.js
const { boot, spawn } = require('./_fight.js');
let pass = 0, fail = 0; const ok = (n, c, d = '') => { if (c) pass++; else { fail++; console.log('  실패:', n, d); } };
// brain(G, f, r, view) → 명령 · 판이 끝나면 { win, inputs, log }
function fight(seed, who, brain, { foes = ['Goblin Warrior', 'Goblin Warrior', 'Goblin Warrior'], dice = true } = {}) {
  const { G, f, r } = boot(seed); spawn(G, r, foes);
  const p = typeof who === 'function' ? who(r) : r.party[who], C = G.Ctrl; C.clear(); C.auto = false; if (p) C.only(p.merc);
  if (dice) { const D = G.Dice; D.party = () => r.party.filter(q => !q.dead && q.hp > 0); D.roster = () => r.party; D.cur = () => r.turn?.cur || null; D.newBoard(); }
  let round = 0, inputs = 0; const log = [];
  for (let k = 0; k < 6000; k++) {
    const T = r.turn; if (dice && T && T.round !== round) { round = T.round; G.Dice.useRound(T.round); G.Dice.fire(); }
    const I = C.cur(r);
    if (I) {
      ok('차례 주인이 조종하는 사람', I.e === p); const v = C.view(f, r); inputs++;
      const c = brain(G, f, r, v, I); const res = C.cmd(f, r, c); log.push([Object.keys(c)[0], res.ok, res.why || '']);
      if (!res.ok) C.cmd(f, r, { end: true }); // 막히면 차례를 넘긴다 (멈춰 서지 않게)
      continue;
    }
    G.tick(0.1);
    const fs = r.mons.filter(m => m.hp > 0), ps = r.party.filter(q => !q.dead && q.hp > 0);
    if (!fs.length || !ps.length) return { G, f, r, p, win: !!ps.length, inputs, log };
  }
  return { G, f, r, p, win: false, inputs, log, timeout: true };
}
// 걸어가서 친다: 칠 수 있으면 공격, 아니면 가장 가까운 적 쪽 칸으로 걷고, 그래도 안 되면 끝
const melee = (G, f, r, v) => {
  const can = v.foes.find(o => o.can); if (can) return { atk: can.e };
  const tg = v.foes[0]?.e || r.mons.find(m => m.hp > 0); if (!tg || !v.move.length) return { end: true };
  const best = v.move.reduce((a, b) => (Math.hypot(b.x - tg.x, b.y - tg.y) < Math.hypot(a.x - tg.x, a.y - tg.y) ? b : a));
  return Math.hypot(best.x - v.e.x, best.y - v.e.y) < 0.5 ? { end: true } : { move: best };
};
// 1) 파이터를 조종해 걸어가 친다
{ const R = fight(3, 0, melee);
  ok('파이터 조종: 이긴다', R.win, JSON.stringify(R.log.slice(-6)));
  ok('파이터 조종: 명령을 여러 번 받았다', R.inputs >= 2, R.inputs);
  ok('파이터 조종: 걷고 쳤다', R.log.some(q => q[0] === 'move' && q[1]) && R.log.some(q => q[0] === 'atk' && q[1]), JSON.stringify(R.log)); }
// 2) 차례의 눈 · 미리보기: 눈을 알면 맞음 · 빗나감이 갈린다 (0.95 · 0.05)
{ let seenDie = false, sharp = true;
  fight(5, 0, (G, f, r, v) => { if (v.die) seenDie = true; for (const o of v.foes) if (o.pv && v.die && !v.die.special && ![0.95, 0.05].includes(+o.pv.p.toFixed(2)) && !G.Dnd.adv(v.e, o.e)) sharp = false; return melee(G, f, r, v); });
  ok('미리보기: 차례의 눈이 보인다', seenDie); ok('미리보기: 눈으로 맞음 · 빗나감이 갈린다', sharp); }
// 3) 소서러를 조종해 기술을 쓴다 (쓸 수 있는 행동 기술 중 첫째 → 적에게)
{ let used = null, why = [];
  const R = fight(7, r => r.party.find(q => q.merc.cls === 'mage'), (G, f, r, v) => {
    const s = v.skills.find(q => q.ok && !q.bonus && !q.heal), tg = v.foes[0]?.e;
    if (s && tg && !used) { used = s.k; return { sk: s.k, tg }; }
    const can = v.foes.find(o => o.can); return can ? { atk: can.e } : { end: true };
  });
  for (const q of R.log) if (q[0] === 'sk' && !q[1]) why.push(q[2]);
  ok('소서러 조종: 기술을 썼다', used && R.log.some(q => q[0] === 'sk' && q[1]), `${used} ${why.join(' ')}`);
  ok('소서러 조종: 이긴다', R.win); }
// 4) 자동: 조종하는 사람의 차례를 AI에게 넘겨도 판이 끝난다 · 모두 자동이면 묻지 않는다
{ const R = fight(9, 0, () => ({ auto: true })); ok('자동 단추: 이긴다', R.win, JSON.stringify(R.log.slice(-4))); }
{ const { G, f, r } = boot(11); spawn(G, r, ['Goblin Warrior']); G.Ctrl.only(r.party[0].merc); G.Ctrl.auto = true; let asked = 0;
  for (let k = 0; k < 3000 && r.mons.some(m => m.hp > 0); k++) { if (G.Ctrl.cur(r)) asked++; G.tick(0.1); }
  ok('모두 자동: 묻지 않는다', !asked && !r.mons.some(m => m.hp > 0)); G.Ctrl.auto = false; }
// 5) 전원 조종 (모듈은 사람 수와 상관없다): 셋 다 차례마다 명령을 받는다
{ const { G, f, r } = boot(13); spawn(G, r, ['Goblin Warrior', 'Goblin Warrior']); G.Ctrl.all(r.party.map(p => p.merc)); const who = new Set();
  for (let k = 0; k < 6000 && r.mons.some(m => m.hp > 0) && r.party.some(p => !p.dead); k++) { const I = G.Ctrl.cur(r); if (I) { who.add(I.e); const res = G.Ctrl.cmd(f, r, melee(G, f, r, G.Ctrl.view(f, r))); if (!res.ok) G.Ctrl.cmd(f, r, { end: true }); continue; } G.tick(0.1); }
  ok('전원 조종: 셋 모두 명령을 받는다', who.size === 3, who.size); ok('전원 조종: 이긴다', !r.mons.some(m => m.hp > 0)); G.Ctrl.clear(); }
// 6) 잘못된 명령은 거절한다
const R6 = {};
{ const R = fight(15, 0, (G, f, r, v) => { const far = r.mons.find(m => m.hp > 0 && !v.foes.find(o => o.e === m && o.can)); if (far && !R6.tried) { R6.tried = true; R6.res = G.Ctrl.cmd(f, r, { atk: far }); R6.wall = G.Ctrl.cmd(f, r, { move: { x: 0, y: 0 } }); } return melee(G, f, r, v); });
  ok('닿지 않는 적은 못 친다 · 벽으로는 못 간다', R6.res && !R6.res.ok && R6.wall && !R6.wall.ok, JSON.stringify(R6)); }
console.log(`ctrl_rules: 통과 ${pass} · 실패 ${fail}`);
if (fail) process.exitCode = 1;
