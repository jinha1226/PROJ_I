import {CATEGORY_LABEL, itemDef, RARITY_COLOR, RARITY_LABEL, type ItemDef} from '../items/catalog';
import {canPlace, findPlaced, footprint, stackValue, type ItemStack} from '../items/inventory';
import {itemOf, slotAccepts, SLOT_IDS, transfer, type Dest, type SlotId, type Source, type Stores} from '../items/stores';
import {el, fmt} from './dom';

export interface ItemAction {
  label: string;
  run: () => void;
  tone?: 'primary' | 'danger';
}

export interface PanelSpec {
  gridId: string;
  title: string;
  subtitle?: string;
}

export interface InventoryHost {
  getStores(): Stores;
  setStores(next: Stores): void;
  /** Unrevealed container items show as "?" and cannot be moved. */
  isHidden(gridId: string, uid: number): boolean;
  /** The uid currently being searched in a grid, for the spinner. */
  searchingUid(gridId: string): number | null;
  actions(source: Source, item: ItemStack): ItemAction[];
  /** Dropped outside every panel (raid: drop on the floor). */
  dropOutside?(source: Source, item: ItemStack): void;
  onMoved?(item: ItemStack): void;
  onDenied?(): void;
}

const SLOT_LABEL: Readonly<Record<SlotId, string>> = {weapon: '무기', armor: '방어구', belt0: '벨트 1', belt1: '벨트 2'};
const DRAG_THRESHOLD = 5;

interface Drag {
  source: Source;
  item: ItemStack;
  rot: boolean;
  grabX: number;
  grabY: number;
  ghost: HTMLElement;
  startX: number;
  startY: number;
  moved: boolean;
}

function cellSize(): number {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell')) || 44;
}

/** Item tile: icon image (rotated if needed), quantity, rarity border. */
export function itemTile(def: ItemDef, item: ItemStack, rot: boolean, icons: ReadonlyMap<string, string>, cell: number): HTMLElement {
  const {w, h} = footprint(def.id, rot);
  const tile = el('div', 'itemTile');
  tile.style.width = `${w * cell}px`;
  tile.style.height = `${h * cell}px`;
  tile.style.setProperty('--rarity', RARITY_COLOR[def.rarity]);
  const icon = icons.get(def.id);
  if (icon) {
    const img = el('img', 'itemIcon') as HTMLImageElement;
    img.src = icon;
    img.draggable = false;
    img.style.width = `${def.w * cell - 6}px`;
    img.style.height = `${def.h * cell - 6}px`;
    if (rot) img.style.transform = 'translate(-50%, -50%) rotate(90deg)';
    tile.append(img);
  } else {
    const glyph = el('span', 'itemGlyph', def.icon.glyph);
    glyph.style.color = def.icon.color;
    glyph.style.fontSize = `${Math.min(w, h) * cell * 0.62}px`;
    tile.append(glyph);
  }
  if (def.maxStack > 1) tile.append(el('span', 'itemQty', String(item.qty)));
  return tile;
}

/** Drag-and-drop grid inventory shared by the raid and the hideout. */
export class InventoryUI {
  private panels: PanelSpec[] = [];
  private drag: Drag | null = null;
  private signature = '';
  private card: HTMLElement;
  private pinned: Source | null = null;
  private readonly gridEls = new Map<string, HTMLElement>();
  private readonly slotEls = new Map<SlotId, HTMLElement>();
  private extraEl: HTMLElement | null = null;
  private readonly listeners = new AbortController();

