import {LoadingManager, Mesh, MeshStandardMaterial, type AnimationClip, type Material, type Object3D} from 'three';
import {GLTFLoader, type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {THEME_PIECES} from '../world/themes';

export type CharacterName = 'Knight' | 'Skeleton_Warrior' | 'Skeleton_Mage' | 'Rogue_Hooded' | 'Barbarian' | 'Rogue' | 'Mage';
export const CHARACTERS: readonly CharacterName[] = ['Knight', 'Skeleton_Warrior', 'Skeleton_Mage', 'Rogue_Hooded', 'Barbarian', 'Rogue', 'Mage'];
export const PROPS = ['Skeleton_Blade', 'Skeleton_Axe', 'Skeleton_Staff', 'Skeleton_Crossbow', 'Skeleton_Shield_Small_A'] as const;
export type PropName = (typeof PROPS)[number];

/** Dungeon pieces the level, containers and item icons use. */
const BASE_PIECES = [
  'floor_tile_large', 'floor_tile_large_rocks', 'floor_tile_big_grate', 'floor_dirt_large', 'wall', 'torch_mounted', 'pillar',
  'banner_patternA_red', 'banner_patternA_blue', 'banner_patternA_green', 'banner_patternA_yellow',
  'table_medium_decorated_A', 'crates_stacked', 'keg_decorated', 'barrel_small_stack',
  'chest', 'chest_gold', 'barrel_large', 'box_large', 'box_small', 'trunk_large_A', 'sword_shield', 'coin_stack_small',
  'coin', 'plate', 'bottle_B_brown', 'candle_triple', 'plate_stack', 'keg', 'sword_shield_broken', 'banner_thin_red',
  'keyring', 'sword_shield_gold', 'bottle_A_labeled_green', 'bottle_A_brown',
] as const;
export const DUNGEON_PIECES: readonly string[] = [...new Set<string>([...BASE_PIECES, ...THEME_PIECES])];

/** Medieval Hexagon pieces for the hideout camp. */
export const HEX_PIECES = [
  'building_blacksmith_red', 'building_tower_A_red', 'building_market_red', 'building_tavern_red', 'building_barracks_red', 'building_castle_red',
  'building_home_A_red', 'building_home_B_red', 'building_well_red', 'building_windmill_red', 'building_scaffolding',
  'tent', 'flag_red', 'barrel', 'crate_A_big', 'crate_open', 'sack', 'weaponrack', 'wheelbarrow', 'resource_lumber', 'resource_stone',
  'fence_wood_straight', 'target', 'bucket_water', 'trees_A_medium', 'trees_B_large', 'trees_A_small', 'tree_single_A',
  'rock_single_A', 'rock_single_C', 'hills_A_trees', 'mountain_A_grass_trees', 'hex_grass', 'hex_road_A',
] as const;

export interface CharacterAsset {
  scene: Object3D;
  clips: AnimationClip[];
}

/** Everything loaded up front; the game never fetches mid-raid. */
export interface AssetLibrary {
  characters: Map<CharacterName, CharacterAsset>;
  props: Map<PropName, Object3D>;
  pieces: Map<string, Object3D>;
  hex: Map<string, Object3D>;
  /** The single atlas material every dungeon piece shares (one shader, one texture). */
  dungeonMaterial: Material;
}

const BASE = `${import.meta.env.BASE_URL}assets/kaykit/`;

/** Points every mesh in a piece at the shared atlas material. */
function shareMaterial(root: Object3D, material: Material): void {
  root.traverse(node => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const old = mesh.material as Material;
    if (old !== material) old.dispose();
    mesh.material = material;
  });
}

export async function loadAssets(onProgress: (ratio: number) => void): Promise<AssetLibrary> {
  const manager = new LoadingManager();
  manager.onProgress = (_url, loaded, total) => onProgress(total ? loaded / total : 0);
  const loader = new GLTFLoader(manager);
  const load = (url: string): Promise<GLTF> => loader.loadAsync(url);

  const [characters, props, pieces, hex] = await Promise.all([
    Promise.all(CHARACTERS.map(async name => [name, await load(`${BASE}${name}.glb`)] as const)),
    Promise.all(PROPS.map(async name => [name, await load(`${BASE}props/${name}.gltf`)] as const)),
    Promise.all(DUNGEON_PIECES.map(async name => [name, await load(`${BASE}dungeon_${name}.glb`)] as const)),
    Promise.all(HEX_PIECES.map(async name => [name, await load(`${BASE}hex/${name}.gltf`)] as const)),
  ]);

  let dungeonMaterial: Material | null = null;
  const pieceMap = new Map<string, Object3D>();
  for (const [name, gltf] of pieces) {
    if (!dungeonMaterial) {
      gltf.scene.traverse(node => {
        const mesh = node as Mesh;
        if (mesh.isMesh && !dungeonMaterial) dungeonMaterial = mesh.material as Material;
      });
    }
    pieceMap.set(name, gltf.scene);
  }
  const material = dungeonMaterial ?? new MeshStandardMaterial({color: 0x888888});
  for (const scene of pieceMap.values()) shareMaterial(scene, material);

  // The hex pack also shares one atlas; reuse the first material for every piece.
  let hexMaterial: Material | null = null;
  for (const [, gltf] of hex) {
    gltf.scene.traverse(node => {
      const mesh = node as Mesh;
      if (mesh.isMesh && !hexMaterial) hexMaterial = mesh.material as Material;
    });
  }
  if (hexMaterial) for (const [, gltf] of hex) shareMaterial(gltf.scene, hexMaterial);

  return {
    hex: new Map(hex.map(([name, gltf]) => [name, gltf.scene])),
    characters: new Map(characters.map(([name, gltf]) => [name, {scene: gltf.scene, clips: gltf.animations}])),
    props: new Map(props.map(([name, gltf]) => [name, gltf.scene])),
    pieces: pieceMap,
    dungeonMaterial: material,
  };
}
