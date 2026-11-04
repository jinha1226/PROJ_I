'use strict';
// 지역 원정을 끝까지: node test/region_lab.js <파티> <레벨> <판> [시드] → 한 줄 JSON
const fs = require('fs'), vm = require('vm'), path = require('path');
const crew = process.argv[2].split(','), LV = +process.argv[3], N = +process.argv[4], seed = +process.argv[5] || 1;
const M = Object.create(Math); let s0 = seed * 7919 >>> 0;
M.random = () => { s0 = (s0 + 0x6D2B79F5) >>> 0; let t = s0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ctx = { console, Math: M, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G; G.newState(); G.quiet = true;
const f = G.S.w.fantasy, GD = G.Guild, F = G.Fantasy, L = GD.leader(f); f.leaderNew = false; f.autoTr = false; f.autoParty = false; f.autoGo = false; L.lv = LV;
f.lineup = crew.map(c => { const m = GD.make(f, c, { lv: LV }); f.mercs.push(m); return m.uid; }); F.syncAllies(f);
f.frontLock = process.env.REGION || 'swamp';
if (process.env.NORETREAT) { G.Foe.retreatOn = false; f.retreat = 'wipe'; f.policy = 'bold'; }
const gain = process.env.ALLSK ? 1 : 0;
const R = { skT: 0, ptT: 0, big: 0, kinds: 0, early: 0, spent: 0, lastSk: 0, lastPt: 0, n: 0, clear: 0, retreat: 0, wipe: 0, other: 0, floors: 0, fights: 0, rounds: 0, secs: 0, deaths: 0, downs: 0, shots: {}, names: {} }, oh = G.Exp.home;
let why = null; G.Exp.home = function (a, b, w) { why = w || 'x'; return oh.apply(this, arguments); };
const die = G.Story.die; G.Story.die = function (ff, rt0, p) { R.deaths++; p.dying = null; p.dead = true; }; // 영구 사망은 세기만 하고 명단은 다음 판을 위해 둔다
const bg = G.Turn.run; let was = null, kinds = new Set(), fightNo = 0;
const SKK = G.Skill.SK; for (const k of Object.keys(SKK)) { const S0 = SKK[k], r0 = S0.run; S0.run = function (c, x) { const r = r0.apply(this, arguments); if (r !== false && c.merc && x.rt.turn) { kinds.add(k); if (!S0.bonus) R.skT++; if (S0.res) { R.spent++; if (x.rt.turn.round <= 2) R.early++; if (S0.res.slot >= 3) R.big++; } } return r; }; }
const ctS = G.Foe.startTurn; G.Foe.startTurn = function (ff, rt, e) { if (e.merc) R.ptT++; return ctS.apply(this, arguments); };
G.Turn.run = function (ff, rt) { const r = bg.apply(this, arguments); if (rt.turn && !was) { R.fights++; fightNo++; for (const o of rt.mons) if (o.aggro && o.hp > 0) R.names[o.n] = (R.names[o.n] || 0) + 1; } if (!rt.turn && was) { R.rounds += was.round; R.downs += was.downs || 0; R.kinds += kinds.size; kinds = new Set(); } was = rt.turn; return r; };
for (let i = 0; i < N; i++) {
  G.Season.st(f).t = 0; // 시즌 시계가 다 되면 원정이 바로 끝나 측정이 망가진다
  f.start = f.checkpoint = f.floor = f.maxFloor = 1; f.town = true; f.seasonEnd = false; f.townT = 99; f.carry = 0;
  for (const m of [L, ...f.mercs]) { m.stress = 0; m.inj = 0; m.dead = false; if (m.injT) m.injT = 0; }
  const rt = F.rt(f); why = null; was = null; rt.turn = null; G.Exp.depart(f, rt);
  let t = 0; const start = f.floor;
  for (; t < 2400 && !why && !f.town; t++) { G.tick(1, 0.1); if (rt.ask && !rt.turn) G.Story.answer(rt, rt.ask.def); }
  R.n++; R.secs += t / 10; R.floors += f.floor - start + 1;
  if (!why) R.stuck = (R.stuck || 0) + 1; else if (!['clear', 'retreat', 'careful', 'wipe'].includes(why)) (R.whys = R.whys || {})[why] = (R.whys?.[why] || 0) + 1;
  const k = why === 'clear' ? 'clear' : why === 'retreat' || why === 'careful' ? 'retreat' : why === 'wipe' ? 'wipe' : 'other'; R[k]++;
  G.Exp.home = function (a, b, w) { why = w || 'x'; return oh.apply(this, arguments); };
}
console.log(JSON.stringify({ crew: process.argv[2], lv: LV, ...R }));
