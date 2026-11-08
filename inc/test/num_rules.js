'use strict';
// 전투 수치는 SRD 그대로: node test/num_rules.js (DESIGN.md 121). 층 · 위험 · 명성 · 장비가 몬스터와 용병의 체력 · 피해를 곱하지 않는다
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, F = G.Fantasy, GD = G.Guild, R = G.Region; let ok = 0, bad = 0;
const t = (n, v, x = '') => { if (v) ok++; else { bad++; console.log('  실패:', n, x); } };
G.quiet = true; G.newState();
const f = G.S.w.fantasy, L = GD.leader(f); f.leaderNew = false; L.lv = 12; f.autoTr = f.autoParty = false; f.askMeet = false;
const a = GD.make(f, 'dragoon', { lv: 12 }), b = GD.make(f, 'cleric', { lv: 12 }), c = GD.make(f, 'mage', { lv: 12 }); f.mercs.push(a, b, c); f.lineup = [a.uid, b.uid, c.uid]; F.syncAllies(f);
f.floor = f.maxFloor = 30; f.checkpoint = f.start = 30; f.town = true; f.townT = 99; G.Exp.depart(f, F.rt(f));
const rt = F.rt(f);

// ── 몬스터 ──
const def = n => ({ n, ...G.D.F.mon[n] }), block = n => G.SRD_MON[G.D.F.STAT[n][0]];
f.fameAll = 1e4; f.heat = 3;
for (const fl of [1, 10, 30]) for (const n of ['고블린 전사', '트롤', '히드라']) {
  const o = F.spawnMon(rt, fl, def(n), 1, 1, false, { major: true });
  t(`${fl}층 ${n}: 체력은 능력치표 그대로`, o.max === block(n).hp, `${o.max} ≠ ${block(n).hp}`);
  t(`${fl}층 ${n}: 피해 배율 없음`, o.atk === 1, o.atk);
  G.Story.heat(f, [o]);
  t(`${fl}층 ${n}: 위험도가 수치를 올리지 않는다`, o.max === block(n).hp && o.atk === 1, `${o.max} ${o.atk}`);
  rt.mons = rt.mons.filter(q => q !== o);
}
{ const o = F.spawnMon(rt, 30, G.D.F.bosses[0], 1, 1, true); t('보스도 능력치표 그대로', o.max === G.Foe.stat(G.D.F.bosses[0]).block.hp && o.atk === 1, `${o.max} ${o.atk}`); rt.mons = rt.mons.filter(q => q !== o); }
t('전투 속도 배율 없음', G.Turn.pace === 1, G.Turn.pace);

// ── 용병 ──
for (const m of [L, a, b, c]) { m.gear = { w: 30, a: 30 }; m.bt = 5; }
for (const p of rt.party.filter(q => q.merc)) {
  const n = p.merc.cls;
  t(`${n}: 체력은 SRD 계산 그대로`, Math.abs(F.allyHP(f, p) - G.Dnd.srdHP(p.merc)) < 1e-9, `${F.allyHP(f, p)} ≠ ${G.Dnd.srdHP(p.merc)}`);
  t(`${n}: 한 대 평균은 무기 그대로`, Math.abs(F.allyAtk(f, p) - G.Dnd.avg(G.Dnd.weapon(p)) * G.Dnd.bprod(p, 'dmg')) < 1e-9, F.allyAtk(f, p));
  t(`${n}: 행동 배율 없음`, Math.abs(G.Turn.k(f, { turn: {} }, p) - 1) < 1e-9, G.Turn.k(f, { turn: {} }, p));
}
t('단장 체력도 같은 식', Math.abs(F.heroHP(f) - G.Dnd.srdHP(L)) < 1e-9, F.heroHP(f));

// ── 조우: SRD XP 예산으로 짠다 ──
f.heat = 0; f.front = null; f.frontLock = null;
const xpOf = n => R.XP[block(n).cr];
t('예산표: 12레벨 4명 보통 = 14800', R.BUDGET[11][1] * 4 === 14800, R.BUDGET[11][1] * 4);
t('층 레벨은 1 이상 20 이하', F.floorLv(1) >= 1 && F.floorLv(99) === 20, [F.floorLv(1), F.floorLv(99)]);
t('층이 깊으면 예산이 커진다', R.floorBudget(f, 20, 1) > R.floorBudget(f, 10, 1) && R.floorBudget(f, 10, 1) > R.floorBudget(f, 1, 1));
t('어려움이 보통보다 크다', R.floorBudget(f, 10, 2) > R.floorBudget(f, 10, 1));
{ const b0 = R.floorBudget(f, 10, 1); f.heat = 2; t('위험도는 SRD 난이도를 한 단계 올린다 (배율 없음)', R.floorBudget(f, 10, 1) > b0 && R.floorBudget(f, 10, 1) === R.floorBudget({ ...f, heat: 0 }, 10, 2)); f.heat = 0; }
const spend = (fl, diff) => { let s = 0, cr = 0, n = 0; for (let i = 0; i < 40; i++) { const names = G.Foe.encounter(f, fl, diff); s = Math.max(s, names.reduce((v, q) => v + xpOf(q), 0)); n = Math.max(n, names.length); cr = Math.max(cr, ...names.map(q => block(q).cr)); t(`${fl}층: 이름이 몬스터표에 있다`, names.length > 0 && names.every(q => G.D.F.mon[q]), names.join()); } return { s, cr, n }; };
for (const fl of [1, 3, 6, 10, 15, 20, 30]) { const r = spend(fl, 1), max = R.floorBudget(f, fl, 1); t(`${fl}층: 예산을 넘지 않는다`, r.s <= max, `${r.s} > ${max}`); t(`${fl}층: 한 전투 6명 이하`, r.n <= 6, r.n); }
t('깊을수록 큰 몬스터가 나온다', spend(20, 1).cr > spend(3, 1).cr, [spend(3, 1).cr, spend(20, 1).cr]);

console.log(`num_rules: 통과 ${ok} · 실패 ${bad}`);
if (bad) process.exitCode = 1;
