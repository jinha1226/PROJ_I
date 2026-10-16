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
```

봇 결과 읽기: **최저 체력**은 판 동안 가장 낮았던 체력 비율(낮을수록 어려움), **나감**은 오래 교착이라 봇이 계단으로 나간 맵(그 무기로는 지형 답이 안 보인다는 신호).

## 구조
- `src/core/` 규칙 (화면과 무관): `board.ts` 칸 · 피해 · 밀치기 · 원소 반응 · 환경 / `enemy.ts` 적 행동 / `hero.ts` 무기 · 기술 / `game.ts` 턴 / `run.ts` 한 판
- `src/core/items.ts` 소모품
- `src/data/` 수치 표: `weapons.ts` · `enemies.ts` · `rules.ts` · `maps.ts` · `items.ts`
- `src/ui/` 화면 · 터치 입력 (`view.ts` 보드 그리기, `main.ts` 흐름)
- `test/` 규칙 테스트, `sim/` 밸런스 봇 (`bot.ts` 두 수 앞 탐색 · `smoke.ts` 무기별 판 돌리기)
