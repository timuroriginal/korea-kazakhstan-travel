import { mapData } from './map-data.js';

let selected='almaty';
let origin='astana';
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
  const a=airports[from]?.coordinates,b=airports[to]?.coordinates;if(!a||!b)return null;
  const rad=n=>n*Math.PI/180,lat1=rad(a[1]),lat2=rad(b[1]);
  const h=Math.sin((lat2-lat1)/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(rad(b[0]-a[0])/2)**2;
  return 6371.0088*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
}

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const regionLabels={
  almaty:{ru:'Алматы и Алматинская область',ko:'알마티시와 알마티주'},
  astana:{ru:'Астана — отдельная административная единица',ko:'아스타나시 — 별도 행정구역'},
  aktau:{ru:'Актау · Мангистауская область',ko:'악타우 · 망기스타우주'},
  'ust-kamenogorsk':{ru:'Усть-Каменогорск · Восточно-Казахстанская область',ko:'우스티카메노고르스크 · 동카자흐스탄주'},
  burabay:{ru:'Бурабай · Акмолинская область',ko:'부라바이 · 아크몰라주'},
  turkistan:{ru:'Туркестан · Туркестанская область',ko:'투르키스탄 · 투르키스탄주'}
};
// Offsets are for annotation placement only; marker positions come from GeoNames.
const labelOffsets={almaty:[12,28],astana:[16,5],aktau:[16,-17],'ust-kamenogorsk':[-17,-16],burabay:[-15,-21],turkistan:[-15,26]};

