// 픽셀 렌더 패스 (데드셀식 3D → 도트): 저해상도로 그리고 정수배로 키운다.
// three 의 RenderPixelatedPass 와 달리 외곽선을 손그림 도트처럼 '바깥쪽 1칸'에, 그 물체 색의 어두운 색조로 찍는다.
// - 바깥 외곽선: 이 칸이 뒤(배경)이고 이웃 칸이 충분히 앞(물체)이면, 그 이웃 색을 어둡게 해서 칠한다
// - 안쪽 면 경계: 법선이 꺾이는 곳을 살짝 밝게 (입체감)
import {
  type Camera, Color, DepthTexture, HalfFloatType, MeshBasicMaterial, MeshNormalMaterial, NearestFilter, OrthographicCamera, PerspectiveCamera, ShaderMaterial,
  Vector4, WebGLRenderTarget, type Scene, type WebGLRenderer,
} from 'three';
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';

export class PixelPass extends Pass {
  private beauty = new WebGLRenderTarget();
  private normals = new WebGLRenderTarget();
  private normalMat = new MeshNormalMaterial();
  /** 적 마스크: 레이어 1(적)만 흰색으로 — 적의 외곽선은 붉은 색조 */
  private mask = new WebGLRenderTarget();
  private maskMat = new MeshBasicMaterial({ color: 0xffffff });
  private quad: FullScreenQuad;
  private mat: ShaderMaterial;
  private w = 1;
  private h = 1;

  constructor(public pixelSize: number, private scene: Scene, public camera: Camera) {
    super();
    for (const t of [this.beauty, this.normals, this.mask]) {
      t.texture.minFilter = t.texture.magFilter = NearestFilter;
      t.texture.type = HalfFloatType;
    }
    this.beauty.depthTexture = new DepthTexture(1, 1);
    this.mat = new ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, tDepth: { value: null }, tNormal: { value: null }, tMask: { value: null },
        resolution: { value: new Vector4() },
        near: { value: 0.1 }, far: { value: 100 },
        /** 바깥 외곽선이 생기는 깊이 차 (월드 단위) */
        edge: { value: 0.12 },
        /** 외곽선 색 = 물체 색 × ink */
        ink: { value: 0.28 },
        normalLight: { value: 0.12 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform sampler2D tNormal; uniform sampler2D tMask;
        uniform vec4 resolution; uniform float near; uniform float far; uniform float edge; uniform float ink; uniform float normalLight;
        varying vec2 vUv;
        // 직교 카메라 깊이는 선형: 월드 단위로 바꾼다
        float depthAt(vec2 o) { return texture2D(tDepth, vUv + o * resolution.zw).r * (far - near); }
        vec3 normalAt(vec2 o) { return texture2D(tNormal, vUv + o * resolution.zw).rgb * 2.0 - 1.0; }
        void main() {
          vec4 c = texture2D(tDiffuse, vUv);
          float d = depthAt(vec2(0.0));
          // 바깥 외곽선: 가장 앞쪽 이웃을 찾아, 충분히 앞이면 그 색을 어둡게
          vec2 offs[4];
          offs[0] = vec2(1.0, 0.0); offs[1] = vec2(-1.0, 0.0); offs[2] = vec2(0.0, 1.0); offs[3] = vec2(0.0, -1.0);
          float best = 0.0; vec2 bo = vec2(0.0);
          for (int i = 0; i < 4; i++) {
            float diff = d - depthAt(offs[i]);
            if (diff > best) { best = diff; bo = offs[i]; }
          }
          if (best > edge) {
            vec3 nc = texture2D(tDiffuse, vUv + bo * resolution.zw).rgb;
            float foe = texture2D(tMask, vUv + bo * resolution.zw).r;
            gl_FragColor = vec4(mix(nc * ink, vec3(0.2, 0.01, 0.02), foe * 0.75), 1.0);
            return;
          }
          // 안쪽 면 경계: 법선이 크게 꺾이고 내가 더 앞이면 살짝 밝게
          vec3 n = normalAt(vec2(0.0));
          float ne = 0.0;
          for (int i = 0; i < 4; i++) {
            vec3 m = normalAt(offs[i]);
            float dd = depthAt(offs[i]) - d;
            if (dd > -0.02 && dot(n - m, vec3(1.0)) > 0.25) ne = max(ne, 1.0 - dot(n, m));
          }
          gl_FragColor = vec4(c.rgb * (1.0 + normalLight * step(0.15, ne)), c.a);
        }`,
    });
    this.quad = new FullScreenQuad(this.mat);
  }

  setSize(width: number, height: number) {
    this.w = width;
    this.h = height;
    const x = Math.max(1, (width / this.pixelSize) | 0), y = Math.max(1, (height / this.pixelSize) | 0);
    this.beauty.setSize(x, y);
    this.normals.setSize(x, y);
    this.mask.setSize(x, y);
    this.mat.uniforms.resolution.value.set(x, y, 1 / x, 1 / y);
  }

  setPixelSize(px: number) {
    this.pixelSize = px;
    this.setSize(this.w, this.h);
  }

  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget) {
    const u = this.mat.uniforms;
    const cam = this.camera as OrthographicCamera | PerspectiveCamera;
    u.near.value = cam.near;
    u.far.value = cam.far;
    renderer.setRenderTarget(this.beauty);
    renderer.render(this.scene, this.camera);
    const old = this.scene.overrideMaterial;
    this.scene.overrideMaterial = this.normalMat;
    renderer.setRenderTarget(this.normals);
    renderer.render(this.scene, this.camera);
    // 적 마스크
    const layers = this.camera.layers.mask;
    const bg = this.scene.background;
    this.scene.background = null;
    this.camera.layers.set(1);
    this.scene.overrideMaterial = this.maskMat;
    renderer.setRenderTarget(this.mask);
    const cc = renderer.getClearColor(new Color()), ca = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    renderer.setClearColor(cc, ca);
    this.camera.layers.mask = layers;
    this.scene.background = bg;
    this.scene.overrideMaterial = old;
    u.tMask.value = this.mask.texture;
    u.tDiffuse.value = this.beauty.texture;
    u.tDepth.value = this.beauty.depthTexture;
    u.tNormal.value = this.normals.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (!this.renderToScreen && this.clear) renderer.clear();
    this.quad.render(renderer);
  }

  dispose() {
    this.beauty.dispose();
    this.normals.dispose();
    this.mask.dispose();
    this.maskMat.dispose();
    this.mat.dispose();
    this.normalMat.dispose();
    this.quad.dispose();
  }
}
