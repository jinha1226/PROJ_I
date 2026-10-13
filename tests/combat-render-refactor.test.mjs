import {test} from 'node:test';import assert from 'node:assert/strict';
import {ENEMY_VARIANTS,selectMonsterTarget} from '../src/combat/monsterBehaviors.js';
import {drawExplorationMap} from '../src/ui/explorationMap.js';
import {createTravelBlock,disposeTravelGeometry} from '../src/rendering/travelGeometry.js';
test('monster behavior selects nearest, weakest, and backline targets',()=>{
 const pos=(x,y=0)=>({distanceToSquared:q=>(x-q.x)**2+(y-q.y)**2});
 const actor={behavior:'charge',pos:{x:0,y:0}},targets=[{name:'Knight',hp:90,max:100,pos:{x:1,y:0}},{name:'Mage',hp:10,max:100,pos:{x:5,y:0}}];
 assert.equal(selectMonsterTarget(actor,targets),targets[0]);
 assert.equal(selectMonsterTarget({...actor,behavior:'hunter'},targets),targets[1]);
 assert.equal(selectMonsterTarget({...actor,behavior:'backline'},targets),targets[1]);
 assert.ok(ENEMY_VARIANTS.boss.hp>ENEMY_VARIANTS.stalker.hp);
});
test('exploration map drawing reports coverage without DOM globals',()=>{
 const ctx={fillRect(){},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){}};
 const info={textContent:''};
 drawExplorationMap({mapCanvas:{width:40,height:40},mapCtx:ctx,DW:2,DH:2,exploreGrid:[[1,1],[1,1]],explored:[[true,true],[false,false]],routeHistory:[],pathfinderSkill:false,explorer:{x:0,y:0},exploreRunning:true,infoElement:info});
 assert.match(info.textContent,/50%/);
});
test('travel geometry allocates and disposes meshes',()=>{
 let disposed=0;const scene={add(){},remove(){}};
 class BoxGeometry{dispose(){disposed++}};class MeshStandardMaterial{dispose(){disposed++}};
 class Mesh{constructor(geometry,material){this.geometry=geometry;this.material=material;this.position={set(){}}}}
 const meshes=[],THREE={BoxGeometry,MeshStandardMaterial,Mesh};
 createTravelBlock(THREE,scene,meshes,1,1,1,0,0,0,0x123456);
 assert.equal(meshes.length,1);disposeTravelGeometry(scene,meshes,[]);assert.equal(disposed,2);
});
