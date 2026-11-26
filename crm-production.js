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
 #production .prod-board{display:grid;grid-template-columns:repeat(3,minmax(230px,1fr));gap:12px;overflow:auto;align-items:start}
 #production .prod-col{border:1px solid var(--prod-border,#dfe6ef);background:var(--prod-bg,#eaf0f7);border-radius:12px;padding:10px;min-height:190px;transition:background .15s,border-color .15s}
 #production .prod-col:nth-child(1){--prod-bg:rgba(59,130,246,.10);--prod-border:rgba(59,130,246,.28)}
 #production .prod-col:nth-child(2){--prod-bg:rgba(16,185,129,.10);--prod-border:rgba(16,185,129,.28)}
 #production .prod-col:nth-child(3){--prod-bg:rgba(245,158,11,.11);--prod-border:rgba(245,158,11,.30)}
 #production .prod-col:nth-child(4){--prod-bg:rgba(139,92,246,.10);--prod-border:rgba(139,92,246,.28)}
 #production .prod-col:nth-child(5){--prod-bg:rgba(236,72,153,.09);--prod-border:rgba(236,72,153,.27)}
 #production .prod-col:nth-child(6){--prod-bg:rgba(6,182,212,.10);--prod-border:rgba(6,182,212,.28)}
 #production .prod-col:nth-child(7){--prod-bg:rgba(249,115,22,.10);--prod-border:rgba(249,115,22,.28)}
 #production .prod-col:nth-child(8){--prod-bg:rgba(168,85,247,.10);--prod-border:rgba(168,85,247,.28)}
 #production .prod-col:nth-child(9){--prod-bg:rgba(100,116,139,.11);--prod-border:rgba(100,116,139,.28)}
 #production .prod-col:nth-child(10){--prod-bg:rgba(132,204,22,.11);--prod-border:rgba(132,204,22,.30)}
 #production .prod-col.drop-target{outline:2px dashed var(--blue);outline-offset:-4px;background:#e4edff}
 #production .prod-card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px;margin:8px 0;cursor:grab;box-shadow:0 1px 2px #1522380a}
 #production .prod-card.dragging{opacity:.45}
 #production .prod-col-head{font-size:13px;font-weight:750;display:flex;justify-content:space-between;gap:8px;padding:3px 3px 8px}
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
   return `<div class="prod-col" data-prod-drop="${esc(step)}"><div class="prod-col-head"><span>${esc(step)}</span><span>${group.length}</span></div>${group.map(o=>`<article class="prod-card" draggable="true" data-prod-drag="${esc(o.id)}">
    <h3>${esc(o.order_no||'Заказ')} — ${esc(o.title||'Без названия')}</h3>
    <div>${esc(o.client_name||'Клиент не указан')}</div>
    <div class="muted">Ответственный: ${esc(o.manager||'—')}<br>Срок: ${esc(o.production_due||o.due_date||'не задан')}</div>
    <select data-stage="${esc(o.id)}">${steps.map(x=>`<option ${x=== (o.production_stage||steps[0])?'selected':''}>${esc(x)}</option>`).join('')}</select>
    <button class="btn" data-qc="${esc(o.id)}">Контроль качества</button>
   </article>`).join('')||'<div class="muted small">Нет заказов</div>'}</div>`;
  }).join('');
  $('prodBoard').querySelectorAll('[data-stage]').forEach(el=>el.onchange=()=>move(el.dataset.stage,el.value));
  $('prodBoard').querySelectorAll('[data-qc]').forEach(el=>el.onclick=()=>qcPrompt(el.dataset.qc));
  $('prodBoard').querySelectorAll('[data-prod-drag]').forEach(card=>{
   card.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',card.dataset.prodDrag);e.dataTransfer.effectAllowed='move';card.classList.add('dragging');});
   card.addEventListener('dragend',()=>card.classList.remove('dragging'));
  });
  $('prodBoard').querySelectorAll('[data-prod-drop]').forEach(col=>{
   col.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move';col.classList.add('drop-target');});
   col.addEventListener('dragleave',e=>{if(!col.contains(e.relatedTarget))col.classList.remove('drop-target');});
   col.addEventListener('drop',async e=>{e.preventDefault();col.classList.remove('drop-target');const id=e.dataTransfer.getData('text/plain');if(id)await move(id,col.dataset.prodDrop);});
  });
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
  const panel=$('prodQcPanel');if(!panel)return;panel.classList.toggle('hidden');
  if(panel.classList.contains('hidden'))return;
  const {data,error}=await db.from('furniture_quality_checks').select('*,furniture_orders(order_no,title,client_name)').order('created_at',{ascending:false}).limit(100);
  $('prodQcRows').innerHTML=error?`<p class="error">${esc(error.message)}</p>`:(data?.length?data.map(x=>`<div class="prod-card"><b>${esc(x.furniture_orders?.order_no||'Заказ')} · ${esc(x.furniture_orders?.title||'')}</b><div>${esc(x.result)} — ${esc(x.notes||'Без комментария')}</div><div class="small">${x.created_at?new Date(x.created_at).toLocaleString('ru-RU'):''}</div></div>`).join(''):'Проверок пока нет.');
 }
 let initialized=false;
 function init(){
  if(initialized||typeof db==='undefined'||!$('production'))return;
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
