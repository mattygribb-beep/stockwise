import {NextResponse} from 'next/server'
import {getSql} from '../../../lib/db'
import {parseCanonicalProduct,canonicalMatch,isNonProductTitle} from '../../../lib/product-parser'
export const runtime='nodejs';export const dynamic='force-dynamic'
export async function GET(){
 try{
  const sql=getSql()
  const amazon=await sql`SELECT id,asin,title,observed_price,upc,gtin FROM amazon_catalogue_candidates WHERE match_status='unmatched' ORDER BY id`
  const offers=await sql`SELECT o.id,o.supplier_product_id,o.product,o.brand,o.size,o.case_qty,o.case_price,o.unit_cost,o.ean,s.name supplier FROM supplier_offers o JOIN suppliers s ON s.id=o.supplier_id WHERE o.is_active=true`
  const masters=await sql`SELECT brand FROM master_product_identities WHERE coalesce(brand,'')<>''`
  const ba=await sql`SELECT canonical_brand,alias FROM product_brand_aliases`,va=await sql`SELECT brand,canonical_variant,alias FROM product_variant_aliases`,nt=await sql`SELECT term FROM product_noise_terms`
  const brands=[...new Set([...masters.map((x:any)=>x.brand),...ba.map((x:any)=>x.canonical_brand)].filter(Boolean))]
  const knowledge={brandAliases:ba,variantAliases:va,noiseTerms:nt};const matches:any[]=[]
  const parsedOffers=offers.filter((o:any)=>!isNonProductTitle(o.product)).map((o:any)=>({offer:o,parsed:parseCanonicalProduct({title:o.product,brand:o.brand,size:o.size,caseQty:o.case_qty},brands,knowledge)}))
  for(const a of amazon){
   if(isNonProductTitle(a.title))continue
   const ap=parseCanonicalProduct({title:a.title,caseQty:1},brands,knowledge);let best:any=null,second:any=null
   for(const po of parsedOffers){
    const m=canonicalMatch(ap,po.parsed);if(!m.match)continue
    const candidate={score:m.score,reason:m.reason,offer:po.offer,amazonParsed:ap,supplierParsed:po.parsed}
    if(!best||candidate.score>best.score){second=best;best=candidate}else if(!second||candidate.score>second.score)second=candidate
   }
   if(best){const margin=best.score-(second?.score||0);matches.push({asin:a.asin,title:a.title,amazonPrice:a.observed_price,score:best.score,margin,band:best.score>=95&&margin>=10?'STRONG':'REVIEW',reason:best.reason,supplier:best.offer.supplier,supplierOfferId:best.offer.supplier_product_id,supplierProduct:best.offer.product,caseQty:best.offer.case_qty,casePrice:best.offer.case_price,unitCost:best.offer.unit_cost,amazonParsed:best.amazonParsed,supplierParsed:best.supplierParsed})}
  }
  matches.sort((a,b)=>b.score-a.score||b.margin-a.margin)
  return NextResponse.json({ok:true,amazonChecked:amazon.length,supplierOffers:offers.length,strong:matches.filter(x=>x.band==='STRONG').length,review:matches.filter(x=>x.band==='REVIEW').length,noCandidate:amazon.length-matches.length,matches})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Unable to match catalogue'},{status:500})}
}
