# inc 6단계 — 주사위 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **실행 전제**: 2~5단계가 끝나 있어야 한다. 아래 "앞 단계에서 받는 것"은 설계 8절의 "단계 사이에 주고받는 이름" 표와 같다. **실행 직전에 실제 코드와 대조하고, 다르면 이 계획의 이름을 고친 뒤 시작한다**.

**Goal:** 큰 컨셉 "주사위를 다루는 탐사대"의 플레이어 몫을 만든다 — 라운드마다 파티 주사위를 굴리고, 한 번 다시 굴리고, AI가 배분한 것을 맞바꾸고, 원정 전에 특수 주사위와 기술 칸을 골라 간다.

**Architecture:** 4단계가 만든 주사위 자리(`js/rules/fate.js`의 `G.Dice = { ctx, d20 }`)를 채운다 — 굴리기 · 다시 굴리기 · 배분은 화면과 무관한 순수 함수, 구역 전투에는 전투당 한 번 `attach`로 훅을 건다. 전투 진행(`G.Zone.step`)은 주사위가 정해질 때까지 `{ wait: 'dice' }`를 돌려 화면이 플레이어를 기다린다. 봇은 zone_lab에서 "AI 기본값"과 "더 나은 판단"의 차이를 같은 시드로 짝지어 잰다.

**Tech Stack:** 바닐라 JS(전역 `G`, `js/manifest.js` 순서), Node `vm` 시험(`test/_load.js`), 헤드리스 크롬 연기 시험(`test/page_smoke.js`).

**Spec:** `docs/superpowers/specs/2026-11-17-map-quarterview-merge-design.md` (5-5 · 5-8 · 5-9 · 6 · 8절)

## Global Constraints

- 적은 보통 d20을 굴린다. 라운드 주사위 · 특수 주사위는 **아군만** 쓴다. 이니셔티브에는 쓰지 않는다.
- 판정 · 피해 · 상태는 SRD 그대로. 주사위가 바꾸는 것은 "d20 자리에 들어가는 숫자"뿐이고, **이점 · 불리는 살아 있다** (이점이면 보통 d20 하나와 큰 쪽, 불리면 작은 쪽 — 설계 5-9).
- 게임 고유 보너스는 굴림 하나에 합쳐 +5까지, 배율 없음 (ROGUELIKE_PLAN 6-1 안전장치).
- 슬롯 머신 겉모습을 쓰지 않는다 — 트레이는 TRPG 테이블의 주사위 (설계 5-9 주의 1). 화면 글에 "D&D"를 쓰지 않는다 — 표기 옵션은 "숫자 / 주사위식" (주의 2).
- 위험한 면(즉사)은 굴리기 전부터 눈에 보이고, **맡을 사람을 굴리기 전에 정한다** (사용자 결정).
- 플레이어 조작은 라운드마다 1~3번: (죽음의 주사위가 있으면 맡을 사람) + 다시 굴리기 한 번 + 맞바꾸기. AI 행동 고치기는 선택.
- 전투 중 굴림은 모두 `zs.rng` (4단계). 수치는 모두 시험값 — `G.Dice.K`에 모은다.
- 커밋 메시지는 한국어, `inc: ` 접두어, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## 앞 단계에서 받는 것 (설계 8절 표)

- 4단계: `js/rules/fate.js`의 `G.Dice = { ctx: null, d20(adv) }` — `G.Dnd.d20`이 이것을 부르고, 구역 엔진이 아군 굴림 직전에 `G.Dice.ctx = { actor, kind: 'attack'|'check'|'save', targets }`를 채우고 **그 행동이 끝날 때** 비운다. 지금 `d20(adv)`은 보통 d20(`zs.rng`).
- 4단계: `G.Zone.create(fight, opts) -> zs { party, foes, round, rng, hooks: { roundStart: [], beforeTurn: [] } }` · `G.Zone.step(zs) -> { done, win } | { wait: 'dice' }` · `G.Zone.intent(zs, actor) -> { skill, target, roll: 'attack'|'check'|'save'|'none' }` · `G.Zone.hitP(zs, actor, intent, d20) -> number`(0 또는 1, 치명타 · 자동 실패 포함, `save`면 "대상이 실패할" 쪽) · `G.Zone.value(zs, actor, intent) -> number`(유틸리티 AI 점수 단위).
- 5단계: `js/ui/battle.js`의 `BattleUI.card(actor)` · `BattleUI.pause()` · `BattleUI.resume()`, `test/zone_lab.js`의 `runBattle(cfg) -> { win, rounds, deaths, ... }` (cfg: `board` · `Z` · `seed` · `encounter` · `party` · `policy`).
- 2 · 3단계: 시험 주소 `?fight=test`, 출발 화면 `StartUI`(판 상태 전에 그리고 고른 뒤 `RUN.newFloor`), 판 상태 `st`(`st.party` SRD 엔티티).

