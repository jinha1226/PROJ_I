# inc 7단계 — 한 층 완성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **실행 전제**: 2~6단계가 끝나 있어야 한다. 아래 "앞 단계에서 받는 것"은 설계 8절의 "단계 사이에 주고받는 이름" 표와 같다. **실행 직전에 실제 코드와 대조하고, 다르면 이 계획의 이름을 고친 뒤 시작한다**.

**Goal:** 되돌아갈 수 있는 한 층을 탄탄하게 — 상황(길) 열 가지와 그것을 푸는 열쇠(D&D의 도구 · 장비 · 소모품 · 주문 · 두루마리 · 숙련 · 직업 기능), 다시 들어가기 규칙, 되돌아갈 때 떠도는 몬스터, 전투 뒤 보상 3택1, 사건 10개, 층 끝 지도 기록 화면 — 만들어 5~10명 플레이 테스트를 할 수 있는 상태로 만든다.

**Architecture:** 상황 · 열쇠 · 다시 들어가기 · 떠도는 몬스터 · 보상은 화면과 무관한 탐사 규칙(`js/explore/`)에 넣고, 생성 때 "막힌 판이 없는가"를 검사한다. 열쇠는 따로 만든 물건이 아니라 SRD 장비 · 주문 id를 가리킨다. 화면은 쿼터뷰 메인 위의 안내 표지 · 시트(3단계 부품)와, 층이 끝났을 때 종이 지도를 펼치는 기록 화면이다. 새 게임의 사건은 시제품 표와 따로 둔다(`RUN.FEVENTS`).

**Tech Stack:** 바닐라 JS(전역 `G` · `RUN`, `js/manifest.js` 순서), Node `vm` 시험(`test/_load.js`), 헤드리스 크롬 연기 시험(`test/page_smoke.js`).

**Spec:** `docs/superpowers/specs/2026-11-17-map-quarterview-merge-design.md` (2 · 5-2 · 5-4 · 5-5 · 5-9 · 5-10 · 8절), `inc/ROGUELIKE_PLAN.md` (4-6 · 5-2-1절)

## Global Constraints

- 한 층만. 여러 층 · 막 끝 레벨업 · 판 밖 해금 · 저장은 하지 않는다 (설계 2절). 층이 끝나면 처음으로.
- **열쇠 = D&D에서 그 상황을 풀 수 있는 모든 수단.** 열쇠 물건(녹슨 열쇠 같은 것)은 만들지 않는다 (설계 5-10).
- 판정 · 주문 · 장비는 SRD 5.2.1 그대로(저장소 SRD 데이터에서 읽는다). 두루마리도 SRD 그대로(자기 직업 주문 목록 · 높은 레벨은 판정). 소마법 · 의식은 슬롯 없이, 대신 기술 칸에 넣은 것만 (설계 5-5).
- **막힌 판이 없다**: 우두머리 방은 열쇠 없이 닿고, "열쇠 없이" 선택지는 실패해도 대가를 치르고 다시 할 수 있다. 열쇠 없이 못 지나는 상황(숨은 통로 · 봉인된 문)은 지름길 · 보물 · 비밀 방으로만 (설계 5-10).
- **방은 한 번 치우면 끝** — 보물 · 사건 · 야영 · 전투는 다시 들어가도 반복되지 않는다. "이 방에서 한 번" 행동은 방마다 층이 끝날 때까지 한 번 (설계 5-10).
- 정찰은 없다. 새 사건 · 보상에 공짜 정보를 주는 것을 넣지 않는다 (설계 9절).
- 화면 글에 D&D · Baldur's Gate 상표를 쓰지 않는다 (설계 5-9 주의 2).
- 수치는 시험값 — `RUN.FLOOR` · `RUN.SITU` · `RUN.REWARD` 표 하나씩에 모은다.
- 시제품 `run.html`(한쪽 방향 지도, `RUN.gen.make`, `RUN.EVENTS`)은 깨지지 않는다 — `node test/run_rules.js`가 계속 통과.
- 커밋 메시지는 한국어, `inc: ` 접두어, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## 앞 단계에서 받는 것 (설계 8절 표)

