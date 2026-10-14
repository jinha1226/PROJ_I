import {
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  OrthographicCamera,
  PCFSoftShadowMap,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type Object3D,
  type Vector3,
} from 'three';

const BACKGROUND = 0x111722;
const CAMERA_OFFSET = {x: 11, y: 16, z: 18} as const;
const WIDE_HALF_HEIGHT = 9.5;
const NARROW_HALF_HEIGHT = 11.5;
const NARROW_ASPECT = 0.8;

/** Owns the WebGL renderer, lights and the party-following orthographic camera. */
export class Stage {
  readonly scene = new Scene();
  readonly camera = new OrthographicCamera(-12, 12, 12, -12, 0.1, 100);
  private readonly renderer: WebGLRenderer;

  constructor(private readonly container: HTMLElement) {
    this.scene.background = new Color(BACKGROUND);
    this.scene.fog = new Fog(BACKGROUND, 23, 48);

    this.renderer = new WebGLRenderer({antialias: true});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    container.prepend(this.renderer.domElement);

    this.scene.add(new HemisphereLight(0xc4d6ff, 0x33291d, 2));
    const sun = new DirectionalLight(0xffe2ae, 3);
    sun.position.set(-7, 16, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {left: -16, right: 16, top: 16, bottom: -16});
    this.scene.add(sun);

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    const aspect = w / h;
    const halfHeight = aspect < NARROW_ASPECT ? NARROW_HALF_HEIGHT : WIDE_HALF_HEIGHT;
    Object.assign(this.camera, {left: -halfHeight * aspect, right: halfHeight * aspect, top: halfHeight, bottom: -halfHeight});
    this.camera.updateProjectionMatrix();
  }

  /**
   * Compiles every shader the scene (plus `extras`, e.g. effect samples that
   * only appear mid-fight) will need, so the first fight does not hitch while
   * the GPU builds programs on first use.
   */
  warmUp(extras: readonly Object3D[] = []): void {
    this.renderer.compile(this.scene, this.camera);
    if (!extras.length) return;
    const samples = new Scene();
    samples.add(...extras);
    // Compile against the real scene's lights so the programs match.
    this.renderer.compile(samples, this.camera, this.scene);
    samples.clear();
  }

  /** Shader program count, for spotting compile hitches. */
  get programCount(): number {
    return this.renderer.info.programs?.length ?? 0;
  }

  render(focus: Vector3): void {
    this.camera.position.set(focus.x + CAMERA_OFFSET.x, CAMERA_OFFSET.y, focus.z + CAMERA_OFFSET.z);
    this.camera.lookAt(focus.x, 0, focus.z);
    this.renderer.render(this.scene, this.camera);
  }
}
