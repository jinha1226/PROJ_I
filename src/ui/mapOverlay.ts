import {TILE} from '../config';
import type {Raid} from '../sim/raid';
import {byId} from './dom';

const PX = 14;

/** Full-screen map of explored tiles, extraction points and the player. */
export class MapOverlay {
  private readonly root = byId('mapOverlay');
  private readonly canvas = byId<HTMLCanvasElement>('mapCanvas');

  get open(): boolean {
    return !this.root.hidden;
  }

  toggle(force?: boolean): void {
    this.root.hidden = !(force ?? this.root.hidden);
  }

  draw(raid: Raid): void {
    if (this.root.hidden) return;
    const {map} = raid;
    const c = this.canvas;
    c.width = map.w * PX;
    c.height = map.h * PX;
    const g = c.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, c.width, c.height);
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const i = y * map.w + x;
        if (!raid.explored[i] || !map.tiles[i]) continue;
        g.fillStyle = '#3b3a37';
        g.fillRect(x * PX, y * PX, PX, PX);
        g.fillStyle = '#4a4843';
        g.fillRect(x * PX + 1, y * PX + 1, PX - 2, PX - 2);
      }
    }
    const toPx = (v: number): number => (v / TILE) * PX;
    for (const c2 of raid.containers) {
      if (!raid.explored[Math.floor(c2.z / TILE) * map.w + Math.floor(c2.x / TILE)] || c2.enemyId !== null) continue;
      g.fillStyle = c2.opened ? '#6b5f45' : '#e0b54a';
      g.fillRect(toPx(c2.x) - 2, toPx(c2.z) - 2, 4, 4);
    }
    for (const z of raid.zones) {
      g.strokeStyle = '#59f29a';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(toPx(z.x), toPx(z.z), PX * 0.7, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#59f29a';
      g.font = 'bold 12px Pretendard, sans-serif';
      g.textAlign = 'center';
      g.fillText(z.name, toPx(z.x), toPx(z.z) - PX);
    }
    const p = raid.player;
    g.save();
    g.translate(toPx(p.x), toPx(p.z));
    g.rotate(-p.facing + Math.PI);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(0, -7);
    g.lineTo(5, 5);
    g.lineTo(-5, 5);
    g.closePath();
    g.fill();
    g.restore();
  }
}
