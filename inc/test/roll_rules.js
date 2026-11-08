'use strict';
// 굴림 표시: node test/roll_rules.js. 보이는 숫자로 명중과 빗나감을 설명할 수 있어야 한다 (엄폐 · 이점 · 불리 포함)
const fs = require('fs'), vm = require('vm'), path = require('path');
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8'), FILES = JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'));
let ok = 0, bad = 0; const t = (n, v, x = '') => { if (v) ok++; else { bad++; console.log('  실패:', n, x); } };
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
for (const n of FILES) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, F = G.Fantasy, GD = G.Guild, DN = G.Dnd, T = G.Turn;
// 문구
t('평범한 굴림', T.rollCalc({ mod: 7, ac: 13 }) === '+7 · AC 13', T.rollCalc({ mod: 7, ac: 13 }));
t('음수 보정', T.rollCalc({ mod: -1, ac: 13 }) === '−1 · AC 13');
t('엄폐', T.rollCalc({ mod: 7, ac: 13, cov: 2 }) === '+7 · AC 13 · 엄폐 +2');
t('불리', T.rollCalc({ mod: 7, ac: 13, adv: -1 }) === '+7 · AC 13 · 불리');
t('이점', T.rollCalc({ mod: 7, ac: 13, adv: 1 }) === '+7 · AC 13 · 이점');
t('둘 다', T.rollCalc({ mod: 7, ac: 13, cov: 2, adv: -1 }) === '+7 · AC 13 · 엄폐 +2 · 불리');
t('표시 없음', T.rollMark({ mod: 7, ac: 13 }) === '');
// 실제 전투의 모든 공격 기록
function boot(front) { G.quiet = true; G.newState(); const f = G.S.w.fantasy, L = GD.leader(f); f.leaderNew = false; L.lv = 6; f.autoTr = f.autoParty = false; f.askMeet = false; const ms = ['cleric', 'dragoon', 'archmage'].map(c => GD.make(f, c, { lv: 6 })); f.mercs.push(...ms); f.lineup = ms.map(m => m.uid); F.syncAllies(f); f.floor = f.maxFloor = 1; f.checkpoint = f.start = 1; f.town = true; f.townT = 99; if (front) f.front = front; G.Exp.depart(f, F.rt(f)); return { f, rt: F.rt(f) }; }
const recs = [], note0 = T.note; T.note = r => { if (!r.sv && r.att?.merc) recs.push(r); note0.call(T, r); };
for (const front of [null, 'astral']) for (let s = 0; s < 6; s++) { const { f, rt } = boot(front); for (const q of rt.party) q.max = q.hp = 1e6; G.Story.askRetreat = () => false; for (let i = 0; i < 2500 && !f.town && f.floor === 1; i++) { for (const q of rt.party) if (!q.dead) q.hp = q.max; G.tick(0.1, 0.1); if (rt.ask) G.Story.answer(rt, rt.ask.def, 'auto'); } }
T.note = note0;
t('공격이 기록됐다', recs.length > 50, recs.length);
t('엄폐가 있는 공격도 있다', recs.some(r => r.cov > 0));
t('불리한 공격도 있다', recs.some(r => r.adv < 0));
t('모두 cov와 adv가 있다', recs.every(r => typeof r.cov === 'number' && r.adv != null), recs.length);
// 빗나감은 보이는 숫자로 설명된다: 눈 + 보정 < AC + 엄폐 (1은 언제나 빗나감). 명중도 같다 (치명타 제외)
const wrongMiss = recs.filter(r => !r.hit && r.nat !== 1 && r.nat + r.mod >= r.ac + r.cov), wrongHit = recs.filter(r => r.hit && !r.crit && r.nat + r.mod < r.ac + r.cov);
t('빗나감이 숫자와 맞다', !wrongMiss.length, JSON.stringify(wrongMiss.slice(0, 2).map(r => [r.nat, r.mod, r.ac, r.cov])));
t('명중이 숫자와 맞다', !wrongHit.length, JSON.stringify(wrongHit.slice(0, 2).map(r => [r.nat, r.mod, r.ac, r.cov])));
// 전투 기록: 머리말과 결과가 어긋나지 않는다 (DESIGN.md 151)
{ const lines = [], ROUNDS = 6, TICKS = 2500; for (let s = 0; s < ROUNDS; s++) { const { f, rt } = boot(null); G.quiet = false; G.Story.askRetreat = () => false; let id = 0; for (const q of rt.party) q.max = q.hp = 1e6; for (let i = 0; i < TICKS && !f.town && f.floor === 1; i++) { for (const q of rt.party) if (!q.dead) q.hp = q.max; G.tick(0.1, 0.1); if (rt.ask) G.Story.answer(rt, rt.ask.def, 'auto'); for (const c of rt.chat || []) if (c.id > id) { id = c.id; lines.push(c.s); } } G.quiet = true; }
  const has = re => lines.filter(x => re.test(x)).slice(0, 2).join(' | ');
  t('기록이 쌓였다', lines.length > 100, lines.length);
  t('빗나감에 피해가 붙지 않는다', !has(/빗나감 → .*\d+ 피해/), has(/빗나감 → .*\d+ 피해/));
  t('명중에 결과가 빠지지 않는다', !has(new RegExp('(명중|치명타) → (?!.*(피해|회복)).*$')), has(new RegExp('(명중|치명타) → (?!.*(피해|회복)).*$')));
  t('피해는 정수다', !has(/\d\.\d/), has(/\d\.\d/));
  t('여러 번 치면 횟수로 적는다', !!has(/\d회 중 \d 명중/)); }
console.log(`roll_rules: 통과 ${ok} · 실패 ${bad}`); if (bad) process.exitCode = 1;
