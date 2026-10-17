import type { Unit } from '../sim/unit';

export type Drag =
  | { kind: 'unit'; unit: Unit; sx: number; sy: number; cx: number; cy: number; moved: boolean }
  | { kind: 'box'; sx: number; sy: number; cx: number; cy: number; moved: boolean }
  | { kind: 'pan'; sx: number; sy: number; camX: number; camY: number; tap?: boolean };

export interface ClickMark {
  x: number;
  y: number;
  color: string;
  t: number;
}

/** 입력·렌더러·HUD 가 공유하는 화면 상태 (시뮬레이션과 분리) */
export interface UiState {
  selected: Unit[];
  hover: Unit | null;
  mouseWorld: { x: number; y: number };
  mouseScreen: { x: number; y: number };
  inspect: Unit | null;
  drag: Drag | null;
  targeting: { unit: Unit; slot: number } | null;
  paused: boolean;
  speed: number;
  marks: ClickMark[];
}

export function createUiState(): UiState {
  return {
    selected: [],
    hover: null,
    mouseWorld: { x: 0, y: 0 },
    mouseScreen: { x: 0, y: 0 },
    inspect: null,
    drag: null,
    targeting: null,
    paused: true,
    speed: 1,
    marks: [],
  };
}
