# data/srd521/db → js/srd_items.js: 전투 효과가 없는 물건의 값과 이름. 손으로 고치지 않는다
import json, re, sys, subprocess
L = json.load(open('data/srd521/db/magic_item.json', encoding='utf-8')); G = json.load(open('data/srd521/db/gear.json', encoding='utf-8'))
M = json.load(open('data/srd521/db/monster.json', encoding='utf-8'))
gear = {}
for m in M:
    q = re.search(r'Gear ([^\n]*?)(?: Senses|\n|$)', m.get('text') or '')
    if q: gear[m['name']] = [re.sub(r'\s*\(\d+\)$', '', s.strip()) for s in q.group(1).split(',')]
out = {'mgear': gear, 'magic': [{'en': m['name'], 'rar': next((k for k in ['Very Rare', 'Uncommon', 'Common', 'Legendary', 'Artifact', 'Rare'] if k in m['type_line']), 'Rare'), 'att': m['attunement'], 'cat': m['category']} for m in L], 'gear': [{'en': g['name'], 'cost': g['cost']} for g in G]}
open('js/srd_items.js', 'w', encoding='utf-8').write("'use strict';\n// 생성: tools/srd_items.py (SRD 5.2.1). 손으로 고치지 않는다\nG.SRD_ITEMS = " + json.dumps(out, ensure_ascii=False) + ";\n")
print(len(L), len(G))
