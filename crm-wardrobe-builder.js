/* Interactive wardrobe builder for CRM estimates */
(function(){
'use strict';
var $=function(id){return document.getElementById(id);}, states=[], accumulated=[], cabinetNo=1, selectedSection=0, rowCount=4;
var css=document.createElement('style');
css.textContent='#wbModal{display:none;position:fixed;inset:0;z-index:110;background:#10182899;padding:12px;align-items:center;justify-content:center}#wbModal.open{display:flex}#wbPanel{background:#fff;border-radius:15px;width:min(1050px,100%);max-height:96vh;overflow:auto;padding:20px}.wb-layout{display:grid;grid-template-columns:minmax(240px,320px) minmax(0,1fr);gap:18px}.wb-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.wb-fields label{font-size:12px;font-weight:700;display:flex;flex-direction:column;gap:5px}.wb-preview{border:1px solid #dce3ec;border-radius:12px;padding:14px;background:#f8fafc;min-width:0}.wb-cabinet{display:grid;grid-template-columns:repeat(var(--wb-cols),minmax(0,1fr));border:5px solid #475467;background:#e9edf2;min-height:300px;max-width:620px;margin:8px auto;gap:3px;padding:3px}.wb-section{display:grid;grid-template-rows:30px repeat(var(--wb-rows),minmax(40px,1fr));gap:3px;min-width:0}.wb-section-head{border:1px solid #c5ceda;background:#eef2f7;color:#344054;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer;padding:4px}.wb-section-head.selected{background:#285fe8;color:#fff;border-color:#285fe8}.wb-cell{border:1px solid #98a2b3;background:#fff;color:#344054;border-radius:3px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;padding:5px;cursor:pointer;min-width:0}.wb-cell[data-kind="shelves"]{background:#e8f1ff;border-color:#5b8def}.wb-cell[data-kind="drawers"]{background:#e8f7ef;border-color:#38a169}.wb-cell.selected-cell{outline:2px solid #285fe8;outline-offset:-2px}.wb-section-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}.wb-section-tools .btn{padding:7px 11px}.wb-selected-label{font-size:12px;color:#475467;font-weight:700}.wb-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:#667085}.wb-total{font-size:13px;font-weight:700;margin-top:10px}@media(max-width:760px){.wb-layout{grid-template-columns:1fr}#wbPanel{padding:13px}.wb-cabinet{min-height:230px}.wb-section{grid-template-rows:28px repeat(var(--wb-rows),minmax(38px,1fr))}.wb-cell{font-size:10px;padding:2px}}';
document.head.appendChild(css);
function ensure(){
 if($('wbModal'))return;
 var el=document.createElement('div');el.id='wbModal';
 el.innerHTML='<div id="wbPanel"><div class="head"><div><div class="small">ПАРАМЕТРИЧЕСКИЙ КОНСТРУКТОР</div><h2 style="margin:4px 0">Распашной шкаф</h2><div class="muted">Выбирайте вертикальные и горизонтальные секции на схеме, затем настраивайте ячейки</div></div><button class="btn" id="wbClose">Закрыть ✕</button></div><div class="wb-layout"><div><div class="wb-fields"><label>Ширина, мм<input id="wbW" type="number" min="300" max="6000" value="2400"></label><label>Высота, мм<input id="wbH" type="number" min="300" max="3000" value="2400"></label><label>Глубина, мм<input id="wbD" type="number" min="200" max="1200" value="600"></label><label>Вертикальные секции<input id="wbN" type="number" min="1" max="8" value="3"></label><label>Горизонтальные секции<input id="wbRows" type="number" min="1" max="8" value="4"></label><label>Количество дверей<input id="wbDoors" type="number" min="0" max="8" value="3"></label><label>Материал дверей<select id="wbDoorMat"><option>ЛДСП 16 мм</option><option>ЛМДФ 19 мм</option><option>МДФ 19 мм</option></select></label></div><p class="small">Корпус: ЛДСП 16 мм · задняя стенка: ХДФ 3 мм · кромка: 0,8 мм. Схема предварительная, без конкретных монтажных зазоров и присадки.</p><div class="actions"><button class="btn" id="wbReset">Сбросить ячейки</button><button class="btn" id="wbAddCabinet">＋ Добавить ещё шкаф</button></div></div><div class="wb-preview"><b>Фронтальная схема шкафа</b><div class="wb-section-tools"><button type="button" class="btn" id="wbAddSection">＋ Вертикальная</button><button type="button" class="btn" id="wbRemoveSection">− Вертикальная</button><button type="button" class="btn" id="wbAddRow">＋ Горизонтальная</button><button type="button" class="btn" id="wbRemoveRow">− Горизонтальная</button><span class="wb-selected-label" id="wbSelectedLabel"></span></div><div id="wbDrawing"></div><div class="wb-legend"><span>□ Пустая ячейка</span><span>▤ Полки</span><span>▥ Ящики</span></div><div class="wb-total" id="wbStats"></div></div></div><div class="actions"><button class="btn" id="wbCancel">Отмена</button><button class="btn primary" id="wbApply">Передать деталировку в просчёт</button></div><p class="small">Перед запуском в производство требуется проверка зазоров, соединений, присадки и выбранной фурнитуры.</p></div>';
 document.body.appendChild(el);
 $('wbClose').onclick=close;$('wbCancel').onclick=close;
 $('wbModal').onclick=function(e){if(e.target.id==='wbModal')close();};
 ['wbW','wbH','wbD','wbDoors','wbDoorMat'].forEach(function(id){$(id).addEventListener('input',draw);});
 $('wbN').addEventListener('change',function(){setSectionCount(val('wbN',1,8));});
 $('wbN').addEventListener('input',function(){var n=val('wbN',1,8);if(states.length!==n*rowCount)setSectionCount(n);});
 $('wbRows').addEventListener('change',function(){setRowCount(val('wbRows',1,8));});
 $('wbRows').addEventListener('input',function(){var n=val('wbRows',1,8);if(states.length!==n*rowCount)setRowCount(n);});
 $('wbAddSection').onclick=function(){setSectionCount(states.length/rowCount+1);};
 $('wbRemoveSection').onclick=function(){if(states.length/rowCount<=1)return;var n=states.length/rowCount;states=states.filter(function(_,i){return Math.floor(i/rowCount)!==selectedSection;});selectedSection=Math.min(selectedSection,n-2);$('wbN').value=n-1;draw();};
 $('wbAddRow').onclick=function(){setRowCount(rowCount+1);};
 $('wbRemoveRow').onclick=function(){setRowCount(rowCount-1);};
 $('wbReset').onclick=function(){states=states.map(function(){return 'empty';});draw();};
 $('wbApply').onclick=apply;
 $('wbAddCabinet').onclick=function(){var next=buildRows();if(!next)return;accumulated=accumulated.concat(next);cabinetNo++;states=[];selectedSection=0;draw();};
}
function val(id,min,max){var n=Number($(id).value);return Math.max(min,Math.min(max,isFinite(n)?n:min));}
function setSectionCount(n){
 n=Math.max(1,Math.min(8,Math.round(n)));
 var old=states.slice(),oldCount=old.length/rowCount;
 if(n>oldCount){for(var i=oldCount;i<n;i++)for(var r=0;r<rowCount;r++)states.push('empty');}
 else if(n<oldCount)states=old.slice(0,n*rowCount);
 selectedSection=Math.min(selectedSection,n-1);
 $('wbN').value=n;draw();
}
function setRowCount(n){
 n=Math.max(1,Math.min(8,Math.round(n)));var old=states.slice(),cols=Math.max(1,Math.round(old.length/rowCount)),next=[];
 for(var s=0;s<cols;s++)for(var r=0;r<n;r++)next.push(r<rowCount?old[s*rowCount+r]:'empty');
 rowCount=n;states=next;$('wbRows').value=n;draw();
}
function draw(){
 var n=Math.max(1,Math.min(8,Math.round(states.length/rowCount)||val('wbN',1,8)));
 while(states.length<n*rowCount)states.push('empty');states=states.slice(0,n*rowCount);
 $('wbN').value=n;
 var html='<div class="wb-cabinet" style="--wb-cols:'+n+';--wb-rows:'+rowCount+'">';
 for(var s=0;s<n;s++){
  html+='<div class="wb-section"><button type="button" class="wb-section-head '+(s===selectedSection?'selected':'')+'" data-section="'+s+'">Секция '+(s+1)+'</button>';
  for(var r=0;r<rowCount;r++){var i=s*rowCount+r,k=states[i],label=k==='empty'?'Свободно':k==='shelves'?'Полки':'Ящики';html+='<button type="button" class="wb-cell '+(s===selectedSection?'selected-cell':'')+'" data-cell="'+i+'" data-kind="'+k+'">'+label+'</button>';}
  html+='</div>';
 }
 $('wbDrawing').innerHTML=html+'</div>';
 $('wbDrawing').querySelectorAll('[data-section]').forEach(function(b){b.onclick=function(){selectedSection=Number(b.dataset.section);draw();};});
 $('wbDrawing').querySelectorAll('[data-cell]').forEach(function(b){b.onclick=function(){var i=Number(b.dataset.cell);selectedSection=Math.floor(i/rowCount);states[i]=({empty:'shelves',shelves:'drawers',drawers:'empty'})[states[i]];draw();};});
 $('wbSelectedLabel').textContent='Выбрана секция '+(selectedSection+1)+' из '+n;
 $('wbRemoveSection').disabled=n<=1;$('wbRemoveRow').disabled=rowCount<=1;$('wbRows').value=rowCount;
 var sh=states.filter(function(x){return x==='shelves';}).length,dr=states.filter(function(x){return x==='drawers';}).length;
 $('wbStats').textContent='Шкаф №'+cabinetNo+' · Вертикальных: '+n+' · Горизонтальных: '+rowCount+' · Полок: '+sh+' · Уровней с ящиками: '+dr+' · Дверей: '+val('wbDoors',0,8);
}
function open(){ensure();rowCount=4;states=Array(3*rowCount).fill('empty');accumulated=[];cabinetNo=1;selectedSection=0;draw();$('wbModal').classList.add('open');}
function close(){if($('wbModal'))$('wbModal').classList.remove('open');}
function buildRows(){
 var W=val('wbW',300,6000),H=val('wbH',300,3000),D=val('wbD',200,1200),N=states.length/rowCount,doors=val('wbDoors',0,8),t=16;
 if(W<=2*t||H<=2*t){alert('Габариты слишком малы для корпуса.');return null;}
 var iw=W-2*t-(N-1)*t,sw=iw/N,ih=H-2*t,rows=[],prefix='Шкаф '+cabinetNo+' — ';
 function add(name,mat,w,h,q,edgeAllSides){var ww=Math.max(1,Math.round(w)),hh=Math.max(1,Math.round(h));var edge=edgeAllSides?(2*(ww+hh)*q/1000):0;rows.push({item_name:prefix+name,material:mat,width_mm:ww,height_mm:hh,quantity:q,edge_m:Number(edge.toFixed(3)),material_price_m2:0});}
 add('Боковина корпуса','ЛДСП 16 мм',D,H,2,true);
 add('Крышка корпуса','ЛДСП 16 мм',W-2*t,D,1,true);
 add('Дно корпуса','ЛДСП 16 мм',W-2*t,D,1,true);
 if(N>1)add('Внутренняя перегородка','ЛДСП 16 мм',D,ih,N-1,true);
 for(var divider=1;divider<rowCount;divider++)add('Горизонтальная перегородка '+divider,'ЛДСП 16 мм',W-2*t,D-20,1,true);
 states.forEach(function(kind,i){var sec=Math.floor(i/rowCount),level=(i%rowCount)+1;if(kind==='shelves')add('Полка секция '+(sec+1)+', уровень '+level,'ЛДСП 16 мм',sw-2,D-20,1,true);if(kind==='drawers')add('Фасад ящика секция '+(sec+1)+', уровень '+level,'ЛДСП 16 мм',Math.max(1,sw-4),Math.max(1,ih/5),1,true);});
 if(doors>0){var dw=(W-(doors+1)*3)/doors;add('Дверь распашная',$('wbDoorMat').value,dw,H-6,doors,true);}
 add('Задняя стенка','ХДФ 3 мм',W,H,1,false);
 return rows;
}
function apply(){
 var rows=buildRows();if(!rows)return;
 accumulated=accumulated.concat(rows);
 window.dispatchEvent(new CustomEvent('crm:wardrobe-generated',{detail:{title:'Шкафы: '+cabinetNo,items:accumulated}}));
 close();
}
window.addEventListener('crm:open-wardrobe-builder',open);
})();