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
  Vector2,
  Vector3,
  WebGLRenderer,
  type Camera,
  type Object3D,
} from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {RenderPixelatedPass} from 'three/addons/postprocessing/RenderPixelatedPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {applyCharacterUniforms, type LightingPreset, type VisualSettings} from './visual';
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

interface LightRig {
  background: number;
  hemi: number;
  sky: number;
  ground: number;
  moon: number;
  lantern: number;
  lanternReach: number;
  lanternDecay: number;
  torch: number;
  torchReach: number;
  torchDecay: number;
  exposure: number;
  fogNear: number;
  fogFar: number;
}

/** 'dark' is the high-contrast look: almost no ambient, strong local light pools. */
const RIGS: Readonly<Record<LightingPreset, LightRig>> = {
  classic: {background: 0x07080c, hemi: 0.55, sky: 0x8796c0, ground: 0x2a1e14, moon: 0.7, lantern: 28, lanternReach: 16, lanternDecay: 1.4, torch: 38, torchReach: 13, torchDecay: 1.6, exposure: 0.95, fogNear: 30, fogFar: 62},
  dark: {background: 0x010102, hemi: 0.03, sky: 0x8796c0, ground: 0x2a1e14, moon: 0.12, lantern: 48, lanternReach: 12, lanternDecay: 2, torch: 42, torchReach: 8.5, torchDecay: 2, exposure: 1.05, fogNear: 16, fogFar: 40},
  // Jupiter Hell-like: what you can see stays readable under a cool blue-grey base,
  // bright local light pools do the drama, and the void beyond is black.
  jh: {background: 0x000000, hemi: 0.42, sky: 0x7d90b8, ground: 0x1c2030, moon: 0.45, lantern: 34, lanternReach: 17, lanternDecay: 1.5, torch: 60, torchReach: 13, torchDecay: 1.5, exposure: 1.0, fogNear: 22, fogFar: 44},
};
const PIXEL_KEY = 'proj_i_pixel_size';
/** Pixel size steps the toggle cycles through (1 = off). */
export const PIXEL_STEPS = [1, 3, 4] as const;

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
  /** Directional camera nudge (swings, hits) that springs back. */
  private readonly kickOffset = new Vector3();
  private combatZoom = 1;
  private combatTarget = 1;
  /** Extra distance multiplier for modes that need a wider view (boss raid). */
  private baseZoom = 1;
  private zoom = 1;
  private time = 0;
  private composer: EffectComposer | null = null;
  private pixelPass: RenderPixelatedPass | null = null;
  private pixelSize = 1;
  private bloom = 0;
  private bloomPass: UnrealBloomPass | null = null;
  private basePass: RenderPass | RenderPixelatedPass | null = null;
  private rig: LightRig = RIGS.classic;
  private readonly hemi: HemisphereLight;
  private pixelSnap = false;

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

    this.hemi = new HemisphereLight(0x8796c0, 0x2a1e14, 0.55);
    this.scene.add(this.hemi);
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
    let saved = 1;
    try {
      saved = Number(localStorage.getItem(PIXEL_KEY)) || 1;
    } catch {
      // Storage blocked: keep the default.
    }
    this.setPixelSize(saved);
  }

  /** Applies a full set of look-and-feel options (used by the visual lab). */
  applyVisual(v: VisualSettings): void {
    this.rig = RIGS[v.lighting];
    const bg = this.scene.background as Color;
    bg.setHex(this.rig.background);
    (this.scene.fog as Fog).color.setHex(this.rig.background);
    this.hemi.intensity = this.rig.hemi;
    this.hemi.color.setHex(this.rig.sky);
    this.hemi.groundColor.setHex(this.rig.ground);
    this.moon.intensity = this.rig.moon;
    this.renderer.toneMappingExposure = this.rig.exposure;
    for (const t of this.torches) {
      t.distance = this.rig.torchReach;
      t.decay = this.rig.torchDecay;
    }
    this.lantern.decay = this.rig.lanternDecay;
    applyCharacterUniforms(v);
    if (v.pixel !== this.pixelSize || v.bloom !== this.bloom) {
      this.bloom = v.bloom;
      this.setPixelSize(v.pixel, false);
    }
    if (this.bloomPass) this.bloomPass.strength = v.bloom;
    if (this.pixelPass) {
      this.pixelPass.normalEdgeStrength = v.normalEdge;
      this.pixelPass.depthEdgeStrength = v.depthEdge;
    }
    this.pixelSnap = v.pixelSnap;
  }

  get pixel(): number {
    return this.pixelSize;
  }

  /**
   * Retro pixel look: renders at 1/size resolution with crisp edge outlines
   * (three.js RenderPixelatedPass). 1 turns it off.
   */
  setPixelSize(size: number, persist = true): void {
    this.pixelSize = Math.max(1, Math.round(size));
    try {
      if (persist) localStorage.setItem(PIXEL_KEY, String(this.pixelSize));
    } catch {
      // ignore
    }
    this.rebuildPipeline();
  }

  /**
   * Post-processing chain: (pixelated or plain render) → optional bloom → output
   * (tone mapping + sRGB). With neither effect the renderer draws directly.
   */
  private rebuildPipeline(): void {
    this.composer?.dispose();
    this.composer = null;
    this.pixelPass = null;
    this.bloomPass = null;
    this.basePass = null;
    const pixel = this.pixelSize > 1;
    // The pixel pass does its own downscaling; render it at 1:1 device pixels.
    this.renderer.setPixelRatio(pixel ? 1 : Math.min(window.devicePixelRatio, 1.75));
    if (!pixel && this.bloom <= 0) {
      this.resize();
      return;
    }
    this.composer = new EffectComposer(this.renderer);
    if (pixel) {
      this.pixelPass = new RenderPixelatedPass(this.pixelSize, this.scene, this.camera, {normalEdgeStrength: 0.35, depthEdgeStrength: 0.45});
      this.basePass = this.pixelPass;
    } else {
      this.basePass = new RenderPass(this.scene, this.camera);
    }
    this.composer.addPass(this.basePass);
    if (this.bloom > 0) {
      this.bloomPass = new UnrealBloomPass(new Vector2(this.container.clientWidth || 1, this.container.clientHeight || 1), this.bloom, 0.45, 0.82);
      this.composer.addPass(this.bloomPass);
    }
    this.composer.addPass(new OutputPass());
    this.resize();
  }

  /** Renders any scene/camera pair through the active pipeline (raid or camp). */
  renderScene(scene: Scene, camera: Camera): void {
    if (this.composer && this.basePass) {
      this.basePass.scene = scene;
      this.basePass.camera = camera;
      this.composer.render();
    } else {
      this.renderer.render(scene, camera);
    }
  }

  resize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    this.zoom = w < h ? PORTRAIT_ZOOM : 1;
    this.camera.updateProjectionMatrix();
  }

  /** Adds screen shake; amounts stack up to a cap and decay quickly. */
  shake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  kick(dirX: number, dirZ: number, amount: number): void {
    this.kickOffset.x += dirX * amount;
    this.kickOffset.z += dirZ * amount;
  }

  setBaseZoom(z: number): void {
    this.baseZoom = z;
  }

  /** Pulls the camera in a little while fighting, back out when calm. */
  setCombat(engaged: boolean): void {
    this.combatTarget = engaged ? 0.84 : 1;
  }

  /** Snaps the camera onto a point (raid start). */
  snapTo(target: Vec2): void {
    this.focus.set(target.x, 0, target.z);
    this.lookAhead.set(0, 0, 0);
  }

  /** Places the few real torch lights on the torches nearest the player. */
  setTorchSites(sites: readonly Vector3[], focus: Vec2, colors: readonly number[] = []): void {
    const nearest = sites
      .map((site, i) => ({site, color: colors[i] ?? 0xff8a3c, d: (site.x - focus.x) ** 2 + (site.z - focus.z) ** 2}))
      .sort((a, b) => a.d - b.d)
      .slice(0, TORCH_LIGHTS);
    this.torches.forEach((light, i) => {
      const entry = nearest[i];
      if (entry) {
        light.position.copy(entry.site);
        light.color.setHex(entry.color);
        light.intensity = this.rig.torch * (0.85 + 0.15 * Math.sin(this.time * 11 + i * 2.1) * Math.sin(this.time * 7.3 + i));
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
    this.kickOffset.multiplyScalar(Math.exp(-14 * dt));
    this.combatZoom += (this.combatTarget - this.combatZoom) * (1 - Math.exp(-2.5 * dt));
    const zoom = this.zoom * this.combatZoom * this.baseZoom;
    let fx = this.focus.x + this.lookAhead.x + this.kickOffset.x;
    let fz = this.focus.z + this.lookAhead.z + this.kickOffset.z;
    if (this.pixelSnap && this.pixelSize > 1) [fx, fz] = this.snapToPixels(fx, fz, zoom);
    this.camera.position.set(fx + OFFSET.x * zoom + shakeX, OFFSET.y * zoom + shakeY, fz + OFFSET.z * zoom);
    this.camera.lookAt(fx + shakeX * 0.5, 0.8, fz);

    this.moon.position.set(target.x - 8, 20, target.z + 6);
    this.moon.target.position.set(target.x, 0, target.z);
    this.lantern.position.set(target.x, 5.5, target.z + 1.5);
    const strength = 0.35 + 0.65 * Math.sqrt(Math.max(0, light));
    const rig = this.rig;
    this.lantern.intensity = rig.lantern * strength * (0.95 + 0.05 * Math.sin(this.time * 9));
    this.lantern.distance = rig.lanternReach * (0.45 + 0.55 * strength);
    const fog = this.scene.fog as Fog;
    fog.near = rig.fogNear * (0.5 + 0.5 * strength);
    fog.far = rig.fogFar * (0.62 + 0.38 * strength);
  }

  /**
   * Moves the camera in whole low-res pixels so static edges stop shimmering.
   * Screen x maps to world x; screen y maps to world z scaled by the view pitch.
   */
  private snapToPixels(fx: number, fz: number, zoom: number): [number, number] {
    const distance = Math.hypot(OFFSET.y, OFFSET.z) * zoom;
    const rows = Math.max(1, (this.container.clientHeight || window.innerHeight) / this.pixelSize);
    const worldPerPixel = (2 * distance * Math.tan((this.camera.fov * Math.PI) / 360)) / rows;
    const pitch = Math.atan2(OFFSET.y, OFFSET.z);
    const stepZ = worldPerPixel / Math.sin(pitch);
    return [Math.round(fx / worldPerPixel) * worldPerPixel, Math.round(fz / stepZ) * stepZ];
  }

  /** Builds every shader the scene needs now, so the first fight never stalls on compiles. */
  warmUp(extras: readonly Object3D[] = []): void {
    const parked = extras.filter(o => !o.parent);
    for (const o of parked) this.scene.add(o);
    this.renderer.compile(this.scene, this.camera);
    for (const o of parked) this.scene.remove(o);
  }

  render(): void {
    this.renderScene(this.scene, this.camera);
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
