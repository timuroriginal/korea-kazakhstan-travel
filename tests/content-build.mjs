import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'kg-content-build-'));
const imports=[
  ['import-content.mjs','content-data.js','almaty-workbook.json'],
  ['import-astana.mjs','astana-data.js','astana-package.json'],
  ['import-aktau.mjs','aktau-data.js'],
  ['import-turkistan.mjs','turkistan-data.js']
];
const run=(name,args=[])=>execFileSync(process.execPath,[path.join(temporary,'scripts',name),...args],{cwd:os.tmpdir(),encoding:'utf8',stdio:['ignore','pipe','pipe']});
const readOutput=name=>fs.readFile(path.join(temporary,'assets',name),'utf8');
const check=(name)=>console.log('PASS '+name);
try {
  for(const directory of ['scripts','data','assets'])await fs.cp(path.join(root,directory),path.join(temporary,directory),{recursive:true});
  const expected=await Promise.all(imports.map(([,output])=>readOutput(output)));
  for(const [script] of imports)run(script);
  for(const [index,[script,output]] of imports.entries()){
    assert.equal(await readOutput(output),expected[index],`${script} changed reviewed output; update its source and regenerate before committing`);
    check(`${script} regenerates reviewed output using only tracked inputs`);
  }

  for(const [script,output,input] of imports.filter(entry=>entry[2])){
    run(script,[path.join(temporary,'data/research',input)]);
    assert.equal(await readOutput(output),expected[imports.findIndex(entry=>entry[0]===script)]);
  }
  check('Explicit research inputs preserve reviewed address, map and language overrides');

  const {guideContent}=await import(pathToFileURL(path.join(temporary,'assets/content-data.js')));
  const nikolsky=guideContent.almaty.places.find(p=>p.id==='almaty-nikolsky-cathedral');
  assert.equal(nikolsky.address,'Никольский собор, Алматы, улица Байтурсынова, 56');
  assert.ok(nikolsky.mapUrl.startsWith('https://www.google.com/maps/'));
  assert.equal(guideContent.almaty.places.some(p=>p.mapUrl?.includes('2gis.')),false);
  const {astanaContent}=await import(pathToFileURL(path.join(temporary,'assets/astana-data.js')));
  const food=astanaContent.practical.find(p=>p.id==='astana-practical-food');
  assert.match(food.copy.answer.ru,/перевод через камеру/);
  assert.match(food.copy.answer.ko,/카메라 번역/);
  assert.equal(food.copy.phrase,undefined);
  check('Known address, Google Maps and calm bilingual food guidance regressions stay fixed');

  const visitorFile=path.join(temporary,'data/almaty-visitor-info.json');
  const visitor=JSON.parse(await fs.readFile(visitorFile,'utf8'));
  visitor.placeOverrides['missing-place']={address:'Must not be silently ignored'};
  await fs.writeFile(visitorFile,JSON.stringify(visitor));
  assert.throws(()=>run('import-content.mjs'),/override references unknown place/);
  assert.equal(await readOutput('content-data.js'),expected[0]);
  check('Unknown reviewed place IDs fail without overwriting the previous generated file');

  const astanaFile=path.join(temporary,'data/astana-city.json');
  const astana=JSON.parse(await fs.readFile(astanaFile,'utf8'));
  astana.practicalOverrides['missing-topic']={copy:food.copy};
  await fs.writeFile(astanaFile,JSON.stringify(astana));
  assert.throws(()=>run('import-astana.mjs'),/override references unknown topic/);
  assert.equal(await readOutput('astana-data.js'),expected[1]);
  check('Unknown reviewed practical IDs fail without overwriting the previous generated file');
} finally {
  await fs.rm(temporary,{recursive:true,force:true});
}
