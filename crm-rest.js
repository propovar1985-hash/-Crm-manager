/* Мастер мебельщик — дополнительные модули v1
   Календарь/задачи, гарантия/сервис, каталог материалов и база знаний.
   Подключать после crm-orders.js и crm-production.js.
   Реальные Push, Telegram, WhatsApp, email, клиентский портал и AI требуют
   отдельных провайдеров/API и не включаются автоматически этим файлом.
*/
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let tasks=[],cases=[],materials=[],articles=[];
 const css=document.createElement('style');
 css.textContent=`
 .rest-toolbar{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}
 .rest-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
 .rest-card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px}
 .rest-card h3{margin:0 0 8px;font-size:16px}
 .rest-form{display:grid;grid-template-columns:1fr 1fr;gap:10px}
 .rest-form label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700}
 .rest-form .wide{grid-column:1/-1}
 .rest-list{display:grid;gap:9px}
 .rest-item{background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px}
 @media(max-width:650px){.rest-grid,.rest-form{grid-template-columns:1fr}.rest-form .wide{grid-column:auto}}
 `;
 document.head.appendChild(css);
 const formField=(label,name,type='text',wide=false)=>`<label class="${wide?'wide':''}">${label}<input name="${name}" type="${type}"></label>`;
 function ensureSection(id,title,desc,button){
   let s=$(id); if(!s)return null;
   s.innerHTML=`<div class="head"><div><h1>${title}</h1><div class="muted">${desc}</div></div>${button||''}</div><div id="${id}Body"></div>`;
   return s;
 }
 function addNav(tab,title){
   const side=document.querySelector('.side');
   if(side&&!side.querySelector(`[data-tab="${tab}"]`)){
     const b=document.createElement('button');b.className='navbtn';b.dataset.tab=tab;b.textContent=title;
     b.addEventListener('click',()=>window.tab?.(tab));side.appendChild(b);
   }
 }
 function ensureExtraSections(){
   const content=document.querySelector('.content'); if(!content)return;
   const defs=[
    ['tasks','Задачи','Планирование и контроль поручений'],
    ['service','Гарантия и сервис','Рекламации, дефекты и послегарантийное обслуживание'],
    ['catalog','Каталог','Материалы, декоры и фурнитура'],
    ['knowledge','Инструкции','Внутренние инструкции и чек-листы']
   ];
   defs.forEach(([id,title,desc])=>{
     if(!$(id)){const s=document.createElement('section');s.id=id;s.className='hidden';s.innerHTML=`<div class="head"><div><h1>${title}</h1><div class="muted">${desc}</div></div></div><div id="${id}Body"></div>`;content.appendChild(s);}
     addNav(id,({tasks:'✓ Задачи',service:'⚒ Гарантия и сервис',catalog:'▤ Каталог',knowledge:'▣ Инструкции'})[id]);
   });
 }
 async function loadTable(table){const {data,error}=await db.from(table).select('*').order('created_at',{ascending:false});if(error){console.warn(table,error.message);return [];}return data||[];}
 async function currentUser(){const {data}=await db.auth.getUser();return data?.user||null;}
 function renderTasks(){
   $('tasksBody').innerHTML=`<div class="panel"><div class="rest-toolbar"><button class="btn primary" id="taskAdd">＋ Новая задача</button><select id="taskFilter"><option value="">Все статусы</option><option>Новая</option><option>В работе</option><option>Выполнена</option><option>Отложена</option></select></div><div class="rest-list" id="taskList"></div></div>`;
   const draw=()=>{const f=$('taskFilter').value;const list=tasks.filter(x=>!f||x.status===f);$('taskList').innerHTML=list.length?list.map(x=>`<div class="rest-item"><b>${esc(x.title)}</b><div class="small">${esc(x.due_at||'Без срока')} · ${esc(x.assignee||'Без исполнителя')} · ${esc(x.status)}</div><p>${esc(x.details||'')}</p><select data-status="${x.id}"><option ${x.status==='Новая'?'selected':''}>Новая</option><option ${x.status==='В работе'?'selected':''}>В работе</option><option ${x.status==='Выполнена'?'selected':''}>Выполнена</option><option ${x.status==='Отложена'?'selected':''}>Отложена</option></select></div>`).join(''):'<div class="empty">Задач пока нет.</div>';};
   draw();$('taskFilter').onchange=draw;
   $('taskList').onchange=async e=>{const id=e.target.dataset.status;if(!id)return;const {error}=await db.from('furniture_tasks').update({status:e.target.value}).eq('id',id);if(error)alert(error.message);else{tasks=await loadTable('furniture_tasks');draw();}};
   $('taskAdd').onclick=async()=>{const title=prompt('Название задачи');if(!title)return;const due_at=prompt('Срок (например, 2026-11-20 15:00)')||null;const assignee=prompt('Ответственный')||null;const details=prompt('Комментарий')||null;const u=await currentUser();const {error}=await db.from('furniture_tasks').insert({title,due_at,assignee,details,status:'Новая',created_by:u?.id||null});if(error)alert(error.message);else{tasks=await loadTable('furniture_tasks');draw();}};
 }
 function renderService(){
   $('serviceBody').innerHTML=`<div class="panel"><div class="rest-toolbar"><button class="btn primary" id="caseAdd">＋ Новое обращение</button></div><div class="rest-list" id="caseList"></div></div>`;
   $('caseList').innerHTML=cases.length?cases.map(x=>`<div class="rest-item"><b>${esc(x.title)}</b><div class="small">${esc(x.client_name)} · ${esc(x.category)} · ${esc(x.status)}</div><p>${esc(x.description||'')}</p><div class="small">Ответственный: ${esc(x.assignee||'—')} · Срок: ${esc(x.due_date||'—')}</div></div>`).join(''):'<div class="empty">Обращений пока нет.</div>';
   $('caseAdd').onclick=async()=>{const client_name=prompt('Клиент');if(!client_name)return;const title=prompt('Краткое название дефекта');if(!title)return;const category=prompt('Категория: дефект изготовления / доставка / монтаж / фурнитура / другое')||'Другое';const description=prompt('Описание')||'';const assignee=prompt('Ответственный')||null;const u=await currentUser();const {error}=await db.from('furniture_service_cases').insert({client_name,title,category,description,assignee,status:'Новое',created_by:u?.id||null});if(error)alert(error.message);else{cases=await loadTable('furniture_service_cases');renderService();}};
 }
 function renderCatalog(){
   $('catalogBody').innerHTML=`<div class="panel"><div class="rest-toolbar"><button class="btn primary" id="materialAdd">＋ Добавить позицию</button><input id="materialSearch" placeholder="Поиск по материалам и фурнитуре"></div><div class="rest-grid" id="materialList"></div></div>`;
   const draw=()=>{const q=$('materialSearch').value.toLowerCase();const list=materials.filter(x=>[x.name,x.category,x.brand,x.article,x.decor].join(' ').toLowerCase().includes(q));$('materialList').innerHTML=list.map(x=>`<div class="rest-card"><h3>${esc(x.name)}</h3><div class="small">${esc(x.category)} · ${esc(x.brand||'')} · ${esc(x.article||'')}</div><p>${esc(x.decor||'')} ${x.thickness_mm?`· ${esc(x.thickness_mm)} мм`:''}</p></div>`).join('')||'<div class="empty">Каталог пуст.</div>';};
   draw();$('materialSearch').oninput=draw;
   $('materialAdd').onclick=async()=>{const name=prompt('Название позиции');if(!name)return;const category=prompt('Категория (ЛДСП, МДФ, кромка, фурнитура, стекло и т.д.)')||'Другое';const brand=prompt('Производитель / бренд')||null;const article=prompt('Артикул')||null;const decor=prompt('Декор / описание')||null;const u=await currentUser();const {error}=await db.from('furniture_catalog').insert({name,category,brand,article,decor,created_by:u?.id||null});if(error)alert(error.message);else{materials=await loadTable('furniture_catalog');draw();}};
 }
 function renderKnowledge(){
   $('knowledgeBody').innerHTML=`<div class="panel"><div class="rest-toolbar"><button class="btn primary" id="articleAdd">＋ Новая инструкция</button></div><div class="rest-list" id="articleList"></div></div>`;
   $('articleList').innerHTML=articles.map(x=>`<div class="rest-item"><b>${esc(x.title)}</b><div class="small">${esc(x.role||'Для всех')} · ${esc(x.updated_at||'')}</div><p>${esc(x.body||'')}</p></div>`).join('')||'<div class="empty">Инструкций пока нет.</div>';
   $('articleAdd').onclick=async()=>{const title=prompt('Название инструкции');if(!title)return;const role=prompt('Для какой должности?')||'Для всех';const body=prompt('Текст инструкции');if(!body)return;const u=await currentUser();const {error}=await db.from('furniture_knowledge').insert({title,role,body,created_by:u?.id||null});if(error)alert(error.message);else{articles=await loadTable('furniture_knowledge');renderKnowledge();}};
 }
 let initialized=false;
 async function init(){
   if(initialized||!window.__crmAuthenticated||typeof db==='undefined')return;
   initialized=true;
   ensureExtraSections();
   tasks=await loadTable('furniture_tasks');cases=await loadTable('furniture_service_cases');materials=await loadTable('furniture_catalog');articles=await loadTable('furniture_knowledge');
   renderTasks();renderService();renderCatalog();renderKnowledge();
   const oldTab=window.tab;
   if(typeof oldTab==='function'&&!window.__restTabWrapped){window.tab=function(id){oldTab(id);if(['tasks','service','catalog','knowledge'].includes(id)){const el=$(id);if(el)el.classList.remove('hidden');}};window.__restTabWrapped=true;}
 }
 function waitForAuth(){
   if(window.__crmAuthenticated){init();return;}
   window.addEventListener('crm:authenticated',init,{once:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',waitForAuth,{once:true});else waitForAuth();
})();
