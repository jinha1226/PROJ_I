import type {Presenter} from '../game/ports';
import type {Hud} from './hud';
import type {ExplorePanel} from './explorePanel';
import type {HubPanel} from './hubPanel';

/** Routes game notifications to the concrete DOM components. */
export function createPresenter(hud: Hud, hub: HubPanel, explore: ExplorePanel): Presenter {
  return {
    status: text => hud.setStatus(text),
    battleInfo: text => hud.setBattleInfo(text),
    notice: text => hud.setNotice(text),
    setRestartEnabled: enabled => hud.setRestartEnabled(enabled),
    setPaused: paused => hud.setPauseLabel(paused),
    setSpeed: speed => hud.setSpeedLabel(speed),
    renderParty: heroes => hud.renderPartyCards(heroes),
    updateParty: actors => hud.updateParty(actors),
    showHub: message => hub.show(message),
    closeExplorePanel: () => explore.close(),
    redrawMap: () => explore.draw(),
  };
}
