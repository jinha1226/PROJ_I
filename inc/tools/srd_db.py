#!/usr/bin/env python3
"""manual.json + 5e-bits 데이터 → data/srd521/srd.sqlite 전체 DB. 기준은 PDF. (DESIGN.md 109)
실행: python3 tools/srd_db.py"""
import json, re, sqlite3, os, collections, sys
D = 'data/srd521/'; M = json.load(open(D + 'manual.json', encoding='utf-8')); N = M['nodes']; PATH = D + 'srd.sqlite'
if os.path.exists(PATH): os.remove(PATH)
db = sqlite3.connect(PATH); db.executescript("PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF;")
by = {n['id']: n for n in N}
def anc(n):
    o = []
    while n['parent'] is not None: n = by[n['parent']]; o.append(n)
    return o
def chapter(n):
    a = [q['title'] for q in anc(n) if q['level'] == 1] + ([n['title']] if n['level'] == 1 else [])
    return a[0] if a else ''
clean = lambda s: re.sub(r'\*\*|(?<![A-Za-z0-9])_|_(?![A-Za-z0-9])', '', s or '').replace('\xa0', ' ').strip()
def table(name, cols, rows):
    db.execute(f"CREATE TABLE {name} ({', '.join(cols)})"); db.executemany(f"INSERT INTO {name} VALUES ({','.join('?' * len(cols))})", rows)
    return len(rows)
# ── 원문 구조 전체 ──
table('manual_node', ['id INTEGER PRIMARY KEY', 'parent INTEGER', 'level INTEGER', 'chapter TEXT', 'title TEXT', 'page INTEGER', 'end_page INTEGER', 'path TEXT', 'text TEXT'], [(n['id'], n['parent'], n['level'], chapter(n), n['title'], n['page'], n['end'], ' > '.join(q['title'] for q in reversed(anc(n))), n['text']) for n in N])
T = []
for n in N:
    for i, t in enumerate(n['tables']): T.append((len(T), n['id'], chapter(n), n['title'], t['page'], json.dumps(t['columns'], ensure_ascii=False), json.dumps(t['rows'], ensure_ascii=False)))
table('manual_table', ['id INTEGER PRIMARY KEY', 'node INTEGER', 'chapter TEXT', 'title TEXT', 'page INTEGER', 'columns TEXT', 'rows TEXT'], T)
table('toc', ['level INTEGER', 'title TEXT', 'page INTEGER'], [tuple(t) for t in M['toc']])
table('page', ['page INTEGER PRIMARY KEY', 'text TEXT'], [(i + 1, t) for i, t in enumerate(M['pages'])])
tbl = lambda title, ch=None: next(t for n in N if n['title'] == title and n['tables'] and (not ch or chapter(n) == ch) for t in n['tables'])
under = lambda p, lv=4: [n for n in N if n['level'] == lv and any(q['title'] == p for q in anc(n))]
# ── 주문 ──
S = []; skip = []
for n in under('Spell Descriptions'):
    t = clean(n['text']); m = re.search(r'Level (\d) (\w+) \(([^)]*)\)|(\w+) Cantrip \(([^)]*)\)', t)
    if not m: skip.append(n['title']); continue
    lv = int(m[1]) if m[1] else 0; sch = m[2] or m[4]; cl = m[3] or m[5]
    f = lambda k, e: (re.search(k + r'\s*:\s*(.*?)(?=\s*(?:' + e + r')\s*:|\n|$)', t) or [None, ''])[1].strip()
    cast = f('Casting Time', 'Range|Components?|Duration'); rng = f('Range', 'Components?|Duration|Casting Time'); comp = f('Components?', 'Duration|Range|Casting Time'); dur = f('Duration', 'Range|Components?|Casting Time')
    body = '\n'.join(q for q in t.split('\n') if not re.match(r'^(Casting Time|Range|Components?|Duration)\s*:', q) and not re.match(r'^(Level \d \w+ \(|\w+ Cantrip \()', q))
    dmg = sorted(set(re.findall(r'\b\d+d\d+(?: ?\+ ?\d+)?\b', body)))
    S.append((n['title'], lv, sch, cl, cast, rng, comp, dur, 'Concentration' in dur, 'Ritual' in cast, n['page'], body, json.dumps(dmg)))
