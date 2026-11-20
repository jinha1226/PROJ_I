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
//   cond : [{ c: 상태, ab: 내성, r: 라운드, n: 걸린 적 수 }] — 적에게 건 상태 이상 (내성은 다 실패한다고 보고 잰다). 감속(shock)은 'slowed'
//   only : 'undead' — 언데드에게만 쓰인다 (보통 적에게는 안 쓰여 언데드로 다시 재었다)
//   dmg  : 그 기술로 적에게 준 피해 (SRD 체력 단위, 다 맞았을 때 — 행동으로 쓰는 무기 기술은 보통 공격 행동보다 더 준 몫) · wpn: 그 기술 안에서 한 무기 공격 수 (무기 공격에 효과가 붙는 기술 — 기절 타격 · 연타 · 교활한 일격)
//   move : 'away' | 'to' — 시전자가 가장 가까운 적에게서 멀어졌다 / 다가갔다 (안개 걸음 · 바람의 발걸음 · 교활한 행동)
//   img  : 분신 수 · thp: 임시 체력 (SRD) · field: { r, d } 자리 장판 · dark: 어둠의 반지름
// 피해 주사위 · 내성 · 상태 이상은 skill_nums.js(test/gen_skill_nums.js)에 있다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const LOAD = require('./_load.js');
// 무작위를 고정한다 (기술마다 같은 씨앗에서 — 다시 돌려도 같은 표가 나오게)
const M = Object.create(Math); let s0 = 1; const seed = n => { s0 = n * 7919 >>> 0; };
M.random = () => { s0 = (s0 + 0x6D2B79F5) >>> 0; let x = s0; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const ctx = { console, Math: M, JSON, Date, btoa, atob }; vm.createContext(ctx);
for (const n of LOAD.NAMES.game) if (n !== 'skill_eff') vm.runInContext(fs.readFileSync(LOAD.jsPath(n), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, D = G.D, GD = G.Guild, F = G.Fantasy, DN = G.Dnd; G.quiet = true; G.Foe.retreatOn = false;
if (G.SkillAI) G.SkillAI.rank = list => list.slice(); // 기록할 때는 AI의 판단을 끈다 (값이 낮다고 안 쓰면 효과가 안 잡힌다)
const LEVELS = [1, 5, 9, 13, 17, 20], R = G.Res_ROUND;
const SPELL = new Set(Object.values(G.SRD_SP).map(o => o.en)), isSpell = k => SPELL.has(D.MSKILLS[k]?.en); // 주문의 명중 굴림은 무기 공격이 아니다
const classOf = k => { for (const c in D.MPOOL) if (D.MPOOL[c].includes(k)) return c; const L = D.MSKILLS[k]?.lv; if (L && typeof L === 'object') return Object.keys(L)[0]; for (const a in D.ADV) if (D.ADV[a].sig?.includes(k)) return D.ADV[a].base; return null; };
// 방 하나: 시전자 · 아군 셋(단장 파이터 · 로그 · 클레릭 — 축복처럼 셋에게 거는 것이 다 잡히게, 모두 다친) · 큰 체력의 적 셋. 시전자도 다쳐 있다 (회복 기술이 쓰이게)
let world = null;
function fixture(cls, lv, undead) {
  if (!world) { G.newState(); const f = G.S.w.fantasy; f.leaderNew = false; f.autoTr = false; f.autoParty = false; f.frontLock = Object.keys(D.F.factions).find(k => k !== 'swamp'); f.floor = f.maxFloor = f.checkpoint = f.start = 6; f.town = true; G.Exp.depart(f, F.rt(f)); world = true; }
  const f = G.S.w.fantasy; f.mercs.length = 0; const c = GD.make(f, cls, { lv }), mates = ['rogue', 'cleric'].map(q => GD.make(f, q, { lv })); f.mercs.push(c, ...mates); f.lineup = [c, ...mates].map(m => m.uid); f.town = true; F.syncAllies(f); f.town = false;
  const rt = F.rt(f), m = rt.map, best = m.rooms.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a)), a = rt.party.find(p => p.merc === c) || (() => { throw new Error(`시전자가 출전에 없다 — lineup ${JSON.stringify(f.lineup)} party ${rt.party.map(p => p.merc?.uid).join(',')} c ${c.uid} mercs ${f.mercs.length}`); })(), others = rt.party.filter(p => p !== a && p.merc);
  rt.party = [a, ...others]; rt.mons = []; rt.chests = []; rt.fields = []; rt.sums = []; rt.seen.fill(1); a.x = best.cx; a.y = best.cy; a.pe = []; a.concK = null; a.images = 0;
  others.forEach((p, i) => { p.x = best.cx - 1 - i; p.y = best.cy; p.hp = 1; }); a.hp = a.max * 0.45; // 아군은 체력 1 (치유량이 모자란 체력에 잘리지 않게) · 시전자는 절반 아래지만 덜 다쳐 있다 — 아군에게 쓰는 치유는 아군에게, 자기만 쓰는 치유(재기)도 잡히게
  const band = D.F.bands[F.band(6)].mons; [[1, 0], [1, 1], [2, 1]].forEach(([x, y], i) => F.spawnMon(rt, 6, band[i % band.length], best.cx + x, best.cy + y, false, { aggro: true, spotted: true, major: true, hp: 1e7, max: 1e7 }));
  { const ft = others.find(p => p.merc?.cls === 'dragoon') || others[0]; if (ft) { ft.x = best.cx + 1; ft.y = best.cy - 1; } } // 근접 아군 하나는 첫 적 곁에 (보통의 전투 — 기습이 이미 붙는다) · 시전자의 손 닿는 곳 (치유가 그에게 가게)
  if (undead === 'undead') rt.mons.forEach(o => { o.ty = 'undead'; if (o.stat) o.stat = { ...o.stat, ty: 'undead' }; });
  F.refreshEnts(rt); rt.turn = { map: m, round: 1, order: [], i: 0, cur: a, ph: 'wait', t: 1, low: 1, downs: 0 }; G.Res.long(c);
  // 상황이 맞아야 쓰이는 기술을 재는 장면 (기본 장면에서 안 쓰였을 때만): far = 적이 멀다 · low = 다쳐서 적에게 붙어 있다 · dry = 주문 슬롯을 다 썼다 · reck = 무모한 공격 중
  if (undead === 'far') rt.mons.forEach(o => { o.x += 4; });
  if (undead === 'low') a.hp = a.max * 0.3;
  if (undead === 'dry') G.Res.of(c).sl = new Array(9).fill(99);
  if (undead === 'reck') DN.buff(a, 'reckless', R, { adv: 1, hitAdv: 1 });
  return { f, rt, a };
}
// 기록 장치
const dice0 = DN.dice, buff0 = DN.buff, at0 = F.allyAttack, act0 = GD.active; let rec = null, dlog = null;
DN.dice = (n, d) => { if (dlog && n > 0 && d > 0) dlog.push(`${n}d${d}`); return n * (d + 1) / 2; };
DN.d20 = () => 17; // 늘 맞는다 (공격에 붙는 것을 재려고)
DN.buff = function (e, k, t, props) { if (rec && t > 0) rec.buf.push({ to: e === rec.a ? 'self' : e.kind === 'mon' ? 'foe' : 'ally', k, r: Math.round(t / R), p: props || {} }); return buff0.apply(this, arguments); };
F.allyAttack = function (f, rt, a) { if (rec && a === rec.a && !rec.probe) rec.atk++; return at0.apply(this, arguments); };
const give0 = DN.give, sr0 = DN.saveRoll, atk0 = DN.attack, hurt0 = F.hurt;
DN.give = function (rt, e, k, t) { if (rec && !rec.probe && e.kind === 'mon' && t > 0) rec.cond.push({ c: k, e, t }); return give0.apply(this, arguments); };
DN.saveRoll = function (tg, k) { if (rec && !rec.probe && tg.kind === 'mon') { rec.ab.set(tg, k); return false; } return sr0.apply(this, arguments); }; // 적은 내성에 다 실패한다 (걸리는 효과를 재려고)
DN.attack = function (att) { if (rec && !rec.probe && att === rec.a && !rec.spell) rec.wpn++; return atk0.apply(this, arguments); };
let PROBE = 0; F.hurt = function (f, rt, m, dmg, src, by) { if (m.kind === 'mon' && dmg > 0) { if (PROBE) PROBE.d += dmg; else if (rec && !rec.probe) rec.dmg += dmg; } return hurt0.apply(this, arguments); };
// 한 번 쳐 볼 때 굴린 주사위 (기본 공격 한 번)
function probeHit(f, rt, a) { dlog = []; rec && (rec.probe = true); PROBE = { d: 0 }; try { at0.call(F, f, rt, a, rt.mons[0]); } catch (e) { /* 못 치면 없다 */ } probeHit.d = PROBE.d; PROBE = 0; rec && (rec.probe = false); const L = dlog; dlog = null; return L; }
const minus = (A, B) => { const b = B.slice(); return A.filter(x => { const i = b.indexOf(x); if (i >= 0) { b.splice(i, 1); return false; } return true; }); };
function once(k, cls, lv, undead) {
  seed(lv * 31 + k.length);
  let X; try { X = fixture(cls, lv, undead); } catch (e) { if (!once.err) { once.err = 1; console.log("fixture 오류:", cls, lv, e.stack.split("\n").slice(0, 3).join(" | ")); } return null; } const { f, rt, a } = X, S = G.Skill.SK[k];
  const base = probeHit(f, rt, a); // 기술 없이 한 번 칠 때
  // 보통 무기 공격 행동의 피해 — 무기 기술과 같은 길(H.weaponAtk)로 친다 (기습 같은 턴에 한 번짜리는 쓰고 나서 되돌린다). 행동으로 쓰는 무기 기술은 이것보다 더 준 몫만 센다
  let plain = 0; { const snap = { ...a }; PROBE = { d: 0 }; try { G.Skill.H.weaponAtk({ f, rt, c: a, seen: rt.mons.slice() }, a, rt.mons[0]); } catch (e) { /* 못 친다 */ } plain = PROBE.d; PROBE = 0; for (const q of Object.keys(a)) if (!(q in snap)) delete a[q]; Object.assign(a, snap); }
  for (const o of rt.mons) o.hp = o.max; a.lastHitSk = null; a.hit1Done = false;
  const hp0 = rt.party.map(p => p.hp), keys0 = new Set(Object.keys(a)), sum0 = (rt.sums || []).length; GD.active = () => [k];
  const near0 = () => Math.min(...rt.mons.map(o => Math.hypot(o.x - a.x, o.y - a.y))), d0 = near0(), ax = a.x, ay = a.y, foe0 = rt.mons.map(o => [o.stun || 0, o.stop || 0, o.shock || 0]), img0 = a.images || 0, fleet0 = a.fleetN, dash0 = a.dashNo, thp0 = a.thp || 0, fl0 = rt.fields.length, dk0 = (rt.darks || []).length;
  rec = { a, buf: [], atk: 0, probe: false, cond: [], ab: new Map(), wpn: 0, dmg: 0, spell: isSpell(k) }; let used = false;
  try { const seen = rt.mons.slice(); a.lastBonus = null; a.slotUsed = false; a.lastSk = null; a.freeDone = null;
    G.Skill.tick(f, rt, a, 0, seen, 'free'); G.Skill.tick(f, rt, a, 0, seen); a.slotUsed = false; G.Skill.tick(f, rt, a, 0, seen, true);
    used = a.lastSk === k || a.lastBonus === k || !!a.freeDone?.[k]; } catch (e) { rec.err = e.message; }
  GD.active = act0;
  const r = rec; rec = null; if (!used) return null;
  const foe1 = rt.mons.map(o => [o.stun || 0, o.stop || 0, o.shock || 0]); // 쓰자마자 (뒤의 시험 공격 · 라운드 흘리기로 풀리기 전에)
  // 회복 (SRD 체력 단위)
  let heal = 0, healN = 0, healSelf = false; rt.party.forEach((p, i) => { const d = p.hp - hp0[i]; if (d > 0.5) { healN++; if (p === a) healSelf = true; heal = Math.max(heal, d * Math.max(1, DN.srdHP(p.merc)) / p.max); } });
  // 쓰고 나서 한 번 더 쳐 보기 · 한 라운드 흘려 보기
  for (const o of rt.mons) o.hp = o.max; a.lastHitSk = null; a.hit1Done = false;
  const after = probeHit(f, rt, a), hitD = minus(after, base);
  dlog = []; try { G.Skill.persist?.(f, rt, a, R); } catch (e) { /* 지속 효과 없음 */ } const tick = dlog; dlog = null;
  const sums = (rt.sums || []).slice(sum0), avgAtk = e => { let d = 0; try { for (const q of G.Foe.attacks(e) || []) d += (q.n || 1) * ((q.d || 4) + 1) / 2 + (q.b || 0); } catch (er) { d = 0; } return d; };
  const self = [...Object.keys(a)].filter(q => !keys0.has(q) && /images|form|wild|ward/.test(q));
  const out = {};
  // 상태 이상: 엔진이 give를 거치지 않고 거는 것(기절 · 마비 · 감속)은 적의 값이 늘었나로
  rt.mons.forEach((o, i) => { const [s0, p0, k0] = foe0[i], [s1, p1, k1] = foe1[i]; if (s1 > s0) r.cond.push({ c: 'stunned', e: o, t: s1 - s0 }); if (p1 > p0) r.cond.push({ c: 'paralyzed', e: o, t: p1 - p0 }); if (k1 > k0) r.cond.push({ c: 'slowed', e: o, t: R * 10 }); });
  const cs = {}; for (const q of r.cond) { const g = cs[q.c] || (cs[q.c] = { c: q.c, ab: r.ab.get(q.e) || null, r: Math.max(1, Math.round(q.t / R)), es: new Set() }); g.es.add(q.e); if (!g.ab) g.ab = r.ab.get(q.e) || null; if (q.e.koHit || q.e.endOnDmg?.includes(q.c)) g.r = 1; } // 맞으면 풀리는 것(기절시키기 · 언데드 퇴치)은 한 라운드로 본다
  if (Object.keys(cs).length) out.cond = Object.values(cs).map(g => ({ c: g.c, ab: g.ab, r: g.r, n: g.es.size }));
  if (undead === 'undead') out.only = 'undead';
  const g0 = G.Skill.H.G0({ f, rt }, a) || 1; const extra = r.wpn && !S.bonus ? r.dmg - plain : r.dmg; if (Math.abs(extra) > 0.05 * g0) out.dmg = Math.round(extra / g0 * 10) / 10; if (r.wpn) out.wpn = r.wpn;
  const moved = Math.hypot(a.x - ax, a.y - ay), dd = near0() - d0; if (moved > 1) { if (dd > 0.5) out.move = 'away'; else if (dd < -0.5) out.move = 'to'; }
  if (!out.move && a.fleetN !== fleet0) out.move = 'away'; if (!out.move && a.dashNo !== dash0) out.move = 'to'; // 물러나기(기회 공격 없이 빠진다) · 질주 (교활한 행동)
  if ((a.images || 0) > img0) out.img = a.images; if ((a.thp || 0) > thp0) out.thp = Math.round((a.thp - thp0) * Math.max(1, DN.srdHP(a.merc)) / a.max);
  for (const q of rt.fields.slice(fl0)) if (q.dice) out.field = { r: q.r, d: `${q.dice[0]}d${q.dice[1]}` };
  if ((rt.darks || []).length > dk0) out.dark = rt.darks[rt.darks.length - 1].r;
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
    for (const lv of LEVELS) { if (lv < min) continue; const e = once(k, cls, lv) || ['undead', 'far', 'low', 'dry', 'reck'].reduce((e, v) => e || once(k, cls, lv, v), null); if (!e || !Object.keys(e).length) continue; const j = JSON.stringify(e); if (j !== last) { entries.push([lv, e]); last = j; } }
    if (entries.length) per[cls] = entries;
  }
  const vals = Object.values(per); if (!vals.length) { none.push(k); continue; } n++;
  const same = vals.every(v => JSON.stringify(v) === JSON.stringify(vals[0])); out[k] = same ? { '*': vals[0] } : per;
}
fs.writeFileSync(LOAD.jsPath('skill_eff'), `'use strict';\n// test/gen_skill_eff.js가 만든다. 손으로 고치지 않는다. { 기술: { 직업 또는 *: [[레벨부터, 효과]] } } — 효과 항목은 그 파일 머리말\nG.SkillEff = ${JSON.stringify(out)};\nG.SkillEff_at = (k, cls, lv) => { const P = G.SkillEff[k]; if (!P) return null; const L = P[cls] || P['*'] || Object.values(P)[0]; let e = null; for (const [l, v] of L) if (lv >= l) e = v; return e || L[0][1]; };\n`);
console.log(`효과 있음 ${n} · 없음 ${none.length}`);
for (const k of ['sr_rage', 'sr_bless', 'sr_hex', 'sr_haste', 'sr_sweapon', 'sr_guard', 'sr_lay', 'sr_surge', 'sr_reckless', 'sp_mirror_image']) console.log(k, JSON.stringify(out[k])?.slice(0, 240));
