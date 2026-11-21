'use strict';
// 빌드 (js/game/builds.js — 2026-11-21 개편): 칸 6개(1 · 1 · 3 · 5 · 9 · 13레벨에 열림) + 종족 칸. 필수 기술은 무조건 · 자유 칸은 고른다
//   node test/builds_rules.js
const { boot } = require('./_fight.js');
const { G, f } = boot(5); G.Reward.on = true;
let pass = 0, fail = 0; const ok = (n, c, d = '') => { if (c) pass++; else { fail++; console.log('  실패:', n, d); } };
const B = G.Builds, D = G.D, GD = G.Guild, nm = k => D.MSKILLS[k]?.n || k;
const mk = (c, b, sp, lv = 1) => { const m = G.Party.trim(GD.make(f, c, { lv: 1, ab: G.Party.stdAb(c) })); if (sp) m.sp = sp; B.apply(m, typeof b === 'string' ? B.byId(b) : b); for (let L = 2; L <= lv; L++) { m.lv = L; GD.grow(m); } return m; };
for (const b of B.LIST) {
  const T = B.timeline(b);
  ok(`${b.n}: 필수 기술이 모두 있는 기술`, b.core.every(k => G.Skill.SK[k]), b.core.filter(k => !G.Skill.SK[k]).join(' '));
  ok(`${b.n}: 필수 기술이 모두 20레벨 안에 생긴다`, T.filter(t => t.core).every(t => t.lv), T.filter(t => t.core && !t.lv).map(t => t.n).join(' · '));
  ok(`${b.n}: 추천(sug)이 모두 있는 기술 · 필수와 겹치지 않음`, b.sug.every(k => G.Skill.SK[k]?.run && !b.core.includes(k)), b.sug.filter(k => !G.Skill.SK[k]?.run || b.core.includes(k)).join(' '));
  const m = mk(b.cls, b, 'dwarf');
  for (let lv = 1; lv <= 20; lv++) {
    if (lv > 1) { m.lv = lv; GD.grow(m); }
    const S = B.slots(m), act = GD.active(m), picks = act.filter(k => GD.isPick(k) && !['it_wonder', 'it_sphere'].includes(k));
    ok(`${b.n}: ${lv}레벨 잠긴 칸은 비어 있다`, S.every((k, i) => lv >= B.SLOT_LV[i] || !k));
    ok(`${b.n}: ${lv}레벨 필수 기술은 그 레벨이 되면 칸에`, T.every(t => !t.core || (lv >= t.lv) === (S[t.i] === t.k)), `${S.map(nm).join(' · ')}`);
    ok(`${b.n}: ${lv}레벨 손에 든 기술 = 칸 (칸 밖 기술 없음)`, picks.every(k => B.slotted(m).includes(k)), picks.filter(k => !B.slotted(m).includes(k)).map(nm).join(' · '));
    ok(`${b.n}: ${lv}레벨 칸의 기술은 모두 손에 든다`, B.slotted(m).every(k => act.includes(k)), B.slotted(m).filter(k => !act.includes(k)).map(nm).join(' · '));
  }
  if (b.mc) ok(`${b.n}: 다중 직업 ${G.MC.label(m)}`, G.MC.lvOf(m, b.mc.cls) === b.mc.n, G.MC.label(m));
}
// 레벨업 카드: 필수 기술이 생기는 레벨에 알림 하나 · 자유 칸이 열리는 레벨에 셋 중 하나 → 고르면 그 칸에
{ const m = mk('archmage', 'wizard', 'dwarf'); m.lvq = [];
  for (let lv = 2; lv <= 9; lv++) { m.lv = lv; GD.grow(m); }
  const q = m.lvq.filter(h => h.k === 'plan');
  ok('레벨업 카드: 위저드 3 · 5레벨에 필수(안개 걸음 · 작열 광선 · 화염구) · 9레벨에 자유 칸', q.filter(h => h.core).map(h => h.key).join() === 'sr_misty,sr_sray,sr_fireball' && q.filter(h => h.free).map(h => h.slot).join() === '4', JSON.stringify(q));
  while (m.lvq.length && !m.lvq[0].free) m.lvq.shift();
  const o = G.Reward.offer(m); ok('레벨업 카드: 자유 칸은 추천 하나 + 둘', o.kind === 'plan' && o.options[0].plan && o.options.length === 3, JSON.stringify(o.options?.map(c => c.id)));
  const alt = o.options[2]; G.Reward.choose(m, alt);
  ok('레벨업 카드: 고른 기술이 그 칸에 · 손에 든다', B.slots(m)[4] === alt.id && GD.active(m).includes(alt.id), `${alt.id} / ${B.slots(m).join()}`); }
