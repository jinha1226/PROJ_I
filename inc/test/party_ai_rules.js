'use strict';
// 스킬 AI의 파티 단위 판단 (js/ai/skill_ai.js — 2026-11-20 4단계): node test/party_ai_rules.js
//   ① 이미 그 효과가 있는 아군에게는 버프 값이 없다 (축복을 둘이 겹쳐 걸지 않는다)
//   ② 이미 행동 불능인 적에게 묶는 주문의 값은 없다
//   ③ 마비의 근접 치명타 몫은 근접 아군이 곁에 있어야 산다
//   ④ 감속은 다중 공격하는 적에게 값지다 (엔진: 공격 하나 · 반응 없음) · ⑤ 교활한 행동은 다쳐서 붙어 있을 때 물러나 빠진다
const { boot, spawn } = require('./_fight.js');
let pass = 0, fail = 0; const ok = (n, c, d = '') => { if (c) pass++; else { fail++; console.log('  실패:', n, d); } };
function scene(cls, bid, lv, mons = ['산적 두목', '산적']) {
  const { G, f } = boot(3); G.Reward.on = true;
  const mk = (c, b) => { const m = G.Party.trim(G.Guild.make(f, c, { lv: 1, ab: G.Party.stdAb(c) })); G.Builds.apply(m, G.Builds.byId(b)); for (let L = 2; L <= lv; L++) { m.lv = L; G.Guild.grow(m); } m.lvq = []; return m; };
  const ms = [mk(cls, bid), mk('dragoon', 'fighter'), mk('rogue', 'rogue')];
  f.mercs.length = 0; f.mercs.push(...ms); f.lineup = ms.map(m => m.uid); f.town = true; const rt = G.Fantasy.rt(f); G.Fantasy.syncAllies(f); f.town = false; rt.mons = [];
  rt.party = rt.party.filter(p => ms.includes(p.merc)); const a = rt.party.find(p => p.merc === ms[0]); rt.party.forEach((p, i) => { p.x = 4; p.y = 6 + i; });
  spawn(G, rt, mons); rt.mons.forEach((o, i) => { o.x = 9; o.y = 6 + i; o.hp = o.max = 200; });
  rt.turn = { map: rt.map, round: 1, order: rt.party.concat(rt.mons).map(e => ({ e })), i: 0, cur: a, ph: 'wait', t: 1 };
  const x = { f, rt, c: a, seen: rt.mons.slice() }; return { G, rt, a, x, sc: k => G.SkillAI.score(k, a, x, G.SkillAI.threat(a, x)) };
}
{ const { G, rt, sc } = scene('cleric', 'cleric', 5); const v0 = sc('sr_bless'); for (const p of rt.party) G.Dnd.buff(p, 'bless', G.Res_ROUND * 10, { hitD: 4, saveD: 4 }); const v1 = sc('sr_bless');
  ok('축복: 모두에게 이미 걸려 있으면 값이 없다', v0 > 0.5 && v1 < v0 * 0.2, `${v0.toFixed(2)} → ${v1.toFixed(2)}`); }
{ const { G, rt, sc } = scene('archmage', 'wizard_control', 9); const v0 = sc('sp_hold_monster'); for (const o of rt.mons) G.Dnd.give(rt, o, 'stunned', G.Res_ROUND * 3, null); const v1 = sc('sp_hold_monster');
  ok('괴물 포박: 적이 모두 이미 기절해 있으면 값이 없다', v0 > 0.5 && v1 < v0 * 0.2, `${v0.toFixed(2)} → ${v1.toFixed(2)}`); }
{ const { rt, a, sc } = scene('archmage', 'wizard_control', 9); for (const p of rt.party) if (p !== a) { p.x = 8; } /* 근접 아군이 적 곁에 */ const near = sc('sp_hold_monster'); for (const p of rt.party) if (p !== a) { p.x = 1; p.y = 1; } const far = sc('sp_hold_monster');
  ok('괴물 포박: 근접 아군이 곁에 없으면 값이 줄어든다 (마비의 치명타는 근접만)', near > far, `${near.toFixed(2)} / ${far.toFixed(2)}`); }
// ④ 감속 (SRD): 공격 하나 · 반응 없음 — 다중 공격을 하는 적에게 걸수록 값이 크다 (값은 엔진의 공격 목록으로 잰다)
{ const A = scene('archmage', 'wizard_control', 9, ['트롤', '트롤']), B = scene('archmage', 'wizard_control', 9, ['고블린 전사', '고블린 전사']);
  const o = A.rt.mons[0], n0 = A.G.Foe.attacks(o).length; A.G.Dnd.buff(o, 'slow', A.G.Res_ROUND * 10, { ac: -2 }); const n1 = A.G.Foe.attacks(o).length, re = A.G.Dnd.react(o); delete o.bf.slow;
  ok('감속: 걸린 적은 공격이 하나 · 반응 없음', n0 > 1 && n1 === 1 && !re, `${n0} → ${n1} · 반응 ${re}`);
  const vA = A.sc('sr_slow'), vB = B.sc('sr_slow'); ok('감속: 다중 공격하는 적(트롤)에게 더 값지다', vA > vB, `트롤 ${vA.toFixed(2)} · 고블린 ${vB.toFixed(2)}`); }
// ⑤ 교활한 행동: 다쳐서 붙어 있으면 물러나 실제로 빠진다 · 멀쩡한 근접은 쓰지 않는다
{ const { G, rt, a, x, sc } = scene('rogue', 'rogue', 5); a.x = 8; a.y = 6; const v1 = sc('sr_cunning'); a.hp = a.max * 0.3; const v2 = sc('sr_cunning');
  ok('교활한 행동: 멀쩡하면 값이 없고 다쳐서 붙어 있으면 있다', v1 <= 0.05 && v2 > 0.5, `${v1.toFixed(2)} → ${v2.toFixed(2)}`);
  const d0 = Math.min(...rt.mons.map(o => Math.hypot(o.x - a.x, o.y - a.y))); G.Act.cunning(x.f, rt, a); const d1 = Math.min(...rt.mons.map(o => Math.hypot(o.x - a.x, o.y - a.y)));
  ok('교활한 행동: 물러나면 적의 손이 닿지 않는 곳으로 빠진다', d0 <= 1.8 && d1 > 1.8, `${d0.toFixed(1)} → ${d1.toFixed(1)}`); }
console.log(`party_ai_rules: 통과 ${pass} · 실패 ${fail}`);
if (fail) process.exitCode = 1;
