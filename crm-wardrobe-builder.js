/* Interactive wardrobe builder for CRM estimates */
(function(){
'use strict';
var $=function(id){return document.getElementById(id);}, states=[];
var css=document.createElement('style');
css.textContent='#wbModal{display:none;position:fixed;inset:0;z-index:110;background:#10182899;padding:12px;align-items:center;justify-content:center}#wbModal.open{display:flex}#wbPanel{background:#fff;border-radius:15px;width:min(1050px,100%);max-height:96vh;overflow:auto;padding:20px}.wb-layout{display:grid;grid-template-columns:minmax(240px,320px) minmax(0,1fr);gap:18px}.wb-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.wb-fields label{font-size:12px;font-weight:700;display:flex;flex-direction:column;gap:5px}.wb-preview{border:1px solid #dce3ec;border-radius:12px;padding:14px;background:#f8fafc;min-width:0}.wb-cabinet{display:grid;grid-template-columns:repeat(var(--wb-cols),minmax(0,1fr));border:5px solid #475467;background:#e9edf2;min-height:300px;max-width:620px;margin:15px auto;gap:3px;padding:3px}.wb-section{display:grid;grid-template-rows:repeat(2,minmax(110px,1fr));gap:3px;min-width:0}.wb-cell{border:1px solid #98a2b3;background:#fff;color:#344054;border-radius:3px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;padding:5px;cursor:pointer;min-width:0}.wb-cell[data-kind="shelves"]{background:#e8f1ff;border-color:#5b8def}.wb-cell[data-kind="drawers"]{background:#e8f7ef;border-color:#38a169}.wb-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:#667085}.wb-total{font-size:13px;font-weight:700;margin-top:10px}@media(max-width:760px){.wb-layout{grid-template-columns:1fr}#wbPanel{padding:13px}.wb-cabinet{min-height:230px}.wb-section{grid-template-rows:repeat(2,minmax(90px,1fr))}}';
document.head.appendChild(css);
function ensure(){
 if($('wbModal'))return;
 var el=document.createElement('div');el.id='wbModal';
 el.innerHTML='<div id="wbPanel"><div class="head"><div><div class="small">ПАРАМЕТРИЧЕСКИЙ КОНСТРУКТОР</div><h2 style="margin:4px 0">Распашной шкаф</h2><div class="muted">Нажимайте на ячейки схемы: пустая → полки → ящики</div></div><button class="btn" id="wbClose">Закрыть ✕</button></div><div class="wb-layout"><div><div class="wb-fields"><label>Ширина, мм<input id="wbW" type="number" min="300" max="6000" value="2400"></label><label>Высота, мм<input id="wbH" type="number" min="300" max="3000" value="2400"></label><label>Глубина, мм<input id="wbD" type="number" min="200" max="1200" value="600"></label><label>Количество секций<input id="wbN" type="number" min="1" max="8" value="3"></label><label>Количество дверей<input id="wbDoors" type="number" min="0" max="8" value="3"></label><label>Материал дверей<select id="wbDoorMat"><option>ЛДСП 16 мм</option><option>ЛМДФ 19 мм</option><option>МДФ 19 мм</option></select></label></div><p class="small">Корпус: ЛДСП 16 мм · задняя стенка: ХДФ 3 мм · кромка: 0,8 мм. Схема предварительная, без конкретных монтажных зазоров и присадки.</p><div class="actions"><button class="btn" id="wbReset">Сбросить ячейки</button></div></div><div class="wb-preview"><b>Фронтальная схема шкафа</b><div id="wbDrawing"></div><div class="wb-legend"><span>□ Пустая ячейка</span><span>▤ Полки</span><span>▥ Ящики</span></div><div class="wb-total" id="wbStats"></div></div></div><div class="actions"><button class="btn" id="wbCancel">Отмена</button><button class="btn primary" id="wbApply">Передать деталировку в просчёт</button></div><p class="small">Перед запуском в производство требуется проверка зазоров, соединений, присадки и выбранной фурнитуры.</p></div>';
 document.body.appendChild(el);
 $('wbClose').onclick=close;$('wbCancel').onclick=close;
 $('wbModal').onclick=function(e){if(e.target.id==='wbModal')close();};
 ['wbW','wbH','wbD','wbN','wbDoors','wbDoorMat'].forEach(function(id){$(id).addEventListener('input',function(){if(id==='wbN')states=[];draw();});});
 $('wbReset').onclick=function(){states=[];draw();};$('wbApply').onclick=apply;
}
function val(id,min,max){var n=Number($(id).value);return Math.max(min,Math.min(max,isFinite(n)?n:min));}
function draw(){
 var n=val('wbN',1,8);while(states.length<n*2)states.push('empty');states=states.slice(0,n*2);
 var html='<div class="wb-cabinet" style="--wb-cols:'+n+'">';
 for(var s=0;s<n;s++){html+='<div class="wb-section">';for(var r=0;r<2;r++){var i=s*2+r,k=states[i],label=k==='empty'?'Свободно':k==='shelves'?'Полки':'Ящики';html+='<button type="button" class="wb-cell" data-cell="'+i+'" data-kind="'+k+'">'+label+'</button>';}html+='</div>';}
 $('wbDrawing').innerHTML=html+'</div>';
 $('wbDrawing').querySelectorAll('[data-cell]').forEach(function(b){b.onclick=function(){var i=Number(b.dataset.cell);states[i]=({empty:'shelves',shelves:'drawers',drawers:'empty'})[states[i]];draw();};});
 var sh=states.filter(function(x){return x==='shelves';}).length*2,dr=states.filter(function(x){return x==='drawers';}).length*2;
 $('wbStats').textContent='Секций: '+n+' · Полок: '+sh+' · Фасадов ящиков: '+dr+' · Дверей: '+val('wbDoors',0,8);
}
function open(){ensure();states=[];draw();$('wbModal').classList.add('open');}
function close(){if($('wbModal'))$('wbModal').classList.remove('open');}
function apply(){
 var W=val('wbW',300,6000),H=val('wbH',300,3000),D=val('wbD',200,1200),N=val('wbN',1,8),doors=val('wbDoors',0,8),t=16;
 if(W<=2*t||H<=2*t){alert('Габариты слишком малы для корпуса.');return;}
 var iw=W-2*t-(N-1)*t,sw=iw/N,ih=H-2*t,rows=[];
 function add(name,mat,w,h,q,edge){rows.push({item_name:name,material:mat,width_mm:Math.max(1,Math.round(w)),height_mm:Math.max(1,Math.round(h)),quantity:q,edge_m:Number(edge.toFixed(3)),material_price_m2:0});}
 add('Боковина корпуса','ЛДСП 16 мм',D,H,2,H/1000);
 add('Крышка корпуса','ЛДСП 16 мм',D,W-2*t,1,(W-2*t)/1000);
 add('Дно корпуса','ЛДСП 16 мм',D,W-2*t,1,(W-2*t)/1000);
 if(N>1)add('Внутренняя перегородка','ЛДСП 16 мм',D,ih,N-1,ih/1000);
 states.forEach(function(kind,i){var sec=Math.floor(i/2);if(kind==='shelves')add('Полка секции '+(sec+1),'ЛДСП 16 мм',D-20,sw-2,2,(sw-2)/1000);if(kind==='drawers')add('Фасад ящика секции '+(sec+1),'ЛДСП 16 мм',Math.max(1,sw-4),Math.max(1,ih/5),2,2*(sw-4+ih/5)/1000);});
 if(doors>0){var dw=(W-(doors+1)*3)/doors;add('Дверь распашная',$('wbDoorMat').value,H-6,dw,doors,2*((H-6)+dw)/1000);}
 add('Задняя стенка','ХДФ 3 мм',W,H,1,0);
 window.dispatchEvent(new CustomEvent('crm:wardrobe-generated',{detail:{title:'Шкаф '+W+'×'+H+'×'+D+' мм',items:rows}}));
 close();
}
window.addEventListener('crm:open-wardrobe-builder',open);
})();