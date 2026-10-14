import {EXTRACT_SECONDS, OIL, PLAYER} from '../config';
import {dist} from '../core/math';
import {itemDef} from '../items/catalog';
import {CONTAINER_LABEL} from '../items/loot';
import type {SlotId} from '../items/stores';
import type {AutoBattlePhase} from '../sim/auto/autoBattle';
import type {AutoExplorePhase} from '../sim/auto/autoExplore';
import type {AutoReturnStatus} from '../sim/auto/autoReturn';
import type {Raid} from '../sim/raid';
import {byId, el, fmt, formatTime} from './dom';

const NOTICE_LIFETIME = 3200;
const LOW_HP = 0.3;

/** In-raid heads-up display. Writes to the DOM only when values change. */
export class Hud {
  private readonly root = byId('hud');
  private readonly hpFill = byId('hpFill');
  private readonly hpText = byId('hpText');
  private readonly stFill = byId('stFill');
  private readonly timer = byId('timer');
  private readonly oilFill = byId('oilFill');
  private readonly extracts = byId('extractList');
  private readonly prompt = byId('prompt');
  private readonly carried = byId('carried');
  private readonly progress = byId('extractProgress');
  private readonly progressFill = byId('extractFill');
  private readonly progressText = byId('extractText');
  private readonly vignette = byId('vignette');
  private readonly notices = byId('notices');
  private readonly autoBadge = byId('autoReturn');
  private readonly exploreBadge = byId('autoExplore');
  private readonly battleBadge = byId('autoBattle');
  private readonly belt: Record<'belt0' | 'belt1', HTMLElement> = {belt0: byId('belt0'), belt1: byId('belt1')};
  private readonly cache = new Map<string, string>();
  private hurtFlash = 0;

  constructor(private readonly icons: ReadonlyMap<string, string>) {}

  show(visible: boolean): void {
    this.root.hidden = !visible;
  }

  private set(key: string, node: HTMLElement, html: string): void {
    if (this.cache.get(key) === html) return;
    this.cache.set(key, html);
    node.innerHTML = html;
  }

  notice(text: string, tone: 'info' | 'warn' | 'good' = 'info'): void {
    const n = el('div', `notice ${tone}`, text);
    this.notices.prepend(n);
    while (this.notices.children.length > 4) this.notices.lastElementChild?.remove();
    setTimeout(() => n.classList.add('fade'), NOTICE_LIFETIME - 500);
    setTimeout(() => n.remove(), NOTICE_LIFETIME);
  }

  hurt(): void {
    this.hurtFlash = 1;
  }

