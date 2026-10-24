// Route evidence, timetable interpretation and review triggers: outputs/korea-flight-map/AUDIT.md.
export const koreaFlights=[
 {from:'incheon',to:'almaty',carrier:'Asiana Airlines',flight:'OZ577',minutes:400,until:'2026-10-24',seasonal:false,url:'https://flyasiana.com/C/KZ/EN/customer/notice/detail?id=CM202603240002528572'},
 {from:'incheon',to:'astana',carrier:'Air Astana',flight:'KC210',minutes:440,until:'2026-10-22',seasonal:false,url:'https://www.airastana.com/global-en/booking-form/flights-to-seoul'},
 {from:'gimhae',to:'almaty',carrier:'Eastar Jet',flight:'ZE935',minutes:465,until:'2026-10-23',seasonal:true,url:'https://www.eastarjet.com/'}
];
export function koreanFlight(from,to,date=new Date().toISOString().slice(0,10)){
 const route=koreaFlights.find(f=>f.from===from&&f.to===to);return route?{...route,current:date<=route.until}:null;
}
