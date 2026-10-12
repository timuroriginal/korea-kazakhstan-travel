import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.GUIDE_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.GUIDE_PREVIEW_URL || 'http://127.0.0.1:4317';
const browser = await chromium.launch({headless:true,...(process.env.GUIDE_BROWSER_CHANNEL ? {channel:process.env.GUIDE_BROWSER_CHANNEL} : {})});
const failures=[];
const context=await browser.newContext({viewport:{width:1280,height:900}});
const page=await context.newPage();
page.on('pageerror',e=>failures.push(e.message));
page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
let count=0;
async function check(name,fn){await fn();count++;process.stdout.write(`PASS ${name}\n`);}
async function go(route=''){await page.goto(`${base}/#/${route}`);await page.locator('#content h1').waitFor();}
async function noOverflow(){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}
try {
  await check('Korean home and six destinations',async()=>{const r=await page.goto(base);assert.equal(r.status(),200);await page.locator('.destination-card').first().waitFor();assert.equal(await page.locator('.destination-card').count(),6);assert.equal(await page.locator('html').getAttribute('lang'),'ko');});
  await check('Search and topic filters combine; empty results recover',async()=>{await page.locator('[data-filter="water"]').click();assert.equal(await page.locator('.destination-card').count(),2);await page.locator('#destination-search').fill('Aktau');assert.equal(await page.locator('.destination-card').count(),1);await page.locator('#destination-search').fill('no-such-city');assert.equal(await page.locator('.destination-card').count(),0);await page.locator('#destination-search').fill('');await page.locator('[data-filter="all"]').click();assert.equal(await page.locator('.destination-card').count(),6);});
  await check('Owner-defined themes show the intended destinations',async()=>{
    const expected={nature:['almaty','ust-kamenogorsk','burabay'],city:['almaty','astana','turkistan'],culture:['almaty','astana','turkistan'],food:['almaty','astana','aktau','turkistan'],water:['aktau','burabay']};
    for(const [theme,ids] of Object.entries(expected)){
      await page.locator(`[data-filter="${theme}"]`).click();
      assert.deepEqual(await page.locator('.destination-card').evaluateAll(links=>links.map(a=>a.getAttribute('href').split('/').at(-1))),ids);
    }
    await page.locator('[data-filter="all"]').click();
  });
  await check('Six independent route sections and six destination promo slots',async()=>{
    const ids=['almaty','astana','aktau','ust-kamenogorsk','burabay','turkistan'];
    assert.equal(await page.locator('#home-routes .practical-grid').count(),0);
    for(const id of ids){await page.locator(`#home-routes [data-map-choice="${id}"]`).click();assert.equal(await page.locator('#route-map-card a').getAttribute('href'),`#/routes/${id}`);}
    await page.locator('[data-map-choice="almaty"]').click();
    assert.deepEqual(await page.locator('#home-promos [data-video]').evaluateAll(buttons=>buttons.map(b=>b.dataset.video)),ids.map(id=>`${id}-video`));
    for(const id of ids){await go(`routes/${id}`);assert.equal(await page.locator(`a[href="#/destinations/${id}"]`).count(),1);await page.reload();await page.locator('h1').waitFor();}
    await go('routes');assert.equal(await page.locator('#route-directory a').count(),6);
  });
  await check('Homepage map replaces repeated cards and preserves choice across language and navigation',async()=>{
    await go();await page.locator('#home-routes .map-marker[data-map-target="aktau"] .marker-hit').hover();
    assert.equal(await page.locator('#route-map-card').getAttribute('data-destination'),'aktau');
    await page.locator('[data-language="ru"]').click();assert.equal(await page.locator('#route-map-card').getAttribute('data-destination'),'aktau');
    assert.match(await page.locator('#route-map-card h3').innerText(),/Актау/);
    await page.locator('#home-routes details summary').click();assert.equal(await page.locator('#home-routes details').getAttribute('open'),'');
    await page.locator('#route-map-card a').click();assert.match(page.url(),/#\/routes\/aktau/);
    await go();await page.locator('[data-map-choice="almaty"]').click();await page.locator('[data-language="ko"]').click();
  });
  await check('Geographic explorer shows 20 real regions and six destination markers',async()=>{
    await go('routes');assert.equal(await page.locator('.map-area').count(),20);assert.equal(await page.locator('.map-marker').count(),6);assert.equal(await page.locator('[data-map-choice]').count(),6);
    assert.equal(await page.locator('#route-map-card').getAttribute('data-destination'),'almaty');
    assert.equal(await page.locator('.map-area.is-selected').count(),2);
    assert.equal(await page.locator('[data-region="KAZ001"]').count(),1); // Abay, created in 2022.
    assert.equal(await page.locator('[data-region="KAZ010"]').count(),1); // Jetisu.
    assert.equal(await page.locator('[data-region="KAZ019"]').count(),1); // Ulytau.
  });
  await check('List, geographic regions, marker hover and carousel stay synchronized',async()=>{
    await page.locator('[data-map-choice="aktau"]').click();assert.equal(await page.locator('[data-region="KAZ014"]').getAttribute('class'),'map-area map-target is-selected');
    assert.equal(await page.locator('#route-map-card a').getAttribute('href'),'#/routes/aktau');
    await page.locator('.map-marker[data-map-target="turkistan"] .marker-hit').hover();assert.equal(await page.locator('#route-map-card').getAttribute('data-destination'),'turkistan');
    assert.equal(await page.locator('[data-map-choice="turkistan"]').getAttribute('aria-pressed'),'true');
    await page.locator('[data-map-cycle="1"]').click();assert.equal(await page.locator('#route-map-card').getAttribute('data-destination'),'almaty');
    await page.locator('[data-map-choice="aktau"]').click();
    const region=page.locator('.map-regions [data-region="KAZ005"]');await region.scrollIntoViewIfNeeded();
    const point=await region.evaluate(path=>{
      const b=path.getBBox(),m=path.getScreenCTM();
      for(let y=b.y+5;y<b.y+b.height;y+=5)for(let x=b.x+5;x<b.x+b.width;x+=5){
        if(!path.isPointInFill(new DOMPoint(x,y)))continue;
        const p=new DOMPoint(x,y).matrixTransform(m);
        if(document.elementFromPoint(p.x,p.y)===path)return {x:p.x,y:p.y};
      }
      throw new Error('No visible interior point found');
    });
    await page.mouse.move(point.x,point.y);assert.equal(await page.locator('#route-map-card').getAttribute('data-destination'),'almaty');
    await page.locator('[data-map-choice="burabay"]').focus();assert.equal(await page.locator('#route-map-card').getAttribute('data-destination'),'burabay');
    assert.equal(await page.locator('[data-region="KAZ002"]').getAttribute('class'),'map-area map-target is-selected');
  });
  await check('Touch marker selection and mobile explorer have no overflow',async()=>{
    const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await mobile.newPage();p.on('pageerror',e=>failures.push(e.message));
    await p.goto(`${base}/#/routes`);await p.locator('.map-marker[data-map-target="aktau"] .marker-hit').tap();assert.equal(await p.locator('#route-map-card').getAttribute('data-destination'),'aktau');
    await p.locator('[data-map-choice="astana"]').tap();assert.equal(await p.locator('#route-map-card').getAttribute('data-destination'),'astana');
    for(const width of [320,390,768,1280]){await p.setViewportSize({width,height:900});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}
    await mobile.close();
  });
  await check('All six destinations render on direct navigation and refresh',async()=>{for(const id of ['almaty','astana','aktau','ust-kamenogorsk','burabay','turkistan']){await go(`destinations/${id}`);assert.equal(await page.locator('#content h1').count(),1);assert.equal(await page.locator('#content .section').count(),7);await page.reload();await page.locator('#content h1').waitFor();await noOverflow();}});
  await check('Almaty to Kok-Tobe, language toggle preserves nested route',async()=>{await go('destinations/almaty');await page.locator('a[href="#/places/kok-tobe"]').click();await page.locator('[data-gallery="0"]').waitFor();await page.locator('[data-language="ru"]').click();assert.equal(await page.locator('html').getAttribute('lang'),'ru');assert.match(await page.locator('h1').innerText(),/Кок-Тобе/);assert.match(page.url(),/#\/places\/kok-tobe/);await page.reload();await page.locator('[data-gallery="0"]').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),'ru');});
  await check('Gallery and video dialog close on Escape and button',async()=>{await page.locator('[data-gallery="2"]').click();assert.match(await page.locator('#gallery-stage').innerText(),/Прогулка/);await page.locator('[data-gallery="3"]').click();await page.locator('#gallery-stage [data-video]').click();assert.equal(await page.locator('dialog').evaluate(d=>d.open),true);assert.match(await page.locator('dialog').innerText(),/Видео пока не загружено/);await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').evaluate(d=>d.open),false);await page.locator('#gallery-stage [data-video]').click();await page.locator('#dialog-close').click();assert.equal(await page.locator('dialog').evaluate(d=>d.open),false);});
  await check('Transport tabs support keyboard selection',async()=>{await page.locator('#tab-cable').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#tab-ground').getAttribute('aria-selected'),'true');assert.equal(await page.locator('#panel-ground').isVisible(),true);await page.keyboard.press('Home');assert.equal(await page.locator('#panel-cable').isVisible(),true);});
  await check('Saved place persists, can be removed, no account required',async()=>{await page.locator('[data-save="kok-tobe"]').click();await page.reload();await page.locator('[data-save="kok-tobe"]').waitFor();assert.equal(await page.locator('[data-save="kok-tobe"]').getAttribute('aria-pressed'),'true');await go('saved');assert.equal(await page.locator('.destination-card').count(),1);await page.locator('a[href="#/places/kok-tobe"]').first().click();await page.locator('[data-save="kok-tobe"]').click();await go('saved');assert.equal(await page.locator('.destination-card').count(),0);});
  await check('Preparation sections, routes, about and unknown route',async()=>{for(const route of ['prepare','prepare/entry','prepare/money','prepare/connection','prepare/transport','prepare/language','prepare/safety','routes','about','does-not-exist']){await go(route);assert.equal(await page.locator('h1').count(),1);}assert.match(await page.locator('h1').innerText(),/Страница не найдена/);});
  await check('Mobile menu and layouts at 320, 390, 768, 1024 and 1280',async()=>{for(const width of [320,390,768,1024,1280]){await page.setViewportSize({width,height:900});for(const r of ['', 'destinations/ust-kamenogorsk','places/kok-tobe','prepare']){await go(r);await noOverflow();}}await page.setViewportSize({width:390,height:844});await go();await page.locator('#menu-button').click();assert.equal(await page.locator('#mobile-nav').isVisible(),true);await page.locator('#mobile-nav a[href="#/destinations"]').click();assert.equal(await page.locator('#mobile-nav').isVisible(),false);});
  await check('Clipboard denied fallback remains useful',async()=>{await go('places/kok-tobe');await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('denied'))},configurable:true}));await page.locator('[data-copy]').click();assert.match(await page.locator('#toast').innerText(),/Кок-Тобе/);});
  await check('Storage unavailable does not prevent navigation or saving',async()=>{const c=await browser.newContext({viewport:{width:390,height:844}});await c.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('denied');}});});const p=await c.newPage();p.on('pageerror',e=>failures.push(e.message));await p.goto(`${base}/#/places/kok-tobe`);await p.locator('[data-save]').click();assert.equal(await p.locator('[data-save]').getAttribute('aria-pressed'),'true');assert.match(await p.locator('#toast').innerText(),/현재 세션/);await c.close();});
  await check('Reduced motion is respected and no runtime or HTTP errors',async()=>{await page.emulateMedia({reducedMotion:'reduce'});await go();assert.equal(await page.locator('#content').evaluate(e=>getComputedStyle(e).animationName),'none');assert.deepEqual(failures,[]);});
  await mkdir('test-results',{recursive:true});
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:900});await go();await page.screenshot({path:'test-results/home-desktop.png',fullPage:true});await page.locator('#home-routes').screenshot({path:'test-results/home-map-desktop.png'});
  await go('places/kok-tobe');await page.screenshot({path:'test-results/kok-tobe-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await go('destinations/almaty');await page.screenshot({path:'test-results/almaty-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:900});await go('routes');await page.locator('#route-explorer').screenshot({path:'test-results/routes-map-desktop.png'});
  await page.setViewportSize({width:390,height:844});await go();await page.locator('#home-routes').screenshot({path:'test-results/home-map-mobile.png'});await go('routes');await page.locator('#route-explorer').screenshot({path:'test-results/routes-map-mobile.png'});
  process.stdout.write(`Completed ${count} acceptance checks.\n`);
} finally { await browser.close(); }
