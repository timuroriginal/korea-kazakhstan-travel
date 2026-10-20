import { applyRegionalRefinements } from './regional-refinements.js';
import { applyOskemenPlans } from './oskemen-plans.js';
import { applyBurabayPlans } from './burabay-plans.js';
import { applyAktauPlans } from './aktau-plans.js';
import { applyTurkistanPlans } from './turkistan-plans.js';
import { applyAstanaPlans } from './astana-plans.js';
import { applyAlmatyCohesion } from './almaty-cohesion.js';
import { applyLakeVisits } from './lakes-pair.js';
import { applyCharynDay } from './charyn-day.js';
import { applyAlmatyMountainDay } from './almaty-mountain-day.js';
import { almatyFirstDayStops } from './almaty-first-day.js';
import { guideContent as existingContent } from './content-data.js';
import { astanaContent } from './astana-data.js';
import { turkistanContent } from './turkistan-data.js';
import { aktauContent } from './aktau-data.js';
import { burabayContent } from './burabay-data.js';
import { oskemenContent } from './oskemen-data.js';
import { destinations } from './catalog.js';
import { applyVisitorUpdates } from './visitor-updates.js';
const reviewedContent=applyVisitorUpdates({...existingContent,astana:astanaContent,turkistan:turkistanContent,aktau:aktauContent,burabay:burabayContent,'ust-kamenogorsk':oskemenContent});

const plannedContent={...reviewedContent,'ust-kamenogorsk':applyOskemenPlans(reviewedContent['ust-kamenogorsk']),burabay:applyBurabayPlans(reviewedContent.burabay),aktau:applyAktauPlans(reviewedContent.aktau),turkistan:applyTurkistanPlans(reviewedContent.turkistan),astana:applyAstanaPlans(reviewedContent.astana),almaty:applyAlmatyCohesion(applyLakeVisits(applyCharynDay(applyAlmatyMountainDay({...reviewedContent.almaty,routes:[...almatyFirstDayStops,...reviewedContent.almaty.routes.filter(r=>r.id!=='route-1d')]}))))};

export const guideContent=applyRegionalRefinements(plannedContent);

export const contentPlaces=Object.values(guideContent).flatMap(d=>d.places);
export const findContentPlace=id=>contentPlaces.find(p=>p.id===id);
export const hasContent=id=>Boolean(guideContent[id]);
const labels={water:['호수와 해안','Озёра и побережье'],museums:['박물관','Музеи'],walks:['산책','Прогулки'],culture:['문화와 역사','Культура и история'],parks:['공원과 가족 여행','Парки и семья'],shopping:['시장과 쇼핑','Рынки и покупки'],mountains:['산과 전망','Горы и виды'],architecture:['건축과 전망','Архитектура и виды'],food:['음식','Еда'],nature:['자연','Природа']};
const koTopics={'practical-airport-taxi':'공항 택시','practical-airport-bus':'공항 버스','practical-bus':'시내 버스','practical-metro':'지하철','practical-taxi':'시내 택시','practical-stay-center':'도심 숙박','practical-stay-south':'산악 여행을 위한 숙소','practical-food-beshbarmak':'베슈바르마크','practical-food-kazy':'카지','practical-food-market':'시장 구매'};

function helpers(ctx){
  const {esc,t,lang,tr}=ctx;
  const name=p=>lang==='ko'?p.name.ko||p.name.ru:p.name.ru;
  const prose=(value,cls='')=>String(typeof value==='object'?tr(value):value||'').split(/\n\s*\n/).filter(Boolean).map(s=>`<p lang="${lang}" class="${cls}">${esc(s)}</p>`).join('');
  const koNotice=()=>'';
  const destinationName=id=>tr(destinations.find(d=>d.id===id).name);
  const card=p=>`<a class="place-card content-place" data-place-id="${esc(p.id)}" href="#/places/${esc(p.id)}">${ctx.picture(p.id==='kok-tobe'?'kok-tobe-panorama':p.id,name(p))}<div class="place-card-body"><span class="place-kind">${esc(t(...labels[p.category]))}</span><h3>${esc(name(p))}</h3><div class="visit-tags"><span>${esc(tr(p.visit.format))}</span><span>${p.group==='city'?t('시내','В городе'):p.group==='far'?t('장거리 여행','Дальний выезд'):t('근교 여행','Выезд за город')}</span></div>${p.decision==='conditional'?`<span class="access-badge">${t('방문 조건 확인 필요','Есть условия посещения')}</span>`:''}${p.closed?`<span class="access-badge">${t('재건축으로 휴장','Закрыт на реконструкцию')}</span>`:p.accessPending?`<span class="access-badge">${t('접근 조건 미확인','Доступ не подтверждён')}</span>`:''}<p class="card-summary" lang="${lang}">${esc(tr(p.copy.card))}</p><span class="card-link">${t('방문 안내','Подробнее о месте')} →</span></div></a>`;
  return {name,prose,koNotice,card,destinationName};
}

