
import {navigationByRoute} from './almaty-navigation.js';
import {renderAlmatyNavigation} from './almaty-navigation-view.js';
// Presentation summaries only. Full visit instructions remain in the existing plans.
const text=(ru,ko)=>({ru,ko});
export const almatyRouteSummaries={
 'route-1d':{
  intro:text('От аллей парка к базарным рядам и Арбату. День с прогулкой и временем на обед.','공원에서 시장과 아르바트로 이어집니다. 천천히 걷고 식사할 여유를 두는 하루입니다.'),
  time:text('Около 4 или 5 часов','약 4~5시간'),load:text('Пешком по центру','도심 도보 산책'),cost:text('Еда и такси отдельно','식사와 택시는 별도'),
  important:text('По понедельникам Зелёный базар пропускаем. Альтернативный путь есть ниже.','월요일에는 그린 바자르를 제외합니다. 아래에서 다른 동선을 볼 수 있습니다.'),
  notes:[text('Аллеи, мемориал и собор снаружи. Внутренний осмотр по желанию.','공원과 기념 공간, 대성당 외관을 둘러봅니다. 내부 관람은 선택입니다.'),text('Фрукты, орехи и сладости. Покупки по желанию.','과일과 견과류, 과자가 있는 시장을 둘러봅니다. 구매는 선택입니다.'),text('Прогулка по Арбату и пауза на обед.','아르바트를 산책한 뒤 여유 있게 식사합니다.')],
  back:text('В своё жильё в Алматы. Такси вызывайте к проезжей улице, не внутрь пешеходной зоны.','알마티 숙소로 돌아갑니다. 택시는 보행자 구역 안이 아닌 차량 접근 가능한 도로에서 탑승하세요.')
 },
 'route-3d':{
  intro:text('Подняться над городом, остановиться у курорта и по желанию продолжить к Талгарскому перевалу.','도시를 뒤로하고 리조트에 오릅니다. 원한다면 탈가르 고개까지 더 올라가도 좋습니다.'),
  time:text('Около 5 или 7 часов','약 5~7시간'),load:text('Три линии, верхняя по желанию','케이블카 세 구간, 상부는 선택'),cost:text('Канатная дорога и еда отдельно','케이블카와 식사 비용 별도'),
  notes:[text('Начало канатного подъёма. Каток Медеу реконструируется.','케이블카 출발점입니다. 메데우 스케이트장은 재건축 중입니다.'),text('Короткая прогулка и обед у курорта. Можно остаться здесь.','리조트에서 산책하고 식사합니다. 이 높이에 머물러도 좋습니다.'),text('Две пересадки к верхней станции примерно на 3200 м. Это не вершина горы.','두 번 갈아타면 약 3,200m의 상부 승강장에 닿습니다. 산 정상 등반은 아닙니다.')],
  back:text('Спуск по тем же линиям до нижней станции Медеу, затем в жильё. На пересадки нужен запас.','같은 노선으로 아래쪽 메데우 승강장까지 내려온 뒤 숙소로 돌아갑니다. 환승에 여유를 두세요.')
 },
 'route-3d-charyn':{
  intro:text('Сначала увидеть каньон сверху, затем выбрать, насколько далеко хочется пройти между каменными стенами.','먼저 위에서 협곡을 바라본 뒤 바위 사이를 얼마나 걸을지 정합니다.'),
  time:text('Отдельный день; на месте 3 или 4 часа','별도 하루, 현장 약 3~4시간'),load:text('До реки и обратно около 6 км, лестница','강까지 왕복 약 6km와 계단'),cost:text('Машина, вход и еда отдельно','차량과 입장료, 식사는 별도'),
  important:text('Нужна машина с ожиданием и возвращением. Можно ограничиться видом сверху, если спуск и подъём не подходят.','현장 대기와 귀환까지 포함한 차량이 필요합니다. 계단이 부담스럽다면 상부 전망만 볼 수 있습니다.'),
  notes:[text('Панорама, вода и подготовка к прогулке. Машина остаётся наверху.','위에서 전망을 보고 물을 준비합니다. 차량은 상부에 둡니다.'),text('Спуск в Долину замков. До реки идти необязательно.','성의 계곡으로 내려갑니다. 강까지 가지 않고 돌아와도 좋습니다.'),text('Обратный путь с подъёмом по лестнице. Подвоз внутри не включён.','계단을 올라 돌아옵니다. 협곡 내부 차량 이용은 포함하지 않습니다.')],
  back:text('К той же машине наверху, затем в Алматы. Обратную поездку не оставляем на поиск такси у каньона.','상부에서 기다리는 같은 차량을 만나 알마티로 돌아갑니다. 협곡에서 귀환 택시를 찾는 방식에 의존하지 않습니다.')
 },
 'route-3d-kolsai':{
  intro:text('Хвойные склоны Кольсая или ели, поднимающиеся из воды Каинды. Выберите одно озеро либо разделите оба на два дня.','콜사이의 숲과 카인디 물 위의 가문비나무는 서로 다른 풍경입니다. 한 곳을 고르거나 이틀에 나누어 볼 수 있습니다.'),
  time:text('Один выезд или 2 дня с ночёвкой','한 곳 방문 또는 숙박 포함 이틀'),load:text('Берег и подход от машины','호숫가와 하차 후 도보 접근'),cost:text('Транспорт, парк, еда; ночёвка по выбору','차량과 공원, 식사 비용 및 선택 숙박'),
  important:text('Это два самостоятельных выезда, не обязательные остановки одного дня. Для каждого нужен транспорт туда и обратно.','두 호수는 각각 선택할 수 있는 여행지입니다. 하루에 모두 볼 필요는 없으며 각 방문에 왕복 차량이 필요합니다.'),
  notes:[text('Нижнее озеро и доступная часть берега. Без похода к верхним озёрам.','하부 호수와 개방된 호숫가를 봅니다. 상부 호수 산행은 제외합니다.'),text('Отдельный подъезд и неровная тропа к видам с берега.','별도의 진입로와 고르지 않은 탐방로를 거쳐 물가 풍경을 봅니다.')],
  back:text('В Алматы либо в жильё в Саты. При ночёвке отдельно предусмотрите оба озера и возвращение в город.','알마티 또는 사티 숙소로 돌아갑니다. 숙박한다면 두 호수 이동과 마지막 알마티 귀환을 모두 계획해야 합니다.')
 },
 'almaty-tanbaly-visit':{
  intro:text('День среди скал с рисунками животных, колесниц и солнечных фигур.','동물과 전차, 태양을 닮은 인물이 새겨진 암벽을 만나는 하루입니다.'),
  time:text('Около 2 часов на месте; дорога отдельно','현장 약 2시간, 차량 이동 별도'),load:text('Прогулка по музейному маршруту','박물관 지정 동선 관람'),cost:text('Вход, экскурсия и машина отдельно','입장과 해설, 차량 비용 별도'),
  important:text('Нужны обратная машина и понятное сопровождение. Это Танбалы у Карабастау, не Тамгалы-Тас на Или.','왕복 차량과 이해 가능한 안내가 필요합니다. 일리강의 탐갈리 타스와 다른 카라바스타우 인근 탄발리입니다.'),
  notes:[text('Центральные группы рисунков. Подробная экскурсия зависит от языка.','중앙 암각화 구역을 봅니다. 자세한 해설은 제공 언어에 따라 달라집니다.')],
  back:text('В Алматы с тем же водителем. Готовый выезд и корейское сопровождение пока не подобраны.','같은 차량으로 알마티에 돌아갑니다. 실제 이용할 차량 일정과 한국어 안내는 아직 마련되지 않았습니다.')
 },
 'almaty-altyn-emel-visit':{
  intro:text('Выберите Поющий бархан или оставьте два дня на разные ландшафты парка с ночёвкой в Басши.','노래하는 모래언덕만 보거나 바시에서 하루 묵으며 공원의 다른 지형까지 이틀에 나누어 봅니다.'),
  time:text('Один маршрут или 2 дня','한 코스 또는 이틀'),load:text('Разные автомобильные выезды из Басши','바시에서 각각 차량으로 출발'),cost:text('Машина, парк; жильё и еда отдельно','차량과 공원 비용, 숙박과 식사 별도'),
  important:text('Два пункта ниже относятся к разным дням. Ночёвка и полный транспорт пока не подготовлены.','아래 두 코스는 서로 다른 날의 일정입니다. 숙박과 전체 차량 이동은 아직 마련되지 않았습니다.'),
  notes:[text('Отдельный выезд к бархану с возвращением в Басши.','모래언덕을 따로 방문하고 바시로 돌아갑니다.'),text('Актау и Катутау на второй день, только если выбрали оба маршрута.','두 코스를 모두 선택했을 때 둘째 날 악타우와 카투타우를 방문합니다.')],
  back:text('После каждого маршрута в Басши, затем отдельная дорога в Алматы. Не рассчитывайте на такси внутри парка.','각 코스 뒤 바시로 돌아온 다음 알마티로 별도 이동합니다. 공원 안에서 택시를 찾는 방식으로 계획하지 않습니다.')
 }
};

