import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.GUIDE_PLAYWRIGHT_PATH||'playwright');
const base=process.env.GUIDE_PREVIEW_URL||'http://127.0.0.1:4323';
const out=path.resolve('../outputs/almaty-navigation-completion/day-tests');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[],errors=[];
const check=async(name,run)=>{await run();checks.push(name);console.log('PASS '+name)};
try{
 for(const lang of ['ru','ko']){
  const context=await browser.newContext({viewport:{width:1280,height:950},acceptDownloads:true}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  const overview=()=>page.locator('.tabs [data-stage="trip"]').click();
  const day=n=>page.locator(`.day-navigation [data-day="${n}"]`).click();
  await page.goto(base+'/guides/almaty/?lang='+lang);
  await check(lang+': every overview day opens its own visit and the next button continues in sequence',async()=>{
   for(let n=1;n<=5;n++){
    await overview();await page.locator(`[data-trip-day="${n}"] [data-day="${n}"]`).click();
    assert.equal(await page.locator(`.day-navigation [data-day="${n}"]`).getAttribute('aria-current'),'step');
    if(n===1)assert.equal(await page.locator('[data-day-stop]').count(),3);
    else{assert.equal(await page.locator(`[data-day-detail="${n}"]`).count(),1);assert.ok(await page.locator('[data-navigation-step]').count()>=3);assert.ok((await page.locator('[data-navigation-return]').innerText()).length>50);}
    if(n<5){await page.locator(`.next [data-day="${n+1}"]`).click();assert.equal(await page.locator(`.day-navigation [data-day="${n+1}"]`).getAttribute('aria-current'),'step');}
    else{await page.locator('.next [data-stage="departure"]').click();assert.equal(await page.locator('#title-departure').count(),1);}
   }
  });
  await check(lang+': lower Kok Tobe station is distinct from upper park and survives reload',async()=>{
   await page.locator('.tabs [data-stage="day1"]').click();await day(5);
   const urls=await page.locator('[data-navigation-map]').evaluateAll(es=>es.map(e=>e.href));
   assert.ok(urls.some(u=>new URL(u).searchParams.get('query_place_id')==='ChIJ7SGejflugzgRkQrZ4EIbGGM'));
   assert.ok(urls.some(u=>new URL(u).searchParams.get('query_place_id')==='ChIJrQDxfa1vgzgRFEHqXr-1W9k'));
   await page.reload();assert.equal(await page.locator('[data-day-detail="5"]').count(),1);
  });
  await check(lang+': mountain swap moves the full navigation and museum fallback follows its new date',async()=>{
   await overview();await page.locator('[data-first-date]').fill('2026-12-19');await page.locator('[data-first-date]').press('Tab');
   await page.locator('[data-choice="mountainOrder"][data-value="third"]').click();
   await page.locator('[data-trip-day="2"] [data-day="2"]').click();assert.equal(await page.locator('[data-mountain-notice]').count(),0);assert.equal(await page.locator('.culture-choice').count(),1);
   await page.locator('[data-choice="culture"][data-value="museum"]').click();assert.match(await page.locator('[data-visit-navigation]').innerText(),/Мусрепова|무스레포프/);
   await day(3);assert.equal(await page.locator('[data-mountain-notice]').count(),1);assert.equal(await page.locator('[data-navigation-step]').count(),6);assert.match(await page.locator('[data-visit-navigation]').innerText(),/Комби-2|콤비 2/);
   await overview();await page.locator('[data-choice="mountainOrder"][data-value="second"]').click();await page.locator('[data-trip-day="3"] [data-day="3"]').click();
   assert.equal(await page.locator('[data-choice="culture"][data-value="museum"]').isDisabled(),true);assert.match(await page.locator('[data-visit-navigation]').innerText(),/Dostyk Plaza|도스틱/);
  });
  await check(lang+': Charyn and separate lake days preserve their own return chain and Google location labels',async()=>{
   for(const [mode,n,expected]of [['city',4,/визит-центр|방문자 센터/i],['lakes',4,/Саты|사티/],['lakes',5,/Каинды|카인디/]]){
    await overview();await page.locator(`[data-choice="tripMode"][data-value="${mode}"]`).first().click();await page.locator(`[data-trip-day="${n}"] [data-day="${n}"]`).click();
    const body=await page.locator('[data-visit-navigation]').innerText();assert.match(body,expected);assert.equal(await page.locator('[data-navigation-step]').count(),4);
    const urls=await page.locator('[data-navigation-map]').evaluateAll(es=>es.map(e=>e.href));assert.ok(urls.length);for(const u of urls){assert.equal(new URL(u).hostname,'www.google.com');assert.equal(new URL(u).searchParams.has('travelmode'),false);}
    if(n===5)assert.match(await page.locator('[data-navigation-return]').innerText(),/Алматы|알마티/);
   }
  });
  await check(lang+': all detailed days fit narrow screens and printable output contains all five days',async()=>{
   for(const mode of ['local','city','lakes']){
    await overview();await page.locator(`[data-choice="tripMode"][data-value="${mode}"]`).first().click();await page.locator('[data-trip-day="1"] [data-day="1"]').click();
    for(const width of [320,390,1280]){await page.setViewportSize({width,height:950});for(let n=1;n<=5;n++){await day(n);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.doesNotMatch(await page.locator('.panel').innerText(),/undefined|\[object Object\]/);}}
   }
   await page.evaluate(()=>window.print=()=>{window.dayPrint={first:document.querySelectorAll('[data-day-stop]').length,days:[...document.querySelectorAll('[data-day-detail]')].map(n=>n.dataset.dayDetail),steps:document.querySelectorAll('[data-navigation-step]').length}});
   await page.locator('[data-print]').click();const printed=await page.evaluate(()=>window.dayPrint);assert.ok(printed.first>=2);assert.deepEqual(printed.days,['2','3','4','5']);assert.ok(printed.steps>=16);
   await page.locator('.panel').screenshot({path:out+'/lake-day-'+lang+'.png'});
  });
  await check(lang+': downloaded day selection works without network and retains route variant',async()=>{
   const pending=page.waitForEvent('download');await page.locator('[data-download]').click();const file=path.join(out,'offline-'+lang+'.html');await(await pending).saveAs(file);
   const offline=await context.newPage(),requests=[];offline.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});await context.setOffline(true);await offline.goto('file://'+file);
   assert.equal(await offline.locator('[data-day-detail="5"]').count(),1);assert.match(await offline.locator('[data-visit-navigation]').innerText(),/Каинды|카인디/);
   await offline.locator('.day-navigation [data-day="4"]').click();assert.match(await offline.locator('[data-visit-navigation]').innerText(),/Кольсай|콜사이/);assert.deepEqual(requests,[]);
   await context.setOffline(false);await offline.close();
  });
  await check(lang+': public routes and place pages expose the same navigation without broken imports',async()=>{
   await page.evaluate(l=>localStorage.setItem('kazakhstan-guide-v1',JSON.stringify({lang:l,saved:[]})),lang);
   await page.goto(base+'/#/routes/almaty');await page.locator('#content h1').waitFor();assert.equal(await page.locator('[data-route-navigation]').count(),4);
   for(const id of ['kok-tobe','almaty-shymbulak','almaty-kasteev-museum','almaty-dostyk-plaza','almaty-esentai-mall','almaty-charyn','almaty-kolsai','almaty-kaindy']){
    await page.goto(base+'/#/places/'+id);await page.locator('#content h1').waitFor();assert.equal(await page.locator('[data-visit-navigation]').count(),1,id);assert.ok(await page.locator('[data-navigation-map]').count()>0,id);
   }
  });
  await context.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/validation.json',JSON.stringify({checkedAt:new Date().toISOString(),base,checks,errors},null,2));
 console.log('Passed '+checks.length+' day-navigation checks.');
}finally{await browser.close()}
