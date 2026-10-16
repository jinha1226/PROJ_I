// 보드 전술 로그라이크의 상태. 함수 없이 순수 데이터만 둔다 (structuredClone으로 미리보기를 만든다)

export interface Vec {
  x: number;
  y: number;
}

export type TileKind = 'floor' | 'rock' | 'pit' | 'lava' | 'ice' | 'water' | 'swamp' | 'grass' | 'stairs';
export type Element = 'fire' | 'frost' | 'shock';
/** 피해 범위 [최소, 최대]. 명중은 늘 하고 크기만 이 안에서 정해진다 */
export type DmgRange = readonly [number, number];
/**
 * 피해 굴림 방식. random: 실제 게임 / min · max: 미리보기의 양 끝 /
 * avg: 봇이 수를 읽을 때 / worst: 나에게 가장 나쁜 쪽 (내 공격은 최소, 적 공격은 최대)
 */
export type RollMode = 'random' | 'min' | 'max' | 'avg' | 'worst';

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
export type ItemId = 'heal' | 'fireBomb' | 'frostBomb' | 'smoke' | 'blink' | 'repel' | 'identify';
/** 소모품 쓰는 법: 물약은 마시거나 던지고, 두루마리는 읽는다 */
export type UseHow = 'drink' | 'throw' | 'read';
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
  /** 궁수 · 사제: 물러선 뒤 다시 물러서지 못하는 남은 턴 */
  retreat: number;
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
  /** 정체를 아는 소모품 종류 (한 번 쓰거나 감정하면 판 끝까지) */
  known: ItemId[];
  /** 이 판에서 모르는 소모품이 보이는 이름 (물약 색 · 두루마리 글자) */
  names: Record<ItemId, string>;
  /** 무기 강화 (보상). 그 무기 공격력에 더한다 */
  enchant: Partial<Record<WeaponId, number>>;
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
  /** 피해 굴림 난수 상태 (상태 안에 있어서 복제 · 재현된다) */
  seed: number;
  roll: RollMode;
}
