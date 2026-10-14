export type BuildingId = 'tent' | 'blacksmith' | 'alchemist' | 'market' | 'tavern' | 'barracks' | 'command';

export interface Cost {
  gold: number;
  items: readonly (readonly [defId: string, qty: number])[];
}

/**
 * One node of the hideout tree. Buildings are nodes too (`<building>.build`),
 * so "build the blacksmith" and "sharpen blades Lv3" use the same rules.
 */
export interface UpgradeNode {
  id: string;
  building: BuildingId;
  name: string;
  maxLevel: number;
  /** Effect text for a given level (1-based). */
  effect: (level: number) => string;
  /** Cost to reach `level` (1-based). */
  cost: (level: number) => Cost;
  requires?: {node: string; level: number};
  /** Shown but not purchasable yet (skills, mercenaries, automation). */
  comingSoon?: boolean;
}

export interface BuildingDef {
  id: BuildingId;
  name: string;
  desc: string;
  /** Hex pack model when built. */
  model: string;
}

export const BUILDINGS: readonly BuildingDef[] = [
  {id: 'tent', name: '야영 텐트', desc: '창고와 출정 장비를 정리하고 상인과 거래한다.', model: 'tent'},
  {id: 'blacksmith', name: '대장간', desc: '무기를 벼리고, 새 무기와 갑옷을 제작한다.', model: 'building_blacksmith_red'},
  {id: 'alchemist', name: '연금술사의 탑', desc: '물약과 기름을 만들고 몸을 단련하는 비약을 연구한다.', model: 'building_tower_A_red'},
  {id: 'market', name: '시장', desc: '더 큰 가방과 창고, 그리고 더 좋은 시세.', model: 'building_market_red'},
  {id: 'tavern', name: '여관 · 보급소', desc: '랜턴 기름과 비상 귀환 준비를 담당한다.', model: 'building_tavern_red'},
  {id: 'barracks', name: '병영', desc: '체력 단련과 전투 기술. 훗날 용병을 고용한다.', model: 'building_barracks_red'},
  {id: 'command', name: '지휘탑', desc: '수색 기술과 행운, 그리고 자동 원정 체계.', model: 'building_castle_red'},
];

/** Picks the entry for a 1-based level, clamped to the last tier. */
const tiered = <T>(level: number, tiers: readonly T[]): T => tiers[Math.min(tiers.length, Math.max(1, level)) - 1];
const pct = (v: number): string => `${Math.round(v * 100)}%`;
const linear = (gold: number, items: (level: number) => Cost['items']) => (level: number): Cost => ({gold: gold * level, items: items(level)});
const fixed = (cost: Cost) => (): Cost => cost;
const build = (building: BuildingId, cost: Cost): UpgradeNode => ({
  id: `${building}.build`,
  building,
  name: '건설',
  maxLevel: 1,
  effect: () => '건물을 짓고 이 건물의 기술을 연다.',
  cost: fixed(cost),
});
const soon = (id: string, building: BuildingId, name: string, effect: string, requires: string): UpgradeNode => ({
  id,
  building,
  name,
  maxLevel: 1,
  effect: () => effect,
  cost: fixed({gold: 0, items: []}),
  requires: {node: requires, level: 1},
  comingSoon: true,
});

