'use strict';
// 전투 방식과 무기 · 돕기 · 연계 · 상성: node test/team_rules.js  (SRD Fighting Style Feats, Help)
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, GD = G.Guild, F = G.Fantasy, DN = G.Dnd, O = G.Opt, SR = G.SRD, SK = G.Skill.SK, AI = G.SkillAI, T = G.Tactics;
let ok = 0, bad = 0; const t = (name, v, extra = '') => { if (v) ok++; else { bad++; console.log('  실패:', name, extra); } };
G.quiet = true;
function setup(cls, lv, style) {
  G.newState();
  const f = G.S.w.fantasy, L = GD.leader(f); f.leaderNew = false; f.autoTr = false; L.lv = lv; f.autoParty = false;
  const m = GD.make(f, cls, { lv, sp: 'human', feat: 'skilled' }); m.opts = { fs: style ? [style] : [], iv: [], mm: [], tome: [] }; f.mercs.push(m);
  const b = GD.make(f, 'dragoon', { lv }); b.opts = { fs: ['fs_gwf'] }; f.mercs.push(b);
  f.lineup = [m.uid, b.uid]; F.syncAllies(f); f.floor = f.maxFloor = 5; f.checkpoint = f.start = 5; f.town = true; f.townT = 99; G.Exp.depart(f, F.rt(f));
  const rt = F.rt(f), mp = rt.map; rt.mons = []; rt.chests = []; rt.seen.fill(1);
  const r = mp.rooms.slice().sort((p, q) => q.w * q.h - p.w * p.h)[0], a = rt.party.find(p => p.merc === m), ally = rt.party.find(p => p.merc === b), cx = r.cx, cy = r.cy;
  a.x = cx; a.y = cy; ally.x = cx + 1; ally.y = cy - 1;
  rt.party.filter(p => p !== a && p !== ally).forEach((p, i) => { p.x = cx - 4 - i; p.y = cy; });
  const mon = (dx, dy = 0) => { F.spawnMon(rt, 5, { n: '산적', t: 'm_bandit', ty: 'humanoid' }, cx + dx, cy + dy, false, { aggro: true, spotted: true, gold: 0 }); const o = rt.mons[rt.mons.length - 1]; o.hp = o.max = 9999; return o; };
  F.refreshEnts(rt); rt.turn = { map: mp, round: 1, order: [], i: 0, cur: a, ph: 'wait', t: 1, low: 1, downs: 0 };
  return { f, rt, m, a, ally, mon };
}
const fighter = (style, lv = 5) => { G.newState(); const m = GD.make(G.S.w.fantasy, 'dragoon', { lv }); m.opts = { fs: [style] }; return m; };
const avg = fn => { let s = 0; for (let i = 0; i < 3000; i++) s += fn(); return s / 3000; };

// 전투 방식이 기본 무기를 정한다
{ const g = fighter('fs_gwf'), d = fighter('fs_defense'), w = fighter('fs_twf');
  t('대형 무기: 대검 · 방패 없음', SR.eq(g).w === 'greatsword' && !SR.eq(g).shield, JSON.stringify(SR.eq(g)));
  t('방어: 롱소드 + 방패', SR.eq(d).w === 'longsword' && SR.eq(d).shield, JSON.stringify(SR.eq(d)));
  t('쌍수: 숏소드(경량) · 방패 없음', SR.eq(w).w === 'shortsword' && !SR.eq(w).shield, JSON.stringify(SR.eq(w)));
  t('방어 AC = 대형 무기 AC + 방패 2 + 방어 1', DN.acBase({ merc: d }) === DN.acBase({ merc: g }) + 3, `${DN.acBase({ merc: d })} / ${DN.acBase({ merc: g })}`);
  t('각 방식의 조건이 맞다', SR.styleOn(g, 'fs_gwf') && SR.styleOn(d, 'fs_defense') && SR.styleOn(w, 'fs_twf')); }
