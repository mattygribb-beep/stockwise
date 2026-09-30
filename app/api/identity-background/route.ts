import {NextResponse} from 'next/server'
import {getSql} from '../../../lib/db'
import {parseCanonicalProduct,canonicalMatch,isNonProductTitle} from '../../../lib/product-parser'
export const runtime='nodejs'; export const dynamic='force-dynamic'
const norm=(v:any)=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()

export async function POST(req:Request){
 try{
  const sql=getSql(), body=await req.json().catch(()=>({}))
  const limit=Math.min(250,Math.max(1,Number(body.limit)||50)), dryRun=body.dryRun!==false
  const ids=await sql`SELECT id,product_name,brand,variant,size,unit_size,ean,asin FROM master_product_identities WHERE status IN ('verified','completed') ORDER BY updated_at DESC`
  const aliases=await sql`SELECT canonical_brand,alias FROM product_brand_aliases`
  const variantAliases=await sql`SELECT brand,canonical_variant,alias FROM product_variant_aliases`
  const noiseTerms=await sql`SELECT term FROM product_noise_terms`
  const offers=await sql`SELECT s.name supplier,o.supplier_product_id,o.product,o.brand,o.size,o.case_qty,o.ean FROM supplier_offers o JOIN suppliers s ON s.id=o.supplier_id LEFT JOIN product_identity_offers l ON l.supplier=s.name AND l.supplier_offer_id=o.supplier_product_id::text WHERE o.is_active=true AND l.supplier_offer_id IS NULL ORDER BY o.last_seen_at DESC LIMIT ${limit}`
  const knowledge={brandAliases:aliases,variantAliases,noiseTerms},brands=[...ids.map((x:any)=>x.brand),...aliases.map((x:any)=>x.canonical_brand)].filter(Boolean)
  const safe:any[]=[],review:any[]=[]
  for(const o of offers){
   if(isNonProductTitle(o.product))continue
   const parsed=parseCanonicalProduct({title:o.product,brand:o.brand,size:o.size,caseQty:o.case_qty},brands,knowledge)
   let candidates:any[]=[]
   for(const id of ids){
    const oe=String(o.ean||'').replace(/\D/g,''),ie=String(id.ean||'').replace(/\D/g,'')
    if(oe&&ie){if(oe===ie)candidates.push({id,score:100,reason:'Exact EAN / UPC'});continue}
    const master=parseCanonicalProduct({title:id.product_name,brand:id.brand,size:id.unit_size||id.size,caseQty:1},brands,knowledge)
    const m=canonicalMatch(parsed,master)
    if(m.match)candidates.push({id,score:m.score,reason:m.reason})
   }
   candidates.sort((a,b)=>b.score-a.score)
   const best=candidates[0],runner=candidates[1]
   if(!best)continue
   // V1 is intentionally conservative: auto-link only exact barcodes or unique 100-point canonical matches.
   const unique=!runner||best.score-runner.score>=10
   const exactBarcode=best.reason==='Exact EAN / UPC'
   if((exactBarcode||best.score===100)&&unique&&!parsed.sizeConflict){
    safe.push({offer:o,identity:best.id,score:best.score,reason:best.reason})
   }else if(best.score>=75)review.push({offer:o,identity:best.id,score:best.score,reason:best.reason})
  }
  if(!dryRun){
   for(const x of safe){
    await sql`INSERT INTO product_identity_offers(identity_id,supplier,supplier_offer_id,match_score,match_status,match_reason) VALUES(${x.identity.id},${x.offer.supplier},${String(x.offer.supplier_product_id)},${x.score},'confirmed',${'Background auto-match: '+x.reason}) ON CONFLICT(supplier,supplier_offer_id) DO NOTHING`
    await sql`INSERT INTO identity_match_decisions(identity_id,supplier,supplier_offer_id,candidate_identity_id,score,decision,reason) VALUES(${x.identity.id},${x.offer.supplier},${String(x.offer.supplier_product_id)},${x.identity.id},${x.score},'auto_confirm',${'Background auto-match: '+x.reason})`
   }
  }
  return NextResponse.json({ok:true,dryRun,scanned:offers.length,autoMatched:safe.length,needsReview:review.length,matches:safe.map(x=>({supplier:x.offer.supplier,supplierOfferId:x.offer.supplier_product_id,product:x.offer.product,identityId:x.identity.id,masterProduct:x.identity.product_name,score:x.score,reason:x.reason}))})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Background identity match failed'},{status:500})}
}
