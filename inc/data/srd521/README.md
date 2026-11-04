# SRD 5.2.1 DB

기준은 `SRD_CC_v5.2.1.pdf`다. 값이 어긋나면 PDF를 따른다.

## 파일
- `srd.sqlite`: 전체 DB
- `db/*.json`: 표별 JSON
- `manual.json`: PDF에서 뽑은 글 구조 전체
- `5e-SRD-*.json`, `clean.json`, `PATCHES.json`: 5e-bits 데이터와 수정분 (비교용)

## 표
| 표 | 내용 |
|---|---|
| `page` | 쪽별 원문 |
| `toc` | PDF 목차 |
| `manual_node` | 제목별 본문 (장, 경로, 쪽) |
| `manual_table` | 원문의 모든 표 |
| `search` | 본문 전문 검색 (FTS5) |
| `class`, `class_level`, `class_feature`, `subclass`, `class_spell` | 직업 |
| `species`, `background`, `feat` | 종족, 배경, 재주 |
| `weapon`, `armor`, `gear`, `tool`, `magic_item` | 장비 |
| `spell`, `monster`, `glossary` | 주문, 몬스터, 규칙 용어 |
| `pdf_vs_repo` | PDF와 5e-bits의 차이 |

## 다시 만들기
```
PYTHONPATH=<pymupdf 경로> python3 tools/srd_parse.py
python3 tools/srd_db.py
python3 tools/srd_verify.py
```

## 라이선스
SRD 5.2.1: Wizards of the Coast, CC-BY-4.0. 5e-bits 데이터: MIT (`LICENSE.md`).
