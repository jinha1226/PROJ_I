'use strict';
// 사건 빈도 · 전투 길이 측정 (EVENT_SYSTEM_FOLLOWUPS.md 2.2 · 5.2): node test/event_freq.js [세력] [레벨] [시즌] [원정] [방침]
// 시간은 ×1 게임 시간(초). 선택창은 측정 중 바로 넘어가므로 사건당 묻기 시간을 더해 비율을 낸다.
const fs = require('fs'), vm = require('vm'), path = require('path'); const ROOT = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(ROOT + '/test/party_lab.js', 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(`${ROOT}/js/${n}.js`, 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, GD = G.Guild, F = G.Fantasy, E = G.Event; G.quiet = true; G.Foe.retreatOn = !process.env.NORET; if (process.env.HPK) F.MON_HP_K = +process.env.HPK;
const [fr0, LV0, SN0, RN0, POL] = process.argv.slice(2), front = !fr0 || fr0 === 'def' ? Object.keys(G.D.F.factions).find(k => k !== 'swamp') : fr0, LV = +LV0 || 8, SN = +SN0 || 6, RN = +RN0 || 6, ASK_T = 4;
const q = (a, p) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const gaps = [], fights = [], rounds = [], ids = {}, types = {}, hp = []; let plans = 0, slots = 0, total = 0, tFight = 0, tScene = 0, fired = 0, rep = 0, wipes = 0, runs = 0, downs = 0, deaths = 0, floors = 0, prev = null, prevT = 0;
const p0 = E.plan; E.plan = function (f) { plans++; const r = p0.apply(this, arguments), s = f.ev.fl[f.floor]; if (s.room >= 0) slots++; return r; };
const rec0 = E.record; E.record = function (f, rt, e, r) { fired++; ids[e.id] = (ids[e.id] || 0) + 1; types[e.type] = (types[e.type] || 0) + 1; if (prev === e.id) rep++; prev = e.id; if (prevT) gaps.push(total - prevT); prevT = total; return rec0.apply(this, arguments); };
const die0 = G.Story.die; G.Story.die = function (f, rt, p) { deaths++; p.dying = null; p.dead = true; };
for (let s = 0; s < SN; s++) { G.newState(); const f = G.S.w.fantasy, L = GD.leader(f); f.leaderNew = false; f.autoTr = f.autoParty = f.autoGo = false; L.lv = LV; G.Season.st(f).seed = 7000 + s; f.policy = POL || 'party'; f.retreat = process.env.NORET ? 'wipe' : 'hp30'; f.frontLock = front; f.mercs = [L]; f.lineup = ['cleric', 'dragoon', 'archer'].map(c => { const m = GD.make(f, c, { lv: LV }); f.mercs.push(m); return m.uid; }); f.checkpoint = f.start = f.maxFloor = LV; prevT = 0;
  for (let i = 0; i < RN; i++) { runs++; for (const m of f.mercs) { m.dead = false; m.stress = 0; m.grief = null; } F.syncAllies(f); f.town = true; f.seasonEnd = false; f.townT = 99; f.carry = 0; G.Season.st(f).t = 0; f.floor = f.start = f.checkpoint = f.maxFloor; const rt = F.rt(f); G.Exp.depart(f, rt); let t = 0, fin = 0, in0 = null, fl0 = f.floor, rd = 0;
    while (!f.town && t++ < 3200) { G.tick(1, 0.25); total += 0.25; if (rt.scene) tScene += 0.25; if (rt.turn) { tFight += 0.25; if (in0 == null) in0 = total; rd = Math.max(rd, rt.turn.round || 0); } else if (in0 != null) { fights.push(total - in0); rounds.push(rd); const P = rt.party.filter(p => p.merc), low = P.reduce((a, p) => a + Math.max(0, p.hp) / p.max, 0) / (P.length || 1); hp.push(low); in0 = null; rd = 0; } if (f.floor !== fl0) { floors++; fl0 = f.floor; } }
    if (rt.phase === 'dead') wipes++; } }
const asks = fired * ASK_T, all = total + asks, top = Object.entries(ids).sort((a, b) => b[1] - a[1]);
console.log(`[${front} · ${LV}레벨 · ${POL || 'party'}] 원정 ${runs} · 층 이동 ${floors} · 전멸 ${wipes} · 사망 ${deaths}`);
console.log(`새 층 ${plans} · 자리 ${slots} · 사건 ${fired} (새 층당 ${(fired / (plans || 1)).toFixed(2)}, 서로 다른 ${top.length}종, 바로 반복 ${rep})`);
console.log(`사건 간격(초) 중앙 ${Math.round(q(gaps, .5))} · 하위 10% ${Math.round(q(gaps, .1))} · 상위 10% ${Math.round(q(gaps, .9))}`);
console.log(`전투(초) ${fights.length}번 · 중앙 ${Math.round(q(fights, .5))} · 하위 10% ${Math.round(q(fights, .1))} · 상위 10% ${Math.round(q(fights, .9))} · 라운드 중앙 ${q(rounds, .5)} · 끝난 뒤 평균 체력 ${Math.round(hp.reduce((a, b) => a + b, 0) / (hp.length || 1) * 100)}%`);
console.log(`시간 비율: 전투 ${Math.round(tFight / all * 100)}% · 장면 ${Math.round((tScene + asks) / all * 100)}% · 선택창 ${Math.round(asks / all * 100)}%`);
console.log(`유형 ${JSON.stringify(types)}\n많이 나온 것 ${top.slice(0, 8).map(([k, v]) => `${k} ${v}`).join(' · ')}\n안 나온 것 ${E.LIST.filter(e => !ids[e.id] && !e.scene).map(e => e.id).join(' ')}`);
