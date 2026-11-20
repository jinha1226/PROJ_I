'use strict';
// 빌드 계획 (js/game/builds.js): 선술집 손님이 가진 6칸 계획이 레벨을 올리면 실제로 열리고 쓰이는가
//   node test/builds_rules.js
const { boot } = require('./_fight.js');
const { G, f } = boot(5); G.Reward.on = true;
let pass = 0, fail = 0; const ok = (n, c, d = '') => { if (c) pass++; else { fail++; console.log('  실패:', n, d); } };
const B = G.Builds, D = G.D, GD = G.Guild, LV = 20; // 계획은 전체 레벨로 짠다 (14 · 17레벨 기능도 계획에 든다)
for (const b of B.LIST) {
  const m = G.Party.trim(GD.make(f, b.cls, { lv: 1, ab: G.Party.stdAb(b.cls) })); B.apply(m, b);
  const keys = b.path.map(e => (Array.isArray(e) ? e[0] : e)), T = B.timeline(b);
  ok(`${b.n}: 경로의 기술이 모두 있는 기술`, keys.every(k => G.Skill.SK[k]), keys.filter(k => !G.Skill.SK[k]).join(' '));
  ok(`${b.n}: 경로의 기술이 모두 20레벨 안에 생긴다`, T.every(t => t.lv), T.filter(t => !t.lv).map(t => t.n).join(' · '));
  for (let lv = 2; lv <= LV; lv++) { m.lv = lv; GD.grow(m); const s = B.slotted(m); if (s.length > B.SLOT_N) ok(`${b.n}: ${lv}레벨 6칸 이하`, false, s.length); ok(`${b.n}: ${lv}레벨 — 실제 칸 = 성장표의 칸`, s.join() === B.loadoutAt(b, lv).join(), `${s.join()} / ${B.loadoutAt(b, lv).join()}`); }
  const s = B.slotted(m), act = GD.active(m), picks = act.filter(k => GD.isPick(k));
  const last = keys.filter(k => !b.path.some(e => Array.isArray(e) && e[1] === k));
  ok(`${b.n}: 20레벨 칸 = 내려놓지 않은 기술 전부`, s.length === Math.min(B.SLOT_N, last.length) && last.every(k => s.includes(k)), `${s.map(k => D.MSKILLS[k]?.n).join(' · ')}`);
  ok(`${b.n}: 손에 든 기술 = 열린 칸 (계획 밖 기술 없음)`, picks.every(k => s.includes(k) || ['it_wonder', 'it_sphere'].includes(k)), picks.filter(k => !s.includes(k)).map(k => D.MSKILLS[k]?.n || k).join(' · '));
  ok(`${b.n}: 열린 칸은 모두 손에 든다`, s.every(k => act.includes(k)), s.filter(k => !act.includes(k)).map(k => D.MSKILLS[k]?.n || k).join(' · '));
  if (b.mc) ok(`${b.n}: 다중 직업 ${G.MC.label(m)}`, G.MC.lvOf(m, b.mc.cls) === b.mc.n, G.MC.label(m));
}
// 레벨업 카드: 경로의 기술이 생기는 레벨에 고르기 — 계획한 기술이 꼭 끼고 나머지는 다른 길. 다른 길을 고르면 경로가 바뀐다
{ const b = B.byId('wizard'), m = G.Party.trim(GD.make(f, 'archmage', { lv: 1, ab: G.Party.stdAb('archmage') })); B.apply(m, b); m.lvq = [];
  for (let lv = 2; lv <= 5; lv++) { m.lv = lv; GD.grow(m); }
  const q = m.lvq.filter(h => h.k === 'plan').map(h => h.key), want = B.timeline(b).filter(t => t.lv >= 2 && t.lv <= 5).map(t => t.k);
  ok('레벨업 카드: 경로의 기술이 생기는 레벨마다 하나', q.join() === want.join(), `${q.join()} / ${want.join()}`);
  while (m.lvq.length && m.lvq[0].k !== 'plan') m.lvq.shift();
  const o = G.Reward.offer(m); ok('레벨업 카드: 계획한 기술이 꼭 끼고 셋까지', o.kind === 'plan' && o.options[0].plan && o.options[0].id === m.lvq[0].key && o.options.length <= 3 && o.options.length >= 2, JSON.stringify(o.options.map(c => c.id)));
  const was = m.lvq[0].key, alt = o.options.find(c => !c.plan); G.Reward.choose(m, alt);
  ok('레벨업 카드: 다른 길을 고르면 경로 · 칸이 그 기술로', m.plan.map(e => (Array.isArray(e) ? e[0] : e)).includes(alt.id) && !m.plan.map(e => (Array.isArray(e) ? e[0] : e)).includes(was) && B.slotted(m).includes(alt.id), alt.id); }
// 선술집 손님은 빌드를 가지고 온다 (무게대로 — 기본 빌드가 가장 흔하다)
{ const cnt = {}; for (let i = 0; i < 400; i++) { const m = G.Party.trim(GD.make(f, 'paladin', { lv: 1 })); B.assign(m); cnt[m.build] = (cnt[m.build] || 0) + 1; }
  ok('손님: 팔라딘은 기본 빌드가 가장 흔하다', cnt.paladin > (cnt.paladin_shield || 0) && cnt.paladin > (cnt.sorcadin || 0), JSON.stringify(cnt)); }
console.log(`builds_rules: 통과 ${pass} · 실패 ${fail}`);
if (fail) process.exitCode = 1;
