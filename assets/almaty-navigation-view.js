// Pure renderer shared by the online guide and the standalone offline product.
export function renderAlmatyNavigation(plan,{tr,esc,lang='ru'}){
 if(!plan)return '';
 const label=(ru,ko)=>lang==='ko'?ko:ru;
 const map=(url,name)=>url?`<p><a class="action" data-navigation-map href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(name)} ↗</a></p>`:'';
 return `<section class="visit-navigation" data-visit-navigation><h3>${esc(tr(plan.title))}</h3><p>${esc(tr(plan.start))}</p>${map(plan.startMapUrl,label('Точка начала в Google Maps','Google 지도에서 출발 지점 보기'))}<ol class="navigation-steps">${plan.steps.map((step,i)=>`<li data-navigation-step="${i+1}"><h4>${esc(tr(step.title))}</h4><p>${esc(tr(step.body))}</p>${map(step.mapUrl,step.mapLabel?tr(step.mapLabel):label('Ориентир в Google Maps','Google 지도에서 위치 보기'))}</li>`).join('')}</ol><div class="return navigation-return" data-navigation-return><strong>${label('Как вернуться','돌아오는 길')}</strong><p>${esc(tr(plan.return))}</p>${map(plan.endMapUrl,label('Ориентир для возвращения','귀환 지점 지도'))}</div>${plan.note?`<p class="note small muted">${esc(tr(plan.note))}</p>`:''}</section>`;
}
