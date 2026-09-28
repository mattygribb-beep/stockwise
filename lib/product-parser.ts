const DISTRIBUTOR=/distribution|wholesale|wando|spv services|a&a distribution/i
export type CanonicalProduct={brand:string;family:string;variant:string;unitSize:string;caseQty:number;canonicalKey:string}
export type ParserKnowledge={brandAliases?:any[];variantAliases?:any[];noiseTerms?:any[]}
const clean=(s:any)=>String(s||'').replace(/&amp;|&#x26;/gi,'&').replace(/&#x27;|&apos;/gi,"'").replace(/\s+/g,' ').trim()
const n=(s:any)=>clean(s).toLowerCase().replace(/strawberries/g,'strawberry').replace(/&/g,' and ').replace(/[^a-z0-9.]+/g,' ').replace(/\s+/g,' ').trim()
export function unitSize(size:any,title:any=''){let s=n(size||title),m=s.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/);if(m){let v=Number(m[1]),u=m[2];if(u==='kg')return (v*1000)+'g';if(u==='l')return (v*1000)+'ml';return v+u}m=s.match(/(\d+(?:\.\d+)?)\s*fl\s*oz/);if(m)return Math.round(Number(m[1])*29.5735)+'ml';m=s.match(/(\d+(?:\.\d+)?)\s*oz/);if(m)return Math.round(Number(m[1])*28.3495)+'g';return ''}
function inferBrand(title:string,brand:string,known:string[]=[]){const b=clean(brand);if(b&&!DISTRIBUTOR.test(b))return b;const t=n(title);const hit=known.filter(Boolean).sort((a,b)=>b.length-a.length).find(x=>t.startsWith(n(x)+' ')||t===n(x));if(hit)return hit;return clean(title).replace(/^\([^)]*\)\s*/,'').split(/\s+/).slice(0,2).join(' ')}
export function parseCanonicalProduct(input:{title:any;brand?:any;size?:any;caseQty?:any},knownBrands:string[]=[],knowledge:ParserKnowledge={}):CanonicalProduct{
 const aliases=knowledge.brandAliases||[],rawBrand=clean(input.brand),alias=aliases.find((x:any)=>n(x.alias)===n(rawBrand)),title=clean(input.title),brand=inferBrand(title,alias?.canonical_brand||rawBrand,[...knownBrands,...aliases.map((x:any)=>x.canonical_brand)]),us=unitSize(input.size,title),qty=Math.max(1,Number(input.caseQty)||1)
 let body=n(title);const nb=n(brand);if(nb&&body.startsWith(nb+' '))body=body.slice(nb.length+1)
 body=body.replace(/\b\d+(?:\.\d+)?\s*(?:kg|g|ml|l|fl\s*oz|oz)\b/g,' ').replace(/\b\d+\s*x\s*\d+(?:\.\d+)?\b/g,' ').replace(/\b(?:case|box|pack)\s*(?:of)?\s*\d+\b/g,' ').replace(/\b(?:case|box|pack|bags?|cans?|bottles?|tubs?|bars?|multipacks?)\b/g,' ').replace(/\b(?:usa import|china|canada|aus|bbd)\b/g,' ').replace(/\b\d+ct\b/g,' ');for(const x of knowledge.noiseTerms||[]){const z=n(x.term);if(z)body=(' '+body+' ').split(' '+z+' ').join(' ').trim()}body=body.replace(/\s+/g,' ').trim()
 const generic=new Set(['candy','gummy','soda','drink','energy','flavour','flavor','chewy','peg','theatre'])
 const parts=body.split(' ').filter(Boolean),meaningful=parts.filter(x=>!generic.has(x))
 const family=meaningful.slice(0,Math.min(2,meaningful.length)).join(' ')||parts.slice(0,2).join(' ');let variant=meaningful.slice(Math.min(2,meaningful.length)).join(' ');const va=(knowledge.variantAliases||[]).filter((x:any)=>!x.brand||n(x.brand)===n(brand)).find((x:any)=>n(body).includes(n(x.alias)));if(va)variant=va.canonical_variant
 return {brand,family,variant,unitSize:us,caseQty:qty,canonicalKey:[n(brand),n(family),n(variant),us].filter(Boolean).join('|')}
}
export function canonicalMatch(a:CanonicalProduct,b:CanonicalProduct){
 if(a.unitSize&&b.unitSize&&a.unitSize!==b.unitSize)return {match:false,score:0,reason:'Unit size conflict'}
 if(n(a.brand)!==n(b.brand))return {match:false,score:0,reason:'Brand conflict'}
 if(a.variant&&b.variant&&n(a.variant)!==n(b.variant))return {match:false,score:0,reason:'Variant conflict'}
 const fam=n(a.family)===n(b.family),variant=!a.variant||!b.variant||n(a.variant)===n(b.variant),size=!a.unitSize||!b.unitSize||a.unitSize===b.unitSize
 const score=25+(fam?35:0)+(variant?20:0)+(size?20:0)
 return {match:score>=75,score,reason:[fam?'family':'',variant?'variant':'',size?'unit size':''].filter(Boolean).join(' + ')}
}