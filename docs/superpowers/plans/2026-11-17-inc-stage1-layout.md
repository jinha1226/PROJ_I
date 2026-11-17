# inc 정리 1단계 — 태그 · 불러오기 목록 · 기능별 폴더 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `inc/js/`를 기능별 폴더로 옮기고, html · 시험이 같은 불러오기 목록 하나(`js/manifest.js`)를 쓰게 한다. 동작은 하나도 바꾸지 않는다.

**Architecture:** 빌드 없는 전역 스크립트(`G` 네임스페이스, 순서대로 불러오기)를 그대로 둔다. 파일 위치만 옮기고, 지금 각자 들고 있는 파일 목록(index.html · run.html · vfx.html · test/party_lab.js 정규식 · 시험 31개의 `path.join(...,'js',n+'.js')`)을 목록 하나와 시험 도우미 하나(`test/_load.js`)로 모은다. 옛 흐름 모듈은 `js/legacy/`에 모아 두되 계속 불린다 — 빼는 것은 다음 단계들(설계 8절).

**Tech Stack:** 바닐라 JS(브라우저 전역 스크립트), Node 22 `vm`으로 도는 시험, GitHub Pages 배포(`.github/workflows/pages.yml`).

**Spec:** `docs/superpowers/specs/2026-11-17-map-quarterview-merge-design.md` (5-0 · 5-1 · 8절)

## Global Constraints

- 빌드 도구를 넣지 않는다. ES 모듈(import/export)로 바꾸지 않는다.
- 불러오는 **순서**를 바꾸지 않는다 (지금 index.html · run.html의 순서 그대로).
- 파일 내용(로직)을 바꾸지 않는다. 바꿔도 되는 것: 경로 문자열, 불러오기 코드, 생성 도구의 출력 경로, 주석의 파일 경로.
- 지우지 않는다. 옮기기는 `git mv`로 (이력 유지).
- 각 작업이 끝날 때 `node test/run_all.js`가 전부 통과하고, `node test/page_smoke.js`가 통과한다.
- 커밋 메시지는 한국어, `inc: ` 접두어, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **시험이 안 덮는 페이지의 깨진 경로** — `run.html` · `vfx.html` · `px_lab.html` · `index.html`이 브라우저에서 스크립트를 못 찾으면 시험은 통과해도 화면이 빈다. → Task 1의 `page_smoke.js`가 네 페이지를 실제로 띄워 확인한다.
2. **생성 도구가 옛 경로에 파일을 다시 만든다** — `tools/srd_items.py` · `tools/srd_upcast.py` · `tools/srd_mons_db.py` · `tools/art72.js` · `tools/build_tiles.js` · `test/gen_skill_nums.js` · `test/gen_srd_base.js` · `test/gen_srd_range.js`가 `js/<이름>.js`에 쓴다. 고치지 않으면 다음 생성 때 옛 자리에 새 파일이 생기고 게임은 옮긴 옛 파일을 계속 읽는다. → Task 3의 `path_rules.js`가 저장소 안의 옛 경로 문자열을 잡는다.
3. **불러오기 순서가 바뀜** — 파일끼리 최상위 이름을 공유하므로(특히 `js/iso/*`) 순서가 곧 의존 순서다. → Task 2의 `manifest_rules.js`가 목록 순서를 지금 index.html · run.html의 순서와 비교한다.
4. **대소문자** — 작업 폴더는 Windows 드라이브(대소문자 무시)지만 Pages는 대소문자를 가린다. → `manifest_rules.js`가 목록의 모든 경로를 실제 디렉터리 항목과 대소문자까지 맞춰 본다.
5. **배포 워크플로의 시험 단계** — `pages.yml`이 `node test/sim.js 10` · `node test/run_rules.js 200`을 돌린다. `sim.js`는 자기 파일 목록을 들고 있다. → Task 2에서 `sim.js`도 도우미로 바꾸고, Task 3 끝에 워크플로가 쓰는 두 명령을 그대로 돌려 본다.

---

## 옮기는 표 (Task 3이 쓴다)

`inc/js/` 기준. 왼쪽 → 오른쪽. 표에 없는 파일은 없다(전부 61 + 3 + run 8 + iso 21 + pixelfx 폴더).

