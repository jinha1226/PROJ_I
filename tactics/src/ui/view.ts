// 보드 그리기 (캔버스 2D). 규칙은 읽기만 한다
import { cellAt } from '../core/board';
import { attackCells } from '../core/enemy';
import type { Battle, TileKind, Unit, Vec } from '../core/types';
import { ENEMIES } from '../data/enemies';

const TILE_COLOR: Record<TileKind, string> = {
  floor: '#2a2722', rock: '#5d5a52', pit: '#050505', lava: '#b8401a', ice: '#a6d4e2',
  water: '#21508f', swamp: '#4a5c22', grass: '#2f6a2b', stairs: '#2a2722',
};
const UNIT_COLOR: Record<Unit['kind'], string> = {
  hero: '#3f86d8', goblin: '#b8443a', archer: '#b8443a', spearman: '#b8443a',
  beetle: '#8a8a2a', lizard: '#d9781f', wolf: '#8a6f55', ogre: '#7d3c98',
};

export interface DrawOpts {
  /** 지금 한 칸 걸어갈 수 있는 칸 */
  moves?: Vec[];
  /** 눌러 본 적이 때릴 수 있는 칸 */
  threat?: Vec[];
  /** 고른 행동의 대상 칸 */
  targets?: Vec[];
  /** 미리보기 중인 대상 */
  selected?: Vec;
  /** 미리보기라면 원래 상태 (피해 숫자를 비교해 보여준다) */
  base?: Battle;
}

export function drawBoard(cv: HTMLCanvasElement, b: Battle, o: DrawOpts = {}): number {
  const dpr = window.devicePixelRatio || 1;
  const cssW = cv.parentElement!.clientWidth;
  const s = Math.floor(cssW / b.w);
  cv.style.width = `${s * b.w}px`;
  cv.style.height = `${s * b.h}px`;
  cv.width = s * b.w * dpr;
  cv.height = s * b.h * dpr;
  const g = cv.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  // 타일
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const c = cellAt(b, { x, y });
      const px = x * s;
      const py = y * s;
      g.fillStyle = TILE_COLOR[c.tile];
      g.fillRect(px, py, s, s);
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
      decorate(g, c.tile, px, py, s);
      if (c.fire > 0) {
        g.fillStyle = 'rgba(255,120,20,0.55)';
        g.fillRect(px, py, s, s);
        flame(g, px, py, s);
      }
      if (c.steam > 0) {
        g.fillStyle = 'rgba(235,235,235,0.5)';
        g.fillRect(px, py, s, s);
      }
      if (c.revert) {
        g.fillStyle = c.revert.tile === 'lava' ? '#ff8a50' : '#b0c070';
        g.font = `bold ${s * 0.28}px sans-serif`;
        g.fillText(String(c.revert.turns), px + s * 0.8, py + s * 0.22);
      }
    }
  }

  // 걸어갈 수 있는 칸
  if (o.moves) {
    g.fillStyle = 'rgba(90,160,255,0.22)';
    for (const p of o.moves) g.fillRect(p.x * s + 2, p.y * s + 2, s - 4, s - 4);
  }

  // 눌러 본 적이 닿는 칸
  if (o.threat) {
    g.fillStyle = 'rgba(255,150,40,0.22)';
    for (const p of o.threat) g.fillRect(p.x * s, p.y * s, s, s);
  }

  // 폭탄벌레 도화선: 다음 턴 터질 3×3
  for (const u of b.units) {
    if (u.dead || u.kind === 'hero' || !u.intent) continue;
    for (const p of attackCells(b, u, u.pos, u.intent)) {
      g.fillStyle = 'rgba(255,40,40,0.38)';
      g.fillRect(p.x * s, p.y * s, s, s);
      g.strokeStyle = 'rgba(255,80,80,0.9)';
      g.lineWidth = 2;
      g.strokeRect(p.x * s + 2, p.y * s + 2, s - 4, s - 4);
      g.lineWidth = 1;
    }
  }

  // 행동 대상
  if (o.targets) {
    for (const p of o.targets) {
      g.strokeStyle = '#f2c94c';
      g.lineWidth = 2;
      g.strokeRect(p.x * s + 4, p.y * s + 4, s - 8, s - 8);
      g.lineWidth = 1;
    }
  }
  if (o.selected) {
    g.fillStyle = 'rgba(242,201,76,0.35)';
    g.fillRect(o.selected.x * s, o.selected.y * s, s, s);
  }

  // 유닛
  for (const u of b.units) {
    if (u.dead) continue;
    drawUnit(g, u, s);
  }

  // 미리보기: 피해 숫자 · 죽음
  if (o.base) {
    for (const u of b.units) {
      const before = o.base.units.find((v) => v.id === u.id);
      if (!before || before.dead) continue;
      const lost = before.hp - Math.max(0, u.hp);
      const cx = u.pos.x * s + s / 2;
      const cy = u.pos.y * s + s / 2;
      if (u.dead) {
        g.strokeStyle = '#f2c94c';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(cx - s * 0.3, cy - s * 0.3);
        g.lineTo(cx + s * 0.3, cy + s * 0.3);
        g.moveTo(cx + s * 0.3, cy - s * 0.3);
        g.lineTo(cx - s * 0.3, cy + s * 0.3);
        g.stroke();
        g.lineWidth = 1;
      }
      if (lost > 0) {
        g.font = `bold ${s * 0.34}px sans-serif`;
        g.fillStyle = '#000';
        g.fillText(`-${lost}`, cx + 1, u.pos.y * s + s * 0.16 + 1);
        g.fillStyle = '#ffd84a';
        g.fillText(`-${lost}`, cx, u.pos.y * s + s * 0.16);
      }
    }
  }
  return s;
}

