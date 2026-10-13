// Compile reviewed workbook records into buildless, reusable destination data.
// Usage: node scripts/import-content.mjs path/to/normalized.json
import fs from 'node:fs/promises';
const rows=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const external=new Set(['almaty-shymbulak','almaty-medeu-sports-complex','ile-alatau-park','almaty-bao','almaty-charyn','almaty-gorelnik','almaty-oi-qaragai','almaty-kolsai','almaty-kaindy']);
const category=r=>/музей|театр|религиоз|городской/.test(r['категория'])?'culture':/торговый|рынок/.test(r['категория'])?'shopping':/парк|семейная/.test(r['категория'])?'parks':'mountains';
const places=rows['Места'].filter(r=>r['place_id']!=='almaty-medeu-visit-center').map(r=>({
  id:r['place_id']==='almaty-kok-tobe'?'kok-tobe':r['place_id'], researchId:r['place_id'], destination:r.destination_id,
  name:{ru:r['название на русском'],ko:r['название на корейском']},local:r['местное название'],latin:r['латиница'],
  group:external.has(r.place_id)?'nearby':'city',category:category(r),categoryRu:r['категория'],zone:r['город/зона'],
  cardRu:r['текст карточки RU'],bodyRu:r['описание места RU'],duration:r['время на месте с основанием'],
  address:r['точный вход/адрес'],transport:r['транспорт и пеший участок'],hours:r['режим и выходные'],hoursStatus:r['статус режима'],
  price:r['стоимость конкретного продукта'],priceStatus:r['статус цены'],access:r['существенные условия доступа']||r['сезон/ограничения'],
  closed:r.place_id==='almaty-first-president-park',accessPending:['almaty-bao','almaty-medeu-sports-complex'].includes(r.place_id),
  sources:rows['Источники'].filter(s=>(r.claim_id||'').split(';').includes(s.claim_id)&&s['применение']==='Действующая запись каталога'&&s['тип']!=='карта/справочник').map(s=>({url:s['прямая ссылка'],label:s['название источника и организация/автор'],status:s['статус']})),
  mapUrl:r['2ГИС карточка URL']&&r['2ГИС статус']==='Найдена прямая карточка'?r['2ГИС карточка URL']:null,
  checkedAt:r['дата проверки'],gaps:r['пробелы']
}));
const overview=rows['Направления'].find(r=>r['идентификатор']==='almaty');
const content={almaty:{overviewRu:overview['краткий обзор на русском'],seasonsRu:overview['особенности по сезонам'],durationRu:overview['ориентир по продолжительности поездки с объяснением'],audienceRu:overview['кому подходит'],checkedAt:overview['дата проверки'],places,
  practical:rows['Практическое'].map(r=>({id:r['идентификатор'],section:r['раздел'],title:r['конкретная тема'],answerRu:r['короткий ответ для страницы'],answerKo:r['корейский редакционный черновик'],detailRu:r['подробное пояснение на русском'],source:rows['Источники'].find(s=>s.claim_id===r.claim_id)?.['прямая ссылка']||null})),
  routes:rows['Маршруты'].map(r=>({id:r.route_id,title:r['название маршрута'],day:r['день'],order:r['порядок остановки'],placeId:places.find(p=>p.researchId===r.place_id)?.id,parent:r['родитель маршрута'],note:r['ограничения']}))}};
if(places.length!==26||new Set(places.map(p=>p.id)).size!==26)throw Error('Expected 26 identified, unique places');
await fs.writeFile(new URL('../assets/content-data.js',import.meta.url),'// Reviewed Almaty package, 2026-10-13. Russian editorial preview; unknown fields stay null.\nexport const guideContent = '+JSON.stringify(content,null,2)+';\n');
console.log(`Compiled ${places.length} places, ${content.almaty.practical.length} practical topics.`);