  constructor(
    private readonly root: HTMLElement,
    private readonly icons: ReadonlyMap<string, string>,
    private readonly host: InventoryHost,
    private readonly leftTitle = '내 장비',
  ) {
    this.card = el('div', 'itemCard');
    this.card.hidden = true;
    document.body.append(this.card);
    const signal = this.listeners.signal;
    let lastPointer = {clientX: 0, clientY: 0};
    window.addEventListener('pointermove', e => {
      lastPointer = e;
      this.onMove(e);
    }, {signal});
    window.addEventListener('pointerup', e => this.onUp(e), {signal});
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyR' && this.drag) {
        this.drag.rot = !this.drag.rot;
        this.updateGhost(lastPointer);
      }
    }, {signal});
    document.addEventListener('pointerdown', e => {
      if (this.pinned && !this.card.contains(e.target as Node)) this.unpin();
    }, {signal});
  }

  /** Sets which grids appear on the right side; extra content (e.g. a shop) goes below. */
  setPanels(panels: PanelSpec[], extra: HTMLElement | null = null): void {
    this.panels = panels;
    this.extraEl = extra;
    this.signature = '';
  }

  /** Rebuilds the DOM only when something visible changed. */
  refresh(force = false): void {
    const stores = this.host.getStores();
    const sig = this.computeSignature(stores);
    if (!force && sig === this.signature) {
      this.updateSpinners();
      return;
    }
    this.signature = sig;
    this.build(stores);
  }

  private computeSignature(stores: Stores): string {
    const parts: string[] = [];
    for (const id of ['backpack', ...this.panels.map(p => p.gridId)]) {
      const g = stores.grids[id];
      if (!g) continue;
      parts.push(id, ...g.items.map(p => `${p.item.uid}:${p.item.qty}:${p.x},${p.y},${p.rot ? 1 : 0}:${this.host.isHidden(id, p.item.uid) ? 'h' : ''}`));
    }
    for (const id of SLOT_IDS) parts.push(`${id}=${stores.slots[id]?.uid ?? ''}:${stores.slots[id]?.qty ?? ''}`);
    parts.push(this.panels.map(p => p.title + (p.subtitle ?? '')).join('|'));
    return parts.join(';');
  }

  private build(stores: Stores): void {
    this.root.replaceChildren();
    this.gridEls.clear();
    this.slotEls.clear();
    const cell = cellSize();

    const left = el('section', 'invColumn');
    left.append(el('h3', 'invTitle', this.leftTitle));
    const slots = el('div', 'slotRow');
    for (const id of SLOT_IDS) {
      const slot = el('div', `slot slot-${id}`);
      slot.append(el('span', 'slotLabel', SLOT_LABEL[id]));
      const item = stores.slots[id];
      if (item) slot.append(this.itemElement(item, {kind: 'slot', id}, false, cell, false));
      this.slotEls.set(id, slot);
      slots.append(slot);
    }
    left.append(slots);
    const bp = stores.grids.backpack;
    const bpValue = bp.items.reduce((s, p) => s + stackValue(p.item), 0);
    left.append(el('div', 'gridHeader', `가방 <b>${bp.w}×${bp.h}</b> · 가치 <b class="gold">${fmt(bpValue)}G</b>`));
    left.append(this.gridElement('backpack', stores, cell));
    this.root.append(left);

    const right = el('section', 'invColumn');
    for (const panel of this.panels) {
      const grid = stores.grids[panel.gridId];
      if (!grid) continue;
      right.append(el('h3', 'invTitle', panel.title));
      if (panel.subtitle) right.append(el('div', 'gridHeader', panel.subtitle));
      right.append(this.gridElement(panel.gridId, stores, cell));
    }
    if (!this.panels.length) right.append(el('div', 'invEmpty', '주변에 열린 상자가 없습니다.<br><small>상자나 시체 근처에서 <b>E</b></small>'));
    if (this.extraEl) right.append(this.extraEl);
    this.root.append(right);
  }

  private gridElement(gridId: string, stores: Stores, cell: number): HTMLElement {
    const grid = stores.grids[gridId];
    const g = el('div', 'grid');
    g.style.width = `${grid.w * cell}px`;
    g.style.height = `${grid.h * cell}px`;
    g.dataset.grid = gridId;
    for (const p of grid.items) {
      const hidden = this.host.isHidden(gridId, p.item.uid);
      const item = this.itemElement(p.item, {kind: 'grid', id: gridId, uid: p.item.uid}, p.rot, cell, hidden);
      item.style.left = `${p.x * cell}px`;
      item.style.top = `${p.y * cell}px`;
      g.append(item);
    }
    this.gridEls.set(gridId, g);
    return g;
  }

  private itemElement(item: ItemStack, source: Source, rot: boolean, cell: number, hidden: boolean): HTMLElement {
    const def = itemDef(item.defId);
    if (hidden) {
      const {w, h} = footprint(def.id, rot);
      const tile = el('div', 'itemTile hidden');
      tile.style.width = `${w * cell}px`;
      tile.style.height = `${h * cell}px`;
      tile.dataset.uid = String(item.uid);
      tile.append(el('span', 'itemGlyph', '?'));
      return tile;
    }
    const tile = itemTile(def, item, rot, this.icons, cell);
    tile.dataset.uid = String(item.uid);
    tile.addEventListener('pointerdown', e => this.onDown(e, source, item, rot, tile));
    tile.addEventListener('pointerenter', () => {
      if (!this.drag && !this.pinned) this.showCard(item, tile, null);
    });
    tile.addEventListener('pointerleave', () => {
      if (!this.pinned) this.card.hidden = true;
    });
    tile.addEventListener('contextmenu', e => {
      e.preventDefault();
      this.host.actions(source, item)[0]?.run();
    });
    return tile;
  }

  private updateSpinners(): void {
    for (const [gridId, g] of this.gridEls) {
      const uid = this.host.searchingUid(gridId);
      g.querySelectorAll('.itemTile.hidden').forEach(t => t.classList.toggle('searching', (t as HTMLElement).dataset.uid === String(uid)));
    }
  }

  // ---------- item card ----------

  private showCard(item: ItemStack, anchor: HTMLElement, actions: ItemAction[] | null): void {
    const def = itemDef(item.defId);
    const cells = def.w * def.h;
    const value = stackValue(item);
    const stats: string[] = [];
    if (def.weapon) stats.push(`피해 <b>${def.weapon.damage}</b> · 속도 <b>${(1 / def.weapon.speed).toFixed(2)}</b> · 사거리 <b>${def.weapon.reach}</b> · ${def.weapon.kind === '2h' ? '양손' : '한손'}`);
    if (def.armor) stats.push(`피해 감소 <b>${Math.round(def.armor.reduction * 100)}%</b> · 최대 체력 <b>+${def.armor.bonusHp}</b>`);
    if (def.consumable) stats.push(`회복 <b>${def.consumable.heal}</b> · 사용 <b>${def.consumable.useTime}s</b>`);
    this.card.innerHTML = `
      <div class="cardHead" style="--rarity:${RARITY_COLOR[def.rarity]}">
        <strong>${def.name}</strong>
        <span>${RARITY_LABEL[def.rarity]} ${CATEGORY_LABEL[def.category]}</span>
      </div>
      <p>${def.desc}</p>
      ${stats.map(s => `<div class="cardStat">${s}</div>`).join('')}
      <div class="cardValue"><span>가치 <b class="gold">${fmt(value)}G</b>${item.qty > 1 ? ` (${item.qty}개)` : ''}</span><span>칸당 <b>${fmt(Math.round(value / cells))}G</b> · ${def.w}×${def.h}</span></div>`;
    if (actions?.length) {
      const row = el('div', 'cardActions');
      for (const a of actions) {
        const b = el('button', a.tone ?? '', a.label) as HTMLButtonElement;
        b.addEventListener('click', () => {
          this.unpin();
          a.run();
        });
        row.append(b);
      }
      this.card.append(row);
    }
    this.card.hidden = false;
    const r = anchor.getBoundingClientRect();
    const cw = this.card.offsetWidth;
    const ch = this.card.offsetHeight;
    const x = r.right + 8 + cw > window.innerWidth ? r.left - cw - 8 : r.right + 8;
    this.card.style.left = `${Math.max(8, x)}px`;
    this.card.style.top = `${Math.min(window.innerHeight - ch - 8, Math.max(8, r.top))}px`;
  }

  private unpin(): void {
    this.pinned = null;
    this.card.hidden = true;
  }

  // ---------- dragging ----------

  private onDown(e: PointerEvent, source: Source, item: ItemStack, rot: boolean, tile: HTMLElement): void {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const r = tile.getBoundingClientRect();
    const cell = cellSize();
    const ghost = tile.cloneNode(true) as HTMLElement;
    ghost.classList.add('ghost');
    ghost.dataset.rot = String(rot);
    ghost.hidden = true;
    document.body.append(ghost);
    this.drag = {
      source,
      item,
      rot,
      grabX: Math.floor((e.clientX - r.left) / cell),
      grabY: Math.floor((e.clientY - r.top) / cell),
      ghost,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    this.card.hidden = true;
  }

  private onMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD) return;
    d.moved = true;
    d.ghost.hidden = false;
    this.updateGhost(e);
  }

  private updateGhost(e: {clientX: number; clientY: number}): void {
    const d = this.drag;
    if (!d) return;
    const cell = cellSize();
    const def = itemDef(d.item.defId);
    if (d.ghost.dataset.rot !== String(d.rot)) {
      const fresh = itemTile(def, d.item, d.rot, this.icons, cell);
      fresh.classList.add('ghost');
      fresh.dataset.rot = String(d.rot);
      d.ghost.replaceWith(fresh);
      d.ghost = fresh;
      // Grab point no longer maps onto the rotated shape: hold it by the corner.
      d.grabX = 0;
      d.grabY = 0;
    }
    const x = e.clientX;
    const y = e.clientY;
    d.ghost.style.left = `${x - (d.grabX + 0.5) * cell}px`;
    d.ghost.style.top = `${y - (d.grabY + 0.5) * cell}px`;
    const dest = this.destAt(x, y);
    d.ghost.classList.toggle('bad', Boolean(dest) && !this.preview(dest!));
  }

  private destAt(x: number, y: number): Dest | null {
    const d = this.drag;
    if (!d) return null;
    for (const [id, slot] of this.slotEls) {
      const r = slot.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return {kind: 'slot', id};
    }
    const cell = cellSize();
    for (const [id, g] of this.gridEls) {
      const r = g.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      return {kind: 'grid', id, x: Math.floor((x - r.left) / cell) - d.grabX, y: Math.floor((y - r.top) / cell) - d.grabY, rot: d.rot};
    }
    return null;
  }

  private preview(dest: Dest): boolean {
    const d = this.drag!;
    const stores = this.host.getStores();
    if (dest.kind === 'slot') return slotAccepts(dest.id, d.item.defId);
    const ignore = d.source.kind === 'grid' && d.source.id === dest.id ? d.item.uid : undefined;
    return canPlace(stores.grids[dest.id], d.item.defId, dest.x, dest.y, dest.rot, ignore) || transfer(stores, d.source, dest) !== null;
  }

  private onUp(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    d.ghost.remove();
    if (!d.moved) {
      // Plain click: pin the card with context actions.
      const tile = this.root.querySelector(`[data-uid="${d.item.uid}"]`) as HTMLElement | null;
      if (tile) {
        this.pinned = d.source;
        this.showCard(d.item, tile, this.host.actions(d.source, d.item));
      }
      return;
    }
    const stores = this.host.getStores();
    const dest = this.destAt(e.clientX, e.clientY);
    if (!dest) {
      if (this.host.dropOutside && itemOf(stores, d.source)) this.host.dropOutside(d.source, d.item);
      return;
    }
    const next = transfer(stores, d.source, dest);
    if (!next) {
      this.host.onDenied?.();
      return;
    }
    this.host.setStores(next);
    this.host.onMoved?.(d.item);
    this.refresh(true);
  }

  destroy(): void {
    this.listeners.abort();
    this.drag?.ghost.remove();
    this.drag = null;
    this.card.remove();
  }

  isDragging(): boolean {
    return this.drag !== null;
  }

  hideCard(): void {
    this.unpin();
  }

  /** True when the item still exists at its source (used after async actions). */
  static exists(stores: Stores, source: Source): boolean {
    return source.kind === 'slot' ? Boolean(stores.slots[source.id]) : Boolean(findPlaced(stores.grids[source.id], source.uid));
  }
}