cnt = {}
cnt['spell'] = table('spell', ['name TEXT PRIMARY KEY', 'level INTEGER', 'school TEXT', 'classes TEXT', 'casting_time TEXT', 'range TEXT', 'components TEXT', 'duration TEXT', 'concentration INTEGER', 'ritual INTEGER', 'page INTEGER', 'text TEXT', 'dice TEXT'], S)
# ── 몬스터 ──
MO = []; AB = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha']
for n in N:
    if n['level'] != 6 or chapter(n) not in ('Monsters A–Z', 'Animals'): continue
    t = clean(n['text']); g = lambda p, flags=0: (re.search(p, t, flags) or [None, ''])[1].strip()
    typ = t.split('\n')[0]; num = lambda s: int(re.sub(r'\D', '', s) or 0)
    ab = {}
    for k in AB:
        q = re.search(k + r'\s*(\d+)\s*([+−-]\d+)\s*([+−-]?\d+)', t)
        if q: ab[k] = (int(q[1]), q[2].replace('−', '-'), q[3].replace('−', '-'))
    sec = {}; cur0 = 'Stats'
    for line in t.split('\n'):
        if line.strip() in ('Traits', 'Actions', 'Bonus Actions', 'Reactions', 'Legendary Actions'): cur0 = line.strip(); continue
        sec.setdefault(cur0, []).append(line)
    hp = re.search(r'HP\s+(\d+)(?:\s*\(([^)]*)\))?', t); cr = re.search(r'CR\s+([\d/]+)\s*\((?:XP\s*)?([\d,]+)[^;)]*(?:;\s*PB\s*\+?(\d+))?', t)
    MO.append((n['title'], typ, num(g(r'\bAC\s+(\d+)')), g(r'Initiative\s+([+−-]?\d+)').replace('−', '-'), int(hp[1]) if hp else 0, hp[2] if hp and hp[2] else '', g(r'Speed\s+(.+?)(?=\s*MOD|\n|$)'), *[ab.get(k, (0, '', ''))[0] for k in AB], *[ab.get(k, (0, '', ''))[2] for k in AB], g(r'Skills\s+(.+?)(?=\s*(?:Resistances|Vulnerabilities|Immunities|Senses|Gear|Languages|CR)\s|\n|$)'), g(r'(?:Vulnerabilities)\s+(.+?)(?=\s*(?:Resistances|Immunities|Gear|Senses)\s|\n|$)'), g(r'Resistances\s+(.+?)(?=\s*(?:Immunities|Gear|Senses)\s|\n|$)'), g(r'Immunities\s+(.+?)(?=\s*(?:Gear|Senses)\s|\n|$)'), g(r'Senses\s+(.+?)(?=\s*(?:Languages|CR)\s|\n|$)'), g(r'Languages\s+(.+?)(?=\s*CR\s|\n|$)'), cr[1] if cr else '', int(cr[2].replace(',', '')) if cr else 0, int(cr[3]) if cr and cr[3] else 0, '\n'.join(sec.get('Traits', [])), '\n'.join(sec.get('Actions', [])), '\n'.join(sec.get('Bonus Actions', [])), '\n'.join(sec.get('Reactions', [])), '\n'.join(sec.get('Legendary Actions', [])), chapter(n), n['page'], t))
