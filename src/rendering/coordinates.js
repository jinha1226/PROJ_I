// Scene-independent coordinate conversion shared by exploration and rendering.
export function tileToWorld(x,y,width,height,tileSize=1.6){return {x:(x-width/2)*tileSize,y:0,z:(y-height/2)*tileSize}}
export function worldToTile(x,z,width,height,tileSize=1.6){return {x:Math.round(x/tileSize+width/2),y:Math.round(z/tileSize+height/2)}}