  update(dt: number, raid: Raid, uiOpen: boolean, auto: AutoReturnStatus, explore: AutoExplorePhase, battle: AutoBattlePhase): void {
    this.updateAuto(auto);
    this.updateExplore(explore);
    const battleText: Record<AutoBattlePhase, string> = {locked: '', off: '자동 전투 <b>꺼짐</b> <kbd>B</kbd>', paused: '자동 전투 일시정지', idle: '자동 전투 대기', fighting: '자동 전투 중'};
    this.set('battle', this.battleBadge, battleText[battle]);
    this.battleBadge.hidden = battle === 'locked';
    this.battleBadge.className = `autoBadge ${battle === 'fighting' ? 'threat' : battle}`;
    const p = raid.player;
    const hpRatio = Math.max(0, p.hp / p.maxHp);
    this.hpFill.style.transform = `scaleX(${hpRatio})`;
    this.set('hp', this.hpText, `${Math.ceil(p.hp)} / ${p.maxHp}`);
    this.stFill.style.transform = `scaleX(${p.stamina / raid.maxStamina})`;
    this.stFill.classList.toggle('empty', p.stamina < PLAYER.dodgeCost);

    const oil = raid.oilRatio;
    this.oilFill.style.transform = `scaleX(${oil})`;
    this.set('timer', this.timer, `${Math.ceil(oil * 100)}% · ${formatTime(raid.oilSeconds)}`);
    const urgent = oil < OIL.warnAt[0];
    this.timer.classList.toggle('urgent', urgent);
    this.oilFill.classList.toggle('urgent', urgent);

    this.set('carried', this.carried, `가방 가치 <b>${fmt(raid.carriedValue())}G</b>`);

    const rows = raid.zones
      .map((z, i) => {
        const d = dist(z, p);
        // Screen space: +x right, +z down. Arrow glyph points up at 0deg.
        const deg = (Math.atan2(z.x - p.x, -(z.z - p.z)) * 180) / Math.PI;
        const active = raid.extractZone === i;
        return `<div class="extractRow${active ? ' active' : ''}"><span class="arrow" style="transform:rotate(${Math.round(deg / 10) * 10}deg)">↑</span><span>${z.name}</span><b>${Math.round(d)}m</b></div>`;
      })
      .join('');
    this.set('extracts', this.extracts, rows);

    for (const slot of ['belt0', 'belt1'] as const) this.updateBelt(slot, raid);

    const near = raid.openContainer === null && !uiOpen ? raid.nearestContainer() : null;
    const promptText = near ? `<kbd>E</kbd> ${CONTAINER_LABEL[near.type]} ${near.opened ? '뒤지기' : '열기'}` : '';
    this.set('prompt', this.prompt, promptText);
    this.prompt.hidden = !promptText;

    const extracting = raid.extractZone !== null;
    this.progress.hidden = !extracting;
    if (extracting) {
      this.progressFill.style.transform = `scaleX(${Math.min(1, raid.extractProgress / EXTRACT_SECONDS)})`;
      this.set('extract', this.progressText, `탈출 중… ${Math.max(0, EXTRACT_SECONDS - raid.extractProgress).toFixed(1)}s`);
    }

    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.5);
    const low = hpRatio < LOW_HP && p.alive ? 0.35 + 0.2 * Math.sin(performance.now() / 180) : 0;
    this.vignette.style.opacity = String(Math.max(low, this.hurtFlash * 0.85));
  }

  private updateAuto(auto: AutoReturnStatus): void {
    const text: Record<AutoReturnStatus['phase'], string> = {
      locked: '',
      off: '자동 귀환 <b>꺼짐</b> <kbd>G</kbd>',
      watching: `자동 귀환 대기 · 출발까지 <b>${formatTime(Math.max(0, auto.slack))}</b>`,
      paused: '자동 귀환 일시정지 (조작 중)',
      returning: '자동 귀환 중 · 이동키로 취소',
    };
    this.set('auto', this.autoBadge, text[auto.phase]);
    this.autoBadge.hidden = auto.phase === 'locked';
    this.autoBadge.className = `autoBadge ${auto.phase}`;
  }

  private updateExplore(phase: AutoExplorePhase): void {
    const text: Record<AutoExplorePhase, string> = {
      locked: '',
      off: '자동 탐험 <b>꺼짐</b> <kbd>H</kbd>',
      paused: '자동 탐험 일시정지 (조작 중)',
      threat: '자동 탐험 대기 · 전투 중',
      looting: '자동 탐험 · 루팅 중',
      moving: '자동 탐험 중',
      leaving: '탐험 완료 · 탈출구로 이동',
    };
    this.set('explore', this.exploreBadge, text[phase]);
    this.exploreBadge.hidden = phase === 'locked';
    this.exploreBadge.className = `autoBadge ${phase}`;
  }

  private updateBelt(slot: Extract<SlotId, 'belt0' | 'belt1'>, raid: Raid): void {
    const item = raid.stores.slots[slot];
    const using = raid.player.usingSlot === slot;
    const key = `${slot}:${item?.defId ?? ''}:${item?.qty ?? 0}:${using}`;
    if (this.cache.get(slot) === key) return;
    this.cache.set(slot, key);
    const node = this.belt[slot];
    node.classList.toggle('using', using);
    if (!item) {
      node.innerHTML = `<kbd>${slot === 'belt0' ? 1 : 2}</kbd>`;
      return;
    }
    const def = itemDef(item.defId);
    const icon = this.icons.get(def.id);
    const img = icon ? `<img src="${icon}" alt="">` : `<span class="itemGlyph" style="color:${def.icon.color}">${def.icon.glyph}</span>`;
    node.innerHTML = `${img}<kbd>${slot === 'belt0' ? 1 : 2}</kbd>${item.qty > 1 ? `<span class="itemQty">${item.qty}</span>` : ''}`;
  }
}