cnt['monster'] = table('monster', ['name TEXT', 'type TEXT', 'ac INTEGER', 'initiative TEXT', 'hp INTEGER', 'hit_dice TEXT', 'speed TEXT', 'str INTEGER', 'dex INTEGER', 'con INTEGER', 'int INTEGER', 'wis INTEGER', 'cha INTEGER', 'save_str TEXT', 'save_dex TEXT', 'save_con TEXT', 'save_int TEXT', 'save_wis TEXT', 'save_cha TEXT', 'skills TEXT', 'vulnerabilities TEXT', 'resistances TEXT', 'immunities TEXT', 'senses TEXT', 'languages TEXT', 'cr TEXT', 'xp INTEGER', 'pb INTEGER', 'traits TEXT', 'actions TEXT', 'bonus_actions TEXT', 'reactions TEXT', 'legendary_actions TEXT', 'chapter TEXT', 'page INTEGER', 'text TEXT'], MO)
# ── 마법 물건 ──
MI = []
for n in under('Magic Items A–Z'):
    t = clean(n['text']); first = t.split('\n')[0]; q = re.match(r'(.+?),\s*(Common|Uncommon|Rare|Very Rare|Legendary|Artifact|Rarity Varies|Rarity .*?|.*?\(.*?\))(.*)', first); att = 'Attunement' in first
    MI.append((n['title'], first, (q[1] if q else first), (q[2] if q else ''), att, n['page'], t))
cnt['magic_item'] = table('magic_item', ['name TEXT', 'type_line TEXT', 'category TEXT', 'rarity TEXT', 'attunement INTEGER', 'page INTEGER', 'text TEXT'], MI)
# ── 장비 ──
W = []; grp = ''
wt = tbl('Weapons', 'Equipment')
for r in wt['rows']:
    if not any(r[1:]): grp = r[0]; continue
    m = re.match(r'(\S+) (\w+)', r[1]); W.append((r[0], grp, m[1] if m else r[1], m[2] if m else '', r[2], r[3], r[4], r[5]))
cnt['weapon'] = table('weapon', ['name TEXT', 'category TEXT', 'damage TEXT', 'damage_type TEXT', 'properties TEXT', 'mastery TEXT', 'weight TEXT', 'cost TEXT'], W)
A = []; grp = ''
for r in tbl('Armor', 'Equipment')['rows']:
    if not any(r[1:]): grp = r[0]; continue
    A.append((r[0], grp, *r[1:]))
cnt['armor'] = table('armor', ['name TEXT', 'category TEXT', 'ac TEXT', 'strength TEXT', 'stealth TEXT', 'weight TEXT', 'cost TEXT'], A)
G = []
for r in tbl('Adventuring Gear', 'Equipment')['rows']:
    for i in (0, 3):
        if r[i]: G.append((r[i], r[i + 1], r[i + 2]))
gd = {n['title']: clean(n['text']) for n in under('Adventuring Gear') + under('Adventuring Gear', 3)}
for n in N:
    if chapter(n) == 'Equipment' and n['level'] == 4: gd.setdefault(re.sub(r'\s*\(.*', '', n['title']), clean(n['text']))
cnt['gear'] = table('gear', ['name TEXT', 'weight TEXT', 'cost TEXT', 'text TEXT'], [(*g, gd.get(re.sub(r'\s*\(.*', '', g[0]), '')) for g in G])
TL = [(n['title'], re.search(r'\(([\d,.]+ \w+)\)', n['title'])[1], clean(n['text']), n['page']) for n in N if chapter(n) == 'Equipment' and re.search(r'\([\d,.]+ (GP|SP|CP)\)$', n['title']) and 'Ability:' in n['text']]
cnt['tool'] = table('tool', ['name TEXT', 'cost TEXT', 'text TEXT', 'page INTEGER'], TL)
# ── 종족 · 배경 · 재주 · 상태 · 용어 ──
SP = []
for n in under('Species Descriptions'):
    t = clean(n['text']); g = lambda p: (re.search(p, t) or [None, ''])[1].strip()
    kids = [q for q in N if q['parent'] == n['id']]
    SP.append((n['title'], g(r'Creature Type:\s*(\w+)'), g(r'Size:\s*(.+?)(?=\s*Speed:|\n|$)'), g(r'Speed:\s*(\d+ feet)'), n['page'], t + ''.join('\n## ' + q['title'] + '\n' + clean(q['text']) + ''.join('\n' + json.dumps(b['rows'], ensure_ascii=False) for b in q['tables']) for q in kids)))
