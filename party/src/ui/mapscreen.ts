// 원정 지도 화면: 열을 따라 이어진 방들. 갈 수 있는 방을 눌러 들어간다. 파티 체력 · 스트레스와 귀환 버튼.
import { CLASSES } from '../data/classes';
import { CONTRACTS } from '../data/contracts';
import { MOODS } from '../data/moods';
import { NODE_INFO, reachable, type Expedition } from '../sim/expedition';
import type { Hero } from '../sim/hero';
import type { RunState } from '../sim/run';

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export class MapScreen {
  private ex!: Expedition;

  constructor(
    private onEnter: (nodeId: number) => void,
    private onRetreat: () => void,
    private onSheet: (h: Hero) => void,
  ) {
    $('map').addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-node],[data-act],[data-hero]');
      if (!el) return;
      if (el.dataset.node !== undefined) {
        const id = Number(el.dataset.node);
        if (!reachable(this.ex).includes(id)) return;
        this.close();
        this.onEnter(id);
      } else if (el.dataset.act === 'retreat') {
        if (confirm('원정을 마치고 거점으로 돌아갈까요? 번 골드와 짐은 챙깁니다.')) {
          this.close();
          this.onRetreat();
        }
      } else if (el.dataset.hero !== undefined) this.onSheet(this.heroes[Number(el.dataset.hero)]);
    });
  }

  private heroes: Hero[] = [];

  open(ex: Expedition, run: RunState, heroes: Hero[], note = '') {
    this.ex = ex;
    this.heroes = heroes;
    const def = CONTRACTS[run.contract?.kind ?? 'hunt'];
    const can = new Set(reachable(ex));
    // 좌표: 열은 가로로, 같은 열의 방은 세로로 고르게
    const W = Math.max(560, ex.cols * 86), H = 250;
    const cols: number[][] = [];
    for (const n of ex.nodes) (cols[n.col] ??= []).push(n.id);
    const pos = (id: number) => {
      const n = ex.nodes[id], list = cols[n.col];
      const x = 40 + (n.col * (W - 80)) / Math.max(1, ex.cols - 1);
      const y = list.length === 1 ? H / 2 : 40 + (n.row * (H - 80)) / (list.length - 1);
      return [x, y];
    };
    let lines = '';
    for (const n of ex.nodes)
      for (const m of n.next) {
        const [x1, y1] = pos(n.id), [x2, y2] = pos(m);
        const walked = ex.done.includes(n.id) && (ex.done.includes(m) || ex.at === m);
        const open = ex.at === n.id && can.has(m);
        lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${walked ? 'walked' : open ? 'open' : ''}" />`;
      }
    const nodes = ex.nodes.map((n) => {
      const [x, y] = pos(n.id);
      const info = NODE_INFO[n.kind];
      const cls = [ex.at === n.id ? 'here' : '', can.has(n.id) ? 'can' : '', ex.done.includes(n.id) ? 'done' : ''].join(' ');
      return `<g class="node ${cls}" data-node="${n.id}" transform="translate(${x},${y})">
        <circle r="17" style="stroke:${info.color}" /><text y="5" style="fill:${info.color}">${info.icon}</text>
        <title>${info.name}</title></g>`;
    }).join('');
    const party = heroes.map((h, i) => {
      const k = CLASSES[h.cls];
      const mood = h.mood ? MOODS[h.mood] : null;
      const hp = Math.round((h.hpFrac ?? 1) * 100);
      return `<button class="mh" data-hero="${i}" style="border-color:${k.color}66">
        <span style="color:${k.color}">${run.captain === h.uid || (run.captain === undefined && i === 0) ? '★ ' : ''}${k.glyph} ${esc(h.def.name)}</span> <span class="lv">Lv${h.xl}</span>${h.pending ? ' <span class="gold">★</span>' : ''}
        <span class="mbar hp"><i style="width:${hp}%"></i></span>
        <span class="mbar st"><i style="width:${h.stress}%;background:${mood ? mood.color : '#8a5cc0'}"></i></span></button>`;
    }).join('');
    $('map').querySelector('.box')!.innerHTML = `
      <div class="thead"><h2>${def.name}</h2><span class="tstat"><b class="gold">${run.gold}G</b> · 짐 ${run.loot.length + run.found.length} · 벨트 ${run.belt.length}</span></div>
      ${note ? `<p class="note">${note}</p>` : ''}
      <div class="mapwrap"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${lines}${nodes}</svg></div>
      <div class="legend">${Object.values(NODE_INFO).map((i) => `<span style="color:${i.color}">${i.icon} ${i.name}</span>`).join('')}</div>
      <div class="mparty">${party}</div>
      <div class="go"><button class="retreat" data-act="retreat">거점으로 귀환</button><span class="dim">빛나는 방을 눌러 나아간다</span></div>`;
    $('map').classList.remove('hidden');
  }

  close() {
    $('map').classList.add('hidden');
  }
}
