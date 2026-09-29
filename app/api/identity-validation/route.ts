import {NextResponse} from 'next/server'
import {getSql} from '../../../lib/db'
import {parseCanonicalProduct,canonicalMatch,isNonProductTitle} from '../../../lib/product-parser'
export const runtime='nodejs'; export const dynamic='force-dynamic'

const SLUGS=['stateside','sweet-glory','wholesale-sweets','kings-candy']
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n))
export async function GET(req:Request){
 try{
  const url=new URL(req.url),sql=getSql()
  const limit=clamp(Number(url.searchParams.get('limit'))||2000,100,5000)
  const seed=url.searchParams.get('seed')||'stockwise-validation-v1'
  const [ids,brandAliases,variantAliases,noiseTerms,rejected]=await Promise.all([
   sql`SELECT id,product_name,brand,variant,size,unit_size,ean,asin,status FROM master_product_identities`,
   sql`SELECT canonical_brand,alias FROM product_brand_aliases`,
   sql`SELECT brand,canonical_variant,alias FROM product_variant_aliases`,
   sql`SELECT term FROM product_noise_terms`,
   sql`SELECT supplier,supplier_offer_id,candidate_identity_id FROM identity_match_decisions WHERE decision='reject'`
  ])
  const offers=limit<=100
   ? await sql`WITH ranked AS (
      SELECT s.slug,s.name supplier,o.supplier_product_id::text offer_id,o.product,o.brand,o.size,o.case_qty,o.case_price,o.unit_cost,o.ean,o.is_active,
       pio.identity_id,pio.match_status,row_number() over(partition by s.slug order by md5(o.supplier_product_id::text || ${seed})) rn
      FROM supplier_offers o JOIN suppliers s ON s.id=o.supplier_id
      LEFT JOIN product_identity_offers pio ON pio.supplier=s.name AND pio.supplier_offer_id=o.supplier_product_id::text AND pio.match_status='confirmed'
      WHERE o.is_active=true AND s.slug=ANY(${SLUGS})
     ) SELECT * FROM ranked WHERE rn<=25 ORDER BY md5(offer_id || ${seed}) LIMIT ${limit}`
   : await sql`SELECT s.slug,s.name supplier,o.supplier_product_id::text offer_id,o.product,o.brand,o.size,o.case_qty,o.case_price,o.unit_cost,o.ean,o.is_active,
      pio.identity_id,pio.match_status
     FROM supplier_offers o JOIN suppliers s ON s.id=o.supplier_id
     LEFT JOIN product_identity_offers pio ON pio.supplier=s.name AND pio.supplier_offer_id=o.supplier_product_id::text AND pio.match_status='confirmed'
     WHERE o.is_active=true
     ORDER BY md5(s.slug || ':' || o.supplier_product_id::text || ${seed})
     LIMIT ${limit}`
  const knowledge={brandAliases,variantAliases,noiseTerms}
  const brands=[...ids.map((x:any)=>x.brand),...brandAliases.map((x:any)=>x.canonical_brand)].filter(Boolean)
  const rej=new Set(rejected.map((x:any)=>x.supplier+'|'+x.supplier_offer_id+'|'+x.candidate_identity_id))
  const metrics:any={total:offers.length,strong:0,review:0,new:0,conflict:0,nonProduct:0,confirmedMemory:0,knownProductRecallMisses:0,missingBrand:0,missingSize:0,missingEan:0,sizeConflict:0,fallbackBrand:0,knownBrandInferred:0,consumerMultipack:0,packagingWarnings:0}
  const examples:any={strong:[],review:[],conflict:[],nonProduct:[],knownProductRecallMisses:[]}
  const parsed:any[]=[]
  for(const o of offers){
   if(!String(o.brand||'').trim())metrics.missingBrand++
   if(!String(o.size||'').trim())metrics.missingSize++
   if(!String(o.ean||'').trim())metrics.missingEan++
   if(isNonProductTitle(o.product)){metrics.nonProduct++; if(examples.nonProduct.length<20)examples.nonProduct.push({supplier:o.supplier,product:o.product});continue}
   const p=parseCanonicalProduct({title:o.product,brand:o.brand,size:o.size,caseQty:o.case_qty},brands,knowledge)
   if(p.brandSource==='fallback')metrics.fallbackBrand++; if(p.brandSource==='known-title')metrics.knownBrandInferred++; if(p.consumerPackQty>1)metrics.consumerMultipack++; if(p.consumerPackQty>1&&Number(o.case_qty)<=1)metrics.packagingWarnings++;
   if(p.sizeConflict){metrics.sizeConflict++;metrics.conflict++;if(examples.conflict.length<20)examples.conflict.push({supplier:o.supplier,product:o.product,reason:'Size conflict '+p.sizeConflict});continue}
   if(o.identity_id){metrics.confirmedMemory++;parsed.push({o,p});continue}
   let best:any=null, hardConflict=false
   for(const id of ids){
    if(rej.has(o.supplier+'|'+o.offer_id+'|'+id.id))continue
    const q=parseCanonicalProduct({title:id.product_name,brand:id.brand,size:id.unit_size||id.size,caseQty:1},brands,knowledge)
    const m=canonicalMatch(p,q)
    if(!m.match){if(/conflict/i.test(m.reason))hardConflict=true;continue}
    if(!best||m.score>best.score)best={id,score:m.score,reason:m.reason}
   }
   if(best?.score>=95){metrics.strong++;if(examples.strong.length<20)examples.strong.push({supplier:o.supplier,product:o.product,master:best.id.product_name,score:best.score,reason:best.reason})}
   else if(best){metrics.review++;if(examples.review.length<20)examples.review.push({supplier:o.supplier,product:o.product,master:best.id.product_name,score:best.score,reason:best.reason})}
   else if(hardConflict){metrics.conflict++;if(examples.conflict.length<20)examples.conflict.push({supplier:o.supplier,product:o.product,reason:'No safe master match; hard conflict(s) encountered'})}
   else metrics.new++
   if(!o.identity_id){const known=ids.find((id:any)=>{const q=parseCanonicalProduct({title:id.product_name,brand:id.brand,size:id.unit_size||id.size,caseQty:1},brands,knowledge);const m=canonicalMatch(p,q);return m.match&&m.score>=95});if(known){metrics.knownProductRecallMisses++;if(examples.knownProductRecallMisses.length<20)examples.knownProductRecallMisses.push({supplier:o.supplier,product:o.product,expectedMaster:known.product_name,masterId:known.id})}}
   parsed.push({o,p})
  }
  const masterGroups=new Map<any,any[]>()
  for(const {o,p} of parsed){if(o.identity_id){const a=masterGroups.get(o.identity_id)||[];a.push({o,p});masterGroups.set(o.identity_id,a)}}
  let comparableGroups=0,economicsWarnings=0
  for(const g of masterGroups.values()){
   const suppliers=new Set(g.map((x:any)=>x.o.supplier))
   if(suppliers.size>1){comparableGroups++;for(const x of g){if(!(Number(x.o.case_qty)>0)||!(Number(x.o.case_price)>0))economicsWarnings++}}
  }
  const supplierCounts=offers.reduce((a:any,o:any)=>(a[o.supplier]=(a[o.supplier]||0)+1,a),{})
  const traps=[['A&W Root Beer Float Zero Sugar 355ml','A&W Root Beer Float 355ml'],['Dr Pepper Cream Soda 355ml','Dr Pepper Creamy Coconut 355ml'],['IBC Black Cherry 355ml','Kool-Aid Black Cherry 355ml'],['Monster Strawberry Lemonade 473ml','Monster Strawberry Shot 473ml']]
  const regression=traps.map(([a,b])=>{const pa=parseCanonicalProduct({title:a},brands,knowledge),pb=parseCanonicalProduct({title:b},brands,knowledge),m=canonicalMatch(pa,pb);return {a,b,passed:!m.match,score:m.score,reason:m.reason}})
  return NextResponse.json({ok:true,validatorVersion:'identity-validation-v2',seed,requested:limit,metrics:{...metrics,comparableGroups,economicsWarnings},supplierCounts,regression:{passed:regression.every(x=>x.passed),traps:regression},examples,safety:{onlyConfirmedMasterLinks:true,rejectionsApplied:true,nonProductsExcluded:true,packagingNotUsedAsIdentity:true,consumerPackSeparatedFromSupplierCase:true,aliasPhraseBoundaries:true}})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Validation failed'},{status:500})}
}