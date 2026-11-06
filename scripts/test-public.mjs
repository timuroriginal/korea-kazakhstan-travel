// Run the release suites against the actual dist, sequentially, on a free port.
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {publicServer} from './serve-public.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'test-results','release');
await fs.mkdir(out,{recursive:true});
const server=publicServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
const base=`http://127.0.0.1:${server.address().port}`;
const env={...process.env,GUIDE_PREVIEW_URL:base,GUIDE_TEST_BASE:base,KG_SITE_URL:base,GUIDE_BROWSER_CHANNEL:'chrome',KG_PRODUCT_OUTPUT:path.join(out,'product'),GUIDE_GEOGRAPHY_OUTPUT:path.join(out,'geography')};
const suites=['browser','product','offer','almaty-days','almaty-geography','editorial-policy','audit-ui'];
const results=[];
try{
 for(const name of suites){
  const log=await fs.open(path.join(out,name+'.log'),'w');
  const exitCode=await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,['tests/'+name+'.mjs'],{cwd:root,env,stdio:['ignore','pipe','pipe']});
   child.stdout.on('data',v=>log.write(v));child.stderr.on('data',v=>log.write(v));child.on('error',reject);child.on('exit',resolve);
  });
  await log.close();results.push({suite:name,exitCode});console.log(`${exitCode===0?'PASS':'FAIL'} ${name}`);
  if(exitCode!==0){console.error(await fs.readFile(path.join(out,name+'.log'),'utf8'));process.exitCode=1;break;}
 }
 for(const file of ['/data/turkistan-city.json','/scripts/build-public.mjs','/tests/product.mjs','/README.md','/assets/turkistan-data.js','/guides/almaty/access/']){
  const response=await fetch(base+file);if(response.status!==404)throw Error('Private path served: '+file);
 }
 await fs.writeFile(path.join(out,'validation.json'),JSON.stringify({checkedAt:new Date().toISOString(),artifact:'dist',results},null,2));
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
