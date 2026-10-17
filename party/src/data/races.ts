// 종족: 능력치 보정 · 체력 · 저항과 '적성 스킬'(시작 +1, 레벨업마다 더 빨리 오름).
// 직업 제한은 없다 (DCSS 식). 어떤 조합이 잘 맞는지 찾는 게 빌드의 재미.
import type { ResistKey, SkillId } from '../sim/defs';

export type RaceId = 'human' | 'deep_elf' | 'halfling' | 'orc' | 'dwarf';

export interface RaceDef {
  id: RaceId;
  name: string;
  desc: string;
  str: number;
  dex: number;
  int: number;
  hp: number;
  mp: number;
  will: number;
  ac?: number;
  ev?: number;
  speed?: number;
  radius?: number;
  resists?: Partial<Record<ResistKey, number>>;
  /** 적성 스킬 */
  apt: SkillId[];
  names: string[];
}

export const RACES: Record<RaceId, RaceDef> = {
  human: {
    id: 'human', name: '인간', desc: '어느 직업이든 무난하다. 직업 스킬 모두에 약한 적성.',
    str: 0, dex: 0, int: 0, hp: 0, mp: 0, will: 0, apt: [],
    names: ['브론', '미라', '에단', '로웬', '하샤', '테오', '리아', '카일'],
  },
  deep_elf: {
    id: 'deep_elf', name: '딥엘프', desc: '지능과 의지력이 높고 마법에 적성. 몸이 약하다.',
    str: -2, dex: 1, int: 3, hp: -8, mp: 6, will: 6, apt: ['fire', 'ice', 'spellcasting'],
    names: ['엘라', '실바', '아엘', '나리엔', '페이', '이실'],
  },
  halfling: {
    id: 'halfling', name: '하플링', desc: '작고 날래다. 원거리 무기와 회피에 적성.',
    str: -2, dex: 3, int: 0, hp: -6, mp: 0, will: 2, ev: 2, speed: 0.1, radius: 0.31, apt: ['bow', 'dodge'],
    names: ['카이', '피핀', '로지', '토비', '메리', '밀로'],
  },
  orc: {
    id: 'orc', name: '오크', desc: '힘과 체력이 높고 근접 무기에 적성. 마법은 서툴다.',
    str: 3, dex: 0, int: -2, hp: 14, mp: -6, will: -2, apt: ['fighting', 'axe', 'mace'],
    names: ['그롬', '우르사', '가즈', '모그', '드라카'],
  },
  dwarf: {
    id: 'dwarf', name: '드워프', desc: '단단하고 의지가 굳다. 갑옷·방패·둔기에 적성. 느리다.',
    str: 1, dex: -1, int: 0, hp: 8, mp: 0, will: 5, ac: 1, speed: -0.2, resists: { neg: 1 }, apt: ['armour', 'shield', 'mace', 'faith'],
    names: ['토린', '브루나', '달그림', '헬가', '보르'],
  },
};

export const RACE_LIST = Object.values(RACES);
