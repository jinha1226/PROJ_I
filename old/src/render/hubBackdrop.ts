import {IcosahedronGeometry, Mesh, MeshBasicMaterial, PointLight, type Scene} from 'three';
import {BlockBuilder} from './blocks';

interface Theme {
  name: string;
  floor: number;
  alt: number;
  wall: number;
  accent: number;
  torch: number;
}

const THEMES: readonly Theme[] = [
  {name: '석조 유적', floor: 0x4d5960, alt: 0x303c43, wall: 0x303c43, accent: 0x738087, torch: 0xffaa55},
  {name: '붉은 폐허', floor: 0x66504a, alt: 0x473332, wall: 0x493c3a, accent: 0xa27861, torch: 0xff7542},
  {name: '이끼 낀 성소', floor: 0x4b6256, alt: 0x324b42, wall: 0x35463e, accent: 0x73917b, torch: 0x99d976},
  {name: '서리의 전당', floor: 0x5c7584, alt: 0x405969, wall: 0x394f61, accent: 0x9ab8c9, torch: 0x79c9ff},
];

const WOOD = 0x77523a;
type Obstacle = readonly [x: number, z: number, hx: number, hz: number];
const OBSTACLE_LAYOUTS: readonly (readonly Obstacle[])[] = [
  [[0, 0, 1.2, 1.2]],
  [[-2, 0, 0.8, 1], [2, 0, 0.8, 1]],
  [[0, -1.6, 1.6, 0.5], [0, 1.6, 1.6, 0.5]],
  [[-2, -1, 0.8, 0.8], [2, 1, 0.8, 0.8]],
  [[0, 0, 0.7, 2.2]],
];

const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

/**
 * The themed stone chamber shown behind the hub before the first expedition.
 * Its theme name is also part of the status line.
 */
export class HubBackdrop {
  private blocks: BlockBuilder | null = null;
  private extras: (Mesh | PointLight)[] = [];
  theme = '';

  constructor(private readonly scene: Scene) {}

  build(): void {
    this.dispose();
    const theme = pick(THEMES);
    this.theme = theme.name;
    const blocks = (this.blocks = new BlockBuilder(this.scene, 1, true));
    const {floor, alt, wall, accent} = theme;

    blocks.add(18, 0.35, 14, 0, -0.24, 0, floor);
    const pattern = Math.floor(Math.random() * 3);
    for (let x = -8; x <= 8; x += 2) {
      for (let z = -6; z <= 6; z += 2) {
        const mixed = pattern === 0 ? (x + z) % 4 === 0 : pattern === 1 ? (Math.abs(x) + Math.abs(z)) % 6 === 0 : Math.random() < 0.25;
        blocks.add(1.92, 0.045, 1.92, x, -0.035, z, mixed ? alt : floor);
      }
    }
    for (let x = -9; x <= 9; x += 2) {
      blocks.add(2, 2.6, 0.7, x, 1.3, -7.4, wall);
      blocks.add(2, 0.5, 0.85, x, 2.7, -7.4, accent);
    }
    for (let z = -7; z <= 7; z += 2) {
      for (const x of [-9.3, 9.3]) {
        blocks.add(0.7, 2.6, 2, x, 1.3, z, wall);
        blocks.add(0.85, 0.5, 2, x, 2.7, z, accent);
      }
    }
    const pillarX = Math.random() < 0.5 ? [-7.7, 7.7] : [-6.8, 6.8];
    for (const x of pillarX) {
      for (const z of [-5.8, 5.8]) {
        blocks.add(0.95, 2.8, 0.95, x, 1.4, z, accent);
        blocks.add(1.25, 0.35, 1.25, x, 2.85, z, floor);
      }
    }
    for (const x of [-7.4, 7.4]) {
      blocks.add(0.28, 1.5, 0.28, x, 0.75, -5.6, WOOD);
      const flame = new Mesh(new IcosahedronGeometry(0.28, 0), new MeshBasicMaterial({color: theme.torch}));
      flame.position.set(x, 1.65, -5.6);
      const light = new PointLight(theme.torch, 6, 10);
      light.position.copy(flame.position);
      this.scene.add(flame, light);
      this.extras.push(flame, light);
    }
    for (const [x, z, hx, hz] of pick(OBSTACLE_LAYOUTS)) {
      blocks.add(hx * 2, 1.6, hz * 2, x, 0.8, z, wall);
      blocks.add(hx * 2 + 0.18, 0.2, hz * 2 + 0.18, x, 1.65, z, accent);
    }
    for (let i = 0; i < 4; i++) {
      const x = (i % 2 ? 1 : -1) * (6.2 + Math.random() * 0.8);
      const z = (i < 2 ? 1 : -1) * (4.7 + Math.random() * 0.5);
      blocks.add(0.45 + Math.random() * 0.55, 0.18 + Math.random() * 0.3, 0.5, x, 0.06, z, alt);
    }
  }

  dispose(): void {
    this.blocks?.dispose();
    this.blocks = null;
    for (const extra of this.extras) {
      this.scene.remove(extra);
      if (extra instanceof Mesh) {
        extra.geometry.dispose();
        (extra.material as MeshBasicMaterial).dispose();
      }
    }
    this.extras = [];
  }
}
