'use strict';
// 튜토리얼 오우거 벽 실험장: node test/wall_lab.js [오우거 수 = 1] [판수] [단장 직업,…]
// 첫 원정(단장 혼자) → 값 없는 동료 고용 → 재도전을 실제 흐름대로 돈다. 첫 원정은 못 이겨야 하고, 뽑은 뒤엔 이겨야 한다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const WN = +process.argv[2] || 1, N = +process.argv[3] || 20, CLS = (process.argv[4] || 'dragoon,rogue,mage,cleric').split(',');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, F = G.Fantasy, GD = G.Guild, ST = G.Story, T = G.Tut; G.quiet = false; T.WALL_N = WN;
const STUCK = 4000, stuck = [], ends = {};
{ const H0 = G.Exp.home; G.Exp.home = function (ff, rr, why) { if (ff.tut && ff.tut.run >= 2) { const w = rr.mons?.some(o => o.tutWall && o.hp > 0), k = `${ff.tut.run}회차 ${why}@${ff.floor}${w ? ' 오우거 생존' : ''}${ff.tut.ogreDown ? ' 처치됨' : ''}`; ends[k] = (ends[k] || 0) + 1; } return H0.apply(this, arguments); }; }
const pick = a => { const i = a.opts.findIndex(o => /내려간다|버틴다|끝까지/.test(o.label)); return i >= 0 ? i : a.def; };
function run(f) { // 원정 한 번: 마을로 돌아올 때까지
  const seen = { met: false, lv: 0 }; let t = 0;
  for (; t < STUCK && !f.town; t++) {
    const rt = F.rt(f);
    if (f.tut.ogreDown && !rt.turn) { G.Exp.home(f, rt, 'return'); break; } // 잡았으면 잰 것이다
    if (rt.ask) ST.answer(rt, pick(rt.ask));
    G.tick(0.1);
    const r2 = F.rt(f); if (!seen.met && r2.turn && r2.mons.some(o => o.tutWall && o.aggro)) { seen.met = true; seen.lv = GD.leader(f).lv; seen.n = r2.party.filter(p => !p.dead).length; }
  }
  seen.secs = t / 10;
  if (!f.town) { const r = F.rt(f); stuck.push({ fl: f.floor, run: f.tut.run, round: r.turn?.round, phase: r.phase, flow: r.flow?.st, scene: !!r.scene, ask: r.ask?.title, party: r.party.map(p => (p.dead ? 'X' : '') + Math.round(p.hp)).join(), foes: r.mons.filter(o => o.aggro).map(o => o.n).slice(0, 4).join(), cur: r.turn?.cur?.n || r.turn?.cur?.merc?.name }); G.Exp.home(f, r, 'manual'); }
  return seen;
}
for (const cls of CLS) {
  const R = { n: 0, r1kill: 0, r1back: 0, r1miss: 0, r1secs: 0, r2met: 0, r2kill: 0, r3kill: 0, never: 0, r2lv: 0, r2n: 0, dead: 0 };
  for (let i = 0; i < N; i++) {
    G.newState(); const f = G.S.w.fantasy, L = GD.leader(f); L.cls = cls; f.leaderNew = false; f.autoTr = true; f.mercs = []; const rt = F.rt(f); T.start(f, rt);
    const a = run(f); R.n++; R.r1secs += a.secs;
    if (f.tut.ogreDown) R.r1kill++; else if (f.tut.wallMet) R.r1back++; else R.r1miss++;
    let downAt = f.tut.ogreDown ? 1 : 0;
    for (let k = 2; k <= 3 && !downAt; k++) {
      const hired = []; const TV = GD.tavern(f); for (let j = TV.offers.length - 1; j >= 0; j--) if (TV.offers[j].tut) { GD.hire(f, j); hired.push(1); }
      if (f.tut.openTavern) f.tut.openTavern = false;
      for (const m of GD.crew(f)) m.inj = 0; // 신전에서 치료한 셈
      f.town = true; f.autoGo = false; G.Exp.depart(f, F.rt(f));
      const q = run(f); if (k === 2 && q.met) { R.r2met++; R.r2lv += q.lv; R.r2n += q.n; }
      if (f.tut.ogreDown) downAt = k;
    }
    if (downAt === 2) R.r2kill++; else if (downAt === 3) R.r3kill++; else if (!downAt) R.never++;
  }
  const pc = x => Math.round(x / R.n * 100) + '%';
  console.log(`오우거 ${WN} · ${cls} | 첫 원정: 처치 ${pc(R.r1kill)} 후퇴 ${pc(R.r1back)} 못 만남 ${pc(R.r1miss)} (${Math.round(R.r1secs / R.n)}초) | 뽑은 뒤: 2회차 처치 ${pc(R.r2kill)} 3회차 ${pc(R.r3kill)} 못 잡음 ${pc(R.never)}`);
}
if (stuck.length) { console.log(`멈춘 원정 ${stuck.length}`); for (const q of stuck.slice(0, 4)) console.log(' ', JSON.stringify(q)); }
console.log(Object.entries(ends).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
