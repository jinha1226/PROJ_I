// DOM 기반 HUD: 하단 파티 패널(캐릭터별 스킬 버튼 + 상태창), 정보 창, 전투 로그.
import { ELEMENT_NAME } from '../sim/combat';
import { RESIST_KEYS, type SkillId, type TacticId } from '../sim/defs';
import { abilityCooldown, attackDelay, avgWeaponDamage, failChance } from '../sim/stats';
import type { Unit } from '../sim/unit';
import type { World } from '../sim/world';
import type { UiState } from './state';
import { RES_NAME, SKILL_NAME } from '../data/names';
import { FLOORS } from '../data/encounters';
import { xpToNext } from '../sim/hero';
import { BELT_SIZE, CONSUMABLES } from '../data/consumables';

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
  private cols: HTMLElement[] = [];
  private skillVersion: string[] = [];
  private inspectFor: Unit | null = null;
  private logCount = -1;

  constructor(
    private ui: UiState,
    private getWorld: () => World,
    private onSkill: (slot: number) => void,
    private onInfo: (u: Unit) => void,
    private onItem: (index: number) => void,
  ) {}

  /** 월드가 바뀌면(층 이동·재시작) 하단 파티 패널을 새로 만든다 */
  build() {
    const w = this.getWorld();
    const root = $('party');
    root.innerHTML = '';
    this.skillVersion = [];
    this.cols = w.party.map((u, i) => {
      const col = document.createElement('div');
      col.className = 'pcol';
      col.innerHTML = `
        <div class="pskills"></div>
        <div class="card">
          <div class="head"><span class="name" style="color:${u.def.color}">${i + 1}. ${u.name}<span class="lead"></span></span>
            <span class="lv"></span><button class="info" title="상태창">ⓘ</button></div>
          <div class="bar hp"><div></div><span class="bt"></span></div>
          ${u.stats.maxMp > 0 ? '<div class="bar mp"><div></div></div>' : ''}
          <div class="bar xp"><div></div></div>
          <div class="statuses"></div>
          <div class="row">
            <button class="rowbtn" title="진형: 전열은 앞장서고, 후열은 함께 이동할 때 전열 뒤를 따른다"></button>
            <select title="자동전투 전술">${TACTICS.map(([id, n]) => `<option value="${id}">${n}</option>`).join('')}</select>
            <label title="자동전투"><input type="checkbox" class="auto" /> 자동</label>
          </div>
        </div>`;
      const card = col.querySelector<HTMLElement>('.card')!;
      const info = col.querySelector<HTMLButtonElement>('.info')!;
      info.addEventListener('pointerdown', (e) => e.stopPropagation());
      info.addEventListener('click', () => this.onInfo(u));
      const sel = col.querySelector('select')!;
      sel.value = u.tactic;
      sel.addEventListener('change', () => (u.tactic = sel.value as TacticId));
      sel.addEventListener('pointerdown', (e) => e.stopPropagation());
      const rowBtn = col.querySelector<HTMLButtonElement>('.rowbtn')!;
      rowBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
      rowBtn.addEventListener('click', () => (u.row = u.row === 'front' ? 'back' : 'front'));
      const auto = col.querySelector<HTMLInputElement>('input.auto')!;
      auto.checked = u.autoMode;
      auto.addEventListener('change', () => (u.autoMode = auto.checked));
      auto.parentElement!.addEventListener('pointerdown', (e) => e.stopPropagation());
      card.addEventListener('pointerdown', (e) => {
        if (!u.alive) return;
        if (e.shiftKey) this.ui.selected = this.ui.selected.includes(u) ? this.ui.selected : [...this.ui.selected, u];
        else this.ui.selected = [u];
      });
      root.appendChild(col);
      return col;
    });
    this.logCount = -1;
  }

  /** 캐릭터 위 스킬 버튼. 누르면 그 캐릭터로 사용, 길게 누르기/우클릭은 자동 사용 켜기·끄기 */
  private buildSkills(u: Unit, col: HTMLElement) {
    const box = col.querySelector<HTMLElement>('.pskills')!;
    box.innerHTML = '';
    u.abilities.forEach((st, slot) => {
      if (st.hidden) return;
      const ab = st.def;
      const fail = failChance(u, ab);
      const elem = ab.effects.find((e) => e.kind === 'damage');
      const tip = [
        `${ab.name}${st.rank ? ` +${st.rank}` : ''} (${ab.type === 'spell' ? '마법' : '기술'})`,
        ab.desc,
        `시전 ${ab.castTime ? ab.castTime + '초' : '즉시'} · 재사용 ${abilityCooldown(st).toFixed(1)}초 · 사거리 ${ab.range || '자신'}${ab.radius ? ` · 범위 ${ab.radius}` : ''}`,
        elem && elem.kind === 'damage' ? `속성: ${ELEMENT_NAME[elem.element]}` : '',
        ab.cost ? `마나 ${ab.cost}` : '',
        ab.type === 'spell' ? `실패율 ${Math.round(fail * 100)}%` : '',
        ab.affects === 'all' ? '⚠ 아군도 피해를 입음' : '',
        st.manualOnly ? '수동 전용: AI 가 쓰지 않는다' : '길게 누르기 / 우클릭: 자동 사용 켜기·끄기',
      ].filter(Boolean).join('\n');
      const b = document.createElement('div');
      b.className = `sk${st.manualOnly ? ' manual' : ''}`;
      b.dataset.slot = String(slot);
      b.title = tip;
      b.innerHTML = `
        <span class="icon" style="color:${ab.color}">${ab.icon}</span>
        <span class="nm">${ab.name}${st.rank ? `<i>+${st.rank}</i>` : ''}</span>
        ${fail > 0.005 ? `<span class="fail">${Math.round(fail * 100)}%</span>` : ''}
        <span class="badge"></span>
        <div class="cdmask"></div><span class="cdtext"></span>`;
      let timer = 0, longPressed = false;
      const toggleAuto = () => {
        if (st.manualOnly) return;
        st.auto = !st.auto;
        longPressed = true;
      };
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (e.button === 2) return;
        longPressed = false;
        timer = window.setTimeout(toggleAuto, 450);
      });
      b.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        clearTimeout(timer);
        if (e.button === 2 || longPressed || !u.alive) return;
        this.ui.selected = [u];
        this.onSkill(slot);
      });
      b.addEventListener('pointerleave', () => clearTimeout(timer));
      b.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        toggleAuto();
      });
      box.appendChild(b);
    });
  }

  update() {
    const w = this.getWorld(), ui = this.ui;

    w.party.forEach((u, i) => {
      const col = this.cols[i];
      const ver = u.abilities.map((a) => `${a.def.id}${a.rank}`).join();
      if (this.skillVersion[i] !== ver) {
        this.skillVersion[i] = ver;
        this.buildSkills(u, col);
      }
      col.classList.toggle('selected', ui.selected.includes(u));
      col.classList.toggle('dead', !u.alive);
      (col.querySelector('.bar.hp > div') as HTMLElement).style.width = `${Math.max(0, u.hpFrac) * 100}%`;
      col.querySelector('.bar.hp .bt')!.textContent = `${Math.ceil(Math.max(0, u.hp))}/${u.stats.maxHp}`;
      const mp = col.querySelector('.bar.mp > div') as HTMLElement | null;
      if (mp) mp.style.width = `${(u.mp / u.stats.maxMp) * 100}%`;
      const cmd = commandText(u);
      col.querySelector('.statuses')!.innerHTML =
        u.statuses.map((s) => `<span class="chip" style="color:${s.def.color}">${s.def.name}${s.stacks > 1 ? '×' + s.stacks : ''}</span>`).join('') +
        (cmd ? `<span class="cmd">${cmd}</span>` : '');
      col.querySelector('.lead')!.textContent = w.leader === u ? ' ★' : '';
      if (u.hero) {
        col.querySelector('.lv')!.textContent = `Lv${u.hero.xl}${u.hero.pending ? ' ▲' : ''}`;
        (col.querySelector('.bar.xp > div') as HTMLElement).style.width = `${(u.hero.xp / xpToNext(u.hero.xl)) * 100}%`;
      }
      const auto = col.querySelector<HTMLInputElement>('input.auto')!;
      if (auto.checked !== u.autoMode) auto.checked = u.autoMode;
      const rowBtn = col.querySelector<HTMLElement>('.rowbtn')!;
      const rowText = u.row === 'front' ? '전열' : '후열';
      if (rowBtn.textContent !== rowText) {
        rowBtn.textContent = rowText;
        rowBtn.classList.toggle('front', u.row === 'front');
      }
      for (const b of col.querySelectorAll<HTMLElement>('.sk')) {
        const st = u.abilities[Number(b.dataset.slot)];
        const ready = u.alive && st.cd <= 0 && u.mp >= st.def.cost;
        b.querySelector<HTMLElement>('.cdmask')!.style.height = st.cd > 0 ? `${Math.min(1, st.cd / abilityCooldown(st)) * 100}%` : '0';
        b.querySelector('.cdtext')!.textContent = st.cd > 0 ? st.cd.toFixed(st.cd < 3 ? 1 : 0) : '';
        b.classList.toggle('disabled', !u.alive || u.mp < st.def.cost);
        b.classList.toggle('ready', !!st.manualOnly && ready);
        b.classList.toggle('targeting', ui.targeting?.unit === u && ui.targeting.slot === Number(b.dataset.slot));
        const badge = st.manualOnly ? '수동' : st.auto ? '자동' : '끔';
        const bd = b.querySelector<HTMLElement>('.badge')!;
        if (bd.textContent !== badge) {
          bd.textContent = badge;
          bd.className = `badge ${st.manualOnly ? 'm' : st.auto ? 'a' : 'off'}`;
        }
      }
    });

    $('combat-state').innerHTML =
      `<span style="color:#9ab">${w.depth}/${FLOORS}층</span> ` +
      (w.inCombat ? '<span style="color:#ff8866">전투 중</span>' : '<span style="color:#88cc88">탐험</span>');
    $('pause-banner').classList.toggle('hidden', !ui.paused || !!w.outcome);
    $('btn-pause').textContent = ui.paused ? '▶ 재개' : '⏸ 일시정지';
    $('btn-pause').classList.toggle('on', ui.paused);

    this.updateBelt();
    const hint = $('targeting-hint');
    if (ui.itemTarget !== null && w.run.belt[ui.itemTarget]) {
      const c = CONSUMABLES[w.run.belt[ui.itemTarget]];
      hint.textContent = `${c.name} — ${c.target === 'enemy' ? '적을' : '지점을'} 누르세요 (우클릭/Esc 취소)`;
      hint.classList.remove('hidden');
    } else if (ui.targeting) {
      const ab = ui.targeting.unit.abilities[ui.targeting.slot].def;
      const what = ab.target === 'ground' ? '지점을' : ab.target === 'ally' ? '아군을' : '적을';
      hint.textContent = `${ui.targeting.unit.name}: ${ab.name} — ${what} 누르세요 (우클릭/Esc 취소)`;
      hint.classList.remove('hidden');
    } else hint.classList.add('hidden');

    this.updateInspect();
    this.updateLog();
  }

  /** 소모품 벨트 (4칸, 파티 공용) */
  private updateBelt() {
    const w = this.getWorld();
    const ver = w.run.belt.join();
    const box = $('belt');
    if (box.dataset.ver !== ver) {
      box.dataset.ver = ver;
      box.innerHTML = '';
      for (let i = 0; i < BELT_SIZE; i++) {
        const id = w.run.belt[i];
        const b = document.createElement('button');
        b.className = 'bslot';
        if (id) {
          const c = CONSUMABLES[id];
          b.title = `${c.name}: ${c.desc}`;
          b.innerHTML = `<span style="color:${c.color}">${c.icon}</span><small>${c.name}</small>`;
          b.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            this.onItem(i);
          });
        } else {
          b.classList.add('empty');
          b.disabled = true;
        }
        box.appendChild(b);
      }
    }
    box.querySelectorAll<HTMLElement>('.bslot').forEach((b, i) => b.classList.toggle('targeting', this.ui.itemTarget === i));
  }

  /** 아군 한 명만 선택했을 때 정보 창 내용 */
  private heroInfo(u: Unit): string {
    const s = u.stats;
    const skills = (Object.entries(u.skills) as [SkillId, number][])
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${SKILL_NAME[k]} ${v.toFixed(1)}`)
      .join(' · ');
    const gear = u.hero ? (['weapon', 'armour', 'jewel'] as const).map((k) => u.hero!.gear[k]?.name ?? '-').join(' · ') : '';
    return `
      <span>체력</span><span>${Math.ceil(u.hp)} / ${s.maxHp}${s.maxMp ? ` · 마나 ${Math.floor(u.mp)}/${s.maxMp}` : ''}</span>
      <span>AC / EV</span><span>${s.ac.toFixed(0)} / ${s.ev.toFixed(0)} · 의지 ${s.will}</span>
      <span>평타</span><span>${u.weapon.name} ${avgWeaponDamage(u).toFixed(1)} / ${attackDelay(u).toFixed(2)}초</span>
      <span>저항</span><span>${resistText(u)}</span>
      <span>장비</span><span>${gear}</span>
      <span>스킬</span><span>${skills}</span>`;
  }

  private updateInspect() {
    const ui = this.ui, w = this.getWorld();
    const t = ui.hover && ui.hover.faction !== 'party' ? ui.hover : ui.inspect;
    const box = $('inspect');
    const hero = !t && ui.selected.length === 1 ? ui.selected[0] : null;
    box.classList.toggle('hero', !!hero && hero.alive);
    if (hero && hero.alive) {
      box.classList.remove('hidden');
      if (this.inspectFor !== hero) {
        this.inspectFor = hero;
        box.innerHTML = `<h3 style="color:${hero.def.color}">${hero.name}</h3><div class="sub">${hero.def.title}</div><div class="kv"></div>`;
      }
      box.querySelector('.kv')!.innerHTML = this.heroInfo(hero);
      return;
    }
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
