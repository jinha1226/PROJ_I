#!/usr/bin/env python3
"""Convert LAYERLAB '2D Minimal - Character Maker' .unitypackage into web data.

Usage: python3 -I tools/import_minimal_chars.py <package.unitypackage> [outdir]

Outputs (default outdir = assets/chars):
  parts/<Category>/<name>.png   sprite parts (copied as-is)
  rig.json    bone/renderer hierarchy of Character.prefab + sprite metadata
  anims.json  16 animation clips as Hermite curves

The asset's license forbids redistributing the raw files: keep assets/chars out
of any public repository.
"""
import json, os, re, shutil, struct, sys, tarfile, tempfile, math
import yaml

PKG_ROOT = 'Assets/Layer Lab/2D Minimal-CharacterMaker/'
PARTS_ROOT = PKG_ROOT + 'Extenstions/Parts Pack Base/'


def load_unity_yaml(text):
    """Return {fileID: (classID, typeName, body)}."""
    docs = {}
    for chunk in re.split(r'^--- ', text, flags=re.M)[1:]:
        header, _, body = chunk.partition('\n')
        m = re.match(r'!u!(\d+) &(-?\d+)', header)
        if not m:
            continue
        data = yaml.safe_load(body) or {}
        (tname, val), = data.items()
        docs[m.group(2)] = (int(m.group(1)), tname, val or {})
    return docs


def quat_to_z(q):
    x, y, z, w = (float(q.get(k, 0)) for k in 'xyzw')
    return math.degrees(math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)))


def png_size(path):
    with open(path, 'rb') as f:
        b = f.read(24)
    return struct.unpack('>II', b[16:24])


def r(v, n=5):
    return round(float(v), n)


def slope(v):
    """Unity writes stepped tangents as Infinity -> None (= hold value)."""
    if isinstance(v, (int, float)) and math.isfinite(v):
        return r(v)
    return None


