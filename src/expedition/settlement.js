export function settleExpedition({guild,actors,successful,discoveredTiles,loot,steps,kills,rewardCalculator}){
 const survivors=actors.filter(a=>a.team==='hero'&&!a.dead&&a.hp>0).length;
 const reward=rewardCalculator({successful,survivors,discoveredTiles,loot});
 guild.expeditions++;guild.deepest=Math.max(guild.deepest,steps);guild.supplies+=reward;guild.activeExpedition=false;
 return {survivors,reward,steps,kills};
}
export function expeditionSummary(message,{survivors,reward,steps,kills}){return message+' · 생존 '+survivors+'명 · 처치 '+kills+' · 이동 '+steps+'칸 · 보급품 +'+reward+(reward?'':' (전리품 미회수)')}
