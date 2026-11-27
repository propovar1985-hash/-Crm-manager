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
if (!fs.existsSync('assets/H1715-wood.svg')) fail('H1715 wood texture asset is missing');
else pass('H1715 wood texture asset exists');

if (!estimates.includes("$('cPrint').onclick=printEstimate")) fail('Estimate print button handler is missing');
else pass('Estimate print button is connected');
if (!estimates.includes('Подробный расчёт фасадов')) fail('Facade detail report is missing');
else pass('Facade detail report is present');
if (!estimates.includes('Не помещается в лист')) fail('Oversized panel warning is missing');
else pass('Oversized panel warning is present');

if (process.exitCode) process.exit(1);
console.log('CRM validation completed successfully.');
