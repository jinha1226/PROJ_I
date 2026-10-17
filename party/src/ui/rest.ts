// 층 사이 쉬는 화면: 성장 요약 → 보상 3택1(누구에게 낄지) → 레벨업 2택1 → 다음 층.
import { Rng } from '../core/rng';
import { ABILITIES } from '../data/abilities';
import { FLOORS } from '../data/encounters';
import { SKILL_NAME } from '../data/names';
import type { Item, SkillId } from '../sim/defs';
import { applyPerk, learnable, makeOffer, perkText, type Hero } from '../sim/hero';
import { RARITY_COLOR, SLOT_NAME, isBadProp, itemBaseLine, itemTitle, propText } from '../sim/items';
import { compareItem, rewardChoices } from '../sim/reward';

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export class RestScreen {
  private heroes: Hero[] = [];
  private depth = 1;
  private rng = new Rng(1);
  private rewards: Item[] = [];
  private picked: number | null = null;
  private rewardDone: string | null = null;

  constructor(private onNext: () => void) {
    $('rest').addEventListener('click', (e) => this.click(e));
  }

  open(heroes: Hero[], depth: number, seed: number) {
    this.heroes = heroes;
    this.depth = depth;
    this.rng = new Rng(seed);
    this.rewards = rewardChoices(this.rng, depth);
    this.picked = null;
    this.rewardDone = null;
    for (const h of heroes) if (h.pending > 0 && !h.offer) h.offer = makeOffer(h, this.rng);
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
      <h3>보상 — 하나를 골라 장착 ${this.rewardDone ? '<span class="done">✓</span>' : ''}</h3>
      ${this.rewardDone ? `<p class="note">${this.rewardDone}</p>` : this.rewardSection()}
      ${pendingTotal ? `<h3>레벨업 — 하나씩 고르기</h3>${this.heroes.map((h) => this.levelRow(h)).join('')}` : ''}
      <div class="next">
        <button data-act="next" ${pendingTotal ? 'disabled' : ''}>${pendingTotal ? '레벨업 선택을 마쳐 주세요' : `${this.depth + 1}층으로 내려가기${this.depth + 1 === FLOORS ? ' (보스층)' : ''}`}</button>
      </div>`;
  }

  private growthRow(h: Hero): string {
    const ups = (Object.keys(h.skills) as SkillId[])
      .filter((k) => h.skills[k] - h.startSkills[k] >= 0.05)
      .sort((a, b) => h.skills[b] - h.startSkills[b] - (h.skills[a] - h.startSkills[a]))
      .slice(0, 4)
      .map((k) => `${SKILL_NAME[k]} ${h.startSkills[k].toFixed(1)}→<b>${h.skills[k].toFixed(1)}</b>`)
      .join(' · ');
    const next = learnable(h).filter((l) => !l.ready).sort((a, b) => a.level - h.skills[a.skill] - (b.level - h.skills[b.skill]))[0];
    const gear = (['weapon', 'armour', 'jewel'] as const)
      .map((s) => (h.gear[s] ? `<span style="color:${RARITY_COLOR[h.gear[s]!.rarity]}">${esc(itemTitle(h.gear[s]!))}</span>` : '<span class="dim">없음</span>'))
      .join(' · ');
    return `<div class="hrow">
      <div><b style="color:${h.def.color}">${h.def.name}</b> Lv${h.startXl}${h.xl > h.startXl ? `→<b>${h.xl}</b>` : ''}
        <span class="dim">${ups || '성장 없음'}</span></div>
      <div class="dim small">${gear}${next ? ` · 다음 기술: ${ABILITIES[next.ability].name} (${SKILL_NAME[next.skill]} ${next.level})` : ''}</div>
    </div>`;
  }

  private itemCard(it: Item, i: number): string {
    const props = it.props.map((p) => `<li class="${isBadProp(p) ? 'bad' : ''}">${propText(p)}</li>`).join('');
    return `<div class="item ${this.picked === i ? 'picked' : ''}" data-item="${i}">
      <div class="iname" style="color:${RARITY_COLOR[it.rarity]}">${esc(itemTitle(it))}</div>
      <div class="dim small">${SLOT_NAME[it.base.slot]} · ${itemBaseLine(it)}</div>
      ${props ? `<ul>${props}</ul>` : ''}
    </div>`;
  }

  private rewardSection(): string {
    let html = `<div class="items">${this.rewards.map((it, i) => this.itemCard(it, i)).join('')}</div>`;
    if (this.picked !== null) {
      const it = this.rewards[this.picked];
      // 비교 점수가 가장 높은 영웅에 추천 표시
      const diffs = this.heroes.map((h) => compareItem(h, it));
      const best = diffs.reduce((bi, d, i) => (d.score > diffs[bi].score ? i : bi), 0);
      html += `<div class="targets">${this.heroes
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
    html += `<button class="skip" data-act="skip">보상 건너뛰기</button>`;
    return html;
  }

  private levelRow(h: Hero): string {
    if (!h.pending || !h.offer) return '';
    return `<div class="lvrow">
      <div><b style="color:${h.def.color}">${h.def.name}</b> <span class="dim">남은 선택 ${h.pending}</span></div>
      <div class="perks">${h.offer
        .map((p, i) => {
          const t = perkText(h, p);
          return `<button class="perk" data-perk="${this.heroes.indexOf(h)}:${i}">
            <b style="color:${t.color}">${t.title}</b><span class="dim small">${t.desc}</span></button>`;
        })
        .join('')}</div>
    </div>`;
  }

  private click(e: Event) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-item],[data-hero],[data-perk],[data-act]');
    if (!el) return;
    if (el.dataset.item !== undefined) {
      const i = Number(el.dataset.item);
      this.picked = this.picked === i ? null : i;
    } else if (el.dataset.hero !== undefined && this.picked !== null) {
      const h = this.heroes[Number(el.dataset.hero)];
      const it = this.rewards[this.picked];
      const old = h.gear[it.base.slot];
      h.gear[it.base.slot] = it;
      this.rewardDone = `${h.def.name}에게 ${itemTitle(it)} 장착${old ? ` (${itemTitle(old)} 버림)` : ''}`;
    } else if (el.dataset.perk) {
      const [hi, pi] = el.dataset.perk.split(':').map(Number);
      const h = this.heroes[hi];
      if (!h.offer) return;
      applyPerk(h, h.offer[pi]);
      if (h.pending > 0) h.offer = makeOffer(h, this.rng);
    } else if (el.dataset.act === 'skip') {
      this.rewardDone = '보상을 받지 않았다';
    } else if (el.dataset.act === 'next') {
      this.close();
      this.onNext();
      return;
    }
    this.render();
  }
}
