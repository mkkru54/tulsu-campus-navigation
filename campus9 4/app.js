'use strict';
const building=window.BUILDING,$=id=>document.getElementById(id),nodes=new Map(building.nodes.map(n=>[n.id,n]));
let floor=1,route=null,scale=1,showGraph=false;
const places=building.nodes.filter(n=>['room','poi'].includes(n.kind));
const normalize=v=>v.trim().toLowerCase().replace(/^9[-–\s]/,'');
for(const n of places){const o=document.createElement('option');o.value=n.kind==='room'?n.id:n.label;o.label=`${n.label} · ${n.floor} этаж`;$('places').append(o);}
for(const s of building.sources){const p=document.createElement('p'),a=document.createElement('a');a.href=s.url;a.textContent=s.label;a.target='_blank';a.rel='noopener';p.append(a,document.createTextNode(' — '+s.supports));$('sources').append(p);}
const pending=document.createElement('ul');for(const n of building.pendingRooms){const li=document.createElement('li');li.textContent=(n.id?`9-${n.id}: `:`${n.floor} этаж: `)+n.reason;pending.append(li);}$('sources').append(pending);
function svg(tag,attrs={},text){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;return e;}
function render(){
 $('floor-title').textContent=floor+' этаж';$('floors').replaceChildren();
 for(const f of building.floors){const b=document.createElement('button');b.textContent=f;b.setAttribute('aria-label',f+' этаж');b.setAttribute('aria-pressed',f===floor);if(route?.path.some(id=>nodes.get(id).floor===f))b.className='on-route';b.onclick=()=>{floor=f;render();};$('floors').append(b);}
 const map=$('map'),plan=building.plans[floor],ns=building.nodes.filter(n=>n.floor===floor);
 map.replaceChildren(svg('title',{id:'map-title'},`План корпуса №9: ${floor} этаж, по скриншоту 2ГИС`));map.setAttribute('viewBox',plan.viewBox.join(' '));map.style.width=`${scale*100}%`;
 const defs=svg('defs'),clip=svg('clipPath',{id:'building-mask',clipPathUnits:'userSpaceOnUse'});clip.append(svg('polygon',{points:plan.clipPolygon.map(p=>p.join(',')).join(' ')}));defs.append(clip);map.append(defs);
 map.append(svg('image',{href:plan.image,x:0,y:0,width:plan.imageWidth,height:plan.imageHeight,'clip-path':'url(#building-mask)'}));
 if(showGraph)for(const e of building.edges){const a=nodes.get(e.a),b=nodes.get(e.b);if(a.floor===floor&&b.floor===floor)map.append(svg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#687f93','stroke-width':3,'stroke-dasharray':'7 7',opacity:.7}));}
 if(route)for(let i=1;i<route.path.length;i++){const a=nodes.get(route.path[i-1]),b=nodes.get(route.path[i]);if(a.floor===floor&&b.floor===floor){const attrs={x1:a.x,y1:a.y,x2:b.x,y2:b.y,'stroke-linecap':'round'};map.append(svg('line',{...attrs,stroke:'white','stroke-width':14}));map.append(svg('line',{...attrs,stroke:'#0867c5','stroke-width':8}));}}
 for(const n of ns){if(n.kind==='corridor')continue;const selectable=places.includes(n),g=svg('g',{class:'point',...(selectable?{tabindex:0,role:'button','aria-label':n.label}:{})});g.append(svg('title',{},n.label));
 if(selectable){const size=n.kind==='room'?26:23;g.append(svg('circle',{cx:n.x,cy:n.y,r:size,class:'hit-zone'}));}
 if(n.kind==='stairs'&&route?.path.includes(n.id)){g.append(svg('circle',{cx:n.x,cy:n.y,r:18,fill:'#0867c5',stroke:'white','stroke-width':3}));const t=svg('text',{x:n.x,y:n.y+6,'text-anchor':'middle'},'↕');t.style.fill='white';g.append(t);}
 if(selectable){const choose=()=>{$($('pick').value).value=n.kind==='room'?n.id:n.label;calculate();};g.onclick=choose;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}};}
 map.append(g);
 }
 if(route)for(const [i,id]of route.path.entries()){const n=nodes.get(id);if(n.floor===floor&&(i===0||i===route.path.length-1)){const c=i===0?'#0867c5':'#be3d4a';map.append(svg('circle',{cx:n.x,cy:n.y,r:12,fill:c,stroke:'white','stroke-width':4,'pointer-events':'none'}));const label=svg('text',{x:n.x,y:n.y-30,'text-anchor':'middle',class:'endpoint-label','pointer-events':'none'},i===0?'СТАРТ':'ФИНИШ');map.append(label);}}
}
function calculate(e){e?.preventDefault();const resolve=v=>{const id=normalize(v);return places.find(n=>n.id===id||n.label.toLowerCase()===v.trim().toLowerCase())?.id??id;};const a=resolve($('from').value),b=resolve($('to').value);$('steps').replaceChildren();if(!places.some(n=>n.id===a)||!places.some(n=>n.id===b)){route=null;$('result').textContent='Точка не найдена. Выберите читаемый номер из списка или нажмите на помещение. Неподписанные комнаты пока недоступны.';render();return;}
 route=shortestPath(building.nodes,building.edges,a,b);if(!route){$('result').textContent='Путь не найден: проверьте соединения графа.';render();return;}floor=nodes.get(a).floor;
 $('result').textContent=a===b?'Вы уже в выбранной точке.':`${nodes.get(a).label} → ${nodes.get(b).label}. Путь по плану; положение дверей и переходы между этажами требуют проверки.`;
 const li=document.createElement('li');li.textContent=`Начните: ${nodes.get(a).label}, ${floor} этаж`;$('steps').append(li);
 let lastFloor=floor;for(const id of route.path){const n=nodes.get(id);if(n.floor!==lastFloor){const item=document.createElement('li'),btn=document.createElement('button');item.append(document.createTextNode(`${n.label}: ${n.floor} этаж. `));btn.textContent='Показать этаж';btn.onclick=()=>{floor=n.floor;render();};item.append(btn);$('steps').append(item);lastFloor=n.floor;}}
 if(a!==b){const end=document.createElement('li');end.textContent=`Пройдите по коридору к точке: ${nodes.get(b).label}`;$('steps').append(end);}render();
}
$('route-form').onsubmit=calculate;$('swap').onclick=()=>{const a=$('from').value;$('from').value=$('to').value;$('to').value=a;calculate();};
for(const id of ['from','to'])$(id).oninput=()=>{route=null;$('result').textContent='Постройте маршрут для новых точек.';$('steps').replaceChildren();render();};
$('plus').onclick=()=>{scale=Math.min(3,scale+.25);render();};$('minus').onclick=()=>{scale=Math.max(.75,scale-.25);render();};$('reset').onclick=()=>{scale=1;render();};$('graph').onchange=e=>{showGraph=e.target.checked;render();};
// Map shortcuts use stable IDs, without interpreting main-building labels.
for(const id of ['hall-4','cloakroom','passes','sber-atm','dining','museum']){const n=nodes.get(id),b=document.createElement('button');b.type='button';b.textContent=n.label;b.onclick=()=>{$('to').value=n.label;calculate();floor=n.floor;render();};$('quick-places').append(b);}
calculate();
