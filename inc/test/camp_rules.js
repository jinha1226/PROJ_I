'use strict';
// 야영 물자 · 층 이동 회복 없음: node test/camp_rules.js  (DESIGN.md 145)
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { console, Math, JSON, Date, btoa, atob }; vm.createContext(ctx);
const lab = fs.readFileSync(path.join(__dirname, 'party_lab.js'), 'utf8');
for (const n of JSON.parse(/for \(const n of (\[.*?\])\)/.exec(lab)[1].replace(/'/g, '"'))) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const G = ctx.G, F = G.Fantasy, GD = G.Guild, C = G.Camp, R = G.Res;
let ok = 0, bad = 0; const t = (name, v, extra = '') => { if (v) ok++; else { bad++; console.log('  실패:', name, extra); } };
G.quiet = true;
function setup() {
  G.newState();
  const f = G.S.w.fantasy, L = GD.leader(f); f.leaderNew = false; f.autoTr = false; f.autoParty = false; L.lv = 6; f.gold = 1000;
  const ms = ['cleric', 'archmage'].map(c => GD.make(f, c, { lv: 6 })); f.mercs.push(...ms); f.lineup = ms.map(m => m.uid); F.syncAllies(f);
  f.floor = f.maxFloor = 5; f.checkpoint = f.start = 5; f.town = true; f.townT = 99; G.Exp.depart(f, F.rt(f));
  const rt = F.rt(f); rt.mons = []; rt.turn = null; rt.ask = null; rt.scene = null;
  return { f, rt, cl: ms[0], wz: ms[1] };
}
const useSlot = m => { R.of(m).sl[1] = (R.of(m).sl[1] || 0) + 1; };
const allLeft = m => R.slotFrac(m) === 1;
const hurt = rt => { for (const p of rt.party) p.hp = p.max * 0.4; };
const fracs = rt => rt.party.map(p => +(p.hp / p.max).toFixed(2));

// 들고 다닐 수
{ G.newState(); const f = G.S.w.fantasy; t('처음엔 1개', C.have(f) === 1 && C.cap(f) === 1); f.gold = 1000; t('가득 차면 못 산다', !C.canBuy(f) && !C.buy(f)); t('돈은 그대로', f.gold === 1000);
  const caps = [0, 30, 100, 300, 800].map(v => { f.fameAll = v; return C.cap(f); }); t('등급이 오르면 더 든다', caps[0] === 1 && caps[1] > caps[0] && caps[4] >= caps[1] && caps.every((c, i) => !i || c >= caps[i - 1]), caps.join());
  f.fameAll = 30; const g = f.gold; t('자리가 있으면 산다', C.buy(f) && C.have(f) === 2 && f.gold === g - C.COST); f.gold = 0; f.fameAll = 800; t('돈이 없으면 못 산다', !C.canBuy(f)); }
{ G.newState(); const f = G.S.w.fantasy; f.supply = 0; f.gold = 1000; f.fameAll = 800; C.stock(f); t('자동 정비는 칸까지만', C.have(f) === C.cap(f), C.have(f)); t('저장에 실린다', JSON.parse(JSON.stringify(G.S)).w.fantasy.supply === C.have(f)); }
// 층을 내려가도 차지 않는다
{ const { f, rt, cl, wz } = setup(); hurt(rt); useSlot(cl); useSlot(wz); F.descend(f, rt); const r2 = F.rt(f); t('층이 내려갔다', f.floor === 6); t('체력이 그대로', fracs(r2).every(k => Math.abs(k - 0.4) <= 0.02), fracs(r2).join()); /* 체력은 정수라 반올림 오차 허용 */ t('슬롯이 그대로', !allLeft(cl) && !allLeft(wz), `${R.slotFrac(cl)}`); }
{ const { f, rt } = setup(); for (const p of rt.party) p.hp = 0; F.descend(f, rt); t('0이어도 살아서 다음 층으로 (1 이상)', F.rt(f).party.every(p => p.hp >= 1 && !p.dead)); }
// 출발하면 찬다
{ const { f, rt, cl } = setup(); hurt(rt); useSlot(cl); f.town = true; G.Exp.depart(f, rt); t('출발: 체력 전부', F.rt(f).party.every(p => p.hp === p.max)); t('출발: 슬롯 전부', allLeft(cl)); }
// 첫 원정은 지금처럼
{ const { f, rt, cl } = setup(), s = G.Tut.safe; G.Tut.safe = () => true; hurt(rt); useSlot(cl); F.descend(f, rt); t('첫 원정도 층을 내려가면 차지 않는다 (DESIGN.md 157)', F.rt(f).party.some(p => p.hp < p.max)); G.Tut.safe = s; }
// 야영
{ const { f, rt, cl } = setup(); hurt(rt); useSlot(cl); rt.party[1].dead = true; t('쓸 수 있다', C.can(f, rt)); t('쓴다', C.use(f, rt)); t('물자가 준다', C.have(f) === 0); t('체력 전부', rt.party.every(p => p.hp === p.max)); t('쓰러진 동료도 일어난다', !rt.party[1].dead); t('슬롯 전부', allLeft(cl)); }
{ const { f, rt } = setup(); f.supply = 2; hurt(rt); C.use(f, rt); t('한 층에 한 번', !C.can(f, rt) && !C.use(f, rt) && C.have(f) === 1); F.descend(f, rt); t('다음 층에선 또', C.can(f, F.rt(f))); }
{ const { f, rt } = setup(); f.supply = 0; t('물자가 없으면 못 쓴다', !C.can(f, rt) && !C.use(f, rt)); }
{ const { f, rt } = setup(); rt.turn = { round: 1 }; t('전투 중엔 못 쓴다', !C.can(f, rt)); rt.turn = null; rt.ask = {}; t('질문 중엔 못 쓴다', !C.can(f, rt)); rt.ask = null; rt.scene = {}; t('장면 중엔 못 쓴다', !C.can(f, rt)); rt.scene = null; F.spawnMon(rt, 5, { n: '산적', t: 'm_bandit', ty: 'humanoid' }, rt.hero.x + 8, rt.hero.y, false, { aggro: true, spotted: true, gold: 0 }); t('덤비는 적이 있으면 못 쓴다', !C.can(f, rt)); }
{ const { f, rt } = setup(); f.town = true; t('마을에선 못 쓴다', !C.can(f, rt)); }
// 자동
{ const { f, rt } = setup(); t('멀쩡하면 안 쓴다', !C.auto(f, rt) && C.have(f) === 1); hurt(rt); t('체력이 낮으면 쓴다', C.auto(f, rt) && C.have(f) === 0); }
{ const { f, rt } = setup(); for (const p of rt.party) p.hp = p.max * 0.6; t('마지막 하나는 60%에 아낀다', !C.auto(f, rt) && C.have(f) === 1); f.supply = 2; t('여유가 있으면 60%에 쉰다', C.auto(f, rt) && C.have(f) === 1); }
{ const { f, rt } = setup(); hurt(rt); f.campAuto = false; t('수동이면 안 쓴다', !C.auto(f, rt) && C.have(f) === 1); }
{ const { f, rt, cl, wz } = setup(); for (const m of [cl, wz]) { const tb = R.table(m); R.of(m).sl = tb.slice(); } t('슬롯 몫 0', R.slotFrac(cl) === 0, R.slotFrac(cl)); t('슬롯이 바닥나면 쓴다', C.needs(rt)); }
{ const m = (() => { G.newState(); return GD.make(G.S.w.fantasy, 'dragoon', { lv: 3 }); })(); t('시전자가 아니면 슬롯 몫 1', R.slotFrac(m) === 1); }
// 야영 때 되찾은 것을 알린다 (DESIGN.md 158): 사람마다 기록 · 가장 많이 되찾은 사람이 한마디
{ const { f, rt, cl, wz } = setup(); hurt(rt); useSlot(cl); useSlot(cl); R.of(wz).sl[0] = 1; const L = GD.leader(f); R.of(L).fu.sr_surge = 1; R.of(L).hd = 2;
  const logs = [], said = [], L0 = G.log, S0 = G.Banter.say; G.log = (s, ...a) => { logs.push(s); return L0.call(G, s, ...a); }; G.Banter.say = (r, p, s) => { said.push([p.merc?.cls, s]); return true; };
  t('야영한다', C.use(f, rt)); G.log = L0; G.Banter.say = S0;
  const of = m => logs.find(s => s.startsWith('🏕 ' + (m.name || '단장')));
  t('클레릭: 슬롯 회복을 남긴다', /2레벨 슬롯 2/.test(of(cl) || ''), of(cl)); t('위저드: 1레벨 슬롯', /1레벨 슬롯 1/.test(of(wz) || ''), of(wz)); t('단장: 기술 횟수 · 히트 다이스', /히트 다이스 2/.test(of(L) || '') && new RegExp(G.D.MSKILLS.sr_surge.n + ' 1').test(of(L) || ''), of(L)); t('체력도 적는다', /체력 \+\d+/.test(of(cl) || ''));
  t('가장 많이 되찾은 사람이 한마디 (단장: 기술 · 히트 다이스)', said.length === 1 && said[0][1] === C.LINE.skill, JSON.stringify(said)); t('슬롯을 되찾으면 주문 대사', C.lineOf(['2레벨 슬롯 1']) === C.LINE.slot && C.lineOf([G.D.MSKILLS.sr_rage.n + ' 1']) === C.LINE.rage); t('다 찼다', allLeft(cl) && allLeft(wz)); }
{ const { f, rt } = setup(); for (const p of rt.party) R.long(p.merc); const said = [], S0 = G.Banter.say; G.Banter.say = (r, p, s) => { said.push(s); return true; }; C.use(f, rt); G.Banter.say = S0; t('쓴 것이 없으면 말하지 않는다', !said.length, JSON.stringify(said)); }
console.log(`camp_rules: 통과 ${ok} · 실패 ${bad}`);
if (bad) process.exitCode = 1;
