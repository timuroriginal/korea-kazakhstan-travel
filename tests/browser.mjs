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
  await check('Airport distances are symmetric, bounded and use published reference points',async()=>{
    const {airDistanceKm,airports}=await import('../assets/route-map.js');
    assert.equal(airports.astana.arp,'510121N 0712758E');assert.equal(airports.almaty.arp,'432120N 0770238E');
    assert.ok(Math.abs(airDistanceKm('astana','almaty')-950.4)<1);
    assert.ok(Math.abs(airDistanceKm('astana','aktau')-1719)<1);
    for(const from of Object.keys(airports))for(const to of Object.keys(airports)){
      assert.equal(airDistanceKm(from,to),airDistanceKm(to,from));assert.ok(Number.isFinite(airDistanceKm(from,to)));
      if(from===to)assert.equal(airDistanceKm(from,to),0);else assert.ok(airDistanceKm(from,to)>0&&airDistanceKm(from,to)<3000);
    }
    assert.equal(airDistanceKm('unknown','almaty'),null);
  });
  await check('Flight animation counts up, finishes and survives rapid destination changes',async()=>{
    await page.emulateMedia({reducedMotion:'no-preference'});await go('routes');
    await page.locator('#flight-origin').selectOption('almaty');await page.locator('[data-map-choice="astana"]').click();
    assert.equal(await page.locator('#flight-distance').getAttribute('data-km'),'950');
    const beginning=await page.locator('#flight-distance').innerText();assert.ok(Number(beginning.replace(/[^0-9]/g,''))<950);
    await page.waitForFunction(()=>document.querySelector('#flight-distance').textContent.replace(/[^0-9]/g,'')==='950');
    assert.equal(await page.locator('.flight-plane').count(),1);assert.equal(await page.locator('.flight-trail').evaluate(p=>Number(p.style.strokeDashoffset)),0);
    for(const id of ['aktau','turkistan','astana'])await page.locator(`[data-map-choice="${id}"]`).click();
    await page.waitForFunction(()=>document.querySelector('#flight-distance').textContent.replace(/[^0-9]/g,'')==='950');
    await page.locator('#flight-swap').click();assert.equal(await page.locator('#flight-origin').inputValue(),'astana');assert.equal(await page.locator('#route-map-card').getAttribute('data-destination'),'almaty');
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('#flight-distance').textContent==='≈ 950 km');assert.equal(await page.locator('.flight-trail').evaluate(p=>Number(p.style.strokeDashoffset)),0);
    await page.locator('[data-map-choice="astana"]').click();assert.equal(await page.locator('.flight-plane').count(),0);assert.equal(await page.locator('#flight-distance').getAttribute('data-km'),'0');
  });
  await check('Map origin selection, cancellation and Burabay gateway are explicit',async()=>{
    await page.locator('[data-map-choice="almaty"]').click();await page.locator('#flight-pick').click();
    await page.locator('[data-map-choice="aktau"]').click();assert.equal(await page.locator('#flight-origin').inputValue(),'aktau');
    assert.equal(await page.locator('#route-map-card').getAttribute('data-destination'),'almaty');assert.equal(await page.locator('#flight-pick').getAttribute('aria-pressed'),'false');
    await page.locator('#flight-pick').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#flight-pick').getAttribute('aria-pressed'),'false');
    await page.locator('[data-map-choice="burabay"]').click();assert.match(await page.locator('#flight-hint').innerText(),/콕셰타우/);
    assert.match(await page.locator('#flight-distance').getAttribute('title'),/UATE → UACK/);
    await page.locator('#flight-origin').selectOption('astana');await page.locator('[data-map-choice="almaty"]').click();
    await go();assert.equal(await page.locator('#flight-origin').inputValue(),'astana');assert.equal(await page.locator('#flight-distance').getAttribute('data-km'),'950');
  });
  await check('Touch users select departure and arrival without hover',async()=>{
    const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});const p=await c.newPage();p.on('pageerror',e=>failures.push(e.message));
    await p.goto(base);await p.locator('#flight-pick').tap();await p.locator('[data-map-choice="astana"]').tap();await p.locator('[data-map-choice="almaty"]').tap();
    assert.equal(await p.locator('#flight-distance').getAttribute('data-km'),'950');assert.equal(await p.locator('#flight-origin').inputValue(),'astana');
    for(const width of [320,390,768]){await p.setViewportSize({width,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}
    await c.close();
  });
  await check('Calculated distance settles even when a browser suspends animation frames',async()=>{
    const c=await browser.newContext({viewport:{width:1280,height:900}});await c.addInitScript(()=>{window.requestAnimationFrame=()=>1;window.cancelAnimationFrame=()=>{};});
    const p=await c.newPage();p.on('pageerror',e=>failures.push(e.message));await p.goto(base);
    await p.waitForFunction(()=>document.querySelector('#flight-distance').textContent==='≈ 950 km',null,{polling:100});
    await p.locator('[data-map-choice="aktau"]').click();await p.waitForFunction(()=>document.querySelector('#flight-distance').textContent.replace(/[^0-9]/g,'')==='1719',null,{polling:100});await c.close();
  });
  await check('All six destinations render on direct navigation and refresh',async()=>{for(const id of ['almaty','astana','aktau','ust-kamenogorsk','burabay','turkistan']){await go(`destinations/${id}`);assert.equal(await page.locator('#content h1').count(),1);assert.equal(await page.locator('#content .section').count(),7);await page.reload();await page.locator('#content h1').waitFor();await noOverflow();}});
  await check('Almaty to Kok-Tobe, language toggle preserves nested route',async()=>{await go('destinations/almaty');await page.locator('.place-card[href="#/places/kok-tobe"]').click();await page.locator('[data-gallery="0"]').waitFor();await page.locator('[data-language="ru"]').click();assert.equal(await page.locator('html').getAttribute('lang'),'ru');assert.match(await page.locator('h1').innerText(),/Кок-Тобе/);assert.match(page.url(),/#\/places\/kok-tobe/);await page.reload();await page.locator('[data-gallery="0"]').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),'ru');});
  await check('Gallery and video dialog close on Escape and button',async()=>{await page.locator('[data-gallery="2"]').click();assert.match(await page.locator('#gallery-stage').innerText(),/Прогулка/);await page.locator('[data-gallery="3"]').click();await page.locator('#gallery-stage [data-video]').click();assert.equal(await page.locator('dialog').evaluate(d=>d.open),true);assert.match(await page.locator('dialog').innerText(),/Видео пока не загружено/);await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').evaluate(d=>d.open),false);await page.locator('#gallery-stage [data-video]').click();await page.locator('#dialog-close').click();assert.equal(await page.locator('dialog').evaluate(d=>d.open),false);});
  await check('Transport tabs support keyboard selection',async()=>{await page.locator('#tab-cable').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#tab-ground').getAttribute('aria-selected'),'true');assert.equal(await page.locator('#panel-ground').isVisible(),true);await page.keyboard.press('Home');assert.equal(await page.locator('#panel-cable').isVisible(),true);});
  await check('Saved place persists, can be removed, no account required',async()=>{await page.locator('[data-save="kok-tobe"]').click();await page.reload();await page.locator('[data-save="kok-tobe"]').waitFor();assert.equal(await page.locator('[data-save="kok-tobe"]').getAttribute('aria-pressed'),'true');await go('saved');assert.equal(await page.locator('.destination-card').count(),1);await page.locator('a[href="#/places/kok-tobe"]').first().click();await page.locator('[data-save="kok-tobe"]').click();await go('saved');assert.equal(await page.locator('.destination-card').count(),0);});
  await check('Preparation sections, routes, about and unknown route',async()=>{for(const route of ['prepare','prepare/entry','prepare/money','prepare/connection','prepare/transport','prepare/language','prepare/safety','routes','about','does-not-exist']){await go(route);assert.equal(await page.locator('h1').count(),1);}assert.match(await page.locator('h1').innerText(),/Страница не найдена/);});
  await check('Mobile menu and layouts at 320, 390, 768, 1024 and 1280',async()=>{for(const width of [320,390,768,1024,1280]){await page.setViewportSize({width,height:900});for(const r of ['', 'destinations/ust-kamenogorsk','places/kok-tobe','prepare']){await go(r);await noOverflow();}}await page.setViewportSize({width:390,height:844});await go();await page.locator('#menu-button').click();assert.equal(await page.locator('#mobile-nav').isVisible(),true);await page.locator('#mobile-nav a[href="#/destinations"]').click();assert.equal(await page.locator('#mobile-nav').isVisible(),false);});
  await check('Clipboard denied fallback remains useful',async()=>{await go('places/kok-tobe');await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('denied'))},configurable:true}));await page.locator('.sidebar [data-copy]').click();assert.match(await page.locator('#toast').innerText(),/Кок-Тобе/);});
  await check('Storage unavailable does not prevent navigation or saving',async()=>{const c=await browser.newContext({viewport:{width:390,height:844}});await c.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('denied');}});});const p=await c.newPage();p.on('pageerror',e=>failures.push(e.message));await p.goto(`${base}/#/places/kok-tobe`);await p.locator('[data-save]').click();assert.equal(await p.locator('[data-save]').getAttribute('aria-pressed'),'true');assert.match(await p.locator('#toast').innerText(),/현재 세션/);await c.close();});
  await check('Reduced motion is respected and no runtime or HTTP errors',async()=>{await page.emulateMedia({reducedMotion:'reduce'});await go();assert.equal(await page.locator('#content').evaluate(e=>getComputedStyle(e).animationName),'none');assert.deepEqual(failures,[]);});
  await check('Almaty filters combine with search, empty state and expansion',async()=>{
    await go('destinations/almaty');const city=page.locator('[data-place-group="city"]');
    assert.equal(await city.locator('.place-card').count(),6);
    await city.locator('[data-place-more]').click();assert.equal(await city.locator('.place-card').count(),17);
    await city.locator('[data-place-filter="culture"]').click();await city.locator('[data-place-search]').fill('базар');assert.equal(await city.locator('.place-card').count(),0);
    await city.locator('[data-place-filter="shopping"]').click();assert.equal(await city.locator('.place-card').count(),1);assert.match(await city.locator('h3').innerText(),/Зелёный/);
    await city.locator('[data-place-search]').fill('');await city.locator('[data-place-filter="all"]').click();assert.equal(await city.locator('.place-card').count(),6);
    const nearby=page.locator('[data-place-group="nearby"]');await nearby.locator('[data-place-search]').fill('Чарын');assert.equal(await nearby.locator('.place-card').count(),1);
    assert.equal(await page.locator('[data-place-id="almaty-medeu-visit-center"]').count(),0);
    await page.locator('[data-scroll="nearby"]').first().click();assert.match(page.url(),/#\/destinations\/almaty$/);
  });
  await check('All 26 place pages have body, scoped sources and survive refresh',async()=>{
    const {contentPlaces}=await import('../assets/content-pages.js');assert.equal(contentPlaces.length,26);
    for(const p of contentPlaces){await go(`places/${p.id}`);assert.match(await page.locator('h1').innerText(),new RegExp(p.name.ru.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));assert.ok((await page.locator('#overview').innerText()).length>500);assert.ok(await page.locator('#sources a').count()>0);await noOverflow();}
    await go('places/almaty-zoo');await page.reload();await page.locator('h1').waitFor();assert.match(await page.locator('#practical').innerText(),/1 427|1427/);
  });
  await check('Restrictions and unknown prices do not become open or free promises',async()=>{
    await go('places/almaty-first-president-park');assert.match(await page.locator('.access-notice').innerText(),/закрыт|Закрыт/);
    await go('places/almaty-museum-instruments');assert.match(await page.locator('.visit-facts').innerText(),/Не подтверждено/);
    await go('places/almaty-bao');assert.match(await page.locator('.visit-facts').innerText(),/Не подтверждено/);assert.equal(await page.locator('a[href*="firm/70000001047716414"]').count(),0);
    await go('places/almaty-gorelnik');assert.equal(await page.locator('.sidebar a[href*="2gis"]').count(),0);
    await go('places/almaty-medeu-visit-center');assert.match(await page.locator('h1').innerText(),/Страница не найдена/);
  });
  await check('New saved places persist and Korean mode displays adapted text',async()=>{
    await go('places/almaty-green-bazaar');await page.locator('[data-save="almaty-green-bazaar"]').click();await page.reload();await page.locator('[data-save="almaty-green-bazaar"]').waitFor();assert.equal(await page.locator('[data-save="almaty-green-bazaar"]').getAttribute('aria-pressed'),'true');
    await go('saved');assert.equal(await page.locator('a[href="#/places/almaty-green-bazaar"]').count(),1);await page.locator('a[href="#/places/almaty-green-bazaar"]').click();await page.locator('[data-save="almaty-green-bazaar"]').click();
    await page.locator('[data-language="ko"]').click();assert.equal(await page.locator('#overview p').first().getAttribute('lang'),'ko');assert.match(await page.locator('#overview').innerText(),/[가-힣]/);assert.doesNotMatch(await page.locator('#overview').innerText(),/[А-Яа-яЁё]/);assert.match(page.url(),/almaty-green-bazaar/);await page.locator('[data-language="ru"]').click();
  });
  await check('All 26 Korean pages have adapted descriptions and visitor facts',async()=>{
    const {contentPlaces}=await import('../assets/content-pages.js');
    await go('destinations/almaty');await page.locator('[data-language="ko"]').click();
    for(const p of contentPlaces){await go(`places/${p.id}`);
      const overview=await page.locator('#overview').innerText();
      assert.ok(overview.includes(p.copy.body.ko.split('\n')[0]));assert.doesNotMatch(overview,/[А-Яа-яЁё]|[\u2013\u2014]/);
      assert.equal(await page.locator('.page-heading p').innerText(),p.copy.card.ko);
      assert.equal(await page.locator('.visit-facts dd').first().getAttribute('lang'),'ko');await noOverflow();
    }
    await go('places/almaty-bao');assert.match(await page.locator('.visit-facts').innerText(),/확인되지/);
    await go('places/kok-tobe');assert.match(await page.locator('#panel-cable').innerText(),/하부/);await page.locator('[data-tab="ground"]').click();assert.match(await page.locator('#panel-ground').innerText(),/지상/);
    await go('destinations/almaty');assert.equal(await page.locator('#overview p').first().getAttribute('lang'),'ko');
    for(const section of ['transport','stay']){await page.locator(`#${section} details`).evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.doesNotMatch(await page.locator(`#${section} .practical-answers`).innerText(),/[А-Яа-яЁё]|[\u2013\u2014]/);}
    await page.locator('[data-place-group="city"] [data-place-search]').fill('카스테예프');assert.equal(await page.locator('[data-place-group="city"] .place-card').count(),1);
    await go('routes/almaty');await page.locator('.itinerary-card').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.doesNotMatch(await page.locator('.itinerary-grid').innerText(),/[А-Яа-яЁё]|[\u2013\u2014]/);
    for(const width of [320,390]){await page.setViewportSize({width,height:900});await noOverflow();await go('destinations/almaty');await noOverflow();}
    await page.locator('[data-language="ru"]').click();
  });
  await check('Almaty routes are linked sequences with separate third-day alternatives',async()=>{
    await go('routes/almaty');assert.equal(await page.locator('.itinerary-card').count(),4);await page.locator('.itinerary-card').last().locator('summary').click();
    assert.equal(await page.locator('.itinerary-card').last().locator('a[href="#/places/almaty-kolsai"]').count(),1);assert.equal(await page.locator('.itinerary-card').last().locator('a[href="#/places/almaty-kaindy"]').count(),0);assert.doesNotMatch(await page.locator('.itinerary-grid').innerText(),/\b\d\d:\d\d\b/);
  });
  await check('Populated Almaty and long place names fit small screens',async()=>{
    for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});for(const r of ['destinations/almaty','places/almaty-kasteev-museum','routes/almaty']){await go(r);await noOverflow();}}
    assert.deepEqual(failures,[]);
  });
  await mkdir('test-results',{recursive:true});
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:900});await go();await page.screenshot({path:'test-results/home-desktop.png',fullPage:true});await page.locator('#home-routes').screenshot({path:'test-results/home-map-desktop.png'});
  await go('places/kok-tobe');await page.screenshot({path:'test-results/kok-tobe-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await go('destinations/almaty');await page.screenshot({path:'test-results/almaty-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:900});await go('routes');await page.locator('#route-explorer').screenshot({path:'test-results/routes-map-desktop.png'});
  await page.setViewportSize({width:390,height:844});await go();await page.locator('#home-routes').screenshot({path:'test-results/home-map-mobile.png'});await go('routes');await page.locator('#route-explorer').screenshot({path:'test-results/routes-map-mobile.png'});
  process.stdout.write(`Completed ${count} acceptance checks.\n`);
} finally { await browser.close(); }
