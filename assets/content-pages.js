import { guideContent } from './content-data.js';

export const contentPlaces=Object.values(guideContent).flatMap(d=>d.places);
export const findContentPlace=id=>contentPlaces.find(p=>p.id===id);
export const hasContent=id=>Boolean(guideContent[id]);
const labels={culture:['문화와 역사','Культура и история'],parks:['공원과 가족 여행','Парки и семья'],shopping:['시장과 쇼핑','Рынки и покупки'],mountains:['산과 전망','Горы и виды']};
const koTopics={'practical-airport-taxi':'공항 택시','practical-airport-bus':'공항 버스','practical-bus':'시내 버스','practical-metro':'지하철','practical-taxi':'시내 택시','practical-stay-center':'도심 숙박','practical-stay-south':'산악 여행을 위한 숙소','practical-food-beshbarmak':'베슈바르마크','practical-food-kazy':'카지','practical-food-market':'시장 구매'};

function helpers(ctx){
  const {esc,t,lang,tr}=ctx;
  const name=p=>lang==='ko'?p.name.ko||p.name.ru:p.name.ru;
  const prose=(value,cls='')=>String(typeof value==='object'?tr(value):value||'').split(/\n\s*\n/).filter(Boolean).map(s=>`<p lang="${lang}" class="${cls}">${esc(s)}</p>`).join('');
  const koNotice=()=>'';
  const card=p=>`<a class="place-card content-place" data-place-id="${esc(p.id)}" href="#/places/${esc(p.id)}">${ctx.picture(p.id==='kok-tobe'?'kok-tobe-panorama':p.id,name(p))}<div class="place-card-body"><span class="place-kind">${esc(t(...labels[p.category]))}</span><h3>${esc(name(p))}</h3>${p.closed?`<span class="access-badge">${t('재건축으로 휴장','Закрыт на реконструкцию')}</span>`:p.accessPending?`<span class="access-badge">${t('방문 조건 확인 필요','Доступ нужно уточнить')}</span>`:''}<p class="card-summary" lang="${lang}">${esc(tr(p.copy.card))}</p><span class="card-link">${t('방문 안내','Подробнее о месте')} →</span></div></a>`;
  return {name,prose,koNotice,card};
}

function explorer(data,group,ctx){
  const {t,esc}=ctx;
  const categories=[...new Set(data.places.filter(p=>p.group===group).map(p=>p.category))];
  const id=`places-${group}`;
  return `<div class="place-explorer" data-place-group="${group}"><div class="place-tools"><div class="filter-row" aria-label="${t('명소 분류','Категории мест')}"><button class="chip" data-place-filter="all" aria-pressed="true">${t('전체','Все')}</button>${categories.map(key=>`<button class="chip" data-place-filter="${key}" aria-pressed="false">${esc(t(...labels[key]))}</button>`).join('')}</div><label class="place-search-label">${t('장소 검색','Найти место')}<input type="search" data-place-search placeholder="${t('이름 입력','Название места')}" autocomplete="off" aria-controls="${id}"></label></div><p class="small muted" data-place-count role="status"></p><div class="place-grid" id="${id}" data-place-grid></div><button class="button place-more" data-place-more aria-expanded="false" aria-controls="${id}">${t('더 보기','Показать ещё')}</button></div>`;
}

function practicalList(data,section,ctx){
  const {esc,t,lang,tr}=ctx;
  const rows=data.practical.filter(p=>section.includes(p.section));
  return `<div class="practical-answers">${rows.map(p=>`<details class="guide-answer"><summary>${esc(t(koTopics[p.id]||p.title,p.title))}</summary><div class="answer-body"><p lang="${lang==='ko'?'ko':'ru'}">${esc(tr(p.copy.answer))}</p><p class="small muted" lang="${lang}">${esc(tr(p.copy.detail))}</p>${p.source?`<a class="small" href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">${t('출처 보기','Источник')} ↗</a>`:''}</div></details>`).join('')}</div>`;
}

