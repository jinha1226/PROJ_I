import {HERO_TYPES, HUB_RECRUIT_COST, MAX_PARTY_SIZE} from '../config';
import {HERO_LABELS, heroLabel} from '../data/heroes';
import {livingRoster} from '../expedition/rules';
import type {GuildState} from '../state/guild';
import type {HeroType} from '../types';
import {byId, el} from './dom';

export interface HubActions {
  /** True only between expeditions. */
  canAct(): boolean;
  depart(): void;
}

const RECRUIT_BUTTONS: Readonly<Record<HeroType, string>> = {Knight: 'recruitK', Rogue_Hooded: 'recruitR', Mage: 'recruitM'};

/** The between-expeditions panel: roster, recruitment and departure. */
export class HubPanel {
  private readonly panel = byId('hubPanel');

  constructor(
    private readonly guild: GuildState,
    private readonly actions: HubActions,
  ) {}

  hide(): void {
    this.panel.hidden = true;
  }

  show(message = ''): void {
    const {roster, supplies, expeditions, deepest} = this.guild.data;
    const living = livingRoster(roster, Infinity);

    const recruitButtons = HERO_TYPES.map(type => {
      const button = el('button', {id: RECRUIT_BUTTONS[type], text: `${HERO_LABELS[type]} 모집`});
      button.onclick = () => this.recruit(type);
      return button;
    });
    const depart = el('button', {id: 'expeditionGo', text: `원정 출발 (${Math.min(MAX_PARTY_SIZE, living.length)}명)`});
    depart.onclick = () => this.depart(living.length);
    const close = el('button', {id: 'hubClose', text: '닫기'});
    close.onclick = () => this.hide();

    this.panel.replaceChildren(
      el('h2', {text: '원정대 거점'}),
      el('p', {text: message}),
      el('p', {text: `보급품 ${supplies} · 원정 ${expeditions}회 · 최장 이동 ${deepest}칸`}),
      el('h3', {text: '영웅 명부'}),
      ...roster.map(hero => el('div', {text: `${heroLabel(hero.type)} #${hero.id} · ${hero.alive ? 'HP ' + hero.hp : '☠ 영구 사망'}`})),
      el('p', {text: `모집 비용: 보급품 ${HUB_RECRUIT_COST}`}),
      ...recruitButtons,
      el('p', {}, depart, ' ', close),
    );
    this.panel.hidden = false;
  }

  private recruit(type: HeroType): void {
    if (!this.actions.canAct()) return;
    if (!this.guild.recruit(type)) return this.show('보급품 부족');
    this.show('영웅 모집 완료');
  }

  private depart(livingCount: number): void {
    if (!livingCount) return this.show('영웅을 모집하세요');
    if (!this.actions.canAct()) return this.show('먼저 퇴각해야 합니다');
    this.hide();
    this.actions.depart();
  }
}
