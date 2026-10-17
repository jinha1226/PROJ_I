// 3/4 탑다운 렌더러: 정사각 타일 + 세워서 그린 유닛, Y축 정렬.
import { dist } from '../core/rng';
import { unitsInArea } from '../sim/abilities';
import type { AbilityDef } from '../sim/defs';
import type { Unit } from '../sim/unit';
import type { World } from '../sim/world';
import type { UiState } from '../ui/state';
import type { Camera } from './camera';

const C = {
  floorA: '#433d36',
  floorB: '#48413a',
  floorLine: 'rgba(0,0,0,0.18)',
  wallTop: '#6b6a78',
  wallEdge: '#8a899a',
  wallFront: '#3b3a46',
  fog: 'rgba(5,5,9,0.5)',
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement, private cam: Camera) {
    this.ctx = canvas.getContext('2d')!;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cam.w = window.innerWidth;
    this.cam.h = window.innerHeight;
  }

  draw(w: World, ui: UiState) {
    const ctx = this.ctx, cam = this.cam, z = cam.zoom;
    ctx.fillStyle = '#07070b';
    ctx.fillRect(0, 0, cam.w, cam.h);

    this.drawTiles(w);
    this.drawStairs(w);

    // ── 바닥 표시 (예고 범위, 고수 지점, 선택 원) ──
    for (const u of w.units) if (u.alive && u.cast) this.drawCastArea(w, u);
    for (const u of w.party) {
      if (!u.alive || !u.holdPos) continue;
      const [sx, sy] = cam.toScreen(u.holdPos.x, u.holdPos.y);
      ctx.strokeStyle = u.def.color + '88';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx - 5, sy - 5); ctx.lineTo(sx + 5, sy + 5);
      ctx.moveTo(sx + 5, sy - 5); ctx.lineTo(sx - 5, sy + 5);
      ctx.stroke();
    }
    for (const u of ui.selected) if (u.alive) this.ring(u, '#66ff88', 2);
    if (ui.hover && ui.hover.alive) this.ring(ui.hover, ui.hover.faction === 'party' ? '#ffffffaa' : '#ff6666aa', 1.5);
    if (w.focusTarget) this.drawFocus(w, w.focusTarget);
    if (ui.targeting) this.drawTargeting(w, ui);

    // ── 명령선: 선택된 유닛, 또는 일시정지 중엔 모든 파티원 ──
    for (const u of w.party) {
      if (!u.alive) continue;
      if (ui.paused || ui.selected.includes(u)) this.drawCommandLine(u);
    }

    // ── 유닛 (Y 정렬) ──
    const units = w.units
      .filter((u) => u.faction === 'party' || w.isVisible(u) || !u.alive)
      .sort((a, b) => a.y - b.y);
    for (const u of units) this.drawUnit(w, u);

    // ── 투사체 / 이펙트 ──
    for (const p of w.projectiles) {
      const [sx, sy] = cam.toScreen(p.x, p.y - 0.45);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(2, p.size * z), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    for (const f of w.fx) {
      const k = f.t! / f.dur;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = f.color;
      if (f.kind === 'ring') {
        const [sx, sy] = cam.toScreen(f.x, f.y);
        ctx.lineWidth = 3;
        ctx.fillStyle = f.color + '33';
        ctx.beginPath();
        ctx.ellipse(sx, sy, f.r * z * (0.6 + 0.4 * k), f.r * z * (0.6 + 0.4 * k), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (f.kind === 'slash') {
        const [sx, sy] = cam.toScreen(f.x, f.y);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(sx, sy, f.r * z, -0.9 + k, 0.6 + k);
        ctx.stroke();
      } else if (f.kind === 'trail') {
        const [ax, ay] = cam.toScreen(f.x, f.y - 0.4);
        const [bx, by] = cam.toScreen(f.x2!, f.y2! - 0.4);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // ── 드래그 미리보기 ──
    const d = ui.drag;
    if (d?.kind === 'unit' && d.moved) {
      const [ax, ay] = cam.toScreen(d.unit.x, d.unit.y);
      const tgt = ui.hover;
      const col = tgt && tgt.faction !== 'party' ? '#ff5555' : '#66ff88';
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(d.cx, d.cy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(d.cx, d.cy, 8, 0, Math.PI * 2);
      ctx.stroke();
    } else if (d?.kind === 'box' && d.moved) {
      ctx.strokeStyle = '#66ff88';
      ctx.fillStyle = 'rgba(102,255,136,0.08)';
      ctx.lineWidth = 1;
      ctx.fillRect(d.sx, d.sy, d.cx - d.sx, d.cy - d.sy);
      ctx.strokeRect(d.sx, d.sy, d.cx - d.sx, d.cy - d.sy);
    }

    for (const m of ui.marks) {
      const [sx, sy] = cam.toScreen(m.x, m.y);
      ctx.globalAlpha = 1 - m.t / 0.5;
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 6 + m.t * 30, (6 + m.t * 30) * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ── 떠오르는 숫자 ──
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of w.floaters) {
      const [sx, sy] = cam.toScreen(f.x, f.y);
      ctx.globalAlpha = Math.min(1, 1.6 - f.t * 1.4);
      ctx.font = `bold ${Math.round(13 * f.scale * Math.min(1.2, z / 40))}px sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000';
      ctx.strokeText(f.text, sx, sy);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, sx, sy);
      ctx.globalAlpha = 1;
    }

    if (ui.paused) {
      ctx.strokeStyle = 'rgba(255,204,102,0.55)';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, cam.w - 6, cam.h - 6);
    }
  }

  private drawTiles(w: World) {
    const ctx = this.ctx, cam = this.cam, z = cam.zoom, m = w.map;
    const tl = cam.toWorld(0, 0), br = cam.toWorld(cam.w, cam.h);
    const x0 = Math.max(0, Math.floor(tl.x)), x1 = Math.min(m.w - 1, Math.ceil(br.x));
    const y0 = Math.max(0, Math.floor(tl.y)), y1 = Math.min(m.h - 1, Math.ceil(br.y));
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++) {
        const i = ty * m.w + tx;
        if (!w.seen[i]) continue;
        const [sx, sy] = cam.toScreen(tx, ty);
        const s = Math.ceil(z) + 0.5;
        if (m.isWall(tx, ty)) {
          // 3/4 시점: 아래가 바닥이면 벽 앞면을 그린다
          const frontVisible = !m.isWall(tx, ty + 1);
          const topH = frontVisible ? z * 0.55 : s;
          ctx.fillStyle = C.wallTop;
          ctx.fillRect(sx, sy, s, topH);
          // 바닥과 맞닿은 윗면 가장자리를 밝게
          ctx.fillStyle = C.wallEdge;
          if (!m.isWall(tx, ty - 1)) ctx.fillRect(sx, sy, s, 2);
          if (!m.isWall(tx - 1, ty)) ctx.fillRect(sx, sy, 2, topH);
          if (!m.isWall(tx + 1, ty)) ctx.fillRect(sx + z - 2, sy, 2, topH);
          if (frontVisible) {
            ctx.fillStyle = C.wallFront;
            ctx.fillRect(sx, sy + z * 0.55, s, z * 0.45 + 0.5);
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(sx, sy + z * 0.55, s, 2);
          }
        } else {
          ctx.fillStyle = (tx * 7 + ty * 13) % 3 ? C.floorA : C.floorB;
          ctx.fillRect(sx, sy, s, s);
          ctx.fillStyle = C.floorLine;
          ctx.fillRect(sx, sy, s, 1);
          ctx.fillRect(sx, sy, 1, s);
        }
        if (!w.visible[i]) {
          ctx.fillStyle = C.fog;
          ctx.fillRect(sx, sy, s, s);
        }
      }
  }

  /** 내려가는 계단: 계단 칸 + 아래 화살표 */
  private drawStairs(w: World) {
    const st = w.stairs;
    if (!st || !w.seen[Math.floor(st.y) * w.map.w + Math.floor(st.x)]) return;
    const ctx = this.ctx, z = this.cam.zoom;
    const [sx, sy] = this.cam.toScreen(Math.floor(st.x), Math.floor(st.y));
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#2a3a52' : '#3d5578';
      ctx.fillRect(sx + z * 0.1, sy + z * (0.1 + i * 0.2), z * 0.8, z * 0.2);
    }
    const pulse = 0.6 + Math.sin(w.time * 3) * 0.25;
    ctx.strokeStyle = `rgba(136, 204, 255, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, z - 2, z - 2);
    ctx.fillStyle = '#cfe6ff';
    ctx.font = `bold ${Math.round(z * 0.32)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▼', sx + z / 2, sy + z / 2);
  }

  private ring(u: Unit, color: string, width: number) {
    const ctx = this.ctx;
    const [sx, sy] = this.cam.toScreen(u.x, u.y);
    const r = u.radius * this.cam.zoom * 1.25;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawFocus(w: World, t: Unit) {
    if (!t.alive || !w.isVisible(t)) return;
    const ctx = this.ctx, z = this.cam.zoom;
    const [sx, sy] = this.cam.toScreen(t.x, t.y - t.radius * 1.1);
    const r = t.radius * z * 1.6;
    const a = w.time * 2;
    ctx.strokeStyle = '#ff3333';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) {
      const ang = a + (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.arc(sx, sy, r, ang, ang + 0.7);
      ctx.stroke();
    }
  }

  private drawCastArea(w: World, u: Unit) {
    if (!u.cast) return;
    if (u.faction === 'enemy' && !w.isVisible(u)) return;
    const ab = u.abilities[u.cast.slot].def;
    if (!ab.radius) return;
    const ctx = this.ctx, z = this.cam.zoom;
    const cx = ab.target === 'self' ? u.x : u.cast.x;
    const cy = ab.target === 'self' ? u.y : u.cast.y;
    const [sx, sy] = this.cam.toScreen(cx, cy);
    const k = u.cast.time / u.cast.total;
    const col = u.faction === 'enemy' ? '#ff3333' : ab.color;
    ctx.fillStyle = col + '22';
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, ab.radius * z, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = col + '44';
    ctx.beginPath();
    ctx.arc(sx, sy, ab.radius * z * k, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawTargeting(w: World, ui: UiState) {
    const t = ui.targeting!;
    const u = t.unit;
    const ab: AbilityDef = u.abilities[t.slot].def;
    const ctx = this.ctx, z = this.cam.zoom;
    const [ux, uy] = this.cam.toScreen(u.x, u.y);
    ctx.strokeStyle = ab.color + '66';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(ux, uy, ab.range * z, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (ab.radius && ab.target === 'ground') {
      const p = ui.mouseWorld;
      const [sx, sy] = this.cam.toScreen(p.x, p.y);
      ctx.fillStyle = ab.color + '22';
      ctx.strokeStyle = ab.color;
      ctx.beginPath();
      ctx.arc(sx, sy, ab.radius * z, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // 아군 피해 경고
      for (const v of unitsInArea(w, ab, u, p.x, p.y)) {
        if (v.faction === u.faction) this.ring(v, '#ff3333', 3);
      }
      if (dist(u, p) > ab.range) {
        ctx.fillStyle = '#ff8888';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('사거리 밖: 다가가서 시전', sx, sy - ab.radius * z - 8);
      }
    }
  }

  private drawCommandLine(u: Unit) {
    const c = u.command;
    if (!c) return;
    const ctx = this.ctx;
    const it = c.intent;
    let tx: number, ty: number, col: string;
    if (it.type === 'move') { tx = it.x; ty = it.y; col = '#66ff88'; }
    else if (it.type === 'attack') { tx = it.target.x; ty = it.target.y; col = '#ff5555'; }
    else { tx = it.x; ty = it.y; col = u.abilities[it.slot].def.color; }
    const [ax, ay] = this.cam.toScreen(u.x, u.y);
    const [bx, by] = this.cam.toScreen(tx, ty);
    ctx.strokeStyle = col + 'aa';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(bx, by, 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawUnit(w: World, u: Unit) {
    const ctx = this.ctx, z = this.cam.zoom;
    const [sx, sy] = this.cam.toScreen(u.x, u.y);
    const r = u.radius * z;
    const bw = r * 1.8, bh = r * 2.3;

    if (!u.alive) {
      const fade = u.faction === 'party' ? 0.6 : Math.max(0, 1 - (w.time - u.deathTime) / 1.5);
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#555';
      ctx.font = `bold ${Math.round(r * 1.3)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(u.faction === 'party' ? '✝' : '✕', sx, sy - r * 0.5);
      ctx.globalAlpha = 1;
      return;
    }

    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * 1.05, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // 몸체 (세워서 그린 토큰)
    const lunge = u.swing > 0 ? u.facing * r * 0.25 : 0;
    const bx = sx - bw / 2 + lunge, by = sy - bh;
    const stunned = u.stats.stunned;
    ctx.fillStyle = u.flash > 0 ? '#ffffff' : u.faction === 'party' ? '#1f2633' : '#2e1b1b';
    ctx.strokeStyle = u.def.color;
    ctx.lineWidth = u.def.boss ? 3 : 2;
    roundRect(ctx, bx, by, bw, bh, r * 0.45);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = stunned ? '#888' : u.def.color;
    ctx.font = `bold ${Math.round(r * (u.faction === 'party' ? 1.05 : 1.3))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(u.def.glyph, sx + lunge, by + bh * 0.5);

    // 체력/마나 바
    const barW = Math.max(bw * 1.25, 26), barX = sx - barW / 2;
    let y = by - 7;
    ctx.fillStyle = '#000a';
    ctx.fillRect(barX - 1, y - 1, barW + 2, 6);
    ctx.fillStyle = u.faction === 'party' ? '#4caf50' : u.def.boss ? '#ff3030' : '#d04040';
    ctx.fillRect(barX, y, barW * Math.max(0, u.hpFrac), 4);
    if (u.stats.maxMp > 0 && u.faction === 'party') {
      ctx.fillStyle = '#000a';
      ctx.fillRect(barX - 1, y + 5, barW + 2, 4);
      ctx.fillStyle = '#4a7cff';
      ctx.fillRect(barX, y + 5, (barW * u.mp) / u.stats.maxMp, 3);
    }

    // 상태이상 아이콘
    if (u.statuses.length) {
      y -= 15;
      ctx.font = 'bold 10px sans-serif';
      let x = sx - (u.statuses.length * 14) / 2;
      for (const s of u.statuses) {
        ctx.fillStyle = '#000c';
        ctx.fillRect(x, y, 13, 13);
        ctx.fillStyle = s.def.color;
        ctx.fillText(s.def.icon, x + 6.5, y + 7);
        if (s.stacks > 1) {
          ctx.font = 'bold 8px sans-serif';
          ctx.fillStyle = '#fff';
          ctx.fillText(String(s.stacks), x + 11, y + 11);
          ctx.font = 'bold 10px sans-serif';
        }
        x += 14;
      }
    }

    // 시전 바
    if (u.cast) {
      const ab = u.abilities[u.cast.slot].def;
      y -= 16;
      const k = u.cast.time / u.cast.total;
      ctx.fillStyle = '#000c';
      ctx.fillRect(barX - 1, y - 1, barW + 2, 7);
      ctx.fillStyle = u.faction === 'enemy' ? '#ff9933' : ab.color;
      ctx.fillRect(barX, y, barW * k, 5);
      ctx.font = 'bold 11px sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000';
      ctx.strokeText(ab.name, sx, y - 7);
      ctx.fillStyle = '#fff';
      ctx.fillText(ab.name, sx, y - 7);
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
