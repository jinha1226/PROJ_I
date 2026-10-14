import './ui/layout.css';
import {browserStore} from './persistence/store';
import {FIXED_DUNGEON} from './dungeon/generator';
import {Game} from './game/game';
import {frameDelta} from './game/mode';
import {ExpeditionSession} from './game/session';
import {KayKitLibrary} from './render/assets';
import {ThreeActorFactory} from './render/actorFactory';
import {ThreeFx} from './render/fx';
import {Stage} from './render/stage';
import {ThreeDungeonScene} from './render/threeDungeonScene';
import {GuildState} from './state/guild';
import {Progression} from './state/progression';
import {byId} from './ui/dom';
import {ExplorePanel} from './ui/explorePanel';
import {Hud} from './ui/hud';
import {HubPanel} from './ui/hubPanel';
import {createPresenter} from './ui/presenter';
import {TacticsPanel} from './ui/tacticsPanel';
import {UpgradesPanel} from './ui/upgradesPanel';

const FIRST_HUB_MESSAGE = '마왕 토벌을 위한 첫 원정대를 편성하세요.';
/** With `?debug` (or in dev), frames slower than this are logged with their likely cause. */
const SLOW_FRAME_MS = 50;
const HUB_LOCKED_NOTICE = '거점은 원정 종료 후 이용할 수 있습니다';

function bootstrap(): void {
  const container = byId('game');
  const store = browserStore();
  const stage = new Stage(container);
  const dungeonScene = new ThreeDungeonScene(stage.scene);
  const fx = new ThreeFx(stage.scene, stage.camera, container);
  const dungeon = FIXED_DUNGEON;
  const session = new ExpeditionSession(dungeon);
  const progression = new Progression(store);
  const guild = new GuildState(store);

  const hud = new Hud();
  const explore = new ExplorePanel(session, () => game.toggleGuide());
  const hub = new HubPanel(guild, {canAct: () => game.mode === 'base', depart: () => void game.launchFromHub()});
  const game: Game = new Game({
    dungeon,
    session,
    progression,
    guild,
    factory: new ThreeActorFactory(stage.scene, new KayKitLibrary()),
    fx,
    scene: dungeonScene,
    presenter: createPresenter(hud, hub, explore),
    onWorldPopulated: () => {
      const samples = fx.warmupSamples();
      stage.warmUp(samples);
      for (const sample of samples) {
        sample.geometry.dispose();
        (sample.material as {dispose(): void}).dispose();
      }
    },
  });

  const panelHooks = {
    onOpen: () => game.setPaused(true),
    onClose: () => game.setPaused(false),
    onPurchase: () => game.renderProgress(),
  };
  const tactics: TacticsPanel = new TacticsPanel(progression, panelHooks, {hide: () => upgrades.hide()});
  const upgrades: UpgradesPanel = new UpgradesPanel(progression, panelHooks, {hide: () => tactics.hide()});

  byId('speed').onclick = () => game.cycleSpeed();
  byId('pause').onclick = () => {
    if (upgrades.isOpen || tactics.isOpen) return;
    game.setPaused(!game.paused);
  };
  byId('restart').onclick = () => void game.startExpedition().catch(error => console.error(error));
  byId('retreatBtn').onclick = () => game.issueRetreat();
  byId('hubBtn').onclick = () => (game.mode === 'base' ? game.openHub() : hud.setNotice(HUB_LOCKED_NOTICE));

  let last = performance.now();
  let programs = 0;
  const debugFrames = import.meta.env.DEV || new URLSearchParams(location.search).has('debug');
  const frame = (now: number): void => {
    requestAnimationFrame(frame);
    const gap = now - last;
    game.tick(frameDelta(now, last));
    last = now;
    const focus = game.focusPoint();
    dungeonScene.updateLighting(focus);
    stage.render(focus);
    if (debugFrames) {
      const work = performance.now() - now;
      const current = stage.programCount;
      if (gap > SLOW_FRAME_MS || work > SLOW_FRAME_MS) {
        console.warn(`[frame] gap ${gap.toFixed(0)}ms, work ${work.toFixed(0)}ms, mode ${game.mode}, shader programs ${programs} -> ${current}`);
      }
      programs = current;
    }
  };
  requestAnimationFrame(frame);
  game.openHub(FIRST_HUB_MESSAGE);
}

bootstrap();
