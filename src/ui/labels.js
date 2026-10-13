export const HERO_LABELS=Object.freeze({Knight:'전사',Rogue_Hooded:'궁수',Mage:'마법사'});
export function heroLabel(type){return HERO_LABELS[type]||type}
export function heroHealthId(actor){return 'hp-'+(actor.rosterId||actor.name)}
