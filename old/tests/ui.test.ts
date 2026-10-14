// @vitest-environment happy-dom
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {FIXED_DUNGEON} from '../src/dungeon/generator';
import {ExpeditionSession} from '../src/game/session';
import {memoryStore} from '../src/persistence/store';
import {GuildState} from '../src/state/guild';
import {Progression} from '../src/state/progression';
import {byId, el} from '../src/ui/dom';
import {drawExplorationMap} from '../src/ui/explorationMap';
import {ExplorePanel} from '../src/ui/explorePanel';
import {Hud, heroHealthId, updatePartyHealthUI} from '../src/ui/hud';
import {HubPanel} from '../src/ui/hubPanel';
import {createPresenter} from '../src/ui/presenter';
import {TacticsPanel} from '../src/ui/tacticsPanel';
import {UpgradesPanel} from '../src/ui/upgradesPanel';
import {createKnownGrid, revealAround} from '../src/dungeon/fog';
import {makeActor} from './helpers/fakes';
import html from '../index.html?raw';

const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).replace(/<script[\s\S]*?<\/script>/g, '');

function mountPage(): void {
  document.body.innerHTML = body;
  // jsdom has no canvas; give the 2D context a recording stub.
  const ctx = {fillRect: vi.fn(), clearRect: vi.fn(), drawImage: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fillStyle: '', strokeStyle: '', lineWidth: 1};
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ctx) as never);
}

beforeEach(mountPage);

describe('index.html', () => {
  it('declares every element the UI code looks up', () => {
    for (const id of ['game', 'status', 'party', 'battleInfo', 'notice', 'restart', 'pause', 'speed', 'exploreBtn', 'upgradeBtn', 'tacticsBtn', 'retreatBtn', 'hubBtn', 'hubPanel', 'miniMap', 'exploreMap', 'guideToggle', 'compareBtn', 'comparePanel', 'upgradeRows', 'tacticRows']) {
      expect(() => byId(id), id).not.toThrow();
    }
  });

  it('starts with restart disabled and every overlay hidden', () => {
    expect(byId<HTMLButtonElement>('restart').disabled).toBe(true);
    for (const id of ['explorePanel', 'upgradePanel', 'tacticsPanel', 'hubPanel', 'comparePanel']) expect(byId(id).hidden, id).toBe(true);
  });

  it('loads the app entry through Vite', () => {
    expect(html).toContain('src="/src/main.ts"');
  });

  it('byId fails loudly for missing elements', () => {
    expect(() => byId('nope')).toThrow('Missing required element #nope');
  });
});

describe('el()', () => {
  it('inserts text as text, never as markup', () => {
    const node = el('p', {text: '<img src=x onerror=alert(1)>'}, '<b>bold</b>', 3, null, false);
    expect(node.querySelector('img')).toBeNull();
    expect(node.querySelector('b')).toBeNull();
    expect(node.textContent).toBe('<img src=x onerror=alert(1)><b>bold</b>3');
  });

  it('applies ids, classes, disabled state and data attributes', () => {
    const node = el('button', {id: 'x', className: 'a b', disabled: true, data: {tactic: 'heal'}});
    expect([node.id, node.className, node.disabled, node.dataset.tactic]).toEqual(['x', 'a b', true, 'heal']);
  });
});

