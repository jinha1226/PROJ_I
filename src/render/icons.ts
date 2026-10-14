import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Group,
  Matrix4,
  OrthographicCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from 'three';
import {allItemDefs, type ItemDef} from '../items/catalog';
import type {AssetLibrary, PropName} from './assets';

const CELL_PX = 96;
const VIEW_DIR = new Vector3(0.35, 0.45, 1).normalize();

function iconSource(def: ItemDef, assets: AssetLibrary): Object3D | null {
  const model = def.icon.model;
  if (!model) return null;
  if (model.startsWith('knight:')) {
    const node = assets.characters.get('Knight')?.scene.getObjectByName(model.slice(7));
    return node ? node.clone() : null;
  }
  if (model.startsWith('prop:')) return assets.props.get(model.slice(5) as PropName)?.clone() ?? null;
  return assets.pieces.get(model)?.clone() ?? null;
}

/** Rotates the object so its longest side runs along the icon's longer screen axis. */
function orient(obj: Object3D, def: ItemDef): void {
  const size = new Box3().setFromObject(obj).getSize(new Vector3());
  const longest = size.x >= size.y && size.x >= size.z ? 'x' : size.y >= size.z ? 'y' : 'z';
  const target = def.h > def.w ? 'y' : def.w > def.h ? 'x' : null;
  if (!target || longest === target) {
    if (!target) obj.rotation.y = -0.5;
    return;
  }
  if (target === 'y') {
    if (longest === 'x') obj.rotation.z = Math.PI / 2;
    else obj.rotation.x = Math.PI / 2;
  } else if (longest === 'y') {
    obj.rotation.z = Math.PI / 2;
  } else {
    obj.rotation.y = Math.PI / 2;
  }
  // A slight diagonal tilt reads better than a perfectly straight blade.
  obj.rotation.z += target === 'y' ? 0.25 : 0;
}

/** Fits an orthographic camera around the object's projected bounds at the icon's aspect. */
function frame(camera: OrthographicCamera, obj: Object3D, aspect: number): void {
  const box = new Box3().setFromObject(obj);
  const center = box.getCenter(new Vector3());
  camera.position.copy(center).addScaledVector(VIEW_DIR, 20);
  camera.lookAt(center);
  camera.updateMatrixWorld();
  const view = new Matrix4().copy(camera.matrixWorldInverse);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < 8; i++) {
    const p = new Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(view);
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  let w = (maxX - minX) * 1.12;
  let h = (maxY - minY) * 1.12;
  if (w / h > aspect) h = w / aspect;
  else w = h * aspect;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  Object.assign(camera, {left: cx - w / 2, right: cx + w / 2, top: cy + h / 2, bottom: cy - h / 2, near: 0.1, far: 60});
  camera.updateProjectionMatrix();
}

/** Renders every model-backed item once into a data URL (defId → URL). */
export function renderItemIcons(assets: AssetLibrary): Map<string, string> {
  const icons = new Map<string, string>();
  const canvas = document.createElement('canvas');
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({canvas, alpha: true, antialias: true, preserveDrawingBuffer: true});
  } catch {
    return icons;
  }
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  scene.add(new AmbientLight(0xffffff, 1.6));
  const key = new DirectionalLight(0xffffff, 2.4);
  key.position.set(2, 4, 5);
  scene.add(key);
  const camera = new OrthographicCamera();
  for (const def of allItemDefs()) {
    const obj = iconSource(def, assets);
    if (!obj) continue;
    obj.position.set(0, 0, 0);
    obj.rotation.set(0, 0, 0);
    obj.scale.setScalar(1);
    const holder = new Group();
    holder.add(obj);
    orient(obj, def);
    scene.add(holder);
    renderer.setSize(CELL_PX * def.w, CELL_PX * def.h, false);
    frame(camera, holder, def.w / def.h);
    renderer.render(scene, camera);
    icons.set(def.id, canvas.toDataURL('image/png'));
    scene.remove(holder);
  }
  renderer.dispose();
  renderer.forceContextLoss();
  return icons;
}
