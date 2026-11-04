# Scenario source databases

Scenario source database snapshots are stored as compressed JSON files to keep repository storage and transfer size smaller.

## The Old Blood v0.2

File: `the_old_blood_source_db_v0.2.json.gz`

Decompress to obtain the original JSON:

```bash
gunzip -k the_old_blood_source_db_v0.2.json.gz
```

The decompressed file is `the_old_blood_source_db_v0.2.json`. It is a preliminary source database, not a completed game-ready scenario. Its known extraction gaps and source-quality flags are recorded inside the JSON and in `inc/SCENARIO_DATABASE_PLAN.md`.