- 3단계: `RUN.gen.floor(seed, F, party) -> Floor { nodes: [{ id, type, size, cells, decor, g?, cleared }], edges: [{ id, a, b, kind, state, seen }], start, boss }` — 길은 양방향, `kind`는 3단계에서 `open` · `locked` · `trap` · `hidden` · `dark`.
- 3단계: `RUN.newFloor(seed, picks, opts) -> st { party, map, at, visited: Set, here: { [nodeId]: {} }, log, done, scene, items: { [srdId]: n }, dice }` · `RUN.exits(st) -> [{ e, n, back }]` · `RUN.exitActs(st, e) -> [{ label, who, p, cost, run }]` · `RUN.roomActs(st)` · `RUN.go(st, e) -> { arrived }` · `RUN.arrive(st, id)` · `RUN.items`(시제품 id → SRD id 대응표).
- 3단계: 쿼터뷰 부품 `ExitSign.show(e, info)` · `Sheet.open({ title, options: [{ label, sub, run }], skip? })` · `MapView.open(st)` · 상인 화면 · `G.Char`(`make` · `spellList` · `skillSlots`).
- 4단계: `RUN.fightResult(st, zs)`. 6단계: `G.Dice.KINDS` · `G.Dice.K.SLOTS` · `m.slots`(기술 칸).
- 2단계: 시험 주소 `?end=won` · `?end=lost` 자리.

## Review Focus

1. **다시 들어간 방에서 보물 · 사건 · 휴식 · 전투가 반복된다 / 오가며 조사를 다시 굴린다** — 기대: 표대로 한 번. → Task 1 시험.
2. **굴림이 계속 나빠 우두머리 가는 길에서 막힌다** — 기대: "열쇠 없이" 선택지는 실패해도 대가를 치르고 다시 할 수 있다. → Task 2 시험(최악의 굴림으로 우두머리까지).
3. **파티가 못 읽는 두루마리만 있는 선택 방** — 기대: 그 파티가 쓸 수 있는 대안 열쇠가 층 어딘가에. → Task 2 시험.
4. **소모품을 다 써서 막힌다** — 기대: 우두머리 길은 열쇠 없이 지나므로 막히지 않고 선택 방만 못 간다. → Task 2 시험.
5. **떠도는 몬스터가 사냥터가 된다 / 층 끝 뒤에도 돌아다닌다** — 기대: 떠도는 무리엔 보상 3택1 없음 · 금화 조금, 우두머리 처치 → 승리 기록 화면, 전멸 → 패배 기록 화면. → Task 4 · 7 시험.

---

## 정한 값 (시험값)

**층** (`RUN.FLOOR`)

| 항목 | 값 |
|---|---|
| 방 수 | 15~23 (시제품 `grow` 상한, 윤곽 여섯 가지 중 하나) |
| 방 종류 | 입구 1 · 우두머리 1 (SRD Minotaur of Baphomet) · 야영 1~2 · 상인 0~1 · 보물 2~3(대개 막힌 길 너머) · 사건 4~6 · 비밀 방 0~1(숨은 통로로만 닿는 보물 방) · 나머지 전투(그중 정예 1~2) |
| 출발 장비 | 무기 · 갑옷 · 방패 · 도둑 도구(로그) + 공용 횃불 3 · 밧줄 1 · 쇠지렛대 1. SRD 시작 꾸러미는 주지 않는다 (설계 5-2) |
| 떠도는 몬스터 | 들어가 본 방에 들어갈 때마다 d6, 1이면 (1/6) |
| 생성 검사 실패 | 20번 넘게 실패하면 시드 + 1 |

**상황(길) 열 가지** (`RUN.SITU`) — 설계 5-10의 표 그대로(푸는 열쇠 · 열쇠 없이 · 푼 뒤). 3단계에 있는 넷(`locked` · `hidden` · `trap` · `dark`)의 DC는 시제품 값. 새 여섯: `broken` · `sealed` · `web` · `water` · `gas` · `rubble`. 거미줄 베어 내기 실패의 전투는 SRD 거대 거미.

