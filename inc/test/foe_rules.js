'use strict';
// 몬스터 역할 · 특성 단위 검사: node test/foe_rules.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
for (const n of ['core', 'data', 'srd_gen', 'srd_base', 'srd_mons', 'grid', 'juice', 'tree', 'trees', 'season', 'fantasy', 'rivals', 'guild', 'persona', 'dnd', 'feats', 'trinkets', 'bonds', 'report', 'skills', 'srd', 'srd_spells', 'spells', 'traits', 'options', 'pools', 'srd_species', 'skill_ai', 'combo', 'events', 'tutorial', 'skill_nums', 'command', 'expedition', 'mission', 'explore', 'banter', 'sight', 'tactics', 'foe', 'region', 'scn_astral', 'res', 'turn', 'flow', 'story', 'state'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, FO = () => G.Foe; G.newState(); G.quiet = true;
const f = G.S.w.fantasy, GD = G.Guild; GD.leader(f); f.leaderNew = false; f.lineup = ['archer', 'cleric', 'paladin'].map(c => { const m = GD.make(f, c, { lv: 7 }); f.mercs.push(m); return m.uid; }); G.Fantasy.syncAllies(f); f.floor = f.maxFloor = 8; f.checkpoint = f.start = 8; f.town = true; f.townT = 99;
f.frontLock = 'green'; const rt = G.Fantasy.rt(f); G.Exp.depart(f, rt); for (let i = 0; i < 5 && !rt.map; i++) G.tick(1, 0.1);
let bad = 0; const ok = (name, c) => { console.log((c ? '  ok ' : '  ✗  ') + name); if (!c) bad++; };
const mon = (d, x, y, o) => G.Fantasy.spawnMon(rt, 8, d, x, y, false, { aggro: true, spotted: true, ...o });
const r0 = rt.map.rooms[1], cx = r0.cx ?? r0.x + 2, cy = r0.cy ?? r0.y + 2;
const st = { round: 1 };
// SRD 능력치표
const gob = mon({ n: '고블린', r: 'skirmisher', tr: ['nimble'] }, cx, cy), skl = mon({ n: '해골 궁수', r: 'artillery' }, cx, cy), so = mon({ n: '오크 전사', r: 'soldier' }, cx, cy), ar = mon({ n: '해골 궁수', r: 'artillery' }, cx, cy), scale = G.Fantasy.monScale(8);
ok('고블린 전사 (5.2.1) AC 15 · 체력 10 × 층 배율 × 전투 길이 · 명중 +4', G.Dnd.ac(gob) === 15 && gob.max >= 10 * scale && Math.abs(gob.max / (10 * scale) - G.Fantasy.hpK(8)) < 1e-6 && G.Dnd.hit(gob) === 4);
ok('오크는 5.2.1 표가 없어 Tough', G.SRD_MON.tough.hp === 32 && !G.SRD_MON.orc);
ok('능력별 내성: 고블린 민첩 +2 · 지혜 -1', G.Dnd.saveBonus(gob, 'dex') === 2 && G.Dnd.saveBonus(gob, 'wis') === -1);
ok('궁수 사거리 6 · 근접 1.5', FO().reach(ar) === 6 && FO().reach(so) === 1.5);
ok('궁수는 손에 활', ar.hand === 'p_hand1_bow');
ok('해골: 둔기 약점 ×2 · 독 면역 ×0 · 베기 ×1', FO().typeK(skl, 'bludgeoning') === 2 && FO().typeK(skl, 'poison') === 0 && FO().typeK(skl, 'slashing') === 1);
{ const dv = mon({ n: '초트', r: 'controller' }, cx, cy), wp = { merc: f.mercs[0] }; ok('본 데블 (5.2.1): 물리 저항 없음 · 화염 면역 · 냉기 저항', FO().typeK(dv, 'slashing', wp) === 1 && FO().typeK(dv, 'fire', wp) === 0 && FO().typeK(dv, 'cold', wp) === 0.5); }
{ const pl = f.mercs.find(m => m.cls === 'paladin'), mhp = G.Dnd.srdHP({ ...pl, lv: 1 }); ok('1레벨 체력 = 히트 다이스 최대 + 건강 (드워프 +1)', mhp === 10 + G.Dnd.mod(G.Dnd.ab(pl).con) + (G.Res.species(pl) === 'dwarf' ? 1 : 0)); }
{ const T0 = G.Dnd.weapon({ merc: f.mercs.find(m => m.cls === 'cleric') }); ok('클레릭 기본 공격은 신성한 불꽃 1d8 광휘 (능력치 더하지 않음)', T0.n === 1 && T0.d === 8 && T0.b === 0 && T0.t === 'radiant'); }
// 재생
const tr = mon({ n: '트롤', r: 'brute', tr: ['regen'] }, cx, cy); tr.hp = tr.max / 2; let h = tr.hp; FO().turn(f, rt, st, tr);
ok('재생: 차례에 체력이 찬다', tr.hp > h);
tr.dots.push({ kind: 'burn', t: 3, dps: 1 }); h = tr.hp; FO().turn(f, rt, st, tr);
ok('재생: 불이 붙으면 멈춘다', tr.hp === h);
{ // 트롤 (SRD 5.2.1): 체력 0이어도 차례 시작에 재생하면 일어난다. 화염 · 산성이면 죽는다
  const fakeTurn = rt.turn, keepMons = rt.mons; rt.mons = []; rt.turn = { round: 1, order: [], map: rt.map, tg: null };
  const pl = rt.party[0], tt = () => { const o = mon({ n: '트롤', r: 'brute', tr: ['regen'], ty: 'giant' }, cx, cy); pl.x = cx; pl.y = cy + 1; return o; };
  let a = tt(); G.Fantasy.hurt(f, rt, a, a.max * 3, 'hit', pl); ok('트롤: 체력 0이면 쓰러질 뿐 죽지 않는다', a.down && rt.mons.includes(a));
  ok('트롤: 재생하면 일어난다', !FO().regen(f, rt, a) && !a.down && Math.abs(a.hp - 15 * a.scale) < 1e-6);
  a = tt(); G.Foe.dtype = 'fire'; G.Fantasy.hurt(f, rt, a, a.max * 3, 'hit', pl); G.Foe.dtype = null; ok('트롤: 화염으로 쓰러지면 차례 시작에 죽는다', a.down && FO().regen(f, rt, a) && !rt.mons.includes(a));
  a = tt(); G.Fantasy.hurt(f, rt, a, a.max * 3, 'hit', pl); ok('트롤: 태워야 할 대상', FO().needsFire(a)); G.Foe.dtype = 'acid'; G.Fantasy.hurt(f, rt, a, 1, 'hit', pl); G.Foe.dtype = null; ok('트롤: 쓰러진 뒤 산성을 대도 죽는다', !FO().needsFire(a) && FO().regen(f, rt, a));
  ok('트롤: 잘린 팔다리는 없다', !G.D.F.mon['트롤 팔다리'] && !G.SRD_MON['troll-limb']);
  // 히드라
  rt.mons = []; const hy = mon({ n: '히드라', r: 'brute', ty: 'monstrosity' }, cx, cy), S2 = { cur: null }, big = 30 * hy.scale * G.Turn.pace;
  ok('히드라: 5.2.1 체력 184 · 물기 1d10+5 · 머리 수만큼', hy.stat.hp === 184 && FO().attacks(hy).length === 5);
  G.Foe.dtype = 'slashing'; G.Fantasy.hurt(f, rt, hy, 1, 'hit', pl); G.Foe.dtype = null; ok('히드라: 베기에 머리 +1', hy.heads === 6);
  G.Foe.dtype = 'piercing'; G.Fantasy.hurt(f, rt, hy, 1, 'hit', pl); G.Foe.dtype = null; ok('히드라: 관통은 그대로', hy.heads === 6);
  G.Foe.dtype = 'fire'; G.Fantasy.hurt(f, rt, hy, 1, 'hit', pl); G.Foe.dtype = 'slashing'; G.Fantasy.hurt(f, rt, hy, 1, 'hit', pl); G.Foe.dtype = null; ok('히드라: 화염을 맞으면 베어도 안 는다', hy.heads === 6);
  S2.cur = hy; FO().turnEnd(f, rt, S2); G.Foe.dtype = 'slashing'; G.Fantasy.hurt(f, rt, hy, 1, 'hit', pl); G.Foe.dtype = null; ok('히드라: 제 차례가 지나면 다시 는다', hy.heads === 7);
  hy.heads = 9; G.Foe.dtype = 'slashing'; G.Fantasy.hurt(f, rt, hy, 1, 'hit', pl); G.Foe.dtype = null; ok('히드라: 최대 9', hy.heads === 9);
  ok('지능: 베기 직업은 히드라를 피하고, 다른 표적이 없으면 친다', (() => { const w = { merc: { cls: 'x' } }, gob = mon({ n: '산적', r: 'soldier' }, cx, cy); hy.seared = false; return FO().good(w, [hy, gob], 'slashing').length === 1 && FO().good(w, [hy], 'slashing').length === 1; })());
  rt.mons = [];
  // 격파 수단이 없을 때
  { const w = rt.party.find(p => p.merc && p.merc.cls === 'paladin'), pd2 = mon({ n: '진흙 점액', r: 'brute', ty: 'ooze' }, cx, cy); ok('무력: 면역인 적뿐이면 몸을 사린다', G.Dnd.weapon(w).t === 'slashing' && FO().useless(w, [pd2])); const zb2 = mon({ n: '좀비', r: 'soldier', ty: 'undead' }, cx, cy); ok('무력: 들어가는 적이 있으면 친다', !FO().useless(w, [pd2, zb2])); rt.mons = []; }
  { const st3 = { round: 3, hist: [[100, 100], [90, 100]] }, ms = mon({ n: '좀비', r: 'soldier', ty: 'undead' }, cx, cy); ms.hp = 100; ms.max = 100; const hp0 = rt.party.map(p => [p, p.hp, p.dead, p.dying]); rt.party.forEach((p, i) => { p.dead = false; p.dying = null; p.hp = i ? 0 : 80; }); ok('승산 판단: 적이 안 깎이고 우리만 깎이면 진다', FO().assess(f, rt, st3)); hp0.forEach(([p, h, d, y]) => { p.hp = h; p.dead = d; p.dying = y; }); rt.mons = []; }
  // 메이지
  { rt.mons = []; const mg = mon({ n: '강령술사', r: 'controller', ty: 'humanoid' }, cx, cy), w = rt.party.find(p => p.merc && p.merc.cls === 'paladin'), keep = [w.x, w.y], rt0 = rt.turn; rt.turn = { round: 1 };
    w.x = cx + 1; w.y = cy; const ox = mg.x, oy = mg.y; FO().spell(f, rt, mg); ok('메이지: 붙으면 안개 걸음', mg.misty === 1 && Math.hypot(mg.x - ox, mg.y - oy) >= 1);
    mg.hp = mg.max * 0.3; ok('메이지: 다치면 투명 · 차례를 쓴다', FO().spell(f, rt, mg) && G.Dnd.bon(mg, 'invis')); mg.hp = mg.max; FO().spell(f, rt, mg); ok('메이지: 다시 행동하면 투명이 풀린다', !G.Dnd.bon(mg, 'invis'));
    w.x = mg.x + 1; w.y = mg.y; G.Fantasy.sees(rt.map, mg, w); let c = 0; const a2 = { ...w, merc: w.merc }; for (let i = 0; i < 5; i++) { FO().counter(rt, w); } ok('메이지: 반격 주문 · 방어막 합쳐 3번', mg.pm === 3);
    rt.turn = rt0; w.x = keep[0]; w.y = keep[1]; rt.mons = []; }
  ok('죽이는 조건은 몬스터마다 하나 이하', Object.keys(G.D.F.mon).every(n => FO().notes(n).filter(x => x.c === 'must').length <= 1));
  // 약점 표시
  const nt = n => FO().notes(n).map(x => x.s).join('|');
  ok('약점 표시: 트롤 · 히드라 · 해골 · 엔트', /화염 · 산성/.test(nt('트롤')) && /베기에 머리/.test(nt('히드라')) && /둔기 ×2/.test(nt('해골')) && /화염 ×2/.test(nt('고목 엔트')));
  ok('약점 표시: 번개 흡수 · 푸딩 분열 · 악마 화염 면역', /번개 흡수/.test(nt('버섯 거인')) && /분열/.test(nt('진흙 점액')) && /화염 면역/.test(nt('대악마')));
  ok('원정 카드가 약점을 담는다', FO().brief('swamp', 60).mons.some(q => q.n === '히드라' && q.notes.length));
  rt.mons = []; const pd = mon({ n: '진흙 점액', r: 'brute', ty: 'ooze' }, cx, cy), n1 = rt.mons.length; G.Foe.dtype = 'slashing'; G.Fantasy.hurt(f, rt, pd, pd.max * 0.1, 'hit', pl); G.Foe.dtype = null; const kids = rt.mons.filter(o => o.n === '진흙 점액');
  ok('검은 푸딩: 베기면 면역인데 분열한다', rt.mons.length === n1 + 1 && kids.length === 2 && Math.abs(kids[0].hp - kids[1].hp) < 1e-6);
  rt.mons = keepMons; rt.turn = fakeTurn;
}
// 치유
const su = mon({ n: '오크 주술사', r: 'support' }, cx, cy), w = mon({ n: '오크 전사', r: 'soldier' }, cx + 1, cy); w.hp = w.max * 0.3; h = w.hp;
ok('치유사: 치유의 말은 추가 행동이라 공격도 한다', !FO().turn(f, rt, st, su) && w.hp > h);
for (let i = 0; i < 5; i++) { w.hp = w.max * 0.3; FO().turn(f, rt, st, su); }
ok('치유사: Divine Aid 1/Day', su.heals === 1);
// SRD 5.2.1 몬스터 공격의 추가 효과
{
  const S = G.SRD_MON, pa2 = rt.party.find(p => p.merc && p.merc.cls === 'paladin'), hit = (e, tg, name) => { e.useAtk = (e.stat.melee.concat(e.stat.alt || [])).find(a => a.name === name); FO().onHit(rt, e, tg); e.useAtk = null; };
  ok('발로르 채찍: 3d6+8 + 화염 5d6 · 슈블링 마운드 촉수 3번', S.balor.melee[0].ex.n === 5 && S.balor.melee[0].ex.d === 6 && S['shambling-mound'].melee.length === 3);
  ok('메이지: 비전 폭발 원거리 3번', S.mage.far && S.mage.farN === 3 && FO().attacks(mon({ n: '강령술사', r: 'controller' }, cx, cy)).length === 3);
  pa2.dead = false; pa2.dying = null; pa2.hp = pa2.max; // 앞 시험의 주문에 쓰러졌을 수 있다
  const wf = mon({ n: '숲 늑대', r: 'skirmisher', tr: ['pack'] }, cx, cy); pa2.cond = {}; let n = 0; for (let i = 0; i < 20; i++) { pa2.cond = {}; hit(wf, pa2, 'Bite'); if (G.Dnd.has(pa2, 'prone')) n++; }
  ok('늑대: 물면 내성 없이 넘어진다', n === 20);
  ok('넘어짐은 차례를 뺏지 않는다', !G.Dnd.out(pa2));
  ok('넘어짐: 곁에서 이점', (() => { const o = { kind: 'mon', x: pa2.x + 1, y: pa2.y, stat: { melee: [] } }; return G.Dnd.adv(o, pa2) === 1; })());
  ok('넘어짐: 멀리서 불리', (() => { const o = { kind: 'mon', x: pa2.x + 5, y: pa2.y, stat: { melee: [] } }; return G.Dnd.adv(o, pa2) === -1; })());
  FO().startTurn(f, rt, pa2); ok('넘어짐: 차례에 일어서고 이동력 절반', !G.Dnd.has(pa2, 'prone') && pa2.stood); pa2.stood = false;
  const dv2 = mon({ n: '초트', r: 'controller' }, cx, cy); hit(dv2, pa2, 'Infernal Sting'); ok('본 데블 독침: 중독 · 치유 불가', G.Dnd.has(pa2, 'poisoned') && pa2.noHeal);
  FO().turn(f, rt, st, dv2); ok('독침 효과는 그 데블의 다음 차례에 풀린다', !pa2.noHeal); pa2.cond = {};
  const oz = mon({ n: '늪 점액', r: 'brute' }, cx, cy), ac0 = G.Dnd.ac(pa2); hit(oz, pa2, 'Pseudopod'); ok('회색 점액: 갑옷 AC −1', G.Dnd.ac(pa2) === ac0 - 1); FO().endFight(rt); ok('전투가 끝나면 고친다', G.Dnd.ac(pa2) === ac0);
  const mm = mon({ n: '미믹', r: 'brute' }, cx, cy); ok('미믹: 먼저 위족', FO().attacks(mm, pa2)[0].name === 'Pseudopod'); hit(mm, pa2, 'Pseudopod'); ok('미믹: 붙잡히면 이동 0, 다음은 물기', G.Dnd.held(pa2) && FO().attacks(mm, pa2)[0].name === 'Bite'); FO().endFight(rt); pa2.cond = {};
  ok('마법 저항: 임프 내성 이점 표시', S.imp.magicRes && S.balor.legRes === 3);
  const dev = mon({ n: '대악마', r: 'brute' }, cx, cy); let lg = 0; for (let i = 0; i < 3; i++) if (G.Dnd.saveRoll(dev, 'dex', 99)) lg++; ok('전설적 저항 3번', lg === 3 && !G.Dnd.saveRoll(dev, 'dex', 99));
  ok('메이지 아닌 몬스터는 주문 없음', !FO().spell(f, rt, wf));
  rt.mons = rt.mons.filter(o => ![wf, dv2, oz, mm, dev].includes(o));
}
// SRD 5.2.1 마법 물건
{
  const pal = f.mercs.find(m => m.cls === 'paladin'), give = (k, id) => { const t = { id: id || 900, k, lv: 1, on: pal.uid }; G.Trinket.all(f).push(t); return t; }, drop = t => { f.trinkets = f.trinkets.filter(q => q !== t); }, ap = rt.party.find(p => p.merc === pal), A = G.D.ARTS;
  ok('전 물건 속성이 규칙표에 있다', Object.values(A).every(a => a.props.every(p => G.Trinket.PROPS[p[0]])));
  ok('없앤 물건 없음 (게임 효과가 없는 SRD 물건)', !A.mithral && !A.animated_shield);
  ap.x = cx; ap.y = cy + 1; let t = give('holy_avenger'); const zb = mon({ n: '좀비', r: 'soldier', ty: 'undead' }, cx, cy), wfx = mon({ n: '숲 늑대', r: 'skirmisher', ty: 'beast' }, cx + 1, cy), h1 = zb.hp, h2 = wfx.hp;
  G.Trinket.onHit(f, rt, ap, zb, 1, 5); G.Trinket.onHit(f, rt, ap, wfx, 1, 5); ok('성스러운 복수자: 언데드에만 2d10 광휘', zb.hp < h1 && wfx.hp === h2); ok('성스러운 복수자: 명중 · 피해 +3', G.Trinket.sum(pal, 'hit') === 3 && G.Trinket.sum(pal, 'dmgB') === 3); drop(t);
  t = give('ring_resist', 3); ok('저항의 반지: 표의 한 종류에 절반', G.Res.takenK(ap, 'force') <= 0.5 && G.Res.takenK(ap, 'fire') === 1 * G.Res.takenK(ap, 'fire')); drop(t);
  t = give('periapt_poison'); ok('독 방지: 독 피해 면역 · 중독 면역', G.Res.takenK(ap, 'poison') === 0 && G.Trinket.imm(pal, 'poisoned')); drop(t);
  t = give('robe_arch'); ok('로브 DC +2', G.Trinket.sum(pal, 'dc') === 2); drop(t);
  t = give('sharpness'); const h3 = wfx.hp; G.Trinket.onHit(f, rt, ap, wfx, 1, 20); ok('예리함: 20에 베기 14', wfx.hp === h3 - 14 || wfx.hp <= 0); drop(t);
  const un = G.Trinket.def({ k: 'cloak_prot', id: 1 }); ok('표시 문구', G.Trinket.tags({ k: 'holy_avenger', id: 1 }).length === 4 && un.props.length === 2);
  for (let i = 0; i < 60; i++) { const r = G.Trinket.randart(40); if (!r.props.every(p => G.Trinket.PROPS[p[0]])) { ok('랜다트: SRD 효과만', false); break; } }
  rt.mons = rt.mons.filter(o => o !== zb && o !== wfx); G.Fantasy.syncAllies(f);
}
// 준비 행동
{
  const T2 = G.Tactics, pl = rt.party.find(p => p.merc && p.merc.cls === 'paladin'), keep = [rt.mons, pl.x, pl.y]; rt.mons = [];
  G.Fantasy.setCell(f, pl.merc.uid, 1);
  const melee = mon({ n: '오크 전사', r: 'soldier' }, pl.x + 8, pl.y), s2 = { round: 1 };
  ok('버티기: 달려오는 적이 있으면 준비', T2.waits(rt, s2, pl));
  melee.x = pl.x + 2; ok('버티기: 3칸 안이면 나선다', !T2.waits(rt, s2, pl));
  melee.x = pl.x + 8; const other = rt.party.find(p => p !== pl && !p.dead); const ox = other.x, oy = other.y; other.x = melee.x - 1; other.y = melee.y; ok('버티기: 접전이 시작되면 나선다', !T2.waits(rt, s2, pl)); other.x = ox; other.y = oy;
  rt.mons = []; mon({ n: '해골 궁수', r: 'artillery' }, pl.x + 8, pl.y); ok('버티기: 쏘기만 하는 적이면 나선다', !T2.waits(rt, s2, pl));
  rt.mons = []; mon({ n: '오크 전사', r: 'soldier' }, pl.x + 8, pl.y); ok('버티기: 3라운드부터 나선다', !T2.waits(rt, { round: 3 }, pl));
  rt.mons = keep[0]; pl.x = keep[1]; pl.y = keep[2];
}
// 언데드의 강인함
let saved = 0; for (let i = 0; i < 60; i++) { const z = mon({ n: '좀비', r: 'brute', tr: ['fort'], ty: 'undead' }, cx, cy); if (FO().survive(rt, z, 'hit', 0) && z.hp === 1) saved++; }
ok('언데드의 강인함: 건강 내성 DC 5 + 피해', saved > 30); { const z = mon({ n: '좀비', r: 'brute', tr: ['fort'], ty: 'undead' }, cx, cy); ok('언데드의 강인함: 큰 피해는 못 버틴다', !FO().survive(rt, z, 'hit', 1000 * (z.scale || 1))); }
const zc = mon({ n: '좀비', r: 'brute', tr: ['fort'], ty: 'undead' }, cx, cy); ok('언데드의 강인함: 치명타는 못 버틴다', !FO().survive(rt, zc, 'crit'));
// 면역
ok('언데드는 독 면역 · 골렘은 정지 면역', FO().immune({ kind: 'mon', ty: 'undead' }, 'poison') && FO().immune({ kind: 'mon', ty: 'construct' }, 'stop') && !FO().immune({ kind: 'mon', ty: 'humanoid' }, 'poison'));
// 무리 전술 · 붙어 쏘기
rt.mons = []; const p = rt.party[0]; p.x = cx; p.y = cy; const wf = mon({ n: 'w', r: 'skirmisher', tr: ['pack'] }, cx + 3, cy);
ok('무리 전술: 동료가 곁에 없으면 이점 없음', !FO().pack(rt, wf, p));
mon({ n: 'x', r: 'soldier' }, cx + 1, cy); ok('무리 전술: 동료가 곁에 있으면 이점', FO().pack(rt, wf, p) && G.Dnd.adv(wf, p) > 0);
const ga = mon({ n: 'a', r: 'artillery' }, cx - 1, cy); ok('붙은 적에게 쏘면 불리', FO().pointBlank(rt, ga) && G.Dnd.adv(ga, p) < 0);
// 표적
for (const a of rt.party) { a.x = cx; a.y = cy; }
const arc = rt.party.find(a => a.def && a.def.range >= 2); if (arc) { arc.x = cx + 2; const sk = mon({ n: 's', r: 'skirmisher' }, cx - 2, cy); ok('돌격형은 후열을 노린다', FO().target(rt, sk).def.range >= 2 || FO().target(rt, sk).def.heal); }
// 전술 「후열」
p.merc.tac = { t: 'back' }; const list = [mon({ n: 'n', r: 'soldier' }, cx + 1, cy), mon({ n: 'f', r: 'support' }, cx + 5, cy)];
ok('지시 후열: 가까운 전열보다 뒤의 주술사', G.Tactics.pick(rt, list, p).n === 'f'); p.merc.tac = null;
// 엄폐: 쏘는 쪽과 표적 사이에 누가 서 있으면 +2
{ rt.mons = []; for (const q of rt.party) { q.dead = false; q.dying = null; q.hp = q.max; } const tg = rt.party[0]; tg.x = cx; tg.y = cy; for (const a of rt.party.slice(1)) { a.x = cx - 3; a.y = cy - 3; } const sh = mon({ n: 'a', r: 'artillery' }, cx + 4, cy); ok('가리는 사람 없으면 엄폐 없음', FO().cover(rt, sh, tg) === 0); rt.party[1].x = cx + 2; rt.party[1].y = cy; ok('사이에 서면 엄폐 +2', FO().cover(rt, sh, tg) === 2); ok('근접은 엄폐 없음', FO().cover(rt, mon({ n: 's', r: 'soldier' }, cx + 4, cy), tg) === 0); }
// 진형 판대로 선다
{ const fm = G.Fantasy.formation(f), uids = Object.keys(fm); rt.mons = []; const lead = rt.party[0], F0 = mon({ n: 'x', r: 'soldier' }, lead.x + 12, lead.y);
  const big = rt.map.rooms.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a)), lx = big.x + 2, ly = big.y + (big.h >> 1);
  for (const a of rt.party) { a.x = lx; a.y = ly; } lead.x = lx + (big.w >> 1); lead.y = ly; F0.x = big.x + big.w - 1; F0.y = ly; G.Tactics.snap(rt);
  const pl = G.Tactics.deploy(rt, lead, F0); ok('진형: 앞줄과 뒷줄을 따로 세운다', pl.length > 0);
  const back = rt.party.find(a => a !== lead && a.merc && (fm[a.merc.uid] / 3 | 0) > (fm[lead.merc.uid] / 3 | 0)), plan = back && pl.find(x => x.e === back);
  if (plan) { const end = plan.path[plan.path.length - 1]; ok('진형: 뒷줄은 앞장선 사람보다 적에게서 멀다', Math.abs(end.x - F0.x) > Math.abs(lead.x - F0.x)); } }