export const NODES: readonly UpgradeNode[] = [
  // 대장간
  build('blacksmith', {gold: 200, items: [['iron_scrap', 5]]}),
  {id: 'blacksmith.sharpen', building: 'blacksmith', name: '날 세우기', maxLevel: 5, effect: l => `공격력 +${pct(0.06 * l)}`, cost: linear(120, l => [['iron_scrap', 2 + l]]), requires: {node: 'blacksmith.build', level: 1}},
  {id: 'blacksmith.crit', building: 'blacksmith', name: '치명 일격', maxLevel: 3, effect: l => `치명타 확률 +${pct(0.04 * l)}`, cost: linear(200, l => [['iron_scrap', 3], ['bone_dust', 2 * l]]), requires: {node: 'blacksmith.sharpen', level: 2}},
  {id: 'blacksmith.weapons', building: 'blacksmith', name: '무기 제작', maxLevel: 3, effect: l => ['해골 장검 제작', '해골 도끼 제작', '기사의 대검 제작'].slice(0, l).join(' · '), cost: l => tiered<Cost>(l, [{gold: 150, items: [['iron_scrap', 4]]}, {gold: 300, items: [['iron_scrap', 8]]}, {gold: 600, items: [['iron_scrap', 12], ['mana_crystal', 1]]}]), requires: {node: 'blacksmith.build', level: 1}},
  {id: 'blacksmith.armor', building: 'blacksmith', name: '갑옷 제작', maxLevel: 2, effect: l => ['가죽 갑옷 제작', '기사 판금 갑옷 제작'].slice(0, l).join(' · '), cost: l => tiered<Cost>(l, [{gold: 150, items: [['ancient_silk', 2]]}, {gold: 500, items: [['iron_scrap', 10]]}]), requires: {node: 'blacksmith.weapons', level: 1}},
  // 연금술사의 탑
  build('alchemist', {gold: 300, items: [['bone_dust', 6], ['dusty_bottle', 2]]}),
  {id: 'alchemist.brewing', building: 'alchemist', name: '조제', maxLevel: 1, effect: () => '붕대 · 치유 물약 · 기름병 제작', cost: fixed({gold: 100, items: [['bone_dust', 3]]}), requires: {node: 'alchemist.build', level: 1}},
  {id: 'alchemist.potency', building: 'alchemist', name: '강화 물약', maxLevel: 3, effect: l => `회복량 +${pct(0.2 * l)}`, cost: linear(150, l => [['mana_crystal', l]]), requires: {node: 'alchemist.brewing', level: 1}},
  {id: 'alchemist.vitality', building: 'alchemist', name: '활력', maxLevel: 5, effect: l => `최대 체력 +${10 * l}`, cost: linear(120, l => [['bone_dust', 2 + l]]), requires: {node: 'alchemist.build', level: 1}},
  // 시장
  build('market', {gold: 250, items: [['silverware', 1]]}),
  {id: 'market.bag', building: 'market', name: '가방 확장', maxLevel: 4, effect: l => `가방 +${l}줄`, cost: linear(200, l => [['ancient_silk', l + 1]]), requires: {node: 'market.build', level: 1}},
  {id: 'market.stash', building: 'market', name: '창고 확장', maxLevel: 3, effect: l => `창고 +${2 * l}줄`, cost: linear(150, l => [['iron_scrap', 2 * l]]), requires: {node: 'market.build', level: 1}},
  {id: 'market.haggle', building: 'market', name: '흥정', maxLevel: 3, effect: l => `판매가 +${pct(0.05 * l)}`, cost: linear(300, l => [['candelabra', l]]), requires: {node: 'market.build', level: 1}},
  {id: 'market.recruit', building: 'market', name: '용병 알선망', maxLevel: 3, effect: l => `후보 ${3 + (l >= 2 ? 1 : 0)}명 · 후보 질 향상 ${l}단계`, cost: linear(350, l => [['silverware', 1], ['ancient_silk', l]]), requires: {node: 'market.build', level: 1}},
  // 여관 · 보급소
  build('tavern', {gold: 250, items: [['old_keg', 1], ['lamp_oil', 2]]}),
  {id: 'tavern.tank', building: 'tavern', name: '큰 기름통', maxLevel: 5, effect: l => `랜턴 기름 용량 +${pct(0.1 * l)}`, cost: linear(120, l => [['lamp_oil', 1], ['iron_scrap', l]]), requires: {node: 'tavern.build', level: 1}},
  {id: 'tavern.wick', building: 'tavern', name: '심지 손질', maxLevel: 3, effect: l => `기름 소모 -${pct(0.08 * l)}`, cost: linear(200, l => [['ancient_silk', l]]), requires: {node: 'tavern.build', level: 1}},
  {id: 'tavern.emergency', building: 'tavern', name: '비상 귀환', maxLevel: 3, effect: l => `기름 소진 시 손실 50% → ${[35, 20, 10][l - 1]}%`, cost: linear(300, l => [['broken_crest', l]]), requires: {node: 'tavern.tank', level: 1}},
  // 병영
  build('barracks', {gold: 400, items: [['bone_dust', 10], ['iron_scrap', 10]]}),
  {id: 'barracks.roster', building: 'barracks', name: '용병단 정원', maxLevel: 6, effect: l => `최대 용병 ${4 + l}명`, cost: linear(260, l => [['iron_scrap', 2 + l], ['bone_dust', l]]), requires: {node: 'barracks.build', level: 1}},
  {id: 'barracks.endurance', building: 'barracks', name: '지구력', maxLevel: 5, effect: l => `최대 스태미나 +${8 * l}`, cost: linear(150, l => [['bone_dust', 2 * l]]), requires: {node: 'barracks.build', level: 1}},
  soon('barracks.whirlwind', 'barracks', '회전베기', '주변 적을 모두 베는 스킬', 'barracks.build'),
  soon('barracks.dash', 'barracks', '돌진베기', '전방으로 돌진하며 베는 스킬', 'barracks.build'),
  soon('barracks.warcry', 'barracks', '전투 함성', '잠시 공격력·방어력 상승', 'barracks.build'),
  soon('barracks.mercenary', 'barracks', '용병 고용', '레이드에 동료를 데려간다', 'barracks.build'),
  // 지휘탑
  build('command', {gold: 1000, items: [['lich_keyring', 1]]}),
  {id: 'command.search', building: 'command', name: '숙련 수색', maxLevel: 5, effect: l => `루팅 속도 +${pct(0.15 * l)}`, cost: linear(250, l => [['bone_dust', 2 * l]]), requires: {node: 'command.build', level: 1}},
  {id: 'command.thorough', building: 'command', name: '꼼꼼한 수색', maxLevel: 3, effect: l => `루팅 양 +${pct(0.1 * l)}`, cost: linear(400, l => [['silverware', l]]), requires: {node: 'command.build', level: 1}},
  {id: 'command.luck', building: 'command', name: '행운', maxLevel: 3, effect: l => `희귀 드랍률 +${pct(0.15 * l)}`, cost: linear(500, l => [['ruby', l]]), requires: {node: 'command.search', level: 1}},


  {
    id: 'command.autoReturn',
    building: 'command',
    name: '자동 귀환',
    maxLevel: 3,
    effect: l => (l === 1 ? '기름이 아슬아슬해지면 가장 가까운 탈출구로 스스로 걸어간다' : `출발 여유 ${['', '', '-13%', '-23%'][l]} (더 오래 머문 뒤 출발)`),
    cost: l => tiered<Cost>(l, [{gold: 300, items: [['lamp_oil', 3]]}, {gold: 600, items: [['lamp_oil', 3], ['ancient_silk', 2]]}, {gold: 1000, items: [['mana_crystal', 2]]}]),
    requires: {node: 'command.build', level: 1},
  },
  {
    id: 'command.autoExplore',
    building: 'command',
    name: '자동 탐험',
    maxLevel: 3,
    effect: l => ['상자·방을 스스로 돌며 루팅 (적을 만나면 멈춤)', '가방이 차면 칸당 가치 낮은 물건과 교체', '스태미나가 넉넉하면 달려서 이동 · 소모품은 빈 벨트에 장착'].slice(0, l).join(' · '),
    cost: l => tiered<Cost>(l, [{gold: 500, items: [['silverware', 1], ['lamp_oil', 2]]}, {gold: 800, items: [['ancient_silk', 3]]}, {gold: 1200, items: [['mana_crystal', 2]]}]),
    requires: {node: 'command.autoReturn', level: 1},
  },
  {
    id: 'command.autoBattle',
    building: 'command',
    name: '자동 전투',
    maxLevel: 3,
    effect: l => [`적을 스스로 상대 · 회피 성공률 55%`, `회피 80% · 원거리 적 우선 · 체력 45%에서 물약`, `회피 95% · 체력 50%에서 물약`][l - 1],
    cost: l => tiered<Cost>(l, [{gold: 800, items: [['mana_crystal', 1], ['bone_dust', 6]]}, {gold: 1400, items: [['mana_crystal', 2], ['iron_scrap', 8]]}, {gold: 2200, items: [['lich_keyring', 1], ['mana_crystal', 2]]}]),
    requires: {node: 'command.autoExplore', level: 1},
  },
];

