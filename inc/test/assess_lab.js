'use strict';
// 승산 판단 실험장: node test/assess_lab.js [판수] [시드]
// 전투를 끝까지 돌려 경고가 맞았는지 잰다. 옛 규칙(old)과 지금 규칙(new)을 같은 전투에서 나란히 본다.
// 오경보 = 경고가 떴는데 아무도 죽지 않고 이긴 전투 · 놓침 = 경고 없이 진 전투
const fs = require('fs'), vm = require('vm'), path = require('path');
const N = +process.argv[2] || 40, seed = +process.argv[3] || 1;
const M = Object.create(Math); let s0 = seed * 7919 >>> 0;
M.random = () => { s0 = (s0 + 0x6D2B79F5) >>> 0; let t = s0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ctx = { console, Math: M, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, F = G.Fantasy, GD = G.Guild, RG = G.Region, FO = G.Foe; G.quiet = true;
const OLD_ROUND = 3, OLD_STALE = 8, OLD_K = 1.5;
function oldAssess(rt, st) {
  const pHP = rt.party.reduce((a, p) => a + (p.dead || p.dying ? 0 : p.hp), 0), fs = rt.mons.filter(o => o.aggro && !o.flee && o.hp > 0), mHP = fs.reduce((a, o) => a + o.hp, 0), h = st.histOld = st.histOld || [];
  h.push([pHP, mHP]); if (h.length > 3) h.shift();
  if (st.round < OLD_ROUND || h.length < 3 || !fs.length || fs.some(o => o.boss)) return false;
  const pLoss = (h[0][0] - pHP) / 2, mLoss = (h[0][1] - mHP) / 2;
  if (pLoss <= 0 && mLoss <= 0 && st.round >= OLD_STALE) return true;
  if (pLoss <= 0) return false;
  return mLoss <= 0 || mHP / mLoss > pHP / pLoss * OLD_K;
}
let oldHit = false, newHit = false, oldHP = 0, newHP = 0, lost = false, deaths = 0;
const hpNow = rt => { const q = F.partyHP(rt); return q.max ? q.hp / q.max : 0; };
const assess = FO.assess;
FO.assess = function (f, rt, st) { if (oldAssess(rt, st) && !oldHit) { oldHit = true; oldHP = hpNow(rt); } if (assess.call(this, f, rt, st) && !newHit) { newHit = true; newHP = hpNow(rt); } return false; }; // 끝까지 싸운다
G.Story.askBack = () => {}; G.Story.askRetreat = () => {};
G.Story.die = (f, rt, p) => { deaths++; p.dead = true; p.dying = null; }; G.Story.wipe = () => { lost = true; }; G.Exp.home = () => { lost = true; }; G.Exp.tick = () => {}; // 체력 귀환 방침은 끈다: 끝까지 싸운 결과를 본다

// [파티, 레벨, 예산 배수: 쉬움 0 · 보통 1 · 어려움 2, 어려움의 몇 배]
const CASES = [['cleric', 1, 0, 1], ['cleric', 1, 2, 1], ['cleric', 1, 2, 2], ['cleric,paladin,barbarian', 3, 1, 1], ['cleric,paladin,barbarian', 3, 2, 1], ['cleric,paladin,barbarian', 3, 2, 2], ['cleric,dragoon,archmage', 6, 1, 1], ['cleric,dragoon,archmage', 6, 2, 1], ['cleric,dragoon,archmage', 6, 2, 2]];
const zero = () => ({ n: 0, win: 0, clean: 0, oldW: 0, oldFalse: 0, oldLossW: 0, newW: 0, newFalse: 0, newLossW: 0, loss: 0, oldHP: 0, newHP: 0 });
const add = (a, b) => { for (const k in a) a[k] += b[k]; };
const pct = (a, b) => (b ? Math.round(a / b * 100) + '%' : '-');
const total = zero();
for (const [crewS, LV, diff, mul] of CASES) {
  const R = zero();
  G.newState(); const f = G.S.w.fantasy, L = GD.leader(f); f.leaderNew = false; f.autoTr = f.autoParty = false; f.askMeet = false; L.lv = LV;
  f.lineup = crewS.split(',').map(c => { const m = GD.make(f, c, { lv: LV }); f.mercs.push(m); return m.uid; }); F.syncAllies(f);
  f.front = f.frontLock = Object.keys(RG.REGIONS)[0]; f.floor = f.maxFloor = f.checkpoint = f.start = 3; f.town = true; f.townT = 99;
  const rt = F.rt(f); G.Exp.depart(f, rt);
  for (let i = 0; i < N; i++) {
    rt.flow = null; F.newFloor(f, rt); rt.flow = { st: 'fight', t: 0, map: rt.map };
    const m = rt.map, room = m.rooms.slice(1).sort((a, b) => b.w * b.h - a.w * a.h)[0] || m.rooms[0];
    rt.mons = []; rt.turn = null; rt.phase = 'explore'; rt.chests = []; rt.traps = []; rt.fields = []; rt.scene = null; rt.ask = null; rt.prompt = null; f.heat = 0; f.town = false;
    for (const p of rt.party) Object.assign(p, { hp: p.max, dead: false, dying: null, downed: false, raised: false, reviveT: 0, stun: 0, guard: false, surge: 0, thp: 0, pe: [], lastSk: null, broke: null, fleeT: 0 });
    G.Res.longRest(f.mercs.concat(L));
    const defs = RG.defs(RG.pick(RG.of(f), RG.budget(f, diff) * mul, 12));
    const cell = (x, y) => { for (let d = 0; d < 6; d++) for (let a = -d; a <= d; a++) for (let b = -d; b <= d; b++) if (m.c[(y + b) * m.w + x + a] === '.') return [x + a, y + b]; return [room.cx, room.cy]; };
    defs.forEach((x, j) => { const [a, b] = cell(room.x + room.w - 2, room.y + (j * 2) % Math.max(1, room.h)); F.spawnMon(rt, f.floor, x, a, b, false, { aggro: true, major: true, spotted: true }); });
    G.Tactics.snap(rt); for (const q of G.Tactics.deploy(rt, rt.hero, rt.mons[0])) { const e = q.path[q.path.length - 1]; if (e) { q.e.x = e.x; q.e.y = e.y; } } G.Tactics.snap(rt);
    oldHit = newHit = lost = false; deaths = 0; oldHP = newHP = 0; let ended = false;
    for (let t = 0; t < 6000 && !ended; t++) { const had = rt.turn; G.Turn.run(f, rt, 0.1); if ((had && !rt.turn) || lost || !rt.party.some(p => !p.dead)) ended = true; }
    const won = !lost && ended && !rt.mons.some(o => o.hp > 0 && o.aggro) && rt.party.some(p => !p.dead), clean = won && !deaths;
    R.n++; if (won) R.win++; else R.loss++; if (clean) R.clean++;
    if (oldHit) { R.oldW++; R.oldHP += oldHP; if (clean) R.oldFalse++; if (!won) R.oldLossW++; }
    if (newHit) { R.newW++; R.newHP += newHP; if (clean) R.newFalse++; if (!won) R.newLossW++; }
    if (rt.turn) { G.Story.endFight(f, rt); rt.turn = null; } rt.phase = 'explore';
  }
  add(total, R);
  console.log(`${crewS} Lv${LV} 난이도${diff}×${mul} | 승 ${pct(R.win, R.n)} | old 경고 ${pct(R.oldW, R.n)} 오경보 ${pct(R.oldFalse, R.oldW)} 놓침 ${pct(R.loss - R.oldLossW, R.loss)} | new 경고 ${pct(R.newW, R.n)} 오경보 ${pct(R.newFalse, R.newW)} 놓침 ${pct(R.loss - R.newLossW, R.loss)}`);
}
const R = total;
console.log(`합계 ${R.n}판 · 승 ${pct(R.win, R.n)} · 무사 승 ${pct(R.clean, R.n)}`);
console.log(`이길 전투에 뜬 경고: old ${pct(R.oldFalse, R.clean)} · new ${pct(R.newFalse, R.clean)}`);
console.log(`old: 경고 ${R.oldW}판 · 오경보 ${pct(R.oldFalse, R.oldW)} · 진 전투 놓침 ${pct(R.loss - R.oldLossW, R.loss)} · 경고 때 체력 ${pct(R.oldHP, R.oldW)}`);
console.log(`new: 경고 ${R.newW}판 · 오경보 ${pct(R.newFalse, R.newW)} · 진 전투 놓침 ${pct(R.loss - R.newLossW, R.loss)} · 경고 때 체력 ${pct(R.newHP, R.newW)}`);