**보상** (`RUN.REWARD`)

| 언제 | 후보 3개 |
|---|---|
| 보통 전투 뒤 | 특수 주사위(안 가진 것) · 열쇠 묶음(횃불 2 · 기름 · 해독제 · 밧줄 중) 또는 일반~고급 마법 물건 · 주문 두루마리(1~2레벨, 그 파티가 읽을 수 있는 것 우선) 중 서로 다른 종류에서 하나씩 |
| 정예 뒤 | 위와 같되 물건은 희귀까지, 두루마리 3레벨까지 |
| 떠도는 몬스터 뒤 | 없음 (금화 조금) |
| 아직 못 지난 상황이 있을 때 | 그 상황의 열쇠가 후보에 들어갈 가중치 0.7 |

- 특수 주사위 보상: `st.dice`가 `K.SLOTS`보다 적으면 바로 넣고, 꽉 찼으면 "어느 것과 바꿀까 / 넣지 않기". 7단계에 2종을 더한다 (게임 고유 ◆):
  - `echo` 메아리: 그 주사위가 **직전 라운드에 낸 값**을 50%로 다시 내고, 아니면 d20. 첫 라운드는 d20. 기억은 그 주사위(라운드 주사위 칸 번호)에 둔다(`zs.dice.mem[i]`).
  - `blood` 피의 주사위: d20 + 2 (최대 20으로 자름 — 21 · 22가 생기지 않게, 치명타는 자르기 전 face 20일 때만). **그 주사위가 쓰일 때** 받은 사람이 1d4 피해.

**사건** (`RUN.FEVENTS` — 새 게임 표, 시제품 `RUN.EVENTS`와 따로) — 시제품 4개를 옮겨 손보고 6개를 더해 10개. 하나당 선택지 6~8개(직업 선택지 2~4 · 잠긴 선택지 1 · 공통 2~3). 결과로 열쇠를 줄 수 있다.

| id | 제목 | 직업 선택지 |
|---|---|---|
| `toll` · `altar` · `wounded` · `runes` | 시제품 그대로 옮김 | 공짜 정보 결과(`revealRow` · `scoutAhead` · `mapPiece` · `revealTraps` · `bossHint`)는 다른 결과(금화 · 열쇠 · 축복)로 바꾸고, `altar`는 선택지를 6개로 |
| `library` | 물에 잠긴 서고 | 위저드(옛 글 읽기 → 두루마리) · 로그(잠긴 서가) |
| `wolf` | 덫에 걸린 늑대 | 레인저(달래기) · 클레릭(치유) |
| `merchant` | 길 잃은 행상 | 로그(흥정 속임수) · 파이터(호위 제안) — 열쇠 소모품을 판다 |
| `shrine` | 금이 간 수호상 | 클레릭(종교) · 위저드(비전) |
| `prisoners` | 묶인 포로들 | 파이터(쇠사슬 끊기) · 로그(자물쇠) |
| `cave` | 노래하는 동굴 | 위저드(소리 마법) · 레인저(길 찾기) |

---

### Task 1: 다시 들어가기 — 방은 한 번 치우면 끝

**Files:**
- Modify: `inc/js/explore/rules.js` (`RUN.arrive`가 `node.cleared`를 보고 반복하지 않음, `st.here`를 방 id별로)
- Test: `inc/test/floor_rules.js` (3단계가 만든 층 시험에 덧붙임)

**Interfaces:**
- Produces: `node.cleared: boolean` — 전투 · 정예는 이기면, 보물은 줍고, 사건은 결과가 나면, 야영은 쉬면 `true`. 상인은 `false`로 남고 재고(`node.stock`)만 준다.
- Produces: `st.here[nodeId]` — "이 방에서 한 번" 행동의 기록, 층이 끝날 때까지 남는다.

