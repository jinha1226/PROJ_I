// 겹치는 화면: 시작(무기 고르기) · 맵 사이(보상 · 능력치) · 끝. 고른 것은 콜백으로 main.ts에 알린다
import { describeReward } from '../core/rewards';
import type { Run } from '../core/run';
import type { StatId, WeaponId } from '../core/types';
import { STAT_NAME, WEAPONS } from '../data/weapons';
import { $ } from './dom';
import { statGain } from './text';

export interface ScreenActions {
  /** 무기를 골라 판을 시작한다 */
  start(w: WeaponId): void;
  /** 보상 고르기 (null이면 넘기기) */
  reward(idx: number | null): void;
  stat(s: StatId): void;
  next(): void;
  again(): void;
}

function overlay(html: string): HTMLElement {
  const o = $('overlay');
  o.hidden = false;
  o.innerHTML = `<div class="box">${html}</div>`;
  return o;
}

export function hideOverlay(): void {
  $('overlay').hidden = true;
}

const on = (o: HTMLElement, sel: string, fn: (x: HTMLButtonElement) => void) =>
  o.querySelectorAll<HTMLButtonElement>(sel).forEach((x) => {
    x.onclick = () => fn(x);
  });

export function showStart(act: ScreenActions): void {
  const o = overlay(`
    <h1>보드 전술 시제품 · 1막</h1>
    <p style="font-size:11px">빌드 ${__BUILD__}</p>
    <p>정통 턴제: 당신이 한 가지를 하면 적이 모두 한 번씩 움직인다. 공격은 늘 맞고, 피해만 적힌 범위 안에서 정해진다. 용암 · 충돌 같은 지형 피해는 늘 그대로다.
    둘 이상에게 둘러싸이지 않을 자리를 찾고, 용암 · 구덩이 · 원소로 적을 처리한다. 무기를 골라 시작한다.</p>
    ${(Object.keys(WEAPONS) as WeaponId[]).map((id) => {
      const w = WEAPONS[id];
      const req = Object.entries(w.req).map(([s, n]) => `${STAT_NAME[s as StatId]} ${n}`).join(' · ');
      return `<button data-w="${id}"><b>${w.name}</b> <small>${req} · ${w.desc}<br>기술 ${w.skill.name}: ${w.skill.desc}</small></button>`;
    }).join('')}`);
  on(o, 'button[data-w]', (x) => act.start(x.dataset.w as WeaponId));
}

/** 판의 단계에 맞는 화면 (전투 중이면 숨긴다) */
export function showRunScreen(r: Run, act: ScreenActions): void {
  if (r.phase === 'battle') return hideOverlay();
  const sum = r.summary.map((s) => `<p>${s}</p>`).join('');
  if (r.phase === 'between') return showBetween(r, sum, act);
  const o = overlay(`<h1>${r.phase === 'victory' ? '1막 끝!' : '죽었다'}</h1>${sum}
    <p>레벨 ${r.hero.level} · ${WEAPONS[r.hero.weapon].name}</p>
    <button id="again"><b>다시 하기</b></button>`);
  on(o, '#again', () => act.again());
}

function showBetween(r: Run, sum: string, act: ScreenActions): void {
  const pts = r.hero.points;
  const rw = r.rewards;
  const o = overlay(`
    <h1>맵을 벗어났다</h1>${sum}
    ${rw ? `<h2>보상 — 하나를 고른다</h2>${rw.map((x, i) => {
      const d = describeReward(r.hero, x);
      return `<button data-r="${i}"><b>${d.title}</b><small>${d.detail}</small></button>`;
    }).join('')}<button id="skip"><small>보상 없이 넘어가기</small></button>` : ''}
    ${pts > 0 ? `<h2>능력치 점수 ${pts}</h2><div class="stats">${(['str', 'dex', 'int'] as StatId[]).map((s) =>
      `<button data-s="${s}">${STAT_NAME[s]} ${r.hero.stats[s]} → ${r.hero.stats[s] + 1}<small>${statGain(r.hero, s)}</small></button>`).join('')}</div>
    <p>힘: 최대 체력 · 민첩: 최소 피해 · 지능: 기술 재사용 대기, 2점마다 기술 위력과 연막. 든 무기가 요구하는 능력치는 공격도 올린다</p>` : ''}
    <h2>체력 ${r.hero.hp} / ${r.hero.maxHp}</h2>
    <button id="next" ${pts > 0 || rw ? 'disabled' : ''}><b>다음 맵</b><small>${rw ? '보상을 먼저 고른다' : pts > 0 ? '능력치를 먼저 고른다' : ''}</small></button>`);
  on(o, 'button[data-r]', (x) => act.reward(Number(x.dataset.r)));
  on(o, '#skip', () => act.reward(null));
  on(o, 'button[data-s]', (x) => act.stat(x.dataset.s as StatId));
  on(o, '#next', () => act.next());
}
