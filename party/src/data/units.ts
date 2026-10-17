import type { UnitDef } from '../sim/defs';

// ── 파티 (1단계: 고정 파티. 2단계부터 종족+직업 조합으로 생성) ──
// 조작 부담을 줄이려고 캐릭터마다 직접 쓰는 스킬은 2개만 둔다.
// 화염구 · 화염 폭풍 · 속박 사격은 2단계 성장에서 해금할 예정 (data/abilities.ts 에 정의는 남겨 둠)
export const PARTY: UnitDef[] = [
  {
    id: 'warrior', name: '브론', title: '인간 전사', glyph: '전', color: '#e0b050', role: 'tank',
    radius: 0.38, mass: 3, speed: 2.7, hp: 110, mp: 0, str: 16, dex: 11, int: 8,
    ac: 8, ev: 3, will: 12, armourWeight: 6,
    skills: { fighting: 5, sword: 5, armour: 5, shield: 5, dodge: 1 },
    weapon: { name: '장검', skill: 'sword', damage: [7, 11], delay: 1.1, range: 0.5 },
    abilities: ['shield_bash', 'taunt'], tactic: 'defensive', targetPref: 'threat',
  },
  {
    id: 'mage', name: '엘라', title: '딥엘프 화염술사', glyph: '화', color: '#ff6a3a', role: 'caster',
    radius: 0.34, mass: 1, speed: 2.7, hp: 55, mp: 40, str: 7, dex: 12, int: 17,
    ac: 1, ev: 9, will: 22,
    skills: { spellcasting: 5, fire: 6, ice: 2, dodge: 3 },
    weapon: {
      name: '마력탄', skill: 'spellcasting', damage: [3, 5], delay: 1.2, range: 6,
      projectile: { speed: 12, color: '#c9a0ff' },
    },
    abilities: ['fire_bolt', 'frost_bolt'], tactic: 'ranged', targetPref: 'threat',
  },
  {
    id: 'archer', name: '카이', title: '하플링 사냥꾼', glyph: '궁', color: '#7fd06a', role: 'ranged',
    radius: 0.32, mass: 1, speed: 2.9, hp: 70, mp: 0, str: 10, dex: 17, int: 10,
    ac: 3, ev: 12, will: 14, armourWeight: 2,
    skills: { bow: 6, dodge: 5, fighting: 3, armour: 1 },
    weapon: {
      name: '단궁', skill: 'bow', damage: [5, 8], delay: 1.0, range: 7,
      projectile: { speed: 16, color: '#e8d8a0' },
    },
    abilities: ['aimed_shot', 'poison_arrow'], tactic: 'ranged', targetPref: 'threat',
  },
  {
    id: 'healer', name: '미라', title: '인간 사제', glyph: '치', color: '#f2f2ff', role: 'support',
    radius: 0.34, mass: 1, speed: 2.7, hp: 70, mp: 40, str: 10, dex: 10, int: 14,
    ac: 4, ev: 5, will: 20, armourWeight: 3,
    skills: { faith: 6, spellcasting: 3, bow: 2, armour: 2 },
    weapon: {
      name: '투석구', skill: 'bow', damage: [3, 5], delay: 1.2, range: 6,
      projectile: { speed: 14, color: '#bbbbbb' },
    },
    abilities: ['heal', 'prayer'], autoAbilities: ['cleanse'], tactic: 'support', targetPref: 'threat',
  },
];

// ── 몬스터 ──
const monsterList: UnitDef[] = [
  {
    id: 'goblin', name: '고블린', title: '근접', glyph: 'g', color: '#c8a060', role: 'melee',
    radius: 0.3, mass: 1, speed: 2.6, hp: 26, mp: 0, str: 8, dex: 12, int: 6, ac: 1, ev: 8, will: 8,
    skills: { sword: 2 },
    weapon: { name: '단검', skill: 'sword', damage: [2, 5], delay: 1.0, range: 0.5 },
    abilities: [], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'goblin_archer', name: '고블린 궁수', title: '원거리', glyph: 'g', color: '#9fd060', role: 'ranged',
    radius: 0.3, mass: 1, speed: 2.6, hp: 22, mp: 0, str: 7, dex: 13, int: 7, ac: 0, ev: 9, will: 8,
    skills: { bow: 3 },
    weapon: { name: '짧은 활', skill: 'bow', damage: [3, 5], delay: 1.3, range: 6, projectile: { speed: 14, color: '#c8b080' } },
    abilities: [], tactic: 'ranged', targetPref: 'weakest',
  },
  {
    id: 'orc', name: '오크 전사', title: '근접', glyph: 'o', color: '#d07050', role: 'melee',
    radius: 0.36, mass: 2, speed: 2.4, hp: 60, mp: 0, str: 14, dex: 10, int: 7, ac: 4, ev: 4, will: 12,
    skills: { axe: 4, fighting: 3 },
    weapon: { name: '손도끼', skill: 'axe', damage: [6, 10], delay: 1.3, range: 0.5 },
    abilities: [], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'orc_shaman', name: '오크 주술사', title: '마법 사용자', glyph: 'o', color: '#c070ff', role: 'caster',
    radius: 0.34, mass: 1, speed: 2.4, hp: 38, mp: 40, str: 8, dex: 10, int: 13, ac: 1, ev: 6, will: 20,
    skills: { spellcasting: 4 },
    weapon: { name: '지팡이', skill: 'mace', damage: [2, 4], delay: 1.2, range: 0.5 },
    abilities: ['lightning_bolt', 'slow_spell', 'bless_ally'], tactic: 'ranged', targetPref: 'backline',
  },
  {
    id: 'hyena', name: '하이에나', title: '돌진형', glyph: 'h', color: '#d0b070', role: 'melee',
    radius: 0.3, mass: 1, speed: 3.6, hp: 34, mp: 0, str: 10, dex: 14, int: 4, ac: 2, ev: 10, will: 8,
    skills: { fighting: 3 },
    weapon: { name: '이빨', skill: 'fighting', damage: [4, 7], delay: 0.8, range: 0.5 },
    abilities: ['pounce'], tactic: 'aggressive', targetPref: 'backline',
  },
  {
    id: 'fire_elemental', name: '불의 정령', title: '화염 면역', glyph: 'E', color: '#ff8030', role: 'melee',
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
    id: 'skeleton', name: '해골 전사', title: '독 면역', glyph: 'Z', color: '#e8e8d0', role: 'melee',
    radius: 0.34, mass: 2, speed: 2.2, hp: 52, mp: 0, str: 12, dex: 8, int: 1, ac: 5, ev: 2, will: 99,
    resists: { poison: 1, neg: 3, cold: 1 }, tags: ['mindless'],
    skills: { mace: 3 },
    weapon: { name: '녹슨 철퇴', skill: 'mace', damage: [5, 8], delay: 1.2, range: 0.5 },
    abilities: [], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'ogre_chief', name: '오우거 족장', title: '보스', glyph: 'O', color: '#e05050', role: 'tank',
    radius: 0.5, mass: 5, speed: 2.4, hp: 520, mp: 0, str: 20, dex: 8, int: 6, ac: 4, ev: 2, will: 18,
    skills: { mace: 5, fighting: 6 },
    weapon: { name: '거대 곤봉', skill: 'mace', damage: [13, 20], delay: 1.7, range: 0.6 },
    abilities: ['ground_slam', 'roar'], tactic: 'aggressive', targetPref: 'threat', boss: true,
  },
];

export const MONSTERS: Record<string, UnitDef> = Object.fromEntries(monsterList.map((m) => [m.id, m]));