function explorer(data,group,ctx){
  const {t,esc}=ctx;
  const categories=[...new Set(data.places.filter(p=>group==='all'||p.group===group||group==='nearby'&&p.group==='far').map(p=>p.category))];
  const id=`places-${group}`;
  return `<div class="place-explorer" data-destination="${data.places[0].destination}" data-place-group="${group}"><div class="place-tools"><div class="filter-row" aria-label="${t('명소 분류','Категории мест')}"><button class="chip" data-place-filter="all" aria-pressed="true">${t('전체','Все')}</button>${categories.map(key=>`<button class="chip" data-place-filter="${key}" aria-pressed="false">${esc(t(...labels[key]))}</button>`).join('')}</div><label class="place-search-label">${t('장소 검색','Найти место')}<input type="search" data-place-search placeholder="${t('이름 입력','Название места')}" autocomplete="off" aria-controls="${id}"></label></div><p class="small muted" data-place-count role="status"></p><div class="place-grid" id="${id}" data-place-grid></div><button class="button place-more" data-place-more aria-expanded="false" aria-controls="${id}">${t('더 보기','Показать ещё')}</button></div>`;
}

function planningMarkup(data,ctx){
  if(!data.planning)return '';
  const {t,tr,esc}=ctx,plan=data.planning,destination=data.places[0].destination;
  return `<section class="section" id="planning" data-destination-planning="${esc(destination)}" ${['almaty','astana','turkistan','aktau','burabay'].includes(destination)?'data-'+esc(destination)+'-planning':''}>${ctx.sectionTitle(esc(tr(plan.title)))}<p>${esc(tr(plan.intro))}</p><div class="place-grid">${plan.choices.map(c=>`<article class="practical-card" data-planning-choice="${esc(c.id)}"><span class="access-badge">${esc(tr(c.status))}</span><h3>${esc(tr(c.title))}</h3><p>${esc(tr(c.body))}</p><a href="#/routes/${esc(destination)}?plan=${esc(encodeURIComponent(c.routeId))}">${esc(tr(c.action))} →</a></article>`).join('')}</div><details class="guide-answer overview-more" data-duration-options><summary>${esc(tr(plan.durationTitle))}</summary><div class="answer-body">${plan.durations.map(d=>`<h3>${esc(tr(d.title))}</h3><p>${esc(tr(d.body))}</p>`).join('')}<p class="small muted">${esc(tr(plan.durationNote))}</p></div></details><p class="small muted">${esc(tr(plan.catalogueNote))}</p><div class="related-row"><a href="#transport" data-scroll="transport">${t('도착과 시내 이동','Прибытие и городское такси')} →</a><a href="#stay" data-scroll="stay">${t('숙박 지역과 음식','Районы проживания и еда')} →</a></div></section>`;
}

function seasonDetails(data,ctx){
  if(!data.seasons)return '';
  const {t,tr,esc}=ctx;
  return `<div class="season-details"><h3>${t('계절별 여행','По времени года')}</h3>${data.seasons.map(s=>`<details class="guide-answer"><summary>${esc(tr(s.period))}</summary><div class="answer-body"><p>${esc(tr(s.conditions))}</p><p>${esc(tr(s.plan))}</p></div></details>`).join('')}</div>`;
}

