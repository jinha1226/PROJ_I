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

  /** 유닛 몸 높이 (반지름 배수). 클릭 판정용 */
  get bodyH() {
    return 2.2;
  }

  /** 바닥에서 h(타일) 높이에 있는 점의 화면 좌표. 2D 에선 위로 h 타일만큼 */
  toScreenH(x: number, y: number, h: number): [number, number] {
    const [sx, sy] = this.toScreen(x, y);
    return [sx, sy - h * this.zoom];
  }

  toWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.w / 2) / this.zoom + this.x, y: (sy - (this.h - this.padBottom) / 2) / this.zoom + this.y };
  }
}
