// Public observations only; uses the DATABASE_URL explicitly supplied by the operator.
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
process.loadEnvFile(process.argv[2]||'.env.local');
const cache={};function load(file){if(cache[file])return cache[file];const exports={};cache[file]=exports;vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>n.startsWith('.')?load(path.join(path.dirname(file),n+'.ts')):require(n),process,Date,Number,Set,Map,URL,Request,Response,AbortSignal,fetch});return exports}
(async()=>{
 const pool=await load('lib/buying-pool.ts').loadBuyingPool(),route=load('app/api/buying-desk/research/route.ts'),queue=pool.products.filter(p=>p.available&&p.supplier==='Sweet & Glory'&&Number(p.offer?.casePrice)>0).filter(p=>{const sell=Number(p.amazon?.price),cogs=Number(p.offer.casePrice)*1.2/Math.floor(p.offer.caseQty/p.packQty);return !sell||sell-cogs-(sell<=10?.05:.15)*sell*1.224-.9-.5>=2}).sort((a,b)=>Number(b.amazon?.price||0)-Number(a.amazon?.price||0)).slice(0,50)
 let next=0,done=0,found=0,packages=0;const results=[]
 await Promise.all([0,1].map(async()=>{while(next<queue.length){const p=queue[next++],response=await route.POST({json:async()=>({asin:p.asin,supplier:p.supplier,offerId:p.offerId})}),d=await response.json();results.push({asin:p.asin,supplier:p.supplier,offerId:p.offerId,...d});if(d.amazon?.price)found++;if(d.amazon?.packaged?.lengthCm)packages++;console.log(JSON.stringify({done:++done,total:queue.length,asin:p.asin,saved:d.saved,price:d.amazon?.price,package:d.amazon?.packaged,note:d.amazon?.note}));}}))
 fs.writeFileSync('../workflow-research-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify({finished:true,checked:done,prices:found,packages}));process.exit(0)
})().catch(e=>{console.error(e.message);process.exit(1)})