## Review Focus

1. **죽음의 주사위를 맡은 사람이 즉사 — 플레이어가 몰랐다** — 기대: 맡을 사람을 굴리기 전에 카드에 붉은 표시로 보이고, 즉사가 나오면 그 라운드는 자동 진행 없이 멈춘다. → Task 3 · 5 시험.
2. **다시 굴리기를 두 번 한다** — 버튼 연타 · 맞바꾼 뒤 다시 누르기. 기대: 라운드당 한 번. → Task 2 · 5 시험.
3. **쓰러진 사람에게 주사위가 간다 / 파티가 1명** — 기대: 살아 있는 사람에게만, 주사위 수 = 살아 있는 인원 + 1. → Task 3 시험.
4. **배분된 주사위가 그 행동에 안 쓰이거나 두 번 쓰인다** — 굴림 없는 행동(치유 · 강화), 차례 전에 대상이 쓰러져 행동이 바뀜, 범위 주문(대상 여럿). 기대: 굴림 없는 행동에는 가장 낮은 주사위, 행동이 바뀌어도 그 사람의 그 행동에 쓰고, 범위 주문은 모든 대상 내성에 21 − 값. → Task 4 시험.
5. **적의 굴림에 라운드 주사위가 섞인다** — `G.Dice.ctx`가 안 비워진 채 적 차례. 기대: 적은 늘 보통 d20. → Task 4 시험.

---

## 정한 규칙 (시험값)

| 항목 | 값 |
|---|---|
| 라운드 주사위 수 | 살아 있는 아군 + 1 (남는 하나는 예비) |
| 특수 주사위 칸 | 원정 전에 2개까지 (`K.SLOTS = 2`), 같은 종류 두 개는 안 됨 — 라운드 주사위 중 그만큼이 특수 주사위로 바뀐다 |
| 죽음의 주사위 | 라운드를 굴리기 전에 맡을 사람을 정한다(AI 추천: 체력 비율이 가장 높은 사람, 플레이어가 바꿀 수 있음). 그 주사위는 맡은 사람에게 고정 — 예비로 보내거나 맞바꿀 수 없다. 다시 굴리기는 된다 |
| 다시 굴리기 | 라운드당 1번, 고른 주사위들을 한꺼번에 |
| 공격 · 판정 | 배분된 주사위의 값이 그 사람의 **그 행동의 첫 d20** (20 치명타 · 1 자동 실패는 SRD대로). 이점이면 보통 d20 하나를 더 굴려 큰 쪽, 불리면 작은 쪽 |
| 내성 주문 | 그 행동의 **모든 대상** 내성 d20 = 21 − 주사위 값 (이점 · 불리는 대상 쪽 규칙대로 보통 d20과 비교) |
| 굴림 없는 행동 | 주사위를 쓰지 않는다 |
| 즉사 면 | 맡은 사람이 차례 시작에 쓰러지고 사망 (SRD 사망, 사망 내성 없음) |
| 하플링 행운 · 영웅적 영감 | 배분된 주사위도 "굴린 d20" — 1이면 하플링 행운으로, 영감으로는 언제든, **같은 종류 주사위**를 다시 굴린다 |

**특수 주사위 4종**

| id | 이름 | 면 | 뜻 |
|---|---|---|---|
| `gamble` | 모 아니면 도 | 1 · 1 · 1 · 1 · 20 · 20 | 사용자 예시 |
| `doom` | 죽음의 주사위 | 20 · 20 · 20 · 20 · 즉사 | 사용자 예시 (5면) |
| `steady` | 고른 주사위 | 8 · 9 · 10 · 11 · 12 · 13 | 실패도 대성공도 없다 |
| `twin` | 쌍둥이 | d20 두 번 중 높은 쪽 | SRD 이점과 같은 모양 |

