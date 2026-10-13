import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expeditionReward,livingRoster,recordHeroDeath,closeInterruptedExpedition} from '../src/expedition/rules.js';
test('retreat rewards only recovered exploration and loot',()=>{
 assert.equal(expeditionReward({successful:true,survivors:2,discoveredTiles:11,loot:6}),8);
 assert.equal(expeditionReward({successful:false,survivors:0,discoveredTiles:100,loot:40}),0);
 assert.equal(expeditionReward({successful:true,survivors:0,discoveredTiles:100,loot:40}),0);
 assert.equal(expeditionReward({successful:true,survivors:3,discoveredTiles:0,loot:0}),0);
});
test('permadeath is idempotent and dead heroes cannot deploy',()=>{
 const roster=[{id:1,alive:true,hp:50},{id:2,alive:true,hp:20}];
 assert.equal(recordHeroDeath(roster,1),true);
 assert.equal(recordHeroDeath(roster,1),false);
 assert.deepEqual(livingRoster(roster).map(h=>h.id),[2]);
 assert.equal(roster[0].hp,0);
});
test('interrupted expedition closes exactly once',()=>{
 const guild={activeExpedition:true,expeditions:2};
 assert.equal(closeInterruptedExpedition(guild),true);
 assert.equal(closeInterruptedExpedition(guild),false);
 assert.equal(guild.expeditions,3);
});
