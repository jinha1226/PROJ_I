'use strict';
// 스킬 AI의 파티 단위 판단 (js/ai/skill_ai.js — 2026-11-20 4단계): node test/party_ai_rules.js
//   ① 이미 그 효과가 있는 아군에게는 버프 값이 없다 (축복을 둘이 겹쳐 걸지 않는다)
//   ② 이미 행동 불능인 적에게 묶는 주문의 값은 없다
//   ③ 마비의 근접 치명타 몫은 근접 아군이 곁에 있어야 산다
const { boot, spawn } = require('./_fight.js');
let pass = 0, fail = 0; const ok = (n, c, d = '') => { if (c) pass++; else { fail++; console.log('  실패:', n, d); } };
function scene(cls, bid, lv) {
  const { G, f } = boot(3); G.Reward.on = true;
  const mk = (c, b) => { const m = G.Party.trim(G.Guild.make(f, c, { lv: 1, ab: G.Party.stdAb(c) })); G.Builds.apply(m, G.Builds.byId(b)); for (let L = 2; L <= lv; L++) { m.lv = L; G.Guild.grow(m); } m.lvq = []; return m; };
  const ms = [mk(cls, bid), mk('dragoon', 'fighter'), mk('rogue', 'rogue')];
  f.mercs.length = 0; f.mercs.push(...ms); f.lineup = ms.map(m => m.uid); f.town = true; const rt = G.Fantasy.rt(f); G.Fantasy.syncAllies(f); f.town = false; rt.mons = [];
  rt.party = rt.party.filter(p => ms.includes(p.merc)); const a = rt.party.find(p => p.merc === ms[0]); rt.party.forEach((p, i) => { p.x = 4; p.y = 6 + i; });
  spawn(G, rt, ['산적 두목', '산적']); rt.mons.forEach((o, i) => { o.x = 9; o.y = 6 + i; o.hp = o.max = 200; });
  rt.turn = { map: rt.map, round: 1, order: rt.party.concat(rt.mons).map(e => ({ e })), i: 0, cur: a, ph: 'wait', t: 1 };
  const x = { f, rt, c: a, seen: rt.mons.slice() }; return { G, rt, a, x, sc: k => G.SkillAI.score(k, a, x, G.SkillAI.threat(a, x)) };
}
{ const { G, rt, sc } = scene('cleric', 'cleric', 5); const v0 = sc('sr_bless'); for (const p of rt.party) G.Dnd.buff(p, 'bless', G.Res_ROUND * 10, { hitD: 4, saveD: 4 }); const v1 = sc('sr_bless');
  ok('축복: 모두에게 이미 걸려 있으면 값이 없다', v0 > 0.5 && v1 < v0 * 0.2, `${v0.toFixed(2)} → ${v1.toFixed(2)}`); }
{ const { G, rt, sc } = scene('archmage', 'wizard_control', 9); const v0 = sc('sp_hold_monster'); for (const o of rt.mons) G.Dnd.give(rt, o, 'stunned', G.Res_ROUND * 3, null); const v1 = sc('sp_hold_monster');
  ok('괴물 포박: 적이 모두 이미 기절해 있으면 값이 없다', v0 > 0.5 && v1 < v0 * 0.2, `${v0.toFixed(2)} → ${v1.toFixed(2)}`); }
{ const { rt, a, sc } = scene('archmage', 'wizard_control', 9); for (const p of rt.party) if (p !== a) { p.x = 8; } /* 근접 아군이 적 곁에 */ const near = sc('sp_hold_monster'); for (const p of rt.party) if (p !== a) { p.x = 1; p.y = 1; } const far = sc('sp_hold_monster');
  ok('괴물 포박: 근접 아군이 곁에 없으면 값이 줄어든다 (마비의 치명타는 근접만)', near > far, `${near.toFixed(2)} / ${far.toFixed(2)}`); }
console.log(`party_ai_rules: 통과 ${pass} · 실패 ${fail}`);
if (fail) process.exitCode = 1;
