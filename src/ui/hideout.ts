import {itemDef} from '../items/catalog';
import {gridValue, stackValue, type ItemStack} from '../items/inventory';
import {quickEquip, quickMove, type Source, type Stores} from '../items/stores';
import {buyItem, grantCharityKit, needsCharityKit, sellItem, SHOP} from '../meta/economy';
import {hideoutStores, withHideoutStores, type Profile} from '../meta/profile';
import {BUILDINGS, isBuilt, levelOf, nodesOf, type BuildingId} from '../meta/upgrades';
import {craft, purchase, purchaseCheck} from '../meta/workshop';
import type {AssetLibrary} from '../render/assets';
import {CampView} from '../render/camp';
import type {Stage} from '../render/stage';
import {renderBuildingPanel} from './buildingPanel';
import {byId, el, fmt} from './dom';
import {InventoryUI, itemTile, type ItemAction} from './inventory';

export interface HideoutCallbacks {
  getProfile(): Profile;
  setProfile(p: Profile): void;
  startRaid(): void;
  resetProfile(): void;
  sound(kind: 'coins' | 'denied' | 'pickup' | 'extracted'): void;
}

/** Between raids: a 3D camp whose buildings hold the upgrade tree, plus the stash. */
export class Hideout {
  private readonly root = byId('hideout');
  private readonly header = byId('hideoutHeader');
  private readonly panel = byId('buildingPanel');
  private readonly labels = byId('campLabels');
  private readonly stashOverlay = byId('stashOverlay');
  private readonly inventory: InventoryUI;
  private readonly shopEl = el('div', 'shop');
  private readonly camp: CampView;
  private readonly labelEls = new Map<BuildingId, HTMLElement>();
  private selected: BuildingId | null = null;

  constructor(
    private readonly icons: ReadonlyMap<string, string>,
    assets: AssetLibrary,
    private readonly stage: Stage,
    private readonly cb: HideoutCallbacks,
  ) {
    this.camp = new CampView(assets);
    this.inventory = new InventoryUI(byId('hideoutInventory'), icons, {
      getStores: () => hideoutStores(cb.getProfile()),
      setStores: next => cb.setProfile(withHideoutStores(cb.getProfile(), next)),
      isHidden: () => false,
      searchingUid: () => null,
      actions: (source, item) => this.actions(source, item),
      onMoved: () => cb.sound('pickup'),
      onDenied: () => cb.sound('denied'),
    }, '출정 장비');
    byId('raidStart').addEventListener('click', () => this.tryStart());
    byId('openStash').addEventListener('click', () => this.openStash(true));
    byId('stashClose').addEventListener('click', () => this.openStash(false));
    byId('resetSave').addEventListener('click', () => {
      if (confirm('모든 진행 상황을 초기화할까요?')) cb.resetProfile();
    });
    this.buildShop();
    for (const b of BUILDINGS) {
      const label = el('button', 'campLabel');
      label.addEventListener('click', () => this.select(b.id));
      this.labels.append(label);
      this.labelEls.set(b.id, label);
    }
    this.bindPicking();
    this.camp.sync(cb.getProfile().upgrades);
    // Shaders for the camp are compiled up front, like the raid's.
    this.stage.renderer.compile(this.camp.scene, this.camp.camera);
  }

