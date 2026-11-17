'use strict';
// 게임 몬스터 표에 더하는 SRD 몬스터 (움직이는 갑옷 · 스터지 · 정령 등).
// 옛 아스트랄 타워(js/legacy/scn_astral.js — 2026-11-17 old로)에서 몬스터 등록 부분만 가져왔다.
(() => {
  const D = G.D;
  const MON = { '움직이는 갑옷': ['animated-armor', 'm_golem', 'construct'], '스터지': ['stirge', 'm_bat', 'beast'], '거대 쥐': ['giant-rat', 'm_rat', 'beast'], '도깨비불': ['will-o-wisp', 'm_phantom', 'undead'], '거대 거미': ['giant-spider', 'm_spider', 'beast'], '유령': ['ghost', 'm_phantom', 'undead'], '도플갱어': ['doppelganger', 'm_ghoul', 'humanoid'], '로크': ['roc', 'm_bat', 'beast'], '가고일': ['gargoyle', 'm_golem', 'construct'], '각성한 나무': ['awakened-tree', 'm_mandrake', 'plant'], '보라 버섯': ['violet-fungus', 'm_shroom', 'plant'] };
  for (const n in MON) { const [st, t, ty] = MON[n]; if (!G.SRD_MON[st]) continue; D.F.mon[n] = { t, ty, r: 'brute' }; D.F.STAT[n] = [st]; }
  D.F.mon['공기 정령'] = { t: 'm_phantom', ty: 'elemental', r: 'brute' }; D.F.STAT['공기 정령'] = ['air-elemental']; D.F.mon['대지 정령'] = { t: 'm_golem', ty: 'elemental', r: 'brute' }; D.F.STAT['대지 정령'] = ['earth-elemental'];
})();
