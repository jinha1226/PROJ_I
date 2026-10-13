import {evaluateTactics as decideTactic} from './combat/tacticDecision.js';
import {decayCombatTimers,chooseCombatTarget,livingCombatSides} from './combat/actorLogic.js';
import {settleExpedition,expeditionSummary} from './expedition/settlement.js';
import {beginRoomEncounter} from './expedition/encounter.js';
import {updateEffects as advanceCombatEffects} from './combat/effects.js';
import {applyDamage as resolveDamage} from './combat/applyDamage.js';
import {renderPathfinderComparison} from './ui/pathfinderComparison.js';
import {simulatePathfinder as simulatePathfinderRun} from './dungeon/pathfinderSimulation.js';
import {ENEMY_VARIANTS,selectMonsterTarget} from './combat/monsterBehaviors.js';
import {createTravelBlock,disposeTravelGeometry} from './rendering/travelGeometry.js';
import {drawExplorationMap} from './ui/explorationMap.js';
import {tileToWorld,worldToTile} from './rendering/coordinates.js';
import {updatePartyHealthUI} from './ui/partyHealth.js';
import {mapRoute as computeExplorationRoute} from './dungeon/explorationRoute.js';
import {DW,DH,exploreGrid,chambers,centers} from './dungeon/generator.js';
import {GameMode,canOpenBase,canTravel} from './core/gameState.js';
import {frameDelta} from './core/gameLoop.js';
import {routeBetween} from './dungeon/pathfinding.js';
import {attackDamage} from './combat/damage.js';
import {PARTY_SLOTS,formationOffset} from './rendering/formation.js';
import {heroLabel,heroHealthId} from './ui/labels.js';
import {expeditionReward,livingRoster,recordHeroDeath,closeInterruptedExpedition} from './expedition/rules.js';
import * as THREE from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {clone} from 'three/addons/utils/SkeletonUtils.js';
const $=id=>document.getElementById(id),game=$('game');const scene=new THREE.Scene();scene.background=new THREE.Color(0x111722);scene.fog=new THREE.Fog(0x111722,23,48);
const camera=new THREE.OrthographicCamera(-12,12,12,-12,.1,100);const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;game.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xc4d6ff,0x33291d,2));const sun=new THREE.DirectionalLight(0xffe2ae,3);sun.position.set(-7,16,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-16;sun.shadow.camera.right=16;sun.shadow.camera.top=16;sun.shadow.camera.bottom=-16;scene.add(sun);
const mat=(color,roughness=1)=>new THREE.MeshStandardMaterial({color,roughness});const stone=mat(0x4d5960),dark=mat(0x303c43),trim=mat(0x738087),wood=mat(0x77523a),flameMat=new THREE.MeshBasicMaterial({color:0xffaa55});const loader=new GLTFLoader(),assets=new Map();let actors=[],particles=[],paused=false,ready=false,finished=false,last=performance.now(),round=0,speed=1;const speeds=[1,2,4];
let roomObjects=[];function block(w,h,d,x,y,z,m=stone){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.receiveShadow=true;o.castShadow=true;scene.add(o);roomObjects.push(o);return o}
const THEMES=[
 {name:'석조 유적',floor:0x4d5960,alt:0x303c43,wall:0x303c43,accent:0x738087,torch:0xffaa55},
 {name:'붉은 폐허',floor:0x66504a,alt:0x473332,wall:0x493c3a,accent:0xa27861,torch:0xff7542},
 {name:'이끼 낀 성소',floor:0x4b6256,alt:0x324b42,wall:0x35463e,accent:0x73917b,torch:0x99d976},
 {name:'서리의 전당',floor:0x5c7584,alt:0x405969,wall:0x394f61,accent:0x9ab8c9,torch:0x79c9ff}
];
let currentTheme='',obstacles=[];
function room(){
 obstacles=[];
 for(const o of roomObjects){scene.remove(o);if(o.geometry)o.geometry.dispose();if(o.material&&!Object.values({stone,dark,trim,wood,flameMat}).includes(o.material))o.material.dispose()}roomObjects=[];
 const theme=THEMES[Math.floor(Math.random()*THEMES.length)];currentTheme=theme.name;
 const floor=mat(theme.floor),alt=mat(theme.alt),wall=mat(theme.wall),accent=mat(theme.accent),glow=new THREE.MeshBasicMaterial({color:theme.torch});
 const add=(o)=>{scene.add(o);roomObjects.push(o);return o};
 block(18,.35,14,0,-.24,0,floor);
 const pattern=Math.floor(Math.random()*3);
 for(let x=-8;x<=8;x+=2)for(let z=-6;z<=6;z+=2){
 const mixed=pattern===0?(x+z)%4===0:pattern===1?(Math.abs(x)+Math.abs(z))%6===0:Math.random()<.25;
 block(1.92,.045,1.92,x,-.035,z,mixed?alt:floor)}
 for(let x=-9;x<=9;x+=2){block(2,2.6,.7,x,1.3,-7.4,wall);block(2,.5,.85,x,2.7,-7.4,accent)}
 for(let z=-7;z<=7;z+=2)for(const x of [-9.3,9.3]){block(.7,2.6,2,x,1.3,z,wall);block(.85,.5,2,x,2.7,z,accent)}
 const pillars=Math.random()<.5?[-7.7,7.7]:[-6.8,6.8];
 for(const x of pillars)for(const z of [-5.8,5.8]){block(.95,2.8,.95,x,1.4,z,accent);block(1.25,.35,1.25,x,2.85,z,floor)}
 for(const x of [-7.4,7.4]){block(.28,1.5,.28,x,.75,-5.6,wood);const fire=add(new THREE.Mesh(new THREE.IcosahedronGeometry(.28,0),glow));fire.position.set(x,1.65,-5.6);const light=add(new THREE.PointLight(theme.torch,6,10));light.position.copy(fire.position)}
 const layouts=[[[0,0,1.2,1.2]],[[-2,0,.8,1],[2,0,.8,1]],[[0,-1.6,1.6,.5],[0,1.6,1.6,.5]],[[-2,-1,.8,.8],[2,1,.8,.8]],[[0,0,.7,2.2]]];
 for(const [x,z,hx,hz] of layouts[Math.floor(Math.random()*layouts.length)]){obstacles.push({x,z,hx,hz});block(hx*2,1.6,hz*2,x,.8,z,wall);block(hx*2+.18,.2,hz*2+.18,x,1.65,z,accent)}
 // Side decorations remain outside the central lanes.
 for(let i=0;i<4;i++){const x=(i%2?1:-1)*(6.2+Math.random()*.8),z=(i<2?1:-1)*(4.7+Math.random()*.5);block(.45+Math.random()*.55,.18+Math.random()*.3,.5,x,.06,z,alt)}
}
room();const markerGeo=new THREE.CircleGeometry(.66,32);function marker(color){const m=new THREE.Mesh(markerGeo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.35,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.035;scene.add(m);return m}
async function load(name){if(!assets.has(name))assets.set(name,loader.loadAsync('assets/kaykit/'+name+'.glb'));return assets.get(name)}
function animation(a,type,force=false){if(!a.actions)return;const patterns={idle:/idle/i,walk:/walk|run/i,attack:/attack|slash|shoot|cast/i,hit:/hit|hurt|damage/i,death:/death|die/i};const key=Object.keys(a.actions).find(k=>patterns[type].test(k));if(!key||(!force&&a.anim===key))return;const act=a.actions[key];if(a.current&&a.current!==act)a.current.fadeOut(.12);act.reset().fadeIn(.12);act.setLoop(type==='attack'||type==='hit'||type==='death'?THREE.LoopOnce:THREE.LoopRepeat,type==='attack'||type==='hit'||type==='death'?1:Infinity);act.clampWhenFinished=type==='death';act.play();a.current=act;a.anim=key;if(type==='attack'||type==='hit'){clearTimeout(a.animTimeout);a.animTimeout=setTimeout(()=>{if(a.hp>0)animation(a,'idle')},Math.min(900,Math.max(280,act.getClip().duration*850)))}}
async function spawn(name,team,x,z,hp,damage,range,cooldown,variant=null){const gltf=await load(name);const root=clone(gltf.scene);const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());const scale=1.7/Math.max(size.y,.01);root.scale.setScalar(scale);root.position.set(x,-box.min.y*scale,z);root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(variant){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();for(const m of (Array.isArray(o.material)?o.material:[o.material])){if(m.color)m.color.multiply(new THREE.Color(variant.tint));if(m.emissive){m.emissive.set(variant.glow);m.emissiveIntensity=.12}}}}});scene.add(root);const a={name,team,root,pos:new THREE.Vector3(x,0,z),hp,max:hp,damage,range,cooldown,timer:Math.random()*.35,mixer:new THREE.AnimationMixer(root),actions:{},current:null,anim:null,ring:marker(team==='hero'?0x7ec7ed:0xe76d68),dead:false,variant,behavior:variant?.behavior||(team==='enemy'?(name==='Skeleton_Mage'?'backline':'charge'):null)};for(const clip of gltf.animations)a.actions[clip.name]=a.mixer.clipAction(clip);actors.push(a);animation(a,'idle');return a}
function look(a,b){const d=b.pos.clone().sub(a.pos);d.y=0;if(d.lengthSq()>.001){const angle=Math.atan2(d.x,d.z);a.root.rotation.y=angle}}
function blocked(x,z,r=.4){if(typeof unifiedDungeon!=='undefined'&&unifiedDungeon){const gx=Math.round(x/1.6+DW/2),gy=Math.round(z/1.6+DH/2);return gx<0||gy<0||gx>=DW||gy>=DH||!exploreGrid[gy][gx]}return obstacles.some(o=>Math.abs(x-o.x)<o.hx+r&&Math.abs(z-o.z)<o.hz+r)}
function lineClear(p,q,r=.3){if(blocked(p.x,p.z,r)||blocked(q.x,q.z,r))return false;const n=Math.max(1,Math.ceil(p.distanceTo(q)/.2));for(let i=1;i<n;i++){const t=i/n;if(blocked(p.x+(q.x-p.x)*t,p.z+(q.z-p.z)*t,r))return false}return true}
function findPath(from,goal,r=.43){if(unifiedDungeon){const sx=Math.round(from.x/1.6+DW/2),sy=Math.round(from.z/1.6+DH/2),tx=Math.round(goal.x/1.6+DW/2),ty=Math.round(goal.z/1.6+DH/2);const q=[[sx,sy]],seen=new Set([sx+','+sy]),parent=new Map();for(let i=0;i<q.length;i++){const [x,y]=q[i];if(x===tx&&y===ty){let at=[x,y],path=[];while(at[0]!==sx||at[1]!==sy){path.unshift(new THREE.Vector3((at[0]-DW/2)*1.6,0,(at[1]-DH/2)*1.6));at=parent.get(at.join(','));if(!at)return null}return {points:path,length:path.length*1.6}}for(const [dx,dy] of mapDirs){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(nx>=0&&ny>=0&&nx<DW&&ny<DH&&exploreGrid[ny][nx]&&!seen.has(key)){seen.add(key);parent.set(key,[x,y]);q.push([nx,ny])}}}return null}
 if(blocked(goal.x,goal.z,r)||blocked(from.x,from.z,r))return null;
 const nodes=[from.clone(),goal.clone()];
 for(const o of obstacles)for(const sx of [-1,1])for(const sz of [-1,1]){const x=o.x+sx*(o.hx+r+.18),z=o.z+sz*(o.hz+r+.18);if(Math.abs(x)<7.7&&Math.abs(z)<5.7&&!blocked(x,z,r))nodes.push(new THREE.Vector3(x,0,z))}
 const dist=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),used=new Set();dist[0]=0;
 for(let k=0;k<nodes.length;k++){let u=-1;for(let i=0;i<nodes.length;i++)if(!used.has(i)&&(u<0||dist[i]<dist[u]))u=i;if(u<0||!isFinite(dist[u]))break;if(u===1)break;used.add(u);for(let v=1;v<nodes.length;v++)if(!used.has(v)&&v!==u&&lineClear(nodes[u],nodes[v],r)){const d=dist[u]+nodes[u].distanceTo(nodes[v]);if(d<dist[v]){dist[v]=d;prev[v]=u}}}
 if(!isFinite(dist[1]))return null;
 const path=[nodes[1]];let n=1;while(prev[n]>0){n=prev[n];path.unshift(nodes[n])}return {points:path,length:dist[1]}
}
function move(a,goal,dt){
 const changed=!a.pathGoal||a.pathGoal.distanceToSquared(goal)>.36;
 if(changed||!a.path?.length||a.pathAge<=0){const path=findPath(a.pos,goal);if(!path)return false;a.path=path.points;a.pathGoal=goal.clone();a.pathAge=1.2}
 a.pathAge-=dt;
 while(a.path.length&&a.pos.distanceTo(a.path[0])<.13)a.path.shift();
 if(!a.path.length)return true;
 let waypoint=a.path[0];
 // Skip intermediate corners when a direct shortcut becomes possible.
 for(let i=a.path.length-1;i>0;i--)if(lineClear(a.pos,a.path[i],.43)){a.path.splice(0,i);waypoint=a.path[0];break}
 const delta=waypoint.clone().sub(a.pos).setY(0),distance=delta.length();if(distance<.02)return true;
 const step=Math.min(distance,dt*(a.team==='hero'?2.3:1.8)),next=a.pos.clone().addScaledVector(delta.normalize(),step);
 if(blocked(next.x,next.z,.42)){a.pathAge=0;return false}
 a.pos.copy(next);a.root.position.x=a.pos.x;a.root.position.z=a.pos.z;animation(a,'walk');return true
}
function approachGoal(a,target){
 const candidates=[];
 for(let i=0;i<24;i++){const angle=i*Math.PI*2/24,dir=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle));for(const radius of [Math.max(.85,a.range*.72),Math.max(.95,a.range*.94)]){const p=target.pos.clone().addScaledVector(dir,radius);if((!unifiedDungeon&&(Math.abs(p.x)>7.5||Math.abs(p.z)>5.5))||blocked(p.x,p.z,.43)||!lineClear(p,target.pos,.2))continue;const path=findPath(a.pos,p);if(path)candidates.push({p,cost:path.length})}}
 candidates.sort((x,y)=>x.cost-y.cost);
 if(!candidates.length)return null;
 if(a.pathGoal&&candidates.some(c=>c.p.distanceToSquared(a.pathGoal)<.1&&c.cost<candidates[0].cost+2.5))return a.pathGoal;
 return candidates[0].p
}
const impacts=[],shots=[],pending=[];let shake=0,flash=0;const fxMat=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide});
function impact(pos,color,power=1){const ring=new THREE.Mesh(new THREE.RingGeometry(.12,.22,24),fxMat(color,.9));ring.rotation.x=-Math.PI/2;ring.position.copy(pos);ring.position.y=.13;scene.add(ring);impacts.push({mesh:ring,age:0,duration:.36,power});for(let i=0;i<9;i++){const angle=i*Math.PI*2/9;const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.055+Math.random()*.06,0),fxMat(color));m.position.copy(pos).add(new THREE.Vector3(0,1.1,0));scene.add(m);impacts.push({mesh:m,age:0,duration:.3+Math.random()*.2,velocity:new THREE.Vector3(Math.cos(angle)*(2+Math.random()*3),1+Math.random()*3,Math.sin(angle)*(2+Math.random()*3))})}shake=Math.max(shake,.16*power);flash=Math.max(flash,.07)}
function projectile(a,b,kind){const start=a.pos.clone().add(new THREE.Vector3(0,1.35,0)),end=b.pos.clone().add(new THREE.Vector3(0,1.15,0));const color=kind==='arrow'?0xffd68a:0x70b9ff;const core=new THREE.Mesh(kind==='arrow'?new THREE.ConeGeometry(.095,.8,7):new THREE.IcosahedronGeometry(.32,1),fxMat(color));core.position.copy(start);if(kind==='arrow')core.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(start).normalize());scene.add(core);let glow=null;if(kind==='spell'){glow=new THREE.PointLight(0x559bff,5,4);scene.add(glow)}shots.push({core,glow,start,end,age:0,duration:kind==='arrow'?.2:.37,kind,target:b,attacker:a})}
function float(a,value,color){const ndc=a.pos.clone().add(new THREE.Vector3(0,2.1,0)).project(camera);const el=document.createElement('div');el.className='float';el.textContent=value;el.style.color=color;el.style.left=((ndc.x+1)*.5*game.clientWidth)+'px';el.style.top=((1-ndc.y)*.5*game.clientHeight)+'px';game.append(el);setTimeout(()=>el.remove(),750)}
function applyDamage(a,b,color,multiplier=1){return resolveDamage(a,b,color,multiplier,{attackDamage,markCasualty,animation,float,impact})}
function spawnEnemy(kind,x,z){const v=ENEMY_VARIANTS[kind],mage=kind==='caster',name=mage?'Skeleton_Mage':'Skeleton_Warrior',stage=progress.stage;return spawn(name,'enemy',x,z,Math.round((mage?55:65)*(1+(stage-1)*.12)*v.hp),Math.round((mage?12:10)*(1+(stage-1)*.065)*v.damage),v.range,v.cooldown,v).then(a=>{if(kind==='boss'){a.isBoss=true;a.root.scale.multiplyScalar(1.6);a.bossCooldown=4.5}return a})}
function monsterTarget(a,targets){return selectMonsterTarget(a,targets)}
const TACTICS={
 taunt:{role:'Knight',label:'도발',cooldown:10,score:(a,allies,enemies)=>enemies.filter(e=>e.pos.distanceTo(a.pos)<5&&e.target&&e.target!==a).length*45+((allies.some(h=>h!==a&&h.hp/h.max<.55))?25:0),execute:(a,allies,enemies)=>{for(const e of enemies)if(e.pos.distanceTo(a.pos)<(tacticLevel('taunt')>=2?6.5:5)){e.tauntedBy=a;e.tauntTime=4.5;e.target=a}float(a,'도발!','#ffbb68');impact(a.pos,0xffa544,1.3);if(tacticLevel('taunt')>=3){a.guard=a;a.guardTime=4.5;a.guardFactor=.8}}},
 protect:{role:'Knight',label:'아군 보호',cooldown:5,score:(a,allies,enemies)=>allies.some(h=>h!==a&&h.hp/h.max<.55&&enemies.some(e=>e.pos.distanceTo(h.pos)<3))?88:0,execute:(a,allies,enemies)=>{const h=allies.filter(h=>h!==a&&!h.dead).sort((x,y)=>x.hp/x.max-y.hp/y.max)[0];if(h){h.guard=a;h.guardTime=tacticLevel('protect')>=2?6:4;h.counterGuard=tacticLevel('protect')>=3;float(a,'수호!','#7ed7ff')}}},
 execute:{role:'Rogue_Hooded',label:'약점 포착',cooldown:5,score:(a,allies,enemies)=>enemies.some(e=>e.hp/e.max<.5)?80:0,execute:(a,allies,enemies)=>{a.focus=enemies.slice().sort((x,y)=>x.hp/x.max-y.hp/y.max)[0];a.focusTime=4;a.focusBonus=tacticLevel('execute')>=2?1.3:1;float(a,'약점 포착','#ffe29b')}},
 kite:{role:'Rogue_Hooded',label:'거리 유지',cooldown:2,score:(a,allies,enemies)=>enemies.some(e=>e.pos.distanceTo(a.pos)<2.6)?95:0,execute:(a,allies,enemies)=>{const near=enemies.slice().sort((x,y)=>x.pos.distanceTo(a.pos)-y.pos.distanceTo(a.pos))[0];const dir=a.pos.clone().sub(near.pos).normalize();a.retreat=a.pos.clone().addScaledVector(dir,tacticLevel('kite')>=2?4.5:3);if(tacticLevel('kite')>=3){a.kiteBonusTime=4}a.retreat.x=THREE.MathUtils.clamp(a.retreat.x,-7,7);a.retreat.z=THREE.MathUtils.clamp(a.retreat.z,-5,5);a.retreatTime=1.8;float(a,'후퇴!','#b4ecff')}},
 heal:{role:'Mage',label:'응급 치료',cooldown:7,score:(a,allies)=>{const h=allies.filter(h=>!h.dead).sort((x,y)=>x.hp/x.max-y.hp/y.max)[0];return h&&h.hp/h.max<.65?Math.min(110,(1-h.hp/h.max)*145):0},execute:(a,allies)=>{const h=allies.filter(h=>!h.dead).sort((x,y)=>x.hp/x.max-y.hp/y.max)[0];if(!h)return;const value=Math.min(Math.round(30*(1+progress.upgrades.healing*.2)*(tacticLevel('heal')>=2?1.35:1)),h.max-h.hp);h.hp+=value;float(h,'+'+value,'#78ffab');impact(h.pos,0x61ffa6,.7);if(tacticLevel('heal')>=3){h.guard=a;h.guardTime=3}animation(a,'attack',true)}},
 aoe:{role:'Mage',label:'광역 마법',cooldown:9,score:(a,allies,enemies)=>enemies.some(e=>enemies.filter(t=>t.pos.distanceTo(e.pos)<(tacticLevel('aoe')>=2?3.5:2.8)).length>=2)?83:0,execute:(a,allies,enemies)=>{const center=enemies.slice().sort((x,y)=>enemies.filter(e=>e.pos.distanceTo(y.pos)<2.8).length-enemies.filter(e=>e.pos.distanceTo(x.pos)<2.8).length)[0];if(!center)return;animation(a,'attack',true);float(a,'광역 마법!','#80bfff');pending.push({a,b:center,remaining:.4,aoe:true})}}
};
TACTICS.ironwall={role:'Knight',label:'철벽 태세',cooldown:9,score:(a)=>a.hp/a.max<.65?92:0,execute:(a)=>{a.guard=a;a.guardTime=tacticLevel('ironwall')>=2?6:4;a.guardFactor=tacticLevel('ironwall')>=3?.35:.55;float(a,'철벽!','#a6e4ff')}};
TACTICS.snipe={role:'Rogue_Hooded',label:'후방 저격',cooldown:7,score:(a,allies,enemies)=>enemies.some(e=>e.name==='Skeleton_Mage')?72:0,execute:(a,allies,enemies)=>{a.focus=enemies.find(e=>e.name==='Skeleton_Mage');a.focusTime=5;float(a,'후방 저격!','#ffdd8e')}};
TACTICS.barrier={role:'Mage',label:'보호막',cooldown:10,score:(a,allies)=>allies.some(h=>h.hp/h.max<.75)?75:0,execute:(a,allies)=>{const h=allies.slice().sort((x,y)=>x.hp/x.max-y.hp/y.max)[0];h.guard=a;h.guardTime=tacticLevel('barrier')>=2?6:4;h.guardFactor=tacticLevel('barrier')>=3?.35:.55;float(h,'보호막!','#8ecfff');impact(h.pos,0x8ecfff,.6)}};
const roles=['Knight','Rogue_Hooded','Mage'],roleLabels={Knight:'전사',Rogue_Hooded:'궁수',Mage:'마법사'};
const defaults={Knight:['taunt','protect'],Rogue_Hooded:['execute','kite'],Mage:['heal','aoe']};
const STORAGE='proj_i_tactics_v1';let progress={wins:0,gold:0,stage:1,highestStage:1,farming:false,tacticLevels:{},upgrades:{attack:0,health:0,healing:0,dodge:0},loadout:structuredClone(defaults)};
try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');if(saved&&Number.isInteger(saved.wins)&&saved.wins>=0){progress.wins=saved.wins;progress.gold=Math.max(0,Math.floor(Number(saved.gold)||0));progress.stage=Math.max(1,Math.floor(Number(saved.stage)||1));progress.highestStage=Math.max(progress.stage,Math.floor(Number(saved.highestStage)||progress.stage));progress.farming=Boolean(saved.farming);for(const id of Object.keys(TACTICS))progress.tacticLevels[id]=Math.max(1,Math.min(3,Math.floor(Number(saved.tacticLevels?.[id])||1)));for(const key of ['attack','health','healing','dodge'])progress.upgrades[key]=Math.max(0,Math.min(100,Math.floor(Number(saved.upgrades?.[key])||0)));for(const role of roles){const choices=Object.keys(TACTICS).filter(k=>TACTICS[k].role===role);const selected=Array.isArray(saved.loadout?.[role])?saved.loadout[role].filter(k=>choices.includes(k)):[];if(selected.length)progress.loadout[role]=[...new Set(selected)].slice(0,3)}}}catch(e){console.warn('Tactics save reset',e)}
for(const id of Object.keys(TACTICS))progress.tacticLevels[id]??=1;const equipped=progress.loadout;function saveTactics(){localStorage.setItem(STORAGE,JSON.stringify(progress))}
const UPGRADES={attack:{label:'공격력',detail:'레벨당 +12%',base:20},health:{label:'최대 HP',detail:'레벨당 +15%',base:20},healing:{label:'치유 강화',detail:'레벨당 +20%',base:25},dodge:{label:'위험 회피 AI',detail:'Lv.1: 보스 충격파 예고 시 범위 밖으로 이동 (1회 구매)',base:120}};
function upgradeCost(key){if(key==='dodge'&&progress.upgrades.dodge>=1)return Infinity;return Math.ceil(UPGRADES[key].base*Math.pow(1.55,progress.upgrades[key]))}
function renderUpgrades(){$('upgradeInfo').textContent='골드 '+progress.gold+' G · 스테이지 '+progress.stage;$('upgradeRows').innerHTML=Object.entries(UPGRADES).map(([key,u])=>'<div class="upgradeRow"><div><strong>'+u.label+' Lv.'+progress.upgrades[key]+'</strong><br><small>'+u.detail+'</small></div><button data-upgrade="'+key+'" '+(progress.gold<upgradeCost(key)?'disabled':'')+'>'+upgradeCost(key)+' G</button></div>').join('')}
$('upgradeRows').onclick=e=>{const b=e.target.closest('button[data-upgrade]');if(!b)return;const key=b.dataset.upgrade,cost=upgradeCost(key);if(progress.gold<cost||!isFinite(cost))return;progress.gold-=cost;progress.upgrades[key]++;saveTactics();renderUpgrades();renderProgress()};
$('upgradeBtn').onclick=()=>{paused=true;$('pause').textContent='계속';$('tacticsPanel').hidden=true;renderUpgrades();$('upgradePanel').hidden=false};
$('closeUpgrades').onclick=()=>{$('upgradePanel').hidden=true;paused=false;$('pause').textContent='일시정지'};
function renderProgress(){$('status').textContent='STAGE '+progress.stage+(progress.farming?' · 파밍':'')+' · '+progress.gold+' G'+(progress.stage%5===0?' · BOSS':'')+' · '+currentTheme}
let nextBattleTimer=null;
function queueNextBattle(){clearTimeout(nextBattleTimer);nextBattleTimer=setTimeout(()=>{if(unifiedDungeon&&expeditionSettled)return;if(!paused&&!document.hidden)enterTravel();else queueNextBattle()},2300/speed)}
function tacticLevel(id){return progress.tacticLevels[id]||1}
function tacticCost(id){return tacticLevel(id)===1?75:tacticLevel(id)===2?200:Infinity}
const TACTIC_DETAILS={
 taunt:['반경 5 도발','반경 6.5 도발','도발 중 받는 피해 20% 감소'],
 protect:['피해 45% 감소','보호 시간 6초','보호 중 반격'],
 execute:['빈사 적 집중','집중 대상 추가 피해','처치 시 즉시 재선정'],
 kite:['적 접근 시 후퇴','후퇴 거리 증가','후퇴 후 공격력 증가'],
 heal:['응급 치료','회복량 35% 증가','회복 후 보호막'],
 aoe:['반경 2.8 공격','반경 3.5 공격','광역 피해 35% 증가'],
 ironwall:['자신 피해 45% 감소','지속시간 증가','자신 피해 65% 감소'],
 snipe:['적 마법사 집중','집중 시간 증가','저격 대상 추가 피해'],
 barrier:['피해 45% 감소','보호 지속시간 증가','피해 65% 감소']
};
function tacticsUnlocked(){return progress.wins>=1}
function renderTactics(){const slots=tacticsUnlocked()?3:2;$('tacticInfo').textContent='골드 '+progress.gold+' G · 승리 '+progress.wins+'회 · 장착 '+slots+'칸';$('tacticRows').innerHTML=roles.map(role=>'<section class="trow"><h3>'+roleLabels[role]+' ('+equipped[role].length+'/'+slots+')</h3>'+Object.entries(TACTICS).filter(([id,t])=>t.role===role).map(([id,t])=>{const active=equipped[role].includes(id),level=tacticLevel(id),cost=tacticCost(id);return '<div class="upgradeRow"><div><strong>'+t.label+' Lv.'+level+'/3</strong><br><small>'+TACTIC_DETAILS[id][level-1]+'</small><br><small>'+(level<3?'다음: '+TACTIC_DETAILS[id][level]:'최대 레벨')+'</small></div><div class="tchoices"><button data-role="'+role+'" data-tactic="'+id+'" class="'+(active?'active':'')+'" '+(!active&&equipped[role].length>=slots?'disabled':'')+'>'+(active?'장착 ✓':'장착')+'</button><button data-level="'+id+'" '+(level>=3||progress.gold<cost?'disabled':'')+'>'+(level>=3?'MAX':cost+' G')+'</button></div></div>'}).join('')+'</section>').join('')}
$('tacticRows').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.level){const id=b.dataset.level,cost=tacticCost(id);if(tacticLevel(id)>=3||progress.gold<cost)return;progress.gold-=cost;progress.tacticLevels[id]++;saveTactics();renderTactics();renderProgress();return}if(!b.dataset.tactic)return;const {role,tactic}=b.dataset,arr=equipped[role];if(arr.includes(tactic)){if(arr.length<=1)return;arr.splice(arr.indexOf(tactic),1)}else if(arr.length< (tacticsUnlocked()?3:2))arr.push(tactic);saveTactics();renderTactics()};
$('tacticsBtn').onclick=()=>{paused=true;$('upgradePanel').hidden=true;$('pause').textContent='계속';renderTactics();$('tacticsPanel').hidden=false};
$('closeTactics').onclick=()=>{$('tacticsPanel').hidden=true;paused=false;$('pause').textContent='일시정지'};

