#!/usr/bin/env python3
"""SRD 5.2.1 PDF → 글 구조 전체 (data/srd521/manual.json). 글꼴로 제목 · 표 · 본문을 나눈다.
실행: PYTHONPATH=<pymupdf 경로> python3 tools/srd_parse.py   (DESIGN.md 109)"""
import json, re, sys, collections
import pymupdf
PDF = 'data/srd521/SRD_CC_v5.2.1.pdf'; OUT = 'data/srd521/manual.json'
HEAD = {('GillSans-SemiBold', 26.0): 1, ('GillSans-SemiBold', 18.0): 2, ('GillSans-SemiBold', 14.8): 6, ('GillSans-SemiBold', 14.0): 3, ('GillSans-SemiBold', 12.0): 4, ('GillSans-SemiBold', 10.5): 5, ('GillSans-SemiBold-SC700', 12.0): 4}
TBL_HEADS = (('GillSans-SemiBold', 9.2), ('GillSans-SemiBold', 9.5))
def fs(s): return (s['font'], round(s['size'], 1))
def lines_of(page):
    out = []
    for b in page.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            sp = [s for s in l['spans'] if s['text'].strip()]
            if not sp: continue
            x0, _, x1, _ = l['bbox']; y0 = y1 = sp[0]['origin'][1]; f = fs(sp[0])  # 글자 높이가 들쭉날쭉해 기준선으로 잰다
            if f[1] == 11.0 and f[0].startswith('GillSans') and (y0 > 730 or y0 < 45): continue  # 꼬리글 · 쪽 번호
            txt = ''.join(s['text'] for s in l['spans'])
            out.append(dict(x0=x0, y0=y0, x1=x1, y1=y1, f=f, spans=sp, t=txt.rstrip(), hdr=all(fs(q) in TBL_HEADS for q in sp)))
    words = page.get_text('words')
    for l in out:
        if l['f'][0].startswith('GillSans'): l['words'] = [w for w in words if abs((w[1] + w[3]) / 2 - (l['y0'] - 3)) < 5.5 and w[0] >= l['x0'] - 1.5 and w[2] <= l['x1'] + 1.5]
    return out
def order(ls, width):
    mid = width / 2
    # 두 단에 걸친 표: 같은 기준선에 왼쪽 · 오른쪽 표 글자가 있고, 오른쪽 위에 따로 표 제목이 없으면 한 표
    wide = set(); tl = [l for l in ls if is_table(l)]; ly = {round(l['y0'] / 3) for l in tl if l['x0'] < mid}; ry = {round(l['y0'] / 3) for l in tl if l['x0'] >= mid}; both = sorted(ly & ry); grp = []
    for y in both + [None]:
        if grp and (y is None or y - grp[-1] > 14):
            top = grp[0] * 3
            own = any(l['f'] == ('GillSans-SemiBold', 10.5) and l['x0'] >= mid and top - 60 <= l['y0'] <= grp[-1] * 3 for l in ls)  # 오른쪽에 따로 표 제목
            hl = any(l['hdr'] and l['x0'] < mid and top - 48 <= l['y0'] <= grp[-1] * 3 for l in tl); hr = any(l['hdr'] and l['x0'] >= mid and top - 48 <= l['y0'] <= grp[-1] * 3 for l in tl)
            if not own and hl and hr and len(grp) >= 2: wide |= set(grp)
            grp = []
        if y is not None: grp.append(y)
    if wide:  # 머리 줄까지 포함 (오른쪽 칸 머리글이 먼저 나온다)
        lo = min(wide) - 16; hi = max(wide)
        wide = {y for y in ly | ry if lo <= y <= hi}
    for l in ls: l['_w'] = is_table(l) and round(l['y0'] / 3) in wide
    if wide:  # 표 제목은 표 바로 앞에
        top = min(wide) * 3
        for l in ls:
            if l['f'] == ('GillSans-SemiBold', 10.5) and top - 45 <= l['y0'] <= top + 6: l['_w'] = True
    full = sorted([l for l in ls if l['x1'] - l['x0'] > width * .55 or l['_w']], key=lambda l: (round(l['y0']), l['x0'])); rest = [l for l in ls if l not in full]
    res = []; prev = -1
    for b in full + [None]:
        y = b['y0'] if b else 1e9
        seg = [l for l in rest if prev <= l['y0'] < y]
        res += sorted([l for l in seg if l['x0'] < mid], key=lambda l: (round(l['y0']), l['x0'])) + sorted([l for l in seg if l['x0'] >= mid], key=lambda l: (round(l['y0']), l['x0']))
        if b: res.append(b); prev = b['y0']
    return res
