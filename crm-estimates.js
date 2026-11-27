/* CRM «Мастер мебельщик» — просчёты мебели */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let estimates=[],orders=[],measurements=[],suppliers=[],supplierProducts=[],estimateCatalog=[],active=null,items=[],costLines=[];
 const SHEET_AREA=5.796;
 const css=document.createElement('style');css.textContent=`
 #calc .c-toolbar{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}
 .c-modal{position:fixed;inset:0;background:#10182888;z-index:91;display:none;justify-content:flex-end}.c-modal.open{display:flex}
 .c-panel{background:#fff;width:min(920px,100%);height:100%;overflow:auto;padding:22px}
 .c-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.c-grid label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700}.c-grid .wide{grid-column:1/-1}
 .c-items{width:100%;border-collapse:collapse;white-space:nowrap}.c-items th,.c-items td{padding:7px;border-bottom:1px solid var(--line)}.c-items input,.c-items select{min-width:85px;padding:7px}
 .c-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0}.c-total{background:#f2f6ff;border-radius:10px;padding:12px}.c-total b{display:block;font-size:19px;margin-top:5px}
 .c-list{display:grid;gap:9px}.c-row{display:flex;justify-content:space-between;gap:12px;padding:13px;border:1px solid var(--line);border-radius:10px}
 @media(max-width:650px){.c-panel{padding:13px}.c-grid{grid-template-columns:1fr}.c-grid .wide{grid-column:auto}.c-summary{grid-template-columns:1fr}.c-row{flex-direction:column}}
 `;document.head.appendChild(css);
 function ensure(){
  const s=$('calc');if(!s)return;
  s.innerHTML=`<div class="head"><div><h1>Просчёты мебели</h1><div class="muted">Расчёт материалов, кромки, фурнитуры и стоимости по деталям</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="cWardrobe">▦ Конструктор шкафа</button><button class="btn primary" id="cNew">＋ Новый просчёт</button></div></div>
  <div class="panel"><div class="c-toolbar"><input id="cSearch" placeholder="Поиск по клиенту или изделию"><button class="btn" id="cRefresh">Обновить</button></div><div id="cRows" class="c-list">Загрузка…</div></div>
  <div class="c-modal" id="cModal"><div class="c-panel"><div class="head"><div><div class="small" id="cNo">НОВЫЙ ПРОСЧЁТ</div><h2>Расчёт мебели</h2></div><button class="btn" id="cClose">Закрыть ✕</button></div>
  <form id="cForm"><input type="hidden" name="id"><div class="c-grid">
  <label>Клиент *<input name="client_name" required></label><label>Название изделия *<input name="title" required placeholder="Кухня, шкаф, гардеробная"></label>
  <label>Привязать к заказу<select name="order_id"><option value="">Без привязки</option></select></label><label>Связанный замер<select name="measurement_id"><option value="">Не выбран</option></select></label>
  <label>Статус<select name="status"><option>Черновик</option><option>На согласовании</option><option>Согласован</option><option>Архив</option></select></label>
  
  
  </div><h3>Детали изделия</h3><div class="small">Выбери тип детали из списка и укажи размеры. Материалы и цены выбираются в разделах прайса ниже.</div><div class="scroll"><table class="c-items"><thead><tr><th>Деталь</th><th>Материал</th><th>Ширина, мм</th><th>Высота, мм</th><th>Кол-во</th><th></th></tr></thead><tbody id="cItemRows"></tbody></table></div>
  <div class="c-toolbar"><button type="button" class="btn" id="cAddItem">＋ Добавить деталь</button></div><h3>Прайс и деталировка по разделам</h3><div class="small">Выбери позицию из выпадающего списка. Цена и единица измерения подставятся из твоей таблицы.</div><div id="cCostSections"></div>
  <div class="c-grid">
  <label class="wide">Примечание<textarea name="notes"></textarea></label></div>
  <div id="cSummary" class="c-summary"></div><div class="actions"><button type="button" class="btn" id="cCancel">Отмена</button><button class="btn primary">Сохранить просчёт</button></div></form></div></div>`;
  $('cNew').onclick=()=>open();$('cWardrobe').onclick=()=>{if(!active){$('cForm').reset();items=[blank()];costLines=[];fillSelects();$('cForm').elements.status.value='Черновик';$('cNo').textContent='НОВЫЙ ПРОСЧЁТ';$('cModal').classList.remove('open');}window.dispatchEvent(new CustomEvent('crm:open-wardrobe-builder'));};$('cClose').onclick=close;$('cCancel').onclick=close;$('cModal').onclick=e=>{if(e.target.id==='cModal')close()};
  $('cSearch').oninput=render;$('cRefresh').onclick=load;$('cAddItem').onclick=()=>{items.push(blank());drawItems()};
  $('cForm').onsubmit=save;$('cForm').oninput=summary;
 }
 const blank=()=>({item_name:'Боковина',material:'ЛДСП 16 мм',width_mm:0,height_mm:0,quantity:1,edge_m:0,material_price_m2:0,source_material_price_m2:0,supplier_id:'',supplier_name:'',supplier_discount_percent:0});
 const costCategories=['Материалы','Облицовка и фасады','Фурнитура','Шкафы-купе','Лицевая фурнитура','Крепёж','Свет','Комплектующие','Работы и доставка'];
 
 const blankCost=()=>({category:'Фурнитура',item_name:'',unit:'шт',quantity:1,unit_price:0,source_unit_price:0,supplier_id:'',supplier_name:'',supplier_discount_percent:0});
 function money(v){return Number(v||0).toLocaleString('ru-RU',{maximumFractionDigits:2})+' ₽'}
 function catalogOptions(category,selected,unitFilter){return '<option value="">Выбрать из прайса пользователя…</option>'+estimateCatalog.filter(p=>p.is_active&&(!category||p.category===category)&&(!unitFilter||p.unit===unitFilter)).map(p=>'<option value="'+esc(p.id)+'" '+(p.id===selected?'selected':'')+'>'+esc(p.subgroup+' · '+p.item_name)+' · '+money(p.source_price)+' / '+esc(p.unit)+'</option>').join('')}
 function applyEstimateCatalog(target,id,kind){const p=estimateCatalog.find(x=>x.id===id);if(!p)return;target.catalog_item_id=p.id;target.item_name=p.item_name;target.unit=p.unit||'шт';target.supplier_name=p.supplier_name||'Прайс пользователя';target.supplier_id='';target.supplier_discount_percent=0;target.price_checked_at=p.updated_at||new Date().toISOString();if(kind==='material'){const price=Number(p.source_price||0);target.material=p.item_name;target.source_material_price_m2=price;target.material_price_m2=price}else{target.source_unit_price=Number(p.source_price||0);target.unit_price=Number(p.source_price||0)}}
 function supplierOptions(selected){return '<option value="">Не выбран</option>'+suppliers.filter(x=>x.is_active).map(x=>'<option value="'+esc(x.id)+'" '+(x.id===selected?'selected':'')+'>'+esc(x.name)+' · '+Number(x.discount_percent||0)+'%</option>').join('')}
 function productOptions(selected){return '<option value="">Выбрать товар из каталога…</option>'+supplierProducts.filter(p=>p.is_active).map(p=>'<option value="'+esc(p.id)+'" '+(p.id===selected?'selected':'')+'>'+esc(p.product_name)+' · '+esc(p.article||'без артикула')+' · '+money(p.calc_price)+'</option>').join('')}
 function applyCatalogProduct(target,id){const p=supplierProducts.find(x=>x.id===id);if(!p)return;target.supplier_product_id=p.id;target.price_checked_at=p.updated_at||new Date().toISOString();target.item_name=p.product_name;target.unit=p.unit||'шт';target.supplier_id=p.supplier_id;const s=suppliers.find(x=>x.id===p.supplier_id);target.supplier_name=s?.name||'';target.supplier_discount_percent=0;target.source_unit_price=Number(p.calc_price||0);target.unit_price=Number(p.calc_price||0)}
 function setCostSupplier(x,id){const p=suppliers.find(v=>v.id===id);x.supplier_id=p?.id||'';x.supplier_name=p?.name||'';x.supplier_discount_percent=0;const base=Number(x.source_unit_price??x.unit_price??0);x.source_unit_price=base;x.unit_price=base}
 function setMaterialSupplier(x,id){const p=suppliers.find(v=>v.id===id);x.supplier_id=p?.id||'';x.supplier_name=p?.name||'';x.supplier_discount_percent=Number(p?.discount_percent||0);x.source_material_price_m2=Number(x.source_material_price_m2??x.material_price_m2??0);x.material_price_m2=x.source_material_price_m2}
 function calc(){
  const sums=Object.fromEntries(costCategories.map(c=>[c,0]));
  costLines.forEach(x=>{
   const amount=Number(x.quantity||0)*Number(x.unit_price||0);
   if(x.category==='Фурнитура'&&String(x.item_name||'').trim().toLocaleUpperCase('ru').includes('КОМАР'))return;
   sums[x.category]=(sums[x.category]||0)+amount;
  });
  const materials=sums['Материалы']||0;
  const categoriesBase=costCategories.filter(c=>c!=='Работы и доставка').reduce((a,c)=>a+(sums[c]||0),0);
  const production=materials;
  const service=sums['Работы и доставка']||0;
  const cost=categoriesBase+production+service;
  const margin=cost*0.80;
  const subtotal=cost+margin;
  const managerCommission=subtotal*0.05;
  const total=subtotal+managerCommission;
  const area=items.reduce((a,x)=>a+Number(x.width_mm||0)*Number(x.height_mm||0)/1e6*Number(x.quantity||0),0);
  return {area,edge:0,materialsCost:materials,sheets:0,base:cost,total,categoriesBase,production,service,assembly:0,margin,managerCommission,sums,subtotal};
 }
 function summary(){
  if(!$('cSummary'))return;const x=calc();
  $('cSummary').innerHTML=`
   <div class="c-total"><span class="small">Материалы и комплектующие по прайсу</span><b>${money(x.categoriesBase)}</b></div>
   <div class="c-total"><span class="small">Работа на производстве (100% от раздела «Материалы»)</span><b>${money(x.production)}</b></div>
   <div class="c-total"><span class="small">Работы, доставка и услуги</span><b>${money(x.service)}</b></div>
   <div class="c-total"><span class="small">Моржа (80%)</span><b>${money(x.margin)}</b></div>
   <div class="c-total"><span class="small">Комиссия менеджера (5%)</span><b>${money(x.managerCommission)}</b></div>
   <div class="c-total"><span class="small">ИТОГОВАЯ СТОИМОСТЬ</span><b>${money(x.total)}</b></div>
   <div class="small wide">Итог по формулам основного листа Excel: сумма разделов + производство (100% материалов) + работы и доставка; моржа 80% от этой суммы; комиссия менеджера 5% от суммы с моржой. Дополнительные проценты и скидки не применяются.</div>`;
 }
 function drawItems(){
  $('cItemRows').innerHTML=items.map((x,i)=>`<tr>
  <td><select data-i="${i}" data-k="item_name">${['Боковина','Полка','Перегородка','Дно','Крышка','Цоколь','Фасад','Дверь','Задняя стенка','Планка','Деталь ящика','Другое'].map(n=>'<option '+(n===x.item_name?'selected':'')+'>'+esc(n)+'</option>').join('')}</select></td>
  <td><select data-i="${i}" data-k="catalog_item_id">${catalogOptions('Материалы',x.catalog_item_id,'лист')}</select><small>${esc(x.material||'Материал не выбран')}</small></td>
  <td><input data-i="${i}" data-k="width_mm" type="number" min="0" value="${x.width_mm}"></td>
  <td><input data-i="${i}" data-k="height_mm" type="number" min="0" value="${x.height_mm}"></td>
  <td><input data-i="${i}" data-k="quantity" type="number" min="1" value="${x.quantity}"></td>
  <td><button type="button" class="btn danger" data-del="${i}">×</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Добавьте детали изделия.</td></tr>';
  $('cItemRows').querySelectorAll('[data-i]').forEach(el=>{el.onchange=()=>{const x=items[Number(el.dataset.i)],k=el.dataset.k;if(k==='catalog_item_id')applyEstimateCatalog(x,el.value,'material');else x[k]=k==='item_name'?el.value:Number(el.value);drawItems();summary()};el.oninput=()=>{const x=items[Number(el.dataset.i)],k=el.dataset.k;if(k!=='catalog_item_id'&&k!=='item_name')x[k]=Number(el.value);summary()}});
  $('cItemRows').querySelectorAll('[data-del]').forEach(el=>el.onclick=()=>{items.splice(Number(el.dataset.del),1);drawItems();summary()});summary();
 }
 async function load(){
  const [a,b,c,d,e,g]=await Promise.all([db.from('furniture_estimates').select('*').order('created_at',{ascending:false}),db.from('furniture_orders').select('id,order_no,title,client_name').order('created_at',{ascending:false}),db.from('furniture_measurements').select('id,client_name,room_name,measured_at').order('created_at',{ascending:false}),db.from('crm_suppliers').select('id,name,category,discount_percent,is_active').eq('is_active',true).order('name'),db.from('crm_supplier_products').select('id,supplier_id,product_name,article,unit,source_price,discount_percent,calc_price,updated_at,is_active').eq('is_active',true).order('product_name').limit(1000),db.from('furniture_estimate_catalog').select('id,category,subgroup,item_name,unit,source_price,supplier_name,is_active,updated_at').eq('is_active',true).order('category').order('subgroup').order('item_name')]);
  if(a.error){$('cRows').innerHTML='<div class="error">Ошибка загрузки: '+esc(a.error.message)+'. Проверьте SQL-миграцию.</div>';return}
  estimates=a.data||[];orders=b.data||[];measurements=c.data||[];suppliers=d.error?[]:(d.data||[]);supplierProducts=e.error?[]:(e.data||[]);estimateCatalog=g.error?[]:(g.data||[]);if(g.error)console.warn('Каталог пользовательской таблицы не загружен. Выполните supabase-estimate-user-catalog.sql:',g.error.message);render();
 }
 function render(){
  const q=($('cSearch')?.value||'').toLocaleLowerCase('ru');const list=estimates.filter(x=>[x.client_name,x.title,x.estimate_no].join(' ').toLocaleLowerCase('ru').includes(q));
  $('cRows').innerHTML=list.length?list.map(x=>`<div class="c-row"><div><b>${esc(x.estimate_no||'Просчёт')} · ${esc(x.title)}</b><div class="small">${esc(x.client_name)} · ${esc(x.status)} · ${new Date(x.created_at).toLocaleDateString('ru-RU')}</div></div><button class="btn" data-edit="${esc(x.id)}">Открыть</button></div>`).join(''):'<div class="empty">Просчётов пока нет.</div>';
  $('cRows').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>open(estimates.find(x=>x.id===b.dataset.edit)));
 }
 function fillSelects(){
  const f=$('cForm');f.elements.order_id.innerHTML='<option value="">Без привязки</option>'+orders.map(o=>`<option value="${esc(o.id)}">${esc(o.order_no||'Заказ')} · ${esc(o.client_name)} · ${esc(o.title)}</option>`).join('');
  f.elements.measurement_id.innerHTML='<option value="">Не выбран</option>'+measurements.map(m=>`<option value="${esc(m.id)}">${esc(m.client_name)} · ${esc(m.room_name||'Замер')} · ${esc(m.measured_at||'')}</option>`).join('');
 }
 async function open(row=null){
  active=row?.id||null;items=[];costLines=[];$('cForm').reset();$('cForm').elements.id.value=active||'';fillSelects();
  if(row){
   Object.entries(row).forEach(([k,v])=>{if($('cForm').elements[k])$('cForm').elements[k].value=v??''});
   const {data,error}=await db.from('furniture_estimate_items').select('*').eq('estimate_id',row.id).order('created_at');
   if(error){alert('Не удалось загрузить детали: '+error.message);return}items=(data||[]).map(({id,estimate_id,created_at,...x})=>x);
   const lineResult=await db.from('furniture_estimate_lines').select('*').eq('estimate_id',row.id).order('created_at');
   if(lineResult.error){alert('Не удалось загрузить позиции сметы: '+lineResult.error.message);return}costLines=(lineResult.data||[]).map(({id,estimate_id,created_at,...x})=>x);
  }else {items=[blank()];costLines=[];}
  $('cNo').textContent=row?.estimate_no||'НОВЫЙ ПРОСЧЁТ';drawItems();drawCosts();$('cModal').classList.add('open');
 }
 function drawCosts(){
  const host=$('cCostSections');if(!host)return;
  host.innerHTML=costCategories.map((category,ci)=>{
   const rows=costLines.map((x,i)=>({...x,_i:i})).filter(x=>x.category===category);
   const htmlRows=rows.map(x=>'<tr>'+
    '<td><select data-ci="'+x._i+'" data-ck="catalog_item_id">'+catalogOptions(category,x.catalog_item_id)+'</select></td>'+
    '<td><input data-ci="'+x._i+'" data-ck="unit" value="'+esc(x.unit||'шт')+'" style="width:65px" readonly></td>'+
    '<td><input data-ci="'+x._i+'" data-ck="quantity" type="number" min="0" step=".001" value="'+Number(x.quantity||0)+'"></td>'+
    '<td><input data-ci="'+x._i+'" data-ck="source_unit_price" type="number" min="0" step=".01" value="'+Number(x.unit_price??x.source_unit_price??0)+'"></td>'+
    '<td>'+money(Number(x.quantity||0)*Number(x.unit_price||0))+'</td>'+
    '<td><button type="button" class="btn danger" data-cdel="'+x._i+'">×</button></td></tr>').join('');
   return '<section class="panel" style="padding:12px;margin:10px 0"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><b>'+esc((ci+1)+'. '+category)+'</b><button type="button" class="btn" data-add-category="'+esc(category)+'">＋ Добавить позицию</button></div>'+
    (rows.length?'<div class="scroll"><table class="c-items"><thead><tr><th>Наименование из прайса</th><th>Ед.</th><th>Количество</th><th>Цена, ₽</th><th>Сумма, ₽</th><th></th></tr></thead><tbody>'+htmlRows+'</tbody></table></div>':'<div class="small" style="padding:10px 0">Пока нет позиций</div>')+'</section>';
  }).join('');
  host.querySelectorAll('[data-add-category]').forEach(el=>el.onclick=()=>{costLines.push({...blankCost(),category:el.dataset.addCategory});drawCosts()});
  host.querySelectorAll('[data-ci]').forEach(el=>el.onchange=()=>{
   const x=costLines[Number(el.dataset.ci)],k=el.dataset.ck;
   if(k==='catalog_item_id'){applyEstimateCatalog(x,el.value,'line');drawCosts();summary();return;}
   if(k==='source_unit_price'){x.source_unit_price=Number(el.value);x.unit_price=Number(el.value);}
   else if(k==='unit')x.unit=el.value;
   else x.quantity=Number(el.value);
   drawCosts();summary();
  });
  host.querySelectorAll('[data-cdel]').forEach(el=>el.onclick=()=>{costLines.splice(Number(el.dataset.cdel),1);drawCosts();summary()});
 }
  function close(){$('cModal').classList.remove('open');active=null}
 async function save(e){
  e.preventDefault();if(!items.length&&!costLines.length){alert('Добавьте хотя бы одну деталь или позицию сметы.');return}
  const activeItems=items.filter(x=>x.item_name.trim()||Number(x.width_mm)>0||Number(x.height_mm)>0);if(activeItems.some(x=>!x.item_name.trim()||Number(x.width_mm)<=0||Number(x.height_mm)<=0||Number(x.quantity)<1)){alert('Заполните название, размеры и количество каждой добавленной детали.');return}
  const f=Object.fromEntries(new FormData(e.target));const {data:{user}}=await db.auth.getUser();
  const row={client_name:f.client_name.trim(),title:f.title.trim(),order_id:f.order_id||null,measurement_id:f.measurement_id||null,status:f.status,fittings_cost:0,labor_cost:0,other_cost:0,notes:f.notes||null,updated_at:new Date().toISOString()};
  const result=active?await db.from('furniture_estimates').update(row).eq('id',active).select().single():await db.from('furniture_estimates').insert({...row,created_by:user?.id||null}).select().single();
  if(result.error){alert('Не удалось сохранить просчёт: '+result.error.message);return}
  const id=result.data.id;const del=await db.from('furniture_estimate_items').delete().eq('estimate_id',id);
  if(del.error){alert('Просчёт сохранён, но не удалось обновить детали: '+del.error.message);return}
  const payload=activeItems.map(x=>({...x,catalog_item_id:x.catalog_item_id||null,source_material_price_m2:Number(x.source_material_price_m2??x.material_price_m2??0),material_price_m2:Number(x.source_material_price_m2??x.material_price_m2??0),supplier_discount_percent:0,estimate_id:id}));const ins=payload.length?await db.from('furniture_estimate_items').insert(payload):{error:null};
  if(ins.error){alert('Просчёт сохранён, но детали не записались: '+ins.error.message);return}
  const oldLines=await db.from('furniture_estimate_lines').delete().eq('estimate_id',id);
  if(oldLines.error){alert('Просчёт сохранён, но позиции сметы не обновились: '+oldLines.error.message);return}
  const linePayload=costLines.filter(x=>x.item_name.trim()&&x.catalog_item_id).map(x=>({...x,supplier_id:null,supplier_name:'Таблица пользователя',supplier_discount_percent:0,source_unit_price:Number(x.source_unit_price??x.unit_price??0),unit_price:Number(x.unit_price||0),price_checked_at:x.price_checked_at||null,supplier_product_id:null,estimate_id:id}));
  const lineInsert=linePayload.length?await db.from('furniture_estimate_lines').insert(linePayload):{error:null};
  if(lineInsert.error){alert('Просчёт сохранён, но позиции сметы не записались: '+lineInsert.error.message);return}
  await load();close();alert('Просчёт сохранён.');
 }
 window.addEventListener('crm:wardrobe-generated',e=>{const d=e.detail||{};if(!Array.isArray(d.items))return;active=null;items=d.append?items.concat(d.items):d.items;costLines=d.append?costLines:[];if(!d.append)$('cForm').elements.id.value='';if(!d.append){$('cForm').reset();$('cForm').elements.id.value='';fillSelects();$('cForm').elements.status.value='Черновик';}drawItems();if(d.title&&$('cForm')?.elements.title)$('cForm').elements.title.value=d.title;summary();$('cModal').classList.add('open');});
 function init(){
  if(!window.__crmAuthenticated||typeof db==='undefined'||!$('calc'))return;
  if(!window.__calcUI){ensure();window.__calcUI=true}
  load();
 }
 const original=window.tab;if(typeof original==='function'&&!window.__calcTabWrapped){window.tab=function(id){original(id);if(id==='calc')init()};window.__calcTabWrapped=true}
 document.addEventListener('click',e=>{if(e.target.closest('[data-tab="calc"]')){ensure();if(window.__crmAuthenticated)init();}}); 
 ensure(); 
 window.addEventListener('crm:authenticated',init);if(window.__crmAuthenticated)init();
})();
