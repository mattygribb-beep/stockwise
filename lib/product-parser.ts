const DISTRIBUTOR=/distribution|wholesale|wando|spv services|a&a distribution|sweet\s*&?\s*glory/i
export type CanonicalProduct={brand:string;family:string;variant:string;unitSize:string;caseQty:number;canonicalKey:string;sizeConflict?:string}
export type ParserKnowledge={brandAliases?:any[];variantAliases?:any[];noiseTerms?:any[]}
const clean=(s:any)=>String(s||'').replace(/&amp;|&#x26;/gi,'&').replace(/&#x27;|&apos;/gi,"'").replace(/\s+/g,' ').trim()
export const normalize=(s:any)=>clean(s).toLowerCase().replace(/strawberries/g,'strawberry').replace(/&/g,' and ').replace(/[^a-z0-9.]+/g,' ').replace(/\s+/g,' ').trim()
const measure=(v:number,u:string)=>u==='kg'?{v:v*1000,u:'g'}:u==='l'?{v:v*1000,u:'ml'}:{v,u}
function measureText(v:number,u:string){const m=measure(v,u);return (Number.isInteger(m.v)?m.v:Number(m.v.toFixed(2)))+m.u}
export function unitSize(size:any,title:any=''){const s=normalize(size||title);let m=s.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/);if(m)return measureText(Number(m[1]),m[2]);m=s.match(/(\d+(?:\.\d+)?)\s*fl\s*oz/);if(m)return Math.round(Number(m[1])*29.5735)+'ml';m=s.match(/(\d+(?:\.\d+)?)\s*oz/);if(m)return Math.round(Number(m[1])*28.3495)+'g';return ''}
function parseMeasure(s:string){const m=s.match(/^(\d+(?:\.\d+)?)(g|ml)$/);return m?{v:Number(m[1]),u:m[2]}:null}
function innerPack(title:string){const t=normalize(title);let m=t.match(/\b(\d+)\s*pack\b/);if(m)return Number(m[1]);m=t.match(/\b(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(?:g|ml)\b/);return m?Number(m[1]):1}
function sizesCompatible(structured:string,titleSize:string,title:string){if(!structured||!titleSize||structured===titleSize)return true;const a=parseMeasure(structured),b=parseMeasure(titleSize);if(!a||!b||a.u!==b.u)return false;const p=innerPack(title);return p>1&&Math.abs(a.v*p-b.v)<0.11}
function inferBrand(title:string,brand:string,known:string[]=[]){const b=clean(brand);if(b&&!DISTRIBUTOR.test(b))return b;const t=normalize(title);const hit=known.filter(Boolean).sort((a,b)=>b.length-a.length).find(x=>t.startsWith(normalize(x)+' ')||t===normalize(x));if(hit)return hit;return clean(title).replace(/^\([^)]*\)\s*/,'').split(/\s+/)[0]||''}
export function parseCanonicalProduct(input:{title:any;brand?:any;size?:any;caseQty?:any},knownBrands:string[]=[],knowledge:ParserKnowledge={}):CanonicalProduct{
 const aliases=knowledge.brandAliases||[],rawBrand=clean(input.brand),alias=aliases.find((x:any)=>normalize(x.alias)===normalize(rawBrand)),title=clean(input.title),brand=inferBrand(title,alias?.canonical_brand||rawBrand,[...knownBrands,...aliases.map((x:any)=>x.canonical_brand)])
 const structuredSize=unitSize(input.size,''),titleSize=unitSize('',title),us=structuredSize||titleSize,qty=Math.max(1,Number(input.caseQty)||1)
 let body=normalize(title),nb=normalize(brand);if(nb&&body.startsWith(nb+' '))body=body.slice(nb.length+1)
 body=body.replace(/\b\d+(?:\.\d+)?\s*(?:kg|g|ml|l|fl\s*oz|oz)\b/g,' ').replace(/\b\d+\s*x\s*\d+(?:\.\d+)?\b/g,' ').replace(/\b(?:case|box|pack)\s*(?:of)?\s*\d+\b/g,' ').replace(/\b(?:case|box|pack|bags?|cans?|bottles?|tubs?|bars?|multipacks?)\b/g,' ').replace(/\b(?:usa import|china|canada|aus|bbd)\b/g,' ').replace(/\b\d+ct\b/g,' ')
 for(const x of knowledge.noiseTerms||[]){const z=normalize(x.term);if(z)body=(' '+body+' ').split(' '+z+' ').join(' ').trim()}body=body.replace(/\s+/g,' ').trim()
 const generic=new Set(['candy','gummy','soda','drink','energy','flavour','flavor','chewy','peg','theatre','original'])
 const parts=body.split(' ').filter(Boolean),meaningful=parts.filter(x=>!generic.has(x))
 const family=meaningful.slice(0,Math.min(2,meaningful.length)).join(' ')||parts.slice(0,2).join(' ')
 let variant=meaningful.slice(Math.min(2,meaningful.length)).join(' ')
 const va=(knowledge.variantAliases||[]).filter((x:any)=>!x.brand||normalize(x.brand)===normalize(brand)).filter((x:any)=>normalize(body).includes(normalize(x.alias))).sort((a:any,b:any)=>normalize(b.alias).length-normalize(a.alias).length)[0]
 if(va)variant=va.canonical_variant
 const sizeConflict=structuredSize&&titleSize&&!sizesCompatible(structuredSize,titleSize,title)?structuredSize+' vs '+titleSize:''
 return {brand,family,variant,unitSize:us,caseQty:qty,sizeConflict,canonicalKey:[normalize(brand),normalize(family),normalize(variant),us].filter(Boolean).join('|')}
}
export function canonicalMatch(a:CanonicalProduct,b:CanonicalProduct){
 if(a.sizeConflict)return {match:false,score:0,reason:'Supplier size conflict: '+a.sizeConflict}
 if(b.sizeConflict)return {match:false,score:0,reason:'Master size conflict: '+b.sizeConflict}
 if(a.unitSize&&b.unitSize&&a.unitSize!==b.unitSize)return {match:false,score:0,reason:'Unit size conflict'}
 if(normalize(a.brand)!==normalize(b.brand))return {match:false,score:0,reason:'Brand conflict'}
 if(a.variant&&b.variant&&normalize(a.variant)!==normalize(b.variant))return {match:false,score:0,reason:'Variant conflict'}
 const fam=normalize(a.family)===normalize(b.family),variant=!a.variant||!b.variant||normalize(a.variant)===normalize(b.variant),size=!a.unitSize||!b.unitSize||a.unitSize===b.unitSize
 const score=25+(fam?30:0)+(variant?25:0)+(size?20:0)
 return {match:score>=75,score,reason:[fam?'family':'',variant?'variant':'',size?'unit size':''].filter(Boolean).join(' + ')}
}