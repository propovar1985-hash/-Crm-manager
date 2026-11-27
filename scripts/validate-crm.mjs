import fs from 'node:fs';
import path from 'node:path';

const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`OK: ${message}`);

const html = fs.readFileSync('index.html', 'utf8');
const scriptTags = [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)];
for (const [, src] of scriptTags) {
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//') || src.startsWith('data:')) continue;
  const clean = src.split('?')[0].split('#')[0];
  const target = path.resolve(clean);
  if (!fs.existsSync(target)) fail(`index.html references missing local script: ${src}`);
}
if (!process.exitCode) pass('All local script references exist');

const studio = fs.readFileSync('crm-wardrobe-studio.js', 'utf8');
const estimates = fs.readFileSync('crm-estimates.js', 'utf8');

const open = studio.match(/function open\(\)\{([\s\S]*?)\n?\s*\}/);
if (!open) fail('Wardrobe constructor open() function not found');
else {
  if (!open[1].includes("$('wbW').value=600")) fail('Wardrobe opening width must default to 600 mm');
  else pass('Wardrobe opening width defaults to 600 mm');
  if (!open[1].includes("$('wbH').value=2400")) fail('Wardrobe opening height must default to 2400 mm');
  else pass('Wardrobe opening height defaults to 2400 mm');
  if (!open[1].includes("$('wbD').value=600")) fail('Wardrobe opening depth must default to 600 mm');
  else pass('Wardrobe opening depth defaults to 600 mm');
  if (open[1].includes("$('wbW').value=2400")) fail('Conflicting 2400 mm opening width reset remains');
}

if (!studio.includes('materials.door=new THREE.MeshStandardMaterial({color:0x8b929b')) fail('Expected gray facade material not found');
else pass('Gray facade material configured');
if (!studio.includes("materials.body=new THREE.MeshStandardMaterial({map:bodyTexture")) fail('H1715 wood texture is not assigned to cabinet body');
else pass('H1715 wood texture is assigned to cabinet body');
if (!studio.includes("new THREE.TextureLoader().load('assets/H1715-wood.svg")) fail('H1715 wood texture asset is not loaded');
else pass('H1715 wood texture asset is loaded');
if (!studio.includes('value="partial">Частично по высоте</option>')) fail('Partial-height facade mode is missing');
else pass('Partial-height facade mode is available');
if (!studio.includes('doorBottom:doorBottom')) fail('Partial facade vertical position is not saved');
else pass('Partial facade vertical position is saved');
if (!fs.existsSync('assets/H1715-wood.svg')) fail('H1715 wood texture asset is missing');
else pass('H1715 wood texture asset exists');

if (!estimates.includes("$('cPrint').onclick=printEstimate")) fail('Estimate print button handler is missing');
else pass('Estimate print button is connected');
if (!estimates.includes('Подробный расчёт фасадов')) fail('Facade detail report is missing');
else pass('Facade detail report is present');
if (!estimates.includes('Не помещается в лист')) fail('Oversized panel warning is missing');
else pass('Oversized panel warning is present');

if (!estimates.includes('const prune=free') || !estimates.includes('sheet.free.forEach')) fail('Dense global sheet-fit search is missing');
else pass('Dense global sheet-fit search is enabled');
if (!estimates.includes("'Фурнитура'") || !estimates.includes('excelHardware')) fail('Hardware catalog fallback is missing');
else pass('Hardware catalog fallback is available');
if (!estimates.includes("'Работы и доставка'")) fail('Service and section 9 category is missing');
else pass('Service and section 9 category is available');

