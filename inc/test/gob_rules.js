'use strict';
// 고블린 굴 시험판 (DESIGN.md 144): node test/gob_rules.js
// 파티 구성이 길을 정하고, 앞의 선택이 다음 원정까지 이어지는지 본다
const fs = require('fs'), vm = require('vm'), path = require('path'); const ROOT = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(ROOT + '/test/party_lab.js', 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(`${ROOT}/js/${n}.js`, 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, GD = G.Guild, F = G.Fantasy, E = G.Event, ST = G.Story; G.quiet = true; G.Foe.retreatOn = false;
let ok = 0, bad = 0; const t = (n, c, x = '') => { if (c) ok++; else { bad++; console.log('실패:', n, x); } };
function setup(cls, opt = {}) {
  G.newState(); const f = G.S.w.fantasy, L = GD.leader(f); f.leaderNew = false; f.autoTr = f.autoParty = f.autoGo = false; L.lv = opt.lv || 6;
  f.mercs = [L]; f.lineup = cls.map(([c, x, langs]) => { const m = GD.make(f, c, { lv: opt.lv || 6 }); if (x) { m.skills = [x, ...m.skills.filter(k => k !== x)]; m.skManual = true; } m.langs = langs || ['elvish', 'dwarvish']; f.mercs.push(m); return m.uid; });
  L.langs = ['elvish', 'dwarvish'];
  F.syncAllies(f); const s = G.Season.st(f); s.seed = 11; s.t = 0; f.frontLock = f.front = opt.front || 'green'; f.policy = 'party'; f.start = f.checkpoint = f.floor = f.maxFloor = 3; f.town = true; f.seasonEnd = false; f.townT = 99;
  const rt = F.rt(f); G.Exp.depart(f, rt); for (let i = 0; i < 400 && !rt.flow; i++) G.tick(1, 0.25);
  f.front = opt.front || 'green'; f.runs = 1; rt.mons = rt.mons.filter(q => q.boss); f.recent = [];
  return { f, rt };
}
// 판정 고정: v = 성공/실패
const stub = v => { const o = G.Mission.roll, d = G.Dnd.d20; G.Mission.roll = (f, rt, sk, x, who, dc) => ({ who, nat: v ? 20 : 1, mod: 0, dc, ok: v }); G.Dnd.d20 = () => (v ? 1 : 20); return () => { G.Mission.roll = o; G.Dnd.d20 = d; }; };
// 사건 하나를 돌린다. label로 고르고, 보인 선택지 이름들을 돌려준다
function step(S, id, label, win) {
  const { f, rt } = S, e = E.BY[id], r = rt.map.rooms[1]; r.ri = 1; G.quiet = false; f.askMeet = true; const un = stub(win); let seen = null, said = [];
  const say0 = G.Banter.say; G.Banter.say = (r0, p, s) => { said.push([p.merc.name, s]); };
  ST.play(f, rt, null, r, 'event', e); let n = 0;
  try { while (rt.scene && n++ < 400) { if (rt.ask) { seen = rt.ask.opts.map(o => o.label); const j = rt.ask.opts.findIndex(o => o.label === label); ST.answer(rt, j < 0 ? rt.ask.def : j); } ST.tick(f, rt, 0.5); } } finally { un(); G.quiet = true; G.Banter.say = say0; }
  return { seen: seen || [], said };
}
const st = f => E.chainOf(f, 'gob');
const goblinTalker = [['cleric', null, ['goblin', 'elvish']], ['dragoon'], ['rogue']];
const plain = [['cleric'], ['barbarian'], ['dragoon']];
const sleeper = [['archmage', 'sr_sleep'], ['dragoon'], ['cleric']];

// 지역에서만
{ const S = setup(plain, { front: 'raider' }); t('다른 지역엔 안 나온다', !E.candidates(S.f, { tags: ['cave'] }, { hurt: 0 }).some(q => q.e.id === 'gob_snare'));
  const T = setup(plain); t('고블린 지역엔 나온다', E.candidates(T.f, { tags: ['cave'] }, { hurt: 0 }).some(q => q.e.id === 'gob_snare')); }

// 파티 구성이 길을 정한다
{ const A = setup(goblinTalker), a = step(A, 'gob_snare', '고블린어로 말을 건다', true); t('고블린어를 하는 사람이 있으면 말을 건다', a.seen.includes('고블린어로 말을 건다'), a.seen);
  t('말이 통하면 이름과 뒷길을 안다', st(A.f).flags.talk && st(A.f).flags.freed); t('누가 풀어 줬는지 남는다', st(A.f).who.saver === A.f.mercs[1].uid);
  const B = setup(plain), b = step(B, 'gob_snare', '끝낸다', true); t('고블린어가 없으면 그 길이 없다', !b.seen.includes('고블린어로 말을 건다'), b.seen); t('죽이면 남는다', st(B.f).flags.killed && st(B.f).who.killer != null);
  // 초소: 뒷길은 이름을 들은 파티만 · 잠재우기는 그 주문이 있어야
  A.f.floor++; const p1 = step(A, 'gob_post', '스닉의 뒷길로 간다', true); t('뒷길이 열린다', p1.seen.includes('스닉의 뒷길로 간다'), p1.seen); t('조용히 지났다', st(A.f).flags.quiet);
  t('풀어 준 사람이 그 일을 말한다', p1.said.some(([n, s]) => n === A.f.mercs[1].name && s.includes('살려')), JSON.stringify(p1.said));
  B.f.floor++; const p2 = step(B, 'gob_post', '먼저 친다', true); t('죽였으면 뒷길이 없다', !p2.seen.includes('스닉의 뒷길로 간다')); t('잠재우기 주문이 없으면 그 길도 없다', !p2.seen.includes('잠재운다'), p2.seen);
  const C = setup(sleeper); C.f.ev.chains.gob = { stage: 1, st: 'on', fl: 2, run: 1, flags: { scared: 1 }, who: {} }; const sl0 = G.Res.left(C.f.mercs[1], G.Skill.SK.sr_sleep.res, 'sr_sleep'); const p3 = step(C, 'gob_post', '잠재운다', true);
  t('잠재우기를 가진 위저드', p3.seen.includes('잠재운다'), p3.seen); t('적이 내성에 실패하면 조용', st(C.f).flags.quiet); t('주문 슬롯을 쓴다', G.Res.left(C.f.mercs[1], G.Skill.SK.sr_sleep.res, 'sr_sleep') === sl0 - 1, `${sl0} → ${G.Res.left(C.f.mercs[1], G.Skill.SK.sr_sleep.res, 'sr_sleep')}`);
  const D = setup(sleeper); D.f.ev.chains.gob = { stage: 1, st: 'on', fl: 2, run: 1, flags: {}, who: {} }; step(D, 'gob_post', '잠재운다', false); t('하나라도 버티면 징', st(D.f).flags.alarm && D.rt.mons.length > 0);
  // 일행 판정: 절반 이상
  const H = setup(plain); H.f.ev.chains.gob = { stage: 1, st: 'on', fl: 2, run: 1, flags: {}, who: {} }; step(H, 'gob_post', '몰래 지나간다', true); t('일행 판정 성공', st(H.f).flags.quiet && H.rt.roll?.who === '일행', JSON.stringify(H.rt.roll));
  // 우리: 징이 울렸으면 더 어렵다
  A.f.floor++; const c1 = step(A, 'gob_cage', '자물쇠를 딴다', true); t('로그가 자물쇠를 딴다', c1.seen.includes('자물쇠를 딴다') && st(A.f).flags.rescued && st(A.f).who.res != null, c1.seen);
  t('징이 울리면 DC 20', E.dcOf({ ...H.f }, E.BY.gob_cage, E.BY.gob_cage.choices[0].check) === 15 && (() => { st(H.f).flags.alarm = 1; return E.dcOf(H.f, E.BY.gob_cage, E.BY.gob_cage.choices[0].check) === 20; })());
  B.f.floor++; step(B, 'gob_cage', '두고 간다', true); t('두고 가면 남는다', st(B.f).flags.left);

  // 다음 원정: 같은 원정에서는 두목이 안 나온다
  A.f.floor++; t('두목은 다음 원정', !E.candidates(A.f, { tags: ['cave'] }, { hurt: 0 }).some(q => q.e.id === 'gob_chief'));
  t('출발 화면: 고블린 지역을 늘 보인다', E.dueFront(A.f) === 'green' && E.hookOf(A.f, 'green') === '그롤의 굴'); { const ks = []; for (let i = 0; i < 20; i++) ks.push(G.Foe.offer(3)); }
  A.f.runs++; A.f.front = 'raider'; t('다른 지역으로 가면 기다린다', !E.candidates(A.f, { tags: ['cave'] }, { hurt: 0 }).some(q => q.e.id === 'gob_chief')); A.f.front = 'green';
  t('고블린 지역이면 이어진다', E.candidates(A.f, { tags: ['cave'] }, { hurt: 0 }).some(q => q.e.id === 'gob_chief'));
  const k1 = step(A, 'gob_chief', '스닉에게 맡긴다', true); t('풀어 줬으면 스닉에게 맡길 수 있다', k1.seen.includes('스닉에게 맡긴다'), k1.seen);
  t('스닉이 호위를 빼돌린다: 그롤 혼자', A.rt.mons.filter(o => !o.dead).length === 1 && A.rt.mons[0].n === '그롤', A.rt.mons.map(o => o.n).join());
  t('풀어 준 사람과 구한 사람이 먼저 말한다', k1.said.some(([n]) => n === A.f.mercs[1].name) && k1.said.some(([, s]) => s.includes('마렌')), JSON.stringify(k1.said));
  // 그롤을 쓰러뜨리면 다음 원정에 스닉이 두목
  E.chainWon(A.f, A.rt, A.rt.mons[0]); t('이기면 뒷이야기가 다음 원정에', st(A.f).stage === 4 && st(A.f).st !== 'done' && st(A.f).flags.won);
  A.f.floor++; t('같은 원정엔 뒷이야기 없음', !E.candidates(A.f, { tags: ['cave'] }, { hurt: 0 }).some(q => q.e.id === 'gob_after'));
  A.f.runs++; const g0 = A.f.trinkets?.length; const af = step(A, 'gob_after', '', true); t('스닉과 마렌이 둘 다 찾아온다', af.said.some(([, s]) => s.includes('출세')) && af.said.some(([, s]) => s.includes('장사')), JSON.stringify(af.said)); t('끝', st(A.f).st === 'done');

  // 죽인 쪽: 그롤이 굴 전체를 끌고 나오고, 죽인 사람이 그 일을 말한다
  B.f.runs++; B.f.floor++; const k2 = step(B, 'gob_chief', '맞선다', true); t('죽였으면 스닉에게 맡길 수 없다', !k2.seen.includes('스닉에게 맡긴다'), k2.seen); t('굴 전체가 덤빈다', B.rt.mons.length >= 5, B.rt.mons.length);
  t('죽인 사람이 그 일을 꺼낸다', k2.said.some(([n, s]) => n === B.rt.party.find(p => p.merc.uid === st(B.f).who.killer)?.merc.name && s.includes('조카')), JSON.stringify(k2.said));
  t('협상이 거의 안 된다', E.dcOf(B.f, E.BY.gob_chief, E.BY.gob_chief.choices[1].check) === 25);
  // 협상하면 통행료
  const N = setup(goblinTalker); N.f.ev.chains.gob = { stage: 3, st: 'on', fl: 4, run: 0, flags: { freed: 1 }, who: {} }; step(N, 'gob_chief', '협상한다', true); t('협상: 통행료로 다음 원정', st(N.f).flags.pact && st(N.f).stage === 4, JSON.stringify(st(N.f)));
  N.f.runs = 2; const g1 = N.f.carry = 1000; step(N, 'gob_after', '', true); t('통행료를 낸다', N.f.carry < g1, N.f.carry);
}
// 사건 자리는 지역마다: 다른 지역에서 쓴 층 번호라도 고블린 지역에선 스닉이 나온다
{ const S = setup(plain), f = S.f; f.ev.fl[f.floor] = { room: -1, id: null, front: 'raider', done: true }; delete f.ev.chains.gob; f.town = true; f.runs = 2; const rt = F.rt(f); G.Exp.depart(f, rt); rt.flow = null; for (let i = 0; i < 400 && !rt.flow; i++) G.tick(1, 0.25);
  const s = f.ev.fl[f.floor]; t('지역이 바뀌면 자리를 다시 정한다', s.front === 'green' && s.room >= 0, JSON.stringify(s)); t('스닉이 그 자리에', E.candidates(f, rt.map.rooms[s.room], { hurt: 0, party: rt.party }).sort((a, b) => b.w - a.w)[0]?.e.id === 'gob_snare'); }
// 원정 중 합류: 직접 편성이어도 칸이 남으면 함께 간다
{ const S = setup(plain.slice(0, 2)), f = S.f; f.autoParty = false; const m = GD.make(f, 'rogue', { lv: 6 }); F.join(f, m); t('합류하면 진형에 생긴다', F.formation(f)[m.uid] != null && S.rt.allies.some(a => a.merc === m)); const q = GD.make(f, 'bard', { lv: 6 }); F.join(f, q); t('칸이 차면 용병단에만', !F.lineup(f).includes(q.uid) && f.mercs.includes(q)); }
// 언어: SRD처럼 공용어 + 둘, 저장된다
{ G.newState(); const f = G.S.w.fantasy, m = GD.make(f, 'rogue', { lv: 3 }); const L = G.SrdX.langs(m); t('공용어 + 둘 + 도둑 은어', L[0] === 'common' && L.length === 4 && L.includes('cant'), L); t('다시 물어도 같다', JSON.stringify(G.SrdX.langs(m)) === JSON.stringify(L));
  let gob = 0; for (let i = 0; i < 400; i++) { const q = GD.make(f, 'cleric', { lv: 1 }); if (G.SrdX.langs(q).includes('goblin')) gob++; } t('고블린어는 드물다 (1d12의 9)', gob > 30 && gob < 110, gob); }
console.log(`gob_rules: 통과 ${ok} · 실패 ${bad}`); if (bad) process.exitCode = 1;
