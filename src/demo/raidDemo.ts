import type {Object3D} from 'three';
import {sfx} from '../audio/sfx';
import {Input} from '../core/input';
import type {Vec2} from '../core/math';
import {BossRaid} from '../raidboss/sim';
import type {Order, RaidInput} from '../raidboss/types';
import {RaidHud, showResults, showStartScreen, type StartChoice} from '../raidboss/ui';
import {RaidView} from '../raidboss/view';
import type {AssetLibrary} from '../render/assets';
import type {Stage} from '../render/stage';
import {DEFAULT_VISUAL} from '../render/visual';
import {byId} from '../ui/dom';

const MAX_FRAME = 1 / 20;
const RESULT_DELAY = 2;

/** `?raidtest`: five-member boss raid prototype. */
export function startRaidDemo(stage: Stage, assets: AssetLibrary): void {
  const input = new Input(stage.canvas);
  input.onGesture(() => sfx.unlock());
  stage.applyVisual({...DEFAULT_VISUAL, lighting: 'jh', rim: 0.45, specular: true, bloom: 0.4});
  stage.setBaseZoom(1.2);
  // Lights belong to the stage; everything added after this is per-attempt and gets cleared.
  const permanent = new Set<Object3D>(stage.scene.children);
  let raid: BossRaid | null = null;
  let view: RaidView | null = null;
  let hud: RaidHud | null = null;
  let endTimer = 0;
  let choice: StartChoice = {role: 'melee', aiSkill: 0.7};

  const clear = (): void => {
    for (const child of [...stage.scene.children]) if (!permanent.has(child)) stage.scene.remove(child);
    hud?.dispose();
    hud = null;
    byId('floatLayer').replaceChildren();
  };

  const begin = (c: StartChoice): void => {
    choice = c;
    clear();
    raid = new BossRaid({seed: (Date.now() & 0xffff) + 1, playerRole: c.role, aiSkill: c.aiSkill});
    view = new RaidView(stage.scene, assets, stage, byId('floatLayer'));
    hud = new RaidHud(raid);
    endTimer = 0;
    const me = raid.party.find(u => u.controlled) ?? raid.boss;
    stage.snapTo(me);
    stage.warmUp();
    hud.say('해골 군주가 깨어났다!');
  };
  showStartScreen(begin, choice);

  let last = performance.now();
  const loop = (now: number): void => {
    const dt = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    if (raid && view && hud) {
      const pointer = input.pointer;
      const aim: Vec2 = pointer.active ? stage.groundPoint(pointer.x, pointer.y) : raid.boss;
      const sampled = input.sample(aim, false);
      const order: Order | null = input.wasPressed('KeyZ') ? 'stack' : input.wasPressed('KeyC') ? 'spread' : null;
      const raidInput: RaidInput = {
        move: sampled.move,
        aim,
        attack: sampled.attack,
        dodge: sampled.dodge,
        skill1: input.wasPressed('KeyQ'),
        skill2: input.wasPressed('KeyE'),
        order,
      };
      raid.update(dt, raidInput);
      for (const ev of raid.drainEvents()) {
        view.onEvent(raid, ev);
        if (ev.type === 'phase') hud.say(ev.text);
        if (ev.type === 'order') {
          hud.setOrder(ev.order);
          hud.say(ev.order === 'stack' ? '모여!' : ev.order === 'spread' ? '흩어져!' : '대형 해제');
        }
        if (ev.type === 'hit') sfx.hit(ev.kind === 'boss' || ev.crit, ev.crit);
        if (ev.type === 'hazardEnd') sfx.impact();
        if (ev.type === 'cast') sfx.cast();
        if (ev.type === 'heal') sfx.heal();
        if (ev.type === 'dodge') sfx.dodge();
      }
      view.update(raid, dt);
      const me = raid.party.find(u => u.controlled && u.alive);
      const living = raid.party.filter(u => u.alive);
      const anchor = me ?? (living.length ? {x: living.reduce((s, u) => s + u.x, 0) / living.length, z: living.reduce((s, u) => s + u.z, 0) / living.length} : raid.boss);
      // Keep both me and the boss in frame: aim between them, leaning toward me.
      const focus = raid.boss.alive ? {x: anchor.x * 0.6 + raid.boss.x * 0.4, z: anchor.z * 0.6 + raid.boss.z * 0.4} : anchor;
      stage.setTorchSites(view.torchSites, focus, view.torchColors);
      stage.update(dt, focus, pointer.active ? aim : null, 1);
      stage.render();
      hud.update(dt);
      if (raid.ended) {
        endTimer += dt;
        if (endTimer >= RESULT_DELAY && endTimer - dt < RESULT_DELAY) {
          if (raid.ended === 'win') sfx.extracted();
          showResults(raid, () => showStartScreen(begin, choice));
        }
      }
    }
    input.endFrame();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
