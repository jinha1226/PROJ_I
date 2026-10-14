import {
  AnimationMixer,
  Box3,
  CircleGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  type Material,
  type Object3D,
  type Scene,
  Vector3,
} from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import type {Actor, ActorName, EnemyVariant, Team} from '../types';
import type {ModelLibrary} from './assets';
import {ThreeActorView} from './actorView';

export interface SpawnOptions {
  name: ActorName;
  team: Team;
  x: number;
  z: number;
  hp: number;
  damage: number;
  range: number;
  cooldown: number;
  variant?: EnemyVariant | null;
}

export interface ActorFactory {
  spawn(options: SpawnOptions): Promise<Actor>;
}

const ACTOR_HEIGHT = 1.7;
const RING_RADIUS = 0.66;
const RING_HEIGHT = 0.035;
const RING_OPACITY = 0.35;
const HERO_RING_COLOR = 0x7ec7ed;
const ENEMY_RING_COLOR = 0xe76d68;
const VARIANT_EMISSIVE_INTENSITY = 0.12;
const MAX_INITIAL_ATTACK_DELAY = 0.35;

const ringGeometry = new CircleGeometry(RING_RADIUS, 32);

function tintMeshes(root: Object3D, variant: EnemyVariant): void {
  const tint = new Color(variant.tint);
  root.traverse(node => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(m => m.clone());
    for (const m of materials as (Material & {color?: Color; emissive?: Color; emissiveIntensity?: number})[]) {
      m.color?.multiply(tint);
      if (m.emissive) {
        m.emissive.set(variant.glow);
        m.emissiveIntensity = VARIANT_EMISSIVE_INTENSITY;
      }
    }
    mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
  });
}

export class ThreeActorFactory implements ActorFactory {
  constructor(
    private readonly scene: Scene,
    private readonly models: ModelLibrary,
    private readonly random: () => number = Math.random,
  ) {}

  async spawn({name, team, x, z, hp, damage, range, cooldown, variant = null}: SpawnOptions): Promise<Actor> {
    const gltf = await this.models.load(name);
    const root = clone(gltf.scene);
    const box = new Box3().setFromObject(root);
    const height = box.getSize(new Vector3()).y;
    const scale = ACTOR_HEIGHT / Math.max(height, 0.01);
    root.scale.setScalar(scale);
    root.position.set(x, -box.min.y * scale, z);
    root.traverse(node => {
      const mesh = node as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    if (variant) tintMeshes(root, variant);
    this.scene.add(root);

    const ring = new Mesh(
      ringGeometry,
      new MeshBasicMaterial({color: team === 'hero' ? HERO_RING_COLOR : ENEMY_RING_COLOR, transparent: true, opacity: RING_OPACITY, depthWrite: false}),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, RING_HEIGHT, z);
    this.scene.add(ring);

    const mixer = new AnimationMixer(root);
    const actions = new Map(gltf.animations.map(clip => [clip.name, mixer.clipAction(clip)] as const));
    let actor!: Actor;
    const view = new ThreeActorView(this.scene, root, ring, actions, mixer, () => actor.hp > 0);
    actor = {
      name,
      team,
      view,
      pos: new Vector3(x, 0, z),
      hp,
      max: hp,
      damage,
      range,
      cooldown,
      timer: this.random() * MAX_INITIAL_ATTACK_DELAY,
      dead: false,
      variant,
      behavior: variant?.behavior ?? (team === 'enemy' ? (name === 'Skeleton_Mage' ? 'backline' : 'charge') : null),
    };
    view.play('idle');
    return actor;
  }
}
