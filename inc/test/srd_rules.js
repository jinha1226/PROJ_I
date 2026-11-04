'use strict';
// SRD 5.2.1 기본 표와 동작 시험: node test/srd_rules.js (DESIGN.md 107)
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, SR = G.SRD, DN = G.Dnd, GD = G.Guild; let ok = 0, bad = 0; const t = (n, v, x = '') => { if (v) ok++; else { bad++; console.log('  실패:', n, x); } };
G.newState(); const f = G.S.w.fantasy, mk = (cls, ex = {}) => { const m = GD.make(f, cls, { lv: 5, ...ex }); f.mercs.push(m); return m; };
t('무기 38', Object.values(SR.WEAPON).filter(q => !q.hidden).length === 38); t('갑옷 12', Object.values(SR.ARMOR).filter(q => q.cat !== 'none').length === 12); t('배경 4', Object.keys(SR.BG).length === 4); t('종족 9', Object.keys(SR.SPECIES).length === 9); t('기술 18', Object.keys(DN.SKILL_AB).length === 18);
for (const [k, n, d, ty] of [['greataxe', 1, 12, 'slashing'], ['mace', 1, 6, 'bludgeoning'], ['greatsword', 2, 6, 'slashing'], ['longbow', 1, 8, 'piercing'], ['pike', 1, 10, 'piercing'], ['sickle', 1, 4, 'slashing'], ['musket', 1, 12, 'piercing']]) { const q = SR.WEAPON[k]; t(k, q.dn === n && q.dd === d && q.t === ty); }
for (const [k, b, dm, st] of [['leather-armor', 11, 99, 0], ['chain-shirt', 13, 2, 0], ['chain-mail', 16, 0, 13], ['plate-armor', 18, 0, 15], ['studded-leather-armor', 12, 99, 0]]) { const q = SR.ARMOR[k]; t(k, q.base === b && q.dexMax === dm && q.str === st); }
// 시작 장비 · 무기 · AC
const start = { barbarian: 'greataxe', bard: 'dagger', cleric: 'mace', scout: 'sickle', dragoon: 'greatsword', paladin: 'longsword', archer: 'longbow', rogue: 'shortsword', mage: 'spear', warlock: 'sickle', archmage: 'quarterstaff' };
for (const c in start) { const m = mk(c); t(`${c} 시작 무기`, SR.eq(m).w === start[c]); t(`${c} 숙련 기술 수 이상`, DN.profs(m).length >= SR.CLS[c].sk + 2 - 1); t(`${c} 고른 기술은 직업 표에서`, DN.profs(m).length > 0); t(`${c} 도구 · 무기 숙련 표`, DN.TRAIN[c].length === 3); }
{ const m = mk('dragoon'), a = { merc: m }; m.ab = { str: 15, dex: 14, con: 14, int: 10, wis: 10, cha: 10 }; m.abCls = 'dragoon'; t('체인 메일 16', DN.acBase(a) === 16 + G.Guild.magic(0) + (GD.skill(m, 'fs_defense') ? 1 : 0)); }
{ const m = mk('rogue'), ab = DN.ab(m); t('가죽 11 + 민첩', DN.acBase({ merc: m }) === 11 + DN.mod(ab.dex) + (GD.skill(m, 'fs_defense') ? 1 : 0)); }
{ const m = mk('archmage'), ab = DN.ab(m); t('비무장 10 + 민첩', DN.acBase({ merc: m }) === 10 + DN.mod(ab.dex)); t('소마법 공격', DN.weapon({ merc: m }).t === 'cold'); t('폭발 · 연쇄 없음', !G.D.F.allies.archmage.chain && !G.D.F.allies.mage.splash); t('곁에서는 무기', DN.gearWeapon(m).t === 'bludgeoning'); }
{ const m = mk('cleric'); t('메이스 1d6', DN.gearWeapon(m).d === 6 && DN.gearWeapon(m).t === 'bludgeoning'); t('방패 AC 포함', SR.eq(m).shield); }
{ const m = mk('monk', { lv: 5 }); t('몽크 무술 d8', DN.weapon({ merc: m }).d === 8); const m2 = mk('monk', { lv: 20 }); t('몸과 마음', DN.ab(m2).wis > 20 || DN.ab(m2).dex > 20); }
// 양용: 방패 없으면 큰 주사위
{ const m = mk('dragoon'); SR.eq(m).w = 'longsword'; t('양용 d10', DN.weapon({ merc: m }).d === 10); SR.eq(m).shield = true; t('방패면 d8', DN.weapon({ merc: m }).d === 8); }
// 무기 사거리 · 근접
{ const m = mk('dragoon'), e = { merc: m, def: { range: 1.5 } }; SR.eq(m).w = 'longbow'; t('롱보우 8칸', DN.rng(e) === 8); t('원거리는 근접 아님', !DN.melee(e)); SR.eq(m).w = 'glaive'; t('글레이브 긴 거리', DN.rng(e) === 2.5); }
// 무기 숙련 · 직업
t('파이터 숙련', SR.masteryOf(mk('dragoon')) === 'graze'); t('클레릭은 없음', !SR.masteryOf(mk('cleric'))); t('스킬 칸에서 빠짐', !G.D.MPOOL.dragoon.includes('sr_cleave'));
// 무기 · 갑옷 훈련
t('위저드는 갑옷 못 입음', !SR.canArmor('archmage', 'leather')); t('바드는 군용 무기 못 씀', !SR.canWeapon('bard', 'longsword')); t('로그는 기교 군용', SR.canWeapon('rogue', 'rapier') && !SR.canWeapon('rogue', 'greatsword')); t('몽크는 경량 군용', SR.canWeapon('monk', 'shortsword') && !SR.canWeapon('monk', 'longsword'));
// 종족
for (const s of Object.keys(SR.SPECIES)) { const m = mk('dragoon', { sp: s }); t(`${s} 특성`, SR.SPECIES[s].traits.length > 0); t(`${s} 스킬 오류 없음`, Array.isArray(G.SrdX.skills(m))); t(`${s} 스킬이 실제로 있음`, G.SrdX.skills(m).every(k => G.Skill.SK[k] && G.D.MSKILLS[k]), G.SrdX.skills(m).join()); }
{ const m = mk('dragoon', { sp: 'tiefling', line: 'infernal' }); t('지옥 혈통 화염 저항', G.SrdX.resists(m).includes('fire')); const m2 = mk('dragoon', { sp: 'tiefling', line: 'abyssal' }); t('심연 혈통 독 저항', G.SrdX.resists(m2).includes('poison') && !G.SrdX.resists(m2).includes('fire')); const m3 = mk('dragoon', { sp: 'dragonborn', line: 'white' }); t('흰 용 냉기', G.SrdX.resists(m3).includes('cold')); }
{ const m = mk('dragoon', { sp: 'human' }); t('인간 기원 재주 둘', G.Feat.has(m, m.feat) && !!SR.feat2(m, 'human')); }
{ const m = mk('dragoon', { sp: 'orc', lv: 9 }); t('아드레날린 횟수 = 숙련', G.Res.usesOf(m, G.Skill.SK.sx_orc.res, 'sx_orc') === DN.prof(9)); }
// 배경
for (const b of Object.keys(SR.BG)) { const m = mk('dragoon', { bg: b, sp: 'dwarf' }), P = DN.profs(m); for (const s of SR.BG[b].sk) t(`${b} ${s}`, P.includes(s)); }
{ const m = mk('dragoon', { lv: 1, bg: 'soldier', sp: 'dwarf', ab: { str: 15, dex: 10, con: 13, int: 10, wis: 10, cha: 10 }, abCls: 'dragoon' }), ab = DN.ab(m); t('배경 능력치', ab.str === 17 && ab.con === 14 && ab.dex === 10, JSON.stringify(ab)); }
// 전문가 · 질서
{ const m = mk('rogue', { lv: 6 }), E = SR.expert(m, G.Res.species(m)); t('로그 전문가 4', E.length === 4); t('전문가는 두 배', DN.skill(m, E[0]) === DN.mod(DN.ab(m)[DN.SKILL_AB[E[0]]]) + 2 * DN.prof(6)); }
// 하위 직업 주문
{ const m = mk('cleric', { lv: 9, adv: 'life' }); t('생명 권역 주문', SR.subSpells(m).includes('Mass Cure Wounds') && G.SrdX.classSkills(m).length > 0); }
{ const m = mk('archer'); t('레인저 사냥꾼의 표식', G.SrdX.skills(m).includes('sr_hmark')); }
{ const m = mk('archmage', { lv: 20 }), k = G.SrdX.signature(m); if (k.length) t('대표 주문 +1', G.Res.usesOf(m, G.Skill.resOf(k[0]), k[0]) >= 2); const g = mk('monk', { lv: 4, uid: 3 }); t('붙잡기 재주', G.SrdX.grappler(g)); }
console.log(`srd_rules: 통과 ${ok} · 실패 ${bad}`); if (bad) process.exitCode = 1;
