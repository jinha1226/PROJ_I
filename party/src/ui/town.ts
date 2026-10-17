// 용병단 거점: 원정대 편성(명부에서 최대 4명) · 선술집 고용 · 묘지 · 해금 진행도.
import { Rng } from '../core/rng';
import { CLASSES, CLASS_LIST, type ClassId } from '../data/classes';
import { MOODS } from '../data/moods';
import { makeHeroDef } from '../data/party';
import { RACES, RACE_LIST, type RaceId } from '../data/races';
import { CLASS_TALENTS, TALENT_LEVELS, TALENTS } from '../data/talents';
import { UNLOCKS, type MetaProgress } from '../data/unlocks';
import { newHero, type Hero } from '../sim/hero';
import { isUnlocked } from '../sim/meta';
import { HIRE_COST, ORDER_COST, PARTY_SIZE, ROSTER_MAX, hire, randomComp, takenNames, type Company } from '../sim/roster';
import { WARN_STRESS } from '../sim/stress';

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export class TownScreen {
  private c!: Company;
  private meta!: MetaProgress;
  private picked = new Set<number>();
  private order: { race: RaceId; cls: ClassId } = { race: 'human', cls: 'warrior' };
  private note = '';

  constructor(
    private onDepart: (party: Hero[]) => void,
    private onSheet: (h: Hero, done: () => void) => void,
    private onReset: () => void,
  ) {
    const root = $('town');
    root.addEventListener('click', (e) => this.click(e));
    root.addEventListener('change', (e) => this.change(e));
  }

  open(c: Company, meta: MetaProgress, note = '') {
    this.c = c;
    this.meta = meta;
    this.note = note;
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
    const c = this.c, m = this.meta;
    const party = c.roster.filter((h) => this.picked.has(h.uid));
    const raceOpts = RACE_LIST.filter((r) => isUnlocked(m, `race:${r.id}`))
      .map((r) => `<option value="${r.id}" ${r.id === this.order.race ? 'selected' : ''}>${r.name}</option>`).join('');
    const clsOpts = CLASS_LIST.filter((k) => isUnlocked(m, `class:${k.id}`))
      .map((k) => `<option value="${k.id}" ${k.id === this.order.cls ? 'selected' : ''}>${k.name}</option>`).join('');
    $('town').querySelector('.box')!.innerHTML = `
      <h2>용병단 거점</h2>
      <div class="tstat">원정 ${c.expeditions}회 · <b class="gold">${c.gold} 골드</b> · 명부 ${c.roster.length}/${ROSTER_MAX} · 묘지 ${c.graves.length}</div>
      ${this.note ? `<p class="note">${this.note}</p>` : ''}
      <h3>원정대 편성 <span class="dim small">눌러서 넣고 빼기 · 최대 ${PARTY_SIZE}명</span></h3>
      <div class="roster">${c.roster.map((h) => this.card(h, 'roster')).join('') || '<p class="dim">명부가 비었다. 선술집에서 고용하자.</p>'}</div>
      <div class="go">
        <button data-act="depart" ${party.length ? '' : 'disabled'}>원정 출발 (${party.length}명)</button>
        <span class="dim small">쓰러진 용병은 돌아오지 않는다. 층을 마칠 때마다 귀환할 수 있다.</span>
      </div>
      <h3>선술집 <span class="dim small">새 얼굴은 원정을 다녀올 때마다 바뀐다</span></h3>
      <div class="roster">${c.tavern.map((h) => this.card(h, 'tavern')).join('') || '<p class="dim">오늘은 손님이 없다.</p>'}</div>
      <div class="order">원하는 용병 부르기:
        <select data-order="race">${raceOpts}</select><select data-order="cls">${clsOpts}</select>
        <button data-act="order" ${c.gold < ORDER_COST ? 'disabled' : ''}>부르기 (${ORDER_COST} 골드)</button>
      </div>
      <details class="graves"><summary>묘지 (${c.graves.length})</summary>
        ${c.graves.map((g) => `<div class="grave">✝ <b>${esc(g.name)}</b> <span class="dim">${g.title} Lv${g.xl}</span> — ${esc(g.cause)}, ${g.expedition}번째 원정 ${g.depth}층 · 처치 ${g.kills}</div>`).join('') || '<p class="dim">아직 아무도 잃지 않았다.</p>'}
      </details>
      <details><summary>해금 진행도</summary>
        <div class="unlocks">${UNLOCKS.map((u) => {
          const p = u.progress(m);
          const done = isUnlocked(m, u.id);
          const name = u.kind === 'race' ? `종족 · ${RACES[u.target as RaceId].name}` : `직업 · ${CLASSES[u.target as ClassId].name}`;
          return `<div class="unl ${done ? 'done' : ''}"><b>${done ? '✓' : '🔒'} ${name}</b>
            <span class="dim small">${u.cond}</span>
            <span class="pbar"><i style="width:${(done ? 1 : p.v) * 100}%"></i></span><span class="small">${done ? '해금됨' : p.text}</span></div>`;
        }).join('')}</div>
        <p class="dim small">기록: 원정 ${m.runs} · 승리 ${m.wins} · 최고 ${m.bestDepth}층</p>
      </details>
      <button class="danger" data-act="reset">용병단 처음부터 (저장 삭제)</button>`;
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
        <div><b style="color:${k.color}">${esc(h.def.name)}</b> <span class="lv">Lv${h.xl}</span>
        <div class="dim small">${r.name} ${k.name}${h.expeditions ? ` · 원정 ${h.expeditions}회 · 처치 ${h.kills}` : ''}</div></div>
        ${on ? '<span class="chk">✓</span>' : ''}</div>
      <div class="hst"><span class="bar st"><i style="width:${h.stress}%;background:${mood ? mood.color : h.stress >= WARN_STRESS ? '#d070ff' : '#8a5cc0'}"></i></span>
        <span class="small">스트레스 ${Math.round(h.stress)}${mood ? ` · <b style="color:${mood.color}">${mood.name}</b>` : ''}</span></div>
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

  private click(e: Event) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-pick],[data-sheet],[data-hire],[data-dismiss]');
    if (!el) return;
    const c = this.c;
    this.note = '';
    if (el.dataset.sheet) {
      const [where, i] = el.dataset.sheet.split(':');
      const h = (where === 'roster' ? c.roster : c.tavern)[Number(i)];
      if (h) this.onSheet(h, () => this.render());
      return;
    }
    if (el.dataset.hire !== undefined) {
      const h = c.tavern[Number(el.dataset.hire)];
      const err = h && hire(c, h, HIRE_COST);
      this.note = err || `${h.def.name}을(를) 고용했다`;
      if (!err && this.picked.size < PARTY_SIZE) this.picked.add(h.uid);
    } else if (el.dataset.dismiss) {
      const h = c.roster.find((r) => r.uid === Number(el.dataset.dismiss));
      if (h && confirm(`${h.def.name}을(를) 내보낼까요? 되돌릴 수 없습니다.`)) {
        c.roster = c.roster.filter((r) => r !== h);
        this.picked.delete(h.uid);
        this.note = `${h.def.name}이(가) 용병단을 떠났다`;
      }
    } else if (el.dataset.pick) {
      const uid = Number(el.dataset.pick);
      if (this.picked.has(uid)) this.picked.delete(uid);
      else if (this.picked.size < PARTY_SIZE) this.picked.add(uid);
      else this.note = `원정대는 최대 ${PARTY_SIZE}명`;
    } else if (el.dataset.act === 'order') {
      const comp = randomComp(this.meta, new Rng((Math.random() * 1e9) | 0), this.order.race, this.order.cls, takenNames(c));
      const h = newHero(makeHeroDef(comp));
      const err = hire(c, h, ORDER_COST);
      this.note = err || `${h.def.name}(${RACES[comp.race].name} ${CLASSES[comp.cls].name})을(를) 불렀다`;
      if (!err && this.picked.size < PARTY_SIZE) this.picked.add(h.uid);
    } else if (el.dataset.act === 'depart') {
      const party = c.roster.filter((h) => this.picked.has(h.uid));
      if (!party.length) return;
      this.close();
      this.onDepart(party);
      return;
    } else if (el.dataset.act === 'reset') {
      if (confirm('용병단을 처음부터 다시 시작할까요? 명부 · 골드 · 묘지가 모두 지워집니다. (해금은 남습니다)')) this.onReset();
      return;
    }
    this.render();
  }
}
