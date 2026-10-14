// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {AnimationClip, Group, Mesh, MeshStandardMaterial, BoxGeometry, NumberKeyframeTrack, PerspectiveCamera, Scene, Vector3, Color, type Object3D} from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {FIXED_DUNGEON} from '../src/dungeon/generator';
import type {ModelLibrary} from '../src/render/assets';
import {ThreeActorFactory} from '../src/render/actorFactory';
import {BlockBuilder} from '../src/render/blocks';
import {DungeonView} from '../src/render/dungeonView';
import {ThreeFx} from '../src/render/fx';
import {HubBackdrop} from '../src/render/hubBackdrop';
import {ThreeDungeonScene} from '../src/render/threeDungeonScene';
import {MergedBlockBuilder} from '../src/render/mergedBlocks';
import {TorchPool} from '../src/render/torchPool';
import {ENEMY_VARIANTS} from '../src/data/enemies';

const clip = (name: string, duration = 1): AnimationClip => new AnimationClip(name, duration, [new NumberKeyframeTrack('.position[y]', [0, duration], [0, 0])]);

function fakeModel(height = 2, min = 0): GLTF {
  const scene = new Group();
  const body = new Mesh(new BoxGeometry(1, height, 1), new MeshStandardMaterial({color: 0xffffff}));
  body.position.y = min + height / 2;
  scene.add(body);
  return {scene, animations: ['Idle', 'Walking_A', '1H_Melee_Attack_Slice', 'Hit_A', 'Death_A'].map(n => clip(n))} as unknown as GLTF;
}

class FakeModels implements ModelLibrary {
  loads: string[] = [];
  async load(name: string): Promise<GLTF> {
    this.loads.push(name);
    return fakeModel();
  }
}

