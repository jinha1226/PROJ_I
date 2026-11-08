'use strict';
// 도감: node test/lore_rules.js (DESIGN.md 122). 공략 조건은 처음엔 모르고, 판정 · 관찰 · 처치로 알아내며, 알면 AI가 대처한다
const fs = require('fs'), vm = require('vm'), path = require('path');
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8'), FILES = JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'));
let ok = 0, bad = 0; const t = (n, v, x = '') => { if (v) ok++; else { bad++; console.log('  실패:', n, x); } };
function boot(crew = ['dragoon', 'cleric', 'rogue'], lv = 12) {
  const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
  for (const n of FILES) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
  const G = ctx.G, GD = G.Guild; G.quiet = true; G.newState();
  const f = G.S.w.fantasy, L = GD.leader(f); f.leaderNew = false; L.lv = lv; f.autoTr = f.autoParty = false; f.askMeet = false;
  const ms = crew.map(c => GD.make(f, c, { lv })); f.mercs.push(...ms); f.lineup = ms.map(m => m.uid); G.Fantasy.syncAllies(f);
  f.floor = f.maxFloor = 8; f.checkpoint = f.start = 8; f.town = true; f.townT = 99; G.Exp.depart(f, G.Fantasy.rt(f));
  const rt = G.Fantasy.rt(f); return { G, f, rt, spawn: n => G.Fantasy.spawnMon(rt, 8, { n, ...G.D.F.mon[n] }, rt.map.start.cx + 2, rt.map.start.cy, false, { aggro: true, spotted: true, major: true }) };
}
{ const { G, f, spawn } = boot(), LO = G.Lore, troll = spawn('트롤'), gob = spawn('고블린 전사'), hy = spawn('히드라');
  t('처음엔 트롤을 모른다', !LO.knows(f, troll));
  t('공략 조건이 없는 몬스터는 모를 것이 없다', LO.knows(f, gob));
  t('모르면 약점을 고려하지 않는다', G.Foe.dealK({}, hy, 'slashing') === 1, G.Foe.dealK({}, hy, 'slashing'));
  t('모르면 칩은 ?', G.Foe.notes('트롤').some(q => q.s === '?') && !G.Foe.notes('트롤').some(q => /화염/.test(q.s)), JSON.stringify(G.Foe.notes('트롤')));
  LO.learn(f, null, hy, 'test'); LO.learn(f, null, troll, 'test');
  t('알면 약점대로 (히드라는 SRD에서 베기에 약점이 없다)', G.Foe.dealK({}, hy, 'slashing') === 1);
  t('알면 칩이 보인다', G.Foe.notes('트롤').some(q => /화염/.test(q.s)));
  t('저장해도 남는다', JSON.parse(JSON.stringify(f.lore))[troll.stat.id].known === true);
}
{ const { G } = boot(), LO = G.Lore;
  for (const [ty, sk] of [['giant', 'history'], ['humanoid', 'history'], ['undead', 'religion'], ['fiend', 'religion'], ['ooze', 'nature'], ['beast', 'nature'], ['plant', 'nature'], ['monstrosity', 'arcana'], ['construct', 'arcana'], ['elemental', 'arcana']]) t(`SRD 지식표 ${ty} → ${sk}`, LO.skillOf({ ty }) === sk, LO.skillOf({ ty }));
}
{ const { G, f, rt, spawn } = boot(), LO = G.Lore, tr = spawn('트롤'), roll0 = G.Mission.roll; let got = null;
  G.Mission.roll = (ff, r0, sk, ex, by, dc) => { got = { sk, dc }; return { who: rt.party[0], nat: 3, mod: 2, dc, ok: false }; };
  LO.meet(f, rt, [tr]); t('조우 때 지식 판정: 트롤은 역사 DC 15', got && got.sk === 'history' && got.dc === 15, JSON.stringify(got)); t('실패하면 아직 모른다', !LO.knows(f, tr));
  got = null; LO.meet(f, rt, [tr]); t('같은 전투에서는 다시 굴리지 않는다', !got);
  LO.observe(f, rt, tr); t('일어서는 걸 보면 DC가 낮아져 다시 굴린다', got && got.dc === 13, JSON.stringify(got));
  for (let i = 0; i < 9; i++) LO.observe(f, rt, tr); t('DC는 5 아래로 안 내려간다', got.dc === 5, got.dc);
  G.Mission.roll = (ff, r0, sk, ex, by, dc) => ({ who: rt.party[0], nat: 18, mod: 2, dc, ok: true }); LO.observe(f, rt, tr); t('성공하면 안다', LO.knows(f, tr)); G.Mission.roll = roll0;
}
{ const { G, f, rt, spawn } = boot(), tr = spawn('트롤'); G.Fantasy.kill(f, rt, tr, 'hit', null); t('처치하면 안다', G.Lore.knows(f, tr)); }
// 실제 전투: 모르는 트롤 하나도 전투가 끝난다 (불 없는 파티)
for (const seed of [1, 2, 3]) {
  const { G, f, rt, spawn } = boot(['dragoon', 'barbarian', 'monk'], 8), roll0 = G.Mission.roll;
  rt.mons = []; G.Mission.roll = (ff, r0, sk, ex, by, dc) => ({ ...roll0.call(G.Mission, ff, r0, sk, ex, by, dc), ok: dc <= 11 }); // 처음 두 번은 실패
  const tr = spawn('트롤'); tr.x = rt.hero.x + 2; tr.y = rt.hero.y; G.Sight.update(rt);
  let n = 0, torchBefore = 0, known0 = 0; const tc = G.Foe.torch; G.Foe.torch = function (...a) { if (!G.Lore.knows(f, tr)) torchBefore++; return tc.apply(this, a); };
  while (n++ < 3000 && tr.hp + (tr.down ? 1 : 0) > 0 && rt.mons.includes(tr) && !f.town) { for (const q of rt.party) q.hp = q.max; if (rt.ask) { rt.ask.done && rt.ask.done(rt.ask.def || 0); rt.ask = null; } G.tick(0.1, 0.1); }
  t(`모르는 트롤과의 전투가 끝난다 (${seed})`, !rt.mons.includes(tr) || tr.hp <= 0 && !tr.down, `n=${n} hp=${tr.hp} down=${tr.down}`);
  t(`모를 때는 횃불을 들지 않는다 (${seed})`, torchBefore === 0, torchBefore);
  t(`전투 끝에는 트롤을 안다 (${seed})`, G.Lore.knows(f, tr));
}
console.log(`lore_rules: 통과 ${ok} · 실패 ${bad}`);
if (bad) process.exitCode = 1;
