'use strict';
// 코드 리뷰에서 고친 규칙 (2026-11-08, DESIGN.md 152): node test/review_rules.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const store = {};
const localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const ctx = { console: { ...console, error() {} }, Math, JSON, Date, btoa, atob, localStorage }; vm.createContext(ctx);
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, GD = G.Guild, DN = G.Dnd; let ok = 0, bad = 0;
const t = (n, v, x = '') => { if (v) ok++; else { bad++; console.log('  실패:', n, x); } };
G.quiet = true; G.newState();
const f = G.S.w.fantasy; GD.leader(f).lv = 8; f.leaderNew = false;

// 붙잡기 재주: 첫 능력치 향상 자리를 쓴다 (향상 +2 대신 민첩 +1)
{
  let gm = null, nm = null;
  for (let i = 0; i < 90 && !(gm && nm); i++) { const m = GD.make(f, 'monk', { lv: 8 }); if (G.SrdX.grappler(m)) gm = gm || m; else nm = nm || m; }
  const up = m => Object.values(DN.ab(m)).reduce((s, v) => s + v, 0) - Object.values(m.ab).reduce((s, v) => s + v, 0);
  t('붙잡기 몽크 표본', gm && nm);
  if (gm && nm) t('붙잡기 재주는 능력치 향상 하나를 쓴다', up(nm) - up(gm) === 1, `${up(nm)} vs ${up(gm)}`);
}
// 잔인한 조롱: 지혜 내성 · 실패하면 다음 공격 불리
t('바드 기본 공격은 지혜 내성', G.D.F.allies.bard.saveAtk === 'wis');
t('바드 기본 공격 실패 효과는 약화', G.D.F.allies.bard.saveCond === 'sapped' && DN.COND.sapped.atkDis);
// 기습: 불리면 곁의 동료가 있어도 없다 · 행동 불능 동료는 세지 않는다
{
  const rg = GD.make(f, 'rogue', { lv: 5 }), a = { merc: rg, x: 0, y: 0 }, tg = { x: 1, y: 0 }, ally = { x: 1, y: 1, dead: false };
  const rt = { party: [a, ally] };
  const sn = adv => { a.sneakN = null; return DN.sneak(rt, a, tg, adv); };
  t('기습: 곁에 동료 · 불리 없음', sn(0) === 3, sn(0));
  t('기습: 곁에 동료 · 불리', sn(-1) === 0, sn(-1));
  t('기습: 이점', sn(1) === 3);
  ally.cond = { stunned: 1e12 };
  t('기습: 곁의 동료가 기절', sn(0) === 0);
}
// 자동 강화는 기본 꺼짐: 효과 없는 단계에 금화를 쓰지 않는다
t('강화 단계는 없다 (SRD 마법 물건만)', !GD.autoForge && !GD.upgrade && !GD.gear);
// 전우 연계기: 피해 배율 없음
{
  const m1 = GD.make(f, 'dragoon', { lv: 3 }), m2 = GD.make(f, 'cleric', { lv: 3 });
  f.bonds = { [m1.uid < m2.uid ? `${m1.uid}-${m2.uid}` : `${m2.uid}-${m1.uid}`]: 999 };
  m1.pers = []; m2.pers = [];
  const rt = { allies: [], fx: [], chat: [] };
  t('전우 판정', G.Bond.rel(f, m1, m2) === 'friend');
  let k = null; try { k = G.Bond.linked(f, rt, { merc: m1, x: 0, y: 0 }, { merc: m2, x: 1, y: 0 }); } catch (e) { k = 'err ' + e.message; }
  t('전우 연계기 피해 ×1', k === 1, k);
}
// 다혈질은 선제권에 수치를 더하지 않는다
t('turn.js에 다혈질 +3 없음', !/Persona\.has\(e\.merc, 'hot'\) \? 3/.test(fs.readFileSync(path.join(__dirname, '..', 'js', 'turn.js'), 'utf8')));
// 못 읽은 저장은 따로 남는다
{
  store[G.SAVE_KEY] = '{"v":1}';
  t('못 읽는 저장은 null', G.load() === null);
  t('못 읽은 저장의 원본이 남는다', store[G.SAVE_KEY + '_broken'] === '{"v":1}');
}
// 옛 방치형 저장: 스킬트리 · 파티 버프 · 라이벌 칸은 지우고 금화는 그대로 (DESIGN.md 161)
{
  G.newState(); const g0 = G.S.w.fantasy.gold; Object.assign(G.S.w.fantasy, { tree: { d_exec: 3 }, buffs: { gold: 9 }, rivals: { lion: {} } }); const S = G.deserialize(G.serialize());
  t('옛 칸은 지운다', !S.w.fantasy.tree && !S.w.fantasy.buffs && !S.w.fantasy.rivals);
  t('금화를 돌려주지 않는다', S.w.fantasy.gold === g0, `${S.w.fantasy.gold} vs ${g0}`);
  t('옛 모듈이 없다', !G.Tree && !G.Rivals && !G.Combo);
}
// ── 2차 (나머지 리뷰) ──
// 저항은 겹쳐도 절반 한 번 (격노 + 저항 물건)
{
  const m = GD.make(f, 'barbarian', { lv: 5 }), p = { merc: m, bf: {} };
  DN.buff(p, 'rage', 99, {}); DN.buff(p, 'res_slashing', 99, { res_slashing: 1 });
  t('저항 중첩 없음 (격노 + 베기 저항)', G.Res.takenK(p, 'slashing') === 0.5, G.Res.takenK(p, 'slashing'));
}
// 바드의 영감 (SRD): 실패했을 때만 굴려 더하고 사라진다 · 바드는 1레벨에 갖는다 · 저절로 도는 노래는 없다
{
  const tg = { merc: GD.make(f, 'dragoon', { lv: 1 }), bf: {} };
  let saved = 0, used = 0; const N = 3000;
  for (let i = 0; i < N; i++) { DN.buff(tg, 'insp', 99, { inspD: 12 }); const ok = DN.saveRoll(tg, 'int', 14); if (ok) saved++; if (!DN.bon(tg, 'insp')) used++; }
  let base = 0; delete tg.bf.insp; for (let i = 0; i < N; i++) if (DN.saveRoll(tg, 'int', 14)) base++;
  t('바드의 영감: 내성 성공이 는다', saved > base * 1.15, `${saved} vs ${base}`);
  t('바드의 영감: 실패했을 때만 쓰인다 (성공한 굴림에서는 남는다)', used < N, `${used}/${N}`);
  const bd = GD.make(f, 'bard', { lv: 1 }); t('바드 1레벨: 바드의 영감', GD.active(bd).includes('sr_insp'), GD.active(bd).join(' '));
  t('바드: 저절로 도는 노래 없음', !G.D.F.allies.bard.song);
}
// 쓰러진 동료에게 먹인 치유 물약: 바로 일어난다
{
  G.newState(); const f2 = G.S.w.fantasy; f2.leaderNew = false;
  const a = GD.make(f2, 'dragoon', { lv: 3 }), b = GD.make(f2, 'cleric', { lv: 3 });
  const e = { merc: a, x: 0, y: 0, hp: 30, max: 30 }, d = { merc: b, x: 1, y: 0, hp: 0, max: 20, dead: true, downed: true, dying: { ok: 0, no: 0 }, reviveT: 1e9 };
  f2.bag = { 'Potion of Healing': 1 }; const rt = { party: [e, d], mons: [], fx: [], chat: [], turn: { round: 1 } };
  G.Items.turn(f2, rt, e, []);
  t('물약을 먹은 동료가 일어난다', !d.dead && !d.dying && d.hp >= 4, JSON.stringify({ dead: d.dead, hp: d.hp }));
}
// 언데드의 강인함: 주문 피해(smite)라도 광휘 · 치명타가 아니면 버틴다
{
  const z = { kind: 'mon', tr: ['fort'], hp: 0, scale: 1, stat: { save: { con: 99 } }, lastType: 'fire', x: 0, y: 0 };
  t('좀비: 화염 주문에도 강인함 굴림', G.Foe.survive({ turn: null }, z, 'smite', 3) === true);
  z.lastType = 'radiant'; z.hp = 0;
  t('좀비: 광휘는 굴림 없이', G.Foe.survive({ turn: null }, z, 'smite', 3) === false);
}
// 분열은 번개 · 베기에만
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'foe.js'), 'utf8');
  t('체력 절반 분열 없음', !/m\.hp <= m\.max0 \/ 2/.test(src));
}
// 강력한 소마법은 소마법만 · 가르기는 첫 공격이 맞아야
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'srd.js'), 'utf8');
  t('강력한 소마법: 슬롯 주문 제외', /sr_potent'\) && !x\.slot/.test(src));
  t('가르기: 첫 명중 뒤에', /if \(o2 && r\.hit\)/.test(src));
}
// ── 3차 (SRD 전수 대조, SRD_AUDIT.md) ──
{
  const CN = ['blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'];
  t('상태 14종 + 탈진', CN.every(k => DN.COND[k]) && typeof DN.exh === 'function', CN.filter(k => !DN.COND[k]).join(','));
  const mk = () => ({ merc: GD.make(f, 'dragoon', { lv: 5 }), bf: {}, cond: {}, x: 0, y: 0 });
  const p = mk(); p.cond.stunned = 1e12; t('기절: 민첩 내성 자동 실패', !DN.saveRoll(p, 'dex', 1));
  const p2 = mk(); p2.cond.restrained = 1e12; let w = 0; for (let i = 0; i < 2000; i++) if (DN.saveRoll(p2, 'dex', 12)) w++; const p3 = mk(); let w0 = 0; for (let i = 0; i < 2000; i++) if (DN.saveRoll(p3, 'dex', 12)) w0++; t('속박: 민첩 내성 불리', w < w0 * 0.85, `${w} vs ${w0}`);
  const p4 = mk(); p4.merc.exh = 3; let e1 = 0; for (let i = 0; i < 2000; i++) if (DN.saveRoll(p4, 'con', 15)) e1++; p4.merc.exh = 0; let e0 = 0; for (let i = 0; i < 2000; i++) if (DN.saveRoll(p4, 'con', 15)) e0++; t('탈진 3: 내성 −6', e1 < e0 * 0.8, `${e1} vs ${e0}`);
  const c = mk(); c.concK = { k: 'sr_bless', on: [] }; DN.give({ party: [] , fx: [] }, c, 'incapacitated', 10); t('행동 불능이면 집중이 끊긴다', !c.concK);
  { const keepL = G.Light.adv; G.Light.adv = () => [0, 0]; /* 빛 · 시야와 섞이지 않게 */ const iv = mk(), foe = { kind: 'mon', x: 1, y: 0, bf: {}, cond: {} }; iv.cond.invisible = 1e12; t('투명: 내 공격 이점', DN.adv(iv, foe) > 0); t('투명: 나를 노리는 공격 불리', DN.adv(foe, iv) < 0); G.Light.adv = keepL; }
  const gs = GD.make(f, 'archmage', { lv: 1 }); gs.strSet = { v: 23, until: 1e12 }; t('거인 힘의 물약: 근력 23', DN.ab(gs).str === 23);
  t('물약은 SRD 지속 시간', G.Items.USE['Potion of Heroism'].fx.dur === 600 && G.Items.USE['Potion of Growth'].fx.dur === 100);
  t('성장의 물약: 1d4 (+2 아님)', G.Items.USE['Potion of Growth'].fx.props.dmgD === 4 && !G.Items.USE['Potion of Growth'].fx.props.dmgB);
  // 하위 직업 기능은 그 하위 직업만
  const bb = GD.make(f, 'barbarian', { lv: 20 }); t('광전사가 아니면 무심한 격노 없음', !GD.active(bb).includes('ft_mindless') && !GD.active(bb).includes('sr_intim'));
  bb.adv = 'berserker'; t('광전사는 무심한 격노', GD.active(bb).includes('ft_mindless'));
  const ch = GD.make(f, 'dragoon', { lv: 20 }); t('챔피언이 아니면 뛰어난 운동선수 없음', !GD.active(ch).includes('ft_athlete'));
  t('야성의 본능 (바바리안 7)', GD.active(GD.make(f, 'barbarian', { lv: 7 })).includes('sr_feral'));
  t('종잡을 수 없음 (로그 18)', GD.active(GD.make(f, 'rogue', { lv: 18 })).includes('sr_elusive'));
  const lc = GD.make(f, 'cleric', { lv: 3 }); lc.adv = 'life'; t('생명 보존 (생명 권역 3)', GD.active(lc).includes('sr_preserve'));
  t('신성 변환 횟수를 함께 쓴다', G.Res.sh('sr_preserve', null)[0] === 'sr_turn' && G.Res.sh('ft_sanctuary', null)[0] === 'sr_wild');
}
// ── 4차: 범위 · 고유 주문 · 마법 물건 · 직업 기능 (DESIGN.md 158) ──
{
  const H = G.Skill.H, A = H.AREA, c = { merc: GD.make(f, 'archmage', { lv: 9 }), x: 0, y: 0, kind: 'ally' };
  const mon = (x, y) => ({ kind: 'mon', x, y, hp: 50, max: 50 }), ally = (x, y) => ({ merc: GD.make(f, 'dragoon', { lv: 3 }), x, y, kind: 'ally' });
  const ms = [mon(3, 0), mon(10, 0), mon(3, 3), mon(-3, 0)], al = ally(2, 0), rt = { mons: ms, party: [c, al] }, x = { rt, f, c, seen: ms };
  const hit = (Ar, aim) => A.hits(x, c, Ar, aim).map(o => (o === c ? 'c' : o === al ? 'a' : ms.indexOf(o)));
  t('원뿔 15피트: 앞의 적과 아군만', JSON.stringify(hit({ shape: 'cone', ft: 15, self: true }, ms[0]).sort()) === JSON.stringify([0, 'a'].sort()), hit({ shape: 'cone', ft: 15, self: true }, ms[0]));
  t('직선 100피트: 줄 위 전부', hit({ shape: 'line', ft: 100, w: 5, self: true }, ms[0]).length === 3);
  t('발산은 시전자를 뺀다', !hit({ shape: 'emanation', ft: 15 }, c).includes('c'));
  t('구: 아군도 맞는다', hit({ shape: 'sphere', ft: 20 }, ms[0]).includes('a'));
  t('겨누기: 아군이 둘보다 적이 많을 때만', !!A.aim(x, c, { shape: 'sphere', ft: 5 }) && !A.aim({ ...x, seen: [ms[0]] }, c, { shape: 'sphere', ft: 10 }));
  t('「고른 생물」은 아군을 뺀다', !A.cast(x, c, null, { shape: 'sphere', ft: 20 }, { choice: true, at: ms[0] }).list.includes(al));
  t('범위 주문 데이터는 원문 모양', G.SRD_SP['cone-of-cold'].srd.area.shape === 'cone' && G.SRD_SP['lightning-bolt'].srd.area.ft === 100 && G.SRD_SP['fireball'].srd.area.ft === 20);
  t('화염 강타: 화염 5d6 + 광휘 5d6', JSON.stringify(G.SRD_SP['flame-strike'].dual) === JSON.stringify([5, 6, 'radiant']));
  t('주문 상태는 원문대로 (추방 = 행동 불능)', G.SRD_SP.banishment.cond === 'incapacitated' && G.SRD_SP['hideous-laughter'].cond === 'incapacitated');
  t('고유 규칙 주문 6개', ['sp_divine_word', 'sp_confusion', 'sp_befuddlement', 'sp_prismatic_spray', 'sp_prismatic_wall', 'sp_storm_of_vengeance'].every(k => G.Skill.SK[k]?.run));
  t('몬스터 330종 · 원문 DC', Object.keys(G.SRD_MON).length === 330 && G.SRD_MON['shambling-mound'].dc === 15 && G.SRD_MON.marilith.melee.length === 6);
}
{
  const f = G.S.w.fantasy; const m = GD.make(f, 'archmage', { lv: 5 }); f.trinkets = f.trinkets || []; const e = { merc: m, def: G.Guild.def(m), x: 0, y: 0, castAb: 'int' };
  const h0 = DN.hit(e); f.trinkets.push({ id: 991, k: 'it_wand_of_the_war_mage_2', on: m.uid, lv: 1 }); t('전쟁 마법사의 완드 +2: 주문 명중 +2', DN.hit(e) - h0 === 2, DN.hit(e) - h0);
  f.trinkets = f.trinkets.filter(q => q.id !== 991);
  const w = GD.make(f, 'dragoon', { lv: 5 }), p = { merc: w, bf: {} }; f.trinkets.push({ id: 992, k: 'it_ring_of_warmth', on: w.uid, lv: 1 }); t('온기의 반지: 냉기 −2d8', G.Res.flat(p, 'cold') >= 2 && G.Res.flat(p, 'fire') === 0);
  const b = GD.make(f, 'cleric', { lv: 5 }), w0 = DN.ab(b).wis; b.abPerm = { wis: 2 }; t('이해의 책: 지혜 +2', DN.ab(b).wis === w0 + 2);
  t('처단의 탄환 · 강철 플라스크 · 숫양의 반지', !!G.D.ARTS.it_ammunition_of_slaying && !!G.D.ARTS.it_iron_flask && G.D.ARTS.it_ring_of_the_ram.ch === 3);
}
{
  const f = G.S.w.fantasy; const bd = GD.make(f, 'bard', { lv: 5 }), s = G.Res.of(bd); s.fu.sr_insp = G.Res.usesOf(bd, G.Skill.SK.sr_insp.res, 'sr_insp'); const sl0 = (s.sl[0] || 0); t('영감의 샘: 슬롯으로 영감', G.Res.can(bd, 'sr_insp', G.Skill.SK.sr_insp.res) && (s.sl[0] || 0) === sl0 + 1);
  const mk = GD.make(f, 'monk', { lv: 15 }), ms = G.Res.of(mk); ms.fp = G.Res.pool(mk); G.Res.fightStart([{ merc: mk, hp: 1, max: 1 }]); t('완벽한 집중: 4로', G.Res.pool(mk) - ms.fp === 4);
  const ev = GD.make(f, 'archmage', { lv: 6 }); ev.adv = 'evoker'; t('주문 조각 (방출계 6)', GD.active(ev).includes('ft_sculpt'));
}
// ── 5차: 아군 생물 · 빛과 시야 · 지형 (DESIGN.md 159) ──
{
  const f = G.S.w.fantasy, Sm = G.Sum, Lt = G.Light, Tr = G.Terrain;
  t('소환 주문 · 물건이 있다', ['sp_giant_insect', 'sp_summon_dragon', 'sp_animate_objects', 'sp_conjure_elemental', 'sp_conjure_fey', 'sp_conjure_minor_elementals', 'sp_conjure_woodland_beings', 'sp_conjure_celestial', 'sp_fly'].every(k => G.Skill.SK[k]?.run) && ['it_horn_of_valhalla', 'it_bag_of_tricks', 'it_figurine_of_wondrous_power', 'it_staff_of_the_python', 'it_efreeti_bottle', 'it_ring_of_djinni_summoning', 'it_bowl_of_commanding_water_elementals'].every(k => G.D.ARTS[k]));
  const c = { merc: GD.make(f, 'scout', { lv: 9 }), x: 0, y: 0 }; const B = Sm.spell(f, null, c, 'insect', 6); t('거대 곤충 6레벨: AC 17 · 체력 50 · 찌르기 3회', B.ac === 17 && B.hp === 50 && B.melee.length === 3, `${B.ac} ${B.hp} ${B.melee.length}`);
  const D2 = Sm.spell(f, null, c, 'dragon', 5, { t: 'fire' }); t('용의 영혼 5레벨: AC 19 · 체력 50 · 숨결', D2.ac === 19 && D2.hp === 50 && !!D2.breath);
  t('아군 생물은 모든 몬스터 능력치표에서', !!G.SRD_MON.berserker && !!G.SRD_MON['water-elemental'] && !!G.SRD_MON.djinni);
  // 빛
  const m = { w: 20, h: 3, c: Array(60).fill('.'), passChars: '.>,', rooms: [], amb: new Uint8Array(60), lights: [] }, rt = { map: m, party: [], mons: [] };
  const human = { merc: GD.make(f, 'dragoon', { lv: 3 }), x: 0, y: 1 }; human.merc.sp = 'human';
  const elf = { merc: GD.make(f, 'archer', { lv: 3 }), x: 0, y: 1 }; elf.merc.sp = 'elf';
  const gob = { kind: 'mon', x: 10, y: 1, stat: { senses: { darkvision: 60 } } };
  t('어둠: 인간은 10칸 앞 고블린을 못 본다', !Lt.sees(rt, human, gob)); t('엘프는 어둠 시야 60피트로 본다', Lt.sees(rt, elf, gob)); t('고블린은 어둠 시야로 인간을 본다', Lt.sees(rt, gob, human));
  m.lights.push({ x: 10, y: 1, b: 4, d: 8 }); t('횃불 곁은 밝다', Lt.level(rt, 10, 1) === 2 && Lt.level(rt, 16, 1) === 1 && Lt.level(rt, 19, 1) === 0);
  rt.darks = [{ x: 10, y: 1, r: 3, until: 1e12, lv: 2 }]; t('어둠 주문: 어둠 시야로도 못 본다', !Lt.sees(rt, elf, gob) && Lt.level(rt, 10, 1) === -1);
  rt.suns = [{ x: 9, y: 1, until: 1e12, lv: 3 }]; t('햇빛은 3레벨 이하 어둠을 걷는다', Lt.level(rt, 10, 1) === 2);
  // 지형
  const m2 = { w: 4, h: 1, c: ['.', ',', '~', '.'], passChars: '.>,', ver: 1 }, rt2 = { map: m2, party: [], mons: [] };
  t('얕은 물 = 어려운 지형 2', Tr.cost(rt2, {}, 1, 0) === 2); t('깊은 물: 헤엄 2 · 수영 속도 1', Tr.cost(rt2, {}, 2, 0) === 2 && Tr.cost(rt2, { stat: { speed: { swim: 40 } } }, 2, 0) === 1);
  t('깊은 물은 날거나 헤엄치는 몸만 든다', !Tr.enter(rt2, {}, 2, 0) && Tr.enter(rt2, { stat: { speed: { fly: 30 } } }, 2, 0));
  Tr.add(rt2, { x: 3, y: 0, r: 0, until: 1e12 }); t('주문의 어려운 지형', Tr.cost(rt2, {}, 3, 0) === 2);
}
console.log(`review_rules: 통과 ${ok} · 실패 ${bad}`);
process.exit(bad ? 1 : 0);
