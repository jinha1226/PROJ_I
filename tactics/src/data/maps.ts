// 1막 수제 맵 (tactics/DESIGN.md 10절 시제품 1). 나중에 무작위 생성으로 바꾼다
import type { EnemyKind, TileKind } from '../core/types';

export interface MapDef {
  name: string;
  clearXp: number;
  rows: string[];
}

/** 지형 글자 */
export const TILE_CHAR: Record<string, TileKind> = {
  '.': 'floor', '#': 'rock', _: 'pit', '~': 'lava', '=': 'ice', w: 'water', '%': 'swamp', ',': 'grass', '>': 'stairs',
};
/** 적 글자 (그 칸은 바닥) */
export const ENEMY_CHAR: Record<string, EnemyKind> = {
  g: 'goblin', a: 'archer', s: 'spearman', b: 'beetle', l: 'lizard', v: 'wolf', G: 'ogre', o: 'orc', p: 'priest',
};
export const HERO_CHAR = '@';

export const ACT1: MapDef[] = [
  {
    name: '용암 동굴 입구',
    clearXp: 6,
    rows: [
      '#..~~....#',
      '...~~..a..',
      '..g.......',
      '....##..s.',
      '.~~.......',
      '.~~...g...',
      '......##..',
      '..#.....~~',
      '>......@~~',
      '#........#',
    ],
  },
  {
    name: '얼음 틈',
    clearXp: 8,
    rows: [
      '..a.._....',
      '....___..g',
      '===.......',
      '===..l..==',
      '==b...====',
      '....w..===',
      '#..www....',
      '...ww..s..',
      '..@.....v>',
      '#........#',
    ],
  },
  {
    name: '풀숲과 늪',
    clearXp: 10,
    rows: [
      ',,,..a..,,',
      ',,l.....,,',
      ',,,..%%...',
      '....%%%.g.',
      'ww......,,',
      'ww..b..,,,',
      '..##...,l,',
      'a.....,,,,',
      '...@..vww>',
      '#.....www#',
    ],
  },
  {
    // 사제는 기둥 사이로 보이면 내리친다. 기둥 뒤를 따라 다가가면 시야가 끊긴다
    name: '오크 사제의 예배당',
    clearXp: 12,
    rows: [
      '#...p....#',
      '..#....#..',
      '....##....',
      '.o......o.',
      '..#....#..',
      '...#..#...',
      '..........',
      '.#..##..#.',
      '....@.....',
      '>........#',
    ],
  },
  {
    name: '오우거의 굴',
    clearXp: 20,
    rows: [
      '~~......~~',
      '~...G....~',
      '....##....',
      '..g....g..',
      '__......__',
      '_...##...a',
      '..........',
      '~~..b...~~',
      '~........~',
      '...#..#...',
      '....@.....',
      '##......##',
    ],
  },
];
