import type {Sfx} from '../audio/sfx';
import {itemDef} from '../items/catalog';
import type {ActorRenderer} from '../render/actors';
import type {Fx} from '../render/fx';
import type {Stage} from '../render/stage';
import {UNARMED_STATS} from '../sim/attacks';
import type {Raid} from '../sim/raid';
import type {SimEvent} from '../sim/types';
import type {Hud} from '../ui/hud';

const SHAKE = {light: 0.22, heavy: 0.38, kill: 0.45, hurt: 0.5} as const;
const BONE = 0xe9e1cc;
const DUST = 0x8c7b64;

/**
 * Turns simulation events into hit feel: particles, slash trails, damage
 * numbers, camera shake, flashes and sound. Gameplay rules never live here.
 */
export class Feedback {
  constructor(
    private readonly raid: Raid,
    private readonly fx: Fx,
    private readonly actors: ActorRenderer,
    private readonly stage: Stage,
    private readonly hud: Hud,
    private readonly sfx: Sfx,
  ) {}

  private isSkeleton(id: number): boolean {
    const e = this.raid.enemies.find(x => x.id === id);
    return Boolean(e && e.kind !== 'raider');
  }

  handle(ev: SimEvent): void {
    this.actors.onEvent(ev);
    const fx = this.fx;
    switch (ev.type) {
      case 'swing': {
        const p = this.raid.player;
        const reach = (this.raid.weapon ?? UNARMED_STATS).reach;
        fx.slash(p.id, p, ev.step, reach, ev.step.heavy);
        this.sfx.swing(ev.step.heavy);
        break;
      }
      case 'hit': {
        const heavy = ev.heavy || ev.crit;
        const dir = {x: ev.dirX, z: ev.dirZ};
        fx.cancel(ev.target);
        fx.burst({x: ev.x, y: 1.2, z: ev.z, count: heavy ? 26 : 14, color: 0xffffff, color2: 0xffc060, speed: [5, heavy ? 15 : 10], dir, spread: 1.3, up: [1, 6], life: [0.12, 0.3], size: [0.05, 0.12], gravity: 18, drag: 5});
        if (this.isSkeleton(ev.target)) {
          fx.burst({x: ev.x, y: 1.2, z: ev.z, count: heavy ? 10 : 5, color: BONE, color2: 0xb8ae96, speed: [2, 7], dir, spread: 1.6, up: [3, 7], life: [0.5, 0.9], size: [0.08, 0.16], gravity: 22, drag: 1.5}, false);
        } else {
          fx.burst({x: ev.x, y: 1.1, z: ev.z, count: 8, color: 0xb0161a, color2: 0x5a0a0a, speed: [2, 6], dir, spread: 1.4, up: [1, 4], life: [0.35, 0.6], size: [0.06, 0.12], gravity: 20, drag: 2}, false);
        }
        fx.text(ev.x, 2.2, ev.z, String(ev.damage), ev.crit ? 'crit' : heavy ? 'heavy' : 'dmg');
        this.stage.shake(ev.killed ? SHAKE.kill : heavy ? SHAKE.heavy : SHAKE.light);
        this.sfx.hit(heavy, ev.crit);
        if (ev.killed) this.onKill(ev);
        break;
      }
      case 'playerHurt':
        this.stage.shake(SHAKE.hurt);
        this.hud.hurt();
        this.sfx.playerHurt();
        fx.text(ev.x, 2.3, ev.z, `-${ev.damage}`, 'hurt');
        fx.burst({x: ev.x, y: 1.2, z: ev.z, count: 10, color: 0xff3030, color2: 0x801010, speed: [2, 7], dir: {x: ev.dirX, z: ev.dirZ}, spread: 1.5, up: [1, 5], life: [0.2, 0.45], size: [0.06, 0.12], gravity: 16});
        break;
      case 'dodge':
        fx.burst({x: ev.x, y: 0.15, z: ev.z, count: 12, color: DUST, color2: 0x5e5244, speed: [1, 4], dir: {x: -ev.dirX, z: -ev.dirZ}, spread: 2.2, up: [0.5, 2], life: [0.35, 0.6], size: [0.12, 0.26], gravity: 2, drag: 3}, false);
        fx.ring(ev.x, ev.z, 0x9bb7ff, 1.4, 0.25);
        this.sfx.dodge();
        break;
      case 'evade': {
        fx.text(ev.x, 2.4, ev.z, '회피!', 'evade', 0.7);
        this.sfx.evade();
        break;
      }
      case 'windup':
        fx.windup(ev.enemy, ev.duration, ev.reach, ev.arc);
        this.sfx.windup();
        break;
      case 'strike':
        fx.release(ev.enemy);
        break;
      case 'cast':
        fx.cast(ev.enemy, ev.duration);
        this.sfx.cast();
        break;
      case 'aim':
        fx.aim(ev.enemy, ev.duration);
        break;
      case 'shoot':
        fx.projectile(ev.projectile);
        if (ev.projectile.kind === 'bolt') this.sfx.bolt();
        else this.sfx.arrow();
        break;
      case 'projectileEnd':
        fx.projectileEnd(ev.id, ev.x, ev.z, ev.kind);
        this.sfx.impact();
        break;
      case 'alert': {
        const e = this.raid.enemies.find(x => x.id === ev.enemy);
        if (e) fx.text(e.x, 2.9, e.z, '!', 'alert', 0.9);
        this.sfx.alert();
        break;
      }
      case 'awaken': {
        const e = this.raid.enemies.find(x => x.id === ev.enemy);
        if (e) {
          fx.burst({x: e.x, y: 0.2, z: e.z, count: 18, color: DUST, color2: BONE, speed: [1, 4], up: [1, 4], life: [0.5, 1], size: [0.1, 0.22], gravity: 6, drag: 2}, false);
          fx.text(e.x, 2.9, e.z, '!', 'alert', 0.9);
        }
        this.sfx.awaken();
        break;
      }
      case 'death':
        if (ev.actor === this.raid.player.id) this.sfx.death();
        break;
      case 'containerOpen':
        this.sfx.open();
        break;
      case 'reveal': {
        const rarity = itemDef(ev.defId).rarity;
        this.sfx.reveal(rarity === 'rare' || rarity === 'epic' || rarity === 'legendary');
        break;
      }
      case 'healed': {
        const target = ev.actor === this.raid.player.id ? this.raid.player : this.raid.enemies.find(e => e.id === ev.actor);
        if (target) {
          fx.text(target.x, 2.3, target.z, `+${ev.amount}`, 'heal');
          fx.burst({x: target.x, y: 0.3, z: target.z, count: 16, color: 0x6dff9a, color2: 0xc0ffd0, speed: [0.3, 1.2], up: [2, 4], life: [0.5, 0.9], size: [0.05, 0.1], drag: 1});
        }
        if (ev.actor === this.raid.player.id) this.sfx.heal();
        break;
      }
      case 'extractStart':
        this.hud.notice(`<b>${this.raid.zones[ev.zone].name}</b> 진입 — 탈출까지 버티세요`, 'good');
        break;
      case 'extractCancel':
        this.hud.notice('탈출이 취소되었습니다', 'warn');
        break;
      case 'notice':
        this.hud.notice(ev.text, ev.tone);
        break;
      default:
        break;
    }
  }

  private onKill(ev: Extract<SimEvent, {type: 'hit'}>): void {
    const fx = this.fx;
    fx.ring(ev.x, ev.z, 0xffe0a0, 3, 0.4);
    if (this.isSkeleton(ev.target)) {
      fx.burst({x: ev.x, y: 1.3, z: ev.z, count: 26, color: BONE, color2: 0x9c927c, speed: [2, 9], up: [3, 9], life: [0.8, 1.4], size: [0.1, 0.22], gravity: 24, drag: 1.2}, false);
      fx.burst({x: ev.x, y: 1.6, z: ev.z, count: 14, color: 0x7fd4ff, color2: 0xffffff, speed: [0.5, 2], up: [1, 3], life: [0.5, 0.9], size: [0.05, 0.1], drag: 1});
      this.sfx.bones();
    } else {
      this.hud.notice('약탈자를 쓰러뜨렸다! 그의 가방을 뒤져보자.', 'good');
    }
  }
}
