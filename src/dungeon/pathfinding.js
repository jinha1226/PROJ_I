// Pure grid BFS. Returns [] if already at destination or no route exists.
export function routeBetween(grid,start,goal,dirs=[[1,0],[-1,0],[0,1],[0,-1]]){
 const h=grid.length,w=grid[0]?.length||0;
 const valid=([x,y])=>x>=0&&y>=0&&x<w&&y<h&&Boolean(grid[y][x]);
 if(!valid(start)||!valid(goal))return [];
 const key=([x,y])=>x+','+y,queue=[start],seen=new Set([key(start)]),parents=new Map();
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(p[0]===goal[0]&&p[1]===goal[1])break;
  for(const [dx,dy] of dirs){const next=[p[0]+dx,p[1]+dy],k=key(next);if(!valid(next)||seen.has(k))continue;seen.add(k);parents.set(k,p);queue.push(next)}
 }
 if(!seen.has(key(goal)))return [];
 const path=[];let p=goal;
 while(key(p)!==key(start)){path.push(p);p=parents.get(key(p));if(!p)return []}
 return path.reverse();
}
