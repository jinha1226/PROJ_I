'use strict';
// 불러오기 목록 — index.html · run.html · vfx.html · 시험(test/_load.js)이 같이 쓴다.
// 경로는 inc/ 기준, .js 없이. 순서가 곧 의존 순서다 (파일끼리 최상위 이름을 공유한다). 바꿀 때는 test/manifest_rules.js도 같이.
// 브라우저에서는 전역 MANIFEST, Node에서는 module.exports.
(function (root) {
  const M = {
  // 게임 규칙 · 상태 (옛 index.html 첫 목록 순서)
  game: [
    'js/core/core', 'js/rules/data', 'js/srd/srd_gen', 'js/srd/srd_base', 'js/srd/srd_mons', 'js/core/grid',
    'js/core/juice', 'js/legacy/season', 'js/legacy/fantasy', 'js/legacy/guild', 'js/legacy/create', 'js/legacy/persona',
    'js/rules/dnd', 'js/rules/feats', 'js/rules/trinkets', 'js/legacy/bonds', 'js/legacy/report', 'js/rules/skills',
    'js/srd/srd', 'js/srd/srd_spells', 'js/srd/srd_upcast', 'js/rules/spells', 'js/rules/traits', 'js/rules/options',
    'js/rules/pools', 'js/rules/utilspell', 'js/srd/srd_species', 'js/rules/multiclass', 'js/srd/srd_range', 'js/srd/srd_items',
    'js/rules/items', 'js/ai/skill_ai', 'js/rules/team', 'js/rules/camp', 'js/rules/skill_fx', 'js/rules/events',
    'js/legacy/npc', 'js/legacy/tutorial', 'js/rules/skill_nums', 'js/legacy/command', 'js/legacy/expedition', 'js/legacy/mission',
    'js/legacy/explore', 'js/legacy/banter', 'js/legacy/lines_danger', 'js/rules/sight', 'js/legacy/tactics', 'js/rules/foe',
    'js/rules/summon', 'js/rules/light', 'js/rules/monact', 'js/rules/actions', 'js/rules/lore', 'js/legacy/region',
    'js/legacy/scn_astral', 'js/legacy/tut_map', 'js/rules/res', 'js/legacy/turn', 'js/legacy/flow', 'js/legacy/story',
    'js/legacy/state',
  ],
  // 쿼터뷰 화면: 그림 표 · DCSS 타일 지도 · pixelfx · LAYERLAB 인형, 그다음 화면 코드 (옛 index.html 나머지 순서)
  render: [
    'js/render/artset', 'assets/dcss/map', 'js/render/pixelfx/pixelfx.bundle', 'js/render/paperdoll', 'js/render/core', 'js/render/models',
    'js/render/bake', 'js/render/sprites', 'js/render/minidoll', 'js/legacy/iso/game', 'js/render/fxlayer', 'js/render/pfx',
    'js/render/vfx', 'js/render/hdbg', 'js/render/dice', 'js/render/actors', 'js/render/props', 'js/legacy/iso/sheet',
    'js/legacy/iso/town', 'js/legacy/iso/hud', 'js/legacy/iso/cmdui', 'js/legacy/iso/codex', 'js/legacy/iso/war', 'js/legacy/iso/create',
    'js/legacy/iso/main',
  ],
  // 탐사 지도 시제품 (run.html 순서)
  explore: [
    'js/explore/core', 'js/explore/data', 'js/explore/combat', 'js/explore/gen', 'js/explore/rules', 'js/explore/layout',
    'js/explore/draw', 'js/explore/ui',
  ],
  // ?v= 캐시 깨기 없이 불러오는 큰 정적 파일 (정리 전 index.html이 그렇게 불렀다 — pixelfx 묶음은 884KB)
  fixed: ['js/render/artset', 'assets/dcss/map', 'js/render/pixelfx/pixelfx.bundle', 'js/render/paperdoll'],
  // 어디서도 불리지 않는 파일 (목록에만 적어 둔다)
  unused: ['js/core/sfx'],
  };
  if (typeof module === 'object' && module.exports) module.exports = M; else root.MANIFEST = M;
})(this);
