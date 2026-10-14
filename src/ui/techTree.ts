import {itemDef} from '../items/catalog';
import type {Profile} from '../meta/profile';
import {BUILDINGS, isUnlocked, levelOf, NODE_BY_ID, NODES, type BuildingId, type UpgradeNode} from '../meta/upgrades';
import {countItem, purchaseCheck} from '../meta/workshop';
import {byId, el, fmt} from './dom';

const BUILD_RADIUS = 200;
const DEPTH_STEP = 150;
/** Minimum arc distance between sibling nodes, in tree pixels. */
const LEAF_SPACING = 88;
const NODE_SIZE = 58;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.8;

/** Glyph shown inside each node. */
const ICONS: Readonly<Record<string, string>> = {
  'blacksmith.sharpen': '⚔',
  'blacksmith.crit': '✦',
  'blacksmith.weapons': '⚒',
  'blacksmith.armor': '⛨',
  'alchemist.brewing': '⚗',
  'alchemist.potency': '✚',
  'alchemist.vitality': '♥',
  'market.bag': '▦',
  'market.stash': '▤',
  'market.haggle': '◎',
  'tavern.tank': '▼',
  'tavern.wick': '✺',
  'tavern.emergency': '⚑',
  'barracks.endurance': '➶',
  'barracks.whirlwind': '❂',
  'barracks.dash': '➹',
  'barracks.warcry': '♫',
  'barracks.mercenary': '☗',
  'command.search': '⌕',
  'command.thorough': '☰',
  'command.luck': '✧',
  'command.autoReturn': '↩',
  'command.autoExplore': '⇄',
  'command.autoBattle': '⚔',
};
const BUILDING_ICONS: Readonly<Record<BuildingId, string>> = {tent: '⛺', blacksmith: '⚒', alchemist: '⚗', market: '⚖', tavern: '♨', barracks: '⛊', command: '♜'};

interface LaidOut {
  node: UpgradeNode;
  x: number;
  y: number;
  parent: string | null;
}

/** Parent of a node in the drawn tree: its requirement, or the camp center for buildings. */
const parentOf = (n: UpgradeNode): string | null => n.requires?.node ?? null;

/**
 * Radial layout: one wedge per building around the camp; depth = distance from
 * the building node; leaves get even angular slots and parents sit between their children.
 */
export function layoutTree(): LaidOut[] {
  const branches = BUILDINGS.filter(b => b.id !== 'tent');
  const children = new Map<string, UpgradeNode[]>();
  for (const n of NODES) {
    const p = parentOf(n);
    if (p) children.set(p, [...(children.get(p) ?? []), n]);
  }
  const depthOf = (n: UpgradeNode): number => (n.requires ? depthOf(NODE_BY_ID.get(n.requires.node)!) + 1 : 0);
  const out: LaidOut[] = [];
  branches.forEach((b, i) => {
    const center = (i / branches.length) * Math.PI * 2 - Math.PI / 2;
    const root = NODE_BY_ID.get(`${b.id}.build`)!;
    // Count leaves to share the wedge, then place depth-first.
    const leaves = (n: UpgradeNode): number => children.get(n.id)?.reduce((s, c) => s + leaves(c), 0) || 1;
    const total = leaves(root);
    const outerRadius = BUILD_RADIUS + DEPTH_STEP;
    const span = Math.min((Math.PI * 2) / branches.length - 0.12, (total * LEAF_SPACING) / outerRadius);
    let cursor = center - span / 2;
    const step = span / total;
    let leafIndex = 0;
    const place = (n: UpgradeNode): number => {
      const kids = children.get(n.id) ?? [];
      let angle: number;
      let stagger = 0;
      if (!kids.length) {
        angle = cursor + step / 2;
        cursor += step;
        // Crowded wedges alternate leaves between two rings so labels do not collide.
        if (total > 3 && leafIndex++ % 2) stagger = DEPTH_STEP * 0.5;
      } else {
        const angles = kids.map(place);
        angle = (angles[0] + angles[angles.length - 1]) / 2;
      }
      const r = BUILD_RADIUS + depthOf(n) * DEPTH_STEP + stagger;
      out.push({node: n, x: Math.cos(angle) * r, y: Math.sin(angle) * r, parent: parentOf(n)});
      return angle;
    };
    place(root);
  });
  return out;
}

type NodeState = 'locked' | 'soon' | 'available' | 'partial' | 'maxed';

function stateOf(profile: Profile, n: UpgradeNode): NodeState {
  const level = levelOf(profile.upgrades, n.id);
  if (n.comingSoon) return 'soon';
  if (level >= n.maxLevel) return 'maxed';
  if (level > 0) return 'partial';
  return isUnlocked(profile.upgrades, n) ? 'available' : 'locked';
}

