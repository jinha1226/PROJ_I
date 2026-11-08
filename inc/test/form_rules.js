'use strict';
// 진형 기억 규칙: node test/form_rules.js
// 정해 둔 자리는 부상 · 교체로 명단에서 빠졌다 돌아와도 남는다
const fs = require('fs'), vm = require('vm'), path = require('path');
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8'), FILES = JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'));
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
for (const n of FILES) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, F = G.Fantasy, GD = G.Guild; G.quiet = true;
let bad = 0, n = 0; const t = (name, ok, got) => { n++; if (!ok) { bad++; console.log(`  ✗ ${name}`, got === undefined ? '' : got); } };
const boot = () => { G.newState(); const f = G.S.w.fantasy; f.leaderNew = false; f.autoParty = false; const ms = ['cleric', 'archmage', 'rogue'].map(c => GD.make(f, c, { lv: 3 })); f.mercs.push(...ms); f.lineup = ms.map(m => m.uid); F.syncAllies(f); return { f, ms, L: GD.leader(f) }; };
const hurt = (f, m) => { m.inj = 99; f.lineup = f.lineup.filter(u => u !== m.uid); F.formation(f); };
const heal = (f, m) => { m.inj = 0; f.lineup = [...f.lineup, m.uid]; return F.formation(f); };

{ const { f, ms } = boot(), m = ms[0]; F.setCell(f, m.uid, 1); hurt(f, m); t('빠진 동안 칸이 비었다', F.formation(f)[m.uid] == null); t('돌아오면 정한 칸', heal(f, m)[m.uid] === 1, F.formation(f)[m.uid]); t('되돌린 뒤 기억을 지운다', f.formMem[m.uid] == null); }
{ const { f, ms } = boot(), m = ms[0], o = ms[1]; F.setCell(f, m.uid, 1); hurt(f, m); F.setCell(f, o.uid, 1); const form = heal(f, m); t('칸을 다른 사람이 차지하면 빼앗지 않는다', form[o.uid] === 1 && form[m.uid] !== 1, form); t('그래도 자리는 받는다', form[m.uid] != null && form[m.uid] >= 0 && form[m.uid] <= 8, form[m.uid]); }
{ const { f, ms } = boot(); F.setCell(f, ms[0].uid, 0); F.setCell(f, ms[1].uid, 8); hurt(f, ms[0]); hurt(f, ms[1]); heal(f, ms[0]); const form = heal(f, ms[1]); t('둘이 빠져도 각자 칸으로', form[ms[0].uid] === 0 && form[ms[1].uid] === 8, form); }
{ const { f, ms } = boot(), form = F.formation(f), cells = Object.values(form); t('처음 자리는 그대로 역할로 (힐러는 뒷줄)', (form[ms[0].uid] / 3 | 0) === 2, form[ms[0].uid]); t('한 칸에 한 명', new Set(cells).size === cells.length, cells); }
{ const { f, ms } = boot(), m = ms[2]; F.setCell(f, m.uid, 7); hurt(f, m); const back = JSON.parse(JSON.stringify(G.S)).w.fantasy; t('기억이 저장에 실린다', back.formMem[m.uid] === 7, back.formMem); }
console.log(`진형 기억 검사: ${n}건, 실패 ${bad}건`);
if (bad) process.exitCode = 1;
