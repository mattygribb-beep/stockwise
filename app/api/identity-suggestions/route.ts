import {NextResponse} from 'next/server'
import {getSql} from '../../../lib/db'
export const runtime='nodejs'; export const dynamic='force-dynamic'

const norm=(s:any)=>String(s||'').toLowerCase().replace(/&amp;/g,'&').replace(/[^a-z0-9]+/g,' ').trim()
const tokens=(s:any)=>new Set(norm(s).split(' ').filter((x:string)=>x.length>1&&!['case','pack','box','bag','can','candy','flavour','flavor','theatre','of','and','x'].includes(x)))
function similarity(a:any,b:any){const A=tokens(a),B=tokens(b);if(!A.size||!B.size)return 0;let hit=0;A.forEach(x=>{if(B.has(x))hit++});return hit/Math.max(A.size,B.size)}
function score(offer:any,id:any){
 const oe=String(offer.ean||'').replace(/\D/g,''),ie=String(id.ean||'').replace(/\D/g,'')
 if(oe&&ie&&oe===ie)return {score:100,reason:'Exact EAN / UPC'}
 const name=Math.round(similarity(offer.product,id.product_name)*55)
 const brand=norm(offer.brand)&&norm(id.brand)&&norm(offer.brand)===norm(id.brand)?20:0
 const size=norm(offer.size)&&norm(id.size)&&norm(offer.size)===norm(id.size)?25:0
 const conflict=norm(offer.size)&&norm(id.size)&&norm(offer.size)!==norm(id.size)
 return {score:Math.max(0,name+brand+size-(conflict?30:0)),reason:[brand?'brand':'',size?'size':'',name>=30?'product name':'',conflict?'size conflict':''].filter(Boolean).join(' + ')}
}
export async function GET(){
 try{
  const sql=getSql()
  const offers=await sql`SELECT s.name supplier,o.supplier_product_id,o.product,o.brand,o.size,o.case_qty,o.case_price,o.unit_cost,o.ean,o.country_origin FROM supplier_offers o JOIN suppliers s ON s.id=o.supplier_id LEFT JOIN product_identity_offers l ON l.supplier=s.name AND l.supplier_offer_id=o.supplier_product_id::text WHERE o.is_active=true AND l.supplier_offer_id IS NULL ORDER BY o.last_seen_at DESC LIMIT 1000`
  const ids=await sql`SELECT id,product_name,brand,size,ean,asin,country_origin,status FROM master_product_identities ORDER BY updated_at DESC`
  const suggestions:any[]=[]
  for(const o of offers){let best:any=null;for(const id of ids){const s=score(o,id);if(!best||s.score>best.score)best={...s,identity:id}}if(best&&best.score>=55)suggestions.push({offer:o,...best})}
  suggestions.sort((a,b)=>b.score-a.score)
  return NextResponse.json({ok:true,suggestions:suggestions.slice(0,200),unlinkedOffers:offers.length,identities:ids.length})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Unable to build suggestions'},{status:500})}
}
export async function POST(req:Request){
 try{const b=await req.json(),sql=getSql();if(!b.identityId||!b.supplier||!b.supplierOfferId)return NextResponse.json({ok:false,error:'Identity and supplier offer required'},{status:400})
  await sql`INSERT INTO product_identity_offers(identity_id,supplier,supplier_offer_id,match_score,match_status,match_reason) VALUES(${Number(b.identityId)},${b.supplier},${String(b.supplierOfferId)},${Number(b.score)||null},${b.action==='reject'?'rejected':'confirmed'},${b.reason||''}) ON CONFLICT(supplier,supplier_offer_id) DO UPDATE SET identity_id=excluded.identity_id,match_score=excluded.match_score,match_status=excluded.match_status,match_reason=excluded.match_reason,updated_at=now()`
  return NextResponse.json({ok:true})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Unable to save match'},{status:500})}
}