export interface TechTreeHost {
  getProfile(): Profile;
  purchase(nodeId: string): boolean;
  icons: ReadonlyMap<string, string>;
}

/** Full-screen pan/zoom view of the whole hideout tree. */
export class TechTree {
  private readonly root = byId('treeOverlay');
  private readonly viewport = byId('treeViewport');
  private readonly stage = byId('treeStage');
  private readonly tip = byId('treeTip');
  private readonly layout = layoutTree();
  private zoom = 0.8;
  private panX = 0;
  private panY = 0;
  private readonly pointers = new Map<number, {x: number; y: number}>();
  private dragMoved = false;
  private pinchStart = 0;
  private pinchZoom = 1;

  constructor(private readonly host: TechTreeHost) {
    byId('treeClose').addEventListener('click', () => this.show(false));
    byId('treeReset').addEventListener('click', () => this.resetView());
    byId('treeZoomIn').addEventListener('click', () => this.zoomBy(1.2));
    byId('treeZoomOut').addEventListener('click', () => this.zoomBy(1 / 1.2));
    this.viewport.addEventListener(
      'wheel',
      e => {
        e.preventDefault();
        this.zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY);
      },
      {passive: false},
    );
    this.viewport.addEventListener('pointerdown', e => {
      this.pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
      this.dragMoved = false;
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
        this.pinchZoom = this.zoom;
      }
    });
    window.addEventListener('pointermove', e => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev || this.root.hidden) return;
      if (this.pointers.size === 2) {
        this.pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
        const [a, b] = [...this.pointers.values()];
        this.setZoom((this.pinchZoom * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(1, this.pinchStart));
        this.dragMoved = true;
        return;
      }
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) this.dragMoved = true;
      this.panX += dx;
      this.panY += dy;
      this.pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
      this.applyTransform();
    });
    const release = (e: PointerEvent): void => {
      this.pointers.delete(e.pointerId);
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  }

  get open(): boolean {
    return !this.root.hidden;
  }

  show(open: boolean): void {
    this.root.hidden = !open;
    this.tip.hidden = true;
    if (open) {
      if (!this.panX && !this.panY) this.resetView();
      this.render();
    }
  }

  private resetView(): void {
    const r = this.viewport.getBoundingClientRect();
    // Fit the actual extent of the laid-out tree (plus room for labels).
    const minX = Math.min(...this.layout.map(l => l.x)) - NODE_SIZE * 1.5;
    const maxX = Math.max(...this.layout.map(l => l.x)) + NODE_SIZE * 1.5;
    const minY = Math.min(...this.layout.map(l => l.y)) - NODE_SIZE;
    const maxY = Math.max(...this.layout.map(l => l.y)) + NODE_SIZE * 1.5;
    this.zoom = Math.max(MIN_ZOOM, Math.min(1.2, Math.min(r.width / (maxX - minX), r.height / (maxY - minY))));
    this.panX = r.width / 2 - ((minX + maxX) / 2) * this.zoom;
    this.panY = r.height / 2 - ((minY + maxY) / 2) * this.zoom;
    this.applyTransform();
  }

  private setZoom(z: number): void {
    this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
    this.applyTransform();
  }

  /** Zooms keeping the point under the cursor fixed. */
  private zoomBy(factor: number, cx?: number, cy?: number): void {
    const r = this.viewport.getBoundingClientRect();
    const px = (cx ?? r.left + r.width / 2) - r.left;
    const py = (cy ?? r.top + r.height / 2) - r.top;
    const before = this.zoom;
    this.setZoom(this.zoom * factor);
    const k = this.zoom / before;
    this.panX = px - (px - this.panX) * k;
    this.panY = py - (py - this.panY) * k;
    this.applyTransform();
  }

  private applyTransform(): void {
    this.stage.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  render(): void {
    const profile = this.host.getProfile();
    const pos = new Map(this.layout.map(l => [l.node.id, l]));
    const lines: string[] = [];
    for (const l of this.layout) {
      const from = l.parent ? pos.get(l.parent) : null;
      const x1 = from ? from.x : 0;
      const y1 = from ? from.y : 0;
      const st = stateOf(profile, l.node);
      const cls = st === 'maxed' || st === 'partial' ? 'lit' : st === 'available' ? 'open' : 'dark';
      lines.push(`<line class="${cls}" x1="${x1}" y1="${y1}" x2="${l.x}" y2="${l.y}"/>`);
    }
    const extent = BUILD_RADIUS + DEPTH_STEP * 5;
    this.stage.innerHTML = `<svg class="treeLines" viewBox="${-extent} ${-extent} ${extent * 2} ${extent * 2}" style="left:${-extent}px;top:${-extent}px;width:${extent * 2}px;height:${extent * 2}px">${lines.join('')}</svg>`;
    const hub = el('div', 'treeNode hub', `<span class="glyph">${BUILDING_ICONS.tent}</span>`);
    hub.style.transform = 'translate(-50%, -50%)';
    this.stage.append(hub);
    for (const l of this.layout) this.stage.append(this.nodeEl(profile, l));
    byId('treeGold').innerHTML = `보유 금화 <b class="gold">${fmt(profile.gold)}G</b>`;
  }

  private nodeEl(profile: Profile, l: LaidOut): HTMLElement {
    const n = l.node;
    const isBuild = n.id.endsWith('.build');
    const level = levelOf(profile.upgrades, n.id);
    const st = stateOf(profile, n);
    const affordable = purchaseCheck(profile, n.id) === null;
    const glyph = isBuild ? BUILDING_ICONS[n.building] : (ICONS[n.id] ?? '◆');
    const node = el('button', `treeNode ${st}${isBuild ? ' building' : ''}${affordable ? ' affordable' : ''}`);
    node.style.left = `${l.x}px`;
    node.style.top = `${l.y}px`;
    const pips = n.maxLevel > 1 ? `<span class="lv">${level}/${n.maxLevel}</span>` : '';
    const label = isBuild ? BUILDINGS.find(b => b.id === n.building)!.name : n.name;
    node.innerHTML = `<span class="glyph">${glyph}</span>${pips}<span class="name">${label}</span>`;
    node.addEventListener('pointerenter', () => this.showTip(profile, n, node));
    node.addEventListener('pointerleave', () => (this.tip.hidden = true));
    node.addEventListener('click', () => {
      if (this.dragMoved) return;
      if (this.host.purchase(n.id)) {
        this.render();
        const fresh = [...this.stage.querySelectorAll('.treeNode')].find(e => (e as HTMLElement).style.left === `${l.x}px` && (e as HTMLElement).style.top === `${l.y}px`);
        fresh?.classList.add('bought');
      } else {
        node.classList.remove('shake');
        void node.offsetWidth;
        node.classList.add('shake');
      }
    });
    return node;
  }

  private showTip(profile: Profile, n: UpgradeNode, anchor: HTMLElement): void {
    const level = levelOf(profile.upgrades, n.id);
    const maxed = level >= n.maxLevel;
    const isBuild = n.id.endsWith('.build');
    const title = isBuild ? `${BUILDINGS.find(b => b.id === n.building)!.name} 건설` : n.name;
    const chips: string[] =
      maxed || n.comingSoon
        ? []
        : n.cost(level + 1).items.map(([id, qty]) => {
            const have = countItem(profile, id);
            return `<span class="chip${have < qty ? ' short' : ''}">${this.host.icons.get(id) ? `<img src="${this.host.icons.get(id)}" alt="">` : itemDef(id).icon.glyph}<b>${have}/${qty}</b> ${itemDef(id).name}</span>`;
          });
    const gold =
      maxed || n.comingSoon ? '' : `<span class="chip${profile.gold < n.cost(level + 1).gold ? ' short' : ''}"><b class="gold">${fmt(n.cost(level + 1).gold)}G</b></span>`;
    const req = !isUnlocked(profile.upgrades, n) && n.requires ? `<div class="req">필요: ${NODE_BY_ID.get(n.requires.node)?.name} Lv${n.requires.level}</div>` : '';
    const problem = purchaseCheck(profile, n.id);
    const hint = n.comingSoon ? '준비 중인 기술' : maxed ? '최대 레벨' : problem === null ? '클릭해서 강화' : problem === 'cost' ? '재료 부족' : '잠김';
    this.tip.innerHTML = `
      <strong>${title}</strong>${n.maxLevel > 1 ? ` <span class="lvl">Lv ${level}/${n.maxLevel}</span>` : ''}
      <div class="eff">${level > 0 && !isBuild ? `현재: ${n.effect(level)}` : ''}</div>
      ${maxed ? '' : `<div class="eff next">${isBuild ? n.effect(1) : `다음: ${n.effect(level + 1)}`}</div>`}
      ${req}<div class="costs">${gold}${chips.join('')}</div><div class="hint">${hint}</div>`;
    this.tip.hidden = false;
    const r = anchor.getBoundingClientRect();
    const w = this.tip.offsetWidth;
    const x = r.right + 10 + w > window.innerWidth ? r.left - w - 10 : r.right + 10;
    this.tip.style.left = `${Math.max(8, x)}px`;
    this.tip.style.top = `${Math.max(8, Math.min(window.innerHeight - this.tip.offsetHeight - 8, r.top - 10))}px`;
  }
}