describe('Hud', () => {
  it('shows status text and button labels', () => {
    const hud = new Hud();
    hud.setStatus('S');
    hud.setBattleInfo('B');
    hud.setNotice('N');
    hud.setPauseLabel(true);
    hud.setSpeedLabel(4);
    hud.setRestartEnabled(true);
    expect([byId('status').textContent, byId('battleInfo').textContent, byId('notice').textContent, byId('pause').textContent, byId('speed').textContent]).toEqual(['S', 'B', 'N', '계속', '4×']);
    expect(byId<HTMLButtonElement>('restart').disabled).toBe(false);
    hud.setPauseLabel(false);
    expect(byId('pause').textContent).toBe('일시정지');
  });

  it('renders one card per hero with an HP bar the health updater can find', () => {
    const hud = new Hud();
    const heroes = [makeActor({name: 'Knight', rosterId: 1, hp: 50, max: 100}), makeActor({name: 'Mage', rosterId: 4, hp: 75, max: 75, dead: false})];
    hud.renderPartyCards(heroes);
    expect(document.querySelectorAll('#party .card')).toHaveLength(2);
    expect(document.querySelector('#party .card .name')?.textContent).toBe('전사100 HP');
    hud.updateParty(heroes);
    expect(byId('hp-1').style.width).toBe('50%');
    expect(byId('hp-4').style.width).toBe('100%');
  });

  it('marks fallen heroes and replaces cards between expeditions', () => {
    const hud = new Hud();
    const hero = makeActor({rosterId: 2, hp: 0, max: 100, dead: true});
    hud.renderPartyCards([hero]);
    hud.updateParty([hero]);
    expect(byId('hp-2').closest('.card')!.classList.contains('dead')).toBe(true);
    hud.renderPartyCards([]);
    expect(document.querySelectorAll('#party .card')).toHaveLength(0);
  });
});

describe('updatePartyHealthUI', () => {
  it('tolerates heroes without a card and ignores enemies', () => {
    expect(() => updatePartyHealthUI([makeActor({rosterId: 1}), makeActor({team: 'enemy'})], () => null)).not.toThrow();
  });

  it('writes status text into an action element when the card has one', () => {
    const card = el('div', {className: 'card'}, el('div', {className: 'action'}), el('div', {className: 'hp'}, el('span', {id: 'hp-Knight'})));
    document.body.append(card);
    const hero = makeActor({hp: 42.2, max: 100, actionTime: 1, lastAction: '도발'});
    updatePartyHealthUI([hero], id => document.getElementById(id));
    expect(card.querySelector('.action')!.textContent).toBe('도발');
    hero.actionTime = 0;
    updatePartyHealthUI([hero], id => document.getElementById(id));
    expect(card.querySelector('.action')!.textContent).toBe('HP 43 / 100');
    hero.dead = true;
    updatePartyHealthUI([hero], id => document.getElementById(id));
    expect(card.querySelector('.action')!.textContent).toBe('전투 불능');
  });

  it('keys bars by roster id when known, falling back to the class name', () => {
    expect(heroHealthId({rosterId: 7, name: 'Knight'})).toBe('hp-7');
    expect(heroHealthId({name: 'Mage'})).toBe('hp-Mage');
  });
});

describe('UpgradesPanel', () => {
  const setup = () => {
    const progression = new Progression(memoryStore());
    const calls: string[] = [];
    const hooks = {onOpen: () => calls.push('open'), onClose: () => calls.push('close'), onPurchase: () => calls.push('buy')};
    const tactics = {hide: vi.fn()};
    const panel = new UpgradesPanel(progression, hooks, tactics);
    return {progression, calls, panel, tactics};
  };

  it('opens (pausing the game and hiding its sibling) and lists every upgrade', () => {
    const {panel, calls, tactics, progression} = setup();
    progression.data.gold = 25;
    byId('upgradeBtn').click();
    expect(panel.isOpen).toBe(true);
    expect(calls).toEqual(['open']);
    expect(tactics.hide).toHaveBeenCalled();
    expect(byId('upgradeInfo').textContent).toBe('골드 25 G · 스테이지 1');
    expect(document.querySelectorAll('#upgradeRows .upgradeRow')).toHaveLength(4);
  });

  it('disables what cannot be afforded and buys what can', () => {
    const {progression, calls} = setup();
    progression.data.gold = 25;
    byId('upgradeBtn').click();
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('#upgradeRows button')];
    expect(buttons.map(b => b.disabled)).toEqual([false, false, false, true]);
    buttons[0].click();
    expect(progression.data.upgrades.attack).toBe(1);
    expect(progression.data.gold).toBe(5);
    expect(calls).toEqual(['open', 'buy']);
    expect(document.querySelector<HTMLButtonElement>('#upgradeRows button')!.disabled).toBe(true);
  });

  it('shows MAX for a maxed upgrade and closes with the done button', () => {
    const {progression, calls, panel} = setup();
    progression.data.upgrades.dodge = 1;
    byId('upgradeBtn').click();
    expect(document.querySelectorAll<HTMLButtonElement>('#upgradeRows button')[3].textContent).toBe('MAX');
    byId('closeUpgrades').click();
    expect(panel.isOpen).toBe(false);
    expect(calls.at(-1)).toBe('close');
  });
});

