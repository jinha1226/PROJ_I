'use strict';
// 문 앞 준비 (설계 5-11): node test/prep_rules.js
let ok = 0, bad = 0; const t = (name, v, extra = '') => { if (v) ok++; else { bad++; console.log('  실패:', name, extra); } };
const { boot, spawn } = require('./_fight.js');
const { G } = boot(1), P0 = G.Prep, N = G.Noise;

// 지도: 왼쪽 복도(x 1~6, y 6~8 — 우리 쪽) · 닫힌 문 (7, 7) · 오른쪽 방(x 8~15, y 3~11). 우리 쪽 방향 out = (−1, 0)
const W = 17, H = 13, c = new Array(W * H).fill('#'), set = (x, y) => { c[y * W + x] = '.'; };
for (let y = 6; y <= 8; y++) for (let x = 1; x <= 6; x++) set(x, y);
for (let y = 3; y <= 11; y++) for (let x = 8; x <= 15; x++) set(x, y);
const DOOR = 7 * W + 7; let shut = true;
const grid = { w: W, h: H, pass: k => c[k] === '.' || (k === DOOR && !shut), door: k => k === DOOR && shut };
// 파티 흉내: 기술 보정은 sk에서, 아는 주문은 merc.skills
const rogue = { n: '로그', merc: { skills: [] }, sk: { perception: 3, sleight: 7, athletics: 1 } };
const mage = { n: '위저드', merc: { skills: ['u_knock'] }, sk: { perception: 1, sleight: 0, athletics: -1 } };
const fighter = { n: '파이터', merc: { skills: [] }, sk: { perception: 1, sleight: 0, athletics: 5 } };
const goblin = () => ({ n: '고블린', x: 9, y: 7, stat: { skills: { stealth: 6 }, abil: { dex: 15 } }, aware: 'sleep' }); // 문 바로 뒤
const hob = () => ({ n: '홉고블린', x: 13, y: 5, stat: { skills: {}, abil: { dex: 12 } }, aware: 'idle' }); // 방 안쪽
const io = rolls => ({ d20: () => rolls.shift(), skill: (w, sk) => w.sk[sk] });
const mk = (o = {}) => { shut = true; const ms = [goblin(), hob()]; return { P: P0.begin({ door: { x: 7, y: 7 }, out: { x: -1, y: 0 }, locked: true, grid, party: [rogue, mage, fighter], mons: ms, items: { oil: 1, caltrops: 1, tools: 1 }, ...o }), g: ms[0], h: ms[1] }; };

