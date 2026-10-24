import {NextResponse} from 'next/server'
import {getSql} from '../../../../lib/db'
import {BUYING_COHORT} from '../../../../lib/buying-cohort'
import {fetchPublicObservation,parseAmazonObservation,parseSupplierObservation} from '../../../../lib/public-buying-data'
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=30
export async function POST(req:Request){
 try{
  const {asin}=await req.json(),c=BUYING_COHORT.find(x=>x.asin===asin)
  if(!c)return NextResponse.json({ok:false,error:'Select a product in Buying Desk'},{status:400})
  const sql=getSql(),rows=await sql`SELECT o.product_url FROM supplier_offers o JOIN suppliers s ON s.id=o.supplier_id WHERE o.is_active=true AND s.name=${c.supplier} AND o.supplier_product_id=${c.offerId} LIMIT 1`
  const checkedAt=new Date().toISOString(),amazonUrl=`https://www.amazon.co.uk/dp/${c.asin}`,supplierUrl=rows[0]?.product_url||''
  let safeSupplier=false
  try{const u=new URL(supplierUrl);safeSupplier=c.supplier==='Sweet & Glory'&&u.protocol==='https:'&&u.hostname==='sweetandglory.com'&&u.pathname.startsWith('/brands/')&&!u.username&&!u.password&&!u.port}catch{}
  const [amazon,supplier]=await Promise.all([
   fetchPublicObservation(amazonUrl,html=>parseAmazonObservation(html,c.asin,amazonUrl,checkedAt)),
   safeSupplier?fetchPublicObservation(supplierUrl,html=>parseSupplierObservation(html,c.offerId,supplierUrl,checkedAt)):Promise.resolve({status:'unavailable',url:supplierUrl,checkedAt,note:'Use Sync all for this supplier; no targeted price reader is configured'})
  ])
  return NextResponse.json({ok:true,asin,checkedAt,amazon,supplier},{headers:{'Cache-Control':'no-store'}})
 }catch{return NextResponse.json({ok:false,error:'Public price check failed; previous data retained'},{status:500})}
}
