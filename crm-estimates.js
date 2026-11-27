/* CRM «Мастер мебельщик» — просчёты мебели */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let estimates=[],orders=[],measurements=[],estimateCatalog=[],active=null,items=[],costLines=[];
 const SHEET_AREA=5.796;
 const css=document.createElement('style');css.textContent=`
 #calc .c-toolbar{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}
 .c-modal{position:fixed;inset:0;background:#10182888;z-index:91;display:none;justify-content:flex-end}.c-modal.open{display:flex}
 .c-panel{background:#fff;width:min(920px,100%);height:100%;overflow:auto;padding:22px}
 .c-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.c-grid label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700}.c-grid .wide{grid-column:1/-1}
 .c-items{width:100%;border-collapse:collapse;white-space:nowrap}.c-items th,.c-items td{padding:7px;border-bottom:1px solid var(--line)}.c-items input,.c-items select{min-width:85px;padding:7px}.c-items th{white-space:normal;min-width:100px}.c-items th:nth-child(5),.c-items th:nth-child(6){min-width:155px}.c-items td:nth-child(5) input,.c-items td:nth-child(6) input{min-width:125px}
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
  
  
  </div><h3>Детали изделия</h3><div class="c-grid" style="margin:10px 0"><label>Материал корпуса для всех деталей<select id="cDefaultMaterial"></select><span class="small">Общая цена за лист, ₽</span><input id="cMaterialPrice" type="number" min="0" step=".01"></label><label>Материал фасадов<select id="cDefaultFacade"></select><span class="small">Общая цена за м² / единицу, ₽</span><input id="cFacadePrice" type="number" min="0" step=".01"></label><label>Кромка для всех деталей<select id="cDefaultEdge"></select><span class="small">Общая цена за метр, ₽</span><input id="cEdgePrice" type="number" min="0" step=".01"></label><label>Формат листа ЛДСП<select id="cSheetFormat"><option value="2800x2070">2800 × 2070 мм</option><option value="2750x1830">2750 × 1830 мм</option></select></label></div><div class="small">Материал корпуса автоматически назначается всем деталям, кроме фасадов. Для фасадов действует отдельный общий выбор. Выбранная кромка применяется ко всем четырём сторонам каждой детали.</div><div class="scroll"><table class="c-items"><thead><tr><th>Деталь</th><th>Ширина, мм</th><th>Высота, мм</th><th>Кол-во</th><th></th></tr></thead><tbody id="cItemRows"></tbody></table></div><div class="small" style="margin:7px 0 12px">Цена выбранного материала, облицовки и кромки задаётся один раз в общих полях выше и автоматически применяется ко всем деталям с этим выбором.</div><div id="cCuttingSummary" class="panel" style="margin-top:10px"></div>
  <div class="c-toolbar"><button type="button" class="btn" id="cAddItem">＋ Добавить деталь</button></div><h3>Прайс и деталировка по разделам</h3><div class="small">Выбери позицию из выпадающего списка. Цена и единица измерения подставятся из твоей таблицы.</div><div id="cCostSections"></div>
  <div class="c-grid">
  <label class="wide">Примечание<textarea name="notes"></textarea></label></div>
  <div id="cSummary" class="c-summary"></div><div class="actions"><button type="button" class="btn" id="cCancel">Отмена</button><button class="btn primary">Сохранить просчёт</button></div></form></div></div>`;
  $('cNew').type='button';$('cWardrobe').type='button';$('cNew').onclick=()=>open();$('cWardrobe').onclick=()=>{if(!active){$('cForm').reset();items=[blank()];costLines=[];fillSelects();$('cForm').elements.status.value='Черновик';$('cNo').textContent='НОВЫЙ ПРОСЧЁТ';$('cModal').classList.remove('open');}if(typeof window.openWardrobeBuilder==='function'){window.openWardrobeBuilder();}else{window.dispatchEvent(new CustomEvent('crm:open-wardrobe-builder'));}};$('cClose').onclick=close;$('cCancel').onclick=close;$('cModal').onclick=e=>{if(e.target.id==='cModal')close()};
  $('cSearch').oninput=render;$('cRefresh').onclick=load;$('cAddItem').onclick=()=>{const x=blank();if($('cDefaultMaterial')?.value)setMaterial(x,$('cDefaultMaterial').value);if($('cDefaultEdge')?.value)setEdge(x,$('cDefaultEdge').value);items.push(x);drawItems()};
  $('cForm').onsubmit=save;$('cForm').oninput=summary;
 }
 let commonMaterialPrice=0,commonFacadePrice=0,commonEdgePrice=0;
 const blank=()=>({item_name:nextDetailName('Боковина'),material:'',catalog_item_id:'',material_price_sheet:commonMaterialPrice,edge_catalog_item_id:'',edge_name:'',edge_price_per_m:commonEdgePrice,edge_sides:{top:true,right:true,bottom:true,left:true},edge_m:0,width_mm:0,height_mm:0,quantity:1,supplier_id:'',supplier_name:'',supplier_discount_percent:0});
 function selectedCatalog(id){return estimateCatalog.find(p=>p.id===id)||excelHardware.find(p=>p.id===id)||excelFacades.find(p=>p.id===id)||null}
 const detailTypes=['Боковина','Полка','Перегородка','Дно','Крышка','Цоколь','Фасад','Дверь','Задняя стенка','Планка','Деталь ящика','Другое'];
 function detailBase(name){const v=String(name||'');return detailTypes.find(t=>v===t||v.startsWith(t+' '))||v||'Деталь'}
 function nextDetailName(base,skip=-1){return base+' '+(items.filter((x,i)=>i!==skip&&detailBase(x.item_name)===base).length+1)}
 function isFacadeItem(x){return /^(Фасад|Дверь)(\s|$)/.test(String(x?.item_name||''))}
 function materialOptions(selected=''){return '<option value="">Выбрать листовой материал…</option>'+estimateCatalog.filter(p=>p.is_active&&p.category==='Материалы'&&p.unit==='лист').map(p=>'<option value="'+esc(p.id)+'" '+(p.id===selected?'selected':'')+'>'+esc(p.item_name)+' · '+money(p.source_price)+'/лист</option>').join('')}
 const excelFacades=[['ФАСАДЫ КРАШЕНЫЕ ОТ:',16000,'м²'],['ФАСАДЫ ПВХ ПЛЕНКА ОТ:',7500,'шт'],['ФАСАЫ FENIX',20000,'шт'],['ФАСАДЫ AGT СУПРАМАТ ОТ:',0,'шт'],['ШПОН',30000,'м²'],['КРОМКА AGT СУПРАМАТ ОТ:',120,'м'],['ФАСАДЫ АЛЮМИНИЕВЫЕ СТЕКЛО ОТ:',16000,'м²'],['СТОЛЕШНИЦА 3000 ММ КЕДР',5350,'шт'],['КРОМКА СТОЛЕШНИЦЫ КЕДР 3М',1000,'м'],['СТЕНОВАЯ ПАНЕЛЬ КЕДР 3000ММ',1600,'шт'],['ДВЕРИ КУПЕ',200,'шт'],['ЗЕРКАЛО',0,'шт']].map((x,i)=>({id:'excel-facade-'+i,category:'Облицовка и фасады',subgroup:'Облицовка',item_name:x[0],source_price:x[1],unit:x[2],is_active:true,excelFallback:true}));
 function facadeAreaPricing(p){const n=String(p?.item_name||'').toLocaleUpperCase('ru');return /КРАШЕН|ПВХ|FENIX|ШПОН|АЛЮМИНИЕВЫЕ.*СТЕКЛО|СТЕКЛО/.test(n)}
 function facadeUnit(p){return facadeAreaPricing(p)?'м²':(p?.unit||'шт')}
 function facadeOptions(selected=''){let rows=estimateCatalog.filter(p=>p.is_active&&p.category==='Облицовка и фасады');const names=new Set(rows.map(p=>String(p.item_name||'').trim().toLocaleUpperCase('ru')));rows=rows.concat(excelFacades.filter(p=>!names.has(p.item_name.trim().toLocaleUpperCase('ru'))));return '<option value="">Выбрать материал фасада…</option>'+rows.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===selected?'selected':'')+'>'+esc(p.item_name)+' · '+money(p.source_price)+'/'+esc(facadeUnit(p))+'</option>').join('')}
 function edgeOptions(selected=''){return '<option value="">Без кромки</option>'+estimateCatalog.filter(p=>p.is_active&&p.category==='Материалы'&&p.unit==='м'&&p.item_name.toLocaleUpperCase('ru').includes('КРОМКА')).map(p=>'<option value="'+esc(p.id)+'" '+(p.id===selected?'selected':'')+'>'+esc(p.item_name)+' · '+money(p.source_price)+'/м</option>').join('')}
 function setMaterial(item,id){const p=selectedCatalog(id);item.catalog_item_id=p?.id||'';item.material=p?.item_name||'';item.material_price_sheet=Number(p?.source_price||0);item.source_material_price_m2=item.material_price_sheet;item.material_price_m2=item.material_price_sheet}
 function setEdge(item,id){const p=selectedCatalog(id);item.edge_catalog_item_id=p?.id||'';item.edge_name=p?.item_name||'';item.edge_price_per_m=Number(p?.source_price||0);item.edge_sides={top:true,right:true,bottom:true,left:true};item.edge_m=calcEdgeLength(item)}
 function calcEdgeLength(item){const w=Number(item.width_mm||0),h=Number(item.height_mm||0),s=item.edge_sides||{};return ((s.top?w:0)+(s.bottom?w:0)+(s.left?h:0)+(s.right?h:0))*Number(item.quantity||0)/1000}
 function cuttingPlan(){
  const kerf=3,format=$('cSheetFormat')?.value||'2800x2070',[W,H]=format.split('x').map(Number),groups=new Map();
  items.filter(x=>{const p=selectedCatalog(x.catalog_item_id);if(!(Number(x.width_mm)>0&&Number(x.height_mm)>0&&p&&p.unit==='лист'))return false;const isFacade=['Фасад','Дверь'].includes(String(x.item_name||''));return !isFacade||(p.category==='Материалы'&&/ЛДСП/i.test(String(p.item_name||'')));}).forEach((it,index)=>{
   const key=it.catalog_item_id,p=selectedCatalog(key),price=Number(it.material_price_sheet||p?.source_price||0),groupKey=key+'|'+price;if(!groups.has(groupKey))groups.set(groupKey,{name:p?.item_name||it.material||'Материал',price,parts:[]});
   for(let n=0;n<Math.max(1,Number(it.quantity||1));n++)groups.get(groupKey).parts.push({w:Number(it.width_mm)+kerf,h:Number(it.height_mm)+kerf,label:it.item_name});
  });
  const result=[];
  for(const [id,g] of groups){
   const sheets=[];g.parts.sort((a,b)=>Math.max(b.w,b.h)-Math.max(a.w,a.h)||b.w*b.h-a.w*a.h);
   for(const part of g.parts){
    let placed=false;
    for(const sh of sheets){
     let best=null;sh.free.forEach((r,ri)=>[[part.w,part.h,false],[part.h,part.w,true]].forEach(([pw,ph,rot])=>{if(pw<=r.w&&ph<=r.h){const score=Math.min(r.w-pw,r.h-ph)*100000+Math.max(r.w-pw,r.h-ph);if(!best||score<best.score)best={ri,pw,ph,rot,score,x:r.x,y:r.y}}}));
     if(best){const r=sh.free.splice(best.ri,1)[0];sh.parts.push({x:best.x,y:best.y,w:best.pw,h:best.ph,label:part.label,rotated:best.rot});const right={x:best.x+best.pw,y:best.y,w:r.w-best.pw,h:best.ph},bottom={x:best.x,y:best.y+best.ph,w:r.w,h:r.h-best.ph};if(right.w>0&&right.h>0)sh.free.push(right);if(bottom.w>0&&bottom.h>0)sh.free.push(bottom);placed=true;break}
    }
    if(!placed){const sh={parts:[],free:[{x:0,y:0,w:W,h:H}]};sheets.push(sh);let best=null;[[part.w,part.h,false],[part.h,part.w,true]].forEach(([pw,ph,rot])=>{if(pw<=W&&ph<=H){const score=Math.min(W-pw,H-ph)*100000+Math.max(W-pw,H-ph);if(!best||score<best.score)best={pw,ph,rot,score}}});if(best){sh.parts.push({x:0,y:0,w:best.pw,h:best.ph,label:part.label,rotated:best.rot});sh.free=[{x:best.pw,y:0,w:W-best.pw,h:best.ph},{x:0,y:best.ph,w:W,h:H-best.ph}].filter(r=>r.w>0&&r.h>0)}}
   }
   result.push({name:g.name,price:g.price,sheets:sheets.filter(s=>s.parts.length).map(sh=>sh.parts),count:sheets.filter(s=>s.parts.length).length});
  }
  return result;
 }
 function calculateDetailCosts(){
  const plans=cuttingPlan();let sheetsCost=0,edgeMeters=0,edgeCost=0;
  plans.forEach(p=>sheetsCost+=p.count*p.price);
  items.forEach(x=>{const m=calcEdgeLength(x);x.edge_m=m;edgeMeters+=m;edgeCost+=m*Number(x.edge_price_per_m||0)});
  const facadeCost=items.reduce((sum,it)=>{const p=selectedCatalog(it.catalog_item_id);if(!p||p.category!=='Облицовка и фасады')return sum;const qty=Number(it.quantity||0);const amount=facadeAreaPricing(p)?(Number(it.width_mm||0)*Number(it.height_mm||0)/1000000*qty):(p.unit==='м²'?(Number(it.width_mm||0)*Number(it.height_mm||0)/1000000*qty):qty);return sum+amount*Number(it.material_price_sheet||p.source_price||0)},0);
  return {plans,sheetsCost,edgeMeters,edgeCost,facadeCost,total:sheetsCost+edgeCost+facadeCost};
 }
 const costCategories=['Материалы','Облицовка и фасады','Фурнитура','Шкафы-купе','Лицевая фурнитура','Крепёж','Свет','Комплектующие','Работы и доставка'];
 
 const blankCost=()=>({category:'Фурнитура',item_name:'',unit:'шт',quantity:1,unit_price:0,source_unit_price:0});
 const serviceDefaults=[
  ['СТОИМОСТЬ РАБОТЫ НА ПРОИЗВОДСТВЕ (100% ОТ МАТЕРИАЛА)',0,'расчёт'],
  ['ДОСТАВКА МАТЕРИАЛА',2000,'услуга'],
  ['ЗАМЕР',0,'услуга'],
  ['ДОСТАВКА',2000,'услуга'],
  ['ПРЕДСБОРКА',0,'услуга'],
  ['СБОРКА НА АДРЕСЕ 10%',4000,'услуга'],
  ['ФОРС-МАЖОР',5000,'услуга']
 ];
 function ensureServiceLines(){serviceDefaults.forEach(([name,price,unit])=>{if(!costLines.some(x=>x.category==='Работы и доставка'&&x.item_name===name))costLines.push({category:'Работы и доставка',item_name:name,unit,quantity:1,unit_price:price,source_unit_price:price});});}
 function money(v){return Number(v||0).toLocaleString('ru-RU',{maximumFractionDigits:2})+' ₽'}
 const excelHardware=[
  ['ПЕТЛB BLUM',500,'шт'],['ПЕТЛИ UNIHOPPER',120,'шт'],['ПЕТЛИ БОЯРД',100,'шт'],['ПЕТЛИ HETTICH',380,'шт'],
  ['НАПРАВЛЯЮЩИЕ BLUM',5000,'шт'],['НАПРАВЛЯЮЩИЕ UNIHOPPER',750,'шт'],['НАПРАВЛЯЮЩИЕ БОЯРД',1000,'шт'],['НАПРАВЛЯЮЩИЕ HETTICH',1600,'шт'],
  ['VB',12,'шт'],['ГАЗЛИФТ',0,'шт'],['ПЛАНКА ТОРЦЕВАЯ ДЛЯ СТОЛЕШНИЦЫ КЕДР',180,'шт'],
  ['ПЛАНКА СОЕДИНИТЕЛЬНАЯ ДЛЯ СТОЛЕШНИЦЫ КЕДР',235,'шт'],['СОЕДИНИТЕЛЬ СТЕНОВОЙ ПАНЕЛИ',250,'шт'],
  ['ПЛИНТУС СТОЛЕШНИЦЫ 3 М',700,'шт'],['ОПОРЫ КУХОННЫЕ',30,'шт'],['ЦОКОЛЬ ПЛАСТИКОВЫЙ 4М',1100,'шт'],
  ['ФИТИНГИ ЦОКОЛЯ',45,'шт'],['РЕШЕТКА АЛЮМИННИЕВАЯ',350,'шт'],['ВЕНТИЛЯЦИЯ ТРУБЫ',450,'шт'],
  ['ШТАНГА ДЛЯ ОДЕЖДЫ ОВАЛЬНАЯ 2000ММ',1000,'шт'],['КОМАРЫ ОБЫЧНЫЕ',120,'шт']
 ].map((x,i)=>({id:'excel-hardware-'+i,category:'Фурнитура',subgroup:'Фурнитура',item_name:x[0],source_price:x[1],unit:x[2],is_active:true,excelFallback:true}));
 function catalogOptions(category,selected,unitFilter,selectedName){
  let rows=estimateCatalog.filter(p=>p.is_active&&(!category||p.category===category)&&(!unitFilter||p.unit===unitFilter));
  if(category==='Фурнитура'){
   const names=new Set(rows.map(p=>String(p.item_name||'').trim().toLocaleUpperCase('ru')));
   rows=rows.concat(excelHardware.filter(p=>!names.has(p.item_name.trim().toLocaleUpperCase('ru'))));
  }
  return '<option value="">Выбрать из прайса пользователя…</option>'+rows.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===selected||(!selected&&selectedName&&p.item_name===selectedName)?'selected':'')+'>'+esc(p.subgroup+' · '+p.item_name)+' · '+money(p.source_price)+' / '+esc(p.unit)+'</option>').join('');
 }
 function applyEstimateCatalog(target,id,kind){const p=estimateCatalog.find(x=>x.id===id);if(!p)return;target.catalog_item_id=p.id;target.item_name=p.item_name;target.unit=p.unit||'шт';target.supplier_name=p.supplier_name||'Прайс пользователя';target.supplier_id='';target.supplier_discount_percent=0;target.price_checked_at=p.updated_at||new Date().toISOString();if(kind==='material'){const price=Number(p.source_price||0);target.material=p.item_name;target.source_material_price_m2=price;target.material_price_m2=price}else{target.source_unit_price=Number(p.source_price||0);target.unit_price=Number(p.source_price||0)}}
 function calc(){
  const sums=Object.fromEntries(costCategories.map(c=>[c,0]));
  costLines.forEach(x=>{const amount=Number(x.quantity||0)*Number(x.unit_price||0);if(x.category==='Фурнитура'&&String(x.item_name||'').trim().toLocaleUpperCase('ru').includes('КОМАР'))return;sums[x.category]=(sums[x.category]||0)+amount});
  const detail=calculateDetailCosts(),materials=(sums['Материалы']||0)+detail.total;
  const categoriesBase=costCategories.filter(c=>c!=='Работы и доставка').reduce((a,c)=>a+(sums[c]||0),0)+detail.total,production=materials;
  const service=costLines.filter(x=>x.category==='Работы и доставка'&&!x.item_name.startsWith('СТОИМОСТЬ РАБОТЫ НА ПРОИЗВОДСТВЕ')).reduce((a,x)=>a+Number(x.quantity||0)*Number(x.unit_price||0),0);
  const cost=categoriesBase+production+service,margin=cost*0.80,subtotal=cost+margin,managerCommission=subtotal*0.05,total=subtotal+managerCommission;
  const area=items.reduce((a,x)=>a+Number(x.width_mm||0)*Number(x.height_mm||0)/1e6*Number(x.quantity||0),0);
  return {area,edge:detail.edgeMeters,materialsCost:materials,sheets:detail.plans.reduce((a,p)=>a+p.count,0),base:cost,total,categoriesBase,production,service,assembly:0,margin,managerCommission,sums,subtotal,detail};
 }
 function summary(){
  if(!$('cSummary'))return;const x=calc();
  $('cSummary').innerHTML=`
   <div class="c-total"><span class="small">Материалы, комплектующие, листы и кромка</span><b>${money(x.categoriesBase)}</b></div>
   <div class="c-total"><span class="small">Работа на производстве (100% от раздела «Материалы»)</span><b>${money(x.production)}</b></div>
   <div class="c-total"><span class="small">Работы, доставка и услуги</span><b>${money(x.service)}</b></div>
   <div class="c-total"><span class="small">Моржа (80%)</span><b>${money(x.margin)}</b></div>
   <div class="c-total"><span class="small">Комиссия менеджера (5%)</span><b>${money(x.managerCommission)}</b></div>
   <div class="c-total"><span class="small">ИТОГОВАЯ СТОИМОСТЬ</span><b>${money(x.total)}</b></div>
   <div class="small wide">Итог по формулам основного листа Excel: сумма разделов + производство (100% материалов) + работы и доставка; моржа 80% от этой суммы; комиссия менеджера 5% от суммы с моржой. Дополнительные проценты и скидки не применяются.</div>`;
 }
 function drawItems(){
   const defaults=$('cDefaultMaterial'),facades=$('cDefaultFacade'),defaultEdge=$('cDefaultEdge');
   const facadeItem=isFacadeItem;
   if(defaults){const current=defaults.value;defaults.innerHTML=materialOptions(current);defaults.onchange=()=>{const p=selectedCatalog(defaults.value);commonMaterialPrice=Number(p?.source_price||0);$('cMaterialPrice').value=commonMaterialPrice;items.forEach(x=>{if(!facadeItem(x))setMaterial(x,defaults.value)});drawItems()}}
   if(facades){const current=facades.value;facades.innerHTML=facadeOptions(current);facades.onchange=()=>{const p=selectedCatalog(facades.value);commonFacadePrice=Number(p?.source_price||0);$('cFacadePrice').value=commonFacadePrice;items.forEach(x=>{if(facadeItem(x))setMaterial(x,facades.value)});drawItems()}}
   if(defaultEdge){const current=defaultEdge.value;defaultEdge.innerHTML=edgeOptions(current);defaultEdge.onchange=()=>{const p=selectedCatalog(defaultEdge.value);commonEdgePrice=Number(p?.source_price||0);$('cEdgePrice').value=commonEdgePrice;items.forEach(x=>setEdge(x,defaultEdge.value));drawItems()}}
   $('cItemRows').innerHTML=items.map((x,i)=>'<tr><td><select data-i="'+i+'" data-k="item_name">'+detailTypes.map(n=>'<option value="'+esc(n)+'" '+(n===detailBase(x.item_name)?'selected':'')+'>'+esc(n)+'</option>').join('')+'</select><div class="small">'+esc(x.item_name)+'</div></td>'+
    '<td><input data-i="'+i+'" data-k="width_mm" type="number" min="0" value="'+Number(x.width_mm||0)+'"></td><td><input data-i="'+i+'" data-k="height_mm" type="number" min="0" value="'+Number(x.height_mm||0)+'"></td><td><input data-i="'+i+'" data-k="quantity" type="number" min="1" value="'+Number(x.quantity||1)+'"></td><td><button type="button" class="btn danger" data-del="'+i+'">×</button></td></tr>').join('')||'<tr><td colspan="5" class="empty">Добавьте детали изделия.</td></tr>';
   $('cItemRows').querySelectorAll('[data-i]').forEach(el=>{
    el.onchange=()=>{const x=items[Number(el.dataset.i)],k=el.dataset.k;
     if(k==='item_name'){const wasFacade=facadeItem(x);x[k]=nextDetailName(el.value,Number(el.dataset.i));const nowFacade=facadeItem(x);if(wasFacade!==nowFacade){const id=nowFacade?facades?.value:defaults?.value;if(id)setMaterial(x,id)}}
     else x[k]=Number(el.value);drawItems()};
    el.oninput=()=>{const x=items[Number(el.dataset.i)],k=el.dataset.k;if(['width_mm','height_mm','quantity'].includes(k)){x[k]=Number(el.value);summary();renderCuttingSummary()}};
   });
   const bindCommonPrice=(id,key)=>{const input=$(id);if(!input)return;input.value=key==='material'?commonMaterialPrice:key==='facade'?commonFacadePrice:commonEdgePrice;input.oninput=()=>{const value=Math.max(0,Number(input.value||0));if(key==='material')commonMaterialPrice=value;else if(key==='facade')commonFacadePrice=value;else commonEdgePrice=value;items.forEach(x=>{if(key==='material'&&x.catalog_item_id&&!isFacadeItem(x))x.material_price_sheet=value;if(key==='facade'&&x.catalog_item_id&&isFacadeItem(x))x.material_price_sheet=value;if(key==='edge'&&(x.edge_catalog_item_id||x.edge_name))x.edge_price_per_m=value;});summary();renderCuttingSummary();};};bindCommonPrice('cMaterialPrice','material');bindCommonPrice('cFacadePrice','facade');bindCommonPrice('cEdgePrice','edge');
   $('cItemRows').querySelectorAll('[data-del]').forEach(el=>el.onclick=()=>{items.splice(Number(el.dataset.del),1);drawItems()});
   if($('cSheetFormat')){const saved=localStorage.getItem('crm-estimate-sheet-format');if(saved)$('cSheetFormat').value=saved;$('cSheetFormat').onchange=()=>{localStorage.setItem('crm-estimate-sheet-format',$('cSheetFormat').value);renderCuttingSummary();summary()}}
   renderCuttingSummary();summary();
  }
  function renderCuttingSummary(){
  const host=$('cCuttingSummary');if(!host)return;const c=calculateDetailCosts(),format=$('cSheetFormat')?.value||'2800x2070';
  host.innerHTML='<b>Раскрой и кромка</b><div class="small">Лист '+format.replace('x',' × ')+' мм · пропил 3 мм · поворот деталей на 90° разрешён.</div>'+
   (c.plans.length?c.plans.map(p=>'<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b>'+esc(p.name)+': '+p.count+' лист. × '+money(p.price)+' = '+money(p.count*p.price)+'</b>'+p.sheets.map((parts,si)=>'<div class="small" style="margin-top:8px">Лист '+(si+1)+'</div><svg viewBox="0 0 560 414" role="img" aria-label="Карта раскроя '+esc(p.name)+'" style="width:100%;max-width:560px;border:1px solid var(--line);background:#fff">'+parts.map((r,ri)=>'<rect x="'+(r.x/5)+'" y="'+(r.y/5)+'" width="'+(r.w/5)+'" height="'+(r.h/5)+'" fill="#dbeafe" stroke="#315b8a" stroke-width="1"/><text x="'+(r.x/5+3)+'" y="'+(r.y/5+12)+'" font-size="10" fill="#172b4d">'+esc(r.label)+(r.rotated?' ↻':'')+'</text>').join('')+'</svg>').join('')+'</div>').join(''):'<div class="small">Выбери листовой материал у деталей, чтобы рассчитать раскрой.</div>')+
   '<div style="padding-top:7px">Кромка: '+c.edgeMeters.toFixed(2)+' м · '+money(c.edgeCost)+'</div><b>Материалы деталировки: '+money(c.total)+'</b>';
 }
 async function load(){
  const [a,b,c,g]=await Promise.all([db.from('furniture_estimates').select('*').order('created_at',{ascending:false}),db.from('furniture_orders').select('id,order_no,title,client_name').order('created_at',{ascending:false}),db.from('furniture_measurements').select('id,client_name,room_name,measured_at').order('created_at',{ascending:false}),db.from('furniture_estimate_catalog').select('id,category,subgroup,item_name,unit,source_price,supplier_name,is_active,updated_at').eq('is_active',true).order('category').order('subgroup').order('item_name')]);
  if(a.error){$('cRows').innerHTML='<div class="error">Ошибка загрузки: '+esc(a.error.message)+'. Проверьте SQL-миграцию.</div>';return}
  estimates=a.data||[];orders=b.data||[];measurements=c.data||[];estimateCatalog=g.error?[]:(g.data||[]);if(g.error)console.warn('Каталог пользовательской таблицы не загружен. Выполните supabase-estimate-user-catalog.sql:',g.error.message);render();
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
  active=row?.id||null;items=[];costLines=[];commonMaterialPrice=0;commonFacadePrice=0;commonEdgePrice=0;$('cForm').reset();$('cForm').elements.id.value=active||'';fillSelects();
  if(row){
   Object.entries(row).forEach(([k,v])=>{if($('cForm').elements[k])$('cForm').elements[k].value=v??''});
   const {data,error}=await db.from('furniture_estimate_items').select('*').eq('estimate_id',row.id).order('created_at');
   if(error){alert('Не удалось загрузить детали: '+error.message);return}items=(data||[]).map(({id,estimate_id,created_at,...x})=>({...x,edge_sides:{top:true,right:true,bottom:true,left:true},material_price_sheet:Number(x.material_price_sheet??x.source_material_price_m2??0)}));
   const mi=items.find(x=>x.catalog_item_id&&!isFacadeItem(x)),fi=items.find(x=>x.catalog_item_id&&isFacadeItem(x)),ei=items.find(x=>x.edge_catalog_item_id||x.edge_name);commonMaterialPrice=Number(mi?.material_price_sheet??selectedCatalog(mi?.catalog_item_id)?.source_price??0);commonFacadePrice=Number(fi?.material_price_sheet??selectedCatalog(fi?.catalog_item_id)?.source_price??0);commonEdgePrice=Number(ei?.edge_price_per_m??selectedCatalog(ei?.edge_catalog_item_id)?.source_price??0);
   const lineResult=await db.from('furniture_estimate_lines').select('*').eq('estimate_id',row.id).order('created_at');
   if(lineResult.error){alert('Не удалось загрузить позиции сметы: '+lineResult.error.message);return}costLines=(lineResult.data||[]).map(({id,estimate_id,created_at,...x})=>x);ensureServiceLines();
  }else {items=[blank()];costLines=[];ensureServiceLines();}
  $('cNo').textContent=row?.estimate_no||'НОВЫЙ ПРОСЧЁТ';drawItems();drawCosts();$('cModal').classList.add('open');
 }
 function drawCosts(){
  const host=$('cCostSections');if(!host)return;
  host.innerHTML=costCategories.map((category,ci)=>{
   const rows=costLines.map((x,i)=>({...x,_i:i})).filter(x=>x.category===category);
   const isService=category==='Работы и доставка';
   const htmlRows=rows.map(x=>{
    const isProduction=x.item_name.startsWith('СТОИМОСТЬ РАБОТЫ НА ПРОИЗВОДСТВЕ');
    const price=isProduction?calc().production:Number(x.unit_price??x.source_unit_price??0);
    const amount=isProduction?calc().production:Number(x.quantity||0)*Number(x.unit_price||0);
    return '<tr>'+
     '<td>'+(isService?'<b>'+esc(x.item_name)+'</b>':'<select data-ci="'+x._i+'" data-ck="catalog_item_id">'+catalogOptions(category,x.catalog_item_id,null,x.item_name)+'</select>')+'</td>'+
     '<td><input data-ci="'+x._i+'" data-ck="unit" value="'+esc(x.unit||'шт')+'" style="width:75px" readonly></td>'+
     '<td><input data-ci="'+x._i+'" data-ck="quantity" type="number" min="0" step=".001" value="'+Number(x.quantity||0)+'" '+(isService?'readonly':'')+'></td>'+
     '<td><input data-ci="'+x._i+'" data-ck="source_unit_price" type="number" min="0" step=".01" value="'+price+'" '+(isProduction?'readonly':'')+'></td>'+
     '<td>'+money(amount)+'</td>'+
     '<td>'+(isService?'':'<button type="button" class="btn danger" data-cdel="'+x._i+'">×</button>')+'</td></tr>';
   }).join('');
   return '<section class="panel" style="padding:12px;margin:10px 0"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><b>'+esc((ci+1)+'. '+category)+'</b>'+(isService?'<span class="small">Раздел всегда открыт — все строки видны</span>':'<button type="button" class="btn" data-add-category="'+esc(category)+'">＋ Добавить позицию</button>')+'</div>'+
    (rows.length?'<div class="scroll"><table class="c-items"><thead><tr><th>Наименование</th><th>Ед.</th><th>Количество</th><th>Цена, ₽</th><th>Сумма, ₽</th><th></th></tr></thead><tbody>'+htmlRows+'</tbody></table></div>':'<div class="small" style="padding:10px 0">Пока нет позиций</div>')+
    (isService?(()=>{const z=calc();return '<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px"><b>Расчёт по разделу 9 — РАБОТА</b><table class="c-items"><tbody>'+
    '<tr><td>МАТЕРИАЛ — сумма разделов</td><td>'+money(z.categoriesBase)+'</td></tr>'+
    '<tr><td>СТОИМОСТЬ РАБОТЫ НА ПРОИЗВОДСТВЕ (100% от материала)</td><td>'+money(z.production)+'</td></tr>'+
    '<tr><td>Работы, доставка и услуги</td><td>'+money(z.service)+'</td></tr>'+
    '<tr><td><b>СТОИМОСТЬ до моржи</b></td><td><b>'+money(z.cost)+'</b></td></tr>'+
    '<tr><td>МОРЖА — 80%</td><td>'+money(z.margin)+'</td></tr>'+
    '<tr><td><b>ИТОГО</b></td><td><b>'+money(z.subtotal)+'</b></td></tr>'+
    '<tr><td>КОМИССИЯ МЕНЕДЖЕРА — 5%</td><td>'+money(z.managerCommission)+'</td></tr>'+
    '<tr><td><b>ИТОГОВАЯ СТОИМОСТЬ</b></td><td><b>'+money(z.total)+'</b></td></tr>'+
    '</tbody></table></div>'})():'')+'</section>';
  }).join('');
  host.querySelectorAll('[data-add-category]').forEach(el=>el.onclick=()=>{costLines.push({...blankCost(),category:el.dataset.addCategory});drawCosts()});
  host.querySelectorAll('[data-ci]').forEach(el=>el.onchange=()=>{
   const x=costLines[Number(el.dataset.ci)],k=el.dataset.ck;
   if(k==='catalog_item_id'){const fallback=excelHardware.find(p=>p.id===el.value);if(fallback){x.catalog_item_id=fallback.id;x.item_name=fallback.item_name;x.unit=fallback.unit;x.source_unit_price=Number(fallback.source_price);x.unit_price=Number(fallback.source_price);x.supplier_name='Таблица пользователя';}else applyEstimateCatalog(x,el.value,'line');drawCosts();summary();return;}
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
  const payload=activeItems.map(x=>({...x,catalog_item_id:(String(x.catalog_item_id||'').startsWith('excel-')?'':x.catalog_item_id)||null,edge_catalog_item_id:x.edge_catalog_item_id||null,edge_sides:x.edge_sides||{},edge_m:calcEdgeLength(x),edge_price_per_m:Number(x.edge_price_per_m||0),material_price_sheet:Number(x.material_price_sheet||0),source_material_price_m2:Number(x.material_price_sheet||0),material_price_m2:Number(x.material_price_sheet||0),supplier_discount_percent:0,estimate_id:id}));const ins=payload.length?await db.from('furniture_estimate_items').insert(payload):{error:null};
  if(ins.error){alert('Просчёт сохранён, но детали не записались: '+ins.error.message);return}
  const oldLines=await db.from('furniture_estimate_lines').delete().eq('estimate_id',id);
  if(oldLines.error){alert('Просчёт сохранён, но позиции сметы не обновились: '+oldLines.error.message);return}
  const linePayload=costLines.filter(x=>String(x.item_name||'').trim()).map(x=>({...x,catalog_item_id:String(x.catalog_item_id||'').startsWith('excel-hardware-')?null:(x.catalog_item_id||null),supplier_id:null,supplier_name:null,supplier_discount_percent:0,source_unit_price:Number(x.source_unit_price??x.unit_price??0),unit_price:Number(x.unit_price||0),price_checked_at:x.price_checked_at||null,supplier_product_id:null,estimate_id:id}));
  const lineInsert=linePayload.length?await db.from('furniture_estimate_lines').insert(linePayload):{error:null};
  if(lineInsert.error){alert('Просчёт сохранён, но позиции сметы не записались: '+lineInsert.error.message);return}
  await load();close();alert('Просчёт сохранён.');
 }
 window.addEventListener('crm:wardrobe-generated',e=>{const d=e.detail||{};if(!Array.isArray(d.items))return;active=null;items=d.append?items.concat(d.items):d.items;costLines=d.append?costLines:[];ensureServiceLines();if(!d.append)$('cForm').elements.id.value='';if(!d.append){$('cForm').reset();$('cForm').elements.id.value='';fillSelects();$('cForm').elements.status.value='Черновик';}drawItems();if(d.title&&$('cForm')?.elements.title)$('cForm').elements.title.value=d.title;summary();$('cModal').classList.add('open');});
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
