// 종족 + 직업 → 파티원 정의.
import type { SkillId, UnitDef } from '../sim/defs';
import { CLASSES, type ClassId } from './classes';
import { RACES, type RaceId } from './races';

export interface HeroComp {
  race: RaceId;
  cls: ClassId;
  name: string;
}

/** 처음 런의 기본 파티 (1·2단계의 고정 파티와 같은 수치) */
export const DEFAULT_COMP: HeroComp[] = [
  { race: 'human', cls: 'warrior', name: '브론' },
  { race: 'deep_elf', cls: 'fire_mage', name: '엘라' },
  { race: 'halfling', cls: 'hunter', name: '카이' },
  { race: 'human', cls: 'priest', name: '미라' },
];

export function makeHeroDef(c: HeroComp, index = 0): UnitDef {
  const r = RACES[c.race], k = CLASSES[c.cls];
  const skills: Partial<Record<SkillId, number>> = { ...k.skills };
  for (const sk of r.apt) skills[sk] = (skills[sk] ?? 0) + 1;
  return {
    id: `${c.race}_${c.cls}_${index}`,
    name: c.name,
    title: `${r.name} ${k.name}`,
    glyph: k.glyph,
    color: k.color,
    role: k.role,
    radius: r.radius ?? k.radius,
    mass: k.mass,
    speed: k.speed + (r.speed ?? 0),
    hp: k.hp + r.hp,
    mp: k.mp > 0 ? Math.max(10, k.mp + r.mp) : 0,
    str: k.str + r.str,
    dex: k.dex + r.dex,
    int: k.int + r.int,
    ac: k.ac + (r.ac ?? 0),
    ev: k.ev + (r.ev ?? 0),
    will: k.will + r.will,
    resists: r.resists,
    levelHp: k.levelHp,
    levelMp: k.levelMp,
    skills,
    gear: k.gear,
    classSkills: k.classSkills,
    learnable: k.learnable,
    aptitudes: r.apt,
    // 인간은 특정 적성 대신 직업 스킬 모두가 조금씩 더 오른다
    levelSkillBonus: c.race === 'human' ? 0.2 : 0,
    weapon: k.weapon,
    abilities: k.abilities,
    autoAbilities: k.autoAbilities,
    tactic: k.tactic,
    targetPref: 'threat',
  };
}
