const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const host=new URL(process.env.DATABASE_URL).hostname;
assert.equal(host,'ep-wispy-credit-aw7ucvns-pooler.c-12.us-east-1.aws.neon.tech','Lifecycle fixtures require the isolated 20261031 sync branch');
const sql=require('@neondatabase/serverless').neon(process.env.DATABASE_URL);
function load(file){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:name=>name==='./db'?{getSql:()=>sql}:name==='./catalogue-safety'?load('lib/catalogue-safety.ts'):name==='./product-parser'?load('lib/product-parser.ts'):require(name),console,Set,Map,Date});return module.exports}
const {saveSupplierCatalogue:save}=load('lib/catalogue-store.ts');
const full={coverage:{complete:true,scope:'catalogue',pagesFetched:1,termination:'short-page'}};
const offer=(id,extra={})=>({supplierProductId:id,product:'Jell-O Cherry '+id,caseQty:12,casePrice:12,unitCost:1,ean:'',...extra});
test('catalogue lifecycle is atomic and protects history',async t=>{
 const slug='lifecycle-fixture-'+Date.now();
 const [{id:supplierId}]=await sql`INSERT INTO suppliers(slug,name,website) VALUES(${slug},${slug},'https://example.invalid') RETURNING id`;
 const rows=()=>sql`SELECT * FROM supplier_offers WHERE supplier_id=${supplierId} ORDER BY supplier_product_id`;
 await t.test('zero, missing and duplicate identifiers are rejected before a save',async()=>{
  await assert.rejects(save(slug,[]),/zero product offers/);
  await assert.rejects(save(slug,[offer('')]),/identifier is missing/);
  await assert.rejects(save(slug,[offer('a'),offer('a')]),/Duplicate/);
  assert.equal((await rows()).length,0);
 });
 await t.test('first complete scan records new products',async()=>{
  const result=await save(slug,['a','b','c','d'].map(x=>offer(x)),{},full);
  assert.equal(result.changeCounts.new,4);assert.equal(result.deactivationAllowed,true);
  assert.equal((await rows()).length,4);
 });
 await t.test('partial scans retain unseen products and preserve verified brand and barcode',async()=>{
  await sql`UPDATE supplier_offers SET ean='043000200032',brand='Verified brand',brand_status='verified' WHERE supplier_id=${supplierId} AND supplier_product_id='a'`;
  const result=await save(slug,[offer('a',{brand:'Scraped brand',casePrice:18,unitCost:1.5})]);
  assert.equal(result.deactivationAllowed,false);assert.equal(result.changeCounts.price,1);
  const all=await rows();assert.equal(all.filter(x=>x.is_active).length,4);
  assert.equal(all[0].brand,'Verified brand');assert.equal(all[0].ean,'043000200032');
  const [snapshot]=await sql`SELECT ean,brand FROM supplier_offer_snapshots WHERE sync_run_id=${result.runId}`;
  assert.equal(snapshot.ean,'043000200032');assert.equal(snapshot.brand,'Verified brand');
 });
 await t.test('completed scans deactivate modest omissions without deleting their history',async()=>{
  const result=await save(slug,['a','b','c'].map(x=>offer(x)),{},full);
  assert.equal(result.deactivationAllowed,true);assert.equal(result.changeCounts.unavailable,1);
  const all=await rows();assert.equal(all.length,4);assert.equal(all[3].is_active,false);
 });
 await t.test('large catalogue shrink is retained for review',async()=>{
  const result=await save(slug,[offer('a')],{},full);
  assert.equal(result.deactivationAllowed,false);assert.match(result.protectionReason,/25%/);
  assert.equal((await rows()).filter(x=>x.is_active).length,3);
 });
 await t.test('returning offers keep their row and record pack and price changes',async()=>{
  const before=(await rows())[3];const result=await save(slug,[offer('d',{caseQty:24,casePrice:36,unitCost:1.5})]);
  const after=(await rows())[3];assert.equal(after.id,before.id);assert.equal(String(after.first_seen_at),String(before.first_seen_at));
  assert.equal(after.is_active,true);assert.equal(result.changeCounts.returned,1);assert.equal(result.changeCounts.pack,1);assert.equal(result.changeCounts.price,1);
 });
 await t.test('snapshot failure rolls back offers, changes and completion together',async()=>{
  await sql`CREATE OR REPLACE FUNCTION lifecycle_fixture_reject_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.product='LIFECYCLE_SNAPSHOT_FAILURE' THEN RAISE EXCEPTION 'fixture snapshot failure'; END IF; RETURN NEW; END $$`;
  await sql`CREATE TRIGGER lifecycle_fixture_reject_snapshot BEFORE INSERT ON supplier_offer_snapshots FOR EACH ROW EXECUTE FUNCTION lifecycle_fixture_reject_snapshot()`;
  try{
   const before=await rows();
   await assert.rejects(save(slug,[offer('a',{product:'LIFECYCLE_SNAPSHOT_FAILURE',casePrice:999,unitCost:83.25})]),/fixture snapshot failure/);
   assert.deepEqual(await rows(),before);
   const [run]=await sql`SELECT status,metadata FROM supplier_sync_runs WHERE supplier_id=${supplierId} ORDER BY id DESC LIMIT 1`;
   assert.equal(run.status,'failed');assert.equal(run.metadata.changeCounts,undefined);
  }finally{await sql`DROP TRIGGER lifecycle_fixture_reject_snapshot ON supplier_offer_snapshots`;await sql`DROP FUNCTION lifecycle_fixture_reject_snapshot()`}
 });
 await t.test('explicit preserve option overrides complete coverage',async()=>{
  const result=await save(slug,[offer('a')],{}, {...full,deactivateMissing:false});
  assert.equal(result.deactivationAllowed,false);assert.equal((await rows()).filter(x=>x.is_active).length,4);
 });
 await t.test('simultaneous saves serialize per supplier and both retain their snapshots',async()=>{
  const results=await Promise.all([save(slug,[offer('a',{casePrice:24,unitCost:2})]),save(slug,[offer('a',{casePrice:36,unitCost:3})])]);
  assert.equal(results.length,2);
  for(const r of results){const [count]=await sql`SELECT count(*)::int AS n FROM supplier_offer_snapshots WHERE sync_run_id=${r.runId}`;assert.equal(count.n,1)}
 });
});
