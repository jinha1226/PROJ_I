// 용병단 거점 (탭): 원정대 편성 · 선술집 · 치료소 · 대장간 · 훈련장 · 기록(묘지 · 해금).
import { Rng } from '../core/rng';
import { CLASSES, CLASS_LIST, type ClassId } from '../data/classes';
import { MOODS } from '../data/moods';
import { makeHeroDef } from '../data/party';
import { RACES, RACE_LIST, type RaceId } from '../data/races';
import { CLASS_TALENTS, TALENT_LEVELS, TALENTS, TIER_NAME } from '../data/talents';
import { UNLOCKS, type MetaProgress } from '../data/unlocks';
import type { Item, ItemSlot } from '../sim/defs';
import { applyTalent, newHero, nextTier, tierOptions, type Hero } from '../sim/hero';
import { RARITY_COLOR, SLOT_NAME, isBadProp, itemBaseLine, itemTitle, itemValue, propText, upgradeCost } from '../sim/items';
import { isUnlocked } from '../sim/meta';
import { compareItem } from '../sim/reward';
import {
  HIRE_COST, ORDER_COST, PARTY_SIZE, ROSTER_MAX, equipFromStash, hire, randomComp, retrain, retrainCost, sell, takenNames,
  train, trainCap, trainCost, treat, treatCost, unequip, upgrade, type Company, type Done,
} from '../sim/roster';
import { WARN_STRESS } from '../sim/stress';
import { talentColor } from './rest';

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

type Tab = 'party' | 'tavern' | 'infirmary' | 'smith' | 'training' | 'records';
const TABS: [Tab, string][] = [
  ['party', '원정대'], ['tavern', '선술집'], ['infirmary', '치료소'], ['smith', '대장간'], ['training', '훈련장'], ['records', '기록'],
];

export class TownScreen {
  private c!: Company;
  private meta!: MetaProgress;
  private tab: Tab = 'party';
  private picked = new Set<number>();
  private order: { race: RaceId; cls: ClassId } = { race: 'human', cls: 'warrior' };
  private note = '';
  /** 대장간에서 고른 보관함 장비 */
  private item: Item | null = null;

  constructor(
    private onDepart: (party: Hero[]) => void,
    private onSheet: (h: Hero, done: () => void) => void,
    private onReset: () => void,
    private onChange: () => void,
  ) {
    const root = $('town');
    root.addEventListener('click', (e) => this.click(e));
    root.addEventListener('change', (e) => this.change(e));
  }

  open(c: Company, meta: MetaProgress, note = '') {
    this.c = c;
    this.meta = meta;
    this.note = note;
    this.item = null;
    this.tab = 'party';
    // 지난 원정대가 살아 있으면 그대로, 아니면 스트레스가 낮은 순으로 채운다
    this.picked = new Set([...this.picked].filter((uid) => c.roster.some((h) => h.uid === uid)));
    if (!this.picked.size)
      for (const h of [...c.roster].sort((a, b) => a.stress - b.stress).slice(0, PARTY_SIZE)) this.picked.add(h.uid);
    $('town').classList.remove('hidden');
    this.render();
    $('town').querySelector('.box')!.scrollTop = 0;
  }

  close() {
    $('town').classList.add('hidden');
  }

  private render() {
    const c = this.c;
    const body: Record<Tab, () => string> = {
      party: () => this.partyTab(), tavern: () => this.tavernTab(), infirmary: () => this.infirmaryTab(),
      smith: () => this.smithTab(), training: () => this.trainingTab(), records: () => this.recordsTab(),
    };
    const badge = (t: Tab) => {
      if (t === 'training') return c.roster.some((h) => h.pending) ? ' ★' : '';
      if (t === 'infirmary') return c.roster.some((h) => h.mood || h.stress >= WARN_STRESS) ? ' !' : '';
      if (t === 'smith') return c.stash.length ? ` ${c.stash.length}` : '';
      return '';
    };
    $('town').querySelector('.box')!.innerHTML = `
      <h2>용병단 거점</h2>
      <div class="tstat">원정 ${c.expeditions}회 · <b class="gold">${c.gold} 골드</b> · 명부 ${c.roster.length}/${ROSTER_MAX} · 묘지 ${c.graves.length}</div>
      <div class="tabs">${TABS.map(([t, n]) => `<button class="${this.tab === t ? 'on' : ''}" data-tab="${t}">${n}${badge(t)}</button>`).join('')}</div>
      ${this.note ? `<p class="note">${this.note}</p>` : ''}
      ${body[this.tab]()}`;
  }

