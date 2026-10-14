import {DEFAULT_VISUAL, visual, type VisualSettings} from '../render/visual';
import {el} from './dom';

/** Named looks to compare quickly; sliders fine-tune from there. */
const PRESETS: readonly {name: string; v: Partial<VisualSettings>}[] = [
  {name: '현재 그대로', v: {...DEFAULT_VISUAL}},
  {name: '쥬피터헬풍', v: {lighting: 'jh', rim: 0.5, blobShadows: true, outline: 0.06, pixel: 1, specular: true, bloom: 0.55}},
  {
    name: '쥬피터헬풍 + 픽셀',
    v: {lighting: 'jh', rim: 0.45, blobShadows: true, outline: 0.12, pixel: 3, normalEdge: 0.1, depthEdge: 0.3, pixelSnap: true, specular: true, bloom: 0.45},
  },
  {name: '밝은 + 픽셀', v: {lighting: 'classic', rim: 0.4, blobShadows: true, outline: 0.12, pixel: 3, normalEdge: 0.12, depthEdge: 0.3, pixelSnap: true}},
];

type Field =
  | {key: keyof VisualSettings; label: string; kind: 'toggle'}
  | {key: keyof VisualSettings; label: string; kind: 'range'; min: number; max: number; step: number}
  | {key: keyof VisualSettings; label: string; kind: 'choice'; options: readonly [string | number, string][]};

const FIELDS: readonly Field[] = [
  {
    key: 'lighting',
    label: '조명',
    kind: 'choice',
    options: [
      ['classic', '현재'],
      ['jh', '쥬피터헬풍'],
      ['dark', '아주 어둡게'],
    ],
  },
  {key: 'specular', label: '바닥 광택', kind: 'toggle'},
  {key: 'bloom', label: '블룸(빛 번짐)', kind: 'range', min: 0, max: 1.5, step: 0.05},
  {key: 'rim', label: '림 라이트', kind: 'range', min: 0, max: 1.5, step: 0.05},
  {key: 'blobShadows', label: '발밑 그림자', kind: 'toggle'},
  {key: 'outline', label: '캐릭터 외곽선', kind: 'range', min: 0, max: 0.2, step: 0.01},
  {
    key: 'pixel',
    label: '픽셀',
    kind: 'choice',
    options: [
      [1, '끔'],
      [2, '2px'],
      [3, '3px'],
      [4, '4px'],
    ],
  },
  {key: 'normalEdge', label: '배경 윤곽선(면)', kind: 'range', min: 0, max: 1, step: 0.05},
  {key: 'depthEdge', label: '배경 윤곽선(깊이)', kind: 'range', min: 0, max: 1, step: 0.05},
  {key: 'pixelSnap', label: '카메라 떨림 보정', kind: 'toggle'},
];

/** Floating control panel for the `?lab` visual comparison mode. */
export function mountLabPanel(onChange: (v: VisualSettings) => void): void {
  const panel = el('aside', 'labPanel');
  panel.append(el('h3', '', '비주얼 실험실 <small>저장되지 않음</small>'));
  const presets = el('div', 'labPresets');
  const rows = el('div', 'labRows');
  const render = (): void => {
    rows.replaceChildren();
    for (const f of FIELDS) {
      const row = el('label', 'labRow');
      row.append(el('span', '', f.label));
      const value = visual[f.key];
      if (f.kind === 'toggle') {
        const input = el('input') as HTMLInputElement;
        input.type = 'checkbox';
        input.checked = Boolean(value);
        input.addEventListener('change', () => set(f.key, input.checked));
        row.append(input);
      } else if (f.kind === 'range') {
        const input = el('input') as HTMLInputElement;
        Object.assign(input, {type: 'range', min: String(f.min), max: String(f.max), step: String(f.step), value: String(value)});
        const out = el('b', '', String(value));
        input.addEventListener('input', () => {
          out.textContent = input.value;
          set(f.key, Number(input.value));
        });
        row.append(input, out);
      } else {
        const box = el('span', 'labChoice');
        for (const [v, name] of f.options) {
          const b = el('button', v === value ? 'on' : '', name);
          b.addEventListener('click', e => {
            e.preventDefault();
            set(f.key, v);
            render();
          });
          box.append(b);
        }
        row.append(box);
      }
      rows.append(row);
    }
  };
  const set = (key: keyof VisualSettings, v: unknown): void => {
    Object.assign(visual, {[key]: v});
    onChange(visual);
  };
  for (const p of PRESETS) {
    const b = el('button', 'ghostBtn', p.name);
    b.addEventListener('click', () => {
      Object.assign(visual, DEFAULT_VISUAL, p.v);
      onChange(visual);
      render();
    });
    presets.append(b);
  }
  panel.append(
    presets,
    rows,
    el(
      'p',
      'labNote',
      '자동 탐험·전투가 켜진 레이드입니다. 마음에 드는 조합을 알려주시면 기본값으로 적용합니다. <kbd>B</kbd>/<kbd>H</kbd>로 자동을 끄고 직접 움직여 볼 수도 있습니다.',
    ),
  );
  // Keep clicks on the panel from reaching the game canvas.
  panel.addEventListener('pointerdown', e => e.stopPropagation());
  document.body.append(panel);
  render();
}
