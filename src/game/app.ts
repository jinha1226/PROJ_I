import {sfx} from '../audio/sfx';
import {BACKPACK_SIZE} from '../config';
import {attachJoystick, Input, type UiAction} from '../core/input';
import {itemDef} from '../items/catalog';
import {emptyGrid, stackValue} from '../items/inventory';
import {emptySlots, type Stores} from '../items/stores';
import {settleRaid} from '../meta/economy';
import {loadProfile, newProfile, raidStoresForMerc, resetProfile, saveProfile, type Profile} from '../meta/profile';
import type {AssetLibrary} from '../render/assets';
import {PIXEL_STEPS, Stage} from '../render/stage';
import type {VisualSettings} from '../render/visual';
import type {MeshStandardMaterial} from 'three';
import type {RaidModifiers} from '../sim/modifiers';
import {deriveBonuses} from '../meta/upgrades';
import {applyGridBonuses} from '../meta/workshop';
import type {Outcome} from '../sim/types';
import {byId, el, fmt, formatTime} from '../ui/dom';
import {Hideout} from '../ui/hideout';
import {Hud} from '../ui/hud';
import {MapOverlay} from '../ui/mapOverlay';
import {RaidSession} from './raidSession';

type Screen = 'hideout' | 'raid' | 'results';

const MAX_FRAME = 1 / 20;
const RESULT_DELAY = 0.9;

const OUTCOME_TEXT: Readonly<Record<Outcome, {title: string; body: string; tone: string}>> = {
  extracted: {title: '탈출 성공', body: '살아서 돌아왔다. 가방의 전리품은 이제 당신의 것이다.', tone: 'good'},
  exhausted: {title: '기름 소진 · 강제 귀환', body: '어둠 속을 더듬어 겨우 빠져나왔다. 장비는 지켰지만 가방의 절반을 잃었다.', tone: 'warn'},
  dead: {title: '사망', body: '던전에 쓰러졌다. 가지고 들어간 모든 것을 잃었다.', tone: 'bad'},
  forfeit: {title: '레이드 포기', body: '모든 것을 버리고 도망쳤다.', tone: 'bad'},
};

/** Top-level screen flow: hideout → raid → results → hideout. */
export class App {
  private readonly stage: Stage;
  private readonly input: Input;
  private readonly hud: Hud;
  private readonly map = new MapOverlay();
  private readonly hideout: Hideout;
  private profile: Profile;
  private session: RaidSession | null = null;
  /** Profile snapshot from raid start (loadout still attached), settled when the raid ends. */
  private preRaid: Profile | null = null;
  private screen: Screen = 'hideout';
  private paused = false;
  private endTimer = 0;
  private last = performance.now();
  /** Visual-lab mode: throwaway profile, nothing saved, raids restart on their own. */
  private lab = false;
  private directMercId: number | null = null;

  constructor(
    private readonly assets: AssetLibrary,
    private readonly icons: ReadonlyMap<string, string>,
  ) {
    this.stage = new Stage(byId('game'));
    this.input = new Input(this.stage.canvas);
    this.input.onGesture(() => sfx.unlock());
    this.input.onUiAction(a => this.onUiAction(a));
    this.hud = new Hud(icons);
    this.profile = applyGridBonuses(loadProfile());
    this.hideout = new Hideout(icons, assets, this.stage, {
      getProfile: () => this.profile,
      setProfile: p => {
        this.profile = p;
        this.save(p);
      },
      startRaid: mercId => this.startRaid(mercId),
      resetProfile: () => {
        this.profile = applyGridBonuses(resetProfile());
        this.save(this.profile);
        this.hideout.refresh();
      },
      sound: kind => sfx[kind](),
    });
    this.bindButtons();
    this.showScreen('hideout');
    requestAnimationFrame(t => this.loop(t));
  }

