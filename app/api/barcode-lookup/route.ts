import {NextResponse} from 'next/server'
import {getSql} from '../../../lib/db'
export const runtime='nodejs';export const dynamic='force-dynamic'
const digits=(v:any)=>String(v||'').replace(/\D/g,'')
export async function GET(req:Request){
 const barcode=digits(new URL(req.url).searchParams.get('barcode'))
 if(!/^\d{8,14}$/.test(barcode))return NextResponse.json({ok:false,error:'Invalid barcode'},{status:400})
 try{
  const sql=getSql()
  const masters=await sql`SELECT m.id,m.product_name,m.brand,m.unit_size,m.ean,(SELECT a.asin FROM amazon_product_listings a WHERE a.identity_id=m.id ORDER BY CASE WHEN a.status='verified' THEN 0 ELSE 1 END,a.updated_at DESC LIMIT 1) asin FROM master_product_identities m WHERE regexp_replace(coalesce(m.ean,''),'[^0-9]','','g')=${barcode} LIMIT 1`
  if(masters[0])return NextResponse.json({ok:true,match:{name:masters[0].product_name,brand:masters[0].brand,size:masters[0].unit_size,asin:masters[0].asin,masterProductId:masters[0].id,source:'Source Stack',confidence:'VERIFIED'}})
  const offers=await sql`SELECT product,brand,size FROM supplier_offers WHERE is_active=true AND regexp_replace(coalesce(ean,''),'[^0-9]','','g')=${barcode} ORDER BY last_seen_at DESC LIMIT 1`
  if(offers[0])return NextResponse.json({ok:true,match:{name:offers[0].product,brand:offers[0].brand,size:offers[0].size,source:'Source Stack supplier data',confidence:'KNOWN'}})
  const off=await fetch('https://world.openfoodfacts.org/api/v2/product/'+barcode+'.json?fields=product_name,brands,quantity',{headers:{'User-Agent':'SourceStack/1.0 warehouse-barcode-lookup'}}).then(r=>r.ok?r.json():null).catch(()=>null)
  if(off?.status===1&&off.product?.product_name)return NextResponse.json({ok:true,match:{name:off.product.product_name,brand:off.product.brands||'',size:off.product.quantity||'',source:'Open Food Facts',confidence:'EXTERNAL'}})
  const upc=await fetch('https://api.upcitemdb.com/prod/trial/lookup?upc='+barcode,{headers:{Accept:'application/json'}}).then(r=>r.ok?r.json():null).catch(()=>null)
  const item=upc?.items?.[0]
  if(item)return NextResponse.json({ok:true,match:{name:item.title||'',brand:item.brand||'',size:item.size||'',asin:item.asin||'',source:'UPCitemdb',confidence:'EXTERNAL'}})
  return NextResponse.json({ok:true,match:null})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Lookup failed'},{status:500})}
}
