import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.GUIDE_PLAYWRIGHT_PATH||'playwright');
const base=process.env.GUIDE_TEST_BASE||'http://127.0.0.1:4323',out='../outputs/product-packaging';
await mkdir(out,{recursive:true});
const checks=[],errors=[],browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const lang of ['ru','ko'])for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:950}}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  const check=async(name,fn)=>{await fn();checks.push(`${lang}/${width}/${name}`);};
  await context.route('**/api/guide-access?*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'service_not_configured'})}));
  try{
   await page.goto(`${base}/guides/almaty/offer/?lang=${lang}`);
   await check('offer shows agreed price, no fake checkout or unavailable-login links',async()=>{
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    assert.match(await page.locator('.purchase').innerText(),/\$8/);
    assert.equal(await page.locator('input,a[href*="access/"],a[href="../?lang='+lang+'"]').count(),0);
    assert.equal(await page.locator('[data-sample-link]').count(),2);
    assert.equal(await page.locator('.days li').count(),7);
   });
   await page.locator('aside [data-step="1"]').click();
   await check('purchase scope lists inclusions, activation and separate expenses',async()=>{
    assert.equal(await page.locator('[data-payment-unavailable]').isDisabled(),true);
    assert.equal(await page.locator('[data-contents] li').count(),5);
    assert.match(await page.locator('[data-activation]').innerText(),/40/);
    assert.equal(await page.locator('input').count(),0);
    assert.equal(await page.locator('#main').evaluate(e=>e===document.activeElement),true);
   });
   await page.locator('.form [data-step="2"]').click();
   await check('receipt describes real access without pretending an account or purchase exists',async()=>{
    assert.equal(await page.locator('.form .card').count(),4);
    assert.equal(await page.locator('a[href*="action="],input').count(),0);
    await page.locator('[data-lang]').click();await page.reload();
    assert.equal(await page.locator('html').getAttribute('lang'),lang==='ru'?'ko':'ru');
   });
   await page.goto(`${base}/guides/almaty/sample/?lang=${lang}`);
   await check('public sample is a complete day with no embedded full product',async()=>{
    assert.equal(await page.locator('[data-sample-stop]').count(),3);
    const data=JSON.parse(await page.locator('#sample-data').textContent());
    assert.equal(data.journey,undefined);assert.equal(data.plans,undefined);assert.equal(data.stages,undefined);
    assert.equal(await page.locator('a[href*="google.com/maps"]').count(),3);
    assert.equal(await page.locator('[data-walk-link]').count(),2);
    assert.equal(await page.locator('a[href*="2gis"],a[href*="yandex"]').count(),0);
    await page.locator('[data-monday]').check();assert.equal(await page.locator('[data-sample-stop]').count(),2);
    assert.equal(await page.locator('[data-walk-link]').count(),1);
    assert.equal(new URL(await page.locator('[data-walk-link]').getAttribute('href')).searchParams.get('destination'),'Zhibek Zholy St & Kunaev St, Almaty');
    assert.equal(await page.locator('[data-monday-note]').count(),1);
    await page.locator('[data-language]').click();assert.equal(await page.locator('[data-monday]').isChecked(),true);
    await page.locator('[data-language]').click();
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    await page.emulateMedia({media:'print'});assert.equal(await page.locator('.no-print').first().isVisible(),false);
    await page.emulateMedia({media:'screen'});
   });
   await page.screenshot({path:`${out}/sample-${lang}-${width}.png`,fullPage:true});
   await page.locator('main > a').click();assert.match(page.url(),new RegExp(`offer/\\?lang=${lang}`));
   await check('mobile offer fits viewport',async()=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);});
   if(width!==320)await page.screenshot({path:`${out}/offer-${lang}-${width}.png`,fullPage:true});
   await page.goto(`${base}/guides/almaty/access/?lang=${lang}`);
   await page.locator('[data-access-unavailable]').waitFor();
   await check('unconfigured real login has helpful exits and collects no email',async()=>{
    assert.equal(await page.locator('input,#request,#verify').count(),0);
    assert.equal(await page.locator('[data-access-unavailable] a').count(),2);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   });
  }finally{await context.close();}
 }
 assert.deepEqual(errors,[]);
 await writeFile(`${out}/validation.json`,JSON.stringify({checkedAt:'2026-10-24',count:checks.length,checks,errors,note:'Local presentation and explicit unavailable-login state. No live mail, payments or private-content deployment.'},null,2));
 console.log(`Passed ${checks.length} product packaging checks.`);
}finally{await browser.close();}