if (estimates.includes('Расчёт по разделу 9 — РАБОТА')) fail('Removed automatic section 9 calculation block is still present');
else pass('Automatic section 9 calculation block is removed');
if (estimates.includes("['СТОИМОСТЬ РАБОТЫ НА ПРОИЗВОДСТВЕ (100% ОТ МАТЕРИАЛОВ БЕЗ ФАСАДОВ)'")) fail('Automatic production work row is still added to section 9');
else pass('Automatic production work row is not added to section 9');
if (!estimates.includes("costLines=costLines.filter(x=>!String(x.item_name||'').trim().toLocaleUpperCase('ru').startsWith('СТОИМОСТЬ РАБОТЫ НА ПРОИЗВОДСТВЕ'))")) fail('Legacy automatic production row is not removed regardless of category or letter case');
else pass('Legacy automatic production row is removed from every category, case-insensitively');
if (!estimates.includes('data-ck="service_amount"')) fail('Manual amount input for section 9 is missing');
else pass('Section 9 has an editable amount field');
if (!estimates.includes("x.category==='Работы и доставка'?1")) fail('Manual section 9 amounts are not normalized for saving');
else pass('Section 9 saves manual sums without quantity multiplication');
if (!estimates.includes("cat==='Работы и доставка'?")) fail('Section 9 print rows do not use manual sums');
else pass('Section 9 print output uses manual sums');

if (!estimates.includes("costCategories.map((category,ci)=>")) fail('Estimate category sections are not rendered');
else pass('All estimate category sections are rendered');
if (!estimates.includes("if(costLinesLoadError){alert('Сохранение остановлено")) fail('Saving is not protected when saved estimate lines fail to load');
else pass('Saving is protected when saved estimate lines fail to load');
if (!estimates.includes("host.innerHTML=(costLinesLoadError?")) fail('Estimate line-load warning is missing');
else pass('Estimate line-load warning is available');
if (estimates.includes('Работа на производстве (100% от материалов без фасадов)')) fail('Automatic production calculation card is still present');
else pass('Automatic production calculation card is removed');
if (estimates.includes('crmManagerCommissionSettings') || estimates.includes('ИТОГО К ОПЛАТЕ')) fail('Automatic margin/commission/total calculation remains in estimate UI or print');
else pass('Automatic margin, commission and total calculation is removed from estimate UI and print');

const wardrobeStudio = fs.readFileSync('crm-wardrobe-studio.js', 'utf8');
if (!wardrobeStudio.includes('previewImage:capturePreview()')) fail('Wardrobe constructor does not send a 3D preview to the estimate');
else pass('Wardrobe constructor sends a 3D preview to the estimate');
if (!estimates.includes('crm-estimate-preview:') || !estimates.includes('alt="3D-модель шкафа"')) fail('Estimate PDF/print does not include the saved wardrobe preview');
else pass('Estimate PDF/print includes the saved wardrobe preview');
if (!estimates.includes('width:145px;height:96px')) fail('Wardrobe preview is not kept compact at the top of the print document');
else pass('Wardrobe preview is compact at the top of the print document');

if (!estimates.includes('data-k="width_mm" type="number" min="0" step="10"') || !estimates.includes('data-k="height_mm" type="number" min="0" step="10"')) fail('Estimate dimensions do not use 10 mm arrow increments');
else pass('Estimate dimensions use 10 mm arrow increments');
if (!estimates.includes('data-ck="service_amount" type="number" min="0" step="10"') || !estimates.includes('data-ck="source_unit_price" type="number" min="0" step="10"')) fail('Estimate ruble amounts do not use 10 ruble arrow increments');
else pass('Estimate ruble amounts use 10 ruble arrow increments');
if (!estimates.includes('data-ck="quantity" type="number" min="0" step="1"') || !estimates.includes('data-k="quantity" type="number" min="1" step="1"')) fail('Estimate quantities do not use 1-unit arrow increments');
else pass('Estimate quantities use 1-unit arrow increments');
if (!wardrobeStudio.includes('id="wbW" type="number" min="300" max="6000" step="10"') || !wardrobeStudio.includes('id="wbH" type="number" min="300" max="3000" step="10"') || !wardrobeStudio.includes('id="wbD" type="number" min="200" max="1200" step="10"')) fail('Wardrobe dimensions do not use 10 mm arrow increments');
else pass('Wardrobe dimensions use 10 mm arrow increments');
if (!wardrobeStudio.includes('id="wbN" type="number" min="1" max="8" step="1"') || !wardrobeStudio.includes('id="wbDoors" type="number" min="0" max="8" step="1"')) fail('Wardrobe section and door counts do not use 1-unit arrow increments');
else pass('Wardrobe section and door counts use 1-unit arrow increments');




if (process.exitCode) process.exit(1);
console.log('CRM validation completed successfully.');
