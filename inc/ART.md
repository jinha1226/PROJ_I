# 차원 균열 · 그림 가이드 (Codex 이미지 생성용)

지금 게임의 그림은 전부 DCSS 32px 타일이다. 이것을 **다크 판타지 잉크 회화풍**(Darkest Dungeon에서 영감) 한 가지 스타일로 바꾼다.
다섯 세계 모두 같은 스타일로 그리고, 세계마다 **강조색만** 다르게 한다.

- 무엇을 그릴지: `assets/art/MANIFEST.json` (258종, `node tools/art_manifest.js`로 다시 만든다)
- 어디에 저장할지: `assets/art/<key>.png`. 변형이 여럿이면 `<key>_0.png`, `<key>_1.png` …
- 저장한 다음: `node tools/build_art.js` → `js/artset.js`가 갱신되고, 게임은 그 키를 DCSS 타일 대신 그 그림으로 그린다.
  그리지 않은 키는 DCSS 타일이 그대로 나오므로 조금씩 바꿔 나가도 된다.

## 1. 공통 스타일

Darkest Dungeon의 캐릭터·로고·구도를 베끼지 말고, 아래 **특징**을 따른다.

- 손으로 그린 2D 회화, 굵고 거친 **검은 잉크 외곽선**
- 그림자는 **잉크 해칭(빗금)**과 짙은 검정 덩어리. 명암 대비가 강하다(키아로스쿠로)
- 채도를 낮춘 색: 뼈색, 녹, 이끼, 진흙, 바랜 천. 각 그림에 강조색은 하나만
- 빛은 **왼쪽 위**에서. 횃불·등불처럼 따뜻한 빛과 차가운 어둠이 맞선다
- 사실적이되 약간 과장된 비례(어깨·손·무기가 크다), 지치고 음울한 표정
- 글자, 숫자, 로고, 서명, 테두리 없음

### 세계별 강조색

| 세계 | 강조색 | 분위기 |
|---|---|---|
| 판타지 (끝없는 던전) | 횃불 주황, 녹슨 금속 | 축축한 지하 묘지 |
| 무협 (화산귀환록) | 먹(水墨)의 검정, 주홍, 매화 분홍 | 수묵화 번짐이 섞인 잉크 |
| 선협 (구천등선) | 비취, 금, 영기의 청백색 | 동굴 속 신비로운 빛 |
| SF (최후의 방어선) | 차가운 청록, 경고등 빨강 | 녹슨 고딕 공업 기계(그림다크) |
| 크툴루 (인스머스의 밤) | 병든 녹색, 심해 청록, 보라 | 축축하고 미끄러운, 보면 안 될 것 |

## 2. 종류별 규칙 (MANIFEST의 `kind`)

| kind | 크기 | 배경 | 시점·구도 |
|---|---|---|---|
| `sprite` | 256×256 | 투명 | 전신, 측면~3/4, **왼쪽을 향함**. 발(바닥)이 아래쪽 가운데, 아래 여백 8%. 그림이 높이의 80%를 채운다. 물고기·바다 생물은 왼쪽으로 헤엄치는 옆모습, 가운데 |
| `object` | 256×256 | 투명 | 바닥 위 사물, 약간 위에서 본 정면, 아래쪽 가운데에 붙임 |
| `terrain` | 128×128 | **불투명** | 위에서 내려다본 바닥·벽 텍스처, **이음새 없이 반복**(좌우·상하가 이어져야 한다). 무늬가 너무 튀지 않게. 바다(`sea_*`)만 예외로 옆에서 본 물·바위 |
| `icon` | 128×128 | 투명 | 사물 하나를 가운데에, 굵은 외곽선. 작게(28px) 줄여도 알아볼 수 있게 실루엣이 분명해야 한다 |
| `fx` | 128×128 | 투명 | 투사체·빛·불꽃, 가운데 |

- 게임 화면에서 칸 하나는 28~50px, 아이콘은 20~40px로 작게 보인다. **디테일보다 실루엣과 명암**이 중요하다.
- 왼쪽/오른쪽 방향은 게임이 뒤집으므로 항상 **왼쪽을 향하게** 그린다.
- `variants`가 2 이상이면 같은 대상의 변형(무늬·자세 조금 다르게)을 그 수만큼 그린다.
- `ref`의 DCSS 타일을 **구도와 대상 참고용**으로 본다(무엇인지, 어느 방향인지). 스타일은 따라 하지 않는다.
- `use`는 게임에서 그 그림이 쓰이는 이름(한국어)이다. `subject`는 DCSS 원본 이름.

## 3. 프롬프트 틀

각 항목마다 아래 틀에 `subject`·`use`·`view`·강조색을 채워 넣는다.

```
Hand-painted 2D game art, dark gothic fantasy style inspired by Darkest Dungeon:
thick rough black ink outlines, heavy ink cross-hatching in the shadows, strong chiaroscuro,
desaturated muted palette with a single accent color ({accent}), light from the top-left,
slightly exaggerated proportions, grim weary mood. No text, no logo, no border, no signature.
Subject: {use} ({subject}).
Composition: {view}.
{size}x{size} PNG, {transparent ? "fully transparent background" : "seamless tileable texture, fills the whole square"}.
```

## 4. 작업 순서

1. **스타일 견본 먼저**: `knight`, `c_fisher`, `fs_deepone`, `sea_w1`, `ui_ess`, `w_cthulhu` 여섯 장을 그려서 확인받는다.
   통과한 견본을 이후 모든 생성의 스타일 참고 이미지로 함께 넣는다(일관성).
2. **P1 (50종)**: 크툴루 세계 전체 + UI 아이콘 + 세계 아이콘 + 주인공(기사, 수선자, 무협 1단계, 낚시꾼)
3. **P2 (69종)**: 캐릭터·몬스터·적·동료
4. **P3 (52종)**: 지형·사물
5. **P4 (87종)**: 스킬트리·유물·물품 아이콘, 효과

한 묶음을 저장할 때마다 `node tools/build_art.js`를 돌린다. 크기·투명 배경이 어긋나면 경고가 나온다.

## 5. 엔진 쪽 동작 (참고)

- `js/tiles.js`: 키에 그림이 있으면 `assets/art/`를, 없으면 `assets/tiles/`(DCSS)를 쓴다.
- 여러 타일을 겹쳐 그리던 인형(기사 `knight`, 수선자 `cultivator`)과 겹친 캐릭터(무협 주인공 `wx_hero0~9`, 제자 `x_disciple`, 낚시꾼 `c_fisher`)는 그 키의 그림 한 장으로 바뀐다.
- 그린 그림은 부드럽게 확대하고(픽셀 타일은 픽셀 그대로), 그림이 있으면 지형을 칸당 64px로 그려 둔다.
- 배와 낚싯바늘은 타일이 아니라 캔버스로 그린다(`js/render.js`의 `drawShape`).
