(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const db=window.crmDb;
  const types=['Встреча','Замер','Проектирование','Согласование','Производство','Доставка','Монтаж','Задача'];
  const colors={'Встреча':'#3b82f6','Замер':'#0d9488','Проектирование':'#8b5cf6','Согласование':'#db2777','Производство':'#d97706','Доставка':'#0891b2','Монтаж':'#65a30d','Задача':'#64748b','Сделка':'#2563eb','Заказ':'#0f766e'};
  let cursor=new Date(); cursor.setDate(1);
  let mode='month', events=[], staff=[], editing=null;
  const pad=n=>String(n).padStart(2,'0');
  const dateKey=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const parseDate=s=>new Date(s+'T12:00:00');
  const fmt=d=>d.toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dayStart=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
  function initUI(){
    const section=$('calendar'); if(!section||section.dataset.ready)return; section.dataset.ready='1';
    section.innerHTML=`
      <div class="head calendar-head"><div><h1>Календарь мастерской</h1><div class="muted">Общее расписание всех сотрудников</div></div><button class="btn primary" id="calAdd">＋ Новое событие</button></div>
      <div class="panel calendar-toolbar"><div class="calendar-nav"><button class="btn" id="calPrev">‹</button><button class="btn" id="calToday">Сегодня</button><button class="btn" id="calNext">›</button><strong id="calTitle"></strong></div><div class="calendar-filters"><select id="calMode"><option value="month">Месяц</option><option value="week">Неделя</option><option value="day">День</option></select><select id="calStaff"><option value="">Все сотрудники</option></select><select id="calType"><option value="">Все события</option><option>Встреча</option><option>Замер</option><option>Проектирование</option><option>Согласование</option><option>Производство</option><option>Доставка</option><option>Монтаж</option><option>Задача</option><option>Сделка</option><option>Заказ</option></select></div></div>
      <div class="calendar-layout"><div class="panel calendar-main"><div id="calendarGrid"></div></div></div>
      <div class="modal" id="calModal"><div class="dialog"><h2 id="calModalTitle">Новое событие</h2><form id="calForm"><input type="hidden" name="id"><div class="grid">
      <label class="field wide">Название *<input name="title" required maxlength="180"></label>
      <label class="field">Тип<select name="event_type">${types.map(t=>'<option>'+t+'</option>').join('')}</select></label>
      <label class="field">Ответственный<input name="assigned_to" list="calStaffOptions" placeholder="Имя сотрудника"><datalist id="calStaffOptions"></datalist></label>
      <label class="field">Дата *<input name="start_date" type="date" required></label><label class="field">Время<input name="start_time" type="time"></label>
      <label class="field">Окончание<input name="end_time" type="time"></label>
      <label class="field wide">Связанный клиент / заказ<input name="related_label" placeholder="Например, Кухня — Иванов"></label>
      <label class="field wide">Описание<textarea name="description" rows="3"></textarea></label>
      </div><div class="actions"><button type="button" class="btn" id="calCancel">Отмена</button><button class="btn primary">Сохранить</button></div><p class="small" id="calError"></p></form></div></div>`;
    $('calPrev').onclick=()=>shift(-1);$('calNext').onclick=()=>shift(1);$('calToday').onclick=()=>{cursor=new Date();cursor.setDate(1);render();};
    $('calMode').onchange=e=>{mode=e.target.value;render();};$('calStaff').onchange=render;$('calType').onchange=render;
    $('calAdd').onclick=()=>openForm(dateKey(new Date()));$('calCancel').onclick=closeForm;
    $('calForm').onsubmit=saveEvent;
  }
  function shift(n){if(mode==='month')cursor.setMonth(cursor.getMonth()+n);else if(mode==='week')cursor.setDate(cursor.getDate()+7*n);else cursor.setDate(cursor.getDate()+n);render();}
  async function load(){
    initUI();
    const [ev,deals,orders]=await Promise.all([
      db.from('crm_calendar_events').select('*').order('start_at'),
      db.from('crm_deals').select('id,title,client_name,manager,stage,next_contact_at'),
      db.from('furniture_orders').select('id,order_no,title,client_name,manager,stage,due_date,measure_date')
    ]);
    if(ev.error){$('calendarGrid').innerHTML='<p class="error">Не удалось загрузить календарь: '+esc(ev.error.message)+'. Проверьте SQL-миграцию crm_calendar_events.</p>';return;}
    events=(ev.data||[]).map(x=>({...x,source:'manual'}));
    (deals.data||[]).forEach(x=>{if(x.next_contact_at)events.push({id:'deal-'+x.id,title:x.title||'Контакт с клиентом',event_type:'Сделка',assigned_to:x.manager,start_at:x.next_contact_at,related_label:x.client_name,source:'deal',related_id:x.id});});
    (orders.data||[]).forEach(x=>{
      if(x.due_date)events.push({id:'order-due-'+x.id,title:(x.title||x.order_no||'Заказ')+' — срок',event_type:'Заказ',assigned_to:x.manager,start_at:x.due_date+'T12:00:00',deadline_date:x.due_date,related_label:x.client_name,source:'order',related_id:x.id});
      if(x.measure_date)events.push({id:'order-measure-'+x.id,title:(x.title||x.order_no||'Заказ')+' — замер',event_type:'Замер',assigned_to:x.manager,start_at:x.measure_date+'T12:00:00',related_label:x.client_name,source:'order',related_id:x.id});
    });
    staff=[...new Set(events.map(x=>x.assigned_to).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ru'));
    $('calStaff').innerHTML='<option value="">Все сотрудники</option>'+staff.map(x=>'<option>'+esc(x)+'</option>').join('');
    $('calStaffOptions').innerHTML=staff.map(x=>'<option value="'+esc(x)+'">').join('');
    render();
  }
  function filtered(){const who=$('calStaff').value,type=$('calType').value;return events.filter(e=>(!who||e.assigned_to===who)&&(!type||e.event_type===type));}
  function deadlineStyle(value){
    if(!value)return '';
    const m=String(value).slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return '';
    const due=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
    const today=new Date();today.setHours(0,0,0,0);
    const days=Math.round((due-today)/86400000);
    if(days>14)return '';
    const t=Math.max(0,Math.min(1,(14-days)/14));
    const hue=Math.round(48*(1-t));
    const alpha=days<0?0.25:0.08+0.16*t;
    const borderAlpha=days<0?0.62:0.24+0.25*t;
    return ' style="--deadline-bg:hsla('+hue+',88%,55%,'+alpha+');--deadline-border:hsla('+hue+',78%,42%,'+borderAlpha+');--deadline-text:hsl('+hue+',65%,28%)"';
  }
  function eventHtml(e){const deadline=e.source==='order'&&e.deadline_date?deadlineStyle(e.deadline_date):'';const time=e.start_at&&e.start_at.includes('T')?new Date(e.start_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}):'Весь день';return '<button class="cal-event '+(deadline?'cal-deadline':'')+'" data-event="'+esc(e.id)+'" '+(deadline||'style="--event-color:'+ (colors[e.event_type]||'#64748b')+'"')+'><span class="cal-event-time">'+time+'</span><b>'+esc(e.title)+'</b><small>'+esc(e.assigned_to||'Не назначен')+(e.related_label?' · '+esc(e.related_label):'')+'</small></button>';}
  const deadlineStyleCss=document.createElement('style');deadlineStyleCss.textContent='.cal-event.cal-deadline{background:var(--deadline-bg);border-left-color:var(--deadline-border);color:var(--deadline-text);transition:background-color 1.2s ease,border-color 1.2s ease,color 1.2s ease}.cal-event.cal-deadline small,.cal-event.cal-deadline .cal-event-time{color:var(--deadline-text)}';document.head.appendChild(deadlineStyleCss);
  function render(){
    const grid=$('calendarGrid');if(!grid)return;
    $('calTitle').textContent=mode==='month'?cursor.toLocaleDateString('ru-RU',{month:'long',year:'numeric'}):mode==='day'?fmt(cursor):'Неделя · '+fmt(weekStart(cursor))+' – '+fmt(addDays(weekStart(cursor),6));
    const data=filtered();let days=[];
    if(mode==='month'){const first=new Date(cursor.getFullYear(),cursor.getMonth(),1);const start=addDays(first,-((first.getDay()+6)%7));for(let i=0;i<42;i++)days.push(addDays(start,i));}
    else if(mode==='week'){const start=weekStart(cursor);for(let i=0;i<7;i++)days.push(addDays(start,i));}
    else days=[dayStart(cursor)];
    if(mode==='month'||mode==='week'){
      grid.innerHTML='<div class="cal-weekdays">'+['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(x=>'<span>'+x+'</span>').join('')+'</div><div class="cal-month-grid '+(mode==='week'?'is-week':'')+'">'+days.map(d=>{const key=dateKey(d),list=data.filter(e=>e.start_at&&e.start_at.slice(0,10)===key);return '<div class="cal-cell '+(d.getMonth()!==cursor.getMonth()&&mode==='month'?'out-month':'')+(key===dateKey(new Date())?' is-today':'')+'"><button class="cal-date" data-date="'+key+'">'+d.getDate()+'</button>'+list.slice(0,3).map(e=>eventHtml(e)).join('')+(list.length>3?'<small>+'+(list.length-3)+' ещё</small>':'')+'</div>';}).join('')+'</div>';
      grid.querySelectorAll('.cal-cell[data-date]').forEach(cell=>{const openDay=()=>{cursor=parseDate(cell.dataset.date);mode='day';$('calMode').value='day';render();};cell.onclick=e=>{if(e.target.closest('[data-event]'))return;openDay();};cell.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target===cell){e.preventDefault();openDay();}};});
    }else{
      const d=days[0],key=dateKey(d),list=data.filter(e=>e.start_at&&e.start_at.slice(0,10)===key).sort((a,b)=>String(a.start_at).localeCompare(String(b.start_at)));
      grid.innerHTML='<div class="cal-day-heading">'+fmt(d)+'</div>'+(list.length?list.map(eventHtml).join(''):'<p class="muted">На этот день событий нет.</p>');
    }
    document.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>{const e=events.find(x=>x.id===b.dataset.event);if(e)openEvent(e);});
  }
  function weekStart(d){return addDays(dayStart(d),-((d.getDay()+6)%7));}
  function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
  function openForm(date,id){editing=id||null;$('calForm').reset();const f=$('calForm').elements;f.id.value=id||'';f.start_date.value=date||dateKey(new Date());$('calModalTitle').textContent=id?'Изменить событие':'Новое событие';$('calError').textContent='';$('calModal').classList.add('open');}
  function openEvent(e){if(e.source!=='manual'){alert('Это событие автоматически получено из '+(e.source==='deal'?'сделки':'заказа')+'. Измените дату в карточке соответствующей '+(e.source==='deal'?'сделки.':'заказа.'));return;}openForm(e.start_at.slice(0,10),e.id);const f=$('calForm').elements;f.title.value=e.title||'';f.event_type.value=e.event_type||'Задача';f.assigned_to.value=e.assigned_to||'';f.start_time.value=e.start_at&&e.start_at.includes('T')?e.start_at.slice(11,16):'';f.end_time.value=e.end_at&&e.end_at.includes('T')?e.end_at.slice(11,16):'';f.related_label.value=e.related_label||'';f.description.value=e.description||'';}
  function closeForm(){$('calModal').classList.remove('open');}
  async function saveEvent(e){
    e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));const start=f.start_date+(f.start_time?'T'+f.start_time+':00':'T00:00:00');const end=f.end_time?f.start_date+'T'+f.end_time+':00':null;
    const {data:{user}}=await db.auth.getUser();
    const row={title:f.title.trim(),event_type:f.event_type,assigned_to:f.assigned_to.trim()||null,start_at:start,end_at:end,related_label:f.related_label.trim()||null,description:f.description.trim()||null,created_by:user?.id||null,updated_at:new Date().toISOString()};
    const result=f.id?await db.from('crm_calendar_events').update(row).eq('id',f.id):await db.from('crm_calendar_events').insert(row);
    if(result.error){$('calError').textContent='Ошибка сохранения: '+result.error.message;return;}
    closeForm();await load();
  }
  window.initCrmCalendar=load;
  window.addEventListener('crm:authenticated',load);
  if(window.__crmAuthenticated)load();
})();