/* Pure timetable logic, shared by browser and tests. No implicit building inference. */
(function(root){
'use strict';
function groupValue(value){return String(value).trim().replace(/[–—]/g,'-');}
function validGroup(value){return /^[0-9][0-9A-Za-zА-Яа-яЁё:.-]{1,39}$/.test(groupValue(value));}
function room(value){
 const raw=String(value||'').trim();
 const m=raw.match(/^(\d{1,2}|Гл\.?|Спорткорп)\s*[-–—]\s*([0-9A-Za-zА-Яа-яЁё]+(?:-[0-9A-Za-zА-Яа-яЁё]+)*)$/i);
 if(!m)return {raw,building:null,room:null};
 return {raw,building:/^\d+$/.test(m[1])?String(Number(m[1])):m[1].replace('.','').toLowerCase(),room:m[2]};
}
function normalize(rows){
 if(!Array.isArray(rows))throw Error('Некорректный формат расписания');
 return rows.map((r,i)=>{
 const d=String(r.DATE_Z||'').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
 const t=String(r.TIME_Z||'').match(/^(\d{2}):(\d{2})\s*[-–]\s*(\d{2}):(\d{2})$/);
 if(!d||!t)throw Error('Не распознаны дата или время занятия');
 const date=`${d[3]}-${d[2]}-${d[1]}`,check=new Date(date+'T00:00:00Z');
 const start=Number(t[1])*60+Number(t[2]),end=Number(t[3])*60+Number(t[4]);
 if(!Number.isFinite(check.getTime())||check.toISOString().slice(0,10)!==date||Number(t[1])>23||Number(t[3])>23||Number(t[2])>59||Number(t[4])>59||end<=start)throw Error('Некорректная дата или время');
 return {id:String(i),date,start,end,time:r.TIME_Z,subject:String(r.DISCIP||'Без названия'),teacher:String(r.PREP||''),kind:String(r.KOW||''),subgroup:(r.GROUPS||[]).map(g=>g.PRIM).filter(Boolean).join(', '),location:room(r.AUD)};
 }).sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start||a.end-b.end);
}
function moscow(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 return {date:`${p.year}-${p.month}-${p.day}`,minute:Number(p.hour)*60+Number(p.minute)};
}
function slots(lessons,now=new Date()){
 const {date,minute}=moscow(now),today=lessons.filter(l=>l.date===date);
 const current=today.filter(l=>l.start<=minute&&minute<l.end);
 const upcoming=today.filter(l=>l.start>minute);
 const nextStart=upcoming.length?Math.min(...upcoming.map(l=>l.start)):null;
 const next=upcoming.filter(l=>l.start===nextStart);
 const previous=today.filter(l=>l.end<=minute);
 const lastEnd=previous.length?Math.max(...previous.map(l=>l.end)):null;
 return {date,current,next,previous:previous.filter(l=>l.end===lastEnd),state:!today.length?'no_lessons':current.length?'current':next.length?(previous.length?'gap':'before'):'finished'};
}
function routeDecision(from,to,knownRooms){
 if(!to)return {ok:false,message:'Следующей пары сегодня нет.'};
 if(to.location.building&&to.location.building!=='9')return {ok:false,message:`Следующая пара: ${to.location.raw}, другой корпус. Внутренний маршрут корпуса №9 недоступен.`};
 if(!from)return {ok:false,message:'Начальную аудиторию выберите вручную в поле «Откуда».'};
 if(!from.location.building||!to.location.building)return {ok:false,message:'Аудитория не распознана. Уточните корпус и номер; маршрут можно задать вручную.'};
 if(from.location.building!=='9')return {ok:false,message:`Начальная пара: ${from.location.raw}, другой корпус. Внутренний маршрут корпуса №9 недоступен.`};
 const a=from.location.room,b=to.location.room;
 if(!knownRooms||!knownRooms.has(a)||!knownRooms.has(b))return {ok:false,message:'Аудитория отсутствует на доступном плане корпуса №9. Уточните данные карты.'};
 return {ok:true,from:a,to:b,message:`Маршрут по расписанию: ${a} → ${b}.`};
}
const api={groupValue,validGroup,room,normalize,moscow,slots,routeDecision};
root.ScheduleCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