function itinerary(data,ctx){
  const {t,esc,tr,lang}=ctx,{name}=helpers(ctx);
  const groups=[...new Set(data.routes.map(r=>r.id))];
  return `<div class="notice">${t('동선 초안입니다. 이동 시간과 방문 조건을 확인한 뒤 확정합니다.','Это варианты последовательности, а не готовое расписание. Переезды и условия посещения ещё проверяются.')}</div><div class="itinerary-grid">${groups.map(id=>{
    const stops=data.routes.filter(r=>r.id===id).sort((a,b)=>a.day-b.day||a.order-b.order);
    return `<details class="itinerary-card"><summary><span class="eyebrow">${t(stops[0].parent?'3일차 대안':'동선 초안',stops[0].parent?'Вариант третьего дня':'План-заготовка')}</span><span lang="${lang}">${esc(tr(stops[0].copy.title))}</span></summary><ol>${stops.map(r=>{const p=findContentPlace(r.placeId);return `<li><span class="small muted">${t(`${r.day}일차`,`День ${r.day}`)}</span><a href="#/places/${esc(p.id)}">${esc(name(p))}</a><p class="small" lang="${lang}">${esc(tr(r.copy.note))}</p></li>`;}).join('')}</ol></details>`;
  }).join('')}</div>`;
}

export function contentDestinationPage(d,ctx){
  const data=guideContent[d.id],{t,esc,tr,lang}=ctx,{prose,koNotice}=helpers(ctx);
  const nav=[['overview',t('소개','Обзор')],['places',t('명소','Что посмотреть')],['nearby',t('근교','Окрестности')],['transport',t('교통','Транспорт')],['stay',t('숙박과 음식','Проживание и еда')],['itinerary',t('일정','Маршруты')],['videos',t('영상','Видео')]];
  return `${ctx.breadcrumb([{label:ctx.tr(d.name)}])}<section class="hero"><div class="wrap hero-inner"><div class="hero-text"><span class="eyebrow">${esc(d.latin)}</span><h1>${esc(ctx.tr(d.name))}</h1><p>${esc(tr(data.copy.intro))}</p>${ctx.saveButton(d.id)}</div>${ctx.picture(d.id,ctx.tr(d.name))}</div></section>${ctx.localNav(nav)}<div class="wrap content columns content-guide"><div>${koNotice()}<section class="section" id="overview">${ctx.sectionTitle(t('소개','Обзор'))}<div class="editorial-overview">${prose(tr(data.copy.overview).split('\n\n').slice(0,2).join('\n\n'))}<details class="overview-more"><summary>${t('여행 계획 더 보기','Подробнее о планировании')}</summary>${prose(tr(data.copy.overview).split('\n\n').slice(2).join('\n\n'))}</details></div><div class="fact-grid"><div><strong>${t('계절','Когда ехать')}</strong><span lang="${lang}">${esc(tr(data.copy.seasons))}</span></div><div><strong>${t('여행 기간','Сколько времени')}</strong><span lang="${lang}">${esc(tr(data.copy.duration))}</span></div><div><strong>${t('여행 유형','Кому подойдёт')}</strong><span lang="${lang}">${esc(tr(data.copy.audience))}</span></div></div></section><section class="section" id="places">${ctx.sectionTitle(t('시내 명소','Что посмотреть в городе'),t('관심사로 선택','Выбирайте по интересу'))}${explorer(data,'city',ctx)}</section><section class="section" id="nearby">${ctx.sectionTitle(t('산과 근교','Горы и окрестности'))}<p>${t('목적지를 따로 선택하고 교통과 날씨를 확인하세요.','Каждый выезд планируйте отдельно: выберите место, затем проверьте дорогу, погоду и условия доступа.')}</p>${explorer(data,'nearby',ctx)}</section><section class="section" id="transport">${ctx.sectionTitle(t('교통','Как добраться и перемещаться'))}${practicalList(data,['Прибытие','Городской транспорт'],ctx)}</section><section class="section" id="stay">${ctx.sectionTitle(t('숙박과 음식','Где жить и что попробовать'))}${practicalList(data,['Проживание','Еда'],ctx)}</section><section class="section" id="itinerary">${ctx.sectionTitle(t('여행 일정','Маршруты'))}${itinerary(data,ctx)}<p><a href="#/routes/${d.id}">${t('전체 일정 초안','Все варианты маршрутов')} →</a></p></section><section class="section" id="videos">${ctx.sectionTitle(t('여행지 영상','Видео о направлении'))}${ctx.promoCard(d)}</section><p class="source-note">${t('검토 날짜','Дата сверки')}: ${esc(data.checkedAt)} · ${t('실용 조건은 출발 전에 다시 확인하세요.','Практические условия проверяйте повторно перед поездкой.')}</p></div><aside class="sidebar"><div class="sidebar-panel"><h3>${t('여행 계획','Начните здесь')}</h3><span class="label">${t('검색용 이름','Местное название')}</span><strong>${esc(d.local)}</strong><button class="button" data-copy="${esc(d.local)}">${t('이름 복사','Копировать название')}</button><nav class="sidebar-sections" aria-label="${t('빠른 이동','Быстрый переход')}">${nav.slice(1,6).map(([id,label])=>`<a href="#${id}" data-scroll="${id}">${esc(label)} →</a>`).join('')}</nav></div><div class="sidebar-panel"><h3>${t('중요 사항','Что учесть')}</h3><p>${t('일부 장소는 재건축 또는 접근 제한이 있습니다. 각 장소의 안내를 확인하세요.','У отдельных мест есть реконструкция или ограничения доступа. Смотрите отметки на карточках и условия на странице места.')}</p><a class="button" href="#/prepare">${t('여행 준비','Подготовка к поездке')}</a></div></aside></div>`;
}

