const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function collector(slug,request,save){const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/suppliers/'+slug+'/route.ts','utf8'),{compilerOptions:{module:1,target:9}}).outputText,{exports:api,Set,Map,Date,fetch:request,require:name=>name==='next/server'?{NextResponse:{json:Response.json}}:name.endsWith('/catalogue-store')?{saveSupplierCatalogue:save}:{cleanProductTitle:s=>s}});return api}
const product=id=>({id,title:'Candy 100g',handle:'candy-'+id,vendor:'Candy brand',variants:[{sku:String(id),price:'12.00',available:true}]});
for(const slug of ['stateside','kings-candy','candy-cargo']){
 test(slug+': schema errors or repeated pages never reach catalogue save',async()=>{
  for(const body of [{error:'upstream format changed'},{products:Array.from({length:250},(_,i)=>product(i))}]){
   let saves=0;const result=await collector(slug,async()=>Response.json(body),async()=>saves++).GET();assert.equal(result.status,500);assert.equal(saves,0);
  }
 });
 test(slug+': normal terminal page proves coverage but hitting the page cap does not',async()=>{
  let options;await collector(slug,async()=>Response.json({products:Array.from({length:100},(_,i)=>product(i))}),async(_s,_o,_m,o)=>options=o).GET();assert.equal(options.coverage.complete,true);assert.equal(options.coverage.pagesFetched,1);
  let page=0;await collector(slug,async()=>Response.json({products:Array.from({length:250},(_,i)=>product(++page*1000+i))}),async(_s,_o,_m,o)=>options=o).GET();assert.equal(options.coverage.complete,false);assert.equal(options.coverage.termination,undefined);
 });
}
test('Sweet & Glory cannot silently save a scan when a brand page fails',async()=>{
 let saves=0;const api=collector('sweet-glory',async url=>url.endsWith('/')?new Response('<a href="/brands/jello-wholesale-uk">Jello</a>'):new Response('Unavailable',{status:503}),async()=>saves++);
 assert.equal((await api.GET()).status,500);assert.equal(saves,0);
});
