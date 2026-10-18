// DOM 기반 HUD: 하단 패널(파티 카드 4장 + 주장 기술 버튼), 정보 창, 전투 로그.
import { ELEMENT_NAME } from '../sim/combat';
import type { TacticId } from '../sim/defs';
import { abilityCooldown, failChance } from '../sim/stats';
import type { Unit } from '../sim/unit';
import type { World } from '../sim/world';
import type { UiState } from './state';
import { SKILL_NAME } from '../data/names';
import { floorInfo } from '../sim/run';
import { BELT_SIZE, CONSUMABLES } from '../data/consumables';
import { MOODS } from '../data/moods';
import { BOSS_SCRIPTS } from '../sim/boss';
import { WARN_STRESS } from '../sim/stress';
import { skillCue } from '../sim/cues';
import { foeNotes, type Chip } from '../sim/notes';

const $ = (id: string) => document.getElementById(id)!;

const TACTICS: [TacticId, string][] = [
  ['aggressive', '공격형'],
  ['defensive', '방어형'],
  ['ranged', '원거리형'],
  ['support', '지원형'],
];

export { SKILL_NAME };



export class Hud {
  private cols: HTMLElement[] = [];
  private inspectFor: Unit | null = null;
  private logCount = -1;
  private notesAt = -1;

