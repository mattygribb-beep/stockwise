import { NextResponse } from 'next/server'
import { getSql } from '../../../../lib/db'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(req:Request){
 try {
  const slug=new URL(req.url).searchParams.get('supplier')||'stateside'
  const sql=getSql()
  const rows=await sql`WITH runs AS (
   SELECT r.id,r.completed_at,row_number() OVER(ORDER BY r.completed_at DESC,r.id DESC) AS rank
   FROM supplier_sync_runs r JOIN suppliers s ON s.id=r.supplier_id
   WHERE s.slug=${slug} AND r.status='success'
  ), current_run AS (SELECT id,completed_at FROM runs WHERE rank=1),
  previous_run AS (SELECT id FROM runs WHERE rank=2),
  now_offers AS (SELECT supplier_product_id,case_price,product FROM supplier_offer_snapshots WHERE sync_run_id=(SELECT id FROM current_run)),
  old_offers AS (SELECT supplier_product_id,case_price,product FROM supplier_offer_snapshots WHERE sync_run_id=(SELECT id FROM previous_run))
  SELECT (SELECT completed_at FROM current_run) AS last_sync,
   (SELECT count(*) FROM now_offers)::int AS current_count,
   (SELECT count(*) FROM old_offers)::int AS previous_count,
   (SELECT count(*) FROM now_offers n LEFT JOIN old_offers o USING(supplier_product_id) WHERE o.supplier_product_id IS NULL)::int AS new_count,
   (SELECT count(*) FROM old_offers o LEFT JOIN now_offers n USING(supplier_product_id) WHERE n.supplier_product_id IS NULL)::int AS missing_count,
   (SELECT count(*) FROM now_offers n JOIN old_offers o USING(supplier_product_id) WHERE n.case_price IS DISTINCT FROM o.case_price)::int AS price_changes,
   (SELECT count(*) FROM now_offers n JOIN old_offers o USING(supplier_product_id) WHERE n.product IS DISTINCT FROM o.product)::int AS title_changes,
   EXISTS(SELECT 1 FROM previous_run) AS has_previous`
  return NextResponse.json({ok:true,supplier:slug,...rows[0]})
 } catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Unable to load supplier changes'},{status:500})}
}