// 자유 칸 고치기 (전투 밖) · 필수 칸은 못 고친다 · 추천대로
{ const m = mk('archmage', 'wizard', 'dwarf', 13), s0 = B.slots(m);
  ok('위저드 13레벨: 자유 두 칸이 추천으로 (얼음 폭풍 · 냉기 분사)', s0[4] === 'sr_ice' && s0[5] === 'sr_cone', s0.join());
  ok('필수 칸은 못 고친다', !B.setSlot(m, 0, 'sr_ice'));
  ok('후보에 없는 기술은 못 넣는다', !B.setSlot(m, 5, 'sp_time_stop'));
  ok('자유 칸에 연쇄 번개', B.setSlot(m, 5, 'sr_chain') && B.slots(m)[5] === 'sr_chain' && GD.active(m).includes('sr_chain') && !GD.active(m).includes('sr_cone'));
  m.lv = 17; GD.grow(m); ok('17레벨: 고친 칸은 그대로', B.slots(m)[5] === 'sr_chain');
  ok('17레벨: 유성 폭풍이 후보에', B.pool(m, 4).includes('sr_meteor'));
  B.resetSlots(m); ok('추천대로', B.slots(m)[5] === 'sr_cone'); }
// 하위 직업이 늘 준비해 주는 주문은 자유 칸 후보로 (악마 워락의 화염구는 5레벨부터 — 주문 레벨대로)
{ const m = mk('cleric', 'cleric_war', 'dwarf', 9); ok('전투 클레릭 9레벨: 생명 권역 주문(소생술)이 자유 칸 후보', B.pool(m, 4).includes('sr_revive'), B.pool(m, 4).map(nm).join(' · '));
  ok('주문 레벨: 워락 화염구는 5레벨', GD.skLv('warlock', 'sr_fireball') === 5 && GD.skLv('warlock', 'sr_sray') === 3); }
// 종족 칸: 6칸 밖 · 숨결 · 비행 · 아드레날린
{ const fi = mk('dragoon', 'fighter', 'dragonborn', 6);
  ok('드래곤본: 종족 칸에 숨결 · 손에 든다', B.race(fi) === 'sr_breath' && GD.active(fi).includes('sr_breath'), B.race(fi));
  ok('드래곤본: 비행으로 바꾼다', B.setRace(fi, 'sx_fly') && B.race(fi) === 'sx_fly' && GD.active(fi).includes('sx_fly') && !GD.active(fi).includes('sr_breath'));
  const wz = mk('archmage', 'wizard', 'orc', 13); ok('오크 위저드 13레벨: 6칸 + 아드레날린', B.slots(wz).filter(Boolean).length === 6 && B.slotted(wz).includes('sx_orc') && GD.active(wz).includes('sx_orc'), B.slotted(wz).join()); }
// 선술집 손님은 빌드를 가지고 온다 (무게대로 — 기본 빌드가 가장 흔하다)
{ const cnt = {}; for (let i = 0; i < 400; i++) { const m = G.Party.trim(GD.make(f, 'paladin', { lv: 1 })); B.assign(m); cnt[m.build] = (cnt[m.build] || 0) + 1; }
  ok('손님: 팔라딘은 기본 빌드가 가장 흔하다', cnt.paladin > (cnt.paladin_shield || 0) && cnt.paladin > (cnt.sorcadin || 0), JSON.stringify(cnt)); }
console.log(`builds_rules: 통과 ${pass} · 실패 ${fail}`);
if (fail) process.exitCode = 1;
