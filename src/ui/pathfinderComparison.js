export function renderPathfinderComparison({document,comparePanel,DW,DH,exploreGrid,simulatePathfinder}){
 const base=simulatePathfinder(false),guide=simulatePathfinder(true);
 const canvas=document.createElement('canvas');canvas.width=DW*9;canvas.height=DH*9;canvas.style.cssText='width:100%;max-height:55vh;object-fit:contain;background:#080d15';
 const ctx=canvas.getContext('2d');
 for(let y=0;y<DH;y++)for(let x=0;x<DW;x++)if(exploreGrid[y][x]){ctx.fillStyle='#34444d';ctx.fillRect(x*9,y*9,8,8)}
 const trace=(r,color)=>{ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();r.history.forEach(([x,y],i)=>i?ctx.lineTo(x*9+4.5,y*9+4.5):ctx.moveTo(x*9+4.5,y*9+4.5));ctx.stroke()};
 trace(base,'#f1a35c');trace(guide,'#6bc8ff');
 comparePanel.innerHTML='<button id="compareClose" style="float:right">닫기</button><h3>동일 던전 시드 14729 · 길잡이 A/B 비교</h3><p>주황: 스킬 없음 / 파랑: 길잡이 보유 · 전투 시간 제외, 한 칸당 동일 이동 시간</p>'+
 '<table style="width:100%;text-align:right;border-collapse:collapse"><tr><th>지표</th><th>없음</th><th>있음</th></tr>'+
 [['이동 칸 수','distance'],['재방문 칸 수','revisited'],['기존 경로 되돌아감','backtrack'],['막다른 길 횟수','deadEnds'],['탐색률 %','coverage']].map(([label,k])=>'<tr><td>'+label+'</td><td>'+base[k]+'</td><td>'+guide[k]+'</td></tr>').join('')+
 [50,90,100].map(t=>'<tr><td>'+t+'% 도달 이동 칸</td><td>'+(base.thresholds[t]??'-')+'</td><td>'+(guide.thresholds[t]??'-')+'</td></tr>').join('')+
 '</table><p>완료 여부: 없음 '+(base.complete?'완료':'미완료')+' / 있음 '+(guide.complete?'완료':'미완료')+'</p>';
 comparePanel.appendChild(canvas);
 comparePanel.querySelector('#compareClose').onclick=()=>comparePanel.style.display='none';
}