| 새 폴더 | 파일 |
|---|---|
| `core/` | core, grid, juice, sfx |
| `srd/` | srd_gen, srd_base, srd_mons, srd, srd_spells, srd_upcast, srd_species, srd_range, srd_items |
| `rules/` | data, dnd, feats, trinkets, skills, spells, traits, options, pools, utilspell, multiclass, items, team, camp, skill_fx, events, skill_nums, sight, foe, summon, light, monact, actions, lore, res |
| `ai/` | skill_ai |
| `legacy/` | season, fantasy, guild, create, persona, bonds, report, npc, tutorial, command, expedition, mission, explore, banter, lines_danger, tactics, region, scn_astral, tut_map, turn, flow, story, state |
| `explore/` | `run/` 의 core, data, combat, gen, rules, layout, draw, ui (폴더째 이름만 바꿈) |
| `render/` | artset, paperdoll, 그리고 `iso/` 의 core, models, bake, sprites, minidoll, fxlayer, pfx, vfx, hdbg, dice, actors, props, `iso/pixelfx/`(폴더째) |
| `legacy/iso/` | `iso/` 의 game, sheet, town, hud, cmdui, codex, war, create, main |

---

### Task 1: 태그 · 기준선 · 한 번에 돌리는 시험 · 페이지 연기 시험

**Files:**
- Create: `inc/test/run_all.js`
- Create: `inc/test/page_smoke.js`

**Interfaces:**
- Produces: `node test/run_all.js [--quick]` — `test/*_rules.js`(단, `flow_rules.js` 제외 · `_`로 시작하는 파일 제외)를 차례로 돌려 파일별 결과 한 줄과 합계를 찍고, 하나라도 실패(종료 코드 ≠ 0 또는 마지막 줄에 `실패 [1-9]` · `실패:`)하면 종료 코드 1. `--quick`은 `gob_rules` · `roll_rules` · `explore_rules`를 건너뛰고 `run_rules`에 인자 `40`을 준다.
- Produces: `node test/page_smoke.js` — `inc/`를 Node `http`로 임의 포트에 띄우고, 헤드리스 크롬(`process.env.CHROME`, 없으면 `~/.cache/ms-playwright/chromium_headless_shell-*/**/chrome-headless-shell`을 찾음)으로 페이지마다 `--dump-dom --virtual-time-budget=8000`을 받아 표지를 확인한 뒤 서버를 닫는다. 크롬을 못 찾으면 `건너뜀`을 찍고 종료 코드 0. 한 명령 안에서 서버를 켜고 끈다(백그라운드 서버를 남기지 않는다). 환경 변수 `BASE`(예: `https://jinha1226.github.io/PROJ_I/inc`)가 있으면 로컬 서버를 띄우지 않고 그 주소의 페이지를 본다 — 이때 "404 없음" 검사는 건너뛰고 표지만 본다.

- [ ] **Step 1: 태그를 붙인다**

```bash
cd /mnt/d/PROJ_I && git tag -a pre-crawl -m "옛 본 게임(용병단 쿼터뷰) — 탐사 지도 합치기 전" && git tag -l pre-crawl
```
Expected: `pre-crawl`

- [ ] **Step 2: `run_all.js`를 쓰고 지금 상태에서 돌린다**

Run: `cd inc && node test/run_all.js`
Expected: 31개 파일 전부 통과(기준선: act 16 · aim 10 · art 1209 · camp 46 · create 304 · danger 128 · desc 217 · event 1734 · explore 37 · fac 24 · foe · form 9 · fx 915 · gob 44 · item 386 · lore 33 · move 41 · npc 65 · num 502 · opt 1046 · range 628 · region · review 77 · roll 18 · run 5846 · scn 78 · shout 7 · srd 138 · team 51 · tut 123 · util 20), 종료 코드 0. 다른 숫자가 나오면 멈추고 보고한다.

- [ ] **Step 3: `page_smoke.js`를 쓴다 — 표지는 지금 상태에서 뽑는다**

페이지와 표지:
- `index.html`: DOM에 `id="c"`인 canvas가 있고, `localhost:8765/ 로 열어 주세요` 문구가 **없다**. 그리고 지금 상태에서 dump-dom을 떠서 `#party` · `#glog` · `#brief` 중 내용이 차는 요소를 하나 골라 "비어 있지 않음"을 표지로 삼는다(고른 요소를 주석에 적는다).
- `run.html`: `#map` 안에 자식 요소가 1개 이상 있거나 `#start`의 `#cands` 안에 후보 카드가 5개.
- `px_lab.html`: `<canvas`가 30개 이상, `불러오기 실패:` 뒤에 `${`가 아닌 글자가 오는 문구가 없다.
- `vfx.html`: 지금 상태에서 dump-dom을 떠서 목록 버튼(`class="it"`)이 1개 이상이면 그것을 표지로. 아니면 이 페이지는 "스크립트 로드 404 없음"만 본다 — 서버가 받은 요청 중 404가 없어야 한다.
- 모든 페이지 공통: 서버 로그에 `.js` 요청의 404가 하나도 없다.

