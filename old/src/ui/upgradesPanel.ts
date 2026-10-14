import {UPGRADES, UPGRADE_KEYS} from '../data/upgrades';
import type {Progression} from '../state/progression';
import type {UpgradeKey} from '../types';
import {byId, el} from './dom';

export interface PanelHandlers {
  /** Called when the panel opens (game pauses). */
  onOpen(): void;
  onClose(): void;
  /** Called after a purchase so the HUD can refresh. */
  onPurchase(): void;
}

export class UpgradesPanel {
  private readonly panel = byId('upgradePanel');
  private readonly info = byId('upgradeInfo');
  private readonly rows = byId('upgradeRows');

  constructor(
    private readonly progression: Progression,
    private readonly handlers: PanelHandlers,
    private readonly other: {hide(): void},
  ) {
    byId('upgradeBtn').onclick = () => this.open();
    byId('closeUpgrades').onclick = () => this.close();
    this.rows.onclick = event => {
      const button = (event.target as Element).closest<HTMLButtonElement>('button[data-upgrade]');
      if (!button) return;
      if (this.progression.buyUpgrade(button.dataset.upgrade as UpgradeKey)) {
        this.render();
        this.handlers.onPurchase();
      }
    };
  }

  get isOpen(): boolean {
    return !this.panel.hidden;
  }

  hide(): void {
    this.panel.hidden = true;
  }

  private open(): void {
    this.handlers.onOpen();
    this.other.hide();
    this.render();
    this.panel.hidden = false;
  }

  private close(): void {
    this.panel.hidden = true;
    this.handlers.onClose();
  }

  render(): void {
    const {data} = this.progression;
    this.info.textContent = `골드 ${data.gold} G · 스테이지 ${data.stage}`;
    this.rows.replaceChildren(
      ...UPGRADE_KEYS.map(key => this.row(key)),
    );
  }

  private row(key: UpgradeKey): HTMLElement {
    const info = UPGRADES[key];
    const cost = this.progression.upgradeCost(key);
    return el(
      'div',
      {className: 'upgradeRow'},
      el('div', {}, el('strong', {text: `${info.label} Lv.${this.progression.data.upgrades[key]}`}), el('br'), el('small', {text: info.detail})),
      el('button', {text: Number.isFinite(cost) ? `${cost} G` : 'MAX', disabled: this.progression.data.gold < cost, data: {upgrade: key}}),
    );
  }
}
