'use strict';
// 전투 밖 주문 · 효과가 있는 마법 물건 (G.Util, DESIGN.md 162): node test/util_rules.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
for (const n of ['core', 'data', 'srd_gen', 'srd_base', 'srd_mons', 'grid', 'juice', 'season', 'fantasy', 'guild', 'create', 'persona', 'dnd', 'feats', 'trinkets', 'bonds', 'report', 'skills', 'srd', 'srd_spells', 'srd_upcast', 'spells', 'traits', 'options', 'pools', 'utilspell', 'srd_species', 'srd_range', 'srd_items', 'items', 'skill_ai', 'team', 'camp', 'skill_fx', 'events', 'npc', 'tutorial', 'skill_nums', 'command', 'expedition', 'mission', 'explore', 'banter', 'lines_danger', 'sight', 'tactics', 'foe', 'summon', 'light','monact', 'lore', 'region', 'scn_astral', 'tut_map', 'res', 'turn', 'flow', 'story', 'state'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, FO = () => G.Foe; G.newState(); G.quiet = true; G.Lore.all = true; // 공략을 아는 AI를 본다
const f = G.S.w.fantasy, GD = G.Guild; GD.leader(f); f.leaderNew = false; f.lineup = ['archer', 'cleric', 'paladin'].map(c => { const m = GD.make(f, c, { lv: 7 }); f.mercs.push(m); return m.uid; }); G.Fantasy.syncAllies(f); f.floor = f.maxFloor = 8; f.checkpoint = f.start = 8; f.town = true; f.townT = 99;
f.frontLock = 'green'; const rt = G.Fantasy.rt(f); G.Exp.depart(f, rt); for (let i = 0; i < 5 && !rt.map; i++) G.tick(1, 0.1);
let bad = 0, good = 0; const ok = (name, c) => { if (c) good++; else { bad++; console.log('  ✗  ' + name); } };
const mon = (d, x, y, o) => G.Fantasy.spawnMon(rt, 8, d, x, y, false, { aggro: true, spotted: true, ...o });
const r0 = rt.map.rooms[1], cx = r0.cx ?? r0.x + 2, cy = r0.cy ?? r0.y + 2;
const U = G.Util, B = G.Items.bag(f), P = rt.party.filter(p => p.merc && !p.dead), cl = P.find(p => p.merc.cls === 'cleric'), ar = P.find(p => p.merc.cls === 'archer');
const give = (p, ...ks) => { p.merc.skills = [...new Set((p.merc.skills || []).concat(ks))]; }, clear = () => { for (const p of P) p.merc.skills = (p.merc.skills || []).filter(k => !k.startsWith('u_')); for (const k in B) delete B[k]; f.itemUse = {}; };
const seenN = () => rt.seen.reduce((a, b) => a + (b ? 1 : 0), 0);
ok('전투 밖 주문 122개 (우리말 이름 · 차원 이동 포함)', Object.keys(U.FX).length === 122 && Object.keys(U.FX).every(k => G.D.MSKILLS[k] && !/[A-Za-z]/.test(G.D.MSKILLS[k].n)));
ok('대표 기술 목록은 40 이하 그대로', Object.values(G.Pool.POOL).every(l => l.length <= 40));
ok('고르는 칸에 들어간다 (클레릭 유도)', G.Guild.pickable('cleric').includes('u_guidance'));
cl.merc.lv = 17; clear(); give(cl, 'u_guidance', 'u_zone_of_truth');
{ let a = 0, b = 0; const sk = cl.merc.skills; for (let i = 0; i < 400; i++) { cl.merc.skills = []; if (G.Mission.roll(f, rt, 'insight', 0, P[0], 18).ok) a++; cl.merc.skills = sk; G.Res.long(cl.merc); if (G.Mission.roll(f, rt, 'insight', 0, P[0], 18).ok) b++; } ok('유도 · 진실의 영역: 통찰 판정이 오른다', b > a + 20); }
clear(); give(cl, 'u_find_the_path'); G.Res.long(cl.merc); { const s0 = seenN(); U.floor(f, rt); ok('길 찾기: 계단 방이 보인다', seenN() > s0); }
clear(); give(cl, 'u_alarm'); ok('경보: 휴식 중 기습 없음', !!U.ward(rt));
clear(); give(cl, 'u_word_of_recall'); G.Res.long(cl.merc); ok('귀환의 말: 짐을 잃지 않고 돌아간다 (6레벨 슬롯)', !!U.escape(rt));
clear(); give(cl, 'u_raise_dead'); G.Res.long(cl.merc); { const m = ar.merc; f.lastHome = 3; f.fallen = [{ snap: JSON.stringify(m), uid: m.uid, run: 3, name: m.name }]; G.Guild.dismiss(f, m.uid); f.gold = 600; U.raise(f); const r = f.mercs.find(q => q.uid === m.uid); ok('사자 소생: 500 GP · d20 −4', r && f.gold === 100 && r.raisePen === 4); }
{ const m = f.mercs.find(q => q.raisePen); G.Res.longRest([m]); ok('사자 소생 벌점은 긴 휴식마다 1씩', m.raisePen === 3); }
clear(); B['Wand of Secrets'] = 1; { const s0 = seenN(); U.floor(f, rt); ok('비밀의 완드 (물건): 길 찾기 · 충전 1 사용', seenN() >= s0 && f.itemUse['Wand of Secrets'] === 1); }
clear(); B['Potion of Gaseous Form'] = 1; ok('기체 변신의 물약: 귀환 · 쓰면 사라진다', !!U.escape(rt) && !B['Potion of Gaseous Form']);
clear(); B['Bag of Holding'] = 1; ok('보관 가방: 짐 한도 +', U.carry(rt) === 1);
clear(); B['Hat of Disguise'] = 1; ok('변장의 모자: 기만 판정 이점', !!U.help(rt, 'deception', P[0])?.adv);
clear(); G.Items.treasure(f, rt, 'Crystal Ball', '수정구', 100, 0, 0); ok('효과가 있는 물건은 가방에 (팔지 않는다)', B['Crystal Ball'] === 1);
clear(); { const m = P[2].merc; f.lastHome = 4; f.fallen = [{ snap: JSON.stringify(m), uid: m.uid, run: 4, name: m.name }]; G.Guild.dismiss(f, m.uid); B['Ring of Three Wishes'] = 1; f.gold = 0; U.raise(f); ok('세 소원의 반지: 소원으로 되살린다 (남은 둘)', f.mercs.some(q => q.uid === m.uid) && f.itemUse['Ring of Three Wishes'] === 1); G.Res.longRest([]); ok('세 소원은 긴 휴식에 돌아오지 않는다', f.itemUse['Ring of Three Wishes'] === 1); }
// 남은 마법 물건 · 직업 기능 (DESIGN.md 164)
{ const X = G.ItemX; clear(); let n = 0; for (let i = 0; i < 100; i++) { B['Potion of Poison'] = 1; B['Potion of Healing'] = 1; if (X.drink(rt, P[1])) n++; } ok('독 물약: 감정 못 하면 치유 물약과 헷갈린다', n > 20 && n < 80); P[1].hp = P[1].max; P[1].cond = {}; }
{ const X = G.ItemX; clear(); B['Ring of Spell Storing'] = 1; X.longRest([cl.merc]); const s = G.Res.of(cl.merc); const sl0 = s.sl; s.sl = Array(9).fill(99); ok('주문 저장의 반지: 슬롯이 없어도 반지의 레벨로', G.Res.can(cl.merc, 'sr_fireball', { slot: 3 }) && G.Res.pay(cl.merc, 'sr_fireball', { slot: 3 }) === 3 && X.ringLeft() === 2); s.sl = sl0 || []; }
{ clear(); B['Wand of Wonder'] = 1; const c = rt.party.filter(p => p.merc && !p.dead && !p.dying).sort((p, q) => G.Dnd.dc(q) - G.Dnd.dc(p))[0]; G.D.F.STAT.T_u = ['tough']; rt.mons = []; const m = G.Fantasy.spawnMon(rt, 6, { n: 'T_u', r: 'brute' }, c.x + 2, c.y, false, { aggro: true, spotted: true }); ok('경이의 완드: 주문 DC가 가장 높은 동료가 쓴다', G.Skill.SK.it_wonder.when(c, { f, rt, c, seen: [m] })); rt.mons = []; }
{ clear(); const w = P.find(p => p.merc.cls === 'cleric'); const lv0 = w.merc.lv, cls0 = w.merc.cls; w.dead = false; w.dying = null; w.hp = w.max; w.merc.cls = 'warlock'; w.merc.lv = 9; delete G.Res.of(w.merc).sp.patron; G.D.F.STAT.T_u = ['tough']; rt.mons = []; G.Fantasy.spawnMon(rt, 6, { n: 'T_u', r: 'brute' }, w.x + 3, w.y, false, {}); U.floor(f, rt); ok('후원자와 교신 (워락 9): 층마다가 아니라 긴 휴식에 한 번', G.Res.of(w.merc).sp.patron === true); w.merc.cls = cls0; w.merc.lv = lv0; rt.mons = []; }
console.log(bad ? `util_rules: 통과 ${good} · 실패 ${bad}` : `util_rules: 통과 ${good} · 실패 0`); process.exitCode = bad ? 1 : 0;