// 무리 구성
f.front = 'undead'; let main = 0; for (let i = 0; i < 300; i++) { const b = G.D.F.factions.undead.by[G.Fantasy.band(8)]; if (FO().troop(8, 4).every(d => b.includes(d.n))) main++; } ok('주 세력이 대략 70%', main > 180 && main < 270); console.log(`  (${main}/300)`); ok('원정 선택 정보', FO().brief('green', 8).n === '오크' && FO().brief('green', 8).roles.length > 0);
// 기술도 표적 설정을 따른다
// 자원 · 주문 (SRD)
{ const R = G.Res, cleric = f.mercs.find(m => m.cls === 'cleric'), pa2 = f.mercs.find(m => m.cls === 'paladin'), res1 = { slot: 1 }, res3 = { slot: 3 }; cleric.lv = 5; pa2.lv = 5; R.long(cleric); R.long(pa2);
  ok('슬롯 표대로: 클레릭 5레벨 1레벨 이상 9 · 3레벨 2', R.usesOf(cleric, res1) === 9 && R.usesOf(cleric, res3) === 2);
  ok('11레벨 슬롯', (() => { cleric.lv = 11; R.long(cleric); const v = R.usesOf(cleric, res3) === 9; cleric.lv = 5; R.long(cleric); return v; })());
  ok('다 쓰면 못 쓰고, 전투로는 안 차고 긴 휴식에 찬다', (() => { R.pay(cleric, 'x', res3); R.pay(cleric, 'x', res3); const a = !R.can(cleric, 'x', res3); R.fightStart([{ merc: cleric }]); const b = !R.can(cleric, 'x', res3); R.long(cleric); return a && b && R.can(cleric, 'x', res3); })());
  ok('남은 슬롯 중 낮은 것부터, 다 쓰면 높은 슬롯', (() => { const a = R.castLevel(cleric, res1) === 1; for (let i = 0; i < 4; i++) R.pay(cleric, 'x', res1); const b = R.castLevel(cleric, res1) === 2; R.long(cleric); return a && b; })());
  for (const q of rt.party) { q.dead = false; q.dying = null; q.hp = q.max; } 
  { const G1 = G.Skill.SK, c = rt.party.find(a => a.merc && a.merc.cls === 'cleric'), keep = cleric.skills; cleric.skills = ['sr_bless', 'sr_mhw', 'sr_gbolt', 'sr_sflame']; R.long(cleric); const mg = mon({ n: '산적', r: 'soldier' }, c.x + 1, c.y); mg.hp = mg.max = 9999; G.S.runTime += 1; const seen = [mg]; c.slotUsed = false; c.concK = null; c.hp = 1; c.lastBonus = null; c.lastSk = null;
    c.merc.sp = 'dwarf'; /* 종족 스킬이 먼저 나오지 않게 */ const rt0 = rt.turn; rt.turn = { round: 1 }; G.Skill.tick(f, rt, c, 0, seen, 1); ok('슬롯 주문은 추가 행동 첫 단계에 안 쓴다', !c.lastBonus); G.Skill.tick(f, rt, c, 0, seen); const a1 = c.lastSk, s1 = c.slotUsed; G.Skill.tick(f, rt, c, 0, seen, 2); ok('차례에 슬롯 주문 하나', a1 && s1 && !c.lastBonus);
    c.slotUsed = false; c.lastSk = null; if (c.concK) { c.slotUsed = false; G.Skill.tick(f, rt, c, 0, seen); ok('집중 중이면 새 집중 주문을 안 건다', c.lastSk !== 'sr_bless'); } R.endConc(c); rt.turn = rt0; c.hp = c.max; cleric.skills = keep; rt.mons = rt.mons.filter(o => o !== mg); R.long(cleric); }
  ok('기술 종류: 행동 · 추가 행동 · 반응 · 늘 적용', G.Skill.kindOf('sr_fireball') === '행동' && G.Skill.kindOf('sr_hword') === '추가 행동' && G.Skill.kindOf('sr_shield') === '반응' && G.Skill.kindOf('sr_aura') === '늘 적용');
  ok('SRD 대조: 행동 쇄도 · 무모한 공격 · 신성한 무기는 소모 없음', ['sr_surge', 'sr_reckless', 'sr_sacred'].every(k => G.Skill.kindOf(k) === '소모 없음'));
  ok('SRD 대조: 강타 · 속박의 일격은 추가 행동이고 맞힌 뒤에 붙는다', ['sr_smite', 'sr_searing', 'sr_ensnare'].every(k => G.Skill.kindOf(k) === '추가 행동' && G.Skill.SK[k].rider));
  { const pd = rt.party.find(a => a.merc && a.merc.cls === 'paladin'), keep = pd.merc.skills, rt0 = rt.turn; pd.merc.skills = ['sr_smite', 'sr_sap', 'sr_lay', 'sr_sof']; R.long(pd.merc); const mg = mon({ n: '산적', r: 'soldier' }, pd.x + 1, pd.y); mg.hp = mg.max = 5000; rt.turn = { round: 1, cur: pd }; pd.lastBonus = null; pd.slotUsed = false; pd.lastHitSk = null; const h0 = mg.hp; G.Skill.onHit(f, rt, pd, mg); ok('강타: 맞으면 추가 피해 · 추가 행동 · 슬롯 사용', mg.hp < h0 && pd.lastBonus === 'sr_smite' && pd.slotUsed); const h1 = mg.hp; G.Skill.onHit(f, rt, pd, mg); ok('강타: 차례에 한 번', mg.hp === h1); pd.lastHitSk = null; pd.lastBonus = 'sr_sof'; pd.slotUsed = false; const h2 = mg.hp; G.Skill.onHit(f, rt, pd, mg); ok('강타: 추가 행동을 이미 썼으면 못 쓴다', mg.hp === h2); rt.turn = rt0; pd.merc.skills = keep; R.long(pd.merc); rt.mons = rt.mons.filter(o => o !== mg); }
  ok('설명에 소모 칸이 붙는다', /^\[행동\]/.test(G.Skill.desc(cleric, 'sr_fireball')));
  ok('설명에 남은 횟수가 붙는다', /2번/.test(G.Skill.desc(cleric, 'sr_fireball')) && !/슬롯/.test(G.D.MSKILLS.sr_fireball.d));
  ok('집중: 새로 걸면 앞의 것이 끝난다', (() => { const c = rt.party.find(a => a.merc && a.merc.cls === 'cleric'), q = rt.party[0]; R.conc(c, 'bless'); R.concOn(c, q, 'bless', 100, { hit: 2.5 }); const a = G.Dnd.bon(q, 'bless'); R.conc(c, 'sof'); return a && !G.Dnd.bon(q, 'bless'); })());
  ok('종족은 저장된다', !!R.species(cleric) && R.SPECIES[R.species(cleric)]); cleric.lv = 7; pa2.lv = 7; R.long(cleric); R.long(pa2); }
