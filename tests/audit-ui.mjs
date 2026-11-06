import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.GUIDE_PLAYWRIGHT_PATH||'playwright');
const base=process.env.GUIDE_PREVIEW_URL||'http://127.0.0.1:4323';
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'kg-audit-ui-'));
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
const context=await browser.newContext({viewport:{width:1280,height:950},acceptDownloads:true,reducedMotion:'reduce'});
context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
const page=await context.newPage();
let checks=0;
const check=async(name,run)=>{await run();checks++;console.log('PASS '+name)};
const goto=async route=>{await page.goto(base+'/'+route);await page.locator('#content h1').waitFor()};
const exportFile=async(name)=>{const ready=page.waitForEvent('download');await page.locator('[data-download]').click();const file=path.join(temp,name);await (await ready).saveAs(file);return file;};
try{
 await check('Map swap survives the active mode button and a round trip through Korea mode',async()=>{
  await goto('#/routes');
  await page.locator('#flight-origin').selectOption('astana');
  await page.locator('[data-map-choice="almaty"]').click();
  await page.locator('#flight-swap').click();
  const pair=()=>page.locator('.route-explorer').evaluate(n=>[n.dataset.flightOrigin,n.dataset.flightDestination]);
  assert.deepEqual(await pair(),['almaty','astana']);
  await page.locator('[data-flight-mode="domestic"]').click();
  assert.deepEqual(await pair(),['almaty','astana']);
  await page.locator('[data-flight-mode="korea"]').click();
  await page.locator('[data-flight-mode="domestic"]').click();
  assert.deepEqual(await pair(),['almaty','astana']);
  await page.locator('[data-flight-mode="korea"]').click();
  await page.locator('[data-map-choice="burabay"]').click();
  assert.deepEqual(await pair(),['incheon','burabay']);
  await page.locator('[data-flight-mode="korea"]').click();
  assert.deepEqual(await pair(),['incheon','burabay']);
 });
 await check('Every destination offers transferable section links in both languages',async()=>{
  for(const lang of ['ru','ko'])for(const destination of ['almaty','astana','aktau','ust-kamenogorsk','burabay','turkistan']){
   await goto('#/destinations/'+destination);
   if(await page.locator('html').getAttribute('lang')!==lang)await page.locator('[data-language]').click();
   const links=await page.locator('[data-scroll]').evaluateAll(nodes=>nodes.map(n=>({url:n.href,section:n.dataset.scroll})));
   assert.ok(links.length>6);
   for(const link of links){assert.equal(new URL(link.url).hash,`#/destinations/${destination}?section=${link.section}`)}
   for(const id of ['places','transport','stay']){
    await page.goto(links.find(link=>link.section===id).url);
    await page.locator('#'+id).waitFor();
    const box=await page.locator('#'+id).boundingBox();assert.ok(box.y>=-1&&box.y<180,`${destination} ${lang} ${id}: ${box.y}`);
    assert.doesNotMatch(await page.locator('h1').innerText(),/не найдена|찾을 수/);
   }
  }
 });
 await check('Section clicks preserve the route, focus the section, and survive history navigation',async()=>{
  await goto('#/destinations/almaty');
  await page.locator('.local-nav [data-scroll="places"]').click();
  assert.equal(new URL(page.url()).hash,'#/destinations/almaty?section=places');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'places');
  await page.locator('.sidebar-sections [data-scroll="stay"]').click();
  assert.equal(new URL(page.url()).hash,'#/destinations/almaty?section=stay');
  await page.goBack();
  await page.waitForFunction(()=>document.activeElement.id==='places');
 });
 await check('Keyboard language change retains focus in the public guide and product',async()=>{
  await goto('#/destinations/almaty');
  await page.locator('[data-language]').focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-language')),true);
  await page.goto(base+'/guides/almaty/?lang=ru');await page.locator('[data-language]').focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-language')),true);
 });
 await check('Offline snapshot keeps later edits after reload and reopening without changing the online guide',async()=>{
  await page.goto(base+'/guides/almaty/?lang=ru');
  await page.locator('.tabs [data-stage="trip"]').click();
  await page.locator('[data-choice="tripMode"][data-value="lakes"]').first().click();
  const onlineBefore=await page.evaluate(()=>localStorage.getItem('kg-product-pilot-v1'));
  const firstFile=await exportFile('first.html'),secondFile=await exportFile('second.html');
  assert.equal(await page.locator('html').getAttribute('data-settings'),null);
  const offline=await context.newPage(),requests=[];
  offline.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
  await offline.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
  await offline.goto(pathToFileURL(firstFile).href);
  const firstId=await offline.locator('html').getAttribute('data-export-id');assert.ok(firstId);
  assert.equal(await offline.locator('[data-choice="tripMode"][data-value="lakes"]').first().getAttribute('aria-pressed'),'true');
  await offline.locator('[data-choice="tripMode"][data-value="local"]').first().click();
  await offline.locator('[data-first-date]').fill('2026-12-15');await offline.locator('[data-first-date]').press('Tab');
  await offline.locator('.budget summary').click();await offline.locator('[data-expense="lodging"]').fill('123456');
  await offline.locator('.tabs [data-stage="prepare"]').click();await offline.locator('[data-check="1"]').check();
  await offline.locator('[data-language]').click();
  await offline.reload();
  assert.equal(await offline.locator('html').getAttribute('lang'),'ko');
  assert.equal(await offline.locator('[data-check="1"]').isChecked(),true);
  await offline.locator('.tabs [data-stage="trip"]').click();
  assert.equal(await offline.locator('[data-first-date]').inputValue(),'2026-12-15');
  assert.equal(await offline.locator('[data-choice="tripMode"][data-value="local"]').first().getAttribute('aria-pressed'),'true');
  await offline.locator('.budget summary').click();assert.equal(await offline.locator('[data-expense="lodging"]').inputValue(),'123456');
  await offline.goto('about:blank');await offline.goto(pathToFileURL(firstFile).href);
  await offline.locator('.budget summary').click();assert.equal(await offline.locator('[data-expense="lodging"]').inputValue(),'123456');
  await offline.goto(pathToFileURL(secondFile).href);
  assert.notEqual(await offline.locator('html').getAttribute('data-export-id'),firstId);
  assert.equal(await offline.locator('[data-choice="tripMode"][data-value="lakes"]').first().getAttribute('aria-pressed'),'true');
  assert.equal(await offline.locator('[data-first-date]').inputValue(),'');
  assert.equal(await page.evaluate(()=>localStorage.getItem('kg-product-pilot-v1')),onlineBefore);
  assert.deepEqual(requests,[]);await offline.close();
 });
 await check('Updated views remain within a mobile viewport',async()=>{
  await page.setViewportSize({width:390,height:844});
  for(const route of ['#/routes','#/destinations/almaty?section=places']){
   await goto(route);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
 });
 assert.deepEqual(errors,[]);
 console.log(`PASS ${checks} audit regressions, no JavaScript errors`);
}finally{await browser.close();await fs.rm(temp,{recursive:true,force:true});}
