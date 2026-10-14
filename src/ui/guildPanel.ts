import {itemDef} from '../items/catalog';
import type {Profile} from '../meta/profile';
import {advanceGuild, candidatePower, collectLoot, dismissMercenary, estimateExpedition, expeditionDurationMs, equipMercenary, hireCandidate, mercPower, mercSalary, refreshCandidates, rosterLimit, startExpedition, type Expedition, type Mercenary, type RetreatRule} from '../meta/guild';
import {levelOf} from '../meta/upgrades';
import {byId, el, fmt} from './dom';

export interface GuildPanelCallbacks {
  getProfile(): Profile;
  setProfile(profile: Profile): void;
  sound(kind: 'coins' | 'denied' | 'pickup'): void;
}

const OUTCOME: Record<NonNullable<Expedition['result']>, string> = {great: '대성공', success: '성공', early: '조기 철수', failure: '실패'};
const CLASS: Record<Mercenary['cls'], string> = {tank: '기사 · 탱커', melee: '야만전사 · 근접', ranged: '사냥꾼 · 원거리', healer: '마법사 · 치유'};
const STATUS: Record<Mercenary['status'], string> = {ready: '대기', expedition: '원정 중', injured: '부상', dead: '전사'};
const TRAIT: Record<string, string> = {ironwall: '철벽', quickhands: '날쌘 손', veteran: '노련함', treasure: '보물 사냥꾼', coward: '겁쟁이', frail: '허약', slow: '굼뜸'};
const fmtDuration = (ms: number): string => `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')}`;

export class GuildPanel {
  private readonly root = byId('guildOverlay');
  private page: 'roster' | 'expeditions' = 'roster';
  private selectedMerc: number | null = null;
  private party = new Set<number>();
  private floor = 1;
  private retreat: RetreatRule = 'bag80';
  private lastTick = 0;

  constructor(private readonly cb: GuildPanelCallbacks) {
    byId('guildClose').addEventListener('click', () => this.show(false));
    byId('guildRosterTab').addEventListener('click', () => { this.page = 'roster'; this.render(); });
    byId('guildExpeditionTab').addEventListener('click', () => { this.page = 'expeditions'; this.render(); });
  }

  show(open: boolean): void {
    this.root.hidden = !open;
    if (open) {
      const profile = this.cb.getProfile();
      const advanced = advanceGuild(profile, Date.now());
      const refreshed = refreshCandidates(advanced.profile, Date.now());
      if (advanced.changed || refreshed !== advanced.profile) this.cb.setProfile(refreshed ?? advanced.profile);
      this.render();
    }
  }

  tick(now: number): void {
    if (now - this.lastTick < 1000) return;
    this.lastTick = now;
    const profile = this.cb.getProfile();
    const advanced = advanceGuild(profile, now);
    const refreshed = refreshCandidates(advanced.profile, now);
    if (advanced.changed || refreshed !== advanced.profile) this.cb.setProfile(refreshed ?? advanced.profile);
    if (!this.root.hidden) this.render();
  }

  private render(): void {
    const profile = this.cb.getProfile();
    byId('guildGold').textContent = `보유 금화 ${fmt(profile.gold)}G`;
    const body = byId('guildBody');
    byId('guildRosterTab').classList.toggle('on', this.page === 'roster');
    byId('guildExpeditionTab').classList.toggle('on', this.page === 'expeditions');
    body.replaceChildren(this.page === 'roster' ? this.renderRoster(profile) : this.renderExpeditions(profile));
  }