- [ ] **Step 1: 실패하는 시험**: 보물 방에 두 번 들어가면 금화 · 물건이 한 번만 는다. 이긴 전투 방에 다시 들어가면 전투도 보상도 없다. 사건 방은 두 번째에 장면이 없다. 야영은 두 번째에 "이미 쉬었다". 상인은 두 번째에도 열리고 산 물건은 재고에서 빠진 채. 방 A에서 조사 → 방 B → 방 A로 돌아와 조사 선택지가 없다.
- [ ] **Step 2: 실패를 본다** — `cd inc && node test/floor_rules.js` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과** — `node test/floor_rules.js && node test/run_rules.js 40` → 통과 (시제품 그대로)
- [ ] **Step 5: 커밋** — `inc: 다시 들어가기 — 방은 한 번 치우면 끝`

### Task 2: 상황 열 가지 · 열쇠 놓기 · 막힌 판 검사

**Files:**
- Modify: `inc/js/explore/data.js` (`RUN.FLOOR` · `RUN.SITU` — 열쇠는 SRD 장비 · 주문 id)
- Modify: `inc/js/explore/gen.js` (`floor()`가 길마다 상황을 놓고, 파티를 보고 대안 열쇠를 놓고, 검사)
- Modify: `inc/js/explore/rules.js` (`RUN.exitActs`가 `RUN.SITU`에서 선택지를 만듦 — 가진 장비 · 기술 칸 · 슬롯 · 숙련에 따라, 결과 · 푼 뒤 상태)
- Modify: 쿼터뷰 출구 표지 아이콘 · 종이 지도 기호 (3단계 부품) — 틈 · 문양 · 거미줄 · 물 · 가스 · 잔해
- Test: `inc/test/floor_rules.js`

**Interfaces:**
- Produces: `RUN.SITU: { [kind]: { n, keys: [{ type: 'tool'|'gear'|'item'|'spell'|'scroll'|'skill'|'trait', id, dc?, use: 'keep'|'consume' }], bare: { sk?, save?, dc, cost } | null, after: 'open' | 'each' } }` — `bare`의 실패는 `cost`를 치르고 **다시 할 수 있다**(`retry`). `after`가 `open`이면 푼 뒤 그 길은 `state: 'open'`, `each`면 지날 때마다 다시(설계 5-10 "푼 뒤" 칸).
- Produces: `RUN.gen.solvable(floor, have = { items: {}, spells: [], skills: {} }) -> { ok, reach: Set<nodeId> }` — `have`가 비었으면 `bare`만으로(다시 할 수 있으므로 늘 지나간다고 본다).
- Produces: `Floor.stash: [{ id, at: nodeId, src: 'shop'|'chest'|'event' }]` — 층에 놓은 열쇠.
- 생성 규칙: ① `solvable(floor).ok`가 참일 때까지(20번 넘으면 시드 + 1). ② `bare === null`인 길은 그 길을 지워도 `solvable`이 참인 곳에만. ③ 선택 방 앞 상황마다 **그 파티가 쓸 수 있는** 열쇠(파티가 읽을 수 있는 두루마리 · 소모품 · 장비) 하나를 그 길을 지나지 않고 닿는 곳의 `stash`에 놓는다(출발 장비 · 기술 칸 후보 · 상인 목록에 있으면 생략).
- `RUN.exitActs(st, e)`: 쓸 수 있는 열쇠마다 선택지(누가 · 확률 · 대가: 슬롯 · 소모품 개수), `bare`가 있으면 "열쇠 없이", 못 쓰는 열쇠는 잠긴 선택지("횃불이 있다면…").

