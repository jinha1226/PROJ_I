// 3/4 탑다운 렌더러: 정사각 타일 + 세워서 그린 유닛, Y축 정렬.
import { MOODS } from '../data/moods';
import { dist } from '../core/rng';
import { unitsInArea } from '../sim/abilities';
import type { AbilityDef } from '../sim/defs';
import type { Unit } from '../sim/unit';
import type { World } from '../sim/world';
import type { UiState } from '../ui/state';
import type { Camera } from './camera';

/** 던전 종류별 색 (계약의 palette) */
export const PALETTES = {
  cave: { floorA: '#433d36', floorB: '#48413a', wallTop: '#6b6a78', wallEdge: '#8a899a', wallFront: '#3b3a46' },
  crypt: { floorA: '#33384a', floorB: '#373d50', wallTop: '#5a6276', wallEdge: '#7f8aa2', wallFront: '#2c3140' },
  nest: { floorA: '#3a3030', floorB: '#3f3434', wallTop: '#5e4a5e', wallEdge: '#836a86', wallFront: '#32253a' },
  ruins: { floorA: '#4a4433', floorB: '#504938', wallTop: '#7a705a', wallEdge: '#9c917a', wallFront: '#433c2c' },
};
let C = { ...PALETTES.cave, floorLine: 'rgba(0,0,0,0.18)', fog: 'rgba(5,5,9,0.5)' };

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  /** 3D 모드: 던전 · 몸체 · 링 · 예고 범위는 3D 가 그리고, 여기서는 체력바 · 숫자 · 말풍선 같은 겹침만 */
  overlay = false;
  private lastHover: Unit | null = null;

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
    this.lastHover = ui.hover;
    if (this.overlay) ctx.clearRect(0, 0, cam.w, cam.h);
    else {
      ctx.fillStyle = '#07070b';
      ctx.fillRect(0, 0, cam.w, cam.h);
    }
    // 화면 흔들림
    const sh = w.shake;
    ctx.save();
    if (sh > 0.3 && !this.overlay) ctx.translate((Math.random() * 2 - 1) * sh, (Math.random() * 2 - 1) * sh);

    if (!this.overlay) {
      this.drawTiles(w);
      this.drawStairs(w);
      this.drawObjects(w);
    }

    // ── 바닥 표시 (예고 범위, 고수 지점, 선택 원) ──
    if (!this.overlay) for (const u of w.units) if (u.alive && u.cast) this.drawCastArea(w, u);
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
    if (!this.overlay) {
      for (const u of ui.selected) if (u.alive) this.ring(u, '#66ff88', 2);
      if (ui.hover && ui.hover.alive) this.ring(ui.hover, ui.hover.faction === 'party' ? '#ffffffaa' : '#ff6666aa', 1.5);
      if (w.focusTarget) this.drawFocus(w, w.focusTarget);
    }
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
      // 3D: 바닥에서 머리 위 높이로 올려 찍고, 떠오르는 만큼 위로
      const [sx, sy] = this.overlay ? (([a, b]) => [a, b - f.t * 28])(cam.toScreenH(f.x, f.y + 0.9, 1.75)) : cam.toScreen(f.x, f.y);
      ctx.globalAlpha = Math.min(1, 1.6 - f.t * 1.4);
      ctx.font = `bold ${Math.round(13 * f.scale * Math.min(1.2, z / 40))}px sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000';
      ctx.strokeText(f.text, sx, sy);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, sx, sy);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // ── 말풍선 ──
    for (const b of w.bubbles) this.drawBubble(b.unit, b.text, b.color, b.t, b.dur);

    if (ui.paused) {
      ctx.strokeStyle = 'rgba(255,204,102,0.55)';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, cam.w - 6, cam.h - 6);
    }
  }

  private drawTiles(w: World) {
    C = { ...C, ...PALETTES[w.palette] };
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

  /** 상자 · 이벤트 오브젝트 (본 적 있는 칸만) */
  private drawObjects(w: World) {
    const ctx = this.ctx, z = this.cam.zoom;
    for (const o of w.objects) {
      if (!w.seen[Math.floor(o.y) * w.map.w + Math.floor(o.x)]) continue;
      const [sx, sy] = this.cam.toScreen(o.x, o.y);
      ctx.globalAlpha = o.used ? 0.35 : 1;
      if (o.kind === 'chest' || o.kind === 'mimic') {
        const bw = z * 0.62, bh = z * 0.42;
        ctx.fillStyle = '#7a4a22';
        ctx.fillRect(sx - bw / 2, sy - bh, bw, bh);
        ctx.fillStyle = o.used ? '#3a2a1a' : '#9a6232';
        ctx.fillRect(sx - bw / 2, sy - bh - z * 0.14, bw, z * 0.16);
        ctx.fillStyle = '#e8c050';
        ctx.fillRect(sx - bw / 2, sy - bh * 0.62, bw, z * 0.06);
        ctx.fillRect(sx - z * 0.05, sy - bh * 0.75, z * 0.1, z * 0.14);
      } else {
        const col = o.kind === 'fountain' ? '#4aa8ff' : o.kind === 'altar' ? '#c03838' : o.kind === 'captive' ? '#ffe14d' : '#c8c8c8';
        const txt = o.kind === 'fountain' ? '샘' : o.kind === 'altar' ? '제' : o.kind === 'captive' ? '구' : '포';
        ctx.fillStyle = '#1a1a24';
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(sx, sy - z * 0.2, z * 0.34, z * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = col;
        ctx.font = `bold ${Math.round(z * 0.32)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, sx, sy - z * 0.2);
      }
      // 아직 안 연 것은 반짝임으로 눈에 띄게
      if (!o.used) {
        const a = 0.35 + Math.sin(w.time * 4 + o.id) * 0.25;
        ctx.strokeStyle = `rgba(255, 220, 120, ${a})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(sx, sy, z * 0.45, z * 0.2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
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

  private trails = new WeakMap<Unit, { x: number; y: number }[]>();

  /** 위치 기록으로 잔상을 그린다 (무모함 돌진) */
  private drawTrail(u: Unit, sx: number, sy: number, r: number, on: boolean) {
    let hist = this.trails.get(u);
    if (!on) {
      if (hist) this.trails.delete(u);
      return;
    }
    if (!hist) this.trails.set(u, (hist = []));
    hist.push({ x: sx, y: sy });
    if (hist.length > 10) hist.shift();
    const ctx = this.ctx;
    for (let i = 0; i < hist.length - 1; i++) {
      const p = hist[i];
      if (Math.hypot(p.x - sx, p.y - sy) < 2) continue;
      ctx.globalAlpha = (i / hist.length) * 0.35;
      ctx.fillStyle = '#ff4433';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - r * 1.1, r * 0.9, r * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawBubble(u: Unit, text: string, color: string, t: number, dur: number) {
    const ctx = this.ctx;
    const r = u.radius * this.cam.zoom;
    // 3D: 머리 꼭대기 위로
    const [sx, sy] = this.overlay ? this.cam.toScreenH(u.x, u.y, u.radius * 4.3) : this.cam.toScreen(u.x, u.y);
    ctx.font = 'bold 12px sans-serif';
    const tw = ctx.measureText(text).width + 14;
    const by = (this.overlay ? sy - 56 : sy - r * 2.3 - 62) - Math.min(1, t * 6) * 4;
    const bx = sx - tw / 2;
    ctx.globalAlpha = Math.min(1, (dur - t) * 3, t * 8);
    ctx.fillStyle = '#f4f1ea';
    roundRect(ctx, bx, by, tw, 20, 8);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx - 5, by + 20);
    ctx.lineTo(sx, by + 27);
    ctx.lineTo(sx + 5, by + 20);
    ctx.fillStyle = '#f4f1ea';
    ctx.fill();
    ctx.fillStyle = '#1a1a22';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, sx, by + 10.5);
    ctx.globalAlpha = 1;
  }

  private drawUnit(w: World, u: Unit) {
    const ctx = this.ctx, z = this.cam.zoom;
    if (this.overlay) {
      // 3D: 몸체는 3D 가 그리므로 머리 위 표시만 (머리 높이 = 반지름 × 4)
      if (!u.alive) return;
      const [hx, hy] = this.cam.toScreenH(u.x + u.kickX, u.y + u.kickY, u.radius * 4.6);
      this.drawUnitHud(w, u, hx, hy, u.def.boss ? 40 : 24);
      return;
    }
    const [sx, sy] = this.cam.toScreen(u.x + u.kickX, u.y + u.kickY);
    const r = u.radius * z;
    const bw = r * 1.75, bh = r * 2.1;

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

    // 붕괴 · 각성: 발밑 아우라 (맥박), 무모함은 붉은 잔상
    const mood = u.hero?.mood ? MOODS[u.hero.mood] : null;
    if (mood) {
      const pulse = 0.5 + 0.5 * Math.sin(w.time * (mood.virtue ? 3 : 6));
      ctx.fillStyle = mood.color + (mood.virtue ? '30' : '40');
      ctx.strokeStyle = mood.color;
      ctx.globalAlpha = 0.5 + pulse * 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r * (1.7 + pulse * 0.4), r * (0.8 + pulse * 0.2), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    this.drawTrail(u, sx, sy, r, mood?.id === 'reckless');

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

    this.drawUnitHud(w, u, sx, by, Math.max(bw * 1.25, 26));
  }

  /** 머리 위 표시: 체력 · 마나 바, 붕괴 이름, 상태이상, 시전 바. top = 머리 꼭대기 화면 y */
  private drawUnitHud(w: World, u: Unit, sx: number, by: number, barW: number) {
    const ctx = this.ctx;
    const mood = u.hero?.mood ? MOODS[u.hero.mood] : null;
    // 체력/마나 바. 3D 에선 캐릭터를 가리지 않게 가늘게, 마나는 아주 얇게. 적은 다쳤을 때만
    const barX = sx - barW / 2;
    let y = by - 7;
    const slim = this.overlay;
    const showHp = !slim || u.faction === 'party' || u.hpFrac < 0.999 || u.def.boss || this.lastHover === u;
    if (showHp) {
      const hh = slim ? 2.5 : 4, mh = slim ? 1.5 : 3;
      const hasMp = u.stats.maxMp > 0 && u.faction === 'party';
      ctx.fillStyle = '#000a';
      ctx.fillRect(barX - 1, y - 1, barW + 2, hh + 2 + (hasMp ? mh + 1 : 0));
      ctx.fillStyle = u.faction === 'party' ? '#4caf50' : u.def.boss ? '#ff3030' : '#d04040';
      ctx.fillRect(barX, y, barW * Math.max(0, u.hpFrac), hh);
      if (hasMp) {
        ctx.fillStyle = '#4a7cff';
        ctx.fillRect(barX, y + hh + 1, (barW * u.mp) / u.stats.maxMp, mh);
      }
    }

    // 붕괴 · 각성 이름 (상시, 붕괴는 깜빡임)
    if (mood) {
      y -= 15;
      const label = `${mood.virtue ? '★' : '!'} ${mood.name}`;
      ctx.font = 'bold 11px sans-serif';
      const tw = ctx.measureText(label).width + 8;
      ctx.globalAlpha = mood.virtue ? 1 : 0.65 + 0.35 * Math.sin(w.time * 8);
      ctx.fillStyle = '#000d';
      roundRect(ctx, sx - tw / 2, y - 1, tw, 14, 4);
      ctx.fill();
      ctx.strokeStyle = mood.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = mood.color;
      ctx.fillText(label, sx, y + 6.5);
      ctx.globalAlpha = 1;
    }

    // 상태이상 아이콘 (3D 에선 몸에 오라 · 파티클로 보이므로 생략)
    if (u.statuses.length && !this.overlay) {
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

    // 시전 바 (3D 에선 아군은 발밑 마법진으로 충분하니 적만, 가늘게 — 끊을지 판단용)
    if (u.cast && !(this.overlay && u.faction === 'party')) {
      const ab = u.abilities[u.cast.slot].def;
      const slimCast = this.overlay;
      y -= slimCast ? 10 : 16;
      const k = u.cast.time / u.cast.total;
      const ch = slimCast ? 3 : 5;
      const cw = slimCast ? Math.max(barW, 30) : barW, cx = sx - cw / 2;
      ctx.fillStyle = '#000c';
      ctx.fillRect(cx - 1, y - 1, cw + 2, ch + 2);
      ctx.fillStyle = u.faction === 'enemy' ? '#ff9933' : ab.color;
      ctx.fillRect(cx, y, cw * k, ch);
      ctx.font = `bold ${slimCast ? 10 : 11}px sans-serif`;
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