  // ── 원정대 ──
  private partyTab(): string {
    const c = this.c;
    const party = c.roster.filter((h) => this.picked.has(h.uid));
    return `
      <h3>원정대 편성 <span class="dim small">눌러서 넣고 빼기 · 최대 ${PARTY_SIZE}명</span></h3>
      <div class="roster">${c.roster.map((h) => this.card(h, 'roster')).join('') || '<p class="dim">명부가 비었다. 선술집에서 고용하자.</p>'}</div>
      <div class="go">
        <button data-act="depart" ${party.length ? '' : 'disabled'}>원정 출발 (${party.length}명)</button>
        <span class="dim small">쓰러진 용병은 돌아오지 않는다. 층을 마칠 때마다 귀환할 수 있다.</span>
      </div>`;
  }

  // ── 선술집 ──
  private tavernTab(): string {
    const c = this.c, m = this.meta;
    const raceOpts = RACE_LIST.filter((r) => isUnlocked(m, `race:${r.id}`))
      .map((r) => `<option value="${r.id}" ${r.id === this.order.race ? 'selected' : ''}>${r.name}</option>`).join('');
    const clsOpts = CLASS_LIST.filter((k) => isUnlocked(m, `class:${k.id}`))
      .map((k) => `<option value="${k.id}" ${k.id === this.order.cls ? 'selected' : ''}>${k.name}</option>`).join('');
    return `
      <h3>선술집 <span class="dim small">새 얼굴은 원정을 다녀올 때마다 바뀐다</span></h3>
      <div class="roster">${c.tavern.map((h) => this.card(h, 'tavern')).join('') || '<p class="dim">오늘은 손님이 없다.</p>'}</div>
      <div class="order">원하는 용병 부르기:
        <select data-order="race">${raceOpts}</select><select data-order="cls">${clsOpts}</select>
        <button data-act="order" ${c.gold < ORDER_COST ? 'disabled' : ''}>부르기 (${ORDER_COST} 골드)</button>
      </div>`;
  }

  // ── 치료소 ──
  private infirmaryTab(): string {
    const rows = [...this.c.roster].sort((a, b) => b.stress - a.stress).map((h) => {
      const cost = treatCost(h);
      const mood = h.mood ? MOODS[h.mood] : null;
      return `<div class="frow">${this.who(h)}
        <span class="fmid">${this.stressBar(h)}${mood ? ` <b style="color:${mood.color}">${mood.virtue ? '각성' : '붕괴'}: ${mood.name}</b>` : ''}</span>
        <button data-treat="${h.uid}" ${cost <= 0 || this.c.gold < cost ? 'disabled' : ''}>${cost > 0 ? `치료 (${cost} 골드)` : '건강함'}</button></div>`;
    });
    return `<h3>치료소 <span class="dim small">스트레스를 모두 덜고 붕괴 · 각성을 푼다. 원정에 안 나간 용병은 저절로 20씩 준다</span></h3>
      <div class="flist">${rows.join('') || '<p class="dim">명부가 비었다.</p>'}</div>`;
  }

