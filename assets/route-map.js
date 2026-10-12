import { mapData } from './map-data.js';

let selected='almaty';
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
  const regionTargets=Object.fromEntries(Object.entries(mapData.targetRegions).flatMap(([id,codes])=>codes.map(code=>[code,id])));
  const shapes=mapData.shapes.map(shape=>`<path class="map-area${regionTargets[shape.code]?' map-target':''}" data-region="${shape.code}"${regionTargets[shape.code]?` data-map-target="${regionTargets[shape.code]}"`:''} d="${shape.path}"><title>${escape(shape.name)}</title></path>`).join('');
  const markers=destinations.map(d=>{
    const p=mapData.points[d.id],offset=labelOffsets[d.id];
    return `<g class="map-marker" data-map-target="${d.id}" transform="translate(${p.x} ${p.y})"><circle class="marker-hit" r="23"/><circle class="marker-halo" r="15"/><circle class="marker-dot" r="6"/><text x="${offset[0]}" y="${offset[1]}" text-anchor="${offset[0]<0?'end':'start'}" class="map-label">${escape(tr(d.name))}</text></g>`;
  }).join('');
  return `<section class="section route-explorer${home?' map-home':''}" id="${home?'home-routes':'route-explorer'}" aria-label="${t('지도에서 여행지 선택','Выбор направления на карте')}"><div class="section-title"><h2>${home?t('여행 일정','Маршруты'):t('지도에서 여행 찾기','Выберите направление на карте')}</h2><span class="muted">${home?t('지도에서 여행지를 선택하세요','Выберите направление на карте'):t('지도와 카드가 함께 바뀝니다.','Карта и карточка связаны')}</span></div><div class="map-choices" aria-label="${t('여행지 목록','Список направлений')}">${destinations.map(d=>`<button class="map-choice" data-map-choice="${d.id}" aria-pressed="${d.id===selected}">${escape(tr(d.name))}</button>`).join('')}</div><div class="map-layout"><div class="map-selection"><div id="route-map-card"></div><div class="map-pagination"><button class="button" data-map-cycle="-1" aria-label="${t('이전 여행지','Предыдущее направление')}">←</button><span id="map-position" class="small muted"></span><button class="button" data-map-cycle="1" aria-label="${t('다음 여행지','Следующее направление')}">→</button></div><p class="map-instruction">${t('지도에 마우스를 올리거나 위의 여행지를 선택하세요. 휴대폰에서는 누르세요.','Наведите на область или метку, либо выберите направление сверху. На телефоне нажмите.')}</p></div><div class="map-surface"><svg class="kazakhstan-map" viewBox="0 0 ${mapData.width} ${mapData.height}" role="img" aria-labelledby="kaz-map-title kaz-map-desc"><title id="kaz-map-title">${t('카자흐스탄의 여섯 여행지','Шесть направлений Казахстана')}</title><desc id="kaz-map-desc">${t('지도와 여행지 선택 버튼은 같은 선택을 표시합니다. 부라바이는 아크몰라주에 있습니다.','Обзорная карта с административными границами. Выбор также доступен кнопками над картой. Бурабай находится в Акмолинской области.')}</desc><g class="map-regions" aria-hidden="true">${shapes}</g><g class="map-points" aria-hidden="true">${markers}</g></svg><div class="map-legend"><span><i class="legend-dot"></i>${t('여행지의 위치','Метка направления')}</span><span><i class="legend-region"></i>${t('선택한 관련 지역','Связанная область')}</span></div>${home?`<details class="map-details"><summary>${t('지도 정보와 출처','О карте и источниках')}</summary>`:''}<p class="map-caption">${t('관광 목적지와 행정구역은 서로 다릅니다. 부라바이 표시는 마을을 기준으로 합니다.','Туристическое направление и административная область — разные понятия. Метка Бурабая показывает посёлок как ориентир.')}</p>${home?'</details>':''}</div></div><div id="map-announcement" class="visually-hidden" role="status" aria-live="polite"></div><p class="map-credit">${t('경계','Границы')}: <a href="${mapData.source.boundaryURL}" target="_blank" rel="noopener noreferrer">UNHCR / HDX, 2023</a> · <a href="${mapData.source.boundaryLicenseURL}" target="_blank" rel="noopener noreferrer">CC BY 3.0 IGO</a> · ${t('위치','Точки')}: <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">GeoNames, CC BY 4.0</a> · ${t('개요용 단순화된 경계','Контуры упрощены для обзора')}</p></section>`;
}

export function mountRouteMap(lang,destinations,picture){
  const root=document.querySelector('.route-explorer');if(!root)return;
  const t=(ko,ru)=>lang==='ko'?ko:ru;
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
    if(announce)root.querySelector('#map-announcement').textContent=d.name[lang];
  }
  root.addEventListener('pointerover',event=>{
    const target=event.target.closest('[data-map-target]');
    if(target&&event.pointerType!=='touch'&&selected!==target.dataset.mapTarget)choose(target.dataset.mapTarget);
  });
  root.addEventListener('click',event=>{
    const target=event.target.closest('[data-map-target],[data-map-choice],[data-map-cycle]');if(!target)return;
    if(target.dataset.mapCycle){const i=destinations.findIndex(d=>d.id===selected);choose(destinations[(i+Number(target.dataset.mapCycle)+destinations.length)%destinations.length].id,true);}
    else choose(target.dataset.mapChoice||target.dataset.mapTarget,true);
  });
  root.addEventListener('focusin',event=>{if(event.target.matches('[data-map-choice]'))choose(event.target.dataset.mapChoice,true);});
  choose(selected);
}
