export function simulatePathfinder(hasSkill,{DW,DH,centers,chambers,exploreGrid,mapDirs}){
 const known=Array.from({length:DH},()=>Array(DW).fill(false));
 const visits=new Map(),history=[],start=centers[0],pos=[...start];
 const key=(x,y)=>x+','+y;
 const reveal=()=>{
  const room=chambers.find(([rx,ry,w,h])=>pos[0]>=rx&&pos[0]<rx+w&&pos[1]>=ry&&pos[1]<ry+h);
  const mark=(x,y)=>{if(x>=0&&y>=0&&x<DW&&y<DH&&exploreGrid[y][x])known[y][x]=true};
  if(room){const [rx,ry,w,h]=room;for(let y=ry;y<ry+h;y++)for(let x=rx;x<rx+w;x++)mark(x,y)}
  else for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)if(dx*dx+dy*dy<=9)mark(pos[0]+dx,pos[1]+dy);
 };
 const total=exploreGrid.flat().filter(Boolean).length,thresholds={50:null,90:null,100:null};
 let distance=0,revisited=0,deadEnds=0,backtrack=0;
 const step=(x,y)=>{
  const k=key(x,y);if(visits.has(k))revisited++;
  visits.set(k,(visits.get(k)||0)+1);history.push([x,y]);
  pos[0]=x;pos[1]=y;distance++;reveal();
  const pct=100*known.flat().filter(Boolean).length/total;
  for(const t of [50,90,100])if(thresholds[t]===null&&pct>=t)thresholds[t]=distance;
 };
 step(...start);distance=0;
 let guard=0;
 while(guard++<DW*DH*12){
  const queue=[[...pos]],seen=new Set([key(...pos)]),parent=new Map(),dist=new Map([[key(...pos),0]]),candidates=[];
  for(let i=0;i<queue.length;i++){
   const [x,y]=queue[i],k=key(x,y),d=dist.get(k);
   if(!known[y][x])candidates.push({x,y,d});
   for(const [dx,dy] of mapDirs){
    const nx=x+dx,ny=y+dy,nk=key(nx,ny);
    if(nx<0||ny<0||nx>=DW||ny>=DH||!exploreGrid[ny][nx]||seen.has(nk))continue;
    seen.add(nk);parent.set(nk,[x,y]);dist.set(nk,d+1);queue.push([nx,ny]);
   }
  }
  if(!candidates.length)break;
  let chosen=candidates[0],best=Infinity;
  for(const c of candidates){
   const unseen=mapDirs.reduce((n,[dx,dy])=>{const x=c.x+dx,y=c.y+dy;return n+(x>=0&&y>=0&&x<DW&&y<DH&&exploreGrid[y][x]&&!known[y][x]?1:0)},0);
   const score=hasSkill?c.d+(visits.get(key(c.x,c.y))||0)*2.5-unseen*3:c.d;
   if(score<best){best=score;chosen=c}
  }
  const path=[];let p=[chosen.x,chosen.y];
  while(p[0]!==pos[0]||p[1]!==pos[1]){path.push(p);p=parent.get(key(...p));if(!p)break}
  path.reverse();
  if(!path.length)break;
  if(path.length>1)backtrack+=path.slice(0,-1).filter(([x,y])=>visits.has(key(x,y))).length;
  const nbs=mapDirs.filter(([dx,dy])=>{const x=pos[0]+dx,y=pos[1]+dy;return x>=0&&y>=0&&x<DW&&y<DH&&exploreGrid[y][x]}).length;
  if(nbs===1)deadEnds++;
  for(const [x,y] of path)step(x,y);
 }
 return {hasSkill,history,distance,revisited,backtrack,deadEnds,thresholds,coverage:Math.round(100*known.flat().filter(Boolean).length/total),complete:!known.some((row,y)=>row.some((v,x)=>exploreGrid[y][x]&&!v))};
}
