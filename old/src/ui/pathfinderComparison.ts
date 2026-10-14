import type {Dungeon} from '../dungeon/types';
import type {SimulationResult} from '../dungeon/pathfinderSimulation';
import {el} from './dom';

const CELL = 9;
const METRICS: readonly (readonly [string, 'distance' | 'revisited' | 'backtrack' | 'deadEnds' | 'coverage'])[] = [
  ['이동 칸 수', 'distance'],
  ['재방문 칸 수', 'revisited'],
  ['기존 경로 되돌아감', 'backtrack'],
  ['막다른 길 횟수', 'deadEnds'],
  ['탐색률 %', 'coverage'],
];
const MILESTONES = [50, 90, 100] as const;

function traceCanvas(dungeon: Dungeon, runs: readonly (readonly [SimulationResult, string])[]): HTMLCanvasElement {
  const canvas = el('canvas');
  canvas.width = dungeon.width * CELL;
  canvas.height = dungeon.height * CELL;
  canvas.style.cssText = 'width:100%;max-height:55vh;object-fit:contain;background:#080d15';
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = '#34444d';
  for (let y = 0; y < dungeon.height; y++) {
    for (let x = 0; x < dungeon.width; x++) if (dungeon.grid[y][x]) ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
  }
  for (const [run, color] of runs) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    run.history.forEach(([x, y], i) => {
      const px = x * CELL + CELL / 2;
      const py = y * CELL + CELL / 2;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.stroke();
  }
  return canvas;
}

const row = (label: string, a: unknown, b: unknown): HTMLElement =>
  el('tr', {}, el('td', {text: label}), el('td', {text: String(a)}), el('td', {text: String(b)}));

export function renderPathfinderComparison(panel: HTMLElement, dungeon: Dungeon, base: SimulationResult, guided: SimulationResult): void {
  const close = el('button', {className: 'close', text: '닫기'});
  close.onclick = () => {
    panel.hidden = true;
  };
  panel.replaceChildren(
    close,
    el('h3', {text: `동일 던전 시드 ${dungeon.seed} · 길잡이 A/B 비교`}),
    el('p', {text: '주황: 스킬 없음 / 파랑: 길잡이 보유 · 전투 시간 제외, 한 칸당 동일 이동 시간'}),
    el(
      'table',
      {},
      el('tr', {}, el('th', {text: '지표'}), el('th', {text: '없음'}), el('th', {text: '있음'})),
      ...METRICS.map(([label, key]) => row(label, base[key], guided[key])),
      ...MILESTONES.map(t => row(`${t}% 도달 이동 칸`, base.thresholds[t] ?? '-', guided.thresholds[t] ?? '-')),
    ),
    el('p', {text: `완료 여부: 없음 ${base.complete ? '완료' : '미완료'} / 있음 ${guided.complete ? '완료' : '미완료'}`}),
    traceCanvas(dungeon, [[base, '#f1a35c'], [guided, '#6bc8ff']]),
  );
}