  constructor(
    private ui: UiState,
    private getWorld: () => World,
    private onSkill: (slot: number) => void,
    private onInfo: (u: Unit) => void,
    private onItem: (index: number) => void,
  ) {
    // 대상 지정 안내를 누르면 취소
    $('targeting-hint').addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.ui.targeting = null;
      this.ui.itemTarget = null;
    });
  }

  /** 월드가 바뀌면(방 이동·재시작) 하단 패널을 새로 만든다: 왼쪽 파티 카드 4장, 오른쪽 주장 기술 */
  build() {
    const w = this.getWorld();
    const root = $('party');
    root.innerHTML = '<div class="mates"></div><div class="capbar"></div>';
    this.capVersion = '';
    const mates = root.querySelector<HTMLElement>('.mates')!;
    this.cols = w.party.map((u) => {
      const col = document.createElement('div');
      col.className = 'mate';
      col.innerHTML = `
        <div class="head"><span class="name" style="color:${u.def.color}"><span class="lead"></span>${u.name}</span>
          <span class="lv"></span><button class="info" title="상태창">ⓘ</button></div>
        <div class="bar hp"><div></div><span class="bt"></span></div>
        ${u.stats.maxMp > 0 ? '<div class="bar mp"><div></div></div>' : ''}
        <div class="bar st" title="스트레스: 100 이 되면 붕괴(가끔 각성)"><div></div></div>
        <div class="foot"><span class="statuses"></span><button class="tac" title="작전 (누르면 바뀜)"></button></div>`;
      const info = col.querySelector<HTMLButtonElement>('.info')!;
      info.addEventListener('pointerdown', (e) => e.stopPropagation());
      info.addEventListener('click', () => this.onInfo(u));
      const tac = col.querySelector<HTMLButtonElement>('.tac')!;
      tac.addEventListener('pointerdown', (e) => e.stopPropagation());
      tac.addEventListener('click', () => {
        const i = TACTICS.findIndex(([id]) => id === u.tactic);
        u.tactic = TACTICS[(i + 1) % TACTICS.length][0];
      });
      // 카드 누르기: 아군 대상 기술을 고르는 중이면 그 아군에게(레이드 매니저식), 아니면 주장 교대
      col.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (!u.alive) return;
        const tg = this.ui.targeting;
        if (tg && tg.unit.abilities[tg.slot].def.target === 'ally') {
          w.commandAbility(tg.unit, tg.slot, u, u.x, u.y);
          this.ui.targeting = null;
          return;
        }
        w.setCaptain(u);
      });
      mates.appendChild(col);
      return col;
    });
    this.logCount = -1;
  }

  private capVersion = '';

  /** 주장 기술 버튼 (+ 돌진/구르기). 누르면 사용, 길게 누르기/우클릭은 자동 사용 켜기·끄기 */
  private buildCapbar(u: Unit) {
    const box = $('party').querySelector<HTMLElement>('.capbar')!;
    box.innerHTML = '';
    u.abilities.forEach((st, slot) => {
      if (st.hidden) return;
      const ab = st.def;
      const fail = failChance(u, ab);
      const elem = ab.effects.find((e) => e.kind === 'damage');
      const tip = [
        `${ab.name}${st.rank ? ` +${st.rank}` : ''} (${ab.type === 'spell' ? '마법' : '기술'}) [${['Q', 'E', 'R', 'F', '5', '6'][slot] ?? ''}]`,
        ab.desc,
        `시전 ${ab.castTime ? ab.castTime + '초' : '즉시'} · 재사용 ${abilityCooldown(st).toFixed(1)}초 · 사거리 ${ab.range || '자신'}${ab.radius ? ` · 범위 ${ab.radius}` : ''}`,
        elem && elem.kind === 'damage' ? `속성: ${ELEMENT_NAME[elem.element]}` : '',
        ab.cost ? `마나 ${ab.cost}` : '',
        ab.type === 'spell' ? `실패율 ${Math.round(fail * 100)}%` : '',
        ab.affects === 'all' ? '⚠ 아군도 피해를 입음' : '',
        '길게 누르기 / 우클릭: 자동 사용 켜기 ↔ 끄기',
      ].filter(Boolean).join('\n');
      const b = document.createElement('div');
      b.className = 'sk';
      b.dataset.slot = String(slot);
      b.title = tip;
      b.innerHTML = `
        <span class="icon" style="color:${ab.color}">${ab.icon}</span>
        <span class="nm">${ab.name}${st.rank ? `<i>+${st.rank}</i>` : ''}</span>
        <span class="badge"></span>
        <div class="cdmask"></div><span class="cdtext"></span>`;
      let timer = 0, longPressed = false;
      const toggleAuto = () => {
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
        this.onSkill(slot);
      });
      b.addEventListener('pointerleave', () => clearTimeout(timer));
      b.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        toggleAuto();
      });
      box.appendChild(b);
    });
    const dash = document.createElement('div');
    dash.className = 'sk dash';
    dash.title = u.isRanged ? '구르기 [Shift]: 짧게 굴러 공격을 피한다' : '돌진 [Shift]: 앞의 적에게 뛰어들어 강타. 적이 없으면 구르기';
    dash.innerHTML = `<span class="icon">${u.isRanged ? '↯' : '»'}</span><span class="nm">${u.isRanged ? '구르기' : '돌진'}</span><div class="cdmask"></div>`;
    dash.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.getWorld().captainDash();
    });
    box.appendChild(dash);
  }

  update() {
    const w = this.getWorld(), ui = this.ui;
    const cap = w.captain;

    w.party.forEach((u, i) => {
      const col = this.cols[i];
      col.classList.toggle('captain', cap === u);
      col.classList.toggle('dead', !u.alive);
      (col.querySelector('.bar.hp > div') as HTMLElement).style.width = `${Math.max(0, u.hpFrac) * 100}%`;
      col.querySelector('.bar.hp .bt')!.textContent = `${Math.ceil(Math.max(0, u.hp))}/${u.stats.maxHp}`;
      const mp = col.querySelector('.bar.mp > div') as HTMLElement | null;
      if (mp) mp.style.width = `${(u.mp / u.stats.maxMp) * 100}%`;
      const mood = u.hero?.mood ? MOODS[u.hero.mood] : null;
      col.classList.toggle('afflicted', !!mood && !mood.virtue);
      col.classList.toggle('virtue', !!mood?.virtue);
      col.classList.toggle('low', u.alive && u.hpFrac < 0.35);
      if (u.hero) {
        const st = col.querySelector<HTMLElement>('.bar.st > div')!;
        st.style.width = `${u.hero.stress}%`;
        st.style.background = mood ? mood.color : u.hero.stress >= WARN_STRESS ? '#d070ff' : '#8a5cc0';
        col.classList.toggle('stress-warn', !mood && u.hero.stress >= WARN_STRESS);
        col.querySelector('.lv')!.textContent = `Lv${u.hero.xl}${u.hero.pending ? '★' : ''}`;
      }
      col.querySelector('.statuses')!.innerHTML =
        (mood ? `<span class="chip mood" style="color:${mood.color}" title="${mood.desc}">${mood.virtue ? '★' : '!'}${mood.name}</span>` : '') +
        u.statuses.map((s) => `<span class="chip" style="color:${s.def.color}">${s.def.name}</span>`).join('');
      col.querySelector('.lead')!.textContent = cap === u ? '★ ' : '';
      const tac = col.querySelector<HTMLElement>('.tac')!;
      const tacText = cap === u ? (u.autoMode ? '자동' : '조작') : TACTICS.find(([id]) => id === u.tactic)?.[1] ?? '';
      if (tac.textContent !== tacText) tac.textContent = tacText;
      tac.style.visibility = cap === u ? 'hidden' : '';
    });

    // 주장 기술 줄
    if (cap) {
      const ver = `${cap.id}:${cap.abilities.map((a) => `${a.def.id}${a.rank}`).join()}`;
      if (this.capVersion !== ver) {
        this.capVersion = ver;
        this.buildCapbar(cap);
      }
      const box = $('party').querySelector<HTMLElement>('.capbar')!;
      for (const b of box.querySelectorAll<HTMLElement>('.sk')) {
        if (b.classList.contains('dash')) {
          const max = cap.isRanged ? 2.5 : 4;
          b.querySelector<HTMLElement>('.cdmask')!.style.height = cap.dashCd > 0 ? `${Math.min(1, cap.dashCd / max) * 100}%` : '0';
          b.classList.toggle('ready', cap.alive && cap.dashCd <= 0);
          continue;
        }
        const st = cap.abilities[Number(b.dataset.slot)];
        const ready = cap.alive && st.cd <= 0 && cap.mp >= st.def.cost;
        b.querySelector<HTMLElement>('.cdmask')!.style.height = st.cd > 0 ? `${Math.min(1, st.cd / abilityCooldown(st)) * 100}%` : '0';
        b.querySelector('.cdtext')!.textContent = st.cd > 0 ? st.cd.toFixed(st.cd < 3 ? 1 : 0) : '';
        b.classList.toggle('disabled', !cap.alive || cap.mp < st.def.cost);
        const mine = !cap.autoMode && !st.auto;
        b.classList.toggle('ready', mine && ready);
        b.classList.toggle('urgent', mine && ready && skillCue(w, cap, st));
        b.classList.toggle('targeting', ui.targeting?.unit === cap && ui.targeting.slot === Number(b.dataset.slot));
        const badge = st.auto || cap.autoMode ? '자동' : '';
        const bd = b.querySelector<HTMLElement>('.badge')!;
        if (bd.textContent !== badge) {
          bd.textContent = badge;
          bd.className = `badge ${badge ? 'a' : 'off'}`;
        }
      }
    }

    $('combat-state').innerHTML =
      (w.arena
        ? `<span style="color:#9ab">웨이브 ${w.waveIndex}/${w.waves.length}${w.waveName ? ` · ${w.waveName}` : ''}</span> <span class="gold">${w.run.gold}G</span> `
        : `<span style="color:#9ab">${floorInfo(w.run, w.depth).floor}/${floorInfo(w.run, w.depth).floors}층</span> <span class="gold">${w.run.gold}G</span> `) +
      (w.inCombat ? '<span style="color:#ff8866">전투 중</span>' : '<span style="color:#88cc88">탐험</span>');
    $('pause-banner').classList.toggle('hidden', !ui.paused || !!w.outcome);
    $('btn-pause').textContent = ui.paused ? '▶ 재개' : '⏸ 일시정지';
    $('btn-pause').classList.toggle('on', ui.paused);

    this.updateBoss();
    this.updateBelt();
    const hint = $('targeting-hint');
    if (ui.itemTarget !== null && w.run.belt[ui.itemTarget]) {
      const c = CONSUMABLES[w.run.belt[ui.itemTarget]];
      hint.innerHTML = `${c.name} — ${c.target === 'enemy' ? '적을' : '지점을'} 누르세요 <b class="x">✕ 취소</b>`;
      hint.classList.remove('hidden');
    } else if (ui.targeting) {
      const ab = ui.targeting.unit.abilities[ui.targeting.slot].def;
      const what = ab.target === 'ground' ? '지점을' : ab.target === 'ally' ? '아군을' : '적을';
      hint.innerHTML = `${ui.targeting.unit.name}: ${ab.name} — ${what} 누르세요 <b class="x">✕ 취소</b>`;
      hint.classList.remove('hidden');
    } else hint.classList.add('hidden');

    this.updateInspect();
    this.updateLog();
  }

  /** 레이드 보스 체력바: 페이즈 경계 · 어그로 대상 · 다음 기믹 · 광폭화까지 */
  private bossFor: Unit | null = null;
  private updateBoss() {
    const w = this.getWorld();
    const b = w.units.find((u) => u.alive && u.script) ?? null;
    const box = $('bossbar');
    box.classList.toggle('hidden', !b);
    if (!b || !b.script) {
      this.bossFor = null;
      return;
    }
    const sc = BOSS_SCRIPTS[b.def.id];
    if (this.bossFor !== b) {
      this.bossFor = b;
      box.querySelector('.bhp')!.innerHTML = '<i></i>' + sc.marks.map((m) => `<b style="left:${m * 100}%"></b>`).join('');
    }
    const s = b.script;
    const warded = b.hasStatus('warded'), enraged = b.hasStatus('enraged'), frenzy = b.hasStatus('frenzy');
    box.querySelector('.bn')!.innerHTML = `${b.name} <span class="ph">${s.phase}페이즈</span>` +
      (warded ? ' <span class="st" style="color:#c890ff">보호막</span>' : '') +
      (frenzy ? ' <span class="st" style="color:#ff0000">광란</span>' : enraged ? ' <span class="st" style="color:#ff4444">광폭화</span>' : '');
    (box.querySelector('.bhp > i') as HTMLElement).style.width = `${b.hpFrac * 100}%`;
    const tgt = b.aggroTarget?.alive ? b.aggroTarget : null;
    const next = Object.entries(s.timers).filter(([k, t]) => sc.names[k] && t > 0).sort((p, q) => p[1] - q[1])[0];
    const left = Math.max(0, sc.enrage - (w.time - s.pullAt));
    const tank = tgt && tgt.hero?.cls === 'warrior';
    box.querySelector('.bsub')!.innerHTML =
      (tgt ? `<span style="color:${tank ? '#9cd0ff' : '#ff6666'}">▶ ${tgt.name}</span>` : '') +
      (next ? ` · ${sc.names[next[0]]} ${Math.ceil(next[1])}초` : '') +
      ` · <span style="color:${left < 30 ? '#ff6666' : '#aaa'}">광란까지 ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}</span>`;
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

  private updateInspect() {
    const ui = this.ui, w = this.getWorld();
    const t = ui.hover && ui.hover.faction !== 'party' ? ui.hover : ui.inspect;
    const box = $('inspect');
    // 주장이 늘 선택돼 있으니 아군 정보는 카드의 ⓘ 로만 본다
    box.classList.remove('hero');
    if (!t || !t.alive) {
      box.classList.add('hidden');
      this.inspectFor = null;
      return;
    }
    box.classList.remove('hidden');
    if (this.inspectFor !== t) {
      this.inspectFor = t;
      this.notesAt = -1;
      box.innerHTML = `<h3 style="color:${t.def.color}"></h3><div class="sub"></div><div class="hpline"></div><div class="notes"></div>
        <button class="focus"></button>`;
      box.querySelector('.focus')!.addEventListener('click', () => w.setFocus(w.focusTarget === t ? null : t));
    }
    const s = t.stats;
    box.querySelector('h3')!.textContent = `${t.def.glyph}  ${t.name}`;
    box.querySelector('.sub')!.textContent = `${t.def.title}${t.aware ? '' : ' · 아직 눈치채지 못함'}`;
    box.querySelector('.hpline')!.innerHTML =
      `체력 ${Math.ceil(t.hp)} / ${s.maxHp}` +
      (t.statuses.length ? ` · ${t.statuses.map((x) => `<span style="color:${x.def.color}">${x.def.name}</span>`).join(' ')}` : '') +
      (t.cast ? ` · <span style="color:#ff9933">시전 중: ${t.abilities[t.cast.slot].def.name}</span>` : '');
    // 상성 정보는 자주 바뀌지 않으니 0.5초마다
    if (w.time - this.notesAt > 0.5 || this.notesAt < 0) {
      this.notesAt = w.time;
      const n = foeNotes(t, w.party);
      const chips = (title: string, list: Chip[]) =>
        list.length ? `<div class="nt">${title}</div><div class="chips">${list.map((c) => `<span class="nc ${c.kind}">${c.text}</span>`).join('')}</div>` : '';
      box.querySelector('.notes')!.innerHTML =
        (n.tip ? `<div class="tip">💡 ${n.tip}</div>` : '') +
        chips('약점', n.weak) + chips('강함', n.strong) + chips('조심', n.danger) + chips('우리 파티', n.vs);
    }
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
