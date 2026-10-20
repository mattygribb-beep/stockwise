/** GS1 GTIN validation and safe barcode normalization. */
export type BarcodeResult={valid:boolean;canonical:string|null;kind:'GTIN-8'|'UPC-A'|'EAN-13'|'GTIN-14'|null;reason:string}
export function validateBarcode(input:unknown):BarcodeResult{
const raw=String(input??'').trim()
if(!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(raw))return {valid:false,canonical:null,kind:null,reason:'UNSUPPORTED_FORMAT'}
const digits=[...raw].map(Number),check=digits.pop()!
let sum=0;for(let i=digits.length-1,m=3;i>=0;i--,m=m===3?1:3)sum+=digits[i]*m
if((10-sum%10)%10!==check)return {valid:false,canonical:null,kind:null,reason:'CHECK_DIGIT_MISMATCH'}
const kind=raw.length===8?'GTIN-8':raw.length===12?'UPC-A':raw.length===13?'EAN-13':'GTIN-14'
return {valid:true,canonical:raw.padStart(14,'0'),kind,reason:'VALID'}
}
export function compareBarcodes(a:unknown,b:unknown){const x=validateBarcode(a),y=validateBarcode(b);if(!x.valid||!y.valid)return {match:false,reason:'UNVERIFIED_BARCODE'};return {match:x.canonical===y.canonical,reason:x.canonical===y.canonical?'SAME_GTIN':'DIFFERENT_GTIN'}}
export function evaluateBarcodeEnrichment(existing:unknown,incoming:unknown){const next=validateBarcode(incoming);if(!next.valid)return {action:'REJECT_INVALID' as const,reason:next.reason};const old=String(existing??'').trim();if(!old)return {action:'PROPOSE_NEW' as const,canonical:next.canonical};const prior=validateBarcode(old);if(!prior.valid)return {action:'REVIEW_EXISTING_INVALID' as const,canonical:next.canonical};if(prior.canonical===next.canonical)return {action:'UNCHANGED' as const,canonical:next.canonical};return {action:'REVIEW_CONFLICT' as const,canonical:next.canonical,existing:prior.canonical}}
