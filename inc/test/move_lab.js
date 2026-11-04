'use strict';
// 지시에 따라 움직임이 달라지나: node test/move_lab.js <파티> <세팅번호 0|1|2> [시드] [분]  → 직업별 한 줄 JSON
// 차례마다 옮긴 칸 · 차례 끝의 적과 거리 · 제자리 비율 · 첫 공격까지의 라운드 · 표적이 후열이었던 비율을 잰다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const crew = process.argv[2].split(','), preset = +process.argv[3] || 0, seed = +process.argv[4] || 1, MIN = +process.argv[5] || 12;
const M = Object.create(Math); let s0 = seed * 7919 >>> 0;
M.random = () => { s0 = (s0 + 0x6D2B79F5) >>> 0; let t = s0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ctx = { console, Math: M, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8');
const list = JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'));
for (const n of list) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G; G.newState();
const f = G.S.w.fantasy, GD = G.Guild, L = GD.leader(f); f.leaderNew = false; f.autoTr = false; L.lv = 7; f.autoParty = false;
f.lineup = crew.map(c => { const m = GD.make(f, c, { lv: 7 }); f.mercs.push(m); return m.uid; });
for (const m of [L, ...f.mercs]) G.Tactics.setTarget(m, ['near', 'weak', 'back'][preset]);
G.Fantasy.syncAllies(f);
f.floor = f.maxFloor = 4; f.checkpoint = f.start = 4; f.town = true; f.townT = 99;
G.Exp.depart(f, G.Fantasy.rt(f));
const R = {}, row = c => (R[c] = R[c] || { turns: 0, moved: 0, still: 0, gap: 0, tgBack: 0, tgN: 0, firstHit: 0, firstN: 0 });
const tr = G.Turn.run; let cur = null, sx = 0, sy = 0, seen = new Set();
const finish = rt => { if (!cur || cur.kind === 'mon' || !cur.merc) return; const r = row(cur.merc.cls), foes = rt.mons.filter(o => o.hp > 0 && o.aggro), d = Math.hypot(cur.x - sx, cur.y - sy); r.turns++; r.moved += d; if (d < 0.5) r.still++; if (foes.length) r.gap += Math.min(...foes.map(o => Math.hypot(o.x - cur.x, o.y - cur.y))); };
G.Turn.run = function (ff, rt, dt) {
  const was = rt.turn && rt.turn.cur, res = tr.apply(this, arguments), now = rt.turn && rt.turn.cur;
  if (now !== was || (!rt.turn && cur)) { finish(rt); cur = now || null; if (cur) { sx = cur.x; sy = cur.y; } }
  if (!rt.turn) seen = new Set();
  return res;
};
const hurt = G.Fantasy.hurt;
G.Fantasy.hurt = function (ff, rt, m, d, src, from) {
  if (from && from.merc && rt.turn && src !== 'dot') {
    const r = row(from.merc.cls); r.tgN++; if (G.Foe.back(m)) r.tgBack++;
    if (!seen.has(from)) { seen.add(from); r.firstHit += rt.turn.round; r.firstN++; }
  }
  return hurt.apply(this, arguments);
};
for (let t = 0; t < MIN * 60; t++) G.tick(1, 0.1);
for (const c of Object.keys(R)) { const r = R[c]; console.log(JSON.stringify({ c, preset, seed, ...r })); }
