// Allow only fields consumed by visitor renderers. Research stays in source data.
const pick=(value,keys)=>Object.fromEntries(keys.filter(key=>Object.hasOwn(value,key)).map(key=>[key,value[key]]));
const destinationFields=['copy','nearbyTitle','nearbyCopy','visitorNote','seasons','planning','itineraryNote','journeys'];
const placeFields=['id','destination','name','local','latin','group','category','decision','copy','address','hoursStatus','priceStatus','closed','accessPending','visitor','visit','mapUrl','planLink','stay','actions','orderCards'];
const practicalFields=['id','section','title','titleKo','copy','secondary'];
const routeFields=['id','day','order','placeId','parent','optional','status','copy','dayPlan','blocks'];
const visitorFields=['address','transport','hours','price','duration','access','returnTransport','entrance','payment'];
export function publicContent(content){
  return Object.fromEntries(Object.entries(content).map(([id,d])=>[id,{
    ...pick(d,destinationFields),
    ...(d.seasons?{seasons:d.seasons.map(s=>pick(s,['period','conditions','plan']))}:{}),
    places:d.places.filter(p=>p.decision!=='reserve').map(p=>({...pick(p,placeFields),visitor:pick(p.visitor,visitorFields)})),
    practical:d.practical.map(p=>pick(p,practicalFields)),
    routes:d.routes.map(r=>pick(r,routeFields))
  }]));
}