**AI 배분 점수**: `worth(actor, die) = hitP · value + (die가 20이면 치명타 추가분 = value × 0.5)` (`roll`이 `none`이면 0, `save`면 `hitP`에 21 − 값). 같은 합이면 ① `value`가 큰 사람에게 높은 주사위 ② 굴림 없는 행동에는 가장 낮은 주사위 ③ 예비는 남은 것 중 가장 높은 것.

---

### Task 1: 주사위 굴리기

**Files:**
- Modify: `inc/js/rules/fate.js` (4단계가 만든 파일에 `K` · `KINDS` · `roll`을 더함)
- Test: `inc/test/dice_rules.js`

**Interfaces:**
- Produces: `G.Dice.K = { SLOTS: 2 }` · `G.Dice.KINDS: { [id]: { n: string, faces?: (number|'death')[], roll?: (rng) => number } }` (`d20`과 위 4종) · `G.Dice.roll(kind: string, rng) -> { kind, face: number|'death', value: number|null, special: 'death'|null }`

- [ ] **Step 1: 실패하는 시험** — `dice_rules.js` (시드 고정 `RUN.rng(7)`):
  - `roll('gamble')` 1만 번: 값은 1 또는 20뿐, 1의 비율 0.62~0.71.
  - `roll('doom')` 1만 번: 즉사 비율 0.17~0.23, 즉사면 `value === null && special === 'death'`, 아니면 20.
  - `roll('steady')`: 값 8~13, 평균 10.3~10.7.
  - `roll('twin')`: 값 1~20, 평균 13.4~14.2.
  - `roll('d20')`: 값 1~20, 평균 10.2~10.8.
  - 같은 시드 → 같은 결과. 모르는 kind는 던진다.
- [ ] **Step 2: 실패를 본다** — Run: `cd inc && node test/dice_rules.js` → Expected: FAIL (`G.Dice.roll is not a function`)
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과** — `node test/dice_rules.js` → 전부 통과
- [ ] **Step 5: 커밋** — `inc: 주사위 굴리기 (보통 d20 · 특수 4종)`

### Task 2: 라운드 주사위 · 다시 굴리기

**Files:**
- Modify: `inc/js/rules/fate.js`
- Test: `inc/test/dice_rules.js`

**Interfaces:**
- Produces: `G.Dice.pool(loadout: string[], alive: number, rng) -> Pool` — `Pool = { dice: Roll[], rerolled: false }`, 길이 `alive + 1`, 앞쪽 `min(loadout.length, K.SLOTS, alive + 1)`개가 특수 주사위(같은 종류 중복은 하나만), 나머지 `d20`.
- Produces: `G.Dice.reroll(pool, idxs: number[], rng) -> boolean` — 처음이면 그 주사위들만 같은 kind로 다시 굴리고 `pool.rerolled = true`, `true`. 이미 했으면 아무것도 안 하고 `false`. 빈 `idxs`면 `false`이고 `rerolled`는 그대로(기회를 날리지 않게).

- [ ] **Step 1: 실패하는 시험**: 살아 있는 3명 · 특수 `['gamble','doom']` → 주사위 4개, kind 순서 `gamble, doom, d20, d20`. 특수 3개 · 같은 종류 둘을 넣어도 2개 · 중복 없음. 살아 있는 1명 → 2개. `reroll(pool, [2])` → 2번만 바뀔 수 있고 나머지 그대로, `true`. 두 번째 → `false`. 빈 `idxs` → `false`, 그 뒤 `reroll(pool, [0])`은 `true`.
- [ ] **Step 2: 실패를 본다** — `node test/dice_rules.js` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과**
- [ ] **Step 5: 커밋** — `inc: 라운드 주사위 · 다시 굴리기 한 번`

### Task 3: 죽음의 주사위 맡기 · AI 배분 · 맞바꾸기

**Files:**
- Modify: `inc/js/rules/fate.js`
- Test: `inc/test/dice_rules.js`

**Interfaces:**
- Consumes: `G.Zone.intent` · `G.Zone.hitP` · `G.Zone.value`
- Produces: `G.Dice.bearer(zs) -> actor` — 죽음의 주사위를 맡을 AI 추천(살아 있는 사람 중 체력 비율이 가장 높은 사람).
- Produces: `G.Dice.worth(zs, actor, roll) -> number` — 위 "AI 배분 점수".
- Produces: `G.Dice.allocate(zs, pool, fixed: Map<actor, number>) -> Map<actor, number>` — `fixed`(죽음의 주사위 → 맡은 사람)는 그대로 두고, 나머지 살아 있는 아군 각자에게 서로 다른 주사위 하나, 합 `worth`가 가장 큰 배정(사람 ≤ 4, 주사위 ≤ 5라 순열 전수), 동점 규칙은 위 표.
- Produces: `G.Dice.swap(alloc, a: actor, b: actor | 'spare', fixed) -> boolean` — 고정된 주사위가 걸리면 `false`이고 바꾸지 않는다.