// 조건을 어기면 효과가 없다
{ const g = fighter('fs_gwf'); const on = avg(() => DN.rollK({ merc: g, def: GD.def(g), swing: true }, false)); SR.eq(g).shield = true; const off = avg(() => DN.rollK({ merc: g, def: GD.def(g), swing: true }, false)); t('방패를 들면 대형 무기 전투가 꺼진다', !SR.styleOn(g, 'fs_gwf') && on > off, `${on} / ${off}`); }
{ const m = fighter('fs_gwf'); SR.eq(m).w = 'mace'; t('철퇴(양손 · 양용 아님)에는 대형 무기 전투 없음', !SR.styleOn(m, 'fs_gwf')); SR.eq(m).w = 'longsword'; t('양용 롱소드에는 된다', SR.styleOn(m, 'fs_gwf')); }
{ const m = fighter('fs_defense'); SR.eq(m).a = 'none'; t('갑옷이 없으면 방어 +1 없음', !SR.styleOn(m, 'fs_defense')); }
{ const S = setup('dragoon', 5, 'fs_twf'), o = S.mon(1); SR.eq(S.m).w = 'greatsword'; S.m.skills = []; G.Skill.tick(S.f, S.rt, S.a, 0, [o], true); t('대검으로는 쌍수 추가 공격이 없다', o.hp === 9999 && S.a.lastBonus !== 'fs_twf', S.a.lastBonus); }
{ const S = setup('dragoon', 5, 'fs_twf'), o = S.mon(1); S.m.skills = []; const r = SK.fs_twf.when(S.a, { f: S.f, rt: S.rt, c: S.a, seen: [o] }); t('숏소드로는 쌍수 추가 공격을 쓸 수 있다', !!r); }
// 직접 고른 무기는 안 건드린다
{ const m = fighter('fs_gwf'); SR.eq(m).w = 'maul'; O.setFs(m, 'fs_defense', true); t('직접 바꾼 무기는 그대로', SR.eq(m).w === 'maul', SR.eq(m).w); }
{ const m = fighter('fs_gwf'); SR.eq(m); O.setFs(m, 'fs_twf', true); t('기본 무기면 새 방식의 무기로', SR.eq(m).w === 'shortsword', SR.eq(m).w); }
// 바꾸기는 레벨이 오를 때
{ const m = fighter('fs_gwf'); t('처음엔 바꿀 수 있다', O.canFs(m)); t('바꾼다', O.setFs(m, 'fs_defense') && O.fsNow(m) === 'fs_defense'); t('같은 레벨에 또는 못 바꾼다', !O.setFs(m, 'fs_twf') && O.fsNow(m) === 'fs_defense'); t('목록에 없는 방식은 안 된다', (m.lv++, !O.setFs(m, 'fs_archery'))); t('레벨이 오르면 또 바꾼다', O.setFs(m, 'fs_gwf') && O.fsNow(m) === 'fs_gwf'); t('효과도 바뀐다', GD.skill(m, 'fs_gwf') && !GD.skill(m, 'fs_defense')); }
// 단장
{ G.newState(); const f = G.S.w.fantasy; t('간단 파이터는 SRD 권장 방어', G.Create.quick('dragoon').fs === 'fs_defense'); G.Create.make(f, G.Create.quick('dragoon', 'x')); const L = GD.leader(f); t('단장에 반영', O.fsNow(L) === 'fs_defense' && SR.eq(L).shield, JSON.stringify(SR.eq(L))); }
{ G.newState(); const f = G.S.w.fantasy; G.Create.make(f, { ...G.Create.quick('dragoon', 'x'), fs: 'fs_twf' }); const L = GD.leader(f); t('직접 고른 방식', O.fsNow(L) === 'fs_twf' && SR.eq(L).w === 'shortsword', SR.eq(L).w); t('만들고 나면 레벨업 전까지 못 바꾼다', !O.canFs(L)); }
{ G.newState(); const f = G.S.w.fantasy; G.Create.make(f, { ...G.Create.quick('cleric', 'x'), fs: 'fs_twf' }); t('다른 직업엔 안 붙는다', !(GD.leader(f).opts?.fs || []).includes('fs_twf')); }
{ G.newState(); const f = G.S.w.fantasy, ac = fs => DN.acBase({ merc: GD.preview(f, { ...G.Create.quick('dragoon', 'x'), fs }) }); t('미리보기 AC가 고른 방식을 따른다', ac('fs_defense') === ac('fs_gwf') + 3, `${ac('fs_defense')} / ${ac('fs_gwf')}`); t('미리보기는 단장을 안 바꾼다', !GD.leader(f).fsLv && (ac('fs_twf'), SR.eq(GD.leader(f)).w !== 'shortsword' || O.fsNow(GD.leader(f)) === 'fs_twf')); }
// 돕기 (SRD Help)
{ const S = setup('bard', 5), o = S.mon(1), x = { f: S.f, rt: S.rt, c: S.a, seen: [o] };
  t('곁에 적이 있어야 쓴다', SK.sr_help.when(S.a, x)); t('사거리가 있다', G.D.SK_RANGE.sr_help === 1.5);
  SK.sr_help.run(S.a, x); t('동료의 공격에 이점', DN.adv(S.ally, o) === 1, DN.adv(S.ally, o)); t('자기 공격엔 이점 없음', DN.adv(S.a, o) <= 0, DN.adv(S.a, o));
  DN.attackRoll?.(S.a, o); t('자기 공격으로는 안 사라진다', o.helped === true);
  DN.attackRoll?.(S.ally, o); t('동료가 공격하면 사라진다', !o.helped); }
{ const S = setup('bard', 5), o = S.mon(1), x = { f: S.f, rt: S.rt, c: S.a, seen: [o] }; SK.sr_help.run(S.a, x); G.Team.expire(S.rt, S.a); t('도운 사람의 다음 차례면 끝난다', !o.helped && !o.helpBy); }
{ const S = setup('bard', 5), o = S.mon(5), x = { f: S.f, rt: S.rt, c: S.a, seen: [o] }; t('멀면 못 쓴다', !SK.sr_help.when(S.a, x)); t('멀면 값 0', AI.score('sr_help', S.a, x, 1) === 0); }
// 값: 칠 동료가 있어야 값이 있다
{ const S = setup('bard', 5), o = S.mon(1), x = { f: S.f, rt: S.rt, c: S.a, seen: [o] }, v1 = AI.score('sr_help', S.a, x, 1); S.ally.x += 9; const v0 = AI.score('sr_help', S.a, x, 1); t('곁의 동료가 칠 수 있으면 값이 있다', v1 > 0, v1); t('칠 동료가 없으면 값 0', v0 === 0 && v1 > v0, `${v0}`); }
{ const S = setup('dragoon', 5, 'fs_gwf'), o = S.mon(1), x = { f: S.f, rt: S.rt, c: S.a, seen: [o] }; const k = 'sr_topple', v1 = AI.score(k, S.a, x, 1); S.ally.x += 9; const v0 = AI.score(k, S.a, x, 1); t('곁에 동료가 있으면 넘어뜨리기 값이 오른다', v1 > v0, `${v1} / ${v0}`); }
{ t('AI는 돕기를 스스로 고르지 않는다', G.Team.autoHelp === false && !G.Team.add(['a']).includes('sr_help'));
  const S = setup('bard', 5), o = S.mon(1), r0 = AI.rank; let got = null; AI.rank = function (l) { got = l; return r0.apply(this, arguments); }; G.Skill.tick(S.f, S.rt, S.a, 0, [o]); AI.rank = r0; t('전투 차례의 후보에 돕기가 없다', got && !got.includes('sr_help'), got);
  G.Team.autoHelp = true; const L = G.Team.add(['a']); t('켜면 모두의 행동', L.includes('sr_help') && G.Team.add(L).length === L.length); G.Team.autoHelp = false; }
