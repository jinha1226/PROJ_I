'use strict';
// 파티 — 1명 시작 · 영입으로 최대 5명 · 기술 5칸 (설계 5-13): node test/party_rules.js
let ok = 0, bad = 0; const t = (name, v, extra = '') => { if (v) ok++; else { bad++; console.log('  실패:', name, extra); } };
const LOAD = require('./_load.js'), { boot } = require('./_fight.js');
const solo = seed => { const B = boot(seed), { G, f, r, ctx } = B; LOAD.load(ctx, ['run/core', 'run/data']); G.Reward.on = true;
  for (const m of f.mercs.slice()) G.Party.leave(f, r, m, null); return { ...B, RUN: ctx.RUN, st: { party: [ctx.RUN ? { cls: 'fighter', n: f.leader.name, hp: 31, max: 31 } : null] } }; };
const seq = a => { let i = 0; return () => a[i++ % a.length]; };

// 1) 혼자 시작
{ const { G, f, r } = solo(1); t('혼자: 파티 1명 (단장만)', G.Party.size(f) === 1 && r.party.length === 1, [G.Party.size(f), r.party.length]); }
// 2) 영입 후보: 셋 · 서로 다른 직업 · 파티 레벨 · 기술 5칸 · 정한 직업(튜토리얼)
{
  const { G, f } = solo(2); f.leader.lv = 2; const c = G.Party.offer(f, 3, seq([0.1, 0.7, 0.3, 0.9, 0.5]));
  t('후보 셋, 서로 다른 직업', c.length === 3 && new Set(c.map(m => m.cls)).size === 3, c.map(m => m.cls).join());
  t('후보는 파티 레벨', c.every(m => m.lv === 2), c.map(m => m.lv).join());
  t('후보의 손에 든 기술은 5개까지', c.every(m => (m.skills || []).length <= 5), c.map(m => (m.skills || []).length).join());
  const ro = G.Party.offer(f, 3, Math.random, 'rogue'); t('정한 직업이면 그 하나 (튜토리얼: 로그)', ro.length === 1 && ro[0].cls === 'rogue');
}
// 3) 들이기 · 내보내기: 엔진 파티 · 탐사 파티에 같은 차례로, 5명까지
{
  const { G, f, r, st } = solo(3), L = r.party[0];
  const [a, b] = G.Party.offer(f, 2, seq([0.2, 0.6]));
  const actor = G.Party.join(f, r, a, st, { x: L.x - 1, y: L.y });
  t('들이면 엔진 파티에 나타난다 (그 자리에)', actor && r.party.length === 2 && r.party[1].merc === a && actor.x === L.x - 1);
  t('탐사 파티에도 같은 차례로 (직업은 탐사 규칙 직업으로)', st.party.length === 2 && st.party[1].uid === a.uid && st.party[1].cls === G.Party.RUN_CLS[a.cls], JSON.stringify(st.party[1]));
  G.Party.join(f, r, b, st, null); for (const m of G.Party.offer(f, 2)) G.Party.join(f, r, m, st, null);
  t('5명까지', G.Party.size(f) === 5 && r.party.length === 5 && st.party.length === 5);
  t('5명이면 더 들이지 못한다', G.Party.join(f, r, G.Party.offer(f, 1)[0], st, null) === null && G.Party.size(f) === 5);
  const out = r.party[2].merc, keep = r.party[3].merc; G.Party.leave(f, r, out, st);
  t('내보내면 둘 다에서 같은 자리가 빠진다', G.Party.size(f) === 4 && !r.party.some(p => p.merc === out) && st.party.length === 4 && st.party[2].uid === keep.uid, st.party.map(p => p.uid).join());
  t('단장은 내보내지 못한다', G.Party.leave(f, r, f.leader, st) === false);
}
// 4) 적 수는 파티 수에 맞춘다 (3명 기준, 적어도 하나)
{
  const { G } = solo(4), u = [['고블린', 4], ['홉고블린', 1]];
  t('혼자: 고블린 넷 → 하나 · 하나는 하나', JSON.stringify(G.Encounter.scale(u, 1)) === JSON.stringify([['고블린', 1], ['홉고블린', 1]]), JSON.stringify(G.Encounter.scale(u, 1)));
  t('3명: 그대로', JSON.stringify(G.Encounter.scale(u, 3)) === JSON.stringify(u));
  t('5명: 더 많이', G.Encounter.scale(u, 5)[0][1] === 7, JSON.stringify(G.Encounter.scale(u, 5)));
}
console.log(`party_rules: 통과 ${ok} · 실패 ${bad}`);
process.exit(bad ? 1 : 0);
