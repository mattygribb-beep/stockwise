import {NextResponse} from 'next/server'
import {getSql} from '../../../lib/db'

export const runtime='nodejs'
export const dynamic='force-dynamic'

export async function GET(){
 try{
  const sql=getSql()
  const rows=await sql`SELECT supplier,supplier_offer_id,product_name,brand,size,country_origin,ean,asin,status,ean_confidence,asin_confidence,updated_at FROM product_identities ORDER BY updated_at DESC`
  return NextResponse.json({ok:true,identities:rows})
 }catch(e:any){
  return NextResponse.json({ok:false,error:e?.message||'Unable to load identities'},{status:500})
 }
}

export async function POST(req:Request){
 try{
  const b=await req.json(),sql=getSql()
  if(!b.supplier||!b.supplierOfferId)return NextResponse.json({ok:false,error:'Supplier and offer ID are required'},{status:400})

  const rows=await sql`
   INSERT INTO product_identities
    (supplier,supplier_offer_id,product_name,brand,size,country_origin,ean,asin,status,ean_confidence,asin_confidence)
   VALUES
    (${b.supplier},${String(b.supplierOfferId)},${b.product||''},${b.brand||''},${b.size||''},${b.countryOrigin||''},${b.ean||''},${b.asin||''},${b.status||'review'},${b.eanConfidence||null},${b.asinConfidence||null})
   ON CONFLICT (supplier,supplier_offer_id) DO UPDATE SET
    product_name=CASE WHEN coalesce(trim(EXCLUDED.product_name),'')<>'' THEN EXCLUDED.product_name ELSE product_identities.product_name END,
    brand=CASE WHEN coalesce(trim(EXCLUDED.brand),'')<>'' THEN EXCLUDED.brand ELSE product_identities.brand END,
    size=CASE WHEN coalesce(trim(EXCLUDED.size),'')<>'' THEN EXCLUDED.size ELSE product_identities.size END,
    country_origin=CASE WHEN coalesce(trim(EXCLUDED.country_origin),'')<>'' THEN EXCLUDED.country_origin ELSE product_identities.country_origin END,
    ean=CASE WHEN coalesce(trim(EXCLUDED.ean),'')<>'' THEN EXCLUDED.ean ELSE product_identities.ean END,
    asin=CASE WHEN coalesce(trim(EXCLUDED.asin),'')<>'' THEN EXCLUDED.asin ELSE product_identities.asin END,
    status=CASE WHEN coalesce(trim(EXCLUDED.status),'')<>'' THEN EXCLUDED.status ELSE product_identities.status END,
    ean_confidence=COALESCE(EXCLUDED.ean_confidence,product_identities.ean_confidence),
    asin_confidence=COALESCE(EXCLUDED.asin_confidence,product_identities.asin_confidence),
    updated_at=now()
   RETURNING *`
  return NextResponse.json({ok:true,identity:rows[0]})
 }catch(e:any){
  return NextResponse.json({ok:false,error:e?.message||'Unable to save identity'},{status:500})
 }
}
