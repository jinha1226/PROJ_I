import {heroLabel} from '../data/heroes';
import type {Actor} from '../types';
import {byId, el} from './dom';

export function heroHealthId(actor: Pick<Actor, 'rosterId' | 'name'>): string {
  return 'hp-' + (actor.rosterId || actor.name);
}

/** Updates each hero's health bar and card state; cards that are not on screen are skipped. */
export function updatePartyHealthUI(
  actors: readonly Pick<Actor, 'team' | 'rosterId' | 'name' | 'hp' | 'max' | 'dead' | 'actionTime' | 'lastAction'>[],
  lookup: (id: string) => HTMLElement | null,
): void {
  for (const actor of actors) {
    if (actor.team !== 'hero') continue;
    const bar = lookup(heroHealthId(actor));
    if (!bar) continue;
    bar.style.width = (actor.hp / actor.max) * 100 + '%';
    const card = bar.closest('.card');
    if (!card) continue;
    card.classList.toggle('dead', actor.dead);
    const info = card.querySelector('.action');
    if (info) info.textContent = actor.dead ? '전투 불능' : (actor.actionTime ?? 0) > 0 ? (actor.lastAction ?? '') : `HP ${Math.ceil(actor.hp)} / ${actor.max}`;
  }
}

/** Always-visible HUD: status line, battle counters, notice banner and party cards. */
export class Hud {
  private readonly status = byId('status');
  private readonly battleInfo = byId('battleInfo');
  private readonly noticeEl = byId('notice');
  private readonly party = byId('party');
  private readonly restart = byId<HTMLButtonElement>('restart');
  private readonly pause = byId<HTMLButtonElement>('pause');
  private readonly speed = byId<HTMLButtonElement>('speed');

  setStatus(text: string): void {
    this.status.textContent = text;
  }

  setBattleInfo(text: string): void {
    this.battleInfo.textContent = text;
  }

  setNotice(text: string): void {
    this.noticeEl.textContent = text;
  }

  setRestartEnabled(enabled: boolean): void {
    this.restart.disabled = !enabled;
  }

  setPauseLabel(paused: boolean): void {
    this.pause.textContent = paused ? '계속' : '일시정지';
  }

  setSpeedLabel(speed: number): void {
    this.speed.textContent = speed + '×';
  }

  renderPartyCards(heroes: readonly Actor[]): void {
    this.party.replaceChildren(
      ...heroes.map(hero =>
        el(
          'div',
          {className: 'card'},
          el('div', {className: 'name'}, el('span', {text: heroLabel(hero.name)}), el('span', {text: `${hero.max} HP`})),
          el('div', {className: 'hp'}, el('span', {id: heroHealthId(hero)})),
        ),
      ),
    );
  }

  updateParty(actors: readonly Actor[]): void {
    updatePartyHealthUI(actors, id => document.getElementById(id));
  }
}
