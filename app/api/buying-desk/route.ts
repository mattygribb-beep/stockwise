import {NextResponse} from 'next/server'
import {getSql} from '../../../lib/db'
import {BUYING_COHORT} from '../../../lib/buying-cohort'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(){
 try{
  const sql=getSql(),asins=BUYING_COHORT.map(x=>x.asin),ids=BUYING_COHORT.map(x=>x.offerId)
  const [amazon,offers,details]=await Promise.all([
   sql`SELECT asin,title,observed_price,amazon_url,match_evidence,ean,upc,gtin,last_seen_at FROM amazon_catalogue_candidates WHERE asin=ANY(${asins}) AND match_status<>'hidden'`,
   sql`SELECT o.supplier_product_id,o.product,o.case_qty,o.case_price,o.product_url,o.stock_qty,o.status,o.expiry,o.last_seen_at,o.ean,s.name supplier FROM supplier_offers o JOIN suppliers s ON s.id=o.supplier_id WHERE o.is_active=true AND o.supplier_product_id=ANY(${ids})`,
   sql`SELECT DISTINCT ON (asin) asin,raw_facts FROM storefront_product_details WHERE asin=ANY(${asins}) ORDER BY asin,last_scanned_at DESC`
  ])
  const products=BUYING_COHORT.map(c=>{
   const a=amazon.find((x:any)=>x.asin===c.asin),o=offers.find((x:any)=>x.supplier===c.supplier&&String(x.supplier_product_id)===c.offerId)
   const code=(v:unknown)=>String(v||'').replace(/\D/g,'').replace(/^0+/,'')
   const exactCode=!!code(o?.ean)&&[a?.ean,a?.upc,a?.gtin].some(v=>code(v)===code(o?.ean))
   const raw=details.find((x:any)=>x.asin===c.asin)?.raw_facts||{},facts=raw.facts||raw
   const weight=String(facts['Item Package Weight']||'').match(/^(\d+(?:\.\d+)?)\s*(kg|kilograms?|g|grams?|pounds?|lb|oz|ounces?)$/i)
   const dims=String(facts['Package Dimensions']||'').match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(cm|centimetres?|inches?)\b/i)
   const unit=weight?.[2].toLowerCase(),grams=weight?Number(weight[1])*(unit?.startsWith('k')?1000:unit?.startsWith('p')||unit==='lb'?453.592:unit?.startsWith('o')?28.3495:1):undefined,scale=dims?.[4].toLowerCase().startsWith('i')?2.54:1
   return {...c,title:a?.title||c.asin,identityConfirmed:!!o&&!!a&&(String(a.match_evidence?.verifiedSupplierProductId||'')===c.offerId||exactCode),packaged:{weightG:grams,lengthCm:dims?Number(dims[1])*scale:undefined,widthCm:dims?Number(dims[2])*scale:undefined,heightCm:dims?Number(dims[3])*scale:undefined},available:!!a&&!!o&&(o.stock_qty===null||Number(o.stock_qty)!==0)&&!/out[ -]?of[ -]?stock|unavailable|discontinued/i.test(o.status||''),amazon:a?{price:a.observed_price,seenAt:a.last_seen_at,url:a.amazon_url||`https://www.amazon.co.uk/dp/${c.asin}`,identityEvidence:a.match_evidence}:null,offer:o?{product:o.product,caseQty:o.case_qty,casePrice:o.case_price,url:o.product_url,stock:o.stock_qty,status:o.status,expiry:o.expiry,seenAt:o.last_seen_at,vatBasis:c.supplier==='Sweet & Glory'?'ex':'unknown'}:null}
  })
  return NextResponse.json({ok:true,loadedAt:new Date().toISOString(),products},{headers:{'Cache-Control':'no-store'}})
 }catch{return NextResponse.json({ok:false,error:'Unable to load the buying cohort. Retry without making a buying decision.'},{status:500})}
}
