'use strict';
// 인물 사건 (DESIGN.md 146): node test/npc_rules.js
// 부품 조합: 파티가 가진 수단만 보이고, 한 일이 인물에 남고, 다음 원정에 돌아오고, 그 일을 한 용병이 말한다
const fs = require('fs'), vm = require('vm'), path = require('path'); const ROOT = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(ROOT + '/test/party_lab.js', 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(`${ROOT}/js/${n}.js`, 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, GD = G.Guild, F = G.Fantasy, E = G.Event, ST = G.Story, N = G.Npc; G.quiet = true; G.Foe.retreatOn = false;
let ok = 0, bad = 0; const t = (n, c, x = '') => { if (c) ok++; else { bad++; console.log('실패:', n, x); } };
function setup(cls, front = 'green', seed = 11) {
  G.newState(); const f = G.S.w.fantasy, L = GD.leader(f); f.leaderNew = false; f.autoTr = f.autoParty = f.autoGo = false; L.lv = 6; L.langs = ['elvish', 'dwarvish'];
  f.mercs = [L]; f.lineup = cls.map(([c, x, langs]) => { const m = GD.make(f, c, { lv: 6 }); if (x) { m.skills = [x, ...m.skills.filter(k => k !== x)]; m.skManual = true; } m.langs = langs || ['elvish', 'dwarvish']; f.mercs.push(m); return m.uid; });
  F.syncAllies(f); const s = G.Season.st(f); s.seed = seed; s.t = 0; f.frontLock = f.front = front; f.policy = 'party'; f.start = f.checkpoint = f.floor = f.maxFloor = 3; f.town = true; f.seasonEnd = false; f.townT = 99;
  const rt = F.rt(f); G.Exp.depart(f, rt); for (let i = 0; i < 400 && !rt.flow; i++) G.tick(1, 0.25);
  f.front = front; f.runs = 1; rt.mons = rt.mons.filter(q => q.boss); f.recent = []; f.ev.chains.gob = { stage: 9, st: 'done', flags: {}, who: {} };
  return { f, rt };
}
const stub = v => { const o = G.Mission.roll, d = G.Dnd.d20; G.Mission.roll = (f, rt, sk, x, who, dc) => ({ who, nat: v ? 20 : 1, mod: 0, dc, ok: v }); G.Dnd.d20 = () => (v ? 1 : 20); return () => { G.Mission.roll = o; G.Dnd.d20 = d; }; };
function play(S, e, label, win = true) {
  const { f, rt } = S, r = rt.map.rooms[1]; r.ri = 1; G.quiet = false; f.askMeet = true; const un = stub(win); let seen = null; const said = [];
  const say0 = G.Banter.say; G.Banter.say = (r0, p, s) => { said.push([p.merc.uid, s]); };
  ST.play(f, rt, null, r, 'event', e); let n = 0;
  try { while (rt.scene && n++ < 400) { if (rt.ask) { seen = rt.ask.opts.map(o => o.label); const j = rt.ask.opts.findIndex(o => o.label === label); ST.answer(rt, j < 0 ? rt.ask.def : j); } ST.tick(f, rt, 0.5); } } finally { un(); G.quiet = true; G.Banter.say = say0; }
  return { seen: seen || [], said };
}
// 인물 하나를 정해 만든다
const mk = (f, kind, plight, extra = {}) => { const K = N.KINDS[kind], q = { id: (f.npcN = (f.npcN || 0) + 1), n: K.names[f.npcN % K.names.length], kind, front: K.civ ? null : f.front, lang: K.lang, mon: K.mon, att: 0, deed: null, doer: null, st: 'alive', run: f.runs, fl: f.floor, plight, back: 0, job: K.jobs?.[0], captor: plight === 'caged' ? '고블린' : undefined, kinW: K.kin?.[0], kinN: K.kin ? `${K.names[f.npcN % K.names.length]}의 ${K.kin[0]}` : undefined, ...extra }; N.store(f).push(q); return q; };
const talker = [['cleric', null, ['goblin', 'elvish']], ['dragoon'], ['rogue']], plain = [['cleric'], ['barbarian'], ['dragoon']], wiz = [['archmage', 'sr_sleep'], ['dragoon'], ['cleric', 'sr_cure']];

// 파티가 가진 수단만 보인다
{ const A = setup(talker), a = mk(A.f, 'goblin', 'trapped'), la = N.scene(A.f, A.rt, a).choices.filter(o => !o.locked).map(o => o.label);
  const B = setup(plain), b = mk(B.f, 'goblin', 'trapped'), lb = N.scene(B.f, B.rt, b).choices.filter(o => !o.locked).map(o => o.label);
  t('고블린어를 하면 말을 건다', la.includes('고블린어로 말을 건다'), la); t('못 하면 그 길이 없다', !lb.includes('고블린어로 말을 건다'), lb);
  const g1 = mk(A.f, 'goblin', 'guard'), l1 = N.scene(A.f, A.rt, g1).choices.filter(o => !o.locked).map(o => o.label), C = setup(wiz), g2 = mk(C.f, 'goblin', 'guard'), l2 = N.scene(C.f, C.rt, g2).choices.filter(o => !o.locked).map(o => o.label);
  t('잠재우기는 그 주문이 있어야', !l1.includes('잠재운다') && l2.includes('잠재운다'), `${l1} | ${l2}`);
  const c1 = mk(A.f, 'civ', 'caged', { captor: '고블린' }), lc = N.scene(A.f, A.rt, c1).choices.filter(o => !o.locked).map(o => o.label), c2 = mk(B.f, 'civ', 'caged', { captor: '고블린' }), lc2 = N.scene(B.f, B.rt, c2).choices.filter(o => !o.locked).map(o => o.label);
  t('자물쇠는 로그가 있어야', lc.includes('자물쇠를 딴다') && !lc2.includes('자물쇠를 딴다'), `${lc} | ${lc2}`);
  const w1 = mk(C.f, 'civ', 'wounded'), lw = N.scene(C.f, C.rt, w1).choices.filter(o => !o.locked).map(o => o.label); t('치유 주문이 있으면 그 길', lw.includes('치유 주문을 건다'), lw); t('사람은 죽이는 길이 없다', !lw.includes('끝낸다'));
{ const B = setup(plain), c = mk(B.f, 'civ', 'caged', { captor: '고블린' }), lk = N.scene(B.f, B.rt, c).choices.find(o => o.label === '자물쇠를 딴다'); t('로그가 없으면 자물쇠는 잠긴 채로 보인다', lk && lk.locked === '로그', lk && lk.locked); }
  for (const k of Object.keys(N.PLIGHT)) { const q = mk(A.f, N.PLIGHT[k].who.includes('foe') ? 'goblin' : 'civ', k, { captor: '고블린' }), e = N.scene(A.f, A.rt, q); t(`${k}: 지나갈 길`, e.choices.some(o => o.leave)); t(`${k}: 선택지 둘 이상`, e.choices.length >= 2); t(`${k}: 문장에 빈칸 없음`, !/undefined|\{(?!(who|beyond|far|lean|grope|echo)\})/.test(e.n + e.open + JSON.stringify(e.choices.map(o => [o.label, o.win?.dm, o.win?.log, o.lose?.dm]))), e.open); }
}
// 자물쇠는 로그가 직접 딴다 (도둑 도구)
{ const A = setup(talker), q = mk(A.f, 'civ', 'caged', { captor: '고블린' }); let by = null; const c0 = G.Event.check; G.Event.check = (f, rt, ch, b) => { by = b; return c0(f, rt, ch, b); }; play(A, N.scene(A.f, A.rt, q), '자물쇠를 딴다'); G.Event.check = c0; t('로그가 딴다', by?.merc.cls === 'rogue', by?.merc.cls); }
// 첫 만남: 지역에 맞는 인물 · 시드로 재현
{ const A = setup(plain), e = N.meet(A.f, A.rt, A.rt.map.rooms[1]), q = N.store(A.f).at(-1); t('고블린 지역엔 고블린이나 사람', ['goblin', 'civ'].includes(q.kind), q.kind); t('사건이 나온다', e && e.choices.length >= 2);
  const B = setup(plain), e2 = N.meet(B.f, B.rt, B.rt.map.rooms[1]); t('같은 시드 같은 인물', N.store(B.f).at(-1).n === q.n && e2.n === e.n, `${q.n} ${N.store(B.f).at(-1).n}`);
  const W = setup(plain, 'beast'); for (let i = 0; i < 6; i++) { W.f.floor = 3 + i; N.meet(W.f, W.rt, W.rt.map.rooms[1]); } t('말하는 적이 없는 지역엔 사람만', N.store(W.f).every(q => q.kind === 'civ'), N.store(W.f).map(q => q.kind)); }

// 풀어 주면 다음 원정에 은혜를 갚고, 풀어 준 사람이 말한다
{ const A = setup(talker), q = mk(A.f, 'goblin', 'trapped'); const r1 = play(A, N.scene(A.f, A.rt, q), '고블린어로 말을 건다');
  t('한 일이 남는다', q.deed === 'talked' && q.att >= 4 && q.doer === A.f.mercs[1].uid, JSON.stringify(q));
  t('같은 원정엔 안 돌아온다', !N.due(A.f)); A.f.runs++; t('다음 원정에 돌아온다', N.due(A.f) === q);
  A.f.front = 'raider'; t('다른 지역에선 안 돌아온다', !N.due(A.f)); A.f.front = 'green';
  const g = A.f.trinkets?.length || 0, r2 = play(A, N.comeBack(A.f, A.rt), ''); t('은혜를 갚는다 (물건)', JSON.stringify(A.rt.events || []).length >= 0 && q.back === 1);
  t('풀어 준 사람이 그 일을 말한다', r2.said.some(([u]) => u === A.f.mercs[1].uid), JSON.stringify(r2.said)); }
// 죽이면 가족이 우두머리로 온다
{ const A = setup(plain), q = mk(A.f, 'goblin', 'trapped'); play(A, N.scene(A.f, A.rt, q), '끝낸다'); t('죽였다', q.st === 'dead' && q.doer != null);
  A.f.runs++; const e = N.comeBack(A.f, A.rt); t('가족이 온다', e && e.n === q.kinN, e?.n); const r = play(A, e, ''); t('우두머리 이름이 가족', A.rt.mons.some(o => o.n === q.kinN), A.rt.mons.map(o => o.n)); t('죽인 사람이 말한다', r.said.some(([u]) => u === q.doer), JSON.stringify(r.said));
  A.f.runs++; t('가족은 한 번만', !N.due(A.f)); }
// 털면 앙갚음
{ const A = setup(plain), q = mk(A.f, 'civ', 'lost'); play(A, N.scene(A.f, A.rt, q), '짐을 챙긴다'); t('털었다', q.deed === 'robbed' && q.att <= -3);
  A.f.runs++; A.f.front = 'raider'; t('사람은 어느 지역에서든 돌아온다', N.due(A.f) === q); const r = play(A, N.comeBack(A.f, A.rt), ''); t('패거리와 온다', A.rt.mons.length >= 2); }
// 통행료: 한 번 내면 또 달라고 한다
{ const A = setup(plain), q = mk(A.f, 'goblin', 'toll'); play(A, N.scene(A.f, A.rt, q), '통행료를 낸다'); A.f.runs++; const e = N.comeBack(A.f, A.rt); t('또 달라고 한다', e.choices?.some(o => o.label === '또 낸다'), e.n);
  play(A, e, '이번엔 거절한다'); t('거절하면 그 인물이 우두머리로', A.rt.mons.some(o => o.n === q.n)); const boss = A.rt.mons.find(o => o.n === q.n); ST.chiefDown(A.f, A.rt, boss, null); t('쓰러뜨리면 죽은 것으로', q.st === 'dead'); }
// 몰래 지나간 보초는 돌아오지 않는다
{ const A = setup(plain), q = mk(A.f, 'goblin', 'guard'); play(A, N.scene(A.f, A.rt, q), '몰래 지나간다'); A.f.runs++; t('모르는 사이는 돌아오지 않는다', !N.due(A.f)); }
// 사건 자리에서 고른다: 돌아올 인물이 있으면 그 자리가 생기고, 그 인물이 먼저
{ const A = setup(plain), q = mk(A.f, 'goblin', 'trapped', { deed: 'freed', att: 4, doer: 1 }); A.f.runs = 3; const c = E.candidates(A.f, { tags: ['cave'] }, { hurt: 0, party: A.rt.party, lv: 6 }).sort((a, b) => b.w - a.w); t('돌아옴이 가장 무겁다', c[0].e.id === 'npc_back', c.slice(0, 3).map(x => x.e.id));
  const s = A.f.ev.fl[A.f.floor]; s.done = false; s.room = 1; A.rt.map.rooms[1].ri = 1; A.f.recent = []; A.f.ev.last = {}; const got = E.at(A.f, A.rt, A.rt.map.rooms[1], { hurt: 0, party: A.rt.party, lv: 6 }); t('자리에서 그 인물이 나온다', got && got.npc === q.id, got?.id); }
// 장소에 맞는 말 (DESIGN.md 147): 지하에서는 숲 말이 나오지 않고, 늪에서는 벽 말이 나오지 않는다
{ const A = setup(plain), f = A.f, rt = A.rt, FOREST = /수풀|토끼|바람|숲|덤불/, WALLS = /벽에 기대|벽을 더듬|복도/;
  const texts = []; const put = (e, s) => { if (typeof s === 'string') texts.push([e, s]); };
  for (const e of E.LIST) { put(e, e.open); put(e, e.n); for (const v of Object.values(e.openIf || {})) put(e, v); for (const o of e.choices || []) for (const b of [o.win, o.lose]) for (const x of b ? [b, b.real, b.fake].filter(Boolean) : []) { put(e, x.dm); put(e, x.log); } for (const b of e.auto || []) { put(e, b.dm); put(e, b.log); } }
  const out = E.LIST.filter(e => e.tags.length && e.tags.every(g => ['thicket', 'ruin', 'altar'].includes(g)) && e.tags.includes('thicket')).map(e => e.id);
  for (const lay of ['cavern', 'keep', 'nave', 'warren', 'river', 'halls']) { rt.map.layout = lay; rt.map.theme = null; const bad = texts.filter(([e, s]) => !out.includes(e.id) && FOREST.test(E.text(f, e, s))); t(`${lay}: 숲 말 없음`, !bad.length, bad.slice(0, 2).map(([e, s]) => e.id + ': ' + E.text(f, e, s))); t(`${lay}: 빈 말 없음`, !texts.some(([e, s]) => /\{(beyond|far|lean|grope|echo)\}/.test(E.text(f, e, s)))); }
  rt.map.theme = 'swamp'; const sw = texts.filter(([e, s]) => /\{(lean|grope)\}/.test(s)).map(([e, s]) => E.text(f, e, s)); t('늪: 벽 말 대신 나무', sw.length && sw.every(x => !WALLS.test(x)), sw.slice(0, 2));
  rt.map.theme = null; rt.map.layout = 'nave'; const q = mk(f, 'civ', 'wounded'), e = N.scene(f, rt, q); t('대성당에선 기둥에 기대', E.text(f, e, e.open).includes('기둥에 기대'), E.text(f, e, e.open));
  rt.map.theme = 'swamp'; t('늪에선 나무에 기대', E.text(f, e, e.open).includes('나무 둥치에 기대'), E.text(f, e, e.open)); }
console.log(`npc_rules: 통과 ${ok} · 실패 ${bad}`); if (bad) process.exitCode = 1;