  private bindPicking(): void {
    const canvas = this.stage.canvas;
    const ndc = (e: PointerEvent): [number, number] => {
      const r = canvas.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1];
    };
    canvas.addEventListener('pointermove', e => {
      if (this.root.hidden || !this.stashOverlay.hidden) return;
      const id = this.camp.pick(...ndc(e));
      this.camp.setHovered(id);
      canvas.style.cursor = id ? 'pointer' : '';
    });
    canvas.addEventListener('click', e => {
      if (this.root.hidden || !this.stashOverlay.hidden) return;
      const id = this.camp.pick(...ndc(e));
      if (id) this.select(id);
    });
  }

  private select(id: BuildingId): void {
    this.selected = id;
    this.panel.hidden = false;
    this.renderPanel();
  }

  private renderPanel(): void {
    if (!this.selected || this.panel.hidden) return;
    renderBuildingPanel(this.panel, this.cb.getProfile(), this.selected, this.icons, {
      purchase: nodeId => {
        const next = purchase(this.cb.getProfile(), nodeId);
        if (!next) {
          this.cb.sound('denied');
          return;
        }
        this.cb.setProfile(next);
        this.cb.sound(nodeId.endsWith('.build') ? 'extracted' : 'coins');
        this.refresh();
      },
      craft: recipeId => {
        const next = craft(this.cb.getProfile(), recipeId);
        if (!next) {
          this.cb.sound('denied');
          alert('제작할 수 없습니다. 재료나 창고 공간을 확인하세요.');
          return;
        }
        this.cb.setProfile(next);
        this.cb.sound('pickup');
        this.refresh();
      },
      openStash: () => this.openStash(true),
    });
  }

  private openStash(open: boolean): void {
    this.stashOverlay.hidden = !open;
    if (open) {
      this.inventory.setPanels([{gridId: 'stash', title: '창고', subtitle: '창고의 물건은 안전합니다. 건설·제작 재료는 창고와 가방에서 함께 쓰입니다.'}], this.shopEl);
      this.inventory.refresh(true);
    } else {
      this.inventory.hideCard();
      this.refresh();
    }
  }

  private buildShop(): void {
    this.shopEl.replaceChildren(el('h3', 'invTitle', '상인'));
    const list = el('div', 'shopList');
    for (const entry of SHOP) {
      const def = itemDef(entry.defId);
      const row = el('button', 'shopRow') as HTMLButtonElement;
      row.append(itemTile(def, {uid: 0, defId: def.id, qty: 1}, false, this.icons, 30), el('span', 'shopName', def.name), el('b', 'gold', `${entry.price}G`));
      row.addEventListener('click', () => {
        const next = buyItem(this.cb.getProfile(), entry.defId);
        if (!next) {
          this.cb.sound('denied');
          return;
        }
        this.cb.setProfile(next);
        this.cb.sound('coins');
        this.refresh();
      });
      list.append(row);
    }
    this.shopEl.append(list, el('p', 'shopHint', '아이템을 클릭하면 판매·이동·장착할 수 있습니다. 드래그로 배치하고, 드래그 중 <kbd>R</kbd>로 회전합니다.'));
  }

  private actions(source: Source, item: ItemStack): ItemAction[] {
    const stores = hideoutStores(this.cb.getProfile());
    const def = itemDef(item.defId);
    const apply = (next: Stores | null): void => {
      if (!next) {
        this.cb.sound('denied');
        return;
      }
      this.cb.setProfile(withHideoutStores(this.cb.getProfile(), next));
      this.cb.sound('pickup');
      this.refresh();
    };
    const out: ItemAction[] = [];
    if (source.kind === 'grid') {
      const other = source.id === 'stash' ? 'backpack' : 'stash';
      out.push({label: other === 'stash' ? '창고로' : '가방으로', run: () => apply(quickMove(stores, source, other))});
      if (def.weapon || def.armor || def.consumable) out.push({label: '장착', run: () => apply(quickEquip(stores, source))});
      out.push({
        label: `판매`,
        tone: 'danger',
        run: () => {
          const next = sellItem(this.cb.getProfile(), source.id as 'stash' | 'backpack', item.uid);
          if (!next) return;
          this.cb.setProfile(next);
          this.cb.sound('coins');
          this.refresh();
        },
      });
    } else {
      out.push({label: '창고로 해제', run: () => apply(quickMove(stores, source, 'stash'))});
    }
    return out;
  }

  private tryStart(): void {
    let profile = this.cb.getProfile();
    if (needsCharityKit(profile)) {
      profile = grantCharityKit(profile);
      this.cb.setProfile(profile);
      alert('빈털터리 모험가에게 길드가 녹슨 검을 지급했습니다.');
    }
    if (!profile.slots.weapon && !confirm('무기 없이 출발합니다. 맨손으로 싸울까요?')) return;
    this.cb.startRaid();
  }

  show(visible: boolean): void {
    this.root.hidden = !visible;
    if (visible) this.refresh();
    else {
      this.inventory.hideCard();
      this.stashOverlay.hidden = true;
      this.stage.canvas.style.cursor = '';
    }
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  refresh(): void {
    const p = this.cb.getProfile();
    this.camp.sync(p.upgrades);
    const stashValue = gridValue(p.stash);
    const loadoutValue = gridValue(p.backpack) + Object.values(p.slots).reduce((s, i) => s + (i ? stackValue(i) : 0), 0);
    this.header.innerHTML = `
      <div class="stat"><span>보유 금화</span><b class="gold">${fmt(p.gold)}G</b></div>
      <div class="stat"><span>창고 가치</span><b>${fmt(stashValue)}G</b></div>
      <div class="stat"><span>출정 장비 가치</span><b>${fmt(loadoutValue)}G</b><small>사망 시 잃음</small></div>
      <div class="stat"><span>탈출 / 출정</span><b>${p.stats.extracts} / ${p.stats.raids}</b></div>`;
    for (const [id, label] of this.labelEls) {
      const built = isBuilt(p.upgrades, id);
      const def = BUILDINGS.find(b => b.id === id)!;
      const levels = nodesOf(id).filter(n => !n.id.endsWith('.build')).reduce((s, n) => s + levelOf(p.upgrades, n.id), 0);
      const buildable = !built && purchaseCheck(p, `${id}.build`) === null;
      const upgradable = built && nodesOf(id).some(n => purchaseCheck(p, n.id) === null);
      label.className = `campLabel${built ? '' : ' unbuilt'}${buildable || upgradable ? ' ready' : ''}`;
      label.innerHTML = `<b>${def.name}</b><span>${id === 'tent' ? '창고 · 상인' : built ? `기술 ${levels}` : buildable ? '건설 가능!' : '미건설'}</span>`;
    }
    if (this.stashOverlay.hidden) this.renderPanel();
    else this.inventory.refresh(true);
  }

  /** Renders the camp; call every frame while the hideout is visible. */
  frame(dt: number): void {
    const canvas = this.stage.canvas;
    this.camp.resize(canvas.clientWidth / Math.max(1, canvas.clientHeight));
    this.camp.update(dt);
    this.stage.renderer.render(this.camp.scene, this.camp.camera);
    for (const [id, label] of this.labelEls) {
      const v = this.camp.labelAnchor(id).project(this.camp.camera);
      label.style.transform = `translate(${((v.x + 1) / 2) * canvas.clientWidth}px, ${((1 - v.y) / 2) * canvas.clientHeight}px) translate(-50%, -100%)`;
    }
  }
}
