const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/catalogue-loader.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:api,Promise,Error});
const suppliers=[{slug:'first',name:'First'},{slug:'failed',name:'Failed'},{slug:'last',name:'Last'}];
test('one failed catalogue keeps the successfully loaded suppliers and reports a supplier-specific error',async()=>{
 const events=[];const result=await api.loadSupplierCatalogues(suppliers,{onLoaded:c=>events.push(c.slug),request:async url=>url.includes('failed')?Response.json({ok:false,error:'Database unavailable'},{status:503}):Response.json({ok:true,offers:[{product:url}],lastSync:'2026-10-31T10:00:00Z'})});
 assert.deepEqual(Array.from(result.loaded,x=>x.slug),['first','last']);assert.equal(result.errors.failed,'Database unavailable');assert.equal(events.length,2);
});
test('valid empty catalogues are distinguished from HTML or invalid payload errors',async()=>{
 for(const response of [new Response('<html>Error</html>',{status:502}),Response.json({ok:true,offers:null})]){const result=await api.loadSupplierCatalogues(suppliers.slice(0,1),{request:async()=>response});assert.equal(result.loaded.length,0);assert.ok(result.errors.first)}
 const result=await api.loadSupplierCatalogues(suppliers.slice(0,1),{request:async()=>Response.json({ok:true,offers:[]})});assert.equal(result.loaded.length,1);assert.equal(result.loaded[0].offers.length,0);
});
test('unmounted catalogue requests cannot update the component',async()=>{
 const controller=new AbortController();controller.abort();let updates=0;
 await api.loadSupplierCatalogues(suppliers,{signal:controller.signal,onLoaded:()=>updates++,request:async()=>Response.json({ok:true,offers:[]})});assert.equal(updates,0);
});
