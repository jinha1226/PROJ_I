// 층 사이 쉬는 화면: 성장 요약 → 찾은 장비 → 보상 3택1(누구에게 낄지) → 특성 3택1 → 다음 층.
import { Rng } from '../core/rng';
import { ABILITIES } from '../data/abilities';
import { FLOORS } from '../data/encounters';
import { TALENT_LEVELS, TALENTS, TIER_NAME, type TalentDef } from '../data/talents';
import type { Item } from '../sim/defs';
import { applyTalent, nextTier, tierOptions, type Hero } from '../sim/hero';
import { RARITY_COLOR, SLOT_NAME, isBadProp, itemBaseLine, itemTitle, propText } from '../sim/items';
import { compareItem, rewardChoices } from '../sim/reward';
import type { RunState } from '../sim/run';

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export class RestScreen {
  private heroes: Hero[] = [];
  private depth = 1;
  private rng = new Rng(1);
  private rewards: Item[] = [];
  /** 고른 카드: 보상(reward) 또는 찾은 장비(found) 의 몇 번째 */
  private picked: { src: 'reward' | 'found'; i: number } | null = null;
  private rewardDone: string | null = null;
  private run: RunState = { belt: [], found: [], kills: {}, seen: [] };
  private foundNotes: string[] = [];

  constructor(
    private onNext: () => void,
    private onSheet: (h: Hero, done: () => void) => void,
  ) {
    $('rest').addEventListener('click', (e) => this.click(e));
  }

  open(heroes: Hero[], run: RunState, depth: number, seed: number) {
    this.heroes = heroes;
    this.run = run;
    this.foundNotes = [];
    this.depth = depth;
    this.rng = new Rng(seed);
    this.rewards = rewardChoices(this.rng, depth, heroes);
    this.picked = null;
    this.rewardDone = null;
    $('rest').classList.remove('hidden');
    this.render();
    $('rest').querySelector('.box')!.scrollTop = 0;
  }

  close() {
    $('rest').classList.add('hidden');
  }

  private render() {
    const box = $('rest').querySelector('.box')!;
    const pendingTotal = this.heroes.reduce((s, h) => s + h.pending, 0);
    box.innerHTML = `
      <h2>${this.depth}층 돌파!</h2>
      <div class="growth">${this.heroes.map((h) => this.growthRow(h)).join('')}</div>
      ${this.foundSection()}
      <h3>보상 — 하나를 골라 장착 ${this.rewardDone ? '<span class="done">✓</span>' : ''}</h3>
      ${this.rewardDone ? `<p class="note">${this.rewardDone}</p>` : this.rewardSection()}
      ${pendingTotal ? `<h3>특성 — 하나씩 고르기</h3>${this.heroes.map((h) => this.levelRow(h)).join('')}` : ''}
      <div class="next">
        <button data-act="next" ${pendingTotal ? 'disabled' : ''}>${pendingTotal ? '특성 선택을 마쳐 주세요' : `${this.depth + 1}층으로 내려가기${this.depth + 1 === FLOORS ? ' (보스층)' : ''}`}</button>
      </div>`;
  }

  private growthRow(h: Hero): string {
    const talents = h.talents.map((id) => TALENTS[id].name).join(' · ');
    const nextLv = TALENT_LEVELS.find((l) => l > h.xl);
    const gear = (['weapon', 'armour', 'jewel'] as const)
      .map((s) => (h.gear[s] ? `<span style="color:${RARITY_COLOR[h.gear[s]!.rarity]}">${esc(itemTitle(h.gear[s]!))}</span>` : '<span class="dim">없음</span>'))
      .join(' · ');
    return `<div class="hrow">
      <div><button class="sheetbtn" data-sheet="${this.heroes.indexOf(h)}">상태창</button>
        <b style="color:${h.def.color}">${h.def.name}</b> Lv${h.startXl}${h.xl > h.startXl ? `→<b>${h.xl}</b>` : ''}
        <span class="dim">${talents || '특성 없음'}</span>${h.restNote ? ` <span class="stress">${h.restNote}</span>` : ''}</div>
      <div class="dim small">${gear}${nextLv ? ` · 다음 특성: Lv${nextLv}` : ''}</div>
    </div>`;
  }

  private itemCard(it: Item, i: number, src: 'reward' | 'found'): string {
    const props = it.props.map((p) => `<li class="${isBadProp(p) ? 'bad' : ''}">${propText(p)}</li>`).join('');
    const picked = this.picked?.src === src && this.picked.i === i;
    return `<div class="item ${picked ? 'picked' : ''}" data-item="${src}:${i}">
      <div class="iname" style="color:${RARITY_COLOR[it.rarity]}">${esc(itemTitle(it))}</div>
      <div class="dim small">${SLOT_NAME[it.base.slot]} · ${itemBaseLine(it)}</div>
      ${props ? `<ul>${props}</ul>` : ''}
    </div>`;
  }

  /** 상자 · 제단 · 미믹에서 찾은 장비: 각각 누구에게 낄지 정하거나 버린다 (남기면 버려진다) */
  private foundSection(): string {
    const f = this.run.found;
    if (!f.length && !this.foundNotes.length) return '';
    let html = `<h3>찾은 장비 ${f.length ? `<span class="dim small">층을 떠나면 남은 것은 버려진다</span>` : '<span class="done">✓</span>'}</h3>`;
    if (this.foundNotes.length) html += `<p class="note">${this.foundNotes.join('<br>')}</p>`;
    if (f.length) {
      html += `<div class="items">${f.map((it, i) => this.itemCard(it, i, 'found')).join('')}</div>`;
      if (this.picked?.src === 'found') html += this.targets(f[this.picked.i]) + `<button class="skip" data-act="discard">이 장비 버리기</button>`;
    }
    return html;
  }

  private rewardSection(): string {
    let html = `<div class="items">${this.rewards.map((it, i) => this.itemCard(it, i, 'reward')).join('')}</div>`;
    if (this.picked?.src === 'reward') html += this.targets(this.rewards[this.picked.i]);
    html += `<button class="skip" data-act="skip">보상 건너뛰기</button>`;
    return html;
  }

  /** 장비를 누구에게 낄지: 영웅별 수치 변화 */
  private targets(it: Item): string {
    // 비교 점수가 가장 높은 영웅에 추천 표시
    const diffs = this.heroes.map((h) => compareItem(h, it));
    const best = diffs.reduce((bi, d, i) => (d.score > diffs[bi].score ? i : bi), 0);
    return `<div class="targets">${this.heroes
      .map((h, i) => {
        const cur = h.gear[it.base.slot];
        const lines = diffs[i].lines.map((l) => `<span class="${l.good ? 'good' : 'bad'}">${l.text}</span>`).join(' ');
        return `<button class="target" data-hero="${i}">
          <b style="color:${h.def.color}">${h.def.name}</b>${i === best && diffs[i].score > 0 ? ' <span class="rec">추천</span>' : ''}
          <span class="dim small">현재: ${cur ? esc(itemTitle(cur)) : '없음'}</span>
          <span class="small">${lines || '<span class="dim">변화 거의 없음</span>'}</span>
        </button>`;
      })
      .join('')}</div>`;
  }

  private levelRow(h: Hero): string {
    const tier = nextTier(h);
    if (tier < 0) return '';
    return `<div class="lvrow">
      <div><b style="color:${h.def.color}">${h.def.name}</b> <span class="dim">Lv${TALENT_LEVELS[tier]} · ${TIER_NAME[tier]}${h.pending > 1 ? ` · 남은 선택 ${h.pending}` : ''}</span></div>
      <div class="perks">${tierOptions(h, tier)
        .map((t) => `<button class="perk" data-perk="${this.heroes.indexOf(h)}:${t.id}">
            <b style="color:${talentColor(t)}">${t.name}</b><span class="dim small">${t.desc}</span></button>`)
        .join('')}</div>
    </div>`;
  }

  private click(e: Event) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-item],[data-hero],[data-perk],[data-act],[data-sheet]');
    if (!el) return;
    if (el.dataset.sheet !== undefined) {
      this.onSheet(this.heroes[Number(el.dataset.sheet)], () => this.render());
      return;
    }
    if (el.dataset.item !== undefined) {
      const [src, i] = el.dataset.item.split(':') as ['reward' | 'found', string];
      const same = this.picked?.src === src && this.picked.i === Number(i);
      this.picked = same ? null : { src, i: Number(i) };
    } else if (el.dataset.hero !== undefined && this.picked) {
      const h = this.heroes[Number(el.dataset.hero)];
      const { src, i } = this.picked;
      const it = src === 'reward' ? this.rewards[i] : this.run.found[i];
      const old = h.gear[it.base.slot];
      h.gear[it.base.slot] = it;
      const note = `${h.def.name}에게 ${itemTitle(it)} 장착${old ? ` (${itemTitle(old)} 버림)` : ''}`;
      if (src === 'reward') this.rewardDone = note;
      else {
        this.run.found.splice(i, 1);
        this.foundNotes.push(note);
      }
      this.picked = null;
    } else if (el.dataset.act === 'discard' && this.picked?.src === 'found') {
      const [it] = this.run.found.splice(this.picked.i, 1);
      this.foundNotes.push(`${itemTitle(it)} 버림`);
      this.picked = null;
    } else if (el.dataset.perk) {
      const [hi, id] = el.dataset.perk.split(':');
      applyTalent(this.heroes[Number(hi)], id);
    } else if (el.dataset.act === 'skip') {
      this.rewardDone = '보상을 받지 않았다';
    } else if (el.dataset.act === 'next') {
      this.run.found.length = 0;
      this.close();
      this.onNext();
      return;
    }
    this.render();
  }
}

/** 특성 카드 색: 기술이면 그 기술 색, 아니면 특성 색 */
export function talentColor(t: TalentDef): string {
  const ab = t.learn ?? t.mod?.ability;
  return ab ? ABILITIES[ab].color : '#9fd0ff';
}
