import {HERO_LABELS} from '../data/heroes';
import {MAX_TACTIC_LEVEL, TACTIC_INFO, tacticsForRole} from '../data/tactics';
import {HERO_TYPES} from '../config';
import type {Progression} from '../state/progression';
import type {HeroType, TacticId} from '../types';
import {byId, el} from './dom';
import type {PanelHandlers} from './upgradesPanel';

export class TacticsPanel {
  private readonly panel = byId('tacticsPanel');
  private readonly info = byId('tacticInfo');
  private readonly rows = byId('tacticRows');

  constructor(
    private readonly progression: Progression,
    private readonly handlers: PanelHandlers,
    private readonly other: {hide(): void},
  ) {
    byId('tacticsBtn').onclick = () => this.open();
    byId('closeTactics').onclick = () => this.close();
    this.rows.onclick = event => this.onClick(event);
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

  private onClick(event: MouseEvent): void {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button) return;
    const {level, role, tactic} = button.dataset;
    if (level) {
      if (this.progression.levelUpTactic(level as TacticId)) {
        this.render();
        this.handlers.onPurchase();
      }
      return;
    }
    if (!tactic || !role) return;
    this.progression.toggleTactic(role as HeroType, tactic as TacticId);
    this.render();
  }

  render(): void {
    const {data} = this.progression;
    const slots = this.progression.loadoutSlots();
    this.info.textContent = `골드 ${data.gold} G · 승리 ${data.wins}회 · 장착 ${slots}칸`;
    this.rows.replaceChildren(
      ...HERO_TYPES.map(role =>
        el(
          'section',
          {className: 'trow'},
          el('h3', {text: `${HERO_LABELS[role]} (${data.loadout[role].length}/${slots})`}),
          ...tacticsForRole(role).map(id => this.row(role, id, slots)),
        ),
      ),
    );
  }

  private row(role: HeroType, id: TacticId, slots: number): HTMLElement {
    const {data} = this.progression;
    const info = TACTIC_INFO[id];
    const equipped = data.loadout[role].includes(id);
    const level = this.progression.tacticLevel(id);
    const cost = this.progression.tacticCost(id);
    return el(
      'div',
      {className: 'upgradeRow'},
      el(
        'div',
        {},
        el('strong', {text: `${info.label} Lv.${level}/${MAX_TACTIC_LEVEL}`}),
        el('br'),
        el('small', {text: info.details[level - 1]}),
        el('br'),
        el('small', {text: level < MAX_TACTIC_LEVEL ? '다음: ' + info.details[level] : '최대 레벨'}),
      ),
      el(
        'div',
        {className: 'tchoices'},
        el('button', {
          className: equipped ? 'active' : '',
          text: equipped ? '장착 ✓' : '장착',
          disabled: !equipped && data.loadout[role].length >= slots,
          data: {role, tactic: id},
        }),
        el('button', {text: level >= MAX_TACTIC_LEVEL ? 'MAX' : `${cost} G`, disabled: level >= MAX_TACTIC_LEVEL || data.gold < cost, data: {level: id}}),
      ),
    );
  }
}
