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
  await check('All six destinations render on direct navigation and refresh',async()=>{for(const id of ['almaty','astana','aktau','ust-kamenogorsk','burabay','turkistan']){await go(`destinations/${id}`);assert.equal(await page.locator('#content h1').count(),1);assert.equal(await page.locator('#content .section').count(),id==='ust-kamenogorsk'?8:7);await page.reload();await page.locator('#content h1').waitFor();await noOverflow();}});
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
    await go('destinations/almaty');const city=page.locator('[data-place-group="all"]');
    assert.equal(await city.locator('.place-card').count(),6);
    await city.locator('[data-place-more]').click();assert.equal(await city.locator('.place-card').count(),41);
    await city.locator('[data-place-filter="culture"]').click();await city.locator('[data-place-search]').fill('базар');assert.equal(await city.locator('.place-card').count(),0);
    await city.locator('[data-place-filter="shopping"]').click();assert.equal(await city.locator('.place-card').count(),1);assert.match(await city.locator('h3').innerText(),/Зелёный/);
    await city.locator('[data-place-search]').fill('');await city.locator('[data-place-filter="all"]').click();assert.equal(await city.locator('.place-card').count(),6);
    const nearby=page.locator('[data-place-group="nearby"]');await nearby.locator('[data-place-search]').fill('Чарын');assert.equal(await nearby.locator('.place-card').count(),1);
    assert.equal(await page.locator('[data-place-id="almaty-medeu-visit-center"]').count(),0);
    await page.locator('[data-scroll="nearby"]').first().click();assert.match(page.url(),/#\/destinations\/almaty$/);
  });
  await check('All 106 place pages preserve internal research without public source furniture',async()=>{
    const {contentPlaces}=await import('../assets/content-pages.js');assert.equal(contentPlaces.length,106);assert.equal(contentPlaces.filter(p=>p.destination==='almaty').length,41);
    for(const p of contentPlaces){await go(`places/${p.id}`);assert.match(await page.locator('h1').innerText(),new RegExp(p.name.ru.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));assert.ok((await page.locator('#overview').innerText()).length>300);assert.equal(['aktau','burabay','ust-kamenogorsk'].includes(p.destination)?p.sources.length===0:p.sources.length>0,true);assert.equal(await page.locator('#sources, .source-links, a[href*="2gis.kz"]').count(),0);await noOverflow();}
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
  await check('All published Korean place pages have adapted descriptions and visitor facts',async()=>{
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
    for(const section of ['transport','stay']){await page.locator(`#${section} details`).evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.doesNotMatch(await page.locator(`#${section} .practical-answers`).evaluate(el=>{const clone=el.cloneNode(true);clone.querySelectorAll('[lang=ru]').forEach(n=>n.remove());return clone.innerText||clone.textContent}),/[А-Яа-яЁё]|[\u2013\u2014]/);}
    await page.locator('[data-place-group="all"] [data-place-search]').fill('카스테예프');assert.equal(await page.locator('[data-place-group="all"] .place-card').count(),1);
    await go('routes/almaty');await page.locator('.itinerary-card').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.doesNotMatch(await page.locator('.itinerary-grid').innerText(),/[А-Яа-яЁё]|[\u2013\u2014]/);
    for(const width of [320,390]){await page.setViewportSize({width,height:900});await noOverflow();await go('destinations/almaty');await noOverflow();}
    await page.locator('[data-language="ru"]').click();
  });
  await check('Almaty routes are linked sequences with separate third-day alternatives',async()=>{
    await go('routes/almaty');assert.equal(await page.locator('.itinerary-card').count(),4);await page.locator('.itinerary-card').last().locator('summary').click();
    assert.equal(await page.locator('.itinerary-card').last().locator('a[href="#/places/almaty-kolsai"]').count(),1);assert.equal(await page.locator('.itinerary-card').last().locator('a[href="#/places/almaty-kaindy"]').count(),0);assert.doesNotMatch(await page.locator('.itinerary-grid').innerText(),/\b\d\d:\d\d\b/);
  });
  await check('Nature filter includes resorts, lakes and hikes across Almaty',async()=>{
    await go('destinations/almaty');const all=page.locator('[data-place-group="all"]');
    await all.locator('[data-place-filter="mountains"]').click();await all.locator('[data-place-more]').click();
    for(const id of ['kok-tobe','almaty-shymbulak','almaty-medeu-sports-complex','almaty-oi-qaragai','almaty-ak-bulak','almaty-pioneer','almaty-issyk','almaty-bao','almaty-kolsai','almaty-kaindy','almaty-charyn','almaty-kok-zhailau','almaty-furmanov'])assert.equal(await all.locator(`[data-place-id="${id}"]`).count(),1);
    assert.equal(await all.locator('[data-place-id="ile-alatau-park"]').count(),1);
    assert.match(await all.locator('[data-place-id="almaty-furmanov"]').innerText(),/Длительный горный поход/);
    assert.match(await all.locator('[data-place-id="almaty-ak-bulak"]').innerText(),/Горный курорт/);
  });
  await check('Foreign visitor guidance avoids assuming language and local payment access',async()=>{
    await go('places/almaty-dostyk-plaza');assert.match(await page.locator('#overview').innerText(),/Zara/);assert.match(await page.locator('.address-box').innerText(),/111/);assert.match(await page.locator('.visit-guidance').innerText(),/Корейское обслуживание.*не подтвержден/);
    await go('places/almaty-esentai-mall');assert.match(await page.locator('#overview').innerText(),/Rolex/);assert.doesNotMatch(await page.locator('#overview').innerText(),/завершить.*кино|уточните|позвоните/);
    await go('routes/almaty');await page.locator('.itinerary-card').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.match(await page.locator('.itinerary-grid').innerText(),/Спектакль не включён/);
    await go('destinations/almaty');await page.locator('#stay details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.equal(await page.locator('.show-phrase button[data-copy="100 граммов, пожалуйста."]').count(),1);
    await page.locator('[data-language="ko"]').click();await page.locator('#stay details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.equal(await page.locator('.show-phrase [lang="ru"]').count(),2);await page.locator('[data-language="ru"]').click();
  });
  await check('Populated Almaty and long place names fit small screens',async()=>{
    for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});for(const r of ['destinations/almaty','places/almaty-kasteev-museum','routes/almaty']){await go(r);await noOverflow();}}
    assert.deepEqual(failures,[]);
  });
  await check('Astana catalog, seasons and nearby trips use their own data',async()=>{
    await go('destinations/astana');
    const all=page.locator('[data-place-group="all"]');
    assert.match(await all.locator('[data-place-count]').innerText(),/из 18/);
    assert.equal(await page.locator('.season-details details').count(),7);
    await all.locator('[data-place-filter="food"]').click();assert.equal(await all.locator('.place-card').count(),2);
    assert.match(await all.innerText(),/Sandyq/);
    await all.locator('[data-place-filter="all"]').click();await all.locator('[data-place-search]').fill('Байтерек');
    assert.equal(await all.locator('[data-place-id="astana-baiterek"]').count(),1);
    assert.equal(await all.locator('[data-place-id^="almaty"]').count(),0);
    const nearby=page.locator('[data-place-group="nearby"]');assert.equal(await nearby.locator('.place-card').count(),3);
    assert.match(await nearby.locator('[data-place-id="astana-karlag"]').innerText(),/Дальний выезд/);
    assert.equal(await page.locator('#transport details').count(),3);assert.equal(await page.locator('#stay details').count(),2);
  });
  await check('Astana places have correct breadcrumbs, unknown prices and no public source blocks',async()=>{
    const {contentPlaces}=await import('../assets/content-pages.js');
    for(const p of contentPlaces.filter(p=>p.destination==='astana')){
      await go(`places/${p.id}`);assert.equal(await page.locator('h1').innerText(),p.name.ru);
      assert.equal(await page.locator('.breadcrumbs a[href="#/destinations/astana"]').count(),1);
      assert.equal(await page.locator('.breadcrumbs a[href="#/destinations/almaty"]').count(),0);
      assert.equal(await page.locator('.page-heading .eyebrow').innerText().then(s=>s.startsWith('ASTANA')),true);
      assert.equal(await page.locator('#content a[href^="https://"]').count(),0);
      assert.doesNotMatch(await page.locator('#overview').innerText(),/2ГИС|по отзывам|[\u2013\u2014]/);
    }
    await go('places/astana-national-museum');assert.match(await page.locator('.visit-facts').innerText(),/Не подтверждено/);
    for(const id of ['astana-ak-orda-view','astana-seifullin']){await go(`places/${id}`);assert.match(await page.locator('h1').innerText(),/Страница не найдена/);}
  });
  await check('Astana Korean search, routes and saved places remain city-specific',async()=>{
    await go('destinations/astana');await page.locator('[data-language="ko"]').click();
    await page.locator('[data-place-group="all"] [data-place-search]').fill('바이테레크');assert.equal(await page.locator('[data-place-group="all"] .place-card').count(),1);
    await page.locator('.season-details details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
    assert.doesNotMatch(await page.locator('#overview').innerText(),/[А-Яа-яЁё]|[\u2013\u2014]/);
    await go('routes/astana');assert.equal(await page.locator('.itinerary-card').count(),6);
    await page.locator('.itinerary-card').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
    assert.equal(await page.locator('.itinerary-card a[href^="#/places/almaty"]').count(),0);
    assert.doesNotMatch(await page.locator('.itinerary-grid').innerText(),/[А-Яа-яЁё]|[\u2013\u2014]/);
    await go('places/astana-baiterek');await page.locator('[data-save="astana-baiterek"]').click();await go('saved');
    assert.equal(await page.locator('a[href="#/places/astana-baiterek"]').count(),1);
    await page.locator('a[href="#/places/astana-baiterek"]').click();await page.locator('[data-save="astana-baiterek"]').click();
    await page.locator('[data-language="ru"]').click();
  });
  await check('Astana pages fit mobile screens and preserve practical language limits',async()=>{
    for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});for(const route of ['destinations/astana','places/astana-singularity','routes/astana']){await go(route);await noOverflow();}}
    await go('places/astana-alzhir');assert.match(await page.locator('.visit-guidance').innerText(),/Корейск|корейск/);
    assert.deepEqual(failures,[]);
  });
  await check('Daididau and MEGA have distinct usable visitor profiles in both languages',async()=>{
    await go('destinations/astana');const all=page.locator('[data-place-group="all"]');
    await all.locator('[data-place-filter="food"]').click();assert.equal(await all.locator('[data-place-id="astana-daididau"]').count(),1);
    await all.locator('[data-place-filter="shopping"]').click();assert.equal(await all.locator('[data-place-id="astana-mega-silk-way"]').count(),1);
    await go('places/astana-daididau');assert.match(await page.locator('#overview').innerText(),/семьи Димаша/);assert.match(await page.locator('.visit-facts').innerText(),/7 800|7800/);assert.match(await page.locator('.visit-guidance').innerText(),/английскими/);
    await go('places/astana-mega-silk-way');assert.match(await page.locator('#overview').innerText(),/EXPO/);assert.match(await page.locator('.address-box').innerText(),/62/);assert.match(await page.locator('.visit-facts').innerText(),/22:00/);
    await page.locator('[data-language="ko"]').click();
    for(const id of ['astana-daididau','astana-mega-silk-way']){await go('places/'+id);assert.doesNotMatch(await page.locator('#overview').innerText(),/[А-Яа-яЁё]|[\u2013\u2014]/);assert.equal(await page.locator('a[href*="2gis"]').count(),0);}
    await page.locator('[data-language="ru"]').click();
  });
  await check('Turkistan catalog keeps reserves private and nearby copy specific',async()=>{
    await go('destinations/turkistan');await page.setViewportSize({width:1280,height:900});
    const all=page.locator('[data-place-group="all"]');
    assert.match(await all.locator('[data-place-count]').innerText(),/из 9/);
    await all.locator('[data-place-more]').click();assert.equal(await all.locator('.place-card').count(),9);
    assert.equal(await all.locator('.place-card').filter({hasText:'Есть условия посещения'}).count(),5);
    assert.doesNotMatch(await page.locator('#nearby').innerText(),/Горы|Курорт|Карлаг/);
    await all.locator('[data-place-filter="food"]').click();assert.equal(await all.locator('.place-card').count(),2);
    await all.locator('[data-place-search]').fill('Kerege');assert.equal(await all.locator('.place-card').count(),1);
    await go('places/turkistan-otrar-museum-shaulder');assert.match(await page.locator('h1').innerText(),/Страница не найдена/);
  });
  await check('Turkistan does not invent bundled tickets, addresses or return transport',async()=>{
    await go('places/turkistan-yasawi');assert.match(await page.locator('.visit-facts').innerText(),/2 000/);assert.match(await page.locator('.visit-facts').innerText(),/пока не установлен/);
    await go('places/turkistan-sandyq');assert.equal(await page.locator('.address-box button').count(),0);assert.match(await page.locator('#practical').innerText(),/SMS/);
    await go('places/turkistan-otrar-reserve');assert.match(await page.locator('.visit-facts').innerText(),/Не подтверждено/);
    await go('routes/turkistan');assert.equal(await page.locator('.itinerary-card').count(),3);
    assert.equal(await page.locator('.itinerary-card .access-badge').count(),2);
    assert.equal(await page.locator('a[href*="otrar-museum-shaulder"]').count(),0);
  });
  await check('Turkistan Korean discovery, local food names and saved cards work',async()=>{
    await go('destinations/turkistan');await page.locator('[data-language="ko"]').click();
    const all=page.locator('[data-place-group="all"]');await all.locator('[data-place-search]').fill('산드크');assert.equal(await all.locator('.place-card').count(),1);
    await go('places/turkistan-kerege');assert.match(await page.locator('.visit-facts').innerText(),/10%/);assert.equal(await page.locator('.show-phrase').count(),2);
    assert.equal(await page.locator('.show-phrase button').first().getAttribute('data-copy'),'Манты с говядиной');
    await page.locator('[data-save="turkistan-kerege"]').click();await go('saved');assert.equal(await page.locator('a[href="#/places/turkistan-kerege"]').count(),1);
    await go('places/turkistan-kerege');await page.locator('[data-save="turkistan-kerege"]').click();
    await page.locator('[data-language="ru"]').click();
  });
  await check('Turkistan pages fit small screens and retain specific language caveats',async()=>{
    for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});for(const route of ['destinations/turkistan','places/turkistan-sandyq','routes/turkistan']){await go(route);await noOverflow();}}
    await go('places/turkistan-khilvet');assert.match(await page.locator('.visit-guidance').innerText(),/Корейск/);assert.deepEqual(failures,[]);
  });
  await check('Aktau catalog separates coastal places, nature, food and reserves',async()=>{
    await go('destinations/aktau');const all=page.locator('[data-place-group="all"]');
    assert.match(await all.locator('[data-place-count]').innerText(),/из 12/);
    assert.equal(await page.locator('.season-details details').count(),4);
    await all.locator('[data-place-filter="water"]').click();assert.equal(await all.locator('.place-card').count(),2);
    await all.locator('[data-place-filter="food"]').click();assert.equal(await all.locator('.place-card').count(),2);
    await all.locator('[data-place-filter="mountains"]').click();assert.equal(await all.locator('.place-card').count(),6);
    assert.equal(await all.locator('[data-place-id="aktau-sherkala"]').count(),1);assert.equal(await all.locator('[data-place-id="aktau-airakty"]').count(),1);
    for(const id of ['dostar-beach','regional-museum','shopan-ata','sultan-epe']){await go('places/aktau-'+id);assert.match(await page.locator('h1').innerText(),/Страница не найдена/);}
  });
  await check('Aktau retains unknown admission, delivery price scope and return conditions',async()=>{
    await go('places/aktau-jeti');assert.match(await page.locator('.visit-facts').innerText(),/доставки/);assert.equal(await page.locator('.show-phrase button').getAttribute('data-copy'),'Фишбармак');
    await go('places/aktau-bozzhyra');assert.match(await page.locator('.visit-facts').innerText(),/Не подтверждено/);assert.match(await page.locator('#transport').innerText(),/Возвращение/);
    await go('places/aktau-rock-trail');assert.match(await page.locator('.page-heading').innerText(),/Сквозной проход/);
    await go('routes/aktau');assert.equal(await page.locator('.itinerary-card').count(),4);assert.equal(await page.locator('.itinerary-card .access-badge').count(),3);
    await page.locator('.itinerary-card').last().locator('summary').click();assert.equal(await page.locator('.itinerary-card').last().locator('li').nth(1).locator('.muted').first().innerText(),'День 2');
  });
  await check('Aktau Korean copy, search, routes and saved place remain usable',async()=>{
    await go('destinations/aktau');await page.locator('[data-language="ko"]').click();const all=page.locator('[data-place-group="all"]');
    await all.locator('[data-place-search]').fill('제티');assert.equal(await all.locator('.place-card').count(),1);
    await page.locator('.season-details details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.doesNotMatch(await page.locator('#overview').innerText(),/[А-Яа-яЁё]|[\u2013\u2014]/);
    await go('routes/aktau');await page.locator('.itinerary-card').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.doesNotMatch(await page.locator('.itinerary-grid').innerText(),/[А-Яа-яЁё]|[\u2013\u2014]/);
    await go('places/aktau-jeti');await page.locator('[data-save="aktau-jeti"]').click();await go('saved');assert.equal(await page.locator('a[href="#/places/aktau-jeti"]').count(),1);
    await go('places/aktau-jeti');await page.locator('[data-save="aktau-jeti"]').click();await page.locator('[data-language="ru"]').click();
  });
  await check('Aktau mobile pages and long return guidance fit the viewport',async()=>{
    for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});for(const route of ['destinations/aktau','places/aktau-shakpak-ata','places/aktau-jeti','routes/aktau']){await go(route);await noOverflow();}}
    assert.deepEqual(failures,[]);
  });
  await check('Burabay has ten specific profiles, five conditions, four seasons and independent filters',async()=>{
    await page.setViewportSize({width:1280,height:900});await go('destinations/burabay');
    const all=page.locator('[data-place-group="all"]');assert.match(await all.locator('[data-place-count]').innerText(),/из 10/);
    assert.equal(await page.locator('.season-details details').count(),4);
    await all.locator('[data-place-more]').click();assert.equal(await all.locator('.place-card').count(),10);
    assert.equal(await all.locator('.access-badge').count(),5);
    await all.locator('[data-place-filter="food"]').click();assert.equal(await all.locator('.place-card').count(),2);
    await all.locator('[data-place-search]').fill('Byrabai');assert.equal(await all.locator('.place-card').count(),1);
    await all.locator('[data-place-search]').fill('');await all.locator('[data-place-filter="nature"]').click();assert.equal(await all.locator('.place-card').count(),5);
    for(const id of ['beach','winter','forest-trail','shchuchinsk-base','multimedia','imanaev-creek','shchuchye-lake']){await go('places/burabay-'+id);assert.match(await page.locator('h1').innerText(),/Страница не найдена/);}
  });
  await check('Burabay keeps unknown entry, museum tariff, route return and day boundaries explicit',async()=>{
    await go('places/burabay-botai');assert.match(await page.locator('.visit-facts').innerText(),/Не подтверждено/);assert.doesNotMatch(await page.locator('.visit-facts').innerText(),/500/);
    await go('places/burabay-baitas');assert.match(await page.locator('.page-heading').innerText(),/без проживания пока не подтверждён/);
    await go('places/burabay-ybyrai-trail');assert.match(await page.locator('.visit-facts').innerText(),/конечной точки/);assert.match(await page.locator('#transport').innerText(),/пока не установлен/);
    await go('places/burabay-byrabai');assert.match(await page.locator('.visit-facts').innerText(),/средний чек/);assert.equal(await page.locator('.show-phrase button').first().getAttribute('data-copy'),'Манты');assert.match(await page.locator('.visit-facts').innerText(),/Оплата/);
    await go('routes/burabay');assert.equal(await page.locator('.itinerary-card').count(),4);assert.equal(await page.locator('.itinerary-card .access-badge').count(),3);
    await page.locator('.itinerary-card').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.equal(await page.locator('.route-transport').count(),4);assert.match(await page.locator('.route-transport').last().innerText(),/Возвращение/);
    const last=page.locator('.itinerary-card').last();assert.equal(await last.locator('li').nth(2).locator('.muted').first().innerText(),'День 2');assert.equal(await last.locator('a[href*="ybyrai"]').count(),0);
  });
  await check('Burabay Korean copy, practical topics, routes and saved place work without local language assumptions',async()=>{
    await go('destinations/burabay');await page.locator('[data-language="ko"]').click();
    const all=page.locator('[data-place-group="all"]');await all.locator('[data-place-search]').fill('줌박타스');assert.equal(await all.locator('.place-card').count(),1);
    await page.locator('.season-details details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.doesNotMatch(await page.locator('#overview').innerText(),/[А-Яа-яЁё]|[\u2013\u2014]/);
    for(const section of ['transport','stay']){await page.locator(`#${section} details`).evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.doesNotMatch(await page.locator(`#${section} .practical-answers`).innerText(),/[А-Яа-яЁё]|[\u2013\u2014]/);}
    await go('routes/burabay');await page.locator('.itinerary-card').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.doesNotMatch(await page.locator('.itinerary-grid').innerText(),/[А-Яа-яЁё]|[\u2013\u2014]/);
    await go('places/burabay-byrabai');await page.locator('[data-save="burabay-byrabai"]').click();await go('saved');assert.equal(await page.locator('a[href="#/places/burabay-byrabai"]').count(),1);await go('places/burabay-byrabai');await page.locator('[data-save="burabay-byrabai"]').click();await page.locator('[data-language="ru"]').click();
  });
  await check('Burabay fits mobile and its public module contains no research registry',async()=>{
    for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});for(const route of ['destinations/burabay','places/burabay-bolektau','places/burabay-byrabai','routes/burabay']){await go(route);await page.locator('.itinerary-card').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await noOverflow();}}
    const raw=await (await context.request.get(base+'/assets/burabay-data.js')).text();assert.doesNotMatch(raw,/sourceIds|internalGaps|provenance|checkedAt|https?:\/\/|\/Users\//);assert.deepEqual(failures,[]);
  });
  await check('Oskemen has sixteen profiles, twelve conditions, nine practical topics and separate nearby filters',async()=>{
    await page.setViewportSize({width:1280,height:900});await go('destinations/ust-kamenogorsk');
    const all=page.locator('[data-place-group="all"]');assert.match(await all.locator('[data-place-count]').innerText(),/из 16/);
    assert.equal(await page.locator('.season-details details').count(),4);
    await all.locator('[data-place-more]').click();assert.equal(await all.locator('.place-card').count(),16);assert.equal(await all.locator('.access-badge').count(),12);
    await all.locator('[data-place-filter="culture"]').click();assert.equal(await all.locator('.place-card').count(),5);
    await all.locator('[data-place-search]').fill('этнодеревня');assert.equal(await all.locator('.place-card').count(),1);
    assert.equal(await page.locator('#transport details').count(),7);assert.equal(await page.locator('#stay details').count(),2);
    const nearby=page.locator('[data-place-group="nearby"]');await nearby.locator('[data-place-more]').click();assert.equal(await nearby.locator('.place-card').count(),9);
    assert.equal(await nearby.locator('.place-card').filter({hasText:'Дальний выезд'}).count(),5);
    for(const id of ['oskemen-museum-kaisenov','oskemen-kiin-kerish','oskemen-rakhman']){await go('places/'+id);assert.match(await page.locator('h1').innerText(),/Страница не найдена/);}
  });
  await check('Oskemen preserves unknown entry and QURT order names, payment and horsemeat details',async()=>{
    await go('places/oskemen-ethnopark');assert.match(await page.locator('.visit-facts').innerText(),/Вход/);assert.equal(await page.locator('.address-box button').count(),0);assert.match(await page.locator('.visit-facts').innerText(),/Не подтверждено/);
    await go('places/oskemen-qurt');assert.equal(await page.locator('.address-box button').getAttribute('data-copy'),'Казахстан, 59Б');assert.equal(await page.locator('.show-phrase').count(),2);
    assert.equal(await page.locator('.show-phrase button').first().getAttribute('data-copy'),'Манты с мясом конины');assert.match(await page.locator('.visit-facts').innerText(),/Международная карта отдельно не подтверждена/);assert.match(await page.locator('#overview').innerText(),/Конина/);
    await go('places/oskemen-alps');assert.match(await page.locator('.visit-facts').innerText(),/неработающие/);
  });
  await check('Oskemen itineraries preserve access flags and separate arrival, visit and return',async()=>{
    await go('routes/ust-kamenogorsk');assert.equal(await page.locator('.itinerary-card').count(),4);assert.equal(await page.locator('.itinerary-card .access-badge').count(),3);
    await page.locator('.itinerary-card').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.equal(await page.locator('.route-transport').count(),4);
    const last=page.locator('.itinerary-card').last();assert.equal(await last.locator('.route-blocks > li').count(),3);assert.equal(await last.locator('.route-blocks h3').last().innerText(),'Отдельное возвращение');assert.doesNotMatch(await last.innerText(),/День 1/);
    assert.match(await last.innerText(),/Допуски и транспорт не подтверждены/);assert.match(await last.innerText(),/Стыковка с вылетом не включена/);
  });
  await check('Every Oskemen page has independent Korean copy, local order cards and saved navigation',async()=>{
    await go('destinations/ust-kamenogorsk');await page.locator('[data-language="ko"]').click();
    const all=page.locator('[data-place-group="all"]');await all.locator('[data-place-search]').fill('쿠르트');assert.equal(await all.locator('.place-card').count(),1);
    const {contentPlaces}=await import('../assets/content-pages.js');
    for(const p of contentPlaces.filter(p=>p.destination==='ust-kamenogorsk')){
      await go('places/'+p.id);assert.equal(await page.locator('h1').innerText(),p.name.ko);assert.doesNotMatch(await page.locator('#overview').innerText(),/[А-Яа-яЁё]|[\u2013\u2014]/);
      assert.doesNotMatch(await page.locator('.visit-guidance').innerText(),/[А-Яа-яЁё]/);assert.equal(await page.locator('.breadcrumbs a[href="#/destinations/ust-kamenogorsk"]').count(),1);
    }
    await go('routes/ust-kamenogorsk');await page.locator('.itinerary-card').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.doesNotMatch(await page.locator('.itinerary-grid').innerText(),/[А-Яа-яЁё]|[\u2013\u2014]/);
    await go('places/oskemen-qurt');await page.locator('[data-save="oskemen-qurt"]').click();await go('saved');assert.equal(await page.locator('a[href="#/places/oskemen-qurt"]').count(),1);
    await go('places/oskemen-qurt');await page.locator('[data-save="oskemen-qurt"]').click();await page.locator('[data-language="ru"]').click();
  });
  await check('Oskemen mobile pages fit and public data excludes private research and reserve candidates',async()=>{
    for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});for(const route of ['destinations/ust-kamenogorsk','places/oskemen-ethnopark','places/oskemen-qurt','routes/ust-kamenogorsk']){await go(route);await page.locator('.itinerary-card').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await noOverflow();}}
    const raw=await (await context.request.get(base+'/assets/oskemen-data.js')).text();assert.doesNotMatch(raw,/sourceIds|internalGaps|provenance|checkedAt|https?:\/\/|\/Users\/|oskemen-kiin-kerish|oskemen-rakhman/);assert.deepEqual(failures,[]);
  });
  await mkdir('test-results',{recursive:true});
  await check('Nature stays open by keyboard and connect destinations to specific rooms and return conditions',async()=>{
    await page.setViewportSize({width:1280,height:900});await go('destinations/ust-kamenogorsk');
    assert.equal(await page.locator('.journey-card').count(),3);
    assert.equal(await page.locator('.journey-card[open]').count(),0);
    const ridder=page.locator('[data-journey="oskemen-journey-ridder"]');
    await ridder.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await ridder.getAttribute('open'),'');
    assert.equal(await ridder.locator('.journey-steps > li').count(),4);
    assert.match(await ridder.innerText(),/чуть больше 5 км/);assert.match(await ridder.innerText(),/летнее размещение пока не подтверждено/);assert.match(await ridder.innerText(),/обратного трансфера/);
    await ridder.locator('a[href="#/places/oskemen-ridder"]').click();await page.waitForURL(/#\/places\/oskemen-ridder$/);await page.locator('.page-heading h1').waitFor();assert.equal(await page.locator('.journey-card').count(),1);
    assert.match(await page.locator('.journey-card summary').innerText(),/Риддер/);
    await go('places/oskemen-berel');assert.equal(await page.locator('.journey-card').count(),1);await page.locator('.journey-card summary').click();
    assert.match(await page.locator('.journey-stays').innerText(),/MUZ TAU/);assert.match(await page.locator('.journey-stays').innerText(),/три комнаты/);
    await go('places/oskemen-strelka');assert.equal(await page.locator('.journey-card').count(),0);
  });
  await check('Nature stays preserve private access, room distinctions and independent Korean adaptation',async()=>{
    await go('routes/ust-kamenogorsk');await page.locator('.journey-card summary').evaluateAll(nodes=>nodes.forEach(n=>n.parentElement.open=true));
    const river=page.locator('[data-journey="oskemen-journey-ulbinka"]');
    assert.match(await river.innerText(),/Территория частная/);assert.match(await river.innerText(),/последние 7 км/);assert.match(await river.innerText(),/зависит от тарифа/);
    assert.equal(await river.locator('a[href^="#/places/"]').count(),0);
    await page.locator('[data-language="ko"]').click();await page.locator('.journey-card summary').evaluateAll(nodes=>nodes.forEach(n=>n.parentElement.open=true));
    assert.doesNotMatch(await page.locator('.nature-journeys').innerText(),/[А-Яа-яЁё]|[\u2013\u2014]/);
    assert.match(await page.locator('[data-journey="oskemen-journey-katon"]').innerText(),/객실 내 샤워실과 화장실/);
    await page.locator('[data-journey="oskemen-journey-katon"] a[href="#/places/oskemen-katon"]').click();await page.waitForURL(/#\/places\/oskemen-katon$/);await page.locator('.page-heading h1').waitFor();assert.match(await page.locator('h1').innerText(),/카톤카라가이/);
    await page.locator('[data-language="ru"]').click();
    await go('destinations/almaty');assert.equal(await page.locator('.nature-journeys').count(),0);
  });
  await check('Expanded nature stays fit small screens without leaking research or making hotel attraction pages',async()=>{
    for(const lang of ['ru','ko']){
      await go('routes/ust-kamenogorsk');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
      for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});await page.locator('.journey-card summary').evaluateAll(nodes=>nodes.forEach(n=>n.parentElement.open=true));await noOverflow();}
    }
    const {oskemenContent}=await import('../assets/oskemen-data.js');assert.equal(oskemenContent.places.length,16);assert.equal(oskemenContent.journeys.length,3);
    const raw=await (await context.request.get(base+'/assets/oskemen-data.js')).text();assert.doesNotMatch(raw,/sourceIds|internalGaps|roomEvidence|publicationReady|checkedAt|https?:\/\/|\/Users\//);
    assert.deepEqual(failures,[]);await page.locator('[data-language="ru"]').click();
  });
  await page.setViewportSize({width:1280,height:900});await go('routes/ust-kamenogorsk');await page.locator('.journey-card').first().locator('summary').click();await page.screenshot({path:'test-results/oskemen-journeys-desktop.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/oskemen-journeys-mobile.png'});
  await page.setViewportSize({width:1280,height:900});await go('destinations/ust-kamenogorsk');await page.screenshot({path:'test-results/oskemen-desktop-viewport.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/oskemen-mobile-viewport.png'});
  await go('routes/ust-kamenogorsk');await page.locator('.itinerary-card').last().locator('summary').click();await page.screenshot({path:'test-results/oskemen-routes-mobile.png'});
  await page.setViewportSize({width:1280,height:900});await go('destinations/burabay');await page.screenshot({path:'test-results/burabay-desktop-viewport.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/burabay-mobile-viewport.png'});
  await go('routes/burabay');await page.locator('.itinerary-card').first().locator('summary').click();await page.screenshot({path:'test-results/burabay-routes-mobile.png'});
  await page.setViewportSize({width:1280,height:900});await go('destinations/aktau');await page.screenshot({path:'test-results/aktau-desktop-viewport.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/aktau-mobile-viewport.png'});
  await go('places/aktau-jeti');await page.screenshot({path:'test-results/aktau-jeti-mobile.png'});
  await page.setViewportSize({width:1280,height:900});await go('destinations/turkistan');await page.screenshot({path:'test-results/turkistan-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/turkistan-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:900});await go('destinations/astana');await page.screenshot({path:'test-results/astana-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/astana-mobile.png',fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:900});await go();await page.screenshot({path:'test-results/home-desktop.png',fullPage:true});await page.locator('#home-routes').screenshot({path:'test-results/home-map-desktop.png'});
  await go('places/kok-tobe');await page.screenshot({path:'test-results/kok-tobe-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await go('destinations/almaty');await page.screenshot({path:'test-results/almaty-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:900});await go('routes');await page.locator('#route-explorer').screenshot({path:'test-results/routes-map-desktop.png'});
  await page.setViewportSize({width:390,height:844});await go();await page.locator('#home-routes').screenshot({path:'test-results/home-map-mobile.png'});await go('routes');await page.locator('#route-explorer').screenshot({path:'test-results/routes-map-mobile.png'});
  process.stdout.write(`Completed ${count} acceptance checks.\n`);
} finally { await browser.close(); }