describe('ThreeActorFactory', () => {
  let scene: Scene;
  beforeEach(() => {
    scene = new Scene();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  const spawn = (overrides: Record<string, unknown> = {}) =>
    new ThreeActorFactory(scene, new FakeModels(), () => 0.5).spawn({name: 'Knight', team: 'hero', x: 3, z: -2, hp: 50, damage: 7, range: 1.5, cooldown: 0.9, ...overrides});

  it('creates an actor standing at the requested spot, scaled to a 1.7 unit height', async () => {
    const actor = await spawn();
    expect(actor).toMatchObject({name: 'Knight', team: 'hero', hp: 50, max: 50, damage: 7, dead: false, behavior: null});
    expect(actor.pos.toArray()).toEqual([3, 0, -2]);
    expect(actor.timer).toBeCloseTo(0.175);
    const [model, ring] = scene.children as [Object3D, Mesh];
    expect(model.scale.x).toBeCloseTo(0.85);
    expect(model.position.x).toBe(3);
    expect(ring.position.toArray()).toEqual([3, 0.035, -2]);
  });

  it('gives enemies a role-based behaviour unless their variant sets one', async () => {
    expect((await spawn({name: 'Skeleton_Warrior', team: 'enemy'})).behavior).toBe('charge');
    expect((await spawn({name: 'Skeleton_Mage', team: 'enemy'})).behavior).toBe('backline');
    expect((await spawn({name: 'Skeleton_Warrior', team: 'enemy', variant: ENEMY_VARIANTS.stalker})).behavior).toBe('hunter');
  });

  it('tints variant meshes without touching the shared model materials', async () => {
    const models = new FakeModels();
    const shared = fakeModel();
    vi.spyOn(models, 'load').mockResolvedValue(shared);
    const factory = new ThreeActorFactory(scene, models);
    await factory.spawn({name: 'Skeleton_Warrior', team: 'enemy', x: 0, z: 0, hp: 1, damage: 1, range: 1, cooldown: 1, variant: ENEMY_VARIANTS.caster});
    const original = (shared.scene.children[0] as Mesh).material as MeshStandardMaterial;
    expect(original.color.getHex()).toBe(0xffffff);
    const cloned = ((scene.children[0].children[0] as Mesh).material) as MeshStandardMaterial;
    expect(cloned.color.getHex()).toBe(new Color(0xffffff).multiply(new Color(ENEMY_VARIANTS.caster.tint)).getHex());
    expect(cloned.emissive.getHex()).toBe(ENEMY_VARIANTS.caster.glow);
  });

  it('moves model and ring together and eases back to the ground after a bump', async () => {
    const actor = await spawn();
    const [model, ring] = scene.children as [Object3D, Mesh];
    actor.pos.set(5, 0, 6);
    actor.view.place(actor.pos);
    expect([model.position.x, model.position.z, ring.position.x, ring.position.z]).toEqual([5, 6, 5, 6]);
    actor.view.bump(0.12);
    expect(model.position.y).toBeCloseTo(0.12);
    actor.view.settle(0.05);
    expect(model.position.y).toBeLessThan(0.12);
    actor.view.settle(1);
    expect(model.position.y).toBeCloseTo(0);
  });

  it('faces the direction of the target and ignores zero-length turns', async () => {
    const actor = await spawn();
    const model = scene.children[0];
    actor.view.faceTowards(new Vector3(0, 0, 0), new Vector3(1, 0, 0));
    expect(model.rotation.y).toBeCloseTo(Math.PI / 2);
    actor.view.faceTowards(new Vector3(1, 0, 1), new Vector3(1, 0, 1));
    expect(model.rotation.y).toBeCloseTo(Math.PI / 2);
    actor.view.setFacing(1);
    expect(model.rotation.y).toBe(1);
  });

  it('picks animations by name pattern and reports clip length', async () => {
    const actor = await spawn();
    expect(actor.view.clipDuration()).toBe(1);
    actor.view.play('attack', true);
    expect(actor.view.clipDuration()).toBe(1);
    actor.view.play('walk');
    actor.view.idleIfWalking();
    actor.view.play('death', true);
  });

  it('returns a living actor to idle after a one-shot animation, but not a dead one', async () => {
    const living = await spawn();
    const spy = vi.spyOn(living.view, 'play');
    living.view.play('attack', true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(spy).toHaveBeenLastCalledWith('idle');

    const dead = await spawn();
    const deadSpy = vi.spyOn(dead.view, 'play');
    dead.view.play('hit', true);
    dead.hp = 0;
    await vi.advanceTimersByTimeAsync(1000);
    expect(deadSpy).not.toHaveBeenCalledWith('idle');
  });

  it('sinks, shrinks and finally hides a fallen actor', async () => {
    const actor = await spawn();
    const model = scene.children[0];
    actor.view.fadeOut(0.5, 1);
    expect(model.position.y).toBeLessThan(0);
    expect(model.scale.x).toBeLessThan(0.85);
    expect(model.visible).toBe(true);
    actor.view.fadeOut(0.1, 1.3);
    expect(model.visible).toBe(false);
  });

  it('scales, hides and disposes', async () => {
    const actor = await spawn();
    const [model, ring] = scene.children;
    actor.view.scaleBy(1.6);
    expect(model.scale.x).toBeCloseTo(0.85 * 1.6);
    actor.view.setVisible(false);
    actor.view.setRingVisible(false);
    expect([model.visible, ring.visible]).toEqual([false, false]);
    actor.view.dispose();
    expect(scene.children).toHaveLength(0);
  });
});

describe('BlockBuilder', () => {
  it('shares geometry and materials between identical blocks and releases everything', () => {
    const scene = new Scene();
    const blocks = new BlockBuilder(scene);
    const a = blocks.add(1, 1, 1, 0, 0, 0, 0xff0000);
    const b = blocks.add(1, 1, 1, 5, 0, 0, 0xff0000);
    const c = blocks.add(2, 1, 1, 0, 0, 0, 0x00ff00);
    expect(a.geometry).toBe(b.geometry);
    expect(a.material).toBe(b.material);
    expect(c.geometry).not.toBe(a.geometry);
    expect(scene.children).toHaveLength(3);
    const dispose = vi.spyOn(a.geometry, 'dispose');
    blocks.dispose();
    expect(scene.children).toHaveLength(0);
    expect(dispose).toHaveBeenCalled();
  });
});

describe('DungeonView', () => {
  it('builds floors, walls, columns and torches once and clears them on dispose', () => {
    const scene = new Scene();
    const view = new DungeonView(scene);
    expect(view.built).toBe(false);
    view.build(FIXED_DUNGEON);
    expect(view.built).toBe(true);
    const lights = scene.children.filter(c => (c as {isLight?: boolean}).isLight);
    expect(lights).toHaveLength(6);
    const meshes = scene.children.filter(c => (c as Mesh).isMesh);
    expect(meshes.length).toBeGreaterThan(0);
    expect(meshes.length).toBeLessThanOrEqual(5);
    view.dispose();
    expect(scene.children).toHaveLength(0);
    expect(view.built).toBe(false);
  });
});

describe('TorchPool', () => {
  it('keeps a fixed number of lights on the torches nearest the focus', () => {
    const scene = new Scene();
    const sites = [0, 10, 20, 30].map(x => new Vector3(x, 1.6, 0));
    const pool = new TorchPool(scene, sites, 2);
    const lights = scene.children as unknown as {position: Vector3}[];
    expect(lights).toHaveLength(2);
    pool.update(new Vector3(29, 0, 0));
    expect(lights.map(l => l.position.x).sort((a, b) => a - b)).toEqual([20, 30]);
    pool.update(new Vector3(1, 0, 0));
    expect(lights.map(l => l.position.x).sort((a, b) => a - b)).toEqual([0, 10]);
    pool.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it('never creates more lights than there are torches', () => {
    const scene = new Scene();
    new TorchPool(scene, [new Vector3()], 6);
    expect(scene.children).toHaveLength(1);
  });
});

describe('MergedBlockBuilder', () => {
  it('bakes many blocks into one mesh per color', () => {
    const scene = new Scene();
    const blocks = new MergedBlockBuilder(scene);
    for (let i = 0; i < 100; i++) blocks.add(1, 1, 1, i, 0, 0, i % 2 ? 0xff0000 : 0x00ff00);
    blocks.finish();
    expect(blocks.meshCount).toBe(2);
    expect(scene.children).toHaveLength(2);
    blocks.dispose();
    expect(scene.children).toHaveLength(0);
  });
});

describe('HubBackdrop / ThreeDungeonScene', () => {
  it('names a theme and swaps itself for the dungeon exactly once', () => {
    const scene = new Scene();
    const hub = new ThreeDungeonScene(scene);
    expect(hub.themeName).toMatch(/\S/);
    const backdropSize = scene.children.length;
    expect(backdropSize).toBeGreaterThan(50);
    hub.prepareDungeon(FIXED_DUNGEON);
    const dungeonSize = scene.children.length;
    expect(dungeonSize).toBeLessThan(backdropSize);
    hub.prepareDungeon(FIXED_DUNGEON);
    expect(scene.children).toHaveLength(dungeonSize);
  });

  it('removes its own torch lights and flames on dispose', () => {
    const scene = new Scene();
    const backdrop = new HubBackdrop(scene);
    backdrop.build();
    backdrop.dispose();
    expect(scene.children).toHaveLength(0);
  });
});

describe('ThreeFx', () => {
  const setup = () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera();
    camera.position.set(0, 10, 10);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const overlay = document.createElement('div');
    return {scene, fx: new ThreeFx(scene, camera, overlay), overlay};
  };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('floats damage text over the overlay and removes it after 750ms', () => {
    const {fx, overlay} = setup();
    fx.floatText(new Vector3(), '-12', '#fff');
    expect(overlay.querySelector('.float')?.textContent).toBe('-12');
    vi.advanceTimersByTime(800);
    expect(overlay.querySelector('.float')).toBeNull();
  });

  it('spawns a ring and sparks on impact and cleans them up as they age', () => {
    const {fx, scene} = setup();
    fx.impact(new Vector3(1, 0, 1), 0xff0000);
    expect(meshesOf(scene)).toHaveLength(10);
    fx.update(0.4);
    expect(meshesOf(scene).length).toBeLessThan(10);
    fx.update(1);
    expect(meshesOf(scene)).toHaveLength(0);
  });

  const lightsOf = (scene: Scene) => scene.children.filter(c => (c as {isLight?: boolean}).isLight) as unknown as {intensity: number}[];
  const meshesOf = (scene: Scene) => scene.children.filter(c => (c as Mesh).isMesh) as Mesh[];

  it('flies arrows and spells between two points', () => {
    const {fx, scene} = setup();
    const arrow = fx.spawnProjectile(new Vector3(0, 0, 0), new Vector3(10, 0, 0), 'arrow');
    const spell = fx.spawnProjectile(new Vector3(0, 0, 0), new Vector3(10, 0, 0), 'spell');
    expect(meshesOf(scene)).toHaveLength(2);
    arrow.advance(0.5, 0.1);
    spell.advance(0.5, 0.1);
    expect(meshesOf(scene)[0].position.x).toBeCloseTo(5);
    arrow.dispose();
    spell.dispose();
    expect(meshesOf(scene)).toHaveLength(0);
  });

  it('never changes the number of lights in the scene, so shaders are not recompiled mid-fight', () => {
    const {fx, scene} = setup();
    const count = lightsOf(scene).length;
    expect(lightsOf(scene).every(l => l.intensity === 0)).toBe(true);
    const spells = Array.from({length: 6}, () => fx.spawnProjectile(new Vector3(), new Vector3(1, 0, 0), 'spell'));
    expect(lightsOf(scene)).toHaveLength(count);
    expect(lightsOf(scene).filter(l => l.intensity > 0)).toHaveLength(4);
    for (const spell of spells) spell.dispose();
    expect(lightsOf(scene)).toHaveLength(count);
    expect(lightsOf(scene).every(l => l.intensity === 0)).toBe(true);
  });

  it('offers one sample mesh per effect material for warm-up, without adding them to the scene', () => {
    const {fx, scene} = setup();
    const samples = fx.warmupSamples();
    expect(samples).toHaveLength(5);
    expect(meshesOf(scene)).toHaveLength(0);
  });

  it('draws and clears a boss telegraph and a fading pulse', () => {
    const {fx, scene} = setup();
    const warning = fx.spawnBossWarning(new Vector3(2, 0, 2));
    warning.setOpacity(0.3);
    expect((meshesOf(scene)[0].material as {opacity: number}).opacity).toBe(0.3);
    warning.dispose();
    expect(meshesOf(scene)).toHaveLength(0);
    fx.bossPulse(new Vector3());
    expect(meshesOf(scene)).toHaveLength(1);
    fx.update(1);
    expect(meshesOf(scene)).toHaveLength(0);
  });
});
