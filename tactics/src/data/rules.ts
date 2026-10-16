// 규칙 수치 (tactics/DESIGN.md 2 · 3절). 시뮬레이션으로 다듬는다
import type { TileKind } from '../core/types';

/** 밀려서 벽 · 바위 · 다른 유닛에 부딪히면 (둘 다) */
export const COLLIDE_DMG = 2;
/** 용암에 들어가거나 서 있으면 */
export const LAVA_DMG = 8;
/** 불 칸에 들어가거나 서 있으면 */
export const FIRE_DMG = 2;
/** 독 늪에 서 있으면 매 턴 */
export const POISON_DMG = 1;
/** 불이 독 늪에 닿으면 3×3 폭발 */
export const GAS_DMG = 4;
/** 번개가 물을 타고 퍼지면 그 물 위의 모두에게 */
export const SHOCK_DMG = 3;

/** 불이 붙으면 타는 턴 */
export const FIRE_TURNS = 3;
export const STEAM_TURNS = 3;
/** 연막 두루마리의 연기 */
export const SMOKE_TURNS = 3;
/** 서리로 식은 용암 · 언 늪이 돌아가기까지 */
export const REVERT_TURNS = 3;
/** 서리가 물을 얼릴 때 그 위의 유닛 빙결 턴 */
export const FREEZE_ON_ICE = 2;

/** 조건이 모자란 능력치 1점마다 무기 공격 감소 */
export const SHORTFALL_PENALTY = 2;
/** 지팡이 · 활로 붙은 적을 치면 절반 */
export const POINT_BLANK_MULT = 0.5;

// 레벨
export const START_HP = 30;
export const HP_PER_LEVEL = 8;
/** 레벨 1의 기본 공격력 (무기 공격력에 더한다) */
export const BASE_ATK = 1;
export const ATK_PER_LEVEL = 1;
/** 레벨 n이 되는 데 필요한 누적 경험치 (index = 레벨 - 1) */
export const LEVEL_XP = [0, 8, 20, 36, 56, 80, 110, 145, 185, 230];
// 능력치의 무기와 상관없는 효과 (1을 넘는 1점마다, DESIGN.md 3절 ②)
/** 힘: 최대 체력 */
export const STR_HP = 3;
/** 민첩: 최소 피해 (최대를 넘지 않는다) */
export const DEX_MIN_DMG = 1;
/** 지능: 기술 재사용 대기 감소, 그래도 이보다 짧아지지 않는다 */
export const INT_CD = 1;
export const MIN_SKILL_CD = 2;
/** 지능 이만큼마다 연막 +1턴 */
export const INT_PER_ITEM_TURN = 2;

/** 맵을 깨면 최대 체력의 이 비율만큼 회복 */
export const CLEAR_HEAL = 0.2;

/** 걷기 · 적 이동에서 막힌 칸 */
export const SOLID: ReadonlySet<TileKind> = new Set(['rock']);

export const TILE_NAME: Record<TileKind, string> = {
  floor: '바닥',
  rock: '바위',
  pit: '구덩이',
  lava: '용암',
  ice: '얼음',
  water: '깊은 물',
  swamp: '독 늪',
  grass: '풀',
  stairs: '계단',
};
