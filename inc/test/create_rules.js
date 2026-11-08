'use strict';
// 단장 만들기: node test/create_rules.js (DESIGN.md 139). 표와 추천을 SRD 원문(data/srd521/manual.json)과 대조하고, 고른 값이 실제 캐릭터에 들어가는지 본다
const fs = require('fs'), vm = require('vm'), path = require('path');
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8'), FILES = JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'));
let ok = 0, bad = 0; const t = (n, v, x = '') => { if (v) ok++; else { bad++; console.log('  실패:', n, x); } };
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
for (const n of FILES) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, C = G.Create, DN = G.Dnd, GD = G.Guild, SR = G.SRD; G.quiet = true;
const man = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'srd521', 'manual.json'), 'utf8')).nodes;
const table = title => man.flatMap(n => n.tables || []).find(q => q.title === title);
const fresh = () => { G.newState(); const f = G.S.w.fantasy; G.Guild.leader(f); return f; };
const AB_EN = { Strength: 'str', Dexterity: 'dex', Constitution: 'con', Intelligence: 'int', Wisdom: 'wis', Charisma: 'cha' };
// 직업별 표준 배열 · 복잡도 · 주능력 · 1레벨 기능 수
{ const rows = table('Standard Array by Class').rows, ov = table('Class Overview').rows.flatMap(r => [r.slice(0, 4), r.slice(4, 8)]).filter(r => r[0]);
  const CX = { Low: 'low', Average: 'avg', High: 'high' };
  for (const k of C.ORDER) { const D = C.CLS[k], arr = rows.find(r => r[0] === D.en), v = ov.find(r => r[0] === D.en);
    t(`${D.en}: 표준 배열`, arr && arr.slice(1).map(Number).join() === D.arr.join(), arr); t(`${D.en}: 표준 배열은 15 14 13 12 10 8`, D.arr.slice().sort((a, b) => b - a).join() === C.STD.join());
    t(`${D.en}: 복잡도`, CX[v[3]] === D.cx, v); t(`${D.en}: 첫 주능력`, AB_EN[v[2]] === D.pri[0], v);
    const core = man.flatMap(n => n.tables || []).find(q => q.title === `Core ${D.en} Traits`), line = core.rows.map(r => r[0]).find(s => s.startsWith('Primary Ability')); t(`${D.en}: 주능력 전부`, D.pri.every(q => line.includes(Object.keys(AB_EN).find(e => AB_EN[e] === q))) && Object.keys(AB_EN).filter(e => line.includes(e)).length === D.pri.length, line);
    const hd = core.rows.map(r => r[0]).find(s => s.startsWith('Hit Point Die')); t(`${D.en}: 체력 주사위`, hd.includes(`D${DN.CLS[k].hd} `), hd);
    const fe = man.flatMap(n => n.tables || []).find(q => q.title === `${D.en} Features`).rows.find(r => r[0] === '1')[2].split(', '); t(`${D.en}: 1레벨 기능 수`, fe.length === D.feats.length, `${fe} / ${D.feats}`);
    t(`${D.en}: 추천 배경에 주능력`, SR.BG[D.bg].ab.some(q => D.pri.includes(q)), D.bg); t(`${D.en}: 추천 종족 있음`, !!SR.SPECIES[D.sp]); t(`${D.en}: 추천 계통 있음`, !D.line || !!SR.SPECIES[D.sp].line?.[D.line]); }
  t('열두 직업', C.ORDER.length === 12 && C.ORDER.every(k => DN.CLS[k]));
  // 표의 첫 항목은 복잡도 낮은 순
  const order = C.ORDER.map(k => ['low', 'avg', 'high'].indexOf(C.CLS[k].cx)); t('쉬운 직업이 먼저', order.every((v, i) => !i || v >= order[i - 1]));
}
// 포인트 표
{ const rows = table('Ability Score Point Costs').rows.flatMap(r => [r.slice(0, 2), r.slice(2, 4)]); for (const [s, c] of rows) t(`포인트 ${s}`, C.COST[s] === +c, c); t('예산 27', man.find(n => n.title === 'Generate Your Scores').text.includes('27 points') && C.POOL === 27); t('표준 배열 원문', man.find(n => n.title === 'Generate Your Scores').text.includes('15, 14, 13, 12, 10, 8')); }
// 배경 (원문 글): 능력치 · 재주 · 기술
for (const k of Object.keys(SR.BG)) { const B = SR.BG[k], txt = man.find(n => n.title === B.en).text, line = /Ability Scores: ([^\n]*?)\s*(Feat|\n)/.exec(txt)[1], want = Object.keys(AB_EN).filter(e => line.includes(e)).map(e => AB_EN[e]).sort().join(); t(`${B.en}: 능력치`, B.ab.slice().sort().join() === want, line); t(`${B.en}: 재주`, !!G.D.FEATS[B.feat] && txt.includes(G.D.FEATS[B.feat].en.split(' (')[0]), B.feat); }
// 종족 (원문 글): 크기 · 속도
for (const k of Object.keys(SR.SPECIES)) { const P = SR.SPECIES[k], n = man.find(q => q.title === P.en && q.page > 70); t(`${P.en}: 속도`, n.text.includes(`Speed: ${P.move * 5} feet`), P.move); t(`${P.en}: 크기`, n.text.includes(`Size: ${P.size || 'Medium'}`), P.size); }
// 안내: 원문의 뜻을 벗어난 수치가 없다 (주문 수는 표 그대로)
{ for (const [cls, en] of [['cleric', 'Cleric'], ['bard', 'Bard'], ['archmage', 'Wizard']]) { const row = man.flatMap(n => n.tables || []).find(q => q.title === `${en} Features`).rows.find(r => r[0] === '1'), L = GD.limits(cls, 1); t(`${en}: 1레벨 소마법`, row.includes(String(L.cantrip)), row.join()); } }
// 간단: 직업만 고르면 만들어지고 SRD 표대로
for (const k of C.ORDER) { const f = fresh(), q = C.quick(k, ''); t(`${k}: 만든다`, C.make(f, q) === true); const L = GD.leader(f), ab = DN.ab(L); t(`${k}: 직업`, L.cls === k && !f.leaderNew && L.lv === 1); t(`${k}: 표준 배열 + 배경`, C.AB.every(a => ab[a] === C.arrOf(k)[a] + (q.bgAdj[a] || 0)), JSON.stringify(ab)); t(`${k}: 배경 · 재주 · 종족`, L.bg === q.bg && L.feat === SR.BG[q.bg].feat && L.sp === q.sp && G.Res.species(L) === q.sp); t(`${k}: 체력 양수`, DN.srdHP(L) > 0, DN.srdHP(L)); const lim = GD.limits(k, 1); const av = C.spellPool(k), nC = L.skills.filter(s => GD.spLv(s) === 0).length, nP = L.skills.filter(s => GD.spLv(s) > 0).length; t(`${k}: 소마법 수 (표대로, 고를 수 있는 만큼)`, nC === Math.min(lim.cantrip, av.filter(s => GD.spLv(s) === 0).length), `${nC}/${lim.cantrip}`); t(`${k}: 준비 주문 수`, nP === Math.min(lim.prepared, av.filter(s => GD.spLv(s) > 0).length), `${nP}/${lim.prepared}`); }
// 직접: 고른 값이 그대로
{ const f = fresh(), adj = { dex: 1, con: 1, int: 1 }, pick = ['acrobatics', 'perception', 'deception', 'persuasion'], o = { cls: 'rogue', name: '실험', bg: 'criminal', sp: 'tiefling', line: 'infernal', ab: { str: 8, dex: 15, con: 13, int: 12, wis: 10, cha: 14 }, bgAdj: adj, skillPick: pick, skills: [] }; t('직접 만든다', C.make(f, o) === true); const L = GD.leader(f), ab = DN.ab(L); t('이름', L.name === '실험'); t('+1 셋', ab.dex === 16 && ab.con === 14 && ab.int === 13 && ab.cha === 14, JSON.stringify(ab)); t('계통', L.line === 'infernal'); t('고른 기술', pick.every(k => DN.profs(L).includes(k)), DN.profs(L)); t('배경 기술도', SR.BG.criminal.sk.every(k => DN.profs(L).includes(k))); t('다시 못 만든다', C.make(f, o) === false); t('저장 후 그대로', (() => { G.deserialize(G.serialize()); const g = GD.leader(G.S.w.fantasy); return g.bg === 'criminal' && g.bgAdj.int === 1 && g.skillPick.includes('deception') && g.sp === 'tiefling'; })()); }
// 틀린 값은 거절
{ const base = () => C.quick('dragoon', ''); const no = (n, ch) => { const f = fresh(), o = { ...base(), ...ch }; t(`거절: ${n}`, C.make(f, o) === false && f.leaderNew); };
  no('배경 밖 능력치', { bgAdj: { int: 2, wis: 1 } }); no('+3', { bgAdj: { str: 3 } }); no('+2 · +2', { bgAdj: { str: 2, con: 2 } }); no('없는 직업', { cls: 'x' }); no('없는 배경', { bg: 'x' }); no('없는 종족', { sp: 'x' }); no('기술 수 틀림', { skillPick: ['history'] }); no('직업 밖 기술', { skillPick: ['arcana', 'history'] }); no('배경과 겹친 기술', { skillPick: ['athletics', 'history'] }); }
