/* Дополнение CRM «Мастер мебельщик».
Установка: загрузить файл рядом с index.html и добавить перед </body>:
<script src="./crm-enhancements.js"></script>
Поиск работает по загруженным клиентам и сделкам. Избранное хранится локально
в браузере и разделяется по email вошедшего пользователя.
*/
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const readClients = () => { try { return Array.isArray(clients) ? clients : []; } catch (_) { return []; } };
  const readDeals = () => { try { return Array.isArray(deals) ? deals : []; } catch (_) { return []; } };
  const userKey = () => ($('userEmail')?.textContent || 'local').trim().toLowerCase().replace(/[^a-z0-9@._-]/g,'_');
  const favKey = () => 'crm_favorites_' + userKey();
  const getFav = () => { try { return JSON.parse(localStorage.getItem(favKey()) || '[]'); } catch (_) { return []; } };
  const setFav = a => localStorage.setItem(favKey(), JSON.stringify(a));

  const style = document.createElement('style');
  style.textContent = `
    #crmGlobalSearch{width:min(34vw,330px);min-width:130px}
    #crmSearchPanel{margin:8px 25px;max-height:40vh;overflow:auto;position:relative;z-index:30}
    .crm-result,.crm-fav-row{padding:10px 4px;border-bottom:1px solid var(--line,#e3e8ef)}
    .crm-fav-row{display:flex;justify-content:space-between;gap:12px;align-items:center}
    .crm-star{padding:5px 8px;margin-left:5px}
    @media(max-width:680px){#crmGlobalSearch{width:38vw;min-width:110px}#crmSearchPanel{margin:8px 10px}.crm-fav-row{align-items:flex-start;flex-direction:column}}
  `;
  document.head.appendChild(style);

  function search() {
    const q = $('crmGlobalSearch')?.value.trim().toLocaleLowerCase('ru');
    const panel = $('crmSearchPanel');
    if (!panel) return;
    if (!q) { panel.style.display='none'; panel.innerHTML=''; return; }
    const cs = readClients().filter(c => [c.full_name,c.phone,c.email,c.address,c.manager].join(' ').toLocaleLowerCase('ru').includes(q)).slice(0,10);
    const ds = readDeals().filter(d => [d.title,d.client_name,d.phone,d.manager,d.stage].join(' ').toLocaleLowerCase('ru').includes(q)).slice(0,10);
    const html = [
      ...cs.map(c => `<div class="crm-result"><span class="pill">Клиент</span> <b>${esc(c.full_name)}</b><div class="small">${esc(c.phone||c.email||'')}</div><button class="btn" data-tabto="clients">Открыть клиентов</button></div>`),
      ...ds.map(d => `<div class="crm-result"><span class="pill">Сделка</span> <b>${esc(d.title)}</b><div class="small">${esc(d.client_name||'')} · ${esc(d.stage||'')}</div><button class="btn" data-tabto="leads">Открыть воронку</button></div>`)
    ];
    panel.style.display='block';
    panel.innerHTML = html.length ? '<b>Результаты поиска</b>'+html.join('') : '<div class="empty">Ничего не найдено среди загруженных клиентов и сделок.</div>';
    panel.querySelectorAll('[data-tabto]').forEach(b => b.addEventListener('click', () => {
      if (typeof window.tab === 'function') window.tab(b.dataset.tabto);
      panel.style.display='none';
    }));
  }

  function addFav(type,id,label,target) {
    const a=getFav();
    if (!a.some(x=>String(x.id)===String(id))) {
      a.push({type,id:String(id),label,target});
      setFav(a);
    }
  }
  function toggleFav(type,id,label,target,button) {
    const a=getFav(), exists=a.some(x=>String(x.id)===String(id));
    setFav(exists?a.filter(x=>String(x.id)!==String(id)):[...a,{type,id:String(id),label,target}]);
    button.textContent=exists?'☆':'★';
  }
  function favoritesPage() {
    const content=document.querySelector('.content');
    if (!content) return;
    let sec=$('crmFavoritesSection');
    if (!sec) {
      sec=document.createElement('section');
      sec.id='crmFavoritesSection';
      sec.innerHTML='<div class="head"><div><h1>Избранное</h1><div class="muted">Закреплённые клиенты и сделки</div></div></div><div class="panel" id="crmFavoritesList"></div>';
      content.appendChild(sec);
    }
    content.querySelectorAll(':scope > section').forEach(x=>x.classList.add('hidden'));
    sec.classList.remove('hidden');
    document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.tab==='favorites'));
    if ($('where')) $('where').textContent='Избранное';
    renderFav();
  }
  function renderFav() {
    const box=$('crmFavoritesList'); if(!box)return;
    const a=getFav();
    box.innerHTML=a.length?a.map(x=>`<div class="crm-fav-row"><div><span class="pill">${esc(x.type)}</span> <b>${esc(x.label)}</b></div><div><button class="btn" data-open="${esc(x.target)}">Открыть</button> <button class="btn danger" data-del="${esc(x.id)}">Убрать</button></div></div>`).join(''):'<div class="empty">Избранное пусто. Нажмите ☆ у клиента или сделки.</div>';
    box.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>{if(typeof window.tab==='function')window.tab(b.dataset.open);$('crmFavoritesSection')?.classList.add('hidden');}));
    box.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{setFav(getFav().filter(x=>x.id!==b.dataset.del));renderFav();}));
  }

  function bindStars() {
    const rows=$('clientRows');
    rows?.querySelectorAll('tr').forEach(row=>{
      if(row.querySelector('.crm-star'))return;
      const edit=row.querySelector('button[onclick^="editClient"]');
      const id=edit?.getAttribute('onclick')?.match(/editClient\('([^']+)'\)/)?.[1];
      const c=readClients().find(x=>String(x.id)===String(id));
      if(!c||!edit)return;
      const b=document.createElement('button');b.className='btn crm-star';b.type='button';b.textContent=getFav().some(x=>String(x.id)===String(id))?'★':'☆';
      b.title='Добавить или убрать из избранного';b.addEventListener('click',()=>toggleFav('Клиент',id,c.full_name,'clients',b));edit.after(b);
    });
    $('pipeline')?.querySelectorAll('.deal').forEach(card=>{
      if(card.querySelector('.crm-star'))return;
      const edit=card.querySelector('button[onclick^="editDeal"]');
      const id=edit?.getAttribute('onclick')?.match(/editDeal\('([^']+)'\)/)?.[1];
      const d=readDeals().find(x=>String(x.id)===String(id));
      if(!d||!edit)return;
      const b=document.createElement('button');b.className='btn crm-star';b.type='button';b.textContent=getFav().some(x=>String(x.id)===String(id))?'★':'☆';
      b.title='Добавить или убрать из избранного';b.addEventListener('click',()=>toggleFav('Сделка',id,d.title,'leads',b));edit.after(b);
    });
  }

  function init() {
    const top=document.querySelector('.top-right');
    if(top&&!$('crmGlobalSearch')){
      const input=document.createElement('input');input.id='crmGlobalSearch';input.type='search';input.placeholder='Поиск по CRM…';input.setAttribute('aria-label','Поиск клиентов и сделок');input.addEventListener('input',search);top.prepend(input);
      const panel=document.createElement('div');panel.id='crmSearchPanel';panel.className='panel';panel.style.display='none';const main=document.querySelector('main');if(main)main.insertBefore(panel,main.querySelector('.content'));
    }
    const side=document.querySelector('.side');
    if(side&&!side.querySelector('[data-tab="favorites"]')){
      const b=document.createElement('button');b.className='navbtn';b.dataset.tab='favorites';b.textContent='★ Избранное';b.addEventListener('click',favoritesPage);side.appendChild(b);
    }
    // Финансовый модуль исключён по согласованному ТЗ.
    document.querySelectorAll('[data-tab="finance"],#finance').forEach(x=>x.remove());
    document.querySelectorAll('.card').forEach(card => { const label=card.querySelector('.label'); if(label && label.textContent.includes('Сумма активных сделок')) card.classList.add('hidden'); });
    try { delete tabNames.finance; } catch (_) {}
    bindStars();
    const clientsBox=$('clientRows'), pipeline=$('pipeline');
    if(clientsBox)new MutationObserver(bindStars).observe(clientsBox,{childList:true,subtree:true});
    if(pipeline)new MutationObserver(bindStars).observe(pipeline,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
