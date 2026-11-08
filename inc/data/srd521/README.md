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

## 다시 만들기 (2026-11-08 고침)
pymupdf가 없으면 PyPI의 PyMuPDF · PyMuPDFb 1.24.10 휠을 받아 압축을 푼 폴더를 PYTHONPATH로 준다 (pip 불필요).
- `srd_parse.py`: 본문 중간에 표 제목(10.5pt 제목)이 끼면 표 뒤의 본문을 앞 절로 되돌린다. 전에는 표 제목 절에 붙어 격노 · 바드의 영감 · 야생 변신 · 주문 시전 등 본문이 잘려 보였다.
- 대조: PDF 글줄 29,314개 중 DB에 없는 줄 1 (표 머리의 말줄임표).
- `python3 tools/srd_mons_db.py`: 몬스터 330종 능력치표 원문 → `js/srd_mons.js` (모든 칸 · 특성 · 행동 · 보너스 행동 · 반응 · 전설 행동 · 감각 · 상태 면역). 옛 `srd_mons.py`(외부 API 64종 · DC 짐작)는 쓰지 않는다.
- `python3 tools/srd_spells_db.py`: 주문 339개에 원문 칸(`srd`)을 붙이고 게임 값과 원문의 차이를 `spell_check.json`에 (상태는 원문대로 고친다).

```
PYTHONPATH=<pymupdf 경로> python3 tools/srd_parse.py
python3 tools/srd_db.py
python3 tools/srd_verify.py
```

## 라이선스
SRD 5.2.1: Wizards of the Coast, CC-BY-4.0. 5e-bits 데이터: MIT (`LICENSE.md`).
