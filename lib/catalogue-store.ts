import { getSql } from './db'

export type SupplierOffer={
 supplierProductId:string;supplierSku?:string;product:string;rawTitle?:string;brand?:string;size?:string;
 caseQty?:number;casePrice?:number;unitCost?:number;ean?:string;stockQty?:number;expiry?:string;status?:string;
 url?:string;source?:string;sourcePage?:number;tags?:any[]
}

export async function saveSupplierCatalogue(slug:string,offers:SupplierOffer[],metadata:any={}){
 if(!offers.length) throw new Error('Refusing to replace saved catalogue with zero offers')
 const sql=getSql()
 const suppliers=await sql`SELECT id,name FROM suppliers WHERE slug=${slug} LIMIT 1`
 if(!suppliers.length) throw new Error('Unknown supplier: '+slug)
 const supplierId=suppliers[0].id
 const runs=await sql`INSERT INTO supplier_sync_runs(supplier_id,status,offer_count,metadata) VALUES(${supplierId},'running',0,${JSON.stringify(metadata)}::jsonb) RETURNING id`
 const runId=runs[0].id
 try{
  for(let i=0;i<offers.length;i+=50){
   for(const o of offers.slice(i,i+50)){
    await sql`INSERT INTO supplier_offers
      (supplier_id,supplier_product_id,supplier_sku,product,raw_title,brand,size,case_qty,case_price,unit_cost,ean,stock_qty,expiry,status,product_url,source,source_page,tags,last_seen_at,last_sync_run_id,is_active)
      VALUES(${supplierId},${String(o.supplierProductId)},${o.supplierSku||''},${o.product},${o.rawTitle||''},${o.brand||''},${o.size||''},${o.caseQty||1},${o.casePrice||0},${o.unitCost||0},${o.ean||''},${o.stockQty??null},${o.expiry||''},${o.status||'IN STOCK'},${o.url||''},${o.source||''},${o.sourcePage??null},${JSON.stringify(o.tags||[])}::jsonb,now(),${runId},true)
      ON CONFLICT(supplier_id,supplier_product_id) DO UPDATE SET
       supplier_sku=EXCLUDED.supplier_sku,product=EXCLUDED.product,raw_title=EXCLUDED.raw_title,brand=EXCLUDED.brand,size=EXCLUDED.size,
       case_qty=EXCLUDED.case_qty,case_price=EXCLUDED.case_price,unit_cost=EXCLUDED.unit_cost,ean=EXCLUDED.ean,stock_qty=EXCLUDED.stock_qty,
       expiry=EXCLUDED.expiry,status=EXCLUDED.status,product_url=EXCLUDED.product_url,source=EXCLUDED.source,source_page=EXCLUDED.source_page,
       tags=EXCLUDED.tags,last_seen_at=now(),last_sync_run_id=${runId},is_active=true`
    await sql`INSERT INTO supplier_offer_snapshots(sync_run_id,supplier_id,supplier_product_id,supplier_sku,product,brand,size,case_qty,case_price,unit_cost,ean,stock_qty,expiry,status,product_url)
      VALUES(${runId},${supplierId},${String(o.supplierProductId)},${o.supplierSku||''},${o.product},${o.brand||''},${o.size||''},${o.caseQty||1},${o.casePrice||0},${o.unitCost||0},${o.ean||''},${o.stockQty??null},${o.expiry||''},${o.status||'IN STOCK'},${o.url||''})`
   }
  }
  await sql`UPDATE supplier_offers SET is_active=false WHERE supplier_id=${supplierId} AND last_sync_run_id IS DISTINCT FROM ${runId}`
  await sql`UPDATE supplier_sync_runs SET status='success',offer_count=${offers.length},completed_at=now() WHERE id=${runId}`
  return {runId,count:offers.length}
 }catch(e:any){
  await sql`UPDATE supplier_sync_runs SET status='failed',error_message=${e?.message||'Save failed'},completed_at=now() WHERE id=${runId}`
  throw e
 }
}
