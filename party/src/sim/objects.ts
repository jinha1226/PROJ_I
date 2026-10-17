// 던전 오브젝트(상자 · 미믹 · 이벤트)와 소모품 사용.
// 오브젝트는 전투 중이 아닐 때 파티원이 그 위로 가면 작동한다 (드래그해서 보내면 된다).
import { dist } from '../core/rng';
import { CONSUMABLES, type ConsumableId } from '../data/consumables';
import { ENCOUNTERS, FLOORS } from '../data/encounters';
import type { ObjectKind } from '../data/maps';
import { applyDamage, heal, tryApplyStatus } from './combat';
import type { Hero } from './hero';
import { itemTitle } from './items';
import { usefulItem } from './reward';
import { addToBelt } from './run';
import { computeStats } from './stats';
import { partyStress } from './stress';
import type { Unit } from './unit';
import type { World } from './world';

export interface WorldObject {
  id: number;
  kind: ObjectKind;
  x: number;
  y: number;
  used: boolean;
}

export interface EventPrompt {
  obj: WorldObject;
  title: string;
  text: string;
  choices: { id: string; label: string }[];
}

const heroesOf = (w: World): Hero[] => w.party.flatMap((p) => (p.hero ? [p.hero] : []));

export const OBJECT_NAME: Record<ObjectKind, string> = {
  chest: '보물상자', mimic: '보물상자', fountain: '신비한 샘', altar: '피의 제단', prisoner: '갇힌 포로',
};

/** 전투가 없을 때: 오브젝트 위에 멈춘(또는 그리로 가던) 파티원이 있으면 작동 */
export function checkObjects(w: World) {
  if (w.inCombat || w.prompt || w.outcome) return;
  for (const o of w.objects) {
    if (o.used) continue;
    const toucher = w.party.find((p) => {
      // 무리로 오면 서로 밀려 정확히 그 칸에 서지 못하므로 넉넉하게 잡는다
      if (!p.alive || dist(p, o) > 1.3) return false;
      const it = p.command?.intent;
      return !it || (it.type === 'move' && dist(it, o) < 1.6);
    });
    if (!toucher) continue;
    o.used = true;
    if (o.kind === 'chest') {
      openChest(w, toucher);
      partyStress(w, -4);
    }
    else if (o.kind === 'mimic') {
      const m = w.spawn('mimic', 'enemy', o.x, o.y);
      m.aware = true;
      w.float(m, '미믹이다!', '#ff6666', 1.3);
      w.log('상자가 이빨을 드러냈다 — 미믹!', '#ff6666');
      w.crisis(`mimic:${o.id}`, '미믹이다!', o.x, o.y);
      partyStress(w, 8);
    } else w.prompt = makePrompt(o);
    return;
  }
}

function openChest(w: World, by: Unit) {
  const rng = w.rng;
  if (rng.chance(0.55) && w.run.belt.length < 4) {
    const list = Object.values(CONSUMABLES);
    let r = rng.next() * list.reduce((s, c) => s + c.w, 0);
    const c = list.find((x) => (r -= x.w) <= 0) ?? list[0];
    addToBelt(w.run, c.id);
    w.float(by, `${c.name}!`, c.color, 1.2);
    w.log(`상자에서 ${c.name}을(를) 찾았다 (벨트)`, c.color);
  } else {
    // 상자는 최소 마법 등급, 파티 누군가에게 쓸모 있는 것으로
    const it = usefulItem(rng, w.depth, heroesOf(w), { min: 'magic' });
    w.run.found.push(it);
    w.float(by, `${itemTitle(it)}!`, '#ffcc55', 1.2);
    w.log(`상자에서 ${itemTitle(it)}을(를) 찾았다 (층을 마치면 장착)`, '#ffcc55');
  }
}

function makePrompt(o: WorldObject): EventPrompt {
  switch (o.kind) {
    case 'fountain':
      return {
        obj: o, title: '신비한 샘',
        text: '맑은 물이 솟아오른다. 몸이 가벼워질 것 같기도, 어딘가 불길하기도 하다.',
        choices: [{ id: 'drink', label: '파티가 함께 마신다' }, { id: 'leave', label: '지나친다' }],
      };
    case 'altar':
      return {
        obj: o, title: '피의 제단',
        text: '제단 위에 무언가가 놓여 있다. 피를 바치면 가져갈 수 있을 것 같다. (파티 전원 최대 체력 -6 영구, 스트레스)',
        choices: [{ id: 'offer', label: '피를 바치고 아티팩트를 얻는다' }, { id: 'leave', label: '지나친다' }],
      };
    default:
      return {
        obj: o, title: '갇힌 포로',
        text: '쇠사슬에 묶인 모험가가 도움을 청한다. 주변이 지나치게 조용하다…',
        choices: [{ id: 'free', label: '풀어 준다 (경험치)' }, { id: 'leave', label: '지나친다' }],
      };
  }
}

function addPerkToParty(w: World, kind: 'hp', v: number) {
  for (const p of w.party) {
    if (!p.hero) continue;
    p.hero.perks.push({ kind, v });
    p.refreshGear();
    const before = p.stats.maxHp;
    computeStats(p);
    if (p.alive) p.hp = Math.max(1, Math.min(p.stats.maxHp, p.hp + (p.stats.maxHp - before)));
  }
}

