export function beginRoomEncounter(idx,state,callbacks){const {dungeonRoomMonsters,visitedRooms,progress}=state;const {status,renderHP}=callbacks;
 state.exploreMode='combat';state.activeCombatRoom=idx;state.exploreActive=false;state.ready=false;state.finished=false;visitedRooms.add(idx);state.explorePath=[];
 const enemies=dungeonRoomMonsters.get(idx)||[];
 for(const enemy of enemies){if(enemy.dead)continue;enemy.root.visible=true;enemy.ring.visible=true}
 state.ready=true;status.textContent='STAGE '+progress.stage+' · 전투';renderHP();
}