export function routeMapMarkup(lang,destinations,picture,{home=false}={}){
  const t=(ko,ru)=>lang==='ko'?ko:ru;
  const tr=v=>v[lang];
  const airportName=id=>id==='burabay'?t('부라바이 · 콕셰타우 공항','Бурабай · аэропорт Кокшетау'):tr(destinations.find(d=>d.id===id).name);
  const flightControls=`<div class="flight-controls"><label for="flight-origin">${t('출발','Откуда')}<select id="flight-origin">${destinations.map(d=>`<option value="${d.id}"${d.id===origin?' selected':''}>${escape(airportName(d.id))}</option>`).join('')}</select></label><button class="button flight-pick" id="flight-pick" aria-pressed="false">${t('지도에서 출발지 선택','Выбрать отправление на карте')}</button><button class="button flight-swap" id="flight-swap" aria-label="${t('출발지와 목적지 바꾸기','Поменять отправление и назначение')}">⇄</button><div class="flight-arrival"><span>${t('도착','Куда')}</span><strong id="flight-destination"></strong></div><div class="flight-distance"><span>${t('항공 직선거리','По воздуху')}</span><output id="flight-distance" aria-label="${t('공항 간 대략적인 거리','Приблизительное расстояние между аэропортами')}"></output></div></div><p class="flight-hint" id="flight-hint"></p>`;
  const regionTargets=Object.fromEntries(Object.entries(mapData.targetRegions).flatMap(([id,codes])=>codes.map(code=>[code,id])));
  const shapes=mapData.shapes.map(shape=>`<path class="map-area${regionTargets[shape.code]?' map-target':''}" data-region="${shape.code}"${regionTargets[shape.code]?` data-map-target="${regionTargets[shape.code]}"`:''} d="${shape.path}"><title>${escape(shape.name)}</title></path>`).join('');
  const markers=destinations.map(d=>{
    const p=mapData.points[d.id],offset=labelOffsets[d.id];
    return `<g class="map-marker" data-map-target="${d.id}" transform="translate(${p.x} ${p.y})"><circle class="marker-hit" r="23"/><circle class="marker-halo" r="15"/><circle class="marker-dot" r="6"/><text x="${offset[0]}" y="${offset[1]}" text-anchor="${offset[0]<0?'end':'start'}" class="map-label">${escape(tr(d.name))}</text></g>`;
  }).join('');
  return `<section class="section route-explorer${home?' map-home':''}" id="${home?'home-routes':'route-explorer'}" aria-label="${t('지도에서 여행지 선택','Выбор направления на карте')}"><div class="section-title"><h2>${home?t('여행 일정','Маршруты'):t('지도에서 여행 찾기','Выберите направление на карте')}</h2><span class="muted">${home?t('지도에서 여행지를 선택하세요','Выберите направление на карте'):t('지도와 카드가 함께 바뀝니다.','Карта и карточка связаны')}</span></div><div class="map-choices" aria-label="${t('여행지 목록','Список направлений')}">${destinations.map(d=>`<button class="map-choice" data-map-choice="${d.id}" aria-pressed="${d.id===selected}">${escape(tr(d.name))}</button>`).join('')}</div>${flightControls}<div class="map-layout"><div class="map-selection"><div id="route-map-card"></div><div class="map-pagination"><button class="button" data-map-cycle="-1" aria-label="${t('이전 여행지','Предыдущее направление')}">←</button><span id="map-position" class="small muted"></span><button class="button" data-map-cycle="1" aria-label="${t('다음 여행지','Следующее направление')}">→</button></div><p class="map-instruction">${t('지도에 마우스를 올리거나 위의 여행지를 선택하세요. 휴대폰에서는 누르세요.','Наведите на область или метку, либо выберите направление сверху. На телефоне нажмите.')}</p></div><div class="map-surface"><svg class="kazakhstan-map" viewBox="0 0 ${mapData.width} ${mapData.height}" role="img" aria-labelledby="kaz-map-title kaz-map-desc"><title id="kaz-map-title">${t('카자흐스탄의 여섯 여행지','Шесть направлений Казахстана')}</title><desc id="kaz-map-desc">${t('지도와 여행지 선택 버튼은 같은 선택을 표시합니다. 부라바이는 아크몰라주에 있습니다.','Обзорная карта с административными границами. Выбор также доступен кнопками над картой. Бурабай находится в Акмолинской области.')}</desc><g class="map-regions" aria-hidden="true">${shapes}</g><g class="map-points" aria-hidden="true">${markers}</g><g id="flight-layer" aria-hidden="true" pointer-events="none"></g></svg><div class="map-legend"><span><i class="legend-dot"></i>${t('여행지의 위치','Метка направления')}</span><span><i class="legend-region"></i>${t('선택한 관련 지역','Связанная область')}</span></div>${home?`<details class="map-details"><summary>${t('지도 정보와 출처','О карте и источниках')}</summary>`:''}<p class="map-caption">${t('관광 목적지와 행정구역은 서로 다릅니다. 부라바이 표시는 마을을 기준으로 합니다.','Туристическое направление и административная область — разные понятия. Метка Бурабая показывает посёлок как ориентир.')}</p><p class="map-caption">${t('거리는 공항 기준 대권거리의 근사값입니다. 곡선은 설명용이며 실제 비행 경로나 직항 운항을 뜻하지 않습니다.','Расчётное расстояние между аэропортами по кратчайшей дуге Земли. Линия иллюстративная: фактический путь и наличие прямого рейса не показаны.')}</p>${home?'</details>':''}</div></div><div id="map-announcement" class="visually-hidden" role="status" aria-live="polite"></div><p class="map-credit">${t('경계','Границы')}: <a href="${mapData.source.boundaryURL}" target="_blank" rel="noopener noreferrer">UNHCR / HDX, 2023</a> · <a href="${mapData.source.boundaryLicenseURL}" target="_blank" rel="noopener noreferrer">CC BY 3.0 IGO</a> · ${t('위치','Точки')}: <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">GeoNames, CC BY 4.0</a> · ${t('개요용 단순화된 경계','Контуры упрощены для обзора')} · ${t('공항 좌표','Координаты аэропортов')}: ${Object.values(airports).map(a=>`<a href="${airportSource(a)}" target="_blank" rel="noopener noreferrer">${a.code}</a>`).join(' · ')} (Kazaeronavigatsia eAIP)</p></section>`;
}