export function resolvePrompt(w: World, choice: string) {
  const pr = w.prompt;
  if (!pr) return;
  w.prompt = null;
  const rng = w.rng;
  const live = w.party.filter((p) => p.alive);
  if (choice === 'drink') {
    const r = rng.next();
    if (r < 0.55) {
      for (const p of live) {
        p.hp = p.stats.maxHp;
        p.mp = p.stats.maxMp;
        w.float(p, '회복', '#88ff88');
      }
      w.log('샘물이 상처와 마음을 씻어 냈다 (완전 회복 · 스트레스 감소)', '#88ff88');
      partyStress(w, -25);
    } else if (r < 0.8) {
      addPerkToParty(w, 'hp', 5);
      for (const p of live) w.float(p, '최대 체력 +5', '#88ff88');
      w.log('몸 깊은 곳에서 힘이 차오른다 (파티 전원 최대 체력 +5 · 스트레스 감소)', '#88ff88');
      partyStress(w, -15);
    } else {
      for (const p of live) {
        tryApplyStatus(w, p, { status: 'poison', duration: 8, stacks: 4 }, null, 0);
        tryApplyStatus(w, p, { status: 'slow', duration: 5 }, null, 0);
      }
      w.log('물이 썩어 있었다! (중독 · 감속 · 스트레스)', '#ff8866');
      partyStress(w, 10);
    }
  } else if (choice === 'offer') {
    addPerkToParty(w, 'hp', -6);
    const it = usefulItem(rng, w.depth + 1, heroesOf(w), { force: 'artifact' });
    w.run.found.push(it);
    w.log(`피를 바치고 ${itemTitle(it)}을(를) 얻었다 (층을 마치면 장착)`, '#ffcc55');
    partyStress(w, 6);
  } else if (choice === 'free') {
    const xp = 25 + 15 * w.depth;
    w.grantXp(xp);
    w.log(`포로를 풀어 주었다 (경험치 +${xp})`, '#ffe14d');
    if (rng.chance(0.5)) {
      // 매복: 방 가장자리에서 무리가 나타난다
      const pool = ENCOUNTERS[Math.min(FLOORS, w.depth)];
      const group = pool[rng.int(0, pool.length - 1)];
      for (const id of group) {
        const a = rng.next() * Math.PI * 2;
        const p = w.map.nearestFloor(pr.obj.x + 0.5 + Math.cos(a) * 3, pr.obj.y + 0.5 + Math.sin(a) * 3);
        const m = w.spawn(id, 'enemy', p.x, p.y);
        m.aware = true;
      }
      w.log('함정이었다! 매복한 적들이 뛰쳐나온다', '#ff6666');
      w.crisis(`ambush:${pr.obj.id}`, '매복!', pr.obj.x, pr.obj.y);
      partyStress(w, 10);
    }
  } else {
    w.log(`${pr.title}을(를) 지나쳤다`, '#999999');
  }
}

/** 벨트의 소모품 사용. 대상이 맞지 않으면 false */
export function useConsumable(w: World, index: number, target: Unit | null, x: number, y: number): boolean {
  const id: ConsumableId | undefined = w.run.belt[index];
  if (!id) return false;
  const c = CONSUMABLES[id];
  const live = w.party.filter((p) => p.alive);
  if (!live.length) return false;
  switch (id) {
    case 'heal_potion':
      for (const p of live) heal(w, p, p.stats.maxHp * 0.4);
      break;
    case 'banish_scroll': {
      if (!target || !target.alive || target.faction === 'party' || target.def.boss) return false;
      // 파티에서 먼 바닥으로
      let best = { x: target.x, y: target.y }, bd = -1;
      for (let i = 0; i < 40; i++) {
        const p = w.map.nearestFloor(w.rng.int(1, w.map.w - 2) + 0.5, w.rng.int(1, w.map.h - 2) + 0.5);
        const d = Math.min(...live.map((q) => dist(q, p)));
        if (d > bd && !w.map.isWallAt(p.x, p.y)) { bd = d; best = p; }
      }
      w.effect({ kind: 'ring', x: target.x, y: target.y, r: 0.8, color: c.color, dur: 0.5 });
      if (target.cast) w.cancelCast(target, '', false);
      target.x = best.x;
      target.y = best.y;
      target.aware = false;
      target.intent = null;
      target.path = [];
      w.log(`${target.name}을(를) 멀리 추방했다`, c.color);
      break;
    }
    case 'fear_scroll': {
      const cx = live.reduce((s, p) => s + p.x, 0) / live.length, cy = live.reduce((s, p) => s + p.y, 0) / live.length;
      w.effect({ kind: 'ring', x: cx, y: cy, r: 6, color: c.color, dur: 0.6 });
      for (const e of w.units)
        if (e.alive && e.faction === 'enemy' && dist(e, { x: cx, y: cy }) <= 6 && !e.def.boss)
          tryApplyStatus(w, e, { status: 'fear', duration: 5 }, null, 0);
      break;
    }
    case 'calm_incense':
      partyStress(w, -30);
      for (const p of live) w.float(p, '진정', c.color);
      break;
    case 'fire_bomb': {
      w.effect({ kind: 'ring', x, y, r: 2, color: c.color, dur: 0.5 });
      for (const v of w.units)
        if (v.alive && dist(v, { x, y }) <= 2 + v.radius * 0.5) {
          applyDamage(w, v, 18 + w.depth * 6, 'fire', null);
          tryApplyStatus(w, v, { status: 'burn', duration: 4, chance: 0.7 }, null, 0);
        }
      break;
    }
  }
  w.run.belt.splice(index, 1);
  w.log(`${c.name} 사용`, c.color);
  return true;
}
