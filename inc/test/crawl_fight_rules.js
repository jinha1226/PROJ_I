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
  let round = 0, cur = null, used = 0, boards = 0; const cols = [];
  if (dice) { G.Dice.loadout = dice; G.Dice.party = () => r.party.filter(p => !p.dead && p.hp > 0); G.Dice.cur = () => r.turn?.cur || null; G.Dice.end(); }
  const d20 = G.Dnd.d20; if (dice) G.Dnd.d20 = function (adv) { const S = G.Dice.st, before = S ? S.used.size : 0; const v = d20.call(this, adv); if (S && S.used.size > before) used++; return v; };
  for (let k = 0; k < maxT * 10; k++) {
    const T = r.turn;
    // 앱과 같게: 첫 라운드에 운명판을 한 번, 라운드마다 그 열
    if (dice && T && !G.Dice.board) { G.Dice.newBoard(); G.Dice.board.ready = true; boards++; }
    if (dice && T && T.round !== round) { round = T.round; G.Dice.useRound(T.round); G.Dice.fire(); cols.push(G.Dice.st.col); }
    if (dice && T && T.cur !== cur) { if (cur) G.Dice.turnEnd(cur); cur = T.cur; }
    G.tick(0.1);
    const foes = r.mons.filter(m => m.hp > 0), ps = r.party.filter(p => !p.dead && p.hp > 0);
    if (!foes.length || !ps.length) return { win: !!ps.length && !foes.length, t: k / 10, rounds: r.turn?.round || round, used, maxRound: round, boards, cols };
  }
  return { win: false, t: maxT, rounds: r.turn?.round || 0, used, timeout: true, boards, cols };
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
// 2) 운명판: 전투 시작에 한 번 굴리고, 라운드마다 그 열을 되풀이하며, 칸 값이 아군 공격 d20에 쓰인다
for (const seed of [4, 5]) {
  const { G, r } = boot(seed); spawn(G, r, ['고블린 졸개', '홉고블린 전사', '홉고블린 전사']);
  const res = run(G, r, { dice: ['steady'] });
  t(`씨앗 ${seed}: 운명판 전투가 끝난다`, !res.timeout, JSON.stringify(res));
  t(`씨앗 ${seed}: 판은 전투에 한 번만 굴린다`, res.boards === 1, res.boards);
  t(`씨앗 ${seed}: 라운드마다 판의 열을 1 → 2 → 3 → 1 … 되풀이`, res.cols.length >= 1 && res.cols.every((c, i) => c === i % 3), res.cols.join());
  t(`씨앗 ${seed}: 판의 값이 공격 굴림에 쓰였다`, res.used >= 1, JSON.stringify(res));
}
// 2-1) 흐르는 턴제: 판정은 SRD 차례 그대로, 범위 칠하기 · 큰 주사위 창 · 차례 사이 쉼이 없어 라운드가 짧다
{
  const play = smooth => { let tot = 0, rounds = 0, ov = 0, ends = 0; for (const seed of [6, 7, 8]) {
    const { G, r } = boot(seed); G.quiet = false; G.Turn.smooth = smooth; const ov0 = G.Tactics.overlay; G.Tactics.overlay = function (...a) { ov++; return ov0.apply(this, a); };
    spawn(G, r, ['고블린 졸개', '고블린 졸개', '홉고블린 전사']); const res = run(G, r); if (!res.timeout) ends++; tot += res.t; rounds += Math.max(1, res.rounds); }
    return { per: tot / rounds, ov, ends }; };
  const sm = play(true), old = play(false);
  t('흐르는 턴제: 전투가 끝난다', sm.ends === 3, JSON.stringify(sm));
  t('흐르는 턴제: 범위를 칠하지 않는다', sm.ov === 0 && old.ov > 0, JSON.stringify({ sm: sm.ov, old: old.ov }));
  t('흐르는 턴제: 라운드가 옛 방식의 절반보다 짧다', sm.per < old.per * 0.5, JSON.stringify({ sm: sm.per.toFixed(2), old: old.per.toFixed(2) }));
}
// 3) 운명판 규칙
{
  const { G } = boot(9), D = G.Dice;
  const ps = [{ hp: 10, max: 10, merc: { cls: 'dragoon' } }, { hp: 5, max: 10, merc: { cls: 'mage' } }, { hp: 8, max: 10, merc: { cls: 'cleric' } }];
  D.party = () => ps; D.loadout = []; D.bearer = null; const B = D.newBoard(() => 0.5);
  t('판 = 파티원 줄 × 3라운드 열', B.rows.length === 3 && B.cells.every(row => row.length === 3));
  t('줄마다 그 사람의 직업 주사위 (파이터 전사 · 소서러 비전 · 클레릭 신성)', B.cells[0].every(d => d.kind === 'c_war') && B.cells[1].every(d => d.kind === 'c_arc') && B.cells[2].every(d => d.kind === 'c_div'));
  t('직업은 SRD 직업으로: 정찰(드루이드) = 신성 · 궁수(레인저) = 재주꾼 · 워락 = 비전', D.dieFor({ merc: { cls: 'scout' } }) === 'c_div' && D.dieFor({ merc: { cls: 'archer' } }) === 'c_skl' && D.dieFor({ merc: { cls: 'warlock' } }) === 'c_arc');
  // 라운드 → 열: 1 2 3 1 2 3 …, 내 칸이 내 주사위
  B.cells[0][0] = D.face('c_war', 17); B.cells[0][1] = D.face('c_war', 3); B.ready = true;
  D.useRound(1); const a1 = D.dieOf(ps[0]).value; D.useRound(2); const a2 = D.dieOf(ps[0]).value; D.useRound(4); const a4 = D.dieOf(ps[0]).value;
  t('N라운드는 (N − 1) % 3열 — 4라운드는 1라운드와 같은 칸', a1 === 17 && a2 === 3 && a4 === 17 && D.st.col === 0, [a1, a2, a4]);
  // 다시 굴리기는 한 번, 고른 칸만
  const keep = B.cells[1][1].value; D.newBoard(() => 0.5); const B2 = D.board, k2 = B2.cells[2][2];
  t('다시 굴리기는 한 번', D.rerollCells([[0, 0]], () => 0.99) === true && D.rerollCells([[1, 1]]) === false);
  t('다시 굴린 칸만 바뀐다 (20 = ★)', B2.cells[0][0].value === 20 && B2.cells[0][0].sym === 'wild' && B2.cells[2][2] === k2);
  // 열 순서 바꾸기
  const c0 = B2.cells.map(row => row[0]), c2 = B2.cells.map(row => row[2]); D.swapCols(0, 2);
  t('열 순서 바꾸기: 두 열이 통째로 바뀐다', B2.cells.every((row, r) => row[0] === c2[r] && row[2] === c0[r]));
  // 특수 주사위: 칸 하나씩, 죽음의 주사위는 맡은 사람 줄
  D.loadout = ['gamble', 'doom']; D.bearer = null; const B3 = D.newBoard(() => 0.1);
  const where = k => { for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (B3.cells[r][c].kind === k) return [r, c]; return null; };
  t('특수 주사위는 칸 하나씩 들어간다', where('gamble') && where('doom'), JSON.stringify([where('gamble'), where('doom')]));
  t('죽음의 주사위는 맡은 사람(체력 비율이 가장 높은 사람) 줄', where('doom') && B3.rows[where('doom')[0]] === ps[0]);
  // 쓰러진 사람 칸은 조합에서 빠진다
  D.loadout = []; const B4 = D.newBoard(); B4.ready = true; B4.cells[0][0] = D.face('c_war', 2); B4.cells[1][0] = D.face('c_arc', 3); B4.cells[2][0] = D.face('c_div', 7); // 검 · 방 · 방 — 방 페어는 클레릭 칸이 있어야
  D.useRound(1); const before = D.combos().length; ps[2].dead = true; ps[2].hp = 0; const alive = ps.slice(0, 2); D.party = () => alive; D.useRound(1);
  t('쓰러진 사람 칸은 조합에서 빠진다', before === 1 && D.combos().length === 0, [before, D.combos().length]);
  ps[2].dead = false; ps[2].hp = 8; D.party = () => ps;
  const n = 20000; let one = 0, death = 0; for (let i = 0; i < n; i++) { if (D.roll('gamble').value === 1) one++; if (D.roll('doom').special === 'death') death++; }
  t('모 아니면 도: 1이 2/3쯤', one / n > 0.62 && one / n < 0.71, one / n);
  t('죽음의 주사위: 즉사가 1/5쯤', death / n > 0.17 && death / n < 0.23, death / n);
}
// 4) 직업 주사위 · 조합 (5-9-1) — 직업 주사위는 SRD d20에 기호를 새긴 것
{
  const { G } = boot(10), D = G.Dice;
  for (const k of ['c_war', 'c_skl', 'c_arc', 'c_div']) {
    const cnt = new Array(21).fill(0), n = 40000; for (let i = 0; i < n; i++) cnt[D.roll(k).value]++;
    t(`${k}: 1~20이 고르게 (각 5%쯤)`, cnt.slice(1).every(c => c / n > 0.042 && c / n < 0.058) && cnt[0] === 0, cnt.slice(1).map(c => (c / n * 100).toFixed(1)).join(' '));
    t(`${k}: 20면 ★ · 1면 빈 면`, D.face(k, 20).sym === 'wild' && D.face(k, 1).sym === null);
  }
  t('면에는 값과 기호가 있다 (전사 2면 = 검2)', D.roll('c_war', () => 0.05).value === 2 && D.roll('c_war', () => 0.05).sym === 'atk');
  t('★는 아무 기호를 채운다 (검×2 · 방×2)', (cs => cs.length === 2 && cs.every(c => c.n === 2))(D.combos([D.face('c_war', 2), D.face('c_arc', 3), D.face('c_div', 20)])));
  t('같은 기호가 하나뿐이면 조합 없음', D.combos([D.face('c_war', 2), D.face('c_arc', 3), D.face('c_div', 1)]).length === 0);
  // 효과: 방진은 AC를 그 라운드만 (다음 라운드 · 전투 끝에 지워짐), 기도는 실제로 찬 만큼만, 끈 조합은 그대로
  const { G: G2 } = boot(11), D2 = G2.Dice, r2 = G2.Fantasy.rt(G2.S.w.fantasy), team = r2.party.filter(p => p.hp > 0);
  D2.party = () => team; D2.loadout = []; const B = D2.newBoard(() => 0); B.ready = true;
  for (let r = 0; r < team.length; r++) { B.cells[r][0] = D2.face('c_war', 3); B.cells[r][1] = D2.face('c_war', 1); B.cells[r][2] = r < 2 ? D2.face('c_div', 2) : D2.face('c_war', 3); }
  const ac0 = G2.Dnd.ac(team[0]); D2.useRound(1); D2.fire();
  t('방진: 그 라운드 아군 AC가 오른다', G2.Dnd.ac(team[0]) === ac0 + (team.length >= 3 ? 3 : 2), [ac0, G2.Dnd.ac(team[0])]);
  G2.S.runTime += 100;
  t('방진은 시계가 흘러도 그 라운드 동안 남는다', G2.Dnd.ac(team[0]) > ac0);
  D2.useRound(2);
  t('다음 라운드가 되면 방진이 지워진다', G2.Dnd.ac(team[0]) === ac0, [ac0, G2.Dnd.ac(team[0])]);
  D2.useRound(4); D2.fire();
  t('4라운드에 1열 방진이 다시 켜진다', G2.Dnd.ac(team[0]) > ac0);
  D2.end();
  t('전투가 끝나면 방진이 지워진다 (다음 전투로 안 넘어간다)', G2.Dnd.ac(team[0]) === ac0 && D2.st === null && D2.board === null);
  const B5 = D2.newBoard(() => 0); B5.ready = true; B5.cells[0][0] = D2.face('c_div', 2); B5.cells[1][0] = D2.face('c_war', 3); B5.cells[2][0] = D2.face('c_war', 20); // 빛 · 방 · ★ — 빛×2와 방×2 둘 다 된다
  team.forEach(p => { p.hp = p.max; }); team[1].hp = 1; D2.useRound(1);
  t('AI 추천: 다친 사람이 있으면 기도 (다른 조합이 있어도)', D2.st.combo === 'holy', D2.st.combo);
  team[1].hp = team[1].max; D2.st.comboUser = false; D2.recombo();
  t('AI 추천: 다친 사람이 없으면 기도 말고 다른 조합', D2.st.combo !== 'holy', D2.st.combo);
  D2.setCombo(D2.st.combo); D2.recombo();
  t('끈 조합은 다시 켜지지 않는다', D2.st.combo === null);
  team[1].hp = team[1].max - 1; const hp0 = team.map(p => p.hp); D2.st.combo = 'holy'; D2.fire();
  t('기도: 체력 최대를 넘지 않고, 가득 찬 사람은 그대로', team.every(p => p.hp <= p.max) && team[1].hp === team[1].max && team.every((p, i) => i === 1 || p.hp === hp0[i]), team.map(p => p.hp + '/' + p.max).join());
  // 판의 20 = 자연 20 → 치명타 (SRD)
  spawn(G2, r2, ['고블린 졸개']); const mon = r2.mons.find(m => m.hp > 0);
  const B6 = D2.newBoard(() => 0); B6.ready = true; B6.cells[0][0] = D2.face('c_war', 20); D2.useRound(1);
  G2.Dnd.adv = () => 0; const hit = G2.Dnd.attack(team[0], mon);
  t('판의 20은 자연 20 — 치명타', hit.crit === true && hit.nat === 20, JSON.stringify({ crit: hit.crit, nat: hit.nat }));
}
console.log(`crawl_fight_rules: 통과 ${ok} · 실패 ${bad}`);
process.exit(bad ? 1 : 0);