- [ ] **Step 1: 실패하는 시험** — 가짜 `zs`(`G.Zone`의 세 함수를 시험 안에서 바꿔 끼움, `hitP`는 "d20 ≥ 11이면 1, 아니면 0")로:
  - 공격수 A(`value` 10) · 공격수 B(`value` 3) · 치유자 C(`roll: 'none'`), 주사위 `[18, 4, 12, 7]` → A가 18, B가 12, C가 4(가장 낮은 것), 예비 7.
  - 주사위에 20이 있으면 `value`가 큰 사람이 20을 받는다(치명타 추가분).
  - 내성 주문을 쓰는 사람에게는 21 − 값이 11 이상이 되는 낮은 주사위가 간다.
  - 죽음의 주사위를 B에게 `fixed` → B는 그 주사위, 다른 배정에서 빠짐, `swap(alloc, B, 'spare', fixed)` → `false`.
  - 쓰러진 사람(`hp <= 0`)은 배분 · 추천에서 빠진다. `bearer`는 체력 비율이 가장 높은 사람.
  - `swap(alloc, A, 'spare')` 뒤 A의 주사위 = 예비였던 것.
- [ ] **Step 2: 실패를 본다**
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과**
- [ ] **Step 5: 커밋** — `inc: 죽음의 주사위 맡기 · AI 배분 · 맞바꾸기`

### Task 4: 구역 전투에 꽂기

**Files:**
- Modify: `inc/js/rules/fate.js` (`G.Dice.d20` 채우기, `G.Dice.attach`)
- Modify: `inc/js/combat/zone.js` (전투를 만들 때 `G.Dice.attach(zs, opts)` 한 번, `step`이 `zs.dice.ready === false`면 `{ wait: 'dice' }`)
- Test: `inc/test/zone_rules.js` (4단계 시험에 덧붙임)

**Interfaces:**
- Produces: `G.Dice.attach(zs, { loadout: string[], policy })` — **전투당 한 번** 부른다. `zs.hooks.roundStart`에 함수를 등록: 라운드마다 `zs.dice = { pool, fixed, alloc, used: Set<actor>, ready: false }`를 만들고 `policy`를 부른다. `policy`는 `{ bearer(zs) -> actor, reroll(zs) -> number[], swaps(zs) -> [a, b][] }`, 봇은 바로 돌려주고, 화면 정책은 `ready`를 `false`로 둔 채 돌아와 플레이어 입력 뒤 `G.Dice.commit(zs, { bearer, reroll, swaps })`로 `ready = true`.
- Produces: `G.Dice.commit(zs, choice)` — 맡을 사람 고정 → 굴리기 → 다시 굴리기 → 배분 → 맞바꾸기 순서로 적용하고 `ready = true`. (맡을 사람은 굴리기 전에 정해지므로 화면은 두 번 묻는다: 라운드 시작 "누가 죽음의 주사위를 맡나" → 굴린 뒤 "다시 굴리기 · 맞바꾸기". 봇은 한 번에.)
- Produces: `G.Dice.d20(adv) -> number` — `ctx.actor`가 아군이고 이번 라운드 그 사람의 배분 주사위가 아직 `used`가 아니면: `attack`/`check`면 그 값(이점이면 보통 d20과 큰 쪽, 불리면 작은 쪽), `save`면 21 − 값(대상 쪽 이점 · 불리는 그 대상 규칙대로 보통 d20과 비교). **그 행동이 끝날 때** `used`에 넣는다(범위 주문의 대상 여럿에 같은 값). 그 밖에는 보통 d20(`zs.rng`, 이점 · 불리 그대로).
- Produces: 즉사 — `beforeTurn`에서 그 사람의 배분이 즉사면 쓰러짐 + 사망, 기록 한 줄("죽음의 주사위가 ○○를 데려갔다").

