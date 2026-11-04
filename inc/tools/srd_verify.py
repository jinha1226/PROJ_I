#!/usr/bin/env python3
"""DB가 원문을 빠짐없이 담았는지 검사: python3 tools/srd_verify.py (DESIGN.md 109)"""
import sqlite3, re, json, collections, sys
c = sqlite3.connect('data/srd521/srd.sqlite'); bad = 0
def ck(name, ok, x=''):
    global bad
    print(('  ok ' if ok else '  ✗  ') + name, x)
    if not ok: bad += 1
tok = lambda s: re.findall(r"[a-z0-9]+", (s or '').lower().replace('-\n', '').replace('’', "'"))
pages = [r[0] for r in c.execute('SELECT text FROM page ORDER BY page')]; ck('364쪽', len(pages) == 364)
src = collections.Counter(); 
for t in pages: src.update(tok(re.sub(r'System Reference Document 5\.2\.1\s*\d*', ' ', t)))
got = collections.Counter()
for ti, te in c.execute('SELECT title, text FROM manual_node'): got.update(tok(ti)); got.update(tok(te))
for co, ro in c.execute('SELECT columns, rows FROM manual_table'): got.update(tok(' '.join(json.loads(co)))); got.update(tok(' '.join(x for r in json.loads(ro) for x in r)))
tot = sum(src.values()); miss = sum((src - got).values()); ck(f'원문 단어 {tot}개 중 빠진 것 {miss}개 ({100 - miss * 100 / tot:.3f}% 담음)', miss / tot < 0.005, (src - got).most_common(12))
for tb, n in [('spell', 339), ('background', 4), ('species', 9), ('feat', 17), ('class', 12), ('class_level', 240), ('class_feature', 232), ('subclass', 12), ('weapon', 38), ('armor', 13), ('glossary', 155)]:
    v = c.execute(f'SELECT count(*) FROM {tb}').fetchone()[0]; ck(f'{tb} {n}', v == n, v)
for tb, cols in [('spell', 'casting_time,range,components,duration,school'), ('monster', 'ac,hp,str,dex,con,cr,xp,type'), ('magic_item', 'rarity'), ('weapon', 'damage,weight,cost'), ('armor', 'ac,weight,cost')]:
    for k in cols.split(','):
        v = c.execute(f"SELECT count(*) FROM {tb} WHERE {k} IS NULL OR {k}='' OR {k}=0").fetchone()[0]; ck(f'{tb}.{k} 빈칸 없음', v == 0 or (k == 'xp' and tb == 'monster') or (k == 'cr' and c.execute("SELECT count(*) FROM monster WHERE cr=''").fetchone()[0] == 0), v)
names = {re.sub(r'\W', '', r[0]).lower() for r in c.execute('SELECT title FROM manual_node')}; miss = [r[0] for r in c.execute('SELECT title FROM toc') if re.sub(r'\W', '', r[0]).lower() not in names]; ck(f'PDF 목차 520개 찾음 (못 찾음 {len(miss)})', len(miss) <= 3, miss)
ck('검색', c.execute("SELECT count(*) FROM search WHERE search MATCH 'fireball'").fetchone()[0] > 0)
print('실패', bad); sys.exit(1 if bad else 0)
