/* Мастер мебельщик — Производство и контроль качества v1
   Подключить после crm-orders.js: <script src="./crm-production.js"></script>
   Требует supabase-production.sql.
*/
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const steps=['Подготовка документации','Раскрой','Кромление','Присадка','Фрезеровка','Изготовление фасадов','Сборка','Контроль качества','Упаковка','Готово к доставке'];
 let rows=[];
 const css=document.createElement('style');
 css.textContent=`
 #production .prod-board{display:grid;grid-template-columns:repeat(3,minmax(230px,1fr));gap:12px;overflow:auto}
 #production .prod-col{background:#eaf0f7;border:1px solid #dfe6ef;border-radius:12px;padding:10px;min-height:180px}
 #production .prod-card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px;margin:8px 0}
 #production .prod-card h3{font-size:15px;margin:0 0 7px}
 #production .prod-card .muted{font-size:12px;line-height:1.5}
 #production .prod-card select{margin-top:9px}
 #production .prod-card button{margin-top:8px}
 #production .prod-qc{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
 @media(max-width:700px){#production .prod-board{grid-template-columns:repeat(3,260px)}}
 `;
 document.head.appendChild(css);
 function ensure(){
  const s=$('production'); if(!s)return;
  s.innerHTML=`<div class="head"><div><h1>Производство</h1><div class="muted">Контроль этапов, сроков и качества по заказам</div></div><button class="btn" id="prodRefresh">Обновить</button></div>
  <div class="panel"><div class="tools"><input id="prodSearch" placeholder="Поиск по номеру, клиенту, изделию"><select id="prodFilter" style="max-width:220px"><option value="">Все этапы</option>${steps.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div><div id="prodStats" class="muted"></div></div>
  <div class="prod-qc"><button class="btn" id="prodQcList">Открыть контроль качества</button><span class="muted">В производство попадают заказы, сохранённые в карточках заказов.</span></div>
  <div id="prodBoard" class="prod-board"><div class="panel">Загрузка…</div></div>
  <div class="panel hidden" id="prodQcPanel"><h2>Контроль качества</h2><div id="prodQcRows"></div></div>`;
  $('prodRefresh').onclick=load;
  $('prodSearch').oninput=render;
  $('prodFilter').onchange=render;
  $('prodQcList').onclick=loadQC;
 }
 async function load(){
  const {data,error}=await db.from('furniture_orders').select('id,order_no,title,client_name,stage,manager,production_stage,production_start,production_due,quality_notes,due_date').order('created_at',{ascending:false});
  if(error){$('prodBoard').innerHTML=`<div class="panel error">Ошибка: ${esc(error.message)}. Проверьте SQL-миграцию.</div>`;return;}
  rows=data||[]; render();
 }
 function render(){
  const q=($('prodSearch')?.value||'').toLocaleLowerCase('ru'),f=$('prodFilter')?.value||'';
  const list=rows.filter(o=>(!f||(o.production_stage||steps[0])===f)&&[o.order_no,o.title,o.client_name,o.manager].join(' ').toLocaleLowerCase('ru').includes(q));
  $('prodStats').textContent=`Заказов: ${list.length} · В производстве: ${list.filter(x=>(x.production_stage||'')!=='Готово к доставке').length}`;
  $('prodBoard').innerHTML=steps.map(step=>{
   const group=list.filter(o=>(o.production_stage||steps[0])===step);
   return `<div class="prod-col"><b>${esc(step)}</b><span class="muted"> · ${group.length}</span>${group.map(o=>`<article class="prod-card">
    <h3>${esc(o.order_no||'Заказ')} — ${esc(o.title||'Без названия')}</h3>
    <div>${esc(o.client_name||'Клиент не указан')}</div>
    <div class="muted">Ответственный: ${esc(o.manager||'—')}<br>Срок: ${esc(o.production_due||o.due_date||'не задан')}</div>
    <select data-stage="${esc(o.id)}">${steps.map(x=>`<option ${x=== (o.production_stage||steps[0])?'selected':''}>${esc(x)}</option>`).join('')}</select>
    <button class="btn" data-qc="${esc(o.id)}">Контроль качества</button>
   </article>`).join('')||'<div class="muted small">Нет заказов</div>'}</div>`;
  }).join('');
  $('prodBoard').querySelectorAll('[data-stage]').forEach(el=>el.onchange=()=>move(el.dataset.stage,el.value));
  $('prodBoard').querySelectorAll('[data-qc]').forEach(el=>el.onclick=()=>qcPrompt(el.dataset.qc));
 }
 async function move(id,stage){
  const {data:{user}}=await db.auth.getUser();
  const {error}=await db.from('furniture_orders').update({production_stage:stage,updated_at:new Date().toISOString()}).eq('id',id);
  if(error){alert('Не удалось изменить этап: '+error.message);load();return;}
  await db.from('furniture_production_events').insert({order_id:id,stage,details:'Этап производства изменён',created_by:user?.id||null});
  await load();
 }
 async function qcPrompt(id){
  const result=prompt('Результат контроля качества: пройдено / есть замечания / не пройдено');
  if(!result)return;
  const notes=prompt('Комментарий или выявленные дефекты (можно оставить пустым):')||'';
  const passed=/пройдено|готово|ok|успешно/i.test(result)&&!/не пройдено|не готово/i.test(result);
  const {data:{user}}=await db.auth.getUser();
  const {error}=await db.from('furniture_quality_checks').insert({order_id:id,result,notes,passed,checked_by:user?.id||null});
  if(error){alert('Не удалось сохранить проверку: '+error.message);return;}
  if(passed){
   const {error:updateError}=await db.from('furniture_orders').update({production_stage:'Готово к доставке',quality_notes:notes,updated_at:new Date().toISOString()}).eq('id',id);
   if(updateError)alert('Проверка сохранена, но этап заказа не обновлён: '+updateError.message);
   else await db.from('furniture_production_events').insert({order_id:id,stage:'Готово к доставке',details:'Контроль качества пройден. '+notes,created_by:user?.id||null});
  } else {
   await db.from('furniture_orders').update({production_stage:'Контроль качества',quality_notes:notes,updated_at:new Date().toISOString()}).eq('id',id);
  }
  await load(); alert('Результат контроля качества сохранён.');
 }
 async function loadQC(){
  const panel=$('prodQcPanel');panel.classList.toggle('hidden');
  if(panel.classList.contains('hidden'))return;
  const {data,error}=await db.from('furniture_quality_checks').select('*,furniture_orders(order_no,title,client_name)').order('created_at',{ascending:false}).limit(100);
  $('prodQcRows').innerHTML=error?`<p class="error">${esc(error.message)}</p>`:(data?.length?data.map(x=>`<div class="prod-card"><b>${esc(x.furniture_orders?.order_no||'Заказ')} · ${esc(x.furniture_orders?.title||'')}</b><div>${esc(x.result)} — ${esc(x.notes||'Без комментария')}</div><div class="small">${x.created_at?new Date(x.created_at).toLocaleString('ru-RU'):''}</div></div>`).join(''):'Проверок пока нет.');
 }
 let initialized=false;
 function init(){
  if(initialized||!window.__crmAuthenticated||typeof db==='undefined'||!$('production'))return;
  initialized=true;
  ensure();
  const original=window.tab;
  if(typeof original==='function')window.tab=function(id){original(id);if(id==='production')load();};
 }
 function waitForAuth(){
  if(window.__crmAuthenticated){init();return;}
  window.addEventListener('crm:authenticated',init,{once:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',waitForAuth,{once:true});else waitForAuth();
})();
