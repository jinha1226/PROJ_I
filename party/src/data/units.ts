import type { UnitDef } from '../sim/defs';
import { DEFAULT_COMP, makeHeroDef } from './party';

// ── 파티: 종족 + 직업 조합으로 만든다 (data/races.ts, data/classes.ts, data/party.ts) ──
export const PARTY: UnitDef[] = DEFAULT_COMP.map((c, i) => makeHeroDef(c, i));

// ── 몬스터 ──
const monsterList: UnitDef[] = [
  {
    id: 'goblin', xp: 10, name: '고블린', title: '근접', glyph: 'g', color: '#c8a060', role: 'melee',
    radius: 0.3, mass: 1, speed: 2.6, hp: 26, mp: 0, str: 8, dex: 12, int: 6, ac: 1, ev: 8, will: 8,
    skills: { sword: 2 },
    weapon: { name: '단검', skill: 'sword', damage: [2, 5], delay: 1.0, range: 0.5 },
    abilities: [], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'goblin_archer', xp: 10, name: '고블린 궁수', title: '원거리', glyph: 'g', color: '#9fd060', role: 'ranged',
    radius: 0.3, mass: 1, speed: 2.6, hp: 22, mp: 0, str: 7, dex: 13, int: 7, ac: 0, ev: 9, will: 8,
    skills: { bow: 3 },
    weapon: { name: '짧은 활', skill: 'bow', damage: [3, 5], delay: 1.3, range: 6, projectile: { speed: 14, color: '#c8b080' } },
    abilities: [], tactic: 'ranged', targetPref: 'weakest',
  },
  {
    id: 'orc', xp: 20, name: '오크 전사', title: '근접', glyph: 'o', color: '#d07050', role: 'melee',
    radius: 0.36, mass: 2, speed: 2.4, hp: 60, mp: 0, str: 14, dex: 10, int: 7, ac: 4, ev: 4, will: 12,
    skills: { axe: 4, fighting: 3 },
    weapon: { name: '손도끼', skill: 'axe', damage: [6, 10], delay: 1.3, range: 0.5 },
    abilities: [], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'orc_shaman', xp: 22, name: '오크 주술사', title: '마법 사용자', glyph: 'o', color: '#c070ff', role: 'caster',
    radius: 0.34, mass: 1, speed: 2.4, hp: 38, mp: 40, str: 8, dex: 10, int: 13, ac: 1, ev: 6, will: 20,
    skills: { spellcasting: 4 },
    weapon: { name: '지팡이', skill: 'mace', damage: [2, 4], delay: 1.2, range: 0.5 },
    abilities: ['lightning_bolt', 'slow_spell', 'bless_ally'], tactic: 'ranged', targetPref: 'backline',
  },
  {
    id: 'hyena', xp: 14, name: '하이에나', title: '돌진형', glyph: 'h', color: '#d0b070', role: 'melee',
    radius: 0.3, mass: 1, speed: 3.6, hp: 34, mp: 0, str: 10, dex: 14, int: 4, ac: 2, ev: 10, will: 8,
    skills: { fighting: 3 },
    weapon: { name: '이빨', skill: 'fighting', damage: [4, 7], delay: 0.8, range: 0.5 },
    abilities: ['pounce'], tactic: 'aggressive', targetPref: 'backline',
  },
  {
    id: 'fire_elemental', xp: 24, name: '불의 정령', title: '화염 면역', glyph: 'E', color: '#ff8030', role: 'melee',
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
    id: 'skeleton', xp: 22, name: '해골 전사', title: '독 면역', glyph: 'Z', color: '#e8e8d0', role: 'melee',
    radius: 0.34, mass: 2, speed: 2.2, hp: 52, mp: 0, str: 12, dex: 8, int: 1, ac: 5, ev: 2, will: 99,
    resists: { poison: 1, neg: 3, cold: 1 }, tags: ['mindless'],
    skills: { mace: 3 },
    weapon: { name: '녹슨 철퇴', skill: 'mace', damage: [5, 8], delay: 1.2, range: 0.5 },
    abilities: [], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'mimic', xp: 45, name: '미믹', title: '상자로 위장', glyph: 'M', color: '#d0a050', role: 'melee',
    radius: 0.4, mass: 3, speed: 2.6, hp: 95, mp: 0, str: 16, dex: 10, int: 3, ac: 6, ev: 2, will: 10,
    skills: { fighting: 5 },
    weapon: { name: '이빨', skill: 'fighting', damage: [8, 13], delay: 1.1, range: 0.5 },
    abilities: [], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'ogre', xp: 40, name: '오우거', title: '내려찍기', glyph: 'O', color: '#c08050', role: 'tank',
    radius: 0.46, mass: 4, speed: 2.3, hp: 110, mp: 0, str: 18, dex: 7, int: 5, ac: 3, ev: 2, will: 12,
    skills: { mace: 4, fighting: 4 },
    weapon: { name: '곤봉', skill: 'mace', damage: [9, 14], delay: 1.6, range: 0.6 },
    abilities: ['ground_slam'], tactic: 'aggressive', targetPref: 'nearest',
  },
  {
    id: 'ogre_chief', xp: 150, name: '오우거 족장', title: '보스', glyph: 'O', color: '#e05050', role: 'tank',
    radius: 0.5, mass: 5, speed: 2.4, hp: 650, mp: 0, str: 20, dex: 8, int: 6, ac: 4, ev: 2, will: 18,
    skills: { mace: 5, fighting: 6 },
    weapon: { name: '거대 곤봉', skill: 'mace', damage: [13, 20], delay: 1.7, range: 0.6 },
    abilities: ['ground_slam', 'roar'], tactic: 'aggressive', targetPref: 'threat', boss: true,
  },
];

export const MONSTERS: Record<string, UnitDef> = Object.fromEntries(monsterList.map((m) => [m.id, m]));
