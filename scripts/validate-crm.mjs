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
if (estimates.includes('Работа на производстве (100% от материалов без фасадов)')) fail('Automatic production calculation remains in estimate UI or print');
else pass('Automatic production calculation is removed; detailed manual summary is allowed');

const wardrobeStudio = fs.readFileSync('crm-wardrobe-studio.js', 'utf8');
if (!wardrobeStudio.includes('previewImage:capturePreview()')) fail('Wardrobe constructor does not send a 3D preview to the estimate');
else pass('Wardrobe constructor sends a 3D preview to the estimate');
if (!estimates.includes('crm-estimate-preview:') || !estimates.includes('alt="3D-модель шкафа"')) fail('Estimate PDF/print does not include the saved wardrobe preview');
else pass('Estimate PDF/print includes the saved wardrobe preview');
if (!estimates.includes('width:145px;height:96px')) fail('Wardrobe preview is not kept compact at the top of the print document');
else pass('Wardrobe preview is compact at the top of the print document');

if (!estimates.includes('data-k="width_mm" type="number" min="0" step="1"') || !estimates.includes('data-k="height_mm" type="number" min="0" step="1"')) fail('Estimate dimensions do not use 1 mm arrow increments');
else pass('Estimate dimensions use 1 mm arrow increments');
if (!estimates.includes('data-ck="service_amount" type="number" min="0" step="100"') || !estimates.includes('data-ck="source_unit_price" type="number" min="0" step="100"') || !estimates.includes('id="cMaterialPrice" type="number" min="0" step="100"')) fail('Estimate ruble amounts do not use 100 ruble arrow increments');
else pass('Estimate ruble amounts use 100 ruble arrow increments');
if (!estimates.includes('data-ck="quantity" type="number" min="0" step="1"') || !estimates.includes('data-k="quantity" type="number" min="1" step="1"')) fail('Estimate quantities do not use 1-unit arrow increments');
else pass('Estimate quantities use 1-unit arrow increments');
if (!wardrobeStudio.includes('id="wbW" type="number" min="300" max="6000" step="1"') || !wardrobeStudio.includes('id="wbH" type="number" min="300" max="3000" step="1"') || !wardrobeStudio.includes('id="wbD" type="number" min="200" max="1200" step="1"')) fail('Wardrobe dimensions do not use 1 mm arrow increments');
else pass('Wardrobe dimensions use 1 mm arrow increments');
if (!wardrobeStudio.includes('id="wbN" type="number" min="1" max="8" step="1"') || !wardrobeStudio.includes('id="wbDoors" type="number" min="0" max="8" step="1"')) fail('Wardrobe section and door counts do not use 1-unit arrow increments');
else pass('Wardrobe section and door counts use 1-unit arrow increments');

if (!estimates.includes('id="cCatalogModal"') || !estimates.includes('id="cCatalogForm"')) fail('New catalog position popup is missing');
else pass('New catalog position popup is available');
if (!estimates.includes("from('furniture_estimate_catalog').insert(payload)")) fail('New catalog positions are not saved to the shared price catalog');
else pass('New catalog positions are saved to the shared price catalog');
if (!estimates.includes("openCatalogModal(el.dataset.addCategory)")) fail('Add-position buttons do not open the catalog popup');
else pass('Add-position buttons open the catalog popup');
if (!estimates.includes("costLines.push(line)")) fail('Newly created catalog position is not added to the current estimate');
else pass('Newly created catalog position is added to the current estimate');





if (estimates.includes("from('furniture_estimate_catalog').delete(")) fail('Estimate UI can delete existing shared price catalog entries');
else pass('Existing shared price catalog entries cannot be deleted from estimate UI');
if (!estimates.includes("costLines.splice(Number(el.dataset.cdel),1)")) fail('Removing a row from the estimate does not target only the current estimate');
else pass('Removing a row changes only the current estimate line list');
if (!estimates.includes('В общем прайсе она останется.')) fail('Current-estimate removal does not explain that the shared catalog item is retained');
else pass('Current-estimate removal explicitly preserves the shared catalog item');

if (!estimates.includes('function renderCatalogExistingList()')) fail('Existing price catalog positions are not displayed in the add-position popup');
else pass('Existing price catalog positions are displayed in the add-position popup');
if (!estimates.includes("data-catalog-add") || !estimates.includes("costLines.push({...blankCost(),category:p.category")) fail('Existing catalog positions cannot be added to the current estimate');
else pass('Existing catalog positions can be added to the current estimate');
if (!estimates.includes("update({is_active:false,updated_at:new Date().toISOString()})")) fail('Catalog deletion does not safely deactivate a price item');
else pass('Catalog deletion deactivates the item without deleting saved estimate snapshots');
if (estimates.includes("from('furniture_estimate_catalog').delete(")) fail('Catalog UI performs a destructive hard delete');
else pass('Catalog UI does not hard-delete price catalog rows');
if (!estimates.includes('legacyCatalogSeed=') || !estimates.includes('restoreLegacyCatalogIfNeeded')) fail('Legacy price list is not restored automatically from the original catalog seed');
else pass('Legacy price list can be restored automatically from the original catalog seed');
if (!estimates.includes("ignoreDuplicates:true")) fail('Legacy catalog restoration may overwrite existing supplier prices');
else pass('Legacy catalog restoration preserves existing prices and skips duplicates');

if (!estimates.includes('function calc(){') || !estimates.includes('ИТОГОВАЯ СТОИМОСТЬ')) fail('Detailed bottom estimate summary is missing');
else pass('Detailed bottom estimate summary is present');
if (!estimates.includes('СТОИМОСТЬ МАТЕРИАЛОВ') || !estimates.includes('СТОИМОСТЬ РАБОТ') || !estimates.includes('МАРЖА (80%)')) fail('Materials, manual works or 80% margin are missing from the summary');
else pass('Summary shows materials, manual works and 80% margin separately');
if (!estimates.includes('cManagerCommissionPercent') || !estimates.includes('crmManagerCommissionSettings') || !estimates.includes('managerCommissionEnabled?subtotal*managerCommissionPercent/100:0')) fail('Editable manager commission coefficient is missing or not applied to subtotal');
else pass('Manager commission coefficient is editable, persisted and calculated from subtotal');
if (!estimates.includes('totals.materials') || !estimates.includes('totals.service') || !estimates.includes('totals.margin') || !estimates.includes('totals.managerCommission') || !estimates.includes('totals.total')) fail('Printed estimate does not include the complete totals breakdown');
else pass('Printed estimate includes materials, works, margin, manager commission and grand total');
if (estimates.includes('Работа на производстве (100%') || estimates.includes('Маржа (80%)</span>')) fail('Automatic production calculation has been reintroduced into the estimate');
else pass('Automatic production calculation is not restored');

if (process.exitCode) process.exit(1);
console.log('CRM validation completed successfully.');
