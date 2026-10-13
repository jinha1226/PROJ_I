export const ENEMY_VARIANTS={
 brute:{label:'중장 해골',tint:0xb8a28a,glow:0x8f5435,behavior:'charge',hp:1.55,damage:1.2,range:1.45,cooldown:1.65},
 stalker:{label:'추적 해골',tint:0x86bfa2,glow:0x267b49,behavior:'hunter',hp:.85,damage:1.12,range:1.45,cooldown:1.05},
 caster:{label:'해골 주술사',tint:0x9b9de9,glow:0x5555cc,behavior:'backline',hp:.85,damage:1.2,range:5.3,cooldown:1.85},
 boss:{label:'해골 군주',tint:0xd9a15e,glow:0xb04c1f,behavior:'hunter',hp:4.5,damage:1.65,range:1.8,cooldown:1.7},
 guardian:{label:'방패 해골',tint:0x92b9d5,glow:0x3d76a0,behavior:'charge',hp:1.8,damage:.8,range:1.45,cooldown:1.6}
};
export const MONSTER_BEHAVIORS={
 charge:{select:(a,targets)=>targets.reduce((best,t)=>!best||t.pos.distanceToSquared(a.pos)<best.pos.distanceToSquared(a.pos)?t:best,null)},
 hunter:{select:(a,targets)=>targets.reduce((best,t)=>!best||t.hp/t.max<best.hp/best.max?t:best,null)},
 backline:{select:(a,targets)=>targets.find(t=>t.name==='Mage')||targets.find(t=>t.name==='Rogue_Hooded')||targets[0]}
};
export function selectMonsterTarget(actor,targets){const behavior=MONSTER_BEHAVIORS[actor.behavior]||MONSTER_BEHAVIORS.charge;return behavior.select(actor,targets)}
