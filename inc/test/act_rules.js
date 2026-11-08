'use strict';
// 행동 (질주 · 물러나기 · 숨기 · 찾기 · 연구 · 설득) · 다중 직업 (DESIGN.md 165): node test/act_rules.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
for (const n of ['core', 'data', 'srd_gen', 'srd_base', 'srd_mons', 'grid', 'juice', 'season', 'fantasy', 'guild', 'create', 'persona', 'dnd', 'feats', 'trinkets', 'bonds', 'report', 'skills', 'srd', 'srd_spells', 'srd_upcast', 'spells', 'traits', 'options', 'pools', 'utilspell', 'srd_species', 'multiclass', 'srd_range', 'srd_items', 'items', 'skill_ai', 'team', 'camp', 'skill_fx', 'events', 'npc', 'tutorial', 'skill_nums', 'command', 'expedition', 'mission', 'explore', 'banter', 'lines_danger', 'sight', 'tactics', 'foe', 'summon', 'light','monact', 'actions', 'lore', 'region', 'scn_astral', 'tut_map', 'res', 'turn', 'flow', 'story', 'state'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, FO = () => G.Foe; G.newState(); G.quiet = true; G.Lore.all = true; // 공략을 아는 AI를 본다
const f = G.S.w.fantasy, GD = G.Guild; GD.leader(f); f.leaderNew = false; f.lineup = ['archer', 'cleric', 'paladin'].map(c => { const m = GD.make(f, c, { lv: 7 }); f.mercs.push(m); return m.uid; }); G.Fantasy.syncAllies(f); f.floor = f.maxFloor = 8; f.checkpoint = f.start = 8; f.town = true; f.townT = 99;
f.frontLock = 'green'; const rt = G.Fantasy.rt(f); G.Exp.depart(f, rt); for (let i = 0; i < 5 && !rt.map; i++) G.tick(1, 0.1);
let bad = 0, good = 0; const ok = (name, c) => { if (c) good++; else { bad++; console.log('  ✗  ' + name); } };
const mon = (d, x, y, o) => G.Fantasy.spawnMon(rt, 8, d, x, y, false, { aggro: true, spotted: true, ...o });
const r0 = rt.map.rooms[1], cx = r0.cx ?? r0.x + 2, cy = r0.cy ?? r0.y + 2;
const A = G.Act, MC = G.MC, DN = G.Dnd, P = rt.party.filter(p => p.merc && !p.dead), T0 = G.Turn;
// 질주 · 물러나기 · 숨기 · 찾기
{ const e = P[1]; A.dash(e); ok('질주: 이번 차례 이동력 두 배 · 공격 없음', A.dashing(e) && A.noAttack(e)); }
{ const e = P[2]; A.disengage(rt, e); ok('물러나기: 이번 차례 기회 공격 없음', e.fleetN === T0.no() && A.noAttack(e)); }
{ const e = P[3], sv = G.Dnd.d20; rt.mons = []; G.Dnd.d20 = () => 20; const ok1 = A.hide(rt, e); G.Dnd.d20 = sv; ok('숨기: 보는 적이 없으면 DC 15 은신 → 투명 (찾기 DC를 남긴다)', ok1 && DN.invis(e) && e.bf.invis2.hideDC >= 15);
  e.bf.invis2.hideDC = 15; G.D.F.STAT.T_s = ['tough']; const o = mon({ n: 'T_s', r: 'brute' }, cx, cy); o.x = e.x + 1; o.y = e.y; G.Dnd.d20 = () => 20; const s = A.search(rt, o); G.Dnd.d20 = sv; ok('찾기: 지각이 은신 이상이면 드러난다', s && !DN.invis(e)); rt.mons = []; }
{ const e = P.find(p => p.merc.cls === 'cleric'); G.D.F.STAT.T_s = ['tough']; const o = mon({ n: 'T_s', r: 'brute' }, cx, cy); o.x = e.x + 1; o.y = e.y; o.hp = 1; e.merc.ab = { ...DN.ab(e.merc), cha: 20 }; const sv = G.Mission.roll; G.Mission.roll = () => ({ ok: true, nat: 20, mod: 5, dc: 15 }); A.influence(f, rt, e); G.Mission.roll = sv; ok('설득: 꺾인 적이 항복한다', o.surrender && o.flee); rt.mons = []; }
// 다중 직업
{ const m = G.Guild.make(f, 'dragoon', { lv: 5 }); m.ab = { str: 16, dex: 13, con: 14, int: 14, wis: 10, cha: 8 }; m.abCls = m.cls; const hp5 = DN.srdHP(m);
  ok('선행 조건: 지능 13 → 위저드 가능 · 지혜 10 → 클레릭 불가', MC.canAdd(m, 'archmage') && !MC.canAdd(m, 'cleric'));
  m.nextCls = 'archmage'; for (let i = 0; i < 3; i++) { m.lv++; G.Guild.grow(m); }
  ok('파이터 5 / 위저드 3', MC.lvOf(m, 'dragoon') === 5 && MC.lvOf(m, 'archmage') === 3);
  ok('주문 슬롯: 다중 직업 시전자 3레벨 (1레벨 4 · 2레벨 2)', G.Res.left(m, { slot: 2 }) === 2 && G.Res.left(m, { slot: 1 }) === 6);
  ok('추가 공격은 겹치지 않는다 (2)', DN.attacks({ merc: m }) === 2);
  ok('히트 다이스: 위저드 레벨은 d6 (평균 4 + 건강)', DN.srdHP(m) > hp5 && DN.srdHP(m) - hp5 <= 3 * (4 + 3) + 3);
  ok('숙련 보너스는 캐릭터 레벨 (8 → +3) · 내성은 첫 직업', DN.prof(m.lv) === 3 && DN.cls(m).saves.includes('str'));
  ok('위저드 주문을 준비한다 (그 직업 목록 · 그 레벨)', G.Guild.picks(m).some(k => MC.ownerOf(m, k) === 'archmage' && G.Guild.spLv(k) >= 1));
  ok('직업 시점에서도 능력치는 그대로', JSON.stringify(DN.ab(MC.view(m, 'archmage'))) === JSON.stringify(DN.ab(m)));
  ok('하위 직업: 위저드 3레벨에', !!MC.list(m)[1].adv);
  const s = JSON.parse(JSON.stringify(m)); ok('저장: 직업 시점은 저장되지 않는다', !('__views' in s) && s.mc.length === 1); }
{ const r = G.Guild.make(f, 'dragoon', { lv: 4 }); r.ab = { str: 14, dex: 16, con: 12, int: 10, wis: 10, cha: 8 }; r.abCls = r.cls; r.nextCls = 'rogue'; for (let i = 0; i < 3; i++) { r.lv++; G.Guild.grow(r); } const a = { merc: r, x: 0, y: 0 }; G.SRD.eq(r).w = 'rapier'; a.sneakN = -1; ok('급소 공격: 로그 레벨로 (로그 3 → 2d6)', DN.sneak({ party: [a, { x: 1, y: 1, dead: false }] }, a, { x: 1, y: 0 }, 1) === 2); }
console.log(bad ? `act_rules: 통과 ${good} · 실패 ${bad}` : `act_rules: 통과 ${good} · 실패 0`); process.exitCode = bad ? 1 : 0;
