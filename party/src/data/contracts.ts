// 계약: 원정의 목적. 거점 게시판에 몇 개가 걸리고, 하나를 골라 떠난다.
// 층 수 · 시작 깊이(난이도) · 적 성향 · 보상이 다르다. 마지막 층을 끝내면(또는 보스를 쓰러뜨리면) 완수.
export type ContractKind = 'purge' | 'rescue' | 'treasure' | 'crypt' | 'hunt';

export interface ContractDef {
  kind: ContractKind;
  name: string;
  /** 게시판 문구 */
  desc: string;
  floors: number;
  /** 첫 층의 난이도 깊이 (1 = 가장 얕음). 층마다 1씩 깊어진다 */
  startDepth: number;
  /** 마지막 층에 보스 */
  boss: boolean;
  /** 자주 나오는 몬스터 (방마다 무리를 고를 때 이들이 많은 무리를 선호) */
  theme?: string[];
  themeName?: string;
  /** 곁가지 방 수 (기본 1~2) */
  sides?: [number, number];
  /** 스트레스 배율 */
  stress?: number;
  /** 완수 보상 골드 */
  reward: number;
  /** 완수 추가 보상 */
  bonus?: 'recruit' | 'artifact';
  /** 위험도 1~3 (게시판 별) */
  danger: number;
  /** 게시판에 걸리려면 다녀온 원정 수 */
  minExpeditions?: number;
}

const GREENSKIN = ['goblin', 'goblin_archer', 'orc', 'orc_shaman', 'hyena'];
const UNDEAD = ['skeleton', 'fire_elemental'];

export const CONTRACTS: Record<ContractKind, ContractDef> = {
  purge: {
    kind: 'purge', name: '고블린 소굴 소탕', danger: 1, floors: 2, startDepth: 1, boss: false, reward: 160,
    theme: GREENSKIN, themeName: '고블린 · 오크',
    desc: '마을 근처 굴에 고블린이 들끓는다. 짧고 비교적 안전하다 — 신입을 데려가기 좋다.',
  },
  rescue: {
    kind: 'rescue', name: '실종된 용병 구출', danger: 2, floors: 3, startDepth: 1, boss: false, reward: 180, bonus: 'recruit',
    theme: GREENSKIN, themeName: '고블린 · 오크',
    desc: '다른 용병단의 생존자가 깊은 곳에 붙잡혀 있다. 마지막 층에서 구해 오면 우리 용병단에 합류한다.',
  },
  treasure: {
    kind: 'treasure', name: '잊힌 보물고 탐색', danger: 2, floors: 3, startDepth: 2, boss: false, reward: 120, bonus: 'artifact',
    sides: [2, 3], stress: 1.2,
    desc: '곁방이 많고 상자가 많다. 미믹도 많다. 어둠 속을 오래 헤매야 해서 스트레스가 더 쌓인다. 완수하면 아티팩트 하나.',
  },
  crypt: {
    kind: 'crypt', name: '저주받은 지하묘지 정화', danger: 3, floors: 3, startDepth: 3, boss: false, reward: 380,
    theme: UNDEAD, themeName: '해골 · 정령', stress: 1.35, minExpeditions: 1,
    desc: '해골과 정령이 들끓는 깊은 묘지. 독과 냉기가 잘 통하지 않고 공포가 서린다. 보상이 크다.',
  },
  hunt: {
    kind: 'hunt', name: '오우거 족장 토벌', danger: 3, floors: 5, startDepth: 1, boss: true, reward: 600,
    desc: '던전 가장 깊은 곳의 오우거 족장을 쓰러뜨린다. 긴 원정 — 중간에 귀환할 수도 있다.',
  },
};

/** 원정 하나의 계약 (저장되는 형태) */
export interface Contract {
  kind: ContractKind;
  seed: number;
}
