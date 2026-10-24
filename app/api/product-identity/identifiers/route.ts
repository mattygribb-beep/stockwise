import {NextResponse} from 'next/server'
import {getSql} from '../../../../lib/db'
import {identifierEdit} from '../../../../lib/catalogue-controls'
export const runtime='nodejs';export const dynamic='force-dynamic'
export async function PATCH(req:Request){
 try{
  const edit=identifierEdit(await req.json())
  if(!edit.ok)return NextResponse.json(edit,{status:400})
  const {supplier,supplierOfferId,ean,asin}=edit,sql=getSql()
  // One statement: preserve the other identifier, save the override, and review only
  // this supplier link if its identity changed. Never rewrite a shared master product.
  const rows=await sql`WITH current_offer AS (
   SELECT s.name supplier,o.supplier_product_id::text supplier_offer_id,o.product,o.brand,o.size,o.country_origin,
    COALESCE(NULLIF(m.ean,''),NULLIF(pi.ean,''),o.ean,'') effective_ean,
    COALESCE(NULLIF(m.asin,''),pi.asin,'') effective_asin,
    pi.status previous_status,pi.ean_confidence,pi.asin_confidence
   FROM supplier_offers o JOIN suppliers s ON s.id=o.supplier_id
   LEFT JOIN product_identities pi ON pi.supplier=s.name AND pi.supplier_offer_id=o.supplier_product_id::text
   LEFT JOIN product_identity_offers l ON l.supplier=s.name AND l.supplier_offer_id=o.supplier_product_id::text AND l.match_status IN ('confirmed','verified')
   LEFT JOIN master_product_identities m ON m.id=l.identity_id
   WHERE s.name=${supplier} AND o.supplier_product_id::text=${supplierOfferId} AND o.is_active=true
  ), compared AS (
   SELECT *,(${ean}::text IS NOT NULL AND ltrim(${ean}::text,'0')<>ltrim(regexp_replace(effective_ean,'[^0-9]','','g'),'0')) ean_changed,
    (${asin}::text IS NOT NULL AND ${asin}::text<>upper(effective_asin)) asin_changed FROM current_offer
  ), written AS (
   INSERT INTO product_identities(supplier,supplier_offer_id,product_name,brand,size,country_origin,ean,asin,status,ean_confidence,asin_confidence)
   SELECT supplier,supplier_offer_id,product,COALESCE(brand,''),COALESCE(size,''),COALESCE(country_origin,''),COALESCE(${ean}::text,effective_ean),COALESCE(${asin}::text,effective_asin),
    CASE WHEN ean_changed OR asin_changed THEN 'review' ELSE COALESCE(previous_status,'review') END,
    CASE WHEN ean_changed THEN 'MANUAL' ELSE ean_confidence END,CASE WHEN asin_changed THEN 'MANUAL' ELSE asin_confidence END FROM compared
   ON CONFLICT(supplier,supplier_offer_id) DO UPDATE SET ean=EXCLUDED.ean,asin=EXCLUDED.asin,status=EXCLUDED.status,ean_confidence=EXCLUDED.ean_confidence,asin_confidence=EXCLUDED.asin_confidence,updated_at=now()
   RETURNING *
  ), reviewed AS (
   UPDATE product_identity_offers l SET match_status='review',match_reason='Identifiers edited; exact product and pack need review',updated_at=now()
   FROM compared p,written w WHERE l.supplier=p.supplier AND l.supplier_offer_id=p.supplier_offer_id
    AND w.supplier=p.supplier AND w.supplier_offer_id=p.supplier_offer_id AND (p.ean_changed OR p.asin_changed) AND l.match_status IN ('confirmed','verified') RETURNING l.identity_id
  ) SELECT written.*,(SELECT count(*) FROM reviewed)::int links_reviewed FROM written`
  if(!rows.length)return NextResponse.json({ok:false,error:'This supplier product is no longer active. Refresh the catalogue.'},{status:404})
  return NextResponse.json({ok:true,identity:rows[0]})
 }catch{return NextResponse.json({ok:false,error:'Identifiers could not be saved. Your previous saved data is unchanged.'},{status:500})}
}
