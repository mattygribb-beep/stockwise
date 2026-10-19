import {NextResponse} from 'next/server'
import {getSql} from '../../../lib/db'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const norm=(s:unknown)=>String(s??'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim()
const tokens=(s:unknown)=>norm(s).split(' ').filter(x=>x.length>2&&!['gummy','candy','flavour','flavor','drink','soda','pack','bag','the','with','and','peg','box','case'].includes(x))
const size=(s:unknown)=>{const m=String(s??'').toLowerCase().match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l|oz|fl\s*oz)\b/);if(!m)return null;let n=Number(m[1]);const u=m[2].replace(/\s/g,'');if(u==='kg'||u==='l')n*=1000;if(u==='oz')n*=28.3495;if(u==='floz')n*=29.5735;return {n,kind:['ml','l','floz'].includes(u)?'volume':'mass'}}
export async function GET(req:Request){
 const url=new URL(req.url), limit=Math.min(50,Math.max(1,Number(url.searchParams.get('limit')||36)))
 try{
 const sql=getSql()
 const offers=await sql`SELECT supplier_offer_id,product_name,brand,size,case_qty,candidate_ean FROM reverse_barcode_discovery WHERE candidate_ean IS NOT NULL ORDER BY supplier_offer_id LIMIT ${limit}`
 const amazon=await sql`SELECT asin,title,ean,upc,gtin FROM amazon_catalogue_candidates`
 const results=offers.map((o:any)=>{
  const source=tokens(o.product_name), brand=norm(o.brand), weight=size(o.size||o.product_name)
  const candidates=amazon.map((a:any)=>{
   const title=norm(a.title), other=tokens(a.title), common=source.filter((t:string)=>other.includes(t)), barcode=[a.ean,a.upc,a.gtin].filter(Boolean).some((v:any)=>String(v).replace(/^0+/,'')===String(o.candidate_ean).replace(/^0+/,''))
   const brandOK=brand&&!['stateside distribution','wando hk ltd','spv services ltd'].includes(brand)?title.includes(brand):true
   const target=size(a.title), sizeOK=!!weight&&!!target&&weight.kind===target.kind&&Math.abs(weight.n-target.n)<=Math.max(1,weight.n*.02)
   const sizeConflict=!!weight&&!!target&&!sizeOK
   const overlap=common.length/Math.max(1,source.length)
   const score=Math.round(overlap*65+(barcode?30:0)+(sizeOK?15:0)-(sizeConflict?40:0)-(!brandOK?50:0))
   return {asin:a.asin,title:a.title,score,barcodeMatch:barcode,brandMatch:brandOK,sizeMatch:sizeOK,sizeConflict,overlap:Number(overlap.toFixed(2)),status:barcode&&brandOK&&sizeOK&&overlap>=.65?'STRONG_INTERNAL_REVIEW':brandOK&&!sizeConflict&&overlap>=.65?'NAME_CANDIDATE_REVIEW':'REJECT'}
  }).filter((a:any)=>a.status!=='REJECT').sort((a:any,b:any)=>b.score-a.score).slice(0,5)
  return {supplierOfferId:o.supplier_offer_id,product:o.product_name,barcode:o.candidate_ean,caseQty:o.case_qty,candidates}
 })
 return NextResponse.json({ok:true,source:'stored_amazon_catalogue',liveAmazonVerified:false,autoApproved:0,scanned:results.length,results})
 }catch(e){return NextResponse.json({ok:false,error:'Amazon discovery failed'},{status:500})}
}
