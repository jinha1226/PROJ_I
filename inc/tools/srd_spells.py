# SRD 5.2.1 주문 339개 → js/srd_spells.js. 입력: dnd5eapi.co /api/2024/spells JSON 폴더 (CC-BY-4.0)
# 수치는 원문에서 읽고, 원문만으로 정할 수 없는 게임 효과는 tools/srd_spell_rules.json에 적는다
import json, glob, os, re, sys
AB = dict(strength='str', dexterity='dex', constitution='con', intelligence='int', wisdom='wis', charisma='cha')
COND = ['Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious']
def dice(s):
    m = re.match(r'(\d+)d(\d+)(?:\s*\+\s*(\d+))?', str(s).replace(' ', ''))
    return [int(m.group(1)), int(m.group(2)), int(m.group(3) or 0)] if m else None
def cells(ft): return max(1, round(ft / 5))
def rng(s):
    s = s.lower()
    if s.startswith('self'): return 0
    if s.startswith('touch'): return 1.5
    m = re.match(r'(\d+) (feet|foot|mile)', s)
    if not m: return 8
    ft = int(m.group(1)) * (5280 if m.group(2) == 'mile' else 1)
    return 8 if ft >= 90 else 6 if ft >= 60 else 5 if ft >= 30 else 3 if ft >= 15 else 1.5
def parse(s):
    d = s['description']; o = dict(en=s['name'], lv=s['level'], sch=s['school']['index'] if isinstance(s['school'], dict) else s['school'], conc=bool(s['concentration']), rng=rng(s['range']), cls=[c['index'] for c in s['classes']], dur=s['duration'])
    ct = s['casting_time'].lower(); o['ct'] = 'b' if ct.startswith('bonus') else 'r' if ct.startswith('reaction') else 'a' if ct.startswith('action') else 'long'
    dm = s.get('damage') or {}
    if dm:
        tb = dm.get('damage_at_slot_level') or dm.get('damage_at_character_level') or {}
        o['cantripDice'] = bool(dm.get('damage_at_character_level'))
        ks = sorted(tb, key=int)
        if ks:
            first = dice(tb[ks[0]]); o['dice'] = first
            if len(ks) > 1 and not o['cantripDice']:
                nx = dice(tb[ks[1]])
                if nx and first and nx[1] == first[1]: o['up'] = nx[0] - first[0]
        if isinstance(dm.get('damage_type'), dict): o['dt'] = dm['damage_type']['index']
    m = re.search(r'(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw', d, re.I)
    if m: o['save'] = AB[m.group(1).lower()]
    if re.search(r'half as much|half damage|half the damage', d, re.I): o['half'] = True
    if s.get('attack_type') or re.search(r'spell attack', d, re.I): o['atk'] = True
    m = re.search(r'(\d+)-foot[- ](?:-?radius|Radius|Cube|Cone|Line|Emanation|Sphere|long)', d)
    if m: o['area'] = min(8, cells(int(m.group(1))))
    c = [x.lower() for x in COND if re.search(r'\b' + x + r'\b', d)]
    if c: o['conds'] = c
    m = re.search(r'regains? (?:a number of )?Hit Points equal to (\d+)d(\d+)', d)
    if m: o['heal'] = [int(m.group(1)), int(m.group(2))]
    return o
def main(src, rules, out, ko):
    R = json.load(open(rules, encoding='utf8')); K = json.load(open(ko, encoding='utf8')); res = {}
    for f in sorted(glob.glob(os.path.join(src, '*.json'))):
        s = json.load(open(f)); o = parse(s); o['ko'] = K.get(s['index'], s['name'])
        o.update(R.get(s['index'], {})); res[s['index']] = o
    open(out, 'w', encoding='utf8').write("'use strict';\n// SRD 5.2.1 주문 (CC-BY-4.0, Wizards of the Coast LLC). 만드는 곳: tools/srd_spells.py. 손으로 고치지 않는다\nG.SRD_SP = " + json.dumps(res, ensure_ascii=False, separators=(',', ':')) + ";\n")
    return res
if __name__ == '__main__':
    r = main(*sys.argv[1:5]); print(len(r))
