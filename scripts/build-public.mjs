import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {guideContent} from '../assets/content-model.js';
import {retiredPlaceDestinations} from '../assets/visitor-policy.js';
import {publicContent} from './public-content.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'dist');
// A fixed output path prevents an accidental cleanup of source or research.
await fs.rm(out,{recursive:true,force:true});
await fs.mkdir(out,{recursive:true});
const generated=new Map([
  ['assets/content-model.js','// Compiled visitor content.\nexport const guideContent = '+JSON.stringify(publicContent(guideContent))+';\n'],
  ['assets/visitor-policy.js','// Compatibility redirects for retired public URLs.\nexport const retiredPlaceDestinations = '+JSON.stringify(retiredPlaceDestinations)+';\n']
]);
const copied=new Set();
async function copy(relative){
  relative=path.posix.normalize(relative);
  if(copied.has(relative))return;
  if(!/^(assets\/[^/]+\.(js|css|svg)|index\.html|guides\/almaty\/(index\.html|offer\/index\.html|sample\/index\.html))$/.test(relative))throw Error('Unexpected public dependency: '+relative);
  const text=generated.get(relative)??await fs.readFile(path.join(root,relative),'utf8');
  copied.add(relative);
  const target=path.join(out,relative);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,text);
  if(relative.endsWith('.js')){
    for(const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)){
      await copy(path.posix.join(path.posix.dirname(relative),match[1]));
    }
  }
}
for(const file of ['index.html','assets/app.js','assets/styles.css','assets/favicon.svg','guides/almaty/index.html','guides/almaty/offer/index.html','guides/almaty/sample/index.html'])await copy(file);
console.log(`Built ${copied.size} public files in dist. Research, tools and unpublished access are excluded.`);
