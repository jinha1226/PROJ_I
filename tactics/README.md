# 보드 전술 로그라이크 시제품

10×10 보드에서 싸우는 정통 턴제 로그라이크. DCSS식 전투(명중은 늘, 피해만 범위), 지형 반응(불 · 서리 · 번개), 레벨과 무기로 자라는 캐릭터. 세로 폰 한 손 기준. 기획은 `DESIGN.md`.

상위 저장소(심연 약탈자)와 별개로 이 폴더 안에서 설치 · 실행한다.

```bash
cd tactics
npm install
npm run dev        # http://localhost:5180  (폰: npx vite --host 후 PC의 IP:5180)
npm test           # 규칙 테스트
npm run typecheck
npm run sim -- 4   # 봇으로 1막을 무기별로 4판씩 (소모품 없이, 두 수 앞)
npm run sim -- 4 --d1 --items --w sword   # 한 수 앞만 · 소모품도 씀 · 무기 하나만
npx tsx sim/check.ts 2 --map 4            # 맵 검사표: 잘 둠/대충 · 평균/최악 굴림 · 소모품 유무를 무기별로
```

봇 결과 읽기: **최저 체력**은 판 동안 가장 낮았던 체력 비율(낮을수록 어려움), **나감**은 오래 교착이라 봇이 계단으로 나간 맵(그 무기로는 지형 답이 안 보인다는 신호).

## 구조
파일 하나는 한 가지 일만 하고 500줄을 넘기지 않는다.

- `src/core/` 규칙 (화면과 무관, 봇 · 시험이 그대로 쓴다)
  - `board.ts` 칸 · 피해 굴림 · 죽음 · 경험치 · 밀치기 / `elements.ts` 원소 반응 · 빙결 · 감전 · 환경 한 단계 / `sight.ts` 시야
  - `enemy.ts` 적 행동 / `hero.ts` 무기 · 기술 · 능력치 / `items.ts` 소모품 · 미확인 / `game.ts` 한 맵의 턴 / `run.ts` 한 판 / `rewards.ts` 보상 3택1
- `src/data/` 수치 표: `weapons.ts` · `enemies.ts` · `rules.ts` · `maps.ts` · `items.ts` · `rewards.ts`
- `src/ui/` 화면: `main.ts` 상태 · 입력 / `view.ts` 보드 그리기 / `text.ts` 설명 글 / `screens.ts` 시작 · 맵 사이 · 끝 화면 / `dom.ts`
- `test/` 모듈별 규칙 시험 (`board` · `enemy` · `hero` · `items` · `run`, 공용 `helpers.ts`)
- `sim/` 봇: `bot.ts` 두 수 앞 탐색 · `smoke.ts` 무기별 판 · 난이도 곡선 · `check.ts` 맵 검사표
