# inc/js — 폴더

빌드 없는 전역 스크립트다. 모든 파일이 전역 `G`(탐사 시제품은 `RUN`)에 붙고, 페이지는 순서대로 불러온다. **순서가 곧 의존 순서**이고, 그 순서는 [`manifest.js`](manifest.js) 하나에만 있다. `index.html` · `run.html` · `vfx.html`과 시험(`test/_load.js`)이 이 목록을 같이 쓴다.

| 폴더 | 무엇 |
|---|---|
| `core/` | 기초: 공용 함수 · 격자 · 타격감 · 소리 |
| `srd/` | SRD 5.2.1 데이터베이스 (생성 파일 — 손으로 고치지 않는다, 각 파일 첫 줄의 생성 도구로) |
| `rules/` | SRD 규칙: 판정 · 행동 · 주문 · 기술 · 물건 · 휴식 · 몬스터 행동 · 사건 · 게임 수치표(`data.js`) |
| `ai/` | 유틸리티 AI (기술 고르기) |
| `explore/` | 탐사 지도 시제품 (`run.html`): 난수 · 수치표 · 던전 생성 · 탐사 규칙 · 임시 전투 · 종이 지도 그리기 · 화면 |
| `render/` | 쿼터뷰 화면 그리기 · LAYERLAB 인형(`paperdoll.js`) · 그림 표(`artset.js`) · pixelfx 효과 |
| `legacy/` | 옛 본 게임(용병단) 중 아직 쓰는 것 — 지형 · 길드 · 단장 만들기 · 탐험 · 진형 · 지역 · 옛 턴 · 옛 진행 · 이야기 · 저장. 남길 규칙 시험과 그리기가 아직 기댄다. 3 · 4단계가 대신하면 `inc/old/`로. 2026-11-17에 옮긴 것은 `inc/old/2026-11-17/README.md` |
| `game/` | **새 게임 규칙 — 화면 없이** (DOM · 캔버스를 쓰지 않는다, 고돗으로 옮길 부분): 운명판(`fate.js`) · 사건 줄(`feed.js`) · 탐사 층 변환 · 출구 · 길 찾기(`floor.js`) · 소리 · 적의 상태(`noise.js`) · 기름 · 마름쇠(`ground.js`) · 문 앞 준비(`prep.js`) · 전투 세우기(`encounter.js`) · 옛 엔진에 거는 고리(`bridge.js`) |
| `app/` | **새 게임 화면 · 입력** (브라우저 전용): 화면 도우미(`ui.js`) · 양피지 미니맵(`pmap.js`) · 전투 시계 · 운명판 창(`fight.js`) · 사건 그리기 — 파문 · 상태 · 바닥 것(`fx.js`) · 문 앞 준비 창 · 연출(`prep_ui.js`) · 탐사 진행(`crawl.js`) · 새 게임 시작(`boot.js` — 시험 층 · 파티, 옛 game.js에서 그리기에 필요한 부분만) · 그리기 루프(`main.js`) |

**새 게임 코드의 규칙 (2026-11-18, 나중에 고돗으로 옮기기 쉽게)**
- 규칙 · 상태는 `game/`에: 화면을 모르고, 난수는 넘겨받고(`rng`), 상태는 JSON으로 저장할 수 있는 모양으로. 화면에 알릴 일은 돌려주는 값이나 기록(사건 목록)으로.
- 화면 · 입력은 `app/`(새 게임)과 `render/`(그리기)에: `game/`의 결과를 그리고, 누른 곳을 `game/`에 넘길 뿐.
- 옛 엔진(`legacy/` · `rules/`)의 동작을 바꿀 때는 옛 파일을 고치지 않고 `game/bridge.js`에서 감싼다. 어쩔 수 없이 고친 곳은 bridge.js 머리말에 적는다.

새 파일을 더하면 `manifest.js`의 알맞은 자리에 넣고, `node test/manifest_rules.js`의 굳힌 목록은 고치지 않는다(옛 순서 비교용) — 대신 그 시험의 비교를 새 항목만큼 넓힌다.

## 옛 경로 → 새 경로 (2026-11-17 정리)

정리 전 상태는 git 태그 `pre-crawl`.

| 새 자리 | 옛 `js/<이름>.js` |
|---|---|
| `core/` | core, grid, juice, sfx |
| `srd/` | srd_gen, srd_base, srd_mons, srd, srd_spells, srd_upcast, srd_species, srd_range, srd_items |
| `rules/` | data, dnd, feats, trinkets, skills, spells, traits, options, pools, utilspell, multiclass, items, team, camp, skill_fx, events, skill_nums, sight, foe, summon, light, monact, actions, lore, res |
| `ai/` | skill_ai |
| `legacy/` | season, fantasy, guild, create, persona, bonds, report, npc, tutorial, command, expedition, mission, explore, banter, lines_danger, tactics, region, scn_astral, tut_map, turn, flow, story, state |
| `render/` | artset, paperdoll |
| `explore/` | 옛 `js/run/` 전부 |
| `render/` | 옛 `js/iso/`의 core, models, bake, sprites, minidoll, fxlayer, pfx, vfx, hdbg, dice, actors, props, `pixelfx/` |
| `legacy/iso/` | 옛 `js/iso/`의 game, sheet, town, hud, cmdui, codex, war, create, main |

`sfx.js`는 어떤 페이지도 부르지 않는다 (`manifest.js`의 `unused`).
