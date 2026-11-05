'use strict';
// 파티 조합 실험: node test/party_lab.js <직업,직업,직업> [분] [시드]  → 한 줄 JSON
// 단장 + 지정한 셋을 같은 레벨로 고정해 돌린다. 트리 · 고용 없음, 죽으면 같은 직업으로 채워 조합을 유지한다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const crew = process.argv[2].split(','), MIN = +process.argv[3] || 30, seed = +process.argv[4] || 1, LV = +process.argv[5] || 7, FL = +process.argv[6] || 4;
const M = Object.create(Math); let s0 = seed * 7919 >>> 0;
M.random = () => { s0 = (s0 + 0x6D2B79F5) >>> 0; let t = s0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ctx = { console, Math: M, JSON, Date, btoa, atob }; vm.createContext(ctx);
for (const n of ['core', 'data', 'srd_gen', 'srd_base', 'srd_mons', 'grid', 'juice', 'tree', 'trees', 'season', 'fantasy', 'rivals', 'guild', 'persona', 'dnd', 'feats', 'trinkets', 'bonds', 'report', 'skills', 'srd', 'srd_spells', 'spells', 'traits', 'options', 'pools', 'srd_species', 'skill_ai', 'combo', 'events', 'tutorial', 'skill_nums', 'command', 'expedition', 'mission', 'explore', 'banter', 'sight', 'tactics', 'foe', 'region', 'scn_astral', 'res', 'turn', 'flow', 'story', 'state'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G;
G.newState();
const f = G.S.w.fantasy, GD = G.Guild, L = GD.leader(f); f.leaderNew = false; f.autoTr = false; L.lv = LV; f.autoParty = false;
// 일곱째 인수 adv: 전직시킨다 (전직 스킬까지 재려면)
const ADV = process.argv[7] === 'adv';
let setTacLate = () => {}; const add = c => { const m = GD.make(f, c, { lv: LV }); f.mercs.push(m); setTacLate(m); if (ADV && GD.canPromote(m)) { f.gold = 1e15; GD.promote(f, m, G.U.pick(GD.advs(c))); f.gold = 0; } return m; };
f.lineup = crew.map(c => add(c).uid);
// 여덟째 인수: 전술 (대형,표적,치유)
// 표적: near|weak|back 전원 같은 값
const TA = process.argv[8] && process.argv[8] !== '-' ? process.argv[8] : null, setTac = m => { if (TA) G.Tactics.setTarget(m, TA); };
for (const m of [L, ...f.mercs]) setTac(m); setTacLate = setTac;
// 아홉째 인수: 세력 고정
if (process.argv[9] && process.argv[9] !== '-') f.frontLock = process.argv[9];
G.Fantasy.syncAllies(f);
// FORM=flip: 진형 앞뒤를 뒤집는다
if (process.env.FORM === 'flip') { const fm = G.Fantasy.formation(f); for (const u of Object.keys(fm)) fm[u] = (2 - (fm[u] / 3 | 0)) * 3 + fm[u] % 3; }
f.floor = f.maxFloor = FL; f.checkpoint = f.start = FL; f.town = true; f.townT = 99;
G.Exp.depart(f, G.Fantasy.rt(f));
const R = { fights: 0, rounds: 0, low: 0, downs: 0, deaths: 0, home: {}, dmg: {} };
const eF = G.Story.endFight, die = G.Story.die, home = G.Exp.home, hurt = G.Fantasy.hurt;
G.Story.endFight = function (ff, rt) { const st = rt.turn; if (st) { R.fights++; R.rounds += st.round; R.low += st.low; R.downs += st.downs || 0; } return eF.apply(this, arguments); };
G.Story.die = function (ff, rt, p) { R.deaths++; const c = p.merc && p.merc.cls, i = p.merc ? f.lineup.indexOf(p.merc.uid) : -1, r = die.apply(this, arguments); if (i >= 0) { f.lineup[i] = add(c).uid; rt.resync = true; } return r; };
G.Exp.home = function (ff, rt, why) { R.home[why] = (R.home[why] || 0) + 1; return home.apply(this, arguments); };
G.Fantasy.hurt = function (ff, rt, m, d, src, from) { if (from && from.merc && rt.turn) { const n = from === rt.hero ? '단장' : GD.def(from.merc).n; R.dmg[n] = (R.dmg[n] || 0) + d; } return hurt.apply(this, arguments); };
// 역할: 차례마다 누가 얼마나 맞고 고쳤나 · 스킬별 사용 · 피해 (기본 공격과 구분)
const who = p => (p === G.Fantasy.rt(f).hero ? '단장' : p.merc ? p.merc.cls : '?');
Object.assign(R, { taken: {}, healed: {}, down: {}, acts: {}, sk: {}, basic: 0, skDmg: 0, skills: {} });
let curSk = null;
for (const k of Object.keys(G.Skill.SK)) { const S = G.Skill.SK[k], run = S.run; S.run = function (c, x) { curSk = k; const r = run.apply(this, arguments); curSk = null; if (r !== false) { const e = R.sk[k] || (R.sk[k] = { n: 0, d: 0 }); e.n++; } return r; }; }
const h2 = G.Fantasy.hurt; G.Fantasy.hurt = function (ff, rt, m, d, src, from) { if (from && from.merc && rt.turn && src !== 'dot') { if (curSk) { R.skDmg += d; R.sk[curSk] = R.sk[curSk] || { n: 0, d: 0 }; R.sk[curSk].d += d; } else R.basic += d; } return h2.apply(this, arguments); };
const tr = G.Turn.run; G.Turn.run = function (ff, rt, dt) {
  const hp = rt.party.map(p => [p, p.hp, p.dying]), cur0 = rt.turn && rt.turn.cur, r = tr.apply(this, arguments), cur = (rt.turn && rt.turn.cur) || cur0; // 치유는 차례가 넘어가는 틱에 일어난다: 끝난 뒤의 차례로 센다
  for (const [p, h, dy] of hp) { const n = who(p); if (p.hp < h) R.taken[n] = (R.taken[n] || 0) + (h - p.hp) / (p.max || 1); if (p.hp > h && cur && cur.kind !== 'mon') { const c = who(cur); R.healed[c] = (R.healed[c] || 0) + (p.hp - h) / (p.max || 1); } if (p.dying && !dy) R.down[n] = (R.down[n] || 0) + 1; }
  return r;
};
// 몬스터 역할 · 특성이 실제로 발동했나 (G.Foe)
R.foe = {}; const cnt = k => { R.foe[k] = (R.foe[k] || 0) + 1; }, FO = G.Foe;
for (const [k, test] of [['turn', r => r], ['retreat', r => r && r.length], ['survive', r => r], ['pack', r => r], ['pointBlank', r => r], ['shot', (r, a) => FO.ranged(a[1])]]) { const o = FO[k]; FO[k] = function (...a) { const r = o.apply(this, a); if (test(r, a)) cnt(k); return r; }; }
R.fightRoles = {}; R.fightsWithBack = 0; R.fightsSeen = 0; const heat = G.Story.heat; G.Story.heat = function (ff, list) { const fresh = list.filter(o => !o.heated); if (fresh.length) { R.fightsSeen++; R.fightN = (R.fightN || 0) + fresh.length; if (fresh.some(FO.back)) R.fightsWithBack++; } for (const o of fresh) R.fightRoles[o.role] = (R.fightRoles[o.role] || 0) + 1; return heat.apply(this, arguments); };
const sp = G.Fantasy.spawnMon; G.Fantasy.spawnMon = function (rt, fl, d) { cnt('spawn_' + (d.r || 'none')); return sp.apply(this, arguments); };
for (let t = 0; t < MIN * 60; t++) G.tick(1, 0.1);
console.log(JSON.stringify({ fac: process.argv[9] || '-', tac: process.argv[8] || '-', crew: crew.join(), seed, floor: f.maxFloor, gold: Math.round(f.gold), ...R }));
