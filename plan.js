/* Floor geometry is authored as vector shapes, never a screenshot background. */
function drawPlan(map,plan,ns){
 const colors={corridor:'#e7f1f6',room:'#ffffff',service:'#e9f2ff',hall:'#fff0dc',foyer:'#f3f7fa',toilet:'#e4e9ef',stairs:'#d1e3ee',entrance:'#e2f4e8'};
 for(const shape of [...plan.shapes].sort((a,b)=>(a.kind==='corridor'?0:a.kind==='stairs'?2:1)-(b.kind==='corridor'?0:b.kind==='stairs'?2:1))){
  const {x,y,width:w,height:h,kind}=shape;
  const g=svg('g',{'data-kind':kind});
  g.append(svg('rect',{x,y,width:w,height:h,rx:kind==='corridor'?0:3,fill:colors[kind]||'#fff',stroke:kind==='corridor'?'none':'#68879e','stroke-width':2}));
  if(kind==='stairs'){
   for(let i=0;i<5;i++)g.append(svg('line',{x1:x+6,y1:y+5+i*4,x2:x+w-6,y2:y+5+i*4,stroke:'#356984','stroke-width':2}));
   g.append(svg('path',{d:`M ${x+w-8} ${y+h-5} L ${x+w-8} ${y+6} l -4 5 m 4 -5 l 4 5`,stroke:'#124c70','stroke-width':2,fill:'none'}));
  }else if(shape.label){
   const text=svg('text',{x:x+w/2,y:y+h/2,'text-anchor':'middle','dominant-baseline':'middle',class:'plan-label'});
   text.setAttribute('style',`font-size:${w<90?14:18}px`);
   const words=shape.label.replaceAll('-', ' ').split(' '),lines=[];let current='';const max=Math.max(5,Math.floor(w/9));
   for(const word of words){if(current&&(current+' '+word).length>max){lines.push(current);current=word;}else current+=(current?' ':'')+word;}if(current)lines.push(current);
   for(let i=0;i<lines.length;i++)text.append(svg('tspan',{x:x+w/2,dy:i===0?-(lines.length-1)*10:20},lines[i]));g.append(text);
  }
  map.append(g);
 }
 // Door openings face the corridor; the navigation line uses these same points.
 for(const n of ns){if(!n.door||!n.rect)continue;const {x,y}=n.door;
  const horizontal=Math.abs(y-n.rect.y)<1||Math.abs(y-(n.rect.y+n.rect.height))<1;
  map.append(svg('line',{x1:horizontal?x-10:x,y1:horizontal?y:y-10,x2:horizontal?x+10:x,y2:horizontal?y:y+10,stroke:'#e7f1f6','stroke-width':5}));
 }
 const y=ns.find(n=>n.id.startsWith('c'+n.floor+'-'))?.y;
 if(y)map.append(svg('text',{x:1000,y:y+5,'text-anchor':'middle',class:'corridor-label'},'ХОЛЛ'));
}