  // ── 대장간 ──
  private smithTab(): string {
    const c = this.c;
    let html = `<h3>보관함 <span class="dim small">원정에서 들고 온 장비. 눌러서 고르면 팔기 · 강화 · 장착</span></h3>`;
    html += c.stash.length
      ? `<div class="items">${c.stash.map((it, i) => this.itemCard(it, i)).join('')}</div>`
      : '<p class="dim">비었다. 원정에서 끼지 않은 장비는 귀환하면 여기로 온다.</p>';
    const it = this.item && c.stash.includes(this.item) ? this.item : null;
    if (it) {
      const up = upgradeCost(it);
      html += `<div class="smithact">
        <button data-act="sell">팔기 (+${itemValue(it)} 골드)</button>
        ${up !== null ? `<button data-act="upgrade" ${c.gold < up ? 'disabled' : ''}>+${it.plus + 1} 강화 (${up} 골드)</button>` : ''}
      </div>`;
      const diffs = c.roster.map((h) => compareItem(h, it));
      const best = diffs.reduce((bi, d, i) => (d.score > diffs[bi].score ? i : bi), 0);
      html += `<div class="targets">${c.roster.map((h, i) => {
        const cur = h.gear[it.base.slot];
        const lines = diffs[i].lines.map((l) => `<span class="${l.good ? 'good' : 'bad'}">${l.text}</span>`).join(' ');
        return `<button class="target" data-equip="${h.uid}">
          <b style="color:${h.def.color}">${esc(h.def.name)}에게 장착</b>${i === best && diffs[i].score > 0 ? ' <span class="rec">추천</span>' : ''}
          <span class="dim small">현재: ${cur ? esc(itemTitle(cur)) : '없음'}</span>
          <span class="small">${lines || '<span class="dim">변화 거의 없음</span>'}</span></button>`;
      }).join('')}</div>`;
    }
    html += `<h3>장착 중인 장비 <span class="dim small">강화하거나 벗겨서 보관함으로</span></h3><div class="flist">`;
    for (const h of c.roster) {
      const slots = (['weapon', 'armour', 'jewel'] as ItemSlot[]).map((s) => {
        const g = h.gear[s];
        if (!g) return `<span class="gslot dim">${SLOT_NAME[s]} 없음</span>`;
        const up = upgradeCost(g);
        return `<span class="gslot"><b style="color:${RARITY_COLOR[g.rarity]}">${esc(itemTitle(g))}</b>
          ${up !== null ? `<button data-gup="${h.uid}:${s}" ${c.gold < up ? 'disabled' : ''}>+1 (${up})</button>` : ''}
          <button data-gun="${h.uid}:${s}">벗기</button></span>`;
      }).join('');
      html += `<div class="frow">${this.who(h)}<span class="fmid gear">${slots}</span></div>`;
    }
    return html + '</div>';
  }

  // ── 훈련장 ──
  private trainingTab(): string {
    const c = this.c;
    const cap = trainCap(c);
    const rows = c.roster.map((h) => {
      const tcost = trainCost(h), rcost = retrainCost(h);
      const tier = nextTier(h);
      const picks = tier >= 0
        ? `<div class="perks">${tierOptions(h, tier).map((t) => `<button class="perk" data-talent="${h.uid}:${t.id}">
            <b style="color:${talentColor(t)}">${t.name}</b><span class="dim small">${t.desc}</span></button>`).join('')}</div>`
        : '';
      return `<div class="trow"><div class="frow">${this.who(h)}
        <span class="fmid small">${h.talents.map((id) => TALENTS[id].name).join(' · ') || '<span class="dim">특성 없음</span>'}</span>
        <button data-train="${h.uid}" ${h.xl >= cap || c.gold < tcost ? 'disabled' : ''}>${h.xl >= cap ? `Lv${cap} 한계` : `레벨 +1 (${tcost})`}</button>
        <button data-retrain="${h.uid}" ${!h.talents.length || c.gold < rcost ? 'disabled' : ''}>특성 되돌리기 (${rcost})</button></div>
        ${tier >= 0 ? `<div class="small" style="margin:2px 0 0 4px">Lv${TALENT_LEVELS[tier]} · ${TIER_NAME[tier]} — 하나를 고르세요</div>${picks}` : ''}
      </div>`;
    });
    return `<h3>훈련장 <span class="dim small">신입을 명부 최고 레벨 −1(최소 Lv3)까지 키우고, 특성을 다시 고를 수 있다</span></h3>
      <div class="flist">${rows.join('') || '<p class="dim">명부가 비었다.</p>'}</div>`;
  }

  // ── 기록 ──
  private recordsTab(): string {
    const c = this.c, m = this.meta;
    return `
      <h3>묘지 (${c.graves.length})</h3>
      ${c.graves.map((g) => `<div class="grave">✝ <b>${esc(g.name)}</b> <span class="dim">${g.title} Lv${g.xl}</span> — ${esc(g.cause)}, ${g.expedition}번째 원정 ${g.depth}층 · 처치 ${g.kills}</div>`).join('') || '<p class="dim">아직 아무도 잃지 않았다.</p>'}
      <h3>해금 진행도</h3>
      <div class="unlocks">${UNLOCKS.map((u) => {
        const p = u.progress(m);
        const done = isUnlocked(m, u.id);
        const name = u.kind === 'race' ? `종족 · ${RACES[u.target as RaceId].name}` : `직업 · ${CLASSES[u.target as ClassId].name}`;
        return `<div class="unl ${done ? 'done' : ''}"><b>${done ? '✓' : '🔒'} ${name}</b>
          <span class="dim small">${u.cond}</span>
          <span class="pbar"><i style="width:${(done ? 1 : p.v) * 100}%"></i></span><span class="small">${done ? '해금됨' : p.text}</span></div>`;
      }).join('')}</div>
      <p class="dim small">기록: 원정 ${m.runs} · 승리 ${m.wins} · 최고 ${m.bestDepth}층</p>
      <button class="danger" data-act="reset">용병단 처음부터 (저장 삭제)</button>`;
  }

