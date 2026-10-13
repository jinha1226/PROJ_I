import {test} from 'node:test';import assert from 'node:assert/strict';
import {simulatePathfinder} from '../src/dungeon/pathfinderSimulation.js';
import {applyDamage} from '../src/combat/applyDamage.js';
test('pathfinder simulation completes connected small dungeon',()=>{
 const grid=[[1,1,1],[1,1,1],[1,1,1]],config={DW:3,DH:3,centers:[[1,1]],chambers:[[0,0,3,3]],exploreGrid:grid,mapDirs:[[1,0],[-1,0],[0,1],[0,-1]]};
 const r=simulatePathfinder(false,config);assert.equal(r.coverage,100);assert.equal(r.complete,true);
});
test('combat damage preserves guard and lethal death handling',()=>{
 const events=[],attacker={team:'hero',name:'Knight',pos:{clone(){return {sub(){return this},setY(){return this},normalize(){return this},lengthSq(){return 1}}}}};
 const target={hp:10,dead:false,guardTime:0,team:'enemy',pos:{clone(){return {sub(){return this},setY(){return this},normalize(){return this},lengthSq(){return 1}}}},root:{position:{y:0}},ring:{visible:true}};
 const deps={attackDamage:()=>12,markCasualty:a=>events.push('death'),animation:()=>{},float:()=>{},impact:()=>{}};
 applyDamage(attacker,target,'red',1,deps);assert.equal(target.hp,0);assert.equal(target.dead,true);assert.equal(target.ring.visible,false);assert.deepEqual(events,['death']);
});
