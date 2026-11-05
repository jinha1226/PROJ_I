# Scenario source databases

Scenario source database snapshots are stored as compressed JSON files to keep repository storage and transfer size smaller.

## The Old Blood v0.2

File: `the_old_blood_source_db_v0.2.json.gz`

Decompress to obtain the original JSON:

```bash
gunzip -k the_old_blood_source_db_v0.2.json.gz
```

The decompressed file is `the_old_blood_source_db_v0.2.json`. It is a preliminary source database, not a completed game-ready scenario. Its known extraction gaps and source-quality flags are recorded inside the JSON and in `inc/SCENARIO_DATABASE_PLAN.md`.

## 목록과 형식

`catalog.json`은 시나리오 목록과 라이선스 근거, `licenses/`는 받은 라이선스 파일이다.

작품 하나는 폴더 하나다. `<이름>.source.json`은 원문, `<이름>.normalized.json`은 정규화, `<이름>.adaptation.json`은 게임용 제안이다. 검사는 `python3 tools/scenario_validate.py <이름>`.

원본 PDF는 상업 이용이 안 되는 지도 그림이 들어 있을 수 있어 저장소에 넣지 않는다.
