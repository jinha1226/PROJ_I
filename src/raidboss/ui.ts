import {el, fmt} from '../ui/dom';
import {COOLDOWNS} from './partyAi';
import type {BossRaid} from './sim';
import type {Order, Role, Unit} from './types';

const ROLE_ICON: Readonly<Record<Unit['kind'], string>> = {tank: '⛨', melee: '⚔', ranged: '➶', healer: '✚', boss: '☠', add: '☠'};
const ROLE_LABEL: Readonly<Record<Role, string>> = {tank: '방어 (기사)', melee: '근접 딜러 (야만전사)', ranged: '원거리 딜러 (사냥꾼)', healer: '치유 (마법사)'};
const ROLE_HELP: Readonly<Record<Role, string>> = {
  tank: '보스의 시선을 끌고 버틴다. Q 도발 · E 방패 막기(받는 피해 절반). 전방 강타는 막기로 받아낸다.',
  melee: '보스 등 뒤에서 큰 피해를 넣는다. Q 강타(2.5배) · E 집중(공격 속도↑). 회전 베기 땐 빠져나와라.',
  ranged: '멀리서 꾸준히 쏜다. 커서 근처 적을 조준. Q 다중 사격 · E 집중. 장판을 피하며 사격.',
  healer: '파티를 살린다. Q 커서 근처 아군 치유(시전 1초) · E 치유의 비(전체). 좌클릭은 공격.',
};

interface SkillSlot {
  key: string;
  name: string;
  cd: string | null;
  max: number;
}

function skillsFor(role: Role): SkillSlot[] {
  const base: SkillSlot[] = [{key: '좌클릭', name: role === 'healer' ? '마력탄' : role === 'ranged' ? '사격' : '공격', cd: null, max: 1}];
  const q: Record<Role, SkillSlot> = {
    tank: {key: 'Q', name: '도발', cd: 'taunt', max: COOLDOWNS.taunt},
    melee: {key: 'Q', name: '강타', cd: 'strike', max: COOLDOWNS.strike},
    ranged: {key: 'Q', name: '다중 사격', cd: 'volley', max: COOLDOWNS.volley},
    healer: {key: 'Q', name: '치유', cd: 'healCast', max: 1},
  };
  const e: Record<Role, SkillSlot> = {
    tank: {key: 'E', name: '방패 막기', cd: 'block', max: COOLDOWNS.block},
    melee: {key: 'E', name: '집중', cd: 'focus', max: 25},
    ranged: {key: 'E', name: '집중', cd: 'focus', max: 25},
    healer: {key: 'E', name: '치유의 비', cd: 'groupHeal', max: COOLDOWNS.groupHeal},
  };
  return [...base, q[role], e[role], {key: 'Space', name: '구르기', cd: 'dodge', max: COOLDOWNS.dodge}];
}

export interface StartChoice {
  role: Role | null;
  aiSkill: number;
}

