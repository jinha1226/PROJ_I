// 데이터 정의 타입. 새 직업/마법/몬스터/상태이상은 src/data 의 데이터 추가만으로 확장한다.

export type Element = 'physical' | 'fire' | 'cold' | 'elec' | 'poison' | 'neg' | 'holy';
export type ResistKey = 'fire' | 'cold' | 'elec' | 'poison' | 'neg';
export const RESIST_KEYS: ResistKey[] = ['fire', 'cold', 'elec', 'poison', 'neg'];

export type SkillId =
  | 'fighting' | 'sword' | 'axe' | 'mace' | 'spear' | 'bow'
  | 'armour' | 'dodge' | 'shield'
  | 'spellcasting' | 'fire' | 'ice' | 'earth' | 'necro' | 'summon' | 'faith';

export type StatusId = 'burn' | 'poison' | 'slow' | 'stun' | 'taunted' | 'guarded' | 'protected' | 'might';
export type TacticId = 'aggressive' | 'defensive' | 'ranged' | 'support';
export type TargetPref = 'nearest' | 'threat' | 'backline' | 'weakest';
export type Role = 'tank' | 'melee' | 'ranged' | 'caster' | 'support';
export type Faction = 'party' | 'enemy';

export interface StatusApply {
  status: StatusId;
  duration: number;
  chance?: number;
  stacks?: number;
  /** true 면 시전자 주문력 vs 대상 의지력 판정을 거친다 */
  will?: boolean;
}

export interface WeaponDef {
  name: string;
  skill: SkillId;
  damage: [number, number];
  /** 공격 간격(초) */
  delay: number;
  /** 사거리(타일). 근접은 0.5 내외 */
  range: number;
  element?: Element;
  projectile?: { speed: number; color: string };
  onHit?: StatusApply;
}

export type Effect =
  | { kind: 'damage'; element: Element; base: [number, number]; scale: number }
  | { kind: 'weapon'; mult: number }
  | { kind: 'heal'; base: [number, number]; scale: number }
  | ({ kind: 'status' } & StatusApply)
  | { kind: 'cleanse' }
  | { kind: 'taunt'; duration: number };

export type AbilityTarget = 'enemy' | 'ally' | 'self' | 'ground';
export type AiRole = 'damage' | 'heal' | 'cleanse' | 'disable' | 'buff' | 'taunt' | 'charge';

export interface AbilityDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  color: string;
  type: 'spell' | 'technique';
  /** 위력/실패율에 관여하는 스킬 */
  schools?: SkillId[];
  /** 마법 난이도 (실패율 계산) */
  level?: number;
  cost: number;
  castTime: number;
  cooldown: number;
  range: number;
  minRange?: number;
  target: AbilityTarget;
  /** 범위 반경. target=self 이면 시전자 중심 */
  radius?: number;
  /** 범위 효과 대상. 'all' = 아군 피해 있음 */
  affects?: 'enemies' | 'allies' | 'all';
  projectile?: { speed: number; color: string };
  /** 대상에게 돌진한 뒤 효과 적용 */
  dash?: boolean;
  effects: Effect[];
  /** 시전자 자신에게 적용 */
  selfEffects?: Effect[];
  aiRole: AiRole;
}

export interface StatusDef {
  id: StatusId;
  name: string;
  icon: string;
  color: string;
  harmful: boolean;
  stacking: 'refresh' | 'intensity';
  maxStacks?: number;
  /** 원소 저항으로 판정 (화상=화염, 중독=독) */
  resist?: ResistKey;
  /** 이 태그를 가진 유닛은 면역 */
  immuneTag?: string;
  dot?: { element: Element; perSecond: number };
  mods?: {
    moveMult?: number;
    actionMult?: number;
    ac?: number;
    ev?: number;
    dmgMult?: number;
    dmgTakenMult?: number;
  };
  stun?: boolean;
  /** AI 정화 우선도 */
  severity: number;
}

export interface UnitDef {
  id: string;
  name: string;
  /** 예: '인간 전사' (종족 + 직업) */
  title: string;
  glyph: string;
  color: string;
  role: Role;
  radius: number;
  mass: number;
  speed: number;
  hp: number;
  mp: number;
  str: number;
  dex: number;
  int: number;
  ac: number;
  ev: number;
  will: number;
  resists?: Partial<Record<ResistKey, number>>;
  /** 'unstunnable', 'mindless' 등 */
  tags?: string[];
  skills?: Partial<Record<SkillId, number>>;
  weapon: WeaponDef;
  armourWeight?: number;
  abilities: string[];
  tactic: TacticId;
  targetPref: TargetPref;
  sight?: number;
  boss?: boolean;
}
