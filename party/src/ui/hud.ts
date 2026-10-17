// DOM 기반 HUD: 파티 카드, 스킬바, 적 정보, 전투 로그.
import { ELEMENT_NAME } from '../sim/combat';
import { RESIST_KEYS, type SkillId, type TacticId } from '../sim/defs';
import { abilityCooldown, attackDelay, avgWeaponDamage, failChance } from '../sim/stats';
import type { Unit } from '../sim/unit';
import type { World } from '../sim/world';
import type { UiState } from './state';
import { RES_NAME, SKILL_NAME } from '../data/names';
import { FLOORS } from '../data/encounters';
import { xpToNext } from '../sim/hero';

const $ = (id: string) => document.getElementById(id)!;

const TACTICS: [TacticId, string][] = [
  ['aggressive', '공격형'],
  ['defensive', '방어형'],
  ['ranged', '원거리형'],
  ['support', '지원형'],
];

export { SKILL_NAME };

function resistText(u: Unit): string {
  const parts: string[] = [];
  for (const k of RESIST_KEYS) {
    const v = u.stats.resists[k];
    if (!v) continue;
    if (k === 'poison') parts.push(`<span class="res-good">독 면역</span>`);
    else if (v >= 3) parts.push(`<span class="res-good">${RES_NAME[k]} 면역급(+++)</span>`);
    else if (v > 0) parts.push(`<span class="res-good">${RES_NAME[k]} ${'+'.repeat(v)}</span>`);
    else parts.push(`<span class="res-bad">${RES_NAME[k]} 취약</span>`);
  }
  const tags = u.tags;
  if (tags.includes('mindless')) parts.push('<span class="res-good">정신 없음(의지 판정 면역)</span>');
  if (tags.includes('unstunnable')) parts.push('<span class="res-good">기절 면역</span>');
  return parts.join(', ') || '없음';
}

function commandText(u: Unit): string {
  if (u.cast) return `시전: ${u.abilities[u.cast.slot].def.name}`;
  const c = u.command?.intent;
  if (!c) return u.holdPos ? '위치 고수' : u.autoMode ? '' : '수동';
  if (c.type === 'move') return '명령: 이동';
  if (c.type === 'attack') return `명령: ${c.target.name} 공격`;
  return `명령: ${u.abilities[c.slot].def.name}`;
}

export class Hud {
  private cards: HTMLElement[] = [];
  private skillFor: Unit | null = null;
  private skillVersion = '';
  private inspectFor: Unit | null = null;
  private logCount = -1;

  constructor(
    private ui: UiState,
    private getWorld: () => World,
    private onSkill: (slot: number) => void,
  ) {}

  /** 월드가 바뀌면(재시작) 카드를 새로 만든다 */
  build() {
    const w = this.getWorld();
    const root = $('party');
    root.innerHTML = '';
    this.cards = w.party.map((u, i) => {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `
        <div class="head"><span class="name" style="color:${u.def.color}">${i + 1}. ${u.name}<span class="lead"></span></span>
        <span class="lv"></span><span class="title">${u.def.title}</span></div>
        <div class="bar hp"><div></div></div>
        ${u.stats.maxMp > 0 ? '<div class="bar mp"><div></div></div>' : ''}
        <div class="bar xp"><div></div></div>
        <div class="statuses"></div>
        <div class="row">
          <button class="rowbtn" title="진형: 전열은 앞장서고, 후열은 함께 이동할 때 전열 뒤를 따른다"></button>
          <select>${TACTICS.map(([id, n]) => `<option value="${id}">${n}</option>`).join('')}</select>
          <label><input type="checkbox" class="auto" /> 자동</label>
          <span class="cmd"></span>
        </div>`;
      const sel = el.querySelector('select')!;
      sel.value = u.tactic;
      sel.addEventListener('change', () => (u.tactic = sel.value as TacticId));
      sel.addEventListener('pointerdown', (e) => e.stopPropagation());
      const rowBtn = el.querySelector<HTMLButtonElement>('.rowbtn')!;
      rowBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
      rowBtn.addEventListener('click', () => (u.row = u.row === 'front' ? 'back' : 'front'));
      const auto = el.querySelector<HTMLInputElement>('input.auto')!;
      auto.checked = u.autoMode;
      auto.addEventListener('change', () => (u.autoMode = auto.checked));
      auto.addEventListener('pointerdown', (e) => e.stopPropagation());
      el.addEventListener('pointerdown', (e) => {
        if (!u.alive) return;
        if (e.shiftKey) this.ui.selected = this.ui.selected.includes(u) ? this.ui.selected : [...this.ui.selected, u];
        else this.ui.selected = [u];
      });
      root.appendChild(el);
      return el;
    });
    this.skillFor = null;
    this.logCount = -1;
  }

