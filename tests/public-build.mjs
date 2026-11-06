import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {guideContent as source} from '../assets/content-model.js';
import {guideContent as published} from '../dist/assets/content-model.js';
import {publicContent} from '../scripts/public-content.mjs';
const dist=new URL('../dist/',import.meta.url);
const files=(await fs.readdir(dist,{recursive:true,withFileTypes:true})).filter(d=>d.isFile()).map(d=>path.relative(fileURLToPath(dist),path.join(d.parentPath,d.name)));
assert.deepEqual(published,publicContent(source));
assert.equal(Object.values(published).flatMap(d=>d.places).length,102);
for(const file of files){
 assert.match(file,/^(assets\/[^/]+\.(js|css|svg)|index\.html|guides\/almaty\/(index\.html|offer\/index\.html|sample\/index\.html))$/);
 assert.doesNotMatch(file,/(?:^|\/)(?:data|scripts|tests|api|access|research)\//);
 assert.doesNotMatch(file,/(?:content-data|astana-data|aktau-data|burabay-data|oskemen-data|turkistan-data|visitor-updates)\.js$/);
 if(file.endsWith('.js')&&file!=='assets/app.js')await import(new URL(file,dist));
}
// app.js requires a DOM; check dependencies separately below instead of importing it.
function inspect(value){
 if(!value||typeof value!=='object')return;
 for(const [key,item] of Object.entries(value)){
  assert.ok(!['sources','source','research','researchId','supports','gaps','publicationPolicy','languageReview','sourceLabelsKo'].includes(key),'Internal field leaked: '+key);
  inspect(item);
 }
}
inspect(published);
const product=await fs.readFile(new URL('guides/almaty/index.html',dist),'utf8');
inspect(JSON.parse(product.match(/<script type="application\/json" id="product-data">([\s\S]*?)<\/script>/)[1]));
const places=Object.values(published).flatMap(d=>d.places);
assert.equal(places.some(p=>p.decision==='reserve'),false);
assert.deepEqual(places.filter(p=>p.category==='food').map(p=>p.id),['astana-daididau']);
console.log(`PASS public artifact: ${files.length} allowlisted files, 102 visitor places, no research or unpublished access`);