- [ ] **Step 4: 지금 상태에서 통과하는지 본다**

Run: `cd inc && node test/page_smoke.js`
Expected: 네 페이지 모두 `통과`, 종료 코드 0.

- [ ] **Step 5: 커밋**

```bash
git add inc/test/run_all.js inc/test/page_smoke.js docs/superpowers/specs/2026-11-17-map-quarterview-merge-design.md docs/superpowers/plans/2026-11-17-inc-stage1-layout.md
git commit -m "inc: 정리 1단계 준비 — 시험 한 번에 돌리기 · 페이지 연기 시험, 설계 · 계획 문서"
```

---

### Task 2: 불러오기 목록 하나 + 시험 도우미 (파일은 아직 안 옮김)

**Files:**
- Create: `inc/js/manifest.js`
- Create: `inc/test/_load.js`
- Create: `inc/test/manifest_rules.js`
- Modify: `inc/index.html` (스크립트 목록 두 곳 + `artset` · `assets/dcss/map.js` · `pixelfx.bundle` · `paperdoll` 네 줄)
- Modify: `inc/run.html:31-33`
- Modify: `inc/vfx.html:137-139` (index.html을 정규식으로 읽던 부분)
- Modify: `inc/test/party_lab.js:9-10`, `inc/test/sim.js`의 `boot()` 목록, 그리고 `path.join(__dirname, '..', 'js', n + '.js')` · `${ROOT}/js/${n}.js` · `path.join(ROOT, 'js', n + '.js')` · 정규식 `/for \(const n of (\[.*?\])\)/.exec(lab)`로 목록을 얻는 모든 시험(`grep -l` 로 찾는다 — 지금 39개 파일이 party_lab을 읽고 31곳이 직접 경로를 만든다)

**Interfaces:**
- Produces: `js/manifest.js` — 브라우저에서는 전역 `MANIFEST`, Node에서는 `module.exports`. 모양:
  ```js
  { game:    ['js/core', 'js/data', ...],                  // 지금 index.html 첫 목록 순서 그대로 (61개)
    render:  ['js/artset', 'assets/dcss/map', 'js/iso/pixelfx/pixelfx.bundle', 'js/paperdoll',
              'js/iso/core', ... 'js/iso/main'],            // 지금 index.html의 나머지 순서 그대로 (4 + 21개)
    explore: ['js/run/core', ... 'js/run/ui'] }             // 지금 run.html 순서 그대로 (8개)
  ```
  경로는 `inc/` 기준, `.js` 없이. (Task 3에서 값만 새 폴더로 바뀐다.)
- Produces: `test/_load.js`
  - `group(name) -> string[]` — 그 묶음 중 `js/`로 시작하는 경로만.
  - `jsPath(n) -> string` — 이름(예: `'dnd'`, `'core'`)을 절대 파일 경로로. `game` → `render` 순서로 basename이 `n`인 첫 항목. 못 찾으면 throw `알 수 없는 파일: n`. `'iso/core'`처럼 `/`가 들어가면 `render` · `explore`에서 끝부분이 일치하는 항목.
  - `load(ctx, names = group('game')) -> void` — 각 항목을 `vm.runInContext(src, ctx, { filename })`. `names` 항목은 경로(`js/...`) 또는 이름 둘 다 받는다.
  - `NAMES.game -> string[]` — `game` 묶음의 basename 목록(지금 party_lab.js가 들고 있는 것과 같은 배열).
- 페이지: `<script src="js/manifest.js?v=${VER}"></script>`를 먼저 불러온 뒤 `for (const p of MANIFEST.game) document.write(...)` 식으로. `?v=${VER}` 캐시 깨기는 그대로.

- [ ] **Step 1: 실패하는 시험을 쓴다 — `test/manifest_rules.js`**

