import {
  AnimationMixer,
  Color,
  LoopRepeat,
  Skeleton,
  type AnimationAction,
  type Bone,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  type SkinnedMesh,
} from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import type {Rng} from '../core/rng';
import type {AssetLibrary, CharacterName} from './assets';

/** The five adventurers share one rig, so their body parts are interchangeable. */
export type Adventurer = Extract<CharacterName, 'Knight' | 'Barbarian' | 'Mage' | 'Rogue' | 'Rogue_Hooded'>;
export const ADVENTURERS: readonly Adventurer[] = ['Knight', 'Barbarian', 'Mage', 'Rogue', 'Rogue_Hooded'];

export type BodySlot = 'Head' | 'Body' | 'ArmLeft' | 'ArmRight' | 'LegLeft' | 'LegRight';
const SLOTS: readonly BodySlot[] = ['Head', 'Body', 'ArmLeft', 'ArmRight', 'LegLeft', 'LegRight'];

/** Rigid attachments: node name in its source model → the bone it hangs from. */
const HATS: readonly (readonly [Adventurer, string])[] = [
  ['Knight', 'Knight_Helmet'],
  ['Mage', 'Mage_Hat'],
  ['Barbarian', 'Barbarian_Hat'],
];
const CAPES: readonly (readonly [Adventurer, string])[] = [
  ['Knight', 'Knight_Cape'],
  ['Mage', 'Mage_Cape'],
  ['Barbarian', 'Barbarian_Cape'],
  ['Rogue', 'Rogue_Cape'],
];
const MAIN_HAND: readonly (readonly [Adventurer, string])[] = [
  ['Knight', '1H_Sword'],
  ['Knight', '2H_Sword'],
  ['Barbarian', '1H_Axe'],
  ['Barbarian', '2H_Axe'],
  ['Mage', '1H_Wand'],
  ['Mage', '2H_Staff'],
  ['Rogue', 'Knife'],
  ['Rogue', '1H_Crossbow'],
];
const OFF_HAND: readonly (readonly [Adventurer, string])[] = [
  ['Knight', 'Round_Shield'],
  ['Knight', 'Spike_Shield'],
  ['Knight', 'Badge_Shield'],
  ['Barbarian', 'Barbarian_Round_Shield'],
  ['Rogue', 'Knife_Offhand'],
  ['Mage', 'Spellbook'],
  ['Barbarian', '1H_Axe_Offhand'],
];

export interface MercLook {
  parts: Record<BodySlot, Adventurer>;
  hat: readonly [Adventurer, string] | null;
  cape: readonly [Adventurer, string] | null;
  mainHand: readonly [Adventurer, string] | null;
  offHand: readonly [Adventurer, string] | null;
  /** Multiplied into every body material: hair/cloth color variety for free. */
  tint: number;
}

const TINTS = [0xffffff, 0xffffff, 0xe8d0b0, 0xb8c8ff, 0xffb8b8, 0xc8ffc0, 0xd8b8ff, 0xfff0a0];

export function randomLook(rng: Rng): MercLook {
  const parts = Object.fromEntries(SLOTS.map(s => [s, rng.pick(ADVENTURERS)])) as Record<BodySlot, Adventurer>;
  // Arms and legs read best as matching pairs.
  parts.ArmRight = parts.ArmLeft;
  parts.LegRight = parts.LegLeft;
  return {
    parts,
    hat: rng.chance(0.55) ? rng.pick(HATS) : null,
    cape: rng.chance(0.5) ? rng.pick(CAPES) : null,
    mainHand: rng.pick(MAIN_HAND),
    offHand: rng.chance(0.6) ? rng.pick(OFF_HAND) : null,
    tint: rng.pick(TINTS),
  };
}

const partName = (who: Adventurer, slot: BodySlot): string => (who === 'Rogue_Hooded' && slot === 'Head' ? 'Rogue_Head_Hooded' : `${who}_${slot}`);

/** Re-skins a body part from another adventurer onto the base rig (bones matched by name). */
function graftPart(part: SkinnedMesh, base: Object3D): SkinnedMesh {
  const mesh = part.clone() as SkinnedMesh;
  const bones = part.skeleton.bones.map(b => base.getObjectByName(b.name) as Bone);
  mesh.bind(new Skeleton(bones, part.skeleton.boneInverses), part.bindMatrix);
  return mesh;
}

function attach(assets: AssetLibrary, base: Object3D, [who, node]: readonly [Adventurer, string]): Object3D | null {
  const source = assets.characters.get(who)?.scene.getObjectByName(node);
  const bone = source?.parent && base.getObjectByName(source.parent.name);
  if (!source || !bone) return null;
  const obj = source.clone();
  obj.visible = true;
  bone.add(obj);
  return obj;
}

export interface MercView {
  root: Object3D;
  mixer: AnimationMixer;
  actions: Map<string, AnimationAction>;
  play(name: string): void;
}

/** Builds one mixed-and-matched mercenary on the Knight's rig and animation set. */
export function buildMerc(assets: AssetLibrary, look: MercLook): MercView {
  const baseAsset = assets.characters.get('Knight')!;
  const root = clone(baseAsset.scene);
  // Strip the Knight's own meshes and gear; keep only the bones.
  const strip: Object3D[] = [];
  root.traverse(n => {
    if ((n as Mesh).isMesh) strip.push(n);
  });
  for (const n of strip) n.removeFromParent();

  const tint = new Color(look.tint);
  for (const slot of SLOTS) {
    const who = look.parts[slot];
    const src = assets.characters.get(who)?.scene.getObjectByName(partName(who, slot)) as SkinnedMesh | undefined;
    if (!src) continue;
    const mesh = graftPart(src, root);
    const mat = (mesh.material as Material).clone() as MeshStandardMaterial;
    // Skin (head) keeps its tone; clothes take the tint.
    if (slot !== 'Head') mat.color.multiply(tint);
    mesh.material = mat;
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    root.getObjectByName(src.parent?.name ?? '')?.add(mesh);
  }
  for (const acc of [look.hat, look.cape, look.mainHand, look.offHand]) if (acc) attach(assets, root, acc);

  const mixer = new AnimationMixer(root);
  const actions = new Map(baseAsset.clips.map(c => [c.name, mixer.clipAction(c)] as const));
  let current: AnimationAction | null = null;
  return {
    root,
    mixer,
    actions,
    play(name: string): void {
      const next = actions.get(name);
      if (!next || next === current) return;
      next.reset().setLoop(LoopRepeat, Infinity).fadeIn(0.2).play();
      current?.fadeOut(0.2);
      current = next;
    },
  };
}
