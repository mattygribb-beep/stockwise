import {NextResponse} from 'next/server'
import {getSql} from '../../../lib/db'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const sellers=['A3TNQVR08YJ3AW','A2F9IL191GVM3E','A2GRC0NKNVNZQE','A1FPOQ0X0CHT30','A1BTXEEXK8JSEO','A226DZC4BCEHGM','A3O9PD21F5A9NN','AWJV3WH2WNVEW','AGPUVTKGKK3YU','A2L8Z4LF1SP15L']
export async function GET(req:Request){try{
const sql=getSql(),u=new URL(req.url),seller=u.searchParams.get('seller')||'all',filter=u.searchParams.get('filter')||'all',q=(u.searchParams.get('q')||'').trim().slice(0,100),page=Math.min(1000,Math.max(1,Number(u.searchParams.get('page')||1)||1)),limit=30
if(seller!=='all'&&!/^[A-Z0-9]{8,24}$/.test(seller))return NextResponse.json({ok:false,error:'Invalid seller'},{status:400})
if(!['all','bestseller','needs_details','identified','new'].includes(filter))return NextResponse.json({ok:false,error:'Invalid filter'},{status:400})
const [stats,perSeller,runs,jobs,products]=await Promise.all([
sql`SELECT count(*)::int products,count(DISTINCT seller_id)::int sellers,count(*) FILTER(WHERE best_seller)::int bestsellers,count(*) FILTER(WHERE first_seen_at>=now()-interval '30 days')::int new_30d FROM storefront_scout_catalogue WHERE (${seller}='all' OR seller_id=${seller})`,
sql`SELECT c.seller_id,count(*)::int products,count(*) FILTER(WHERE c.best_seller)::int bestsellers,count(*) FILTER(WHERE d.ean IS NOT NULL AND d.ean<>'' OR d.upc IS NOT NULL AND d.upc<>'')::int with_barcode,count(*) FILTER(WHERE c.first_seen_at>=now()-interval '30 days')::int new_30d,max(c.last_seen_at) last_seen FROM storefront_scout_catalogue c LEFT JOIN storefront_product_details d ON d.seller_id=c.seller_id AND d.asin=c.asin GROUP BY c.seller_id ORDER BY products DESC`,
sql`SELECT id,seller_id,status,last_saved_page,products_saved,created_at,updated_at FROM storefront_scout_runs WHERE (${seller}='all' OR seller_id=${seller}) ORDER BY created_at DESC LIMIT 20`,
sql`SELECT id,seller_id,status,stage,pages_scanned,products_discovered,new_products,error_message,created_at,updated_at FROM storefront_cloud_jobs WHERE (${seller}='all' OR seller_id=${seller}) ORDER BY created_at DESC LIMIT 20`,
sql`SELECT c.seller_id,c.asin,c.title,c.best_seller,c.best_seller_rank,c.observed_price,c.first_seen_at,c.last_seen_at,c.times_seen,d.brand,d.ean,d.upc,d.size,d.pack_qty,d.detail_status,a.match_status,a.match_score FROM storefront_scout_catalogue c LEFT JOIN storefront_product_details d ON d.seller_id=c.seller_id AND d.asin=c.asin LEFT JOIN LATERAL (SELECT match_status,match_score FROM amazon_catalogue_candidates a WHERE a.asin=c.asin ORDER BY updated_at DESC LIMIT 1) a ON true WHERE (${seller}='all' OR c.seller_id=${seller}) AND (${filter}='all' OR (${filter}='bestseller' AND c.best_seller) OR (${filter}='needs_details' AND (d.detail_status IS NULL OR d.detail_status<>'captured')) OR (${filter}='identified' AND (nullif(d.ean,'') IS NOT NULL OR nullif(d.upc,'') IS NOT NULL)) OR (${filter}='new' AND c.first_seen_at>=now()-interval '30 days')) AND (${q}='' OR c.title ILIKE '%'||${q}||'%' OR c.asin ILIKE '%'||${q}||'%') ORDER BY c.first_seen_at DESC,c.asin LIMIT ${limit} OFFSET ${(page-1)*limit}`
])
return NextResponse.json({ok:true,generatedAt:new Date().toISOString(),savedSellers:sellers,stats:stats[0],perSeller,runs,jobs,products,page,pageSize:limit,notes:{new:'First seen in the last 30 days; not necessarily new to Amazon',match:'Existing match status only; no fresh match calculation performed'}})
}catch(e){return NextResponse.json({ok:false,error:'Dashboard query failed'},{status:500})}}
