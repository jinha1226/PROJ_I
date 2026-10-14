import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PointLight,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from 'three';
import type {Vec2} from '../core/math';

const BACKGROUND = 0x07080c;
/** Camera offset from the focus point: high and south, looking north at ~56°. */
const OFFSET = new Vector3(0, 25, 17);
const PORTRAIT_ZOOM = 1.35;
const FOLLOW_RATE = 9;
const LOOK_AHEAD = 0.18;
const LOOK_AHEAD_MAX = 3;
const SHAKE_DECAY = 2.4;
const SHAKE_MAX = 0.55;
const TORCH_LIGHTS = 6;

/**
 * Owns the WebGL renderer, camera, and a fixed set of lights. The light count
 * never changes after construction: adding or removing lights forces three.js
 * to recompile every lit shader, which is what made earlier builds hitch.
 */
export class Stage {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(38, 1, 0.5, 120);
  readonly renderer: WebGLRenderer;
  private readonly moon: DirectionalLight;
  private readonly lantern: PointLight;
  private readonly torches: PointLight[] = [];
  private readonly focus = new Vector3();
  private readonly lookAhead = new Vector3();
  private trauma = 0;
  private zoom = 1;
  private time = 0;

  constructor(private readonly container: HTMLElement) {
    this.scene.background = new Color(BACKGROUND);
    this.scene.fog = new Fog(BACKGROUND, 30, 62);

    this.renderer = new WebGLRenderer({antialias: true, powerPreference: 'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    container.prepend(this.renderer.domElement);

    this.scene.add(new HemisphereLight(0x8796c0, 0x2a1e14, 0.55));
    this.moon = new DirectionalLight(0xa9b8ff, 0.7);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(2048, 2048);
    this.moon.shadow.bias = -0.0008;
    this.moon.shadow.normalBias = 0.04;
    Object.assign(this.moon.shadow.camera, {left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 60});
    this.scene.add(this.moon, this.moon.target);

    this.lantern = new PointLight(0xffb36b, 28, 16, 1.4);
    this.scene.add(this.lantern);
    for (let i = 0; i < TORCH_LIGHTS; i++) {
      const light = new PointLight(0xff8a3c, 0, 13, 1.6);
      light.position.set(0, -50, 0);
      this.torches.push(light);
      this.scene.add(light);
    }

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.zoom = w < h ? PORTRAIT_ZOOM : 1;
    this.camera.updateProjectionMatrix();
  }

  /** Adds screen shake; amounts stack up to a cap and decay quickly. */
  shake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Snaps the camera onto a point (raid start). */
  snapTo(target: Vec2): void {
    this.focus.set(target.x, 0, target.z);
    this.lookAhead.set(0, 0, 0);
  }

  /** Places the few real torch lights on the torches nearest the player. */
  setTorchSites(sites: readonly Vector3[], focus: Vec2): void {
    const nearest = sites
      .map(site => ({site, d: (site.x - focus.x) ** 2 + (site.z - focus.z) ** 2}))
      .sort((a, b) => a.d - b.d)
      .slice(0, TORCH_LIGHTS);
    this.torches.forEach((light, i) => {
      const entry = nearest[i];
      if (entry) {
        light.position.copy(entry.site);
        light.intensity = 38 * (0.85 + 0.15 * Math.sin(this.time * 11 + i * 2.1) * Math.sin(this.time * 7.3 + i));
      } else {
        light.intensity = 0;
      }
    });
  }

  /**
   * @param light 0..1 lantern strength; the lantern's reach and the fog close in as oil burns.
   */
  update(dt: number, target: Vec2, aim: Vec2 | null, light: number): void {
    this.time += dt;
    const k = 1 - Math.exp(-FOLLOW_RATE * dt);
    this.focus.x += (target.x - this.focus.x) * k;
    this.focus.z += (target.z - this.focus.z) * k;
    if (aim) {
      const ax = Math.max(-LOOK_AHEAD_MAX, Math.min(LOOK_AHEAD_MAX, (aim.x - target.x) * LOOK_AHEAD));
      const az = Math.max(-LOOK_AHEAD_MAX, Math.min(LOOK_AHEAD_MAX, (aim.z - target.z) * LOOK_AHEAD));
      this.lookAhead.x += (ax - this.lookAhead.x) * k * 0.5;
      this.lookAhead.z += (az - this.lookAhead.z) * k * 0.5;
    }
    this.trauma = Math.max(0, this.trauma - SHAKE_DECAY * dt);
    const s = this.trauma * this.trauma * SHAKE_MAX;
    const shakeX = s * Math.sin(this.time * 71.3) * 1.2;
    const shakeY = s * Math.sin(this.time * 53.7 + 1.3);
    const fx = this.focus.x + this.lookAhead.x;
    const fz = this.focus.z + this.lookAhead.z;
    this.camera.position.set(fx + OFFSET.x * this.zoom + shakeX, OFFSET.y * this.zoom + shakeY, fz + OFFSET.z * this.zoom);
    this.camera.lookAt(fx + shakeX * 0.5, 0.8, fz);

    this.moon.position.set(target.x - 8, 20, target.z + 6);
    this.moon.target.position.set(target.x, 0, target.z);
    this.lantern.position.set(target.x, 5.5, target.z + 1.5);
    const strength = 0.35 + 0.65 * Math.sqrt(Math.max(0, light));
    this.lantern.intensity = 28 * strength * (0.95 + 0.05 * Math.sin(this.time * 9));
    this.lantern.distance = 7 + 9 * strength;
    const fog = this.scene.fog as Fog;
    fog.near = 14 + 16 * strength;
    fog.far = 38 + 24 * strength;
  }

  /** Builds every shader the scene needs now, so the first fight never stalls on compiles. */
  warmUp(extras: readonly Object3D[] = []): void {
    const parked = extras.filter(o => !o.parent);
    for (const o of parked) this.scene.add(o);
    this.renderer.compile(this.scene, this.camera);
    for (const o of parked) this.scene.remove(o);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /** World point on the ground plane under a screen position (for mouse aiming). */
  groundPoint(clientX: number, clientY: number): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new Vector3(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1, 0.5);
    ndc.unproject(this.camera);
    const dir = ndc.sub(this.camera.position).normalize();
    const t = (1 - this.camera.position.y) / dir.y;
    return {x: this.camera.position.x + dir.x * t, z: this.camera.position.z + dir.z * t};
  }

  /** Screen pixel position of a world point, for HTML overlays. */
  toScreen(x: number, y: number, z: number): {x: number; y: number; visible: boolean} {
    const v = new Vector3(x, y, z).project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return {x: ((v.x + 1) / 2) * rect.width, y: ((1 - v.y) / 2) * rect.height, visible: v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2};
  }
}
