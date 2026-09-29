import { getSql } from './db'\nimport { cleanProductTitle, isNonProductTitle } from './product-parser'

export type SupplierOffer={
 supplierProductId:string;supplierSku?:string;product:string;rawTitle?:string;brand?:string;size?:string;countryOrigin?:string;
 caseQty?:number;casePrice?:number;unitCost?:number;ean?:string;stockQty?:number;expiry?:string;status?:string;
 url?:string;source?:string;sourcePage?:number;tags?:any[]
}

export async function saveSupplierCatalogue(slug:string,offers:SupplierOffer[],metadata:any={}){
 if(!offers.length) throw new Error('Refusing to replace saved catalogue with zero offers')
 const sql=getSql()
 const suppliers=await sql`SELECT id FROM suppliers WHERE slug=${slug} LIMIT 1`
 if(!suppliers.length) throw new Error('Unknown supplier: '+slug)
 const supplierId=suppliers[0].id
 const runs=await sql`INSERT INTO supplier_sync_runs(supplier_id,status,offer_count,metadata) VALUES(${supplierId},'running',0,${JSON.stringify(metadata)}::jsonb) RETURNING id`
 const runId=runs[0].id
 const payload=JSON.stringify(cleanedOffers.map(o=>({
  supplier_product_id:String(o.supplierProductId),supplier_sku:o.supplierSku||'',product:o.product,raw_title:o.rawTitle||'',brand:o.brand||'',size:o.size||'',country_origin:o.countryOrigin||'',
  case_qty:o.caseQty||1,case_price:o.casePrice||0,unit_cost:o.unitCost||0,ean:o.ean||'',stock_qty:o.stockQty??null,expiry:o.expiry||'',status:o.status||'IN STOCK',
  product_url:o.url||'',source:o.source||'',source_page:o.sourcePage??null,tags:o.tags||[]
 })))
 try{
  await sql`INSERT INTO supplier_offers
   (supplier_id,supplier_product_id,supplier_sku,product,raw_title,brand,size,country_origin,case_qty,case_price,unit_cost,ean,stock_qty,expiry,status,product_url,source,source_page,tags,last_seen_at,last_sync_run_id,is_active)
   SELECT ${supplierId},x.supplier_product_id,x.supplier_sku,x.product,x.raw_title,x.brand,x.size,x.country_origin,x.case_qty,x.case_price,x.unit_cost,x.ean,x.stock_qty,x.expiry,x.status,x.product_url,x.source,x.source_page,x.tags,now(),${runId},true
   FROM jsonb_to_recordset(${payload}::jsonb) AS x(supplier_product_id text,supplier_sku text,product text,raw_title text,brand text,size text,country_origin text,case_qty int,case_price numeric,unit_cost numeric,ean text,stock_qty int,expiry text,status text,product_url text,source text,source_page int,tags jsonb)
   ON CONFLICT(supplier_id,supplier_product_id) DO UPDATE SET supplier_sku=EXCLUDED.supplier_sku,product=EXCLUDED.product,raw_title=EXCLUDED.raw_title,brand=CASE WHEN supplier_offers.brand_status='unbranded' THEN '' WHEN supplier_offers.brand_status='verified' THEN supplier_offers.brand WHEN coalesce(trim(supplier_offers.brand),'')<>'' THEN supplier_offers.brand ELSE EXCLUDED.brand END,size=EXCLUDED.size,country_origin=CASE WHEN coalesce(trim(supplier_offers.country_origin),'')<>'' THEN supplier_offers.country_origin ELSE EXCLUDED.country_origin END,case_qty=EXCLUDED.case_qty,case_price=EXCLUDED.case_price,unit_cost=EXCLUDED.unit_cost,ean=CASE WHEN coalesce(trim(supplier_offers.ean),'')<>'' THEN supplier_offers.ean ELSE EXCLUDED.ean END,stock_qty=EXCLUDED.stock_qty,expiry=EXCLUDED.expiry,status=EXCLUDED.status,product_url=EXCLUDED.product_url,source=EXCLUDED.source,source_page=EXCLUDED.source_page,tags=EXCLUDED.tags,last_seen_at=now(),last_sync_run_id=${runId},is_active=true`
  await sql`INSERT INTO supplier_offer_snapshots(sync_run_id,supplier_id,supplier_product_id,supplier_sku,product,brand,size,country_origin,case_qty,case_price,unit_cost,ean,stock_qty,expiry,status,product_url)
   SELECT ${runId},${supplierId},x.supplier_product_id,x.supplier_sku,x.product,x.brand,x.size,x.country_origin,x.case_qty,x.case_price,x.unit_cost,x.ean,x.stock_qty,x.expiry,x.status,x.product_url
   FROM jsonb_to_recordset(${payload}::jsonb) AS x(supplier_product_id text,supplier_sku text,product text,raw_title text,brand text,size text,country_origin text,case_qty int,case_price numeric,unit_cost numeric,ean text,stock_qty int,expiry text,status text,product_url text)`
  await sql`UPDATE supplier_offers SET is_active=false WHERE supplier_id=${supplierId} AND last_sync_run_id IS DISTINCT FROM ${runId}`
  await sql`UPDATE supplier_sync_runs SET status='success',offer_count=${cleanedOffers.length},completed_at=now() WHERE id=${runId}`
  return {runId,count:cleanedOffers.length}
 }catch(e:any){
  await sql`UPDATE supplier_sync_runs SET status='failed',error_message=${e?.message||'Save failed'},completed_at=now() WHERE id=${runId}`
  throw e
 }
}
