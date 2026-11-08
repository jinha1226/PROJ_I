'use strict';
// 기술 설명의 능력치 자리: node test/desc_rules.js. 「2d8 + 능력치」가 아니라 그 용병의 실제 값 「2d8+4」로 쓴다
const fs = require('fs'), vm = require('vm'), path = require('path');
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8'), FILES = JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'));
let ok = 0, bad = 0; const t = (n, v, x = '') => { if (v) ok++; else { bad++; console.log('  실패:', n, x); } };
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
for (const n of FILES) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, GD = G.Guild, DN = G.Dnd, SK = G.Skill; G.quiet = true; G.newState();
const f = G.S.w.fantasy, make = (cls, lv = 12) => GD.make(f, cls, { lv });
// 능력치를 원하는 값으로 고정한다 (수정치는 (값 − 10) / 2 내림)
const withAb = (m, set, fn) => { const real = DN.ab; DN.ab = q => (q === m ? { ...real(q), ...set } : real(q)); try { return fn(); } finally { DN.ab = real; } };

{ const m = make('cleric');
  t('양수: 2d8+4', withAb(m, { wis: 18 }, () => SK.text(m, 'sr_cure')) === '가장 다친 동료 2d8+4 · 슬롯당 +2d8', withAb(m, { wis: 18 }, () => SK.text(m, 'sr_cure')));
  t('0이면 더하지 않는다', withAb(m, { wis: 10 }, () => SK.text(m, 'sr_cure')) === '가장 다친 동료 2d8 · 슬롯당 +2d8', withAb(m, { wis: 10 }, () => SK.text(m, 'sr_cure')));
  t('음수: 2d8−1', withAb(m, { wis: 8 }, () => SK.text(m, 'sr_cure')) === '가장 다친 동료 2d8−1 · 슬롯당 +2d8', withAb(m, { wis: 8 }, () => SK.text(m, 'sr_cure')));
  t('회복 칸 주사위도 같은 값', withAb(m, { wis: 18 }, () => SK.dice(m, 'sr_cure')) === '2d8+4', withAb(m, { wis: 18 }, () => SK.dice(m, 'sr_cure')));
  t('전체 설명(desc)도 값으로', withAb(m, { wis: 18 }, () => SK.desc(m, 'sr_cure')).includes('2d8+4'));
  t('원본 데이터는 그대로', G.D.MSKILLS.sr_cure.d === '가장 다친 동료 2d8 + 능력치');
  t('사람 없이 부르면 원문', SK.text(null, 'sr_cure') === '가장 다친 동료 2d8 + 능력치');
}
// 화면 값 = 전투에서 실제로 더하는 값
for (const cls of ['cleric', 'paladin', 'archer', 'scout', 'bard']) for (const k of ['sr_cure', 'sr_hword']) {
  if (!G.D.MSKILLS[k]) continue; const m = make(cls), real = SK.H.pmod({ merc: m }), got = /d\d+([+−]\d+)?( ·|$)/.exec(SK.text(m, k))?.[1] || '+0', num = +got.replace('−', '-');
  t(`${cls} ${k}: 실제 수정치와 같다`, num === real, `${SK.text(m, k)} / ${real}`);
}
{ const m = make('paladin'), a = make('monk'), r = make('archer'), wl = make('warlock');
  t('명명된 능력: 신성한 무기 명중 +매력', withAb(m, { cha: 16 }, () => SK.text(m, 'sr_sacred')) === '10라운드 명중 +3', withAb(m, { cha: 16 }, () => SK.text(m, 'sr_sacred')));
  t('최솟값 1: 신성한 무기 (전투와 같게)', withAb(m, { cha: 8 }, () => SK.text(m, 'sr_sacred')) === '10라운드 명중 +1', withAb(m, { cha: 8 }, () => SK.text(m, 'sr_sacred')));
  t('무술 주사위 + 지혜 → 주사위+값', withAb(a, { wis: 14 }, () => SK.text(a, 'sr_whole')) === `체력 절반 아래 1d${DN.weapon({ merc: a, swing: true }).d}+2`, withAb(a, { wis: 14 }, () => SK.text(a, 'sr_whole')));
  t('임시 체력 + 횟수', withAb(r, { wis: 14 }, () => SK.text(r, 'sr_tireless')) === '임시 체력 1d8+2 · 2번', withAb(r, { wis: 14 }, () => SK.text(r, 'sr_tireless')));
  t('임시 체력 음수 · 횟수는 최소 1', withAb(r, { wis: 8 }, () => SK.text(r, 'sr_tireless')) === '임시 체력 1d8−1 · 1번', withAb(r, { wis: 8 }, () => SK.text(r, 'sr_tireless')));
  t('능력 둘 · 레벨: AC와 체력을 계산', withAb(wl, { dex: 14, cha: 16 }, () => SK.text(wl, 'sr_dres')) === `AC 15 · 체력 +${wl.lv + 2}`, withAb(wl, { dex: 14, cha: 16 }, () => SK.text(wl, 'sr_dres')));
  t('매력만큼의 적 → 적 3명', withAb(m, { cha: 16 }, () => SK.text(m, 'ft_abjure')).startsWith('적 3명 지혜 내성'), withAb(m, { cha: 16 }, () => SK.text(m, 'ft_abjure')));
  const c = make('cleric'); t('지혜만큼 d8 → 4d8', withAb(c, { wis: 18 }, () => SK.text(c, 'ft_sear')) === '언데드 퇴치에 4d8 광휘', withAb(c, { wis: 18 }, () => SK.text(c, 'ft_sear')));
  const d = make('dragoon'), b = DN.weapon({ merc: d, swing: true }).b;
  t('무기 능력치: 스치기 = 무기 수정치', SK.text(d, 'wm_graze') === `무기 공격 · 빗나가도 ${Math.max(1, b)} 피해`, SK.text(d, 'wm_graze'));
}
{ const m = make('cleric'), w = make('mage');
  t('고정값이 있는 치유는 능력치를 더하지 않는다 (전투와 같게)', SK.text(m, 'sp_regenerate') === '4d8+15 회복', SK.text(m, 'sp_regenerate'));
  t('고정값도 주사위 칸에', SK.dice(m, 'sp_regenerate') === '4d8+15', SK.dice(m, 'sp_regenerate'));
  t('주사위 다시: 개수', withAb(w, { cha: 16 }, () => SK.text(w, 'mm_empower')).includes('주사위를 3개 다시'), withAb(w, { cha: 16 }, () => SK.text(w, 'mm_empower')));
}
// 직업별 능력 (SRD): 주문 능력 · 집중 · 교활한 일격
{ const EXP = { barbarian: 'str', bard: 'cha', cleric: 'wis', scout: 'wis', dragoon: 'str', monk: 'wis', paladin: 'cha', archer: 'wis', rogue: 'dex', mage: 'cha', warlock: 'cha', archmage: 'int' };
  for (const [c, a] of Object.entries(EXP)) { const m = make(c), e = { merc: m, kind: 'ally' }, hi = withAb(m, { [a]: 20 }, () => DN.dc(e)), lo = withAb(m, { [a]: 10 }, () => DN.dc(e)); t(`${c}: DC는 ${a}`, hi - lo === 5, `${hi} ${lo}`); }
  const p = make('paladin'), r = make('archer'), f1 = make('dragoon');
  t('팔라딘 상처 치료: 매력', withAb(p, { cha: 18, str: 10 }, () => SK.text(p, 'sr_cure')).includes('2d8+4'));
  t('레인저 상처 치료: 지혜', withAb(r, { wis: 16, dex: 10 }, () => SK.text(r, 'sr_cure')).includes('2d8+3'));
  t('팔라딘 주문 공격: 매력', G.SrdX.castAb(p, 'sr_cure') === 'cha' && G.SrdX.castAb(p, 'sr_cleave') === null, G.SrdX.castAb(p, 'sr_cleave'));
  t('레인저 드루이드 전사: 지혜', G.SrdX.castAb(r, 'fs_druidic') === 'wis');
  t('파이터 기능은 그대로', G.SrdX.castAb(f1, 'sr_cleave') === null);
  t('무기 공격은 주문 능력을 쓰지 않는다', withAb(p, { str: 20, cha: 8 }, () => DN.hit({ merc: p, kind: 'ally' })) > withAb(p, { str: 10, cha: 20 }, () => DN.hit({ merc: p, kind: 'ally' })));
  const rg = make('rogue'); t('넘어뜨리기: 공격에 쓴 능력', DN.dcAb(rg, 'sr_topple') === DN.atkAb(rg) && DN.dcAb(p, 'sr_topple') === DN.atkAb(p));
  t('능력 설명: 팔라딘 매력 강조', DN.key('paladin', 'cha') && DN.role('paladin', 'cha').includes('주문') && DN.role('archer', 'wis').includes('주문'));
}
// 슬롯별 증가량 표 = 실제 코드
for (const k of Object.keys(SK.SK)) { const src = SK.SK[k].run?.toString() + SK.SK[k].rider?.toString(), q = /lvUp\(x, \[[^\]]*?(\d+)(?:, [^\]]*)?\], (\d)\)/.exec(src); if (!q || !k.startsWith('sr_')) continue; const die = /lvUp\(x, \[(?:[^,]*), (\d+)/.exec(src)[1]; t(`${k}: 슬롯당 ${SK.UP[k]}`, SK.UP[k] === `${q[2]}d${die}`, `${SK.UP[k]} vs ${q[2]}d${die}`); }
{ t('집단 치유의 말: SRD 1d4', SK.UP.sr_mhw === '1d4'); t('슬롯 효과가 없는 주문', SK.up('sp_regenerate') === ''); }
// 만들기 미리보기: 고른 값, 실제 단장은 그대로
{ const L = GD.leader(f), keep = L.cls, pv = GD.preview(f, { cls: 'cleric', ab: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 }, feat: L.feat, skills: [] }), base = DN.mod(DN.ab(pv).wis);
  t('미리보기는 고른 능력치', SK.text(pv, 'sr_cure').startsWith(`가장 다친 동료 2d8${base < 0 ? '−' + -base : base ? '+' + base : ''}`), SK.text(pv, 'sr_cure'));
  t('단장은 그대로', L.cls === keep);
}
// 마법의 비밀: 다른 목록의 주문은 바드 10레벨부터
{ t('클레릭 주문', GD.skLv('bard', 'sr_gbolt') === 10); t('위저드 주문', GD.skLv('bard', 'sr_mm') >= 10); t('드루이드 주문', GD.skLv('bard', 'sr_moon') >= 10); }
// 야성의 감각: 실명 불리만 없앤다
{ const real = G.Guild.skill, has = DN.has, m = make('archer'), e = { merc: m, kind: 'ally' }; DN.has = (q, k) => k === 'blinded'; t('없으면 불리', DN.atkDis(e)); DN.has = (q, k) => k === 'blinded'; G.Guild.skill = (q, k) => k === 'ft_feral' || real(q, k); t('있으면 실명 불리 없음', !DN.atkDis(e)); DN.has = (q, k) => k === 'poisoned'; t('다른 상태는 불리', DN.atkDis(e)); DN.has = has; G.Guild.skill = real; }
// 언데드 불태우기: 실패한 언데드에게 같은 피해, 5레벨 전에는 없다
{ const c0 = { merc: make('cleric', 5), x: 0, y: 0, hp: 30, max: 30 }, c1 = { ...c0, merc: make('cleric', 4) }, real = { sk: G.Fantasy.sk, hurt: G.Fantasy.hurt, undead: DN.undead, save: DN.save, give: DN.give }; let hits = [];
  G.Fantasy.hurt = (ff, rt, o, d) => hits.push(d); DN.undead = () => true; DN.save = () => false; DN.give = () => {}; const o = () => ({ x: 1, y: 0, hp: 9, ty: 'undead' }), rt = { mons: [], fields: [] }, x = c => ({ f, rt, c, reach: null, seen: [o(), o()] });
  G.Fantasy.sk = (q, k) => k === 'ft_sear' && q.merc.lv >= 5; SK.SK.sr_turn.run(c0, x(c0)); t('둘 다 맞는다', hits.length === 2, hits.length); t('같은 굴림', hits[0] === hits[1]); hits = []; SK.SK.sr_turn.run(c1, x(c1)); t('4레벨은 없다', hits.length === 0);
  Object.assign(G.Fantasy, { sk: real.sk, hurt: real.hurt }); Object.assign(DN, { undead: real.undead, save: real.save, give: real.give });
}
{ const wl = make('warlock'); t('= 매력 + 레벨 → 계산', withAb(wl, { cha: 16 }, () => SK.text(wl, 'sr_dob')) === `처치하면 임시 체력 = ${3 + wl.lv}`, withAb(wl, { cha: 16 }, () => SK.text(wl, 'sr_dob'))); }
// 높은 슬롯 (SRD): 원문의 모든 전투 주문에 값이 있고, 실제로 강해진다
{ const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'srd521', 'clean.json'), 'utf8')).Spells, UP = G.SRD_UP;
  for (const s of raw) { const txt = [].concat(s.higher_level || []).join(' ') || (/Using a Higher-Level Spell Slot\.?\s*(.*)/s.exec(s.description || '') || [])[1] || '', u = UP[s.index]; if (!txt || !u?.d || /Medium|Fire damage and|Clenched|sheet of frigid/.test(txt)) continue; t(`${s.index}: 원문 주사위`, txt.includes(`${u.d[0]}d${u.d[1]}`), txt); }
  const LONG = ['bestow-curse', 'dominate-beast', 'dominate-monster', 'dominate-person', 'mass-suggestion', 'modify-memory', 'globe-of-invulnerability', 'dispel-magic', 'hex', 'hunters-mark'];
  for (const s of raw) { const txt = s.higher_level || /Using a Higher-Level Spell Slot/.test(s.description || ''), o = G.SRD_SP[s.index]; if (!txt || !s.level || !o || !o.k || o.k === 'util' || LONG.includes(s.index)) continue; const k = 'sp_' + s.index.replace(/-/g, '_'); if (SK.SK[k]) t(`${s.index}: 슬롯 효과가 있다`, SK.up(k) !== '', k); }
  // 손으로 짠 주문 = 원문
  for (const k of Object.keys(SK.UP)) { const u = Object.entries(UP).find(([id]) => G.SRD_SP[id]?.en === G.D.MSKILLS[k]?.en)?.[1]; if (u?.d && !/발|번|명/.test(SK.UP[k])) t(`${k}: 원문과 같다`, SK.UP[k] === `${u.d[0]}d${u.d[1]}`, `${SK.UP[k]} ${JSON.stringify(u)}`); }
  // 실제 전투: 슬롯을 올린 주사위 · 대상 수
  const real = { strike: SK.H.strike, near: SK.H.near, pick: SK.H.pick, dmg: SK.H.dmg, save: DN.save, hurt: G.Fantasy.hurt, heal: SK.H.heal, give: DN.give }; let log = [];
  const m = make('cleric', 20), c = { merc: m, x: 0, y: 0, hp: 5, max: 100, kind: 'ally' }, mons = [1, 2, 3, 4, 5].map(i => ({ x: i, y: 0, hp: 500, max: 500, ty: 'humanoid' })), xOf = slot => ({ f, c, slot, rt: { mons, party: [c], fields: [] }, reach: null, seen: mons });
  // 주사위: 전부 최대로 굴려 합을 잰다
  G.Skill.maxDice = true; DN.save = () => false; G.Fantasy.hurt = (ff, rt, o, d) => log.push(d); DN.give = () => {};
  const fb = 'sp_burning_hands'; SK.SK[fb].run(c, xOf(1)); const d1 = log[0]; log = []; SK.SK[fb].run(c, xOf(3)); const d3 = log[0]; log = []; t('타는 손: 슬롯 3은 5d6', Math.abs(d3 / d1 - 30 / 18) < 1e-9, `${d3} ${d1}`);
  const atk0 = DN.attack; DN.attack = () => ({ hit: true }); log = []; SK.SK.sp_ice_knife.run(c, xOf(1)); const iceOk = log.length > 1 && log.every(v => Number.isFinite(v)), ice1 = log[log.length - 1]; log = []; SK.SK.sp_ice_knife.run(c, xOf(3)); t('얼음 칼: 튀는 피해가 숫자', iceOk, log.join()); t('얼음 칼: 슬롯마다 튀는 피해 1d6', Math.abs(log[log.length - 1] / ice1 - 2) < 1e-9, `${log[log.length - 1]} ${ice1}`);
  const hits = (fn, slot) => { log = []; fn(xOf(slot)); return log.slice(); };
  { const sees = G.Fantasy.sees; G.Fantasy.sees = () => true; const x3 = hits(x => SK.SK.sr_chain.run(c, x), 6).length, x4 = hits(x => SK.SK.sr_chain.run(c, x), 7).length; G.Fantasy.sees = sees; t('연쇄 번개: 슬롯마다 한 번 더', x4 === x3 + 1, `${x3} ${x4}`); }
  { const c2 = { ...c, pe: [] }, x = xOf(1); log = []; SK.SK.sr_ensnare.rider(c2, x, mons[0]); const pe = c2.pe[0]; DN.has = ((h => (q, k) => k === 'restrained' || h(q, k))(DN.has)); pe.fn({ ...x, slot: 1 }); const a1 = log[0]; log = []; pe.fn({ ...x, slot: 3 }); t('포박의 일격: 차례마다 1d6, 슬롯 3은 3d6', Math.abs(log[0] / a1 - 3) < 1e-9, `${log[0]} ${a1}`); }
  DN.attack = atk0;
  const banish = SK.SK.sp_banishment, cnt = (slot, S) => { let n = 0; const rg = DN.give; DN.save = () => { n++; return true; }; S.run(c, xOf(slot)); DN.save = () => false; DN.give = rg; return n; };
  t('추방: 슬롯 4 대상 1', cnt(4, banish) === 1, cnt(4, banish)); t('추방: 슬롯 6 대상 3', cnt(6, banish) === 3, cnt(6, banish));
  const cheal = 'sp_heal', hp = slot => { const p = { merc: m, hp: 1, max: 9999, x: 0, y: 0, cond: {} }, xx = { ...xOf(slot), rt: { mons, party: [p], fields: [] }, c: p }; SK.SK[cheal].run(p, xx); return p.hp; }; const srdK = hp => hp; t('치유: 슬롯마다 +10', Math.abs((hp(7) - hp(6)) - 10) < 0.01 /* SRD: 치유는 주사위 그대로 (최대 체력 배율 없음) */, hp(7) - hp(6));
  G.Skill.maxDice = false; Object.assign(DN, { save: real.save, give: real.give }); G.Fantasy.hurt = real.hurt;
  t('마법 무기 단계', SK.up('sp_magic_weapon') === '3레벨 슬롯 +2 · 6레벨 슬롯 +3', SK.up('sp_magic_weapon'));
}
// 모든 직업 × 모든 기술: 능력치 말이 수치 자리에 남지 않는다
{ const PH = /(?<!주문 |슬롯 )\+ 레벨|\+ ?(능력치|근력|민첩|건강|지능|지혜|매력)|(능력치|근력|민첩|건강|지능|지혜|매력)( 수정치)?만큼/; let left = [];
  for (const cls of Object.keys(DN.CLS)) { const m = make(cls); for (const k of Object.keys(G.D.MSKILLS)) { const s = SK.text(m, k); if (PH.test(s)) left.push(`${cls}/${k}: ${s}`); } }
  t('남은 자리표시 없음', !left.length, left.slice(0, 5).join(' | '));
}
console.log(`통과 ${ok} · 실패 ${bad}`); process.exit(bad ? 1 : 0);
