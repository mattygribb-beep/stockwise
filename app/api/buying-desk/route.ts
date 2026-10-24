import {NextResponse} from 'next/server'
import {getSql} from '../../../lib/db'
import {BUYING_COHORT} from '../../../lib/buying-cohort'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(){
 try{
  const sql=getSql(),asins=BUYING_COHORT.map(x=>x.asin),ids=BUYING_COHORT.map(x=>x.offerId)
  const [amazon,offers]=await Promise.all([
   sql`SELECT asin,title,observed_price,amazon_url,match_evidence,last_seen_at FROM amazon_catalogue_candidates WHERE asin=ANY(${asins}) AND match_status<>'hidden'`,
   sql`SELECT o.supplier_product_id,o.product,o.case_qty,o.case_price,o.product_url,o.stock_qty,o.status,o.expiry,o.last_seen_at,s.name supplier FROM supplier_offers o JOIN suppliers s ON s.id=o.supplier_id WHERE o.is_active=true AND o.supplier_product_id=ANY(${ids})`
  ])
  const products=BUYING_COHORT.map(c=>{
   const a=amazon.find((x:any)=>x.asin===c.asin),o=offers.find((x:any)=>x.supplier===c.supplier&&String(x.supplier_product_id)===c.offerId)
   return {...c,title:a?.title||c.asin,available:!!a&&!!o&&o.stock_qty!==0&&!/out[ -]?of[ -]?stock|unavailable|discontinued/i.test(o.status||''),amazon:a?{price:a.observed_price,seenAt:a.last_seen_at,url:a.amazon_url||`https://www.amazon.co.uk/dp/${c.asin}`,identityEvidence:a.match_evidence}:null,offer:o?{product:o.product,caseQty:o.case_qty,casePrice:o.case_price,url:o.product_url,stock:o.stock_qty,status:o.status,expiry:o.expiry,seenAt:o.last_seen_at}:null}
  })
  return NextResponse.json({ok:true,loadedAt:new Date().toISOString(),products},{headers:{'Cache-Control':'no-store'}})
 }catch{return NextResponse.json({ok:false,error:'Unable to load the buying cohort. Retry without making a buying decision.'},{status:500})}
}
