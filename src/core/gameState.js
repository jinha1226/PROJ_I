export const GameMode=Object.freeze({BASE:'base',TRAVEL:'travel',COMBAT:'combat'});
export function canOpenBase(mode){return mode===GameMode.BASE}
export function canTravel(mode,paused,busy,heroes){return mode===GameMode.TRAVEL&&!paused&&!busy&&heroes.some(a=>a.team==='hero'&&!a.dead)}