/** Role pick + companion skill slider shown before each attempt. */
export function showStartScreen(onStart: (c: StartChoice) => void, last: StartChoice): void {
  const wrap = el('div', 'raidStart overlay');
  const panel = el('div', 'overlayPanel raidStartPanel');
  panel.append(el('h2', '', '레이드 시제품: 해골 군주'), el('p', 'muted', '5인 파티로 보스를 공략합니다. 동료는 AI가 움직입니다. 맡을 역할을 고르세요.'));
  let role = last.role;
  let skill = last.aiSkill;
  const roles = el('div', 'raidRoles');
  const help = el('p', 'raidHelp');
  const paint = (): void => {
    roles.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.role === String(role)));
    help.textContent = role ? ROLE_HELP[role] : '직접 조작하지 않고 AI 파티만으로 관전합니다.';
  };
  for (const r of ['tank', 'melee', 'ranged', 'healer', null] as const) {
    const b = el('button', 'raidRole', `<span>${r ? ROLE_ICON[r] : '👁'}</span>${r ? ROLE_LABEL[r] : '관전 (AI만)'}`);
    b.dataset.role = String(r);
    b.addEventListener('click', () => {
      role = r;
      paint();
    });
    roles.append(b);
  }
  const slider = el('label', 'raidSkill');
  const out = el('b', '', `${Math.round(skill * 100)}%`);
  const input = el('input') as HTMLInputElement;
  Object.assign(input, {type: 'range', min: '0', max: '1', step: '0.05', value: String(skill)});
  input.addEventListener('input', () => {
    skill = Number(input.value);
    out.textContent = `${Math.round(skill * 100)}%`;
  });
  slider.append(el('span', '', '동료 AI 숙련도 <small>(낮으면 장판을 늦게 피하거나 못 피함)</small>'), input, out);
  const go = el('button', 'primaryBtn big', '전투 시작');
  go.addEventListener('click', () => {
    wrap.remove();
    onStart({role, aiSkill: skill});
  });
  panel.append(roles, help, slider, el('p', 'muted', '조작: WASD 이동 · 좌클릭 공격 · Q/E 기술 · Space 구르기 · <kbd>Z</kbd> 모여 · <kbd>C</kbd> 흩어져 (다시 누르면 해제)'), go);
  wrap.append(panel);
  document.body.append(wrap);
  paint();
}

/** In-fight HUD: boss frame with cast bar, party frames, skill bar, orders, callouts. */
export class RaidHud {
  private readonly root = el('div', 'raidHud');
  private readonly bossFill = el('div', 'fill');
  private readonly bossText = el('span');
  private readonly castBar = el('div', 'raidCast');
  private readonly castFill = el('div', 'fill');
  private readonly castText = el('span');
  private readonly frames = el('div', 'raidFrames');
  private readonly skills = el('div', 'raidSkills');
  private readonly orders = el('div', 'raidOrders');
  private readonly callout = el('div', 'raidCallout');
  private readonly frameEls = new Map<number, {fill: HTMLElement; text: HTMLElement; row: HTMLElement}>();
  private skillEls: {slot: SkillSlot; mask: HTMLElement}[] = [];
  private calloutTimer = 0;

  constructor(private readonly raid: BossRaid) {
    const boss = el('div', 'raidBoss');
    const bar = el('div', 'bar');
    bar.append(this.bossFill, this.bossText);
    this.castBar.append(this.castFill, this.castText);
    boss.append(el('b', '', raid.boss.name), bar, this.castBar);
    for (const u of raid.party) {
      const row = el('div', `raidFrame ${u.kind}${u.controlled ? ' me' : ''}`);
      const hp = el('div', 'bar');
      const fill = el('div', 'fill');
      const text = el('span');
      hp.append(fill, text);
      row.append(el('i', '', ROLE_ICON[u.kind]), el('b', '', u.name), hp);
      this.frames.append(row);
      this.frameEls.set(u.id, {fill, text, row});
    }
    const me = raid.party.find(u => u.controlled);
    if (me) {
      this.skillEls = skillsFor(me.kind as Role).map(slot => {
        const box = el('div', 'raidSkillBox', `<kbd>${slot.key}</kbd><span>${slot.name}</span>`);
        const mask = el('div', 'cdMask');
        box.append(mask);
        this.skills.append(box);
        return {slot, mask};
      });
    }
    this.orders.innerHTML = '<span data-o="stack"><kbd>Z</kbd> 모여</span><span data-o="spread"><kbd>C</kbd> 흩어져</span>';
    this.root.append(boss, this.frames, this.skills, this.orders, this.callout);
    document.body.append(this.root);
  }

  say(text: string): void {
    this.callout.textContent = text;
    this.callout.classList.add('on');
    this.calloutTimer = 2.6;
  }

  setOrder(order: Order): void {
    this.orders.querySelectorAll('span').forEach(s => s.classList.toggle('on', (s as HTMLElement).dataset.o === order));
  }

