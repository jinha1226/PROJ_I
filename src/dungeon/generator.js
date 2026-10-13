const DW=76,DH=54,exploreGrid=Array.from({length:DH},()=>Array(DW).fill(0));
const chambers=[];let seed=14729;function dungeonRandom(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
function dig(x,y){if(x>=1&&x<DW-1&&y>=1&&y<DH-1)exploreGrid[y][x]=1}
function carveTunnel(a,b){let [x,y]=a;const [tx,ty]=b;const horizontal=dungeonRandom()<.5;const lineX=()=>{while(x!==tx){dig(x,y);x+=Math.sign(tx-x)}dig(x,y)},lineY=()=>{while(y!==ty){dig(x,y);y+=Math.sign(ty-y)}dig(x,y)};if(horizontal){lineX();lineY()}else{lineY();lineX()}}
// Seeded variable-size rooms, minimum clearance, spanning corridors and loops.
for(let attempts=0;attempts<1400&&chambers.length<18;attempts++){
 const w=7+Math.floor(dungeonRandom()*7),h=6+Math.floor(dungeonRandom()*6);
 const x=2+Math.floor(dungeonRandom()*(DW-w-4)),y=2+Math.floor(dungeonRandom()*(DH-h-4));
 if(chambers.some(([rx,ry,rw,rh])=>x<rx+rw+2&&x+w+2>rx&&y<ry+rh+2&&y+h+2>ry))continue;
 chambers.push([x,y,w,h]);
 for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)dig(i,j);
}
const centers=chambers.map(([x,y,w,h])=>[Math.floor(x+w/2),Math.floor(y+h/2)]);
const connected=new Set([0]);
while(connected.size<centers.length){
 let best=null;
 for(const i of connected)for(let j=0;j<centers.length;j++){
  if(connected.has(j))continue;
  const d=(centers[i][0]-centers[j][0])**2+(centers[i][1]-centers[j][1])**2;
  if(!best||d<best.d)best={i,j,d};
 }
 if(!best)break;
 carveTunnel(centers[best.i],centers[best.j]);connected.add(best.j);
}
for(let i=0;i<centers.length;i++)for(let j=i+1;j<centers.length;j++){
 const d=Math.hypot(centers[i][0]-centers[j][0],centers[i][1]-centers[j][1]);
 if(d<23&&dungeonRandom()<.22)carveTunnel(centers[i],centers[j]);
}

export {DW,DH,exploreGrid,chambers,centers};
