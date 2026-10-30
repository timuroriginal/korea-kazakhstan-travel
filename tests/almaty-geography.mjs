import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.GUIDE_PLAYWRIGHT_PATH||'playwright');
const base=process.env.GUIDE_PREVIEW_URL||'http://127.0.0.1:4323';
const out=process.env.GUIDE_GEOGRAPHY_OUTPUT||'../outputs/almaty-route-audit/geography-tests';
await fs.mkdir(out,{recursive:true});
const cathedral='Вознесенский кафедральный собор, улица Гоголя 40В, Алматы',market='Зелёный базар, улица Жибек Жолы 53, Алматы',arbat='Zhibek Zholy St & Kunaev St, Almaty';
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[],errors=[];
const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS',name)};
const walking=(href,from,to)=>{const u=new URL(href);assert.equal(u.hostname,'www.google.com');assert.equal(u.searchParams.get('travelmode'),'walking');assert.equal(u.searchParams.get('origin'),from);assert.equal(u.searchParams.get('destination'),to)};
try{
 for(const lang of ['ru','ko']){
  const context=await browser.newContext({viewport:{width:1280,height:950}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/guides/almaty/?lang='+lang);
  await page.locator('.tabs [data-stage="day1"]').click();
  const full=[];
  await check(lang+': full guide links follow cathedral, market, Arbat and bypass market on Monday',async()=>{
   await page.locator('[data-monday]').uncheck();
   full.push(...await page.locator('[data-day-stop] a[href*="travelmode=walking"]').evaluateAll(els=>els.map(e=>e.href)));
   assert.equal(full.length,2);walking(full[0],cathedral,market);walking(full[1],market,arbat);
   assert.equal(await page.locator('[data-day-stop="almaty-arbat"] a[href*="travelmode=walking"]').count(),0);
   await page.locator('[data-monday]').check();
   assert.equal(await page.locator('[data-day-stop] a[href*="travelmode=walking"]').count(),1);walking(await page.locator('[data-day-stop] a[href*="travelmode=walking"]').getAttribute('href'),cathedral,arbat);
   assert.equal(await page.locator('[data-day-stop="almaty-green-bazaar"]').count(),0);
  });
  await page.goto(base+'/guides/almaty/sample/?lang='+lang);
  await check(lang+': free sample has the same normal and Monday walking endpoints',async()=>{
   assert.deepEqual(await page.locator('[data-walk-link]').evaluateAll(els=>els.map(e=>e.href)),full);
   await page.locator('[data-monday]').check();walking(await page.locator('[data-walk-link]').getAttribute('href'),cathedral,arbat);
   await page.locator('[data-monday]').uncheck();await page.locator('details').evaluateAll(els=>els.forEach(e=>e.open=true));
   await page.screenshot({path:out+'/sample-'+lang+'.png',fullPage:true});
  });
  await page.evaluate(l=>localStorage.setItem('kazakhstan-guide-v1',JSON.stringify({lang:l,saved:[]})),lang);
  await page.goto(base+'/#/routes/almaty');await page.locator('[data-route-map]').first().waitFor({state:'attached',timeout:15000});
  await check(lang+': public route keeps all walking links and the exact lower Medeu station',async()=>{
   const links=await page.locator('[data-route-map]').evaluateAll(els=>els.map(e=>e.href));
   for(const href of full)assert.ok(links.includes(href));
   assert.ok(links.some(href=>new URL(href).searchParams.get('origin')===cathedral&&new URL(href).searchParams.get('destination')===arbat));
   assert.ok(links.some(href=>new URL(href).searchParams.get('query_place_id')==='ChIJ9d5CvAZ7gzgRnZNJtysSGws'));
  });
  await page.goto(base+'/guides/almaty/?lang='+lang);
  await check(lang+': mountain day starts at the same lower station',async()=>{
   await page.locator('.tabs [data-stage="trip"]').click();
   const href=await page.locator('[data-trip-day="2"] a[href*="query_place_id"]').getAttribute('href');
   const u=new URL(href);assert.equal(u.searchParams.get('query'),'43.1628867,77.051639');assert.equal(u.searchParams.get('query_place_id'),'ChIJ9d5CvAZ7gzgRnZNJtysSGws');
  });
  await context.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/validation.json',JSON.stringify({checkedAt:new Date().toISOString(),base,checks,errors},null,2));console.log('Passed '+checks.length+' geography regression checks.');
}finally{await browser.close()}