export function mountRouteMap(lang,destinations,picture){
  const root=document.querySelector('.route-explorer');if(!root)return;
  const t=(ko,ru)=>lang==='ko'?ko:ru;
  let choosingOrigin=false,frame=0,finishTimer,lastPair='';
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const distance=root.querySelector('#flight-distance'),layer=root.querySelector('#flight-layer');
  const fmt=n=>Math.round(n).toLocaleString(lang==='ko'?'ko-KR':'ru-RU');
  const name=id=>destinations.find(d=>d.id===id).name[lang];
  function drawFlight(force=false){
    const key=`${origin}/${selected}`;if(key===lastPair&&!force)return;lastPair=key;
    cancelAnimationFrame(frame);clearTimeout(finishTimer);frame=0;layer.innerHTML='';
    root.querySelector('#flight-origin').value=origin;
    root.querySelector('#flight-destination').textContent=name(selected);
    root.querySelectorAll('.map-marker').forEach(mark=>mark.classList.toggle('is-origin',mark.dataset.mapTarget===origin));
    const km=Math.round(airDistanceKm(origin,selected));distance.dataset.km=String(km);
    root.dataset.flightOrigin=origin;root.dataset.flightDestination=selected;
    root.querySelector('#flight-hint').textContent=origin===selected?t('다른 목적지를 선택하세요.','Выберите другой город назначения.'):t('지도에 마우스를 올리거나 목적지를 누르세요. 거리와 비행기가 함께 움직입니다.','Наведите на город или нажмите: самолётик и расстояние изменятся вместе.');
    if(origin==='burabay'||selected==='burabay')root.querySelector('#flight-hint').textContent+=' '+t('부라바이: 콕셰타우 공항까지 계산하며 육로 구간은 제외합니다.','Бурабай: расчёт до аэропорта Кокшетау; наземный участок не включён.');
    distance.setAttribute('title',`${airports[origin].code} → ${airports[selected].code} · ≈ ${fmt(km)} ${t('km','км')}`);
    if(!km){distance.textContent=`0 ${t('km','км')}`;return;}
    const a=airports[origin],b=airports[selected],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
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
    const target=event.target.closest('[data-map-target]');
    if(target&&!choosingOrigin&&event.pointerType!=='touch'&&selected!==target.dataset.mapTarget)choose(target.dataset.mapTarget);
  });
  root.addEventListener('click',event=>{
    if(event.target.closest('#flight-pick')){setOriginMode(!choosingOrigin);return;}
    if(event.target.closest('#flight-swap')){const previous=origin;origin=selected;setOriginMode(false);choose(previous,true);return;}
    const target=event.target.closest('[data-map-target],[data-map-choice],[data-map-cycle]');if(!target)return;
    if(choosingOrigin&&!target.dataset.mapCycle){origin=target.dataset.mapChoice||target.dataset.mapTarget;setOriginMode(false);drawFlight();root.querySelector('#map-announcement').textContent=t('출발: ','Откуда: ')+name(origin);return;}
    if(target.dataset.mapCycle){const i=destinations.findIndex(d=>d.id===selected);choose(destinations[(i+Number(target.dataset.mapCycle)+destinations.length)%destinations.length].id,true);}
    else choose(target.dataset.mapChoice||target.dataset.mapTarget,true);
  });
  root.addEventListener('focusin',event=>{if(!choosingOrigin&&event.target.matches('[data-map-choice]'))choose(event.target.dataset.mapChoice,true);});
  root.querySelector('#flight-origin').addEventListener('change',event=>{origin=event.target.value;setOriginMode(false);drawFlight();});
  root.addEventListener('keydown',event=>{if(event.key==='Escape')setOriginMode(false);});
  const onMotion=()=>drawFlight(true);motion.addEventListener('change',onMotion);
  choose(selected);
  return ()=>{cancelAnimationFrame(frame);clearTimeout(finishTimer);motion.removeEventListener('change',onMotion);};
}