cnt['species'] = table('species', ['name TEXT', 'creature_type TEXT', 'size TEXT', 'speed TEXT', 'page INTEGER', 'text TEXT'], SP)
BG = []
for n in under('Background Descriptions', 3) or under('Background Descriptions'):
    t = clean(n['text']); g = lambda p: (re.search(p, t, re.S) or [None, ''])[1].strip().replace('\n', ' ')
    BG.append((n['title'], g(r'Ability Scores:\s*(.+?)(?=Feat:)'), g(r'Feat:\s*(.+?)(?=Skill Prof)'), g(r'Skill Proficiencies:\s*(.+?)(?=Tool Prof)'), g(r'Tool Proficiency:\s*(.+?)(?=Equipment:)'), g(r'Equipment:\s*(.+)$'), n['page']))
cnt['background'] = table('background', ['name TEXT', 'ability_scores TEXT', 'feat TEXT', 'skills TEXT', 'tool TEXT', 'equipment TEXT', 'page INTEGER'], BG)
FE = []
for sec in ('Origin Feats', 'General Feats', 'Fighting Style Feats', 'Epic Boon Feats'):
    for n in under(sec): FE.append((n['title'], sec.replace(' Feats', ''), clean(n['text']), n['page']))
cnt['feat'] = table('feat', ['name TEXT', 'category TEXT', 'text TEXT', 'page INTEGER'], FE)
GL = [(re.sub(r'\s*\[.*', '', n['title']), (re.search(r'\[(.*?)\]', n['title']) or [None, ''])[1], clean(n['text']), n['page']) for n in under('Rules Definitions')]
cnt['glossary'] = table('glossary', ['term TEXT', 'tag TEXT', 'text TEXT', 'page INTEGER'], GL)
# ── 직업 ──
CL = []; LV = []; FT = []; SL = []; SC = []
for n in N:
    m = re.match(r'Core (\w+) Traits$', n['title'])
    if m and n['tables']:
        b = n['tables'][0]; rows = [b['columns']] + b['rows']; d = {re.sub(r'^Proficiencies ', '', r[0]): r[1] for r in rows if len(r) > 1}; CL.append((m[1], d.get('Primary Ability', ''), d.get('Hit Point Die', ''), d.get('Saving Throw', '') + (' ' + d.get('Proficiencies', '') if 'Proficiencies' in d else ''), d.get('Skill Proficiencies', ''), d.get('Weapon Proficiencies', ''), d.get('Tool Proficiencies', ''), d.get('Armor Training', ''), d.get('Starting Equipment', ''), n['page'], json.dumps(rows, ensure_ascii=False)))
    m = re.match(r'(\w+) Features$', n['title'])
    if m and n['tables'] and chapter(n) == 'Classes':
        b = n['tables'][0]
        for r in [q for q in b['rows'] if q[0].isdigit()]: LV.append((m[1], int(r[0]), r[1], r[2], json.dumps(dict(zip(b['columns'][3:], r[3:])), ensure_ascii=False)))
    m = re.match(r'Level (\d+): (.+)$', n['title'])
    if m and chapter(n) == 'Classes':
        a = [q['title'] for q in anc(n)]; cls = next((q for q in a if q in ('Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard')), ''); sub = next((re.sub(r'^.*Subclass: ', '', q) for q in a if 'Subclass:' in q), '')
        FT.append((cls, sub, int(m[1]), m[2], n['page'], clean(n['text']) + ''.join('\n' + json.dumps(b['rows'], ensure_ascii=False) for b in n['tables'])))
    m = re.match(r'(?:Level (\d) |Cantrips \(Level 0 )(\w+) Spells', n['title'])
    if m and n['tables']:
        for tb0 in n['tables']:
            for r0 in tb0['rows']:
                for i0 in range(0, len(r0), 3):
                    r = r0[i0:i0 + 3]
                    if r[0] and r[0] != 'Spell': SL.append((m[2], int(m[1] or 0), r[0], r[1] if len(r) > 1 else '', r[2] if len(r) > 2 else ''))
    if 'Subclass:' in n['title']: SC.append((n['title'].split(' Subclass')[0], n['title'].split(': ', 1)[1], n['page'], clean(n['text'])))
