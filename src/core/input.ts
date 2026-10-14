import type {SlotId} from '../items/stores';
import type {SimInput} from '../sim/types';
import type {Vec2} from './math';

export type UiAction = 'inventory' | 'map' | 'pause' | 'mute' | 'autoReturn' | 'autoExplore' | 'autoBattle';

const KEY_ACTIONS: Readonly<Record<string, UiAction>> = {Tab: 'inventory', KeyI: 'inventory', KeyM: 'map', Escape: 'pause', KeyN: 'mute', KeyG: 'autoReturn', KeyH: 'autoExplore', KeyB: 'autoBattle'};
const JOYSTICK_RADIUS = 56;

/**
 * Collects keyboard, mouse and touch state and turns it into one SimInput per
 * frame. Gameplay never reads DOM events directly, so a future auto-play bot
 * can produce the same SimInput.
 */
export class Input {
  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();
  private mouse = {x: 0, y: 0, down: false, inside: false};
  private stick: Vec2 = {x: 0, z: 0};
  private touchAttack = false;
  readonly isTouch = matchMedia('(pointer: coarse)').matches;
  private uiListener: ((a: UiAction) => void) | null = null;
  private gestureListener: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', e => {
      if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
      this.gestureListener?.();
      if (e.repeat) return;
      this.held.add(e.code);
      this.pressed.add(e.code);
      const action = KEY_ACTIONS[e.code];
      if (action) this.uiListener?.(action);
    });
    window.addEventListener('keyup', e => this.held.delete(e.code));
    window.addEventListener('blur', () => {
      this.held.clear();
      this.mouse.down = false;
    });
    canvas.addEventListener('pointermove', e => Object.assign(this.mouse, {x: e.clientX, y: e.clientY, inside: true}));
    canvas.addEventListener('pointerdown', e => {
      this.gestureListener?.();
      if (e.pointerType === 'mouse') {
        Object.assign(this.mouse, {x: e.clientX, y: e.clientY});
        if (e.button === 0) {
          this.mouse.down = true;
          this.pressed.add('Mouse0');
        }
        if (e.button === 2) this.pressed.add('Space');
      }
    });
    window.addEventListener('pointerup', e => {
      if (e.pointerType === 'mouse' && e.button === 0) this.mouse.down = false;
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  onUiAction(fn: (a: UiAction) => void): void {
    this.uiListener = fn;
  }

  /** First user gesture (audio unlock). */
  onGesture(fn: () => void): void {
    this.gestureListener = fn;
  }

  // ---------- touch controls feed these ----------

  setStick(x: number, z: number): void {
    this.stick = {x, z};
  }

  press(code: string): void {
    this.gestureListener?.();
    this.pressed.add(code);
  }

  setTouchAttack(down: boolean): void {
    this.touchAttack = down;
    if (down) this.pressed.add('Mouse0');
  }

  // ---------- per frame ----------

  get pointer(): {x: number; y: number; active: boolean} {
    return {x: this.mouse.x, y: this.mouse.y, active: this.mouse.inside && !this.isTouch};
  }

  wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  /**
   * @param aimAt world point under the mouse, or an auto-aim target on touch devices.
   */
  sample(aimAt: Vec2, uiBlocked: boolean): SimInput {
    let mx = 0;
    let mz = 0;
    if (this.held.has('KeyW') || this.held.has('ArrowUp')) mz -= 1;
    if (this.held.has('KeyS') || this.held.has('ArrowDown')) mz += 1;
    if (this.held.has('KeyA') || this.held.has('ArrowLeft')) mx -= 1;
    if (this.held.has('KeyD') || this.held.has('ArrowRight')) mx += 1;
    const len = Math.hypot(mx, mz);
    const move = len > 0 ? {x: mx / len, z: mz / len} : this.stick;
    const use: SlotId | null = this.pressed.has('Digit1') ? 'belt0' : this.pressed.has('Digit2') ? 'belt1' : null;
    return {
      move,
      aim: aimAt,
      attack: this.pressed.has('Mouse0') || this.mouse.down || this.touchAttack,
      dodge: this.pressed.has('Space'),
      sprint: this.held.has('ShiftLeft') || this.held.has('ShiftRight') || Math.hypot(this.stick.x, this.stick.z) > 0.95,
      interact: this.pressed.has('KeyE') || this.pressed.has('KeyF'),
      use,
      uiBlocked,
    };
  }

  endFrame(): void {
    this.pressed.clear();
  }
}

/** Builds a floating virtual joystick on the left half of a touch screen. */
export function attachJoystick(zone: HTMLElement, knob: HTMLElement, input: Input): void {
  let id: number | null = null;
  let ox = 0;
  let oy = 0;
  const base = knob.parentElement as HTMLElement;
  zone.addEventListener('pointerdown', e => {
    if (id !== null) return;
    id = e.pointerId;
    ox = e.clientX;
    oy = e.clientY;
    zone.setPointerCapture(e.pointerId);
    base.style.left = `${ox}px`;
    base.style.top = `${oy}px`;
    base.classList.add('active');
  });
  zone.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - ox;
    let dy = e.clientY - oy;
    const d = Math.hypot(dx, dy);
    if (d > JOYSTICK_RADIUS) {
      dx = (dx / d) * JOYSTICK_RADIUS;
      dy = (dy / d) * JOYSTICK_RADIUS;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.setStick(dx / JOYSTICK_RADIUS, dy / JOYSTICK_RADIUS);
  });
  const end = (e: PointerEvent): void => {
    if (e.pointerId !== id) return;
    id = null;
    knob.style.transform = '';
    base.classList.remove('active');
    input.setStick(0, 0);
  };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);
}
