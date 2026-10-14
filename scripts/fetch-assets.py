"""Download the CC0 KayKit models the game uses into public/assets/kaykit.

Usage: python3 -I scripts/fetch-assets.py [--dungeon]

Characters are always fetched. `--dungeon` additionally exports the whole
Dungeon Remastered kit plus a manifest; the game does not load it yet.
"""
import io
import json
import pathlib
import shutil
import sys
import urllib.request
import zipfile

CHARACTER_PACKS = {
    'adventurers': ('KayKit-Character-Pack-Adventures-1.0', ['Knight', 'Rogue_Hooded', 'Mage', 'Barbarian', 'Rogue']),
    'skeletons': ('KayKit-Character-Pack-Skeletons-1.0', ['Skeleton_Warrior', 'Skeleton_Mage']),
}
SKELETON_PROPS = ['Skeleton_Blade', 'Skeleton_Axe', 'Skeleton_Staff', 'Skeleton_Crossbow', 'Skeleton_Shield_Small_A']
DUNGEON_PACK = 'KayKit-Dungeon-Remastered-1.0'
HEX_PACK = 'KayKit-Medieval-Hexagon-Pack-1.0'
HEX_COLOR = 'red'
# Hideout camp: facility buildings (one team color), building-site states, decor and ground tiles.
HEX_BUILDINGS = ['blacksmith', 'tavern', 'market', 'tower_A', 'barracks', 'castle', 'archeryrange', 'home_A', 'home_B', 'well', 'windmill', 'church']
HEX_NEUTRAL = [
    'building_scaffolding', 'building_destroyed', 'building_dirt',
    'tent', f'flag_{HEX_COLOR}', 'barrel', 'crate_A_big', 'crate_open', 'sack', 'weaponrack', 'wheelbarrow',
    'resource_lumber', 'resource_stone', 'fence_wood_straight', 'target', 'bucket_water',
    'trees_A_medium', 'trees_B_large', 'trees_A_small', 'tree_single_A', 'rock_single_A', 'rock_single_C',
    'hills_A_trees', 'mountain_A_grass_trees', 'hex_grass', 'hex_road_A', 'hex_road_B', 'hex_road_D',
]
OUT = pathlib.Path('public/assets/kaykit')


def download(repo: str) -> zipfile.ZipFile:
    url = f'https://github.com/KayKit-Game-Assets/{repo}/archive/refs/heads/main.zip'
    print('Downloading', url, flush=True)
    request = urllib.request.Request(url, headers={'User-Agent': 'PROJ-I-build'})
    with urllib.request.urlopen(request, timeout=120) as response:
        return zipfile.ZipFile(io.BytesIO(response.read()))


def extract(archive: zipfile.ZipFile, source: str, target: pathlib.Path) -> None:
    with archive.open(source) as src, target.open('wb') as dst:
        shutil.copyfileobj(src, dst)


def fetch_skeleton_props(archive: zipfile.ZipFile) -> None:
    """Weapons ship as .gltf + .bin sharing one texture; keep them side by side."""
    props = OUT / 'props'
    props.mkdir(exist_ok=True)
    files = archive.namelist()
    for name in SKELETON_PROPS:
        for ext in ('.gltf', '.bin'):
            match = [p for p in files if p.endswith(f'/Assets/gltf/{name}{ext}')]
            if not match:
                raise RuntimeError(f'Missing skeleton prop {name}{ext}')
            extract(archive, match[0], props / f'{name}{ext}')
    texture = [p for p in files if p.endswith('/Assets/gltf/skeleton_texture.png')]
    if texture:
        extract(archive, texture[0], props / 'skeleton_texture.png')


def fetch_characters() -> None:
    for key, (repo, names) in CHARACTER_PACKS.items():
        archive = download(repo)
        if key == 'skeletons':
            fetch_skeleton_props(archive)
        glbs = [p for p in archive.namelist() if p.lower().endswith('.glb')]
        for name in names:
            matches = [p for p in glbs if pathlib.PurePosixPath(p).stem.lower() == name.lower()]
            if not matches:
                available = [pathlib.PurePosixPath(p).stem for p in glbs[:30]]
                raise RuntimeError(f'Missing KayKit {name} in {repo}. Available: {available}')
            extract(archive, matches[0], OUT / f'{name}.glb')


def fetch_hex() -> None:
    archive = download(HEX_PACK)
    files = archive.namelist()
    target = OUT / 'hex'
    target.mkdir(exist_ok=True)
    wanted = [f'building_{b}_{HEX_COLOR}' for b in HEX_BUILDINGS] + HEX_NEUTRAL
    for stem in wanted:
        for ext in ('.gltf', '.bin'):
            match = [p for p in files if '/Assets/gltf/' in p and p.endswith(f'/{stem}{ext}')]
            if not match:
                raise RuntimeError(f'Missing hex piece {stem}{ext}')
            extract(archive, match[0], target / f'{stem}{ext}')
    texture = [p for p in files if '/Assets/gltf/' in p and p.endswith('/hexagons_medieval.png')]
    if not texture:
        raise RuntimeError('Missing hexagons_medieval.png')
    extract(archive, texture[0], target / 'hexagons_medieval.png')
    print('Hex pieces:', len(wanted), flush=True)


def fetch_dungeon() -> None:
    archive = download(DUNGEON_PACK)
    glbs = [p for p in archive.namelist() if p.lower().endswith('.glb')]
    candidates = [p for p in glbs if '/gltf/' in p.lower()] or glbs
    catalog = {}
    for source in candidates:
        stem = pathlib.PurePosixPath(source).stem
        if stem.lower().endswith('.gltf'):
            stem = stem[:-5]
        if stem in catalog:
            continue
        target = OUT / f'dungeon_{stem}.glb'
        extract(archive, source, target)
        catalog[stem] = target.name
    if not catalog:
        raise RuntimeError('Dungeon GLB catalog empty')
    (OUT / 'dungeon_manifest.json').write_text(json.dumps(catalog, indent=2))
    print('Dungeon models:', len(catalog), flush=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    fetch_characters()
    fetch_hex()
    if '--dungeon' in sys.argv[1:]:
        fetch_dungeon()
    required = ['Knight', 'Rogue_Hooded', 'Mage', 'Skeleton_Warrior', 'Skeleton_Mage']
    missing = [name for name in required if not (OUT / f'{name}.glb').is_file()]
    if missing:
        raise RuntimeError(f'Missing required KayKit files: {missing}')
    print('KayKit assets ready in', OUT)


if __name__ == '__main__':
    main()
