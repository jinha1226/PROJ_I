# 2026-11-17 정리 — 옛 본 게임(용병단)에서 새 게임이 쓰지 않는 것

새 게임(탐사 지도 × 쿼터뷰, `docs/superpowers/specs/2026-11-17-map-quarterview-merge-design.md`) 2단계에서 옮겼다. 지우지 않고 옮겼으며, 정리 전 상태 전체는 git 태그 `pre-crawl`로 볼 수 있다 (`git checkout pre-crawl`). 여기 파일은 경로가 바뀌어 그대로는 돌지 않는다.

- `js/legacy/`: 시즌 · 미션(임무) · 관계 · 성격 · 대사 · 보고서 · 지휘 · 위기 대사 · 인물 · 튜토리얼 · 튜토리얼 지도 · 아스트랄 타워 · 원정 (13개)
- `js/legacy/iso/`: 옛 화면 — 시작 · 상태창 · 마을 · HUD · 지휘 · 도감 · 전쟁 · 단장 만들기 화면 · 루프
- `test/`: 위 것들만 시험하던 것 — 야영 물자 · 사건 배치 · 인물 · 고블린 굴 · 튜토리얼 · 아스트랄 타워 · 오우거 벽 · 옛 흐름 봇(sim · flow_rules) · 명성 건물 · 위기 대사 · 지역

남은 코드가 아직 부르던 이름은 다음으로 받았다.
- `js/rules/check.js`: 능력 판정 `G.Mission.roll` (옛 미션 파일에서 이 함수만)
- `js/rules/mons_extra.js`: 아스트랄 타워가 게임 몬스터 표에 넣던 SRD 몬스터 등록
- `js/rules/old_stubs.js`: 나머지 이름은 아무 일도 하지 않거나 기본값 (원정 출발은 층을 여는 최소한만)

`js/legacy/`에 남은 옛 모듈(지형 `fantasy` · 길드 `guild` · 단장 만들기 `create` · 탐험 `explore` · 진형 `tactics` · 지역 `region` · 옛 턴 `turn` · 옛 진행 `flow` · 이야기 `story` · 저장 `state`)은 남길 규칙 시험과 쿼터뷰 그리기가 아직 쓴다. 3단계(캐릭터 계산) · 4단계(구역 전투)가 그 자리를 대신하면 옮긴다.
