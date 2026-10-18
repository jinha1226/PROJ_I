// 마우스/터치 입력 (Pointer Events). 주장 한 명을 직접 조작한다 (에스라봉 · 레이드 매니저식).
// 이동: 터치는 화면을 끌기(조이스틱), PC 는 WASD · 방향키. 탭/클릭: 적 = 공격, 바닥 = 이동, 아군 = 주장 교대.
// 기술: Q E R F (또는 1~6), 돌진/구르기: Shift.
import { CONSUMABLES } from '../data/consumables';
import { dist } from '../core/rng';
import type { Camera } from '../render/camera';
import { useConsumable } from '../sim/objects';
import type { Unit } from '../sim/unit';
import type { World } from '../sim/world';
import type { UiState } from '../ui/state';

const DRAG_PX = 8;
/** 조이스틱 손잡이가 움직이는 반지름(px) */
const JOY_R = 42;
const SKILL_KEYS = ['q', 'e', 'r', 'f'];
const MOVE_KEYS: Record<string, [number, number]> = {
  arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0], arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1],
};

export interface InputHooks {
  getWorld(): World;
  restart(): void;
  toggleHelp(): void;
  togglePause(): void;
  toggleAutoAll(): void;
  toggleExplore(): void;
}

export class Input {
  /** 화면에 닿아 있는 손가락들 (두 손가락 확대/이동용) */
  private touches = new Map<number, { x: number; y: number }>();
  private pinch: { dist: number; mx: number; my: number } | null = null;
  /** 누르고 있는 이동 키 */
  private arrows = new Set<string>();
  /** 마지막 입력이 마우스였는가 (지점 기술을 커서 위치에 바로 쓰기) */
  private mouse = false;
  private steering = false;
  private joyEl: HTMLElement;

