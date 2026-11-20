'use strict';
// 기술 효과표 만들기: node test/gen_skill_eff.js → js/rules/skill_eff.js
// 스킬 AI가 기술마다 계산식을 따로 두지 않게 (2026-11-20), 실제 기술 코드를 돌려 "무엇을 했나"를 효과 항목으로 기록한다. 코드를 고치면 다시 돌린다.
//   buf  : [{ to: self | ally | foe, k: 버프 이름, r: 라운드, p: { hit · hitD · dmgB · adv · extraAtk · ac · hitDis · hitAdv · saveD · inspD … } }] — DN.buff 호출
//   heal : 회복량 (SRD 체력 단위, 가장 많이 받은 한 사람) · healN: 회복한 사람 수 · healSelf: 자기만
//   atk  : 덧붙은 공격 수 (행동 쇄도처럼 기본 공격을 한 번 더)
//   hit  : 쓰고 나서 한 번 더 쳐 보면 늘어나는 주사위 (헥스 · 사냥꾼의 표식처럼 맞을 때 붙는 것) — "1d6"
//   tick : 한 라운드 흘려 보면 굴리는 주사위 (영적 무기 · 영혼 수호자처럼 라운드마다) — "3d8"
//   sum  : 불러낸 생물 { n: 수, d: 한 마리의 라운드당 공격 주사위 합 (SRD), hp }
//   self : 그 사람에게 새로 붙은 표시 (images 등 — 효과표로 값을 못 매기는 것을 가린다)
// 피해 주사위 · 내성 · 상태 이상은 skill_nums.js(test/gen_skill_nums.js)에 있다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const LOAD = require('./_load.js');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
for (const n of LOAD.NAMES.game) if (n !== 'skill_eff') vm.runInContext(fs.readFileSync(LOAD.jsPath(n), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, D = G.D, GD = G.Guild, F = G.Fantasy, DN = G.Dnd; G.quiet = true; G.Foe.retreatOn = false;
if (G.SkillAI) G.SkillAI.rank = list => list.slice(); // 기록할 때는 AI의 판단을 끈다 (값이 낮다고 안 쓰면 효과가 안 잡힌다)
const LEVELS = [1, 5, 9, 13, 17], R = G.Res_ROUND;
const classOf = k => { for (const c in D.MPOOL) if (D.MPOOL[c].includes(k)) return c; const L = D.MSKILLS[k]?.lv; if (L && typeof L === 'object') return Object.keys(L)[0]; for (const a in D.ADV) if (D.ADV[a].sig?.includes(k)) return D.ADV[a].base; return null; };
// 방 하나: 시전자 · 아군 셋(단장 파이터 · 로그 · 클레릭 — 축복처럼 셋에게 거는 것이 다 잡히게, 모두 다친) · 큰 체력의 적 셋. 시전자도 다쳐 있다 (회복 기술이 쓰이게)
let world = null;
function fixture(cls, lv) {
  if (!world) { G.newState(); const f = G.S.w.fantasy; f.leaderNew = false; f.autoTr = false; f.autoParty = false; f.frontLock = Object.keys(D.F.factions).find(k => k !== 'swamp'); f.floor = f.maxFloor = f.checkpoint = f.start = 6; f.town = true; G.Exp.depart(f, F.rt(f)); world = true; }
  const f = G.S.w.fantasy; f.mercs.length = 0; const c = GD.make(f, cls, { lv }), mates = ['rogue', 'cleric'].map(q => GD.make(f, q, { lv })); f.mercs.push(c, ...mates); f.lineup = [c, ...mates].map(m => m.uid); f.town = true; F.syncAllies(f); f.town = false;
  const rt = F.rt(f), m = rt.map, best = m.rooms.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a)), a = rt.party.find(p => p.merc === c) || (() => { throw new Error(`시전자가 출전에 없다 — lineup ${JSON.stringify(f.lineup)} party ${rt.party.map(p => p.merc?.uid).join(',')} c ${c.uid} mercs ${f.mercs.length}`); })(), others = rt.party.filter(p => p !== a && p.merc);
  rt.party = [a, ...others]; rt.mons = []; rt.chests = []; rt.fields = []; rt.sums = []; rt.seen.fill(1); a.x = best.cx; a.y = best.cy; a.pe = []; a.concK = null; a.images = 0;
  others.forEach((p, i) => { p.x = best.cx - 1 - i; p.y = best.cy; p.hp = 1; }); a.hp = a.max * 0.45; // 아군은 체력 1 (치유량이 모자란 체력에 잘리지 않게) · 시전자는 절반 아래지만 덜 다쳐 있다 — 아군에게 쓰는 치유는 아군에게, 자기만 쓰는 치유(재기)도 잡히게
  const band = D.F.bands[F.band(6)].mons; [[1, 0], [1, 1], [2, 1]].forEach(([x, y], i) => F.spawnMon(rt, 6, band[i % band.length], best.cx + x, best.cy + y, false, { aggro: true, spotted: true, major: true, hp: 1e7, max: 1e7 }));
  F.refreshEnts(rt); rt.turn = { map: m, round: 1, order: [], i: 0, cur: a, ph: 'wait', t: 1, low: 1, downs: 0 }; G.Res.long(c);
  return { f, rt, a };
}
// 기록 장치
const dice0 = DN.dice, buff0 = DN.buff, at0 = F.allyAttack, act0 = GD.active; let rec = null, dlog = null;
DN.dice = (n, d) => { if (dlog && n > 0 && d > 0) dlog.push(`${n}d${d}`); return n * (d + 1) / 2; };
DN.d20 = () => 17; // 늘 맞는다 (공격에 붙는 것을 재려고)
DN.buff = function (e, k, t, props) { if (rec && t > 0) rec.buf.push({ to: e === rec.a ? 'self' : e.kind === 'mon' ? 'foe' : 'ally', k, r: Math.round(t / R), p: props || {} }); return buff0.apply(this, arguments); };
F.allyAttack = function (f, rt, a) { if (rec && a === rec.a && !rec.probe) rec.atk++; return at0.apply(this, arguments); };
// 한 번 쳐 볼 때 굴린 주사위 (기본 공격 한 번)
function probeHit(f, rt, a) { dlog = []; rec && (rec.probe = true); try { at0.call(F, f, rt, a, rt.mons[0]); } catch (e) { /* 못 치면 없다 */ } rec && (rec.probe = false); const L = dlog; dlog = null; return L; }
const minus = (A, B) => { const b = B.slice(); return A.filter(x => { const i = b.indexOf(x); if (i >= 0) { b.splice(i, 1); return false; } return true; }); };
function once(k, cls, lv) {
  let X; try { X = fixture(cls, lv); } catch (e) { if (!once.err) { once.err = 1; console.log("fixture 오류:", cls, lv, e.stack.split("\n").slice(0, 3).join(" | ")); } return null; } const { f, rt, a } = X, S = G.Skill.SK[k];
  const base = probeHit(f, rt, a); // 기술 없이 한 번 칠 때
  for (const o of rt.mons) o.hp = o.max; a.lastHitSk = null; a.hit1Done = false;
  const hp0 = rt.party.map(p => p.hp), keys0 = new Set(Object.keys(a)), sum0 = (rt.sums || []).length; GD.active = () => [k];
  rec = { a, buf: [], atk: 0, probe: false }; let used = false;
  try { const seen = rt.mons.slice(); a.lastBonus = null; a.slotUsed = false; a.lastSk = null; a.freeDone = null;
    G.Skill.tick(f, rt, a, 0, seen, 'free'); G.Skill.tick(f, rt, a, 0, seen); a.slotUsed = false; G.Skill.tick(f, rt, a, 0, seen, true);
    used = a.lastSk === k || a.lastBonus === k || !!a.freeDone?.[k]; } catch (e) { rec.err = e.message; }
  GD.active = act0;
  const r = rec; rec = null; if (!used) return null;
  // 회복 (SRD 체력 단위)
  let heal = 0, healN = 0, healSelf = false; rt.party.forEach((p, i) => { const d = p.hp - hp0[i]; if (d > 0.5) { healN++; if (p === a) healSelf = true; heal = Math.max(heal, d * Math.max(1, DN.srdHP(p.merc)) / p.max); } });
  // 쓰고 나서 한 번 더 쳐 보기 · 한 라운드 흘려 보기
  for (const o of rt.mons) o.hp = o.max; a.lastHitSk = null; a.hit1Done = false;
  const after = probeHit(f, rt, a), hitD = minus(after, base);
  dlog = []; try { G.Skill.persist?.(f, rt, a, R); } catch (e) { /* 지속 효과 없음 */ } const tick = dlog; dlog = null;
  const sums = (rt.sums || []).slice(sum0), avgAtk = e => { let d = 0; try { for (const q of G.Foe.attacks(e) || []) d += (q.n || 1) * ((q.d || 4) + 1) / 2 + (q.b || 0); } catch (er) { d = 0; } return d; };
  const self = [...Object.keys(a)].filter(q => !keys0.has(q) && /images|form|wild|ward/.test(q));
  const out = {};
  if (r.buf.length) out.buf = r.buf.map(b => ({ to: b.to, k: b.k, r: b.r, p: b.p }));
  if (heal) { out.heal = Math.round(heal); out.healN = healN; if (healSelf && healN === 1) out.healSelf = 1; }
  if (r.atk) out.atk = r.atk;
  if (hitD.length) out.hit = hitD.join('+');
  if (tick.length) out.tick = tick.join('+');
  if (sums.length) out.sum = { n: sums.length, d: Math.round(avgAtk(sums[0]) * 10) / 10, hp: Math.round(sums[0].max || sums[0].hp || 0) };
  if (self.length) out.self = self;
  return out;
}
const out = {}; let n = 0; const none = [];
const skip = k => !G.Skill.SK[k]?.run || D.MSKILLS[k]?.explore || /^u_/.test(k);
for (const k of Object.keys(G.Skill.SK)) {
  if (skip(k)) continue;
  const L0 = D.MSKILLS[k]?.lv, classes = L0 && typeof L0 === 'object' ? Object.keys(L0).filter(c => D.MPOOL[c]) : [classOf(k) || 'archmage'], per = {};
  for (const cls of classes.length ? classes : ['archmage']) {
    const entries = []; let last = ''; const min = GD.skLv(cls, k);
    for (const lv of LEVELS) { if (lv < min) continue; const e = once(k, cls, lv); if (!e || !Object.keys(e).length) continue; const j = JSON.stringify(e); if (j !== last) { entries.push([lv, e]); last = j; } }
    if (entries.length) per[cls] = entries;
  }
  const vals = Object.values(per); if (!vals.length) { none.push(k); continue; } n++;
  const same = vals.every(v => JSON.stringify(v) === JSON.stringify(vals[0])); out[k] = same ? { '*': vals[0] } : per;
}
fs.writeFileSync(LOAD.jsPath('skill_eff'), `'use strict';\n// test/gen_skill_eff.js가 만든다. 손으로 고치지 않는다. { 기술: { 직업 또는 *: [[레벨부터, 효과]] } } — 효과 항목은 그 파일 머리말\nG.SkillEff = ${JSON.stringify(out)};\nG.SkillEff_at = (k, cls, lv) => { const P = G.SkillEff[k]; if (!P) return null; const L = P[cls] || P['*'] || Object.values(P)[0]; let e = null; for (const [l, v] of L) if (lv >= l) e = v; return e || L[0][1]; };\n`);
console.log(`효과 있음 ${n} · 없음 ${none.length}`);
for (const k of ['sr_rage', 'sr_bless', 'sr_hex', 'sr_haste', 'sr_sweapon', 'sr_guard', 'sr_lay', 'sr_surge', 'sr_reckless', 'sp_mirror_image']) console.log(k, JSON.stringify(out[k])?.slice(0, 240));
