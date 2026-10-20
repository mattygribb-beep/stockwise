/**
 * Conservative product identity checks.
 * No fuzzy title score can override a known conflicting barcode, brand, flavour,
 * unit size or Amazon sale-pack quantity.
 */
export type ProductCandidate={title:string;brand?:string|null;ean?:string|null;upc?:string|null;gtin?:string|null;size?:string|null;packQty?:number|null;caseQty?:number|null}
const clean=(s?:string|null)=>String(s||'').toLowerCase().normalize('NFKD').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')
const code=(s?:string|null)=>String(s||'').replace(/\D/g,'').replace(/^0+(?=\d{12,13}$)/,'')
const size=(s:string)=>{const m=String(s||'').toLowerCase().replace(/(\d),(\d)/g,'$1.$2').match(/(\d+(?:\.\d+)?)\s*(kg|g|grams?|ml|l|litres?|oz|fl oz)\b/);if(!m)return null;let n=Number(m[1]),u=m[2];if(u==='kg'){n*=1000;u='g'}if(u==='l'||u.startsWith('litre')){n*=1000;u='ml'}if(u==='oz'){n*=28.349523125;u='g'}if(u==='fl oz'){n*=29.5735295625;u='ml'}if(u.startsWith('gram'))u='g';return {n,u}}
const pack=(s:string)=>{const t=clean(s);const m=t.match(/(?:pack of|case of|box of|carton of|multipack of)\s*(\d+)\b|\b(\d+)\s*(?:pack|pk|count|ct|x)\b|\b(\d+)\s*x\s*\d+(?:\.\d+)?\s*(?:g|ml|oz)\b/);return m?Number(m[1]||m[2]||m[3]):null}
const variantTerms=['cherry','black cherry','strawberry','raspberry','orange','lemon','lime','pineapple','peach','grape','watermelon','vanilla','chocolate','cinnamon','original','diablo','sweet','dill','hot dog','pizza','cheddar','sour','mint']
export function assessIdentity(amazon:ProductCandidate,supplier:ProductCandidate){const reasons:string[]=[],a=clean(amazon.title),b=clean(supplier.title),ab=clean(amazon.brand),sb=clean(supplier.brand);if(ab&&sb&&ab!==sb)reasons.push('BRAND_CONFLICT')
const ac=[amazon.ean,amazon.upc,amazon.gtin].map(code).filter(Boolean),sc=[supplier.ean,supplier.upc,supplier.gtin].map(code).filter(Boolean);if(ac.length&&sc.length&&!ac.some(x=>sc.includes(x)))reasons.push('BARCODE_CONFLICT')
const ap=amazon.packQty??pack(amazon.title),sp=supplier.packQty??pack(supplier.title);if(ap!=null&&sp!=null&&ap!==sp)reasons.push('SELL_PACK_CONFLICT')
const az=size(amazon.size||amazon.title),sz=size(supplier.size||supplier.title);if(az&&sz&&(az.u!==sz.u||Math.abs(az.n-sz.n)>Math.max(0.5,Math.min(az.n,sz.n)*0.012)))reasons.push('UNIT_SIZE_CONFLICT')
for(const word of variantTerms){const aa=new RegExp('\\b'+word+'\\b').test(a),bb=new RegExp('\\b'+word+'\\b').test(b);if(aa!==bb&&(aa||bb)){const other=variantTerms.filter(x=>x!==word);if(other.some(x=>new RegExp('\\b'+x+'\\b').test(aa?b:a))){reasons.push('VARIANT_CONFLICT');break}}}
if(reasons.length)return {decision:'REJECT' as const,reasons,confidence:0}
const at=new Set(a.split(' ').filter(x=>x.length>2)),bt=new Set(b.split(' ').filter(x=>x.length>2));const overlap=[...at].filter(x=>bt.has(x)).length;const similarity=overlap/Math.max(1,new Set([...at,...bt]).size)
const exactBarcode=ac.length>0&&sc.length>0&&ac.some(x=>sc.includes(x))
const identityEvidence=!!ab&&!!sb&&ab===sb&&!!az&&!!sz&&az.u===sz.u&&Math.abs(az.n-sz.n)<=Math.max(.5,az.n*.012)&&ap!=null&&sp!=null&&ap===sp
if(exactBarcode&&identityEvidence&&similarity>=.5)return {decision:'CANDIDATE_STRONG' as const,reasons:['BARCODE_AND_ATTRIBUTES_AGREE','REQUIRES_VERIFICATION'],confidence:95}
return {decision:'REVIEW' as const,reasons:[exactBarcode?'BARCODE_AGREES':'BARCODE_UNCONFIRMED',identityEvidence?'ATTRIBUTES_AGREE':'ATTRIBUTES_INCOMPLETE'],confidence:Math.round(similarity*75)}
}
