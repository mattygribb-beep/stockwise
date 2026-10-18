import {NextResponse} from 'next/server'
import {getSql} from '../../../lib/db'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const digits=(v:unknown)=>String(v||'').replace(/\D/g,'')
export async function GET(req:Request){
 const url=new URL(req.url), barcode=digits(url.searchParams.get('barcode'))
 if(!/^(?:\d{8}|\d{12,14})$/.test(barcode))return NextResponse.json({ok:false,error:'Invalid barcode'},{status:400})
 const enrich=url.searchParams.get('enrich')==='1'
 try{
  const sql=getSql()
  const masters=await sql`SELECT id,product_name,brand,unit_size,ean FROM master_product_identities WHERE regexp_replace(coalesce(ean,''),'^0+','')=regexp_replace(${barcode},'^0+','') AND ean<>'' LIMIT 3`
  const offers=await sql`SELECT product,brand,size FROM supplier_offers WHERE is_active=true AND regexp_replace(coalesce(ean,''),'^0+','')=regexp_replace(${barcode},'^0+','') AND ean<>'' ORDER BY last_seen_at DESC LIMIT 3`
  const evidence:any[]=[]
  if(masters.length)evidence.push(...masters.map((m:any)=>({name:m.product_name,brand:m.brand,size:m.unit_size,masterProductId:m.id,source:'Source Stack master',confidence:'INTERNAL'})))
  if(offers.length)evidence.push(...offers.map((o:any)=>({name:o.product,brand:o.brand,size:o.size,source:'Source Stack supplier',confidence:'INTERNAL'})))
  if(!enrich&&evidence.length)return NextResponse.json({ok:true,barcode,match:evidence[0],evidence})
  const cached=await sql`SELECT source,product_name,brand,size,asin_candidate,evidence,fetched_at FROM barcode_enrichment_evidence WHERE barcode=${barcode} AND fetched_at > now()-interval '30 days' ORDER BY fetched_at DESC LIMIT 20`
  if(cached.length){
   evidence.push(...cached.map((x:any)=>({name:x.product_name,brand:x.brand,size:x.size,asin:x.asin_candidate||'',source:x.source,confidence:'EXTERNAL_UNVERIFIED',cached:true,evidence:x.evidence})))
   return NextResponse.json({ok:true,barcode,match:evidence[0]||null,evidence,asinCandidates:[...new Set(evidence.map(x=>x.asin).filter(Boolean))],cached:true,persisted:true})
  }
  const providers=await Promise.allSettled([
   fetch('https://api.upcitemdb.com/prod/trial/lookup?upc='+encodeURIComponent(barcode),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000),cache:'no-store'}).then(r=>r.ok?r.json():null),
   fetch('https://world.openfoodfacts.org/api/v2/product/'+barcode+'.json?fields=product_name,brands,quantity,image_url',{headers:{'User-Agent':'SourceStack/1.0 (product barcode research)'},signal:AbortSignal.timeout(10000),cache:'no-store'}).then(r=>r.ok?r.json():null)
  ])
  const upc=providers[0].status==='fulfilled'?providers[0].value:null
  for(const item of (Array.isArray(upc?.items)?upc.items:[]).slice(0,5))evidence.push({name:item.title||'',brand:item.brand||'',size:item.size||'',asin:item.asin||'',upc:item.upc||'',ean:item.ean||'',images:Array.isArray(item.images)?item.images.slice(0,3):[],source:'UPCitemdb',confidence:'EXTERNAL_UNVERIFIED'})
  const off=providers[1].status==='fulfilled'?providers[1].value:null
  if(off?.status===1&&off.product)evidence.push({name:off.product.product_name||'',brand:off.product.brands||'',size:off.product.quantity||'',image:off.product.image_url||'',source:'Open Food Facts',confidence:'EXTERNAL_UNVERIFIED'})
  for(const entry of evidence.filter(x=>x.confidence==='EXTERNAL_UNVERIFIED')){
   const titleAsins=String(entry.name||'').match(/\\bB0[A-Z0-9]{8}\\b/g)||[]
   const candidates=[...new Set([entry.asin,...titleAsins].filter(Boolean))]
   for(const candidate of (candidates.length?candidates:[''])){
    await sql`INSERT INTO barcode_enrichment_evidence (barcode,source,product_name,brand,size,asin_candidate,evidence)
    VALUES (${barcode},${entry.source},${entry.name||''},${entry.brand||''},${entry.size||''},${candidate||null},${JSON.stringify(entry)}::jsonb)
    ON CONFLICT (barcode,source,asin_candidate) DO UPDATE SET product_name=EXCLUDED.product_name,brand=EXCLUDED.brand,size=EXCLUDED.size,evidence=EXCLUDED.evidence,fetched_at=now()`
   }
  }
  return NextResponse.json({ok:true,barcode,match:evidence[0]||null,evidence,asinCandidates:[...new Set(evidence.flatMap(x=>[x.asin,...(String(x.name||'').match(/\\bB0[A-Z0-9]{8}\\b/g)||[])]).filter(Boolean))],persisted:true})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Lookup failed'},{status:500})}
}
