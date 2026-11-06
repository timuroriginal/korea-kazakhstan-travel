import {mountainNavigation,koktobeNavigation} from './almaty-mountain-navigation.js';
import {cityNavigation} from './almaty-city-navigation.js';
import {outskirtsNavigation} from './almaty-outskirts-navigation.js';

export const almatyNavigation={mountain:mountainNavigation,koktobe:koktobeNavigation,...cityNavigation,...outskirtsNavigation};
export const navigationByPlace={
 'almaty-shymbulak':mountainNavigation,'kok-tobe':koktobeNavigation,
 'almaty-kasteev-museum':cityNavigation.museum,'almaty-dostyk-plaza':cityNavigation.shopping,'almaty-esentai-mall':cityNavigation.esentai,
 'almaty-charyn':outskirtsNavigation.charyn,'almaty-kolsai':outskirtsNavigation.kolsai,'almaty-kaindy':outskirtsNavigation.kaindy
};
export const navigationByRoute={
 'route-3d':[mountainNavigation],
 'route-3d-charyn':[outskirtsNavigation.charyn],
 'route-3d-kolsai':[outskirtsNavigation.kolsai,outskirtsNavigation.kaindy]
};

// Location links stay consistent across catalog cards and the full product.
export function applyAlmatyNavigation(content){
 const almaty=content.almaty;
 return {...content,almaty:{...almaty,places:almaty.places.map(p=>{
  const plan=navigationByPlace[p.id];
  return plan?{...p,mapUrl:plan.startMapUrl||plan.steps.find(s=>s.mapUrl)?.mapUrl||p.mapUrl}:p;
 })}};
}