  // ── 조각 ──
  private who(h: Hero): string {
    const k = CLASSES[h.cls];
    return `<span class="who"><span class="sg sm" style="color:${k.color};border-color:${k.color}">${k.glyph}</span>
      <b style="color:${k.color}">${esc(h.def.name)}</b> <span class="lv">Lv${h.xl}</span></span>`;
  }

  private stressBar(h: Hero): string {
    const mood = h.mood ? MOODS[h.mood] : null;
    return `<span class="bar st"><i style="width:${h.stress}%;background:${mood ? mood.color : h.stress >= WARN_STRESS ? '#d070ff' : '#8a5cc0'}"></i></span>
      <span class="small">스트레스 ${Math.round(h.stress)}</span>`;
  }

  private itemCard(it: Item, i: number): string {
    const props = it.props.map((p) => `<li class="${isBadProp(p) ? 'bad' : ''}">${propText(p)}</li>`).join('');
    return `<div class="item ${this.item === it ? 'picked' : ''}" data-stash="${i}">
      <div class="iname" style="color:${RARITY_COLOR[it.rarity]}">${esc(itemTitle(it))}</div>
      <div class="dim small">${SLOT_NAME[it.base.slot]} · ${itemBaseLine(it)} · ${itemValue(it)} 골드</div>
      ${props ? `<ul>${props}</ul>` : ''}</div>`;
  }

  private card(h: Hero, where: 'roster' | 'tavern'): string {
    const k = CLASSES[h.cls], r = RACES[h.comp.race];
    const mood = h.mood ? MOODS[h.mood] : null;
    const on = where === 'roster' && this.picked.has(h.uid);
    const talents = h.talents.map((id) => TALENTS[id].name).join(' · ');
    const next = CLASS_TALENTS[h.cls][h.talents.length];
    const i = where === 'roster' ? this.c.roster.indexOf(h) : this.c.tavern.indexOf(h);
    return `<div class="hcard ${on ? 'on' : ''} ${where}" ${where === 'roster' ? `data-pick="${h.uid}"` : ''} style="border-color:${on ? '#66ff88' : k.color + '55'}">
      <div class="hc1"><span class="sg" style="color:${k.color};border-color:${k.color}">${k.glyph}</span>
        <div><b style="color:${k.color}">${esc(h.def.name)}</b> <span class="lv">Lv${h.xl}</span>${h.pending ? ' <span class="gold">★특성</span>' : ''}
        <div class="dim small">${r.name} ${k.name}${h.expeditions ? ` · 원정 ${h.expeditions}회 · 처치 ${h.kills}` : ''}</div></div>
        ${on ? '<span class="chk">✓</span>' : ''}</div>
      <div class="hst">${this.stressBar(h)}${mood ? ` <b class="small" style="color:${mood.color}">${mood.name}</b>` : ''}</div>
      <div class="small dim">${talents ? `특성: ${talents}` : `종족 특성: ${r.trait.name}`}${!talents && next ? ` · Lv${TALENT_LEVELS[0]}부터 특성` : ''}</div>
      <div class="hbtn">
        <button data-sheet="${where}:${i}">상태창</button>
        ${where === 'roster'
          ? `<button class="dismiss" data-dismiss="${h.uid}">내보내기</button>`
          : `<button data-hire="${i}" ${this.c.gold < HIRE_COST ? 'disabled' : ''}>고용 (${HIRE_COST})</button>`}
      </div>
    </div>`;
  }

  private change(e: Event) {
    const el = e.target as HTMLSelectElement;
    if (el.dataset.order === 'race') this.order.race = el.value as RaceId;
    if (el.dataset.order === 'cls') this.order.cls = el.value as ClassId;
  }

  private heroBy(uid: string | undefined): Hero | undefined {
    return this.c.roster.find((h) => h.uid === Number(uid));
  }

  private done(d: Done) {
    this.note = d.ok ? d.text : `<span class="bad">${d.text}</span>`;
    if (d.ok) this.onChange();
  }

