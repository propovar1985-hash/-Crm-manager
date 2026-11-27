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

const wardrobeImport = estimates.match(/window\.addEventListener\('crm:wardrobe-generated',[\s\S]*?\n function init\(/)?.[0] || '';
if (!wardrobeImport.includes('drawItems();drawCosts();')) fail('Wardrobe import does not refresh estimate cost sections and hardware selector');
else pass('Wardrobe import refreshes hardware selector and all cost sections');

if (!estimates.includes("if(isService)return '<tr><td><b>'+esc(x.item_name)+'</b></td><td>'+money(amount)+'</td></tr>'")) fail('Section 9 must show only work name and total');
else pass('Section 9 shows only work name and total');
if (estimates.includes('Расчёт по разделу 9 — РАБОТА')) fail('Section 9 automatic calculation block must be removed');
else pass('Section 9 automatic calculation block is removed');

if (process.exitCode) process.exit(1);
console.log('CRM validation completed successfully.');