- [ ] **Step 1: 실패하는 시험**:
  - 시드 1~500: `solvable(floor).ok` 모두 참. `hidden` · `sealed` 길을 모두 지워도 참. 상황 열 가지가 전체에서 모두 나오고, 층마다 4종류 이상.
  - 다섯 직업에서 셋을 고르는 10가지 조합 × 시드 50: 선택 방 앞 상황마다 그 파티가 쓸 수 있는 열쇠를 그 길 너머가 아닌 곳에서 얻을 수 있다.
  - **최악의 굴림**(`RUN.check`를 늘 실패로 바꿔 끼움)으로 "열쇠 없이"만 골라도 우두머리 방에 닿는다(대가는 쌓이되 막히지 않음).
  - `broken`: 밧줄로 건너면 그 길이 `open`이 되고 되돌아갈 때 다시 안 굴린다, 뛰어넘기는 매번. `dark`: 빛(기술 칸에 있을 때)은 지날 때마다 공짜, 횃불은 지날 때마다 하나, 횃불 0개면 횃불 선택지가 잠긴 선택지. `web`: 횃불로 태워도 횃불 수 그대로, 베어 내기 실패 → 거대 거미 전투 뒤 다시. `gas`: 해독제는 그 사람 내성 이점, 나머지는 건강 내성. `sealed`: 위저드가 열림을 기술 칸에 넣었으면 열림 선택지, 마법 해제 두루마리는 클레릭 · 위저드만 읽음.
- [ ] **Step 2: 실패를 본다**
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과** — `node test/floor_rules.js && node test/run_rules.js 40`
- [ ] **Step 5: 커밋** — `inc: 상황 열 가지 · 파티를 보고 열쇠 놓기 · 막힌 판 검사`

### Task 3: 가진 것 — SRD id로 한 모양

**Files:**
- Modify: `inc/js/explore/rules.js` · 상인 · 보물 처리 (3단계에서 옮긴 것)
- Test: `inc/test/floor_rules.js`

**Interfaces:**
- Consumes: `RUN.items`(시제품 id → SRD id 대응표, 3단계)
- Produces: `st.items`는 SRD id 키의 맵(`{ torch: 3, rope: 1, crowbar: 1, 'potion-of-healing': 1, 'scroll:knock': 1 }` 꼴 — 두루마리는 `scroll:<주문 id>`). 상인 · 보물 · 사건 · 보상이 모두 이 모양으로 주고받는다.

- [ ] **Step 1: 실패하는 시험**: 새 판의 `st.items`가 출발 장비 그대로(횃불 3 · 밧줄 1 · 쇠지렛대 1, 로그가 있으면 도둑 도구). 상인에게 산 횃불 · 보물의 물약 · 사건의 두루마리가 같은 맵에 쌓인다. 시제품 id(`knockScroll` 등)가 `st.items`에 없다.
- [ ] **Step 2: 실패를 본다**
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과**
- [ ] **Step 5: 커밋** — `inc: 가진 것을 SRD id 맵 하나로`

### Task 4: 되돌아가기와 떠도는 몬스터

**Files:**
- Modify: `inc/js/explore/rules.js` (`RUN.go`가 들어가 본 방이면 떠도는 몬스터 굴림)
- Modify: 출구 안내 표지 내용 (3단계 부품) — **들어갈 방이 들어가 본 방이면** "떠도는 몬스터 1/6"
- Test: `inc/test/floor_rules.js`, `inc/test/run_bots.js`(새, 봇 셋)

**Interfaces:**
- Produces: `RUN.go(st, e)` → 들어가 본 방이면 `RUN.d(st.rng, 6) === 1`일 때 `{ arrived, wander: group }`, 그 무리는 그 층 무리 중 가장 작은 것, 보상 3택1 없음 · 금화 1/4.
- Produces: `node test/run_bots.js [판 수]` — 봇 셋의 승률 · 남은 체력 · 판당 전투 · 떠도는 무리 수 · 연 선택 방 수 · 탐험에 쓴 슬롯:
  - "목표만 가는 봇": 밝혀진 지도만 알고, 우두머리 쪽으로 가장 짧게, 막힌 선택 방은 건너뜀.
  - "다 둘러보는 봇": 닿는 방을 모두, 열쇠를 얻으면 막혔던 길로 돌아감.
  - "정보 주문 봇": 위 둘 중 하나의 길 고르기 + 점술 · 마법 탐지를 기술 칸에 넣고 쓰는 봇 (설계 9절의 "정보 주문을 쓰는 봇 대 아끼는 봇").