function practicalList(data,section,ctx){
  const {esc,t,lang,tr}=ctx;
  const rows=data.practical.filter(p=>section.includes(p.section));
  const answer=p=>`<details class="guide-answer" data-practical-id="${esc(p.id)}"><summary>${esc(t(p.titleKo||koTopics[p.id]||p.title,p.title))}</summary><div class="answer-body"><p lang="${lang}">${esc(tr(p.copy.answer))}</p>${tr(p.copy.detail)?`<p class="small muted" lang="${lang}">${esc(tr(p.copy.detail))}</p>`:''}</div></details>`;
  const secondary=rows.filter(p=>p.secondary);
  return `<div class="practical-answers">${rows.filter(p=>!p.secondary).map(answer).join('')}${secondary.length?`<details class="guide-answer transport-alternatives"><summary>${t('대중교통 등 다른 이동 방법','Другие способы перемещения')}</summary><div class="answer-body">${secondary.map(answer).join('')}</div></details>`:''}${section.includes('Еда')?`<p class="small muted" data-language-help>${t('메뉴를 읽기 어렵다면 휴대전화 카메라 번역을 활용할 수 있습니다. 대화가 필요할 때는 짧은 글을 번역해 화면으로 주고받는 방법도 있습니다.','Если меню трудно прочитать, можно воспользоваться переводом через камеру телефона. Для общения пригодится перевод коротких сообщений на экране.')}</p>`:''}</div>`;
}

function natureJourneys(data,ctx,placeId){
  const journeys=(data.journeys||[]).filter(j=>!placeId||j.placeIds.includes(placeId));
  if(!journeys.length)return '';
  const {t,tr,esc,lang}=ctx,{name}=helpers(ctx);
  const paragraph=value=>`<p lang="${lang}">${esc(tr(value))}</p>`;
  return `<section class="section nature-journeys" id="journeys">${ctx.sectionTitle(t('숙박을 포함한 자연 여행','Отдых с ночёвкой'))}<p class="journeys-intro">${t('가고 싶은 풍경을 고른 뒤 활동과 숙박, 왕복 이동을 함께 살펴보세요. 각 구성에 실제 이용 조건을 담았습니다.','Выберите, ради каких пейзажей хочется поехать. В каждом варианте собраны занятия, ночёвка и дорога с условиями поездки.')}</p><div class="journey-list">${journeys.map(j=>`<details class="journey-card" data-journey="${esc(j.id)}"><summary><span class="eyebrow">${esc(tr(j.format))}</span><span class="journey-title" lang="${lang}">${esc(tr(j.title))}</span><span class="journey-tagline" lang="${lang}">${esc(tr(j.tagline))}</span><span class="journey-toggle">${t('여행 구성 보기','Как устроена поездка')} <span aria-hidden="true">↓</span></span></summary><div class="journey-body"><ol class="journey-steps"><li><h3>${t('여행의 이유','Ради чего ехать')}</h3>${paragraph(j.purpose)}</li><li><h3>${t('볼거리와 활동','Что посмотреть и чем заняться')}</h3>${paragraph(j.activities)}${j.placeIds.length?`<div class="journey-place-links">${j.placeIds.map(id=>{const p=findContentPlace(id);return `<a href="#/places/${esc(id)}">${esc(name(p))} →</a>`;}).join('')}</div>`:''}</li><li><h3>${t('머무를 곳','Где переночевать')}</h3><ul class="journey-stays">${j.stays.map(s=>`<li><h4>${esc(s.name)}</h4><p class="stay-room" lang="${lang}">${esc(tr(s.room))}</p>${paragraph(s.description)}</li>`).join('')}</ul></li><li><h3>${t('가는 길과 돌아오는 길','Как добраться и вернуться')}</h3><h4>${t('가는 길','Дорога туда')}</h4>${paragraph(j.transport)}<h4>${t('돌아오는 길','Возвращение')}</h4>${paragraph(j.returnTransport)}</li></ol><div class="notice journey-limits"><h4>${t('이용 조건','Условия поездки')}</h4>${paragraph(j.limits)}</div></div></details>`).join('')}</div></section>`;
}

