import {BackSide, Color, MeshBasicMaterial, type Material, type Mesh, type MeshStandardMaterial, type Object3D, type SkinnedMesh} from 'three';

export type LightingPreset = 'classic' | 'dark' | 'jh';

/** Look-and-feel switches. The visual lab edits these live; the game uses the defaults. */
export interface VisualSettings {
  lighting: LightingPreset;
  /** Character rim light strength, 0 = off. */
  rim: number;
  blobShadows: boolean;
  /** Dark inverted-hull outline thickness around characters, 0 = off. */
  outline: number;
  /** 1 = off, otherwise pixelation size. */
  pixel: number;
  /** Pixel pass edge strengths (environment outlines). */
  normalEdge: number;
  depthEdge: number;
  /** Snap the camera to the pixel grid to stop edge shimmer. */
  pixelSnap: boolean;
  /** Glossy dungeon surfaces that catch highlights from torches. */
  specular: boolean;
  /** Bloom strength on bright lights and effects, 0 = off. */
  bloom: number;
}

export const DEFAULT_VISUAL: VisualSettings = {
  lighting: 'classic',
  rim: 0,
  blobShadows: false,
  outline: 0,
  pixel: 1,
  normalEdge: 0.35,
  depthEdge: 0.45,
  pixelSnap: false,
  specular: false,
  bloom: 0,
};

export const visual: VisualSettings = {...DEFAULT_VISUAL};

/**
 * Shared uniforms: every character material reads these, so toggling rim
 * light or outlines just changes a number (no shader recompiles).
 */
export const sharedUniforms = {
  rimStrength: {value: 0},
  outlineWidth: {value: 0},
};

const RIM_PLAYER = new Color(1.0, 0.85, 0.6);
const RIM_ENEMY = new Color(0.55, 0.75, 1.0);

/** Adds a view-angle rim term to a character's standard material. */
export function installRim(material: MeshStandardMaterial, isPlayer: boolean): void {
  const rimColor = {value: (isPlayer ? RIM_PLAYER : RIM_ENEMY).clone()};
  material.onBeforeCompile = shader => {
    shader.uniforms.rimStrength = sharedUniforms.rimStrength;
    shader.uniforms.rimColor = rimColor;
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', 'uniform float rimStrength;\nuniform vec3 rimColor;\nvoid main() {').replace(
      '#include <opaque_fragment>',
      `float rimTerm = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.5);
        outgoingLight += rimColor * rimStrength * rimTerm;
        #include <opaque_fragment>`,
    );
  };
  // Distinct cache key so rim-patched materials never share a program with plain ones.
  material.customProgramCacheKey = () => 'rim';
}

let outlineMaterial: MeshBasicMaterial | null = null;

/** One shared inverted-hull material: back faces pushed out along normals, drawn black. */
function getOutlineMaterial(): MeshBasicMaterial {
  if (outlineMaterial) return outlineMaterial;
  const m = new MeshBasicMaterial({color: 0x050505, side: BackSide});
  m.onBeforeCompile = shader => {
    shader.uniforms.outlineWidth = sharedUniforms.outlineWidth;
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'uniform float outlineWidth;\nvoid main() {')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\ntransformed += normalize(objectNormal) * outlineWidth;');
  };
  m.customProgramCacheKey = () => 'outline';
  outlineMaterial = m;
  return m;
}

/** Adds an outline shell to every skinned mesh of a character (hidden while width is 0). */
export function addOutlines(root: Object3D): Mesh[] {
  const shells: Mesh[] = [];
  const meshes: SkinnedMesh[] = [];
  root.traverse(n => {
    if ((n as SkinnedMesh).isSkinnedMesh) meshes.push(n as SkinnedMesh);
  });
  for (const mesh of meshes) {
    const shell = mesh.clone() as SkinnedMesh;
    shell.material = getOutlineMaterial() as Material;
    shell.bind(mesh.skeleton, mesh.bindMatrix);
    shell.castShadow = false;
    shell.receiveShadow = false;
    shell.frustumCulled = false;
    shell.renderOrder = -1;
    shell.visible = false;
    mesh.parent?.add(shell);
    shells.push(shell);
  }
  return shells;
}

export function applyCharacterUniforms(v: VisualSettings): void {
  sharedUniforms.rimStrength.value = v.rim;
  sharedUniforms.outlineWidth.value = v.outline;
}
