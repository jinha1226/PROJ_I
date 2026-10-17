// 파티 구성 화면: 해금된 종족 × 직업으로 4명을 직접 짠다. 아래에 해금 진행도.
import { ABILITIES } from '../data/abilities';
import { CLASSES, CLASS_LIST, type ClassId } from '../data/classes';
import { CLASS_TALENTS, TALENT_LEVELS, TALENTS } from '../data/talents';
import { DEFAULT_COMP, makeHeroDef, type HeroComp } from '../data/party';
import { RACES, RACE_LIST, type RaceId } from '../data/races';
import { UNLOCKS, type MetaProgress } from '../data/unlocks';
import { isUnlocked } from '../sim/meta';

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const COMP_KEY = 'bh.comp';

export class SetupScreen {
  private comp: HeroComp[] = DEFAULT_COMP.map((c) => ({ ...c }));
  private meta!: MetaProgress;

  constructor(private onStart: (comp: HeroComp[]) => void) {
    try {
      const saved = JSON.parse(localStorage.getItem(COMP_KEY) ?? 'null') as HeroComp[] | null;
      if (Array.isArray(saved) && saved.length === 4 && saved.every((c) => RACES[c.race] && CLASSES[c.cls])) this.comp = saved;
    } catch {
      // 저장된 구성이 없거나 깨졌으면 기본 파티
    }
    const root = $('setup');
    root.addEventListener('change', (e) => this.change(e));
    root.addEventListener('click', (e) => this.click(e));
  }

  open(meta: MetaProgress) {
    this.meta = meta;
    // 잠긴 선택이 남아 있으면 기본으로 되돌린다 (저장소가 지워진 경우 등)
    this.comp.forEach((c, i) => {
      if (!isUnlocked(meta, `race:${c.race}`)) c.race = DEFAULT_COMP[i].race;
      if (!isUnlocked(meta, `class:${c.cls}`)) c.cls = DEFAULT_COMP[i].cls;
    });
    $('setup').classList.remove('hidden');
    this.render();
  }

  close() {
    $('setup').classList.add('hidden');
  }

  private render() {
    const m = this.meta;
    const box = $('setup').querySelector('.box')!;
    box.innerHTML = `
      <h2>파티 구성</h2>
      <p class="dim small">종족과 직업을 자유롭게 조합한다. 같은 직업을 여럿 넣어도 된다. 자물쇠는 아래 조건을 채우면 열린다.</p>
      <div class="slots">${this.comp.map((c, i) => this.slot(c, i)).join('')}</div>
      <h3>해금</h3>
      <div class="unlocks">${UNLOCKS.map((u) => {
        const p = u.progress(m);
        const done = isUnlocked(m, u.id);
        const name = u.kind === 'race' ? `종족 · ${RACES[u.target as RaceId].name}` : `직업 · ${CLASSES[u.target as ClassId].name}`;
        return `<div class="unl ${done ? 'done' : ''}"><b>${done ? '✓' : '🔒'} ${name}</b>
          <span class="dim small">${u.cond}</span>
          <span class="pbar"><i style="width:${(done ? 1 : p.v) * 100}%"></i></span><span class="small">${done ? '해금됨' : p.text}</span></div>`;
      }).join('')}</div>
      <p class="dim small">기록: 런 ${m.runs} · 승리 ${m.wins} · 최고 ${m.bestDepth}층</p>
      <div class="go"><button data-act="start">출발</button></div>`;
  }

  private slot(c: HeroComp, i: number): string {
    const m = this.meta;
    const def = makeHeroDef(c, i);
    const k = CLASSES[c.cls], r = RACES[c.race];
    const raceOpts = RACE_LIST.map((x) => {
      const ok = isUnlocked(m, `race:${x.id}`);
      return `<option value="${x.id}" ${x.id === c.race ? 'selected' : ''} ${ok ? '' : 'disabled'}>${ok ? '' : '🔒 '}${x.name}</option>`;
    }).join('');
    const clsOpts = CLASS_LIST.map((x) => {
      const ok = isUnlocked(m, `class:${x.id}`);
      return `<option value="${x.id}" ${x.id === c.cls ? 'selected' : ''} ${ok ? '' : 'disabled'}>${ok ? '' : '🔒 '}${x.name}</option>`;
    }).join('');
    const start = def.abilities.map((a) => ABILITIES[a].name).join(', ');
    const tree = CLASS_TALENTS[c.cls]
      .map((opts, t) => `<div>Lv${TALENT_LEVELS[t]}: ${opts.map((id) => TALENTS[id].name).join(' · ')}</div>`)
      .join('');
    return `<div class="slot" style="border-color:${k.color}55">
      <div class="shd"><span class="sg" style="color:${k.color};border-color:${k.color}">${k.glyph}</span>
        <input class="nm" data-i="${i}" maxlength="8" value="${esc(c.name)}" />
        <button class="dice" data-dice="${i}" title="이름 바꾸기">🎲</button></div>
      <div class="sel"><select data-race="${i}">${raceOpts}</select><select data-cls="${i}">${clsOpts}</select></div>
      <div class="sum small">
        <div>체력 ${def.hp}${def.mp ? ` · 마나 ${def.mp}` : ''} · 힘 ${def.str} 민 ${def.dex} 지 ${def.int} · 의지 ${def.will}</div>
        <div>시작 기술: <b>${start}</b></div>
        <div>종족 특성: <b>${r.trait.name}</b> <span class="dim">${r.trait.desc}</span></div>
        <details class="dim"><summary>레벨별 특성 (셋 중 하나)</summary>${tree}</details>
        <div class="dim">${k.desc}</div>
      </div>
    </div>`;
  }

  private change(e: Event) {
    const el = e.target as HTMLElement;
    if (el.dataset.race) this.comp[Number(el.dataset.race)].race = (el as HTMLSelectElement).value as RaceId;
    else if (el.dataset.cls) this.comp[Number(el.dataset.cls)].cls = (el as HTMLSelectElement).value as ClassId;
    else if (el.classList.contains('nm')) {
      this.comp[Number(el.dataset.i)].name = (el as HTMLInputElement).value.trim() || '이름없음';
      return;
    } else return;
    this.render();
  }

  private click(e: Event) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-dice],[data-act]');
    if (!el) return;
    if (el.dataset.dice !== undefined) {
      const c = this.comp[Number(el.dataset.dice)];
      const names = RACES[c.race].names.filter((n) => n !== c.name);
      c.name = names[Math.floor(Math.random() * names.length)];
      this.render();
    } else if (el.dataset.act === 'start') {
      try {
        localStorage.setItem(COMP_KEY, JSON.stringify(this.comp));
      } catch {
        // 저장소를 못 쓰면 다음엔 기본 파티
      }
      this.close();
      this.onStart(this.comp.map((c) => ({ ...c })));
    }
  }
}