function evaluateTactics(a,allies,enemies){return decideTactic(a,allies,enemies,{equipped,TACTICS})}
function hit(a,b){if(b.dead)return;a.lastAction='일반 공격';a.actionTime=.8;animation(a,'attack',true);const duration=a.current?.getClip().duration||.7;const windup=Math.max(.12,Math.min(.55,duration*(a.name==='Knight'?.42:.48)));pending.push({a,b,remaining:windup})}
function resolveAOE(a,b){if(a.dead)return;for(const enemy of actors.filter(e=>e.team!==a.team&&!e.dead&&e.pos.distanceTo(b.pos)<(tacticLevel('aoe')>=2?3.5:2.8)))applyDamage(a,enemy,'#8bc7ff',tacticLevel('aoe')>=3?1.35:1)}
function resolveAttack(a,b){if(a.dead||b.dead||!lineClear(a.pos,b.pos,.2))return;if(a.name==='Rogue_Hooded')projectile(a,b,'arrow');else if(a.name==='Mage'||a.name==='Skeleton_Mage')projectile(a,b,'spell');else applyDamage(a,b,a.team==='hero'?'#ffe29b':'#ff8181')}
function updateEffects(dt){const state={pending,shots,impacts,scene,shake,flash};advanceCombatEffects(dt,state,{resolveAOE,resolveAttack,applyDamage});shake=state.shake;flash=state.flash}
function bossWarning(a){if(a.warning)return;const mesh=new THREE.Mesh(new THREE.CircleGeometry(3.5,64),new THREE.MeshBasicMaterial({color:0xf05c35,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.position.set(a.pos.x,.09,a.pos.z);scene.add(mesh);a.warning={mesh,time:1.5,center:a.pos.clone()};a.lastAction='충격파 예고';a.actionTime=1.5}
function bossBlast(a){const w=a.warning;if(!w)return;for(const h of actors.filter(h=>h.team==='hero'&&!h.dead&&h.pos.distanceTo(w.center)<3.5))applyDamage(a,h,'#ffad66',.65);scene.remove(w.mesh);w.mesh.geometry.dispose();w.mesh.material.dispose();a.warning=null;const pulse=new THREE.Mesh(new THREE.RingGeometry(.5,3.5,48),new THREE.MeshBasicMaterial({color:0xff9b43,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}));pulse.rotation.x=-Math.PI/2;pulse.position.set(w.center.x,.12,w.center.z);scene.add(pulse);impacts.push({mesh:pulse,age:0,duration:.65})}
function dodgeGoal(a,w){const away=a.pos.clone().sub(w.center).setY(0);if(away.lengthSq()<.01)away.set(1,0,0);away.normalize();let best=null,bestCost=Infinity;for(let i=0;i<20;i++){const theta=i*Math.PI*2/20;const dir=new THREE.Vector3(Math.cos(theta),0,Math.sin(theta));const p=w.center.clone().addScaledVector(dir,4.15);if(Math.abs(p.x)>7.5||Math.abs(p.z)>5.5||blocked(p.x,p.z,.43))continue;const path=findPath(a.pos,p);if(path&&path.length<bestCost){best=p;bestCost=path.length}}return best}
function update(dt){if(!ready||paused||finished)return;updateEffects(dt);for(const a of actors){if(a.team==='enemy'&&a.dungeonRoom!==undefined&&a.dungeonRoom!==activeCombatRoom)continue;a.mixer.update(dt);if(a.isBoss){if(a.dead&&a.warning){scene.remove(a.warning.mesh);a.warning.mesh.geometry.dispose();a.warning.mesh.material.dispose();a.warning=null}if(!a.dead){if(a.warning){a.warning.time-=dt;a.warning.mesh.material.opacity=.18+.14*Math.sin(a.warning.time*12)**2;if(a.warning.time<=0){bossBlast(a);a.bossCooldown=5.5}}else{a.bossCooldown-=dt;if(a.bossCooldown<=0)bossWarning(a)}}}a.actionTime=Math.max(0,(a.actionTime||0)-dt);a.ring.position.x=a.pos.x;a.ring.position.z=a.pos.z;if(a.dead){a.dying=(a.dying||0)+dt;if(a.dying>.7){a.root.position.y-=dt*1.1;a.root.scale.multiplyScalar(Math.max(.1,1-dt*1.7));if(a.dying>1.25)a.root.visible=false}continue}if(a.knockback>0){const d=Math.min(a.knockback,dt);a.knockback-=d;const nx=unifiedDungeon?a.pos.x+a.knockDirection.x*d*3:THREE.MathUtils.clamp(a.pos.x+a.knockDirection.x*d*3,-7.5,7.5),nz=unifiedDungeon?a.pos.z+a.knockDirection.z*d*3:THREE.MathUtils.clamp(a.pos.z+a.knockDirection.z*d*3,-5.5,5.5);if(!blocked(nx,nz,.42)){a.pos.set(nx,0,nz);a.root.position.x=nx;a.root.position.z=nz}}a.root.position.y=THREE.MathUtils.lerp(a.root.position.y,0,Math.min(1,dt*12));if(a.stagger>0){a.stagger-=dt;continue}decayCombatTimers(a,dt);const enemies=actors.filter(b=>b.team!==a.team&&!b.dead&&(b.team!=='enemy'||b.dungeonRoom===undefined||b.dungeonRoom===activeCombatRoom));if(!enemies.length)continue;const allies=actors.filter(b=>b.team===a.team&&!b.dead&&(b.team!=='enemy'||b.dungeonRoom===undefined||b.dungeonRoom===activeCombatRoom));a.timer-=dt;if(a.timer<=0&&evaluateTactics(a,allies,enemies))continue;if(a.team==='hero'&&progress.upgrades.dodge>=1){const warning=actors.find(b=>b.isBoss&&!b.dead&&b.warning&&a.pos.distanceTo(b.warning.center)<3.5);if(warning){const escape=dodgeGoal(a,warning.warning);if(escape){move(a,escape,dt);continue}}}if(a.retreatTime>0&&a.retreat){if(!move(a,a.retreat,dt))a.retreatTime=0;else continue}let target=chooseCombatTarget(a,enemies,monsterTarget);a.target=target;look(a,target);const dist=a.pos.distanceTo(target.pos);if(dist>a.range||!lineClear(a.pos,target.pos,.2)){const desired=approachGoal(a,target);if(desired&&!move(a,desired,dt)){a.pathAge=0;a.pathGoal=null}}else{if(a.timer<=0){hit(a,target);a.timer=a.cooldown}else if(a.anim==='walk')animation(a,'idle')}}const {heroes,foes}=livingCombatSides(actors,activeCombatRoom);if(!heroes.length||!foes.length){finished=true;if(heroes.length){progress.wins++;progress.gold+=10+progress.stage*5;if(progress.farming){progress.farming=false;progress.stage=progress.highestStage}else{progress.stage++;progress.highestStage=Math.max(progress.highestStage,progress.stage)}saveTactics()}else{progress.farming=true;progress.stage=Math.max(1,progress.highestStage-1);saveTactics()}$('notice').textContent=heroes.length?'VICTORY · GOLD +'+(10+(progress.farming?progress.stage:progress.stage-1)*5):'DEFEAT';renderProgress();$('restart').disabled=false;if(unifiedDungeon){const defeated=actors.filter(a=>a.team==='enemy'&&a.dungeonRoom===activeCombatRoom&&a.dead).length;if(heroes.length){expeditionKills+=defeated;expeditionLoot+=defeated*2}for(const a of actors.filter(a=>a.team==='enemy'&&a.dungeonRoom===activeCombatRoom)){scene.remove(a.root);scene.remove(a.ring)}actors=actors.filter(a=>a.team!=='enemy'||a.dungeonRoom!==activeCombatRoom);if(!heroes.length){returnToBase('원정대 전멸',false)}else{syncRoster();if(retreating)enterTravel();else queueNextBattle()}}else queueNextBattle()}renderHP()}
function renderHP(){updatePartyHealthUI(actors,$);const heroes=actors.filter(a=>a.team==='hero'&&!a.dead).length,foes=actors.filter(a=>a.team==='enemy'&&!a.dead).length;$('battleInfo').textContent='아군 '+heroes+'/'+actors.filter(a=>a.team==='hero').length+' · 적 '+foes+' · '+speed+'×'}
function resize(){const w=game.clientWidth,h=game.clientHeight;renderer.setSize(w,h);const aspect=w/h;const halfH=aspect<.8?11.5:9.5;camera.left=-halfH*aspect;camera.right=halfH*aspect;camera.top=halfH;camera.bottom=-halfH;camera.position.set(13,19,21);camera.lookAt(0,0,0);camera.updateProjectionMatrix()}window.addEventListener('resize',resize);resize();
async function start(){if(unifiedDungeon){expeditionSettled=false;guild.activeExpedition=true;saveGuild();retreating=false;expeditionSteps=0;expeditionKills=0;expeditionLoot=0;expeditionDiscoveries.clear();retreatEscapeRoom=-1;retreatGrace=0;for(let y=0;y<DH;y++)explored[y].fill(false);for(const a of actors){scene.remove(a.root);scene.remove(a.ring)}actors=[];activeCombatRoom=-1;visitedRooms.clear();visitedRooms.add(0);for(const enemies of dungeonRoomMonsters.values())for(const a of enemies){scene.remove(a.root);scene.remove(a.ring)}actors=actors.filter(a=>a.team!=='enemy');dungeonRoomMonsters.clear();dungeonMonstersReady=false;explorePath=[];routeHistory=[];routeVisits.clear();explorer={x:centers[0][0],y:centers[0][1]};recordRouteTile(explorer.x,explorer.y);travelTarget=null;return enterTravel()}clearTimeout(nextBattleTimer);exploreMode='combat';exploreActive=false;clearTravel();room();ready=false;finished=false;paused=false;$('tacticsPanel').hidden=true;$('upgradePanel').hidden=true;$('pause').textContent='일시정지';$('restart').disabled=true;$('notice').textContent='';for(const a of actors){if(a.warning){scene.remove(a.warning.mesh);a.warning.mesh.geometry.dispose();a.warning.mesh.material.dispose()}scene.remove(a.root);scene.remove(a.ring);clearTimeout(a.animTimeout)}for(const p of shots){scene.remove(p.core);if(p.glow)scene.remove(p.glow)}shots.length=0;pending.length=0;for(const p of impacts)scene.remove(p.mesh);impacts.length=0;actors=[];try{await Promise.all([spawn('Knight','hero',-3,2.1,Math.round(115*(1+progress.upgrades.health*.15)),Math.round(19*(1+progress.upgrades.attack*.12)),1.5,.9),spawn('Rogue_Hooded','hero',-1.4,3.2,Math.round(78*(1+progress.upgrades.health*.15)),Math.round(13*(1+progress.upgrades.attack*.12)),5,1.15),spawn('Mage','hero',.5,3.4,Math.round(75*(1+progress.upgrades.health*.15)),Math.round(11*(1+progress.upgrades.attack*.12)),5.5,1.3),...(progress.stage%5===0?[spawnEnemy('boss',0,-2.5)]:[spawnEnemy(progress.stage<3?'brute':'guardian',-1,-3),spawnEnemy('stalker',1.4,-3.4),spawnEnemy('caster',3,-2.2)])]);$('party').innerHTML=actors.filter(a=>a.team==='hero').map(a=>'<div class="card"><div class="name"><span>'+({Knight:'전사',Rogue_Hooded:'궁수',Mage:'마법사'}[a.name])+'</span><span>'+a.max+' HP</span></div><div class="hp"><span id="'+heroHealthId(a)+'"></span></div></div>').join('');renderProgress();ready=true;renderHP()}catch(e){console.error(e);$('error').style.display='block';$('error').textContent='KayKit 모델 로드 실패: '+e.message+'\nGitHub Actions의 에셋 설치 결과를 확인하세요.';$('status').textContent='에셋 오류'}}
$('speed').onclick=()=>{speed=speeds[(speeds.indexOf(speed)+1)%speeds.length];$('speed').textContent=speed+'×'};$('restart').onclick=start;$('pause').onclick=()=>{if(!$('upgradePanel').hidden||!$('tacticsPanel').hidden)return;paused=!paused;$('pause').textContent=paused?'계속':'일시정지'};

/* Fixed dungeon exploration prototype: persistent shared fog and automatic frontier routing. */
const explored=Array.from({length:DH},()=>Array(DW).fill(false));try{const saved=JSON.parse(localStorage.getItem('proj_i_map_v4')||'null');if(Array.isArray(saved))for(let y=0;y<DH;y++)for(let x=0;x<DW;x++)explored[y][x]=Boolean(saved[y]?.[x])&&!!exploreGrid[y][x]}catch(e){console.warn('Map save reset',e)}
let dungeonManifest={},dungeonKit=new Map(),travelTarget=null,travelLastTile='',travelBusy=false;let dungeonGeometryBuilt=false;let activeCombatRoom=-1;let dungeonMonstersReady=false;const dungeonRoomMonsters=new Map();let unifiedDungeon=true;let explorer={x:centers[0][0],y:centers[0][1]},explorePath=[],exploreActive=true,exploreRunning=true,exploreClock=0,exploreSaveClock=0,exploreMode='travel',visitedRooms=new Set(),travelMeshes=[],travelMarkers=[];
// Test control: enable/disable the Pathfinder party skill before restarting.
const GUILD_KEY='proj_i_guild_v1';
let guild;try{guild=JSON.parse(localStorage.getItem(GUILD_KEY))}catch(e){}
if(!guild||!Array.isArray(guild.roster))guild={supplies:30,nextId:4,expeditions:0,deepest:0,roster:[{id:1,type:'Knight',hp:115,alive:true},{id:2,type:'Rogue_Hooded',hp:78,alive:true},{id:3,type:'Mage',hp:75,alive:true}]};
const saveGuild=()=>localStorage.setItem(GUILD_KEY,JSON.stringify(guild));
if(closeInterruptedExpedition(guild))saveGuild()
let retreating=false,expeditionSteps=0,expeditionKills=0,expeditionLoot=0,expeditionSettled=true,expeditionDiscoveries=new Set(),retreatEscapeRoom=-1,retreatGrace=0;
const commandBar=document.createElement('div');commandBar.id='commandBar';
const retreatButton=document.createElement('button');retreatButton.textContent='⚑ 퇴각';const hubButton=document.createElement('button');hubButton.textContent='거점';
retreatButton.setAttribute('aria-label','원정 퇴각');hubButton.setAttribute('aria-label','거점 열기');
commandBar.append(retreatButton,hubButton);document.getElementById('game').appendChild(commandBar);
const hubPanel=document.createElement('div');hubPanel.id='hubPanel';hubPanel.style.display='none';document.getElementById('game').appendChild(hubPanel);
function markCasualty(a){if(a.team!=='hero'||!a.rosterId)return;const h=guild.roster.find(h=>h.id===a.rosterId);if(recordHeroDeath(guild.roster,a.rosterId))saveGuild()}
function syncRoster(){for(const a of actors.filter(a=>a.team==='hero'&&a.rosterId)){const h=guild.roster.find(h=>h.id===a.rosterId);if(h){h.alive=!a.dead&&a.hp>0;h.hp=Math.max(1,Math.ceil(a.hp))}}saveGuild()}
function showHub(msg=''){
 const living=livingRoster(guild.roster,Infinity);
 if(!canOpenBase(exploreMode))return;
 hubPanel.style.display='block';
 hubPanel.innerHTML='<h2>원정대 거점</h2><p>'+msg+'</p><p>보급품 '+guild.supplies+' · 원정 '+guild.expeditions+'회 · 최장 이동 '+guild.deepest+'칸</p><h3>영웅 명부</h3>'+guild.roster.map(h=>'<div>'+({Knight:'전사',Rogue_Hooded:'궁수',Mage:'마법사'}[h.type])+' #'+h.id+' · '+(h.alive?'HP '+h.hp:'☠ 영구 사망')+'</div>').join('')+'<p>모집 비용: 보급품 10</p><button id="recruitK">전사 모집</button> <button id="recruitR">궁수 모집</button> <button id="recruitM">마법사 모집</button><p><button id="expeditionGo">원정 출발 ('+Math.min(3,living.length)+'명)</button> <button id="hubClose">닫기</button></p>';
 for(const [id,type,hp] of [['recruitK','Knight',115],['recruitR','Rogue_Hooded',78],['recruitM','Mage',75]])hubPanel.querySelector('#'+id).onclick=()=>{if(exploreMode!=='base')return;if(guild.supplies<10)return showHub('보급품 부족');guild.supplies-=10;guild.roster.push({id:guild.nextId++,type,hp,alive:true});saveGuild();showHub('영웅 모집 완료')};
 hubPanel.querySelector('#expeditionGo').onclick=()=>{if(!living.length)return showHub('영웅을 모집하세요');if(exploreMode!=='base')return showHub('먼저 퇴각해야 합니다');hubPanel.style.display='none';start().catch(e=>{console.error('Expedition start failed',e);exploreMode='base';guild.activeExpedition=false;saveGuild();showHub('원정 시작 오류: '+e.message)})};
 hubPanel.querySelector('#hubClose').onclick=()=>hubPanel.style.display='none';
}
function returnToBase(msg,success=true){
 if(expeditionSettled)return;
 expeditionSettled=true;clearTimeout(nextBattleTimer);syncRoster();
 const summary=settleExpedition({guild,actors,successful:success,discoveredTiles:expeditionDiscoveries.size,loot:expeditionLoot,steps:expeditionSteps,kills:expeditionKills,rewardCalculator:expeditionReward});saveGuild();
 exploreMode='base';exploreRunning=false;ready=false;finished=true;retreating=false;
 for(const a of actors){scene.remove(a.root);scene.remove(a.ring)}actors=[];
 showHub(expeditionSummary(msg,summary));
}
function issueRetreat(){
 if(exploreMode==='base')return showHub();
 if(retreating||expeditionSettled)return;
 if(!actors.some(a=>a.team==='hero'&&!a.dead))return returnToBase('원정대 전멸',false);
 retreating=true;retreatEscapeRoom=activeCombatRoom;retreatGrace=2;clearTimeout(nextBattleTimer);if(exploreMode==='combat'){const pursuers=actors.filter(a=>a.team==='enemy'&&!a.dead&&a.dungeonRoom===activeCombatRoom);for(const hero of actors.filter(a=>a.team==='hero'&&!a.dead)){const near=pursuers.filter(e=>e.pos.distanceTo(hero.pos)<e.range+1);for(const enemy of near){if(hero.dead)break;const damage=Math.max(1,Math.ceil(enemy.damage*.45));hero.hp=Math.max(0,hero.hp-damage);float(hero,'퇴각 -'+damage,'#ffb28a');if(hero.hp===0){hero.dead=true;markCasualty(hero);animation(hero,'death',true);hero.ring.visible=false}}}syncRoster();if(!actors.some(a=>a.team==='hero'&&!a.dead))return returnToBase('퇴각 중 전멸',false)}ready=false;finished=false;
 exploreMode='travel';exploreRunning=true;exploreActive=true;activeCombatRoom=-1;
 explorePath=[];travelTarget=worldPoint(explorer.x,explorer.y);
 $('notice').textContent='퇴각 중 · 살아있는 몬스터와 다시 마주치면 교전';
}
retreatButton.onclick=issueRetreat;hubButton.onclick=()=>{if(exploreMode==='base')showHub();else $('notice').textContent='거점은 원정 종료 후 이용할 수 있습니다'};
const guideToggle=document.createElement('button');
guideToggle.textContent='길잡이 스킬: 없음';
guideToggle.style.cssText='position:absolute;top:58px;right:12px;z-index:20;padding:8px 12px;background:#192c3d;color:#fff;border:1px solid #68889a;border-radius:8px';
guideToggle.onclick=()=>{pathfinderSkill=!pathfinderSkill;guideToggle.textContent='길잡이 스킬: '+(pathfinderSkill?'보유':'없음');explorePath=[];drawExplore()};
document.getElementById('game').appendChild(guideToggle);
const compareButton=document.createElement('button');
compareButton.textContent='길잡이 경로 비교';
compareButton.style.cssText='position:absolute;top:99px;right:12px;z-index:20;padding:8px 12px;background:#243b35;color:#fff;border:1px solid #6ba894;border-radius:8px';
document.getElementById('game').appendChild(compareButton);
const comparePanel=document.createElement('div');
comparePanel.style.cssText='display:none;position:absolute;inset:12% 5% 8%;z-index:50;background:#101923f5;color:#f4f0e7;border:1px solid #68889a;border-radius:12px;padding:16px;overflow:auto';
document.getElementById('game').appendChild(comparePanel);
compareButton.onclick=()=>{runPathfinderComparison();comparePanel.style.display='block'};
const mapCanvas=document.getElementById('exploreMap'),mapCtx=mapCanvas.getContext('2d');
const miniMap=document.getElementById('miniMap'),miniCtx=miniMap.getContext('2d');
function syncMiniMap(){if(!miniCtx)return;miniCtx.clearRect(0,0,miniMap.width,miniMap.height);miniCtx.drawImage(mapCanvas,0,0,miniMap.width,miniMap.height)}
miniMap.addEventListener('click',()=>document.getElementById('exploreBtn').click());miniMap.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();document.getElementById('exploreBtn').click()}});