describe('TacticsPanel', () => {
  const setup = () => {
    const progression = new Progression(memoryStore());
    const calls: string[] = [];
    const panel = new TacticsPanel(progression, {onOpen: () => calls.push('open'), onClose: () => calls.push('close'), onPurchase: () => calls.push('buy')}, {hide: vi.fn()});
    return {progression, calls, panel};
  };
  const click = (selector: string): void => document.querySelector<HTMLButtonElement>(selector)!.click();

  it('lists three roles with their tactics and equipped slots', () => {
    setup();
    byId('tacticsBtn').click();
    expect([...document.querySelectorAll('#tacticRows h3')].map(h => h.textContent)).toEqual(['전사 (2/2)', '궁수 (2/2)', '마법사 (2/2)']);
    expect(document.querySelectorAll('#tacticRows .upgradeRow')).toHaveLength(9);
    expect(byId('tacticInfo').textContent).toBe('골드 0 G · 승리 0회 · 장착 2칸');
  });

  it('equips and unequips tactics, keeping at least one per role', () => {
    const {progression} = setup();
    byId('tacticsBtn').click();
    click('button[data-tactic="ironwall"]');
    expect(progression.data.loadout.Knight).toEqual(['taunt', 'protect']);
    click('button[data-tactic="taunt"]');
    expect(progression.data.loadout.Knight).toEqual(['protect']);
    click('button[data-tactic="protect"]');
    expect(progression.data.loadout.Knight).toEqual(['protect']);
    click('button[data-tactic="ironwall"]');
    expect(progression.data.loadout.Knight).toEqual(['protect', 'ironwall']);
  });

  it('upgrades a tactic for gold, shows the next-level text, and caps at MAX', () => {
    const {progression, calls} = setup();
    progression.data.gold = 500;
    byId('tacticsBtn').click();
    click('button[data-level="taunt"]');
    expect(progression.tacticLevel('taunt')).toBe(2);
    expect(calls).toContain('buy');
    expect(document.body.textContent).toContain('반경 6.5 도발');
    click('button[data-level="taunt"]');
    expect(document.querySelector('button[data-level="taunt"]')!.textContent).toBe('MAX');
    expect(document.body.textContent).toContain('최대 레벨');
  });

  it('closes with the done button and resumes the game', () => {
    const {calls, panel} = setup();
    byId('tacticsBtn').click();
    byId('closeTactics').click();
    expect(panel.isOpen).toBe(false);
    expect(calls).toEqual(['open', 'close']);
  });
});

