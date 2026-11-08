#!/usr/bin/env python3
"""SRD 5.2.1 몬스터 330종 → js/srd_mons.js. 입력은 data/srd521/db/monster.json의 능력치표 원문(text) — PDF가 기준 (DESIGN.md 156).
옛 생성기(tools/srd_mons.py)는 외부 API JSON 64종만 썼고 내성 DC를 짐작했다. 이것은 원문의 모든 칸 · 행동을 그대로 읽는다.
실행: python3 tools/srd_mons_db.py   (손으로 js/srd_mons.js를 고치지 않는다)"""
import json, re, sys
SRC = 'data/srd521/db/monster.json'; OUT = sys.argv[1] if len(sys.argv) > 1 else 'js/srd_mons.js'
AB = ['str', 'dex', 'con', 'int', 'wis', 'cha']; ABN = dict(Strength='str', Dexterity='dex', Constitution='con', Intelligence='int', Wisdom='wis', Charisma='cha')
DT = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder']
CONDS = ['blinded', 'charmed', 'deafened', 'exhaustion', 'frightened', 'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious']
WORD = dict(one=1, two=2, three=3, four=4, five=5, six=6, seven=7, eight=8, nine=9, ten=10)
FIELDS = ['Skills', 'Vulnerabilities', 'Resistances', 'Immunities', 'Gear', 'Senses', 'Languages', 'CR']
SECS = ['Traits', 'Actions', 'Bonus Actions', 'Reactions', 'Legendary Actions']
num = lambda s: int(re.sub(r'[^\d-]', '', s)) if s and re.search(r'\d', s) else 0
def cr_of(s):
    s = s.strip()
    return {'1/8': 0.125, '1/4': 0.25, '1/2': 0.5}.get(s, None) if '/' in s else float(s) if '.' in s else int(s)
def dmg_list(s):
    """'10 (1d10 + 5) Piercing damage plus 3 (1d6) Poison damage' → [{n,d,b,t,avg}] · 고정 피해 '1 Piercing damage'도"""
    out = []
    for m in re.finditer(r'(\d+)\s*\((\d+)d(\d+)\s*(?:([+−–-])\s*(\d+))?\)\s*([A-Z][a-z]+)\s+damage|(?<![\d(])(\d+)\s+([A-Z][a-z]+)\s+damage', s):
        if m.group(2):
            b = int(m.group(5) or 0) * (-1 if m.group(4) in ('−', '–', '-') else 1)
            t = m.group(6).lower(); out.append(dict(n=int(m.group(2)), d=int(m.group(3)), b=b, t=t if t in DT else t, avg=int(m.group(1))))
        else:
            t = m.group(8).lower(); out.append(dict(n=0, d=0, b=int(m.group(7)), t=t, avg=int(m.group(7))))
    if not out:  # 「28 (8d6) damage of the type chosen for …」: 종류는 몬스터 특성이 정한다
        m = re.search(r'(\d+)\s*\((\d+)d(\d+)\s*(?:([+−–-])\s*(\d+))?\)\s*damage of the type', s)
        if m: out.append(dict(n=int(m.group(2)), d=int(m.group(3)), b=int(m.group(5) or 0), t='chosen', avg=int(m.group(1))))
    return out
ENTRY = re.compile(r'^([A-Z][A-Za-z’\'\-]+(?:[ ,][A-Za-z’\'\-/]+){0,7}(?: \([^)]*\))?)\.\s*(?=[A-Z])')  # 원문에 「Bite.Melee」처럼 빈칸이 없는 줄도 있다
def unhy(es):
    for e in es: e['text'] = re.sub(r'([a-z])- ([a-z])', r'\1\2', e['text'])
    return es
def entries(lines):
    """한 절의 줄 → [{name, text}] (줄바꿈으로 끊긴 문장은 앞 항목에 붙인다)"""
    out = []
    for ln in lines:
        ln = ln.strip()
        if not ln: continue
        m = ENTRY.match(ln)
        prev_done = not out or re.search(r'[.:)”]\s*$', out[-1]['text'])
        if m and prev_done and not ln.startswith(('Hit:', 'Failure:', 'Success:', 'Failure or Success:', 'First Failure', 'Second Failure', 'Trigger:', 'Response:')):
            out.append(dict(name=m.group(1), text=ln[m.end():].strip()))
        elif out: out[-1]['text'] = (out[-1]['text'][:-1] + ln) if out[-1]['text'].endswith('-') and ln[:1].islower() else out[-1]['text'] + ' ' + ln
        else: out.append(dict(name='', text=ln))
    return out