  constructor(
    private canvas: HTMLCanvasElement,
    private cam: Camera,
    private ui: UiState,
    private hooks: InputHooks,
  ) {
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => this.wheel(e), { passive: false });
    window.addEventListener('keydown', (e) => this.key(e));
    window.addEventListener('keyup', (e) => this.arrows.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.arrows.clear());
    this.joyEl = document.createElement('div');
    this.joyEl.id = 'joy';
    this.joyEl.className = 'hidden';
    this.joyEl.innerHTML = '<div class="knob"></div>';
    document.body.appendChild(this.joyEl);
  }

  private get w() {
    return this.hooks.getWorld();
  }

  /** 화면 좌표의 유닛. 화면에 보이는 몸(발 ~ 머리)으로 판정하고, 겹치면 앞(아래)쪽 우선. 2D · 3D 공통 */
  unitAt(sx: number, sy: number): Unit | null {
    let best: Unit | null = null, bestY = -Infinity;
    for (const u of this.w.units) {
      if (!u.alive) continue;
      if (u.faction !== 'party' && !this.w.isVisible(u)) continue;
      const [fx, fy] = this.cam.toScreen(u.x, u.y);
      const [, hy] = this.cam.toScreenH(u.x, u.y, u.radius * this.cam.bodyH);
      const half = Math.max(12, (fy - hy) * 0.38);
      if (sx >= fx - half && sx <= fx + half && sy >= hy - 4 && sy <= fy + half * 0.5 && fy > bestY) {
        best = u;
        bestY = fy;
      }
    }
    return best;
  }

  private down(e: PointerEvent) {
    const sx = e.clientX, sy = e.clientY;
    const ui = this.ui;
    const touch = e.pointerType === 'touch';
    if (touch) {
      this.touches.set(e.pointerId, { x: sx, y: sy });
      if (this.touches.size === 2) {
        // 두 번째 손가락: 진행 중이던 드래그를 버리고 확대/이동으로 전환
        if (ui.drag?.kind === 'joy' && ui.drag.active) this.w.stopSteer();
        ui.drag = null;
        this.pinch = this.pinchState();
        this.cam.follow = false;
        return;
      }
      if (this.touches.size > 2) return;
    }
    if (e.button === 1) {
      ui.drag = { kind: 'pan', sx, sy, camX: this.cam.x, camY: this.cam.y };
      this.cam.follow = false;
      e.preventDefault();
      return;
    }
    if (e.button === 2) {
      if (ui.itemTarget !== null) ui.itemTarget = null;
      else if (ui.targeting) ui.targeting = null;
      else this.commandAt(sx, sy);
      return;
    }
    if (e.button !== 0) return;
    this.canvas.setPointerCapture(e.pointerId);

    if (ui.itemTarget !== null) {
      this.resolveItemTarget(sx, sy);
      return;
    }
    if (ui.targeting) {
      this.resolveTargeting(sx, sy, e.shiftKey);
      return;
    }
    this.mouse = !touch;
    // 터치: 끌면 조이스틱(주장 이동), 그대로 떼면 탭. 마우스: 클릭 = 탭
    if (touch) ui.drag = { kind: 'joy', sx, sy, cx: sx, cy: sy, active: false };
    else this.tap(sx, sy, false);
  }

  private pinchState() {
    const [a, b] = [...this.touches.values()];
    return { dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }

  private move(e: PointerEvent) {
    const ui = this.ui;
    if (this.touches.has(e.pointerId)) {
      this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinch && this.touches.size >= 2) {
        const p = this.pinchState();
        const before = this.cam.toWorld(this.pinch.mx, this.pinch.my);
        this.cam.zoom = Math.max(16, Math.min(80, this.cam.zoom * (p.dist / this.pinch.dist)));
        const after = this.cam.toWorld(p.mx, p.my);
        this.cam.x += before.x - after.x;
        this.cam.y += before.y - after.y;
        this.pinch = p;
        return;
      }
    }
    ui.mouseScreen = { x: e.clientX, y: e.clientY };
    ui.mouseWorld = this.cam.toWorld(e.clientX, e.clientY);
    ui.hover = this.unitAt(e.clientX, e.clientY);
    const d = ui.drag;
    if (!d) return;
    if (d.kind === 'pan') {
      if (d.tap && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) <= DRAG_PX * 1.5) return;
      if (d.tap) this.cam.follow = false;
      d.tap = false;
      this.cam.x = d.camX - (e.clientX - d.sx) / this.cam.zoom;
      this.cam.y = d.camY - (e.clientY - d.sy) / this.cam.zoom;
      return;
    }
    d.cx = e.clientX;
    d.cy = e.clientY;
    if (d.kind === 'joy') {
      if (!d.active && Math.hypot(d.cx - d.sx, d.cy - d.sy) > DRAG_PX * 1.5) d.active = true;
      return;
    }
    if (Math.hypot(d.cx - d.sx, d.cy - d.sy) > DRAG_PX) d.moved = true;
  }

  private up(e: PointerEvent) {
    const ui = this.ui;
    const touch = this.touches.delete(e.pointerId);
    if (touch) {
      if (this.touches.size < 2) this.pinch = null;
      // 손가락에는 '올려두기'가 없으므로 뗀 뒤 강조가 남지 않게 한다
      ui.hover = null;
    }
    const d = ui.drag;
    ui.drag = null;
    if (!d) return;
    const sx = e.clientX, sy = e.clientY;
    if (d.kind === 'pan') {
      if (d.tap) this.tap(sx, sy);
      return;
    }
    if (d.kind === 'joy') {
      if (d.active) this.w.stopCaptain();
      else this.tap(sx, sy);
      return;
    }
    this.tap(sx, sy, touch);
  }

  /** 탭/클릭: 적 = 주장이 공격(정보도 띄움), 아군 = 주장 교대, 바닥 = 주장 이동 */
  private tap(sx: number, sy: number, touch = true) {
    const ui = this.ui, w = this.w;
    const t = this.unitAt(sx, sy);
    if (t && t.faction === 'party') {
      w.setCaptain(t);
      return;
    }
    if (t && touch) ui.inspect = t;
    this.commandAt(sx, sy);
  }

  /** 주장에게 해당 지점의 이동/공격 명령 */
  private commandAt(sx: number, sy: number) {
    const c = this.w.captain;
    if (!c?.alive) return;
    const t = this.unitAt(sx, sy);
    const p = this.cam.toWorld(sx, sy);
    if (t && t.faction !== 'party') {
      this.w.commandAttack([c], t);
      this.mark(t.x, t.y, '#ff5555');
    } else {
      const dest = this.w.map.nearestFloor(p.x, p.y);
      this.w.commandMove([c], dest.x, dest.y);
      this.mark(dest.x, dest.y, '#66ff88');
    }
  }

  private mark(x: number, y: number, color: string) {
    this.ui.marks.push({ x, y, color, t: 0 });
  }

  /**
   * 주장 기술 사용. 대상은 알아서 고른다 (모바일 한 손 조작):
   * 적 대상 = 커서 아래 → 지금 치는 적 → 집중 대상 → 가장 가까운 적, 지점 = 마우스 커서 또는 그 적의 자리,
   * 아군 대상 = 커서 아래 → 체력 비율이 가장 낮은 아군. 마땅한 대상이 없으면 대상 지정 모드
   */
  useSkill(slot: number, quick: boolean) {
    const u = this.w.captain;
    if (!u?.alive || slot >= u.abilities.length || u.abilities[slot].hidden) return;
    const ab = u.abilities[slot].def;
    // 같은 기술 버튼을 다시 누르면 대상 지정 취소 (모바일에는 우클릭 · Esc 가 없다)
    if (this.ui.targeting?.unit === u && this.ui.targeting.slot === slot) {
      this.ui.targeting = null;
      return;
    }
    this.ui.targeting = null;
    if (ab.target === 'self') {
      this.w.commandAbility(u, slot, null, u.x, u.y);
      return;
    }
    const h = this.ui.hover;
    if (quick && h?.alive && this.validTarget(u, slot, h)) {
      this.w.commandAbility(u, slot, h, h.x, h.y);
      this.mark(h.x, h.y, ab.color);
      return;
    }
    if (ab.target === 'ground' && quick && this.mouse) {
      const p = this.ui.mouseWorld;
      this.w.commandAbility(u, slot, null, p.x, p.y);
      this.mark(p.x, p.y, ab.color);
      return;
    }
    const auto = this.autoTarget(u, slot);
    if (auto) {
      this.w.commandAbility(u, slot, ab.target === 'ground' ? null : auto, auto.x, auto.y);
      this.mark(auto.x, auto.y, ab.color);
      return;
    }
    this.ui.targeting = { unit: u, slot };
  }

  private autoTarget(u: Unit, slot: number): Unit | null {
    const ab = u.abilities[slot].def;
    const w = this.w;
    if (ab.target === 'ally') {
      const hurt = w.party.filter((p) => p.alive && p.hpFrac < 0.97).sort((a, b) => a.hpFrac - b.hpFrac);
      return hurt[0] ?? null;
    }
    const foes = w.hostilesOf(u).filter((e) => e.alive && w.isVisible(e));
    const cur = u.command?.intent.type === 'attack' ? u.command.intent.target : u.intent?.type === 'attack' ? u.intent.target : u.lastTarget;
    for (const c of [cur, w.focusTarget]) if (c?.alive && foes.includes(c) && dist(u, c) <= ab.range + 4) return c;
    return foes.sort((a, b) => dist(u, a) - dist(u, b))[0] ?? null;
  }

  private validTarget(u: Unit, slot: number, t: Unit) {
    const tg = u.abilities[slot].def.target;
    return tg === 'enemy' ? t.faction !== u.faction : tg === 'ally' ? t.faction === u.faction : false;
  }

  /** 벨트 소모품 사용: 대상이 필요 없으면 바로, 아니면 대상 지정 모드로 */
  useItem(index: number) {
    const id = this.w.run.belt[index];
    if (!id) return;
    if (CONSUMABLES[id].target === 'none') {
      useConsumable(this.w, index, null, 0, 0);
      this.ui.itemTarget = null;
    } else {
      this.ui.targeting = null;
      this.ui.itemTarget = this.ui.itemTarget === index ? null : index;
    }
  }

  private resolveItemTarget(sx: number, sy: number) {
    const idx = this.ui.itemTarget!;
    const id = this.w.run.belt[idx];
    if (!id) {
      this.ui.itemTarget = null;
      return;
    }
    const p = this.cam.toWorld(sx, sy);
    const t = this.unitAt(sx, sy);
    const ok = CONSUMABLES[id].target === 'enemy'
      ? !!t && t.faction !== 'party' && useConsumable(this.w, idx, t, t.x, t.y)
      : useConsumable(this.w, idx, null, p.x, p.y);
    if (ok) this.mark(p.x, p.y, CONSUMABLES[id].color);
    // 쓰지 못했으면(대상이 아닌 곳) 취소
    this.ui.itemTarget = null;
  }

  private resolveTargeting(sx: number, sy: number, keep: boolean) {
    const tg = this.ui.targeting!;
    const ab = tg.unit.abilities[tg.slot].def;
    if (!tg.unit.alive) {
      this.ui.targeting = null;
      return;
    }
    if (ab.target === 'ground') {
      const p = this.cam.toWorld(sx, sy);
      this.w.commandAbility(tg.unit, tg.slot, null, p.x, p.y);
      this.mark(p.x, p.y, ab.color);
    } else {
      const t = this.unitAt(sx, sy);
      // 대상이 아닌 곳을 누르면 취소
      if (!t || !this.validTarget(tg.unit, tg.slot, t)) {
        this.ui.targeting = null;
        return;
      }
      this.w.commandAbility(tg.unit, tg.slot, t, t.x, t.y);
      this.mark(t.x, t.y, ab.color);
    }
    if (!keep) this.ui.targeting = null;
  }

  private wheel(e: WheelEvent) {
    e.preventDefault();
    const before = this.cam.toWorld(e.clientX, e.clientY);
    this.cam.zoom = Math.max(22, Math.min(80, this.cam.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
    const after = this.cam.toWorld(e.clientX, e.clientY);
    this.cam.x += before.x - after.x;
    this.cam.y += before.y - after.y;
  }

  private key(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.tagName === 'SELECT') return;
    const ui = this.ui, w = this.w;
    const k = e.key.toLowerCase();
    if (k === ' ') {
      e.preventDefault();
      this.hooks.togglePause();
    } else if (k >= '1' && k <= '6') {
      this.useSkill(Number(k) - 1, true);
    } else if (SKILL_KEYS.includes(k) && !e.ctrlKey && !(k === 'r' && (w.outcome === 'victory' || w.outcome === 'defeat'))) {
      this.useSkill(SKILL_KEYS.indexOf(k), true);
    } else if (k === 'shift') {
      w.captainDash();
    } else if (k === 'g') {
      const t = ui.hover && ui.hover.faction !== 'party' ? ui.hover : ui.inspect;
      if (t) w.setFocus(w.focusTarget === t ? null : t);
    } else if (k === 't') {
      this.hooks.toggleAutoAll();
    } else if (k === 'c') {
      this.cam.follow = !this.cam.follow;
    } else if (k === 'h') {
      this.hooks.toggleHelp();
    } else if (k === 'escape') {
      if (ui.itemTarget !== null) ui.itemTarget = null;
      else if (ui.targeting) ui.targeting = null;
      else ui.selected = [];
    } else if (k === 'r') {
      this.hooks.restart();
    } else if (MOVE_KEYS[k]) {
      // WASD · 방향키 = 주장 이동
      e.preventDefault();
      this.arrows.add(k);
    }
  }

  centerOn(u: Unit) {
    this.cam.x = u.x;
    this.cam.y = u.y;
    this.cam.follow = false;
  }

  /** 프레임마다: 카메라 추적, 클릭 표시 갱신 */
  update(dt: number) {
    const ui = this.ui;
    for (const m of ui.marks) m.t += dt;
    ui.marks = ui.marks.filter((m) => m.t < 0.5);
    ui.selected = ui.selected.filter((u) => u.alive);
    if (ui.inspect && !ui.inspect.alive) ui.inspect = null;
    if (ui.targeting && !ui.targeting.unit.alive) ui.targeting = null;
    const cap = this.w.captain;
    ui.selected = cap?.alive ? [cap] : [];
    ui.mouseWorld = this.cam.toWorld(ui.mouseScreen.x, ui.mouseScreen.y);
    this.updateSteer();
    // 드래그 중에는 화면이 움직이지 않게 한다 (조이스틱은 예외)
    if (this.cam.follow && (!ui.drag || ui.drag.kind === 'joy')) {
      const pts = cap?.alive ? [cap] : this.w.party.filter((u) => u.alive);
      if (pts.length) {
        const cx = pts.reduce((s, u) => s + u.x, 0) / pts.length;
        const cy = pts.reduce((s, u) => s + u.y, 0) / pts.length;
        const k = Math.min(1, dt * 3);
        this.cam.x += (cx - this.cam.x) * k;
        this.cam.y += (cy - this.cam.y) * k;
      }
    }
  }

  /** 조이스틱 · WASD → 주장 이동 */
  private updateSteer() {
    const d = this.ui.drag;
    let dx = 0, dy = 0;
    const joy = d?.kind === 'joy' && d.active ? d : null;
    if (joy) {
      dx = joy.cx - joy.sx;
      dy = joy.cy - joy.sy;
      const len = Math.hypot(dx, dy);
      const k = len > JOY_R ? JOY_R / len : 1;
      this.joyEl.style.left = `${joy.sx}px`;
      this.joyEl.style.top = `${joy.sy}px`;
      (this.joyEl.firstElementChild as HTMLElement).style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      if (len < 10) dx = dy = 0;
    } else {
      for (const k of this.arrows) {
        dx += MOVE_KEYS[k][0];
        dy += MOVE_KEYS[k][1];
      }
    }
    this.joyEl.classList.toggle('hidden', !joy);
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      this.w.steerCaptain(dx / len, dy / len);
      this.steering = true;
    } else if (this.steering) {
      this.w.stopCaptain();
      this.steering = false;
    }
  }
}
