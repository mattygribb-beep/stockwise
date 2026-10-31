import {NextResponse} from 'next/server'
import {getSql} from '../../../../lib/db'
import {CATALOGUE_SLUGS} from '../../../../lib/suppliers'

export const runtime='nodejs'
export const dynamic='force-dynamic'

export async function GET(req:Request){
 const params=new URL(req.url).searchParams,slug=params.get('supplier')||'',runId=params.get('run')
 if(!CATALOGUE_SLUGS.includes(slug)||runId&&!/^[1-9]\d{0,17}$/.test(runId))return NextResponse.json({ok:false,error:'Choose a valid supplier and sync run.'},{status:400})
 try{
  const sql=getSql()
  const [overview,runs,selected]=await Promise.all([
   sql`SELECT count(o.id)::int AS total,count(o.id) FILTER(WHERE o.is_active)::int AS active,
    count(o.id) FILTER(WHERE NOT o.is_active)::int AS inactive,
    count(o.id) FILTER(WHERE o.is_active AND o.last_seen_at<now()-interval '7 days')::int AS stale
    FROM suppliers s LEFT JOIN supplier_offers o ON o.supplier_id=s.id WHERE s.slug=${slug}`,
   sql`SELECT r.id,r.status,r.started_at,r.completed_at,r.offer_count,r.error_message,
    r.metadata->>'protectionReason' AS protection_reason,r.metadata->'changeCounts' AS change_counts
    FROM supplier_sync_runs r JOIN suppliers s ON s.id=r.supplier_id WHERE s.slug=${slug} ORDER BY r.started_at DESC,r.id DESC LIMIT 12`,
   sql`SELECT r.id,r.completed_at,r.metadata FROM supplier_sync_runs r JOIN suppliers s ON s.id=r.supplier_id
    WHERE s.slug=${slug} AND r.status='success' AND (${runId}::bigint IS NULL OR r.id=${runId}::bigint)
    ORDER BY r.completed_at DESC,r.id DESC LIMIT 1`
  ])
  if(runId&&!selected.length)return NextResponse.json({ok:false,error:'Completed sync run not found for this supplier.'},{status:404})
  const run=selected[0],m=run?.metadata||{}
  return NextResponse.json({ok:true,supplier:slug,overview:overview[0],runs,selectedRun:run?{
   id:run.id,completedAt:run.completed_at,tracked:Array.isArray(m.changePreview),counts:m.changeCounts||{},
   changes:m.changePreview||[],total:m.changeCount||0,truncated:!!m.changesTruncated,
   protectionReason:m.protectionReason||null,missingRetained:m.deactivationAllowed===false?m.missingCount||0:0,
   coverage:m.coverage||null
  }:null},{headers:{'Cache-Control':'no-store'}})
 }catch{return NextResponse.json({ok:false,error:'Unable to load supplier changes. Your saved catalogue is still available.'},{status:500})}
}