const mapDirs=[[1,0],[-1,0],[0,1],[0,-1]];
function mapReveal(){let changed=false;const reveal=(x,y)=>{if(x>=0&&y>=0&&x<DW&&y<DH&&exploreGrid[y][x]&&!explored[y][x]){explored[y][x]=true;changed=true}};const room=chambers.find(([rx,ry,w,h])=>explorer.x>=rx&&explorer.x<rx+w&&explorer.y>=ry&&explorer.y<ry+h);if(room){const [rx,ry,w,h]=room;for(let y=ry;y<ry+h;y++)for(let x=rx;x<rx+w;x++)reveal(x,y)}else{for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)if(dx*dx+dy*dy<=9)reveal(explorer.x+dx,explorer.y+dy)}return changed}
// Pathfinder is a party skill; it can be toggled for an A/B run on the same seed.
let pathfinderSkill=false,routeHistory=[],routeVisits=new Map();
function recordRouteTile(x,y){const key=x+','+y;routeVisits.set(key,(routeVisits.get(key)||0)+1);routeHistory.push([x,y])}
function mapRoute(){return computeExplorationRoute({explorer,explored,exploreGrid,DW,DH,mapDirs,routeVisits,pathfinderSkill})}
// Deterministic headless A/B exploration: identical map, start, visibility,
// and movement speed; only the Pathfinder skill differs.
function simulatePathfinder(hasSkill){return simulatePathfinderRun(hasSkill,{DW,DH,centers,chambers,exploreGrid,mapDirs})}
function runPathfinderComparison(){return renderPathfinderComparison({document,comparePanel,DW,DH,exploreGrid,simulatePathfinder})}
function drawExplore(){drawExplorationMap({mapCanvas,mapCtx,DW,DH,exploreGrid,explored,routeHistory,pathfinderSkill,explorer,exploreRunning,infoElement:document.getElementById('exploreInfo')});syncMiniMap()}
function tickExplore(dt){if(!exploreActive||!exploreRunning||exploreMode!=='travel')return;exploreClock+=dt;exploreSaveClock+=dt;while(exploreClock>=.28){exploreClock-=.28;mapReveal();if(!explorePath.length)explorePath=mapRoute();if(explorePath.length){const [x,y]=explorePath.shift();explorer={x,y}}else{exploreRunning=false;break}}if(exploreSaveClock>=2||!exploreRunning){localStorage.setItem('proj_i_map_v3',JSON.stringify(explored));exploreSaveClock=0}drawExplore()}
document.getElementById('exploreBtn').onclick=()=>{exploreActive=true;exploreRunning=true;exploreClock=0;mapReveal();drawExplore();document.getElementById('explorePanel').hidden=false;document.getElementById('exploreToggle').textContent='탐험 일시정지'};
document.getElementById('exploreClose').onclick=()=>{exploreActive=exploreMode==='travel';localStorage.setItem('proj_i_map_v1',JSON.stringify(explored));document.getElementById('explorePanel').hidden=true};
document.getElementById('exploreToggle').onclick=()=>{exploreRunning=!exploreRunning;document.getElementById('exploreToggle').textContent=exploreRunning?'탐험 일시정지':'탐험 계속';drawExplore()};