def action(e):
    """행동 하나: 명중 · 내성 · 연속 공격 · 그 밖. 원문(text)은 늘 함께"""
    t = e['text'] = re.sub(r'([a-z])- ([a-z])', r'\1\2', e['text']); name = re.sub(r'\s*\(.*\)$', '', e['name']); a = dict(name=name, text=t)
    q = re.search(r'\((Recharge (\d)(?:[–-](\d))?|(\d+)/Day(?: Each)?|Costs (\d) Actions)\)', e['name'])
    if q:
        if q.group(2): a['recharge'] = int(q.group(2))
        if q.group(4): a['perDay'] = int(q.group(4))
        if q.group(5): a['cost'] = int(q.group(5))
    m = re.match(r'(Melee or Ranged|Melee|Ranged)\s*Attack Roll:\s*([+−–-]\s*\d+)', t)
    if m:
        a['kind'] = 'atk'; a['melee'] = 'Melee' in m.group(1); a['ranged'] = 'Ranged' in m.group(1); a['hit'] = num(m.group(2).replace('−', '-').replace('–', '-'))
        r = re.search(r'reach (\d+) ft', t); a['reach'] = int(r.group(1)) if r else None
        r = re.search(r'range (\d+)(?:/(\d+))? ft', t); a['range'] = [int(r.group(1)), int(r.group(2) or r.group(1))] if r else None
        hit = re.search(r'Hit:(.*?)(?:$|(?<=\.)\s+(?=[A-Z][a-z]+ [A-Z]))', t); hs = t[t.find('Hit:') + 4:] if 'Hit:' in t else ''
        hs0 = re.sub(r'—or [^—]*—', ' ', hs)  # 「—or 12 (2d8 + 3) … if the target is Grappled—」: 조건부 대체 피해는 따로 (G.Foe.extra)
        a['dmg'] = dmg_list(hs0.split('. If ')[0].split('. The target')[0].split('. Until')[0]) if hs else []
        ce = re.search(r'takes an extra (\d+) \((\d+)d(\d+)\) ([A-Z][a-z]+) damage', hs); a['condEx'] = dict(n=int(ce.group(2)), d=int(ce.group(3)), t=ce.group(4).lower()) if ce else None  # 돌진 같은 조건부 추가 피해
        alt = re.search(r'—or (\d+) \((\d+)d(\d+)', hs); a['altDmg'] = dict(n=int(alt.group(2)), d=int(alt.group(3))) if alt else None
        a['cond'] = [c for c in CONDS if re.search(r'\b' + c.capitalize() + r'\b', hs.split('Saving Throw')[0])]
        g = re.search(r'escape DC (\d+)', hs); a['grab'] = int(g.group(1)) if g else None
        a['until'] = 'next' if re.search(r"until the (?:start|end) of (?:the \w+['’]s|its) next turn", hs) else None
        pp = re.search(r'(pulls|pushes) the target (?:up to )?(\d+) feet', hs); a['move'] = (1 if pp.group(1) == 'pushes' else -1) * int(pp.group(2)) if pp else 0
        rs = re.search(r'(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw:\s*DC (\d+)\.?\s*Failure:(.*?)(?:Success:|$)', hs)
        a['rider'] = dict(save=ABN[rs.group(1)], dc=int(rs.group(2)), cond=[c for c in CONDS if re.search(r'\b' + c.capitalize() + r'\b', rs.group(3))], dmg=dmg_list(rs.group(3))) if rs else None
        a['noHeal'] = bool(re.search(r"can['’]t regain Hit Points", hs))
        return a
    m = re.match(r'(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw:\s*DC (\d+)', t)
    if m:
        a['kind'] = 'save'; a['save'] = ABN[m.group(1)]; a['dc'] = int(m.group(2))
        ar = re.search(r'(\d+)-foot(?:-radius)? (Cone|Line|Sphere|Cube|Emanation|Cylinder)', t); a['area'] = [ar.group(2).lower(), int(ar.group(1))] if ar else None
        ln = re.search(r'(\d+)-foot-long, (\d+)-foot-?wide Line', t)
        if ln: a['area'] = ['line', int(ln.group(1)), int(ln.group(2))]
        ew = re.search(r'each creature (?:[^.]*?)within (\d+) feet of (?:it|itself|the \w+)', t)
        if not a['area'] and ew: a['area'] = ['emanation', int(ew.group(1))]
        one = re.search(r'(?:one|a) (?:[A-Z]\w+ or (?:smaller|larger) |\w+ )?(?:creature|target)[^.]*?within (\d+) feet', t); sp_ = re.search(r'one [^.]*?creature in the [^.]*?space', t)
        a['one'] = int(one.group(1)) if one and not a['area'] else 5 if sp_ and not a['area'] else 0  # 생물 하나 (곁 · 그 칸)
        fl = re.search(r'Failure:(.*?)(?:Success:|Failure or Success:|First Failure|$)', t); a['dmg'] = dmg_list(fl.group(1)) if fl else []
        a['half'] = bool(re.search(r'Success:\s*Half damage', t))
        a['cond'] = [c for c in CONDS if fl and re.search(r'\b' + c.capitalize() + r'\b', fl.group(1))]
        return a
    if name == 'Multiattack':
        a['kind'] = 'multi'; seq = []
        for c, nm in re.findall(r'\b(one|two|three|four|five|six)\s+([A-Z][\w’\'-]*(?: [A-Z][\w’\'-]*)*) attacks?', t): seq.append([nm, WORD[c]])
        q = re.search(r'makes (one|two|three|four|five|six) attacks?, using (.*?)(?:in any combination|\.|$)', t)
        if q: a['any'] = [WORD[q.group(1)], re.findall(r'([A-Z][\w’\'-]*(?: [A-Z][\w’\'-]*)*)', q.group(2))]
        a['seq'] = seq; return a
    if name == 'Spellcasting':
        a['kind'] = 'spells'; d = re.search(r'spell save DC (\d+)', t); a['dc'] = int(d.group(1)) if d else None
        k = re.search(r'\+(\d+) to hit with spell attacks', t); a['hit'] = int(k.group(1)) if k else None
        lists = {}
        for per, body in re.findall(r'(At Will|\d+/Day(?: Each)?):\s*(.*?)(?=(?:At Will|\d+/Day(?: Each)?):|$)', t): lists[per.replace(' Each', '')] = [s.strip(' .') for s in re.split(r',\s*(?![^()]*\))', body) if s.strip(' .')]
        a['spells'] = lists; return a
    a['kind'] = 'other'; a['dmg'] = dmg_list(t); return a
