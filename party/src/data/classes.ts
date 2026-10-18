// 직업: 기본 능력치 · 시작 장비 · 시작 기술 4개(주장으로 직접 쓸 거리) · 직업 스킬(내부 수치, 레벨마다 저절로 오름).
// 레벨업 선택지는 data/talents.ts 의 CLASS_TALENTS.
// 수치는 '인간' 기준. 종족 보정이 그 위에 더해진다.
import type { Role, SkillId, TacticId, UnitDef } from '../sim/defs';

export type ClassId = 'warrior' | 'fire_mage' | 'hunter' | 'priest' | 'berserker' | 'frost_mage';

export interface ClassDef extends Pick<
  UnitDef,
  'hp' | 'mp' | 'str' | 'dex' | 'int' | 'ac' | 'ev' | 'will' | 'speed' | 'radius' | 'mass' | 'levelHp' | 'levelMp' |
  'skills' | 'gear' | 'classSkills' | 'weapon' | 'abilities' | 'autoAbilities'
> {
  id: ClassId;
  name: string;
  desc: string;
  glyph: string;
  color: string;
  role: Role;
  tactic: TacticId;
}

const UNARMED = { name: '맨손', skill: 'fighting' as SkillId, damage: [2, 4] as [number, number], delay: 1.0, range: 0.5 };

export const CLASSES: Record<ClassId, ClassDef> = {
  warrior: {
    id: 'warrior', name: '전사', glyph: '전', color: '#e0b050', role: 'tank', tactic: 'defensive',
    desc: '방패와 갑옷으로 앞을 막는다. 기절과 도발로 적을 묶는다.',
    radius: 0.38, mass: 3, speed: 2.7, hp: 110, mp: 0, str: 16, dex: 11, int: 8, ac: 2, ev: 3, will: 12, levelHp: 10,
    skills: { fighting: 3, sword: 3, armour: 3, shield: 3, dodge: 1 },
    gear: { weapon: 'long_sword', armour: 'chain_mail' },
    classSkills: ['fighting', 'shield', 'armour'],
    weapon: UNARMED, abilities: ['shield_bash', 'taunt', 'shield_charge', 'second_wind'],
  },
  fire_mage: {
    id: 'fire_mage', name: '화염술사', glyph: '화', color: '#ff6a3a', role: 'caster', tactic: 'ranged',
    desc: '강한 화염 마법. 화염구·화염 폭풍은 아군도 태운다. 냉기로 화염 면역에 대비.',
    radius: 0.34, mass: 1, speed: 2.7, hp: 63, mp: 34, str: 9, dex: 11, int: 14, ac: 0, ev: 9, will: 16, levelHp: 5, levelMp: 4,
    skills: { spellcasting: 2, fire: 2, ice: 1, dodge: 2 },
    gear: { weapon: 'staff', armour: 'robe' },
    classSkills: ['fire', 'ice', 'spellcasting', 'dodge'],
    weapon: UNARMED, abilities: ['fire_bolt', 'frost_bolt', 'flame_wave', 'combust'],
  },
  hunter: {
    id: 'hunter', name: '사냥꾼', glyph: '궁', color: '#7fd06a', role: 'ranged', tactic: 'ranged',
    desc: '활로 멀리서 쏜다. 조준 사격과 독화살, 나중엔 속박과 화살비.',
    radius: 0.33, mass: 1, speed: 2.8, hp: 76, mp: 0, str: 12, dex: 14, int: 10, ac: 0, ev: 10, will: 12, levelHp: 7,
    skills: { bow: 2, dodge: 2, fighting: 2, armour: 1 },
    gear: { weapon: 'short_bow', armour: 'leather' },
    classSkills: ['bow', 'dodge', 'fighting'],
    weapon: UNARMED, abilities: ['aimed_shot', 'poison_arrow', 'quick_shot', 'snare_trap'],
  },
  priest: {
    id: 'priest', name: '사제', glyph: '치', color: '#f2f2ff', role: 'support', tactic: 'support',
    desc: '평타 없이 치유와 보호에만 집중한다. 해로운 상태는 알아서 정화한다.',
    radius: 0.34, mass: 1, speed: 2.7, hp: 70, mp: 40, str: 10, dex: 10, int: 14, ac: 0, ev: 5, will: 20, levelHp: 6, levelMp: 4,
    skills: { faith: 3, spellcasting: 2, bow: 1, armour: 1 },
    gear: { weapon: 'sling', armour: 'ring_mail' },
    classSkills: ['faith', 'spellcasting', 'armour'],
    weapon: UNARMED, abilities: ['heal', 'prayer', 'holy_light', 'sanctuary'], autoAbilities: ['cleanse'],
  },
  berserker: {
    id: 'berserker', name: '광전사', glyph: '광', color: '#e05a3a', role: 'melee', tactic: 'aggressive',
    desc: '도끼를 든 공격수. 멀리 있는 적에게 뛰어들고 광폭화로 몰아친다. 막는 건 서툴다.',
    radius: 0.37, mass: 2, speed: 2.8, hp: 100, mp: 0, str: 16, dex: 12, int: 7, ac: 1, ev: 5, will: 10, levelHp: 9,
    skills: { fighting: 3, axe: 3, dodge: 2, armour: 1 },
    gear: { weapon: 'war_axe', armour: 'leather' },
    classSkills: ['fighting', 'axe', 'dodge'],
    weapon: UNARMED, abilities: ['leap', 'berserk', 'cleave', 'war_stomp'],
  },
  frost_mage: {
    id: 'frost_mage', name: '서리술사', glyph: '빙', color: '#7fd0ff', role: 'caster', tactic: 'ranged',
    desc: '적을 느리게 하고 얼린다. 눈보라는 아군을 해치지 않는다. 화력은 화염술사보다 낮다.',
    radius: 0.34, mass: 1, speed: 2.7, hp: 66, mp: 36, str: 9, dex: 11, int: 14, ac: 0, ev: 8, will: 18, levelHp: 5, levelMp: 4,
    skills: { spellcasting: 2, ice: 3, dodge: 2 },
    gear: { weapon: 'staff', armour: 'robe' },
    classSkills: ['ice', 'spellcasting', 'dodge'],
    weapon: UNARMED, abilities: ['frost_bolt', 'frost_nova', 'ice_shards', 'freeze'],
  },
};

export const CLASS_LIST = Object.values(CLASSES);
