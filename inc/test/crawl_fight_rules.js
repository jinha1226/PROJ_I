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
// 2-1) 4×4 구역 전투: 판을 켜면 모두 구역 자리에(구역마다 3명까지), 전투가 끝나고, 근접은 같은 구역에서만 닿는다
for (const seed of [6, 7]) {
  const { G, r } = boot(seed); spawn(G, r, ['고블린 졸개', '고블린 졸개', '홉고블린 전사']);
  G.Zone.set(r.map.rooms[0], r.map); G.Tactics.snap(r);
  const all = r.party.concat(r.mons), per = new Map(); for (const e of all) { const k = G.Zone.zoneOf(e).join(','); per.set(k, (per.get(k) || 0) + 1); }
  t(`씨앗 ${seed}: 구역마다 3명까지`, [...per.values()].every(v => v <= 3), JSON.stringify([...per]));
  t(`씨앗 ${seed}: 같은 구역 거리 0 · 이웃 구역 2칸 · 두 구역 6칸`, G.Zone.dist({ x: 3, y: 3 }, { x: 4, y: 3.5 }) === 0 && G.Zone.dist({ x: 3, y: 3 }, { x: 6, y: 3 }) === 2 && G.Zone.dist({ x: 3, y: 3 }, { x: 9, y: 3 }) === 6, [G.Zone.dist({ x: 3, y: 3 }, { x: 6, y: 3 }), G.Zone.dist({ x: 3, y: 3 }, { x: 9, y: 3 })]);
  const res = run(G, r, { dice: ['twin'] });
  t(`씨앗 ${seed}: 구역 전투가 끝난다`, !res.timeout, JSON.stringify(res));
  const moved = r.party.concat(r.mons.filter(m => m.hp > 0)).every(e => { const [zx, zy] = G.Zone.zoneOf(e); return zx >= 0 && zx < 4 && zy >= 0 && zy < 4; });
  t(`씨앗 ${seed}: 모두 판 안에 있다`, moved);
  G.Zone.off();
  t(`씨앗 ${seed}: 판을 끄면 보통 거리`, G.Zone.dist({ x: 0, y: 0 }, { x: 3, y: 4 }) === 5);
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
console.log(`crawl_fight_rules: 통과 ${ok} · 실패 ${bad}`);
process.exit(bad ? 1 : 0);
