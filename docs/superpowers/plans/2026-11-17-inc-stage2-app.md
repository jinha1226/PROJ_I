# inc 2단계 — 새 app으로 빈 층 띄우기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/inc/`(index.html)를 새 게임 껍데기로 — 시험 층에 파티(LAYERLAB 인형)가 서 있는 쿼터뷰 화면. `?fight=test`는 방 하나에 파티와 적.

**Architecture:** 필요한 코드만 가져온다 (사용자: 「너무 오버하지마. 그냥 필요한 코드파츠만 가져오면 되는거 아니야?」). 그리기(`js/render/`)는 고치지 않는다 — 옛 규칙 모듈이 아직 불러와지므로 그리기가 읽는 `G.Turn` · `G.Fantasy` · `G.S`는 그대로 있다. 새 `js/app/boot.js`는 옛 `legacy/iso/game.js`에서 그리기에 필요한 부분(`now` · 타격 연출 `JU` · `J.hit` · `J.lunge` · `graves` · `G.isoFx` · `f` · `rt()`)만 옮기고 옛 시작(길드 · 튜토리얼 · 저장)은 뺀다. `js/app/main.js`는 옛 `legacy/iso/main.js`의 `frame()`에서 그리기 순서만 가져온다. 옛 파일은 그대로 둔다(나중에 정리).

**Tech Stack:** 바닐라 JS(전역 `G`, `js/manifest.js` 순서), 헤드리스 크롬 연기 시험(`test/page_smoke.js`).

**Spec:** `docs/superpowers/specs/2026-11-17-map-quarterview-merge-design.md` (8절 2단계)

## Global Constraints

- `js/render/*`와 규칙 · 옛 흐름 모듈은 고치지 않는다. 새로 쓰는 것은 `js/app/*` · `index.html` · `js/manifest.js` · 시험.
- 새 루프는 `G.tick` · 길드 · 튜토리얼 · 저장을 부르지 않는다.
- 남길 시험은 모두 통과(`node test/run_all.js`), `run.html` · `px_lab.html` · `vfx.html`은 그대로.
- 커밋 메시지는 한국어, `inc: ` 접두어, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. 푸시 전에 사용자에게 확인.

## Review Focus

1. **그리기가 옛 화면 파일(`legacy/iso/hud.js` 등)의 이름을 부르다 오류** — 기대: 연기 시험이 페이지 JS 오류를 잡는다. 필요한 함수가 나오면 그것만 `boot.js`로 가져온다.
2. **폰 세로 화면 · DCSS 인형 모드(`?art=dcss`)** — 기대: 둘 다 층이 그려진다.

---

### Task 1: 새 app — 시험 층 · 시작 · 루프 · index.html

**Files:**
- Create: `inc/js/app/boot.js` — 옛 `game.js`에서 그리기에 필요한 부분만 + 시험 층 · 세계 만들기
- Create: `inc/js/app/main.js` — 옛 `main.js`의 `frame()`에서 그리기 순서만
- Modify: `inc/js/manifest.js` — `app: ['js/app/boot', 'js/app/main']` 묶음. `boot`는 옛 `game` 자리(그리기 파일 사이 — `fxlayer`가 불러오는 순간 `f`를 읽는다)에 와야 하므로, index는 `game` → `render`에서 `js/legacy/iso/*`를 뺀 목록의 `game` 자리에 `js/app/boot`를 끼운 것 → `js/app/main` 순서로 불러온다 (그 순서를 `MANIFEST.app`에 한 목록으로 적어 두고 index는 `[...MANIFEST.game, ...MANIFEST.app]`).
- Modify: `inc/index.html` — 위 순서로 불러오기, 제목 "심연 탐사대". 화면 틀은 그대로(그리기가 쓰는 `#stage` · `#c` 등).
- Modify: `inc/test/page_smoke.js` — index 표지
- Modify: `inc/test/manifest_rules.js` — 새 `app` 묶음 검사 한 줄(경로가 있고 대소문자가 맞는지)

**boot.js가 하는 일:**
- 옛 `game.js`에서 가져오기: `now` · `JU` · `J.hit` · `J.lunge` · `graves`(+ `G.Story.die` 감싸기) · `G.isoFx`.
- `G.newState()` → `f = G.S.w.fantasy`, `f.town = false`, `f.leaderNew = false`. 저장 · 길드 단장 만들기 · 튜토리얼 · `?scene` 처리는 가져오지 않는다.
- 시험 층: 옛 `legacy/tut_map.js`의 `build()`처럼 방 4개를 복도로 이은 층(`?fight=test`면 방 하나). 파티는 `G.Guild.make(f, cls, { lv: 3 })`로 파이터 · 위저드 · 클레릭(3단계가 `G.Char`로 바꿈), 시작 방에 세운다. `?fight=test`면 적 셋을 옛 튜토리얼처럼 `G.Fantasy.spawnMon`으로 반대쪽에.
- `rt()`는 그 세계(`{ map, party, mons, turn: null, hero }`)를 돌려준다. `f.leader`가 필요하면 파티 첫 사람.
- `window.onerror` → `document.body.dataset.err`.

**main.js가 하는 일:** 옛 `frame()`의 그리기 줄(굽기 · 카메라 · 안개 · 소품 · 인물 · 그림자 · 이펙트 · 숫자 · 흔들림 · 인형 층 · 미니맵)만 남기고 `G.tick` · `drawBrief` · `drawBubbles` · `drawSkillNames` · `ui(r)` · `CMD.draw` · `SH`/`CDX` 검사 · `f.town` 갈래는 뺀다. 층을 다 구우면 `document.body.dataset.floor = 'ready'`, 매 초 `document.body.dataset.ents = 파티 수 + 적 수`.

- [ ] **Step 1: 실패하는 시험** — `page_smoke.js`의 index 표지를 바꾼다: `data-floor="ready"` · `data-ents="3"` · `data-err` 없음 · 서버 요청에 `/js/legacy/iso/` 없음. `index.html?fight=test` → `data-ents="6"`. `index.html?art=dcss` → `data-floor="ready"` · `data-err` 없음. 폰 크기(412×900)로 한 번 더 `data-floor="ready"`.
- [ ] **Step 2: 실패를 본다** — Run: `cd inc && node test/page_smoke.js` → Expected: index 줄 FAIL
- [ ] **Step 3: 구현** — 그리기가 옛 화면 파일의 다른 함수를 부르다 오류가 나면(`data-err`), 그 함수만 `boot.js`로 가져온다.
- [ ] **Step 4: 통과** — Run: `node test/page_smoke.js && node test/manifest_rules.js && node test/run_all.js --quick` → Expected: 전부 통과
- [ ] **Step 5: 화면 확인** — 헤드리스 크롬으로 `index.html` · `?fight=test`를 PC · 폰 크기로 캡처해 본다(커밋하지 않음).
- [ ] **Step 6: 커밋** — `inc: 새 app — 시험 층에 파티를 세운 쿼터뷰 화면 (/inc/가 새 게임 껍데기)`
- [ ] **Step 7: 푸시 전에 사용자에게 확인을 받는다.**
