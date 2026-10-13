export function mapRoute({explorer,explored,exploreGrid,DW,DH,mapDirs,routeVisits,pathfinderSkill}){
 const queue=[[explorer.x,explorer.y]],seen=new Set([explorer.x+','+explorer.y]),parent=new Map(),distance=new Map([[explorer.x+','+explorer.y,0]]);
 const candidates=[];
 for(let i=0;i<queue.length;i++){
  const [x,y]=queue[i],key=x+','+y,d=distance.get(key);
  if(!explored[y][x]&&exploreGrid[y][x]){candidates.push({x,y,d});continue}
  for(const [dx,dy] of mapDirs){
   const nx=x+dx,ny=y+dy,k=nx+','+ny;
   if(nx<0||ny<0||nx>=DW||ny>=DH||!exploreGrid[ny][nx]||seen.has(k))continue;
   seen.add(k);parent.set(k,[x,y]);distance.set(k,d+1);queue.push([nx,ny]);
  }
 }
 if(!candidates.length)return [];
 // Without Pathfinder: closest unseen tile. With Pathfinder: prioritize
 // promising frontiers and avoid retracing already traversed ground.
 let best=candidates[0],bestScore=Infinity;
 for(const c of candidates){
  const neighbors=mapDirs.reduce((n,[dx,dy])=>{const x=c.x+dx,y=c.y+dy;return n+(x>=0&&y>=0&&x<DW&&y<DH&&exploreGrid[y][x]&&!explored[y][x]?1:0)},0);
  const visits=routeVisits.get(c.x+','+c.y)||0;
  const score=pathfinderSkill?c.d+visits*2.5-neighbors*3:c.d;
  if(score<bestScore){best=c;bestScore=score}
 }
 const path=[];let target=[best.x,best.y];
 while(target[0]!==explorer.x||target[1]!==explorer.y){
  path.push(target);target=parent.get(target[0]+','+target[1]);if(!target)break;
 }
 return path.reverse();
}
