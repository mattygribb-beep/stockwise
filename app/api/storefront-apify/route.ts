import {NextResponse} from 'next/server'
import {getSql} from '../../../lib/db'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const actor='junglee~amazon-crawler'
const valid=(s:string)=>/^[A-Z0-9]{8,24}$/.test(s)
export async function POST(req:Request){try{
const token=process.env.APIFY_API_TOKEN
if(!token)return NextResponse.json({ok:false,error:'APIFY_API_TOKEN is not configured in Vercel'},{status:503})
const body=await req.json(),id=Number(body.id),action=String(body.action||'start')
if(!Number.isSafeInteger(id)||id<1||!['start','poll'].includes(action))return NextResponse.json({ok:false,error:'Invalid request'},{status:400})
const sql=getSql(),rows=await sql`SELECT * FROM storefront_cloud_jobs WHERE id=${id} LIMIT 1`,job=rows[0]
if(!job||!valid(job.seller_id))return NextResponse.json({ok:false,error:'Job not found'},{status:404})
if(action==='start'){
if(!['queued','blocked','paused'].includes(job.status))return NextResponse.json({ok:false,error:'Job not ready'},{status:409})
const url='https://www.amazon.co.uk/s?me='+job.seller_id+'&marketplaceID=A1F83G8C2ARO7P'
const response=await fetch('https://api.apify.com/v2/acts/'+actor+'/runs',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({categoryOrProductUrls:[{url}],maxItemsPerStartUrl:20,maxSearchPagesPerStartUrl:1,scrapeProductDetails:false,proxyCountry:'GB',maxOffers:0,maxProductVariantsAsSeparateResults:0}),signal:AbortSignal.timeout(15000)})
const data=await response.json();if(!response.ok||!data?.data?.id)return NextResponse.json({ok:false,error:'Apify start failed',details:String(data?.error?.message||response.status).slice(0,200)},{status:502})
const runId=String(data.data.id);await sql`UPDATE storefront_cloud_jobs SET status='running',error_message=${'Apify run: '+runId},updated_at=now() WHERE id=${id}`
return NextResponse.json({ok:true,runId,jobId:id,status:data.data.status})
}
const runId=String(job.error_message||'').match(/Apify run: ([A-Za-z0-9]+)/)?.[1]
if(!runId)return NextResponse.json({ok:false,error:'No Apify run ID attached'},{status:409})
const response=await fetch('https://api.apify.com/v2/actor-runs/'+encodeURIComponent(runId),{headers:{Authorization:'Bearer '+token},cache:'no-store'})
const data=await response.json();if(!response.ok)return NextResponse.json({ok:false,error:'Apify status unavailable'},{status:502})
const status=String(data.data?.status||'UNKNOWN')
if(status==='SUCCEEDED'){
const dataset=String(data.data?.defaultDatasetId||'');if(!dataset)return NextResponse.json({ok:false,error:'No dataset returned'},{status:502})
const r=await fetch('https://api.apify.com/v2/datasets/'+encodeURIComponent(dataset)+'/items?clean=true&limit=100',{headers:{Authorization:'Bearer '+token},cache:'no-store'});if(!r.ok)return NextResponse.json({ok:false,error:'Dataset unavailable'},{status:502})
const items=await r.json();let saved=0
for(const item of Array.isArray(items)?items:[]){const asin=String(item.asin||item.ASIN||'').toUpperCase(),title=String(item.title||item.name||'').slice(0,1500);if(!/^[A-Z0-9]{10}$/.test(asin)||!title)continue
await sql`INSERT INTO storefront_scout_catalogue(seller_id,asin,title,first_seen_at,last_seen_at) VALUES(${job.seller_id},${asin},${title},now(),now()) ON CONFLICT(seller_id,asin) DO UPDATE SET last_seen_at=now(),title=EXCLUDED.title,times_seen=storefront_scout_catalogue.times_seen+1`;saved++}
await sql`UPDATE storefront_cloud_jobs SET status='completed',products_discovered=${saved},new_products=(SELECT count(*)::int FROM storefront_scout_catalogue WHERE seller_id=${job.seller_id} AND first_seen_at>=${job.created_at}),pages_scanned=1,error_message=NULL,updated_at=now() WHERE id=${id}`
return NextResponse.json({ok:true,status,itemsReturned:items.length,validAsinsSaved:saved})
}
if(['FAILED','ABORTED','TIMED-OUT'].includes(status))await sql`UPDATE storefront_cloud_jobs SET status='blocked',error_message=${'Apify run '+status},updated_at=now() WHERE id=${id}`
return NextResponse.json({ok:true,status,runId})
}catch(e:any){return NextResponse.json({ok:false,error:String(e?.message||'Apify request failed').slice(0,200)},{status:500})}}