function stayOptionMarkup(stay,ctx){
  if(!stay)return '';
  const {esc,tr}=ctx;
  return `<details class="guide-answer stay-option" data-stay-option><summary>${esc(tr(stay.title))}</summary><div class="answer-body"><h3>${esc(stay.name)}</h3><p class="stay-room">${esc(tr(stay.room))}</p><p>${esc(tr(stay.body))}</p><p class="small muted">${esc(tr(stay.limits))}</p></div></details>`;
}

function dayPlanMarkup(plan,ctx){
  const {t,tr,esc,lang}=ctx,{name}=helpers(ctx);
  const details=items=>items.map(item=>`<details class="guide-answer"><summary>${esc(tr(item.title))}</summary><div class="answer-body"><p lang="${lang}">${esc(tr(item.body))}</p>${(item.placeIds||[]).map(id=>`<p><a href="#/places/${esc(id)}">${esc(name(findContentPlace(id)))} →</a></p>`).join('')}</div></details>`).join('');
  return `<div class="day-plan" data-day-plan><p lang="${lang}">${esc(tr(plan.intro))}</p>${plan.notice?`<div class="notice mountain-season-notice">${esc(tr(plan.notice))}</div>`:''}<div class="fact-grid">${plan.facts.map(f=>`<div><strong>${esc(tr(f.label))}</strong><span>${esc(tr(f.value))}</span></div>`).join('')}</div><ol class="steps${plan.stops.length===2?' steps-pair':''}">${plan.stops.map(stop=>`<li><strong>${esc(tr(stop.period))}</strong><a href="#/places/${esc(stop.placeId)}">${esc(stop.label?tr(stop.label):name(findContentPlace(stop.placeId)))}</a><span>${esc(tr(stop.time))}</span><p>${esc(tr(stop.note))}</p><p class="small muted">${esc(tr(stop.next))}</p></li>`).join('')}</ol><details class="guide-answer day-plan-food"><summary>${esc(tr(plan.food.title))}</summary><div class="answer-body"><p>${esc(tr(plan.food.body))}</p><p class="small muted">${esc(tr(plan.food.limits))}</p>${plan.food.placeId?`<p><a href="#/places/${esc(plan.food.placeId)}">${esc(name(findContentPlace(plan.food.placeId)))} →</a></p>`:''}${plan.food.address?`<p lang="ru">${esc(plan.food.address)}</p><button class="button" data-copy="${esc(plan.food.address)}">${t('주소 복사','Копировать адрес')}</button>`:''}</div></details>${stayOptionMarkup(plan.stay,ctx)}${details(plan.conditions)}${plan.searchName?`<div class="show-phrase"><p>${plan.searchLabel?esc(tr(plan.searchLabel)):t('차량 목적지를 찾을 때 사용할 아래쪽 승강장 이름입니다.','Название нижней станции для поиска места назначения.')}</p><p lang="ru">${esc(plan.searchName)}</p><button class="button" data-copy="${esc(plan.searchName)}">${plan.searchCopyLabel?esc(tr(plan.searchCopyLabel)):t('승강장 이름 복사','Копировать название станции')}</button></div>`:''}<p><a href="#/prepare/transport">${t('택시 이용 안내','Как пользоваться такси')} →</a></p></div>`;
}

