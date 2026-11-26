/* CRM «Мастер мебельщик» — замеры и проекты */
(() => {
 'use strict';
 const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let rows=[], orders=[], active=null, files=[];
 const css=document.createElement('style');
 css.textContent=`
 #measure .m-toolbar,#calc .m-toolbar{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}
 .m-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
 .m-grid label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700}
 .m-grid .wide{grid-column:1/-1}
 .m-list{display:grid;gap:9px}.m-row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:13px;border:1px solid var(--line);border-radius:10px;background:#fff}
 .m-modal{position:fixed;inset:0;background:#10182888;z-index:90;display:none;justify-content:flex-end}.m-modal.open{display:flex}
 .m-panel{background:#fff;width:min(760px,100%);height:100%;overflow:auto;padding:22px}
 .m-panel h2{margin-top:0}.m-file{padding:10px;border:1px dashed #b9c5d6;border-radius:9px}
 @media(max-width:650px){.m-grid{grid-template-columns:1fr}.m-grid .wide{grid-column:auto}.m-row{align-items:flex-start;flex-direction:column}.m-panel{padding:14px}}
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
  <label class="wide">Файл LiDAR / замера<input type="file" id="mLidar"><span class="small">Поддерживаются файлы замеров и облака точек; максимальный размер одного файла — 500 МБ.</span><div id="mFiles" class="m-file small">Файлы не выбраны</div><div id="mExistingFile" class="small"></div></label>
  <label class="wide">Ссылка на проект / чертёж<input name="project_path" type="url" placeholder="https://…"></label>
  </div><div class="actions"><button type="button" class="btn" id="mCancel">Отмена</button><button class="btn primary">Сохранить замер</button></div></form></div></div>`;
  $('mNew').onclick=()=>open();$('mClose').onclick=close;$('mCancel').onclick=close;
  $('mModal').onclick=e=>{if(e.target.id==='mModal')close()};
  $('mSearch').oninput=render;$('mRefresh').onclick=load;$('mForm').onsubmit=save;
  $('mLidar').onchange=function(){var input=$('mLidar');var names=[];for(var n=0;n<input.files.length;n++){names.push(input.files[n].name);} $('mFiles').textContent=names.join(', ')||'Файл не выбран';};
 }
 async function load(){
  const [a,b]=await Promise.all([db.from('furniture_measurements').select('*').order('created_at',{ascending:false}),db.from('furniture_orders').select('id,order_no,title,client_name').order('created_at',{ascending:false})]);
  if(a.error){$('mRows').innerHTML='<div class="error">Ошибка загрузки: '+esc(a.error.message)+'. Проверьте SQL-миграцию.</div>';return}
  rows=a.data||[];orders=b.data||[];render();
 }
 function render(){
  const q=($('mSearch')?.value||'').toLocaleLowerCase('ru');
  const list=rows.filter(x=>[x.client_name,x.address,x.room_name,x.manager].join(' ').toLocaleLowerCase('ru').includes(q));
  $('mRows').innerHTML=list.length?list.map(x=>`<div class="m-row"><div><b>${esc(x.client_name)} · ${esc(x.room_name||'Замер')}</b><div class="small">${esc(x.address||'Адрес не указан')} · ${esc(x.measured_at||'Дата не указана')} · ${esc(x.manager||'Без ответственного')}</div><div class="small">Габариты: ${esc(x.room_length_mm||'—')} × ${esc(x.room_width_mm||'—')} × ${esc(x.room_height_mm||'—')} мм</div></div><button class="btn" data-edit="${esc(x.id)}">Открыть</button></div>`).join(''):'<div class="empty">Замеров пока нет. Нажмите «Новый замер».</div>';
  $('mRows').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>open(rows.find(x=>x.id===b.dataset.edit)));
 }
 function open(row=null){
  active=row?.id||null;files=[];$('mForm').reset();$('mForm').elements.id.value=active||'';
  $('mHeading').textContent=row?'ЗАМЕР':'НОВЫЙ ЗАМЕР';
  const form=$('mForm'), sel=form.elements.order_id;
  sel.innerHTML='<option value="">Без привязки</option>'+orders.map(o=>`<option value="${esc(o.id)}">${esc(o.order_no||'Заказ')} · ${esc(o.client_name)} · ${esc(o.title)}</option>`).join('');
  const clientsList=(()=>{try{return Array.isArray(clients)?clients:[]}catch(_){return []}})();
  $('mClients').innerHTML=clientsList.map(c=>`<option value="${esc(c.full_name)}"></option>`).join('');
  if(row)Object.entries(row).forEach(([k,v])=>{if(form.elements[k])form.elements[k].value=v??''});
  $('mExistingFile').innerHTML='';
  if(row?.lidar_path){const signed=await db.storage.from('crm-project-files').createSignedUrl(row.lidar_path,3600);if(!signed.error)$('mExistingFile').innerHTML='<a href="'+esc(signed.data.signedUrl)+'" target="_blank" rel="noopener">Открыть загруженный файл замера</a>';else $('mExistingFile').textContent='Файл сохранён, но ссылка недоступна: '+signed.error.message;}
  $('mModal').classList.add('open');
 }
 function close(){$('mModal').classList.remove('open');active=null}
 async function save(e){
  e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const {data:{user}}=await db.auth.getUser();
  const row={client_name:f.client_name.trim(),phone:f.phone||null,address:f.address||null,order_id:f.order_id||null,measured_at:f.measured_at||null,manager:f.manager||null,room_name:f.room_name||null,room_length_mm:f.room_length_mm?Number(f.room_length_mm):null,room_width_mm:f.room_width_mm?Number(f.room_width_mm):null,room_height_mm:f.room_height_mm?Number(f.room_height_mm):null,wall_dimensions:f.wall_dimensions||null,openings_notes:f.openings_notes||null,utilities_notes:f.utilities_notes||null,comments:f.comments||null,project_path:f.project_path||null,updated_at:new Date().toISOString()};
  const result=active?await db.from('furniture_measurements').update(row).eq('id',active).select().single():await db.from('furniture_measurements').insert({...row,created_by:user?.id||null}).select().single();
  if(result.error){alert('Не удалось сохранить замер: '+result.error.message);return}
  const id=result.data.id;
  for(const file of Array.from($('mLidar').files||[])){
   const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path='measurements/'+id+'/'+Date.now()+'_'+safe;
   const up=await db.storage.from('crm-project-files').upload(path,file,{upsert:false});
   if(up.error){alert('Замер сохранён, но файл '+file.name+' не загружен: '+up.error.message);continue}
   const {error:updateError}=await db.from('furniture_measurements').update({lidar_path:path}).eq('id',id);
   if(updateError)alert('Файл загружен, но путь не записан: '+updateError.message);
  }
  await load();close();alert('Замер сохранён.');
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
