// Fixture writes are restricted to the isolated buying-workflow branch.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
process.loadEnvFile('.env.local');
assert.equal(new URL(process.env.DATABASE_URL).hostname,'ep-flat-truth-aw2e5yqu-pooler.c-12.us-east-1.aws.neon.tech','Use the isolated buying-workflow branch');
const sql=require('@neondatabase/serverless').neon(process.env.DATABASE_URL),exportsObject={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/buying-observations.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsObject,require:()=>({getSql:()=>sql})});
const p={asin:'ZTEST00001',supplier:'Fixture supplier',offerId:'test-'+Date.now(),identitySignature:'identity-1'},at='2026-10-01T12:00:00Z',obs=(status,checkedAt,extra={})=>({status,checkedAt,url:'https://example.test/',note:'Fixture',...extra}),read=async()=>(await sql`SELECT * FROM buying_public_observations WHERE asin=${p.asin} AND supplier=${p.supplier} AND supplier_offer_id=${p.offerId}`)[0];
(async()=>{
 await exportsObject.saveBuyingObservation(p,{checkedAt:at,amazon:obs('found',at,{price:10}),supplier:obs('found',at,{price:5,caseQty:12})},sql);
 const later='2026-10-02T12:00:00Z';await exportsObject.saveBuyingObservation(p,{checkedAt:later,amazon:obs('unavailable',later),supplier:obs('unavailable',later)},sql);let row=await read();assert.equal(row.amazon.price,10);assert.equal(row.amazon.priceCheckedAt,at);assert.equal(row.latest_attempt.checkedAt,later);
 const measured='2026-10-03T12:00:00Z';await exportsObject.saveBuyingObservation(p,{checkedAt:measured,amazon:obs('found',measured,{packaged:{weightG:200,lengthCm:20,widthCm:10,heightCm:2},packageCheckedAt:measured}),supplier:obs('unavailable',measured)},sql);row=await read();assert.equal(row.amazon.price,10);assert.equal(row.amazon.priceCheckedAt,at);assert.equal(row.amazon.packageCheckedAt,measured);
 await exportsObject.saveBuyingObservation(p,{checkedAt:later,amazon:obs('found',later,{price:999}),supplier:obs('unavailable',later)},sql);row=await read();assert.equal(row.amazon.price,10);assert.equal(row.checked_at.toISOString?.()||String(row.checked_at),'2026-10-03T12:00:00.000Z');
 const changed='2026-10-04T12:00:00Z';await exportsObject.saveBuyingObservation({...p,identitySignature:'identity-2'},{checkedAt:changed,amazon:obs('unavailable',changed),supplier:obs('unavailable',changed)},sql);row=await read();assert.equal(row.amazon,null);assert.equal(row.supplier_observation,null);
 console.log('PASS: shared observations survive reload, failed checks preserve original price dates, package-only updates do not refresh old prices, old replies cannot overwrite newer data, changed identities discard previous observations.');process.exit(0)
})().catch(e=>{console.error(e.message);process.exit(1)});