  update() {
    const w = this.getWorld(), ui = this.ui;

    // 파티 카드
    w.party.forEach((u, i) => {
      const el = this.cards[i];
      el.classList.toggle('selected', ui.selected.includes(u));
      el.classList.toggle('dead', !u.alive);
      (el.querySelector('.bar.hp > div') as HTMLElement).style.width = `${Math.max(0, u.hpFrac) * 100}%`;
      const mp = el.querySelector('.bar.mp > div') as HTMLElement | null;
      if (mp) mp.style.width = `${(u.mp / u.stats.maxMp) * 100}%`;
      el.querySelector('.statuses')!.innerHTML =
        `<span style="color:#aaa">${Math.ceil(Math.max(0, u.hp))}/${u.stats.maxHp}</span> ` +
        u.statuses.map((s) => `<span class="chip" style="color:${s.def.color}">${s.def.name}${s.stacks > 1 ? '×' + s.stacks : ''}</span>`).join('');
      el.querySelector('.cmd')!.textContent = commandText(u);
      el.querySelector('.lead')!.textContent = w.leader === u ? ' ★' : '';
      if (u.hero) {
        el.querySelector('.lv')!.textContent = `Lv${u.hero.xl}${u.hero.pending ? ' ▲' : ''}`;
        (el.querySelector('.bar.xp > div') as HTMLElement).style.width = `${(u.hero.xp / xpToNext(u.hero.xl)) * 100}%`;
      }
      const auto = el.querySelector<HTMLInputElement>('input.auto')!;
      if (auto.checked !== u.autoMode) auto.checked = u.autoMode;
      const rowBtn = el.querySelector<HTMLElement>('.rowbtn')!;
      const rowText = u.row === 'front' ? '전열' : '후열';
      if (rowBtn.textContent !== rowText) {
        rowBtn.textContent = rowText;
        rowBtn.classList.toggle('front', u.row === 'front');
      }
    });

    $('combat-state').innerHTML =
      `<span style="color:#9ab">${w.depth}/${FLOORS}층</span> ` +
      (w.inCombat ? '<span style="color:#ff8866">전투 중</span>' : '<span style="color:#88cc88">탐험</span>');
    $('pause-banner').classList.toggle('hidden', !ui.paused || !!w.outcome);
    $('btn-pause').textContent = ui.paused ? '▶ 재개' : '⏸ 일시정지';
    $('btn-pause').classList.toggle('on', ui.paused);

    const hint = $('targeting-hint');
    if (ui.targeting) {
      const ab = ui.targeting.unit.abilities[ui.targeting.slot].def;
      const what = ab.target === 'ground' ? '지점을' : ab.target === 'ally' ? '아군을' : '적을';
      hint.textContent = `${ui.targeting.unit.name}: ${ab.name} — ${what} 클릭하세요 (우클릭/Esc 취소, Shift 유지)`;
      hint.classList.remove('hidden');
    } else hint.classList.add('hidden');

    this.updateSkillbar();
    this.updateInspect();
    this.updateLog();
  }

