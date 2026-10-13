export function frameDelta(now,previous,maxSeconds=.05){return Math.min(Math.max(0,(now-previous)/1000),maxSeconds)}