  private renderRoster(profile: Profile): HTMLElement {
    const wrap = el('div', 'guildLayout');
    const roster = el('section', 'guildSection');
    const barracks = levelOf(profile.upgrades, 'barracks.build') > 0;
    roster.append(el('h3', '', `용병단 명단 <small>${profile.mercenaries.length} / ${rosterLimit(profile)}</small>`));
    if (!barracks) roster.append(el('p', 'guildNote', '병영을 건설하면 용병단 정원을 늘릴 수 있습니다. 기본 정원은 4명입니다.'));
    for (const m of profile.mercenaries) {
      const card = el('button', `mercCard${this.selectedMerc === m.id ? ' selected' : ''}`);
      card.innerHTML = `<b>${m.name}</b><span>${CLASS[m.cls]}</span><span>Lv${m.level} · 경험치 ${m.xp} · 전투력 ${mercPower(m)}</span><span class="mercStatus ${m.status}">${STATUS[m.status]}${m.injuredUntil ? ` · ${fmtDuration(m.injuredUntil - Date.now())}` : ''}</span><small>${m.traits.map(t => TRAIT[t] ?? t).join(' · ') || '특성 없음'}</small>`;
      card.addEventListener('click', () => { this.selectedMerc = m.id; this.render(); });
      roster.append(card);
    }
    const selected = profile.mercenaries.find(m => m.id === this.selectedMerc) ?? profile.mercenaries[0];
    if (selected) roster.append(this.mercDetails(profile, selected));
    const market = el('section', 'guildSection');
    market.append(el('h3', '', '영입 후보 <small>원정 급여는 시작할 때 지불</small>'));
    const refresh = el('button', 'ghostBtn', `후보 갱신 · 35G`) as HTMLButtonElement;
    refresh.disabled = profile.gold < 35;
    refresh.addEventListener('click', () => {
      const next = refreshCandidates(this.cb.getProfile(), Date.now(), true);
      if (!next) { this.cb.sound('denied'); return; }
      this.cb.setProfile(next); this.cb.sound('coins'); this.render();
    });
    market.append(refresh);
    for (const candidate of profile.candidates) {
      const traits = candidate.traits.map(t => TRAIT[t] ?? t).join(' · ');
      const row = el('article', 'candidateCard');
      row.innerHTML = `<div><b>${candidate.name}</b><span>${CLASS[candidate.cls]} · Lv${candidate.level}</span><small>${traits}</small><small>전투력 ${candidatePower(candidate)}</small></div><button class="primaryBtn">영입 ${fmt(candidate.price)}G</button>`;
      const button = row.querySelector('button') as HTMLButtonElement;
      button.disabled = profile.mercenaries.length >= rosterLimit(profile) || profile.gold < candidate.price;
      button.addEventListener('click', () => {
        const next = hireCandidate(this.cb.getProfile(), candidate.id);
        if (!next) { this.cb.sound('denied'); return; }
        this.cb.setProfile(next); this.cb.sound('coins'); this.render();
      });
      market.append(row);
    }
    wrap.append(roster, market);
    return wrap;
  }

  private mercDetails(profile: Profile, merc: Mercenary): HTMLElement {
    const box = el('section', 'mercDetails');
    const head = el('div', 'mercDetailHead', `<b>${merc.name} 장비</b><span>원정 급여 ${mercSalary(merc)}G</span>`);
    box.append(head);
    const slots = [['weapon', '무기'], ['armor', '방어구'], ['trinket', '장신구'], ['belt0', '벨트 1'], ['belt1', '벨트 2']] as const;
    for (const [slot, label] of slots) {
      const row = el('div', 'mercEquipRow');
      row.append(el('span', '', label));
      const current = merc.equipment[slot];
      row.append(el('b', '', current ? itemDef(current).name : '비어 있음'));
      const eligible = profile.stash.items.filter(p => {
        const d = itemDef(p.item.defId);
        return slot === 'weapon' ? Boolean(d.weapon) : slot === 'armor' ? Boolean(d.armor) : slot === 'trinket' ? d.category === 'relic' : slot.startsWith('belt') ? Boolean(d.consumable) : false;
      });
      if (eligible.length) {
        const select = document.createElement('select');
        select.append(new Option('창고에서 장착…', ''));
        for (const p of eligible) select.append(new Option(itemDef(p.item.defId).name, String(p.item.uid)));
        select.addEventListener('change', () => {
          const next = equipMercenary(this.cb.getProfile(), merc.id, Number(select.value));
          if (next) { this.cb.setProfile(next); this.cb.sound('pickup'); this.render(); }
        });
        row.append(select);
      }
      box.append(row);
    }
    const dismiss = el('button', 'dangerBtn', '해고 · 장비는 창고로') as HTMLButtonElement;
    dismiss.disabled = merc.status === 'expedition' || merc.status === 'dead' || profile.mercenaries.length <= 1;
    dismiss.addEventListener('click', () => {
      const next = dismissMercenary(this.cb.getProfile(), merc.id);
      if (!next) { this.cb.sound('denied'); return; }
      this.selectedMerc = next.mercenaries[0]?.id ?? null;
      this.cb.setProfile(next); this.render();
    });
    box.append(dismiss);
    return box;
  }

