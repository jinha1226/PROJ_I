'use strict';
// 쿼터뷰 전투 + 라운드 주사위 (화면 없이): node test/crawl_fight_rules.js
// 새 게임이 전투 방에서 하는 것과 같게 — 몬스터를 세우고(major · aggro · spotted) 옛 SRD 턴제 전투(G.Turn · G.Flow)를 G.tick으로 돌린다.
// 라운드마다 G.Dice로 주사위를 굴려 배분하고(바로 진행), 배분된 주사위가 아군 공격 d20에 쓰이는지 본다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const LOAD = require('./_load.js');
let ok = 0, bad = 0; const t = (name, v, extra = '') => { if (v) ok++; else { bad++; console.log('  실패:', name, extra); } };

function boot(seed) {
  const M = Object.create(Math); let s0 = seed * 7919 >>> 0;
  M.random = () => { s0 = (s0 + 0x6D2B79F5) >>> 0; let x = s0; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const ctx = { console, Math: M, JSON, Date, btoa, atob }; vm.createContext(ctx); LOAD.load(ctx);
  const G = ctx.G; G.quiet = true; G.newState();
  const f = G.S.w.fantasy, L = G.Guild.leader(f); f.leaderNew = false; f.autoTr = f.autoParty = false; f.askMeet = false; L.lv = 3;
  const ms = ['mage', 'cleric'].map(c => G.Guild.make(f, c, { lv: 3 })); f.mercs.push(...ms); f.lineup = ms.map(m => m.uid);
  f.floor = f.maxFloor = f.start = f.checkpoint = 1; f.town = true;
  const r = G.Fantasy.rt(f); G.Fantasy.syncAllies(f); f.town = false; r.phase = 'explore'; r.turn = null; r.mons = []; r.chests = []; r.fields = [];
  // 방 하나 (새 게임 시험 전투 방과 같은 모양)
  const W = 16, H = 14, c = new Array(W * H).fill('#'); for (let y = 2; y < 12; y++) for (let x = 2; x < 14; x++) c[y * W + x] = '.';
  const room = { id: 0, title: '전투 방', x: 2, y: 2, w: 12, h: 10, cx: 8, cy: 7, tags: ['hall'] };
  r.map = { w: W, h: H, c, kindAt: new Uint8Array(W * H), poi: {}, passChars: '.>,', ver: 1, dist: {}, rooms: [room], start: room, end: room, fixed: true };
  r.party.forEach((p, i) => { p.x = 4 + i * 0.6; p.y = 7 + (i % 2) * 0.4; });
  r.seen = new Uint8Array(W * H).fill(1); r.seenVer = (r.seenVer || 0) + 1;
  return { G, f, r };
}
function spawn(G, r, names) { names.forEach((n, i) => G.Fantasy.spawnMon(r, 1, { n, ...G.D.F.mon[n] }, 11, 4 + i * 2, false, { aggro: true, spotted: true, major: true })); G.Fantasy.refreshEnts(r); if (G.Sight?.update) G.Sight.update(r); }
function run(G, r, { dice = null, maxT = 400 } = {}) {
  let round = 0, cur = null, used = 0, rounds = 0;
  if (dice) { G.Dice.loadout = dice; G.Dice.party = () => r.party.filter(p => !p.dead && p.hp > 0); G.Dice.cur = () => r.turn?.cur || null; }
  const d20 = G.Dnd.d20; if (dice) G.Dnd.d20 = function (adv) { const S = G.Dice.st, before = S ? S.used.size : 0; const v = d20.call(this, adv); if (S && S.used.size > before) used++; return v; };
  for (let k = 0; k < maxT * 10; k++) {
    const T = r.turn;
    if (dice && T && T.round !== round) { round = T.round; rounds++; G.Dice.newRound(T.round); G.Dice.st.ready = true; }
    if (dice && T && T.cur !== cur) { if (cur) G.Dice.turnEnd(cur); cur = T.cur; }
    G.tick(0.1);
    const foes = r.mons.filter(m => m.hp > 0), ps = r.party.filter(p => !p.dead && p.hp > 0);
    if (!foes.length || !ps.length) return { win: !!ps.length && !foes.length, t: k / 10, rounds: r.turn?.round || round, used, maxRound: round };
  }
  return { win: false, t: maxT, rounds: r.turn?.round || 0, used, timeout: true };
}

// 1) 몬스터를 세우면 전투가 시작되고 끝난다 (주사위 없이)
for (const seed of [1, 2, 3]) {
  const { G, r } = boot(seed); spawn(G, r, ['고블린 졸개', '고블린 졸개']);
  t(`씨앗 ${seed}: 세운 몬스터가 살아 있다`, r.mons.filter(m => m.hp > 0).length === 2);
  let started = false; for (let k = 0; k < 200 && !started; k++) { G.tick(0.1); started = !!r.turn; }
  t(`씨앗 ${seed}: 전투(차례)가 시작된다`, started, `mons=${r.mons.length}`);
  const res = run(G, r);
  t(`씨앗 ${seed}: 전투가 끝난다`, !res.timeout, JSON.stringify(res));
}
// 2) 라운드 주사위: 라운드마다 굴려 배분되고, 아군 공격 d20에 쓰인다
for (const seed of [4, 5]) {
  const { G, r } = boot(seed); spawn(G, r, ['고블린 졸개', '홉고블린 전사']);
  const res = run(G, r, { dice: ['steady'] });
  t(`씨앗 ${seed}: 주사위 전투가 끝난다`, !res.timeout, JSON.stringify(res));
  t(`씨앗 ${seed}: 라운드마다 주사위를 굴렸다`, res.maxRound >= 1);
  t(`씨앗 ${seed}: 배분된 주사위가 공격 굴림에 쓰였다`, res.used >= 1, JSON.stringify(res));
}
// 2-1) 앞줄 · 뒷줄 진형: 근접은 앞줄, 원거리 · 시전자는 뒷줄. 거리 = 내 줄 + 상대 줄 + 1, 앞줄이 비면 뒷줄이 앞줄. 전투가 끝난다
for (const seed of [6, 7]) {
  const { G, r } = boot(seed); spawn(G, r, ['고블린 졸개', '고블린 졸개', '홉고블린 전사']);
  const Ln = G.Line, room = r.map.rooms[0], avg = l => ({ x: l.reduce((a, e) => a + e.x, 0) / l.length, y: l.reduce((a, e) => a + e.y, 0) / l.length });
  const to = Ln.set(r, r.map, { x: room.cx, y: room.cy }, avg(r.party), avg(r.mons));
  for (const [e, q] of to) { e.x = q.x; e.y = q.y; } G.Tactics.snap(r);
  const fighter = r.party.find(p => p.merc?.cls === 'dragoon' || p === r.party[0]), casters = r.party.filter(p => p.def && p.def.range >= 2);
  t(`씨앗 ${seed}: 근접(파이터)은 앞줄, 시전자는 뒷줄`, Ln.rowOf(fighter) === 0 && casters.length > 0 && casters.every(p => Ln.rowOf(p) === 1), r.party.map(p => (p.merc?.cls || '?') + ':' + Ln.rowOf(p)).join());
  t(`씨앗 ${seed}: 아군은 아군 쪽, 적은 적 쪽`, r.party.every(p => Ln.sideOf(p) === 0) && r.mons.every(m => Ln.sideOf(m) === 1));
  const per = new Map(); for (const e of r.party.concat(r.mons)) { const k = Ln.sideOf(e) + ',' + Ln.rowOf(e); per.set(k, (per.get(k) || 0) + 1); }
  const spots = new Set(r.party.concat(r.mons).map(e => `${Ln.sideOf(e)},${Ln.rowOf(e)},${Ln.laneOf(e)}`));
  t(`씨앗 ${seed}: 자리가 겹치지 않는다`, spots.size === r.party.length + r.mons.length, [...spots].join(' '));
  const fF = r.mons.find(m => Ln.rowOf(m) === 0);
  t(`씨앗 ${seed}: 앞-앞 1칸(근접) · 뒤-앞 2칸`, Ln.dist(fighter, fF) === 1 && Ln.dist(casters[0], fF) === 2, [Ln.dist(fighter, fF), Ln.dist(casters[0], fF)]);
  t(`씨앗 ${seed}: 같은 편 옆 사람은 1칸 (손이 닿는다)`, casters.length < 2 || Ln.dist(casters[0], casters[1]) === 1, casters.length > 1 ? Ln.dist(casters[0], casters[1]) : '');
  const res = run(G, r, { dice: ['twin'] });
  t(`씨앗 ${seed}: 진형 전투가 끝난다`, !res.timeout, JSON.stringify(res));
  t(`씨앗 ${seed}: 싸우는 동안 아무도 반대편으로 넘어가지 않는다`, r.party.filter(p => !p.dead).every(p => Ln.sideOf(p) === 0) && r.mons.filter(m => m.hp > 0).every(m => Ln.sideOf(m) === 1));
  Ln.off();
  t(`씨앗 ${seed}: 진형을 끄면 보통 거리`, Ln.dist({ x: 0, y: 0 }, { x: 3, y: 4 }) === 5);
}
// 2-2) 앞줄이 비면 뒷줄이 앞줄로 친다
{
  const { G, r } = boot(8); spawn(G, r, ['고블린 졸개']);
  const Ln = G.Line, room = r.map.rooms[0]; Ln.set(r, r.map, { x: room.cx, y: room.cy }, { x: 4, y: 7 }, { x: 11, y: 7 });
  const back = Ln.slot(0, 1, 0), m = r.mons[0], mf = Ln.slot(1, 0, 0); m.x = mf.x; m.y = mf.y;
  r.party.forEach((p, i) => { const q = Ln.slot(0, 1, Ln.LANES[i]); p.x = q.x; p.y = q.y; });
  t('아군 앞줄이 비면 뒷줄이 앞줄 (적 앞줄까지 1칸)', Ln.dist(back, m) === 1, Ln.dist(back, m));
  Ln.off();
}
// 3) 주사위 규칙
{
  const { G } = boot(9), D = G.Dice;
  const ps = [{ hp: 10, max: 10, merc: { cls: 'dragoon' } }, { hp: 5, max: 10, merc: { cls: 'mage' } }, { hp: 8, max: 10, merc: { cls: 'cleric' } }];
  D.party = () => ps; D.loadout = ['gamble', 'doom']; D.bearer = null; D.newRound(1, () => 0.99);
  t('주사위 수 = 살아 있는 인원 + 1', D.st.dice.length === 4);
  t('특수 주사위가 앞에 섞인다', D.st.kinds[0] === 'gamble' && D.st.kinds[1] === 'doom');
  t('죽음의 주사위는 맡은 사람(체력 비율이 가장 높은 사람)에게', D.st.alloc.get(ps[0]) === 1, JSON.stringify([...D.st.alloc.values()]));
  t('죽음의 주사위는 맞바꿀 수 없다', D.swap(ps[0], ps[1]) === false);
  t('다시 굴리기는 한 번', D.reroll([2]) === true && D.reroll([3]) === false);
  const n = 20000; let one = 0, death = 0; for (let i = 0; i < n; i++) { if (D.roll('gamble').value === 1) one++; if (D.roll('doom').special === 'death') death++; }
  t('모 아니면 도: 1이 2/3쯤', one / n > 0.62 && one / n < 0.71, one / n);
  t('죽음의 주사위: 즉사가 1/5쯤', death / n > 0.17 && death / n < 0.23, death / n);
}
// 4) 직업 주사위 · 비틀기 · 조합 (5-9-1) — 직업 주사위는 SRD d20에 기호를 새긴 것
{
  const { G } = boot(10), D = G.Dice;
  const ps = [{ hp: 10, max: 10, merc: { cls: 'dragoon' } }, { hp: 4, max: 10, merc: { cls: 'mage' } }, { hp: 8, max: 10, merc: { cls: 'cleric' } }];
  D.party = () => ps; D.loadout = []; D.newRound(1, () => 0);
  t('특수 주사위가 없으면 파티원마다 직업 주사위 + 보통 하나', ['c_war', 'c_arc', 'c_div', 'd20'].every((k, i) => D.st.kinds[i] === k), D.st.kinds.join());
  t('직업은 SRD 직업으로: 정찰(드루이드) = 신성 · 궁수(레인저) = 재주꾼 · 워락 = 비전', D.dieFor({ merc: { cls: 'scout' } }) === 'c_div' && D.dieFor({ merc: { cls: 'archer' } }) === 'c_skl' && D.dieFor({ merc: { cls: 'warlock' } }) === 'c_arc');
  D.loadout = ['steady']; D.newRound(2, () => 0);
  t('특수 주사위는 예비 자리부터', D.st.kinds.join() === 'steady,c_war,c_arc,c_div', D.st.kinds.join());
  D.loadout = [];
  // SRD d20: 1~20이 고르게, 20면은 ★ · 1면은 빈 면
  for (const k of ['c_war', 'c_skl', 'c_arc', 'c_div']) {
    const cnt = new Array(21).fill(0), n = 40000; for (let i = 0; i < n; i++) cnt[D.roll(k).value]++;
    t(`${k}: 1~20이 고르게 (각 5%쯤)`, cnt.slice(1).every(c => c / n > 0.042 && c / n < 0.058) && cnt[0] === 0, cnt.slice(1).map(c => (c / n * 100).toFixed(1)).join(' '));
    t(`${k}: 20면 ★ · 1면 빈 면`, D.face(k, 20).sym === 'wild' && D.face(k, 1).sym === null);
  }
  t('면에는 값과 기호가 있다 (전사 2면 = 검2)', D.roll('c_war', () => 0.05).value === 2 && D.roll('c_war', () => 0.05).sym === 'atk');
  // 조합: 검 + 검 → 합동 공격, ★는 아무 기호
  D.newRound(3, () => 0); const S = D.st;
  S.dice[0] = D.face('c_war', 2); S.dice[1] = D.face('c_arc', 3); S.dice[2] = D.face('c_div', 20);
  const cs = D.combos();
  t('★는 아무 기호를 채운다 (검×2 · 방×2)', cs.length === 2 && cs.every(c => c.n === 2), JSON.stringify(cs));
  S.dice[2] = D.face('c_div', 1);
  t('같은 기호가 하나뿐이면 조합 없음', D.combos().length === 0);
  // 비틀기: ±1, 라운드당 한 번, 자연 20 · 1은 못 만든다, 보통 주사위는 못 비튼다
  D.newRound(4, () => 0.5); // 직업 주사위 모두 11
  t('보통 주사위는 비틀 수 없다', D.nudge(3, 1) === false);
  t('비틀면 ±1, 기호는 그 면 것으로 (전사 11 → 12 검)', D.nudge(0, 1) === true && D.st.dice[0].value === 12 && D.st.dice[0].sym === 'atk');
  t('비틀기는 라운드당 한 번', D.nudge(0, 1) === false);
  D.newRound(5, () => 0.5); D.st.dice[0] = D.face('c_war', 19); D.st.dice[1] = D.face('c_arc', 2);
  t('비틀어 자연 20 · 자연 1을 만들 수 없다', D.nudge(0, 1) === false && D.nudge(1, -1) === false && !D.st.nudged);
  t('20 · 1에서 비켜 나는 것은 된다', (D.st.dice[2] = D.face('c_div', 20), D.nudge(2, -1)) && D.st.dice[2].value === 19);
  // 맞바꾼 배분은 비틀기 · 다시 굴리기에도 그대로
  D.newRound(6, () => 0.5); D.swap(ps[0], ps[2]); const a0 = [...D.st.alloc.entries()].map(([p, i]) => ps.indexOf(p) + ':' + i).join();
  D.nudge(1, 1); const a1 = [...D.st.alloc.entries()].map(([p, i]) => ps.indexOf(p) + ':' + i).join();
  D.reroll([0, 1, 2]); const a2 = [...D.st.alloc.entries()].map(([p, i]) => ps.indexOf(p) + ':' + i).join();
  t('맞바꾼 배분은 비틀어도 그대로', a0 === a1, [a0, a1]);
  t('맞바꾼 배분은 다시 굴려도 그대로', a0 === a2, [a0, a2]);
  // 끈 조합은 굴림이 바뀌어도 꺼진 채
  D.newRound(7, () => 0); D.st.dice[0] = D.face('c_war', 2); D.st.dice[1] = D.face('c_arc', 3); D.st.dice[2] = D.face('c_div', 20); D.st.comboUser = false; D.recombo();
  const on = D.st.combo; D.setCombo(on);
  t('조합을 누르면 꺼진다', on && D.st.combo === null);
  D.nudge(1, 1); D.reroll([3]);
  t('끈 조합은 비틀고 다시 굴려도 꺼진 채', D.st.combo === null, D.st.combo);
  // 효과: 방진은 AC를 그 라운드만 올린다 (새 라운드 · 전투 끝에 지워짐), 기도는 실제로 찬 만큼만
  const { G: G2 } = boot(11), D2 = G2.Dice, r2 = G2.Fantasy.rt(G2.S.w.fantasy), team = r2.party.filter(p => p.hp > 0);
  D2.party = () => team; D2.loadout = []; D2.newRound(1, () => 0); const S2 = D2.st;
  S2.dice = team.map(() => D2.face('c_war', 3)).concat([{ kind: 'd20', value: 10, sym: null }]);
  const ac0 = G2.Dnd.ac(team[0]); S2.combo = 'def'; D2.fire();
  t('방진: 아군 AC가 오른다', G2.Dnd.ac(team[0]) === ac0 + (team.length >= 3 ? 3 : 2), [ac0, G2.Dnd.ac(team[0])]);
  G2.S.runTime += 100; // 탐사 중 시계가 멈췄다 다시 가도 — 효과는 시계가 아니라 라운드로 끝난다
  t('방진은 시계가 흘러도 그 라운드 동안 남는다', G2.Dnd.ac(team[0]) > ac0);
  D2.newRound(2, () => 0);
  t('새 라운드가 되면 방진이 지워진다', G2.Dnd.ac(team[0]) === ac0, [ac0, G2.Dnd.ac(team[0])]);
  D2.st.dice = team.map(() => D2.face('c_war', 3)).concat([{ kind: 'd20', value: 10, sym: null }]); D2.st.combo = 'def'; D2.fire(); D2.end();
  t('전투가 끝나면 방진이 지워진다 (다음 전투로 안 넘어간다)', G2.Dnd.ac(team[0]) === ac0 && D2.st === null);
  D2.newRound(3, () => 0);
  team.forEach(p => { p.hp = p.max; }); team[1].hp = 1; D2.st.dice = team.map((_, i) => (i < 2 ? D2.face('c_div', 2) : D2.face('c_war', 3))).concat([D2.face('c_war', 7)]);
  t('AI 추천: 다친 사람이 있으면 기도 (방진도 있을 때)', D2.combos().length === 2 && D2.pickCombo() === 'holy', JSON.stringify(D2.combos()));
  team[1].hp = team[1].max;
  t('AI 추천: 다친 사람이 없으면 기도 말고 다른 조합', D2.pickCombo() === 'def', D2.pickCombo());
  team[1].hp = team[1].max - 1; const hp0 = team.map(p => p.hp); D2.st.combo = 'holy'; D2.fire();
  t('기도: 체력 최대를 넘지 않고, 가득 찬 사람은 그대로', team.every(p => p.hp <= p.max) && team[1].hp === team[1].max && team.every((p, i) => i === 1 || p.hp === hp0[i]), team.map(p => p.hp + '/' + p.max).join());
  // 직업 주사위 20 = 자연 20 → 치명타 (SRD)
  spawn(G2, r2, ['고블린 졸개']); const mon = r2.mons.find(m => m.hp > 0);
  D2.newRound(4, () => 0); D2.st.dice[D2.st.alloc.get(team[0])] = D2.face(D2.st.kinds[D2.st.alloc.get(team[0])] === 'd20' ? 'c_war' : D2.st.kinds[D2.st.alloc.get(team[0])], 20); D2.st.ready = true;
  G2.Dnd.adv = () => 0; const hit = G2.Dnd.attack(team[0], mon);
  t('직업 주사위 20은 자연 20 — 치명타', hit.crit === true && hit.nat === 20, JSON.stringify({ crit: hit.crit, nat: hit.nat }));
}
console.log(`crawl_fight_rules: 통과 ${ok} · 실패 ${bad}`);
process.exit(bad ? 1 : 0);
