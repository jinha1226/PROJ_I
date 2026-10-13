import {test} from 'node:test';import assert from 'node:assert/strict';
import {GameMode,canOpenBase,canTravel} from '../src/core/gameState.js';
import {frameDelta} from '../src/core/gameLoop.js';
import {routeBetween} from '../src/dungeon/pathfinding.js';
import {attackDamage} from '../src/combat/damage.js';
import {formationOffset} from '../src/rendering/formation.js';
import {heroHealthId,heroLabel} from '../src/ui/labels.js';
test('mode guards and travel lifecycle',()=>{
 assert.equal(canOpenBase(GameMode.BASE),true);
 assert.equal(canOpenBase(GameMode.TRAVEL),false);
 assert.equal(canTravel(GameMode.TRAVEL,false,false,[{team:'hero',dead:false}]),true);
 assert.equal(canTravel(GameMode.TRAVEL,false,false,[{team:'hero',dead:true}]),false);
 assert.equal(canTravel(GameMode.COMBAT,false,false,[{team:'hero',dead:false}]),false);
});
test('frame delta is clamped',()=>{assert.equal(frameDelta(200,100),.05);assert.equal(frameDelta(50,100),0)});
test('retreat BFS respects walls and unreachable destinations',()=>{
 const grid=[[1,1,0],[0,1,0],[1,1,1]];
 assert.deepEqual(routeBetween(grid,[2,2],[0,0]),[[1,2],[1,1],[1,0],[0,0]]);
 assert.deepEqual(routeBetween(grid,[0,0],[2,0]),[]);
});
test('combat damage modifiers remain deterministic',()=>{
 const target={},a={damage:10,focusTime:1,focus:target,focusBonus:2,kiteBonusTime:1};
 assert.equal(attackDamage(a,target),24);
 assert.equal(attackDamage({...a,focusTime:0,kiteBonusTime:0},target),10);
});
test('formation and duplicate hero UI IDs',()=>{
 assert.deepEqual(formationOffset(0),[0,0]);
 assert.notDeepEqual(formationOffset(1),formationOffset(2));
 assert.notEqual(heroHealthId({rosterId:1,name:'Knight'}),heroHealthId({rosterId:2,name:'Knight'}));
 assert.equal(heroLabel('Mage'),'마법사');
});
