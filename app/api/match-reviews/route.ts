import {NextRequest,NextResponse} from 'next/server'
import {getSql} from '../../../lib/db'
export const runtime='nodejs';export const dynamic='force-dynamic'
function authorised(req:NextRequest){const token=process.env.MATCH_REVIEW_ADMIN_TOKEN;return !!token&&req.headers.get('authorization')===`Bearer ${token}`}
export async function GET(req:NextRequest){
 if(!authorised(req))return NextResponse.json({error:'Unauthorized'}, {status:401})
 try{const sql=getSql();const rows=await sql`SELECT r.*,o.supplier_product_id,o.product supplier_product,a.title amazon_title FROM amazon_supplier_match_reviews r JOIN supplier_offers o ON o.id=r.supplier_offer_id LEFT JOIN amazon_catalogue_candidates a ON a.asin=r.asin ORDER BY r.reviewed_at DESC LIMIT 500`;return NextResponse.json({rows})}catch{return NextResponse.json({error:'Review storage not configured'}, {status:503})}
}
export async function POST(req:NextRequest){
 if(!authorised(req))return NextResponse.json({error:'Unauthorized'}, {status:401})
 let data:any;try{data=await req.json()}catch{return NextResponse.json({error:'Invalid JSON'}, {status:400})}
 const asin=String(data.asin||'').trim().toUpperCase(),id=Number(data.supplierOfferId),decision=data.decision,reason=String(data.reason||'').trim()
 if(!/^[A-Z0-9]{10}$/.test(asin)||!Number.isSafeInteger(id)||id<=0||!['PROTECTED','REVIEW','REJECTED'].includes(decision)||reason.length<5||reason.length>1000)return NextResponse.json({error:'Invalid review'}, {status:400})
 if(decision==='PROTECTED'&&(!data.evidence||!['barcode','manufacturer','manual'].includes(data.evidence.type)))return NextResponse.json({error:'Protection requires evidence type'}, {status:400})
 try{const sql=getSql();const rows=await sql`INSERT INTO amazon_supplier_match_reviews(asin,supplier_offer_id,decision,reason,evidence) SELECT ${asin},o.id,${decision},${reason},${JSON.stringify(data.evidence||{})}::jsonb FROM supplier_offers o WHERE o.id=${id} ON CONFLICT(asin,supplier_offer_id) DO UPDATE SET decision=excluded.decision,reason=excluded.reason,evidence=excluded.evidence,reviewed_at=now() RETURNING *`;if(!rows.length)return NextResponse.json({error:'Supplier offer not found'}, {status:404});return NextResponse.json({row:rows[0]})}catch{return NextResponse.json({error:'Review storage unavailable'}, {status:503})}
}