```js
// 시험 이름과 단언 (값은 지금 파일에서 정규식으로 뽑아 굳혀 둔 배열이다 — 아래 상수는 Step 1에서 지금 index.html · run.html을 읽어 그대로 붙여 넣는다)
const OLD_GAME = [/* 지금 index.html 첫 for 목록 61개 */];
const OLD_ISO  = [/* 지금 index.html js/iso 목록 21개 */];
const OLD_RUN  = ['core', 'data', 'combat', 'gen', 'rules', 'layout', 'draw', 'ui'];
t('game 순서가 옛 index.html과 같다', eq(M.game.map(base), OLD_GAME));
t('render 앞 넷은 artset · dcss map · pixelfx · paperdoll', eq(M.render.slice(0, 4).map(base), ['artset', 'map', 'pixelfx.bundle', 'paperdoll']));
t('render 나머지 순서가 옛 iso 목록과 같다', eq(M.render.slice(4).map(base), OLD_ISO));
t('explore 순서가 옛 run.html과 같다', eq(M.explore.map(base), OLD_RUN));
t('모든 경로의 파일이 대소문자까지 그대로 있다', allPaths.every(existsExactCase));   // 경로 조각마다 readdirSync로 확인
t('game 안 basename은 서로 다르다', new Set(M.game.map(base)).size === M.game.length);
t('jsPath("dnd")는 game의 dnd', L.jsPath('dnd').endsWith(path.join('js', ...M.game.find(p => base(p) === 'dnd').split('/').slice(1)) + '.js'));
t('jsPath("core")는 game의 core (iso/run core가 아님)', base(path.dirname(L.jsPath('core'))) !== 'iso' && base(path.dirname(L.jsPath('core'))) !== 'run');
t('jsPath 모르는 이름은 던진다', throws(() => L.jsPath('없는파일')));
```

- [ ] **Step 2: 돌려서 실패를 본다**

Run: `cd inc && node test/manifest_rules.js`
Expected: FAIL — `Cannot find module '../js/manifest.js'` 또는 `./_load.js`

- [ ] **Step 3: `js/manifest.js`와 `test/_load.js`를 쓴다**

- [ ] **Step 4: `manifest_rules.js` 통과를 본다**

Run: `cd inc && node test/manifest_rules.js`
Expected: 전부 통과

- [ ] **Step 5: 페이지 · 시험을 목록으로 바꾼다**

`index.html` · `run.html` · `vfx.html`은 `MANIFEST`로, `party_lab.js` · `sim.js`와 경로를 직접 만드는 시험은 `require('./_load.js')`의 `load` · `jsPath` · `NAMES`로. party_lab을 텍스트로 읽어 정규식으로 목록을 뽑던 시험은 그 두 줄을 `L.load(ctx)` 한 줄로 바꾼다. 바꾼 뒤 `grep -rn "'js', n + '.js'\|/js/\${n}.js\|for \\\\(const n of" inc/test inc/*.html`에 남는 것이 없어야 한다(정규식 자체를 쓰는 `manifest_rules.js`의 굳힌 배열 생성부 제외).

- [ ] **Step 6: 전부 돌린다**

Run: `cd inc && node test/run_all.js && node test/page_smoke.js && node test/sim.js 10 | tail -2`
Expected: Task 1 Step 2와 같은 숫자로 전부 통과 · 네 페이지 통과 · sim이 오류 없이 끝남

- [ ] **Step 7: 커밋**

```bash
git add inc/js/manifest.js inc/test inc/index.html inc/run.html inc/vfx.html
git commit -m "inc: 불러오기 목록 하나(js/manifest.js) — html과 시험이 같은 목록을 쓴다"
```

---

### Task 3: 기능별 폴더로 옮기기

**Files:**
- Move (`git mv`): 위 "옮기는 표" 그대로
- Modify: `inc/js/manifest.js` (경로 값만)
- Modify: 생성 도구의 출력 경로 — `inc/tools/srd_items.py:10` → `js/srd/srd_items.js`, `inc/tools/srd_upcast.py:34` → `js/srd/srd_upcast.js`, `inc/tools/srd_mons_db.py:6` 기본값 → `js/srd/srd_mons.js`, `inc/tools/art72.js:390` → `js/render/artset.js`, `inc/tools/build_tiles.js:40` → `js/render/tileset.js`(지금 그 파일이 없으면 출력 경로만 바꾼다), `inc/test/gen_skill_nums.js:38` → `js/rules/skill_nums.js`, `inc/test/gen_srd_base.js:34` → `js/srd/srd_gen.js`, `inc/test/gen_srd_range.js:40` → `js/srd/srd_range.js`. 그 밖에 `grep -rn "js/[a-z_]*\.js" inc/tools`로 더 나오면 같은 규칙으로.
- Modify: 시험 안의 `js/iso/...` · `js/run/...` 직접 경로(`fx_rules.js` 등 — `grep -rln "'iso'\|js/iso\|'run'" inc/test`)를 `_load.jsPath`로
- Modify: 문서 속 경로 — `inc/ART.md`(`js/artset.js` · `js/render.js`), `inc/ROGUELIKE_PLAN.md` 10-1절 파일 목록(`js/run/*` → `js/explore/*`), `inc/DESIGN.md`는 **고치지 않는다**(날짜별 기록이라 그때의 경로가 맞다). 대신 맨 끝에 새 절 하나("181. 파일 위치 정리 — 옛 경로 → 새 경로는 js/README.md")를 더한다.
- Create: `inc/js/README.md` — 폴더마다 한 줄 설명 + 옮기는 표 + "`legacy/`는 다음 단계들에서 old로 간다"
- Create: `inc/test/path_rules.js`

