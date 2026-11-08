'use strict';
// 전술 실험: node test/tactic_lab.js <레벨> <층> <시드> <전투 수> <진형> <표적> <전투 방식> [파티]  → 한 줄 JSON
// 원정 전 설정이 전투 결과를 바꾸나. 전투마다 체력 · 자원을 채우고 레벨 · 층을 고정해, 설정 말고 다른 것이 흔들지 않게 한다. 수치는 게임 그대로
const fs = require('fs'), vm = require('vm'), path = require('path');
const [LV, FL, seed, WANT] = process.argv.slice(2, 6).map(Number), FORM = process.argv[6] || 'role', TGT = process.argv[7] || 'near', STYLE = process.argv[8] || '-', CREW = (process.argv[9] || 'cleric,archmage,rogue').split(',');
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8'), FILES = JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'));
const M = Object.create(Math); let s0 = seed * 7919 >>> 0; M.random = () => { s0 = (s0 + 0x6D2B79F5) >>> 0; let t = s0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ctx = { console, Math: M, JSON, Date, btoa, atob }; vm.createContext(ctx);
for (const n of FILES) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, F = G.Fantasy, GD = G.Guild; G.quiet = true; G.newState();
const f = G.S.w.fantasy, L = GD.leader(f); f.leaderNew = false; f.autoTr = f.autoParty = false; f.askMeet = false; f.auto = true; L.lv = LV; f.fullHome = false; G.Exp.tick = () => {}; /* 체력 귀환 · 짐 귀환 없음: 끝까지 싸운 결과를 잰다 */
const ms = CREW.map(c => GD.make(f, c, { lv: LV })); f.mercs.push(...ms); f.lineup = ms.map(m => m.uid); F.syncAllies(f);
const all = [L, ...ms];
// 진형: 윗줄이 전열. role = 게임 기본값(역할로), flip = 앞뒤 뒤집기, front · back = 전원 한 줄(넘치면 가운데), file = 한 줄 세로
const form = F.formation(f), base = { ...form }, PRE = { front: [0, 1, 2, 4, 3, 5], back: [6, 7, 8, 4, 3, 5], file: [1, 4, 7, 3, 5, 0] };
if (FORM === 'flip') for (const u in form) form[u] = (2 - (base[u] / 3 | 0)) * 3 + base[u] % 3;
else if (PRE[FORM]) all.forEach((m, i) => { form[m.uid] = PRE[FORM][i]; });
if (TGT !== 'near') for (const m of all) G.Tactics.setTarget(m, TGT);
// 전투 방식: 파이터 전원. 해당 없으면 그대로
if (STYLE !== '-') for (const m of all) if (m.cls === 'dragoon') { const r = m.opts || G.Opt.roll(m); m.opts = { ...r, fs: [STYLE, ...r.fs.filter(k => k !== STYLE)] }; } // 새 객체여야 G.Opt.of의 저장값이 무효가 된다
const WANT_FORM = { ...form }, lockForm = () => { const now = F.formation(f); for (const u of Object.keys(WANT_FORM)) now[u] = WANT_FORM[u]; }; // 전투마다 정한 자리로 되돌린다
const R = { fights: 0, n: [], lost: [], downs: [], rounds: [], fell: 0, wipes: 0 };
let cur = null; const begin = () => { cur = { lost: 0, downs: 0 }; };
const refill = rt => { lockForm(); for (const p of rt.party) { if (p.merc) { p.merc.lv = LV; p.merc.stress = 0; p.merc.inj = 0; p.merc.scars = []; G.Res.long(p.merc); } p.dead = false; p.dying = null; p.hp = p.max; p.thp = 0; p.cond = {}; p.bf = {}; p.pe = []; p.concK = null; } };
// ATTR=K: K전투마다만 체력 · 슬롯을 채운다 (소모전). 그 사이에는 쓰러진 사람만 체력 1로 일으킨다. 기본 1 = 전투마다 채움
const REAL = !!process.env.REAL, CAMPS = Number(process.env.CAMPS ?? 1), ATTR = Number(process.env.ATTR) || 1, lite = rt => { lockForm(); for (const p of rt.party) { if (p.merc) { p.merc.lv = LV; p.merc.stress = 0; p.merc.inj = 0; p.merc.scars = []; } p.dead = false; p.dying = null; p.hp = Math.max(p.hp, 1); p.cond = {}; } };
const campUse = { n: 0 }; { const u = G.Camp.use; G.Camp.use = function () { const r = u.apply(this, arguments); if (r) campUse.n++; return r; }; if (process.env.CAMPHP) { const at = +process.env.CAMPHP, nd = G.Camp.needs; G.Camp.needs = rt => { const l = rt.party.filter(p => p.merc); return nd(rt) || l.reduce((a, p) => a + (p.dead ? 0 : p.hp / (p.max || 1)), 0) / (l.length || 1) < at; }; } }
if (process.env.HELP) G.Team.autoHelp = true; // 돕기 자동 사용을 켜고 비교
const eF = G.Story.endFight, hm = F.hurtMember;
const add = (o, k, v) => { o[k] = (o[k] || 0) + v; }, took = {}, dealt = {}, pickN = { n: 0, differ: 0 };
// 쓴 기술 횟수: 직업 → 기술 → 횟수 (조합 효과를 내는 기술을 AI가 실제로 쓰나)
const USED = {}; for (const [k, s] of Object.entries(G.Skill.SK)) if (s.run) { const run = s.run; s.run = function (c) { if (c?.merc) add(USED[c.merc.cls] || (USED[c.merc.cls] = {}), k, 1); return run.apply(this, arguments); }; }
const byTy = {}; // 적 종류별 성적: [전투, 받은 피해 합, 4명 이상 쓰러진 전투]
F.hurtMember = function (ff, rt, p, d, mo) { const h = p.hp, r = hm.apply(this, arguments), x = Math.max(0, h - Math.max(0, p.hp)) / (p.max || 1); if (rt.turn && cur) { cur.lost += x; add(took, p.merc ? p.merc.cls : '?', x); const ty = mo?.ty || mo?.stat?.ty; if (ty) { cur.ty = cur.ty || {}; add(cur.ty, ty, x); } } return r; };
const hu = F.hurt; F.hurt = function (ff, rt, m, d, src, from) { const h = m.hp, r = hu.apply(this, arguments); if (rt.turn && from && from.merc) add(dealt, from.merc.cls, Math.max(0, h - Math.max(0, m.hp))); return r; };
// 표적 설정이 실제로 다른 적을 고르게 하는 비율
const pk = G.Tactics.pick; G.Tactics.pick = function (rt, list, e) { const r = pk.apply(this, arguments); if (r && list.length > 1) { pickN.n++; const n = list.reduce((a, b) => (Math.hypot(b.x - e.x, b.y - e.y) < Math.hypot(a.x - e.x, a.y - e.y) ? b : a)); if (n !== r) pickN.differ++; } return r; };
const down0 = G.Story.onDown; G.Story.onDown = function (ff, rt, p) { if (cur) cur.downs++; return down0.apply(this, arguments); };
G.Story.endFight = function (ff, rt) { const st = rt.turn, r = eF.apply(this, arguments); if (st && st.round >= 1) { R.fights++; R.rounds.push(st.round); R.lost.push(+(cur?.lost || 0).toFixed(3)); R.downs.push(st.downs || 0); const ty = Object.entries(cur?.ty || {}).sort((a, b) => b[1] - a[1])[0]?.[0]; if (ty) { const q = byTy[ty] || (byTy[ty] = [0, 0, 0]); q[0]++; q[1] += cur.lost; if ((st.downs || 0) >= 4) q[2]++; } } if (REAL) lite(rt); else if (ATTR > 1 && R.fights % ATTR) lite(rt); else refill(rt); begin(); return r; };
G.Story.die = function (ff, rt, p) { R.fell++; p.dying = null; p.hp = 1; }; // 죽음은 세고 일으킨다: 명단이 바뀌면 비교가 안 된다
G.Story.askRetreat = () => false; G.Story.askBack = () => false; G.Story.stairs = () => false;
G.Season.known = () => false; // 아는 층은 일반 무리가 정리된 것으로 치고 우두머리만 남긴다. 같은 층을 되풀이하는 실험에서는 늘 처음 온 층으로 둔다
const desc = F.descend; F.descend = function (ff, rt) { ff.floor = FL - 1; if (ATTR <= 1) return desc.apply(this, arguments); const hp = new Map(rt.party.filter(p => p.merc).map(p => [p.merc.uid, p.hp / (p.max || 1)])), r = desc.apply(this, arguments); for (const p of F.rt(ff).party) if (p.merc && hp.has(p.merc.uid)) p.hp = Math.max(1, p.max * hp.get(p.merc.uid)); return r; }; // 층은 그대로. 소모전에서는 층을 내려가도 체력이 차지 않는다
if (ATTR > 1) G.Res.longRest = () => {}; // 층을 내려갈 때의 완전 회복을 끈다 (게임에서는 층마다 전부 찬다: fantasy.js)
const H0 = G.Exp.home; G.Exp.home = function (ff, rt, why) { if (why === 'wipe') R.wipes++; R.home = R.home || {}; R.home[why] = (R.home[why] || 0) + 1; return H0.apply(this, arguments); };
f.supply = CAMPS; f.floor = f.maxFloor = FL; f.checkpoint = f.start = FL; f.startAuto = false; f.town = true; f.townT = 99; f.front = null; G.Exp.depart(f, F.rt(f)); begin();
let guard = 0;
while (R.fights < WANT && guard++ < 400000) { G.tick(0.25, 0.1); if (f.town) { f.floor = FL; f.start = FL; f.checkpoint = FL; f.gold = 0; for (const m of all) m.inj = 0; lockForm(); f.supply = CAMPS; R.trips = (R.trips || 0) + 1; G.Exp.depart(f, F.rt(f)); refill(F.rt(f)); } const rt = F.rt(f); if (rt.ask) G.Story.answer(rt, rt.ask.def, 'auto'); }
const avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
console.log(JSON.stringify({ LV, FL, seed, FORM, TGT, STYLE, crew: CREW.join(), fights: R.fights, rounds: R.rounds, lost: R.lost, downs: R.downs, fell: R.fell, wipes: R.wipes, home: R.home, guard, form, took, dealt, pick: pickN, fs: G.Opt.of(L).filter(k => k.startsWith('fs_')), byTy, used: USED, trips: R.trips || 0, campsLeft: f.supply, camps: campUse.n }));
