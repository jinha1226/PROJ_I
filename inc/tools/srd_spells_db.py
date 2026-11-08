#!/usr/bin/env python3
"""SRD 5.2.1 주문 339개: data/srd521/db/spell.json 원문 → js/srd_spells.js의 각 주문에 `srd` 칸(원문 그대로)을 붙이고,
게임 칸(lv · conc · save · atk · half · dice · dt · area · 상태)이 원문과 다른 곳을 data/srd521/spell_check.json에 적는다 (DESIGN.md 156).
실행: python3 tools/srd_spells_db.py   — 게임 칸은 고치지 않는다(차이는 목록으로). 손으로 js/srd_spells.js를 고치지 않는다"""
import json, re
DB = 'data/srd521/db/spell.json'; JS = 'js/srd_spells.js'; CHECK = 'data/srd521/spell_check.json'
AB = dict(Strength='str', Dexterity='dex', Constitution='con', Intelligence='int', Wisdom='wis', Charisma='cha')
CONDS = ['Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious']
DT = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder']
def ft(s):
    s = s.lower()
    if s.startswith('self'): m = re.search(r'(\d+)-foot', s); return 0
    if s.startswith('touch'): return 5
    m = re.match(r'([\d,]+) (feet|foot|miles?)', s)
    return int(m.group(1).replace(',', '')) * (5280 if m and m.group(2).startswith('mile') else 1) if m else None
def area_of(t):
    """원문의 범위: {shape, ft, w}. 모양 낱말(Sphere · Cube · Cone · Line · Emanation · Cylinder)을 먼저, 없으면 「N-foot radius」 · 「N-foot square」"""
    m = re.search(r'(\d+)-foot-long,? (\d+)-foot-wide Line|Line (?:that is )?(\d+) feet long and (\d+) feet wide', t)
    if m: return dict(shape='line', ft=int(m.group(1) or m.group(3)), w=int(m.group(2) or m.group(4)))
    for shape, rx in [('cone', r'(\d+)-foot Cone'), ('line', r'(\d+)-foot(?:-long)? Line'), ('cube', r'(\d+)-foot Cube'), ('sphere', r'(\d+)-foot-radius Sphere'), ('emanation', r'(\d+)-foot Emanation'), ('cylinder', r'(\d+)-foot-radius,? [\d-]*foot-?(?:high|tall) Cylinder'), ('sphere', r'(\d+)-foot-radius,?\s'), ('sphere', r'radius of (\d+) feet'), ('square', r'(\d+)-foot[ -]square')]:
        m = re.search(rx, t)
        if m: return dict(shape=shape, ft=int(m.group(1)), w=5 if shape == 'line' else 0)
    return None
def srd_of(r):
    t = re.sub(r'\s+', ' ', r['text'])
    main = re.split(r'Using a Higher-Level Spell Slot\.|Cantrip Upgrade\.', t)[0]
    up = re.search(r'(Using a Higher-Level Spell Slot\.|Cantrip Upgrade\.)(.*)$', t)
    o = dict(ct=r['casting_time'], range=r['range'], rangeFt=ft(r['range']), comp=r['components'], dur=r['duration'], conc=bool(r['concentration']), ritual=bool(r['ritual']),
             classes=[c.strip().lower() for c in r['classes'].split(',') if c.strip()], page=r['page'], text=r['text'])
    sv = re.search(r'(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw', main, re.I); o['save'] = AB[sv.group(1).capitalize()] if sv else None
    o['atk'] = bool(re.search(r'(melee|ranged) spell attack|make a spell attack|spell attack (roll )?against', main, re.I))
    o['half'] = bool(re.search(r'half as much damage|half damage|takes half', main, re.I))
    o['area'] = area_of(main)
    dm = re.search(r'(\d+)d(\d+)(?:\s*\+\s*(\d+))?\s+(' + '|'.join(d.capitalize() for d in DT) + r')\s+damage', main)
    o['dice'] = [int(dm.group(1)), int(dm.group(2)), int(dm.group(3) or 0)] if dm else None; o['dt'] = dm.group(4).lower() if dm else None
    hl = re.search(r'regains? (?:a number of )?Hit Points equal to (\d+)d(\d+)', main); o['heal'] = [int(hl.group(1)), int(hl.group(2))] if hl else None
    o['conds'] = [c.lower() for c in CONDS if re.search(r'\b' + c + r'\b', main)]
    o['up'] = up.group(2).strip() if up else ''
    return o
