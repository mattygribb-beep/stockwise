import { getSql } from './db'
import { canDeactivateMissing, type ScanCoverage } from './catalogue-safety'
import { cleanProductTitle, isNonProductTitle } from './product-parser'

export type SupplierOffer={
 supplierProductId:string;supplierSku?:string;product:string;rawTitle?:string;brand?:string;size?:string;countryOrigin?:string;
 caseQty?:number;casePrice?:number;unitCost?:number;ean?:string;stockQty?:number;expiry?:string;status?:string;
 url?:string;source?:string;sourcePage?:number;tags?:any[]
}

export async function saveSupplierCatalogue(slug:string,offers:SupplierOffer[],metadata:any={},options:{deactivateMissing?:boolean;coverage?:ScanCoverage}={}){
 const ids=new Set<string>()
 for(const offer of offers){const id=String(offer.supplierProductId??'').trim();if(!id||id==='undefined'||id==='null')throw new Error('Supplier product identifier is missing');if(ids.has(id))throw new Error('Duplicate supplier product identifier: '+id);ids.add(id)}
 const cleanedOffers=offers.map(o=>({...o,rawTitle:o.rawTitle||o.product,product:cleanProductTitle(o.product)})).filter(o=>!isNonProductTitle(o.product))
 if(!cleanedOffers.length) throw new Error('Refusing to replace saved catalogue with zero product offers')
 const scanAllowsRemoval=canDeactivateMissing(options.coverage,options.deactivateMissing!==false)
 const runMetadata={...metadata,coverage:options.coverage||{complete:false,scope:'partial'},deactivationRequested:scanAllowsRemoval}
 const sql=getSql()
 const suppliers=await sql`SELECT id FROM suppliers WHERE slug=${slug} LIMIT 1`
 if(!suppliers.length) throw new Error('Unknown supplier: '+slug)
 const supplierId=suppliers[0].id
 const runs=await sql`INSERT INTO supplier_sync_runs(supplier_id,status,offer_count,metadata) VALUES(${supplierId},'running',0,${JSON.stringify(runMetadata)}::jsonb) RETURNING id`
 const runId=runs[0].id
 const payload=JSON.stringify(cleanedOffers.map(o=>({
  supplier_product_id:String(o.supplierProductId).trim(),supplier_sku:o.supplierSku||'',product:o.product,raw_title:o.rawTitle||'',brand:o.brand||'',size:o.size||'',country_origin:o.countryOrigin||'',
  case_qty:o.caseQty||1,case_price:o.casePrice||0,unit_cost:o.unitCost||0,ean:o.ean||'',stock_qty:o.stockQty??null,expiry:o.expiry||'',status:o.status||'IN STOCK',
  product_url:o.url||'',source:o.source||'',source_page:o.sourcePage??null,tags:o.tags||[]
 })))
 try{
  const results=await sql.transaction(tx=>[
   tx`SELECT id FROM suppliers WHERE id=${supplierId} FOR UPDATE`,
   tx`WITH incoming AS (SELECT x.supplier_product_id FROM jsonb_to_recordset(${payload}::jsonb) AS x(supplier_product_id text)),
    coverage AS (SELECT count(*) FILTER(WHERE o.is_active)::int AS active_count,
      count(*) FILTER(WHERE o.is_active AND NOT EXISTS(SELECT 1 FROM incoming i WHERE i.supplier_product_id=o.supplier_product_id))::int AS missing_count
      FROM supplier_offers o WHERE o.supplier_id=${supplierId})
    UPDATE supplier_sync_runs SET metadata=metadata||jsonb_build_object(
      'deactivationAllowed',${scanAllowsRemoval} AND (active_count=0 OR missing_count::numeric/NULLIF(active_count,0)<=0.25),
      'missingCount',missing_count,'previousActiveCount',active_count,
      'protectionReason',CASE WHEN NOT ${scanAllowsRemoval} THEN 'Scan coverage is incomplete or unverified; unseen offers retained.'
        WHEN active_count>0 AND missing_count::numeric/NULLIF(active_count,0)>0.25 THEN 'More than 25% of saved active offers were missing; unseen offers retained for review.' ELSE NULL END)
    FROM coverage WHERE id=${runId}`,
   tx`WITH incoming AS (SELECT * FROM jsonb_to_recordset(${payload}::jsonb) AS x(supplier_product_id text,product text,case_qty int,case_price numeric,unit_cost numeric,status text,product_url text)),
    events AS (
     SELECT i.supplier_product_id,i.product,i.product_url,e.kind,
       o.case_price AS previous_case_price,i.case_price AS case_price,o.unit_cost AS previous_unit_cost,i.unit_cost AS unit_cost,
       o.case_qty AS previous_case_qty,i.case_qty AS case_qty,o.status AS previous_status,i.status AS status
     FROM incoming i LEFT JOIN supplier_offers o ON o.supplier_id=${supplierId} AND o.supplier_product_id=i.supplier_product_id
     CROSS JOIN LATERAL (VALUES
       ('new',o.id IS NULL),('returned',o.id IS NOT NULL AND NOT o.is_active),
       ('price',o.id IS NOT NULL AND (o.case_price IS DISTINCT FROM i.case_price OR o.unit_cost IS DISTINCT FROM i.unit_cost)),
       ('pack',o.id IS NOT NULL AND o.case_qty IS DISTINCT FROM i.case_qty),
       ('availability',o.id IS NOT NULL AND o.status IS DISTINCT FROM i.status)) AS e(kind,changed) WHERE e.changed
     UNION ALL
     SELECT o.supplier_product_id,o.product,o.product_url,'unavailable',o.case_price,NULL,o.unit_cost,NULL,o.case_qty,NULL,o.status,NULL
     FROM supplier_offers o WHERE o.supplier_id=${supplierId} AND o.is_active
       AND (SELECT (metadata->>'deactivationAllowed')::boolean FROM supplier_sync_runs WHERE id=${runId})
       AND NOT EXISTS(SELECT 1 FROM incoming i WHERE i.supplier_product_id=o.supplier_product_id)
    ), counts AS (SELECT kind,count(*)::int AS n FROM events GROUP BY kind),
    preview AS (SELECT * FROM events ORDER BY CASE kind WHEN 'price' THEN 0 WHEN 'pack' THEN 1 WHEN 'returned' THEN 2 WHEN 'unavailable' THEN 3 ELSE 4 END,product,supplier_product_id LIMIT 200)
    UPDATE supplier_sync_runs SET metadata=metadata||jsonb_build_object(
      'changeCounts',COALESCE((SELECT jsonb_object_agg(kind,n) FROM counts),'{}'::jsonb),
      'changeCount',(SELECT count(*) FROM events),'changesTruncated',(SELECT count(*)>200 FROM events),
      'changePreview',COALESCE((SELECT jsonb_agg(to_jsonb(preview)) FROM preview),'[]'::jsonb)) WHERE id=${runId}`,
   tx`INSERT INTO supplier_offers
   (supplier_id,supplier_product_id,supplier_sku,product,raw_title,brand,size,country_origin,case_qty,case_price,unit_cost,ean,stock_qty,expiry,status,product_url,source,source_page,tags,last_seen_at,last_sync_run_id,is_active)
   SELECT ${supplierId},x.supplier_product_id,x.supplier_sku,x.product,x.raw_title,x.brand,x.size,x.country_origin,x.case_qty,x.case_price,x.unit_cost,x.ean,x.stock_qty,x.expiry,x.status,x.product_url,x.source,x.source_page,x.tags,now(),${runId},true
   FROM jsonb_to_recordset(${payload}::jsonb) AS x(supplier_product_id text,supplier_sku text,product text,raw_title text,brand text,size text,country_origin text,case_qty int,case_price numeric,unit_cost numeric,ean text,stock_qty int,expiry text,status text,product_url text,source text,source_page int,tags jsonb)
   ON CONFLICT(supplier_id,supplier_product_id) DO UPDATE SET supplier_sku=EXCLUDED.supplier_sku,product=EXCLUDED.product,raw_title=EXCLUDED.raw_title,brand=CASE WHEN supplier_offers.brand_status='unbranded' THEN '' WHEN supplier_offers.brand_status='verified' THEN supplier_offers.brand WHEN lower(trim(supplier_offers.brand)) IN ('candy cargo','candycargo') THEN EXCLUDED.brand WHEN coalesce(trim(supplier_offers.brand),'')<>'' THEN supplier_offers.brand ELSE EXCLUDED.brand END,size=EXCLUDED.size,country_origin=CASE WHEN coalesce(trim(supplier_offers.country_origin),'')<>'' THEN supplier_offers.country_origin ELSE EXCLUDED.country_origin END,case_qty=EXCLUDED.case_qty,case_price=EXCLUDED.case_price,unit_cost=EXCLUDED.unit_cost,ean=CASE WHEN coalesce(trim(supplier_offers.ean),'')<>'' THEN supplier_offers.ean ELSE EXCLUDED.ean END,stock_qty=EXCLUDED.stock_qty,expiry=EXCLUDED.expiry,status=EXCLUDED.status,product_url=EXCLUDED.product_url,source=EXCLUDED.source,source_page=EXCLUDED.source_page,tags=EXCLUDED.tags,last_seen_at=now(),last_sync_run_id=${runId},is_active=true`,
   tx`INSERT INTO supplier_offer_snapshots(sync_run_id,supplier_id,supplier_product_id,supplier_sku,product,brand,size,country_origin,case_qty,case_price,unit_cost,ean,stock_qty,expiry,status,product_url)
   SELECT ${runId},supplier_id,supplier_product_id,supplier_sku,product,brand,size,country_origin,case_qty,case_price,unit_cost,ean,stock_qty,expiry,status,product_url
   FROM supplier_offers WHERE supplier_id=${supplierId} AND last_sync_run_id=${runId}`,
   tx`UPDATE supplier_offers SET is_active=false WHERE supplier_id=${supplierId} AND is_active=true AND last_sync_run_id IS DISTINCT FROM ${runId} AND (SELECT (metadata->>'deactivationAllowed')::boolean FROM supplier_sync_runs WHERE id=${runId})`,
   tx`UPDATE supplier_sync_runs SET status='success',offer_count=${cleanedOffers.length},completed_at=now() WHERE id=${runId} RETURNING metadata`
  ])
  return {runId,count:cleanedOffers.length,...results[results.length-1][0].metadata}
 }catch(e:any){
  try{await sql`UPDATE supplier_sync_runs SET status='failed',error_message=${e?.message||'Save failed'},completed_at=now() WHERE id=${runId}`}catch{ /* Preserve the original save error if failure logging is unavailable. */ }
  throw e
 }
}