- [ ] **Step 1: 실패하는 시험** (zone_rules에 덧붙임):
  - 파이터에게 20을 강제 배분 → 그 차례 공격이 치명타(피해 주사위 두 배).
  - 같은 파이터가 어둠으로 불리 + 18 배분, 보통 d20이 5 → 그 공격의 d20은 5.
  - 위저드의 범위 내성 주문(대상 셋)에 18 배분 → 세 대상의 내성 d20이 모두 3.
  - 5레벨 파이터(시험용 엔티티 — 추가 공격)의 두 번째 공격은 보통 d20.
  - 적 차례의 d20은 배분과 무관 (`ctx`가 비워졌는지).
  - 즉사 배분 → 차례 시작에 사망, 다음 라운드 주사위 수가 하나 준다.
  - 치유(`roll: 'none'`)에게 간 주사위는 쓰이지 않고 `used`에 안 들어간다.
  - 화면 정책(`ready` 안 됨) → `step`이 `{ wait: 'dice' }`, `commit` 뒤 진행.
  - 하플링 로그의 배분 주사위가 1 → 같은 종류로 다시 굴린 값이 쓰인다.
- [ ] **Step 2: 실패를 본다** — `node test/zone_rules.js` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과** — `node test/zone_rules.js && node test/dice_rules.js` → 통과
- [ ] **Step 5: 커밋** — `inc: 라운드 주사위를 구역 전투에 — 첫 d20 · 이점/불리 · 내성 뒤집기 · 즉사 · 기다리기`

### Task 5: 주사위 트레이 (쿼터뷰 전투 화면)

**Files:**
- Create: `inc/js/ui/dicetray.js` (상태는 순수 함수 `TrayState`, 그리기는 DOM)
- Modify: `inc/js/manifest.js` (`render` 묶음 끝 — 5단계가 ui 묶음을 만들었으면 그쪽)
- Modify: `inc/js/ui/battle.js` (카드에 배분된 주사위 칸, 죽음의 주사위 맡은 사람 표시)
- Test: `inc/test/tray_rules.js` (순수 상태), `inc/test/page_smoke.js` (표지)

**Interfaces:**
- Produces: `TrayState.init(zs) -> t` · `TrayState.setBearer(t, actor)` · `TrayState.toggle(t, i)` (다시 굴릴 주사위 고르기) · `TrayState.canReroll(t) -> boolean` · `TrayState.pickSwap(t, who)` (두 번 누르면 맞바꿈, 고정된 것은 안 됨) · `TrayState.choice(t) -> { bearer, reroll: number[], swaps }`
- 흐름: 라운드 시작 → (죽음의 주사위가 있으면) "누가 맡나" — AI 추천이 붉게 표시된 채 기다림 → 굴러 멈춤 → AI 배분이 카드에 붙음 → **기본은 멈춰서 기다린다**("진행" 한 번). 설정 "주사위 자동"이 켜져 있으면 1.2초 뒤 저절로. 즉사가 나오면 자동이어도 멈춘다.
- 표시: 카드의 주사위 칸에 값, 즉사는 붉은 해골. 특수 주사위는 모양 · 색이 다르다(TRPG 주사위 — 슬롯 릴 모양 금지). 숫자 표기면 결과("18 → 명중"), 주사위식 표기면 "18 + 5 대 AC 15" (설계 5-9).
- 조작: 주사위 누르기 = 다시 굴릴 것 고르기, "다시 굴리기" 버튼(라운드당 한 번), 카드 두 장(또는 카드와 예비) 누르기 = 맞바꾸기. PC 단축키: `Space` 진행 · `R` 다시 굴리기 · `1`~`4` 카드 고르기.

- [ ] **Step 1: 실패하는 시험** — `tray_rules.js`: 아무것도 안 고르면 `canReroll` 거짓, 하나 고르면 참, `choice` 뒤 다시 거짓. `pickSwap(A)` → `pickSwap(B)` 뒤 둘이 바뀜, 같은 사람 두 번 → 취소, 죽음의 주사위 맡은 사람은 맞바꿀 수 없음. `page_smoke.js`의 `?fight=test`에 `class="dicetray"`와 `class="die"` (살아 있는 인원 + 1)개.
- [ ] **Step 2: 실패를 본다** — `node test/tray_rules.js && node test/page_smoke.js` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과**
- [ ] **Step 5: 커밋** — `inc: 전투 화면 주사위 트레이 — 맡기 · 다시 굴리기 · 맞바꾸기`

### Task 6: 원정 준비 — 특수 주사위와 기술 칸 고르기

