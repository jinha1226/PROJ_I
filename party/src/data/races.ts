// 종족: 능력치 보정 · 체력 · 저항과 고유 특성 하나.
// 직업 제한은 없다. 어떤 조합이 잘 맞는지 찾는 게 빌드의 재미.
import type { Prop, ResistKey } from '../sim/defs';

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
  /** 고유 특성 (이름 · 설명 · 효과) */
  trait: { name: string; desc: string; props: Prop[] };
  names: string[];
}

export const RACES: Record<RaceId, RaceDef> = {
  human: {
    id: 'human', name: '인간', desc: '어느 직업이든 무난하다. 빨리 배운다.',
    str: 0, dex: 0, int: 0, hp: 0, mp: 0, will: 0,
    trait: { name: '빠른 배움', desc: '경험치 +15% — 특성을 더 일찍 고른다', props: [{ kind: 'tag', tag: 'quick_learner' }] },
    names: ['브론', '미라', '에단', '로웬', '하샤', '테오', '리아', '카일'],
  },
  deep_elf: {
    id: 'deep_elf', name: '딥엘프', desc: '지능과 의지력이 높고 마법에 능하다. 몸이 약하다.',
    str: -2, dex: 1, int: 3, hp: -8, mp: 6, will: 6,
    trait: { name: '마나의 혈통', desc: '마나 회복 +60%', props: [{ kind: 'tag', tag: 'mana_flow' }] },
    names: ['엘라', '실바', '아엘', '나리엔', '페이', '이실'],
  },
  halfling: {
    id: 'halfling', name: '하플링', desc: '작고 날래다. 낙천적이라 쉽게 무너지지 않는다.',
    str: -2, dex: 3, int: 0, hp: -6, mp: 0, will: 2, ev: 2, speed: 0.1, radius: 0.31,
    trait: { name: '낙천가', desc: '스트레스를 40% 덜 받는다', props: [{ kind: 'tag', tag: 'stress_ward' }] },
    names: ['카이', '피핀', '로지', '토비', '메리', '밀로'],
  },
  orc: {
    id: 'orc', name: '오크', desc: '힘과 체력이 높고 싸움을 즐긴다. 마법은 서툴다.',
    str: 3, dex: 0, int: -2, hp: 14, mp: -6, will: -2,
    trait: { name: '피의 갈증', desc: '적을 쓰러뜨리면 최대 체력의 8% 회복', props: [{ kind: 'tag', tag: 'bloodlust' }] },
    names: ['그롬', '우르사', '가즈', '모그', '드라카'],
  },
  dwarf: {
    id: 'dwarf', name: '드워프', desc: '단단하고 의지가 굳다. 느리다.',
    str: 1, dex: -1, int: 0, hp: 8, mp: 0, will: 5, ac: 1, speed: -0.2, resists: { neg: 1 },
    trait: { name: '바위 같은 몸', desc: '기절 시간 절반, 음에너지 저항', props: [{ kind: 'tag', tag: 'sturdy' }] },
    names: ['토린', '브루나', '달그림', '헬가', '보르'],
  },
};

export const RACE_LIST = Object.values(RACES);
