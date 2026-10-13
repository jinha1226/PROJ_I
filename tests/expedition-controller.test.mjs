import {test} from 'node:test';import assert from 'node:assert/strict';
import {beginRoomEncounter} from '../src/expedition/encounter.js';
import {settleExpedition,expeditionSummary} from '../src/expedition/settlement.js';
import {updateEffects} from '../src/combat/effects.js';
test('encounter transitions to combat and enables enemies',()=>{
 const enemy={dead:false,root:{visible:false},ring:{visible:false}},state={exploreMode:'travel',activeCombatRoom:-1,exploreActive:true,ready:false,finished:true,visitedRooms:new Set(),explorePath:[[1,2]],dungeonRoomMonsters:new Map([[2,[enemy]]]),progress:{stage:1}};
 let rendered=0;const status={textContent:''};beginRoomEncounter(2,state,{status,renderHP:()=>rendered++});
 assert.equal(state.exploreMode,'combat');assert.equal(state.ready,true);assert.equal(state.explorePath.length,0);assert.equal(enemy.root.visible,true);assert.equal(rendered,1);
});
test('expedition settlement credits only successful survivors',()=>{
 const guild={expeditions:2,deepest:5,supplies:10,activeExpedition:true},actors=[{team:'hero',hp:5,dead:false},{team:'hero',hp:0,dead:true}];
 const r=settleExpedition({guild,actors,successful:true,discoveredTiles:10,loot:3,steps:7,kills:2,rewardCalculator:({survivors,discoveredTiles,loot})=>survivors?discoveredTiles/5+loot:0});
 assert.equal(r.reward,5);assert.equal(guild.supplies,15);assert.equal(guild.expeditions,3);assert.equal(guild.deepest,7);assert.equal(guild.activeExpedition,false);assert.match(expeditionSummary('귀환',r),/생존 1명/);
});
test('effects process pending attacks and decay shake',()=>{
 const calls=[],state={pending:[{remaining:.1,aoe:false,a:1,b:2}],shots:[],impacts:[],scene:{remove(){}},shake:.5,flash:.5};
 updateEffects(.2,state,{resolveAOE:()=>{},resolveAttack:(a,b)=>calls.push([a,b]),applyDamage:()=>{}});
 assert.deepEqual(calls,[[1,2]]);assert.equal(state.pending.length,0);assert.ok(state.shake<.5);
});
