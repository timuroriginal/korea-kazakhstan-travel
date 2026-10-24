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
  await check('All six destinations render on direct navigation and refresh',async()=>{for(const id of ['almaty','astana','aktau','ust-kamenogorsk','burabay','turkistan']){await go(`destinations/${id}`);assert.equal(await page.locator('#content h1').count(),1);assert.equal(await page.locator('#content .section').count(),id==='ust-kamenogorsk'?9:8);await page.reload();await page.locator('#content h1').waitFor();await noOverflow();}});
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
    await city.locator('[data-place-more]').click();assert.equal(await city.locator('.place-card').count(),42);
    await city.locator('[data-place-filter="culture"]').click();await city.locator('[data-place-search]').fill('базар');assert.equal(await city.locator('.place-card').count(),0);
    await city.locator('[data-place-filter="shopping"]').click();assert.equal(await city.locator('.place-card').count(),1);assert.match(await city.locator('h3').innerText(),/Зелёный/);
    await city.locator('[data-place-search]').fill('');await city.locator('[data-place-filter="all"]').click();assert.equal(await city.locator('.place-card').count(),6);
    const nearby=page.locator('[data-place-group="nearby"]');await nearby.locator('[data-place-search]').fill('Чарын');assert.equal(await nearby.locator('.place-card').count(),1);
    assert.equal(await page.locator('[data-place-id="almaty-medeu-visit-center"]').count(),0);
    await page.locator('[data-scroll="nearby"]').first().click();assert.match(page.url(),/#\/destinations\/almaty$/);
  });
  await check('All 102 place pages preserve internal research without public source furniture',async()=>{
    const {contentPlaces}=await import('../assets/content-pages.js');assert.equal(contentPlaces.length,102);assert.equal(contentPlaces.filter(p=>p.destination==='almaty').length,42);
    for(const p of contentPlaces){await go(`places/${p.id}`);assert.match(await page.locator('h1').innerText(),new RegExp(p.name.ru.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));assert.ok((await page.locator('#overview').innerText()).length>300);assert.equal(['aktau','burabay','ust-kamenogorsk'].includes(p.destination)||['almaty-tanbaly','astana-opera','astana-ballet'].includes(p.id)?p.sources.length===0:p.sources.length>0,true);assert.equal(await page.locator('#sources, .source-links, a[href*="2gis.kz"]').count(),0);await noOverflow();}
    // Audit rendered Almaty links, including local section targets and direct plans.
    const {guideContent}=await import('../assets/content-pages.js');
    const paths=new Set(['destinations','interests','routes','saved','about','prepare',...Object.keys(guideContent).flatMap(id=>['destinations/'+id,'routes/'+id]),...contentPlaces.map(p=>'places/'+p.id),...['entry','money','connection','transport','language','safety'].map(id=>'prepare/'+id)]);
    for(const p of contentPlaces.filter(p=>p.destination==='almaty')){
      await go('places/'+p.id);
      const links=await page.locator('#content a[href]').evaluateAll(nodes=>nodes.map(a=>({href:a.getAttribute('href'),scroll:a.dataset.scroll,localExists:a.dataset.scroll?Boolean(document.getElementById(a.dataset.scroll)):a.getAttribute('href').startsWith('#')&&!a.getAttribute('href').startsWith('#/')?Boolean(document.getElementById(a.getAttribute('href').slice(1))):true})));
      for(const link of links){assert.equal(link.localExists,true,p.id+': '+link.href);if(!link.href.startsWith('#/'))continue;const [path,query]=link.href.slice(2).split('?');assert.ok(paths.has(path)||path==='',p.id+': '+link.href);const target=new URLSearchParams(query||'').get('plan');if(target){assert.equal(path,'routes/almaty');assert.ok(guideContent.almaty.routes.some(r=>r.id===target),link.href);}}
    }
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
    await go('routes/almaty');await page.locator('.itinerary-card').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.doesNotMatch(await page.locator('.itinerary-grid').evaluate(el=>{const clone=el.cloneNode(true);clone.querySelectorAll('[lang=ru]').forEach(n=>n.remove());return clone.textContent}),/[А-Яа-яЁё]|[\u2013\u2014]/);
    for(const width of [320,390]){await page.setViewportSize({width,height:900});await noOverflow();await go('destinations/almaty');await noOverflow();}
    await page.locator('[data-language="ru"]').click();
  });
  await check('Almaty retains independent lake choices alongside new regional visits',async()=>{
    await go('routes/almaty');assert.equal(await page.locator('.itinerary-card').count(),6);await page.locator('[data-route-id="route-3d-kolsai"] summary').first().click();
    assert.equal(await page.locator('[data-route-id="route-3d-kolsai"]').locator('a[href="#/places/almaty-kolsai"]').count(),1);assert.equal(await page.locator('[data-route-id="route-3d-kolsai"]').locator('a[href="#/places/almaty-kaindy"]').count(),1);assert.doesNotMatch((await page.locator('.itinerary-card:not(.itinerary-day-plan)').allTextContents()).join(' '),/\b\d\d:\d\d\b/);
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
    await go('places/almaty-dostyk-plaza');assert.match(await page.locator('#overview').innerText(),/косметик/);assert.match(await page.locator('.address-box').innerText(),/111/);assert.match(await page.locator('.visit-guidance').innerText(),/Корейское обслуживание.*не подтвержден/);
    await go('places/almaty-esentai-mall');assert.match(await page.locator('#overview').innerText(),/люксовых/);assert.doesNotMatch(await page.locator('#overview').innerText(),/завершить.*кино|уточните|позвоните/);
    await go('routes/almaty');await page.locator('.itinerary-card').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.equal(await page.locator('.itinerary-grid a[href="#/places/almaty-abai-theatre"]').count(),0);
    await go('destinations/almaty');await page.locator('#stay details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.equal(await page.locator('#stay .show-phrase').count(),0);assert.match(await page.locator('#stay').innerText(),/перевод.*камер/);
    await page.locator('[data-language="ko"]').click();await page.locator('#stay details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.equal(await page.locator('#stay .show-phrase').count(),0);assert.match(await page.locator('#stay').innerText(),/카메라 번역/);await page.locator('[data-language="ru"]').click();
  });
  await check('Populated Almaty and long place names fit small screens',async()=>{
    for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});for(const r of ['destinations/almaty','places/almaty-kasteev-museum','routes/almaty']){await go(r);await noOverflow();}}
    assert.deepEqual(failures,[]);
  });
  await check('Astana catalog, seasons and nearby trips use their own data',async()=>{
    await go('destinations/astana');
    const all=page.locator('[data-place-group="all"]');
    assert.match(await all.locator('[data-place-count]').innerText(),/из 19/);
    assert.equal(await page.locator('.season-details details').count(),7);
    await all.locator('[data-place-filter="food"]').click();assert.equal(await all.locator('.place-card').count(),1);
    assert.match(await all.innerText(),/Daididau/);
    await all.locator('[data-place-filter="all"]').click();await all.locator('[data-place-search]').fill('Байтерек');
    assert.equal(await all.locator('[data-place-id="astana-baiterek"]').count(),1);
    assert.equal(await all.locator('[data-place-id^="almaty"]').count(),0);
    const nearby=page.locator('[data-place-group="nearby"]');assert.equal(await nearby.locator('.place-card').count(),3);
    assert.match(await nearby.locator('[data-place-id="astana-karlag"]').innerText(),/Дальний выезд/);
    assert.equal(await page.locator('#transport [data-practical-id]').count(),4);assert.equal(await page.locator('#stay details').count(),2);
  });
  await check('Astana places have correct breadcrumbs, unknown prices and no public source blocks',async()=>{
    const {contentPlaces}=await import('../assets/content-pages.js');
    for(const p of contentPlaces.filter(p=>p.destination==='astana')){
      await go(`places/${p.id}`);assert.equal(await page.locator('h1').innerText(),p.name.ru);
      assert.equal(await page.locator('.breadcrumbs a[href="#/destinations/astana"]').count(),1);
      assert.equal(await page.locator('.breadcrumbs a[href="#/destinations/almaty"]').count(),0);
      assert.equal(await page.locator('.page-heading .eyebrow').innerText().then(s=>s.startsWith('ASTANA')),true);
      assert.equal(await page.locator('#content a[href^="https://"]:not([data-visitor-action])').count(),0);
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
    await go('routes/astana');assert.equal(await page.locator('.itinerary-card').count(),7);
    await page.locator('.itinerary-card').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
    assert.equal(await page.locator('.itinerary-card a[href^="#/places/almaty"]').count(),0);
    assert.doesNotMatch(await page.locator('.itinerary-grid').evaluate(el=>{const copy=el.cloneNode(true);copy.querySelectorAll('[lang="ru"]').forEach(n=>n.remove());return copy.textContent;}),/[А-Яа-яЁё]|[\u2013\u2014]/);
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
    await go('places/astana-daididau');assert.match(await page.locator('#overview').innerText(),/семьи Димаша/);assert.doesNotMatch(await page.locator('.visit-facts').innerText(),/7 800|7800|Ulytau/);assert.match(await page.locator('.visit-guidance').innerText(),/английскими/);
    await go('places/astana-mega-silk-way');assert.match(await page.locator('#overview').innerText(),/EXPO/);assert.match(await page.locator('.address-box').innerText(),/62/);assert.match(await page.locator('.visit-facts').innerText(),/22:00/);
    await page.locator('[data-language="ko"]').click();
    for(const id of ['astana-daididau','astana-mega-silk-way']){await go('places/'+id);assert.doesNotMatch(await page.locator('#overview').innerText(),/[А-Яа-яЁё]|[\u2013\u2014]/);assert.equal(await page.locator('a[href*="2gis"]').count(),0);}
    await page.locator('[data-language="ru"]').click();
  });

  await check('Turkistan does not invent bundled tickets, addresses or return transport',async()=>{
    await go('places/turkistan-yasawi');assert.match(await page.locator('.visit-facts').innerText(),/2 000/);assert.match(await page.locator('.visit-facts').innerText(),/пока не установлен/);
    await go('places/turkistan-sandyq');assert.match(page.url(),/destinations\/turkistan/);
    await go('places/turkistan-otrar-reserve');assert.match(await page.locator('.visit-facts').innerText(),/Не подтверждено/);
    await go('routes/turkistan');assert.equal(await page.locator('.itinerary-card').count(),3);
    assert.equal(await page.locator('.itinerary-card .access-badge').count(),2);
    assert.equal(await page.locator('a[href*="otrar-museum-shaulder"]').count(),0);
  });

  await check('Turkistan pages fit small screens and retain specific language caveats',async()=>{
    for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});for(const route of ['destinations/turkistan','places/turkistan-sandyq','routes/turkistan']){await go(route);await noOverflow();}}
    await go('places/turkistan-khilvet');assert.match(await page.locator('.visit-guidance').innerText(),/Корейск/);assert.deepEqual(failures,[]);
  });
  await check('Aktau catalog separates coastal places, nature, food and reserves',async()=>{
    await go('destinations/aktau');const all=page.locator('[data-place-group="all"]');
    assert.match(await all.locator('[data-place-count]').innerText(),/из 10/);
    assert.equal(await page.locator('.season-details details').count(),4);
    await all.locator('[data-place-filter="water"]').click();assert.equal(await all.locator('.place-card').count(),2);
    assert.equal(await all.locator('[data-place-filter="food"]').count(),0);
    await all.locator('[data-place-filter="mountains"]').click();assert.equal(await all.locator('.place-card').count(),6);
    assert.equal(await all.locator('[data-place-id="aktau-sherkala"]').count(),1);assert.equal(await all.locator('[data-place-id="aktau-airakty"]').count(),1);
    for(const id of ['dostar-beach','regional-museum','shopan-ata','sultan-epe']){await go('places/aktau-'+id);assert.match(await page.locator('h1').innerText(),/Страница не найдена/);}
  });


  await check('Aktau mobile pages and long return guidance fit the viewport',async()=>{
    for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});for(const route of ['destinations/aktau','places/aktau-shakpak-ata','places/aktau-jeti','routes/aktau']){await go(route);await noOverflow();}}
    assert.deepEqual(failures,[]);
  });



  await check('Burabay fits mobile and its public module contains no research registry',async()=>{
    for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});for(const route of ['destinations/burabay','places/burabay-bolektau','places/burabay-byrabai','routes/burabay']){await go(route);await page.locator('.itinerary-card').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await noOverflow();}}
    const raw=await (await context.request.get(base+'/assets/burabay-data.js')).text();assert.doesNotMatch(raw,/sourceIds|internalGaps|provenance|checkedAt|https?:\/\/|\/Users\//);assert.deepEqual(failures,[]);
  });
  await check('Oskemen has fifteen profiles, eleven conditions, taxi-first topics and separate nearby filters',async()=>{
    await page.setViewportSize({width:1280,height:900});await go('destinations/ust-kamenogorsk');
    const all=page.locator('[data-place-group="all"]');assert.match(await all.locator('[data-place-count]').innerText(),/из 15/);
    assert.equal(await page.locator('.season-details details').count(),4);
    await all.locator('[data-place-more]').click();assert.equal(await all.locator('.place-card').count(),15);assert.equal(await all.locator('.access-badge').count(),11);
    await all.locator('[data-place-filter="culture"]').click();assert.equal(await all.locator('.place-card').count(),5);
    await all.locator('[data-place-search]').fill('этнодеревня');assert.equal(await all.locator('.place-card').count(),1);
    assert.equal(await page.locator('#transport [data-practical-id]').count(),8);assert.equal(await page.locator('#stay details').count(),2);
    const nearby=page.locator('[data-place-group="nearby"]');await nearby.locator('[data-place-more]').click();assert.equal(await nearby.locator('.place-card').count(),9);
    assert.equal(await nearby.locator('.place-card').filter({hasText:'Дальний выезд'}).count(),5);
    for(const id of ['oskemen-museum-kaisenov','oskemen-kiin-kerish','oskemen-rakhman']){await go('places/'+id);assert.match(await page.locator('h1').innerText(),/Страница не найдена/);}
  });

  await check('Oskemen itineraries preserve access flags and separate arrival, visit and return',async()=>{
    await go('routes/ust-kamenogorsk');assert.equal(await page.locator('.itinerary-card').count(),4);assert.equal(await page.locator('.itinerary-card .access-badge').count(),3);
    await page.locator('.itinerary-card').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));assert.equal(await page.locator('.route-transport').count(),4);
    const last=page.locator('.itinerary-card').last();assert.equal(await last.locator('.route-blocks > li').count(),3);assert.equal(await last.locator('.route-blocks h3').last().innerText(),'Отдельное возвращение');assert.doesNotMatch(await last.innerText(),/День 1/);
    assert.match(await last.innerText(),/Допуски и транспорт не подтверждены/);assert.match(await last.innerText(),/Стыковка с вылетом не включена/);
  });

  await check('Oskemen mobile pages fit and public data excludes private research and reserve candidates',async()=>{
    for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});for(const route of ['destinations/ust-kamenogorsk','places/oskemen-ethnopark','places/oskemen-qurt','routes/ust-kamenogorsk']){await go(route);await page.locator('.itinerary-card').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await noOverflow();}}
    const raw=await (await context.request.get(base+'/assets/oskemen-data.js')).text();assert.doesNotMatch(raw,/sourceIds|internalGaps|provenance|checkedAt|https?:\/\/|\/Users\/|oskemen-kiin-kerish|oskemen-rakhman/);assert.deepEqual(failures,[]);
  });
  await mkdir('test-results',{recursive:true});


  await check('Expanded nature stays fit small screens without leaking research or making hotel attraction pages',async()=>{
    for(const lang of ['ru','ko']){
      await go('routes/ust-kamenogorsk');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
      for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});await page.locator('.journey-card summary').evaluateAll(nodes=>nodes.forEach(n=>n.parentElement.open=true));await noOverflow();}
    }
    const {oskemenContent}=await import('../assets/oskemen-data.js');assert.equal(oskemenContent.places.length,16);assert.equal(oskemenContent.journeys.length,3);
    const raw=await (await context.request.get(base+'/assets/oskemen-data.js')).text();assert.doesNotMatch(raw,/sourceIds|internalGaps|roomEvidence|publicationReady|checkedAt|https?:\/\/|\/Users\//);
    assert.deepEqual(failures,[]);await page.locator('[data-language="ru"]').click();
  });
  await check('Taxi-first airport advice works in both languages and public transport stays secondary',async()=>{
    const ids=['almaty','astana','turkistan','aktau','ust-kamenogorsk'];
    for(const lang of ['ru','ko'])for(const id of ids){
      await go('destinations/'+id);if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
      const first=page.locator('#transport [data-practical-id]').first();await first.locator('summary').click();
      assert.match(await first.innerText(),/Yandex Go/);
      assert.match(await first.innerText(),lang==='ru'?/до подтверждения заказа/:/확정하기 전에/);
      assert.match(await first.innerText(),lang==='ru'?/ожидание/:/유료 대기/);
      assert.doesNotMatch(await first.innerText(),/в два|в три|фиксированная цена|고정 요금|두 배|세 배|[\u2013\u2014]/);
      if(lang==='ko')assert.doesNotMatch(await first.innerText(),/[А-Яа-яЁё]/);
      assert.doesNotMatch(await page.locator('#transport').textContent(),/inDrive/);
      if(['almaty','astana'].includes(id)){
        const alternative=page.locator('.transport-alternatives');assert.equal(await alternative.getAttribute('open'),null);
        await alternative.locator('summary').first().click();assert.ok(await alternative.locator('[data-practical-id]').count()>=2);
      }
      await noOverflow();
    }
    await go('destinations/burabay');await page.locator('[data-language="ru"]').click();
    const taxi=page.locator('[data-practical-id="visitor-taxi-burabay"]');await taxi.locator('summary').click();assert.match(await taxi.innerText(),/ожидание и возвращение/);assert.match(await page.locator('#transport').textContent(),/Щучинск/);
  });

  await check('Expanded airport advice and transport alternatives remain readable at 320 and 390 pixels',async()=>{
    for(const lang of ['ru','ko'])for(const width of [320,390]){
      await page.setViewportSize({width,height:844});await go('destinations/almaty');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
      await page.locator('#transport details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await noOverflow();
    }
    await page.locator('[data-language="ru"]').click();await page.locator('[data-scroll="transport"]').first().click();await page.screenshot({path:'test-results/taxi-first-mobile.png'});
    await page.setViewportSize({width:1280,height:900});await go('destinations/almaty');await page.locator('[data-practical-id="practical-airport-taxi"] summary').click();await page.locator('[data-scroll="transport"]').first().click();await page.screenshot({path:'test-results/taxi-first-desktop.png'});
    assert.deepEqual(failures,[]);
  });
  await check('Shared transport preparation connects all six cities in both languages',async()=>{
    const ids=['almaty','astana','aktau','turkistan','burabay','ust-kamenogorsk'];
    for(const lang of ['ru','ko']){
      for(const id of ids){
        await go('destinations/'+id);if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
        assert.equal(await page.locator('#transport [data-transport-preparation]').getAttribute('href'),'#/prepare/transport');
      }
      await page.locator('[data-transport-preparation]').click();await page.locator('[data-transport-guide]').waitFor();
      assert.equal(await page.locator('[data-transport-guide] ol.steps > li').count(),4);
      assert.equal(await page.locator('[data-transport-guide] .chips a').count(),6);
      await page.locator('[data-transport-guide] details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
      const body=await page.locator('[data-transport-guide]').innerText();
      assert.match(body,lang==='ru'?/наличными/:/현금/);
      assert.match(body,lang==='ru'?/корейским номером/:/한국 전화번호/);
      assert.match(body,lang==='ru'?/ещё не проверены/:/아직 확인되지/);
      assert.match(body,lang==='ru'?/не включает автоматически ожидание и возвращение/:/대기와 귀환이 자동으로 포함되지는/);
      assert.doesNotMatch(body,/[\u2013\u2014]|2ГИС|по отзывам|источники|출처/);
      if(lang==='ko')assert.doesNotMatch(body,/[А-Яа-яЁё]/);
      const download=page.locator('[data-transport-guide] a[target="_blank"]');
      assert.equal(await download.getAttribute('href'),'https://go.yandex/ru_kz/');
      assert.match(await download.getAttribute('rel'),/noopener/);
    }
  });
  await check('Transport preparation supports keyboard disclosures and narrow screens',async()=>{
    for(const lang of ['ru','ko'])for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:900});await go('prepare/transport');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
      await page.locator('[data-transport-guide] details').evaluateAll(nodes=>nodes.forEach(n=>n.open=false));const first=page.locator('[data-transport-guide] details').first();await first.locator('summary').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('[data-transport-guide] details').open);assert.equal(await first.getAttribute('open'),'');
      await page.locator('[data-transport-guide] details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await noOverflow();
      if(width===390)await page.screenshot({path:`test-results/transport-guide-${lang}-mobile.png`,fullPage:true});
      if(width===1280&&lang==='ru')await page.screenshot({path:'test-results/transport-guide-desktop.png',fullPage:true});
    }
    await page.locator('[data-language="ru"]').click();assert.deepEqual(failures,[]);
  });
  await check('Almaty first day is a compact walk with a meal, Monday alternative and return',async()=>{
    for(const lang of ['ru','ko']){
      await go('routes/almaty');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
      const card=page.locator('[data-route-id="route-1d"]');await card.locator('summary').first().click();
      assert.deepEqual(await card.locator('.steps > li > a').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href'))),['#/places/almaty-panfilov-park','#/places/almaty-green-bazaar','#/places/almaty-arbat']);
      assert.equal(await card.locator('a[href="#/places/kok-tobe"],a[href="#/places/almaty-central-museum"]').count(),0);
      assert.equal(await card.locator('.fact-grid > div').count(),3);
      await card.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
      const body=await card.innerText();assert.match(body,lang==='ru'?/Если это понедельник/:/월요일이라면/);
      assert.match(body,lang==='ru'?/Возвращение/:/귀환/);assert.match(body,lang==='ru'?/Ночёвка/:/숙박/);assert.doesNotMatch(body,/NAVAT/);
      assert.match(body,lang==='ru'?/проезжей улицы/:/차량 접근/);assert.doesNotMatch(body,/[\u2013\u2014]|2ГИС|по отзывам|источники|출처/);
      assert.equal(await card.locator('button[data-copy*="58А"]').count(),0);
      await card.locator('a[href="#/prepare/transport"]').click();await page.locator('[data-transport-guide]').waitFor();
      await go('destinations/almaty');assert.equal(await page.locator('#itinerary [data-route-id="route-1d"] [data-day-plan]').count(),1);
    }
  });
  await check('Almaty first day disclosures fit mobile screens and open with the keyboard',async()=>{
    for(const lang of ['ru','ko'])for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:900});await go('routes/almaty');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
      const card=page.locator('[data-route-id="route-1d"]');await card.evaluate(n=>n.open=false);await card.locator('summary').first().focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('[data-route-id="route-1d"]').open);
      await card.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await noOverflow();
      if(width===390)await page.screenshot({path:`test-results/almaty-first-day-${lang}-mobile.png`,fullPage:true});
      if(width===1280&&lang==='ru')await page.screenshot({path:'test-results/almaty-first-day-desktop.png',fullPage:true});
    }
    await page.locator('[data-language="ru"]').click();assert.deepEqual(failures,[]);
  });
  await check('Mountain day separates Medeu station, full ticket, optional summit area and safe return planning',async()=>{
    for(const lang of ['ru','ko']){
      await go('routes/almaty');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
      const card=page.locator('[data-route-id="route-3d"]');await card.locator('summary').first().click();
      assert.equal(await card.locator('[data-day-plan] .steps > li').count(),3);
      assert.equal(await card.locator('a[href="#/places/almaty-medeu-sports-complex"]').count(),0);
      await card.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
      const body=await card.innerText();assert.match(body,/3200|3,200/);assert.match(body,/12 000|12,000/);assert.match(body,/4 000|4,000/);assert.match(body,/15:00/);
      assert.match(body,/2026/);assert.match(body,lang==='ru'?/[Сс] 19 октября по 1 ноября/:/10월 19일부터 11월 1일까지/);
      assert.match(body,lang==='ru'?/не вершина|не.*вершина/:/산 정상/);assert.match(body,lang==='ru'?/ККД-4/:/KKD-4/);
      assert.match(body,lang==='ru'?/перевод.*камер/:/카메라 번역/);assert.match(body,lang==='ru'?/Ночёвка/:/숙박/);
      assert.doesNotMatch(body,/[\u2013\u2014]|по отзывам|2ГИС|출처/);
      assert.equal(await card.locator('button[data-copy*="Shymbulak Ticket"]').count(),0);assert.match(body,/Shymbulak Ticket/);
      await go('places/almaty-shymbulak');const place=await page.locator('#content').innerText();assert.doesNotMatch(place,/технических работ до 18|18일까지 단계별 정비/);assert.match(place,/12 000|12,000/);assert.match(place,/Комби-2|콤비 2/);
      assert.match(await page.locator('.address-box button').getAttribute('data-copy'),/Базовая станция/);
    }
  });
  await check('Mountain day and place fit small screens and preserve first-day content',async()=>{
    for(const lang of ['ru','ko'])for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:900});await go('routes/almaty');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
      const card=page.locator('[data-route-id="route-3d"]');await card.evaluate(n=>n.open=false);await card.locator('summary').first().focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('[data-route-id="route-3d"]').open);
      await card.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await noOverflow();
      if(width===390)await card.screenshot({path:`test-results/almaty-mountain-day-${lang}-mobile.png`});
      if(width===1280&&lang==='ru')await card.screenshot({path:'test-results/almaty-mountain-day-desktop.png'});
      await go('places/almaty-shymbulak');await noOverflow();
    }
    await page.locator('[data-language="ru"]').click();assert.deepEqual(failures,[]);
  });
  await check('Charyn day explains both walking options, a real return requirement and foreign-visitor limits',async()=>{
    for(const lang of ['ru','ko']){
      await go('routes/almaty');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
      const card=page.locator('[data-route-id="route-3d-charyn"]');await card.locator('summary').first().click();
      assert.equal(await card.locator('.steps > li').count(),3);
      assert.deepEqual(await card.locator('.steps > li > a').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href'))),Array(3).fill('#/places/almaty-charyn'));
      await card.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
      const body=await card.innerText();assert.match(body,lang==='ru'?/шести километров/:/왕복 약 6km/);
      assert.match(body,lang==='ru'?/развернуться раньше/:/중간에서 돌아/);assert.match(body,lang==='ru'?/лестниц/:/계단/);
      assert.match(body,lang==='ru'?/не включены в план/:/포함하지 않/);assert.match(body,lang==='ru'?/Обычный|Односторонний/:/편도/);
      assert.match(body,lang==='ru'?/Корейский гид.*не подтверждены/:/한국어 가이드.*확인되지/);
      assert.match(body,lang==='ru'?/Кольсай и Каинды оставляем/:/콜사이와 카인디는 별도/);
      assert.doesNotMatch(body,/[\u2013\u2014]|2ГИС|по отзывам|источники|출처/);
      const copy=card.locator('button[data-copy*="Визит-центр Чарын"]');assert.equal(await copy.count(),1);assert.doesNotMatch(await copy.innerText(),/станции|승강장/);await copy.click();await page.locator('#toast:not([hidden])').waitFor();
      await go('places/almaty-charyn');const place=await page.locator('#content').innerText();assert.match(place,lang==='ru'?/около трёх километров в одну сторону/:/편도 약 3km/);
      assert.match(await page.locator('#transport').innerText(),lang==='ru'?/возвращени|Возвращение/:/귀환|복귀/);assert.match(await page.locator('.address-box button').getAttribute('data-copy'),/Визит-центр Чарын/);
      assert.doesNotMatch(place,/2ч.45|346,2|Кыдырбаева/);
      await go('destinations/almaty');assert.equal(await page.locator('#itinerary [data-route-id="route-3d-charyn"] [data-day-plan]').count(),1);
    }
  });
  await check('Charyn disclosures work by keyboard and fit mobile screens without changing other Almaty days',async()=>{
    for(const lang of ['ru','ko'])for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:900});await go('routes/almaty');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
      assert.equal(await page.locator('.itinerary-card').count(),6);
      const card=page.locator('[data-route-id="route-3d-charyn"]');await card.evaluate(n=>n.open=false);await card.locator('summary').first().focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('[data-route-id="route-3d-charyn"]').open);
      await card.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await noOverflow();
      if(width===390)await card.screenshot({path:`test-results/charyn-day-${lang}-mobile.png`});
      if(width===1280&&lang==='ru')await card.screenshot({path:'test-results/charyn-day-desktop.png'});
      await go('places/almaty-charyn');await noOverflow();
    }
    await page.locator('[data-language="ru"]').click();assert.deepEqual(failures,[]);
  });
  await check('Lake choices remain independent and offer overnight only as an option in both languages',async()=>{
    for(const lang of ['ru','ko']){
      await go('routes/almaty');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
      const card=page.locator('[data-route-id="route-3d-kolsai"]');await card.locator('summary').first().click();
      assert.match(await card.locator('summary').first().innerText(),lang==='ru'?/Два самостоятельных направления/i:/각각 선택하는 두 여행지/);
      assert.deepEqual(await card.locator('.steps > li > a').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href'))),['#/places/almaty-kolsai','#/places/almaty-kaindy']);
      assert.equal(await card.locator('.steps-pair > li').count(),2);
      await card.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
      const body=await card.innerText();assert.match(body,lang==='ru'?/а не обязательная последовательность/:/모두 가야 하는 코스가 아닙니다/);
      assert.match(body,lang==='ru'?/собственной ванной/:/전용 욕실/);assert.match(body,lang==='ru'?/Ночёвка не включает/:/숙박에/);
      assert.match(body,lang==='ru'?/ни обязательный УАЗ/:/반드시 UAZ/);assert.match(body,lang==='ru'?/асфальтированную дорогу/:/아스팔트 도로/);
      assert.match(body,lang==='ru'?/возвращение/:/귀환/);assert.match(body,lang==='ru'?/Купание запрещено/:/수영은 금지/);
      assert.doesNotMatch(body,/[\u2013\u2014]|2ГИС|по отзывам|источники|출처/);
      for(const id of ['almaty-kolsai','almaty-kaindy']){
        await go('places/'+id);const stay=page.locator('#stay [data-stay-option]');assert.equal(await stay.count(),1);await stay.locator('summary').click();assert.doesNotMatch(await stay.innerText(),/Saty-Kolsay/);assert.match(await stay.innerText(),lang==='ru'?/Жильё в Саты/:/사티 숙소/);
        assert.match(await page.locator('#transport').innerText(),lang==='ru'?/возвращени|Возвращение/:/귀환|복귀/);
        assert.match(await page.locator('.address-box button').getAttribute('data-copy'),id==='almaty-kolsai'?/Нижнее Кольсайское/:/Озеро Каинды/);
        assert.doesNotMatch(await page.locator('#overview').innerText(),/только на УАЗ|только внедорожник|반드시 UAZ/);
      }
      await go('destinations/almaty');assert.equal(await page.locator('#itinerary [data-route-id="route-3d-kolsai"] .steps-pair > li').count(),2);
    }
  });
  await check('Lake options and both place pages fit mobile screens and support keyboard controls',async()=>{
    for(const lang of ['ru','ko'])for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:900});await go('routes/almaty');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
      assert.equal(await page.locator('.itinerary-card').count(),6);
      const card=page.locator('[data-route-id="route-3d-kolsai"]');await card.evaluate(n=>n.open=false);await card.locator('summary').first().focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('[data-route-id="route-3d-kolsai"]').open);
      await card.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await noOverflow();
      if(width===390)await card.screenshot({path:`test-results/lakes-pair-${lang}-mobile.png`});
      if(width===1280&&lang==='ru')await card.screenshot({path:'test-results/lakes-pair-desktop.png'});
      for(const id of ['almaty-kolsai','almaty-kaindy']){await go('places/'+id);const stay=page.locator('#stay details');await stay.evaluate(n=>n.open=false);await stay.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await stay.getAttribute('open'),'');await noOverflow();}
    }
    await page.locator('[data-language="ru"]').click();assert.deepEqual(failures,[]);
  });
  await check('Almaty overview connects six visit types, realistic day budgets and optional lodging',async()=>{
    for(const lang of ['ru','ko']){
      await go('destinations/almaty');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
      const hub=page.locator('[data-almaty-planning]');assert.equal(await hub.locator('[data-planning-choice]').count(),6);
      assert.deepEqual(await hub.locator('[data-planning-choice] a').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href'))),['route-1d','route-3d','route-3d-charyn','route-3d-kolsai','almaty-tanbaly-visit','almaty-altyn-emel-visit'].map(id=>'#/routes/almaty?plan='+id));
      await hub.locator('[data-duration-options] summary').click();const body=await hub.innerText();assert.match(body,lang==='ru'?/Пять или шесть дней/:/5~6일/);assert.match(body,lang==='ru'?/без учёта ваших рейсов/:/항공편 시간은 반영하지/);assert.match(body,lang==='ru'?/Готовый перевозчик пока не подобран/:/운송편은 아직 선정되지/);assert.doesNotMatch(body,/[\u2013\u2014]|2ГИС|по отзывам|출처/);
      await page.locator('[data-practical-id="practical-stay-center"] summary').click();assert.match(await page.locator('[data-practical-id="practical-stay-center"]').innerText(),lang==='ru'?/менять отель не обязательно/:/숙소를 옮길 필요는 없습니다/);
      await hub.locator('[data-scroll="transport"]').click();assert.match(page.url(),/#\/destinations\/almaty$/);assert.ok(await page.locator('#transport').isVisible());
    }
  });
  await check('Direct Almaty plans open on navigation, reload and language switch and link from eight places',async()=>{
    const {guideContent}=await import('../assets/content-pages.js');
    for(const choice of guideContent.almaty.planning.choices){
      await go('destinations/almaty');if(await page.locator('html').getAttribute('lang')!=='ru')await page.locator('[data-language="ru"]').click();await page.locator(`[data-planning-choice="${choice.id}"] a`).click();
      const card=page.locator(`[data-route-id="${choice.routeId}"]`);await page.locator(`[data-route-id="${choice.routeId}"][open]`).waitFor();assert.equal(await card.getAttribute('open'),'');assert.equal(await page.locator('.itinerary-card[open]').count(),1);assert.match(page.url(),new RegExp('plan='+choice.routeId));
      await page.reload();await page.locator('h1').waitFor();assert.equal(await card.getAttribute('open'),'');
      await page.locator('[data-language="ko"]').click();assert.equal(await card.getAttribute('open'),'');assert.match(page.url(),new RegExp('plan='+choice.routeId));await page.locator('[data-language="ru"]').click();
    }
    const linked=guideContent.almaty.places.filter(p=>p.planLink);assert.equal(linked.length,10);
    for(const p of linked){await go('places/'+p.id);assert.equal(await page.locator('[data-place-plan]').getAttribute('href'),'#/routes/almaty?plan='+p.planLink.routeId);await page.locator('[data-place-plan]').click();await page.locator(`[data-route-id="${p.planLink.routeId}"][open]`).waitFor();assert.equal(await page.locator(`[data-route-id="${p.planLink.routeId}"]`).getAttribute('open'),'');}
    await go('routes/almaty?plan=unknown');assert.equal(await page.locator('.itinerary-card[open]').count(),0);assert.equal(await page.locator('.itinerary-card').count(),6);
    await go('routes/astana?plan=route-1d');assert.equal(await page.locator('[data-almaty-planning]').count(),0);assert.doesNotMatch(await page.locator('h1').innerText(),/Алматы/);
  });
  await check('Almaty planning stays usable with keyboard and at mobile widths',async()=>{
    for(const lang of ['ru','ko'])for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:900});await go('destinations/almaty');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
      const hub=page.locator('[data-almaty-planning]');const summary=hub.locator('[data-duration-options] summary');await summary.focus();await page.keyboard.press('Enter');assert.equal(await hub.locator('[data-duration-options]').getAttribute('open'),'');await noOverflow();
      if(width===390)await hub.screenshot({path:`test-results/almaty-cohesion-${lang}-mobile.png`});if(width===1280&&lang==='ru')await hub.screenshot({path:'test-results/almaty-cohesion-desktop.png'});
      const first=hub.locator('[data-planning-choice="city"] a');await first.focus();await page.keyboard.press('Enter');await page.waitForURL(/plan=route-1d/);await page.locator('[data-route-id="route-1d"][open]').waitFor();await noOverflow();assert.equal(await page.locator('[data-route-id="route-1d"] > summary').evaluate(el=>el===document.activeElement),true);
    }
    await page.locator('[data-language="ru"]').click();assert.deepEqual(failures,[]);
  });
  await page.setViewportSize({width:1280,height:900});await go('routes/ust-kamenogorsk');await page.locator('.journey-card').first().locator('summary').click();await page.screenshot({path:'test-results/oskemen-journeys-desktop.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/oskemen-journeys-mobile.png'});
  await page.setViewportSize({width:1280,height:900});await go('destinations/ust-kamenogorsk');await page.screenshot({path:'test-results/oskemen-desktop-viewport.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/oskemen-mobile-viewport.png'});
  await go('routes/ust-kamenogorsk');await page.locator('.itinerary-card').last().locator('summary').first().click();await page.screenshot({path:'test-results/oskemen-routes-mobile.png'});
  await page.setViewportSize({width:1280,height:900});await go('destinations/burabay');await page.screenshot({path:'test-results/burabay-desktop-viewport.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/burabay-mobile-viewport.png'});
  await go('routes/burabay');await page.locator('.itinerary-card').first().locator(':scope > summary').click();await page.screenshot({path:'test-results/burabay-routes-mobile.png'});
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
  await check('Calm language help replaces dialogue scripts across six destinations in RU and KO',async()=>{
    for(const lang of ['ru','ko']){
      for(const city of ['almaty','astana','turkistan','aktau','burabay','ust-kamenogorsk']){
        await go(`destinations/${city}`);if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
        await page.locator('#stay details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
        assert.equal(await page.locator('#stay .show-phrase').count(),0);assert.equal(await page.locator('#stay [data-language-help]').count(),1);
        assert.doesNotMatch(await page.locator('#stay').innerText(),/Копировать фразу|문구 복사|100 граммов, пожалуйста|Какое мясо в этом блюде|готовая фраза/);
      }
      await go('routes/almaty');await page.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
      const body=await page.locator('#content').innerText();assert.doesNotMatch(body,/Вот это блюдо|Копировать фразу|문구 복사|아래 문구/);assert.doesNotMatch(body,/NAVAT/);assert.match(body,/Shymbulak Ticket/);
      assert.equal(await page.locator('[data-route-id="route-1d"] button[data-copy*="58А"]').count(),0);
      await go('places/astana-daididau');assert.equal(await page.locator('.dish-suggestions').count(),0);
    }
    await go('routes/almaty?plan=route-1d');if(await page.locator('html').getAttribute('lang')!=='ru')await page.locator('[data-language="ru"]').click();
    await page.locator('[data-route-id="route-1d"] details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await page.setViewportSize({width:390,height:844});await noOverflow();await page.screenshot({path:'test-results/calm-language-ru-mobile.png',fullPage:true});
    await page.setViewportSize({width:1280,height:900});
  });
  await check('Astana overview links city days and a cultural evening while keeping distant visits conditional',async()=>{
    const{guideContent}=await import('../assets/content-pages.js');const d=guideContent.astana;
    assert.equal(d.places.length,19);assert.equal(new Set(d.routes.map(r=>r.id)).size,7);assert.equal(d.routes.filter(r=>r.dayPlan).length,5);
    for(const lang of ['ru','ko']){
      await go('destinations/astana');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
      const hub=page.locator('[data-astana-planning]');assert.equal(await hub.locator('[data-planning-choice]').count(),5);
      assert.equal(await hub.locator('a[href^="#/routes/astana?plan="]').count(),5);assert.equal(await hub.locator('a[href^="#/routes/almaty"]').count(),0);
      await hub.locator('[data-duration-options] summary').click();assert.match(await hub.innerText(),lang==='ru'?/Два дня/:/2일/);
      await go('routes/astana');assert.equal(await page.locator('.itinerary-day-plan').count(),5);await page.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
      assert.match(await page.locator('[data-route-id="astana-third-alzhir"]').innerText(),lang==='ru'?/Обратный транспорт не подготовлен/:/귀환 교통편 미준비/);
      assert.match(await page.locator('[data-route-id="astana-third-nature"]').innerText(),lang==='ru'?/Допуски и транспорт не подтверждены/:/출입 조건과 교통편 미확인/);
      assert.match(await page.locator('[data-route-id="astana-second-day"]').innerText(),lang==='ru'?/понедельник/:/월요일/);
      assert.equal(await page.locator('[data-route-id="astana-south-option"] .steps a[href="#/places/astana-singularity"]').count(),0);
      assert.equal(await page.locator('[data-route-id="astana-south-option"] .steps a[href="#/places/astana-grand-mosque"]').count(),0);
      assert.doesNotMatch(await page.locator('.itinerary-grid').innerText(),/Копировать фразу|문구 복사|[\u2013\u2014]/);
    }
  });
  await check('Astana choices open the exact plan through reload, language switch and all linked places',async()=>{
    const{guideContent}=await import('../assets/content-pages.js');const d=guideContent.astana;
    for(const c of d.planning.choices){
      await go('destinations/astana');if(await page.locator('html').getAttribute('lang')!=='ru')await page.locator('[data-language="ru"]').click();
      await page.locator(`[data-astana-planning] [data-planning-choice="${c.id}"] a`).click();const card=page.locator(`[data-route-id="${c.routeId}"][open]`);await card.waitFor();
      await page.reload();await card.waitFor();await page.locator('[data-language="ko"]').click();await card.waitFor();assert.match(page.url(),new RegExp('plan='+c.routeId));
    }
    for(const p of d.places.filter(p=>p.planLink)){await go('places/'+p.id);await page.locator('[data-place-plan]').click();await page.locator(`[data-route-id="${p.planLink.routeId}"][open]`).waitFor();}
    assert.equal(d.places.filter(p=>p.planLink).length,16);await go('routes/astana?plan=unknown');assert.equal(await page.locator('.itinerary-card[open]').count(),0);
  });
  await check('Astana day cards work on mobile and by keyboard in both languages',async()=>{
    for(const lang of ['ru','ko'])for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:900});await go('destinations/astana');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();await noOverflow();
      const hub=page.locator('[data-astana-planning]');if(width===390)await hub.screenshot({path:`test-results/astana-planning-${lang}-mobile.png`});
      const link=hub.locator('[data-planning-choice="center"] a');await link.focus();await page.keyboard.press('Enter');await page.locator('[data-route-id="astana-one-day"][open]').waitFor();
      await page.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await noOverflow();assert.equal(await page.locator('[data-route-id="astana-one-day"] button[data-copy*="Конаев"]').count(),1);
      if(width===1280&&lang==='ru')await page.screenshot({path:'test-results/astana-day-desktop.png'});
    }
    await page.setViewportSize({width:1280,height:900});assert.deepEqual(failures,[]);
  });

  await check('Turkistan choices and eight place links preserve selected plan through reload and language change',async()=>{
    const{guideContent}=await import('../assets/content-pages.js');const d=guideContent.turkistan;
    for(const c of d.planning.choices){await go('destinations/turkistan');await page.locator(`[data-turkistan-planning] [data-planning-choice="${c.id}"] a`).click();const card=page.locator(`[data-route-id="${c.routeId}"][open]`);await card.waitFor();await page.reload();await card.waitFor();const lang=await page.locator('html').getAttribute('lang');await page.locator(`[data-language="${lang==='ru'?'ko':'ru'}"]`).click();await card.waitFor();}
    for(const p of d.places.filter(p=>p.planLink)){await go('places/'+p.id);await page.locator('[data-place-plan]').click();await page.locator(`[data-route-id="${p.planLink.routeId}"][open]`).waitFor();}
    assert.equal(d.places.filter(p=>p.planLink).length,7);await go('routes/turkistan?plan=unknown');assert.equal(await page.locator('.itinerary-card[open]').count(),0);
    await go('places/turkistan-sandyq');assert.equal(await page.locator('[data-place-plan]').count(),0);assert.equal(await page.locator('.address-box button').count(),0);
  });
  await check('Turkistan plans fit mobile screens and open using the keyboard',async()=>{
    for(const lang of ['ru','ko'])for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:900});await go('destinations/turkistan');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();const hub=page.locator('[data-turkistan-planning]');await noOverflow();
      if(width===390)await hub.screenshot({path:`test-results/turkistan-planning-${lang}-mobile.png`});const link=hub.locator('[data-planning-choice="city"] a');await link.focus();await page.keyboard.press('Enter');await page.locator('[data-route-id="turkistan-city-day"][open]').waitFor();await page.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await noOverflow();
      if(width===1280&&lang==='ru')await page.screenshot({path:'test-results/turkistan-day-desktop.png'});
    }
    await page.setViewportSize({width:1280,height:900});assert.deepEqual(failures,[]);
  });
  await check('Aktau separates a city day, two day-trip choices and a conditional overnight in RU and KO',async()=>{
    const{guideContent}=await import('../assets/content-pages.js');const d=guideContent.aktau;
    assert.equal(d.places.length,10);assert.equal(new Set(d.routes.map(r=>r.id)).size,4);assert.equal(d.routes.filter(r=>r.dayPlan).length,1);
    for(const lang of ['ru','ko']){
      await go('destinations/aktau');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();const hub=page.locator('[data-aktau-planning]');assert.equal(await hub.locator('[data-planning-choice]').count(),4);assert.equal(await hub.locator('a[href^="#/routes/aktau?plan="]').count(),4);
      await go('routes/aktau?plan=aktau-route-city');const city=page.locator('[data-route-id="aktau-route-city"][open]');await city.waitFor();await city.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
      assert.equal(await city.locator('.steps > li').count(),1);assert.equal(await city.locator('button[data-copy*="181"]').count(),0);assert.match(await city.innerText(),lang==='ru'?/Купание|купание/:/해수욕/);assert.doesNotMatch(await city.innerText(),/Копировать фразу|문구 복사|[\u2013\u2014]/);
      const two=page.locator('[data-route-id="aktau-route-two-days"]');await two.locator('summary').first().click();const body=await two.innerText();assert.match(body,lang==='ru'?/Ночёвка и полный выезд не подготовлены/:/숙박과 전체 차량 일정 미준비/);assert.match(body,lang==='ru'?/собственные душ и туалет/:/전용 샤워실, 화장실/);assert.match(body,lang==='ru'?/Такой номер ещё не выбран/:/아직 선정하지/);assert.equal(await two.locator('.route-blocks > li').count(),2);
      for(const id of ['aktau-route-north','aktau-route-bozzhyra-day'])assert.equal(await page.locator(`[data-route-id="${id}"] .access-badge`).count(),1);
      assert.equal(await page.locator('[data-route-id="aktau-route-bozzhyra-day"] a[href="#/places/aktau-tuzbair"]').count(),0);
    }
  });
  await check('All four Aktau choices and nine place links open matching plans through reload and language change',async()=>{
    const{guideContent}=await import('../assets/content-pages.js');const d=guideContent.aktau;
    for(const c of d.planning.choices){await go('destinations/aktau');await page.locator(`[data-aktau-planning] [data-planning-choice="${c.id}"] a`).click();const card=page.locator(`[data-route-id="${c.routeId}"][open]`);await card.waitFor();await page.reload();await card.waitFor();const lang=await page.locator('html').getAttribute('lang');await page.locator(`[data-language="${lang==='ru'?'ko':'ru'}"]`).click();await card.waitFor();}
    const linked=d.places.filter(p=>p.planLink);assert.equal(linked.length,8);for(const p of linked){await go('places/'+p.id);await page.locator('[data-place-plan]').click();await page.locator(`[data-route-id="${p.planLink.routeId}"][open]`).waitFor();}
    await go('routes/aktau?plan=unknown');assert.equal(await page.locator('.itinerary-card[open]').count(),0);await go('places/aktau-rock-trail');assert.match(await page.locator('.page-heading').innerText(),/Сквозной проход|전체 구간/);
  });
  await check('Aktau plans and overnight conditions fit mobile and keyboard navigation in both languages',async()=>{
    for(const lang of ['ru','ko'])for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:900});await go('destinations/aktau');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();await noOverflow();const hub=page.locator('[data-aktau-planning]');if(width===390)await hub.screenshot({path:`test-results/aktau-planning-${lang}-mobile.png`});
      const link=hub.locator('[data-planning-choice="two-days"] a');await link.focus();await page.keyboard.press('Enter');await page.locator('[data-route-id="aktau-route-two-days"][open]').waitFor();await noOverflow();if(width===1280&&lang==='ru')await page.screenshot({path:'test-results/aktau-plans-desktop.png'});
    }
    await page.setViewportSize({width:1280,height:900});assert.deepEqual(failures,[]);
  });

  await check('Burabay choices and eight place links preserve the chosen plan across reload and language changes',async()=>{
    const{guideContent}=await import('../assets/content-pages.js');const d=guideContent.burabay;
    for(const c of d.planning.choices){await go('destinations/burabay');await page.locator(`[data-burabay-planning] [data-planning-choice="${c.id}"] a`).click();const card=page.locator(`[data-route-id="${c.routeId}"][open]`);await card.waitFor();await page.reload();await card.waitFor();const lang=await page.locator('html').getAttribute('lang');await page.locator(`[data-language="${lang==='ru'?'ko':'ru'}"]`).click();await card.waitFor();}
    const linked=d.places.filter(p=>p.planLink);assert.equal(linked.length,6);for(const p of linked){await go('places/'+p.id);await page.locator('[data-place-plan]').click();await page.locator(`[data-route-id="${p.planLink.routeId}"][open]`).waitFor();}
    await go('routes/burabay?plan=unknown');assert.equal(await page.locator('.itinerary-card[open]').count(),0);
    await go('places/burabay-ybyrai-trail');assert.equal(await page.locator('[data-place-plan]').count(),0);assert.match(await page.locator('.visit-facts').innerText(),/конечной точки|목적지까지/);await go('places/burabay-baitas');assert.match(page.url(),/destinations\/burabay/);
  });
  await check('Burabay plans and room conditions fit mobile screens and keyboard navigation in RU and KO',async()=>{
    for(const lang of ['ru','ko'])for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:900});await go('destinations/burabay');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();await noOverflow();const hub=page.locator('[data-burabay-planning]');if(width===390)await hub.screenshot({path:`test-results/burabay-planning-${lang}-mobile.png`});
      const link=hub.locator('[data-planning-choice="two-days"] a');await link.focus();await page.keyboard.press('Enter');const card=page.locator('[data-route-id="burabay-two-days"][open]');await card.waitFor();const summary=card.locator('[data-stay-option] summary');await summary.focus();await page.keyboard.press('Enter');await noOverflow();if(width===1280&&lang==='ru')await page.screenshot({path:'test-results/burabay-plans-desktop.png'});
    }
    await page.setViewportSize({width:1280,height:900});assert.deepEqual(failures,[]);
  });

  await check('Six Oskemen choices target the exact visit or existing nature stay across reload and language switch',async()=>{
    const{guideContent}=await import('../assets/content-pages.js');const d=guideContent['ust-kamenogorsk'];const target=id=>id.includes('-journey-')?`[data-journey="${id}"][open]`:`[data-route-id="${id}"][open]`;
    for(const c of d.planning.choices){await go('destinations/ust-kamenogorsk');await page.locator(`[data-planning-choice="${c.id}"] a`).click();const card=page.locator(target(c.routeId));await card.waitFor();await page.reload();await card.waitFor();const lang=await page.locator('html').getAttribute('lang');await page.locator(`[data-language="${lang==='ru'?'ko':'ru'}"]`).click();await card.waitFor();}
    const linked=d.places.filter(p=>p.planLink);assert.equal(linked.length,8);for(const p of linked){await go('places/'+p.id);await page.locator('[data-place-plan]').click();await page.locator(target(p.planLink.routeId)).waitFor();}
    await go('routes/ust-kamenogorsk?plan=unknown');assert.equal(await page.locator('.itinerary-card[open],.journey-card[open]').count(),0);await go('routes/burabay?plan=oskemen-journey-ridder');assert.equal(await page.locator('.itinerary-card[open],.journey-card[open]').count(),0);
  });
  await check('Oskemen city and private nature-stay choices work by keyboard and fit narrow screens',async()=>{
    for(const lang of ['ru','ko'])for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:900});await go('destinations/ust-kamenogorsk');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();const hub=page.locator('[data-destination-planning="ust-kamenogorsk"]');await noOverflow();if(width===390)await hub.screenshot({path:`test-results/oskemen-planning-${lang}-mobile.png`});
      const link=hub.locator('[data-planning-choice="river"] a');await link.focus();await page.keyboard.press('Enter');const river=page.locator('[data-journey="oskemen-journey-ulbinka"][open]');await river.waitFor();assert.equal(await river.locator('summary').evaluate(el=>el===document.activeElement),true);assert.match(await river.innerText(),lang==='ru'?/Территория частная/:/사유지/);await noOverflow();
      await go('routes/ust-kamenogorsk?plan=oskemen-route-city');await page.locator('[data-route-id="oskemen-route-city"][open]').waitFor();await noOverflow();if(width===1280&&lang==='ru')await page.screenshot({path:'test-results/oskemen-city-desktop.png'});
    }
    await page.setViewportSize({width:1280,height:900});assert.deepEqual(failures,[]);
  });
  await check('Preparation has five populated bilingual topics and six working choices',async()=>{
    for(const lang of ['ru','ko']){
      await go('prepare');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
      assert.equal(await page.locator('[data-preparation-hub] .practical-grid article').count(),6);
      for(const id of ['entry','money','connection','language','safety']){
        await go('prepare/'+id);const root=page.locator('[data-preparation-topic]');assert.equal(await root.getAttribute('data-preparation-topic'),id);
        assert.equal(await root.locator('nav a').count(),6);assert.equal(await root.locator('nav [aria-current="page"]').count(),1);
        assert.ok((await root.innerText()).length>500);assert.doesNotMatch(await root.innerText(),/Раздел ещё готовится|Копировать фразу|[\u2013\u2014]|undefined/);
      }
    }
  });
  await check('Preparation preserves critical distinctions and useful official actions',async()=>{
    await go('prepare/entry');await page.locator('[data-language="ru"]').click();let body=await page.locator('[data-preparation-topic]').innerText();assert.match(body,/30 дней/);assert.match(body,/60 дней/);assert.match(body,/180 дней/);assert.match(body,/1 июля 2027/);assert.match(body,/трёх рабочих дней/);assert.equal(await page.locator('[data-preparation-topic] a[target="_blank"]').getAttribute('href'),'https://qazeta.kz/en/');
    await go('prepare/connection');body=await page.locator('[data-preparation-topic]').innerText();assert.match(body,/разными процедурами/);assert.match(body,/25 марта 2025/);assert.match(body,/корейским паспортом здесь не подтверждена/);
    await go('prepare/money');body=await page.locator('[data-preparation-topic]').innerText();assert.match(body,/не гарантирует/);assert.match(body,/Kaspi QR/);
    await go('prepare/safety');assert.equal(await page.locator('[data-preparation-topic] a[href^="tel:"]').count(),6);assert.equal(await page.locator('a[href="tel:+77057579922"]').count(),1);
    await go('prepare/toString');assert.match(await page.locator('h1').innerText(),/Страница не найдена/);
  });
  await check('Preparation stays readable on narrow screens in both languages',async()=>{
    for(const lang of ['ru','ko'])for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:900});await go('prepare');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();await noOverflow();
      for(const id of ['entry','money','connection','language','safety']){await go('prepare/'+id);await noOverflow();}
      if(width===390)await page.screenshot({path:`test-results/preparation-safety-${lang}-mobile.png`,fullPage:true});
    }
    await page.setViewportSize({width:1280,height:900});await go('prepare');await page.screenshot({path:'test-results/preparation-hub-desktop.png',fullPage:true});assert.deepEqual(failures,[]);
  });
  await check('Korean layer retains Kazakhstan geography and identifies both departure airports',async()=>{
    const {koreaMapData}=await import('../assets/korea-map-data.js');assert.equal(koreaMapData.shapes.length,17);assert.ok(koreaMapData.shapes.some(s=>s.code==='KR-50'));assert.equal(koreaMapData.airports.incheon.arp,'372745N 1262621E');assert.equal(koreaMapData.airports.gimhae.arp,'351050N 1285617E');
    const {airDistanceKm}=await import('../assets/route-map.js');assert.ok(Math.abs(airDistanceKm('incheon','almaty')-4171.4)<1);assert.ok(Math.abs(airDistanceKm('gimhae','almaty')-4484.9)<1);assert.equal(airDistanceKm('incheon','astana'),airDistanceKm('astana','incheon'));
    const {koreanFlight}=await import('../assets/korea-flights.js');assert.equal(koreanFlight('gimhae','almaty','2026-10-19').minutes,465);assert.equal(koreanFlight('gimhae','astana','2026-10-19'),null);assert.equal(koreanFlight('incheon','almaty','2027-01-01').current,false);
    await go('routes');assert.equal(await page.locator('.map-area').count(),20);assert.equal(await page.locator('.korea-area').count(),17);assert.equal(await page.locator('.map-marker').count(),6);assert.equal(await page.locator('.korea-airport').count(),2);
    for(const path of await page.locator('.korea-area').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBBox();return {width:b.width,height:b.height};})))assert.ok(path.width<310&&path.height<500); // Reject reversed-ring world rectangles.
  });
  await check('Korea mode animates verified time and handles unsupported pairs without invented schedules',async()=>{
    const c=await browser.newContext({viewport:{width:1280,height:900}});await c.addInitScript(()=>{const Original=Date;window.Date=class extends Original{constructor(...args){super(...(args.length?args:['2026-10-19T06:00:00Z']));}static now(){return new Original('2026-10-19T06:00:00Z').getTime();}};});const p=await c.newPage();p.on('pageerror',e=>failures.push(e.message));await p.goto(base+'/#/routes');await p.locator('[data-flight-mode="korea"]').click();assert.equal(await p.locator('#flight-origin').inputValue(),'incheon');assert.equal(await p.locator('#flight-swap').isDisabled(),true);await p.locator('[data-map-choice="almaty"]').click();
    assert.equal(await p.locator('#flight-distance').getAttribute('data-km'),'4171');assert.equal(await p.locator('#flight-duration').getAttribute('data-minutes'),'400');await p.waitForFunction(()=>document.querySelector('#flight-duration').textContent==='약 6시간 40분');
    await p.locator('#flight-origin').selectOption('gimhae');assert.equal(await p.locator('#flight-duration').getAttribute('data-minutes'),'465');await p.waitForFunction(()=>document.querySelector('#flight-duration').textContent==='약 7시간 45분');assert.match(await p.locator('#flight-hint').innerText(),/계절/);
    await p.locator('[data-map-choice="astana"]').click();assert.equal(await p.locator('#flight-duration').getAttribute('data-minutes'),'');assert.match(await p.locator('#flight-hint').innerText(),/확인되지/);assert.equal(await p.locator('.flight-plane').isVisible(),false);
    await p.locator('[data-flight-mode="domestic"]').click();assert.equal(await p.locator('#flight-origin').inputValue(),'astana');assert.equal(await p.locator('#flight-swap').isEnabled(),true);await c.close();
  });
  await check('Korean airport selection, localization and paired maps work on touch and keyboard',async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});await go('routes');await page.locator('[data-flight-mode="korea"]').click();await page.locator('[data-map-choice="almaty"]').click();
    for(const lang of ['ru','ko']){if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();await page.locator('#flight-origin').selectOption('gimhae');assert.match(await page.locator('#flight-origin option:checked').innerText(),lang==='ru'?/Пусан/:/부산/);
      for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:950});await page.waitForFunction(expected=>document.querySelector('.kazakhstan-map').getAttribute('viewBox')===expected,width<=600?'0 0 900 1200':'0 0 1250 570');await noOverflow();if(width===390||width===1280)await page.locator('.route-explorer').screenshot({path:`test-results/korea-map-${lang}-${width}.png`});}
    }
    const c=await browser.newContext({viewport:{width:390,height:900},hasTouch:true,isMobile:true,reducedMotion:'reduce'});const p=await c.newPage();p.on('pageerror',e=>failures.push(e.message));await p.goto(base+'/#/routes');await p.locator('.korea-airport[data-korea-origin="gimhae"] .marker-hit').tap();assert.equal(await p.locator('#flight-origin').inputValue(),'gimhae');await p.locator('[data-map-choice="almaty"]').tap();assert.equal(await p.locator('#route-map-card').getAttribute('data-destination'),'almaty');await c.close();
    await page.setViewportSize({width:1280,height:900});await page.locator('[data-flight-mode="domestic"]').click();assert.deepEqual(failures,[]);
  });
  await check('Hover selections keep map and document geometry fixed across destinations',async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    for(const lang of ['ru','ko'])for(const width of [320,390,768,850,1024,1280])for(const mode of ['domestic','korea']){
      await page.setViewportSize({width,height:950});await go('routes');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();await page.locator(`[data-flight-mode="${mode}"]`).click();await page.waitForFunction(()=>parseFloat(document.querySelector('#route-map-card').style.minHeight)>100);
      let previous;
      for(const id of ['astana','burabay','almaty','ust-kamenogorsk','aktau','turkistan']){
        await page.locator(`[data-map-choice="${id}"]`).click();const dimensions=await page.evaluate(()=>{const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return [b.top+scrollY,b.height]};return ['.flight-controls','#flight-hint','#flight-service','#route-map-card','.kazakhstan-map'].flatMap(r)});
        if(previous)dimensions.forEach((v,i)=>assert.ok(Math.abs(v-previous[i])<1.1,`${lang}/${width}/${id} geometry ${i}: ${v} vs ${previous[i]}`));previous=dimensions;await noOverflow();
      }
    }
    await page.setViewportSize({width:1280,height:950});
  });
  await check('A stationary pointer over Astana and Burabay causes no oscillation or scroll jumps',async()=>{
    await page.emulateMedia({reducedMotion:'no-preference'});await go('routes');await page.locator('[data-flight-mode="domestic"]').click();
    for(const mode of ['domestic','korea']){await page.locator(`[data-flight-mode="${mode}"]`).click();for(const id of ['astana','burabay']){
      await page.locator(`.map-marker[data-map-target="${id}"] .marker-hit`).hover();await page.waitForFunction(expected=>document.querySelector('#route-map-card').dataset.destination===expected,id);
      const samples=await page.evaluate(async()=>{const rows=[];const start=performance.now();while(performance.now()-start<1500){const b=document.querySelector('.kazakhstan-map').getBoundingClientRect();rows.push({top:b.top,scroll:scrollY,id:document.querySelector('#route-map-card').dataset.destination});await new Promise(requestAnimationFrame);}return rows;});
      assert.ok(samples.length>10);assert.equal(new Set(samples.map(x=>x.id)).size,1);assert.equal(samples[0].id,id);assert.ok(Math.max(...samples.map(x=>x.top))-Math.min(...samples.map(x=>x.top))<1);assert.ok(Math.max(...samples.map(x=>x.scroll))-Math.min(...samples.map(x=>x.scroll))<1);
    }}
  });
  await check('Korean departure requires explicit selection and unsupported pairs remain still',async()=>{
    await go('routes');await page.locator('[data-flight-mode="domestic"]').click();await page.locator('#flight-origin').selectOption('astana');
    await page.locator('.korea-airport[data-korea-origin="gimhae"] .marker-hit').hover();assert.equal(await page.locator('#flight-origin').inputValue(),'astana');
    await page.locator('[data-map-choice="burabay"]').click();await page.locator('[data-flight-mode="korea"]').click();assert.equal(await page.locator('#route-map-card').getAttribute('data-destination'),'almaty');assert.equal(await page.locator('#flight-origin').inputValue(),'incheon');
    await page.locator('.korea-airport[data-korea-origin="gimhae"] .marker-hit').hover();assert.equal(await page.locator('#flight-origin').inputValue(),'incheon');await page.locator('.korea-airport[data-korea-origin="gimhae"] .marker-hit').click();assert.equal(await page.locator('#flight-origin').inputValue(),'gimhae');
    await page.locator('[data-map-choice="astana"]').click();const text=await page.locator('#flight-distance').innerText();await page.waitForTimeout(160);assert.equal(await page.locator('#flight-distance').innerText(),text);assert.equal(await page.locator('.flight-plane').isVisible(),false);
    await page.locator('#flight-pick').click();await page.locator('[data-map-choice="almaty"]').click();assert.equal(await page.locator('#flight-origin').inputValue(),'gimhae');assert.equal(await page.locator('#route-map-card').getAttribute('data-destination'),'almaty');
    await page.locator('#flight-pick').click();await page.locator('[data-map-cycle="1"]').click();assert.equal(await page.locator('#flight-origin').inputValue(),'gimhae');assert.equal(await page.locator('#route-map-card').getAttribute('data-destination'),'astana');await page.keyboard.press('Escape');assert.deepEqual(failures,[]);
    await page.locator('.route-explorer').screenshot({path:'test-results/map-stability-desktop.png'});
  });
  await check('Oskemen label is centered above its own marker with a leader',async()=>{
    await go('routes');await page.locator('[data-map-choice="ust-kamenogorsk"]').click();
    const marker=page.locator('.map-marker[data-map-target="ust-kamenogorsk"]');assert.equal(await marker.locator('text').getAttribute('text-anchor'),'middle');assert.equal(await marker.locator('text').getAttribute('x'),'0');assert.equal(await marker.locator('.map-label-leader').count(),1);
    await page.locator('.kazakhstan-map').screenshot({path:'test-results/map-labels-fixed.png'});
  });
  await check('Three-region additions keep distinct places, counts and visitor-language boundaries',async()=>{
    const{guideContent,contentPlaces}=await import('../assets/content-pages.js');assert.equal(contentPlaces.length,102);assert.equal(guideContent.almaty.places.length,42);assert.equal(guideContent.astana.places.length,19);assert.equal(guideContent.burabay.places.length,9);
    const ids=['almaty-tanbaly','astana-opera','astana-ballet','burabay-imanaev-creek'];for(const id of ids){const p=contentPlaces.find(p=>p.id===id);assert.ok(p);assert.deepEqual(p.sources,[]);assert.ok(p.planLink);for(const lang of ['ru','ko']){assert.doesNotMatch(p.copy.body[lang],/[\u2013\u2014]/);assert.ok(p.copy.card[lang].length>60);}}
    const t=contentPlaces.find(p=>p.id==='almaty-tanbaly'),river=contentPlaces.find(p=>p.id==='almaty-tamgaly-tas');assert.notEqual(t.id,river.id);assert.match(t.visitor.price.ru,/2 000/);assert.match(t.visitor.access.ko,/영어/);assert.match(river.copy.body.ru,/разными местами/);
  });

  await check('Astana theatres offer booking actions rather than sources and one evening selects one venue',async()=>{
    for(const id of ['astana-opera','astana-ballet']){await go('places/'+id);const action=page.locator('[data-visitor-action]');assert.equal(await action.count(),1);assert.match(await action.getAttribute('href'),/^https:\/\/astana(opera\.kz|ballet\.com)\//);assert.equal(await action.getAttribute('rel'),'noopener noreferrer');assert.equal(await page.locator('#sources,.source-links,a[href*="2gis"]').count(),0);await page.locator('[data-place-plan]').click();await page.locator('[data-route-id="astana-cultural-evening"][open]').waitFor();}
    const card=page.locator('[data-route-id="astana-cultural-evening"]');assert.equal(await card.locator('.steps >li').count(),1);await card.locator('details').evaluateAll(ns=>ns.forEach(n=>n.open=true));assert.match(await card.innerText(),/два разных театра|두 곳을 같은 저녁/);assert.match(await card.innerText(),/\+82/);
  });
  await check('Burabay boardwalk update does not turn ascent or creek into an effortless ready walk',async()=>{
    await go('places/burabay-bolektau');if(await page.locator('html').getAttribute('lang')!=='ru')await page.locator('[data-language="ru"]').click();assert.match(await page.locator('#overview').innerText(),/лестницы и настилы/);assert.match(await page.locator('#overview').innerText(),/не стал ровной/);
    await go('places/burabay-imanaev-creek');assert.match(await page.locator('#transport').innerText(),/путь.*пока не предложен/);assert.match(await page.locator('.visit-facts').innerText(),/длиной прогулки/);assert.equal(await page.locator('button[data-copy]').count(),1);await page.locator('[data-place-plan]').click();await page.locator('[data-route-id="burabay-creek-option"][open]').waitFor();assert.match(await page.locator('[data-route-id="burabay-creek-option"]').innerText(),/Вход и обратный транспорт не подготовлены/);
  });
  await check('New regional choices, prices, theatre links and expanded plans fit RU KO mobile layouts',async()=>{
    for(const lang of ['ru','ko'])for(const width of [320,390,1280]){await page.setViewportSize({width,height:950});for(const route of ['destinations/almaty','destinations/astana','destinations/burabay','routes/almaty?plan=almaty-tanbaly-visit','routes/almaty?plan=almaty-altyn-emel-visit','routes/astana?plan=astana-cultural-evening','routes/burabay?plan=burabay-creek-option','places/almaty-tanbaly','places/astana-ballet','places/burabay-imanaev-creek']){await go(route);if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();if(route.startsWith('routes/'))await page.locator('.itinerary-card[open] details').evaluateAll(ns=>ns.forEach(n=>n.open=true));await noOverflow();if(lang==='ko')assert.doesNotMatch(await page.locator('#overview').count()?await page.locator('#overview').innerText():'',/[А-Яа-яЁё]/);}
      if(width===390)await page.screenshot({path:`test-results/regional-creek-${lang}-mobile.png`,fullPage:true});}
    await page.setViewportSize({width:1280,height:950});await go('routes/astana?plan=astana-cultural-evening');await page.locator('.itinerary-card[open] details').evaluateAll(ns=>ns.forEach(n=>n.open=true));await page.screenshot({path:'test-results/regional-theatre-desktop.png',fullPage:true});assert.deepEqual(failures,[]);
  });
  await check('Arrival research keeps SMS-dependent airport networks separate from proven Korean access',async()=>{
    for(const lang of ['ru','ko'])for(const [city,network] of [['astana','OpenWiFi_NQZ'],['aktau','kSpot KazTransCom'],['ust-kamenogorsk','Wi-Fi']]){
      await go('destinations/'+city);if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();
      const arrivals=page.locator('#transport [data-practical-id]');await arrivals.evaluateAll(ns=>ns.forEach(n=>n.open=true));const body=await page.locator('#transport').innerText();assert.ok(body.includes(network));assert.match(body,lang==='ru'?/не проверен|не установлены/:/확인되지/);assert.equal(await page.locator('#sources,.source-links').count(),0);
    }
  });
  await check('First-day preparation distinguishes data-only SMS and iPhone language scope without card guarantees',async()=>{
    for(const lang of ['ru','ko']){
      await go('prepare/transport');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();await page.locator('details').evaluateAll(ns=>ns.forEach(n=>n.open=true));const copy=await page.locator('#content').innerText();assert.match(copy,/iPhone/);assert.match(copy,lang==='ru'?/Отправленная заявка ещё не означает/:/문의 양식만/);assert.match(copy,lang==='ru'?/не принимает обычные SMS/:/일반 문자를 받을 수 없습니다/);assert.doesNotMatch(copy,/местной 3D|местной3D|регулярно отклон/);
      await go('prepare/connection');await page.locator('details').evaluateAll(ns=>ns.forEach(n=>n.open=true));assert.match(await page.locator('#content').innerText(),lang==='ru'?/не включает обычные звонки и SMS/:/일반 통화와 문자를 제공하지 않습니다/);
    }
  });
  await check('Road closure and cable maintenance stay distinct and ethno hours agree on profile and plan',async()=>{
    for(const lang of ['ru','ko']){
      await go('routes/almaty');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();await page.locator('.itinerary-card').evaluateAll(ns=>ns.forEach(n=>n.open=true));const notice=await page.locator('.mountain-season-notice').first().innerText();assert.match(notice,/22/);assert.match(notice,/2026/);assert.match(notice,lang==='ru'?/1 ноября/:/11월 1일/);assert.match(notice,lang==='ru'?/машин и пешеходов/:/차량과 보행자/);
      await go('places/oskemen-ethnopark');const hours=await page.locator('.visit-facts').innerText();assert.match(hours,/17:00/);assert.match(hours,/21:00/);assert.match(hours,/20:00/);assert.equal(await page.locator('.address-box button').count(),0);
      await go('routes/ust-kamenogorsk?plan=oskemen-route-ethno');const plan=page.locator('[data-route-id="oskemen-route-ethno"]');await plan.locator('details').evaluateAll(ns=>ns.forEach(n=>n.open=true));assert.match(await plan.innerText(),/17:00/);
    }
  });
  await check('Research updates fit open RU KO disclosures on small screens',async()=>{
    for(const lang of ['ru','ko'])for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:950});for(const route of ['prepare/transport','prepare/connection','destinations/astana','destinations/aktau','destinations/ust-kamenogorsk','places/almaty-gorelnik','places/oskemen-ethnopark']){
        await go(route);if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();await page.locator('details').evaluateAll(ns=>ns.forEach(n=>n.open=true));await noOverflow();
      }
      if(width===390)await page.screenshot({path:`test-results/first-day-ethno-${lang}.png`,fullPage:true});
    }assert.deepEqual(failures,[]);
  });
  await check('Compact Almaty keeps short facts and return visible while full instructions remain accessible',async()=>{
    const {guideContent}=await import('../assets/content-pages.js');
    for(const lang of ['ru','ko'])for(const id of [...new Set(guideContent.almaty.routes.map(r=>r.id))]){
      const route=guideContent.almaty.routes.find(r=>r.id===id);await go('routes/almaty?plan='+id);if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();const card=page.locator(`[data-route-id="${id}"]`);assert.equal(await card.getAttribute('open'),'');assert.equal(await card.locator('.route-transport').count(),1);assert.equal(await card.locator('[data-route-logistics][open]').count(),0);assert.equal(await card.locator('[data-stop-detail][open]').count(),0);const full=await card.textContent();assert.ok(full.includes(route.copy.returnTransport[lang]));assert.ok(full.includes(route.copy.transport[lang]));for(const fact of route.dayPlan.facts)assert.ok(full.includes(fact.value[lang]));for(const stop of route.dayPlan.stops){assert.ok(full.includes(stop.note[lang]));assert.ok(full.includes(stop.next[lang]));}assert.equal(await card.locator('.route-return').isVisible(),true);assert.equal(await card.locator('.fact-grid').isVisible(),true);assert.equal(await card.locator('a[href*="myrealtrip"],a[href*="viator"],a[href*="asiatrip"]').count(),0);
    }
    await go('routes/astana');assert.equal(await page.locator('[data-compact-plan]').count(),0);await go('routes/burabay');assert.equal(await page.locator('[data-compact-plan]').count(),0);
  });
  await check('Compact stop disclosures open by keyboard and preserve Monday alternative and lake independence',async()=>{
    for(const lang of ['ru','ko']){
      await go('routes/almaty?plan=route-1d');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();const card=page.locator('[data-route-id="route-1d"]');const first=card.locator('[data-stop-detail]').first();assert.equal(await first.locator('.answer-body').isVisible(),false);await first.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await first.locator('.answer-body').isVisible(),true);assert.match(await card.locator('.route-essential').innerText(),lang==='ru'?/понедельникам/:/월요일/);
      await go('routes/almaty?plan=route-3d-kolsai');const lakes=page.locator('[data-route-id="route-3d-kolsai"]');assert.match(await lakes.locator('.route-essential').innerText(),lang==='ru'?/два самостоятельных/:/각각 선택/);assert.match(await lakes.locator('.route-return').innerText(),/Саты|사티/);assert.equal(await lakes.locator('[data-stay-option][open]').count(),0);
      await go('routes/almaty?plan=route-3d');assert.equal(await page.locator('[data-route-id="route-3d"] .mountain-season-notice').isVisible(),true);
    }
  });
  await check('Compact Almaty fits narrow screens in default and fully expanded states',async()=>{
    for(const lang of ['ru','ko'])for(const width of [320,390,1280])for(const id of ['route-1d','route-3d-kolsai','almaty-altyn-emel-visit']){
      await page.setViewportSize({width,height:950});await go('routes/almaty?plan='+id);if(await page.locator('html').getAttribute('lang')!==lang)await page.locator(`[data-language="${lang}"]`).click();await noOverflow();const card=page.locator(`[data-route-id="${id}"]`);if(width===390&&id==='route-1d')await card.screenshot({path:`test-results/compact-almaty-${lang}-mobile.png`});if(width===1280&&lang==='ru'&&id==='route-1d')await card.screenshot({path:'test-results/compact-almaty-ru-desktop.png'});await card.locator('details').evaluateAll(ns=>ns.forEach(n=>n.open=true));await noOverflow();
    }assert.deepEqual(failures,[]);
  });
  process.stdout.write(`Completed ${count} acceptance checks.\n`);
} finally { await browser.close(); }