// 표적: 닿는 적 중 이점이 있는 쪽
{ const S = setup('dragoon', 5, 'fs_gwf'), n = S.mon(1), p = S.mon(1, 1), far = S.mon(6); DN.give(S.rt, p, 'outlined', 5, S.a); t('이점 있는 적을 친다', T.pick(S.rt, [n, p], S.a) === p); t('이점 없으면 가까운 적', (delete p.st, T.pick(S.rt, [n, far], S.a) === n)); DN.give(S.rt, far, 'outlined', 5, S.a); t('닿지 않으면 쫓아가지 않는다', T.pick(S.rt, [n, far], S.a) === n); }
{ const S = setup('dragoon', 5, 'fs_gwf'), n = S.mon(1), p = S.mon(2, 0); p.hp = 1; DN.give(S.rt, n, 'outlined', 5, S.a); T.setTarget(S.m, 'weak'); t('표적 지시가 먼저', T.pick(S.rt, [n, p], S.a) === p); }
// 상성
{ t('시험 몬스터가 있다', !!G.D.F.STAT['블랙 푸딩']); const fi = fighter('fs_gwf'), v = G.Foe.versus(fi, ['블랙 푸딩']); t('베기는 푸딩을 나눈다', v.split === 1, JSON.stringify(v)); const w = fighter('fs_twf'), u = G.Foe.versus(w, ['블랙 푸딩']); t('찌르기는 안 나눈다', u.split === 0, JSON.stringify(u)); t('피해 종류를 돌려준다', v.t === 'slashing' && u.t === 'piercing', `${v.t} ${u.t}`); }
{ const names = Object.keys(G.D.F.STAT), fi = fighter('fs_gwf'), v = G.Foe.versus(fi, names); t('약점 · 저항을 센다', v.up + v.down > 0, JSON.stringify(v)); t('모르는 이름은 넘어간다', G.Foe.versus(fi, ['없음']).up === 0); }
console.log(`team_rules: 통과 ${ok} · 실패 ${bad}`);
if (bad) process.exitCode = 1;
