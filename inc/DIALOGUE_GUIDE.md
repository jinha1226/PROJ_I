# 대사 작업 가이드

작성 2026-11-05. 대사만 맡은 세션을 위한 문서다. 작업 전에 끝까지 읽는다.

## 1. 목표

**같은 말을 들었다는 느낌이 나기 전에 새 말을 듣게 한다.** 숫자를 채우는 게 아니라, 캐릭터가 지금 상황에 맞게 말하는 것처럼 들리게 하는 일이다.

지금 대사는 약 480줄이다. 한 원정에서 대사 수십 줄이 나오므로 금방 반복된다.

**목표량 (시험값):** 공통 상황 대사 각 15줄 이상, 성격 · 직업 묶음은 많이 나오는 상황에 각 5줄 이상, 주고받기 100개 이상. 양보다 3절의 품질이 먼저다.

## 2. 범위

| 맡는 것 | 맡지 않는 것 |
|---|---|
| `js/lines_*.js` 대사 데이터 | 전투, 판정, 사건 규칙 |
| `test/line_rules.js` | 관계 수치와 행동 (`CORE_LOOP_GUIDE.md` 묶음 C, D) |
| 새 상황 키 제안 | UI |

**기억을 말하는 대사**(`CORE_LOOP_GUIDE.md` 묶음 E)는 `js/lines_memory.js`에 따로 둔다. `G.Mem`이 생긴 뒤에만 쓴다. `ls js/memory.js`로 확인하고, 없으면 이 문서의 일반 대사만 작업한다.

**새 상황 키는 코드에 호출이 있어야 나온다.** 호출을 넣어야 하면 연결 코드 한 줄만 넣고 보고에 적는다.

## 3. 품질 기준

### 말투

- 짧은 반말. 한 줄에 20자 안팎, 길어도 35자.
- 바로 전투 중이거나 지친 동료들의 말처럼 쓴다.
- 기존 대사를 먼저 읽고 맞춘다: `js/banter.js`의 `LINES`, `TALKS`.

### 좋은 대사와 나쁜 대사

| 나쁨 | 이유 | 좋음 |
|---|---|---|
| 적이 나타났다! 조심해야 해! | 화면을 설명한다 | 왼쪽에 둘 더 있어. |
| 나는 겁쟁이라서 무서워. | 성격을 직접 말한다 | 우리 이제 돌아가면 안 돼? |
| 어둠이 우리를 삼키려 한다. | 분위기만 있다 | 횃불 누가 들었어? |
| 정말 대단한 승리였어! | 누구나 언제나 할 수 있다 | 다음엔 네가 앞에 서. |
| 이것이 운명인가. | 거창하다 | 품삯 더 받아야겠어. |

### 금지

- 설명, 교훈, 쉼표로 이어 붙인 비유, "~하는 법이지" 투의 격언.
- 게임 규칙 용어를 말하기: 명중, 판정, 슬롯, 레벨, 체력 수치. (`d20`도 안 된다. 짐, 품삯, 상처 같은 말을 쓴다.)
- 사용자가 싫어하는 분위기 한 줄 문구. UI 문구가 아니어도 같은 냄새가 나면 뺀다.
- 고유 설정 지어내기: 지명, 신, 역사. D&D 상표와 SRD 밖의 설정 이름.
- 실제 게임, 책, 영화 대사 옮기기. 전부 새로 쓴다.

### 한국어 조사

이름 자리에는 조사 표기를 쓴다: `{m이}`, `{m은}`, `{m을}`, `{m과}`, `{m야}`, `{m다}`. 받침에 맞게 바뀐다. `{b}`는 대화 상대다.

### 성격이 드러나는 방식

성격 이름을 말하지 않고 **무엇에 먼저 반응하는가**로 드러낸다.

| 태그 | 먼저 보는 것 |
|---|---|
| `coward` 겁쟁이 | 퇴로, 위험 |
| `hot` 다혈질 | 답답함, 먼저 나서기 |
| `greedy` 욕심쟁이 | 돈, 몫 |
| `careful` 신중 | 함정, 준비 |
| `brawler` 싸움꾼 | 강한 적 |
| `meek` 온순 | 동료 걱정 |

직업 태그도 쓴다. 클레릭은 상처를, 로그는 자물쇠를, 위저드는 책과 마법을 먼저 본다. 내부 키는 `G.Tactics`의 `ROLE`과 같다: `archer` 레인저, `dragoon` 파이터, `mage` 소서러, `archmage` 위저드, `scout` 드루이드.

## 4. 파일 형식

파일 하나에 묶음 하나를 둔다. 동시 작업 충돌을 막기 위해서다. `js/banter.js`를 직접 고치지 않는다.

```js
'use strict';
// js/lines_combat.js
G.Banter.addLines({
  fight: {
    any: ['왼쪽에 둘 더 있어.', '내 뒤로 와.'],
    coward: ['여기서 싸워야 해?'],
    cleric: ['다치면 바로 말해.'],
  },
});
G.Banter.addTalks([
  { when: c => c.hp < 0.4, l: ['아직 걸을 수 있어?', '뛰지는 말라고 해.'] },
  { a: 'greedy', l: ['몫은 똑같이 나누는 거지?', '당연하지. 너 빼고.'] },
  { when: c => c.rel === 'foe', l: ['{b}, 아까 일부러 늦게 왔지?', '증거 있어?'] },
]);
```

