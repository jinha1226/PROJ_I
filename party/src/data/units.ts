import type { UnitDef } from '../sim/defs';
import { DEFAULT_COMP, makeHeroDef } from './party';

// ── 파티: 종족 + 직업 조합으로 만든다 (data/races.ts, data/classes.ts, data/party.ts) ──
export const PARTY: UnitDef[] = DEFAULT_COMP.map((c, i) => makeHeroDef(c, i));

// ── 몬스터 ──
const monsterList: UnitDef[] = [
  {
    id: 'goblin', tip: '약하지만 떼로 온다. 뭉쳤을 때 범위 공격으로 한꺼번에.', xp: 10, name: '고블린', title: '근접', glyph: 'g', color: '#c8a060', role: 'melee',
    radius: 0.3, mass: 1, speed: 2.6, hp: 26, mp: 0, str: 8, dex: 12, int: 6, ac: 1, ev: 8, will: 8,
    skills: { sword: 2 },
    weapon: { name: '단검', skill: 'sword', damage: [2, 5], delay: 1.0, range: 0.5 },
    abilities: [], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'goblin_archer', tip: '약한 아군(후열)을 노린다. 붙어서 먼저 처리하자.', xp: 10, name: '고블린 궁수', title: '원거리', glyph: 'g', color: '#9fd060', role: 'ranged',
    radius: 0.3, mass: 1, speed: 2.6, hp: 22, mp: 0, str: 7, dex: 13, int: 7, ac: 0, ev: 9, will: 8,
    skills: { bow: 3 },
    weapon: { name: '짧은 활', skill: 'bow', damage: [3, 5], delay: 1.3, range: 6, projectile: { speed: 14, color: '#c8b080' } },
    abilities: [], tactic: 'ranged', targetPref: 'weakest',
  },
  {
    id: 'goblin_bomber', tip: '뭉쳐 있는 쪽에 폭탄을 던진다(빨간 원). 후열이 붙어 있으면 같이 맞는다 — 흩어지거나 먼저 잡자.', xp: 14,
    name: '고블린 폭탄병', title: '폭탄', glyph: 'g', color: '#ff9a4a', role: 'ranged',
    radius: 0.3, mass: 1, speed: 2.5, hp: 24, mp: 0, str: 7, dex: 11, int: 7, ac: 0, ev: 8, will: 8,
    skills: { fighting: 2 },
    weapon: { name: '단검', skill: 'sword', damage: [2, 4], delay: 1.2, range: 0.5 },
    abilities: ['bomb_throw'], tactic: 'ranged', targetPref: 'weakest',
  },
  {
    id: 'orc', tip: '단단하고 아프다. 전사가 막는 동안 뒤에서 집중 공격.', xp: 20, name: '오크 전사', title: '근접', glyph: 'o', color: '#d07050', role: 'melee',
    radius: 0.36, mass: 2, speed: 2.4, hp: 60, mp: 0, str: 14, dex: 10, int: 7, ac: 4, ev: 4, will: 12,
    skills: { axe: 4, fighting: 3 },
    weapon: { name: '손도끼', skill: 'axe', damage: [6, 10], delay: 1.3, range: 0.5 },
    abilities: [], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'orc_shaman', tip: '번개 · 감속 저주를 시전하고 동료를 강화한다. 시전 막대가 보이면 방패 강타 · 속박 사격으로 끊자.', xp: 22, name: '오크 주술사', title: '마법 사용자', glyph: 'o', color: '#c070ff', role: 'caster',
    radius: 0.34, mass: 1, speed: 2.4, hp: 38, mp: 40, str: 8, dex: 10, int: 13, ac: 1, ev: 6, will: 20,
    skills: { spellcasting: 4 },
    weapon: { name: '지팡이', skill: 'mace', damage: [2, 4], delay: 1.2, range: 0.5 },
    abilities: ['lightning_bolt', 'slow_spell', 'bless_ally'], tactic: 'ranged', targetPref: 'backline',
  },
  {
    id: 'hyena', tip: '빠르고 후열에 달려든다. 도발로 붙잡거나 서리로 느리게.', xp: 14, name: '하이에나', title: '돌진형', glyph: 'h', color: '#d0b070', role: 'melee',
    radius: 0.3, mass: 1, speed: 3.6, hp: 34, mp: 0, str: 10, dex: 14, int: 4, ac: 2, ev: 10, will: 8,
    skills: { fighting: 3 },
    weapon: { name: '이빨', skill: 'fighting', damage: [4, 7], delay: 0.8, range: 0.5 },
    abilities: ['pounce'], tactic: 'aggressive', targetPref: 'backline',
  },
  {
    id: 'fire_elemental', tip: '화염이 통하지 않는다. 냉기에 약하다 — 서리 화살 · 얼음 창. 맞으면 화상.', xp: 24, name: '불의 정령', title: '화염 면역', glyph: 'E', color: '#ff8030', role: 'melee',
    radius: 0.34, mass: 1, speed: 2.6, hp: 55, mp: 0, str: 10, dex: 12, int: 6, ac: 2, ev: 6, will: 20,
    resists: { fire: 3, cold: -1, poison: 1 }, tags: ['mindless'],
    skills: { fighting: 4 },
    weapon: {
      name: '불꽃 손', skill: 'fighting', damage: [4, 8], delay: 1.0, range: 0.5, element: 'fire',
      onHit: { status: 'burn', duration: 3, chance: 0.3 },
    },
    abilities: [], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'skeleton', tip: '독 · 냉기 · 음에너지에 강하고 겁도 없다. 화염 · 신성(심판)으로.', xp: 22, name: '해골 전사', title: '독 면역', glyph: 'Z', color: '#e8e8d0', role: 'melee',
    radius: 0.34, mass: 2, speed: 2.2, hp: 52, mp: 0, str: 12, dex: 8, int: 1, ac: 5, ev: 2, will: 99,
    resists: { poison: 1, neg: 3, cold: 1 }, tags: ['mindless'],
    skills: { mace: 3 },
    weapon: { name: '녹슨 철퇴', skill: 'mace', damage: [5, 8], delay: 1.2, range: 0.5 },
    abilities: [], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'mimic', tip: '상자인 척한다. 단단하지만 쓰러뜨리면 아티팩트를 준다.', xp: 45, name: '미믹', title: '상자로 위장', glyph: 'M', color: '#d0a050', role: 'melee',
    radius: 0.4, mass: 3, speed: 2.6, hp: 95, mp: 0, str: 16, dex: 10, int: 3, ac: 6, ev: 2, will: 10,
    skills: { fighting: 5 },
    weapon: { name: '이빨', skill: 'fighting', damage: [8, 13], delay: 1.1, range: 0.5 },
    abilities: [], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'ogre', tip: '느리지만 내려찍기(빨간 원)가 아프다. 예고가 뜨면 파티를 빼자.', xp: 40, name: '오우거', title: '내려찍기', glyph: 'O', color: '#c08050', role: 'tank',
    radius: 0.46, mass: 4, speed: 2.3, hp: 110, mp: 0, str: 18, dex: 7, int: 5, ac: 3, ev: 2, will: 12,
    skills: { mace: 4, fighting: 4 },
    weapon: { name: '곤봉', skill: 'mace', damage: [9, 14], delay: 1.6, range: 0.6 },
    abilities: ['ground_slam'], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'ogre_chief', tip: '레이드 보스. 탱커가 어그로를 잡고, 도약(빨간 원)은 피하고, 70%에 나오는 주술사를 먼저, 30%부터 광폭화. 3분 안에 잡아라.', xp: 150, name: '오우거 족장', title: '보스', glyph: 'O', color: '#e05050', role: 'tank',
    radius: 0.5, mass: 5, speed: 2.4, hp: 2800, mp: 0, str: 20, dex: 8, int: 6, ac: 4, ev: 2, will: 18,
    skills: { mace: 5, fighting: 6 },
    weapon: { name: '거대 곤봉', skill: 'mace', damage: [13, 20], delay: 1.7, range: 0.6 },
    abilities: ['ground_slam', 'chief_leap', 'rage_roar'], tactic: 'aggressive', targetPref: 'threat', boss: true,
  },
  {
    id: 'tribal_shaman', tip: '족장을 치유의 북으로 회복시키고, 살아 있는 동안 족장에게 보호막을 건다. 먼저 쓰러뜨리거나 시전을 끊어라.', xp: 20,
    name: '부족 주술사', title: '족장의 치유사', glyph: 'o', color: '#a0ff80', role: 'support',
    radius: 0.34, mass: 1, speed: 2.4, hp: 46, mp: 0, str: 8, dex: 10, int: 13, ac: 1, ev: 6, will: 16,
    skills: { spellcasting: 4 },
    weapon: { name: '북채', skill: 'mace', damage: [2, 4], delay: 1.2, range: 0.5 },
    abilities: ['mending_drum', 'lightning_bolt'], tactic: 'support', targetPref: 'nearest',
  },
  // ── 확장: 거미 · 망자 · 슬라임 · 트롤 · 광신도 · 임프 ──
  {
    id: 'spider', tip: '빠르고 후열에 달려들어 독을 문다. 거미줄로 발을 묶는다. 화염에 약하다.', xp: 14, name: '거대 거미', title: '독 · 거미줄', glyph: 's', color: '#9a7ab8', role: 'melee',
    radius: 0.32, mass: 1, speed: 3.3, hp: 34, mp: 0, str: 9, dex: 14, int: 3, ac: 1, ev: 9, will: 6,
    resists: { poison: 1, fire: -1 }, skills: { fighting: 3 },
    weapon: { name: '독니', skill: 'fighting', damage: [3, 6], delay: 0.9, range: 0.5, onHit: { status: 'poison', duration: 5, chance: 0.5 } },
    abilities: ['web_shot'], tactic: 'aggressive', targetPref: 'backline',
  },
  {
    id: 'spiderling', tip: '약하지만 떼로 몰려온다. 범위 공격으로.', xp: 3, name: '새끼 거미', title: '떼', glyph: 's', color: '#b89ad0', role: 'melee',
    radius: 0.22, mass: 1, speed: 3.4, hp: 12, mp: 0, str: 5, dex: 13, int: 2, ac: 0, ev: 8, will: 4,
    resists: { poison: 1, fire: -1 }, skills: { fighting: 1 },
    weapon: { name: '이빨', skill: 'fighting', damage: [2, 3], delay: 0.9, range: 0.4, onHit: { status: 'poison', duration: 4, chance: 0.25 } },
    abilities: [], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'zombie', tip: '느리지만 질기다. 겁도 없다. 화염과 신성에 약하다. 붙잡히지 말고 멀리서.', xp: 14, name: '좀비', title: '느림 · 질김', glyph: 'z', color: '#8aa070', role: 'melee',
    radius: 0.35, mass: 2, speed: 1.7, hp: 72, mp: 0, str: 12, dex: 5, int: 1, ac: 1, ev: 0, will: 99,
    resists: { poison: 1, neg: 2, fire: -1 }, tags: ['mindless'], skills: { fighting: 3 },
    weapon: { name: '썩은 손', skill: 'fighting', damage: [5, 8], delay: 1.4, range: 0.5 },
    abilities: [], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'skeleton_minion', tip: '강령술사가 일으킨 졸개. 약하지만 계속 나온다 — 강령술사를 먼저.', xp: 4, name: '해골 졸개', title: '소환수', glyph: 'k', color: '#d8d8c0', role: 'melee',
    radius: 0.28, mass: 1, speed: 2.4, hp: 20, mp: 0, str: 8, dex: 8, int: 1, ac: 2, ev: 3, will: 99,
    resists: { poison: 1, neg: 3, cold: 1 }, tags: ['mindless'], skills: { mace: 2 },
    weapon: { name: '뼈 몽둥이', skill: 'mace', damage: [3, 5], delay: 1.1, range: 0.5 },
    abilities: [], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'wraith', tip: '때릴 때마다 체력을 빨아들인다. 잘 피하고, 냉기 · 음에너지가 안 통한다. 화염 · 신성으로 몰아쳐라.', xp: 22, name: '망령', title: '흡혈', glyph: 'W', color: '#a8c8e8', role: 'melee',
    radius: 0.33, mass: 1, speed: 2.9, hp: 42, mp: 0, str: 10, dex: 14, int: 8, ac: 0, ev: 13, will: 16,
    resists: { cold: 2, neg: 3, poison: 1 }, lifesteal: 0.4, skills: { fighting: 4 },
    weapon: { name: '차가운 손길', skill: 'fighting', damage: [5, 8], delay: 1.0, range: 0.5, element: 'neg' },
    abilities: [], tactic: 'aggressive', targetPref: 'weakest',
  },
  {
    id: 'necromancer', tip: '시체를 일으켜 해골 졸개를 부르고 그림자 화살을 쏜다. 시전 막대가 보이면 끊고, 가장 먼저 쓰러뜨리자.', xp: 30, name: '강령술사', title: '소환사', glyph: 'N', color: '#9fe0a0', role: 'caster',
    radius: 0.34, mass: 1, speed: 2.3, hp: 46, mp: 60, str: 7, dex: 10, int: 15, ac: 1, ev: 6, will: 22,
    resists: { neg: 2 }, skills: { spellcasting: 5 },
    weapon: { name: '해골 지팡이', skill: 'mace', damage: [2, 4], delay: 1.2, range: 0.5 },
    abilities: ['raise_dead', 'shadow_bolt'], tactic: 'ranged', targetPref: 'backline',
  },
  {
    id: 'slime', tip: '쓰러뜨리면 둘로 갈라진다. 산성이라 독 피해. 범위 공격으로 한꺼번에.', xp: 12, name: '슬라임', title: '분열', glyph: 'j', color: '#7ed87e', role: 'melee',
    radius: 0.38, mass: 2, speed: 1.9, hp: 50, mp: 0, str: 9, dex: 6, int: 1, ac: 0, ev: 2, will: 99,
    resists: { poison: 1, cold: -1 }, tags: ['mindless'], splitInto: { id: 'slimelet', count: 2 }, skills: { fighting: 2 },
    weapon: { name: '산성 몸통', skill: 'fighting', damage: [4, 7], delay: 1.2, range: 0.5, element: 'poison' },
    abilities: [], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'slimelet', tip: '작은 슬라임. 약하다.', xp: 4, name: '작은 슬라임', title: '조각', glyph: 'j', color: '#a8f0a8', role: 'melee',
    radius: 0.26, mass: 1, speed: 2.3, hp: 18, mp: 0, str: 6, dex: 6, int: 1, ac: 0, ev: 3, will: 99,
    resists: { poison: 1, cold: -1 }, tags: ['mindless'], skills: { fighting: 1 },
    weapon: { name: '산성', skill: 'fighting', damage: [2, 4], delay: 1.1, range: 0.4, element: 'poison' },
    abilities: [], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'troll', tip: '상처가 빠르게 아문다. 불을 붙이면(화상) 재생이 멈춘다 — 화염 마법 · 화염 폭탄으로.', xp: 40, name: '트롤', title: '재생', glyph: 'T', color: '#6aa070', role: 'tank',
    radius: 0.44, mass: 4, speed: 2.4, hp: 120, mp: 0, str: 17, dex: 8, int: 4, ac: 3, ev: 2, will: 10,
    regen: 3, skills: { fighting: 4, mace: 3 },
    weapon: { name: '발톱', skill: 'fighting', damage: [9, 13], delay: 1.4, range: 0.6 },
    abilities: [], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'cultist', tip: '동료를 치유하고 강화한다. 뒤에 숨어 있으니 원거리로 먼저 끊자. 정신이 약해 공포가 잘 통한다.', xp: 18, name: '광신도', title: '치유사', glyph: 'c', color: '#c070a0', role: 'support',
    radius: 0.33, mass: 1, speed: 2.5, hp: 36, mp: 50, str: 8, dex: 10, int: 13, ac: 1, ev: 6, will: 8,
    skills: { spellcasting: 4 },
    weapon: { name: '의식용 단검', skill: 'sword', damage: [2, 4], delay: 1.0, range: 0.5 },
    abilities: ['dark_mend', 'bless_ally'], tactic: 'support', targetPref: 'nearest',
  },
  {
    id: 'imp', tip: '빠르고 잘 피하며 불씨를 던진다. 화염에 면역. 냉기로.', xp: 14, name: '화염 임프', title: '원거리 · 화염', glyph: 'i', color: '#ff8a4a', role: 'ranged',
    radius: 0.26, mass: 1, speed: 3.2, hp: 24, mp: 40, str: 6, dex: 15, int: 10, ac: 0, ev: 12, will: 10,
    resists: { fire: 3, cold: -1 }, skills: { spellcasting: 3 },
    weapon: { name: '손톱', skill: 'fighting', damage: [2, 4], delay: 0.9, range: 0.5 },
    abilities: ['imp_fire'], tactic: 'ranged', targetPref: 'weakest',
  },
  // ── 보스 ──
  {
    id: 'lich', tip: '해골 졸개를 계속 일으키고, 주변을 얼린다(빨간 원). 졸개보다 리치 본체를 노리고, 냉기 범위는 피하자.', xp: 150, name: '리치', title: '보스', glyph: 'L', color: '#9fe0ff', role: 'caster',
    radius: 0.46, mass: 4, speed: 2.1, hp: 440, mp: 0, str: 10, dex: 10, int: 18, ac: 3, ev: 4, will: 30,
    resists: { cold: 2, neg: 3, poison: 1 }, tags: ['unstunnable'], skills: { spellcasting: 6 },
    weapon: { name: '그림자 구슬', skill: 'spellcasting', damage: [8, 12], delay: 1.5, range: 6, element: 'neg', projectile: { speed: 13, color: '#b07cff' } },
    abilities: ['raise_legion', 'grave_chill'], tactic: 'ranged', targetPref: 'threat', boss: true,
  },
  {
    id: 'spider_queen', tip: '새끼를 낳고 거미줄을 터뜨린다(빨간 원). 새끼는 범위 공격으로 정리하고, 화염으로 여왕을 태우자.', xp: 150, name: '거미 여왕', title: '보스', glyph: 'S', color: '#c890f0', role: 'tank',
    radius: 0.52, mass: 5, speed: 2.6, hp: 500, mp: 0, str: 16, dex: 12, int: 6, ac: 3, ev: 5, will: 18,
    resists: { poison: 1, fire: -1 }, skills: { fighting: 6 },
    weapon: { name: '거대 독니', skill: 'fighting', damage: [11, 16], delay: 1.4, range: 0.6, onHit: { status: 'poison', duration: 6, chance: 0.6, stacks: 2 } },
    abilities: ['spawn_brood', 'web_burst'], tactic: 'aggressive', targetPref: 'threat', boss: true,
  },
];

export const MONSTERS: Record<string, UnitDef> = Object.fromEntries(monsterList.map((m) => [m.id, m]));
