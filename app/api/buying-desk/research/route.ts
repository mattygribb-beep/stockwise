import {NextResponse} from 'next/server'
import {getSql} from '../../../../lib/db'
import {loadBuyingPool} from '../../../../lib/buying-pool'
import {fetchPublicObservation,parseAmazonObservation,parseSupplierObservation} from '../../../../lib/public-buying-data'
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=30
export async function POST(req:Request){
 try{
  const {asin,supplier:expectedSupplier,offerId}=await req.json()
  if(!/^[A-Z0-9]{10}$/.test(String(asin||'')))return NextResponse.json({ok:false,error:'Select a valid product in Buying Desk'},{status:400})
  const pool=await loadBuyingPool(),matches=pool.products.filter(x=>x.asin===asin&&(!expectedSupplier||x.supplier===expectedSupplier)&&(!offerId||x.offerId===String(offerId))),c=matches.length===1?matches[0]:null
  if(!c)return NextResponse.json({ok:false,error:'Select an exact verified supplier offer in Buying Desk'},{status:400})
  const sql=getSql(),rows=await sql`SELECT o.product_url FROM supplier_offers o JOIN suppliers s ON s.id=o.supplier_id WHERE o.is_active=true AND s.name=${c.supplier} AND o.supplier_product_id=${c.offerId} LIMIT 1`
  const checkedAt=new Date().toISOString(),amazonUrl=`https://www.amazon.co.uk/dp/${c.asin}`,supplierUrl=rows[0]?.product_url||''
  let safeSupplier=false
  try{const u=new URL(supplierUrl);safeSupplier=c.supplier==='Sweet & Glory'&&u.protocol==='https:'&&u.hostname==='sweetandglory.com'&&u.pathname.startsWith('/brands/')&&!u.username&&!u.password&&!u.port}catch{}
  const [amazon,supplier]=await Promise.all([
   fetchPublicObservation(amazonUrl,html=>parseAmazonObservation(html,c.asin,amazonUrl,checkedAt,c.packQty)),
   safeSupplier?fetchPublicObservation(supplierUrl,html=>parseSupplierObservation(html,c.offerId,supplierUrl,checkedAt)):Promise.resolve({status:'unavailable',url:supplierUrl,checkedAt,note:'Use Sync all for this supplier; no targeted price reader is configured'})
  ])
  return NextResponse.json({ok:true,asin,checkedAt,amazon,supplier},{headers:{'Cache-Control':'no-store'}})
 }catch{return NextResponse.json({ok:false,error:'Public price check failed; previous data retained'},{status:500})}
}
