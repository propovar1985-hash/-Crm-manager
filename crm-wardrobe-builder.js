/* Interactive wardrobe builder for CRM estimates */
(function(){
'use strict';
var $=function(id){return document.getElementById(id);}, states=[], accumulated=[], cabinetNo=1, selectedSection=0, selectedRow=0, rowCount=4;
var css=document.createElement('style');
css.textContent=`
#wbModal{display:none;position:fixed;inset:0;z-index:110;background:rgba(15,23,42,.68);backdrop-filter:blur(5px);padding:12px;align-items:center;justify-content:center}
#wbModal.open{display:flex}
#wbPanel{background:#f8fafc;border:1px solid #dbe4f0;border-radius:20px;width:min(1180px,100%);max-height:96vh;overflow:auto;padding:22px;box-shadow:0 24px 80px #0f172a55}
#wbPanel .head{align-items:flex-start;margin-bottom:18px}
#wbPanel h2{font-size:24px;color:#172554}
.wb-eyebrow{display:inline-flex;align-items:center;gap:6px;background:#e0eaff;color:#2453bd;border-radius:30px;padding:6px 10px;font-size:11px;font-weight:800;letter-spacing:.05em}
.wb-layout{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);gap:16px;align-items:start}
.wb-settings,.wb-preview{border:1px solid #e1e8f2;border-radius:16px;padding:16px;background:#fff;min-width:0}
.wb-settings-title,.wb-preview-title{font-size:15px;font-weight:800;color:#24324a;margin-bottom:12px}
.wb-fields{display:grid;grid-template-columns:1fr 1fr;gap:11px}
.wb-fields label{font-size:12px;font-weight:750;color:#475467;display:flex;flex-direction:column;gap:6px}
.wb-stepper{display:grid;grid-template-columns:38px minmax(0,1fr) 38px;gap:6px}.wb-stepper .btn{padding:7px 8px;min-height:39px}.wb-stepper input{text-align:center;font-weight:700;font-variant-numeric:tabular-nums}
#wbPanel input,#wbPanel select{border:1px solid #d6dfeb;border-radius:9px;padding:10px;background:#fbfcfe;min-width:0}
#wbPanel input:focus,#wbPanel select:focus{outline:2px solid #b9ceff;border-color:#4778ed}
.wb-note{font-size:11px;line-height:1.55;color:#667085;background:#f1f5f9;border-radius:10px;padding:10px;margin:12px 0}
.wb-settings-actions{display:flex;gap:8px;flex-wrap:wrap}
.wb-preview{background:linear-gradient(145deg,#f4f8ff,#f8fbff)}
.wb-preview-top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.wb-pill{font-size:11px;font-weight:800;border-radius:20px;padding:6px 10px;background:#e7f7ee;color:#187345}
.wb-section-tools{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:9px 0}
.wb-section-tools .btn{padding:7px 10px;font-size:12px}
.wb-selected-label{font-size:12px;color:#3157b7;font-weight:800;background:#e9f0ff;padding:7px 10px;border-radius:8px}
.wb-row-tools{padding:9px 0;border-top:1px solid #e5ebf4;border-bottom:1px solid #e5ebf4}
.wb-cabinet{display:grid;grid-template-columns:repeat(var(--wb-cols),minmax(0,1fr));border:7px solid #64748b;background:#cbd5e1;min-height:330px;max-width:680px;margin:14px auto;gap:4px;padding:4px;border-radius:8px;box-shadow:0 8px 20px #1e293b18}
.wb-section{display:grid;grid-template-rows:30px repeat(var(--wb-rows),minmax(42px,1fr));gap:4px;min-width:0}
.wb-section-head{border:1px solid #a8b8cf;background:#e7edf6;color:#334155;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;padding:4px}
.wb-section-head.selected{background:#315fe8;color:#fff;border-color:#315fe8;box-shadow:0 2px 8px #315fe844}
.wb-cell{border:1px solid #cbd5e1;background:#fff;color:#475569;border-radius:5px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;font-weight:700;padding:5px;cursor:pointer;min-width:0;transition:transform .12s,border-color .12s,box-shadow .12s}
.wb-cell:hover{transform:translateY(-1px);box-shadow:0 3px 9px #1e293b16}
.wb-cell[data-kind="shelves"]{background:#e5f0ff;border:1px solid #75a6f6;color:#1d4ed8}
.wb-cell[data-kind="drawers"]{background:#e3f8ed;border:1px solid #61c38b;color:#167344}
.wb-cell.selected-cell{outline:2px solid #315fe8;outline-offset:-2px}
.wb-legend{display:flex;gap:8px;flex-wrap:wrap;font-size:11px;color:#475467;margin:10px 0}
.wb-legend span{border-radius:20px;padding:6px 9px;background:#fff;border:1px solid #e2e8f0}
.wb-legend .wb-legend-shelf{background:#e5f0ff;border-color:#b6d0ff;color:#1d4ed8}
.wb-legend .wb-legend-drawer{background:#e3f8ed;border-color:#a8e3bf;color:#167344}
.wb-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}
.wb-stat{background:#fff;border:1px solid #e2eaf5;border-radius:10px;padding:9px}
.wb-stat b{display:block;font-size:17px;color:#1e3a8a;margin-top:3px}
.wb-stat span{font-size:10px;color:#667085}
.wb-footer-note{font-size:11px;line-height:1.5;color:#667085;margin-top:12px}
#wbPanel .actions{margin-top:16px}
#wbPanel button:disabled{opacity:.4;cursor:not-allowed}
@media(max-width:760px){.wb-layout{grid-template-columns:1fr}#wbPanel{padding:13px}.wb-cabinet{min-height:250px}.wb-section{grid-template-rows:28px repeat(var(--wb-rows),minmax(38px,1fr))}.wb-cell{font-size:10px;padding:2px}.wb-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
document.head.appendChild(css);
function ensure(){
 if($('wbModal'))return;
 var el=document.createElement('div');el.id='wbModal';
 el.innerHTML='<div id="wbPanel"><div class="head"><div><span class="wb-eyebrow">✦ КОНСТРУКТОР МЕБЕЛИ</span><h2 style="margin:8px 0 5px">Распашной шкаф</h2><div class="muted">Настройте размеры и соберите внутреннее наполнение прямо на схеме</div></div><button class="btn" id="wbClose">Закрыть ✕</button></div><div class="wb-layout"><div class="wb-settings"><div class="wb-settings-title">① Габариты и параметры</div><div class="wb-fields"><label>Ширина, мм<input id="wbW" type="number" min="300" max="6000" value="2400"></label><label>Высота, мм<input id="wbH" type="number" min="300" max="3000" value="2400"></label><label>Глубина, мм<input id="wbD" type="number" min="200" max="1200" value="600"></label><label>Вертикальные секции<input id="wbN" type="number" min="1" max="8" value="3"></label><label>Количество горизонтальных уровней<div class="wb-stepper"><button type="button" class="btn" id="wbRowsMinus" aria-label="Уменьшить количество">−</button><input id="wbRows" type="number" min="1" max="8" step="1" value="4"><button type="button" class="btn" id="wbRowsPlus" aria-label="Увеличить количество">＋</button></div></label><label>Количество дверей<input id="wbDoors" type="number" min="0" max="8" value="3"></label><label>Материал дверей<select id="wbDoorMat"><option>ЛДСП 16 мм</option><option>ЛМДФ 19 мм</option><option>МДФ 19 мм</option></select></label></div><div class="wb-note">Стандартная база: корпус ЛДСП 16 мм · задняя стенка ХДФ 3 мм · кромка 0,8 мм. Схема предварительная — перед производством проверяются зазоры и присадка.</div><div class="wb-settings-actions"><button class="btn" id="wbReset">Сбросить ячейки</button><button class="btn" id="wbAddCabinet">＋ Добавить ещё шкаф</button></div></div><div class="wb-preview"><div class="wb-preview-top"><div class="wb-preview-title">② Схема наполнения</div><span class="wb-pill">Интерактивный чертёж</span></div><div class="wb-section-tools"><button type="button" class="btn" id="wbAddSection">＋ Вертикальная</button><button type="button" class="btn" id="wbRemoveSection">− Вертикальная</button><button type="button" class="btn" id="wbAddRow">＋ Горизонтальная</button><button type="button" class="btn" id="wbRemoveRow">− Горизонтальная</button><span class="wb-selected-label" id="wbSelectedLabel"></span></div><div id="wbRowSelectors" class="wb-section-tools wb-row-tools"></div><div id="wbDrawing"></div><div class="wb-legend"><span>□ Свободно</span><span class="wb-legend-shelf">▤ Полки</span><span class="wb-legend-drawer">▥ Ящики</span></div><div class="wb-stats" id="wbStats"></div><div class="wb-footer-note">Нажмите на ячейку, чтобы переключать наполнение: свободно → полки → ящики. Выбранные секция и горизонталь подсвечиваются.</div></div></div><div class="actions"><button class="btn" id="wbCancel">Отмена</button><button class="btn primary" id="wbApply">Передать деталировку в просчёт</button></div><p class="small">Перед запуском в производство требуется проверка зазоров, соединений, присадки и выбранной фурнитуры.</p></div>';
 document.body.appendChild(el);
 $('wbClose').onclick=close;$('wbCancel').onclick=close;
 $('wbApply').onclick=function(e){if(e){e.preventDefault();e.stopPropagation();}apply();};
 $('wbModal').onclick=function(e){if(e.target.id==='wbModal')close();};
 ['wbW','wbH','wbD','wbDoors','wbDoorMat'].forEach(function(id){$(id).addEventListener('input',draw);});
 $('wbN').addEventListener('change',function(){setSectionCount(val('wbN',1,8));});
 $('wbN').addEventListener('input',function(){var n=val('wbN',1,8);if(states.length!==n*rowCount)setSectionCount(n);});
 $('wbRows').addEventListener('change',function(){setRowCount(val('wbRows',1,8));});
 $('wbRowsMinus').onclick=function(){setRowCount(rowCount-1);};
 $('wbRowsPlus').onclick=function(){setRowCount(rowCount+1);};
 $('wbAddSection').onclick=function(){setSectionCount(states.length/rowCount+1);};
 $('wbRemoveSection').onclick=function(){if(states.length/rowCount<=1)return;var n=states.length/rowCount;states=states.filter(function(_,i){return Math.floor(i/rowCount)!==selectedSection;});selectedSection=Math.min(selectedSection,n-2);$('wbN').value=n-1;draw();};
 $('wbAddRow').onclick=function(){setRowCount(rowCount+1);};
 $('wbRemoveRow').onclick=function(){setRowCount(rowCount-1);};
 $('wbReset').onclick=function(){states=states.map(function(){return 'empty';});draw();};
 $('wbApply').onclick=function(e){if(e){e.preventDefault();e.stopPropagation();}try{var rows=buildRows();if(!rows){alert('Не удалось сформировать деталировку. Проверьте размеры шкафа.');return;}accumulated=accumulated.concat(rows);cabinetSketches.push(snapshotCabinet());var detail={title:'Шкафы: '+cabinetSketches.length,items:accumulated,sketches:cabinetSketches};var delivered=false;window.dispatchEvent(new CustomEvent('crm:wardrobe-generated',{detail:detail}));delivered=true;close();if(!document.getElementById('cModal')||!document.getElementById('cModal').classList.contains('open')){if(typeof window.tab==='function')window.tab('calc');alert('Деталировка сформирована. Если форма просчёта не открылась, перейдите в раздел «Расчёты» и проверьте список деталей.');}}catch(err){console.error('Wardrobe transfer failed:',err);alert('Ошибка передачи деталировки: '+(err&&err.message?err.message:err));}};
 $('wbAddCabinet').onclick=function(){var next=buildRows();if(!next)return;accumulated=accumulated.concat(next);cabinetSketches.push(snapshotCabinet());cabinetNo++;states=[];selectedSection=0;draw();};
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
 rowCount=n;selectedRow=Math.min(selectedRow,n-1);states=next;$('wbRows').value=n;draw();
}
function draw(){
 var n=Math.max(1,Math.min(8,Math.round(states.length/rowCount)||val('wbN',1,8)));
 while(states.length<n*rowCount)states.push('empty');states=states.slice(0,n*rowCount);
 $('wbN').value=n;
 var html='<div class="wb-cabinet" style="--wb-cols:'+n+';--wb-rows:'+rowCount+'">';
 for(var s=0;s<n;s++){
  html+='<div class="wb-section"><button type="button" class="wb-section-head '+(s===selectedSection?'selected':'')+'" data-section="'+s+'">Секция '+(s+1)+'</button>';
  for(var r=0;r<rowCount;r++){var i=s*rowCount+r,k=states[i],label=k==='empty'?'Свободно':k==='shelves'?'Полки':'Ящики';html+='<button type="button" class="wb-cell '+((s===selectedSection||r===selectedRow)?'selected-cell':'')+'" data-cell="'+i+'" data-kind="'+k+'">'+label+'</button>';}
  html+='</div>';
 }
 $('wbDrawing').innerHTML=html+'</div>';
 $('wbRowSelectors').innerHTML='<b class="small">Выбор горизонтального уровня:</b>'+Array.from({length:rowCount},function(_,r){return '<button type="button" class="btn '+(r===selectedRow?'primary':'')+'" data-row-select="'+r+'">Горизонталь '+(r+1)+'</button>';}).join('');
 $('wbRowSelectors').querySelectorAll('[data-row-select]').forEach(function(b){b.onclick=function(){selectedRow=Number(b.dataset.rowSelect);draw();};});
 $('wbDrawing').querySelectorAll('[data-section]').forEach(function(b){b.onclick=function(){selectedSection=Number(b.dataset.section);draw();};});
 $('wbDrawing').querySelectorAll('[data-cell]').forEach(function(b){b.onclick=function(){var i=Number(b.dataset.cell);selectedSection=Math.floor(i/rowCount);selectedRow=i%rowCount;states[i]=({empty:'shelves',shelves:'drawers',drawers:'empty'})[states[i]];draw();};});
 $('wbSelectedLabel').textContent='Выбрана секция '+(selectedSection+1)+' из '+n;
 $('wbRemoveSection').disabled=n<=1;$('wbRemoveRow').disabled=rowCount<=1;$('wbRowsMinus').disabled=rowCount<=1;$('wbRowsPlus').disabled=rowCount>=8;$('wbRows').value=rowCount;
 var sh=states.filter(function(x){return x==='shelves';}).length,dr=states.filter(function(x){return x==='drawers';}).length;
 $('wbStats').innerHTML='<div class="wb-stat"><span>Вертикальные секции</span><b>'+n+'</b></div><div class="wb-stat"><span>Горизонтальные уровни</span><b>'+rowCount+'</b></div><div class="wb-stat"><span>Ячейки с полками</span><b>'+sh+'</b></div><div class="wb-stat"><span>Ячейки с ящиками</span><b>'+dr+'</b></div>';
}
function open(){ensure();rowCount=4;states=Array(3*rowCount).fill('empty');accumulated=[];cabinetSketches=[];cabinetNo=1;selectedSection=0;selectedRow=0;draw();$('wbModal').classList.add('open');}
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

function snapshotCabinet(){
 return {number:cabinetNo,width:val('wbW',300,6000),height:val('wbH',300,3000),depth:val('wbD',200,1200),sections:Math.max(1,Math.round(states.length/rowCount)),rows:rowCount,doors:val('wbDoors',0,8),doorMat:$('wbDoorMat').value,states:states.slice()};
}
function sketchSvg(item,small){
 var W=item.width,H=item.height,N=item.sections,R=item.rows,doorCount=item.doors;
 var x=105,y=24,w=230,h=220,cellW=w/N,cellH=h/R,parts='';
 parts+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="3" fill="#fff" stroke="#344256" stroke-width="5"/>';
 for(var s=1;s<N;s++)parts+='<line x1="'+(x+s*cellW)+'" y1="'+y+'" x2="'+(x+s*cellW)+'" y2="'+(y+h)+'" stroke="#64748b" stroke-width="4"/>';
 for(var s=0;s<N;s++)for(var r=0;r<R;r++){
  var k=item.states[s*R+r],cx=x+s*cellW+3,cy=y+r*cellH+3,cw=cellW-6,ch=cellH-6;
  if(k==='shelves')parts+='<rect x="'+cx+'" y="'+(cy+ch*.58)+'" width="'+cw+'" height="5" rx="2" fill="#3b82f6"/><rect x="'+cx+'" y="'+(cy+ch*.58+5)+'" width="'+cw+'" height="'+(ch*.3)+'" fill="#dbeafe"/>';
  else if(k==='drawers')parts+='<rect x="'+(cx+2)+'" y="'+(cy+ch*.22)+'" width="'+(cw-4)+'" height="'+(ch*.62)+'" rx="3" fill="#bbf7d0" stroke="#16a34a" stroke-width="2"/><line x1="'+(cx+cw*.35)+'" y1="'+(cy+ch*.4)+'" x2="'+(cx+cw*.65)+'" y2="'+(cy+ch*.4)+'" stroke="#15803d" stroke-width="3"/>';
  else parts+='<rect x="'+cx+'" y="'+cy+'" width="'+cw+'" height="'+ch+'" fill="#f8fafc"/>';
 }
 parts+='<rect x="'+(x-5)+'" y="'+(y-5)+'" width="'+(w+10)+'" height="'+(h+10)+'" rx="4" fill="none" stroke="#26364a" stroke-width="2"/>';
 if(doorCount>0){
  var doorW=(w/doorCount);
  for(var d=0;d<doorCount;d++){
   parts+='<rect x="'+(x+d*doorW+2)+'" y="'+(y+2)+'" width="'+(doorW-4)+'" height="'+(h-4)+'" rx="2" fill="'+(['#dbeafe','#e0e7ff','#d1fae5','#fef3c7'][d%4])+'" fill-opacity=".24" stroke="'+(['#60a5fa','#818cf8','#34d399','#f59e0b'][d%4])+'" stroke-width="1.4"/>';
   parts+='<line x1="'+(x+d*doorW+doorW*.82)+'" y1="'+(y+h*.45)+'" x2="'+(x+d*doorW+doorW*.82)+'" y2="'+(y+h*.58)+'" stroke="#64748b" stroke-width="2"/>';
  }
 }
 var font=small?9:12;
 return '<svg viewBox="0 0 440 290" role="img" aria-label="2D эскиз шкафа '+item.number+'" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="wbSketchBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eff6ff"/><stop offset="1" stop-color="#ecfdf5"/></linearGradient></defs><rect x="1" y="1" width="438" height="288" rx="12" fill="url(#wbSketchBg)"/>'+parts+'<text x="220" y="17" text-anchor="middle" font-size="'+font+'" fill="#334155" font-weight="700">'+item.width+' мм</text><text x="350" y="135" font-size="'+font+'" fill="#334155" transform="rotate(90 350 135)">'+item.height+' мм</text><text x="220" y="270" text-anchor="middle" font-size="'+font+'" fill="#475569">Шкаф '+item.number+' · глубина '+item.depth+' мм · '+item.sections+' секц. · '+item.doors+' дверей</text></svg>';
}
function renderSketch(){
 var current=snapshotCabinet();
 $('wbSketch').innerHTML='<div class="wb-sketch-canvas">'+sketchSvg(current,false)+'</div>';
 var all=cabinetSketches.concat([current]);
 $('wbSketchGallery').innerHTML=all.map(function(item,i){return '<div class="wb-sketch-thumb '+(i===all.length-1?'active':'')+'">'+sketchSvg(item,true)+'<b>Шкаф '+item.number+'</b><br>'+item.width+' × '+item.height+' мм</div>';}).join('');
}
function apply(){
 var rows=buildRows();if(!rows)return;
 accumulated=accumulated.concat(rows);
 cabinetSketches.push(snapshotCabinet());
 window.dispatchEvent(new CustomEvent('crm:wardrobe-generated',{detail:{title:'Шкафы: '+cabinetSketches.length,items:accumulated,sketches:cabinetSketches}}));
 close();
}
window.addEventListener('crm:open-wardrobe-builder',open);
})();