- [ ] **Step 1: 실패하는 시험** (시드 고정): 들어가 본 방에 1000번 들어가면 떠도는 무리 비율 0.12~0.21. 처음 들어가는 방에서는 0. 떠도는 무리 뒤 `RUN.rewards`가 불리지 않는다. 고리로 처음 닿는 방에는 "떠도는 몬스터" 안내가 없다. `run_bots.js 20`이 봇 셋의 줄을 찍는다.
- [ ] **Step 2: 실패를 본다**
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 · 봇 결과 기록** — `node test/run_bots.js 1000` → ROGUELIKE_PLAN 10절 아래에 결과 한 단락. **보고 기준(시험값)**: 목표만 가는 봇과 다 둘러보는 봇의 승률 차이가 10%p 안이면 "다 둘러보기가 정답이 아님", 다 둘러보는 봇이 10%p 넘게 이기면 확률을 올리는 안(1/4), 10%p 넘게 지면 내리는 안(1/8)을 사용자에게 보고. 숫자는 고치지 않는다.
- [ ] **Step 5: 커밋** — `inc: 되돌아가기 · 떠도는 몬스터, 봇 셋 비교`

### Task 5: 보상 3택1

**Files:**
- Modify: `inc/js/explore/data.js` (`RUN.REWARD`)
- Modify: `inc/js/rules/fate.js` (`echo` · `blood`)
- Modify: `inc/js/explore/rules.js` (`RUN.rewards`, `RUN.takeReward`)
- Create: `inc/js/ui/reward.js` (시트 내용)
- Test: `inc/test/floor_rules.js`, `inc/test/dice_rules.js`

**Interfaces:**
- Produces: `RUN.rewards(st, kind: 'fight' | 'elite') -> { type: 'die' | 'kit' | 'item' | 'scroll' | 'gold', id, n, sub }[]` (길이 3, 서로 다름) · `RUN.takeReward(st, i | 'skip', replace?: number)`.

- [ ] **Step 1: 실패하는 시험** (시드 고정): 300번 뽑아 늘 3개 · 서로 다른 종류 · 이미 가진 특수 주사위 · 이미 아는 주문 · 그 파티가 못 읽는 두루마리는 안 나옴. 못 지난 상황이 있으면 그 열쇠가 후보에 들어간 비율 0.6 이상(가중치 0.7). 후보가 모자라면 금화. 정예 뒤에만 희귀 물건 · 3레벨 두루마리. `skip`은 아무것도 안 바뀐다. `st.dice`가 꽉 찼을 때 `replace` 없이 주사위를 고르면 넣지 않는다. `dice_rules`: `echo` — 라운드 2000번에서 직전 값 반복 비율 0.50~0.60(50% + d20이 우연히 같을 5%의 절반), 첫 라운드는 d20. `blood` — 값 3~20, 받은 사람 피해 1~4, 주사위가 쓰이지 않으면 피해 없음.
- [ ] **Step 2: 실패를 본다**
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과**
- [ ] **Step 5: 커밋** — `inc: 전투 뒤 보상 3택1 (주사위 · 열쇠 · 물건 · 두루마리), 특수 주사위 2종 더함`

### Task 6: 사건 10개 (새 게임 표)

**Files:**
- Create: `inc/js/explore/fevents.js` (`RUN.FEVENTS` — 시제품 4개를 옮겨 손본 것 + 6개)
- Modify: `inc/js/manifest.js` (새 게임 묶음 — `run.html`의 `explore` 묶음에는 넣지 않는다)
- Modify: `inc/js/explore/rules.js` (사건 결과 연산자 `item`을 넓힘 — `item: [{ id: srdId, n }]`로 열쇠 소모품 · 두루마리를 줌. 새 연산자를 따로 만들지 않는다)
- Test: `inc/test/floor_rules.js` (사건 불변식)

**Interfaces:**
- 형식은 시제품 `RUN.EVENTS`와 같다: `{ id, t, d, opts: [{ cls?, n, tag, sk?, dc?, slot?, ok: { msg, ... }, no?: { msg, ... } }] }`. 결과 연산자: `gold` · `fight` · `alert` · `warn` · `curse` · `hurt` · `healAll` · `bless` · `item`(넓힘). 공짜 정보 연산자(`revealRow` · `scoutAhead` · `mapPiece` · `revealTraps` · `bossHint`)는 새 표에 쓰지 않는다.

