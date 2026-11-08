'use strict';
// 노리는 대상 표시: node test/aim_rules.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx);
const T = ctx.G.Turn; let ok = 0, bad = 0; const t = (n, c, x = '') => { if (c) ok++; else { bad++; console.log('  실패:', n, x); } };
const us = { kind: 'ally' }, foe = { kind: 'mon' }, pal = { kind: 'ally' }, A = (cur, tg, ph, done) => T.aim({ turn: { cur, tg, ph, done } });
t('전투 밖 없음', T.aim({}) === null);
for (const ph of ['show', 'move', 'pre']) { const a = A(us, foe, ph); t(ph + ': 우리가 적을', a.plan && a.list[0].e === foe && a.list[0].kind === 'foe'); }
t('적이 우리를', A(foe, us, 'move').list[0].kind === 'atk');
t('동료를 향하면 회복', A(us, pal, 'pre').list[0].kind === 'heal');
t('행동 뒤 기록 없음', A(us, foe, 'wait') === null);
t('행동 뒤는 실제 맞은 쪽', A(us, foe, 'wait', { from: us, list: [{ e: pal, kind: 'heal' }] }).list[0].e === pal);
t('다른 사람의 기록은 안 그린다', A(us, foe, 'wait', { from: foe, list: [{ e: us, kind: 'atk' }] }) === null);
t('이름', typeof T.nameOf === 'function');
console.log(`aim_rules: 통과 ${ok} · 실패 ${bad}`); if (bad) process.exitCode = 1;