describe('HubPanel', () => {
  const setup = (canAct = true) => {
    const guild = new GuildState(memoryStore());
    const depart = vi.fn();
    const hub = new HubPanel(guild, {canAct: () => canAct, depart});
    return {guild, depart, hub};
  };

  it('shows supplies, the roster and the message', () => {
    const {hub} = setup();
    hub.show('환영합니다');
    const text = byId('hubPanel').textContent!;
    expect(byId('hubPanel').hidden).toBe(false);
    expect(text).toContain('환영합니다');
    expect(text).toContain('보급품 30 · 원정 0회 · 최장 이동 0칸');
    expect(text).toContain('전사 #1 · HP 115');
    expect(byId('expeditionGo').textContent).toBe('원정 출발 (3명)');
  });

  it('recruits a hero for supplies and refreshes the panel', () => {
    const {hub, guild} = setup();
    hub.show();
    byId('recruitM').click();
    expect(guild.data.supplies).toBe(20);
    expect(byId('hubPanel').textContent).toContain('영웅 모집 완료');
    expect(byId('hubPanel').textContent).toContain('마법사 #4');
    expect(byId('expeditionGo').textContent).toBe('원정 출발 (3명)');
  });

  it('refuses to recruit without supplies', () => {
    const {hub, guild} = setup();
    guild.data.supplies = 5;
    hub.show();
    byId('recruitK').click();
    expect(byId('hubPanel').textContent).toContain('보급품 부족');
    expect(guild.data.roster).toHaveLength(3);
  });

  it('marks fallen heroes and will not depart with nobody alive', () => {
    const {hub, guild, depart} = setup();
    for (const hero of guild.data.roster) hero.alive = false;
    hub.show();
    expect(byId('hubPanel').textContent).toContain('☠ 영구 사망');
    byId('expeditionGo').click();
    expect(depart).not.toHaveBeenCalled();
    expect(byId('hubPanel').textContent).toContain('영웅을 모집하세요');
  });

  it('departs and hides itself, but refuses mid-expedition', () => {
    const ready = setup();
    ready.hub.show();
    byId('expeditionGo').click();
    expect(ready.depart).toHaveBeenCalledTimes(1);
    expect(byId('hubPanel').hidden).toBe(true);

    mountPage();
    const busy = setup(false);
    busy.hub.show();
    byId('expeditionGo').click();
    expect(busy.depart).not.toHaveBeenCalled();
    expect(byId('hubPanel').textContent).toContain('먼저 퇴각해야 합니다');
    byId('recruitK').click();
    expect(busy.guild.data.roster).toHaveLength(3);
  });

  it('closes with the close button', () => {
    const {hub} = setup();
    hub.show();
    byId('hubClose').click();
    expect(byId('hubPanel').hidden).toBe(true);
  });

  it('escapes hostile text in messages', () => {
    const {hub} = setup();
    hub.show('<img src=x onerror=alert(1)>');
    expect(byId('hubPanel').querySelector('img')).toBeNull();
  });
});

describe('drawExplorationMap', () => {
  const ctx = () => ({fillRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fillStyle: '', strokeStyle: '', lineWidth: 0});

  it('reports coverage without needing a real canvas', () => {
    const dungeon = { ...FIXED_DUNGEON };
    const known = createKnownGrid(dungeon);
    revealAround(dungeon, known, {x: dungeon.centers[0][0], y: dungeon.centers[0][1]});
    const info = {textContent: ''};
    const c = ctx();
    drawExplorationMap({canvas: {width: 600, height: 400}, ctx: c, dungeon, known, routeHistory: [[1, 1], [2, 2]], pathfinderSkill: true, explorer: {x: 1, y: 1}, running: true, info});
    expect(info.textContent).toMatch(/^길잡이 ON · 지도 완성도 \d+% · 발견 \d+\/\d+칸 · 자동 탐험 중$/);
    expect(c.stroke).toHaveBeenCalled();
    expect(c.arc).toHaveBeenCalled();
  });

  it('announces a completed map and a paused one', () => {
    const dungeon = FIXED_DUNGEON;
    const known = dungeon.grid.map(row => row.map(Boolean));
    const info = {textContent: ''};
    const draw = (running: boolean, grid = known): void =>
      drawExplorationMap({canvas: {width: 10, height: 10}, ctx: ctx(), dungeon, known: grid, routeHistory: [], pathfinderSkill: false, explorer: {x: 0, y: 0}, running, info});
    draw(true);
    expect(info.textContent).toContain('지도 완성!');
    draw(false, createKnownGrid(dungeon));
    expect(info.textContent).toBe('길잡이 OFF · 지도 완성도 0% · 발견 0/' + dungeon.openTileCount + '칸 · 일시정지');
  });
});

