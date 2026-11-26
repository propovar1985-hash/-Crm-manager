/* CRM «Мастер мебельщик» — замеры и проекты */
(() => {
 'use strict';
 const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let rows=[], orders=[], active=null, pendingFiles={lidar:[],project:[]}, savedFiles={lidar:[],project:[]};
 const checklistSections=[
  {title:'1. Общие размеры помещения',items:['Длина каждой стены','Высота помещения в нескольких точках','Ширина помещения в нескольких точках','Диагонали помещения — проверить геометрию','Размеры и расположение ниш, выступов и коробов','Проверить отклонения стен, пола и потолка']},
  {title:'2. Проёмы и коммуникации',items:['Окна: ширина, высота, расстояния от углов и пола','Двери: ширина, высота, направление и сторона открывания','Радиаторы, трубы и стояки','Розетки, выключатели и выводы электрики','Вентиляция, газовые и водяные трубы (если есть)','Люки, счётчики и технические доступы']},
  {title:'3. Пол, стены и потолок',items:['Перепады уровня пола','Неровности и завалы стен','Перепады высоты потолка','Плинтусы, карнизы и потолочные конструкции','Материал стен в местах крепления мебели']},
  {title:'4. Условия установки мебели',items:['Место установки и точные границы мебели','Проверить открывание дверей, ящиков и техники','Учесть подоконники, откосы и наличники','Проверить возможность заноса мебели и крупных деталей','Уточнить, какие коммуникации нельзя перекрывать']},
  {title:'5. Фотофиксация и итоговая проверка',items:['Общие фотографии помещения с каждого угла','Фотографии каждой стены прямо','Крупные планы розеток, труб, выступов и сложных узлов','Фото важных размеров с рулеткой','Сохранить LiDAR-скан и проект замера','Нанести все размеры на план или схему','Повторно проверить ключевые размеры перед уходом']}
 ];
 let checklistState={}, checklistNotes='';
 const css=document.createElement('style');
 css.textContent=`
 #measure .m-toolbar,#calc .m-toolbar{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}
 .m-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
 .m-grid label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700}
 .m-grid .wide{grid-column:1/-1}
 .m-list{display:grid;gap:9px}.m-row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:13px;border:1px solid var(--line);border-radius:10px;background:#fff}
 .m-modal{position:fixed;inset:0;background:#10182888;z-index:90;display:none;justify-content:flex-end}.m-modal.open{display:flex}
 .m-panel{background:#fff;width:min(1100px,100%);height:100%;overflow:auto;padding:clamp(16px,2.5vw,28px);overscroll-behavior:contain}
 .m-panel h2{margin-top:0}.m-check-section{border:1px solid var(--line);border-radius:10px;padding:12px;margin:10px 0;background:#fff}.m-check-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px;font-size:16px}.m-check-item{display:flex;gap:12px;align-items:center;padding:11px 10px;margin:3px 0;border-radius:9px;font-size:16px;line-height:1.4;min-height:46px;cursor:pointer;transition:background .15s}.m-check-item.is-checked{background:rgba(22,163,106,.16)!important;box-shadow:inset 3px 0 0 rgba(22,163,106,.65)}.m-check-item input{width:24px;height:24px;flex:0 0 24px;margin:0;accent-color:#16a36a}.m-check-item span{flex:1}.m-check-progress{height:8px;background:#e8edf4;border-radius:10px;overflow:hidden}.m-check-progress>span{display:block;height:100%;background:#16a36a;width:0}.m-check-summary{font-size:12px;color:var(--muted);margin-top:6px}.m-file{padding:10px;border:1px dashed #b9c5d6;border-radius:9px}.m-upload-zone{display:flex;flex-direction:column;gap:7px;padding:14px;border:1px dashed #aab8ca;border-radius:10px;background:#f8fafc;cursor:pointer}.m-upload-zone.dragover{border-color:#2563eb;background:#eff6ff}.m-file-item{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:6px 0;border-top:1px solid #e5e7eb}.m-file-item a{overflow-wrap:anywhere}
 @media(min-width:900px){#mChecklistSections{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.m-check-section{margin:0 0 10px}.m-check-item{font-size:15px}}@media(max-width:650px){.m-grid{grid-template-columns:1fr}.m-grid .wide{grid-column:auto}.m-row{align-items:flex-start;flex-direction:column}.m-panel{padding:14px}.m-check-item{font-size:16px;min-height:50px}}
 `;
 document.head.appendChild(css);
 function ensure(){
  const s=$('measure');if(!s)return;
  s.innerHTML=`<div class="head"><div><h1>Замеры и проекты</h1><div class="muted">Обмерные данные, файлы LiDAR и проектная документация</div></div><button class="btn primary" id="mNew">＋ Новый замер</button></div>
  <div class="panel"><div class="m-toolbar"><input id="mSearch" placeholder="Поиск: клиент, адрес, объект"><button class="btn" id="mRefresh">Обновить</button></div><div id="mRows" class="m-list">Загрузка…</div></div>
  <div class="m-modal" id="mModal"><div class="m-panel"><div class="head"><div><div class="small" id="mHeading">НОВЫЙ ЗАМЕР</div><h2>Карточка замера</h2></div><button class="btn" id="mClose">Закрыть ✕</button></div>
  <form id="mForm"><input type="hidden" name="id"><div class="m-grid">
  <label>Клиент *<input name="client_name" required list="mClients"></label><datalist id="mClients"></datalist>
  <label>Телефон<input name="phone"></label><label class="wide">Адрес объекта<input name="address"></label>
  <label>Заказ (если уже создан)<select name="order_id"><option value="">Без привязки</option></select></label><label>Дата замера<input name="measured_at" type="date"></label>
  <label>Ответственный<input name="manager"></label><label>Помещение / зона<input name="room_name" placeholder="Кухня, спальня, прихожая"></label>
  <label>Длина, мм<input name="room_length_mm" type="number" min="0"></label><label>Ширина, мм<input name="room_width_mm" type="number" min="0"></label><label>Высота, мм<input name="room_height_mm" type="number" min="0"></label>
  <label class="wide">Размеры стен и привязки<textarea name="wall_dimensions" rows="4" placeholder="Стена А — 3200 мм; стена Б — 2450 мм; углы, ниши, выступы…"></textarea></label>
  <label class="wide">Окна, двери и проёмы<textarea name="openings_notes" rows="3"></textarea></label>
  <label class="wide">Коммуникации (вода, газ, электричество, вентиляция)<textarea name="utilities_notes" rows="3"></textarea></label>
  <label class="wide">Комментарий<textarea name="comments" rows="3"></textarea></label>
  <div class="wide" id="mChecklist"><div class="head"><div><b>Чек-лист замера</b><div class="small">Отмечайте пункты прямо во время замера. Отметки сохраняются в карточке.</div></div><b id="mChecklistCount">0 / 36</b></div><div class="m-check-progress"><span id="mChecklistBar"></span></div><div id="mChecklistSections"></div><label>Итоговые примечания по замеру<textarea id="mChecklistNotes" rows="3" placeholder="Что важно учесть при проектировании и монтаже…"></textarea></label></div>

  <div class="wide m-upload-zone" data-measure-upload="lidar" tabindex="0"><b>Файлы замера и LiDAR</b><span class="small">Перетащите сюда файлы или нажмите для выбора. До 90 МБ на файл.</span><input type="file" id="mLidar" multiple hidden><div id="mFilesLidar" class="m-file small">Файлы не выбраны</div></div>
  <div class="wide m-upload-zone" data-measure-upload="project" tabindex="0"><b>Проект, чертежи и документация</b><span class="small">PDF, DWG, файлы БАЗИС, изображения и другие документы.</span><input type="file" id="mProject" multiple hidden><div id="mFilesProject" class="m-file small">Файлы не выбраны</div></div>
  <label class="wide">Дополнительная ссылка на проект / чертёж<input name="project_path" type="url" placeholder="https://…"></label>
  </div><div class="actions"><button type="button" class="btn" id="mCancel">Отмена</button><button class="btn primary">Сохранить замер</button></div></form></div></div>`;
  $('mNew').onclick=()=>open();$('mClose').onclick=close;$('mCancel').onclick=close;
  $('mModal').onclick=e=>{if(e.target.id==='mModal')close()};
  $('mSearch').oninput=render;$('mRefresh').onclick=load;$('mForm').onsubmit=save;
  renderChecklist();$('mChecklistNotes').addEventListener('input',e=>{checklistNotes=e.target.value;});
  ['lidar','project'].forEach(kind=>{const input=$(kind==='lidar'?'mLidar':'mProject');input.addEventListener('change',()=>{queueFiles(kind,input.files);input.value='';});});
  const modal=$('mModal');
  modal.addEventListener('click',e=>{const zone=e.target.closest('[data-measure-upload]');if(zone&&!e.target.closest('a,button'))zone.querySelector('input[type=file]').click();});
  modal.addEventListener('keydown',e=>{const zone=e.target.closest('[data-measure-upload]');if(zone&&(e.key==='Enter'||e.key===' ')){e.preventDefault();zone.querySelector('input[type=file]').click();}});
  ['dragenter','dragover'].forEach(name=>modal.addEventListener(name,e=>{const zone=e.target.closest('[data-measure-upload]');if(zone){e.preventDefault();zone.classList.add('dragover');}}));
  ['dragleave','drop'].forEach(name=>modal.addEventListener(name,e=>{const zone=e.target.closest('[data-measure-upload]');if(zone){e.preventDefault();zone.classList.remove('dragover');if(name==='drop'&&e.dataTransfer?.files?.length)queueFiles(zone.dataset.measureUpload,e.dataTransfer.files);}}));
 }
 async function load(){
  const [a,b]=await Promise.all([db.from('furniture_measurements').select('*').order('created_at',{ascending:false}),db.from('furniture_orders').select('id,order_no,title,client_name').order('created_at',{ascending:false})]);
  if(a.error){$('mRows').innerHTML='<div class="error">Ошибка загрузки: '+esc(a.error.message)+'. Проверьте SQL-миграцию.</div>';return}
  rows=a.data||[];orders=b.data||[];render();
 }
 function queueFiles(kind,fileList){
  for(const file of Array.from(fileList||[])){if(file.size>90*1024*1024){alert('Файл '+file.name+' больше 90 МБ.');continue;}pendingFiles[kind].push(file);}
  renderFiles(kind);
 }
 function renderFiles(kind){
  const el=$(kind==='lidar'?'mFilesLidar':'mFilesProject');if(!el)return;
  const existing=savedFiles[kind].map(f=>'<div class="m-file-item"><a href="'+esc(f.external_url||'#')+'" target="_blank" rel="noopener">'+esc(f.file_name)+'</a><span>На Яндекс Диске</span></div>').join('');
  const pending=pendingFiles[kind].map((f,i)=>'<div class="m-file-item"><span>'+esc(f.name)+' · '+(f.size/1048576).toFixed(1)+' МБ</span><button type="button" class="btn" data-remove-measure-file="'+kind+'" data-index="'+i+'">Убрать</button></div>').join('');
  el.innerHTML=existing+pending||'Файлы не выбраны';
  el.querySelectorAll('[data-remove-measure-file]').forEach(b=>b.onclick=()=>{pendingFiles[kind].splice(Number(b.dataset.index),1);renderFiles(kind);});
 }
 async function loadMeasurementFiles(id){
  savedFiles={lidar:[],project:[]};
  const {data,error}=await db.from('furniture_measurement_files').select('*').eq('measurement_id',id).order('created_at');
  if(error){console.warn('Measurement files:',error.message);return;}
  for(const file of data||[]){if(savedFiles[file.category])savedFiles[file.category].push(file);}
  renderFiles('lidar');renderFiles('project');
 }
 function checklistTotal(){return checklistSections.reduce((n,s)=>n+s.items.length,0)}
 function renderChecklist(){
  const host=$('mChecklistSections');if(!host)return;
  host.innerHTML=checklistSections.map((section,si)=>{const done=section.items.filter((_,ii)=>checklistState[si+'_'+ii]).length;return '<section class="m-check-section"><div class="m-check-head"><b>'+esc(section.title)+'</b><span class="small">'+done+'/'+section.items.length+'</span></div>'+section.items.map((item,ii)=>{const key=si+'_'+ii;return '<label class="m-check-item '+(checklistState[key]?'is-checked':'')+'"><input type="checkbox" data-check-id="'+key+'" '+(checklistState[key]?'checked':'')+'><span>'+esc(item)+'</span></label>'}).join('')+'</section>'}).join('');
  host.querySelectorAll('[data-check-id]').forEach(input=>input.addEventListener('change',()=>{checklistState[input.dataset.checkId]=input.checked;input.closest('.m-check-item').classList.toggle('is-checked',input.checked);updateChecklistProgress();const section=input.closest('.m-check-section');const labels=section.querySelectorAll('[data-check-id]');section.querySelector('.m-check-head .small').textContent=Array.from(labels).filter(x=>x.checked).length+'/'+labels.length;}));
  updateChecklistProgress();$('mChecklistNotes').value=checklistNotes;
 }
 function updateChecklistProgress(){
  const total=checklistTotal(),done=Object.values(checklistState).filter(Boolean).length;
  $('mChecklistCount').textContent=done+' / '+total+' выполнено';$('mChecklistBar').style.width=(total?done/total*100:0)+'%';
 }
 async function loadChecklist(id){
  checklistState={};checklistNotes='';
  const {data,error}=await db.from('furniture_measurement_checklists').select('checklist,notes').eq('measurement_id',id).maybeSingle();
  if(error){console.warn('Чек-лист замера не загружен:',error.message);return}
  if(data){checklistState=data.checklist||{};checklistNotes=data.notes||''}
  renderChecklist();
 }
 async function saveChecklist(id){
  const {error}=await db.from('furniture_measurement_checklists').upsert({measurement_id:id,checklist:checklistState,notes:checklistNotes,updated_at:new Date().toISOString()},{onConflict:'measurement_id'});
  if(error)throw error;
 }
 function render(){
  const q=($('mSearch')?.value||'').toLocaleLowerCase('ru');
  const list=rows.filter(x=>[x.client_name,x.address,x.room_name,x.manager].join(' ').toLocaleLowerCase('ru').includes(q));
  $('mRows').innerHTML=list.length?list.map(x=>`<div class="m-row"><div><b>${esc(x.client_name)} · ${esc(x.room_name||'Замер')}</b><div class="small">${esc(x.address||'Адрес не указан')} · ${esc(x.measured_at||'Дата не указана')} · ${esc(x.manager||'Без ответственного')}</div><div class="small">Габариты: ${esc(x.room_length_mm||'—')} × ${esc(x.room_width_mm||'—')} × ${esc(x.room_height_mm||'—')} мм</div></div><button class="btn" data-edit="${esc(x.id)}">Открыть</button></div>`).join(''):'<div class="empty">Замеров пока нет. Нажмите «Новый замер».</div>';
  $('mRows').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>open(rows.find(x=>x.id===b.dataset.edit)));
 }
 async function open(row=null){
  active=row?.id||null;pendingFiles={lidar:[],project:[]};savedFiles={lidar:[],project:[]};checklistState={};checklistNotes='';$('mForm').reset();$('mForm').elements.id.value=active||'';
  $('mHeading').textContent=row?'ЗАМЕР':'НОВЫЙ ЗАМЕР';
  const form=$('mForm'), sel=form.elements.order_id;
  sel.innerHTML='<option value="">Без привязки</option>'+orders.map(o=>`<option value="${esc(o.id)}">${esc(o.order_no||'Заказ')} · ${esc(o.client_name)} · ${esc(o.title)}</option>`).join('');
  const clientsList=(()=>{try{return Array.isArray(clients)?clients:[]}catch(_){return []}})();
  $('mClients').innerHTML=clientsList.map(c=>`<option value="${esc(c.full_name)}"></option>`).join('');
  if(row)Object.entries(row).forEach(([k,v])=>{if(form.elements[k])form.elements[k].value=v??''});
  $('mModal').classList.add('open');renderFiles('lidar');renderFiles('project');renderChecklist();if(row?.id){await loadMeasurementFiles(row.id);await loadChecklist(row.id);}
 }
 function close(){const done=Object.values(checklistState).filter(Boolean).length,total=checklistTotal(),left=total-done;if(left>0&&!confirm('В чек-листе замера осталось '+left+' непоставленных галочек из '+total+'. Замер ещё не завершён. Всё равно закрыть карточку?'))return;$('mModal').classList.remove('open');active=null}
 async function save(e){
  e.preventDefault();const total=checklistTotal(),done=checklistSections.reduce((n,s,si)=>n+s.items.filter((_,ii)=>checklistState[si+'_'+ii]===true).length,0),missing=total-done;if(missing>0){alert('Нельзя сохранить замер: не отмечено пунктов — '+missing+' из '+total+'. Пройдите весь чек-лист и поставьте все галочки.');const first=$('mChecklistSections').querySelector('input:not(:checked)');if(first){first.scrollIntoView({behavior:'smooth',block:'center'});first.focus();}return;}const f=Object.fromEntries(new FormData(e.target));const {data:{user}}=await db.auth.getUser();
  const row={client_name:f.client_name.trim(),phone:f.phone||null,address:f.address||null,order_id:f.order_id||null,measured_at:f.measured_at||null,manager:f.manager||null,room_name:f.room_name||null,room_length_mm:f.room_length_mm?Number(f.room_length_mm):null,room_width_mm:f.room_width_mm?Number(f.room_width_mm):null,room_height_mm:f.room_height_mm?Number(f.room_height_mm):null,wall_dimensions:f.wall_dimensions||null,openings_notes:f.openings_notes||null,utilities_notes:f.utilities_notes||null,comments:f.comments||null,project_path:f.project_path||null,updated_at:new Date().toISOString()};
  const result=active?await db.from('furniture_measurements').update(row).eq('id',active).select().single():await db.from('furniture_measurements').insert({...row,created_by:user?.id||null}).select().single();
  if(result.error){alert('Не удалось сохранить замер: '+result.error.message);return}
  const saved=result.data;
  try{await saveChecklist(saved.id);}catch(err){alert('Замер сохранён, но чек-лист не записан: '+err.message+'. Выполните SQL-миграцию для чек-листа.');return;}
  for(const kind of ['lidar','project']){
   for(const file of pendingFiles[kind]){
    try{
     if(typeof window.uploadYandexFile!=='function')throw new Error('Модуль загрузки Яндекс Диска не подключён. Обновите CRM.');
     await window.uploadYandexFile(saved,kind,file,'measurement');
    }catch(err){alert('Замер сохранён. Не удалось загрузить файл '+file.name+': '+(err?.message||String(err))+'\\nФайл оставлен в форме — можно повторить сохранение.');return;}
   }
   pendingFiles[kind]=[];
  }
  await loadMeasurementFiles(saved.id);await load();close();alert('Замер сохранён. Файлы отправлены на Яндекс Диск.');
 }
 function init(){
  if(!window.__crmAuthenticated||typeof db==='undefined'||!$('measure'))return;
  if(!window.__measureUI){ensure();window.__measureUI=true}
  load();
 }
 const original=window.tab;
 if(typeof original==='function'&&!window.__measureTabWrapped){window.tab=function(id){original(id);if(id==='measure')init()};window.__measureTabWrapped=true}
 document.addEventListener('click',e=>{if(e.target.closest('[data-tab="measure"]')){ensure();if(window.__crmAuthenticated)init();}}); 
 ensure(); 
 window.addEventListener('crm:authenticated',init);if(window.__crmAuthenticated)init();
})();