**Files:**
- Modify: `inc/js/app/start.js` (`StartUI` — 파티 고르기 아래 주사위 칸 2개, 사람마다 기술 칸 3개)
- Modify: `RUN.newFloor` (3단계)에 `st.dice: string[]` · 사람마다 `m.slots: string[]`(기술 칸)
- Test: `inc/test/floor_rules.js` (3단계의 층 시험에 덧붙임), `inc/test/page_smoke.js`

**Interfaces:**
- Produces: `st.dice` (특수 주사위 id 배열, 길이 ≤ `K.SLOTS`, 중복 없음) — 전투를 만들 때 `G.Dice.attach(zs, { loadout: st.dice, policy })`로 넘어간다.
- Produces: `m.slots` — 기술 칸(전투 · 탐험 공용, 3레벨 3칸, 설계 5-5). 기본값은 추천 구성(위저드: 불꽃 화살 · 빛 · 마법 화살 등 — 설계 5-2 표 안에서). 구역 전투의 AI 후보와 출구 시트의 열쇠 주문이 이것만 본다(4 · 3단계가 이미 칸을 본다면 고르는 화면만).
- 화면: 주사위 4종을 면 그림과 함께 보여 주고 둘까지 고른다(안 골라도 출발). 사람마다 기술 칸 3개를 "추천대로"로 채워 두고 바꿀 수 있다.

- [ ] **Step 1: 실패하는 시험**: 고른 주사위가 `st.dice`에 순서대로, 3개째 · 같은 종류는 안 들어간다. 판 시작 뒤 첫 전투의 라운드 주사위 앞 두 개가 고른 kind. 위저드의 기술 칸에서 빛을 빼면 어두운 길 시트에 빛 선택지가 잠긴 선택지로 보인다. 연기 시험: 출발 화면에 주사위 칸 4개(`class="dicepick"`) · 기술 칸(`class="slotpick"`).
- [ ] **Step 2: 실패를 본다**
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과**
- [ ] **Step 5: 커밋** — `inc: 원정 준비 — 특수 주사위 · 기술 칸 고르기`

### Task 7: zone_lab — 플레이어 판단이 승률을 바꾸는가

**Files:**
- Modify: `inc/test/zone_lab.js`
- Modify: `inc/ROGUELIKE_PLAN.md` (6절에 결과 표 한 단락), 설계 5-9절 "세부"를 정한 값으로

**Interfaces:**
- Consumes: `runBattle(cfg)` (5단계), `G.Dice.attach`의 `policy`
- Produces: `node test/zone_lab.js dice [판 수]` — **같은 조우 · 같은 시드로 짝지어** 정책을 돌려 표 하나(승률 · 95% 신뢰구간 · 평균 라운드 · 판당 사망 · 즉사 사망):
  - `random`: 배분 무작위, 다시 굴리기 없음 (바닥선)
  - `ai`: AI 배분만 (플레이어가 아무것도 안 할 때)
  - `oracle`: "미리 보는 플레이어" — 다시 굴릴 후보 조합과 맞바꾸기 후보 전부를 그 라운드 끝까지 미리 돌려 보고 가장 나은 것을 고름 (플레이어 판단이 낼 수 있는 위쪽 끝)
  - `oracle+special`: 위 + 특수 주사위 두 조합(`gamble`+`steady`, `doom`+`twin`)
- 지표: **`oracle − ai`** = 플레이어 판단의 여지, `ai − random` = AI 기본값의 질.

- [ ] **Step 1: 실패하는 시험** — `zone_lab.js dice 20 --check`가 정책 넷의 줄을 모두 찍고, 승률이 0~100, 짝지은 시드가 같은지(같은 시드 두 번 → 같은 결과) 단언.
- [ ] **Step 2: 실패를 본다** — `node test/zone_lab.js dice 20 --check` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 돌리고 기록** — `node test/zone_lab.js dice 2000` (판당 짝지은 비교, 신뢰구간 함께) → 결과를 문서에 옮긴다. **보고할 판단 기준(시험값)**: `oracle − ai`가 신뢰구간을 넘어 +10%p 이상이면 "판단이 결과를 만든다", 신뢰구간 안에서 0과 구분되지 않으면 "무작위가 덮는다" → 사용자에게 보고(주사위 수 · 다시 굴리기 횟수 조정안과 함께). 숫자를 고치지는 않는다 — 판단은 사용자 몫.
- [ ] **Step 5: 커밋** — `inc: zone_lab 주사위 — 플레이어 판단의 여지 재기`
