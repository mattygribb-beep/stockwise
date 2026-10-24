import {NextResponse} from 'next/server'
import {getSql} from '../../../../lib/db'
import {CATALOGUE_SLUGS} from '../../../../lib/suppliers'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(req?:Request){
 const params=new URL(req?.url||'https://source-stack.test/api').searchParams
 const limit=Number(params.get('limit')||100),offset=Number(params.get('offset')||0)
 if(!Number.isInteger(limit)||limit<1||limit>10000||!Number.isInteger(offset)||offset<0)return NextResponse.json({ok:false,error:'Invalid catalogue page'},{status:400})
 try{
  const sql=getSql()
  // Identity work needs names and identifiers, not prices, tags or raw supplier payloads.
  // Preserve the same manual/master override precedence as the supplier catalogue endpoint.
  const rows=await sql`SELECT count(*) OVER()::int total,s.slug,s.name supplier,o.supplier_product_id,o.product,o.brand,o.size,
   COALESCE(NULLIF(m.country_origin,''),NULLIF(pi.country_origin,''),o.country_origin) country_origin,
   COALESCE(NULLIF(m.ean,''),NULLIF(pi.ean,''),o.ean) ean,
   COALESCE(NULLIF(m.asin,''),pi.asin) asin
   FROM supplier_offers o JOIN suppliers s ON s.id=o.supplier_id
   LEFT JOIN product_identities pi ON pi.supplier=s.name AND pi.supplier_offer_id=o.supplier_product_id::text
   LEFT JOIN product_identity_offers links ON links.supplier=s.name AND links.supplier_offer_id=o.supplier_product_id::text AND links.match_status IN ('confirmed','verified')
   LEFT JOIN master_product_identities m ON m.id=links.identity_id
   WHERE o.is_active=true AND s.slug=ANY(${CATALOGUE_SLUGS}::text[])
   ORDER BY array_position(${CATALOGUE_SLUGS}::text[],s.slug),o.product,o.id LIMIT ${limit} OFFSET ${offset}`
  const offers=rows.map((x:any)=>({id:x.slug+'-'+x.supplier_product_id,supplier:x.supplier,supplierProductId:x.supplier_product_id,product:x.product,brand:x.brand||'',size:x.size||'',countryOrigin:x.country_origin||'',ean:x.ean||'',asin:x.asin||'',identity:x.ean&&x.ean!=='NEEDS MATCH'?'review':'unmatched'}))
  const count=Number(rows[0]?.total??offers.length),nextOffset=offset+offers.length
  return NextResponse.json({ok:true,offers,count,hasMore:nextOffset<count,nextOffset},{headers:{'Cache-Control':'no-store'}})
 }catch{return NextResponse.json({ok:false,error:'Unable to load identity products. Retry loading the catalogue.'},{status:500})}
}