  private bindButtons(): void {
    byId('resume').addEventListener('click', () => this.setPaused(false));
    byId('forfeit').addEventListener('click', () => {
      if (confirm('레이드를 포기하면 가져간 장비를 모두 잃습니다. 포기할까요?')) this.session?.raid.finish('forfeit');
    });
    byId('muteBtn').addEventListener('click', () => (byId('muteBtn').textContent = sfx.toggleMute() ? '소리 켜기' : '소리 끄기'));
    byId('toHideout').addEventListener('click', () => this.showScreen('hideout'));
    byId('mapClose').addEventListener('click', () => this.map.toggle(false));
    byId('invClose').addEventListener('click', () => this.session?.setInventoryOpen(false));

    attachJoystick(byId('stickZone'), byId('stickKnob'), this.input);
    const attack = byId('btnAttack');
    attack.addEventListener('pointerdown', e => {
      e.preventDefault();
      this.input.setTouchAttack(true);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) attack.addEventListener(ev, () => this.input.setTouchAttack(false));
    const tap = (id: string, code: string): void => byId(id).addEventListener('pointerdown', e => {
      e.preventDefault();
      this.input.press(code);
    });
    tap('btnDodge', 'Space');
    tap('btnInteract', 'KeyE');
    tap('belt0', 'Digit1');
    tap('belt1', 'Digit2');
    byId('btnBag').addEventListener('click', () => this.onUiAction('inventory'));
    byId('btnMap').addEventListener('click', () => this.onUiAction('map'));
    byId('btnPause').addEventListener('click', () => this.onUiAction('pause'));
    byId('returnBtn').addEventListener('click', () => this.onUiAction('returnNow'));
    byId('autoSpeed').addEventListener('click', () => this.onUiAction('autoSpeed'));
    // Badges double as toggles (the only way on touch screens).
    for (const id of ['autoReturn', 'autoExplore', 'autoBattle'] as const) byId(id).addEventListener('click', () => this.onUiAction(id));
    document.body.classList.toggle('touch', this.input.isTouch);
  }

  private onUiAction(action: UiAction): void {
    if (action === 'mute') {
      sfx.toggleMute();
      return;
    }
    if (action === 'pixel') {
      const i = PIXEL_STEPS.indexOf(this.stage.pixel as (typeof PIXEL_STEPS)[number]);
      const next = PIXEL_STEPS[(i + 1) % PIXEL_STEPS.length];
      this.stage.setPixelSize(next);
      if (this.screen === 'raid') this.hud.notice(next > 1 ? `픽셀 그래픽 ${next}px <kbd>P</kbd>` : '픽셀 그래픽 끔 <kbd>P</kbd>', 'info');
      return;
    }
    if (this.screen !== 'raid' || !this.session) return;
    if (action === 'returnNow') {
      this.session.returnNow();
      return;
    }
    if (action === 'autoSpeed') {
      this.session.cycleAutoSpeed();
      return;
    }
    if (action === 'autoReturn' || action === 'autoExplore' || action === 'autoBattle') {
      this.session.toggleAuto(action);
      return;
    }
    if (action === 'inventory' && !this.paused) this.session.setInventoryOpen(!this.session.inventoryOpen);
    if (action === 'map' && !this.paused) this.map.toggle();
    if (action === 'pause') {
      // Escape closes the topmost overlay first.
      if (this.session.inventoryOpen) this.session.setInventoryOpen(false);
      else if (this.map.open) this.map.toggle(false);
      else this.setPaused(!this.paused);
    }
  }

  private setPaused(paused: boolean): void {
    this.paused = paused;
    byId('pauseOverlay').hidden = !paused;
  }

  private showScreen(screen: Screen): void {
    this.screen = screen;
    this.hideout.show(screen === 'hideout');
    this.hud.show(screen === 'raid');
    byId('results').hidden = screen !== 'results';
    byId('touchControls').hidden = screen !== 'raid';
    this.map.toggle(false);
    this.setPaused(false);
  }

  private startRaid(mercId: number): void {
    const merc = this.profile.mercenaries.find(m => m.id === mercId && m.status === 'ready');
    if (!merc) return;
    this.directMercId = merc.id;
    this.preRaid = this.profile;
    // The loadout leaves the safe profile now: quitting mid-raid counts as losing it.
    this.profile = {
      ...this.profile,
      backpack: emptyGrid(BACKPACK_SIZE.w, BACKPACK_SIZE.h),
      slots: emptySlots(),
      mercenaries: this.profile.mercenaries.map(m => m.id === merc.id ? {...m, status: 'expedition'} : m),
    };
    this.save(this.profile);
    const seed = (Date.now() ^ (this.preRaid.raidCounter * 2654435761)) >>> 0;
    byId('loading').hidden = false;
    byId('loadingText').textContent = '던전을 생성하는 중…';
    // Let the loading text paint before the heavy scene build.
    requestAnimationFrame(() =>
      setTimeout(() => {
        this.session?.dispose();
        this.session = new RaidSession(
          {stage: this.stage, assets: this.assets, input: this.input, sfx, hud: this.hud, map: this.map, icons: this.icons},
          seed,
          raidStoresForMerc(this.preRaid!, merc),
          this.raidModifiers(),
          merc.cls === 'tank' ? 'Knight' : merc.cls === 'melee' ? 'Barbarian' : merc.cls === 'ranged' ? 'Rogue_Hooded' : 'Mage',
        );
        this.endTimer = 0;
        byId('loading').hidden = true;
        this.showScreen('raid');
        this.hud.notice(`탈출구 ${this.session.raid.zones.length}곳 — <kbd>M</kbd> 지도에서 확인`, 'info');
        this.hud.notice(`${merc.name} (${merc.cls === 'tank' ? '기사' : merc.cls === 'melee' ? '야만전사' : merc.cls === 'ranged' ? '사냥꾼' : '마법사'}) 직접 조작 중`, 'good');
        this.hud.notice('전리품을 챙겨 제한 시간 안에 탈출하라!', 'good');
        this.last = performance.now();
      }, 30),
    );
  }

  applyVisual(v: VisualSettings): void {
    this.stage.applyVisual(v);
    // One shared atlas material for the whole dungeon: gloss is just two uniforms.
    const m = this.assets.dungeonMaterial as MeshStandardMaterial;
    m.roughness = v.specular ? 0.42 : 1;
    m.metalness = v.specular ? 0.25 : 0;
  }

  private save(p: Profile): void {
    if (!this.lab) saveProfile(p);
  }

  /** `?lab`: start an auto-playing raid with every automation, for comparing visuals. */
  startLab(): void {
    this.lab = true;
    const base = newProfile();
    const upgrades = {'command.build': 1, 'command.autoReturn': 1, 'command.autoExplore': 3, 'command.autoBattle': 3, 'alchemist.build': 1, 'alchemist.vitality': 5};
    this.profile = {...base, upgrades};
    const merc = this.profile.mercenaries.find(m => m.status === 'ready')!;
    this.startRaid(merc.id);
  }

  /** The hideout tree feeds the raid only through these multipliers. */
  private raidModifiers(): RaidModifiers {
    const b = deriveBonuses(this.profile.upgrades);
    return {
      lootSpeed: b.lootSpeed,
      lootQuantity: b.lootQuantity,
      rareFind: b.rareFind,
      oilCapacity: b.oilCapacity,
      oilDrain: b.oilDrain,
      damageMul: b.damageMul,
      critBonus: b.critBonus,
      maxHpBonus: b.maxHpBonus,
      staminaBonus: b.staminaBonus,
      healMul: b.healMul,
      autoReturn: b.autoReturn,
      autoExplore: b.autoExplore,
      autoBattle: b.autoBattle,
    };
  }

  private endRaid(outcome: Outcome): void {
    const session = this.session;
    if (!session || !this.preRaid) return;
    const carried: Stores = session.raid.stores;
    const settlement = settleRaid(this.preRaid, outcome, carried, Math.random, deriveBonuses(this.preRaid.upgrades).exhaustLoss);
    const mercId = this.directMercId;
    const mercenaries = settlement.profile.mercenaries.map(m => {
      if (m.id !== mercId) return m;
      if (outcome === 'dead') return {...m, status: 'dead' as const, injuredUntil: null, equipment: {weapon: null, armor: null, trinket: null, belt0: null, belt1: null}};
      if (outcome === 'forfeit') return {...m, status: 'ready' as const, injuredUntil: null, equipment: {weapon: null, armor: null, trinket: null, belt0: null, belt1: null}};
      return {
        ...m,
        status: 'ready' as const,
        injuredUntil: null,
        equipment: {
          ...m.equipment,
          weapon: carried.slots.weapon?.defId ?? null,
          armor: carried.slots.armor?.defId ?? null,
          belt0: carried.slots.belt0?.defId ?? null,
          belt1: carried.slots.belt1?.defId ?? null,
        },
      };
    });
    this.profile = {...settlement.profile, slots: {...this.preRaid.slots}, mercenaries};
    this.save(this.profile);
    if (outcome === 'extracted') sfx.extracted();
    this.renderResults(outcome, settlement.haul, session, new Set(settlement.lost.map(i => i.uid)));
    session.dispose();
    this.session = null;
    this.preRaid = null;
    this.directMercId = null;
    this.showScreen('results');
    if (this.lab) setTimeout(() => this.startLab(), 2500);
  }

  private renderResults(outcome: Outcome, haul: number, session: RaidSession, lost: ReadonlySet<number>): void {
    const info = OUTCOME_TEXT[outcome];
    const raid = session.raid;
    byId('resultTitle').textContent = info.title;
    byId('resultTitle').className = info.tone;
    byId('resultBody').textContent = info.body;
    byId('resultStats').innerHTML = `
      <div><span>레이드 시간</span><b>${formatTime(raid.time)}</b></div>
      <div><span>처치</span><b>${raid.kills}</b></div>
      <div><span>가져온 가치</span><b class="gold">${fmt(haul)}G</b></div>`;
    const list = byId('resultItems');
    list.replaceChildren();
    const items = [...raid.stores.grids.backpack.items.map(p => p.item), ...Object.values(raid.stores.slots).filter(i => i !== null)];
    for (const item of items.sort((a, b) => stackValue(b) - stackValue(a))) {
      const def = itemDef(item.defId);
      const kept = outcome === 'extracted' || (outcome === 'exhausted' && !lost.has(item.uid));
      const row = el('div', `resultItem${kept ? '' : ' lost'}`);
      const icon = this.icons.get(def.id);
      row.innerHTML = `${icon ? `<img src="${icon}" alt="">` : `<span class="itemGlyph" style="color:${def.icon.color}">${def.icon.glyph}</span>`}<span>${def.name}${item.qty > 1 ? ` ×${item.qty}` : ''}</span><b>${fmt(stackValue(item))}G</b>`;
      list.append(row);
    }
    if (!items.length) list.append(el('div', 'invEmpty', '가방이 비어 있다.'));
  }

  private loop(now: number): void {
    const dt = Math.min(MAX_FRAME, (now - this.last) / 1000);
    this.last = now;
    if (this.screen === 'hideout' && this.hideout.visible) this.hideout.frame(dt);
    if (this.screen === 'raid' && this.session) {
      const outcome = this.session.frame(dt, this.paused);
      if (outcome) {
        this.endTimer += dt;
        if (this.endTimer >= RESULT_DELAY) this.endRaid(outcome);
      }
    }
    this.input.endFrame();
    requestAnimationFrame(t => this.loop(t));
  }
}