function itinerary(data,ctx){
  const {t,esc,tr,lang}=ctx,{name}=helpers(ctx);
  const groups=[...new Set(data.routes.map(r=>r.id))];
  const statusLabels={
    'ticket-dependent':['공연일과 입장권 필요','Нужен билет на выбранный спектакль'],
    'roundtrip-needed':['왕복 차량 필요','Нужна машина туда и обратно'],
    'blocked-transport-and-language':['차량과 이해 가능한 안내 미준비','Транспорт и понятное сопровождение не подготовлены'],
    'blocked-stay-and-transport':['숙박과 전체 차량 일정 미준비','Ночёвка и полный выезд не подготовлены'],
    'seasonal-lifts':['케이블카 운행 조건에 따라 방문','Зависит от работы канатных дорог'],
    'conditional-language':['한국어 동행 미확인','Корейское сопровождение не подтверждено'],
    'blocked-transport':['귀환 교통편 미준비','Обратный транспорт не подготовлен'],
    'blocked-entry':['입구와 방문 조건 미확인','Вход и условия посещения не подтверждены'],
    'blocked-entry-and-transport':['입장 조건과 귀환 차량 미준비','Вход и обратный транспорт не подготовлены'],
    'blocked-permit-and-transport':['출입 조건과 교통편 미확인','Допуски и транспорт не подтверждены']
  };
  return `<div class="notice">${data.itineraryNote?esc(tr(data.itineraryNote)):t('동선 초안입니다. 이동 시간과 방문 조건을 확인한 뒤 확정합니다.','Это варианты последовательности, а не готовое расписание. Переезды и условия посещения ещё проверяются.')}</div><div class="itinerary-grid">${groups.map(id=>{
    const stops=data.routes.filter(r=>r.id===id).sort((a,b)=>a.day-b.day||a.order-b.order);
    const first=stops[0],status=statusLabels[first.status];
    const stopLink=r=>{const p=findContentPlace(r.placeId);return `<a href="#/places/${esc(p.id)}">${esc(name(p))}</a>${r.optional?`<span class="small muted"> ${t('선택 방문','По желанию')}</span>`:''}`;};
    const sequence=first.dayPlan?dayPlanMarkup(first.dayPlan,ctx):first.blocks?`<p lang="${lang}">${esc(tr(first.copy.note))}</p><ol class="route-blocks">${first.blocks.map(block=>`<li><h3>${esc(tr(block.title))}</h3>${block.body?`<p lang="${lang}">${esc(tr(block.body))}</p>`:''}${block.placeIds.map(placeId=>stopLink(stops.find(r=>r.placeId===placeId))).join('<br>')}${stayOptionMarkup(block.stay,ctx)}</li>`).join('')}</ol>`:`<ol>${stops.map(r=>`<li><span class="small muted">${t(`${r.day}일차`,`День ${r.day}`)}</span>${stopLink(r)}<p class="small" lang="${lang}">${esc(tr(r.copy.note))}</p></li>`).join('')}</ol>`;
    return `<details class="itinerary-card${first.dayPlan?' itinerary-day-plan':''}" data-route-id="${esc(id)}"><summary><span class="eyebrow">${first.copy.format?esc(tr(first.copy.format)):t(first.parent?'3일차 대안':'방문 순서',first.parent?'Вариант третьего дня':'Порядок посещения')}</span><span lang="${lang}">${esc(tr(first.copy.title))}</span>${status?`<span class="access-badge">${t(...status)}</span>`:''}</summary>${sequence}${first.copy.transport?`<div class="route-transport"><h3>${t('이동','Переезды')}</h3><p lang="${lang}">${esc(tr(first.copy.transport))}</p><h3>${t('귀환','Возвращение')}</h3><p lang="${lang}">${esc(tr(first.copy.returnTransport))}</p></div>`:''}</details>`;
  }).join('')}</div>`;
}

