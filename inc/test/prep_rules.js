'use strict';
// 문 열기 (설계 5-11 — 2026-11-18부터 저절로 연다): node test/prep_rules.js
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
const mk = (o = {}) => { shut = true; const ms = [goblin(), hob()]; return { P: P0.begin({ door: { x: 7, y: 7 }, out: { x: -1, y: 0 }, locked: true, grid, mons: ms, items: { tools: 1 }, ...o }), g: ms[0], h: ms[1] }; };

// 1) 누가 어떻게 여나 (저절로): 안 잠겼으면 맨 앞 사람이 살살 · 잠겼으면 손재주 좋은 사람이 따기 두 번 · 그다음 운동 좋은 사람이 걷어차기
{
  const party = [mage, rogue, fighter], pick = io([]);
  { const { P } = mk({ locked: false }); const n = P0.next(P, party, pick); t('안 잠긴 문: 맨 앞 사람이 살살', n.who === mage && n.id === 'push', JSON.stringify(n && { w: n.who.n, id: n.id })); }
  const { P } = mk(); let n = P0.next(P, party, pick);
  t('잠긴 문 · 도구 있음: 로그가 딴다', n.who === rogue && n.id === 'pick');
  P0.open(P, rogue, 'pick', io([1])); t('따기 한 번 실패: 한 번 더 딴다', P0.next(P, party, pick).id === 'pick');
  P0.open(P, rogue, 'pick', io([1])); n = P0.next(P, party, pick);
  t('따기 두 번 실패: 파이터가 걷어찬다', n.who === fighter && n.id === 'kick', JSON.stringify({ w: n.who.n, id: n.id }));
  { const { P: Q } = mk({ items: { tools: 0 } }); const m = P0.next(Q, party, pick); t('도구 없음: 바로 걷어차기', m.who === fighter && m.id === 'kick'); }
  P0.open(P, fighter, 'kick', io([20])); t('열리면 더 하지 않는다', P0.next(P, party, pick) === null);
  { const { P: Q } = mk({ items: { tools: 0 } }); t('노크 주문을 알아도 저절로 고르지 않는다 (가장 시끄럽다)', P0.next(Q, [mage], pick).id === 'kick'); }
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
// 7) 엔진에 적용 (G.Encounter.applyPrep): 모두 싸움 · 잠든 적 · 기습
{
  const { G: G1, r } = boot(4); spawn(G1, r, ['고블린 졸개', '고블린 졸개']); for (const m of r.mons) { m.aggro = false; m.aware = 'idle'; }
  G1.Encounter.applyPrep(r, { asleep: [], surprise: true });
  t('엔진: 문이 열리면 모두 싸운다', r.mons.every(m => m.aggro && m.spotted));
  for (let k = 0; k < 200 && !r.turn; k++) G1.tick(0.1);
  t('엔진: 모두 몰랐으면 기습 — 적의 선제권 불리', r.turn && r.sneaked === true, `turn=${!!r.turn} sneaked=${r.sneaked}`);
  const { G: G2, r: r2 } = boot(5); spawn(G2, r2, ['고블린 졸개', '고블린 졸개']); const z = r2.mons[0];
  G2.Encounter.applyPrep(r2, { asleep: [z], surprise: true });
  t('엔진: 잠든 적은 첫 차례를 넘긴다 · 맞으면 깬다', z.stop > 0 && z.koHit);
  for (let k = 0; k < 200 && !r2.turn; k++) G2.tick(0.1);
  t('엔진: 잠든 적이 있으면 우리가 먼저', r2.turn && r2.turn.first === 'party', r2.turn && r2.turn.first);
  t('엔진: 기습 표시는 싸움이 시작되면 지운다', r2.prepSurprise == null);
}
// 8) 문을 열고 닫으면 길 찾기 기억(G.Grid.field)을 새로 — 닫힌 채로 기억한 길이 열린 뒤에도 남으면 적이 다가오지 못하고(전술 길 찾기)
//    보이는 위치는 '길이 없다'며 순간이동한다 (2026-11-18 사용자: 「서로 다가가는거없이 갑자기 순간이동」)
{
  const m = { w: W, h: H, c: c.slice(), passChars: '.>', ver: 1, dist: {} }; m.c[DOOR] = '#';
  const IN = 7 * W + 10, before = G.Grid.field(m, 5, 7); // 문 앞 우리 쪽 칸까지의 길 — 문이 닫힌 채로 기억된다
  t('닫힌 문: 방 안에서 문 앞까지 길이 없다', before[IN] < 0);
  G.Floor.setTiles(m, [DOOR], '.');
  t('문을 열면 길 기억을 새로: 방 안에서 문 앞까지 길이 있다', G.Grid.field(m, 5, 7)[IN] > 0);
  const hero = { x: 5, y: 7, hp: 10, kind: 'hero' }, gob = { x: 12, y: 7, hp: 7, kind: 'mon' }, rt = { map: m, party: [hero], mons: [gob] };
  const path = G.Tactics.plan(rt, gob, hero, 3, (x, y) => Math.max(Math.abs(x - 5), Math.abs(y - 7)) <= 1);
  t('문이 열린 뒤 방 안 적이 문 쪽으로 다가온다 (한 번에 못 닿아도)', path.length > 0 && path[path.length - 1].x < 12, JSON.stringify(path));
  G.Floor.setTiles(m, [DOOR], '#');
  t('다시 닫으면 다시 막힌다', G.Grid.field(m, 5, 7)[IN] < 0);
}
console.log(`prep_rules: 통과 ${ok} · 실패 ${bad}`);
process.exit(bad ? 1 : 0);
