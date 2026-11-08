'use strict';
// 위험도 · 승산 판단 · 위기 대사: node test/danger_rules.js
const fs = require('fs'), vm = require('vm'), path = require('path'); const ROOT = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(ROOT + '/test/party_lab.js', 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(`${ROOT}/js/${n}.js`, 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, F = G.Fantasy, R = G.Region, FO = G.Foe, B = G.Banter, ST = G.Story; G.quiet = true;
let ok = 0, bad = 0; const t = (n, c, x = '') => { if (c) ok++; else { bad++; console.log('  실패:', n, x); } };
const boot = (lv = 3) => { G.newState(); const f = G.S.w.fantasy, L = G.Guild.leader(f); f.leaderNew = false; f.autoTr = f.autoParty = f.autoGo = false; f.askMeet = false; L.lv = lv; const m = G.Guild.make(f, 'cleric', { lv }); f.mercs.push(m); f.lineup = [m.uid]; F.syncAllies(f); f.floor = f.maxFloor = f.checkpoint = f.start = 3; f.town = true; f.townT = 99; const rt = F.rt(f); G.Exp.depart(f, rt); rt.mons = []; return { f, rt }; };
const CR = (c, x = {}) => ({ stat: { cr: c, imm: [], res: [], vul: [], ...x }, hp: 10, max: 10, aggro: true });

// ── 위험도: SRD 조우 예산과 그대로 맞물린다 (Lv 3 · 2명: 낮음 300 · 보통 450 · 높음 800) ──
{ const { f } = boot(3), P = R.party(f), b = R.BUDGET[P.lv - 1].map(x => x * P.n);
  t('예산 표: Lv 3 · 2명', b[0] === 300 && b[1] === 450 && b[2] === 800, b);
  const tier = l => R.danger(f, l).tier;
  t('적 없음 = 표시 없음', tier([]) === 0);
  t('경계값 낮음: 300 XP (CR 1/2 × 3)', tier([CR(0.5), CR(0.5), CR(0.5)]) === 1);
  t('낮음을 넘으면 보통: 350 XP', tier([CR(0.5), CR(0.5), CR(0.5), CR(0.25)]) === 2);
  t('경계값 보통: 450 XP (CR 2)', tier([CR(2)]) === 2);
  t('보통을 넘으면 높음: 700 XP (CR 3)', tier([CR(3)]) === 3);
  t('경계값 높음: 800 XP (CR 1 × 4)', tier([CR(1), CR(1), CR(1), CR(1)]) === 3);
  t('높음을 넘으면 초과: 900 XP', tier([CR(2), CR(2)]) === 4);
  t('수치가 없는 적은 세지 않는다', R.danger(f, [{ hp: 1 }]).tier === 0);
  const d = R.danger(f, [CR(2)]); t('값을 함께 준다', d.xp === 450 && d.cap === 450 && d.n === '보통', JSON.stringify(d)); }
// 레벨이 오르면 같은 적의 위험도가 내려간다
{ const a = boot(1), lo = R.danger(a.f, [CR(2)]).tier, b = boot(6), hi = R.danger(b.f, [CR(2)]).tier; t('같은 적도 레벨이 높으면 덜 위험하다', lo > hi, [lo, hi]); }
// 전투 중: 적이 줄어도 표시가 내려가지 않고, 지원군이 오면 오른다
{ const { f, rt } = boot(3), a = CR(2), b = CR(2); rt.mons = [a]; rt.turn = { round: 1 };
  t('전투 시작', R.dangerNow(f, rt).tier === 2); rt.mons = [a, b]; t('지원군이 오면 오른다', R.dangerNow(f, rt).tier === 4); rt.mons = [b]; t('죽어도 내려가지 않는다', R.dangerNow(f, rt).tier === 4); b.aggro = false; t('싸우는 적만 센다', R.dangerNow(f, rt).tier === 4); }
// 탐험 중: 시야 안의 적만 (가려진 적을 미리 알려 주지 않는다)
{ const { f, rt } = boot(3), far = { ...CR(2), x: 1, y: 1 }, near = { ...CR(2), x: 2, y: 2 }, V = F.inView; rt.turn = null; rt.mons = [far, near]; F.inView = (r, x) => x === 2; t('시야 안만 센다', R.dangerNow(f, rt).tier === 2); F.inView = () => false; t('안 보이면 표시 없음', R.dangerNow(f, rt).tier === 0); F.inView = V; const dead = { ...near, hp: 0 }; rt.mons = [dead]; t('죽은 적은 세지 않는다', R.dangerNow(f, rt).tier === 0); }

// ── 승산 판단 ──
const mon = (rt, hp = 100) => { const o = { hp, max: hp, aggro: true, x: 0, y: 0, n: '좀비' }; rt.mons = [o]; return o; };
const setHP = (rt, k) => rt.party.forEach(p => { p.dead = false; p.dying = null; p.hp = Math.round(p.max * k); });
{ const { f, rt } = boot(3); mon(rt); setHP(rt, 0.9); const p0 = rt.party.reduce((a, p) => a + p.hp, 0);
  t('멀쩡하면 몇 번 빗나가도 지지 않는다', !FO.assess(f, rt, { round: 3, hist: [[p0 + 5, 100], [p0 + 2, 100]] }));
  setHP(rt, 0.4); const p1 = rt.party.reduce((a, p) => a + p.hp, 0);
  t('절반 아래에서 못 깎으면 진다', FO.assess(f, rt, { round: 3, hist: [[p1 + 6, 100], [p1 + 3, 100]] }));
  t('절반 아래라도 먼저 쓰러뜨릴 것 같으면 아니다', (() => { const o = mon(rt, 5); return !FO.assess(f, rt, { round: 3, hist: [[p1 + 2, 50], [p1 + 1, 25]] }); })());
  mon(rt); setHP(rt, 0.9); rt.party[1].dead = true; rt.party[1].dying = { ok: 0, no: 0 }; const p2 = rt.party.reduce((a, p) => a + (p.dead ? 0 : p.hp), 0);
  t('누가 쓰러지면 체력이 많아도 위기다', FO.assess(f, rt, { round: 3, hist: [[p2 + 12, 100], [p2 + 6, 100]] }));
  setHP(rt, 0.9); const p3 = rt.party.reduce((a, p) => a + p.hp, 0);
  t('3라운드 전에는 판단하지 않는다', !FO.assess(f, rt, { round: 2, hist: [[p3 + 9, 100], [p3 + 3, 100]] }));
  t('서로 못 깎는 전투는 체력과 상관없다', FO.assess(f, rt, { round: 8, hist: [[p3, 100], [p3, 100], [p3, 100]] })); }

// ── 대사 ──
const src = fs.readFileSync(ROOT + '/js/lines_danger.js', 'utf8');
{ const lines = eval('(' + /addLines\((\{[\s\S]*\})\);/.exec(src)[1] + ')');
  for (const k of ['lose', 'loseUseless']) { t(`${k} 있다`, lines[k] && lines[k].any && lines[k].any.length >= 4, k); }
  for (const tag of ['coward', 'hot', 'careful', 'greedy', 'brawler', 'meek']) t(`lose: 성격 ${tag}`, lines.lose?.[tag]?.length >= 2, tag);
  const WORDS = /명중|판정|슬롯|레벨|체력|d20|승산/;
  for (const k in lines) for (const tag in lines[k]) for (const s of lines[k][tag]) { t(`길이: ${s}`, s.length <= 35); t(`규칙 용어 없음: ${s}`, !WORDS.test(s)); } }
for (const file of ['index.html', 'test/party_lab.js', 'test/sim.js', 'test/foe_rules.js', 'test/skill_lab.js']) t(`목록에 있다: ${file}`, fs.readFileSync(`${ROOT}/${file}`, 'utf8').includes('lines_danger'));
// 위기: 질문과 함께 누군가 말한다. 공격이 안 들면 그 말을 한다
{ const { f, rt } = boot(3); mon(rt); G.quiet = false; f.askMeet = true; const said = [], L0 = B.line, U0 = FO.useless; B.line = (r, k, w, v) => { said.push([k, v]); return null; };
  ST.askRetreat(f, rt); t('말한다', said[0]?.[0] === 'lose', JSON.stringify(said)); t('제목은 짧은 이름', rt.ask?.title === '위기', rt.ask?.title); t('선택지는 그대로', rt.ask?.opts.length === 2);
  rt.ask = null; said.length = 0; FO.useless = () => true; ST.askRetreat(f, rt); t('공격이 안 들면 그 말', said[0]?.[0] === 'loseUseless' && said[0][1].m === '좀비', JSON.stringify(said));
  rt.ask = { title: 'x', opts: [] }; said.length = 0; ST.askRetreat(f, rt); t('다른 질문 중이면 말하지 않는다', !said.length); B.line = L0; FO.useless = U0; G.quiet = true; }
// 튜토리얼: 혼자 오우거와 싸우다 밀리면 한마디 한다. 대사만이고 물러나는 건 일반 규칙대로 (DESIGN.md 155)
{ G.newState(); const f = G.S.w.fantasy; G.Guild.leader(f); f.leaderNew = false; f.autoTr = f.autoParty = f.autoGo = false; f.mercs = []; const rt = F.rt(f); G.Tut.start(f, rt); f.floor = 2; rt.wallMap = rt.map;
  const o = { tutWall: true, hp: 50, max: 50, aggro: true, x: 0, y: 0 }; rt.mons = [o]; rt.turn = { round: 2, order: [] }; const p = rt.party[0];
  const said = [], back = []; const S0 = B.say, R0 = ST.retreat; B.say = (r, w, s) => { said.push(s); return true; }; ST.retreat = () => back.push(1);
  p.hp = p.max; G.Tut.tick(f, rt, 0.1); t('벽: 멀쩡하면 말하지 않는다', !said.length); p.hp = 1; G.Tut.tick(f, rt, 0.1); t('벽: 밀리면 말한다', said.some(s => s.includes('혼자선')), JSON.stringify(said));
  for (let i = 0; i < 40; i++) G.Tut.tick(f, rt, 0.1); t('벽: 대본으로 물러나지 않는다', !back.length, back.length); t('벽: 한 번만 말한다', said.filter(s => s.includes('혼자선')).length === 1); B.say = S0; ST.retreat = R0; }

// 면역인 적에게 피해 주문을 쓰지 않는다: 혼자면 전투가 끝나지 않는다 (독 분사 × 좀비)
{ const { f, rt } = boot(1), a = rt.party.find(p => p.merc), zb = { n: '좀비', stat: G.SRD_MON[G.D.F.STAT['좀비'][0]], hp: 15, max: 15, x: a.x + 1, y: a.y, aggro: true }, gb = { n: '고블린 졸개', stat: G.SRD_MON[G.D.F.STAT['고블린 졸개'][0]], hp: 7, max: 7, x: a.x + 1, y: a.y, aggro: true }, sc = l => { rt.mons = l; return G.SkillAI.score('sp_poison_spray', a, { f, rt, c: a, seen: l }, 1); };
  a.merc.cls = 'mage'; t('면역: 좀비에게 독 분사 안 쓴다', sc([zb]) < 0, sc([zb])); t('면역: 고블린에겐 쓴다', sc([gb]) > 0, sc([gb])); t('면역: 듣는 적이 섞이면 쓴다', sc([zb, gb]) > 0, sc([zb, gb])); rt.mons = []; }
// 꼭 들어야 하는 말은 덮이지 않는다
{ const { rt } = boot(3); G.quiet = false; const a = rt.party[0], T0 = G.S.runTime, last = () => rt.bubbles.find(b => b.e === a)?.s; B.say(rt, a, '첫째', { pri: true, hold: true }); B.say(rt, a, '둘째', { pri: true }); t('유지: 덮이지 않는다', last() === '첫째', last()); t('유지: 기록에도 끼어들지 않는다', !rt.chat.some(c => c.s === '둘째')); G.S.runTime += 60; t('유지: 전투 시계가 뛰어도 남아 있다', B.live(rt)?.some(b => b.s === '첫째')); G.S.runTime = T0; rt.bubbles.find(b => b.e === a).hold = 0; B.say(rt, a, '셋째', { pri: true }); t('유지가 끝나면 덮인다', last() === '셋째', last()); G.quiet = true; }

// 상성: 살아 있는 전원의 공격이 안 들으면 예산과 상관없이 맨 위 단계 (도감으로 아는 면역만)
{ const { f, rt } = boot(3), kn = G.Lore.knows, wt = G.Dnd.weapon, imm = CR(0.25, { imm: ['slashing'] }); rt.turn = null; rt.mons = [imm]; const V = F.inView; F.inView = () => true;
  G.Lore.knows = () => true; G.Dnd.weapon = () => ({ t: 'slashing' });
  const d = R.dangerNow(f, rt); t('전원 안 통하면 맨 위', d.tier === 4 && d.n === '공격 안 통함', JSON.stringify(d));
  t('XP는 그대로 보여 준다', d.xp === 50, d.xp);
  G.Dnd.weapon = p => ({ t: p === rt.party[0] ? 'slashing' : 'radiant' }); t('한 명이라도 통하면 예산대로', R.dangerNow(f, rt).tier === 1);
  G.Dnd.weapon = p => ({ t: p === rt.party[0] ? 'radiant' : 'slashing' }); rt.party[0].dead = true; t('쓰러진 사람은 세지 않는다', R.dangerNow(f, rt).tier === 4); rt.party[0].dead = false;
  G.Dnd.weapon = () => ({ t: 'slashing' }); G.Lore.knows = () => false; t('모르는 면역은 알려 주지 않는다', R.dangerNow(f, rt).tier === 1);
  G.Lore.knows = () => true; rt.turn = { round: 1 }; G.Dnd.weapon = () => ({ t: 'radiant' }); t('전투 시작은 예산대로', R.dangerNow(f, rt).tier === 1); G.Dnd.weapon = () => ({ t: 'slashing' }); t('전원 막히면 전투 중에도 오른다', R.dangerNow(f, rt).tier === 4);
  G.Lore.knows = kn; G.Dnd.weapon = wt; F.inView = V; }
console.log(`danger_rules: 통과 ${ok} · 실패 ${bad}`);
if (bad) process.exitCode = 1;
