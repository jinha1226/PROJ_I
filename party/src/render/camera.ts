// 시뮬레이션은 월드 좌표(타일)만 다루고, 화면 투영은 여기서만 한다.
// 시점을 바꾸려면 이 변환 두 개와 렌더러만 교체하면 된다.
export class Camera {
  x = 0;
  y = 0;
  zoom = 44; // 타일당 픽셀
  w = 800;
  h = 600;
  follow = true;
  /** 하단 HUD 가 가리는 높이(px). 화면 중심을 그만큼 위로 올린다 */
  padBottom = 0;

  toScreen(x: number, y: number): [number, number] {
    return [(x - this.x) * this.zoom + this.w / 2, (y - this.y) * this.zoom + (this.h - this.padBottom) / 2];
  }

  toWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.w / 2) / this.zoom + this.x, y: (sy - (this.h - this.padBottom) / 2) / this.zoom + this.y };
  }
}
