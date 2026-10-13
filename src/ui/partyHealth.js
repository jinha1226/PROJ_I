export function updatePartyHealthUI(actors,lookup){
 for(const actor of actors.filter(a=>a.team==='hero')){
  const bar=lookup('hp-'+(actor.rosterId||actor.name));if(!bar)continue;
  bar.style.width=(actor.hp/actor.max*100)+'%';
  const card=bar.closest('.card');if(!card)continue;
  card.classList.toggle('dead',actor.dead);
  const info=card.querySelector('.action');
  if(info)info.textContent=actor.dead?'전투 불능':actor.actionTime>0?actor.lastAction:'HP '+Math.ceil(actor.hp)+' / '+actor.max;
 }
}
