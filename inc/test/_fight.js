'use strict';
// 전투 시험 도우미: 옛 엔진 세계 하나(파이터 + 소서러 · 클레릭, 3레벨, 방 하나)를 세우고 몬스터를 놓고 전투를 돌린다.
//   const { boot, spawn, run } = require('./_fight.js');
const vm = require('vm'), LOAD = require('./_load.js');
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
  return { G, f, r, ctx };
}
function spawn(G, r, names) { names.forEach((n, i) => G.Fantasy.spawnMon(r, 1, { n, ...G.D.F.mon[n] }, 11, 4 + i * 2, false, { aggro: true, spotted: true, major: true })); G.Fantasy.refreshEnts(r); if (G.Sight?.update) G.Sight.update(r); }
function run(G, r, { dice = null, maxT = 400 } = {}) {
  let round = 0, cur = null, used = 0;
  if (dice) { const D = G.Dice; D.loadout = dice; D.party = () => r.party.filter(p => !p.dead && p.hp > 0); D.roster = () => r.party; D.cur = () => r.turn?.cur || null; D.newBoard(); } // 층에 들어설 때처럼 판을 굴려 둔다
  const d20 = G.Dnd.d20; if (dice) G.Dnd.d20 = function (adv) { const S = G.Dice.st, before = S ? S.used.size : 0; const v = d20.call(this, adv); if (S && S.used.size > before) used++; return v; };
  for (let k = 0; k < maxT * 10; k++) {
    const T = r.turn;
    // 앱과 같게: 라운드마다 다 쓴 줄을 넘기고 빙고 효과를 켠다
    if (dice && T && T.round !== round) { round = T.round; G.Dice.useRound(T.round); G.Dice.fire(); }
    G.tick(0.1);
    const foes = r.mons.filter(m => m.hp > 0), ps = r.party.filter(p => !p.dead && p.hp > 0);
    if (!foes.length || !ps.length) { if (dice) G.Dice.end(); return { win: !!ps.length && !foes.length, t: k / 10, rounds: r.turn?.round || round, used, maxRound: round }; }
  }
  return { win: false, t: maxT, rounds: r.turn?.round || 0, used, timeout: true };
}

module.exports = { boot, spawn, run };