// 저장을 불러와도 주문이 그대로 (옛 저장 옮기기는 한 번만)
{ const f = fresh(); C.make(f, C.quick('cleric', '')); const L = GD.leader(f), keep = L.skills.join(); const merc = GD.make(f, 'archmage', { lv: 5 }); f.mercs.push(merc); merc.skills = merc.skills.concat(GD.spellList('archmage').filter(k => !merc.skills.includes(k) && !G.D.MSKILLS[k]?.noAuto).slice(0, 7)); const mk = merc.skills.join(); for (let i = 0; i < 3; i++) G.deserialize(G.serialize()); const g = G.S.w.fantasy; t('단장 주문이 그대로', GD.leader(g).skills.join() === keep, GD.leader(g).skills.length); t('용병 주문이 그대로', g.mercs.find(m => m.uid === merc.uid).skills.join() === mk, g.mercs.find(m => m.uid === merc.uid).skills.length); }
{ const f = fresh(); const m = GD.make(f, 'archmage', { lv: 5 }); f.mercs.push(m); m.skills = ['없는 기술']; G.deserialize(G.serialize()); const g = G.S.w.fantasy; t('불러올 때 없는 기술은 채운다', !g.mercs[g.mercs.length - 1].skills.includes('없는 기술')); }
t('포인트 계산', C.spent({ str: 15, dex: 15, con: 15, int: 8, wis: 8, cha: 8 }) === 27);
{ const f = fresh(); f.autoTr = f.autoParty = f.autoGo = false; f.mercs = []; f.town = true; f.townT = 99; for (let i = 0; i < 40; i++) G.tick(0.1, 0.1); C.make(f, C.quick('monk', '')); G.Tut.start(f, G.Fantasy.rt(f)); t('만들기 화면에서 시간이 흘러도 단장 혼자 시작', f.mercs.length === 0, f.mercs.map(m => m.cls)); }
// 튜토리얼과 이어진다: 모든 직업 단장으로 첫 원정이 끝까지 간다
for (const k of C.ORDER) { const f = fresh(); f.autoTr = f.autoParty = f.autoGo = false; f.mercs = []; C.make(f, C.quick(k, '')); G.Tut.start(f, G.Fantasy.rt(f)); const rt = G.Fantasy.rt(f); t(`${k}: 단장 혼자 시작`, rt.party.filter(p => p.merc).length === 1 && rt.party[0].merc?.cls === k, rt.party.map(p => p.merc?.cls)); t(`${k}: 단장 레벨 1`, GD.leader(f).lv === 1); let top = 1, c = 0; while (!f.town && c++ < 30000) { G.tick(0.1, 0.1); const r = G.Fantasy.rt(f); if (r.ask) G.Story.answer(r, r.ask.def, 'auto'); top = Math.max(top, f.floor); } t(`${k}: 첫 원정이 끝나 마을로 돌아온다`, f.town, `${f.town} ${top}`); G.Tut.home(f); if (k === 'archer') t('레인저 단장: 합류는 다른 직업', f.mercs.every(m => m.cls !== 'archer'), f.mercs.map(m => m.cls)); }
console.log(`create_rules: 통과 ${ok} · 실패 ${bad}`); if (bad) process.exitCode = 1;