cnt['class'] = table('class', ['name TEXT PRIMARY KEY', 'primary_ability TEXT', 'hit_die TEXT', 'saves TEXT', 'skills TEXT', 'weapons TEXT', 'tools TEXT', 'armor TEXT', 'start_equipment TEXT', 'page INTEGER', 'core_json TEXT'], CL)
cnt['class_level'] = table('class_level', ['class TEXT', 'level INTEGER', 'prof_bonus TEXT', 'features TEXT', 'columns TEXT'], LV)
cnt['class_feature'] = table('class_feature', ['class TEXT', 'subclass TEXT', 'level INTEGER', 'name TEXT', 'page INTEGER', 'text TEXT'], FT)
cnt['class_spell'] = table('class_spell', ['class TEXT', 'level INTEGER', 'spell TEXT', 'school TEXT', 'special TEXT'], SL)
cnt['subclass'] = table('subclass', ['class TEXT', 'name TEXT', 'page INTEGER', 'text TEXT'], SC)
# ── 5e-bits 원본 그대로 (참고 · 비교) ──
CLEAN = json.load(open(D + 'clean.json', encoding='utf-8'))
table('repo_json', ['tbl TEXT', 'idx TEXT', 'name TEXT', 'json TEXT'], [(k, x.get('index', ''), x.get('name', ''), json.dumps(x, ensure_ascii=False)) for k, v in CLEAN.items() for x in v])
# ── 검색 ──
db.execute("CREATE VIRTUAL TABLE search USING fts5(chapter, title, text, content='manual_node', content_rowid='id')"); db.execute("INSERT INTO search(rowid, chapter, title, text) SELECT id, chapter, title, text FROM manual_node")
# ── PDF ↔ 5e-bits 값 차이 ──
norm = lambda s: re.sub(r'[^a-z0-9]', '', str(s).lower()); DF = []
def diff(tb, name, f, a, b): DF.append((tb, name, f, str(a), str(b)))
rs = {norm(x['name']): x for x in CLEAN['Spells']}
for s in S:
    r = rs.get(norm(s[0]))
    if not r: diff('spell', s[0], '없음', 'PDF', ''); continue
    if r.get('level') != s[1]: diff('spell', s[0], 'level', s[1], r.get('level'))
    if norm(r.get('school', {}).get('name', '')) != norm(s[2]): diff('spell', s[0], 'school', s[2], r.get('school', {}).get('name'))
    if r.get('range') and norm(r['range']) != norm(s[5]): diff('spell', s[0], 'range', s[5], r['range'])
    cl = sorted(x['name'] for x in r.get('classes', []))
    if norm(''.join(cl)) != norm(''.join(sorted(q.strip() for q in s[3].split(',')))): diff('spell', s[0], 'classes', s[3], ','.join(cl))
    if r.get('duration') and norm(r['duration']) != norm(re.sub(r'^Concentration, ', '', s[7])): diff('spell', s[0], 'duration', s[7], r['duration'])
    if r.get('casting_time') and norm(r['casting_time']) != norm(re.sub(r' or Ritual$', '', s[4])): diff('spell', s[0], 'casting', s[4], r['casting_time'])