export function contentDestinationPage(d,ctx){
  const data=guideContent[d.id],{t,esc,tr,lang}=ctx,{prose,koNotice}=helpers(ctx);
  const nav=[['overview',t('소개','Обзор')],...(data.planning?[['planning',t('일정 선택','С чего начать')]]:[]),['places',t('명소','Что посмотреть')],['nearby',t('근교','Окрестности')],...(data.journeys?.length?[['journeys',t('자연과 숙박','Отдых с ночёвкой')]]:[]),['transport',t('교통','Транспорт')],['stay',t('숙박과 음식','Проживание и еда')],['itinerary',t('일정','Маршруты')],['videos',t('영상','Видео')]];
  return `${ctx.breadcrumb([{label:ctx.tr(d.name)}])}<section class="hero"><div class="wrap hero-inner"><div class="hero-text"><span class="eyebrow">${esc(d.latin)}</span><h1>${esc(ctx.tr(d.name))}</h1><p>${esc(tr(data.copy.intro))}</p>${ctx.saveButton(d.id)}</div>${ctx.picture(d.id,ctx.tr(d.name))}</div></section>${ctx.localNav(nav)}<div class="wrap content columns content-guide"><div>${koNotice()}<section class="section" id="overview">${ctx.sectionTitle(t('소개','Обзор'))}<div class="editorial-overview">${prose(tr(data.copy.overview).split('\n\n').slice(0,2).join('\n\n'))}<details class="overview-more"><summary>${t('여행 계획 더 보기','Подробнее о планировании')}</summary>${prose(tr(data.copy.overview).split('\n\n').slice(2).join('\n\n'))}</details>${seasonDetails(data,ctx)}</div><div class="fact-grid"><div><strong>${t('계절','Когда ехать')}</strong><span lang="${lang}">${esc(tr(data.copy.seasons))}</span></div><div><strong>${t('여행 기간','Сколько времени')}</strong><span lang="${lang}">${esc(tr(data.copy.duration))}</span></div><div><strong>${t('여행 유형','Кому подойдёт')}</strong><span lang="${lang}">${esc(tr(data.copy.audience))}</span></div></div></section>${planningMarkup(data,ctx)}<section class="section" id="places">${ctx.sectionTitle(t('명소와 자연','Что посмотреть'),t('관심사로 선택','Выбирайте по интересу'))}${explorer(data,'all',ctx)}</section><section class="section" id="nearby">${ctx.sectionTitle(data.nearbyTitle?tr(data.nearbyTitle):d.id==='astana'?t('도시 밖으로','За пределами города'):t('산과 근교','Горы и окрестности'))}<p>${data.nearbyCopy?esc(tr(data.nearbyCopy)):d.id==='astana'?t('알지르와 코르갈진은 별도의 외곽 일정입니다. 카를라크는 카라간다주 돌린카에 있어 더 먼 여행으로 구분합니다.','АЛЖИР и Коргалжын требуют отдельных выездов. Карлаг находится в Долинке Карагандинской области и относится к дальним поездкам.'):t('리조트 방문, 호숫가 산책과 고산 산행은 다른 일정입니다. 방문 방식과 신체 부담을 비교할 수 있습니다.','Курорт, прогулка у озера и высокогорный поход требуют разных планов. Сравните формат посещения и нагрузку.')}</p>${explorer(data,'nearby',ctx)}</section>${natureJourneys(data,ctx)}<section class="section" id="transport">${ctx.sectionTitle(t('교통','Как добраться и перемещаться'))}${practicalList(data,['Прибытие','Городской транспорт','Выезды','Язык'],ctx)}<p><a class="button" data-transport-preparation href="#/prepare/transport">${t('택시 이용 순서와 근교 이동','Как пользоваться такси и планировать выезд')} →</a></p></section><section class="section" id="stay">${ctx.sectionTitle(t('숙박과 음식','Где жить и что попробовать'))}${practicalList(data,['Проживание','Еда'],ctx)}</section><section class="section" id="itinerary">${ctx.sectionTitle(t('여행 일정','Маршруты'))}${itinerary(data,ctx)}<p><a href="#/routes/${d.id}">${t('전체 일정 초안','Все варианты маршрутов')} →</a></p></section><section class="section" id="videos">${ctx.sectionTitle(t('여행지 영상','Видео о направлении'))}${ctx.promoCard(d)}</section></div><aside class="sidebar"><div class="sidebar-panel"><h3>${t('여행 계획','Начните здесь')}</h3><span class="label">${t('검색용 이름','Местное название')}</span><strong>${esc(d.local)}</strong><button class="button" data-copy="${esc(d.local)}">${t('이름 복사','Копировать название')}</button><nav class="sidebar-sections" aria-label="${t('빠른 이동','Быстрый переход')}">${nav.filter(([id])=>!['overview','videos'].includes(id)).map(([id,label])=>`<a href="#${id}" data-scroll="${id}">${esc(label)} →</a>`).join('')}</nav></div><div class="sidebar-panel"><h3>${t('중요 사항','Что учесть')}</h3><p>${data.visitorNote?esc(tr(data.visitorNote)):t('일부 장소는 재건축 또는 접근 제한이 있습니다. 각 장소의 안내를 확인하세요.','У отдельных мест есть реконструкция или ограничения доступа. Смотрите отметки на карточках и условия на странице места.')}</p><a class="button" href="#/prepare">${t('여행 준비','Подготовка к поездке')}</a></div></aside></div>`;
}