export function compactAlmatyDayPlan(plan,route,ctx,placeName,stayMarkup){
 const quick=almatyRouteSummaries[route.id];
 if(!quick)return null;
 const {t,tr,esc,lang}=ctx;
 const disclosure=(title,body,attr='')=>`<details class="guide-answer" ${attr}><summary>${title}</summary><div class="answer-body">${body}</div></details>`;
 const facts=[[t('소요 시간','Время'),quick.time],[t('이동과 걷기','Передвижение и нагрузка'),quick.load],[t('비용','Расходы'),quick.cost]];
 const mapLink=(url,label=t('Google 지도에서 도보 이동 보기','Пеший переход в Google Maps'))=>url?`<p><a data-route-map href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label} ↗</a></p>`:'';
 const conditions=plan.conditions.map(item=>disclosure(esc(tr(item.title)),`<p lang="${lang}">${esc(tr(item.body))}</p>${mapLink(item.mapUrl)}${(item.placeIds||[]).map(id=>`<p><a href="#/places/${esc(id)}">${esc(placeName(id))} →</a></p>`).join('')}`)).join('');
 const food=disclosure(esc(tr(plan.food.title)),`<p>${esc(tr(plan.food.body))}</p><p class="small muted">${esc(tr(plan.food.limits))}</p>${plan.food.placeId?`<p><a href="#/places/${esc(plan.food.placeId)}">${esc(placeName(plan.food.placeId))} →</a></p>`:''}${plan.food.address?`<p lang="ru">${esc(plan.food.address)}</p><button class="button" data-copy="${esc(plan.food.address)}">${t('주소 복사','Копировать адрес')}</button>`:''}`,'data-route-food');
 const fullFacts=`<p lang="${lang}">${esc(tr(plan.intro))}</p><dl class="route-full-facts">${plan.facts.map(f=>`<div><dt>${esc(tr(f.label))}</dt><dd>${esc(tr(f.value))}</dd></div>`).join('')}</dl>`;
 const transport=route.copy.transport?disclosure(t('가는 길과 돌아오는 길 자세히','Дорога и возвращение подробно'),`<div class="route-transport"><h3>${t('이동','Переезды')}</h3><p lang="${lang}">${esc(tr(route.copy.transport))}</p><h3>${t('귀환','Возвращение')}</h3><p lang="${lang}">${esc(tr(route.copy.returnTransport))}</p></div>${plan.searchName?`<div class="show-phrase"><p>${plan.searchLabel?esc(tr(plan.searchLabel)):t('검색에 사용할 현지 이름','Местное название для поиска')}</p><p lang="ru">${esc(plan.searchName)}</p><button class="button" data-copy="${esc(plan.searchName)}">${plan.searchCopyLabel?esc(tr(plan.searchCopyLabel)):t('이름 복사','Копировать название')}</button></div>`:''}`,'data-route-logistics'):'';
 return `<div class="day-plan route-compact" data-day-plan data-compact-plan><p class="route-lead" lang="${lang}">${esc(tr(quick.intro))}</p>${mapLink(plan.startMapUrl,t('Google 지도에서 출발 지점 보기','Начало в Google Maps'))}${plan.notice?`<div class="notice mountain-season-notice">${esc(tr(plan.notice))}</div>`:''}${quick.important?`<p class="route-essential" lang="${lang}">${esc(tr(quick.important))}</p>`:''}<div class="fact-grid">${facts.map(([label,value])=>`<div><strong>${label}</strong><span>${esc(tr(value))}</span></div>`).join('')}</div><ol class="steps${plan.stops.length===2?' steps-pair':''}">${plan.stops.map((stop,index)=>`<li><strong>${esc(tr(stop.period))}</strong><a href="#/places/${esc(stop.placeId)}">${esc(stop.label?tr(stop.label):placeName(stop.placeId))}</a><span>${esc(tr(stop.time))}</span><p lang="${lang}">${esc(tr(quick.notes[index]))}</p>${disclosure(t('방문과 다음 이동','Осмотр и переход'),`<p lang="${lang}">${esc(tr(stop.note))}</p><p lang="${lang}">${esc(tr(stop.next))}</p>${mapLink(stop.nextMapUrl)}`,'data-stop-detail')}</li>`).join('')}</ol><p class="route-return"><strong>${t('귀환','Возвращение')}</strong> ${esc(tr(quick.back))}</p><div class="route-details">${(navigationByRoute[route.id]||[]).map(n=>disclosure(t('방문 동선과 지도','Порядок посещения и карты'),renderAlmatyNavigation(n,{tr,esc,lang}),'data-route-navigation')).join('')}${food}${stayMarkup(plan.stay)}${transport}${conditions}${disclosure(t('전체 방문 방식','Полный формат посещения'),fullFacts,'data-route-background')}</div><p class="route-help"><a href="#/prepare/transport">${t('택시와 외곽 이동 안내','Такси и загородные поездки')} →</a></p></div>`;
}
