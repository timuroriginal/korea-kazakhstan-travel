export const text = (ko, ru) => ({ ko, ru });
export const destinations = [
  { id:'almaty', name:text('알마티','Алматы'), local:'Алматы', latin:'Almaty', eyebrow:text('도시와 산','Город и горы'), intro:text('도시 산책과 근교 자연을 함께 살펴보세요.','Городские прогулки и знакомство с природой окрестностей.'), tags:['nature','city','food'], places:[{id:'kok-tobe',name:text('콕토베','Кок-Тобе'),category:text('전망과 산책','Панорама и прогулка')}], nearby:text('차른 협곡 · 콜사이 호수 · 카인디 호수','Чарынский каньон · Кольсайские озёра · озеро Каинды') },
  { id:'astana', name:text('아스타나','Астана'), local:'Астана', latin:'Astana', eyebrow:text('수도의 건축과 문화','Архитектура и культура столицы'), intro:text('건축, 문화 공간, 도시 산책을 중심으로 여행을 계획해 보세요.','Архитектура, культурные пространства и городские прогулки.'), tags:['city','culture','food'], places:[], nearby:text('근교 여행 정보를 준비하고 있습니다.','Подготовим варианты поездок в окрестности.') },
  { id:'aktau', name:text('악타우','Актау'), local:'Актау', latin:'Aktau', eyebrow:text('카스피해와 망기스타우','Каспий и Мангистау'), intro:text('해안 도시와 주변 지역을 구분해 여행을 계획하세요.','Знакомство с побережьем и отдельные поездки по Мангистау.'), tags:['water','nature','city'], places:[], nearby:text('망기스타우 여행에는 별도의 교통·접근성 확인이 필요합니다.','Для поездок по Мангистау отдельно проверим транспорт и доступность.') },
  { id:'ust-kamenogorsk', name:text('우스티카메노고르스크','Усть-Каменогорск'), local:'Өскемен / Усть-Каменогорск', latin:'Oskemen / Ust-Kamenogorsk', eyebrow:text('동카자흐스탄','Восточный Казахстан'), intro:text('도시와 동카자흐스탄의 자연 여행을 살펴보세요.','Город и отправная точка для знакомства с Восточным Казахстаном.'), tags:['nature','city'], places:[], nearby:text('알타이 방면 여행은 거리, 교통, 허가 조건을 먼저 확인합니다.','Для поездок в сторону Алтая сначала проверим расстояния, транспорт и разрешения.') },
  { id:'burabay', name:text('부라바이','Бурабай / Боровое'), local:'Бурабай / Боровое', latin:'Burabay / Borovoe', eyebrow:text('호수와 숲','Озёра и леса'), intro:text('도시가 아닌 휴양 지역입니다. 숙박 지역과 자연 명소를 함께 살펴보세요.','Курортный район: природные места, прогулки и выбор зоны проживания.'), tags:['nature','water'], places:[], nearby:text('호수와 자연 명소의 접근 조건을 확인한 뒤 추가합니다.','Добавим природные объекты после проверки условий доступа.') },
  { id:'turkistan', name:text('투르키스탄','Туркестан'), local:'Түркістан / Туркестан', latin:'Turkistan', eyebrow:text('역사와 문화유산','История и культурное наследие'), intro:text('문화유산과 도시 방문을 중심으로 여행을 계획하세요.','Знакомство с культурным наследием и городом.'), tags:['culture','city','food'], places:[], nearby:text('주변 유적과 이동 방법을 확인한 뒤 추가합니다.','Добавим исторические объекты поблизости после проверки логистики.') }
];
export const interests = [
  {id:'all',name:text('전체','Все направления')},{id:'nature',name:text('자연','Природа')},{id:'city',name:text('도시','Города')},{id:'culture',name:text('역사와 문화','История и культура')},{id:'food',name:text('음식','Еда')},{id:'water',name:text('물가에서의 휴식','Отдых у воды')}
];
export const practical = [
  {id:'entry',name:text('입국과 서류','Въезд и документы'),summary:text('한국 국적 여행자를 위한 입국 안내','Условия для путешественников из Южной Кореи'),fields:[text('입국 조건과 여권','Условия въезда и паспорт'),text('공식 정보 출처','Официальные источники'),text('최종 확인 날짜','Дата последней проверки')]},
  {id:'money',name:text('돈과 결제','Деньги и оплата'),summary:text('현금, 카드, 환전','Наличные, карты, обмен'),fields:[text('카드 사용과 현금','Карты и наличные'),text('환전 방법','Способы обмена'),text('비용과 확인 날짜','Расходы и дата проверки')]},
  {id:'connection',name:text('SIM과 인터넷','SIM и интернет'),summary:text('도착 후 연락과 연결','Связь после прибытия'),fields:[text('SIM 구입과 등록','Покупка и регистрация SIM'),text('인터넷 설정','Настройка интернета'),text('요금과 공식 출처','Тарифы и официальные источники')]},
  {id:'transport',name:text('교통','Транспорт'),summary:text('공항, 도시, 장거리 이동','Аэропорт, город, дальние поездки'),fields:[text('도착 후 이동','Поездка после прибытия'),text('시내 교통과 택시','Городской транспорт и такси'),text('장거리 이동과 시간','Дальние переезды и время')]},
  {id:'language',name:text('언어와 주소','Язык и адреса'),summary:text('현지 이름과 유용한 표현','Местные названия и полезные фразы'),fields:[text('검색용 현지 이름','Местное название для поиска'),text('복사 가능한 주소','Адрес для копирования'),text('한국어·러시아어 표현','Фразы на корейском и русском')]},
  {id:'safety',name:text('안전과 여행 준비','Безопасность и подготовка'),summary:text('날씨, 접근 조건, 준비물','Погода, доступ, подготовка'),fields:[text('여행 전 확인 사항','Что проверить перед поездкой'),text('날씨와 접근 제한','Погода и ограничения доступа'),text('공식 연락처','Официальные контакты')]}
];
export const kokTobe = {
  id:'kok-tobe', destination:'almaty', name:text('콕토베','Кок-Тобе'), local:'Кок-Тобе / Kok Tobe',
  intro:text('알마티 전망과 산책을 위한 장소. 방문 방법과 실용 정보는 확인 중입니다.','Панорама Алматы и прогулка. Способы посещения и практические сведения требуют проверки.'),
  gallery:[{key:'kok-tobe-panorama',label:text('알마티 전망','Панорама Алматы')},{key:'kok-tobe-ascent',label:text('올라가는 길','Подъём')},{key:'kok-tobe-walk',label:text('산책','Прогулка')},{key:'kok-tobe-video',label:text('영상','Видео'),kind:'video'}],
  facts:[text('운영 시간: 공식 일정 확인 후 추가','Часы работы: добавим после проверки расписания'),text('입장권: 가격과 포함 사항 확인 후 추가','Билеты: проверим цены и что входит'),text('방문 시간: 동선 확인 후 추가','Время посещения: добавим после проверки маршрута'),text('접근성: 계단·유모차·아동 조건 확인','Доступность: проверим лестницы и условия для детей'),text('날씨: 운행 제한 확인 필요','Погода: требуется проверка ограничений подъёма')]
};
// Replace nulls with rights-cleared media. Generated footage must be labeled as an illustration.
// Photo: { kind:'photo', src:'assets/media/name.webp', alt:{ko:'...',ru:'...'}, credit:'...', source:'https://...' }
// Video: { kind:'video', src:'assets/media/name.mp4', poster:'assets/media/name.webp', tracks:[{src:'assets/media/name.ko.vtt',srclang:'ko',label:'한국어'}], credit:'...', source:'https://...' }
export const media = {
  'country-hero':null, 'country-video':null, 'almaty':null, 'astana':null, 'aktau':null, 'ust-kamenogorsk':null, 'burabay':null, 'turkistan':null,
  'almaty-video':null, 'kok-tobe-panorama':null, 'kok-tobe-ascent':null, 'kok-tobe-walk':null, 'kok-tobe-video':null, 'kok-tobe-guide':null
};
