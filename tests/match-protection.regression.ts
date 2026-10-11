import {conflictingUnitSizes,safeMatchBand} from '../lib/match-review'
function assert(condition:boolean,message:string){if(!condition)throw new Error(message)}
export function runMatchProtectionRegression(){
 assert(conflictingUnitSizes('140g','145g'),'Buchanan 140g/145g must conflict')
 assert(!conflictingUnitSizes('85.05g','85g'),'Ounce conversion rounding should not conflict')
 assert(!conflictingUnitSizes('42.52g','42g'),'Ounce conversion rounding should not conflict')
 assert(conflictingUnitSizes('120g','120ml'),'Mass and volume must not be equated')
 assert(safeMatchBand({score:100,gap:30,identityComplete:true,sizeConflict:true,protected:true})==='REVIEW','Protected size conflict must be REVIEW')
 assert(safeMatchBand({score:100,gap:30,identityComplete:true,rejected:true})==='REJECTED','Rejected pair must remain rejected')
 assert(safeMatchBand({score:100,gap:30,identityComplete:true})==='STRONG','Valid high-confidence candidate should remain strong')
 assert(safeMatchBand({score:90,gap:30,identityComplete:true})==='REVIEW','Insufficient score should be review')
 return true
}
