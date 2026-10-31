const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
assert.equal(new URL(process.env.DATABASE_URL).hostname,'ep-wispy-credit-aw7ucvns-pooler.c-12.us-east-1.aws.neon.tech','Only use the isolated sync branch');
const sql=require('@neondatabase/serverless').neon(process.env.DATABASE_URL);
function load(file){const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:1,target:9}}).outputText,{exports:api,URL,Set,Map,Date,require:name=>name==='next/server'?require(name):name.endsWith('/db')?{getSql:()=>sql}:name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name)});return api}
const {saveSupplierCatalogue}=load(path.resolve('lib/catalogue-store.ts')),route=load(path.resolve('app/api/suppliers/changes/route.ts'));
const get=async q=>{const response=await route.GET(new Request('https://example.invalid/api/suppliers/changes?'+q));return {status:response.status,body:await response.json()}};
test('supplier changes endpoint follows saved changes and scopes every run to its supplier',async t=>{
 let runId;
 await t.test('invalid supplier and malformed run fail before querying',async()=>{
  for(const q of ['supplier=unknown','supplier=stateside&run=-1','supplier=stateside&run=1.2','supplier=stateside&run=NaN'])assert.equal((await get(q)).status,400);
 });
 await t.test('known supplier has history even when its last scan predates tracking',async()=>{
  const result=await get('supplier=stateside');assert.equal(result.status,200);assert.ok(result.body.overview.active>0);assert.ok(result.body.runs.length>0);
 });
 await t.test('price events and retained unseen offers flow through the API',async()=>{
  const [o]=await sql`SELECT o.* FROM supplier_offers o JOIN suppliers s ON s.id=o.supplier_id WHERE s.slug='stateside' AND o.is_active ORDER BY o.id LIMIT 1`;
  const casePrice=Number(o.case_price)+1;
  const saved=await saveSupplierCatalogue('stateside',[{supplierProductId:o.supplier_product_id,product:o.product,brand:o.brand,size:o.size,caseQty:o.case_qty,casePrice,unitCost:casePrice/o.case_qty,status:o.status,url:o.product_url,ean:o.ean,source:'Isolated verification fixture'}]);
  runId=saved.runId;
  const result=await get('supplier=stateside&run='+runId);assert.equal(result.status,200);const run=result.body.selectedRun;
  assert.equal(run.tracked,true);assert.equal(run.counts.price,1);assert.equal(run.total,1);assert.ok(run.missingRetained>0);assert.equal(Number(run.changes[0].case_price),casePrice);
 });
 await t.test('another supplier cannot retrieve the selected run',async()=>{assert.equal((await get('supplier=candy-cargo&run='+runId)).status,404)});
});
