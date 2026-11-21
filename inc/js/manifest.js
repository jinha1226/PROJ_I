'use strict';
// 불러오기 목록 — index.html · run.html · vfx.html · 시험(test/_load.js)이 같이 쓴다.
// 경로는 inc/ 기준, .js 없이. 순서가 곧 의존 순서다 (파일끼리 최상위 이름을 공유한다). 바꿀 때는 test/manifest_rules.js도 같이.
// 브라우저에서는 전역 MANIFEST, Node에서는 module.exports.
(function (root) {
  const M = {
  // 게임 규칙 · 상태 (옛 index.html 첫 목록 순서)
  game: [
    'js/core/core', 'js/rules/data', 'js/srd/srd_gen', 'js/srd/srd_base', 'js/srd/srd_mons', 'js/core/grid',
    'js/core/juice', 'js/rules/old_stubs', 'js/legacy/fantasy', 'js/legacy/guild', 'js/legacy/create',
    'js/rules/dnd', 'js/game/fate', 'js/rules/feats', 'js/rules/trinkets', 'js/rules/skills',
    'js/srd/srd', 'js/srd/srd_spells', 'js/srd/srd_upcast', 'js/rules/spells', 'js/rules/traits', 'js/rules/options',
    'js/rules/pools', 'js/rules/utilspell', 'js/srd/srd_species', 'js/rules/multiclass', 'js/srd/srd_range', 'js/srd/srd_items',
    'js/rules/items', 'js/ai/skill_ai', 'js/rules/team', 'js/rules/camp', 'js/rules/skill_fx', 'js/rules/events', 'js/rules/skill_nums', 'js/rules/skill_eff', 'js/rules/check', 'js/legacy/explore', 'js/rules/sight', 'js/legacy/tactics', 'js/rules/foe',
    'js/rules/summon', 'js/rules/light', 'js/rules/monact', 'js/rules/actions', 'js/rules/lore', 'js/legacy/region', 'js/rules/mons_extra', 'js/rules/res', 'js/legacy/turn', 'js/legacy/flow', 'js/legacy/story',
    'js/legacy/state',
    // 새 게임 규칙 (화면 없이 — 고돗으로 옮길 부분): 층 변환 · 전투 세우기, 옛 엔진에 거는 고리는 맨 끝
    'js/game/feed', 'js/game/floor', 'js/game/noise', 'js/game/ground', 'js/game/prep', 'js/game/party', 'js/game/tavern', 'js/game/reward', 'js/game/gear', 'js/game/encounter', 'js/game/bridge', 'js/game/builds', 'js/game/ctrl',
  ],
  // 쿼터뷰 화면: 그림 표 · DCSS 타일 지도 · pixelfx · LAYERLAB 인형 → 그리기 코드 → 새 게임 시작(app/boot — 그리기 파일 사이, 옛 game.js 자리) → 루프(app/main)
  render: [
    'js/render/artset', 'assets/dcss/map', 'js/render/pixelfx/pixelfx.bundle', 'js/render/paperdoll', 'js/render/core', 'js/render/models',
    'js/render/bake', 'js/render/voxel', 'js/render/voxchar', 'js/render/sprites', 'js/render/dragon', 'js/render/minidoll', 'js/app/ui', 'js/app/pmap', 'js/app/fight', 'js/app/side', 'js/app/fx', 'js/app/prep_ui', 'js/app/reward_ui', 'js/app/check_ui', 'js/app/title_ui', 'js/app/gear_ui', 'js/app/tavern_ui', 'js/app/hud', 'js/app/crawl', 'js/app/boot', 'js/render/fxlayer', 'js/render/pfx',
    'js/render/vfx', 'js/render/hdbg', 'js/render/dice', 'js/render/actors', 'js/render/props',
    'js/app/main',
  ],
  // 탐사 지도 시제품 (run.html 순서)
  explore: [
    'js/explore/core', 'js/explore/data', 'js/explore/rooms', 'js/explore/combat', 'js/explore/gen', 'js/explore/rules', 'js/explore/layout',
    'js/explore/draw', 'js/explore/ui',
  ],
  // ?v= 캐시 깨기 없이 불러오는 큰 정적 파일 (정리 전 index.html이 그렇게 불렀다 — pixelfx 묶음은 884KB)
  fixed: ['js/render/artset', 'assets/dcss/map', 'js/render/pixelfx/pixelfx.bundle', 'js/render/paperdoll'],
  // 어디서도 불리지 않는 파일 (목록에만 적어 둔다)
  unused: ['js/core/sfx'],
  };
  if (typeof module === 'object' && module.exports) module.exports = M; else root.MANIFEST = M;
})(this);