export function contentPlacePage(p,ctx){
  const {esc,t,tr,lang}=ctx,{name,prose,koNotice,card}=helpers(ctx);
  const nav=[['overview',t('소개','Обзор')],['transport',t('교통','Как добраться')],['practical',t('방문 정보','Перед посещением')],['sources',t('출처','Источники')]];
  const related=guideContent[p.destination].places.filter(x=>x.id!==p.id&&x.group===p.group&&x.category===p.category&&!x.closed).slice(0,2);
  const facts=[['운영 시간','Режим и выходные',p.visitor.hours,p.hoursStatus],['요금','Билет и стоимость',p.visitor.price,p.priceStatus],['방문 시간','Время на месте',p.visitor.duration,'editorial']];
  const uniqueSources=[...new Map(p.sources.map(s=>[s.url,s])).values()];
  return `${ctx.breadcrumb([{label:t('알마티','Алматы'),href:'#/destinations/almaty'},{label:name(p)}])}<div class="wrap"><div class="page-heading"><div><span class="eyebrow">ALMATY / ${esc(t(...labels[p.category]))}</span><h1>${esc(name(p))}</h1><p lang="${lang}">${esc(tr(p.copy.card))}</p></div>${ctx.saveButton(p.id)}</div>${p.id==='kok-tobe'?ctx.gallery():ctx.picture(p.id,name(p),'place-hero-media')}</div>${ctx.localNav(nav)}<div class="wrap content columns content-guide"><div>${koNotice()}${p.closed||p.accessPending?`<div class="notice access-notice" lang="${lang}">${esc(tr(p.visitor.access))}</div>`:''}<section class="section" id="overview">${ctx.sectionTitle(t('소개','Что это за место'))}${prose(p.copy.body)}</section><section class="section" id="transport">${ctx.sectionTitle(t('가는 방법','Как добраться'))}${p.id==='kok-tobe'?`<div id="transport-content">${ctx.transportPanels()}</div>`:prose(p.visitor.transport)}<div class="address-box"><span class="label">${t('주소 또는 위치','Адрес или ориентир')}</span><p lang="${lang}">${esc(p.visitor.address?tr(p.visitor.address):t('정확한 방문자 입구는 확인 중입니다.','Точный вход пока уточняется.'))}</p>${p.address?`<button class="button" data-copy="${esc(p.address)}">${t('주소 복사','Копировать адрес')}</button>`:''}</div></section><section class="section" id="practical">${ctx.sectionTitle(t('방문 전 확인','Перед посещением'))}<dl class="visit-facts">${facts.map(([ko,ru,value,status])=>`<div><dt>${t(ko,ru)}</dt><dd lang="${lang}">${esc(value?tr(value):t('아직 확인되지 않았습니다. 방문 전에 문의하세요.','Не подтверждено. Уточните перед посещением.'))}</dd><small>${status==='editorial'?t('편집자의 시간 추정','Редакционная оценка'):value&&status==='Подтверждено источником'?t('출처 확인','По опубликованному источнику'):t('추가 확인 필요','Требует уточнения')}</small></div>`).join('')}</dl>${p.access?`<div class="notice" lang="${lang}">${esc(tr(p.visitor.access))}</div>`:''}</section><section class="section" id="sources">${ctx.sectionTitle(t('출처와 확인','Источники и дата сверки'))}<p class="small">${t('검토 날짜','Сверено')}: ${esc(p.checkedAt)}</p><ul class="source-links">${uniqueSources.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" lang="${lang}">${esc(lang==='ko'?s.labelKo:s.label)} ↗</a>${s.status!=='Подтверждено источником'?`<span class="small muted"> · ${t('추가 확인 필요','Есть условия для уточнения')}</span>`:''}</li>`).join('')}</ul><details class="guide-answer"><summary>${t('아직 확인 중인 내용','Что ещё уточняем')}</summary><div class="answer-body" lang="${lang}">${esc(tr(p.visitor.gaps))}</div></details></section>${related.length?`<div class="section-title"><h2>${t('함께 살펴보기','Также посмотрите')}</h2></div><div class="place-grid">${related.map(card).join('')}</div>`:''}<p class="return-link"><a href="#/destinations/${p.destination}">← ${t('도시 가이드로 돌아가기','Вернуться к путеводителю по Алматы')}</a></p></div><aside class="sidebar"><div class="sidebar-panel"><h3>${t('방문 계획','План посещения')}</h3><span class="label">${t('검색용 이름','Местное название')}</span><strong>${esc(p.local)}</strong><button class="button" data-copy="${esc(p.local)}">${t('이름 복사','Копировать название')}</button>${p.mapUrl?`<a class="button" href="${esc(p.mapUrl)}" target="_blank" rel="noopener noreferrer">${t('2GIS에서 보기','Посмотреть в 2ГИС')} ↗</a><small>${t('표시는 방문자 입구와 다를 수 있습니다.','Метка объекта может отличаться от входа для посетителей.')}</small>`:''}<p class="small">${t('사진과 영상 준비 중','Фото и видео пока готовятся')}</p></div><div class="sidebar-panel"><a class="button" href="#/routes/${p.destination}">${t('여행 일정 초안','Варианты маршрутов')}</a><a class="button" href="#/destinations/${p.destination}">${t('도시 가이드','Путеводитель по Алматы')}</a></div></aside></div>`;
}

export function contentRoutesPage(d,ctx){
  const {t,esc}=ctx;
  return `${ctx.breadcrumb([{label:t('여행 일정','Маршруты'),href:'#/routes'},{label:ctx.tr(d.name)}])}<div class="wrap content"><section class="section"><span class="eyebrow">${esc(d.latin)}</span><h1>${t('여행 일정: ','Маршруты: ')}${esc(ctx.tr(d.name))}</h1><p>${t('시내 방문과 장거리 여행을 따로 계획하세요.','Городские прогулки и дальние выезды планируем отдельно.')}</p>${helpers(ctx).koNotice()}${itinerary(guideContent[d.id],ctx)}</section><a class="button" href="#/destinations/${d.id}">${t('여행지 가이드 보기','Открыть путеводитель направления')} →</a></div>`;
}

export function contentSavedCard(p,ctx){
  const {name}=helpers(ctx);
  return `<a class="destination-card" href="#/places/${ctx.esc(p.id)}">${ctx.picture(p.id==='kok-tobe'?'kok-tobe-panorama':p.id,name(p))}<h3>${ctx.esc(name(p))}</h3><p>${ctx.t('알마티의 장소','Место в Алматы')}</p></a>`;
}

export function mountContentExplorers(ctx){
  const controller=new AbortController();
  document.querySelectorAll('[data-place-group]').forEach(root=>{
    const data=guideContent.almaty.places.filter(p=>p.group===root.dataset.placeGroup);
    let filter='all',query='',expanded=false;
    const update=()=>{
      const matches=data.filter(p=>(filter==='all'||filter===p.category)&&[p.name.ru,p.name.ko,p.local,p.latin].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));
      const shown=expanded||query.trim()?matches:matches.slice(0,6);
      root.querySelector('[data-place-grid]').innerHTML=shown.length?shown.map(helpers(ctx).card).join(''):`<div class="empty-block">${ctx.t('검색 결과가 없습니다.','Ничего не найдено. Измените запрос или категорию.')}</div>`;
      root.querySelector('[data-place-count]').textContent=ctx.t(`${shown.length} / ${matches.length}개`,`Показано ${shown.length} из ${matches.length}`);
      root.querySelectorAll('[data-place-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.placeFilter===filter)));
      const more=root.querySelector('[data-place-more]');more.hidden=shown.length===matches.length;more.setAttribute('aria-expanded',String(expanded));
    };
    root.addEventListener('click',e=>{
      const button=e.target.closest('button');if(!button)return;
      if(button.dataset.placeFilter){filter=button.dataset.placeFilter;expanded=false;update();}
      if(button.hasAttribute('data-place-more')){expanded=true;update();root.querySelectorAll('.place-card')[6]?.focus();}
    },{signal:controller.signal});
    root.querySelector('[data-place-search]').addEventListener('input',e=>{query=e.target.value;expanded=false;update();},{signal:controller.signal});
    update();
  });
  return ()=>controller.abort();
}