function clearTravel(){disposeTravelGeometry(scene,travelMeshes,travelMarkers);travelMeshes=[];travelMarkers=[]}
function travelBlock(w,h,d,x,y,z,color){return createTravelBlock(THREE,scene,travelMeshes,w,h,d,x,y,z,color)}
function travelWorld(){
 dungeonGeometryBuilt=true;clearTravel();for(const o of roomObjects)scene.remove(o);roomObjects=[];obstacles=[];
 const T=1.6,wx=x=>(x-DW/2)*T,wz=y=>(y-DH/2)*T;
 const inside=(x,y)=>x>=0&&y>=0&&x<DW&&y<DH;
 const open=(x,y)=>inside(x,y)&&exploreGrid[y][x]===1;
 const known=(x,y)=>inside(x,y)&&exploreGrid[y][x]===1; // Keep all geometry stable; fog is not geometry.
 const roomAt=(x,y)=>chambers.findIndex(([rx,ry,rw,rh])=>x>=rx&&x<rx+rw&&y>=ry&&y<ry+rh);
 const materials={floor:0x565451,alt:0x66615a,wall:0x41434a,trim:0x77736b,wood:0x58402e};
 const add=(w,h,d,x,y,z,c)=>travelBlock(w,h,d,x,y,z,c);
 const dungeonNames=[...dungeonKit.keys()];
 const choose=(pattern)=>dungeonNames.find(n=>pattern.test(n));
 const floorModel=null; // Preserve the original combat room's geometry and dimensions
 const wallModel=null; // No arbitrary GLB wall pieces with incompatible bounds
 const pillarModel=null;
 const torchModel=null;
 const crateModel=null;
 const place=(name,x,y,z,size,angle=0)=>{if(name)placeKit(name,x,y,z,size,angle)};
 // Build rooms from the original combat-room language: layered stone floor,
 // continuous masonry perimeter, raised trim, columns and torches.
 for(let ri=0;ri<chambers.length;ri++){
  const [rx,ry,rw,rh]=chambers[ri];
  for(let y=ry;y<ry+rh;y++)for(let x=rx;x<rx+rw;x++){
   if(!known(x,y))continue;
   const px=wx(x),pz=wz(y),alt=(x+y)%5===0;
   if(floorModel)place(floorModel,px,0,pz,T);
   else{add(T,.28,T,px,-.18,pz,alt?materials.alt:materials.floor);add(T-.08,.035,T-.08,px,-.02,pz,alt?materials.floor:materials.alt)}
  }
  const corners=[[rx,ry],[rx+rw-1,ry],[rx,ry+rh-1],[rx+rw-1,ry+rh-1]];
  for(const [x,y] of corners){
   if(!known(x,y))continue;
   const px=wx(x),pz=wz(y);
   if(pillarModel)place(pillarModel,px,0,pz,T*.68);
   else{add(.68,2.65,.68,px,1.33,pz,materials.trim);add(.85,.22,.85,px,2.7,pz,materials.alt)}
  }
  const torchSites=[[rx+1,ry],[rx+rw-2,ry+rh-1]];
  for(const [x,y] of torchSites){
   if(!known(x,y))continue;
   const px=wx(x),pz=wz(y);
   if(torchModel)place(torchModel,px,0,pz,T*.5);
   else{add(.15,1.05,.15,px,.55,pz,materials.wood);const light=new THREE.PointLight(0xffab5d,2.5,8);light.position.set(px,1.6,pz);scene.add(light);travelMarkers.push(light)}
  }
 }
 // Corridors and door thresholds use the same stone floor as the rooms.
 for(let y=0;y<DH;y++)for(let x=0;x<DW;x++){
  if(!known(x,y)||!open(x,y))continue;
  const px=wx(x),pz=wz(y),ri=roomAt(x,y);
  if(ri<0){if(floorModel)place(floorModel,px,0,pz,T);else{add(T,.28,T,px,-.18,pz,materials.floor);add(T-.1,.035,T-.1,px,-.02,pz,materials.alt)}}
  // Every wall is placed on an actual solid/open boundary, never across a doorway.
  for(const [dx,dy,angle] of [[0,-1,0],[1,0,Math.PI/2],[0,1,Math.PI],[-1,0,-Math.PI/2]]){
   if(open(x+dx,y+dy))continue;
   const bx=px+dx*T*.5,bz=pz+dy*T*.5;
   if(wallModel)place(wallModel,bx,0,bz,T,angle);
   else{add(dx?.38:T,2.6,dy?.38:T,bx,1.3,bz,materials.wall);add(dx?.48:T,.42,dy?.48:T,bx,2.68,bz,materials.trim)}
  }
  // Sparse props along walls; keep the center of every room and corridors clear.
  const hash=(Math.imul(x+1,73856093)^Math.imul(y+1,19349663))>>>0;
  if(ri>=0&&hash%37===0&&!centers.some(([cx,cy])=>Math.abs(cx-x)<=2&&Math.abs(cy-y)<=2)){
   if(crateModel)place(crateModel,px+.28,0,pz+.25,T*.45);
   else add(.6,.65,.6,px+.28,.3,pz+.25,materials.wood)
  }
 }
}
function placeKit(type,x,y,z,footprint,rotation=0){const src=dungeonKit.get(type);if(!src)return;const mesh=clone(src.scene),bounds=new THREE.Box3().setFromObject(mesh),size=bounds.getSize(new THREE.Vector3());const scale=footprint/Math.max(size.x,size.z,.01);mesh.scale.setScalar(scale);mesh.rotation.y=rotation;mesh.position.set(x-bounds.getCenter(new THREE.Vector3()).x*scale,y-bounds.min.y*scale,z-bounds.getCenter(new THREE.Vector3()).z*scale);scene.add(mesh);travelMeshes.push(mesh)}
async function loadDungeonKit(){try{dungeonManifest=await (await fetch('assets/kaykit/dungeon_manifest.json')).json()}catch(e){console.warn('Dungeon manifest unavailable',e);return}const names=Object.keys(dungeonManifest);console.info('KayKit actual dungeon catalog',names);const selected=names.filter(n=>/^(floor|wall|pillar|column|torch|barrel|crate|chest|rubble|banner|stairs|arch|door|table|chair|candle)/i.test(n));await Promise.all(selected.map(async name=>{try{dungeonKit.set(name,await loader.loadAsync('assets/kaykit/'+dungeonManifest[name]))}catch(e){console.warn('Failed dungeon model',name,e)}}));travelLastTile='';if(exploreMode==='travel'&&!dungeonGeometryBuilt)travelWorld()}
function worldPoint(x,y){const p=tileToWorld(x,y,DW,DH);return new THREE.Vector3(p.x,p.y,p.z)}
function revealDungeon(){const changed=mapReveal();const key=explored.map(row=>row.map(v=>v?'1':'0').join('')).join('');if(key!==travelLastTile){travelLastTile=key;if(!dungeonGeometryBuilt)travelWorld();localStorage.setItem('proj_i_map_v3',JSON.stringify(explored))}drawExplore();return changed}

