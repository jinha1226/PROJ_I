// 데이터 정의 타입. 새 직업/마법/몬스터/상태이상은 src/data 의 데이터 추가만으로 확장한다.

export type Element = 'physical' | 'fire' | 'cold' | 'elec' | 'poison' | 'neg' | 'holy';
export type ResistKey = 'fire' | 'cold' | 'elec' | 'poison' | 'neg';
export const RESIST_KEYS: ResistKey[] = ['fire', 'cold', 'elec', 'poison', 'neg'];

export type SkillId =
  | 'fighting' | 'sword' | 'axe' | 'mace' | 'spear' | 'bow'
  | 'armour' | 'dodge' | 'shield'
  | 'spellcasting' | 'fire' | 'ice' | 'earth' | 'necro' | 'summon' | 'faith';

export type StatusId = 'burn' | 'poison' | 'slow' | 'stun' | 'taunted' | 'guarded' | 'protected' | 'might' | 'fear';
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
  /** 'auto' = 딜·힐 로테이션 기술: 직접 조종(기본)에서도 AI 가 알아서 쓴다. 나머지는 플레이어의 판단 */
  control?: 'auto';
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
  /** 스킬바에 나오지 않고 자동전투에서만 쓰는 능력 */
  autoAbilities?: string[];
  tactic: TacticId;
  targetPref: TargetPref;
  sight?: number;
  boss?: boolean;
  /** 처치 경험치 (몬스터) */
  xp?: number;
  /** 레벨당 체력/마나 증가 (파티) */
  levelHp?: number;
  levelMp?: number;
  /** 시작 장비의 기본 아이템 id (파티) */
  gear?: Partial<Record<ItemSlot, string>>;
  /** 직업 스킬: 레벨업마다 저절로 오른다 (장착 무기의 스킬도) */
  classSkills?: SkillId[];
  /** 직업 · 종족 id (파티) — 특성 선택지 · 종족 특성 조회용 */
  cls?: string;
  race?: string;
  /** 종족 특성 (파티) */
  traits?: Prop[];
}

// ── 장비 ──
export type ItemSlot = 'weapon' | 'armour' | 'jewel';
export type Rarity = 'common' | 'magic' | 'artifact';

/** 장비 속성. 장비와 레벨업 보너스가 같은 형식을 쓴다 */
export type Prop =
  | { kind: 'resist'; key: ResistKey; v: number }
  | { kind: 'stat'; stat: 'str' | 'dex' | 'int'; v: number }
  | { kind: 'ac' | 'ev' | 'will' | 'hp' | 'mp' | 'acc'; v: number }
  /** 해당 계열 기술의 위력 % */
  | { kind: 'power'; school: SkillId; v: number }
  /** 시전 속도 % */
  | { kind: 'castSpeed'; v: number }
  /** 평타 피해 % */
  | { kind: 'weaponDmg'; v: number }
  | { kind: 'onHit'; apply: StatusApply }
  | { kind: 'tag'; tag: string };

export interface ItemBase {
  id: string;
  name: string;
  slot: ItemSlot;
  /** 무기 */
  weapon?: Omit<WeaponDef, 'name'>;
  /** 갑옷: AC 와 무게 (무게는 회피 감소·마법 실패율 증가) */
  ac?: number;
  weight?: number;
  /** 드롭 가중치 */
  weightDrop?: number;
}

export interface Item {
  uid: number;
  base: ItemBase;
  name: string;
  rarity: Rarity;
  /** 강화 수치 (무기: 피해·명중, 갑옷: AC) */
  plus: number;
  props: Prop[];
}
