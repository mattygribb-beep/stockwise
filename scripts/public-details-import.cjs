// Generate insert-only SQL from the dated public-page recovery export.
// Do not infer seller prices, sell-pack quantities, dimensions or unit sizes.
const fs=require('node:fs');
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const validCode=s=>/^\d{12,13}$/.test(s)&&[...s.slice(0,-1)].reverse().reduce((sum,n,i)=>sum+Number(n)*(i%2?1:3),0)%10===(10-Number(s.at(-1)))%10;
const rows=input.filter(r=>!r.error&&/^[A-Z0-9]{10}$/.test(r.asin)&&r.source_url==='https://www.amazon.co.uk/dp/'+r.asin).map(r=>({seller_id:r.seller_id,asin:r.asin,title:r.captured_title,brand:r.brand,ean:validCode(r.ean)?r.ean:null,upc:validCode(r.upc)?r.upc:null,model:r.model,captured_at:r.captured_at,source_url:r.source_url,raw_facts:{recovery:'public_amazon_product_page',captured_at:r.captured_at,source_url:r.source_url,extraction:'labelled_table_facts_only',facts:r.facts,seller_price_captured:false,pack_quantity_verified:false}}));
const literal=JSON.stringify(rows).replace(/'/g,"''");
const sql=`WITH recovered AS (INSERT INTO storefront_product_details(seller_id,asin,title,brand,ean,upc,model,raw_facts,detail_status,last_scanned_at,source_url)
 SELECT r.seller_id,r.asin,r.title,r.brand,r.ean,r.upc,r.model,r.raw_facts,'partial',r.captured_at,r.source_url
 FROM jsonb_to_recordset('${literal}'::jsonb) r(seller_id text,asin text,title text,brand text,ean text,upc text,model text,raw_facts jsonb,captured_at timestamptz,source_url text)
 JOIN storefront_scout_catalogue c ON c.seller_id=r.seller_id AND c.asin=r.asin
 ON CONFLICT(seller_id,asin) DO NOTHING RETURNING asin) SELECT count(*) public_details_recovered FROM recovered;`;
fs.writeFileSync(process.argv[3],sql+'\n');console.log(JSON.stringify({eligible:rows.length,output:process.argv[3]}));
