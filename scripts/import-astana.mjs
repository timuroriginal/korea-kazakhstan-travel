// Adapt the reviewed editorial package to the existing destination renderer.
// Usage: node scripts/import-astana.mjs path/to/astana-content.json
import fs from 'node:fs/promises';
const input=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const pair=(ru,ko)=>({ru,ko});
const category={architecture:'architecture',culture:'culture',religion:'culture',museum:'culture',parks:'parks',shopping:'shopping',food:'food',nature:'nature',history:'culture'};
const places=input.places.filter(p=>p.decision!=='reserve').map(p=>({
  id:p.id,destination:'astana',name:p.name,local:p.local,latin:p.id.replace('astana-','').replaceAll('-',' '),
  group:p.group,category:category[p.category]||p.category,decision:p.decision,
  copy:{card:p.card,body:p.body},address:p.address,hours:p.hours?.ru||null,price:p.price?.ru||null,
  visitor:{address:p.address?pair(p.address,p.address):null,transport:p.transport,hours:p.hours,price:p.price,duration:p.duration,access:null,gaps:null},
  visit:{format:p.format,effort:p.effort,language:p.language},checkedAt:p.checkedAt,
  sources:p.sources.map(id=>input.research.sources.find(s=>s.id===id))
}));
const sections={arrival:'Прибытие',bus:'Городской транспорт',lrt:'Городской транспорт',stay:'Проживание',food:'Еда',season:'Сезоны'};
const practical=input.practical.map(p=>({id:p.id,section:sections[p.id.replace('astana-practical-','')],title:p.title.ru,titleKo:p.title.ko,copy:{answer:p.text,detail:pair('',''),phrase:p.phrase},sources:p.sources}));
if(practical.some(p=>!p.section))throw Error('Unknown practical section');
const routes=input.routes.flatMap(r=>r.stops.map((id,index)=>({id:r.id,day:r.id.includes('third')?3:r.id.includes('two')||r.id.includes('right')?2:1,order:index+1,placeId:id,parent:r.id.includes('third')?'astana-first-days':null,copy:{title:r.title,note:index===0?r.text:pair('','')}})));
const alzhir=routes.find(r=>r.id==='astana-third-alzhir'&&r.order===1);
alzhir.copy.note=pair('АЛЖИР можно рассмотреть отдельным выездом после двух городских дней. Для этой поездки ещё не подготовлены корейская программа и обратный транспорт.','도심에서 이틀을 보낸 뒤 알지르를 별도 일정으로 고려할 수 있습니다. 이 방문을 위한 한국어 안내와 돌아오는 교통편은 아직 준비되지 않았습니다.');
const data={copy:{intro:input.overview.intro,overview:input.overview.body,duration:input.overview.duration,
  seasons:pair('Больше прогулок в тёплый сезон. Зимой выбирайте короткие выходы между внутренними остановками.','따뜻한 계절에는 산책을 늘리고 겨울에는 실내 방문 사이에 짧은 야외 일정을 더합니다.'),
  audience:pair('Архитектура, история и неспешные прогулки у Есиля.','건축과 역사, 예실강을 따라 걷는 여유로운 산책에 관심 있는 여행.')},
  places,practical,routes,seasons:input.seasons,editorialDate:input.checkedAt,languageReview:input.languageReview};
const ids=new Set(places.map(p=>p.id));
if(ids.size!==16||places.length!==16)throw Error('Expected 16 public places; 2 editorial reserves remain private');
for(const r of routes)if(!ids.has(r.placeId))throw Error('Route references hidden place '+r.placeId);
for(const p of places){
 if(!['architecture','culture','parks','shopping','food','nature'].includes(p.category))throw Error('Category '+p.category);
 for(const k of ['card','body'])for(const lang of ['ru','ko'])if(!p.copy[k][lang]||/[\u2013\u2014]/.test(p.copy[k][lang]))throw Error('Invalid prose '+p.id);
 if(p.sources.some(s=>!s?.url))throw Error('Missing provenance '+p.id);
}
await fs.writeFile(new URL('../assets/astana-data.js',import.meta.url),'// Reviewed Astana content. Research retained internally; reserves excluded.\nexport const astanaContent = '+JSON.stringify(data,null,2)+';\n');
console.log(`Prepared ${places.length} Astana places, ${practical.length} practical topics, ${input.routes.length} route sequences.`);
