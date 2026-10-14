import {AnimationMixer, Color, LoopOnce, LoopRepeat, type AnimationAction, type Material, type Mesh, type MeshStandardMaterial, type Object3D} from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import type {WeaponMesh} from '../items/catalog';
import type {AssetLibrary, CharacterName, PropName} from './assets';

export interface PlayOptions {
  loop?: boolean;
  fade?: number;
  speed?: number;
  /** Restart even when the clip is already playing (e.g. repeated hits). */
  restart?: boolean;
  /** Hold the last frame (death). */
  clamp?: boolean;
}

const KNIGHT_GEAR = ['1H_Sword', '2H_Sword', '1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield'];
const FLASH_DECAY = 9;

/** A skinned KayKit character with its own mixer and per-instance materials for hit flashes. */
export class CharacterView {
  readonly root: Object3D;
  private readonly mixer: AnimationMixer;
  private readonly actions = new Map<string, AnimationAction>();
  private readonly materials: MeshStandardMaterial[] = [];
  private readonly attached: Object3D[] = [];
  private current: AnimationAction | null = null;
  private currentName = '';
  private flashLevel = 0;
  private readonly flashColor = new Color();

  constructor(
    private readonly assets: AssetLibrary,
    readonly name: CharacterName,
  ) {
    const asset = assets.characters.get(name);
    if (!asset) throw new Error(`Character ${name} not loaded`);
    this.root = clone(asset.scene);
    this.root.traverse(node => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      // Cloned materials compile to the same shader program: no hitch, but independent emissive.
      const mat = (mesh.material as Material).clone() as MeshStandardMaterial;
      mesh.material = mat;
      this.materials.push(mat);
      mesh.frustumCulled = false;
    });
    this.mixer = new AnimationMixer(this.root);
    for (const clip of asset.clips) this.actions.set(clip.name, this.mixer.clipAction(clip));
  }

  hasClip(name: string): boolean {
    return this.actions.has(name);
  }

  clipDuration(name: string): number {
    return this.actions.get(name)?.getClip().duration ?? 1;
  }

  get playing(): string {
    return this.currentName;
  }

  play(name: string, opts: PlayOptions = {}): void {
    const action = this.actions.get(name);
    if (!action) return;
    const {loop = true, fade = 0.12, speed = 1, restart = false, clamp = false} = opts;
    action.timeScale = speed;
    if (this.currentName === name && !restart) return;
    action.reset();
    action.setLoop(loop ? LoopRepeat : LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = clamp || !loop;
    if (this.current && this.current !== action) {
      action.crossFadeFrom(this.current, fade, false);
    } else {
      action.fadeIn(fade);
    }
    action.play();
    this.current = action;
    this.currentName = name;
  }

  setSpeed(speed: number): void {
    if (this.current) this.current.timeScale = speed;
  }

  /** Knight only: show exactly the gear that matches the equipment. */
  equipKnight(weapon: WeaponMesh | null, helmet: boolean): void {
    for (const o of this.attached) o.removeFromParent();
    this.attached.length = 0;
    const show = new Set<string>();
    if (weapon === 'knight:1H_Sword') show.add('1H_Sword');
    if (weapon === 'knight:2H_Sword') show.add('2H_Sword');
    if (weapon !== 'knight:2H_Sword' && weapon) show.add('Round_Shield');
    for (const gear of KNIGHT_GEAR) {
      const node = this.root.getObjectByName(gear);
      if (node) node.visible = show.has(gear);
    }
    const helm = this.root.getObjectByName('Knight_Helmet');
    if (helm) helm.visible = helmet;
    if (weapon?.startsWith('prop:')) this.attach(weapon.slice(5) as PropName, 'handslot.r');
  }

  /** Shows only the named child meshes from the model's built-in gear. */
  showOnly(nodes: readonly string[], all: readonly string[]): void {
    for (const n of all) {
      const node = this.root.getObjectByName(n);
      if (node) node.visible = nodes.includes(n);
    }
  }

  attach(prop: PropName, bone: string): void {
    const template = this.assets.props.get(prop);
    const slot = this.root.getObjectByName(bone);
    if (!template || !slot) return;
    const obj = template.clone();
    obj.traverse(node => {
      const mesh = node as Mesh;
      if (mesh.isMesh) mesh.castShadow = true;
    });
    slot.add(obj);
    this.attached.push(obj);
  }

  /** Brief emissive flash; white for hits taken by enemies, red for the player. */
  flash(color: number, strength = 1): void {
    this.flashColor.set(color);
    this.flashLevel = Math.max(this.flashLevel, strength);
  }

  update(dt: number): void {
    this.mixer.update(dt);
    if (this.flashLevel > 0) {
      this.flashLevel = Math.max(0, this.flashLevel - FLASH_DECAY * dt);
      for (const m of this.materials) {
        m.emissive.copy(this.flashColor);
        m.emissiveIntensity = this.flashLevel * 1.4;
      }
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    this.mixer.stopAllAction();
    for (const m of this.materials) m.dispose();
  }
}