  private click(e: Event) {
    const el = (e.target as HTMLElement).closest<HTMLElement>(
      '[data-act],[data-tab],[data-pick],[data-sheet],[data-hire],[data-dismiss],[data-treat],[data-stash],[data-equip],[data-gup],[data-gun],[data-train],[data-retrain],[data-talent]',
    );
    if (!el) return;
    const c = this.c, d = el.dataset;
    this.note = '';
    if (d.tab) {
      this.tab = d.tab as Tab;
      this.item = null;
    } else if (d.sheet) {
      const [where, i] = d.sheet.split(':');
      const h = (where === 'roster' ? c.roster : c.tavern)[Number(i)];
      if (h) this.onSheet(h, () => this.render());
      return;
    } else if (d.hire !== undefined) {
      const h = c.tavern[Number(d.hire)];
      const err = h && hire(c, h, HIRE_COST);
      this.note = err || `${h.def.name}을(를) 고용했다`;
      if (!err) {
        if (this.picked.size < PARTY_SIZE) this.picked.add(h.uid);
        this.onChange();
      }
    } else if (d.dismiss) {
      const h = this.heroBy(d.dismiss);
      if (h && confirm(`${h.def.name}을(를) 내보낼까요? 장비도 함께 떠납니다. 되돌릴 수 없습니다.`)) {
        c.roster = c.roster.filter((r) => r !== h);
        this.picked.delete(h.uid);
        this.note = `${h.def.name}이(가) 용병단을 떠났다`;
        this.onChange();
      }
    } else if (d.pick) {
      const uid = Number(d.pick);
      if (this.picked.has(uid)) this.picked.delete(uid);
      else if (this.picked.size < PARTY_SIZE) this.picked.add(uid);
      else this.note = `원정대는 최대 ${PARTY_SIZE}명`;
    } else if (d.treat) {
      const h = this.heroBy(d.treat);
      if (h) this.done(treat(c, h));
    } else if (d.stash !== undefined) {
      const it = c.stash[Number(d.stash)];
      this.item = this.item === it ? null : it;
    } else if (d.equip && this.item) {
      const h = this.heroBy(d.equip);
      if (h) this.done(equipFromStash(c, this.item, h));
      this.item = null;
    } else if (d.act === 'sell' && this.item) {
      this.done(sell(c, this.item));
      this.item = null;
    } else if (d.act === 'upgrade' && this.item) {
      this.done(upgrade(c, this.item));
    } else if (d.gup || d.gun) {
      const [uid, slot] = (d.gup ?? d.gun)!.split(':');
      const h = this.heroBy(uid);
      const g = h?.gear[slot as ItemSlot];
      if (h && g) this.done(d.gup ? upgrade(c, g) : unequip(c, h, slot as ItemSlot));
    } else if (d.train) {
      const h = this.heroBy(d.train);
      if (h) this.done(train(c, h));
    } else if (d.retrain) {
      const h = this.heroBy(d.retrain);
      if (h && confirm(`${h.def.name}의 특성을 모두 되돌릴까요? (${retrainCost(h)} 골드)`)) this.done(retrain(c, h));
    } else if (d.talent) {
      const [uid, id] = d.talent.split(':');
      const h = this.heroBy(uid);
      if (h) {
        applyTalent(h, id);
        this.note = `${h.def.name}: ${TALENTS[id].name}`;
        this.onChange();
      }
    } else if (d.act === 'order') {
      const comp = randomComp(this.meta, new Rng((Math.random() * 1e9) | 0), this.order.race, this.order.cls, takenNames(c));
      const h = newHero(makeHeroDef(comp));
      const err = hire(c, h, ORDER_COST);
      this.note = err || `${h.def.name}(${RACES[comp.race].name} ${CLASSES[comp.cls].name})을(를) 불렀다`;
      if (!err) {
        if (this.picked.size < PARTY_SIZE) this.picked.add(h.uid);
        this.onChange();
      }
    } else if (d.act === 'depart') {
      const party = c.roster.filter((h) => this.picked.has(h.uid));
      if (!party.length) return;
      this.close();
      this.onDepart(party);
      return;
    } else if (d.act === 'reset') {
      if (confirm('용병단을 처음부터 다시 시작할까요? 명부 · 골드 · 묘지 · 보관함이 모두 지워집니다. (해금은 남습니다)')) this.onReset();
      return;
    }
    this.render();
  }
}
