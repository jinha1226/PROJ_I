import type {ExpeditionSession} from '../game/session';
import {simulatePathfinder} from '../dungeon/pathfinderSimulation';
import {drawExplorationMap} from './explorationMap';
import {byId} from './dom';
import {renderPathfinderComparison} from './pathfinderComparison';

/** Full-screen exploration map, the minimap dock, and the pathfinder A/B tools. */
export class ExplorePanel {
  private readonly panel = byId('explorePanel');
  private readonly info = byId('exploreInfo');
  private readonly canvas = byId<HTMLCanvasElement>('exploreMap');
  private readonly mini = byId<HTMLCanvasElement>('miniMap');
  private readonly toggle = byId('exploreToggle');
  private readonly guideToggle = byId('guideToggle');
  private readonly comparePanel = byId('comparePanel');
  private readonly ctx = this.canvas.getContext('2d');
  private readonly miniCtx = this.mini.getContext('2d');

  constructor(
    private readonly session: ExpeditionSession,
    private readonly onGuideToggled: () => void,
  ) {
    byId('exploreBtn').onclick = () => this.open();
    byId('exploreClose').onclick = () => this.close();
    this.toggle.onclick = () => this.toggleAutoExplore();
    this.mini.addEventListener('click', () => this.open());
    this.mini.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      this.open();
    });
    this.guideToggle.onclick = () => {
      this.onGuideToggled();
      this.guideToggle.textContent = '길잡이 스킬: ' + (this.session.pathfinderSkill ? '보유' : '없음');
    };
    byId('compareBtn').onclick = () => this.compare();
  }

  open(): void {
    this.session.autoExploring = true;
    this.session.reveal();
    this.draw();
    this.panel.hidden = false;
    this.toggle.textContent = '탐험 일시정지';
  }

  close(): void {
    this.panel.hidden = true;
  }

  private toggleAutoExplore(): void {
    this.session.autoExploring = !this.session.autoExploring;
    this.toggle.textContent = this.session.autoExploring ? '탐험 일시정지' : '탐험 계속';
    this.draw();
  }

  draw(): void {
    const {session} = this;
    if (this.ctx) {
      drawExplorationMap({
        canvas: this.canvas,
        ctx: this.ctx,
        dungeon: session.dungeon,
        known: session.known,
        routeHistory: session.routeHistory,
        pathfinderSkill: session.pathfinderSkill,
        explorer: session.explorer,
        running: session.autoExploring,
        info: this.info,
      });
    }
    this.miniCtx?.clearRect(0, 0, this.mini.width, this.mini.height);
    this.miniCtx?.drawImage(this.canvas, 0, 0, this.mini.width, this.mini.height);
  }

  private compare(): void {
    const {dungeon} = this.session;
    renderPathfinderComparison(this.comparePanel, dungeon, simulatePathfinder(false, dungeon), simulatePathfinder(true, dungeon));
    this.comparePanel.hidden = false;
  }
}
