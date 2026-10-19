import { koreaMapData } from './korea-map-data.js';
import { koreanFlight } from './korea-flights.js';
import { mapData } from './map-data.js';

let selected='almaty';
let origin='astana';
let domesticOrigin='astana';
export const koreaAirports=koreaMapData.airports;
const airportById=id=>airports[id]||koreaAirports[id];
// Airport reference points: Kazaeronavigatsia eAIP AD 2.2 (checked 2026-10-12).
// x/y use the same conic projection as scripts/build-map.mjs; map flight arcs are illustrative.
export const airports={
  almaty:{code:'UAAA',arp:'432120N 0770238E',coordinates:[77.043888889,43.355555556],x:683.6,y:416.9,cycle:'2026-10-01'},
  astana:{code:'UACC',arp:'510121N 0712758E',coordinates:[71.466111111,51.0225],x:544.1,y:182,cycle:'2026-03-19'},
  aktau:{code:'UATE',arp:'435136N 0510527E',coordinates:[51.090833333,43.86],x:91.3,y:370.5,cycle:'2026-03-19'},
  'ust-kamenogorsk':{code:'UASK',arp:'500209N 0822943E',coordinates:[82.495277778,50.035833333],x:767.7,y:187.5,cycle:'2026-03-19'},
  burabay:{code:'UACK',arp:'531949N 0693545E',coordinates:[69.595833333,53.330277778],x:505.4,y:109.3,cycle:'2026-03-19'},
  turkistan:{code:'UAIT',arp:'431840N 0683301E',coordinates:[68.550277778,43.311111111],x:487.9,y:430.6,cycle:'2026-03-19'}
};
const airportSource=a=>`https://www.ans.kz/AIP/eAIP/${a.cycle}-AIRAC/html/eAIP/UA-AD-2.${a.code}-en-GB.html`;
// Great-circle approximation on the IUGG mean-radius sphere, rounded only for display.
export function airDistanceKm(from,to){
  const a=airportById(from)?.coordinates,b=airportById(to)?.coordinates;if(!a||!b)return null;
  const rad=n=>n*Math.PI/180,lat1=rad(a[1]),lat2=rad(b[1]);
  const h=Math.sin((lat2-lat1)/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(rad(b[0]-a[0])/2)**2;
  return 6371.0088*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
}

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const regionLabels={
  almaty:{ru:'Алматы и Алматинская область',ko:'알마티시와 알마티주'},
  astana:{ru:'Астана, отдельная административная единица',ko:'아스타나시, 별도 행정구역'},
  aktau:{ru:'Актау · Мангистауская область',ko:'악타우 · 망기스타우주'},
  'ust-kamenogorsk':{ru:'Усть-Каменогорск · Восточно-Казахстанская область',ko:'우스티카메노고르스크 · 동카자흐스탄주'},
  burabay:{ru:'Бурабай · Акмолинская область',ko:'부라바이 · 아크몰라주'},
  turkistan:{ru:'Туркестан · Туркестанская область',ko:'투르키스탄 · 투르키스탄주'}
};
// Offsets are for annotation placement only; marker positions come from GeoNames.
const labelOffsets={almaty:[12,28],astana:[16,30],aktau:[16,-17],'ust-kamenogorsk':[-17,-16],burabay:[-15,-21],turkistan:[-15,26]};

export function routeMapMarkup(lang,destinations,picture,{home=false}={}){
  const t=(ko,ru)=>lang==='ko'?ko:ru;
  const tr=v=>v[lang];
  const airportName=id=>koreaAirports[id]?tr(koreaAirports[id].name):id==='burabay'?t('부라바이 · 콕셰타우 공항','Бурабай · аэропорт Кокшетау'):tr(destinations.find(d=>d.id===id).name);
  const flightControls=`<div class="flight-controls"><label for="flight-origin">${t('출발','Откуда')}<select id="flight-origin">${destinations.map(d=>`<option value="${d.id}"${d.id===origin?' selected':''}>${escape(airportName(d.id))}</option>`).join('')}${Object.keys(koreaAirports).map(id=>`<option value="${id}"${id===origin?' selected':''}>${escape(airportName(id))}</option>`).join('')}</select></label><button class="button flight-pick" id="flight-pick" aria-pressed="false">${t('지도에서 출발지 선택','Выбрать отправление на карте')}</button><button class="button flight-swap" id="flight-swap" aria-label="${t('출발지와 목적지 바꾸기','Поменять отправление и назначение')}">⇄</button><div class="flight-arrival"><span>${t('도착','Куда')}</span><strong id="flight-destination"></strong></div><div class="flight-distance"><span>${t('항공 직선거리','По воздуху')}</span><output id="flight-distance" aria-live="off" aria-label="${t('공항 간 대략적인 거리','Приблизительное расстояние между аэропортами')}"></output><span id="flight-duration-label">${t('비행 시간','Длительность рейса')}</span><output id="flight-duration" class="flight-duration" aria-live="off" aria-label="${t('예상 비행 시간','Ориентир длительности рейса')}"></output></div></div><p class="flight-hint" id="flight-hint"></p><p class="flight-service" id="flight-service"></p>`;
  const regionTargets=Object.fromEntries(Object.entries(mapData.targetRegions).flatMap(([id,codes])=>codes.map(code=>[code,id])));
  const shapes=mapData.shapes.map(shape=>`<path class="map-area${regionTargets[shape.code]?' map-target':''}" data-region="${shape.code}"${regionTargets[shape.code]?` data-map-target="${regionTargets[shape.code]}"`:''} d="${shape.path}"><title>${escape(shape.name)}</title></path>`).join('');
  const markers=destinations.map(d=>{
    const p=mapData.points[d.id],offset=labelOffsets[d.id];
    return `<g class="map-marker" data-map-target="${d.id}" transform="translate(${p.x} ${p.y})"><circle class="marker-hit" r="23"/><circle class="marker-halo" r="15"/><circle class="marker-dot" r="6"/><text x="${offset[0]}" y="${offset[1]}" text-anchor="${offset[0]<0?'end':'start'}" class="map-label">${escape(tr(d.name))}</text></g>`;
  }).join('');
  const koreanShapes=koreaMapData.shapes.map(shape=>`<path class="korea-area" data-korea-region="${shape.code}"${['KR-11','KR-28'].includes(shape.code)?' data-korea-origin="incheon"':shape.code==='KR-26'?' data-korea-origin="gimhae"':''} d="${shape.path}"><title>${escape(shape.name.ko)} · ${escape(shape.name.ru)}</title></path>`).join('');
  const koreanCities=koreaMapData.cities.map(c=>`<g class="korea-city" transform="translate(${c.x} ${c.y})"><circle r="2.7"/><text x="${c.dx}" y="${c.dy}" text-anchor="${c.dx<0?'end':'start'}">${escape(tr(c.name))}</text></g>`).join('');
  const koreanMarkers=Object.entries(koreaAirports).map(([id,a])=>`<g class="korea-airport" data-korea-origin="${id}" transform="translate(${a.x} ${a.y})"><circle class="marker-hit" r="23"/><circle class="marker-halo" r="15"/><circle class="marker-dot" r="6"/><text x="-12" y="${id==='incheon'?21:-30}" text-anchor="end" class="korea-airport-label">${id==='incheon'?t('인천 ICN','Инчхон ICN'):t('김해 PUS','Кимхэ PUS')}</text></g>`).join('');
  const modes=`<div class="flight-modes" role="group" aria-label="${t('항공 지도 선택','Вариант перелёта')}"><button class="map-choice" data-flight-mode="domestic" aria-pressed="${!koreaAirports[origin]}">${t('카자흐스탄 내 이동','По Казахстану')}</button><button class="map-choice" data-flight-mode="korea" aria-pressed="${!!koreaAirports[origin]}">${t('한국에서 출발','Из Кореи')}</button></div>`;
  return `<section class="section route-explorer${home?' map-home':''}" id="${home?'home-routes':'route-explorer'}" aria-label="${t('지도에서 여행지 선택','Выбор направления на карте')}"><div class="section-title"><h2>${home?t('여행 일정','Маршруты'):t('지도에서 여행 찾기','Выберите направление на карте')}</h2><span class="muted">${home?t('지도에서 여행지를 선택하세요','Выберите направление на карте'):t('지도와 카드가 함께 바뀝니다.','Карта и карточка связаны')}</span></div><div class="map-choices" aria-label="${t('여행지 목록','Список направлений')}">${destinations.map(d=>`<button class="map-choice" data-map-choice="${d.id}" aria-pressed="${d.id===selected}">${escape(tr(d.name))}</button>`).join('')}</div>${modes}${flightControls}<div class="map-layout"><div class="map-selection"><div id="route-map-card"></div><div class="map-pagination"><button class="button" data-map-cycle="-1" aria-label="${t('이전 여행지','Предыдущее направление')}">←</button><span id="map-position" class="small muted"></span><button class="button" data-map-cycle="1" aria-label="${t('다음 여행지','Следующее направление')}">→</button></div><p class="map-instruction">${t('지도에 마우스를 올리거나 위의 여행지를 선택하세요. 휴대폰에서는 누르세요.','Наведите на область или метку, либо выберите направление сверху. На телефоне нажмите.')}</p></div><div class="map-surface"><svg class="kazakhstan-map" viewBox="0 0 1250 570" role="img" aria-labelledby="kaz-map-title kaz-map-desc"><title id="kaz-map-title">${t('카자흐스탄 여행지와 대한민국 출발 공항','Направления Казахстана и аэропорты Южной Кореи')}</title><desc id="kaz-map-desc">${t('지도와 여행지 선택 버튼은 같은 선택을 표시합니다. 부라바이는 아크몰라주에 있습니다.','Обзорная карта с административными границами. Выбор также доступен кнопками над картой. Бурабай находится в Акмолинской области.')}</desc><text class="map-country-title" x="35" y="24">${t('카자흐스탄','Казахстан')}</text><g class="map-regions" aria-hidden="true">${shapes}</g><g class="map-points" aria-hidden="true">${markers}</g><g class="korea-outline" transform="translate(930 30)" aria-hidden="true"><text class="korea-country-title" x="170" y="15" text-anchor="middle">${t('대한민국','Южная Корея')}</text>${koreanShapes}${koreanCities}${koreanMarkers}</g><g id="flight-layer" aria-hidden="true" pointer-events="none"></g></svg><p class="korea-region-status" id="korea-region-name"></p><div class="map-legend"><span><i class="legend-dot"></i>${t('여행지의 위치','Метка направления')}</span><span><i class="legend-region"></i>${t('선택한 관련 지역','Связанная область')}</span></div>${home?`<details class="map-details"><summary>${t('지도 정보와 출처','О карте и источниках')}</summary>`:''}<p class="map-caption">${t('두 나라는 서로 다른 축척으로 나란히 배치했습니다. 부라바이 표시는 마을을 기준으로 하며 공항은 콕셰타우에 있습니다.','Страны показаны рядом в разных масштабах. Метка Бурабая обозначает посёлок, аэропорт находится в Кокшетау.')}</p><p class="map-caption">${t('거리는 공항 기준 대권거리의 근사값입니다. 곡선은 설명용이며 실제 비행 경로나 직항 운항을 뜻하지 않습니다.','Расчётное расстояние между аэропортами по кратчайшей дуге Земли. Линия иллюстративная: фактический путь и наличие прямого рейса не показаны.')}</p>${home?'</details>':''}</div></div><div id="map-announcement" class="visually-hidden" role="status" aria-live="polite"></div><p class="map-credit">${t('경계','Границы')}: <a href="${mapData.source.boundaryURL}" target="_blank" rel="noopener noreferrer">UNHCR / HDX, 2023</a> · <a href="${mapData.source.boundaryLicenseURL}" target="_blank" rel="noopener noreferrer">CC BY 3.0 IGO</a> · ${t('위치','Точки')}: <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">GeoNames, CC BY 4.0</a> · ${t('개요용 단순화된 경계','Контуры упрощены для обзора')} · ${t('공항 좌표','Координаты аэропортов')}: ${Object.values(airports).map(a=>`<a href="${airportSource(a)}" target="_blank" rel="noopener noreferrer">${a.code}</a>`).join(' · ')} (Kazaeronavigatsia eAIP) · ${t('대한민국 개요 경계','Обзорные границы Кореи')}: <a href="${koreaMapData.source.url}" target="_blank" rel="noopener noreferrer">geoBoundaries / Natural Earth, 2021, public domain</a> · ${Object.values(koreaAirports).map(a=>`<a href="${a.source}" target="_blank" rel="noopener noreferrer">${a.code}</a>`).join(' · ')} (Korea eAIP)</p></section>`;
}

export function mountRouteMap(lang,destinations,picture){
  const root=document.querySelector('.route-explorer');if(!root)return;
  const t=(ko,ru)=>lang==='ko'?ko:ru;
  let choosingOrigin=false,frame=0,finishTimer,lastPair='';
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const distance=root.querySelector('#flight-distance'),layer=root.querySelector('#flight-layer');
  const fmt=n=>Math.round(n).toLocaleString(lang==='ko'?'ko-KR':'ru-RU');
  const name=id=>koreaAirports[id]?koreaAirports[id].name[lang]:destinations.find(d=>d.id===id).name[lang];
  const small=matchMedia('(max-width: 600px)');
  function arrange(){root.querySelector('.kazakhstan-map').setAttribute('viewBox',small.matches?'0 0 900 1200':'0 0 1250 570');root.querySelector('.korea-outline').setAttribute('transform',small.matches?'translate(240 620) scale(1.3)':'translate(930 30)');}
  function screenAirport(id){const a=airportById(id);return koreaAirports[id]?{...a,x:small.matches?240+a.x*1.3:930+a.x,y:small.matches?620+a.y*1.3:30+a.y}:a;}
  const duration=root.querySelector('#flight-duration');
  const timeText=mins=>lang==='ko'?`약 ${Math.floor(mins/60)}시간 ${Math.round(mins%60)}분`:`около ${Math.floor(mins/60)} ч ${Math.round(mins%60)} мин`;
  arrange();
  function drawFlight(force=false){
    const key=`${origin}/${selected}/${small.matches}`;if(key===lastPair&&!force)return;lastPair=key;
    cancelAnimationFrame(frame);clearTimeout(finishTimer);frame=0;layer.innerHTML='';
    const isKorea=!!koreaAirports[origin],service=isKorea?koreanFlight(origin,selected):null;
    root.dataset.flightContext=isKorea?'korea':'domestic';root.classList.toggle('flight-unconfirmed',isKorea&&!service?.current);
    root.querySelectorAll('[data-flight-mode]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.flightMode==='korea')===isKorea)));
    root.querySelector('#flight-swap').disabled=isKorea;
    root.querySelectorAll('.korea-airport').forEach(m=>m.classList.toggle('is-origin',m.dataset.koreaOrigin===origin));
    root.querySelectorAll('.korea-area').forEach(m=>m.classList.toggle('is-origin',m.dataset.koreaOrigin===origin));
    duration.dataset.minutes=service?.current?String(service.minutes):'';
    duration.textContent=service?.current?timeText(service.minutes):isKorea?t('운항편별 시간 확인','По расписанию выбранного рейса'):t('운항편에 따라 다름','Зависит от рейса');
    root.querySelector('#flight-service').innerHTML=service?`${escape(service.carrier)} · ${escape(service.flight)}${service.seasonal?' · '+t('계절 운항','Сезонный рейс'):''} · <a href="${service.url}" target="_blank" rel="noopener noreferrer">${t('항공사에서 일정 보기','Расписание авиакомпании')} ↗</a>`:'';
    root.querySelector('#flight-origin').value=origin;
    root.querySelector('#flight-destination').textContent=name(selected);
    root.querySelectorAll('.map-marker').forEach(mark=>mark.classList.toggle('is-origin',mark.dataset.mapTarget===origin));
    const km=Math.round(airDistanceKm(origin,selected));distance.dataset.km=String(km);
    root.dataset.flightOrigin=origin;root.dataset.flightDestination=selected;
    root.querySelector('#flight-hint').textContent=origin===selected?t('다른 목적지를 선택하세요.','Выберите другой город назначения.'):t('지도에 마우스를 올리거나 목적지를 누르세요. 거리와 비행기가 함께 움직입니다.','Наведите на город или нажмите: самолётик и расстояние изменятся вместе.');
    if(origin==='burabay'||selected==='burabay')root.querySelector('#flight-hint').textContent+=' '+t('부라바이: 콕셰타우 공항까지 계산하며 육로 구간은 제외합니다.','Бурабай: расчёт до аэропорта Кокшетау; наземный участок не включён.');
    if(isKorea)root.querySelector('#flight-hint').textContent=service?.current?t('직항편의 예정 소요 시간입니다. 공항 대기와 시내 이동은 포함하지 않습니다. 여행 날짜에 따라 달라집니다.','Ориентир по расписанию прямого рейса. Без ожидания в аэропорту и дороги в город. На ваши даты время может отличаться.')+(service.seasonal?' '+t('부산 노선은 계절 운항입니다.','Направление из Пусана сезонное.'):''):service?t('공개된 시간표 기간이 지났습니다. 새 일정은 항공사에서 확인할 수 있습니다.','Период опубликованного расписания закончился. Новые даты доступны у авиакомпании.'):t('이 두 공항 간 직항은 확인되지 않았습니다. 거리는 비교용이며 환승 시간은 포함하지 않습니다.','Прямой рейс между этими аэропортами не подтверждён. Расстояние показано для сравнения, время пересадки не рассчитано.');
    distance.setAttribute('title',`${airportById(origin).code} → ${airports[selected].code} · ≈ ${fmt(km)} ${t('km','км')}`);
    if(!km){distance.textContent=`0 ${t('km','км')}`;return;}
    const a=screenAirport(origin),b=screenAirport(selected),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
    const bend=Math.min(90,len*.2),cx=(a.x+b.x)/2-dy/len*bend,cy=(a.y+b.y)/2+dx/len*bend;
    layer.innerHTML=`<path class="flight-track" d="M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}"/><path class="flight-trail" d="M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}"/><circle class="flight-endpoint" cx="${a.x}" cy="${a.y}" r="4"/><circle class="flight-endpoint" cx="${b.x}" cy="${b.y}" r="4"/><g class="flight-plane"><path d="M15 0 L-4 -5 L-8 -13 L-12 -13 L-10 -4 L-17 -4 L-21 -8 L-24 -8 L-21 0 L-24 8 L-21 8 L-17 4 L-10 4 L-12 13 L-8 13 L-4 5 Z"/></g>`;
    const path=layer.querySelector('.flight-trail'),plane=layer.querySelector('.flight-plane'),length=path.getTotalLength();
    path.style.strokeDasharray=String(length);
    function paint(progress){
      const position=path.getPointAtLength(length*progress),before=path.getPointAtLength(Math.max(0,length*progress-1)),after=path.getPointAtLength(Math.min(length,length*progress+1));
      const angle=Math.atan2(after.y-before.y,after.x-before.x)*180/Math.PI;
      plane.setAttribute('transform',`translate(${position.x} ${position.y}) rotate(${angle}) scale(.65)`);
      path.style.strokeDashoffset=String(length*(1-progress));
      distance.textContent=`≈ ${fmt(km*progress)} ${t('km','км')}`;
      if(service?.current)duration.textContent=timeText(Math.round(service.minutes*progress));
    }
    if(motion.matches){paint(1);return;}
    paint(0);const start=performance.now();
    function tick(now){if(!root.isConnected)return;const progress=Math.min(1,(now-start)/1100);paint(progress);if(progress<1)frame=requestAnimationFrame(tick);else frame=0;}
    frame=requestAnimationFrame(tick);
    // Background tabs can suspend animation frames; the calculated result must still settle.
    finishTimer=setTimeout(()=>{if(root.isConnected){cancelAnimationFrame(frame);frame=0;paint(1);}},1200);
  }
  function setOriginMode(value){
    choosingOrigin=value;root.classList.toggle('choosing-origin',value);
    root.querySelector('#flight-pick').setAttribute('aria-pressed',String(value));
    root.querySelector('#flight-pick').textContent=value?t('출발 도시를 누르세요 · 취소','Нажмите город отправления · отмена'):t('지도에서 출발지 선택','Выбрать отправление на карте');
  }
  function choose(id,announce=false){
    const d=destinations.find(d=>d.id===id);if(!d)return;
    const changed=selected!==id;selected=id;
    root.querySelectorAll('[data-map-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mapChoice===id)));
    root.querySelectorAll('[data-map-target]').forEach(mark=>mark.classList.toggle('is-selected',mark.dataset.mapTarget===id));
    const card=root.querySelector('#route-map-card');
    if(changed||card.dataset.destination!==id){
      card.dataset.destination=id;
      card.innerHTML=`${picture(d.id,d.name[lang])}<div class="map-card-content"><span class="eyebrow">${t('여행지 탐색','Ваше направление')}</span><h3>${escape(d.name[lang])}</h3><p>${escape(d.eyebrow[lang])}</p><p class="map-region-note">${escape(regionLabels[id][lang])}</p><a class="button primary" href="#/routes/${id}">${root.classList.contains('map-home')?t('여행 일정 둘러보기','Исследовать маршруты'):t('이 여행지의 일정 보기','Открыть маршруты направления')} →</a></div>`;
    }
    root.querySelector('#map-position').textContent=`${destinations.findIndex(d=>d.id===id)+1} / ${destinations.length}`;
    drawFlight();
    if(announce)root.querySelector('#map-announcement').textContent=`${name(origin)} → ${d.name[lang]} · ≈ ${fmt(airDistanceKm(origin,id))} ${t('km','км')}`;
  }
  root.addEventListener('pointerover',event=>{
    const kr=event.target.closest('[data-korea-region]');if(kr){const region=koreaMapData.shapes.find(s=>s.code===kr.dataset.koreaRegion);root.querySelector('#korea-region-name').textContent=region?region.name[lang]:'';}
    const krOrigin=event.target.closest('[data-korea-origin]');if(krOrigin&&!choosingOrigin&&event.pointerType!=='touch'&&origin!==krOrigin.dataset.koreaOrigin){if(!koreaAirports[origin])domesticOrigin=origin;origin=krOrigin.dataset.koreaOrigin;drawFlight();}
    const target=event.target.closest('[data-map-target]');
    if(target&&!choosingOrigin&&event.pointerType!=='touch'&&selected!==target.dataset.mapTarget)choose(target.dataset.mapTarget);
  });
  root.addEventListener('click',event=>{
    const mode=event.target.closest('[data-flight-mode]');if(mode){if(mode.dataset.flightMode==='korea'){if(!koreaAirports[origin]){domesticOrigin=origin;origin='incheon';}}else origin=domesticOrigin;setOriginMode(false);drawFlight();return;}
    const krOrigin=event.target.closest('[data-korea-origin]');if(krOrigin){if(!koreaAirports[origin])domesticOrigin=origin;origin=krOrigin.dataset.koreaOrigin;setOriginMode(false);drawFlight();return;}
    if(event.target.closest('#flight-pick')){setOriginMode(!choosingOrigin);return;}
    if(event.target.closest('#flight-swap')){if(koreaAirports[origin])return;const previous=origin;origin=selected;setOriginMode(false);choose(previous,true);return;}
    const target=event.target.closest('[data-map-target],[data-map-choice],[data-map-cycle]');if(!target)return;
    if(choosingOrigin&&!target.dataset.mapCycle){origin=target.dataset.mapChoice||target.dataset.mapTarget;domesticOrigin=origin;setOriginMode(false);drawFlight();root.querySelector('#map-announcement').textContent=t('출발: ','Откуда: ')+name(origin);return;}
    if(target.dataset.mapCycle){const i=destinations.findIndex(d=>d.id===selected);choose(destinations[(i+Number(target.dataset.mapCycle)+destinations.length)%destinations.length].id,true);}
    else choose(target.dataset.mapChoice||target.dataset.mapTarget,true);
  });
  root.addEventListener('focusin',event=>{if(!choosingOrigin&&event.target.matches('[data-map-choice]'))choose(event.target.dataset.mapChoice,true);});
  root.querySelector('#flight-origin').addEventListener('change',event=>{origin=event.target.value;if(!koreaAirports[origin])domesticOrigin=origin;setOriginMode(false);drawFlight();});
  root.addEventListener('keydown',event=>{if(event.key==='Escape')setOriginMode(false);});
  const onMotion=()=>drawFlight(true);motion.addEventListener('change',onMotion);
  const onSize=()=>{arrange();drawFlight(true);};small.addEventListener('change',onSize);
  choose(selected);
  return ()=>{cancelAnimationFrame(frame);clearTimeout(finishTimer);motion.removeEventListener('change',onMotion);small.removeEventListener('change',onSize);};
}
