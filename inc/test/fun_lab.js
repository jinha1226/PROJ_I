'use strict';
// 재미 대리 지표 실험장: 전투 하나를 조건을 바꿔 반복한다.
// node test/fun_lab.js <파티> <진형 natural|flip|line|column> <세팅 0|1|2> <세력> <층> <레벨> <판수> [시드]  → 한 줄 JSON
const fs = require('fs'), vm = require('vm'), path = require('path');
const [crewS, layout, presetS, fac, flS, lvS, nS, seedS] = process.argv.slice(2);
const crew = crewS.split(','), preset = +presetS, FL = +flS, LV = +lvS, N = +nS, seed = +seedS || 1, FOES = +process.env.FOES || 5, KK = +process.env.K || 1; // K: 몬스터 체력 · 공격 배율 (장비 · 트리 성장을 대신해 난이도를 맞춘다)
const M = Object.create(Math); let s0 = seed * 7919 >>> 0;
M.random = () => { s0 = (s0 + 0x6D2B79F5) >>> 0; let t = s0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ctx = { console, Math: M, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G; G.newState();
const f = G.S.w.fantasy, GD = G.Guild, F = G.Fantasy, T = G.Tactics, L = GD.leader(f); f.leaderNew = false; f.autoTr = false; L.lv = LV; f.autoParty = false;
f.lineup = crew.map(c => { const m = GD.make(f, c, { lv: LV }); f.mercs.push(m); return m.uid; });
for (const m of [L, ...f.mercs]) T.setTarget(m, ['near', 'weak', 'back'][preset]);
F.syncAllies(f);
f.floor = f.maxFloor = FL; f.checkpoint = f.start = FL; f.town = true; f.townT = 99;
if (process.env.PACE) G.Turn.pace = +process.env.PACE;
if (process.env.NORETREAT) G.Foe.retreatOn = false;
if (process.env.DIFF) f.frontLock = fac;
const rt = F.rt(f); G.Exp.depart(f, rt);
const fm = F.formation(f), uids = Object.keys(fm), L0 = { natural: null, flip: u => (2 - (fm[u] / 3 | 0)) * 3 + fm[u] % 3 }[layout];
if (layout === 'flip') { const nf = {}; for (const u of uids) nf[u] = L0(u); Object.assign(fm, nf); }
if (layout === 'line') uids.forEach((u, i) => { fm[u] = i < 3 ? i : 3 + (i - 3); });
if (layout === 'column') uids.forEach((u, i) => { fm[u] = Math.min(i, 2) * 3 + 1 + (i > 2 ? 1 : 0); });
if (process.env.ROW) { const [c, r] = process.env.ROW.split(':'), m = [L, ...f.mercs].find(x => x.cls === c), used = new Set(Object.values(fm)); const cell = [1, 0, 2].map(q => +r * 3 + q).find(q => !used.has(q)) ?? +r * 3 + 1; G.Fantasy.setCell(f, m.uid, cell); }
const SUB = process.env.ROW ? process.env.ROW.split(':')[0] : null, ME = { turns: 0, moved: 0, gap: 0, dmg: 0, tot: 0, taken: 0, downs: 0, acts: 0, firstHit: 0, firstN: 0, heals: 0 };
// 사망 · 전멸은 세기만 하고 다음 판을 위해 되돌린다
let lost = false, deaths = 0;
G.Story.die = () => { deaths++; };
G.Story.wipe = () => { lost = true; };
G.Exp.home = (a, b, why) => { lost = true; if (why === 'retreat') R.retreats = (R.retreats || 0) + 1; };
const R = { n: 0, win: 0, rounds: 0, secs: 0, stomp: 0, close: 0, loss: 0, downs: 0, deaths: 0, low: 0, endHP: 0, swings: 0, turns: 0, idle: 0, moved: 0, partyTurns: 0, partyIdle: 0, partyMoved: 0, skillUses: 0, basic: 0, heals: 0, miss: 0, hit: 0, skillKinds: 0, backHit: 0, backVis: 0, topShare: 0, longFight: 0, shortFight: 0 };
const hurt = F.hurt, member = F.hurtMember, attack = G.Dnd.attack; const keyOf = () => (rt.turn ? rt.turn.round + ':' + rt.turn.i : ''); let acted = new Set(), curKey = '', dmgBy = new Map(), kinds = new Set();
F.hurt = function (ff, r, m, d, src, from) { if (from && r.turn) { ME.tot += d; if (from.merc && from.merc.cls === SUB) { ME.dmg += d; if (r.turn.round && !ME._hit) { ME._hit = 1; ME.firstHit += r.turn.round; ME.firstN++; } } acted.add(keyOf()); dmgBy.set(from, (dmgBy.get(from) || 0) + d); if (from.merc && src !== 'dot' && r.mons.some(o => o.hp > 0 && o.aggro && G.Foe.back(o))) { R.backVis++; if (G.Foe.back(m)) R.backHit++; } } return hurt.apply(this, arguments); };
F.hurtMember = function (ff, r, p, d, mo) { if (mo) acted.add(keyOf()); if (p.merc && p.merc.cls === SUB) { const h0 = p.hp, res = member.apply(this, arguments); ME.taken += Math.max(0, h0 - p.hp) / (p.max || 1); if (p.dead && h0 > 0) ME.downs++; return res; } return member.apply(this, arguments); };
G.Dnd.attack = function (a, t, c) { const q = attack.apply(this, arguments); acted.add(keyOf()); if (q.hit) R.hit++; else R.miss++; return q; };
for (const k of Object.keys(G.Skill.SK)) { const S = G.Skill.SK[k], run = S.run; S.run = function () { const r = run.apply(this, arguments); if (r !== false) { acted.add(keyOf()); R.skillUses++; kinds.add(k); } return r; }; }
const heal = F.healTurn; F.healTurn = function (ff, r0, a) { const r = heal.apply(this, arguments); if (r) { acted.add(keyOf()); R.heals++; if (a && a.merc && a.merc.cls === SUB) ME.heals++; } return r; };
const aid = G.Story.aid; G.Story.aid = function () { const r = aid.apply(this, arguments); if (r) { acted.add(keyOf()); R.aids = (R.aids || 0) + 1; } return r; };
const sv = G.Dnd.save; G.Dnd.save = function (o) { const r = sv.apply(this, arguments); if (o && o.kind === 'mon') acted.add(keyOf()); return r; };
const big = m => m.rooms.slice(1).filter(r => r.w >= 7 && r.h >= 6);
function arena() {
  if (!rt.map || !big(rt.map).length || G.U.chance(0.1)) { rt.flow = null; F.newFloor(f, rt); rt.flow = { st: 'fight', t: 0, map: rt.map }; }
  const m = rt.map, list = big(m), room = list.length ? list[G.U.rand(list.length)] : m.rooms[1];
  rt.mons = []; rt.turn = null; rt.phase = 'explore'; rt.chests = []; rt.traps = []; rt.fields = []; rt.scene = null; rt.ask = null; rt.prompt = null; f.heat = 0; f.town = false;
  return room;
}
function reset(room) {
  const m = rt.map, lead = rt.hero, cy = room.y + (room.h >> 1), cell = (x, y) => { for (let d = 0; d < 6; d++) for (let a = -d; a <= d; a++) for (let b = -d; b <= d; b++) if (m.c[(y + b) * m.w + x + a] === '.') return [x + a, y + b]; return [room.x, room.y]; };
  for (const p of rt.party) { Object.assign(p, { hp: p.max, dead: false, dying: null, downed: false, raised: false, reviveT: 0, stun: 0, guard: false, surge: 0, bigT: false, thp: 0, pe: [], lastSk: null, broke: null, fleeT: 0, resolve: false, relN: 0 }); p.oaRound = null; p.cds = {}; if (p.buffs) p.buffs = {}; if (p.cond) p.cond = {}; if (p.merc) { p.merc.stress = 0; p.merc.inj = 0; } const [x, y] = cell(room.x + 1, cy); p.x = x; p.y = y; }
  G.Res.longRest(f.mercs.concat(L));
  const d = process.env.DIFF ? G.Region.defs(G.Region.pick(G.Region.of(f), G.Region.budget(f, +process.env.DIFF))) : G.Foe.troop(FL, FOES, fac);
  d.forEach((x, i) => { const [a, b] = cell(room.x + room.w - 2 - (G.Foe.ROLES[x.r].range ? 0 : 1), room.y + (i * 2) % room.h); const o = F.spawnMon(rt, FL, x, a, b, false, { aggro: true, major: true, spotted: true }); o.hp *= KK; o.max *= KK; o.atk *= KK; });
  T.snap(rt);
  for (const q of T.deploy(rt, lead, rt.mons[0])) { const e = q.path[q.path.length - 1]; if (e) { q.e.x = e.x; q.e.y = e.y; } }
  T.snap(rt);
}
let room = arena();
for (let i = 0; i < N; i++) {
  if (i % 3 === 0) room = arena(); else { rt.mons = []; rt.turn = null; rt.phase = 'explore'; }
  reset(room); acted = new Set(); lost = false; deaths = 0; dmgBy = new Map(); kinds = new Set();
  let secs = 0, cur = null, sx = 0, sy = 0, turns = 0, idle = 0, moved = 0, pT = 0, pI = 0, pM = 0, ahead = 0, swings = 0, low = 1, ended = false;
  ME._hit = 0;
  const close = () => { if (!cur) return; turns++; if (cur.merc && cur.merc.cls === SUB && !cur.dead) { ME.turns++; ME.moved += Math.hypot(cur.x - sx, cur.y - sy); const fo0 = rt.mons.filter(o => o.hp > 0 && o.aggro); if (fo0.length) ME.gap += Math.min(...fo0.map(o => Math.hypot(o.x - cur.x, o.y - cur.y))); }
    { const al = rt.party.filter(p => !p.dead), fo = rt.mons.filter(o => o.hp > 0 && o.aggro); if (al.length > 1 && fo.length) { const d = p => Math.min(...fo.map(o => Math.hypot(o.x - p.x, o.y - p.y))), fr = al.reduce((a, b) => (d(b) < d(a) ? b : a)); R.frontN = (R.frontN || 0) + 1; if (fr.def.range >= 2) R.frontRanged = (R.frontRanged || 0) + 1; if (fr.merc.cls === 'archmage') R.frontWiz = (R.frontWiz || 0) + 1; } } const d = Math.hypot(cur.x - sx, cur.y - sy); const mv = d >= 0.5; const did = acted.has(curKey); if (!did) idle++; if (mv) moved++; if (cur.kind !== 'mon') { pT++; if (!did) { pI++; const why = cur.dying || cur.dead ? 'idleDown' : mv ? 'idleWalk' : cur.stun > 0 || G.Dnd.out(cur) ? 'idleOut' : 'idleStill'; R[why] = (R[why] || 0) + 1; if (why === 'idleStill' && process.env.TRACE) { const fs = rt.mons.filter(o => o.hp > 0 && o.aggro), nd = fs.length ? Math.min(...fs.map(o => Math.hypot(o.x - cur.x, o.y - cur.y))) : -1; console.error(cur.merc.cls, T.of(cur).pos, 'r', rt.turn ? rt.turn.round : '-', 'near', nd.toFixed(1), 'rg', cur.def.range, 'broke', cur.broke || ''); } } if (mv) pM++; } };
  for (let t = 0; t < 6000; t++) {
    const had = rt.turn; G.Turn.run(f, rt, 0.1); secs += 0.1;
    const st = rt.turn;
    if (st && st.cur !== cur) { close(); cur = st.cur; curKey = keyOf(); if (cur) { sx = cur.x; sy = cur.y; } }
    const hp = F.partyHP(rt), a = hp.max ? hp.hp / hp.max : 0, fh = rt.mons.reduce((s, o) => s + Math.max(0, o.hp), 0), fm2 = rt.mons.reduce((s, o) => s + o.max, 0) || 1, g = a - fh / fm2 * 1; low = Math.min(low, a);
    const sign = Math.abs(g) < 0.1 ? 0 : Math.sign(g); if (sign && ahead && sign !== ahead) swings++; if (sign) ahead = sign;
    if (had && !rt.turn) { ended = true; R.rounds += had.round; R.downs += had.downs || 0; break; }
    if (lost) { ended = true; R.rounds += st ? st.round : 0; R.downs += st ? st.downs || 0 : 0; break; }
    if (!rt.party.some(p => !p.dead)) { lost = true; ended = true; R.rounds += st ? st.round : 0; R.downs += st ? st.downs || 0 : 0; break; }
  }
  close();
  const hp = F.partyHP(rt), end = hp.max ? hp.hp / hp.max : 0, won = !lost && ended && !rt.mons.some(o => o.hp > 0 && o.aggro), tot = [...dmgBy.values()].reduce((a, b) => a + b, 0), top = tot ? Math.max(...dmgBy.values()) / tot : 0;
  const downsNow = rt.party.filter(p => p.dying || p.dead).length;
  R.n++; R.win += won ? 1 : 0; R.loss += won ? 0 : 1; R.secs += secs; R.low += low; R.endHP += end; R.swings += swings; R.turns += turns; R.idle += idle; R.moved += moved; R.partyTurns += pT; R.partyIdle += pI; R.partyMoved += pM; R.deaths += deaths; R.skillKinds += kinds.size; R.topShare += top;
  if (won && low > 0.7) R.stomp++; if (won && (low < 0.35 || downsNow)) R.close++;
  if (secs > 90) R.longFight++; if (secs < 15) R.shortFight++;
  if (rt.turn) { G.Story.endFight(f, rt); rt.turn = null; }
  rt.phase = 'explore';
}
console.log(JSON.stringify({ ROW: process.env.ROW || '', ME, K: KK, crew: crewS, layout, preset, fac, fl: FL, lv: LV, ...R }));
