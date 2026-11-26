/* CRM «Мастер мебельщик» — справочник поставщиков */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let rows=[];
 const style=document.createElement('style');
 style.textContent=`
 #suppliers .supplier-toolbar{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}
 #suppliers .supplier-toolbar input{max-width:420px}
 .supplier-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
 .supplier-card{border:1px solid var(--line);border-radius:12px;padding:15px;background:#fff;min-width:0}
 .supplier-card h3{margin:0 0 5px}
 .supplier-card .supplier-links{display:flex;flex-direction:column;gap:5px;margin:10px 0;overflow-wrap:anywhere}
 .supplier-card .supplier-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.supplier-products{margin-top:10px;padding-top:10px;border-top:1px solid var(--line);font-size:12px}.supplier-products table{white-space:normal;font-size:12px}.supplier-products td,.supplier-products th{padding:6px}
 .supplier-modal{position:fixed;inset:0;background:#10182899;z-index:110;display:none;align-items:center;justify-content:center;padding:14px}
 .supplier-modal.open{display:flex}
 .supplier-dialog{background:#fff;border-radius:14px;padding:21px;width:min(650px,100%);max-height:94vh;overflow:auto}
 .supplier-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}
 .supplier-form-grid label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700}
 .supplier-form-grid .wide{grid-column:1/-1}
 @media(max-width:600px){.supplier-form-grid{grid-template-columns:1fr}.supplier-form-grid .wide{grid-column:auto}}
 `;
 document.head.appendChild(style);
 function ensure(){
  const section=$('suppliers');if(!section||section.dataset.ready)return;
  section.dataset.ready='1';
  section.innerHTML=`<div class="head"><div><h1>Поставщики</h1><div class="muted">Сайты, каталоги, прайсы и правила расчёта цен</div></div><button class="btn primary" id="supplierAdd">＋ Добавить поставщика</button></div>
  <div class="panel"><div class="supplier-toolbar"><input id="supplierSearch" placeholder="Поиск по названию, категории или сайту"><select id="supplierTypeFilter" style="max-width:210px"><option value="">Все категории</option><option>Фурнитура</option><option>Материалы</option><option>Фасады</option><option>Услуги</option><option>Другое</option></select><button class="btn" id="supplierRefresh">Обновить</button></div><div id="supplierRows" class="supplier-grid"><div class="empty">Загрузка поставщиков…</div></div></div>
  <div class="supplier-modal" id="supplierModal"><div class="supplier-dialog"><h2 id="supplierModalTitle">Новый поставщик</h2><form id="supplierForm"><input type="hidden" name="id"><div class="supplier-form-grid">
  <label>Название поставщика *<input name="name" required placeholder="Название компании"></label>
  <label>Категория<select name="category"><option>Фурнитура</option><option>Материалы</option><option>Фасады</option><option>Услуги</option><option>Другое</option></select></label>
  <label class="wide">Основной сайт *<input name="website_url" type="url" required placeholder="https://example.ru"></label>
  <label class="wide">Дополнительные ссылки<textarea name="additional_links" rows="3" placeholder="По одной ссылке на строку: каталог, прайс, личный кабинет"></textarea></label>
  <label>Скидка, %<input name="discount_percent" type="number" min="0" max="100" step=".1" value="0"></label>
  <label>Активность<select name="is_active"><option value="true">Активен</option><option value="false">Отключён</option></select></label>
  <label class="wide">Примечание<textarea name="notes" rows="2" placeholder="Условия, особенности прайса, контакты"></textarea></label>
  </div><div class="actions"><button type="button" class="btn" id="supplierCancel">Отмена</button><button class="btn primary">Сохранить</button></div></form></div></div>`;
  $('supplierAdd').onclick=()=>openForm();$('supplierRefresh').onclick=load;
  $('supplierSearch').oninput=render;$('supplierTypeFilter').onchange=render;
  $('supplierCancel').onclick=closeForm;$('supplierModal').onclick=e=>{if(e.target.id==='supplierModal')closeForm()};
  $('supplierForm').onsubmit=save;
 }
 function closeForm(){$('supplierModal').classList.remove('open')}
 function openForm(row=null){
  const f=$('supplierForm');f.reset();f.elements.id.value=row?.id||'';
  $('supplierModalTitle').textContent=row?'Изменить поставщика':'Новый поставщик';
  if(row){Object.entries(row).forEach(([k,v])=>{if(f.elements[k]&&k!=='additional_links')f.elements[k].value=v??''});f.elements.additional_links.value=(row.additional_links||[]).join('\n');}
  else f.elements.discount_percent.value='0';
  $('supplierModal').classList.add('open');
 }
 function validUrl(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)}catch(_){return false}}
 async function save(e){
  e.preventDefault();const f=e.currentTarget,raw=Object.fromEntries(new FormData(f));
  const links=String(raw.additional_links||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const all=[raw.website_url.trim(),...links];
  if(all.some(x=>!validUrl(x))){alert('Проверьте ссылки: используйте полный адрес, начинающийся с https:// или http://');return}
  const {data:{user}}=await db.auth.getUser();
  const row={name:raw.name.trim(),category:raw.category,website_url:raw.website_url.trim(),additional_links:links,discount_percent:Number(raw.discount_percent||0),is_active:raw.is_active==='true',notes:raw.notes.trim()||null,updated_at:new Date().toISOString()};
  const result=raw.id?await db.from('crm_suppliers').update(row).eq('id',raw.id):await db.from('crm_suppliers').insert({...row,created_by:user?.id||null});
  if(result.error){alert('Не удалось сохранить поставщика: '+result.error.message+'\nПроверьте, что SQL-миграция supabase-suppliers.sql выполнена.');return}
  closeForm();await load();
 }
 async function load(){
  const host=$('supplierRows');if(!host)return;
  const {data,error}=await db.from('crm_suppliers').select('*').order('name');
  if(error){host.innerHTML='<div class="error">Не удалось загрузить поставщиков: '+esc(error.message)+'. Выполните SQL-файл supabase-suppliers.sql в Supabase.</div>';return}
  rows=data||[];render();
 }
 function render(){
  const q=($('supplierSearch')?.value||'').toLocaleLowerCase('ru'),cat=$('supplierTypeFilter')?.value||'';
  const list=rows.filter(x=>(!cat||x.category===cat)&&[x.name,x.category,x.website_url,...(x.additional_links||[])].join(' ').toLocaleLowerCase('ru').includes(q));
  $('supplierRows').innerHTML=list.length?list.map(x=>`<article class="supplier-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><div><h3>${esc(x.name)}</h3><div class="small">${esc(x.category||'Другое')}</div></div><span class="pill">${x.is_active?'Активен':'Отключён'}</span></div><div class="supplier-links"><a href="${esc(x.website_url)}" target="_blank" rel="noopener noreferrer">Основной сайт ↗</a>${(x.additional_links||[]).map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">Дополнительная ссылка ${i+1} ↗</a>`).join('')}</div><div class="small">Скидка в расчёте: <b>${Number(x.discount_percent||0)}%</b></div>${x.notes?'<p class="small">'+esc(x.notes)+'</p>':''}<div class="supplier-actions"><button class="btn primary" data-sync="${esc(x.id)}">↻ Загрузить цены</button><button class="btn" data-products="${esc(x.id)}">Каталог</button><button class="btn" data-edit="${esc(x.id)}">Изменить</button><button class="btn danger" data-delete="${esc(x.id)}">Удалить</button></div></article>`).join(''):'<div class="empty">Поставщиков пока нет. Добавьте первого поставщика.</div>';
  host.querySelectorAll('[data-sync]').forEach(b=>b.onclick=()=>syncPrices(b.dataset.sync,b));
  host.querySelectorAll('[data-products]').forEach(b=>b.onclick=()=>showProducts(b.dataset.products));
  host.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openForm(rows.find(x=>x.id===b.dataset.edit)));
  host.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>remove(b.dataset.delete));
 }
 async function syncPrices(id,button){
  if(!confirm('Загрузить актуальные цены из открытого каталога поставщика?'))return;
  const old=button.textContent;button.disabled=true;button.textContent='Загрузка…';
  try{
   const {data,error}=await db.functions.invoke('supplier-price-sync',{body:{supplier_id:id}});
   if(error)throw error;
   if(data?.error)throw new Error(data.error);
   alert('Обновление завершено. Импортировано позиций: '+(data.count||0)+'. Скидка: '+(data.discount_percent||0)+'%.');
   await showProducts(id);
  }catch(e){alert('Не удалось обновить цены: '+(e.message||String(e))+'\nПроверьте, что Edge Function supplier-price-sync развёрнута и SQL supabase-supplier-products.sql выполнен.');}
  finally{button.disabled=false;button.textContent=old;}
 }
 async function showProducts(id){
  const card=[...document.querySelectorAll('.supplier-card')].find(x=>x.querySelector('[data-products="'+id+'"]'));
  if(!card)return;
  let panel=card.querySelector('.supplier-products');
  if(panel){panel.remove();return;}
  panel=document.createElement('div');panel.className='supplier-products';panel.textContent='Загрузка каталога…';card.appendChild(panel);
  const {data,error}=await db.from('crm_supplier_products').select('product_name,article,calc_price').eq('supplier_id',id).eq('is_active',true).order('product_name').limit(100);
  if(error){panel.textContent='Не удалось загрузить каталог: '+error.message;return;}
  if(!data?.length){panel.textContent='Каталог пока пуст. Нажмите «Загрузить цены».';return;}
  panel.innerHTML='<b>Товары ('+data.length+' показано, максимум 100)</b><div style="overflow:auto;max-height:360px"><table><thead><tr><th>Название</th><th>Артикул</th><th>Цена</th></tr></thead><tbody>'+data.map(p=>'<tr><td>'+esc(p.product_name)+'</td><td>'+esc(p.article||'')+'</td><td><b>'+Number(p.calc_price||0).toLocaleString('ru-RU')+' ₽</b></td></tr>').join('')+'</tbody></table></div>';
 }
 async function remove(id){
  const row=rows.find(x=>x.id===id);if(!row||!confirm('Удалить поставщика «'+row.name+'»?'))return;
  const {error}=await db.from('crm_suppliers').delete().eq('id',id);
  if(error){alert('Не удалось удалить поставщика: '+error.message);return}await load();
 }
 function init(){if(!window.__crmAuthenticated||typeof db==='undefined')return;ensure();load()}
 const original=window.tab;
 if(typeof original==='function'&&!window.__suppliersTabWrapped){window.tab=function(id){original(id);if(id==='suppliers')init()};window.__suppliersTabWrapped=true}
 document.addEventListener('click',e=>{if(e.target.closest('[data-tab="suppliers"]'))init()});
 window.addEventListener('crm:authenticated',init);
 ensure();
})();