function drawUnit(g: CanvasRenderingContext2D, u: Unit, s: number): void {
  const cx = u.pos.x * s + s / 2;
  const cy = u.pos.y * s + s / 2;
  g.fillStyle = UNIT_COLOR[u.kind];
  g.beginPath();
  g.arc(cx, cy, s * 0.36, 0, Math.PI * 2);
  g.fill();
  if (u.frozen > 0) {
    g.strokeStyle = '#9ff0ff';
    g.lineWidth = 3;
    g.stroke();
    g.lineWidth = 1;
  }
  g.fillStyle = '#fff';
  g.font = `bold ${s * 0.36}px sans-serif`;
  g.fillText(u.kind === 'hero' ? '나' : ENEMIES[u.kind].glyph, cx, cy + 1);
  // 체력 막대
  const w = s * 0.8;
  const x0 = u.pos.x * s + s * 0.1;
  const y0 = u.pos.y * s + s * 0.86;
  g.fillStyle = '#000';
  g.fillRect(x0, y0, w, s * 0.09);
  g.fillStyle = u.kind === 'hero' ? '#5fd35f' : '#ff6a5a';
  g.fillRect(x0, y0, (w * Math.max(0, u.hp)) / u.maxHp, s * 0.09);
  g.fillStyle = '#fff';
  g.font = `${s * 0.22}px sans-serif`;
  g.fillText(String(Math.max(0, u.hp)), u.pos.x * s + s * 0.84, u.pos.y * s + s * 0.18);
  if (u.stunned > 0 || u.stuck > 0) {
    g.fillStyle = '#ffd84a';
    g.font = `bold ${s * 0.22}px sans-serif`;
    g.fillText(u.stunned > 0 ? '기절' : '물', u.pos.x * s + s * 0.22, u.pos.y * s + s * 0.16);
  }
  if (u.intent) {
    g.fillStyle = '#ff3b3b';
    g.font = `bold ${s * 0.3}px sans-serif`;
    g.fillText('!', u.pos.x * s + s * 0.18, u.pos.y * s + s * 0.2);
  }
}

function decorate(g: CanvasRenderingContext2D, t: TileKind, px: number, py: number, s: number): void {
  if (t === 'rock') {
    g.fillStyle = '#46443e';
    g.fillRect(px + s * 0.15, py + s * 0.15, s * 0.7, s * 0.7);
  } else if (t === 'pit') {
    g.strokeStyle = '#333';
    g.strokeRect(px + s * 0.12, py + s * 0.12, s * 0.76, s * 0.76);
  } else if (t === 'lava') {
    g.fillStyle = '#f07a2a';
    g.fillRect(px + s * 0.2, py + s * 0.3, s * 0.2, s * 0.12);
    g.fillRect(px + s * 0.55, py + s * 0.6, s * 0.25, s * 0.12);
  } else if (t === 'ice') {
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.beginPath();
    g.moveTo(px + s * 0.2, py + s * 0.7);
    g.lineTo(px + s * 0.5, py + s * 0.3);
    g.stroke();
  } else if (t === 'water') {
    g.strokeStyle = 'rgba(160,200,255,0.5)';
    g.beginPath();
    g.moveTo(px + s * 0.15, py + s * 0.5);
    g.quadraticCurveTo(px + s * 0.35, py + s * 0.35, px + s * 0.5, py + s * 0.5);
    g.quadraticCurveTo(px + s * 0.65, py + s * 0.65, px + s * 0.85, py + s * 0.5);
    g.stroke();
  } else if (t === 'swamp') {
    g.fillStyle = '#7fa030';
    g.fillRect(px + s * 0.25, py + s * 0.3, s * 0.1, s * 0.1);
    g.fillRect(px + s * 0.6, py + s * 0.6, s * 0.1, s * 0.1);
  } else if (t === 'grass') {
    g.strokeStyle = '#4f9a3a';
    g.beginPath();
    for (const fx of [0.25, 0.5, 0.75]) {
      g.moveTo(px + s * fx, py + s * 0.75);
      g.lineTo(px + s * (fx - 0.05), py + s * 0.45);
    }
    g.stroke();
  } else if (t === 'stairs') {
    g.fillStyle = '#d8d0b8';
    g.font = `bold ${s * 0.5}px sans-serif`;
    g.fillText('▼', px + s / 2, py + s / 2);
  }
}

function flame(g: CanvasRenderingContext2D, px: number, py: number, s: number): void {
  g.fillStyle = '#ffd34a';
  g.beginPath();
  g.moveTo(px + s * 0.5, py + s * 0.2);
  g.lineTo(px + s * 0.68, py + s * 0.7);
  g.lineTo(px + s * 0.32, py + s * 0.7);
  g.fill();
}