function partyTravelPosition(dt=0){
 const p=travelTarget||worldPoint(explorer.x,explorer.y);
 const heroes=actors.filter(a=>a.team==='hero'&&!a.dead);
 heroes.forEach((a,i)=>{
  const [ox,oz]=formationOffset(i);
  const preferred=p.clone().add(new THREE.Vector3(ox,0,oz));
  const goal=i===0||blocked(preferred.x,preferred.z,.3)||!lineClear(p,preferred,.2)?p:preferred;
  const delta=goal.clone().sub(a.pos),distance=delta.length();
  if(distance>.035){
   const step=dt?Math.min(distance,dt*3.2):distance;
   const direction=delta.normalize(),next=a.pos.clone().addScaledVector(direction,step);
   if(!blocked(next.x,next.z,.2)&&lineClear(a.pos,next,.15)){
    a.pos.copy(next);a.root.position.x=a.pos.x;a.root.position.z=a.pos.z;
    a.root.rotation.y=Math.atan2(direction.x,direction.z);animation(a,'walk');
   }else animation(a,'idle');
  }else animation(a,'idle');
  a.ring.position.set(a.pos.x,.035,a.pos.z);a.mixer.update(dt);
 });
}
async function enterTravel(){visitedRooms.add(0);clearTimeout(nextBattleTimer);exploreMode='travel';exploreActive=true;exploreRunning=true;finished=false;paused=false;ready=false;document.getElementById('explorePanel').hidden=true;document.getElementById('notice').textContent='';revealDungeon();if(!actors.some(a=>a.team==='hero')){if(retreating)return returnToBase('원정대 전멸',false);try{const team=livingRoster(guild.roster);await Promise.all(team.map(async h=>{const stats={Knight:[115,19,1.5,.9],Rogue_Hooded:[78,13,5,1.15],Mage:[75,11,5.5,1.3]}[h.type];const entry=worldPoint(explorer.x,explorer.y);const a=await spawn(h.type,'hero',entry.x,entry.z,h.hp,stats[1],stats[2],stats[3]);a.rosterId=h.id}));actors.sort((a,b)=>a.team==='hero'&&b.team==='hero'?team.findIndex(h=>h.id===a.rosterId)-team.findIndex(h=>h.id===b.rosterId):0);$('party').innerHTML=actors.filter(a=>a.team==='hero').map(a=>'<div class="card"><div class="name"><span>'+({Knight:'전사',Rogue_Hooded:'궁수',Mage:'마법사'}[a.name])+'</span><span>'+a.max+' HP</span></div><div class="hp"><span id="hp-'+a.name+'"></span></div></div>').join('')}catch(e){console.error(e);guild.activeExpedition=false;saveGuild();exploreMode='base';showHub('영웅 로딩 실패: '+e.message);return}}await populateDungeonMonsters();travelTarget=worldPoint(explorer.x,explorer.y);partyTravelPosition();$('status').textContent='STAGE '+progress.stage+' · 던전 탐험';$('battleInfo').textContent='자동 탐험 · 지도 '+Math.round(explored.flat().filter(Boolean).length/exploreGrid.flat().filter(Boolean).length*100)+'%';}
function explorerRoomIndex(){return centers.findIndex(([x,y])=>x===explorer.x&&y===explorer.y)}
async function populateDungeonMonsters(){
 if(dungeonMonstersReady)return;
 dungeonMonstersReady=true;
 const jobs=[];
 for(let idx=1;idx<centers.length;idx++){
  const [cx,cy]=centers[idx],p=worldPoint(cx,cy);
  const kinds=idx===centers.length-1?['boss']:['guardian','stalker','caster'];
  const offsets=[[0,-1.6],[1.6,0],[-1.6,0]];
  jobs.push(Promise.all(kinds.map((kind,i)=>spawnEnemy(kind,p.x+offsets[i][0],p.z+offsets[i][1]))).then(enemies=>{
   dungeonRoomMonsters.set(idx,enemies);
   for(const enemy of enemies){enemy.dungeonRoom=idx;enemy.root.visible=true;enemy.ring.visible=true;animation(enemy,'idle')}
  }));
 }
 try{await Promise.all(jobs)}catch(e){dungeonMonstersReady=false;console.error('Dungeon monster generation failed',e)}
}
async function roomEncounter(idx){const state={exploreMode,activeCombatRoom,exploreActive,ready,finished,visitedRooms,explorePath,dungeonRoomMonsters,progress};beginRoomEncounter(idx,state,{status:$('status'),renderHP});({exploreMode,activeCombatRoom,exploreActive,ready,finished,explorePath}=state)}
function routeToEntrance(){return routeBetween(exploreGrid,[explorer.x,explorer.y],centers[0],mapDirs)}
function travelStep(dt){if(!canTravel(exploreMode,paused,travelBusy,actors))return;if(retreating&&explorer.x===centers[0][0]&&explorer.y===centers[0][1]&&actors.filter(a=>a.team==='hero'&&!a.dead).every(a=>a.pos.distanceTo(worldPoint(...centers[0]))<3)){returnToBase('원정대 귀환');return}const lead=actors.find(a=>a.team==='hero'&&!a.dead);if(!lead)return returnToBase('원정대 전멸',false);if(!travelTarget)travelTarget=worldPoint(explorer.x,explorer.y);partyTravelPosition(dt*speed);if(retreatGrace>0)retreatGrace=Math.max(0,retreatGrace-dt*speed);if(lead.pos.distanceTo(travelTarget)>.28)return;const idx=chambers.findIndex(([x,y,w,h])=>explorer.x>=x&&explorer.x<x+w&&explorer.y>=y&&explorer.y<y+h);if(retreating&&idx!==retreatEscapeRoom)retreatEscapeRoom=-1;if(idx>=0&&(!visitedRooms.has(idx)||retreating)&&!(retreating&&idx===retreatEscapeRoom)){const foes=dungeonRoomMonsters.get(idx)||[];const leadPos=lead.pos;const nearest=foes.filter(a=>!a.dead).reduce((d,a)=>Math.min(d,leadPos.distanceTo(a.pos)),Infinity);if(nearest<=3.4){revealDungeon();roomEncounter(idx);return}}mapReveal();if(!explorePath.length)explorePath=retreating?routeToEntrance():mapRoute();if(explorePath.length){const [x,y]=explorePath.shift();explorer={x,y};expeditionSteps++;if(!retreating)expeditionDiscoveries.add(x+','+y);recordRouteTile(x,y);travelTarget=worldPoint(x,y)}else if(retreating){returnToBase('퇴각 경로 없음',false);return}else exploreRunning=false;revealDungeon();$('battleInfo').textContent='자동 탐험 · 지도 '+Math.round(explored.flat().filter(Boolean).length/exploreGrid.flat().filter(Boolean).length*100)+'%'}
function frame(t){requestAnimationFrame(frame);const elapsed=frameDelta(t,last);last=t;if(exploreMode==='travel')travelStep(elapsed);else tickExplore(elapsed);if(exploreMode==='combat')for(let i=0;i<speed;i++)update(elapsed);if(shake>0){camera.position.x=13+(Math.random()-.5)*shake;camera.position.y=19+(Math.random()-.5)*shake;camera.position.z=21+(Math.random()-.5)*shake}else camera.position.set(13,19,21);if(unifiedDungeon){const p=actors.find(a=>a.team==='hero')?.pos||worldPoint(explorer.x,explorer.y);camera.position.set(p.x+11,16,p.z+18);camera.lookAt(p.x,0,p.z)}renderer.render(scene,camera)}requestAnimationFrame(frame);loadDungeonKit();exploreMode='base';showHub('마왕 토벌을 위한 첫 원정대를 편성하세요.');