export const NODE_BY_ID: ReadonlyMap<string, UpgradeNode> = new Map(NODES.map(n => [n.id, n]));

export type Levels = Readonly<Record<string, number>>;

export const levelOf = (levels: Levels, id: string): number => levels[id] ?? 0;

export function isBuilt(levels: Levels, building: BuildingId): boolean {
  return building === 'tent' || levelOf(levels, `${building}.build`) > 0;
}

export function nodesOf(building: BuildingId): UpgradeNode[] {
  return NODES.filter(n => n.building === building);
}

export function isUnlocked(levels: Levels, node: UpgradeNode): boolean {
  return !node.requires || levelOf(levels, node.requires.node) >= node.requires.level;
}

/** Everything the hideout tree changes, derived purely from node levels. */
export interface Bonuses {
  damageMul: number;
  critBonus: number;
  maxHpBonus: number;
  staminaBonus: number;
  healMul: number;
  backpackRows: number;
  stashRows: number;
  sellMul: number;
  oilCapacity: number;
  oilDrain: number;
  exhaustLoss: number;
  lootSpeed: number;
  lootQuantity: number;
  rareFind: number;
  autoReturn: number;
  autoExplore: number;
  autoBattle: number;
}

export function deriveBonuses(levels: Levels): Bonuses {
  const l = (id: string): number => levelOf(levels, id);
  return {
    damageMul: 1 + 0.06 * l('blacksmith.sharpen'),
    critBonus: 0.04 * l('blacksmith.crit'),
    maxHpBonus: 10 * l('alchemist.vitality'),
    staminaBonus: 8 * l('barracks.endurance'),
    healMul: 1 + 0.2 * l('alchemist.potency'),
    backpackRows: l('market.bag'),
    stashRows: 2 * l('market.stash'),
    sellMul: 1 + 0.05 * l('market.haggle'),
    oilCapacity: 1 + 0.1 * l('tavern.tank'),
    oilDrain: 1 - 0.08 * l('tavern.wick'),
    exhaustLoss: [0.5, 0.35, 0.2, 0.1][l('tavern.emergency')],
    lootSpeed: 1 + 0.15 * l('command.search'),
    lootQuantity: 1 + 0.1 * l('command.thorough'),
    rareFind: 1 + 0.15 * l('command.luck'),
    autoReturn: l('command.autoReturn'),
    autoExplore: l('command.autoExplore'),
    autoBattle: l('command.autoBattle'),
  };
}