rm = {norm(x['name']): x for x in CLEAN['Monsters']}
for m in MO:
    r = rm.get(norm(m[0]))
    if not r: diff('monster', m[0], '없음', 'PDF', ''); continue
    ac = r['armor_class'][0]['value'] if isinstance(r.get('armor_class'), list) else r.get('armor_class')
    if ac != m[2]: diff('monster', m[0], 'ac', m[2], ac)
    if r.get('hit_points') != m[4]: diff('monster', m[0], 'hp', m[4], r.get('hit_points'))
    for i, k in enumerate(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']):
        if r.get(k) != m[7 + i]: diff('monster', m[0], k, m[7 + i], r.get(k))
    if str(r.get('challenge_rating')) != str(eval(m[25]) if m[25] else '') and m[25] not in ('1/2', '1/4', '1/8'): diff('monster', m[0], 'cr', m[25], r.get('challenge_rating'))
    if r.get('xp') not in (None, m[26]): diff('monster', m[0], 'xp', m[26], r.get('xp'))
rx = {norm(x['name']): x for x in CLEAN['Magic-Items']}
for m in MI:
    r = rx.get(norm(m[0]))
    if not r: diff('magic_item', m[0], '없음', 'PDF', ''); continue
    if norm(r.get('rarity', {}).get('name', '')) and norm(r['rarity']['name']) not in norm(m[1]): diff('magic_item', m[0], 'rarity', m[1], r['rarity']['name'])
    if bool(r.get('attunement')) != bool(m[4]): diff('magic_item', m[0], 'attunement', m[4], r.get('attunement'))
for x in CLEAN['Spells']:
    if norm(x['name']) not in {norm(s[0]) for s in S}: diff('spell', x['name'], '5e-bits에만', '', x['name'])
for x in CLEAN['Monsters']:
    if norm(x['name']) not in {norm(m[0]) for m in MO}: diff('monster', x['name'], '5e-bits에만', '', x['name'])
for x in CLEAN['Magic-Items']:
    if norm(x['name']) not in {norm(m[0]) for m in MI}: diff('magic_item', x['name'], '5e-bits에만', '', x['name'])
ss = {s[0]: {q.strip() for q in s[3].split(',')} for s in S}
for c0, lv, sp0, *_ in SL:
    if sp0 not in ss: diff('class_spell', sp0, '목록 주문이 설명에 없음', c0, '')
    elif c0 not in ss[sp0]: diff('class_spell', sp0, '목록엔 있는데 주문 설명 직업에 없음', c0, ','.join(sorted(ss[sp0])))
listed = collections.defaultdict(set)
for c0, lv, sp0, *_ in SL: listed[sp0].add(c0)
for s0, cs in ss.items():
    for c0 in cs:
        if c0 not in listed[s0]: diff('class_spell', s0, '주문 설명 직업인데 목록에 없음', c0, '')
for c0, l0, pb, fs0, _ in LV:
    for f0 in [q.strip() for q in fs0.split(',') if q.strip()]:
        f0 = re.sub(r' \(.*', '', f0)
        if f0 in ('—', '') or 'Subclass' in f0: continue
        if not any(q[0] == c0 and q[3].lower().replace('’', "'") == f0.lower().replace('’', "'") for q in FT): diff('class_feature', c0, '표의 기능이 본문에 없음', f'{l0}: {f0}', '')
table('pdf_vs_repo', ['tbl TEXT', 'name TEXT', 'field TEXT', 'pdf TEXT', 'repo TEXT'], DF)
os.makedirs(D + 'db', exist_ok=True)
for tb in [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'search%' AND name NOT IN ('repo_json', 'page', 'manual_node', 'manual_table')")]:
    cur0 = db.execute(f'SELECT * FROM {tb}'); cn = [c[0] for c in cur0.description]; json.dump([dict(zip(cn, r)) for r in cur0.fetchall()], open(f'{D}db/{tb}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
db.commit(); print(cnt); print('skip spell', skip[:10]); print('diff', collections.Counter((a, c) for a, b, c, d, e in DF).most_common(30)); print('MB', round(os.path.getsize(PATH) / 1e6, 1))