export function contentPlacePage(p,ctx){
  const {esc,t,tr,lang}=ctx,{name,prose,koNotice,card,destinationName}=helpers(ctx);
  const destination=destinations.find(d=>d.id===p.destination);
  const nav=[['overview',t('소개','Обзор')],...(p.stay?[['stay',t('숙박 선택','Ночёвка по желанию')]]:[]),...((guideContent[p.destination].journeys||[]).some(j=>j.placeIds.includes(p.id))?[['journeys',t('자연과 숙박','Отдых с ночёвкой')]]:[]),['transport',t('교통','Как добраться')],['practical',t('방문 정보','Перед посещением')]];
  const related=guideContent[p.destination].places.filter(x=>x.id!==p.id&&x.group===p.group&&x.category===p.category&&!x.closed).slice(0,2);
  const facts=[['운영 시간','Режим и выходные',p.visitor.hours,p.hoursStatus],['요금','Билет и стоимость',p.visitor.price,p.priceStatus],['방문 시간','Время на месте',p.visitor.duration,'editorial'],...(['burabay','ust-kamenogorsk'].includes(p.destination)?[['입구','Вход',p.visitor.entrance],...(p.visitor.payment?[['결제','Оплата',p.visitor.payment]]:[])]:[])];
  return `${ctx.breadcrumb([{label:destinationName(p.destination),href:'#/destinations/'+p.destination},{label:name(p)}])}<div class="wrap"><div class="page-heading"><div><span class="eyebrow">${esc(destination.latin.toUpperCase())} / ${esc(t(...labels[p.category]))}</span><h1>${esc(name(p))}</h1><p lang="${lang}">${esc(tr(p.copy.card))}</p></div>${ctx.saveButton(p.id)}</div>${p.id==='kok-tobe'?ctx.gallery():ctx.picture(p.id,name(p),'place-hero-media')}</div>${ctx.localNav(nav)}<div class="wrap content columns content-guide"><div>${koNotice()}${p.closed||p.accessPending?`<div class="notice access-notice" lang="${lang}">${esc(tr(p.visitor.access))}</div>`:''}<section class="section" id="overview">${ctx.sectionTitle(t('소개','Что это за место'))}${prose(p.copy.body)}</section>${p.stay?`<section class="section" id="stay">${ctx.sectionTitle(t('숙박 선택','Ночёвка по желанию'))}${stayOptionMarkup(p.stay,ctx)}</section>`:''}${natureJourneys(guideContent[p.destination],ctx,p.id)}<section class="section" id="transport">${ctx.sectionTitle(t('가는 방법','Как добраться'))}${p.id==='kok-tobe'?`<div id="transport-content">${ctx.transportPanels()}</div>`:prose(p.visitor.transport||{ru:'Готовый путь к началу прогулки пока не установлен.',ko:'산책 시작 지점까지의 이동 안내는 아직 확인되지 않았습니다.'})}${p.visitor.returnTransport?`<h3>${t('귀환','Возвращение')}</h3>${prose(p.visitor.returnTransport)}`:''}<div class="address-box"><span class="label">${t('주소 또는 위치','Адрес или ориентир')}</span><p lang="${lang}">${esc(p.visitor.address?tr(p.visitor.address):t('정확한 방문자 입구는 확인 중입니다.','Точный вход пока уточняется.'))}</p>${p.address?`<button class="button" data-copy="${esc(p.address)}">${t('주소 복사','Копировать адрес')}</button>`:''}</div></section><section class="section" id="practical">${ctx.sectionTitle(t('방문 전 확인','Перед посещением'))}<dl class="visit-guidance">${[['방문 방식','Формат',p.visit.format],['신체 부담','Нагрузка',p.visit.effort],['언어','Язык',p.visit.language]].map(([ko,ru,value])=>`<div><dt>${t(ko,ru)}</dt><dd lang="${lang}">${esc(tr(value))}</dd></div>`).join('')}</dl>${(p.actions||[]).length?`<div class="place-actions">${p.actions.map(a=>`<a class="button" data-visitor-action href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(tr(a.label))} ↗</a>`).join('')}</div>`:''}<dl class="visit-facts">${facts.map(([ko,ru,value,status])=>`<div><dt>${t(ko,ru)}</dt><dd lang="${lang}">${esc(value?tr(value):t('아직 확인되지 않았습니다.','Не подтверждено.'))}</dd></div>`).join('')}</dl>${(p.orderCards||[]).length?`<div class="dish-suggestions"><h3>${t('메뉴에서 살펴볼 음식','Что посмотреть в меню')}</h3>${p.orderCards.map(order=>`<p><strong>${esc(tr(order.label))}</strong> ${esc(tr(order.explanation))}</p>`).join('')}<p class="small muted" data-language-help>${t('메뉴를 읽기 어렵다면 휴대전화 카메라 번역을 활용할 수 있습니다. 원하는 음식을 메뉴에서 가리키는 방법도 있습니다.','Если меню трудно прочитать, можно воспользоваться переводом через камеру телефона. Для заказа удобно показать выбранное блюдо в меню.')}</p></div>`:''}${p.visitor.access?`<div class="notice" lang="${lang}">${esc(tr(p.visitor.access))}</div>`:''}</section>${related.length?`<div class="section-title"><h2>${t('함께 살펴보기','Также посмотрите')}</h2></div><div class="place-grid">${related.map(card).join('')}</div>`:''}<p class="return-link"><a href="#/destinations/${p.destination}">← ${t('도시 가이드로 돌아가기','Вернуться к путеводителю')}</a></p></div><aside class="sidebar"><div class="sidebar-panel"><h3>${t('방문 계획','План посещения')}</h3><span class="label">${t('검색용 이름','Местное название')}</span><strong>${esc(p.local)}</strong><button class="button" data-copy="${esc(p.local)}">${t('이름 복사','Копировать название')}</button><p class="small">${t('사진과 영상 준비 중','Фото и видео пока готовятся')}</p></div><div class="sidebar-panel"><a class="button"${p.planLink?' data-place-plan':''} href="#/routes/${p.destination}${p.planLink?'?plan='+esc(encodeURIComponent(p.planLink.routeId)):''}">${p.planLink?esc(tr(p.planLink.label)):t('여행 일정 초안','Варианты маршрутов')}</a><a class="button" href="#/destinations/${p.destination}">${t('도시 가이드','Путеводитель по городу')}</a></div></aside></div>`;
}

