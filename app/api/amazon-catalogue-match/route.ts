import {NextResponse} from 'next/server'
import {getSql} from '../../../lib/db'
import {parseCanonicalProduct,canonicalMatch,isNonProductTitle,normalize} from '../../../lib/product-parser'
export const runtime='nodejs';export const dynamic='force-dynamic'
const money=(v:any)=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:null}
const overlap=(a:string,b:string)=>{const aw=[...new Set(normalize(a).split(' ').filter((w:string)=>w.length>=4))],bt=' '+normalize(b)+' ';return aw.filter(w=>bt.includes(' '+w+' ')).length}
const identityKey=(p:any)=>[normalize(p.brand),normalize(p.family),normalize(p.variant),p.unitSize||''].join('|')
export async function GET(){
 try{
  const sql=getSql()
  const amazon=await sql`SELECT id,asin,title,observed_price,ean,upc,gtin FROM amazon_catalogue_candidates WHERE match_status='unmatched' ORDER BY id`
  const offers=await sql`SELECT o.id,o.supplier_product_id,o.product,o.brand,o.size,o.case_qty,o.case_price,o.unit_cost,o.ean,s.name supplier FROM supplier_offers o JOIN suppliers s ON s.id=o.supplier_id WHERE o.is_active=true`
  const masters=await sql`SELECT brand FROM master_product_identities WHERE coalesce(brand,'')<>''`
  const ba=await sql`SELECT canonical_brand,alias FROM product_brand_aliases`,va=await sql`SELECT brand,canonical_variant,alias FROM product_variant_aliases`,nt=await sql`SELECT term FROM product_noise_terms`
  const supplierBrands=offers.map((x:any)=>x.brand).filter(Boolean)
  const brands=[...new Set([...masters.map((x:any)=>x.brand),...ba.map((x:any)=>x.canonical_brand),...supplierBrands].filter(Boolean))]
  const knowledge={brandAliases:ba,variantAliases:va,noiseTerms:nt};const matches:any[]=[];const diagnostics:any[]=[]
  const parsedOffers=offers.filter((o:any)=>!isNonProductTitle(o.product)).map((o:any)=>({offer:o,parsed:parseCanonicalProduct({title:o.product,brand:o.brand,size:o.size,caseQty:o.case_qty},brands,knowledge)}))
  for(const a of amazon){
   if(isNonProductTitle(a.title))continue
   const ap=parseCanonicalProduct({title:a.title,caseQty:1},brands,knowledge);const candidates:any[]=[]
   for(const po of parsedOffers){const m=canonicalMatch(ap,po.parsed);if(m.match)candidates.push({score:m.score,reason:m.reason,offer:po.offer,amazonParsed:ap,supplierParsed:po.parsed,identityKey:identityKey(po.parsed)})}
   candidates.sort((x,y)=>y.score-x.score)
   const best=candidates[0]||null
   if(best){
    const sameIdentity=candidates.filter(x=>x.identityKey===best.identityKey)
    const competingIdentities=candidates.filter(x=>x.identityKey!==best.identityKey)
    const second=competingIdentities[0]||null
    const confidenceGap=best.score-(second?.score||0),amazonPack=Math.max(1,Number(best.amazonParsed.consumerPackQty)||1),supplierCase=Math.max(1,Number(best.offer.case_qty)||Number(best.supplierParsed.caseQty)||1)
    const sellablePacks=Math.floor(supplierCase/amazonPack),remainderUnits=supplierCase%amazonPack,casePrice=money(best.offer.case_price),storedUnitCost=money(best.offer.unit_cost),physicalUnitCost=casePrice?casePrice/supplierCase:storedUnitCost
    const amazonPackCost=physicalUnitCost?physicalUnitCost*amazonPack:null,amazonPrice=money(a.observed_price),preFeeSpread=amazonPrice&&amazonPackCost!=null?amazonPrice-amazonPackCost:null
    const grossProductROI=amazonPackCost&&preFeeSpread!=null?(preFeeSpread/amazonPackCost)*100:null,grossProductMargin=amazonPrice&&preFeeSpread!=null?(preFeeSpread/amazonPrice)*100:null
    const coreIdentity=!!best.amazonParsed.brand&&!!best.supplierParsed.brand&&!!best.amazonParsed.family&&!!best.supplierParsed.family
    const variantsAgree=(!!best.amazonParsed.variant&&!!best.supplierParsed.variant)||(!best.amazonParsed.variant&&!best.supplierParsed.variant)
    const sizesAgree=!!best.amazonParsed.unitSize&&!!best.supplierParsed.unitSize
    const identityComplete=coreIdentity&&variantsAgree&&sizesAgree
    const matchBand=best.score>=95&&confidenceGap>=10&&identityComplete?'STRONG':'REVIEW'
    let commercialDecision='NEEDS_DATA',commercialReason='Supplier cost or Amazon price missing'
    if(sellablePacks<1){commercialDecision='REJECT';commercialReason='Supplier case cannot make one complete Amazon sell pack'}else if(amazonPackCost!=null&&amazonPrice!=null){if(preFeeSpread!<=0){commercialDecision='REJECT';commercialReason='Product cost is already at or above Amazon sale price before fees'}else if(grossProductROI!<20){commercialDecision='REJECT';commercialReason='Less than 20% product ROI before Amazon fees'}else if(grossProductROI!<50){commercialDecision='MARGINAL';commercialReason='20-50% product ROI before Amazon fees; fees likely decide it'}else{commercialDecision='ANALYSE';commercialReason='Positive product-cost headroom; run full Amazon fee/ROI analysis'}}
    const supplierOptions=sameIdentity.map(x=>({supplier:x.offer.supplier,supplierOfferId:x.offer.supplier_product_id,supplierProduct:x.offer.product,supplierEan:x.offer.ean||null,caseQty:x.offer.case_qty,casePrice:x.offer.case_price,unitCost:x.offer.unit_cost})).sort((x:any,y:any)=>(money(x.unitCost)||Infinity)-(money(y.unitCost)||Infinity))
    matches.push({asin:a.asin,title:a.title,amazonEan:a.ean||a.upc||a.gtin||null,amazonPrice:a.observed_price,match:{score:best.score,confidenceGap,band:matchBand,reason:best.reason,matchingSupplierOffers:sameIdentity.length,competingProductIdentities:competingIdentities.length},commercial:{decision:commercialDecision,reason:commercialReason},supplier:best.offer.supplier,supplierOfferId:best.offer.supplier_product_id,supplierProduct:best.offer.product,supplierEan:best.offer.ean||null,supplierOptions,caseQty:supplierCase,casePrice:best.offer.case_price,unitCost:best.offer.unit_cost,packConversion:{amazonPackQty:amazonPack,supplierCaseQty:supplierCase,sellableAmazonPacksPerCase:sellablePacks,remainderPhysicalUnits:remainderUnits,exactCaseConversion:remainderUnits===0},economics:{physicalUnitCost,amazonPackProductCost:amazonPackCost,amazonObservedPrice:amazonPrice,preAmazonFeeSpread:preFeeSpread,grossProductROI,grossProductMargin,costKnown:physicalUnitCost!=null,feesIncluded:false},amazonParsed:best.amazonParsed,supplierParsed:best.supplierParsed})
   }else{
    const near=parsedOffers.map(po=>({po,n:overlap(a.title,po.offer.product)})).filter(x=>x.n>=3).sort((x,y)=>y.n-x.n)[0]
    if(near){const rejected=canonicalMatch(ap,near.po.parsed);diagnostics.push({asin:a.asin,title:a.title,amazonEan:a.ean||a.upc||a.gtin||null,overlapWords:near.n,rejectionReason:rejected.reason,supplier:near.po.offer.supplier,supplierOfferId:near.po.offer.supplier_product_id,supplierProduct:near.po.offer.product,supplierEan:near.po.offer.ean||null,amazonParsed:ap,supplierParsed:near.po.parsed})}
   }
  }
  const order:any={ANALYSE:0,MARGINAL:1,NEEDS_DATA:2,REJECT:3};matches.sort((a,b)=>(a.match.band===b.match.band?0:a.match.band==='STRONG'?-1:1)||(order[a.commercial.decision]-order[b.commercial.decision])||b.match.score-a.match.score||b.match.confidenceGap-a.match.confidenceGap)
  const decisions=(name:string)=>matches.filter(x=>x.commercial.decision===name).length
  const rejectionBuckets=diagnostics.reduce((acc:any,x:any)=>{acc[x.rejectionReason]=(acc[x.rejectionReason]||0)+1;return acc},{})
  return NextResponse.json({ok:true,amazonChecked:amazon.length,supplierOffers:offers.length,strong:matches.filter(x=>x.match.band==='STRONG').length,review:matches.filter(x=>x.match.band==='REVIEW').length,noCandidate:amazon.length-matches.length,commercialSummary:{analyse:decisions('ANALYSE'),marginal:decisions('MARGINAL'),needsData:decisions('NEEDS_DATA'),reject:decisions('REJECT')},highOverlapDiagnostics:{count:diagnostics.length,rejectionBuckets,items:diagnostics},matches})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Unable to match catalogue'},{status:500})}
}
