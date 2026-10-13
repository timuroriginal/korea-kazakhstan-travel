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
// Editorial overlays are independent of the research snapshot and survive reimport.
const copy=JSON.parse(await fs.readFile(new URL('../data/almaty-copy.json',import.meta.url),'utf8'));
const visitor=JSON.parse(await fs.readFile(new URL('../data/almaty-visitor-info.json',import.meta.url),'utf8'));
const bilingual=value=>value&&typeof value.ru==='string'&&typeof value.ko==='string'&&value.ru.trim()&&value.ko.trim();
for(const overlay of [copy.places,visitor.places]){
  if(Object.keys(overlay).length!==places.length||places.some(p=>!overlay[p.id]))throw Error('Editorial place IDs do not match research');
}
for(const p of places){
  p.copy=copy.places[p.id];p.visitor=visitor.places[p.id];
  for(const s of p.sources){s.labelKo=copy.sourceLabelsKo[s.label];if(!s.labelKo)throw Error(`Missing source label: ${s.label}`);}
  for(const field of ['card','body'])if(!bilingual(p.copy[field]))throw Error(`Missing ${p.id}.${field} adaptation`);
  for(const field of ['address','transport','hours','price','duration','access','gaps']){
    if(p.visitor[field]!==null&&!bilingual(p.visitor[field]))throw Error(`Missing ${p.id}.${field} adaptation`);
  }
  for(const field of ['address','hours','price'])if(Boolean(p[field])!==Boolean(p.visitor[field]))throw Error(`Unknown field changed: ${p.id}.${field}`);
}
const nature=JSON.parse(await fs.readFile(new URL('../data/almaty-nature.json',import.meta.url),'utf8'));
for(const p of places){
  const update=nature.updates[p.id];
  if(update){Object.assign(p,update.fields);p.sources.push(...update.sources);}
  p.visit=nature.visit[p.id];
}
for(const p of nature.places){
  if(p.destination!=='almaty'||places.some(old=>old.id===p.id))throw Error(`Invalid additional place: ${p.id}`);
  for(const field of ['card','body'])if(!bilingual(p.copy[field]))throw Error(`Missing new ${p.id}.${field}`);
  for(const field of ['address','transport','hours','price','duration','access','gaps'])if(p.visitor[field]!==null&&!bilingual(p.visitor[field]))throw Error(`Missing new ${p.id}.${field}`);
  for(const field of ['address','hours','price'])if(Boolean(p[field])!==Boolean(p.visitor[field]))throw Error(`Unknown new field changed: ${p.id}.${field}`);
  if(!p.sources.length||p.sources.some(s=>!s.url.startsWith('https://')||!s.labelKo))throw Error(`Missing new source: ${p.id}`);
  places.push(p);
}
for(const p of places){
  for(const field of ['format','effort','language'])if(!bilingual(p.visit?.[field]))throw Error(`Missing visitor guidance: ${p.id}.${field}`);
}
content.almaty.copy=copy.destination;
content.almaty.editorialDate=copy.editorialDate;
content.almaty.languageReview=copy.languageReview;
for(const p of content.almaty.practical){p.copy=copy.practical[p.id];p.source=nature.practicalSources[p.id]||p.source;if(!bilingual(p.copy?.answer)||!bilingual(p.copy?.detail))throw Error(`Missing practical adaptation: ${p.id}`);}
for(const r of content.almaty.routes){r.copy={title:copy.routeTitles[r.id],note:copy.routeNotes[`${r.id}:${r.day}:${r.order}`]};if(!bilingual(r.copy.title)||!bilingual(r.copy.note))throw Error(`Missing route adaptation: ${r.id}`);}
await fs.writeFile(new URL('../assets/content-data.js',import.meta.url),'// Almaty research with separate RU/KO editorial overlays. Unknown facts stay null.\nexport const guideContent = '+JSON.stringify(content,null,2)+';\n');
console.log(`Compiled ${places.length} places, ${content.almaty.practical.length} practical topics.`);
