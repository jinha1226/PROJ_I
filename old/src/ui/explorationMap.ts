import {countKnown} from '../dungeon/fog';
import type {Dungeon, KnownGrid} from '../dungeon/types';
import type {Point, Tile} from '../types';

export interface MapDrawing {
  canvas: Pick<HTMLCanvasElement, 'width' | 'height'>;
  ctx: Pick<CanvasRenderingContext2D, 'fillRect' | 'beginPath' | 'arc' | 'fill' | 'moveTo' | 'lineTo' | 'stroke'> & {
    fillStyle: unknown;
    strokeStyle: unknown;
    lineWidth: number;
  };
  dungeon: Dungeon;
  known: KnownGrid;
  routeHistory: readonly Point[];
  pathfinderSkill: boolean;
  explorer: Tile;
  running: boolean;
  info: Pick<HTMLElement, 'textContent'>;
}

const BACKGROUND = '#080d15';
const KNOWN_TILE = '#465b62';
const PLAYER = '#f0d59d';

export function drawExplorationMap({canvas, ctx, dungeon, known, routeHistory, pathfinderSkill, explorer, running, info}: MapDrawing): void {
  const cw = canvas.width / dungeon.width;
  const ch = canvas.height / dungeon.height;
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = KNOWN_TILE;
  for (let y = 0; y < dungeon.height; y++) {
    for (let x = 0; x < dungeon.width; x++) {
      if (dungeon.grid[y][x] && known[y][x]) ctx.fillRect(x * cw + 1, y * ch + 1, cw - 2, ch - 2);
    }
  }

  if (routeHistory.length > 1) {
    ctx.strokeStyle = pathfinderSkill ? '#6bc8ff' : '#f1a35c';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    routeHistory.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo((x + 0.5) * cw, (y + 0.5) * ch);
      else ctx.lineTo((x + 0.5) * cw, (y + 0.5) * ch);
    });
    ctx.stroke();
  }

  ctx.fillStyle = PLAYER;
  ctx.beginPath();
  ctx.arc((explorer.x + 0.5) * cw, (explorer.y + 0.5) * ch, Math.min(cw, ch) * 0.38, 0, Math.PI * 2);
  ctx.fill();

  const total = dungeon.openTileCount;
  const discovered = countKnown(known);
  const state = discovered === total ? '지도 완성!' : running ? '자동 탐험 중' : '일시정지';
  info.textContent = `${pathfinderSkill ? '길잡이 ON · ' : '길잡이 OFF · '}지도 완성도 ${Math.round((discovered / total) * 100)}% · 발견 ${discovered}/${total}칸 · ${state}`;
}