def styled(l):
    o = ''
    for s in l['spans']:
        t = s['text']
        if not t.strip(): o += t; continue
        if 'Bold' in s['font'] or 'SemiBold' in s['font']: o += '**' + t.strip() + '** ' if t.endswith(' ') else '**' + t.strip() + '**'
        elif 'Italic' in s['font']: o += '_' + t.strip() + '_' + (' ' if t.endswith(' ') else '')
        else: o += t
    return o.replace('****', '').replace('\t', ' ').rstrip()
def is_table(l): return l['f'][0].startswith('GillSans') and l['f'] not in HEAD and not l['f'][0].startswith('GillSans-SemiBold-SC') and l['f'][1] > 6.5 and l['f'][1] != 12.0
def cells_of(l):
    """한 줄의 단어를 간격으로 묶어 칸으로 (탭으로 이어진 span도 나눈다)"""
    ws = sorted(l.get('words') or [], key=lambda w: w[0]); out = []
    for w in ws:
        if out and w[0] - out[-1][1] < 7: out[-1][2] += ' ' + w[4]; out[-1][1] = w[2]
        else: out.append([w[0], w[2], w[4]])
    return out or [[l['x0'], l['x1'], l['t'].strip()]]
def build_table(rows, prev=None):
    """표: 줄은 기준선, 칸은 머리글 위치 (왼쪽 · 가운데 · 오른쪽 정렬 모두)"""
    hrows = sorted([r for r in rows if r['hdr']], key=lambda r: -r['y0'])  # 아래 머리 줄이 칸을 정한다
    head = []
    if hrows:
        by0 = collections.defaultdict(list)
        for r in hrows: by0[round(r['y0'] / 3)].append(r)
        low = max(by0)
        for k in sorted(by0, reverse=True):
            cs = [c for r in by0[k] for c in cells_of(r)]
            if k == low: head += cs; continue
            for c in cs:
                n = sum(1 for h in head if c[0] < h[1] + 2 and c[1] > h[0] - 2)
                if n <= 1: head.append(c)
    # 줄: 기준선이 2.5 안이면 같은 줄 (반올림 칸에 걸려 한 줄이 갈라지지 않게)
    by = collections.defaultdict(list); lastY = None; key = 0
    for r in sorted(rows, key=lambda r: r['y0']):
        if lastY is None or r['y0'] - lastY > 2.5: key += 1
        lastY = r['y0']; by[key].append(r)
    ys = sorted(by)
    cols = []  # [x0, x1]
    for c in sorted(head, key=lambda c: c[0]):
        hit = next((q for q in cols if c[0] < q[1] + 4 and c[1] > q[0] - 4), None)
        if hit: hit[0] = min(hit[0], c[0]); hit[1] = max(hit[1], c[1])
        else: cols.append([c[0], c[1]])
    if not cols: cols = [list(q) for q in prev] if prev else [[c[0], c[1]] for c in sorted((c for r in rows for c in cells_of(r)), key=lambda c: c[0])]
    def col(c):
        return min(range(len(cols)), key=lambda i: min(abs(c[0] - cols[i][0]), abs((c[0] + c[1]) / 2 - (cols[i][0] + cols[i][1]) / 2), abs(c[1] - cols[i][1])))
    hdr = [''] * len(cols); data = []
    for y in ys:
        ln = by[y]; isH = all(q['hdr'] for q in ln)
        if isH:
            for q in ln:
                for c in cells_of(q):
                    if sum(1 for h in cols if c[0] < h[1] + 2 and c[1] > h[0] - 2) > 1: continue  # 여러 칸에 걸친 윗머리
                    i = col(c); hdr[i] = (hdr[i] + ' ' + c[2]).strip()
            continue
        cells = [''] * len(cols)
        for q in sorted(ln, key=lambda z: z['x0']):
            for c in cells_of(q): i = col(c); cells[i] = (cells[i] + ' ' + c[2]).strip()
        if data and not cells[0] and len(cols) > 1 and len(set(hdr)) == len(hdr) and sum(1 for z in cells if z) <= max(1, len(cols) // 2):
            data[-1] = [(a + ' ' + b).strip() for a, b in zip(data[-1], cells)]
        else: data.append(cells)
    fix = lambda t: re.sub(r'(?<=[a-z])- (?=[a-z])', '', t)
    return [fix(h) for h in hdr], [[fix(c) for c in r] for r in data], cols
def main():
    d = pymupdf.open(PDF); nodes = []; stack = [None] * 8; total_in = 0
    def new(level, title, page):
        n = dict(id=len(nodes), level=level, title=title, page=page, end=page, parent=None, text=[], tables=[]); 
        for lv in range(level - 1, 0, -1):
            if stack[lv] is not None: n['parent'] = stack[lv]; break
        stack[level] = n['id']
        for lv in range(level + 1, 8): stack[lv] = None
        nodes.append(n); return n
    cur = new(1, 'Front Matter', 1); para = None; last = None; tbl = []; tbl_page = 0
    def flush_table():
        nonlocal tbl
        if not tbl: return
        has = any(q['hdr'] for q in tbl); prevT = cur['tables'][-1] if cur['tables'] else None
        xs = {round(q['x0']) for q in tbl}
        if has or (prevT and prevT.get('colx') and len(xs) >= 2):
            hdr, data, colx = build_table(tbl, prevT.get('colx') if prevT else None)
            if not has and prevT: prevT['rows'] += data
            elif data: cur['tables'].append(dict(page=tbl_page, title=cur['title'] if cur['level'] == 5 else '', columns=hdr, rows=data, colx=colx))
            else: cur['text'].insert(0, ' '.join(h for h in hdr if h))  # 표가 아닌 머리 줄 (시전 시간 · 도구 정보)
        else:
            run = None; lastq = None
            for q in tbl:
                if run is None or q['y0'] - lastq['y1'] > 13.5 or lastq.get('pn') != q.get('pn'): 
                    if run: cur['text'].append(run)
                    run = q['t']
                else: run = run[:-1] + q['t'] if run.endswith('-') and q['t'][:1].islower() else run + ' ' + q['t']
                lastq = q
            if run: cur['text'].append(run)
        tbl = []
    def end_para():
        nonlocal para
        if para is not None: cur['text'].append(para); para = None
    for i in range(d.page_count):
        page = d[i]; pn = i + 1; ls = order(lines_of(page), page.rect.width); total_in += sum(len(l['t']) for l in ls)
        for l in ls:
            if l['f'] in HEAD:
                flush_table(); end_para(); lv = HEAD[l['f']]
                if last and last['f'] == l['f'] and last.get('pn') == pn and abs(l['y0'] - last['y1']) < l['f'][1] * 1.7 and cur['level'] == lv and not cur['text'] and not cur['tables']:
                    cur['title'] += ' ' + l['t']
                else: cur = new(lv, l['t'], pn)
                l['pn'] = pn; last = l; cur['end'] = pn; continue
            if is_table(l):
                end_para()
                if not tbl: tbl_page = pn
                tbl.append(l); l['pn'] = pn; last = l; cur['end'] = pn; continue
            flush_table(); s = styled(l); cur['end'] = pn
            newp = para is None or not last or last.get('pn') != pn or abs(l['y0'] - last['y1']) > 13.5 or l['x0'] - last['x0'] > 6 or l['spans'][0]['font'].endswith('BoldItalic') or re.match(r'^[•\d]+[.:]?\s', s)
            if newp: end_para(); para = s
            else: para = para[:-1] + s if para.endswith('-') and s[:1].islower() else para + ' ' + s
            l['pn'] = pn; last = l
    flush_table(); end_para()
    for n in nodes: n['text'] = '\n'.join(n['text']).replace('MODSAVE', 'MOD SAVE')
    toc = d.get_toc(); titles = {re.sub(r'\W', '', n['title']).lower() for n in nodes}; miss = [t for t in toc if re.sub(r'\W', '', t[1]).lower() not in titles]
    for n in nodes:
        for t in n['tables']: t.pop('colx', None)
    out_chars = sum(len(n['title']) + len(n['text']) + sum(len(json.dumps(t['rows'], ensure_ascii=False)) for t in n['tables']) for n in nodes)
    for n in nodes:
        for t in n['tables']: t.pop('colx', None)
    json.dump(dict(nodes=nodes, toc=toc, pages=[d[i].get_text() for i in range(d.page_count)]), open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
    print('nodes', len(nodes), collections.Counter(n['level'] for n in nodes), 'tables', sum(len(n['tables']) for n in nodes)); print('입력 글자', total_in, '출력 글자', out_chars); print('목차', len(toc), '못 찾음', len(miss), [m[1] for m in miss][:15])
main()
