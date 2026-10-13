// Pure expedition rules: no DOM, Three.js or localStorage dependencies.
export function expeditionReward({successful, survivors, discoveredTiles, loot}) {
 if (!successful || survivors <= 0) return 0;
 return Math.floor(Math.max(0, discoveredTiles) / 5) + Math.max(0, loot);
}
export function livingRoster(roster, limit = 3) {
 return roster.filter(hero => hero.alive && hero.hp > 0).slice(0, limit);
}
export function recordHeroDeath(roster, rosterId) {
 const hero = roster.find(hero => hero.id === rosterId);
 if (!hero || !hero.alive) return false;
 hero.alive = false;
 hero.hp = 0;
 return true;
}
export function closeInterruptedExpedition(guild) {
 if (!guild.activeExpedition) return false;
 guild.activeExpedition = false;
 guild.expeditions = (guild.expeditions || 0) + 1;
 return true;
}
