import { transportPreparationPage } from './transport-guide.js';
import { routeMapMarkup, mountRouteMap } from './route-map.js';
import { destinations, interests, practical, kokTobe, media } from './catalog.js';
import { contentPlaces, findContentPlace, hasContent, contentDestinationPage, contentPlacePage, contentRoutesPage, contentSavedCard, mountContentExplorers } from './content-pages.js';

const app = document.getElementById('app');
const dialog = document.getElementById('media-dialog');
const storageKey = 'kazakhstan-guide-v1';
let stored = {};
try { stored = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { /* Storage is optional. */ }
let lang = stored.lang === 'ru' ? 'ru' : 'ko';
let saved = new Set(Array.isArray(stored.saved) ? stored.saved.filter(id => findContentPlace(id) || destinations.some(d => d.id === id)) : []);
let filter = 'all';
let query = '';
let galleryIndex = 0;
let transportTab = 'cable';
let currentRoute = '';
let toastTimer;
let mapCleanup=()=>{};

const t = (ko, ru) => lang === 'ko' ? ko : ru;
const tr = value => typeof value === 'string' ? value : value?.[lang] || '';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeSrc = value => /^(assets\/|https:\/\/)/.test(value || '') ? esc(value) : '';
const destinationURL = id => `#/destinations/${id}`;
const placeURL = id => `#/places/${id}`;
const route = () => location.hash.replace(/^#\/?/, '').split('?')[0].replace(/\/+$/, '') || 'home';

function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify({ lang, saved: [...saved] })); return true; } catch { return false; }
}
function notify(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message; toast.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
}
function credit(item) {
  if (!item?.credit) return '';
  const source = /^https:\/\//.test(item.source || '') ? `<a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer">${esc(t('출처','Источник'))}</a>` : '';
  return `<div class="media-credit">${esc(item.credit)} ${source}</div>`;
}
function picture(key, label, extraClass = '') {
  const item = media[key];
  if (item?.kind === 'photo' && safeSrc(item.src)) return `<div class="media-slot has-image ${extraClass}"><img src="${safeSrc(item.src)}" alt="${esc(tr(item.alt) || label)}" loading="lazy" decoding="async"></div>${credit(item)}`;
  return `<div class="media-slot ${extraClass}"><span class="media-badge">${t('사진 준비 중','ФОТОЗАГЛУШКА')}</span><span class="placeholder-icon" aria-hidden="true">▧</span><span class="media-label">${esc(label)}</span><span class="small">${t('실제 사진이 추가될 자리입니다.','Здесь появится реальная фотография.')}</span></div>`;
}
function videoCard(key, title, subtitle) {
  const item = media[key];
  const poster = safeSrc(item?.poster) ? `<img src="${safeSrc(item.poster)}" alt="" loading="lazy">` : '';
  return `<button class="video-card" data-video="${key}" data-title="${esc(title)}"><div class="video-poster">${poster}<span class="video-placeholder-tag">${item?.src ? t('영상','ВИДЕО') : t('영상 준비 중','ВИДЕОЗАГЛУШКА')}</span><span class="play-circle" aria-hidden="true">▶</span><span class="video-label">${esc(t('선택하여 보기','Нажмите для просмотра'))}</span></div><h3>${esc(title)}</h3><p>${esc(subtitle)}</p></button>`;
}
function sectionTitle(title, caption = '') { return `<div class="section-title"><h2>${esc(title)}</h2>${caption ? `<span class="muted">${esc(caption)}</span>` : ''}</div>`; }
function empty(message) { return `<div class="empty-block"><p>${esc(message)}</p></div>`; }
function sourceNote() { return `<div class="source-note">${t('일부 여행 안내는 아직 준비 중입니다. 방문 조건이 정리되지 않은 곳은 확정 일정으로 안내하지 않습니다.','Часть практических инструкций ещё готовится. Места с неподготовленными условиями посещения не представлены как готовые маршруты.')}</div>`; }
function breadcrumb(items) { return `<nav class="breadcrumbs wrap" aria-label="${t('현재 위치','Путь страницы')}"><ol><li><a href="#/">${t('카자흐스탄','Казахстан')}</a></li>${items.map(item => `<li>${item.href ? `<a href="${item.href}">${esc(item.label)}</a>` : esc(item.label)}</li>`).join('')}</ol></nav>`; }
function saveButton(id) { return `<button class="button" data-save="${id}" aria-pressed="${saved.has(id)}">${saved.has(id) ? '♥' : '♡'} ${saved.has(id) ? t('저장됨','Сохранено') : t('저장하기','Сохранить')}</button>`; }
function navLink(url, ko, ru) {
  const part = url.replace(/^#\/?/, '') || 'home';
  const active = currentRoute === part || (part !== 'home' && currentRoute.startsWith(`${part}/`));
  return `<a href="${url}"${active ? ' aria-current="page"' : ''}>${esc(t(ko, ru))}</a>`;
}
function navigation() { return [navLink('#/destinations','여행지','Направления'),navLink('#/interests','테마 여행','Интересы'),navLink('#/prepare','여행 준비','Подготовка'),navLink('#/routes','여행 일정','Маршруты'),navLink('#/saved','저장한 장소','Сохранённое')].join(''); }
function header() {
  return `<div class="draft-bar"><div class="wrap"><span>${t('미리보기 · 콘텐츠와 한국어 표현을 검토하고 있습니다.','Предварительная версия · Контент и корейские тексты требуют редакторской проверки.')}</span><span>${t('사진·영상 준비 중','Фото и видео пока заглушки')}</span></div></div><header class="site-header"><div class="wrap header-inner"><a class="brand" href="#/">KAZAKHSTAN <span>GUIDE</span><small>${t('한국어 여행 가이드','Гид для корейских туристов')}</small></a><nav class="desktop-nav" aria-label="${t('주 메뉴','Главное меню')}">${navigation()}</nav><div class="header-actions"><button class="lang-button" data-language="${lang === 'ko' ? 'ru' : 'ko'}" aria-label="${t('러시아어로 전환','Переключить на корейский')}">${lang === 'ko' ? 'RU' : '한국어'}</button><button class="menu-button" id="menu-button" aria-expanded="false" aria-controls="mobile-nav">☰ <span>${t('메뉴','Меню')}</span></button></div></div><nav id="mobile-nav" class="mobile-nav" aria-label="${t('모바일 메뉴','Мобильное меню')}" hidden>${navigation()}</nav></header>`;
}
function footer() { return `<footer><div class="wrap footer-inner"><div><strong>KAZAKHSTAN GUIDE</strong><p>${t('카자흐스탄을 여행하는 한국인을 위한 가이드. 현재는 구조와 디자인 검토용 미리보기입니다.','Путеводитель по Казахстану для корейских туристов. Сейчас это предварительная версия для проверки структуры и дизайна.')}</p></div><nav class="footer-links" aria-label="${t('하단 메뉴','Нижнее меню')}"><a href="#/destinations">${t('여행지','Направления')}</a><a href="#/prepare">${t('여행 준비','Подготовка')}</a><a href="#/about">${t('가이드 소개','О путеводителе')}</a></nav></div></footer>`; }
function destinationCard(d) { return `<a class="destination-card" href="${destinationURL(d.id)}">${picture(d.id,tr(d.name))}<h3>${esc(tr(d.name))}</h3><span class="local-name">${esc(lang === 'ko' ? d.local : d.latin)}</span><p>${esc(tr(d.eyebrow))}</p><span class="card-link">${t('여행 가이드 보기','Открыть путеводитель')} →</span></a>`; }
function practicalCards() { return practical.map(p => `<a class="practical-card" href="#/prepare/${p.id}"><h3>${esc(tr(p.name))}</h3><p>${esc(tr(p.summary))}</p><span class="card-link">${t('안내 보기','Открыть раздел')} →</span></a>`).join(''); }
function routeCards() {
  return destinations.map(d=>`<a class="practical-card" href="#/routes/${d.id}"><h3>${esc(tr(d.name))}</h3><p>${t('이 여행지만의 일정을 준비합니다.','Маршруты этого направления проработаем отдельно.')}</p><span class="card-link">${t('일정 안내','Открыть раздел маршрутов')} →</span></a>`).join('');
}
function promoCard(d) {
  return videoCard(`${d.id}-video`,tr(d.name),`${tr(d.eyebrow)} · ${t('여행지 소개 영상 준비 중','Проморолик готовится')}`);
}
function filterControls() { return `<div class="filter-row" aria-label="${t('관심사 필터','Фильтр по интересам')}">${interests.map(i=>`<button class="chip" data-filter="${i.id}" aria-pressed="${filter === i.id}">${esc(tr(i.name))}</button>`).join('')}</div><div class="search-line"><label>${t('여행지 검색','Поиск направления')}<input id="destination-search" type="search" value="${esc(query)}" placeholder="${t('도시 이름 또는 현지 이름','Название города или местное название')}" autocomplete="off"></label><p class="search-count" id="search-count" aria-live="polite"></p></div>`; }
function home() {
  return `<section class="hero"><div class="wrap hero-inner"><div class="hero-text"><span class="eyebrow">KAZAKHSTAN / 카자흐스탄</span><h1>${t('카자흐스탄을 만나다','Откройте Казахстан')}</h1><p>${t('도시와 자연을 발견하고 여행을 준비하세요. 가고 싶은 곳부터 실용적인 방문 정보까지.','Выберите направление и подготовьте поездку. Здесь собраны места и практические детали посещения.')}</p><a class="button" href="#/destinations">${t('여행지 둘러보기','Выбрать направление')} →</a></div>${picture('country-hero',t('카자흐스탄의 풍경','Панорамное фото Казахстана'))}</div></section><div class="wrap content"><section class="section" id="destinations">${sectionTitle(t('어디로 떠날까요?','Куда поехать'),t('여섯 개의 여행지','Шесть направлений'))}${filterControls()}<div class="dest-grid" id="dest-grid"></div></section><section class="section">${sectionTitle(t('출발 전 준비','Перед поездкой'))}<div class="practical-grid">${practicalCards()}</div></section>${routeMapMarkup(lang,destinations,picture,{home:true})}<section class="section">${sectionTitle(t('영상으로 만나는 카자흐스탄','Казахстан в движении'),t('여행지마다 소개 영상','Проморолик для каждого направления'))}<div class="video-grid" id="home-promos">${destinations.map(promoCard).join('')}</div></section></div>`;
}
function directory(kind) {
  return `${breadcrumb([{label:t(kind==='interests'?'테마 여행':'여행지',kind==='interests'?'Интересы':'Направления')}])}<div class="wrap content"><section class="section"><h1>${t(kind==='interests'?'관심사로 여행 찾기':'여행지',kind==='interests'?'Выберите свой интерес':'Направления')}</h1><p class="muted">${t('도시와 휴양 지역을 선택해 자세히 살펴보세요.','Выберите город или курортный район и откройте его путеводитель.')}</p>${filterControls()}<div class="dest-grid" id="dest-grid"></div></section></div>`;
}
function overviewFacts() { return `<div class="fact-grid"><div><strong>${t('언제 갈까요?','Когда ехать')}</strong><span>${t('계절별 안내 준비 중','Подготовим сведения по сезонам')}</span></div><div><strong>${t('얼마나 머물까요?','Сколько времени')}</strong><span>${t('일정 확인 후 안내','После проверки маршрутов')}</span></div><div><strong>${t('어떤 여행인가요?','Тип поездки')}</strong><span>${t('관심사와 이동 방식','Интересы и способы перемещения')}</span></div></div>`; }
function destinationSidebar(d) { return `<aside class="sidebar"><div class="sidebar-panel"><h3>${t('여행 실용 정보','Практическая информация')}</h3><span class="label">${t('검색용 현지 이름','Местное название для поиска')}</span><strong>${esc(d.local)}</strong><button class="button" data-copy="${esc(d.local)}">${t('이름 복사','Копировать название')}</button><div class="map-placeholder"><span aria-hidden="true">⌖</span><strong>${t('지도 준비 중','Место для карты')}</strong><small>${t('정확한 위치 확인 후 추가','Добавим после проверки точек')}</small></div><ul><li>${t('교통과 도착','Прибытие и транспорт')}</li><li>${t('현지 주소와 표현','Местные адреса и фразы')}</li><li>${t('공식 출처와 확인 날짜','Источники и дата проверки')}</li></ul></div><div class="sidebar-panel"><h3>${t('여행 준비','Подготовка к поездке')}</h3><p>${t('입국, 결제, 인터넷 등 기본 정보를 확인하세요.','Въезд, оплата, интернет и другие основные вопросы.')}</p><a class="button" href="#/prepare">${t('준비 항목 보기','Открыть раздел')}</a></div></aside>`; }
function localNav(items) { return `<nav class="local-nav" aria-label="${t('페이지 목차','Разделы страницы')}"><div class="wrap">${items.map(([id,label])=>`<a href="#${id}" data-scroll="${id}">${esc(label)}</a>`).join('')}</div></nav>`; }
function destinationPage(d) {
  if(hasContent(d.id))return contentDestinationPage(d,contentContext());
  const items=[['overview',t('소개','Обзор')],['places',t('명소','Что посмотреть')],['nearby',t('근교','Окрестности')],['transport',t('교통','Транспорт')],['stay',t('숙박과 음식','Проживание и еда')],['itinerary',t('일정','Маршруты')],['videos',t('영상','Видео')]];
  const places=d.places.length ? `<div class="place-grid">${d.places.map(p=>`<a class="place-card" href="${placeURL(p.id)}">${picture('kok-tobe-panorama',tr(p.name))}<h3>${esc(tr(p.name))}</h3><p>${esc(tr(p.category))}</p><span class="card-link">${t('방문 안내','Открыть страницу места')} →</span></a>`).join('')}</div>` : empty(t('명소 목록과 개별 방문 안내를 준비하고 있습니다.','Подготовим список мест и отдельные инструкции по посещению.'));
  return `${breadcrumb([{label:tr(d.name)}])}<section class="hero"><div class="wrap hero-inner"><div class="hero-text"><span class="eyebrow">${esc(d.latin)}</span><h1>${esc(tr(d.name))}</h1><p>${esc(tr(d.intro))}</p>${saveButton(d.id)}</div>${picture(d.id,tr(d.name))}</div></section>${localNav(items)}<div class="wrap content columns"><div><section class="section" id="overview">${sectionTitle(t('소개','Обзор'))}<p>${esc(tr(d.intro))}</p>${overviewFacts()}</section><section class="section" id="places">${sectionTitle(t('주요 명소','Что посмотреть'),t('편집 초안','Редакционный черновик'))}${places}</section><section class="section" id="nearby">${sectionTitle(t('근교 여행','За пределами города'))}<p>${esc(tr(d.nearby))}</p><div class="notice">${t('이동 시간, 교통, 계절별 접근 조건은 별도로 확인한 뒤 안내합니다.','Время в дороге, транспорт и сезонные условия доступа будут проверены отдельно.')}</div></section><section class="section" id="transport">${sectionTitle(t('교통','Как добраться и перемещаться'))}<div class="practical-grid"><div><h3>${t('도착','Прибытие')}</h3><p>${t('공항·역에서 목적지까지의 이동 안내 준비 중','Подготовим путь из аэропорта или вокзала')}</p></div><div><h3>${t(d.id==='burabay'?'지역 내 이동':'시내 이동',d.id==='burabay'?'Внутри района':'В городе')}</h3><p>${t('교통 수단 비교 준비 중','Подготовим сравнение транспорта')}</p></div><div><h3>${t('근교 이동','За городом')}</h3><p>${t('거리와 접근 조건 확인 예정','Проверим расстояния и доступ')}</p></div></div></section><section class="section" id="stay">${sectionTitle(t('숙박과 음식','Где жить и что попробовать'))}${empty(t(d.id==='burabay'?'숙박 지역과 자연 명소의 위치를 비교할 예정입니다.':'숙박 지역 비교, 현지 음식, 주문 표현을 준비하고 있습니다.',d.id==='burabay'?'Подготовим сравнение зон проживания и расположения природных мест.':'Подготовим сравнение районов, местную кухню и фразы для заказа.'))}</section><section class="section" id="itinerary">${sectionTitle(t('여행 일정','Маршруты'))}${empty(t('일별 동선은 이동 시간을 확인한 뒤 추가합니다.','Планы по дням добавим после проверки времени переездов.'))}<p><a href="#/routes/${d.id}">${t('이 여행지의 일정','Маршруты направления')} →</a></p></section><section class="section" id="videos">${sectionTitle(t('여행지 영상','Видео о направлении'))}${promoCard(d)}</section>${sourceNote()}</div>${destinationSidebar(d)}</div>`;
}
function gallery() {
  const g=kokTobe.gallery[galleryIndex];
  const main=g.kind==='video' ? videoCard(g.key,tr(g.label),t('영상이 추가될 자리입니다.','Здесь появится видео.')) : picture(g.key,tr(g.label));
  return `<div class="gallery"><div id="gallery-stage" aria-live="polite">${main}</div><div class="gallery-thumbs" aria-label="${t('갤러리 선택','Выбор фото и видео')}">${kokTobe.gallery.map((g,i)=>`<button class="gallery-thumb" data-gallery="${i}" aria-pressed="${i===galleryIndex}">${g.kind==='video'?'▶ ':''}${esc(tr(g.label))}</button>`).join('')}</div></div>`;
}
function contentContext() { return {lang,t,tr,esc,picture,breadcrumb,sectionTitle,saveButton,localNav,gallery,transportPanels,promoCard}; }
function transportPanels() {
  const p=findContentPlace('kok-tobe');
  return `<div class="tablist" role="tablist" aria-label="${t('이동 방법','Способ добраться')}"><button class="tab" role="tab" id="tab-cable" aria-controls="panel-cable" aria-selected="${transportTab==='cable'}" tabindex="${transportTab==='cable'?'0':'-1'}" data-tab="cable">${t('케이블카','Канатная дорога')}</button><button class="tab" role="tab" id="tab-ground" aria-controls="panel-ground" aria-selected="${transportTab==='ground'}" tabindex="${transportTab==='ground'?'0':'-1'}" data-tab="ground">${t('지상 교통','Наземный путь')}</button></div><div role="tabpanel" id="panel-cable" aria-labelledby="tab-cable"${transportTab==='cable'?'':' hidden'}><ol class="steps"><li><strong>${t('하부 정류장','Нижняя станция')}</strong><span>${t('하부 케이블카 역은 도스틱 대로 104B에 있습니다. 정상 공원의 주소와 다릅니다.','Нижняя станция находится на проспекте Достык, 104Б. Это отдельный адрес, не вход в парк на вершине.')}</span></li><li><strong>${t('운행 시간','Режим подъёма')}</strong><span lang="${lang}">${esc(tr(p.visitor.hours))}</span></li><li><strong>${t('귀환 계획','Обратный путь')}</strong><span>${t('편도권과 왕복권은 별도로 안내되어 있습니다. 대기와 하산에 여유를 두며 놀이시설은 별도 요금입니다.','Есть отдельные билеты в одну сторону и туда-обратно. Для очереди и спуска нужен запас времени. Аттракционы оплачиваются отдельно.')}</span></li></ol></div><div role="tabpanel" id="panel-ground" aria-labelledby="tab-ground"${transportTab==='ground'?'':' hidden'}><p>${t('육상 이동의 경우 운영사는 오마로바 거리 41번지를 안내합니다. 도스틱에서 출발하는 별도 상품도 있지만 해당 코스의 단계별 이동과 외국인 이용 조건은 아직 확인되지 않았습니다.','Для наземного подъёма оператор указывает улицу Омаровой, 41. Также опубликован отдельный вариант от Достык. Пошаговая схема этого варианта и условия для иностранного гостя пока не подтверждены.')}</p><p>${t('지상 교통은 케이블카와 별도 상품입니다.','У наземного подъёма и канатной дороги разные билеты и расписания.')}</p><a class="small" href="https://koktobe.com/price-list" target="_blank" rel="noopener noreferrer">${t('공식 요금','Тарифы оператора')} ↗</a></div>`;
}
function preparePage(id) {
  if(id==='transport')return transportPreparationPage(contentContext(),destinations);
  if(id){const p=practical.find(p=>p.id===id);if(!p)return notFound();return `${breadcrumb([{label:t('여행 준비','Подготовка'),href:'#/prepare'},{label:tr(p.name)}])}<div class="wrap content"><section class="section"><h1>${esc(tr(p.name))}</h1><p>${esc(tr(p.summary))}</p><div class="notice">${t('이 안내는 아직 작성 중입니다. 검증되지 않은 정보를 여행 지침으로 사용하지 마세요.','Раздел ещё готовится. Здесь пока нет проверенной инструкции для поездки.')}</div><ul class="note-list">${p.fields.map(f=>`<li>${esc(tr(f))}. ${t('확인 후 추가','добавим после проверки')}</li>`).join('')}</ul></section>${sourceNote()}<p><a href="#/prepare">← ${t('모든 준비 항목','Все разделы подготовки')}</a></p></div>`;}
  return `${breadcrumb([{label:t('여행 준비','Подготовка')}])}<div class="wrap content"><section class="section"><h1>${t('출발 전 준비','Подготовка к поездке')}</h1><p class="muted">${t('한국인 여행자에게 필요한 실용 정보를 정리할 공간입니다.','Здесь соберём практические сведения для корейских путешественников.')}</p><div class="practical-grid">${practicalCards()}</div></section>${sourceNote()}</div>`;
}
function routesPage(id) {
  if(id){
    const d=destinations.find(d=>d.id===id);
    if(!d)return notFound();
    if(hasContent(d.id))return contentRoutesPage(d,contentContext());
    const area=d.id==='burabay';
    return `${breadcrumb([{label:t('여행 일정','Маршруты'),href:'#/routes'},{label:tr(d.name)}])}<div class="wrap content"><section class="section"><span class="eyebrow">${esc(d.latin)}</span><h1>${t('여행 일정: ','Маршруты: ')}${esc(tr(d.name))}</h1><p>${t('이 여행지의 일정을 따로 준비합니다.','Маршруты этого направления проработаем отдельно.')}</p><div class="notice">${t('실제 일정은 이동 시간, 접근 조건과 비용을 확인한 뒤 추가합니다.','Готовые планы добавим после проверки переездов, условий посещения и расходов.')}</div></section><section class="section">${sectionTitle(t(area?'휴양 지역 내 일정':'시내 일정',area?'Маршруты внутри курортного района':'Маршруты по городу'))}${empty(t('방문 장소와 실제 소요 시간을 확인한 뒤 동선을 정리합니다.','Выберем места и проверим время на посещение, затем составим последовательность поездки.'))}</section><section class="section">${sectionTitle(t('근교 여행','Поездки в окрестности'))}${empty(t('교통편, 이동 시간과 계절별 조건을 확인한 뒤 별도 일정을 만듭니다.','Отдельные маршруты составим после проверки транспорта, времени в дороге и сезонных условий.'))}</section><a class="button" href="${destinationURL(d.id)}">${t('여행지 가이드 보기','Открыть путеводитель направления')} →</a><p class="small muted">${t('여행지마다 콘텐츠를 따로 검토합니다.','Каждое направление наполняем и проверяем отдельно.')}</p>${sourceNote()}</div>`;
  }
  return `${breadcrumb([{label:t('여행 일정','Маршруты')}])}<div class="wrap content"><section class="section"><h1>${t('여행 일정','Маршруты')}</h1><p>${t('여행지를 먼저 선택하세요. 각 지역의 일정을 따로 준비합니다.','Сначала выберите направление. Для каждого региона маршруты проработаем отдельно.')}</p>${routeMapMarkup(lang,destinations,picture)}<div class="practical-grid" id="route-directory">${routeCards()}</div></section></div>`;
}
function savedPage() {
  const chosen=destinations.filter(d=>saved.has(d.id));
  const places=contentPlaces.filter(p=>saved.has(p.id));
  return `${breadcrumb([{label:t('저장한 장소','Сохранённое')}])}<div class="wrap content"><section class="section"><h1>${t('저장한 장소','Сохранённые места')}</h1><p class="muted">${t('이 브라우저에만 저장됩니다.','Список хранится только в этом браузере.')}</p>${chosen.length||places.length?`<div class="dest-grid">${chosen.map(destinationCard).join('')}${places.map(p=>contentSavedCard(p,contentContext())).join('')}</div>`:empty(t('아직 저장한 장소가 없습니다. 여행지나 명소 페이지에서 하트 버튼을 선택하세요.','Пока ничего не сохранено. Нажмите сердечко на странице направления или места.'))}<p><a href="#/destinations">${t('여행지 둘러보기','Выбрать направление')} →</a></p></section></div>`;
}
function aboutPage() { return `${breadcrumb([{label:t('가이드 소개','О путеводителе')}])}<div class="wrap content"><section class="section"><h1>${t('가이드 소개','О путеводителе')}</h1><p>${t('한국어로 카자흐스탄 여행을 준비할 수 있도록 만드는 가이드입니다.','Путеводитель создаётся для подготовки поездок по Казахстану на корейском языке.')}</p><div class="notice">${t('현재는 내용을 살펴보는 미리보기입니다. 사진과 영상, 일부 실용 안내를 준비하고 있으며 한국어 교정도 필요합니다.','Вы смотрите предварительную версию путеводителя. Фото, видео и часть практических инструкций ещё готовятся. Корейские тексты требуют языковой редактуры.')}</div><h2>${t('정보 확인 원칙','Как проверяем информацию')}</h2><ul><li>${t('방문 목적과 활동, 필요한 숙박과 왕복 이동을 함께 정리합니다.','Связываем цель поездки, занятия, необходимую ночёвку и дорогу в обе стороны.')}</li><li>${t('사진과 영상의 출처와 사용 권한을 확인합니다.','Проверяем источники фото и видео и права на использование.')}</li><li>${t('생성형 영상은 실제 장소의 증거로 사용하지 않습니다.','Сгенерированное видео не используем как подтверждение реального вида места.')}</li></ul></section></div>`; }
function notFound() { return `<div class="wrap content"><section class="section"><h1>${t('페이지를 찾을 수 없습니다.','Страница не найдена')}</h1><a class="button primary" href="#/">${t('첫 화면으로','На главную')}</a></section></div>`; }
function updateDirectory() {
  const grid=document.getElementById('dest-grid');if(!grid)return;
  const normalized=query.trim().toLocaleLowerCase();
  const filtered=destinations.filter(d=>(filter==='all'||d.tags.includes(filter))&&[d.name.ko,d.name.ru,d.local,d.latin,d.eyebrow.ko,d.eyebrow.ru].join(' ').toLocaleLowerCase().includes(normalized));
  grid.innerHTML=filtered.length?filtered.map(destinationCard).join(''):empty(t('검색 결과가 없습니다. 검색어나 관심사를 바꿔보세요.','Ничего не найдено. Измените запрос или выбранный интерес.'));
  document.getElementById('search-count').textContent=t(`여행지 ${filtered.length}개`,`Найдено направлений: ${filtered.length}`);
  document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
}
function render({focus=false}={}) {
  currentRoute=route();
  const parts=currentRoute.split('/');
  let body;
  let title=t('카자흐스탄 여행','Путеводитель по Казахстану');
  if(currentRoute==='home')body=home();
  else if(currentRoute==='destinations'||currentRoute==='interests')body=directory(currentRoute);
  else if(parts[0]==='destinations'&&parts.length===2){const d=destinations.find(x=>x.id===parts[1]);body=d?destinationPage(d):notFound();if(d)title=tr(d.name);}
  else if(parts[0]==='places'&&parts.length===2){const p=findContentPlace(parts[1]);body=p?contentPlacePage(p,contentContext()):notFound();if(p)title=lang==='ko'?p.name.ko:p.name.ru;}
  else if(parts[0]==='prepare'&&parts.length<=2)body=preparePage(parts[1]);
  else if(parts[0]==='routes'&&parts.length<=2)body=routesPage(parts[1]);
  else if(currentRoute==='saved')body=savedPage();
  else if(currentRoute==='about')body=aboutPage();
  else body=notFound();
  document.documentElement.lang=lang;
  document.title=`${title} | Kazakhstan Guide`;
  document.getElementById('skip-link').textContent=t('본문으로 이동','Перейти к содержимому');
  document.getElementById('dialog-close').setAttribute('aria-label',t('닫기','Закрыть'));
  mapCleanup();
  app.innerHTML=`${header()}<main id="content" class="reveal" tabindex="-1">${body}</main>${footer()}`;
  updateDirectory();
  const cleanMap=mountRouteMap(lang,destinations,picture)||(()=>{});
  const cleanContent=mountContentExplorers(contentContext());
  mapCleanup=()=>{cleanMap();cleanContent();};
  if(focus){document.getElementById('content').focus({preventScroll:true});window.scrollTo(0,0);}
}
function openVideo(key,title) {
  const item=media[key];
  document.getElementById('media-dialog-title').textContent=title;
  const tracks=(item?.tracks||[]).filter(track=>safeSrc(track.src)).map(track=>`<track kind="subtitles" src="${safeSrc(track.src)}" srclang="${esc(track.srclang)}" label="${esc(track.label)}"${track.srclang==='ko'?' default':''}>`).join('');
  document.getElementById('media-dialog-content').innerHTML=item?.kind==='video'&&safeSrc(item.src)?`<video controls playsinline preload="metadata"${safeSrc(item.poster)?` poster="${safeSrc(item.poster)}"`:''}><source src="${safeSrc(item.src)}">${tracks}${t('이 브라우저는 영상을 지원하지 않습니다.','Ваш браузер не поддерживает видео.')}</video>${credit(item)}`:empty(t('영상은 아직 준비 중입니다. 실제 영상, 한국어 자막, 재생 컨트롤이 추가될 자리입니다.','Видео пока не загружено. Здесь появится реальный ролик, корейские субтитры и управление воспроизведением.'));
  dialog.showModal();
}
function setTransportTab(tab, focus=false) {
  transportTab=tab;
  document.getElementById('transport-content').innerHTML=transportPanels();
  if(focus)document.getElementById(`tab-${tab}`).focus();
}
app.addEventListener('click',async event=>{
  const control=event.target.closest('button,a');if(!control)return;
  if(control.closest('#mobile-nav') && control.matches('a')){
    document.getElementById('mobile-nav').hidden=true;
    document.getElementById('menu-button').setAttribute('aria-expanded','false');
  }
  if(control.dataset.scroll){event.preventDefault();document.getElementById(control.dataset.scroll)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
  if(control.dataset.language){const y=window.scrollY;lang=control.dataset.language;persist();render();window.scrollTo(0,y);}
  if(control.id==='menu-button'){const expanded=control.getAttribute('aria-expanded')==='true';control.setAttribute('aria-expanded',String(!expanded));document.getElementById('mobile-nav').hidden=expanded;}
  if(control.dataset.filter){filter=control.dataset.filter;updateDirectory();}
  if(control.dataset.save){const id=control.dataset.save;saved.has(id)?saved.delete(id):saved.add(id);const persisted=persist();control.setAttribute('aria-pressed',String(saved.has(id)));control.textContent=`${saved.has(id)?'♥':'♡'} ${saved.has(id)?t('저장됨','Сохранено'):t('저장하기','Сохранить')}`;notify(persisted?t('이 브라우저의 목록을 업데이트했습니다.','Список в этом браузере обновлён.'):t('브라우저 저장을 사용할 수 없어 현재 세션에만 저장됩니다.','Хранилище браузера недоступно. Список сохранится только в текущем сеансе.'));}
  if(control.dataset.copy){try{await navigator.clipboard.writeText(control.dataset.copy);notify(t('복사했습니다: ','Скопировано: ')+control.dataset.copy);}catch{notify(t('직접 복사하세요: ','Для копирования: ')+control.dataset.copy);}}
  if(control.dataset.gallery){galleryIndex=Number(control.dataset.gallery);const g=kokTobe.gallery[galleryIndex];document.getElementById('gallery-stage').innerHTML=g.kind==='video'?videoCard(g.key,tr(g.label),t('영상 준비 중','Видео готовится')):picture(g.key,tr(g.label));document.querySelectorAll('[data-gallery]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.gallery)===galleryIndex)));}
  if(control.dataset.tab)setTransportTab(control.dataset.tab,true);
  if(control.dataset.video)openVideo(control.dataset.video,control.dataset.title);
});
app.addEventListener('input',event=>{if(event.target.id==='destination-search'){query=event.target.value;updateDirectory();}});
app.addEventListener('keydown',event=>{if(!event.target.matches('[data-tab]'))return;if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const tab=event.key==='Home'?'cable':event.key==='End'?'ground':transportTab==='cable'?'ground':'cable';setTransportTab(tab,true);}});
document.getElementById('dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{dialog.querySelector('video')?.pause();document.getElementById('media-dialog-content').innerHTML='';});
document.getElementById('skip-link').addEventListener('click',event=>{event.preventDefault();document.getElementById('content').focus();});
window.addEventListener('hashchange',()=>{if(dialog.open)dialog.close();clearTimeout(toastTimer);document.getElementById('toast').hidden=true;galleryIndex=0;transportTab='cable';render({focus:true});});
render();
