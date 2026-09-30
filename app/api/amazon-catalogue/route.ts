import {NextResponse} from 'next/server'
import {getSql} from '../../../lib/db'

const asinOk=(v:any)=>/^[A-Z0-9]{10}$/.test(String(v||'').trim().toUpperCase())
const num=(v:any)=>{const n=Number(String(v??'').replace(/[^0-9.]/g,''));return Number.isFinite(n)?n:null}

export async function GET(){
 try{
  const sql=getSql()
  const rows=await sql`SELECT asin,title,observed_price,amazon_url,source_page,ean,upc,gtin,match_status,matched_master_identity_id,matched_supplier_offer_id,match_score,match_evidence,last_seen_at FROM amazon_catalogue_candidates ORDER BY title`
  const stats=await sql`SELECT count(*)::int total,count(*) FILTER(WHERE match_status='unmatched')::int unmatched,count(*) FILTER(WHERE match_status<>'unmatched')::int matched,count(*) FILTER(WHERE coalesce(upc,'')<>'')::int with_upc,count(*) FILTER(WHERE coalesce(gtin,'')<>'')::int with_gtin FROM amazon_catalogue_candidates`
  return NextResponse.json({ok:true,stats:stats[0],items:rows})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Catalogue unavailable'},{status:500})}
}

export async function POST(req:Request){
 try{
  const body=await req.json(),items=Array.isArray(body?.items)?body.items:[]
  if(!items.length)return NextResponse.json({ok:false,error:'No catalogue items supplied'},{status:400})
  const sql=getSql();let accepted=0,rejected=0
  for(const x of items){
   const asin=String(x.asin||x.ASIN||'').trim().toUpperCase()
   const title=String(x.title||x.Title||'').trim()
   if(!asinOk(asin)||!title){rejected++;continue}
   const price=num(x.price??x.Price),url=String(x.amazon_url||x['Amazon URL']||x.url||'').trim()||null,page=num(x.source_page??x.Page)
   const ean=String(x.ean||x.EAN||'').trim()||null,upc=String(x.upc||x.UPC||'').trim()||null,gtin=String(x.gtin||x.GTIN||'').trim()||null
   await sql`INSERT INTO amazon_catalogue_candidates(asin,title,observed_price,amazon_url,source_page,ean,upc,gtin,last_seen_at,updated_at)
    VALUES(${asin},${title},${price},${url},${page},${ean},${upc},${gtin},now(),now())
    ON CONFLICT(asin) DO UPDATE SET title=EXCLUDED.title,observed_price=COALESCE(EXCLUDED.observed_price,amazon_catalogue_candidates.observed_price),amazon_url=COALESCE(EXCLUDED.amazon_url,amazon_catalogue_candidates.amazon_url),source_page=COALESCE(EXCLUDED.source_page,amazon_catalogue_candidates.source_page),ean=COALESCE(EXCLUDED.ean,amazon_catalogue_candidates.ean),upc=COALESCE(EXCLUDED.upc,amazon_catalogue_candidates.upc),gtin=COALESCE(EXCLUDED.gtin,amazon_catalogue_candidates.gtin),last_seen_at=now(),updated_at=now()`
   accepted++
  }
  return NextResponse.json({ok:true,accepted,rejected})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Import failed'},{status:500})}
}
