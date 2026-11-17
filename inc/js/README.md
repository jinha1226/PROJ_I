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
| `legacy/` | 옛 본 게임(용병단) 흐름 — 길드 · 마을 · 튜토리얼 · 원정 · 옛 턴 진행 · 저장 · 관계 · 성격 · 시즌 · 지역 · 옛 화면(`legacy/iso/`). **아직 불린다.** 새 게임이 대신하게 되는 대로 단계마다 `inc/old/`로 간다 (설계: `docs/superpowers/specs/2026-11-17-map-quarterview-merge-design.md` 8절) |

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
