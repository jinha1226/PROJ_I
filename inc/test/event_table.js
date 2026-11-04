'use strict';
// 사건별 선택지 비교표 (EVENT_SYSTEM_FOLLOWUPS.md 2.3): 실제 판정으로 N번씩 돌려 평균을 낸다. node test/event_table.js [N] [레벨] [--short]
// 금화는 그 층 몬스터 한 마리 값을 1로 잰다. 체력 손실은 사람당 평균 %. 스트레스는 사람당 평균.
const fs = require('fs'), vm = require('vm'), path = require('path'); const ROOT = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(ROOT + '/test/party_lab.js', 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(`${ROOT}/js/${n}.js`, 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, GD = G.Guild, F = G.Fantasy, E = G.Event, ST = G.Story; G.quiet = true; G.Foe.retreatOn = false;
const N = +process.argv[2] || 30, LV = +process.argv[3] || 8, drops = { n: 0 }, d0 = G.Trinket.drop; G.Trinket.drop = function () { drops.n++; }; ST.die = (f, r, p) => { p.dying = null; p.dead = true; };
function run(e, i) {
  G.newState(); const f = G.S.w.fantasy, L = GD.leader(f); f.leaderNew = false; f.autoTr = f.autoParty = f.autoGo = false; L.lv = LV; f.mercs = [L]; f.lineup = ['cleric', 'dragoon', 'archer'].map(c => { const m = GD.make(f, c, { lv: LV }); f.mercs.push(m); return m.uid; }); F.syncAllies(f);
  const s = G.Season.st(f); s.t = 0; f.policy = 'party'; f.retreat = 'wipe'; f.frontLock = Object.keys(G.D.F.factions).find(k => k !== 'swamp'); f.start = f.checkpoint = f.floor = f.maxFloor = LV; f.town = true; f.seasonEnd = false; f.townT = 99; f.carry = 100; f.sceneN = 1; f.recent = []; f.runs = 1;
  const rt = F.rt(f); G.Exp.depart(f, rt); for (let k = 0; k < 4 && !rt.flow; k++) G.tick(1, 0.25); rt.mons = []; rt.turn = null; f.runs = 5;
  if (e.chain && e.stage) f.ev.chains[e.chain] = { stage: e.stage, st: 'on', fl: 1, run: 1, flags: {}, who: {} };
  const ms = rt.party.filter(p => p.merc); for (const p of ms) { p.merc.stress = 40; p.hp = p.max; } const P = ms.slice(); if (e.subject === 'griever') P[0].merc.grief = { n: '옛 동료', left: 3 }; if (e.subject === 'hurt') P[0].hp = P[0].max * 0.35; if (e.subject === 'greedy') P[0].merc.pers = ['greedy'];
  const hp0 = P.reduce((a, p) => a + p.hp / p.max, 0), st0 = P.reduce((a, p) => a + p.merc.stress, 0), carry0 = f.carry, leg0 = f.legend || 0, heat0 = f.heat || 0; drops.n = 0;
  const r = rt.map.rooms[1]; r.ri = 1; G.quiet = false; f.askMeet = true; ST.play(f, rt, null, r, 'event', e); let n = 0, got = false;
  while (rt.scene && n++ < 400) { if (rt.ask) { const j = rt.ask.opts.findIndex(o => o.o === e.choices[i] || o.o.base0 === e.choices[i]); if (j < 0) { rt.ask = null; rt.scene = null; G.quiet = true; return null; } ST.answer(rt, j); got = true; } ST.tick(f, rt, 0.5); }
  G.quiet = true; const gu = F.monGold(f.floor) * F.goldMult(f);
  return { gold: (f.carry - carry0) / gu, relic: drops.n, hp: (hp0 - P.reduce((a, p) => a + Math.max(0, p.hp) / p.max, 0)) / P.length * 100, stress: (P.reduce((a, p) => a + (p.merc.stress || 0), 0) - st0) / P.length, foes: rt.mons.filter(o => o.aggro).length, heat: (f.heat || 0) - heat0, rush: !!rt.rush ? 1 : 0, wipe: rt.phase === 'dead' ? 1 : 0, ok: rt.roll && rt.roll.ok ? 1 : 0 };
}
const out = [];
for (const e of E.LIST.filter(q => q.choices)) { out.push(`\n${e.id} (${e.n})`); e.choices.forEach((o, i) => { if (o.x) { const a0 = E.hasX; E.hasX = () => ({ merc: {}, x: 0, y: 0 }); E.hasX = a0; } const sum = {}, keys = ['gold', 'relic', 'hp', 'stress', 'foes', 'heat', 'rush', 'wipe', 'ok']; let c = 0; for (let k = 0; k < N; k++) { const R = run(e, i); if (!R) continue; c++; for (const q of keys) sum[q] = (sum[q] || 0) + R[q]; } if (!c) { out.push(`  ${o.label}: (없음)`); return; } const a = q => sum[q] / c; out.push(`  ${o.label.padEnd(12, ' ')} 금화 ${a('gold').toFixed(1)} · 유물 ${a('relic').toFixed(2)} · 체력 ${a('hp') >= 0 ? '−' : '+'}${Math.abs(a('hp')).toFixed(0)}% · 스트레스 ${a('stress') >= 0 ? '+' : ''}${a('stress').toFixed(1)} · 적 ${a('foes').toFixed(1)} · 위험 ${a('heat').toFixed(1)}${a('wipe') ? ` · 전멸 ${Math.round(a('wipe') * 100)}%` : ''}${o.check ? ` · 성공 ${Math.round(a('ok') * 100)}%` : ''}`); }); }
console.log(out.join('\n'));
