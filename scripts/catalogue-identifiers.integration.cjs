// Run only against the disposable catalogue-controls-test database branch.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
process.loadEnvFile('.env.local');
const {neon}=require('@neondatabase/serverless'),sql=neon(process.env.DATABASE_URL);
function load(file,imports){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>imports[name]||require(name),URL});return exports}
const controls=load('lib/catalogue-controls.ts',{}),route=load('app/api/product-identity/identifiers/route.ts',{'../../../../lib/db':{getSql:()=>sql},'../../../../lib/catalogue-controls':controls}),catalogue=load('app/api/suppliers/catalogue/route.ts',{'../../../../lib/db':{getSql:()=>sql}});
const patch=async body=>{const r=await route.PATCH({json:async()=>body});return {status:r.status,...await r.json()}};
(async()=>{
 assert.equal(new URL(process.env.DATABASE_URL).hostname,'ep-autumn-bird-aw7uym6x-pooler.c-12.us-east-1.aws.neon.tech','Fixture writes require the isolated catalogue-controls-test branch');
 const marker=await sql`SELECT current_database() name`;assert.ok(marker[0].name);
 const base={supplier:'The Catering Mart',supplierOfferId:'9224468955351-48422608928983'};
 let result=await patch({...base,ean:'043000200032'});assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.identity.ean,'043000200032');
 result=await patch({...base,asin:'B000SRHUNA'});assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.identity.ean,'043000200032');assert.equal(result.identity.asin,'B000SRHUNA');
 result=await patch({...base,ean:'043000200247'});assert.equal(result.identity.asin,'B000SRHUNA');
 const loaded=await (await catalogue.GET(new Request('http://localhost/api/suppliers/catalogue?supplier=catering-mart'))).json();const item=loaded.offers.find(x=>x.supplierProductId===base.supplierOfferId);assert.ok(item);assert.equal(item.ean,'043000200247');assert.equal(item.asin,'B000SRHUNA');
 result=await patch({...base,ean:'043000200033'});assert.equal(result.status,400);
 result=await patch({...base,supplierOfferId:'DOES-NOT-EXIST',asin:'B000SRHUNA'});assert.equal(result.status,404);
 const link=(await sql`SELECT l.*,m.asin FROM product_identity_offers l JOIN master_product_identities m ON m.id=l.identity_id WHERE l.match_status IN ('confirmed','verified') LIMIT 1`)[0];assert.ok(link);
 const mastersBefore=await sql`SELECT * FROM master_product_identities ORDER BY id`,linksBefore=await sql`SELECT * FROM product_identity_offers ORDER BY supplier,supplier_offer_id`;
 result=await patch({supplier:link.supplier,supplierOfferId:link.supplier_offer_id,asin:link.asin==='B000SRHUNA'?'B08KGQ6HZ6':'B000SRHUNA'});assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.identity.links_reviewed,1);
 const mastersAfter=await sql`SELECT * FROM master_product_identities ORDER BY id`,linksAfter=await sql`SELECT * FROM product_identity_offers ORDER BY supplier,supplier_offer_id`;
 assert.deepEqual(mastersBefore,mastersAfter);assert.deepEqual(linksBefore.filter(l=>!(l.supplier===link.supplier&&l.supplier_offer_id===link.supplier_offer_id)),linksAfter.filter(l=>!(l.supplier===link.supplier&&l.supplier_offer_id===link.supplier_offer_id)));assert.equal(linksAfter.find(l=>l.supplier===link.supplier&&l.supplier_offer_id===link.supplier_offer_id).match_status,'review');
 console.log('PASS: partial saves persist, catalogue reload agrees, invalid input rejected, only edited offer link reviewed; shared master untouched.');
})().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1)});