  update(dt: number): void {
    const {boss, cast} = this.raid;
    this.bossFill.style.transform = `scaleX(${Math.max(0, boss.hp / boss.maxHp)})`;
    this.bossText.textContent = `${fmt(boss.hp)} / ${fmt(boss.maxHp)} (${Math.ceil((boss.hp / boss.maxHp) * 100)}%)`;
    this.castBar.classList.toggle('on', Boolean(cast));
    if (cast) {
      this.castFill.style.transform = `scaleX(${1 - cast.timer / cast.total})`;
      this.castText.textContent = `${cast.name}  ${Math.max(0, cast.timer).toFixed(1)}s`;
    }
    const marked = new Set(this.raid.hazards.filter(h => h.owner !== null).map(h => h.owner));
    for (const u of this.raid.party) {
      const f = this.frameEls.get(u.id)!;
      f.fill.style.transform = `scaleX(${Math.max(0, u.hp / u.maxHp)})`;
      f.text.textContent = u.alive ? `${fmt(u.hp)}` : '사망';
      f.row.classList.toggle('dead', !u.alive);
      f.row.classList.toggle('marked', marked.has(u.id));
      f.row.classList.toggle('aggro', this.raid.boss.target === u.id);
      f.row.classList.toggle('low', u.alive && u.hp < u.maxHp * 0.35);
    }
    const me = this.raid.party.find(u => u.controlled);
    for (const {slot, mask} of this.skillEls) {
      const left = slot.cd && me ? (me.cooldowns[slot.cd] ?? 0) : 0;
      // "Focus" stores its full cooldown at use; show it as a normal countdown.
      mask.style.transform = `scaleY(${Math.min(1, left / slot.max)})`;
    }
    this.calloutTimer -= dt;
    if (this.calloutTimer <= 0) this.callout.classList.remove('on');
  }

  dispose(): void {
    this.root.remove();
  }
}

/** Damage / healing / taken meter after the fight. */
export function showResults(raid: BossRaid, onRetry: () => void): void {
  const wrap = el('div', 'raidStart overlay');
  const panel = el('div', 'overlayPanel raidResult');
  const win = raid.ended === 'win';
  panel.append(
    el('h2', win ? 'good' : 'bad', win ? '해골 군주 처치!' : '전멸'),
    el(
      'p',
      'muted',
      `전투 시간 ${Math.floor(raid.time / 60)}:${String(Math.floor(raid.time % 60)).padStart(2, '0')} · 보스 남은 체력 ${Math.ceil((raid.boss.hp / raid.boss.maxHp) * 100)}%`,
    ),
  );
  const maxDmg = Math.max(1, ...raid.party.map(u => u.meter.damage));
  const maxHeal = Math.max(1, ...raid.party.map(u => u.meter.healing));
  const table = el('div', 'meter');
  table.innerHTML = '<div class="mh"><span>파티원</span><span>피해</span><span>치유</span><span>받은 피해</span></div>';
  for (const u of [...raid.party].sort((a, b) => b.meter.damage - a.meter.damage)) {
    table.innerHTML += `<div class="mr${u.controlled ? ' me' : ''}${u.alive ? '' : ' dead'}"><span>${ROLE_ICON[u.kind]} ${u.name}</span>
      <span class="mbar"><i style="width:${(u.meter.damage / maxDmg) * 100}%"></i>${fmt(u.meter.damage)}</span>
      <span class="mbar heal"><i style="width:${(u.meter.healing / maxHeal) * 100}%"></i>${fmt(u.meter.healing)}</span>
      <span>${fmt(u.meter.taken)}</span></div>`;
  }
  const retry = el('button', 'primaryBtn big', '다시 도전');
  retry.addEventListener('click', () => {
    wrap.remove();
    onRetry();
  });
  panel.append(table, retry);
  wrap.append(panel);
  document.body.append(wrap);
}
