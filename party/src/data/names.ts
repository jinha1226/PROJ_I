import type { ResistKey, SkillId } from '../sim/defs';

export const SKILL_NAME: Record<SkillId, string> = {
  fighting: '전투', sword: '검술', axe: '도끼술', mace: '둔기술', spear: '창술', bow: '원거리 무기',
  armour: '갑옷', dodge: '회피', shield: '방패', spellcasting: '주문 시전', fire: '화염', ice: '냉기',
  earth: '대지', necro: '강령술', summon: '소환술', faith: '신앙',
};

export const RES_NAME: Record<ResistKey, string> = { fire: '화염', cold: '냉기', elec: '전기', poison: '독', neg: '음에너지' };
