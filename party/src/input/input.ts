// 마우스/터치 입력 (Pointer Events). 드래그 명령, 범위 선택, 스킬 대상 지정, 단축키.
// 파티 전체 이동은 우르르 용병단식 조이스틱: 터치는 빈 곳을 끌기, PC 는 방향키.
import { CONSUMABLES } from '../data/consumables';
import type { Camera } from '../render/camera';
import { useConsumable } from '../sim/objects';
import type { Unit } from '../sim/unit';
import type { World } from '../sim/world';
import type { UiState } from '../ui/state';

const DRAG_PX = 8;
/** 조이스틱 손잡이가 움직이는 반지름(px) */
const JOY_R = 42;
const SKILL_KEYS = ['q', 'w', 'e', 'r'];

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
  /** 누르고 있는 방향키 */
  private arrows = new Set<string>();
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

  /** 화면 좌표의 유닛. 세워 그린 몸체 영역으로 판정하고, 겹치면 앞(아래)쪽 우선. */
  unitAt(sx: number, sy: number): Unit | null {
    const p = this.cam.toWorld(sx, sy);
    let best: Unit | null = null;
    for (const u of this.w.units) {
      if (!u.alive) continue;
      if (u.faction !== 'party' && !this.w.isVisible(u)) continue;
      const cy = u.y - u.radius * 1.1;
      const dx = (p.x - u.x) / (u.radius * 1.2), dy = (p.y - cy) / (u.radius * 1.6);
      if (dx * dx + dy * dy <= 1 && (!best || u.y > best.y)) best = u;
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
    const u = this.unitAt(sx, sy);
    if (u && u.faction === 'party') {
      if (e.shiftKey) {
        ui.selected = ui.selected.includes(u) ? ui.selected.filter((s) => s !== u) : [...ui.selected, u];
      } else if (!ui.selected.includes(u) || ui.selected.length > 1) {
        ui.selected = [u];
      }
      ui.drag = { kind: 'unit', unit: u, sx, sy, cx: sx, cy: sy, moved: false };
    } else if (touch) {
      // 터치: 빈 곳을 끌면 조이스틱(파티 전체 이동), 떼지 않고 그대로면 탭. 화면 이동은 두 손가락
      ui.drag = { kind: 'joy', sx, sy, cx: sx, cy: sy, active: false };
    } else {
      ui.drag = { kind: 'box', sx, sy, cx: sx, cy: sy, moved: false };
    }
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
      if (!d.active && Math.hypot(d.cx - d.sx, d.cy - d.sy) > DRAG_PX * 1.5) {
        d.active = true;
        this.cam.follow = true;
      }
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
      if (d.active) this.w.stopSteer();
      else this.tap(sx, sy);
      return;
    }
    if (d.kind === 'unit') {
      if (!d.moved) return; // 단순 선택
      ui.selected = [d.unit];
      this.commandAt(sx, sy, [d.unit]);
      return;
    }
    // box
    if (d.moved) {
      const a = this.cam.toWorld(Math.min(d.sx, sx), Math.min(d.sy, sy));
      const b = this.cam.toWorld(Math.max(d.sx, sx), Math.max(d.sy, sy));
      const inBox = this.w.party.filter((u) => u.alive && u.x >= a.x && u.x <= b.x && u.y >= a.y - 0.6 && u.y <= b.y + 0.3);
      if (inBox.length) ui.selected = e.shiftKey ? [...new Set([...ui.selected, ...inBox])] : inBox;
      return;
    }
    this.tap(sx, sy, touch);
  }

  /** 클릭/탭: 선택된 아군이 있으면 명령, 없으면 적 정보 보기 */
  private tap(sx: number, sy: number, touch = true) {
    const ui = this.ui;
    const t = this.unitAt(sx, sy);
    if (t && t.faction !== 'party') {
      // 터치는 커서를 올려 정보를 볼 수 없으니 탭한 적을 항상 정보 창에 띄운다
      if (!ui.selected.length) {
        ui.inspect = ui.inspect === t ? null : t;
        return;
      }
      if (touch) ui.inspect = t;
    }
    if (ui.selected.length) this.commandAt(sx, sy);
  }

  /** 선택된(또는 지정된) 유닛에게 해당 지점의 이동/공격 명령 */
  private commandAt(sx: number, sy: number, units = this.ui.selected) {
    const live = units.filter((u) => u.alive);
    if (!live.length) return;
    const t = this.unitAt(sx, sy);
    const p = this.cam.toWorld(sx, sy);
    if (t && t.faction !== 'party') {
      this.w.commandAttack(live, t);
      this.mark(t.x, t.y, '#ff5555');
    } else {
      const dest = this.w.map.nearestFloor(p.x, p.y);
      this.w.commandMove(live, dest.x, dest.y);
      this.mark(dest.x, dest.y, '#66ff88');
    }
  }

  private mark(x: number, y: number, color: string) {
    this.ui.marks.push({ x, y, color, t: 0 });
  }

  /** 스킬 사용 시작. 적/아군 대상 스킬은 커서 아래 유효 대상이 있으면 즉시 사용 */
  useSkill(slot: number, quick: boolean) {
    const u = this.ui.selected.find((s) => s.alive);
    if (!u || slot >= u.abilities.length || u.abilities[slot].hidden) return;
    const ab = u.abilities[slot].def;
    if (ab.target === 'self') {
      this.w.commandAbility(u, slot, null, u.x, u.y);
      this.ui.targeting = null;
      return;
    }
    if (quick) {
      const h = this.ui.hover;
      if (h && h.alive && this.validTarget(u, slot, h)) {
        this.w.commandAbility(u, slot, h, h.x, h.y);
        this.mark(h.x, h.y, ab.color);
        return;
      }
    }
    this.ui.targeting = { unit: u, slot };
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
    if (ok) {
      this.mark(p.x, p.y, CONSUMABLES[id].color);
      this.ui.itemTarget = null;
    }
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
      if (!t || !this.validTarget(tg.unit, tg.slot, t)) return; // 유효하지 않으면 대기 유지
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

  private lastNumKey = { k: '', t: 0 };

  private key(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.tagName === 'SELECT') return;
    const ui = this.ui, w = this.w;
    const k = e.key.toLowerCase();
    if (k === ' ') {
      e.preventDefault();
      this.hooks.togglePause();
    } else if (k >= '1' && k <= '4') {
      const u = w.party[Number(k) - 1];
      if (!u?.alive) return;
      if (e.shiftKey) ui.selected = ui.selected.includes(u) ? ui.selected : [...ui.selected, u];
      else ui.selected = [u];
      const now = performance.now();
      if (this.lastNumKey.k === k && now - this.lastNumKey.t < 350) this.centerOn(u);
      this.lastNumKey = { k, t: now };
    } else if (k === '`' || (k === 'a' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      ui.selected = w.party.filter((u) => u.alive);
    } else if (SKILL_KEYS.includes(k) && !e.ctrlKey) {
      this.useSkill(SKILL_KEYS.indexOf(k), true);
    } else if (k === 'f') {
      const t = ui.hover && ui.hover.faction !== 'party' ? ui.hover : ui.inspect;
      if (t) w.setFocus(w.focusTarget === t ? null : t);
    } else if (k === 't') {
      this.hooks.toggleAutoAll();
    } else if (k === 'x') {
      this.hooks.toggleExplore();
    } else if (k === 'c') {
      this.cam.follow = !this.cam.follow;
    } else if (k === 'h') {
      this.hooks.toggleHelp();
    } else if (k === 'escape') {
      if (ui.itemTarget !== null) ui.itemTarget = null;
      else if (ui.targeting) ui.targeting = null;
      else ui.selected = [];
    } else if (k === 'r' && (w.outcome === 'victory' || w.outcome === 'defeat' || e.shiftKey)) {
      this.hooks.restart();
    } else if (k.startsWith('arrow')) {
      // 방향키 = 조이스틱 (파티 전체 이동)
      e.preventDefault();
      this.arrows.add(k);
      this.cam.follow = true;
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
    ui.mouseWorld = this.cam.toWorld(ui.mouseScreen.x, ui.mouseScreen.y);
    this.updateSteer();
    // 드래그 중에는 화면이 움직이지 않게 한다 (조이스틱은 예외)
    if (this.cam.follow && (!ui.drag || ui.drag.kind === 'joy')) {
      const pts = this.w.party.filter((u) => u.alive);
      if (pts.length) {
        const cx = pts.reduce((s, u) => s + u.x, 0) / pts.length;
        const cy = pts.reduce((s, u) => s + u.y, 0) / pts.length;
        const k = Math.min(1, dt * 3);
        this.cam.x += (cx - this.cam.x) * k;
        this.cam.y += (cy - this.cam.y) * k;
      }
    }
  }

  /** 조이스틱 · 방향키 → 파티 전체 이동 */
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
      if (this.arrows.has('arrowleft')) dx -= 1;
      if (this.arrows.has('arrowright')) dx += 1;
      if (this.arrows.has('arrowup')) dy -= 1;
      if (this.arrows.has('arrowdown')) dy += 1;
    }
    this.joyEl.classList.toggle('hidden', !joy);
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      this.w.steer(dx / len, dy / len);
      this.steering = true;
    } else if (this.steering && !joy) {
      // 방향키를 모두 뗐다 (터치 조이스틱은 손을 뗄 때 멈춘다)
      this.w.stopSteer();
      this.steering = false;
    }
  }
}
