// 화면에 쓰는 글: 칸 · 적 설명, 능력치 변화, 소모품 목록 (상태 없이 받은 것만 읽는다)
import { cellAt, heroUnit, nameOf, unitAt } from '../core/board';
import { attackRange, skillCd, skillPower } from '../core/hero';
import { isKnown, itemName, itemUses } from '../core/items';
import type { Battle, HeroInfo, StatId, UseHow, Vec } from '../core/types';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { STR_HP, TILE_NAME } from '../data/rules';
import { range } from './dom';

const TILE_DESC: Partial<Record<string, string>> = {
  lava: '들어가면 큰 화상. 적을 밀어 넣는 곳',
  ice: '밀리면 멈출 때까지 미끄러진다',
  pit: '떨어지면 즉사',
  water: '들어가면 다음 턴 못 걷는다. 번개가 퍼진다',
  swamp: '서 있으면 매 턴 독. 불이 닿으면 폭발',
  grass: '불이 붙으면 매 턴 번진다',
  rock: '막힌다. 밀려서 부딪히면 피해. 궁수 · 사제의 시야를 끊는다',
  stairs: '여기서 나갈 수 있다 (처치 경험치만)',
};

const USE_VERB: Record<UseHow, string> = { drink: '마시기', throw: '던지기', read: '읽기' };

/** 능력치 1점을 올리면 바뀌는 것 (맵 사이 버튼에 보여준다) */
export function statGain(h: HeroInfo, s: StatId): string {
  const next: HeroInfo = { ...h, stats: { ...h.stats, [s]: h.stats[s] + 1 } };
  const out: string[] = [];
  const [a, b] = [range(attackRange(h)), range(attackRange(next))];
  if (a !== b) out.push(`공격 ${a} → ${b}`);
  if (s === 'str') out.push(`체력 +${STR_HP}`);
  const [c, d] = [skillCd(h), skillCd(next)];
  if (c !== d) out.push(`기술 대기 ${c} → ${d}`);
  if (skillPower(next) > skillPower(h)) out.push(`기술 위력 +${skillPower(next)}`);
  return out.join('<br>') || '지금 무기에는 변화 없음';
}

/** 아무것도 고르지 않았을 때의 안내 */
export function idleInfo(b: Battle): string {
  if (b.status !== 'play') return '';
  const me = heroUnit(b);
  const stuck = me.stuck > 0 ? '<br><span class="warn">물에 빠져 이번 턴은 걷지 못한다</span>' : '';
  return `옆 칸을 누르면 한 칸 걷고, 닿는 적을 누르면 공격한다. 멀리 누르면 적이 가까워질 때까지 걷는다. 적을 누르면 닿는 범위가 보인다${stuck}`;
}

/** 누른 칸의 설명: 적이면 체력 · 피해 · 상태 · 몇 대에 잡나, 아니면 타일 */
export function describe(b: Battle, p: Vec): string {
  const u = unitAt(b, p);
  const c = cellAt(b, p);
  const tile = `${TILE_NAME[c.tile]}${c.fire ? ' · 불' : ''}${c.steam ? ' · 증기' : ''}${c.smoke ? ` · 연기 ${c.smoke}턴` : ''}${c.revert ? ` (${c.revert.turns}턴 뒤 ${TILE_NAME[c.revert.tile]})` : ''}`;
  if (u && u.kind !== 'hero') {
    const d = ENEMIES[u.kind];
    const st = [u.frozen ? `빙결 ${u.frozen}` : '', u.stunned ? `기절 ${u.stunned}` : '', u.stuck ? '물에 빠짐' : '', u.intent ? '도화선!' : '',
      u.kind === 'priest' ? (u.charge ? `기도 중 ${u.charge}` : '내리칠 준비') : '']
      .filter(Boolean).join(' · ');
    const [lo, hi] = attackRange(b.hero);
    const hits = range([Math.ceil(u.hp / hi), Math.ceil(u.hp / lo)]);
    return `<b>${d.name}</b> 체력 ${u.hp}/${u.maxHp} · 피해 ${range(d.dmg)} — ${d.desc}${st ? ` · ${st}` : ''}<br>지금 무기로 ${hits}대 · 주황 칸이 닿는 범위`;
  }
  if (u) return `<b>${nameOf(u)}</b> · ${tile}`;
  return `<b>${tile}</b>${TILE_DESC[c.tile] ? ` — ${TILE_DESC[c.tile]}` : ''}`;
}

/** 소모품 목록 (물약은 마시기 · 던지기 두 버튼). 버튼: data-i = 가방 자리, data-how = 쓰는 법 */
export function itemMenu(h: HeroInfo): string {
  return `<b>어느 것을 쓸까?</b> 모르는 물건은 미리보기 없이 바로 쓴다<div class="items">${h.items.map((id, i) =>
    itemUses(id).map((how) => {
      const known = isKnown(h, id);
      const sub = known ? (how === 'throw' ? ITEMS[id].throwDesc : ITEMS[id].desc) : '정체를 모른다';
      return `<button data-i="${i}" data-how="${how}">${known ? ITEMS[id].short : itemName(h, id)} ${USE_VERB[how]}<small>${sub}</small></button>`;
    }).join('')).join('')}</div>`;
}

/** 감정할 물건 목록. 버튼: data-pick = 가방 자리 */
export function identifyMenu(h: HeroInfo, can: number[]): string {
  return `<b>무엇을 감정할까?</b><div class="items">${can.map((i) =>
    `<button data-pick="${i}">${itemName(h, h.items[i]!)}</button>`).join('')}</div>`;
}

/** 고른 소모품 설명 (칸 고를 때) */
export function itemInfo(h: HeroInfo, idx: number, how: UseHow): string {
  const it = h.items[idx];
  if (!it) return '';
  const desc = isKnown(h, it) ? (how === 'throw' ? ITEMS[it].throwDesc : ITEMS[it].desc) : '정체를 모른다 — 칸을 누르면 바로 던진다';
  return `<b>${itemName(h, it)}</b>: ${desc}`;
}