  private renderExpeditions(profile: Profile): HTMLElement {
    const wrap = el('div', 'expeditionLayout');
    const board = el('section', 'guildSection');
    board.append(el('h3', '', '원정 게시판'));
    const floor = document.createElement('select');
    for (let f = 1; f <= profile.frontierFloor; f++) floor.append(new Option(`${f}층`, String(f)));
    floor.value = String(Math.min(this.floor, profile.frontierFloor));
    floor.addEventListener('change', () => { this.floor = Number(floor.value); this.render(); });
    const floorRow = el('label', 'boardField'); floorRow.append(el('span', '', '목표 층'), floor); board.append(floorRow);
    const active = profile.expeditions.some(e => !e.result);
    if (active) board.append(el('p', 'guildNote', '현재 원정대가 임무 중입니다. 귀환하면 다음 원정을 시작할 수 있습니다.'));
    const choices = el('div', 'partyChoices');
    const selected = profile.mercenaries.filter(m => this.party.has(m.id) && m.status === 'ready');
    for (const merc of profile.mercenaries) {
      const label = el('label', `partyChoice${merc.status !== 'ready' ? ' unavailable' : ''}`);
      const input = document.createElement('input'); input.type = 'checkbox'; input.checked = this.party.has(merc.id); input.disabled = merc.status !== 'ready' || (!input.checked && this.party.size >= 4);
      input.addEventListener('change', () => { input.checked ? this.party.add(merc.id) : this.party.delete(merc.id); this.render(); });
      label.append(input, el('span', '', `${merc.name} · ${CLASS[merc.cls]} · ${STATUS[merc.status]}`)); choices.append(label);
    }
    board.append(el('h4', '', `파티 구성 · ${selected.length}/4`), choices);
    const retreat = document.createElement('select');
    retreat.append(new Option('가방 80%면 철수 · 안전', 'bag80'), new Option('체력 50%면 철수', 'hp50'), new Option('끝까지 탐험 · 고위험', 'finish'));
    retreat.value = this.retreat;
    retreat.addEventListener('change', () => { this.retreat = retreat.value as RetreatRule; this.render(); });
    const retreatRow = el('label', 'boardField'); retreatRow.append(el('span', '', '철수 기준'), retreat); board.append(retreatRow);
    const estimate = estimateExpedition(selected, this.floor, this.retreat);
    const expected = el('div', `expeditionEstimate ${estimate.risk}`);
    expected.innerHTML = `<b>전투력 ${fmt(estimate.power)} / 권장 ${fmt(estimate.recommended)} · ${estimate.risk}</b><span>대성공 ${(estimate.great * 100).toFixed(0)}% · 성공 ${(estimate.success * 100).toFixed(0)}% · 조기 철수 ${(estimate.early * 100).toFixed(0)}% · 실패 ${(estimate.failure * 100).toFixed(0)}%</span><small>예상 소요 ${Math.round(expeditionDurationMs(this.floor) / 60_000)}분 · 급여 ${fmt(selected.reduce((s, m) => s + mercSalary(m), 0))}G</small>`;
    board.append(expected);
    const start = el('button', 'primaryBtn big', active ? '원정 중' : '원정 출발') as HTMLButtonElement;
    start.disabled = active || !selected.length || profile.gold < selected.reduce((s, m) => s + mercSalary(m), 0);
    start.addEventListener('click', () => {
      const next = startExpedition(this.cb.getProfile(), this.floor, selected.map(m => m.id), this.retreat, Date.now());
      if (!next) { this.cb.sound('denied'); return; }
      this.party.clear(); this.cb.setProfile(next); this.cb.sound('coins'); this.render();
    });
    board.append(start);
    const status = el('section', 'guildSection'); status.append(el('h3', '', '진행 중 · 귀환 기록'));
    for (const exp of [...profile.expeditions].reverse()) status.append(this.expeditionCard(profile, exp));
    if (!profile.expeditions.length) status.append(el('p', 'guildNote', '아직 원정 기록이 없습니다.'));
    wrap.append(board, status);
    return wrap;
  }

  private expeditionCard(profile: Profile, expedition: Expedition): HTMLElement {
    const card = el('article', `expeditionCard${expedition.result ? ' resolved' : ''}`);
    if (!expedition.result) {
      const left = Math.max(0, expedition.endsAt - Date.now());
      const ratio = Math.max(0, Math.min(1, (Date.now() - expedition.startedAt) / (expedition.endsAt - expedition.startedAt)));
      card.innerHTML = `<b>${expedition.floor}층 원정 · 진행 중 ${fmtDuration(left)}</b><div class="expeditionProgress"><i style="width:${ratio * 100}%"></i></div><small>${expedition.mercIds.map(id => profile.mercenaries.find(m => m.id === id)?.name ?? '알 수 없음').join(' · ')}</small>`;
      return card;
    }
    card.innerHTML = `<b>${expedition.floor}층 · ${OUTCOME[expedition.result]}</b><p>${expedition.message}</p><small>전리품 ${expedition.loot?.items.length ?? 0}종 · 남은 물품은 창고 공간에 맞춰 정리됩니다.</small>`;
    if (expedition.loot?.items.length) {
      const collect = el('button', 'primaryBtn', '전리품을 창고에 정리') as HTMLButtonElement;
      collect.addEventListener('click', () => {
        const next = collectLoot(this.cb.getProfile(), expedition.id);
        if (!next) { this.cb.sound('denied'); return; }
        this.cb.setProfile(next); this.cb.sound('pickup'); this.render();
      });
      card.append(collect);
      const items = el('div', 'lootSummary');
      for (const p of expedition.loot.items) items.append(el('span', '', `${itemDef(p.item.defId).name}${p.item.qty > 1 ? ` ×${p.item.qty}` : ''}`));
      card.append(items);
    } else card.append(el('small', 'guildNote', '창고로 옮길 전리품이 없습니다.'));
    return card;
  }
}