def main():
    src = open(JS, encoding='utf-8').read(); head, body = src.split('G.SRD_SP = ', 1); js, tail = body.rsplit(';', 1)
    SP = json.loads(js); R = {re.sub(r'[^a-z0-9]+', '-', r['name'].lower()).strip('-'): r for r in json.load(open(DB, encoding='utf-8'))}
    q = lambda n: n.replace('’', "'").lower(); keyOf = {q(v['en']): k for k, v in SP.items()}; check = {}
    for r in R.values():
        k = keyOf.get(q(r['name']))
        if not k: check[r['name']] = ['게임 데이터에 없음']; continue
        g = SP[k]; s = g['srd'] = srd_of(r); d = []
        if g.get('lv') != r['level']: d.append(f"레벨 {g.get('lv')} ≠ {r['level']}")
        if bool(g.get('conc')) != s['conc']: d.append(f"집중 {g.get('conc')} ≠ {s['conc']}")
        if (g.get('save') or None) != s['save']: d.append(f"내성 {g.get('save')} ≠ {s['save']}")
        if bool(g.get('atk')) != s['atk']: d.append(f"명중 굴림 {bool(g.get('atk'))} ≠ {s['atk']}")
        if bool(g.get('half')) != s['half']: d.append(f"절반 {bool(g.get('half'))} ≠ {s['half']}")
        gd = g.get('dice'); sd = s['dice']
        if (gd and sd and gd[:2] != sd[:2]) or (bool(gd and gd[0]) != bool(sd)): d.append(f"피해 {gd} ≠ {sd}")
        if s['dt'] and g.get('dt') != s['dt']: d.append(f"피해 종류 {g.get('dt')} ≠ {s['dt']}")
        # 범위는 이제 G.SRD_SP[id].srd.area(원문 모양 · 크기)를 js/spells.js가 직접 쓴다. 옛 칸(area)과 다르면 알리기만 한다
        # 게임 상태가 원문에 없으면 원문의 상태로 (옛 변환은 행동 불능 · 매혹 · 의식 없음을 마비로 뭉뚱그렸다)
        PRI = ['paralyzed', 'petrified', 'unconscious', 'stunned', 'incapacitated', 'restrained', 'charmed', 'frightened', 'blinded', 'poisoned', 'prone', 'grappled', 'deafened', 'invisible']
        # 원문 낱말과 상태가 다른 것: 역장 우리 · 역장의 벽의 'invisible'은 보이지 않는 벽(갇힘 → 속박), 안개 구름은 짙게 가려짐(용어집: 실명), 공중 부양은 이동만 막힌다(속박)
        OVR = {'Forcecage': 'restrained', 'Wall of Force': 'restrained', 'Fog Cloud': 'blinded', 'Levitate': 'restrained'}
        if r['name'] in OVR:
            if g.get('cond') != OVR[r['name']]: d.append(f"고침: 상태 {g.get('cond')} → {OVR[r['name']]} (원문 해석)"); g['cond'] = OVR[r['name']]
        elif g.get('cond') and g['cond'] in PRI and g['cond'] not in s['conds']:
            new = next((c for c in PRI if c in s['conds']), 'incapacitated'); d.append(f"고침: 상태 {g['cond']} → {new}"); g['cond'] = new
        # 원문과 다른 게임 칸을 원문대로 (근거는 원문 문장)
        FIX = {
            'Protection from Evil and Good': dict(conc=True),  # Duration: Concentration, up to 10 minutes
            'Heat Metal': dict(half=False),  # 피해에는 내성이 없다 (건강 내성은 떨어뜨리기)
            'Conjure Animals': dict(half=False),  # 민첩 내성 실패면 3d10, 성공 절반은 없다
            'Simulacrum': dict(half=False),
            'Flame Strike': dict(dice=[5, 6, 0], dt='fire', dual=[5, 6, 'radiant']),  # 5d6 화염 + 5d6 광휘 (한 번의 내성)
            'Prismatic Spray': dict(k='custom'), 'Prismatic Wall': dict(k='custom'), 'Storm of Vengeance': dict(k='custom'),
            'Divine Word': dict(k='custom'), 'Confusion': dict(k='custom'), 'Befuddlement': dict(k='custom'),
            'Giant Insect': dict(k='custom'), 'Summon Dragon': dict(k='custom'), 'Animate Objects': dict(k='custom'), 'Conjure Elemental': dict(k='custom'), 'Conjure Fey': dict(k='custom'), 'Conjure Minor Elementals': dict(k='custom'), 'Conjure Woodland Beings': dict(k='custom'), 'Conjure Celestial': dict(k='custom'), 'Animate Dead': dict(k='custom'), 'Fly': dict(k='custom'),
        }
        for kk, vv in FIX.get(r['name'], {}).items():
            if g.get(kk) != vv: d.append(f"고침: {kk} {g.get(kk)} → {vv}"); g[kk] = vv
        gc = set([g['cond']] if g.get('cond') else []) | set(g.get('conds') or [])
        for c in gc:
            if c not in s['conds'] and c not in ('sapped', 'outlined', 'push', 'slow'): d.append(f"상태 {c}는 원문에 없음 (원문: {', '.join(s['conds']) or '없음'})")
        if d: check[r['name']] = d
    open(JS, 'w', encoding='utf-8').write(head + 'G.SRD_SP = ' + json.dumps(SP, ensure_ascii=False) + ';' + tail)
    json.dump(check, open(CHECK, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('주문', len(R), '원문 칸 붙임', sum(1 for v in SP.values() if 'srd' in v), '원문과 다른 주문', len(check))
if __name__ == '__main__': main()
