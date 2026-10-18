// 시너지 (에스라봉식): 파티 4명의 직업 · 종족 조합에 따라 붙는 보너스.
// 원정 출발 때 멤버가 정해지면 끝까지 같다 — 그래서 거점에서 고를 때 미리 보여 준다.
import type { Prop } from '../sim/defs';
import type { ClassId } from './classes';
import type { RaceId } from './races';
import { RACES } from './races';

export interface SynergyDef {
  id: string;
  name: string;
  desc: string;
  color: string;
  /** 조건: 파티의 직업 · 종족 목록을 보고 판정 */
  test: (classes: ClassId[], races: RaceId[]) => boolean;
  /** 보너스를 받는 대상 (없으면 전원) */
  who?: (cls: ClassId, race: RaceId) => boolean;
  props: Prop[];
}

const count = <T,>(list: T[], f: (x: T) => boolean) => list.filter(f).length;
const FRONT: ClassId[] = ['warrior', 'berserker'];
const MAGE: ClassId[] = ['fire_mage', 'frost_mage'];

export const SYNERGIES: SynergyDef[] = [
  {
    id: 'shield_line', name: '전열 방진', color: '#e0b050', desc: '전사 · 광전사 2명 이상: 전열이 AC +3, 체력 +15',
    test: (c) => count(c, (x) => FRONT.includes(x)) >= 2, who: (c) => FRONT.includes(c),
    props: [{ kind: 'ac', v: 3 }, { kind: 'hp', v: 15 }],
  },
  {
    id: 'arcane', name: '마력 공명', color: '#ff8a5a', desc: '술사 2명 이상: 술사의 화염 · 냉기 위력 +20%, 시전 속도 +15%',
    test: (c) => count(c, (x) => MAGE.includes(x)) >= 2, who: (c) => MAGE.includes(c),
    props: [{ kind: 'power', school: 'fire', v: 20 }, { kind: 'power', school: 'ice', v: 20 }, { kind: 'castSpeed', v: 15 }],
  },
  {
    id: 'pack', name: '사냥 무리', color: '#7fd06a', desc: '사냥꾼 2명 이상: 사냥꾼 평타 피해 +20%, 명중 +3',
    test: (c) => count(c, (x) => x === 'hunter') >= 2, who: (c) => c === 'hunter',
    props: [{ kind: 'weaponDmg', v: 20 }, { kind: 'acc', v: 3 }],
  },
  {
    id: 'faith', name: '신앙의 합창', color: '#f2f2ff', desc: '사제 2명 이상: 사제 신앙 위력 +25%, 파티 전원 의지 +3',
    test: (c) => count(c, (x) => x === 'priest') >= 2,
    props: [{ kind: 'will', v: 3 }],
  },
  {
    id: 'balanced', name: '균형 진형', color: '#9cd0ff', desc: '탱커 · 치유사 · 원거리(또는 술사)가 다 있으면: 전원 회피 +2, 의지 +2',
    test: (c) => c.includes('warrior') && c.includes('priest') && c.some((x) => x === 'hunter' || MAGE.includes(x)),
    props: [{ kind: 'ev', v: 2 }, { kind: 'will', v: 2 }],
  },
  {
    id: 'steam', name: '얼음과 불', color: '#c8b0ff', desc: '화염술사 + 서리술사: 둘 다 화염 · 냉기 저항 +1',
    test: (c) => c.includes('fire_mage') && c.includes('frost_mage'), who: (c) => MAGE.includes(c),
    props: [{ kind: 'resist', key: 'fire', v: 1 }, { kind: 'resist', key: 'cold', v: 1 }],
  },
  // 동족: 같은 종족 2명 이상이면 그 종족끼리
  ...(Object.keys(RACES) as RaceId[]).map((r): SynergyDef => {
    const bonus: Record<RaceId, [string, Prop[]]> = {
      human: ['체력 +10, 의지 +2', [{ kind: 'hp', v: 10 }, { kind: 'will', v: 2 }]],
      deep_elf: ['지능 +2, 마나 +8', [{ kind: 'stat', stat: 'int', v: 2 }, { kind: 'mp', v: 8 }]],
      halfling: ['회피 +3, 민첩 +1', [{ kind: 'ev', v: 3 }, { kind: 'stat', stat: 'dex', v: 1 }]],
      orc: ['힘 +2, 체력 +10', [{ kind: 'stat', stat: 'str', v: 2 }, { kind: 'hp', v: 10 }]],
      dwarf: ['AC +2, 의지 +3', [{ kind: 'ac', v: 2 }, { kind: 'will', v: 3 }]],
    };
    return {
      id: `kin_${r}`, name: `${RACES[r].name} 동족`, color: '#d8c890', desc: `${RACES[r].name} 2명 이상: ${RACES[r].name}끼리 ${bonus[r][0]}`,
      test: (_c, rs) => count(rs, (x) => x === r) >= 2, who: (_c, race) => race === r, props: bonus[r][1],
    };
  }),
];

export function activeSynergies(party: { cls: ClassId; race: RaceId }[]): SynergyDef[] {
  const cs = party.map((h) => h.cls), rs = party.map((h) => h.race);
  return SYNERGIES.filter((s) => s.test(cs, rs));
}

/** 이 영웅이 받는 시너지 보너스 */
export function synergyProps(party: { cls: ClassId; race: RaceId }[], me: { cls: ClassId; race: RaceId }): Prop[] {
  const out: Prop[] = [];
  for (const s of activeSynergies(party)) {
    if (s.who && !s.who(me.cls, me.race)) continue;
    out.push(...s.props);
    // 신앙의 합창: 신앙 위력은 사제만
    if (s.id === 'faith' && me.cls === 'priest') out.push({ kind: 'power', school: 'faith', v: 25 });
  }
  return out;
}
