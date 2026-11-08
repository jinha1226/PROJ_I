# 주문의 높은 슬롯 규칙 → js/srd_upcast.js. 입력: data/srd521/clean.json의 higher_level과 설명의 「Using a Higher-Level Spell Slot」
# { 주문 id: d 주사위 · n 대상 · flat 고정값 · thp 임시 체력 · area 반경(칸) · dot 지속 주사위 · splash 튀는 주사위 · steps [슬롯, 값] }
# 전투 시간이 짧아 지속 시간만 늘어나는 주문, 전투 밖 주문은 넣지 않는다 (DESIGN.md 125)
import json, re, sys
d = json.load(open('data/srd521/clean.json', encoding='utf-8'))['Spells']
# 원문을 그대로 숫자로 못 읽는 것: 게임 데이터의 주사위가 원문 표의 한 줄인 주문
MAN = {
  'animate-objects': dict(d=[1, 4]),  # 게임 데이터는 중간 크기 Slam 1d6 + 3
  'acid-arrow': dict(d=[1, 4], dot=[1, 4]),
  'ice-knife': dict(splash=[1, 6]),
  'flame-strike': dict(d=[2, 6]),  # 화염 · 광휘가 각각 1d6. 게임 주사위는 둘을 합친 10d6
  'arcane-hand': dict(d=[2, 8]),
  'wall-of-ice': dict(d=[2, 6]),
  'aid': dict(thp=5), 'false-life': dict(thp=5), 'heal': dict(flat=10),
  'confusion': dict(area=1), 'fog-cloud': dict(area=4),
  'giant-insect': dict(flat=1), 'summon-dragon': dict(flat=1),  # 능력치표의 「주문 레벨」
  'magic-weapon': dict(steps=[[3, 2], [6, 3]]),
}
out, skip = {}, []
for s in d:
    if not s['level']: continue
    t = ' '.join(s['higher_level']) if isinstance(s.get('higher_level'), list) else (s.get('higher_level') or '')
    if not t:
        m = re.search(r'Using a Higher-Level Spell Slot\.?\s*(.*)', s.get('description') or '', re.S)
        t = m.group(1) if m else ''
    if not t: continue
    i = s['index']
    if i in MAN: out[i] = MAN[i]; continue
    m = re.search(r'increases? by (\d+)d(\d+)', t)
    if m: out[i] = dict(d=[int(m.group(1)), int(m.group(2))]); continue
    if re.search(r'(target|affect) one additional', t): out[i] = dict(n=1); continue
    skip.append(i)
body = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
open('js/srd_upcast.js', 'w', encoding='utf-8').write("'use strict';\n// tools/srd_upcast.py가 만든다. 손으로 고치지 않는다. 슬롯 한 레벨 위마다 늘어나는 양 (SRD 5.2.1)\nG.SRD_UP = " + body + ";\n")
print(len(out), 'entries; skipped', skip)
