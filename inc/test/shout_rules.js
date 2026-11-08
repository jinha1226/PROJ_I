'use strict';
// 치유 외침: node test/shout_rules.js (DESIGN.md 133). 치유가 일어나면 시전자가 스킬 이름을 외친다 (화면은 a.skLog를 꺼내 띄운다)
const fs = require('fs'), vm = require('vm'), path = require('path');
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8'), FILES = JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'));
let ok = 0, bad = 0; const t = (n, v, x = '') => { if (v) ok++; else { bad++; console.log('  실패:', n, x); } };
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
for (const n of FILES) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, F = G.Fantasy, GD = G.Guild;
function boot() { G.quiet = true; G.newState(); const f = G.S.w.fantasy, L = GD.leader(f); f.leaderNew = false; L.lv = 6; f.autoTr = f.autoParty = false; f.askMeet = false; const ms = ['cleric', 'dragoon', 'archmage'].map(c => GD.make(f, c, { lv: 6 })); f.mercs.push(...ms); f.lineup = ms.map(m => m.uid); F.syncAllies(f); f.floor = f.maxFloor = 1; f.checkpoint = f.start = 1; f.town = true; f.townT = 99; G.Exp.depart(f, F.rt(f)); return { f, rt: F.rt(f) }; }
// 기본 치유 (F.healTurn)
{ const { f, rt } = boot(), c = rt.party.find(p => p.merc?.cls === 'cleric'), low = rt.party.find(p => p.merc && p !== c); t('치유 몸', !!c?.def.heal, c?.def.heal); low.x = c.x; low.y = c.y; low.hp = 1; c.atkT = 0; c.slotUsed = false; G.quiet = false; const h0 = low.hp, r = F.healTurn(f, rt, c, 99); G.quiet = true; t('치유했다', r && low.hp > h0, low.hp); t('이름을 외친다', (c.skLog || []).includes('sr_cure'), c.skLog); t('이름이 있다', !!G.D.MSKILLS.sr_cure.n); }
{ const { f, rt } = boot(), c = rt.party.find(p => p.merc?.cls === 'cleric'), low = rt.party.find(p => p.merc && p !== c); low.x = c.x; low.y = c.y; low.hp = 1; c.atkT = 0; c.slotUsed = false; F.healTurn(f, rt, c, 99); t('시뮬레이션에서는 쌓지 않는다', !c.skLog?.length); }
{ const { f, rt } = boot(), c = rt.party.find(p => p.merc?.cls === 'cleric'); for (const p of rt.party) p.hp = p.max; c.atkT = 0; G.quiet = false; F.healTurn(f, rt, c, 99); G.quiet = true; t('치유 안 하면 안 외친다', !c.skLog?.length, c.skLog); }
// 기술로 쓰는 치유 (G.Skill.tick)
{ const { f, rt } = boot(), c = rt.party.find(p => p.merc?.cls === 'cleric'), low = rt.party.find(p => p.merc && p !== c); low.x = c.x; low.y = c.y; low.hp = 1; c.merc.skills = ['sr_cure']; rt.turn = {}; G.quiet = false; G.Skill.tick(f, rt, c, 0, [], 0); G.quiet = true; rt.turn = null; t('기술 치유도 외친다', (c.skLog || []).includes('sr_cure'), c.skLog); }
console.log(`shout_rules: 통과 ${ok} · 실패 ${bad}`); if (bad) process.exitCode = 1;
