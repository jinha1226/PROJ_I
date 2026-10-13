export function attackDamage(attacker,target,multiplier=1){
 const focus=attacker.focusTime>0&&attacker.focus===target?(attacker.focusBonus||attacker.snipeBonus||1):1;
 return Math.round(attacker.damage*multiplier*focus*(attacker.kiteBonusTime>0?1.2:1));
}
