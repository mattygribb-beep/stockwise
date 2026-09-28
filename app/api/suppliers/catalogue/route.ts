import { NextResponse } from 'next/server'
import { getSql } from '../../../../lib/db'

export const runtime='nodejs'
export const dynamic='force-dynamic'

export async function GET(req:Request){
 try{
  const url=new URL(req.url), slug=url.searchParams.get('supplier')||'stateside', sql=getSql()
  const rows=await sql`SELECT s.name AS supplier,o.supplier_product_id,o.supplier_sku,o.product,o.raw_title,o.brand,o.size,COALESCE(NULLIF(mpi.country_origin,''),NULLIF(pi.country_origin,''),o.country_origin) AS country_origin,o.case_qty,o.case_price,o.unit_cost,
    COALESCE(NULLIF(pi.ean,''),o.ean) AS ean, COALESCE(NULLIF(mpi.asin,''),pi.asin) AS asin, COALESCE(pio.match_status,pi.status) AS identity_status, pi.ean_confidence, pi.asin_confidence,
    o.stock_qty,o.expiry,o.status,o.product_url,o.source,o.source_page,o.tags,o.last_seen_at
    FROM supplier_offers o JOIN suppliers s ON s.id=o.supplier_id
    LEFT JOIN product_identities pi ON pi.supplier=s.name AND pi.supplier_offer_id=o.supplier_product_id::text
    LEFT JOIN product_identity_offers pio ON pio.supplier=s.name AND pio.supplier_offer_id=o.supplier_product_id::text
    LEFT JOIN master_product_identities mpi ON mpi.id=pio.identity_id
    WHERE s.slug=${slug} AND o.is_active=true ORDER BY o.product`
  const last=await sql`SELECT r.completed_at,r.offer_count FROM supplier_sync_runs r JOIN suppliers s ON s.id=r.supplier_id WHERE s.slug=${slug} AND r.status='success' ORDER BY r.completed_at DESC LIMIT 1`
  const offers=rows.map((x:any)=>{const rawCase=Number(x.case_price),qty=Number(x.case_qty)||1,isStateside=slug==='stateside',effectiveCase=isStateside?Math.round(rawCase*1.2*100)/100:rawCase;return {id:slug+'-'+x.supplier_product_id,supplier:x.supplier,supplierProductId:x.supplier_product_id,supplierSku:x.supplier_sku,product:x.product,rawTitle:x.raw_title,brand:x.brand,size:x.size,countryOrigin:x.country_origin||'',caseQty:qty,casePrice:rawCase,unitCost:Number(x.unit_cost),priceBasis:isStateside?'EX VAT':'SUPPLIER PRICE',effectiveCasePrice:effectiveCase,effectiveUnitCost:effectiveCase/qty,ean:x.ean||'',asin:x.asin||'',identityStatus:x.identity_status||'',masterIdentityId:x.identity_id||null,eanConfidence:x.ean_confidence||'',asinConfidence:x.asin_confidence||'',stockQty:x.stock_qty,expiry:x.expiry,status:x.status,url:x.product_url,source:x.source,sourcePage:x.source_page,tags:x.tags||[],checked:x.last_seen_at}})
  return NextResponse.json({ok:true,supplier:slug,offers,lastSync:last[0]?.completed_at||null,offerCount:last[0]?.offer_count||offers.length})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Unable to load saved catalogue'},{status:500})}
}
