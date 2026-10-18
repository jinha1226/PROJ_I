// 1단계용 수동 제작 맵. 방(rect)과 통로(선)를 파내는 방식으로 정의한다.
// 좁은 통로(폭 1)는 탱커가 길목을 막는 전술을 시험하기 위한 것이다.

export interface MapDef {
  width: number;
  height: number;
  rooms: [number, number, number, number][]; // x, y, w, h
  corridors: [number, number, number, number][]; // x1, y1, x2, y2 (수평 또는 수직)
  pillars: [number, number][];
  partyStart: [number, number][];
  spawns: { id: string; x: number; y: number }[];
  /** 내려가는 계단 (없으면 보스층) */
  stairs?: [number, number];
  /** 층 번호 (1부터) */
  depth?: number;
  /** 방의 역할. side = 곁가지 방 (자동 탐험이 들르지 않는다) */
  roles?: RoomRole[];
  /** 바닥 · 벽 색 */
  palette?: Palette;
  /** 상자 · 이벤트 */
  objects?: { kind: ObjectKind; x: number; y: number }[];
  /** 전장(배틀하트식 한 화면 방): 시야 제한 없음, 적은 웨이브로 문에서 들어온다 */
  arena?: boolean;
  waves?: string[][];
  /** 적이 들어오는 문 (타일 좌표) */
  gates?: [number, number][];
}

export type Palette = 'cave' | 'crypt' | 'nest' | 'ruins';
export type RoomRole = 'start' | 'main' | 'side' | 'end';
/** captive = 구출 계약의 목표 (마지막 방) */
export type ObjectKind = 'chest' | 'mimic' | 'fountain' | 'altar' | 'prisoner' | 'captive';

export const MAP1: MapDef = {
  width: 48,
  height: 29,
  rooms: [
    [1, 1, 8, 8], // A: 시작
    [15, 1, 12, 9], // B: 고블린 소굴
    [12, 14, 15, 9], // C: 오크 진영
    [34, 1, 13, 11], // D: 정령과 해골
    [30, 15, 17, 13], // E: 족장의 방
  ],
  corridors: [
    [9, 4, 14, 4], // A → B (폭 1)
    [20, 10, 20, 13], // B → C (폭 2)
    [21, 10, 21, 13],
    [27, 5, 33, 5], // B → D (폭 1)
    [27, 18, 29, 18], // C → E (폭 1)
    [40, 12, 40, 14], // D → E (폭 1)
  ],
  pillars: [
    [16, 17], [22, 17], [16, 20], [22, 20],
    [37, 4], [43, 8],
    [34, 19], [42, 19], [34, 24], [42, 24],
  ],
  partyStart: [[3, 4], [3, 5], [4, 4], [4, 5]],
  spawns: [
    { id: 'goblin', x: 18, y: 3 },
    { id: 'goblin', x: 20, y: 6 },
    { id: 'goblin', x: 17, y: 7 },
    { id: 'goblin_archer', x: 24, y: 2 },
    { id: 'goblin_archer', x: 25, y: 8 },

    { id: 'orc', x: 15, y: 16 },
    { id: 'orc', x: 23, y: 16 },
    { id: 'hyena', x: 19, y: 21 },
    { id: 'hyena', x: 20, y: 21 },
    { id: 'orc_shaman', x: 24, y: 21 },

    { id: 'fire_elemental', x: 38, y: 6 },
    { id: 'fire_elemental', x: 42, y: 5 },
    { id: 'fire_elemental', x: 44, y: 9 },
    { id: 'skeleton', x: 36, y: 9 },
    { id: 'skeleton', x: 45, y: 3 },

    { id: 'ogre_chief', x: 39, y: 22 },
    { id: 'orc', x: 36, y: 20 },
    { id: 'orc', x: 43, y: 26 },
    { id: 'orc_shaman', x: 44, y: 18 },
    { id: 'hyena', x: 41, y: 25 },
  ],
};
