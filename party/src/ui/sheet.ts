// 캐릭터 상태창: 능력치 · 스킬(집중 지정) · 기술 · 장비를 한 화면에.
// 전투 중에는 파티 카드의 ⓘ, 쉬는 화면에서는 각 캐릭터의 「상태창」 버튼으로 연다.
import { MOODS } from '../data/moods';
import { RES_NAME } from '../data/names';
import { ELEMENT_NAME } from '../sim/combat';
import { RESIST_KEYS } from '../sim/defs';
import { MAX_ACTIVE, talentTiers, xpToNext, type Hero } from '../sim/hero';
import { TALENT_LEVELS, TALENTS, TIER_NAME } from '../data/talents';
import { RACES, type RaceId } from '../data/races';
import { talentColor } from './rest';
import { RARITY_COLOR, SLOT_NAME, isBadProp, itemBaseLine, itemTitle, propText } from '../sim/items';
import { abilityCooldown, attackDelay, avgWeaponDamage, castTimeOf, computeStats, failChance } from '../sim/stats';
import { Unit } from '../sim/unit';

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export class CharacterSheet {
  private hero: Hero | null = null;
  private unit: Unit | null = null;
  private onClose: (() => void) | null = null;

  constructor() {
    $('sheet').addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (e.target === $('sheet') || el?.dataset.act === 'close') return this.close();
    });
  }

  get isOpen() {
    return !$('sheet').classList.contains('hidden');
  }

  /** unit 을 주면 전투 중의 현재 수치(상태이상 포함)를, 없으면 영웅 데이터로 계산한 수치를 보여 준다 */
  open(hero: Hero, unit: Unit | null = null, onClose: (() => void) | null = null) {
    this.hero = hero;
    this.unit = unit;
    this.onClose = onClose;
    $('sheet').classList.remove('hidden');
    this.render();
    $('sheet').querySelector('.box')!.scrollTop = 0;
  }

  close() {
    $('sheet').classList.add('hidden');
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }

  private render() {
    const h = this.hero!;
    let u = this.unit;
    if (!u) {
      u = new Unit(0, h.def, 'party', 0, 0, h);
      computeStats(u);
      u.hp = u.stats.maxHp;
      u.mp = u.stats.maxMp;
    }
    const s = u.stats;
    const res = RESIST_KEYS.filter((k) => s.resists[k])
      .map((k) => `<span class="${s.resists[k] > 0 ? 'good' : 'bad'}">${RES_NAME[k]} ${s.resists[k] > 0 ? '+'.repeat(s.resists[k]) : '취약'}</span>`)
      .join(' ') || '<span class="dim">없음</span>';
    const tags = u.tags.includes('unstunnable') ? ' <span class="good">기절 면역</span>' : '';

    // 특성: 단계별 세 선택지. 고른 것은 밝게, 고르지 않은 것은 흐리게, 아직 못 간 단계는 잠김
    const tree = talentTiers(h)
      .map((opts, t) => {
        const picked = h.talents[t];
        const reached = TALENT_LEVELS[t] <= h.xl;
        const cards = opts
          .map((id) => {
            const td = TALENTS[id];
            const cls = picked === id ? 'on' : picked || !reached ? 'off' : '';
            return `<div class="tal ${cls}"><b style="color:${talentColor(td)}">${picked === id ? '✓ ' : ''}${td.name}</b><span class="dim small">${td.desc}</span></div>`;
          })
          .join('');
        const state = picked ? '' : reached ? ' <span class="good small">선택 대기</span>' : '';
        return `<div class="tier"><div class="tlv">Lv${TALENT_LEVELS[t]} <span class="dim small">${TIER_NAME[t]}</span>${state}</div><div class="tals">${cards}</div></div>`;
      })
      .join('');
    const race = RACES[h.def.race as RaceId];

    const abil = h.abilities
      .map((st) => {
        const ab = st.def;
        const fail = failChance(u!, ab);
        const elem = ab.effects.find((e) => e.kind === 'damage');
        const mode = st.hidden ? '자동 전용' : st.manualOnly ? '수동 전용' : st.auto ? '자동 사용' : '직접 사용';
        return `<div class="abil">
          <div><b style="color:${ab.color}">${ab.icon} ${ab.name}${st.rank ? ` +${st.rank}` : ''}</b>
            <span class="tag ${st.manualOnly ? 'm' : ''}">${mode}</span></div>
          <div class="dim small">${ab.desc}</div>
          <div class="small">시전 ${ab.castTime ? castTimeOf(u!, ab).toFixed(1) + '초' : '즉시'} · 재사용 ${abilityCooldown(st).toFixed(1)}초${ab.cost ? ` · 마나 ${ab.cost}` : ''}${
            elem && elem.kind === 'damage' ? ` · ${ELEMENT_NAME[elem.element]}` : ''
          }${ab.type === 'spell' ? ` · <span class="${fail > 0.15 ? 'bad' : ''}">실패율 ${Math.round(fail * 100)}%</span>` : ''}</div>
        </div>`;
      })
      .join('');
    const slotsLeft = MAX_ACTIVE - h.abilities.filter((a) => !a.hidden).length;

    const gear = (['weapon', 'armour', 'jewel'] as const)
      .map((slot) => {
        const it = h.gear[slot];
        if (!it) return `<div class="gear"><span class="dim">${SLOT_NAME[slot]}</span> <span class="dim">없음</span></div>`;
        return `<div class="gear"><span class="dim">${SLOT_NAME[slot]}</span>
          <b style="color:${RARITY_COLOR[it.rarity]}">${esc(itemTitle(it))}</b>
          <div class="dim small">${itemBaseLine(it)}</div>
          ${it.props.length ? `<div class="small">${it.props.map((p) => `<span class="${isBadProp(p) ? 'bad' : 'good'}">${propText(p)}</span>`).join(' · ')}</div>` : ''}
        </div>`;
      })
      .join('');

    $('sheet').querySelector('.box')!.innerHTML = `
      <div class="shead">
        <span class="glyph" style="color:${h.def.color};border-color:${h.def.color}">${h.def.glyph}</span>
        <div><h2 style="color:${h.def.color}">${h.def.name}</h2><div class="dim">${h.def.title} · 레벨 ${h.xl}
          <span class="xp"><i style="width:${(h.xp / xpToNext(h.xl)) * 100}%"></i></span> ${Math.floor(h.xp)}/${xpToNext(h.xl)}</div></div>
        <button class="close" data-act="close">닫기</button>
      </div>
      <div class="cols">
        <section>
          <h3>능력치</h3>
          <div class="kv">
            <span>체력</span><span>${Math.ceil(u.hp)} / ${s.maxHp}</span>
            ${s.maxMp ? `<span>마나</span><span>${Math.floor(u.mp)} / ${s.maxMp}</span>` : ''}
            <span>AC</span><span>${s.ac.toFixed(1)} <span class="dim small">받는 물리 피해 감소</span></span>
            <span>회피</span><span>${s.ev.toFixed(1)}</span>
            <span>의지력</span><span>${s.will} <span class="dim small">감속·저주 저항 · 스트레스를 덜 받음</span></span>
            <span>스트레스</span><span>${Math.round(h.stress)} / 100${
              h.mood ? ` · <b style="color:${MOODS[h.mood].color}">${MOODS[h.mood].virtue ? '각성' : '붕괴'}: ${MOODS[h.mood].name}</b><div class="dim small">${MOODS[h.mood].desc}</div>` : ' <span class="dim small">100 이 되면 붕괴(가끔 각성)</span>'
            }</span>
            <span>힘 / 민첩 / 지능</span><span>${u.str} / ${u.dex} / ${u.int}</span>
            <span>평타</span><span>${esc(u.weapon.name)} · ${avgWeaponDamage(u).toFixed(1)} / ${attackDelay(u).toFixed(2)}초</span>
            <span>갑옷 무게</span><span>${u.armourWeight}${u.armourWeight ? ' <span class="dim small">회피↓ 실패율↑</span>' : ''}</span>
            <span>저항</span><span>${res}${tags}</span>
          </div>
          <h3>장비</h3>${gear}
        </section>
        <section>
          ${race ? `<h3>종족 특성</h3><div class="tal on"><b>${race.trait.name}</b><span class="dim small">${race.trait.desc}</span></div>` : ''}
          <h3>특성 <span class="dim small">레벨마다 셋 중 하나 (쉬는 화면에서 고른다)</span></h3>
          ${tree}
          <h3>기술 <span class="dim small">직접 쓰는 기술 칸 ${MAX_ACTIVE - slotsLeft}/${MAX_ACTIVE}</span></h3>
          ${abil}
        </section>
      </div>`;
  }
}
