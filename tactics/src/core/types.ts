// 보드 전술 로그라이크의 상태. 함수 없이 순수 데이터만 둔다 (structuredClone으로 미리보기를 만든다)

export interface Vec {
  x: number;
  y: number;
}

export type TileKind = 'floor' | 'rock' | 'pit' | 'lava' | 'ice' | 'water' | 'swamp' | 'grass' | 'stairs';
export type Element = 'fire' | 'frost' | 'shock';

export interface Cell {
  tile: TileKind;
  /** 남은 불 턴 (0이면 불 없음) */
  fire: number;
  /** 남은 증기 턴. 원거리 공격이 지나가지 못한다 */
  steam: number;
  /** 남은 연기 턴. 시야 · 원거리 공격을 막는다 (연막 두루마리) */
  smoke: number;
  /** 식은 용암 · 언 늪처럼 몇 턴 뒤 원래 타일로 돌아간다 */
  revert?: { tile: TileKind; turns: number };
}

export type EnemyKind = 'goblin' | 'archer' | 'spearman' | 'beetle' | 'lizard' | 'wolf' | 'ogre' | 'orc' | 'priest';
export type ItemId = 'smoke';
export type StatId = 'str' | 'dex' | 'int';
export type WeaponId = 'sword' | 'axe' | 'spear' | 'hammer' | 'fireStaff' | 'frostStaff';

export interface Unit {
  id: number;
  /** 'hero'는 언제나 units[0] */
  kind: EnemyKind | 'hero';
  pos: Vec;
  hp: number;
  maxHp: number;
  dead: boolean;
  /** 빙결: 행동 못 함, 밀리면 멈출 때까지 미끄러진다 */
  frozen: number;
  /** 기절: 다음 한 번의 행동을 건너뛴다 */
  stunned: number;
  /** 깊은 물에 빠짐: 다음 한 번 움직이지 못한다 (공격은 한다) */
  stuck: number;
  /** 폭탄벌레의 도화선: 다음 턴 그 자리에서 터진다 (유일한 예고). 칸은 유닛 위치 기준이라 밀리면 같이 움직인다 */
  intent?: Vec;
  /** 오크 사제: 내리친 뒤 기도를 모으는 남은 턴 (0이면 내리칠 수 있다) */
  charge: number;
}

export interface HeroInfo {
  level: number;
  xp: number;
  /** 아직 고르지 않은 능력치 점수 (레벨업마다 1) */
  points: number;
  stats: Record<StatId, number>;
  weapon: WeaponId;
  spare: WeaponId | null;
  /** 무기 고유 기술의 남은 재사용 대기 */
  cooldown: Partial<Record<WeaponId, number>>;
  /** 든 소모품 (쓰면 사라진다) */
  items: ItemId[];
  hp: number;
  maxHp: number;
}

export interface LogLine {
  text: string;
  tone: 'hit' | 'hurt' | 'env' | 'info' | 'good';
}

export type BattleStatus = 'play' | 'dead' | 'cleared' | 'left';

export interface Battle {
  w: number;
  h: number;
  cells: Cell[];
  units: Unit[];
  nextId: number;
  hero: HeroInfo;
  turn: number;
  status: BattleStatus;
  mapName: string;
  clearXp: number;
  log: LogLine[];
}
