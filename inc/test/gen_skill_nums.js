'use strict';
// 기술 수치표 만들기: node test/gen_skill_nums.js → js/skill_nums.js
// 설명을 손으로 옮기지 않는다. 실제 기술 코드를 돌려 굴린 주사위 · 내성 · 상태를 기록하므로, 코드를 고치면 다시 돌리면 된다.
const fs = require('fs'), vm = require('vm'), path = require('path'); const ROOT = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(ROOT + '/test/party_lab.js', 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) if (n !== 'skill_nums') vm.runInContext(fs.readFileSync(`${ROOT}/js/${n}.js`, 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, D = G.D, GD = G.Guild, F = G.Fantasy, DN = G.Dnd; G.quiet = true; G.Foe.retreatOn = false;
const LEVELS = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 20];
const classOf = k => { for (const c in D.MPOOL) if (D.MPOOL[c].includes(k)) return c; const L = D.MSKILLS[k]?.lv; if (L && typeof L === 'object') return Object.keys(L)[0]; for (const a in D.ADV) if (D.ADV[a].sig?.includes(k)) return D.ADV[a].base; return null; };
function fixture(cls, lv, many) {
  G.newState(); const f = G.S.w.fantasy, L = GD.leader(f); f.leaderNew = false; f.autoTr = false; f.autoParty = false; L.lv = lv; const c = GD.make(f, cls, { lv }), o2 = GD.make(f, 'dragoon', { lv }); f.mercs.push(c, o2); f.lineup = [c.uid, o2.uid]; F.syncAllies(f); f.frontLock = Object.keys(D.F.factions).find(k => k !== 'swamp'); f.floor = f.maxFloor = f.checkpoint = f.start = 6; f.town = true; f.townT = 99; G.Exp.depart(f, F.rt(f));
  const rt = F.rt(f), m = rt.map, best = m.rooms.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a)), a = rt.party.find(p => p.merc === c), others = rt.party.filter(p => p !== a); rt.mons = []; rt.chests = []; rt.seen.fill(1); a.x = best.cx; a.y = best.cy; others.forEach((p, i) => { p.x = best.cx - 1 - i; p.y = best.cy; }); others[0].hp = others[0].max * 0.3; a.hp = a.max * 0.3;
  const band = D.F.bands[F.band(6)].mons, ds = many ? [[1, 0], [1, 1], [2, 1], [3, 0], [2, -1]] : [[1, 0]]; ds.forEach(([x, y], i) => F.spawnMon(rt, 6, band[i % band.length], best.cx + x, best.cy + y, false, { aggro: true, spotted: true, major: true, hp: 1e7, max: 1e7 })); F.refreshEnts(rt); rt.turn = { map: m, round: 1, order: [], i: 0, cur: a, ph: 'wait', t: 1, low: 1, downs: 0 };
  return { f, rt, a };
}
const d0 = DN.dice, s0 = DN.saveRoll, g0 = DN.give, d20 = DN.d20, h0 = F.hurt, act0 = GD.active; let rec = null;
DN.dice = (n, d) => { if (rec && n > 0 && d > 0) rec.dice.push(`${n}d${d}`); return n * (d + 1) / 2; };
DN.d20 = () => 17;
DN.saveRoll = function (tg, k, dc) { if (rec && tg.kind === 'mon') { rec.sv = rec.sv || k; return false; } return s0.apply(this, arguments); };
DN.give = function (rt, e, k) { if (rec && e.kind === 'mon') rec.c.add(k); return g0.apply(this, arguments); };
F.hurt = function (f, rt, m, dmg, src, by) { if (rec && m.kind === 'mon' && G.Foe.dtype) rec.t = rec.t || G.Foe.dtype; return h0.apply(this, arguments); };
function once(k, cls, lv, many) {
  let X; try { X = fixture(cls, lv, many); } catch (e) { return null; } const { f, rt, a } = X, S = G.Skill.SK[k]; GD.active = () => [k]; rec = { dice: [], sv: null, c: new Set(), t: null };
  try { const seen = rt.mons.slice(); a.lastBonus = null; a.slotUsed = false; G.Skill.tick(f, rt, a, 0, seen, 'free'); G.Skill.tick(f, rt, a, 0, seen); a.slotUsed = false; G.Skill.tick(f, rt, a, 0, seen, true); if (S?.rider && seen[0]) { a.lastBonus = null; a.slotUsed = false; a.lastHitSk = null; G.Skill.onHit(f, rt, a, seen[0]); } } catch (e) { rec.err = e.message; }
  const r = rec; rec = null; GD.active = act0; return r;
}
const out = {}; let n = 0; const none = [];
for (const k of Object.keys(G.Skill.SK)) {
  const L0 = D.MSKILLS[k]?.lv, S = G.Skill.SK[k], classes = L0 && typeof L0 === 'object' ? Object.keys(L0) : [classOf(k) || 'archmage'], per = {};
  for (const cls of classes) {
    const entries = []; let last = ''; const min = GD.skLv(cls, k);
    for (const lv of LEVELS) { if (lv < min) continue; let many = false, r = once(k, cls, lv, false); if (!r || (!r.dice.length && !r.sv && !r.c.size)) { many = true; r = once(k, cls, lv, true) || r; } if (!r) continue; const cnt = {}; for (const x of r.dice) cnt[x] = (cnt[x] || 0) + 1; const dice = Object.entries(cnt).map(([x, c]) => (c > 1 && !many && !S.heal ? `${c}×${x}` : x)).join(' + '), e = {}; if (dice) e.d = dice; if (r.t) e.t = r.t; if (r.sv) e.sv = r.sv; if (r.c.size) e.c = [...r.c]; const j = JSON.stringify(e); if (j !== '{}' && j !== last) { entries.push([lv, e]); last = j; } }
    if (entries.length) per[cls] = entries;
  }
  const vals = Object.values(per); if (!vals.length) { none.push(k); continue; } n++; const same = vals.every(v => JSON.stringify(v) === JSON.stringify(vals[0])) && vals.length === classes.length; out[k] = same ? { '*': vals[0] } : per;
}
fs.writeFileSync(`${ROOT}/js/skill_nums.js`, `'use strict';\n// test/gen_skill_nums.js가 만든다. 손으로 고치지 않는다. { 기술: { 직업 또는 *: [[레벨부터, { d: 주사위, t: 피해 종류, sv: 내성, c: 상태 }]] } }. 고정 수정치는 들어 있지 않다\nG.SkillNum = ${JSON.stringify(out)};\nG.SkillNum_at = (k, cls, lv) => { const P = G.SkillNum[k]; if (!P) return null; const L = P['*'] || P[cls] || Object.values(P)[0]; let e = L[0][1]; for (const q of L) if (q[0] <= lv) e = q[1]; return e; };\n`);
console.log(`수치 있음 ${n} · 없음 ${none.length}`);
for (const k of ['sr_fireball', 'sr_mm', 'sr_mhw', 'sr_rof', 'sr_hword', 'sr_meteor', 'sr_smite', 'sr_hold']) console.log(k, JSON.stringify(out[k])?.slice(0, 220));