describe('ExplorePanel', () => {
  const setup = () => {
    const session = new ExpeditionSession(FIXED_DUNGEON);
    const toggled = vi.fn(() => {
      session.pathfinderSkill = !session.pathfinderSkill;
    });
    const panel = new ExplorePanel(session, toggled);
    return {session, toggled, panel};
  };

  it('opens from the explore button and the minimap (mouse and keyboard)', () => {
    const {session} = setup();
    byId('exploreBtn').click();
    expect(byId('explorePanel').hidden).toBe(false);
    expect(session.known[session.explorer.y][session.explorer.x]).toBe(true);
    byId('exploreClose').click();
    expect(byId('explorePanel').hidden).toBe(true);
    byId('miniMap').click();
    expect(byId('explorePanel').hidden).toBe(false);
    byId('exploreClose').click();
    const space = new KeyboardEvent('keydown', {key: ' ', cancelable: true});
    byId('miniMap').dispatchEvent(space);
    expect(space.defaultPrevented).toBe(true);
    expect(byId('explorePanel').hidden).toBe(false);
    byId('exploreClose').click();
    byId('miniMap').dispatchEvent(new KeyboardEvent('keydown', {key: 'a'}));
    expect(byId('explorePanel').hidden).toBe(true);
  });

  it('labels the toggle and updates the map caption', () => {
    const {session} = setup();
    byId('exploreBtn').click();
    expect(byId('exploreInfo').textContent).toContain('자동 탐험 중');
    byId('exploreToggle').click();
    expect(session.autoExploring).toBe(false);
    expect(byId('exploreToggle').textContent).toBe('탐험 계속');
    expect(byId('exploreInfo').textContent).toContain('일시정지');
  });

  it('flips the guide skill label through the game callback', () => {
    const {toggled} = setup();
    byId('guideToggle').click();
    expect(toggled).toHaveBeenCalled();
    expect(byId('guideToggle').textContent).toBe('길잡이 스킬: 보유');
    byId('guideToggle').click();
    expect(byId('guideToggle').textContent).toBe('길잡이 스킬: 없음');
  });

  it('renders the A/B comparison with both runs and can be closed', () => {
    setup();
    byId('compareBtn').click();
    const panel = byId('comparePanel');
    expect(panel.hidden).toBe(false);
    expect(panel.textContent).toContain('동일 던전 시드 14729');
    expect(panel.querySelectorAll('tr')).toHaveLength(1 + 5 + 3);
    expect(panel.textContent).toContain('완료 여부: 없음 완료 / 있음 완료');
    panel.querySelector<HTMLButtonElement>('button.close')!.click();
    expect(panel.hidden).toBe(true);
  });
});

describe('createPresenter', () => {
  it('forwards every game notification to the matching component', () => {
    const session = new ExpeditionSession(FIXED_DUNGEON);
    const hud = new Hud();
    const explore = new ExplorePanel(session, () => {});
    const hub = new HubPanel(new GuildState(memoryStore()), {canAct: () => true, depart: () => {}});
    const presenter = createPresenter(hud, hub, explore);
    presenter.status('S');
    presenter.battleInfo('B');
    presenter.notice('N');
    presenter.setPaused(true);
    presenter.setSpeed(2);
    presenter.setRestartEnabled(true);
    presenter.showHub('hi');
    presenter.redrawMap();
    expect([byId('status').textContent, byId('battleInfo').textContent, byId('notice').textContent, byId('pause').textContent, byId('speed').textContent]).toEqual(['S', 'B', 'N', '계속', '2×']);
    expect(byId('hubPanel').textContent).toContain('hi');
    byId('exploreBtn').click();
    presenter.closeExplorePanel();
    expect(byId('explorePanel').hidden).toBe(true);
    presenter.renderParty([makeActor({rosterId: 1})]);
    presenter.updateParty([makeActor({rosterId: 1})]);
    expect(document.querySelectorAll('#party .card')).toHaveLength(1);
  });
});
