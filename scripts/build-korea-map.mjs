// node scripts/build-korea-map.mjs /path/to/d3-7.9.0.min.js
// geoBoundaries 9469f09 / Natural Earth (public domain), overview geometry represents 2021.
import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
const context=vm.createContext({});vm.runInContext(await readFile(process.argv[2],'utf8'),context);const d3=context.d3;
const sourceURL='https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/KOR/ADM1/geoBoundaries-KOR-ADM1.geojson';
let input;try{input=await readFile('data/korea-geography.geojson','utf8');}catch{const response=await fetch(sourceURL);if(!response.ok)throw Error('Geometry download failed');input=await response.text();}
const geo=JSON.parse(input);
// D3 uses clockwise exterior rings; source GeoJSON follows the opposite convention.
for(const f of geo.features){if(d3.geoArea(f)>2*Math.PI){const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const polygon of polygons)for(const ring of polygon)ring.reverse();}}
const names={
 'KR-11':['서울특별시','Сеул'],'KR-26':['부산광역시','Пусан'],'KR-27':['대구광역시','Тэгу'],'KR-28':['인천광역시','Инчхон'],'KR-29':['광주광역시','Кванджу'],'KR-30':['대전광역시','Тэджон'],'KR-31':['울산광역시','Ульсан'],'KR-41':['경기도','Кёнгидо'],'KR-42':['강원특별자치도','Канвондо'],'KR-43':['충청북도','Чхунчхон-Пукто'],'KR-44':['충청남도','Чхунчхон-Намдо'],'KR-45':['전북특별자치도','Чонбук'],'KR-46':['전라남도','Чолла-Намдо'],'KR-47':['경상북도','Кёнсан-Пукто'],'KR-48':['경상남도','Кёнсан-Намдо'],'KR-49':['제주특별자치도','Чеджу'],'KR-50':['세종특별자치시','Седжон']};
const projection=d3.geoMercator().fitExtent([[18,50],[300,475]],geo),path=d3.geoPath(projection).digits(1);
const shapes=geo.features.map(f=>({code:f.properties.shapeISO,name:{ko:names[f.properties.shapeISO][0],ru:names[f.properties.shapeISO][1]},path:path(f)}));
const locate=c=>{const p=projection(c);return {coordinates:c,x:+p[0].toFixed(1),y:+p[1].toFixed(1)}};
const airports={incheon:{code:'RKSI',iata:'ICN',arp:'372745N 1262621E',...locate([126.439166667,37.4625]),name:{ko:'서울 · 인천 ICN',ru:'Сеул · Инчхон ICN'},region:'KR-28',source:'https://aim.koca.go.kr/eaipPub/Package/2026-06-25/html/eAIP/KR-AD-2.RKSI-en-GB.html?ver=20250728'},gimhae:{code:'RKPK',iata:'PUS',arp:'351050N 1285617E',...locate([128.938055556,35.180555556]),name:{ko:'부산 · 김해 PUS',ru:'Пусан · Кимхэ PUS'},region:'KR-26',source:'https://aim.koca.go.kr/eaipPub/Package/2026-04-15-AIRAC/html/eAIP/KR-AD-2.RKPK-en-GB.html?ver=20250728'}};
const cities=[{name:{ko:'서울',ru:'Сеул'},...locate([126.978,37.5665]),dx:20,dy:-8},{name:{ko:'부산',ru:'Пусан'},...locate([129.0756,35.1796]),dx:14,dy:27},{name:{ko:'대전',ru:'Тэджон'},...locate([127.3845,36.3504]),dx:-14,dy:0},{name:{ko:'대구',ru:'Тэгу'},...locate([128.6014,35.8714]),dx:14,dy:0},{name:{ko:'광주',ru:'Кванджу'},...locate([126.8526,35.1595]),dx:-14,dy:0},{name:{ko:'제주',ru:'Чеджу'},...locate([126.5312,33.4996]),dx:14,dy:0}];
if(shapes.length!==17||shapes.some(s=>!s.path||s.path.includes('NaN')))throw Error('Invalid Korean geometry');
await writeFile('assets/korea-map-data.js','// Generated overview geometry; see scripts/build-korea-map.mjs.\nexport const koreaMapData='+JSON.stringify({shapes,airports,cities,source:{url:'https://www.geoboundaries.org/api/current/gbOpen/KOR/ADM1/',license:'Public domain',year:2021}})+';\n');
console.log('Built 17 administrative regions, two airports, six city labels');
