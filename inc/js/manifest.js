'use strict';
// 불러오기 목록 — index.html · run.html · vfx.html · 시험(test/_load.js)이 같이 쓴다.
// 경로는 inc/ 기준, .js 없이. 순서가 곧 의존 순서다 (파일끼리 최상위 이름을 공유한다). 바꿀 때는 test/manifest_rules.js도 같이.
// 브라우저에서는 전역 MANIFEST, Node에서는 module.exports.
(function (root) {
  const M = {
  // 게임 규칙 · 상태 (옛 index.html 첫 목록 순서)
  game: [
    'js/core', 'js/data', 'js/srd_gen', 'js/srd_base', 'js/srd_mons', 'js/grid',
    'js/juice', 'js/season', 'js/fantasy', 'js/guild', 'js/create', 'js/persona',
    'js/dnd', 'js/feats', 'js/trinkets', 'js/bonds', 'js/report', 'js/skills',
    'js/srd', 'js/srd_spells', 'js/srd_upcast', 'js/spells', 'js/traits', 'js/options',
    'js/pools', 'js/utilspell', 'js/srd_species', 'js/multiclass', 'js/srd_range', 'js/srd_items',
    'js/items', 'js/skill_ai', 'js/team', 'js/camp', 'js/skill_fx', 'js/events',
    'js/npc', 'js/tutorial', 'js/skill_nums', 'js/command', 'js/expedition', 'js/mission',
    'js/explore', 'js/banter', 'js/lines_danger', 'js/sight', 'js/tactics', 'js/foe',
    'js/summon', 'js/light', 'js/monact', 'js/actions', 'js/lore', 'js/region',
    'js/scn_astral', 'js/tut_map', 'js/res', 'js/turn', 'js/flow', 'js/story',
    'js/state',
  ],
  // 쿼터뷰 화면: 그림 표 · DCSS 타일 지도 · pixelfx · LAYERLAB 인형, 그다음 화면 코드 (옛 index.html 나머지 순서)
  render: [
    'js/artset', 'assets/dcss/map', 'js/iso/pixelfx/pixelfx.bundle', 'js/paperdoll', 'js/iso/core', 'js/iso/models',
    'js/iso/bake', 'js/iso/sprites', 'js/iso/minidoll', 'js/iso/game', 'js/iso/fxlayer', 'js/iso/pfx',
    'js/iso/vfx', 'js/iso/hdbg', 'js/iso/dice', 'js/iso/actors', 'js/iso/props', 'js/iso/sheet',
    'js/iso/town', 'js/iso/hud', 'js/iso/cmdui', 'js/iso/codex', 'js/iso/war', 'js/iso/create',
    'js/iso/main',
  ],
  // 탐사 지도 시제품 (run.html 순서)
  explore: [
    'js/run/core', 'js/run/data', 'js/run/combat', 'js/run/gen', 'js/run/rules', 'js/run/layout',
    'js/run/draw', 'js/run/ui',
  ],
  // 어디서도 불리지 않는 파일 (목록에만 적어 둔다)
  unused: ['js/sfx'],
  };
  if (typeof module === 'object' && module.exports) module.exports = M; else root.MANIFEST = M;
})(this);