  private updateSkillbar() {
    const ui = this.ui;
    const u = ui.selected.find((s) => s.alive) ?? null;
    const bar = $('skillbar');
    if (!u) {
      bar.classList.add('hidden');
      this.skillFor = null;
      return;
    }
    bar.classList.remove('hidden');
    const version = u.abilities.map((a) => `${a.def.id}${a.auto}${a.prio}${a.rank}`).join();
    const shown = u.abilities.filter((a) => !a.hidden);
    if (this.skillFor !== u || this.skillVersion !== version) {
      this.skillFor = u;
      this.skillVersion = version;
      this.buildSkillbar(u);
    }
    // 매 프레임 갱신: 재사용 대기, 마나, 정보
    const ranks = [...shown].sort((a, b) => b.prio - a.prio);
    shown.forEach((st, i) => {
      const el = bar.querySelector<HTMLElement>(`.skill[data-slot="${i}"]`)!;
      const mask = el.querySelector<HTMLElement>('.cdmask')!;
      const cdt = el.querySelector<HTMLElement>('.cdtext')!;
      mask.style.height = st.cd > 0 ? `${Math.min(1, st.cd / abilityCooldown(st)) * 100}%` : '0';
      cdt.textContent = st.cd > 0 ? st.cd.toFixed(st.cd < 3 ? 1 : 0) : '';
      const btn = el.querySelector<HTMLElement>('.btn')!;
      btn.classList.toggle('disabled', u.mp < st.def.cost);
      btn.classList.toggle('targeting', ui.targeting?.unit === u && ui.targeting.slot === i);
      el.querySelector('.rank')!.textContent = `우선${ranks.indexOf(st) + 1}`;
    });
    const s = u.stats;
    const skills = (Object.entries(u.skills) as [SkillId, number][])
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${SKILL_NAME[k]} ${v.toFixed(1)}`)
      .join(' · ');
    bar.querySelector('.info')!.innerHTML =
      `<b style="color:${u.def.color}">${u.name}</b> ${u.def.title}<br>` +
      `HP ${Math.ceil(u.hp)}/${s.maxHp}${s.maxMp ? ` · MP ${Math.floor(u.mp)}/${s.maxMp}` : ''}<br>` +
      `AC ${s.ac.toFixed(0)} · EV ${s.ev.toFixed(0)} · 의지 ${s.will}<br>` +
      `${u.weapon.name}: 피해 ${avgWeaponDamage(u).toFixed(1)} / ${attackDelay(u).toFixed(2)}초<br>` +
      `저항: ${resistText(u)}<br>` +
      `<span style="color:#999">${skills}</span>`;
  }

  private buildSkillbar(u: Unit) {
    const bar = $('skillbar');
    const keys = ['Q', 'W', 'E', 'R'];
    bar.innerHTML = '<div class="info"></div>';
    u.abilities.filter((a) => !a.hidden).forEach((st, i) => {
      const ab = st.def;
      const fail = failChance(u, ab);
      const el = document.createElement('div');
      el.className = 'skill';
      el.dataset.slot = String(i);
      const elem = ab.effects.find((e) => e.kind === 'damage');
      const tip = [
        `${ab.name} (${ab.type === 'spell' ? '마법' : '기술'})`,
        ab.desc,
        `시전 ${ab.castTime ? ab.castTime + '초' : '즉시'} · 재사용 ${ab.cooldown}초 · 사거리 ${ab.range || '자신'}${ab.radius ? ` · 범위 ${ab.radius}` : ''}`,
        elem && elem.kind === 'damage' ? `속성: ${ELEMENT_NAME[elem.element]}` : '',
        ab.cost ? `마나 ${ab.cost}` : '',
        ab.type === 'spell' ? `실패율 ${Math.round(fail * 100)}%` : '',
        ab.affects === 'all' ? '⚠ 아군도 피해를 입음' : '',
      ].filter(Boolean).join('\n');
      el.innerHTML = `
        <div class="btn" title="${tip}">
          <span class="key">${keys[i] ?? ''}</span>
          <span class="icon" style="color:${ab.color}">${ab.icon}</span>
          ${ab.cost ? `<span class="cost">${ab.cost}</span>` : ''}
          <div class="cdmask"></div><span class="cdtext"></span>
        </div>
        <div class="label">${ab.name}${st.rank ? `<span style="color:#e8cf7a"> +${st.rank}</span>` : ''}${fail > 0 ? ` <span style="color:#f88">${Math.round(fail * 100)}%</span>` : ''}</div>
        <div class="ctl">
          <button class="auto ${st.auto ? 'on' : ''}" title="자동전투에서 사용">${st.auto ? '자동' : '수동'}</button>
          <button class="up" title="자동 사용 우선순위 올리기">▲</button>
          <span class="rank"></span>
        </div>`;
      el.querySelector('.btn')!.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.onSkill(i);
      });
      el.querySelector('.auto')!.addEventListener('click', () => (st.auto = !st.auto));
      el.querySelector('.up')!.addEventListener('click', () => {
        const higher = u.abilities.filter((a) => !a.hidden && a.prio > st.prio).sort((a, b) => a.prio - b.prio)[0];
        if (higher) [higher.prio, st.prio] = [st.prio, higher.prio];
      });
      bar.appendChild(el);
    });
  }

  private updateInspect() {
    const ui = this.ui, w = this.getWorld();
    const t = ui.hover && ui.hover.faction !== 'party' ? ui.hover : ui.inspect;
    const box = $('inspect');
    if (!t || !t.alive) {
      box.classList.add('hidden');
      this.inspectFor = null;
      return;
    }
    box.classList.remove('hidden');
    if (this.inspectFor !== t) {
      this.inspectFor = t;
      box.innerHTML = `<h3 style="color:${t.def.color}"></h3><div class="sub"></div><div class="kv"></div>
        <button class="focus"></button>`;
      box.querySelector('.focus')!.addEventListener('click', () => w.setFocus(w.focusTarget === t ? null : t));
    }
    const s = t.stats;
    box.querySelector('h3')!.textContent = `${t.def.glyph}  ${t.name}`;
    box.querySelector('.sub')!.textContent = `${t.def.title}${t.aware ? '' : ' · 아직 눈치채지 못함'}`;
    const abil = t.abilities.map((a) => a.def.name).join(', ') || '-';
    box.querySelector('.kv')!.innerHTML = `
      <span>체력</span><span>${Math.ceil(t.hp)} / ${s.maxHp}</span>
      <span>AC / EV</span><span>${s.ac.toFixed(0)} / ${s.ev.toFixed(0)}</span>
      <span>의지력</span><span>${t.tags.includes('mindless') ? '∞' : s.will}</span>
      <span>공격</span><span>${t.weapon.name} (${t.weapon.element ? ELEMENT_NAME[t.weapon.element] : '물리'})</span>
      <span>능력</span><span>${abil}</span>
      <span>저항</span><span>${resistText(t)}</span>
      <span>상태</span><span>${t.statuses.map((x) => `<span style="color:${x.def.color}">${x.def.name}</span>`).join(' ') || '-'}</span>
      ${t.cast ? `<span>시전 중</span><span style="color:#ff9933">${t.abilities[t.cast.slot].def.name}</span>` : ''}`;
    box.querySelector('.focus')!.textContent = w.focusTarget === t ? '집중 공격 해제 (F)' : '집중 공격 (F)';
  }

  private updateLog() {
    const w = this.getWorld();
    if (w.logs.length === this.logCount && w.logs.length < 60) return;
    this.logCount = w.logs.length;
    $('log').innerHTML = w.logs
      .slice(-10)
      .map((l) => `<div style="color:${l.color}">${l.text}</div>`)
      .join('');
  }
}
