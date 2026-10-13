// View-independent monster target selection.
export function nearestLivingTarget(actor,actors,filter=()=>true){
 let best=null,dist=Infinity;
 for(const target of actors){if(target.dead||target.team===actor.team||!filter(target))continue;
 const d=actor.pos.distanceTo(target.pos);if(d<dist){best=target;dist=d}}
 return best;
}
export function encounterEnemyCount(actors,room){return actors.filter(a=>a.team==='enemy'&&!a.dead&&a.dungeonRoom===room).length}