`TALKS`의 `l`은 번갈아 말하는 줄이고, 2~3줄이 좋다. `when`이 받는 값: `depth`, `hp`, `bag`, `mission`, `time`, `rel`.

**새 파일은 다섯 군데 목록에 넣는다:** `index.html`, `test/party_lab.js`, `test/sim.js`, `test/foe_rules.js`, `test/skill_lab.js`. `'banter'` 뒤가 아니라 `G.Banter`가 생긴 다음이면 된다. 넣기 직전에 다시 읽는다.

파일 분할: `lines_walk.js` 이동, `lines_combat.js` 전투, `lines_find.js` 발견과 전리품, `lines_hurt.js` 부상과 죽음, `lines_camp.js` 쉬는 시간과 주고받기.

## 5. 상황 키

지금 있는 키: `depart floor known look quiet spotTrap spotAmbush spotChest spotMimic trap trapBlame fight clear clearHurt boss bossDead hurt healing down downLead up combo chest mimic mimicKnown loot full levelup stairs descend rally focus cancel rival t_big t_guard t_grab p_hot p_coward p_greedy p_careful p_brawler p_meek ms_hunt ms_survive ms_defend ms_escort ms_search ms_escape msWin msLose`

`crit`, `fumble`은 더 쓰지 않는다. 사용자가 공격의 대성공, 대실패 표시를 뺐다.

**우선순위:** `fight clear hurt down floor loot chest` 먼저. 플레이마다 가장 많이 들린다.

**새로 있으면 좋은 키 (연결 코드 필요):** `potion` 물약을 마심, `levelupOther` 동료 레벨업, `lowSlots` 주문이 떨어져 감, `locked` 잠긴 문, `treasure` 쓸모없어 보이는 물건을 주움.

세력별 대사(`clear` 뒤 언데드, 고블린 등)가 필요하면 먼저 제안한다.

## 6. 동시 작업 규칙

여러 세션이 같은 폴더를 고친다. git이 아니다.

1. 자기 `js/lines_*.js`와 `test/line_rules.js`만 만든다.
2. 다른 파일은 고치기 직전에 다시 읽고, 정확한 문자열만 교체한다. 전체 덮어쓰기 금지.
3. 다른 세션 변경을 되돌리지 않는다.
4. `pkill`을 넓은 패턴으로 쓰지 않는다.
5. 푸시하지 않는다. 푸시 여부도 묻지 않는다.

## 7. 완료 기준

`test/line_rules.js`를 만들어 검사한다.

- 모든 키에 `any`가 있거나 말할 사람이 있다.
- 줄 길이 35자 이하(어기면 목록 출력).
- 같은 줄 중복 없음(파일 사이 포함).
- 금지어 없음: `명중`, `판정`, `슬롯`, `레벨`, `주사위`, `d20`, `체력`, `AC`.
- 조사 표기가 짝이 맞고, 렌더링 후 `{`가 남지 않는다.
- 줄 수 집계 출력(키별, 태그별).

그다음:

```bash
node test/line_rules.js
node test/tut_rules.js | tail -1
node test/sim.js 10; echo $?
```

브라우저에서 직접 원정을 돌려 본다. `http://localhost:8765/index.html?fl=3&lv=6&crew=cleric,dragoon,archmage&gold=500&go=1`. 오른쪽 아래 기록에 대사가 남으니 10분 플레이하고 읽어 본다. **어색한 대사 10개를 직접 고른 뒤 고치거나 지운다.** 그 목록을 보고에 넣는다.

끝나면 `DESIGN.md` 맨 끝에 다음 번호로 절을 쓴다. 보고에는 줄 수 변화, 못 한 키, 넣은 연결 코드를 적는다.

## 8. 세션 시작 문구

```
/mnt/d/PROJ_BROGUE/inc/DIALOGUE_GUIDE.md를 끝까지 읽고 대사 작업을 해 줘.
다른 세션이 같은 폴더를 고치고 있으니 6절 규칙을 지켜. 푸시는 하지 마.
우선순위 키부터 하고, 끝나면 시험 결과와 어색해서 고친 대사 10개를 보고해.
```

## 장소 말 (2026-11-06 추가)

사건 · 장면 글에 장소를 박아 쓰지 않는다. 같은 사건이 늪(야외)에도, 동굴 · 요새 · 대성당 · 지하 강에도 나온다.
- 사라지는 쪽은 `{beyond}`, 저편은 `{far}`, 기대는 것은 `{lean}`, 더듬는 것은 `{grope}`, 소리가 퍼지는 곳은 `{echo}`로 쓴다. 값은 `G.Event.PLACE`.
- 수풀 · 숲 · 바람 · 토끼처럼 야외에만 맞는 말은 늪(`thicket` 태그) 전용 변형에만 쓴다. 천장 · 복도 · 벽은 지하 전용 사건에만 쓴다.
- `node test/npc_rules.js`가 모든 사건 글을 장소별로 그려 어긋남을 잡는다.
