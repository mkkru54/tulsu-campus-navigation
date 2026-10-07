'use strict';
(function(){
 const S=window.ScheduleCore,el=id=>document.getElementById(id),key='tulsu.navigation9.group';
 let lessons=[],data=null,controller=null,generation=0,signature='',manual=false,lastDate='',loadedGroup='';
 function storage(action,value){try{return action==='get'?localStorage.getItem(key):action==='set'?localStorage.setItem(key,value):localStorage.removeItem(key);}catch{return null;}}
 function clear(){lessons=[];data=null;loadedGroup='';signature='';el('current-lesson').textContent='—';el('next-lesson').textContent='—';for(const id of ['current-choice','next-choice']){el(id).replaceChildren();el(id).disabled=true;}el('schedule-route').disabled=true;el('schedule-route-status').textContent='';}
 function choices(id,list){const select=el(id),old=select.value;select.replaceChildren();if(list.length>1){const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Выберите своё занятие';select.append(placeholder);}for(const lesson of list){const option=document.createElement('option');option.value=lesson.id;option.textContent=[lesson.subject,lesson.location.raw||'Аудитория неизвестна',lesson.subgroup].filter(Boolean).join(' · ');select.append(option);}if(list.some(l=>l.id===old))select.value=old;select.disabled=list.length<2;select.hidden=list.length<2;select.previousElementSibling.hidden=list.length<2;return list.find(l=>l.id===select.value)||null;}
 function card(id,lesson){const target=el(id);target.replaceChildren();if(!lesson){target.textContent='Нет занятия';return;}for(const text of [lesson.time,lesson.subject,lesson.location.raw||'Аудитория не указана',lesson.teacher,lesson.subgroup&&'Подгруппа: '+lesson.subgroup]){if(!text)continue;const p=document.createElement('p');p.textContent=text;target.append(p);}}
 function update(force=false){
 if(!data)return;
 const now=new Date(),slots=S.slots(lessons,now);lastDate=slots.date;
 const range=data.range;
 if(range&&(slots.date<range.start||slots.date>range.end)){el('schedule-status').textContent='Нет данных на сегодняшнюю дату: она вне опубликованного периода расписания.';el('schedule-route').disabled=true;return;}
 const messages={current:'Идёт занятие.',gap:'Окно / перерыв. Для маршрута используется последняя завершённая пара — проверьте, где вы сейчас.',before:'Занятия ещё не начались. Начальную аудиторию выберите вручную.',finished:'Занятия на сегодня закончились.',no_lessons:'Сегодня занятий нет.'};
 el('schedule-status').textContent=messages[slots.state]+((slots.current.length>1||slots.next.length>1)?' Есть несколько вариантов занятия: выберите свой.':'');
 el('current-heading').textContent=slots.state==='gap'?'Последняя завершённая пара':'Сейчас';
 const from=choices('current-choice',slots.current.length?slots.current:slots.state==='gap'?slots.previous:[]),to=choices('next-choice',slots.next);
 card('current-lesson',from);card('next-lesson',to);
 const decision=((slots.current.length>1&&!from)||(slots.next.length>1&&!to)||(slots.state==='gap'&&slots.previous.length>1&&!from))?{ok:false,message:'Выберите своё занятие среди одновременных пар, чтобы определить аудиторию.'}:S.routeDecision(from,to,window.Navigation9?.rooms);
 el('schedule-route').disabled=!decision.ok;
 el('schedule-route-status').textContent=decision.message+(manual&&decision.ok?' Ручной выбор сохранён; кнопка вернёт маршрут по расписанию.':'');
 const nextSignature=[loadedGroup,slots.date,from?.id,to?.id,decision.ok].join('|');
 if(decision.ok&&(force||(!manual&&signature!==nextSignature)))window.Navigation9.setRoute(decision.from,decision.to);
 signature=nextSignature;
 }
 async function load(background=false){
 const group=S.groupValue(el('group').value);controller?.abort();const token=++generation;
 if(!S.validGroup(group)){clear();el('schedule-status').textContent='Неверная группа. Введите точный номер с официального сайта ТулГУ.';return;}
 if(!background){clear();manual=false;el('schedule-status').textContent='Загрузка расписания…';}
 controller=new AbortController();const activeController=controller;el('schedule-load').disabled=true;
 const timeout=setTimeout(()=>activeController.abort(),35000);
 try{
 const response=await fetch('/api/schedule?'+new URLSearchParams({group}),{signal:activeController.signal});
 const result=await response.json();if(token!==generation)return;
 if(!response.ok||result.status!=='ok'){clear();el('schedule-status').textContent=result.message||(result.status==='no_data'?'Нет опубликованных данных для группы.':'Не удалось получить расписание.');return;}
 const parsed=S.normalize(result.lessons);lessons=parsed;data=result;loadedGroup=group;storage('set',group);el('group').value=group;el('schedule-source').href='https://tulsu.ru/schedule/?'+new URLSearchParams({search:group});update();
 }catch(error){if(token!==generation)return;clear();el('schedule-status').textContent=location.protocol==='file:'?'Для расписания запустите python3 server.py и откройте http://127.0.0.1:8080.':'Нет данных: сервер недоступен, превышено время ожидания или изменился формат расписания. Попробуйте ещё раз.';}
 finally{clearTimeout(timeout);if(token===generation)el('schedule-load').disabled=false;}
 }
 el('schedule-form').onsubmit=e=>{e.preventDefault();load();};
 el('group').addEventListener('input',()=>{++generation;controller?.abort();clear();el('schedule-load').disabled=false;el('schedule-status').textContent='Нажмите «Показать расписание» для новой группы.';});
 el('group-forget').onclick=()=>{++generation;controller?.abort();storage('remove');el('group').value='';clear();el('schedule-load').disabled=false;el('schedule-status').textContent='Группа удалена из этого браузера.';};
 for(const id of ['current-choice','next-choice'])el(id).onchange=()=>{manual=false;update(true);};
 el('schedule-route').onclick=()=>{manual=false;update(true);};
 for(const id of ['from','to','swap','pick','map','quick-places','route-form'])el(id).addEventListener(id==='from'||id==='to'?'input':id==='route-form'?'submit':'click',()=>{manual=true;update();});
 setInterval(()=>{if(data){const date=S.moscow().date;if(date!==lastDate){clear();load(true);}else update();}},30000);
 setInterval(()=>{if(data)load(true);},300000);
 const saved=storage('get');if(saved){el('group').value=saved;load();}
})();
