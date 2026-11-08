'use strict';
// 명성 · 건물: node test/fac_rules.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx);
const G = ctx.G, GD = G.Guild, F = G.Fantasy; let ok = 0, bad = 0; const t = (n, c, x = '') => { if (c) ok++; else { bad++; console.log('  실패:', n, x); } };
G.quiet = true; G.newState(); const f = G.S.w.fantasy; f.gold = 1e6; f.fameAll = 0; f.maxFloor = 40;
t('처음은 무명', GD.rank(f).n === '무명');
t('완성된 마을: 건물은 처음부터 1단계 (DESIGN.md 155)', Object.keys(G.D.FAC).every(k => GD.fac(f, k) === 1) && GD.ROSTER_MAX === 12);
t('명성 없으면 숙소 2단계 못 짓는다', !GD.build(f, 'hall') && GD.fac(f, 'hall') === 1);
{ const g = f.gold; f.fameAll = 100; t('명성이 쌓이면 올린다', GD.build(f, 'hall') && GD.fac(f, 'hall') === 2); t('금화를 쓴다', f.gold === g - 3000); t('명성은 줄지 않는다', f.fameAll === 100); t('숙소가 명단을 늘린다', GD.ROSTER_MAX === 16); }
t('다음 단계는 더 높은 명성', !GD.build(f, 'hall'));
{ f.fameAll = 0; let mx = 0; for (let i = 0; i < 60; i++) mx = Math.max(mx, GD.make(f, 'dragoon').lv); t('무명은 낮은 용병만', mx <= 2 + GD.fac(f, 'tavern'), mx); f.fameAll = 300; mx = 0; for (let i = 0; i < 60; i++) mx = Math.max(mx, GD.make(f, 'dragoon').lv); t('유명하면 더 높은 레벨', mx > 2, mx); }
{ const g = f.gold; f.fameAll = 0; GD.earnFame(f, 40, '시험'); t('등급이 오른다', GD.rank(f).n === '알려진'); t('금화 무관', f.gold === g); }
{ const m = GD.make(f, 'cleric', { lv: 5 }); f.mercs.push(m); m.inj = 90; t('신전은 처음부터 있다', GD.fac(f, 'temple') === 1); const g = f.gold; t('치료', GD.treat(f, m) && m.inj === 0 && f.gold === g - 100); m.stress = 50; const g2 = f.gold; t('주점', GD.drink(f, m) && m.stress === 20 && f.gold === g2 - 25); m.stress = 50; t('귀환당 한 번', !GD.drink(f, m)); }
{ f.stock = null; f.lastHome = 7; let s = G.Items.stock(f); t('대장간 1단계(처음): 희귀까지, 매우 희귀는 없다', !s.some(q => q.art && G.D.ARTS[q.art].r >= 3)); f.fac.forge = 2; s = G.Items.stock(f); t('대장간 2단계가 매우 희귀를 연다', s.some(q => q.art && G.D.ARTS[q.art].r === 3)); }
{ const m = GD.make(f, 'bard', { lv: 3 }); m.job = 'priest'; f.mercs.push(m); t('옛 직책이 남아도 출전한다', GD.ready(f).includes(m)); GD.migrate(f); t('불러오면 옛 직책을 지운다', m.job === undefined); }
{ f.fameTree = { fm_start: 2, fm_keep: 1, fm_gold: 1, fm_roster: 1 }; f.fac.hall = 0; let e = null; try { GD.migrate(f); } catch (x) { e = x; } t('없앤 건물이 든 옛 저장도 열린다', !e, e); t('남은 건물은 옮긴다', GD.fac(f, 'hall') === 1); t('없앤 건물은 버린다', !f.fac.vault && !f.fac.trade); }
t('직책 코드 없음', !G.D.JOBS && !GD.assign && !GD.jobPow);
console.log(`fac_rules: 통과 ${ok} · 실패 ${bad}`); if (bad) process.exitCode = 1;
