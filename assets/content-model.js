import {applyAlmatyNavigation} from './almaty-navigation.js';
import { applyVisitorPolicy } from './visitor-policy.js';
import { applyRegionalRefinements } from './regional-refinements.js';
import { applyOskemenPlans } from './oskemen-plans.js';
import { applyBurabayPlans } from './burabay-plans.js';
import { applyAktauPlans } from './aktau-plans.js';
import { applyTurkistanPlans } from './turkistan-plans.js';
import { applyAstanaPlans } from './astana-plans.js';
import { applyAlmatyCohesion } from './almaty-cohesion.js';
import { applyLakeVisits } from './lakes-pair.js';
import { applyCharynDay } from './charyn-day.js';
import { applyAlmatyMountainDay } from './almaty-mountain-day.js';
import { almatyFirstDayStops } from './almaty-first-day.js';
import { guideContent as existingContent } from './content-data.js';
import { astanaContent } from './astana-data.js';
import { turkistanContent } from './turkistan-data.js';
import { aktauContent } from './aktau-data.js';
import { burabayContent } from './burabay-data.js';
import { oskemenContent } from './oskemen-data.js';
import { applyVisitorUpdates } from './visitor-updates.js';
const reviewedContent=applyVisitorUpdates({...existingContent,astana:astanaContent,turkistan:turkistanContent,aktau:aktauContent,burabay:burabayContent,'ust-kamenogorsk':oskemenContent});

const plannedContent={...reviewedContent,'ust-kamenogorsk':applyOskemenPlans(reviewedContent['ust-kamenogorsk']),burabay:applyBurabayPlans(reviewedContent.burabay),aktau:applyAktauPlans(reviewedContent.aktau),turkistan:applyTurkistanPlans(reviewedContent.turkistan),astana:applyAstanaPlans(reviewedContent.astana),almaty:applyAlmatyCohesion(applyLakeVisits(applyCharynDay(applyAlmatyMountainDay({...reviewedContent.almaty,routes:[...almatyFirstDayStops,...reviewedContent.almaty.routes.filter(r=>r.id!=='route-1d')]}))))};

export const guideContent=applyAlmatyNavigation(applyVisitorPolicy(applyRegionalRefinements(plannedContent)));