- [ ] **Step 1: 실패하는 시험**: `RUN.FEVENTS` 10개. 사건마다 선택지 6~8개, 직업 선택지 2개 이상, 공통 선택지 2개 이상, 결과의 키는 위 목록뿐, `fight` 결과의 몬스터는 `RUN.MON`(SRD 이름)에 있음, `item`의 id는 SRD 장비 · `scroll:<주문>`, `sk`는 SRD 숙련 이름. 다섯 직업에서 셋을 고르는 10가지 조합 모두에서 사건마다 고를 수 있는 선택지가 3개 이상. 시제품 `RUN.EVENTS`는 그대로(`run_rules.js` 통과).
- [ ] **Step 2: 실패를 본다**
- [ ] **Step 3: 사건 쓰기** — 글은 `inc/DIALOGUE_GUIDE.md`를 따른다(짧게, 장소와 맞게 — DESIGN 147절).
- [ ] **Step 4: 통과**
- [ ] **Step 5: 커밋** — `inc: 새 게임 사건 10개 (시제품 4개 손봄 + 6개)`

### Task 7: 층 끝 지도 기록 화면 · 플레이 테스트 준비

**Files:**
- Create: `inc/js/ui/record.js`
- Modify: 지도 버튼 화면(`MapView`, 3단계) — 같은 그리기를 전체 화면으로
- Modify: `inc/test/page_smoke.js` (기록 화면 표지, `?end=won` · `?end=lost`)
- Create: `inc/PLAYTEST.md`

**Interfaces:**
- Produces: `RecordUI.show(st, outcome: 'won' | 'lost')` — 그 층의 종이 지도 전체, 여백에 기록(`RecordUI.lines(st)`), 승리면 인장, 패배면 찢긴 가장자리 + 핏자국 (ROGUELIKE_PLAN 4-6). 버튼 "다시 하기" · "그림으로 저장"(SVG → PNG 내려받기).
- Produces: `RecordUI.lines(st) -> string[]` — 우두머리 · 쓰러짐 · 사건 결과 · 푼 상황에서 고르고, 우두머리 줄이 반드시 들어가며 12줄을 넘지 않는다.
- `PLAYTEST.md`: 배포 주소(`/inc/`), 한 층 길이(30~45분 목표), 물어볼 것 5가지 — ① 주사위를 다시 굴리거나 맞바꿀 때(죽음의 주사위를 누구에게 맡길 때) 고민이 됐나 ② AI 행동을 고친 적이 있나, 왜 ③ 기술 칸에 무엇을 넣을지, 막힌 길을 풀 열쇠를 얻고 되돌아갈지 고민했나 — 떠도는 몬스터 때문에 망설였나 ④ 한 층 뒤 또 하고 싶은가 ⑤ 얼마면 사겠나. 결과는 사용자가 모은다(게임 안에 수집 장치를 넣지 않는다).

- [ ] **Step 1: 실패하는 시험** — `page_smoke.js`: `?end=won`에 `class="record"`와 인장, `?end=lost`에 `class="record lost"`. `RecordUI.lines` 규칙(`floor_rules.js`).
- [ ] **Step 2: 실패를 본다**
- [ ] **Step 3: 구현 · PLAYTEST.md 쓰기**
- [ ] **Step 4: 전부 돌린다** — `cd inc && node test/run_all.js && node test/page_smoke.js` → 전부 통과
- [ ] **Step 5: 커밋** — `inc: 층 끝 지도 기록 화면, 플레이 테스트 안내`
- [ ] **Step 6: 푸시 전에 사용자에게 확인을 받는다.** 푸시 뒤 `BASE=https://jinha1226.github.io/PROJ_I/inc node test/page_smoke.js`로 배포를 확인하고 플레이 테스트 주소를 알린다.