export function contentRoutesPage(d,ctx){
  const {t,esc}=ctx;
  return `${ctx.breadcrumb([{label:t('여행 일정','Маршруты'),href:'#/routes'},{label:ctx.tr(d.name)}])}<div class="wrap content"><section class="section"><span class="eyebrow">${esc(d.latin)}</span><h1>${t('여행 일정: ','Маршруты: ')}${esc(ctx.tr(d.name))}</h1><p>${t('시내 방문과 장거리 여행을 따로 계획하세요.','Городские прогулки и дальние выезды планируем отдельно.')}</p>${helpers(ctx).koNotice()}${natureJourneys(guideContent[d.id],ctx)}${guideContent[d.id].journeys?.length?`<h2>${t('그 밖의 방문 일정','Другие варианты посещения')}</h2>`:''}${itinerary(guideContent[d.id],ctx)}</section><a class="button" href="#/destinations/${d.id}">${t('여행지 가이드 보기','Открыть путеводитель направления')} →</a></div>`;
}

export function contentSavedCard(p,ctx){
  const {name}=helpers(ctx);
  return `<a class="destination-card" href="#/places/${ctx.esc(p.id)}">${ctx.picture(p.id==='kok-tobe'?'kok-tobe-panorama':p.id,name(p))}<h3>${ctx.esc(name(p))}</h3><p>${ctx.esc(helpers(ctx).destinationName(p.destination))}</p></a>`;
}

export function mountContentExplorers(ctx){
  const controller=new AbortController();
  document.querySelectorAll('[data-place-group]').forEach(root=>{
    const data=guideContent[root.dataset.destination].places.filter(p=>root.dataset.placeGroup==='all'||p.group===root.dataset.placeGroup||root.dataset.placeGroup==='nearby'&&p.group==='far');
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
