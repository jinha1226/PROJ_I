#!/usr/bin/env python3
"""시나리오 데이터 검사: 참조 · 출처 · 도달 가능성 · 라이선스 · 원문 대조 (SCENARIO_DATABASE_PLAN.md 8절)
실행: python3 tools/scenario_validate.py astral_tower  (원문 대조는 ocr 파일이 있을 때)"""
import json, re, sys, sqlite3, os, collections
name = sys.argv[1]; D = f'data/scenarios/{name}/'; L = lambda k: json.load(open(f'{D}{name}.{k}.json', encoding='utf-8'))
S, N, A = L('source'), L('normalized'), L('adaptation'); bad = 0
def ck(t, ok, x=''):
    global bad
    print(('  ok ' if ok else '  ✗  ') + t, x if x != '' else '')
    bad += 0 if ok else 1
ids = set()
for coll in (S['rooms'], S['tables'], S['creatures'], N['items'], N['clues'], N['facts'], N['hazards'], N['world_state'], N['goals'], N['story_graph']):
    for x in coll:
        ck(f"ID 중복 {x['id']}", x['id'] not in ids) if x['id'] in ids else None; ids.add(x['id'])
rooms = {r['id'] for r in S['rooms']}
ck(f'정규화 방 = 원문 방 ({len(rooms)})', {r['id'] for r in N['rooms']} == rooms)
ck('모든 방에 출처 쪽', all(r['provenance']['pdf_pages'] for r in S['rooms']))
ck('모든 연결이 있는 방을 가리킴', all(e['a'] in rooms and e['b'] in rooms for e in N['edges']), [e for e in N['edges'] if e['a'] not in rooms or e['b'] not in rooms][:3])
ck('연결마다 근거 종류', all(e['confidence'] in ('text', 'map', 'inferred') for e in N['edges']))
ck('물건 · 위험 · 조우의 방이 있음', all(x['room'] in rooms for c in ('items', 'hazards', 'encounters') for x in N[c]))
ck('단서의 사실이 있음', all(c['fact'] in ids or c['fact'] is None for c in N['clues']))
ck('이야기 노드 다음이 있음', all(q in ids for g in N['story_graph'] for q in g['next']))
ck('이야기 요구 조건이 있음', all(q in ids for g in N['story_graph'] for q in g.get('needs', [])))
ck('끝 노드가 있음', any(g.get('end') for g in N['story_graph']))
ck('실패 · 방치 경로가 있음', any(g.get('state') for g in N['story_graph']))
# 도달: 입구에서 모든 방 (잠금 없이 / 열쇠로)
adj = collections.defaultdict(list)
for e in N['edges']: adj[e['a']].append(e); adj[e['b']].append({**e, 'a': e['b'], 'b': e['a']})
def reach(have):
    seen = {x['room'] for x in N['entrances'] if x['room'] != '*'}; st = list(seen)
    while st:
        for e in adj[st.pop()]:
            if e.get('needs') and e['needs'] not in have: continue
            if e['b'] not in seen: seen.add(e['b']); st.append(e['b'])
    return seen
r0 = reach(set()); ck(f'열쇠 없이 닿는 방 {len(r0)}/{len(rooms)}', len(r0) == len(rooms) - 1, sorted(rooms - r0))
# 풀 수 있나: 얻을 수 있는 물건 · 사실을 반복 계산
have = set(); changed = True
while changed:
    changed = False; seen = reach(have)
    for i in N['items']:
        if i['id'] not in have and i['room'] in seen and (not i.get('needs') or i['needs'] in have): have.add(i['id']); changed = True
    for c in N['clues']:
        if c['fact'] and c['fact'] not in have and c['at'] in seen and (not c['via'] or c['via'] in have): have.add(c['fact']); changed = True
ck('모든 물건을 얻을 수 있음', {i['id'] for i in N['items']} <= have, {i['id'] for i in N['items']} - have)
for g in N['goals']: ck(f"목표 {g['id']} 달성 가능", all(q in have for q in g['needs']) and g['room'] in reach(have))
nodes = {g['id']: g for g in N['story_graph']}; seen = set(); st = ['AT-N-ARRIVE'] if 'AT-N-ARRIVE' in nodes else [N['story_graph'][0]['id']]
while st:
    k = st.pop()
    if k in seen: continue
    seen.add(k); st += nodes[k]['next']
ck('모든 이야기 노드에 닿음', set(nodes) == seen, set(nodes) - seen)
ck('핵심 목표가 특정 직업을 요구하지 않음', not any('class' in g for g in N['goals']))
# 라이선스
lic = json.dumps(S['source']['license'], ensure_ascii=False); ck('라이선스 기록', 'CC0' in lic and 'CC BY-NC' in lic)
ck('지도 그림 · 이미지 파일을 담지 않음', not [f for f in os.listdir(D) if re.search(r'\.(png|jpe?g|pdf|webp)$', f, re.I)])
# SRD
db = 'data/srd521/srd.sqlite'
if os.path.exists(db):
    c = sqlite3.connect(db); miss = [v for v in A['monsters'].values() if not c.execute('SELECT 1 FROM monster WHERE name=?', (v,)).fetchone()]; ck(f"SRD 몬스터 {len(A['monsters'])}개 모두 DB에 있음", not miss, miss)
# 원문 대조
oc = f'old/scenario_src/{name}_ocr.json'
if os.path.exists(oc):
    P = json.load(open(oc, encoding='utf-8')); tk = lambda s: re.findall(r'[a-z0-9]+', s.lower()); pool = collections.Counter(tk(' '.join(P)))
    for r in S['rooms']:
        ws = tk(r['text']); m = [w for w in ws if pool[w] == 0]
        if m: print('    OCR에 없는 단어', r['id'], m[:6])
    tot = sum(len(tk(r['text'])) for r in S['rooms']); miss = sum(1 for r in S['rooms'] for w in tk(r['text']) if pool[w] == 0); ck(f'방 원문 단어 {tot}개 중 PDF 글자층에 없는 것 {miss}개', miss / tot < .01)
print('실패', bad); sys.exit(1 if bad else 0)
