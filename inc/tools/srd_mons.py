# SRD 5.2.1 몬스터 능력치 → js/srd_mons.js. 입력: dnd5eapi.co /api/2024/monsters의 JSON 폴더 (SRD 5.2.1 CC-BY-4.0)
import json, sys, glob, re, os
out = {}
for fn in sorted(glob.glob(os.path.join(sys.argv[1], '*.json'))):
    try: d = json.load(open(fn))
    except ValueError: continue
    if 'index' not in d: continue
    mod = lambda k: (d[k] - 10) // 2
    AB = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']; SH = ['str', 'dex', 'con', 'int', 'wis', 'cha']
    sv = {s: mod(a) for s, a in zip(SH, AB)}
    for p in d.get('proficiencies', []):
        m = re.match(r'saving-throw-(\w+)', p['proficiency']['index'])
        if m: sv[m.group(1)] = p['value']
    atk = {}
    for a in d.get('actions', []):
        if a.get('attack_bonus') is None or not a.get('damage') or 'damage_dice' not in a['damage'][0]: continue
        m = re.match(r'(\d+)d(\d+)(?:\+(\d+))?', a['damage'][0]['damage_dice'].replace(' ', ''))
        if not m: continue
        desc = a.get('desc', '')
        # 둘째 피해 주사위: 늘 붙는 것(ex)과 공격에 이점이 있을 때만 붙는 것(advEx). 미믹처럼 조건부 대체 피해가 끼면 마지막 것이 추가 피해다
        dd = [x for x in a['damage'] if 'damage_dice' in x]
        ex = None
        if len(dd) > 1:
            q = re.match(r'(\d+)d(\d+)$', dd[-1]['damage_dice'].replace(' ', ''))
            if q: ex = dict(n=int(q.group(1)), d=int(q.group(2)), t=dd[-1]['damage_type']['index'])
        atk[a['name']] = dict(name=a['name'], hit=a['attack_bonus'], n=int(m.group(1)), d=int(m.group(2)), b=int(m.group(3) or 0), t=a['damage'][0]['damage_type']['index'], melee=desc.startswith('Melee'), ranged='Ranged' in desc[:30])
        if ex:
            if re.search(r'if the attack roll had Advantage', desc): atk[a['name']]['advEx'] = ex
            elif re.search(r'takes an extra', desc): atk[a['name']]['condEx'] = ex
            else: atk[a['name']]['ex'] = ex
    strip = lambda x: {k: v for k, v in x.items() if k not in ('melee', 'ranged')}
    multi = next((a for a in d.get('actions', []) if a['name'] == 'Multiattack'), None); seq = []; far_n = 1
    WORD = dict(one=1, two=2, three=3, four=4, five=5)
    if multi:
        txt = multi['desc']
        for c, nm in re.findall(r'\b(one|two|three|four|five) ([A-Z][\w\'-]*(?: [A-Z][\w\'-]*)*) attacks?', txt):
            if nm in atk: seq += [atk[nm]] * WORD[c]
        q = re.search(r'makes (one|two|three|four|five) attacks, using ', txt)
        if q:  # "두 번, 아무 조합으로": 근접은 근접 공격으로, 원거리 역할은 원거리 공격으로
            far_n = WORD[q.group(1)]
            first = next((v for v in atk.values() if v['melee']), None)
            if first: seq = [first] * far_n
        if any(v['ranged'] for v in seq): far_n = sum(1 for v in seq if v['ranged'])
    melee = [v for v in atk.values() if v['melee']]
    if not seq and melee: seq = [melee[0]]
    far = next((v for v in atk.values() if v['ranged']), None)
    ft = max([int(re.match(r'\d+', str(v)).group()) for k, v in d['speed'].items() if k in ('walk', 'fly') and re.match(r'\d', str(v))] or [30])
    prof = d.get('proficiency_bonus', 2)
    out[d['index']] = dict(n=d['name'], cr=d['challenge_rating'], ac=d['armor_class'][0]['value'], hp=d['hit_points'], mv=round(ft / 5), dex=mod('dexterity'), save=sv, id=d['index'], swim='swim' in d['speed'], farN=far_n, magicRes=any(t['name'] == 'Magic Resistance' for t in d.get('special_abilities', [])), legRes=next((int(re.search(r'(\d)/Day', t.get('usage', {}).get('times', '') and f"{t['usage']['times']}/Day" or t['name']).group(1)) for t in d.get('special_abilities', []) if 'Legendary Resistance' in t['name'] and re.search(r'(\d)/Day', t.get('usage', {}).get('times', '') and f"{t['usage']['times']}/Day" or t['name'])), 3 if any('Legendary Resistance' in t['name'] for t in d.get('special_abilities', [])) else 0), absorb=next((re.match(r'(\w+) Absorption', t['name']).group(1).lower() for t in d.get('special_abilities', []) if re.match(r'(\w+) Absorption', t['name'])), None), melee=[strip(x) for x in seq], alt=[strip(x) for x in melee if x not in seq], far=strip(far) if far else None, res=[x for x in d.get('damage_resistances', []) if ',' not in x], imm=[x for x in d.get('damage_immunities', []) if ',' not in x], vul=d.get('damage_vulnerabilities', []), dc=8 + prof + max(mod('intelligence'), mod('wisdom'), mod('charisma')))
open(sys.argv[2], 'w', encoding='utf8').write("'use strict';\n// SRD 5.2.1 몬스터 능력치 (CC-BY-4.0, Wizards of the Coast LLC). 만드는 곳: tools/srd_mons.py. 손으로 고치지 않는다\nG.D = G.D || {};\nG.SRD_MON = " + json.dumps(out, ensure_ascii=False) + ";\n")
print(len(out))