// 자리가 곧 행동
const T = G.Tactics, FM = G.Fantasy.formation(f), pa = rt.party.find(a => a.merc.cls === 'paladin'), cl = rt.party.find(a => a.merc.cls === 'cleric'), ra = rt.party.find(a => a.merc.cls === 'archer');
ok('기본 자리: 팔라딘 앞줄 · 레인저 가운데 · 클레릭 뒷줄', (FM[pa.merc.uid] / 3 | 0) === 0 && (FM[ra.merc.uid] / 3 | 0) === 1 && (FM[cl.merc.uid] / 3 | 0) === 2);
const put = (a, r) => { FM[a.merc.uid] = r * 3 + (FM[a.merc.uid] % 3); };
ok('팔라딘: 앞줄 버티기', T.of(pa).pos === 'line'); put(pa, 1); ok('팔라딘: 가운데 돌격', T.of(pa).pos === 'charge'); put(pa, 2); ok('팔라딘: 뒷줄 동료 보호', T.of(pa).pos === 'guard'); put(pa, 0);
put(cl, 0); ok('클레릭: 앞줄은 치유를 아낀다', T.healAt(cl) === 0.35); put(cl, 2); ok('클레릭: 뒷줄은 일찍 치유', T.healAt(cl) === 0.75);
T.setTarget(pa.merc, 'weak'); ok('표적은 사람마다 하나', T.of(pa).target === 'weak' && T.of(cl).target === 'near'); T.setTarget(pa.merc, 'near');
{ const w = { x: 0, y: 0, def: { range: 6 }, merc: { cls: 'archmage', uid: -1 } }; w.merc.tac = { t: 'weak' }; const a = { x: 3, y: 0, hp: 9 }, b = { x: 20, y: 0, hp: 1 }; ok('원거리: 쏠 수 있는 적이 있으면 멀리 튀어나가지 않는다', T.pick(rt, [a, b], w) === a); }
{ const was = [pa.x, pa.y, cl.x, cl.y, ra.x, ra.y], mapRoom = rt.map.rooms.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a)), y0 = mapRoom.y + (mapRoom.h >> 1), x0 = mapRoom.x + 1; rt.mons = []; const tg = mon({ n: 'x', r: 'soldier' }, mapRoom.x + mapRoom.w - 1, y0); for (const a of rt.party) { a.x = x0; a.y = y0 - 1; } ra.x = x0 + 2; ra.y = y0; pa.x = x0 + 3; pa.y = y0 + 1; const can = (x, y) => Math.hypot(x - tg.x, y - tg.y) <= 2 && G.Fantasy.sees(rt.map, { x, y }, tg), path = T.rearward(rt, ra, tg, 6, can), end = path.length ? path[path.length - 1] : ra; ok('거리 유지: 앞줄보다 앞으로 나서지 않는다', Math.hypot(end.x - tg.x, end.y - tg.y) >= Math.hypot(pa.x - tg.x, pa.y - tg.y)); [pa.x, pa.y, cl.x, cl.y, ra.x, ra.y] = was; }
{ const s0 = T.slot(rt, cl, pa, 1, 0); ok('이동 자리: 뒷줄은 앞장선 사람 뒤', s0 && s0.x < pa.x); }
let back = 0; for (let i = 0; i < 200; i++) { const t = FO().troop(8, 4); if (t.filter(d => d.r === 'support').length > 1) bad++; if (t.some(d => FO().ROLES[d.r].range)) back++; }
console.log(`  (8층 4마리 무리 중 후열 포함 ${back}/200)`);
// 층별 몬스터: 구간마다 CR 상한, 큰 놈은 무리에 하나, 히드라는 깊은 층부터
{ const D = G.D.F, CAP = [1, 1, 4, 9, 10, 99], crOf = n => G.SRD_MON[D.STAT[n]?.[0]]?.cr || 0; for (const k in D.factions) D.factions[k].by.forEach((l, b) => { for (const n of l) ok(`${k} ${b}구간 ${n}: CR ${crOf(n)} ≤ ${CAP[b]}`, crOf(n) <= CAP[b]); }); const hy = [1, 5, 10].map(fl => Object.keys(D.factions).some(k => D.factions[k].by[G.Fantasy.band(fl)].includes('히드라'))); ok('10층까지 히드라 없음', hy.every(x => !x)); const first = [...Array(40).keys()].map(i => i + 1).find(fl => Object.keys(D.factions).some(k => D.factions[k].by[G.Fantasy.band(fl)].includes('히드라'))); ok('깊은 층엔 히드라', first >= 11 && first <= 20, first); console.log('  히드라 첫 등장', first, '층'); const f0 = G.S.w.fantasy, keep = f0.front; f0.front = 'beast'; let over = 0; for (let i = 0; i < 300; i++) { const t = G.Foe.troop(first + 5, 6, 'beast'); if (t.filter(m => crOf(m.n) >= 5).length > 1) over++; } f0.front = keep; ok('큰 놈은 무리에 하나', over === 0, over); ok('히드라 크기', G.Fantasy.spawnMon(rt, 20, { n: '히드라', t: 'm_mandrake', ty: 'monstrosity', r: 'brute', s: 2.2 }, cx, cy, false, {}).s >= 2); }
console.log(bad ? `실패 ${bad}` : '전부 통과'); process.exitCode = bad ? 1 : 0;
