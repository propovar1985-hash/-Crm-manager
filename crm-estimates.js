/* CRM «Мастер мебельщик» — просчёты мебели */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let estimates=[],orders=[],measurements=[],active=null,items=[];
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
  s.innerHTML=`<div class="head"><div><h1>Просчёты мебели</h1><div class="muted">Расчёт материалов, кромки, фурнитуры и стоимости по деталям</div></div><button class="btn primary" id="cNew">＋ Новый просчёт</button></div>
  <div class="panel"><div class="c-toolbar"><input id="cSearch" placeholder="Поиск по клиенту или изделию"><button class="btn" id="cRefresh">Обновить</button></div><div id="cRows" class="c-list">Загрузка…</div></div>
  <div class="c-modal" id="cModal"><div class="c-panel"><div class="head"><div><div class="small" id="cNo">НОВЫЙ ПРОСЧЁТ</div><h2>Расчёт мебели</h2></div><button class="btn" id="cClose">Закрыть ✕</button></div>
  <form id="cForm"><input type="hidden" name="id"><div class="c-grid">
  <label>Клиент *<input name="client_name" required></label><label>Название изделия *<input name="title" required placeholder="Кухня, шкаф, гардеробная"></label>
  <label>Привязать к заказу<select name="order_id"><option value="">Без привязки</option></select></label><label>Связанный замер<select name="measurement_id"><option value="">Не выбран</option></select></label>
  <label>Статус<select name="status"><option>Черновик</option><option>На согласовании</option><option>Согласован</option><option>Архив</option></select></label>
  <label>Наценка, %<input name="markup_percent" type="number" min="0" step="0.1" value="30"></label>
  <label>Длина листа, мм<input name="sheet_length_mm" type="number" min="1" value="2800"></label><label>Ширина листа, мм<input name="sheet_width_mm" type="number" min="1" value="2070"></label>
  </div><h3>Детали</h3><div class="scroll"><table class="c-items"><thead><tr><th>Деталь</th><th>Материал</th><th>Ширина</th><th>Высота</th><th>Кол-во</th><th>Кромка, м</th><th>Цена м², ₽</th><th></th></tr></thead><tbody id="cItemRows"></tbody></table></div>
  <div class="c-toolbar"><button type="button" class="btn" id="cAddItem">＋ Добавить деталь</button></div>
  <div class="c-grid">
  <label>Фурнитура, ₽<input name="fittings_cost" type="number" min="0" step="0.01" value="0"></label><label>Работа, ₽<input name="labor_cost" type="number" min="0" step="0.01" value="0"></label><label>Прочие затраты, ₽<input name="other_cost" type="number" min="0" step="0.01" value="0"></label><label class="wide">Примечание<textarea name="notes"></textarea></label></div>
  <div id="cSummary" class="c-summary"></div><div class="actions"><button type="button" class="btn" id="cCancel">Отмена</button><button class="btn primary">Сохранить просчёт</button></div></form></div></div>`;
  $('cNew').onclick=()=>open();$('cClose').onclick=close;$('cCancel').onclick=close;$('cModal').onclick=e=>{if(e.target.id==='cModal')close()};
  $('cSearch').oninput=render;$('cRefresh').onclick=load;$('cAddItem').onclick=()=>{items.push(blank());drawItems()};
  $('cForm').onsubmit=save;$('cForm').oninput=summary;
 }
 const blank=()=>({item_name:'',material:'ЛДСП 16 мм',width_mm:0,height_mm:0,quantity:1,edge_m:0,material_price_m2:0});
 function money(v){return Number(v||0).toLocaleString('ru-RU',{maximumFractionDigits:2})+' ₽'}
 function calc(){
  const f=$('cForm'),sheet=(Number(f.elements.sheet_length_mm.value||2800)*Number(f.elements.sheet_width_mm.value||2070))/1e6;
  const byMaterial={},edge=items.reduce((s,x)=>s+Number(x.edge_m||0)*Number(x.quantity||0),0);
  let area=0,materialsCost=0;
  items.forEach(x=>{const a=Number(x.width_mm||0)*Number(x.height_mm||0)/1e6*Number(x.quantity||0);area+=a;materialsCost+=a*Number(x.material_price_m2||0);byMaterial[x.material]=(byMaterial[x.material]||0)+a});
  const sheets=Object.values(byMaterial).reduce((s,a)=>s+(sheet>0?Math.ceil(a/sheet):0),0);
  const edgeCost=0;
  const base=materialsCost+edgeCost+Number(f.elements.fittings_cost.value||0)+Number(f.elements.labor_cost.value||0)+Number(f.elements.other_cost.value||0);
  const total=base*(1+Number(f.elements.markup_percent.value||0)/100);
  return {area,edge,materialsCost,sheets,base,total};
 }
 function summary(){
  if(!$('cSummary'))return;const x=calc();
  $('cSummary').innerHTML=`<div class="c-total"><span class="small">Площадь деталей</span><b>${x.area.toFixed(3)} м²</b></div><div class="c-total"><span class="small">Ориентир по листам*</span><b>${x.sheets}</b></div><div class="c-total"><span class="small">Кромка</span><b>${x.edge.toFixed(2)} м</b></div><div class="c-total"><span class="small">Материалы</span><b>${money(x.materialsCost)}</b></div><div class="c-total"><span class="small">Себестоимость по введённым затратам</span><b>${money(x.base)}</b></div><div class="c-total"><span class="small">Цена с наценкой</span><b>${money(x.total)}</b></div><div class="small wide">* Площадь суммируется отдельно по каждому материалу. Это предварительная оценка количества листов, не карта раскроя. Кромка показана в метрах; стоимость кромки добавляется после задания тарифа.</div>`;
 }
 function drawItems(){
  $('cItemRows').innerHTML=items.map((x,i)=>`<tr>
  <td><input data-i="${i}" data-k="item_name" value="${esc(x.item_name)}" placeholder="Боковина"></td>
  <td><select data-i="${i}" data-k="material">${['ЛДСП 16 мм','ЛМДФ 19 мм','ХДФ 3 мм','МДФ 19 мм','Другое'].map(m=>`<option ${m===x.material?'selected':''}>${m}</option>`).join('')}</select></td>
  <td><input data-i="${i}" data-k="width_mm" type="number" min="0" value="${x.width_mm}"></td><td><input data-i="${i}" data-k="height_mm" type="number" min="0" value="${x.height_mm}"></td><td><input data-i="${i}" data-k="quantity" type="number" min="1" value="${x.quantity}"></td><td><input data-i="${i}" data-k="edge_m" type="number" min="0" step=".01" value="${x.edge_m}"></td><td><input data-i="${i}" data-k="material_price_m2" type="number" min="0" step=".01" value="${x.material_price_m2}"></td><td><button type="button" class="btn danger" data-del="${i}">×</button></td></tr>`).join('')||'<tr><td colspan="8" class="empty">Добавьте детали для расчёта.</td></tr>';
  $('cItemRows').querySelectorAll('[data-i]').forEach(el=>el.oninput=()=>{items[Number(el.dataset.i)][el.dataset.k]=el.dataset.k==='item_name'||el.dataset.k==='material'?el.value:Number(el.value);summary()});
  $('cItemRows').querySelectorAll('[data-del]').forEach(el=>el.onclick=()=>{items.splice(Number(el.dataset.del),1);drawItems();summary()});summary();
 }
 async function load(){
  const [a,b,c]=await Promise.all([db.from('furniture_estimates').select('*').order('created_at',{ascending:false}),db.from('furniture_orders').select('id,order_no,title,client_name').order('created_at',{ascending:false}),db.from('furniture_measurements').select('id,client_name,room_name,measured_at').order('created_at',{ascending:false})]);
  if(a.error){$('cRows').innerHTML='<div class="error">Ошибка загрузки: '+esc(a.error.message)+'. Проверьте SQL-миграцию.</div>';return}
  estimates=a.data||[];orders=b.data||[];measurements=c.data||[];render();
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
  active=row?.id||null;items=[];$('cForm').reset();$('cForm').elements.id.value=active||'';fillSelects();
  if(row){
   Object.entries(row).forEach(([k,v])=>{if($('cForm').elements[k])$('cForm').elements[k].value=v??''});
   const {data,error}=await db.from('furniture_estimate_items').select('*').eq('estimate_id',row.id).order('created_at');
   if(error){alert('Не удалось загрузить детали: '+error.message);return}items=(data||[]).map(({id,estimate_id,created_at,...x})=>x);
  }else items=[blank()];
  $('cNo').textContent=row?.estimate_no||'НОВЫЙ ПРОСЧЁТ';drawItems();$('cModal').classList.add('open');
 }
 function close(){$('cModal').classList.remove('open');active=null}
 async function save(e){
  e.preventDefault();if(!items.length){alert('Добавьте хотя бы одну деталь.');return}
  if(items.some(x=>!x.item_name.trim()||Number(x.width_mm)<=0||Number(x.height_mm)<=0||Number(x.quantity)<1)){alert('Заполните название, размеры и количество каждой детали.');return}
  const f=Object.fromEntries(new FormData(e.target));const {data:{user}}=await db.auth.getUser();
  const row={client_name:f.client_name.trim(),title:f.title.trim(),order_id:f.order_id||null,measurement_id:f.measurement_id||null,status:f.status,markup_percent:Number(f.markup_percent||0),sheet_length_mm:Number(f.sheet_length_mm||2800),sheet_width_mm:Number(f.sheet_width_mm||2070),fittings_cost:Number(f.fittings_cost||0),labor_cost:Number(f.labor_cost||0),other_cost:Number(f.other_cost||0),notes:f.notes||null,updated_at:new Date().toISOString()};
  const result=active?await db.from('furniture_estimates').update(row).eq('id',active).select().single():await db.from('furniture_estimates').insert({...row,created_by:user?.id||null}).select().single();
  if(result.error){alert('Не удалось сохранить просчёт: '+result.error.message);return}
  const id=result.data.id;const del=await db.from('furniture_estimate_items').delete().eq('estimate_id',id);
  if(del.error){alert('Просчёт сохранён, но не удалось обновить детали: '+del.error.message);return}
  const payload=items.map(x=>({...x,estimate_id:id}));const ins=await db.from('furniture_estimate_items').insert(payload);
  if(ins.error){alert('Просчёт сохранён, но детали не записались: '+ins.error.message);return}
  await load();close();alert('Просчёт сохранён.');
 }
 function init(){
  if(!window.__crmAuthenticated||typeof db==='undefined'||!$('calc'))return;
  if(!window.__calcUI){ensure();window.__calcUI=true}
  load();
 }
 const original=window.tab;if(typeof original==='function'&&!window.__calcTabWrapped){window.tab=function(id){original(id);if(id==='calc')init()};window.__calcTabWrapped=true}
 window.addEventListener('crm:authenticated',init);if(window.__crmAuthenticated)init();
})();