**Interfaces:**
- Consumes: Task 2의 `MANIFEST` · `_load.jsPath`
- Produces: 새 폴더 구조. 다음 단계 계획은 `js/legacy/` · `js/render/` · `js/explore/` 경로를 쓴다.

- [ ] **Step 1: 실패하는 시험을 쓴다 — `test/path_rules.js`**

```js
// 옛 최상위 경로가 저장소에 남아 있지 않다 (생성 도구 · html · 시험 · 워크플로)
const MOVED = [/* 옮기는 표의 최상위 파일 64개 이름 + 'run/' + 'iso/' */];
const SCAN = ['inc/tools', 'inc/test', 'inc/index.html', 'inc/run.html', 'inc/vfx.html', 'inc/px_lab.html', 'inc/parts.html', '.github/workflows/pages.yml'];
t('옛 js/<이름>.js 경로가 없다', hits(/js\/(NAME)\.js/).length === 0);      // NAME = MOVED를 | 로 이은 것
t('옛 js/iso/ · js/run/ 경로가 없다', hits(/js\/(iso|run)\//).length === 0);
t('js/ 바로 아래에는 manifest.js와 README.md만 남는다', eq(fs.readdirSync('inc/js').filter(f => f.endsWith('.js') || f.endsWith('.md')).sort(), ['README.md', 'manifest.js']));
// path_rules.js 자기 자신과 manifest_rules.js의 굳힌 옛 목록은 SCAN에서 뺀다
```

- [ ] **Step 2: 돌려서 실패를 본다**

Run: `cd inc && node test/path_rules.js`
Expected: FAIL — 옛 경로 다수, js/ 아래 파일 다수

- [ ] **Step 3: 옮기기 + 목록 값 바꾸기 + 도구 · 시험 · 문서 경로 바꾸기**

`git mv`로 표대로 옮기고, `manifest.js`의 경로 값만 새 자리로 바꾼다(순서는 그대로). `manifest_rules.js`의 굳힌 옛 배열은 basename 비교라 그대로 통과해야 한다.

- [ ] **Step 4: 전부 돌린다**

Run: `cd inc && node test/path_rules.js && node test/manifest_rules.js && node test/run_all.js && node test/page_smoke.js && node test/sim.js 10 | tail -2 && node test/run_rules.js 200 | tail -1`
Expected: 전부 통과, `run_all` 숫자는 Task 1 Step 2와 같음, 마지막 두 줄은 워크플로가 쓰는 명령 그대로 오류 없음

- [ ] **Step 5: 생성 도구 하나를 실제로 돌려 새 자리에 쓰는지 본다**

Run: `cd inc && node test/gen_skill_nums.js && git status --short js/`
Expected: `js/rules/skill_nums.js`만 (내용이 같으면 아무것도 안 나옴), `js/skill_nums.js`가 새로 생기지 않음

- [ ] **Step 6: 커밋**

```bash
git add -A inc .github/workflows/pages.yml
git commit -m "inc: js를 기능별 폴더로 (core · srd · rules · ai · explore · render · legacy) — 동작 그대로"
```

- [ ] **Step 7: 푸시 전에 사용자에게 확인을 받는다** (태그 `pre-crawl` 포함 푸시: `git push origin main --follow-tags`). 푸시 뒤 Pages에서 `/inc/` · `/inc/run.html` · `/inc/px_lab.html`이 열리는지 `page_smoke.js`를 Pages 주소로 돌려 본다(`BASE=https://jinha1226.github.io/PROJ_I/inc node test/page_smoke.js` — Task 1에서 `BASE`가 있으면 로컬 서버 대신 그 주소를 쓰게 만든다).