def main():
    pkg = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else 'assets/chars'
    tmp = tempfile.mkdtemp(prefix='mcm_')
    with tarfile.open(pkg, 'r:gz') as t:
        t.extractall(tmp, filter='data')

    entries = {}  # guid -> dict(path, asset, meta)
    for guid in os.listdir(tmp):
        d = os.path.join(tmp, guid)
        pn = os.path.join(d, 'pathname')
        if not os.path.isfile(pn):
            continue
        path = open(pn, encoding='utf-8').read().splitlines()[0].strip()
        entries[guid] = dict(path=path, asset=os.path.join(d, 'asset'),
                             meta=os.path.join(d, 'asset.meta'))
    by_path = {e['path']: e for e in entries.values()}

    # ---- sprites -------------------------------------------------------
    if os.path.isdir(os.path.join(out, 'parts')):
        shutil.rmtree(os.path.join(out, 'parts'))
    sprites = {}  # guid -> key
    sprite_meta = {}
    catalog = {}
    for guid, e in entries.items():
        p = e['path']
        if not p.endswith('.png') or not os.path.isfile(e['asset']):
            continue
        if p.startswith(PARTS_ROOT) and '/Thumbnail/' not in p:
            rel = p[len(PARTS_ROOT):]
            parts = rel.split('/')
            # Character/Hair/x.png -> Hair ; Parts/HandRight/Sword/x.png -> Sword
            cat = parts[-2]
        elif p.startswith(PKG_ROOT + 'Common/Sprites/Other/'):
            cat = 'Other'
        else:
            continue
        name = os.path.splitext(os.path.basename(p))[0]
        key = f'{cat}/{name}'
        dst = os.path.join(out, 'parts', cat, name + '.png')
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(e['asset'], dst)
        meta = yaml.safe_load(open(e['meta'], encoding='utf-8').read())
        ti = meta.get('TextureImporter', {})
        align = ti.get('alignment', 0)
        if align == 9:  # custom pivot
            piv = ti.get('spritePivot', {'x': 0.5, 'y': 0.5})
        else:
            ax, ay = [(.5, .5), (0, 1), (.5, 1), (1, 1), (0, .5), (1, .5),
                      (0, 0), (.5, 0), (1, 0)][align]
            piv = {'x': ax, 'y': ay}
        w, h = png_size(e['asset'])
        sprite_meta[key] = dict(w=w, h=h, px=r(piv['x'], 4), py=r(piv['y'], 4),
                                ppu=ti.get('spritePixelsToUnits', 100))
        sprites[guid] = key
        catalog.setdefault(cat, []).append(name)
    for v in catalog.values():
        v.sort()

    # ---- prefab rig ----------------------------------------------------
    pre = load_unity_yaml(open(by_path[PKG_ROOT + 'Common/Prefabs/Character.prefab']['asset'],
                               encoding='utf-8').read())
    gos = {k: v for k, (c, t, v) in pre.items() if c == 1}
    trs = {k: v for k, (c, t, v) in pre.items() if c == 4}
    srs = {str(v['m_GameObject']['fileID']): v for k, (c, t, v) in pre.items() if c == 212}

    def node(tid, parent_path):
        t = trs[tid]
        goid = str(t['m_GameObject']['fileID'])
        go = gos[goid]
        name = go['m_Name']
        path = name if parent_path is None else (parent_path + '/' + name if parent_path else name)
        n = dict(name=name, path=path, active=bool(go.get('m_IsActive', 1)),
                 x=r(t['m_LocalPosition']['x']), y=r(t['m_LocalPosition']['y']),
                 rot=r(quat_to_z(t['m_LocalRotation']), 3),
                 sx=r(t['m_LocalScale']['x']), sy=r(t['m_LocalScale']['y']))
        sr = srs.get(goid)
        if sr:
            g = (sr.get('m_Sprite') or {}).get('guid')
            c = sr.get('m_Color', {})
            n['sprite'] = sprites.get(g)
            n['order'] = int(sr.get('m_SortingOrder', 0))
            n['color'] = [r(c.get(k, 1), 4) for k in 'rgba']
            n['enabled'] = bool(sr.get('m_Enabled', 1))
            if sr.get('m_FlipX'):
                n['flipX'] = True
        kids = [node(str(ch['fileID']), path if parent_path is not None else '')
                for ch in t.get('m_Children') or []]
        if kids:
            n['children'] = kids
        return n

    root_tid = next(k for k, t in trs.items() if str(t['m_Father']['fileID']) == '0')
    rig = node(root_tid, None)
    rig['path'] = ''

    # ---- animations ----------------------------------------------------
    anims = {}
    attrs_seen = set()
    for p, e in sorted(by_path.items()):
        if not (p.startswith(PKG_ROOT + 'Common/Animations/') and p.endswith('.anim')):
            continue
        (c, t, clip), = load_unity_yaml(open(e['asset'], encoding='utf-8').read()).values()
        tracks = {}

        def add(path, prop, keys):
            tracks.setdefault(path, {})[prop] = keys

        def vec_keys(curve, comp):
            out_ = []
            for k in curve['m_Curve']:
                out_.append([r(k['time']), r(k['value'][comp]),
                             slope(k['inSlope'][comp]), slope(k['outSlope'][comp])])
            return out_

        for cv in clip.get('m_EulerCurves') or []:
            add(cv['path'], 'rot', vec_keys(cv['curve'], 'z'))
        for cv in clip.get('m_PositionCurves') or []:
            add(cv['path'], 'x', vec_keys(cv['curve'], 'x'))
            add(cv['path'], 'y', vec_keys(cv['curve'], 'y'))
        for cv in clip.get('m_ScaleCurves') or []:
            add(cv['path'], 'sx', vec_keys(cv['curve'], 'x'))
            add(cv['path'], 'sy', vec_keys(cv['curve'], 'y'))
        for cv in clip.get('m_FloatCurves') or []:
            attr = cv['attribute']
            attrs_seen.add((attr, cv.get('classID')))
            prop = {'m_Color.a': 'alpha', 'm_IsActive': 'active', 'm_Enabled': 'enabled'}.get(attr)
            if not prop:
                continue
            keys = []
            for k in cv['curve']['m_Curve']:
                s_in, s_out = k['inSlope'], k['outSlope']
                keys.append([r(k['time']), r(k['value']), slope(s_in), slope(s_out)])
            add(cv['path'], prop, keys)
        if clip.get('m_PPtrCurves'):
            print('WARN: sprite-swap curves ignored in', clip['m_Name'])
        st = clip.get('m_AnimationClipSettings', {})
        events = [dict(t=r(ev['time']), fn=ev['functionName'])
                  for ev in clip.get('m_Events') or []]
        anims[clip['m_Name']] = dict(len=r(st.get('m_StopTime', 1)),
                                     loop=bool(st.get('m_LoopTime', 0)),
                                     events=events, tracks=tracks)

    with open(os.path.join(out, 'rig.json'), 'w') as f:
        json.dump(dict(rig=rig, sprites=sprite_meta, catalog=catalog), f, separators=(',', ':'))
    with open(os.path.join(out, 'anims.json'), 'w') as f:
        json.dump(anims, f, separators=(',', ':'))
    shutil.rmtree(tmp)
    print(f'{len(sprite_meta)} sprites, {len(anims)} clips -> {out}')
    print('float attrs:', sorted(attrs_seen, key=str))


if __name__ == '__main__':
    main()
