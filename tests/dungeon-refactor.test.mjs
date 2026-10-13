import {test} from 'node:test';import assert from 'node:assert/strict';
import {DW,DH,exploreGrid,chambers,centers} from '../src/dungeon/generator.js';
import {mapRoute} from '../src/dungeon/explorationRoute.js';
import {tileToWorld,worldToTile} from '../src/rendering/coordinates.js';
import {updatePartyHealthUI} from '../src/ui/partyHealth.js';
test('seeded dungeon is connected at all room centers',()=>{
 assert.ok(chambers.length>1);assert.equal(centers.length,chambers.length);
 const seen=new Set([centers[0].join(',')]),queue=[centers[0]];
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(nx<0||ny<0||nx>=DW||ny>=DH||!exploreGrid[ny][nx]||seen.has(k))continue;seen.add(k);queue.push([nx,ny])}}
 for(const c of centers)assert.ok(seen.has(c.join(',')),'unreachable room '+c);
});
test('world/tile coordinates round-trip for all rooms',()=>{
 for(const [x,y] of centers){const p=tileToWorld(x,y,DW,DH);assert.deepEqual(worldToTile(p.x,p.z,DW,DH),{x,y})}
});
test('exploration route leaves the entrance',()=>{
 const explored=exploreGrid.map(row=>row.map(Boolean));
 const [x,y]=centers[0];for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(explored[y+dy]?.[x+dx]!==undefined)explored[y+dy][x+dx]=true;
 const path=mapRoute({explorer:{x,y},explored,exploreGrid,DW,DH,mapDirs:[[1,0],[-1,0],[0,1],[0,-1]],routeVisits:new Map(),pathfinderSkill:false});
 assert.ok(path.length>0);assert.ok(path.every(([px,py])=>exploreGrid[py][px]));
});
test('party HP UI ignores missing cards',()=>{assert.doesNotThrow(()=>updatePartyHealthUI([{team:'hero',name:'Knight',hp:10,max:20}],()=>null))});
