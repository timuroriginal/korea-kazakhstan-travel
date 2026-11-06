// Usage: node scripts/build-map.mjs path/to/d3-7.9.0.min.js
// D3 is only used during preparation; the published map has no external requests.
import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(await readFile(process.argv[2],'utf8'),context);
const d3=context.d3;
const geo=JSON.parse(await readFile('data/map-geography.json','utf8'));
const width=900,height=570;
const projection=d3.geoConicEqualArea().parallels([42,56]).rotate([-68,0]).center([0,48]).fitExtent([[30,35],[870,525]],geo);
const path=d3.geoPath(projection).digits(1);
const shapes=geo.features.map(f=>({code:f.properties.code,name:f.properties.name,path:path(f)}));
if(shapes.some(s=>!s.path||s.path.includes('NaN')))throw new Error('Invalid projected outline');
const points=Object.fromEntries(Object.entries(geo.points).map(([id,p])=>[id,{...p,x:+projection(p.coordinates)[0].toFixed(1),y:+projection(p.coordinates)[1].toFixed(1)}]));
const targetRegions={'almaty':['KAZ004','KAZ005'],'astana':['KAZ006'],'aktau':['KAZ014'],'ust-kamenogorsk':['KAZ008'],'burabay':['KAZ002'],'turkistan':['KAZ018']};
for(const codes of Object.values(targetRegions))for(const code of codes)if(!shapes.some(s=>s.code===code))throw new Error('Missing region '+code);
const result={width,height,shapes,points,targetRegions,source:geo.source};
await writeFile('assets/map-data.js','// Generated from attributed geographic source data. Regenerate with scripts/build-map.mjs.\nexport const mapData = '+JSON.stringify(result)+';\n');
console.log(JSON.stringify({shapes:shapes.length,points,bytes:JSON.stringify(result).length}));
