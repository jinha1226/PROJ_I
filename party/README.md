# PROJ_BH: 실시간 파티 던전 크롤러 (1단계 전투 프로토타입)

Battleheart식 실시간 파티 조작에 DCSS를 단순화한 RPG 규칙(스킬, 저항, 상태이상, 마법 실패율)을 결합한 프로토타입입니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm run sim -- 1 10   # 렌더링 없이 자동전투 10판 (밸런스 점검)
npx vite-node scripts/corridor-test.ts   # 통로 차단 시나리오 점검
```

## 구조

```
src/
  data/      데이터만으로 확장: abilities, statuses, units(파티/몬스터), maps
  sim/       게임 규칙 (DOM 의존 없음, 헤드리스 실행 가능)
    world.ts      월드, 틱 루프, 시야, 전투 상태, 플레이어 명령 API
    behavior.ts   유닛 한 틱: 상태이상 → 시전 → 명령(우선) / AI 의도 실행
    ai.ts         유틸리티 점수 AI (전술 유형·대상 선호가 가중치만 바꿈)
    combat.ts     공통 피해/저항/상태이상 파이프라인, 평타
    abilities.ts  시전·실패율·범위 판정, AI용 기대 피해 계산
    stats.ts      모든 수치 공식
    movement.ts   경로 이동, 유닛/벽 충돌
    map.ts        타일맵, A*, 사선
  render/    3/4 탑다운 캔버스 렌더러, 카메라(좌표 변환은 여기만)
  input/     드래그 명령, 범위 선택, 스킬 대상 지정, 단축키
  ui/        DOM HUD (파티 카드, 스킬바, 적 정보, 로그)
```

## DCSS 단순화 규칙

- 능력치 STR/DEX/INT, 스킬 0~10 (1단계는 고정값, 2단계에 훈련 추가)
- 저항 -1~+3 → 피해 150/100/50/33/20%, 독은 면역 여부만
- 상태이상: 확률 → 면역 태그 → 원소 저항 → 의지력(주문력 대비) 순 판정
- 마법 실패율 = (난이도×6 + 갑옷무게×1.5 − 계열스킬×2.5 − 주문시전 − INT×0.3) × 2%
- 시전 시간 0.8초 이상 마법은 피격 시 끊길 수 있음, 기절하면 무조건 끊김
