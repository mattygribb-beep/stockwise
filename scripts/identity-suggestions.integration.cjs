// Read-only comparison on the isolated copy. Never auto-confirm suggestions.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript'),{execFileSync}=require('node:child_process');
assert.equal(new URL(process.env.DATABASE_URL).hostname,'ep-wispy-credit-aw7ucvns-pooler.c-12.us-east-1.aws.neon.tech');
const sql=require('@neondatabase/serverless').neon(process.env.DATABASE_URL);
function load(file,source){const api={};vm.runInNewContext(ts.transpileModule(source??fs.readFileSync(file,'utf8'),{compilerOptions:{module:1,target:9}}).outputText,{exports:api,URL,Set,Map,Date,require:name=>name==='next/server'?require(name):name.endsWith('/db')?{getSql:()=>sql}:name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name)});return api}
(async()=>{
 const file=path.resolve('app/api/identity-suggestions/route.ts'),originalSource=execFileSync('git',['show','06523be:app/api/identity-suggestions/route.ts'],{encoding:'utf8'}),oldSource="import {CATALOGUE_SLUGS} from '../../../lib/suppliers'\n"+originalSource.replace('WHERE o.is_active=true AND l.supplier_offer_id', 'WHERE o.is_active=true AND s.slug=ANY(${CATALOGUE_SLUGS}::text[]) AND l.supplier_offer_id');
 for(const [name,source] of [['baseline',oldSource],['updated',undefined]]){
  const started=Date.now(),response=await load(file,source).GET(),data=await response.json();assert.equal(response.status,200,JSON.stringify(data));
  console.log(JSON.stringify({name,unlinked:data.unlinkedOffers,suggestions:data.suggestions.length,strong:data.strongCount,review:data.reviewCount,newProducts:data.newCount,ms:Date.now()-started}));
  if(name==='updated'){assert.equal(data.suggestions.length,data.strongCount+data.reviewCount);assert.ok(data.unlinkedOffers>=2000)}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
