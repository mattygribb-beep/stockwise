import {NextResponse} from 'next/server'
import {getSql} from '../../../lib/db'
import {parseCanonicalProduct,canonicalMatch,isNonProductTitle} from '../../../lib/product-parser'
export const runtime='nodejs';export const dynamic='force-dynamic'
const money=(v:any)=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:null}
export async function GET(){
 try{
  const sql=getSql()
  const amazon=await sql`SELECT id,asin,title,observed_price,upc,gtin FROM amazon_catalogue_candidates WHERE match_status='unmatched' ORDER BY id`
  const offers=await sql`SELECT o.id,o.supplier_product_id,o.product,o.brand,o.size,o.case_qty,o.case_price,o.unit_cost,o.ean,s.name supplier FROM supplier_offers o JOIN suppliers s ON s.id=o.supplier_id WHERE o.is_active=true`
  const masters=await sql`SELECT brand FROM master_product_identities WHERE coalesce(brand,'')<>''`
  const ba=await sql`SELECT canonical_brand,alias FROM product_brand_aliases`,va=await sql`SELECT brand,canonical_variant,alias FROM product_variant_aliases`,nt=await sql`SELECT term FROM product_noise_terms`
  // Supplier catalogue brands are evidence too. Using them as known-title brands lets
  // Amazon titles such as "Taco Bell Diablo Sauce 213g" infer "Taco Bell" instead
  // of the unsafe one-word fallback "Taco". This only improves brand inference;
  // canonicalMatch still requires brand + family + variant + unit-size agreement.
  const supplierBrands=offers.map((x:any)=>x.brand).filter(Boolean)
  const brands=[...new Set([...masters.map((x:any)=>x.brand),...ba.map((x:any)=>x.canonical_brand),...supplierBrands].filter(Boolean))]
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
   if(best){
    const confidenceGap=best.score-(second?.score||0),amazonPack=Math.max(1,Number(best.amazonParsed.consumerPackQty)||1),supplierCase=Math.max(1,Number(best.offer.case_qty)||Number(best.supplierParsed.caseQty)||1)
    const sellablePacks=Math.floor(supplierCase/amazonPack),remainderUnits=supplierCase%amazonPack,casePrice=money(best.offer.case_price),storedUnitCost=money(best.offer.unit_cost),physicalUnitCost=casePrice?casePrice/supplierCase:storedUnitCost
    const amazonPackCost=physicalUnitCost?physicalUnitCost*amazonPack:null,amazonPrice=money(a.observed_price),preFeeSpread=amazonPrice&&amazonPackCost!=null?amazonPrice-amazonPackCost:null
    const grossProductROI=amazonPackCost&&preFeeSpread!=null?(preFeeSpread/amazonPackCost)*100:null,grossProductMargin=amazonPrice&&preFeeSpread!=null?(preFeeSpread/amazonPrice)*100:null
    const completeIdentity=!!best.amazonParsed.brand&&!!best.supplierParsed.brand&&!!best.amazonParsed.variant&&!!best.supplierParsed.variant&&!!best.amazonParsed.unitSize&&!!best.supplierParsed.unitSize
    const matchBand=best.score>=95&&confidenceGap>=10&&completeIdentity?'STRONG':'REVIEW'
    let commercialDecision='NEEDS_DATA',commercialReason='Supplier cost or Amazon price missing'
    if(sellablePacks<1){commercialDecision='REJECT';commercialReason='Supplier case cannot make one complete Amazon sell pack'}
    else if(amazonPackCost!=null&&amazonPrice!=null){
      if(preFeeSpread!<=0){commercialDecision='REJECT';commercialReason='Product cost is already at or above Amazon sale price before fees'}
      else if(grossProductROI!<20){commercialDecision='REJECT';commercialReason='Less than 20% product ROI before Amazon fees'}
      else if(grossProductROI!<50){commercialDecision='MARGINAL';commercialReason='20-50% product ROI before Amazon fees; fees likely decide it'}
      else {commercialDecision='ANALYSE';commercialReason='Positive product-cost headroom; run full Amazon fee/ROI analysis'}
    }
    matches.push({asin:a.asin,title:a.title,amazonPrice:a.observed_price,match:{score:best.score,confidenceGap,band:matchBand,reason:best.reason},commercial:{decision:commercialDecision,reason:commercialReason},supplier:best.offer.supplier,supplierOfferId:best.offer.supplier_product_id,supplierProduct:best.offer.product,caseQty:supplierCase,casePrice:best.offer.case_price,unitCost:best.offer.unit_cost,packConversion:{amazonPackQty:amazonPack,supplierCaseQty:supplierCase,sellableAmazonPacksPerCase:sellablePacks,remainderPhysicalUnits:remainderUnits,exactCaseConversion:remainderUnits===0},economics:{physicalUnitCost,amazonPackProductCost:amazonPackCost,amazonObservedPrice:amazonPrice,preAmazonFeeSpread:preFeeSpread,grossProductROI,grossProductMargin,costKnown:physicalUnitCost!=null,feesIncluded:false},amazonParsed:best.amazonParsed,supplierParsed:best.supplierParsed})
   }
  }
  const order:any={ANALYSE:0,MARGINAL:1,NEEDS_DATA:2,REJECT:3};matches.sort((a,b)=>(a.match.band===b.match.band?0:a.match.band==='STRONG'?-1:1)||(order[a.commercial.decision]-order[b.commercial.decision])||b.match.score-a.match.score||b.match.confidenceGap-a.match.confidenceGap)
  const decisions=(name:string)=>matches.filter(x=>x.commercial.decision===name).length
  return NextResponse.json({ok:true,amazonChecked:amazon.length,supplierOffers:offers.length,strong:matches.filter(x=>x.match.band==='STRONG').length,review:matches.filter(x=>x.match.band==='REVIEW').length,noCandidate:amazon.length-matches.length,commercialSummary:{analyse:decisions('ANALYSE'),marginal:decisions('MARGINAL'),needsData:decisions('NEEDS_DATA'),reject:decisions('REJECT')},matches})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Unable to match catalogue'},{status:500})}
}