def parse(r):
    T = r['text']; flat = ' '.join(T.split('\n'))
    o = dict(n=r['name'], id=re.sub(r'[^a-z0-9]+', '-', r['name'].lower()).strip('-'))
    sz = re.match(r'(Tiny|Small|Medium|Large|Huge|Gargantuan)(?: or (\w+))? (.*?), (.*)', r['type'])
    if sz: o.update(size=sz.group(1).lower(), ty=re.sub(r'\s*\(.*\)', '', sz.group(3)).lower().split(' or ')[0].strip(), tags=(re.search(r'\((.*)\)', sz.group(3)).group(1) if '(' in sz.group(3) else ''), align=sz.group(4))
    o['ac'] = int(r['ac']); o['hp'] = int(r['hp']); o['hd'] = r['hit_dice']
    ini = re.search(r'Initiative ([+−-]\d+) \((\d+)\)', flat); o['init'] = num(ini.group(1).replace('−', '-')) if ini else 0
    sp = re.search(r'Speed (.*?)(?:\s+MOD SAVE|\s+Str\b)', flat); spd = sp.group(1) if sp else r['speed']
    o['speed'] = {}
    for k, v in re.findall(r'(?:^|,\s*)(Fly|Swim|Climb|Burrow)?\s*(\d+) ft\.', spd): o['speed'].setdefault((k or 'walk').lower(), int(v))  # 첫 값이 기본 모습 (「40 ft. (bear form only)」는 변신 뒤)
    o['hover'] = '(hover)' in spd.lower()
    o['abil'] = {k: int(r[k]) for k in AB}
    o['save'] = {k: num(str(r['save_' + k]).replace('−', '-')) for k in AB}
    fx = {}
    for i, f in enumerate(FIELDS):
        m = re.search(r'\b' + f + r'\s+(.*?)(?=\s+(?:' + '|'.join(FIELDS[i + 1:] + ['Traits', 'Actions', 'Bonus Actions', 'Reactions', 'Legendary Actions']) + r')\b|$)', flat) if f != 'CR' else re.search(r'\bCR (\S+) \(XP ([\d,]+)(?:, or [\d,]+ in lair)?; PB \+(\d+)\)', flat)
        if m: fx[f] = m
    o['skills'] = {k.lower(): num(v) for k, v in re.findall(r'([A-Z][a-z]+(?: [A-Z][a-z]+)?) ([+−-]\d+)', fx['Skills'].group(1).replace('−', '-'))} if 'Skills' in fx else {}
    lo = lambda f: fx[f].group(1).lower() if f in fx else ''
    o['vul'] = [d for d in DT if d in lo('Vulnerabilities')]; o['res'] = [d for d in DT if d in lo('Resistances')]
    im = lo('Immunities'); o['imm'] = [d for d in DT if re.search(r'\b' + d + r'\b', im)]; o['cimm'] = [c for c in CONDS if re.search(r'\b' + c + r'\b', im)]
    o['gear'] = fx['Gear'].group(1) if 'Gear' in fx else ''
    o['senses'] = {k.lower(): int(v) for k, v in re.findall(r'(blindsight|darkvision|tremorsense|truesight) (\d+) ft', lo('Senses'))}
    pp = re.search(r'passive perception (\d+)', lo('Senses')); o['pp'] = int(pp.group(1)) if pp else 10
    o['lang'] = fx['Languages'].group(1) if 'Languages' in fx else ''
    o['cr'] = cr_of(fx['CR'].group(1)) if 'CR' in fx else cr_of(str(r['cr'])); o['xp'] = int(r['xp']); o['pb'] = int(r['pb'])
    # 절: Traits · Actions · Bonus Actions · Reactions · Legendary Actions (원문 줄 그대로 자른다)
    lines = T.split('\n'); sec = {}; cur = None
    for ln in lines:
        s = ln.strip()
        h = next((h for h in sorted(SECS, key=len, reverse=True) if s == h or (s.startswith(h + ' ') and s[len(h) + 1:][:1].isupper())), None)  # 「Legendary Actions Legendary Action Uses: 3 …」처럼 같은 줄에 이어지기도 한다
        if h: cur = h; sec[cur] = []; rest = s[len(h):].strip(); (sec[cur].append(rest) if rest else None); continue
        if cur: sec[cur].append(ln)
    o['traits'] = unhy(entries(sec.get('Traits', [])))
    o['acts'] = [action(e) for e in entries(sec.get('Actions', []))]
    o['bonus'] = [action(e) for e in entries(sec.get('Bonus Actions', []))]
    o['react'] = [action(e) for e in entries(sec.get('Reactions', []))]
    lg = entries(sec.get('Legendary Actions', [])); o['legend'] = [action(e) for e in lg if e['name']]
    lu = re.search(r'Legendary Action Uses: (\d+)', ' '.join(sec.get('Legendary Actions', []))); o['legN'] = int(lu.group(1)) if lu else 0
    tn = [t['name'] for t in o['traits']]
    lr = next((re.search(r'\((\d+)/Day', n) for n in tn if n.startswith('Legendary Resistance')), None); o['legRes'] = int(lr.group(1)) if lr else 0
    o['magicRes'] = any(n.startswith('Magic Resistance') for n in tn)
    tt = {t['name'].split(' (')[0]: t['text'] for t in o['traits']}
    o['tr'] = [k for n, k in [('Pack Tactics', 'pack'), ('Undead Fortitude', 'fort'), ('Regeneration', 'regen'), ('Flyby', 'flyby'), ('Sunlight Sensitivity', 'sunsens'), ('Spider Climb', 'climb'), ('Amphibious', 'amph'), ('Incorporeal Movement', 'incorp'), ('Siege Monster', 'siege')] if n in tt]
    rg = re.search(r'regains (\d+) Hit Points', tt.get('Regeneration', '')); o['regenN'] = int(rg.group(1)) if rg else 0
    rgs = re.findall(r'takes (\w+)(?: or (\w+))? damage', tt.get('Regeneration', '')); o['regenStop'] = [x.lower() for q in rgs for x in q if x]
    il = re.search(r'Bright Light in a (\d+)-foot radius and Dim Light for an additional (\d+) feet', ' '.join(tt.values())); o['glow'] = [int(il.group(1)), int(il.group(1)) + int(il.group(2))] if il else None
    o['auras'] = []
    for n, t in tt.items():  # 오라: 차례 시작 · 끝에 곁의 생물에게 (불의 오라 · 악취 · 죽음의 폭발은 따로)
        m2 = re.search(r'(\d+)-foot Emanation', t); w = re.search(r'(start|end) of (?:each of )?(?:its|the \w+[’\']s) turns?', t)
        if n in ('Fire Aura', 'Stench', 'Cold Aura', 'Heated Body') or (m2 and w and ('damage' in t or 'Saving Throw' in t) and n not in ('Death Burst',)):
            sv = re.search(r'(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw:\s*DC (\d+)', t)
            o['auras'].append(dict(name=n, ft=int(m2.group(1)) if m2 else 5, when=w.group(1) if w else 'start', save=ABN[sv.group(1)] if sv else None, dc=int(sv.group(2)) if sv else None, dmg=dmg_list(t), cond=[c for c in CONDS if re.search(r'\b' + c.capitalize() + r'\b', t)], text=t))
    db = tt.get('Death Burst') or tt.get('Death Throes')
    if db: sv = re.search(r'(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw:\s*DC (\d+)', db); m2 = re.search(r'(\d+)-foot', db); o['deathBurst'] = dict(save=ABN[sv.group(1)] if sv else 'dex', dc=int(sv.group(2)) if sv else 10, ft=int(m2.group(1)) if m2 else 10, dmg=dmg_list(db), cond=[c for c in CONDS if re.search(r'\b' + c.capitalize() + r'\b', db)], half=bool(re.search(r'Success:\s*Half', db)))
    pr = next((r for r in o['react'] if r['name'] == 'Parry'), None); pv = re.search(r'adds (\d+) to its AC', pr['text']) if pr else None; o['parry'] = int(pv.group(1)) if pv else 0
    ab = next((t for t in o['traits'] if 'Absorption' in t['name']), None); o['absorb'] = next((d for d in DT if ab and d in ab['name'].lower()), None)
    # ── 게임이 읽는 칸 (G.Foe): 연속 공격 순서 · 근접 · 원거리 · 대체 ──
    atk = {a['name']: a for a in o['acts'] if a.get('kind') == 'atk' and a['dmg']}
    def g(a):
        d0 = a['dmg'][0]; q = dict(name=a['name'], hit=a['hit'], n=d0['n'], d=d0['d'], b=d0['b'], t=d0['t'])
        if a.get('condEx'): q['condEx'] = dict(a['condEx'])
        for k in ('cond', 'grab', 'until', 'move', 'rider', 'noHeal'):  # 명중 뒤 효과 (G.MonAct.onHit)
            if a.get(k): q[k] = a[k]
        if len(a['dmg']) > 1:
            x = a['dmg'][1]; k = 'advEx' if re.search(r'if the attack roll had Advantage', a['text']) else 'condEx' if re.search(r'takes an extra', a['text']) else 'ex'
            q[k] = dict(n=x['n'], d=x['d'], t=x['t'])
        return q
    multi = next((a for a in o['acts'] if a.get('kind') == 'multi'), None); seq = []; far_n = 1
    if multi:
        for nm, c in multi['seq']:
            if nm in atk: seq += [g(atk[nm])] * c
        if multi.get('any'):
            n, names = multi['any']; far_n = n
            mel = next((atk[x] for x in names if x in atk and atk[x]['melee']), None) or next((a for a in atk.values() if a['melee']), None)
            if mel and not seq: seq = [g(mel)] * n
        rng = [x for x in seq if atk.get(x['name'], {}).get('ranged')]
        if rng: far_n = len(rng)
    melee = [a for a in atk.values() if a['melee']]
    if not seq and melee: seq = [g(melee[0])]
    o['melee'] = seq or ([g(melee[0])] if melee else [])  # 옛 데이터처럼 연속 공격 순서 전체 (원거리 공격이 끼면 그대로)
    farA = next((a for a in atk.values() if a['ranged']), None); o['far'] = g(farA) if farA else None; o['farN'] = far_n
    o['alt'] = [g(a) for a in atk.values() if a['name'] not in {x['name'] for x in o['melee']}]
    sv = next((a for a in o['acts'] + o['bonus'] if a.get('dc')), None); o['dc'] = sv['dc'] if sv else 8 + o['pb'] + max((o['abil'][k] - 10) // 2 for k in ('int', 'wis', 'cha'))
    o['mv'] = round(max(o['speed'].get('walk', 0), o['speed'].get('fly', 0), 5) / 5); o['dex'] = (o['abil']['dex'] - 10) // 2; o['swim'] = 'swim' in o['speed']
    o['page'] = r['page']
    return o
def main():
    R = json.load(open(SRC, encoding='utf-8')); out = {}
    for r in R:
        o = parse(r); out[o['id']] = o
    open(OUT, 'w', encoding='utf8').write("'use strict';\n// SRD 5.2.1 몬스터 330종 (CC-BY-4.0, Wizards of the Coast LLC). 만드는 곳: tools/srd_mons_db.py (data/srd521/db/monster.json 원문). 손으로 고치지 않는다\nG.D = G.D || {};\nG.SRD_MON = " + json.dumps(out, ensure_ascii=False) + ";\n")
    print(len(out), 'monsters')
if __name__ == '__main__': main()