// 1) 문 앞 (우리 쪽)
{
  const { P } = mk();
  t('우리 쪽 문 앞은 세울 수 있다', P0.inZone(P, 5, 7) && P0.inZone(P, 4, 6));
  t('방 안 · 문 칸 · 너무 먼 곳은 안 된다', !P0.inZone(P, 9, 7) && !P0.inZone(P, 7, 7) && !P0.inZone(P, 1, 7));
  t('벽 위는 안 된다', !P0.inZone(P, 5, 5));
}
// 2) 엿듣기: 지각 vs 가장 높은 수동 은신 (고블린 은신 +6 → 16). 문 하나에 한 번. 단서가 있으면 판정 없이
{
  const { P } = mk(); t('수동 은신 = 10 + 은신 보정 (없으면 민첩)', P0.passiveStealth(goblin()) === 16 && P0.passiveStealth(hob()) === 11);
  const r1 = P0.listen(P, rogue, io([9])).res;
  t('엿듣기 실패: 기척만, 위치는 모른다', !r1.ok && r1.seen.length === 0 && r1.hint === '무언가 움직인다' && r1.dc === 16, JSON.stringify(r1));
  const r2 = P0.listen(P, mage, io([20]));
  t('엿듣기는 문 하나에 한 번 (다시 해도 같은 결과)', r2.res === r1 && r2.ev.length === 0);
  const { P: Q } = mk(); const r3 = P0.listen(Q, rogue, io([13])).res;
  t('엿듣기 성공(13 + 3 = 16): 몇이 어디에 (실루엣)', r3.ok && r3.seen.length === 2 && r3.seen[0].x === 9, JSON.stringify(r3.seen));
  const { P: C } = mk({ clue: true }); const r4 = P0.listen(C, mage, io([])).res;
  t('앞 방의 단서가 있으면 판정 없이 성공', r4.ok && r4.nat === null && r4.clue);
}
// 3) 자리 잡기 · 물건 놓기
{
  const { P } = mk();
  t('세우기: 문 앞 우리 쪽', P0.stand(P, rogue, 5, 7) && P.starts.get(rogue).x === 5);
  t('세우기: 다른 사람과 너무 가까우면 안 된다', !P0.stand(P, mage, 5.5, 7) && P0.stand(P, mage, 4, 6));
  t('놓기: 기름을 문 앞에', P0.drop(P, 'oil', 5, 8) && P.items.oil === 0);
  t('놓기: 가진 게 없으면 안 된다', !P0.drop(P, 'oil', 3, 7));
  t('놓기: 문간(문 칸)에도 놓을 수 있다 · 놓은 것끼리 떨어져서', P0.drop(P, 'caltrops', 7, 7) && P.dropped.length === 2);
  t('놓기: 방 안은 안 된다', !P0.canDrop({ ...P, items: { caltrops: 1 } }, 'caltrops', 10, 7));
  t('되돌리기: 놓은 것을 다시 줍는다', P0.undrop(P, 0) && P.items.oil === 1 && P.dropped.length === 1);
}
// 4) 여는 방법
{
  const { P } = mk(), m = id => P0.methods(P, mage).find(q => q.id === id);
  t('잠긴 문: 살살 열기는 안 된다', !m('push').ok && m('push').why === '잠겨 있다');
  t('자물쇠 따기는 도둑 도구가 있어야', m('pick').ok && !P0.methods({ ...P, items: { tools: 0 } }, rogue).find(q => q.id === 'pick').ok);
  t('노크는 노크 주문을 아는 사람만', m('knock').ok && !P0.methods(P, rogue).find(q => q.id === 'knock').ok);
  t('걷어차기는 누구나', P0.methods(P, rogue).find(q => q.id === 'kick').ok);
}
// 5) 열기 → 소리 → 적의 상태 → 기습
{
  let { P, g, h } = mk(); const r = P0.open(P, rogue, 'pick', io([10])); // 10 + 7 = 17 ≥ 15
  t('조용히 땄다: 열린다 · 소리 1', r.ok && r.noise === 1 && P.opened && !P.locked);
  t('조용히 땄다: 문 뒤 잠든 고블린도 못 듣는다', g.aware === 'sleep' && h.aware === 'idle', [g.aware, h.aware]);
  t('조용히 땄다: 모두 몰랐으니 기습', P0.setup(P).surprise && P0.setup(P).asleep.length === 1);
  ({ P, g, h } = mk()); const f = P0.open(P, rogue, 'pick', io([2])); // 2 + 7 = 9 < 15
  t('따기 실패: 문은 그대로 · 소리 4', !f.ok && f.noise === 4 && !P.opened && P.locked);
  t('따기 실패: 문 바로 뒤 고블린만 깬다 (안쪽 홉고블린은 못 듣는다)', g.aware === 'idle' && h.aware === 'idle', [g.aware, h.aware]);
  t('따기 실패 뒤 다시 해 볼 수 있다', P0.open(P, rogue, 'pick', io([12])).ok);
  ({ P, g, h } = mk()); P0.open(P, fighter, 'kick', io([12])); // 12 + 5 = 17
  t('걷어찼다: 둘 다 경계 → 기습 없음', g.aware === 'alert' && h.aware === 'alert' && !P0.setup(P).surprise, [g.aware, h.aware]);
  ({ P, g, h } = mk()); g.aware = 'idle'; const k = P0.open(P, mage, 'knock', io([])); // 깨어 있던(모름) 고블린 — 잠든 적은 큰 소리에도 경계까지만 (설계 표)
  t('노크: 늘 열린다 · 소리 15', k.ok && k.noise === 15 && k.nat === null);
  t('노크: 문 뒤 고블린은 쫓아온다(소리 난 곳 기억) · 안쪽도 깬다', g.aware === 'hunt' && g.heard && h.aware === 'alert', [g.aware, h.aware]);
  { const z = mk(); P0.open(z.P, mage, 'knock', io([])); t('노크: 잠든 적은 깨어 경계까지 (바로 쫓지는 않는다)', z.g.aware === 'alert', z.g.aware); }
  t('사건 줄: 시도 · 파문 · 상태 바뀜 · 열림', ['try', 'noise', 'aware', 'open'].every(kk => k.ev.some(e => e.k === kk)), JSON.stringify(k.ev.map(e => e.k)));
  t('이미 열린 문은 다시 열지 않는다', P0.open(P, fighter, 'kick', io([20])) === null);
}
// 6) 처음 상태: 잠들었거나 모른다
{ const ms = P0.prime([{}, {}, {}, {}], (() => { let i = 0; return () => [0.1, 0.9, 0.3, 0.7][i++]; })()); t('처음: 반은 잠들고 반은 모른다', ms.map(m => m.aware).join() === 'sleep,idle,sleep,idle'); }
// 7) 엔진에 적용 (G.Encounter.applyPrep): 놓은 것 · 모두 싸움 · 잠든 적 · 기습
{
  const { G: G1, r } = boot(4); spawn(G1, r, ['고블린 졸개', '고블린 졸개']); for (const m of r.mons) { m.aggro = false; m.aware = 'idle'; }
  G1.Encounter.applyPrep(r, { dropped: [{ kind: 'oil', x: 6, y: 7 }], asleep: [], surprise: true });
  t('엔진: 놓은 기름이 바닥에', r.terrain?.length === 1 && r.terrain[0].kind === 'oil' && r.terrain[0].by === 'party');
  t('엔진: 문이 열리면 모두 싸운다', r.mons.every(m => m.aggro && m.spotted));
  for (let k = 0; k < 200 && !r.turn; k++) G1.tick(0.1);
  t('엔진: 모두 몰랐으면 기습 — 적의 선제권 불리', r.turn && r.sneaked === true, `turn=${!!r.turn} sneaked=${r.sneaked}`);
  const { G: G2, r: r2 } = boot(5); spawn(G2, r2, ['고블린 졸개', '고블린 졸개']); const z = r2.mons[0];
  G2.Encounter.applyPrep(r2, { dropped: [], asleep: [z], surprise: true });
  t('엔진: 잠든 적은 첫 차례를 넘긴다 · 맞으면 깬다', z.stop > 0 && z.koHit);
  for (let k = 0; k < 200 && !r2.turn; k++) G2.tick(0.1);
  t('엔진: 잠든 적이 있으면 우리가 먼저', r2.turn && r2.turn.first === 'party', r2.turn && r2.turn.first);
  t('엔진: 기습 표시는 싸움이 시작되면 지운다', r2.prepSurprise == null);
}
console.log(`prep_rules: 통과 ${ok} · 실패 ${bad}`);
process.exit(bad ? 1 : 0);
