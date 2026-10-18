// 3D 카메라 어댑터: 입력 · 2D 겹침 그리기가 쓰는 Camera 와 같은 모양(x · y · zoom · toScreen · toWorld)을 유지하면서
// 실제 투영은 three.js 카메라로 한다. enabled=false 면 기존 2D 카메라처럼 동작한다.
// ortho=true (픽셀 모드): 원근 없는 카메라 + 픽셀 격자에 맞춰 움직여 도트가 지글거리지 않게 한다.
import * as THREE from 'three';
import { Camera } from '../render/camera';

const FOV = 30;

export class Camera3D extends Camera {
  readonly persp = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
  readonly orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  enabled = true;
  ortho = false;
  /** 픽셀 모드의 픽셀 크기 (화면 픽셀) */
  pixel = 3;
  /** 내려다보는 각도 */
  pitch = THREE.MathUtils.degToRad(52);
  private ray = new THREE.Raycaster();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private v = new THREE.Vector3();

  get three(): THREE.Camera {
    return this.ortho ? this.orthoCam : this.persp;
  }

  get bodyH() {
    return this.enabled ? 4.2 : 2.2;
  }

  /** zoom(초점 거리에서 타일당 픽셀)에 맞춰 카메라를 놓는다. 매 프레임 그리기 전에 */
  sync() {
    if (!this.enabled) return;
    const dir = new THREE.Vector3(0, Math.sin(this.pitch), Math.cos(this.pitch));
    const target = new THREE.Vector3(this.x, 0, this.y);
    if (this.ortho) {
      const c = this.orthoCam;
      const hw = this.w / (2 * this.zoom), hh = this.h / (2 * this.zoom);
      Object.assign(c, { left: -hw, right: hw, top: hh, bottom: -hh });
      // 픽셀 격자에 맞추기: 카메라 평면의 좌우 · 상하 성분을 (픽셀 크기 / zoom) 단위로 반올림
      c.position.copy(target).addScaledVector(dir, 60);
      c.lookAt(target);
      c.updateMatrixWorld();
      const right = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 1);
      const pw = this.pixel / this.zoom;
      const r = target.dot(right), u = target.dot(up);
      const snapped = target.clone().addScaledVector(right, Math.round(r / pw) * pw - r).addScaledVector(up, Math.round(u / pw) * pw - u);
      c.position.copy(snapped).addScaledVector(dir, 60);
      c.lookAt(snapped);
      c.setViewOffset(this.w, this.h, 0, Math.round(this.padBottom / 2 / this.pixel) * this.pixel, this.w, this.h);
      c.updateProjectionMatrix();
      c.updateMatrixWorld();
      return;
    }
    const c = this.persp;
    const dist = this.h / (2 * this.zoom * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    c.aspect = this.w / Math.max(1, this.h);
    c.position.copy(target).addScaledVector(dir, dist);
    c.lookAt(target);
    // 하단 HUD 가 가리는 만큼 화면 중심을 위로
    c.setViewOffset(this.w, this.h, 0, this.padBottom / 2, this.w, this.h);
    c.updateProjectionMatrix();
    c.updateMatrixWorld();
  }

  toScreen(x: number, y: number): [number, number] {
    return this.enabled ? this.toScreenH(x, y, 0) : super.toScreen(x, y);
  }

  toScreenH(x: number, y: number, h: number): [number, number] {
    if (!this.enabled) return super.toScreenH(x, y, h);
    this.v.set(x, h, y).project(this.three);
    return [((this.v.x + 1) / 2) * this.w, ((1 - this.v.y) / 2) * this.h];
  }

  toWorld(sx: number, sy: number): { x: number; y: number } {
    if (!this.enabled) return super.toWorld(sx, sy);
    this.ray.setFromCamera(new THREE.Vector2((sx / this.w) * 2 - 1, -((sy / this.h) * 2 - 1)), this.three);
    const hit = this.ray.ray.intersectPlane(this.ground, this.v);
    return hit ? { x: hit.x, y: hit.z } : { x: this.x, y: this.y };
  }
}
