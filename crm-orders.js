/* Мастер мебельщик — модуль заказов v1
   Подключать после основного <script> и crm-enhancements.js:
   <script src="./crm-orders.js"></script>
   Требует SQL-миграцию supabase-orders.sql.
*/
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stages = ['Просчёт','Договор и оплата','Замер','Проектирование','Согласование','Производство','Монтаж'];
  let orders = [];
  let activeId = null;

  const style = document.createElement('style');
  style.textContent = `
    #orders .order-toolbar{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}
    #orders .order-toolbar input{max-width:430px}
    .order-table{width:100%;border-collapse:collapse;white-space:nowrap}
    .order-table th,.order-table td{padding:11px 9px;border-bottom:1px solid #edf0f4;text-align:left}
    .order-table th{font-size:11px;color:var(--muted)}
    .order-open{border:0;background:none;color:var(--blue);font-weight:700;padding:0;text-align:left}
    .order-row-actions{display:flex;gap:7px;align-items:center}.order-delete{color:#b42318;border-color:#f1c7c7;background:#fff}
    @media(max-width:700px){.order-row-actions{flex-wrap:wrap}}
    .deadline-row{transition:background-color 1.2s ease}.deadline-row[style]{background:var(--deadline-bg)}.deadline-row[style] td{border-bottom-color:var(--deadline-border)}.deadline-row[style] td:nth-child(5){color:var(--deadline-text);font-weight:750}
    .order-drawer{position:fixed;inset:0;z-index:80;background:#10182888;display:none;justify-content:flex-end}
    .order-drawer.open{display:flex}
    .order-drawer-panel{background:#fff;width:min(760px,100%);height:100%;overflow:auto;padding:22px;box-shadow:-12px 0 40px #0002}
    .order-drawer-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;position:sticky;top:-22px;background:#fff;padding:8px 0 14px;z-index:2;border-bottom:1px solid var(--line)}
    .order-tabs{display:flex;gap:7px;overflow:auto;margin:16px 0}
    .order-tabs button{white-space:nowrap}
    .order-section{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .order-section .wide{grid-column:1/-1}
    .order-section label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700}
    .order-section textarea{min-height:80px}
    .order-event{padding:10px 0;border-bottom:1px solid var(--line)}
    @media(max-width:600px){.order-drawer-panel{padding:15px}.order-section{grid-template-columns:1fr}.order-section .wide{grid-column:auto}}
  `;
  document.head.appendChild(style);

  function ensureUI() {
    const section = $('orders');
    if (!section) return;
    section.innerHTML = `
      <div class="head"><div><h1>Заказы</h1><div class="muted">Единая карточка заказа: клиент, объект, проект, материалы, документы и производство</div></div><button class="btn primary" id="orderNew">＋ Новый заказ</button></div>
      <div class="panel">
        <div class="order-toolbar"><input id="orderSearch" placeholder="Поиск по номеру, клиенту, адресу или изделию"><select id="orderFilter" style="max-width:220px"><option value="">Все этапы</option>${stages.map(s=>`<option>${esc(s)}</option>`).join('')}</select></div>
        <div class="scroll"><table class="order-table"><thead><tr><th>НОМЕР</th><th>КЛИЕНТ</th><th>ИЗДЕЛИЕ</th><th>ЭТАП</th><th>СРОК</th><th></th></tr></thead><tbody id="orderRows"><tr><td colspan="6">Загрузка…</td></tr></tbody></table></div>
      </div>
      <div class="order-drawer" id="orderDrawer"><div class="order-drawer-panel">
        <div class="order-drawer-head"><div><div class="small" id="orderNumber">НОВЫЙ ЗАКАЗ</div><h2 id="orderTitle">Карточка заказа</h2></div><button class="btn" id="orderClose">Закрыть ✕</button></div>
        <div class="order-tabs"><button class="btn" data-otab="main">Основное</button><button class="btn" data-otab="project">Замеры и проект</button><button class="btn" data-otab="materials">Материалы</button><button class="btn" data-otab="production">Производство</button><button class="btn" data-otab="history">История</button></div>
        <form id="orderForm"><input type="hidden" name="id"><div id="orderTabBody"></div><div class="actions"><button type="button" class="btn" id="orderCancel">Отмена</button><button class="btn primary">Сохранить заказ</button></div></form>
      </div></div>`;
    $('orderNew').addEventListener('click', () => openDrawer());
    $('orderClose').addEventListener('click', closeDrawer);
    $('orderCancel').addEventListener('click', closeDrawer);
    $('orderDrawer').addEventListener('click', e => { if(e.target.id==='orderDrawer') closeDrawer(); });
    $('orderSearch').addEventListener('input', render);
    $('orderFilter').addEventListener('change', render);
    document.querySelectorAll('[data-otab]').forEach(b => b.addEventListener('click',()=>showTab(b.dataset.otab)));
    $('orderForm').addEventListener('submit', save);
    $('orderForm').addEventListener('change', e => {
      if(e.target.name!=='client_name')return;
      const source=typeof clients!=='undefined'&&Array.isArray(clients)?clients:[];
      const client=source.find(x=>x.full_name===e.target.value);
      if(!client)return;
      const form=$('orderForm');
      if(client.phone&&!form.elements.phone.value)form.elements.phone.value=client.phone;
      if(client.address&&!form.elements.address.value)form.elements.address.value=client.address;
    });
  }

  const fields = {
    main: `<div class="order-section">
      <label>Номер заказа<input name="order_no" placeholder="Присвоится автоматически"></label>
      <label>Этап<select name="stage">${stages.map(s=>`<option>${esc(s)}</option>`).join('')}</select></label>
      <label>Клиент *<input name="client_name" required list="orderClientOptions"><datalist id="orderClientOptions">${(typeof clients!=='undefined'&&Array.isArray(clients)?clients:[]).map(c=>`<option>${esc(c.full_name)}</option>`).join('')}</datalist></label>
      <label>Телефон<input name="phone"></label><label class="wide">Адрес объекта<input name="address"></label>
      <label>Тип мебели<select name="furniture_type"><option>Кухня</option><option>Шкаф</option><option>Гардеробная</option><option>Комод / тумба</option><option>Мебель для ванной</option><option>Другая корпусная мебель</option></select></label>
      <label>Название изделия<input name="title" required placeholder="Например, кухня в квартиру"></label>
      <label>Ответственный<input name="manager"></label><label>Плановый срок<input name="due_date" type="date"></label>
      <label>Стоимость, ₽<input name="amount" type="number" min="0" step="0.01"></label>
      <label>Статус оплаты<select name="payment_status"><option>Не выставлено</option><option>Ожидает предоплату</option><option>Частично оплачено</option><option>Оплачено</option></select></label>
      <label class="wide">Описание / договорённости<textarea name="description"></textarea></label>
    </div>`,
    project: `<div class="order-section">
      <label>Длина, мм<input name="length_mm" type="number" min="0"></label><label>Высота, мм<input name="height_mm" type="number" min="0"></label>
      <label>Глубина, мм<input name="depth_mm" type="number" min="0"></label><label>Дата замера<input name="measure_date" type="date"></label>
      <label class="wide">Ссылка на LiDAR / облако файлов<input name="lidar_url" type="url" placeholder="https://…"></label>
      <label class="wide">Ссылка на 3D-проект / чертежи<input name="project_url" type="url" placeholder="https://…"></label>
      <label class="wide">Комментарий по замеру и проекту<textarea name="project_notes"></textarea></label>
    </div>`,
    materials: `<div class="order-section">
      <label>Корпус / ЛДСП<input name="body_material" placeholder="Например, EGGER 16 мм"></label>
      <label>Фасады<input name="facades" placeholder="МДФ, декор, покрытие"></label>
      <label>Столешница<input name="worktop"></label><label>Кромка<input name="edge_band" placeholder="0,8 мм"></label>
      <label>Фурнитура<input name="hardware" placeholder="BLUM / другая"></label><label>Поставщик<input name="supplier"></label>
      <label class="wide">Комплектация и спецификация<textarea name="specification"></textarea></label>
      <label class="wide">Ссылка на документы / КП / договор<input name="documents_url" type="url" placeholder="https://…"></label>
    </div>`,
    production: `<div class="order-section">
      <label>Дата запуска<input name="production_start" type="date"></label><label>Плановая готовность<input name="production_due" type="date"></label>
      <label class="wide">Текущий этап производства<select name="production_stage"><option>Не запущено</option><option>Подготовка документации</option><option>Раскрой</option><option>Кромление</option><option>Присадка</option><option>Фрезеровка</option><option>Сборка</option><option>Контроль качества</option><option>Упаковка</option><option>Готово</option></select></label>
      <label class="wide">Контроль качества / замечания<textarea name="quality_notes"></textarea></label>
      <label>Дата доставки<input name="delivery_date" type="date"></label><label>Дата монтажа<input name="installation_date" type="date"></label>
      <label class="wide">Заметки по доставке и монтажу<textarea name="installation_notes"></textarea></label>
    </div>`,
    history: `<div id="orderHistory">Сначала сохраните заказ, чтобы вести историю изменений.</div>`
  };
  let currentTab = 'main';
  function showTab(tab) {
    currentTab=tab;
    const body=$('orderTabBody');
    if(!body.dataset.built){
      body.innerHTML=Object.entries(fields).map(([key,html])=>`<div data-order-panel="${key}" style="display:none">${html}</div>`).join('');
      body.dataset.built='1';
    }
    body.querySelectorAll('[data-order-panel]').forEach(panel=>panel.style.display=panel.dataset.orderPanel===tab?'block':'none');
    document.querySelectorAll('[data-otab]').forEach(b=>b.classList.toggle('primary',b.dataset.otab===tab));
    if(tab==='history' && activeId) loadHistory();
  }
  function refreshClientOptions() {
    const list=$('orderClientOptions');
    if(!list)return;
    const source=typeof clients!=='undefined'&&Array.isArray(clients)?clients:[];
    list.innerHTML=source.map(c=>`<option value="${esc(c.full_name)}"></option>`).join('');
  }
  function openDrawer(order=null) {
    activeId=order?.id||null;
    $('orderForm').reset();
    $('orderForm').elements.id.value=activeId||'';
    $('orderTitle').textContent=order?.title||'Новый заказ';
    $('orderNumber').textContent=order?.order_no||'НОВЫЙ ЗАКАЗ';
    showTab('main');
    refreshClientOptions();
    if(order) populateTab(order);
    $('orderDrawer').classList.add('open');
  }
  function populateTab(order=null) {
    const o=order||orders.find(x=>x.id===activeId);
    if(!o)return;
    Object.entries(o).forEach(([k,v])=>{const el=$('orderForm').elements[k];if(el)el.value=v??'';});
  }
  function closeDrawer(){ $('orderDrawer').classList.remove('open'); activeId=null; }
  async function load() {
    const {data,error}=await db.from('furniture_orders').select('*').order('created_at',{ascending:false});
    if(error){$('orderRows').innerHTML=`<tr><td colspan="6" class="error">Ошибка загрузки: ${esc(error.message)}. Проверьте установку SQL-миграции.</td></tr>`;return;}
    orders=data||[];render();
  }
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
    function render() {
    const q=($('orderSearch')?.value||'').toLocaleLowerCase('ru'), filter=$('orderFilter')?.value||'';
    const list=orders.filter(o=>(!filter||o.stage===filter)&&[o.order_no,o.client_name,o.title,o.address,o.phone].join(' ').toLocaleLowerCase('ru').includes(q));
    $('orderRows').innerHTML=list.length?list.map(o=>`<tr class="deadline-row"${deadlineStyle(o.due_date)}><td><button class="order-open" data-id="${esc(o.id)}">${esc(o.order_no||'Без номера')}</button></td><td>${esc(o.client_name)}</td><td>${esc(o.title||o.furniture_type)}</td><td><span class="pill">${esc(o.stage)}</span></td><td>${esc(o.due_date||'—')}</td><td><div class="order-row-actions"><button type="button" class="btn" data-edit="${esc(o.id)}">Открыть</button><button type="button" class="btn order-delete" data-delete-order="${esc(o.id)}">Удалить</button></div></td></tr>`).join(''):'<tr><td colspan="6" class="empty">Заказов пока нет. Нажмите «Новый заказ».</td></tr>';
    $('orderRows').querySelectorAll('[data-id],[data-edit]').forEach(b=>b.addEventListener('click',()=>openDrawer(orders.find(o=>o.id===b.dataset.id||o.id===b.dataset.edit))));
    $('orderRows').querySelectorAll('[data-delete-order]').forEach(b=>b.addEventListener('click',()=>deleteOrder(b.dataset.deleteOrder)));
  }
  async function deleteOrder(id){
    const order=orders.find(o=>o.id===id);if(!order)return;
    if(activeId===id)closeDrawer();
    // История удаляется автоматически через ON DELETE CASCADE у furniture_order_events.order_id.
    const result=await db.from('furniture_orders').delete().eq('id',id);
    if(result.error){alert('Не удалось удалить заказ: '+result.error.message);return;}
    orders=orders.filter(o=>o.id!==id);
    render();
    // Сразу обновляем источник заказов в воронке, чтобы удалённая карточка исчезла и там.
    if(typeof loadPipelineOrders==='function'){await loadPipelineOrders();if(typeof renderDeals==='function')renderDeals();}
    else if(typeof window.loadDeals==='function'){await window.loadDeals();}
  }
  async function save(e) {
    e.preventDefault();
    const f=Object.fromEntries(new FormData(e.target));
    const {data:{user}}=await db.auth.getUser();
    const row={};
    Object.keys(fields).forEach(()=>{});
    const allowed=['order_no','stage','client_name','phone','address','furniture_type','title','manager','due_date','amount','payment_status','description','length_mm','height_mm','depth_mm','measure_date','lidar_url','project_url','project_notes','body_material','facades','worktop','edge_band','hardware','supplier','specification','documents_url','production_start','production_due','production_stage','quality_notes','delivery_date','installation_date','installation_notes'];
    allowed.forEach(k=>{if(f[k]!==undefined)row[k]=f[k]===''?null:f[k];});
    ['length_mm','height_mm','depth_mm'].forEach(k=>{if(row[k]!==null&&row[k]!==undefined)row[k]=Number(row[k]);});
    row.amount=Number(f.amount||0);
    if(row.order_no!==null)row.order_no=String(row.order_no).trim()||null;
    row.updated_at=new Date().toISOString();
    try {
      let result;
      if(f.id) result=await db.from('furniture_orders').update(row).eq('id',f.id).select().single();
      else result=await db.from('furniture_orders').insert({...row,created_by:user?.id||null}).select().single();
      if(result.error){alert('Не удалось сохранить заказ: '+result.error.message);return;}
      const saved=result.data;
      const eventResult=await db.from('furniture_order_events').insert({order_id:saved.id,event_type:f.id?'Изменение заказа':'Создание заказа',details:'Карточка заказа сохранена',created_by:user?.id||null});
      if(eventResult.error)console.warn('Order saved, history event failed:',eventResult.error.message);
      await load();
      activeId=saved.id;$('orderForm').elements.id.value=saved.id;$('orderNumber').textContent=saved.order_no||'ЗАКАЗ';$('orderTitle').textContent=saved.title||'Заказ';
      alert('Заказ сохранён.');
    } catch(err) {
      console.error('Order save error:',err);
      alert('Ошибка при сохранении заказа: '+(err?.message||String(err)));
    }
  }
  async function loadHistory() {
    const {data,error}=await db.from('furniture_order_events').select('*').eq('order_id',activeId).order('created_at',{ascending:false});
    $('orderHistory').innerHTML=error?`<p class="error">${esc(error.message)}</p>`:(data?.length?data.map(x=>`<div class="order-event"><b>${esc(x.event_type)}</b><div>${esc(x.details||'')}</div><div class="small">${x.created_at?new Date(x.created_at).toLocaleString('ru-RU'):''}</div></div>`).join(''):'История пока пуста.');
  }
  let uiInitialized=false;
  let dataLoaded=false;
  function init() {
    const nav=document.querySelector('[data-tab="orders"]');
    if(!nav||!$('orders')||typeof db==='undefined')return;
    if(!uiInitialized){
      try {
        ensureUI();
        uiInitialized=true;
        const originalTab=window.tab;
        if(typeof originalTab==='function'&&!window.__ordersTabWrapped){
          window.tab=function(id){originalTab(id);if(id==='orders')load();};
          window.__ordersTabWrapped=true;
        }
      } catch(err) {
        console.error('Orders module UI error:',err);
        const section=$('orders');
        if(section) section.innerHTML='<div class="head"><div><h1>Заказы</h1><div class="muted">Ошибка запуска модуля заказов</div></div></div><div class="panel error" id="ordersBootError"></div>';
        const box=$('ordersBootError');
        if(box) box.textContent='Не удалось запустить интерфейс заказов: '+(err?.message||String(err));
        return;
      }
    }
    if(window.__crmAuthenticated&&!dataLoaded){
      dataLoaded=true;
      load();
    }
  }
  function waitForAuth(){
    if(window.__crmAuthenticated){init();return;}
    window.addEventListener('crm:authenticated',init,{once:true});
  }
  window.initOrdersModule = init;
  // Render the orders interface immediately; database loading waits for authentication.
  init();
  window.addEventListener('crm:authenticated',init);
  window.addEventListener('load',init,{once:true});
})();
