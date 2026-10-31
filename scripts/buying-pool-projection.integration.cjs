// Read-only equivalence check for narrower database reads.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript'),{execFileSync}=require('node:child_process');
assert.equal(new URL(process.env.DATABASE_URL).hostname,'ep-wispy-credit-aw7ucvns-pooler.c-12.us-east-1.aws.neon.tech');
const database=require('@neondatabase/serverless').neon(process.env.DATABASE_URL);
function load(file,sql,source,cache=new Map()){
 if(cache.has(file))return cache.get(file);const api={};cache.set(file,api);
 vm.runInNewContext(ts.transpileModule(source??fs.readFileSync(file,'utf8'),{compilerOptions:{module:1,target:9,resolveJsonModule:true}}).outputText,{exports:api,URL,Set,Map,Date,require:name=>name.endsWith('/db')?{getSql:()=>sql}:name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts',sql,undefined,cache):require(name)});return api;
}
(async()=>{
 const file=path.resolve('lib/buying-pool.ts'),baseline=execFileSync('git',['show','06523be:lib/buying-pool.ts'],{encoding:'utf8'}).replace('ORDER BY asin,last_scanned_at DESC',"ORDER BY asin,last_scanned_at DESC,CASE WHEN detail_status='captured' THEN 0 ELSE 1 END,seller_id");let before,oldBytes,newBytes;
 for(const [name,source] of [['baseline',baseline],['updated',undefined]]){
  let bytes=0;const sql=async(strings,...values)=>{const rows=await database(strings,...values);bytes+=Buffer.byteLength(JSON.stringify(rows));return rows};
  const start=Date.now(),result=await load(file,sql,source).loadBuyingPool(sql);console.log(JSON.stringify({name,bytes,ms:Date.now()-start,coverage:result.coverage}));
  assert.equal(result.products.find(p=>p.asin==='B0012NLMP6')?.packaged.weightG,180,'A captured package weight must win over a partial scan tied at the same timestamp');
  if(name==='baseline'){before=JSON.parse(JSON.stringify(result));oldBytes=bytes}else{for(const product of result.products){const old=before.products.find(p=>p.asin===product.asin&&p.supplier===product.supplier&&p.offerId===product.offerId);if(old&&JSON.stringify(old.packaged)!==JSON.stringify(product.packaged))console.log(JSON.stringify({packageDifference:product.asin,before:old.packaged,after:product.packaged}))}assert.deepEqual(JSON.parse(JSON.stringify(result)),before);newBytes=bytes}
 }
 assert.ok(newBytes<oldBytes);console.log(JSON.stringify({identicalResults:true,bytesSaved:oldBytes-newBytes,reductionPercent:Math.round((1-newBytes/oldBytes)*100)}));
})().catch(e=>{console.error(e);process.exitCode=1});
