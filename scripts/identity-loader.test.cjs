const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const exportsObject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/identity-loader.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsObject});
const {loadIdentityWorkspace}=exportsObject;
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
const response=data=>({ok:true,json:async()=>data});
function callbacks(events){return {products:x=>events.push(['products',x]),identities:x=>events.push(['identities',x]),suggestions:x=>events.push(['suggestions',x]),error:(part,message)=>events.push(['error',part,message]),finished:part=>events.push(['finished',part])}}
test('product rows are delivered while both saved identities and matching are still pending',async()=>{
 const products=deferred(),identities=deferred(),suggestions=deferred(),events=[],started=[];
 const job=loadIdentityWorkspace(url=>{started.push(url);return url.endsWith('/catalogue')?products.promise:url.endsWith('/product-identity')?identities.promise:suggestions.promise},callbacks(events));
 assert.equal(started.length,3);products.resolve(response({ok:true,offers:[{product:'Coffee Crisp'}]}));await new Promise(r=>setImmediate(r));
 assert.equal(events[0][0],'products');assert.equal(events[0][1][0].product,'Coffee Crisp');assert.equal(events.some(e=>e[0]==='suggestions'),false);
 identities.resolve(response({ok:true,identities:[{ean:'0123'}]}));suggestions.resolve(response({ok:true,suggestions:[]}));await job;
 assert.equal(events.filter(e=>e[0]==='finished').length,3)
});
test('a failed matching scan cannot hide or discard successfully loaded products',async()=>{
 const events=[];await loadIdentityWorkspace(async url=>{if(url.endsWith('identity-suggestions'))throw Error('Matching unavailable');return response({ok:true,offers:[{product:'Saved product'}],identities:[]})},callbacks(events));
 assert.equal(events.find(e=>e[0]==='products')[1][0].product,'Saved product');assert.ok(events.some(e=>e[0]==='error'&&e[1]==='suggestions'));assert.ok(events.some(e=>e[0]==='finished'&&e[1]==='products'))
});
test('non-JSON or failed catalogue responses are reported with a finished loading state',async()=>{
 for(const failure of [{ok:false,json:async()=>({ok:false,error:'Catalogue unavailable'})},{ok:false,json:async()=>{throw Error('Not JSON')}}]){const events=[];await loadIdentityWorkspace(async url=>url.endsWith('/catalogue')?failure:response({ok:true,identities:[],suggestions:[]}),callbacks(events));assert.ok(events.some(e=>e[0]==='error'&&e[1]==='products'));assert.ok(events.some(e=>e[0]==='finished'&&e[1]==='products'));assert.equal(events.some(e=>e[0]==='products'),false)}
});
test('navigating away aborts UI updates from outstanding requests',async()=>{
 const pending=deferred(),events=[],controller=new AbortController();const job=loadIdentityWorkspace(()=>pending.promise,callbacks(events),controller.signal);controller.abort();pending.resolve(response({ok:true,offers:[],identities:[],suggestions:[]}));await job;assert.equal(events.length,0)
});
test('the first page is usable before the rest of the catalogue arrives',async()=>{
 const rest=deferred(),events=[];const job=loadIdentityWorkspace(url=>url.includes('offset=100')?rest.promise:Promise.resolve(response(url.endsWith('/catalogue')?{ok:true,offers:[{id:'first'}],hasMore:true,nextOffset:100}:{ok:true,identities:[],suggestions:[]})),callbacks(events));
 await new Promise(r=>setImmediate(r));assert.equal(events.find(e=>e[0]==='products')[1][0].id,'first');assert.equal(events.some(e=>e[0]==='finished'&&e[1]==='products'),false);
 rest.resolve(response({ok:true,offers:[{id:'later'}],hasMore:false,nextOffset:101}));await job;assert.equal(events.filter(e=>e[0]==='products').at(-1)[1].length,2)
});
test('a continuation failure retains the first page and reports an incomplete catalogue',async()=>{
 const events=[];await loadIdentityWorkspace(async url=>{if(url.includes('offset=100'))throw Error('Remaining catalogue unavailable');return response(url.endsWith('/catalogue')?{ok:true,offers:[{id:'first'}],hasMore:true,nextOffset:100}:{ok:true,identities:[],suggestions:[]})},callbacks(events));assert.equal(events.find(e=>e[0]==='products')[1][0].id,'first');assert.ok(events.some(e=>e[0]==='error'&&e[1]==='products'))
});
test('identity catalogue is one narrow query retaining manual/master precedence and active supplier scope',async()=>{
 const source=fs.readFileSync('app/api/product-identity/catalogue/route.ts','utf8');let query='';const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,require:n=>n==='next/server'?{NextResponse:{json:x=>x}}:n.endsWith('/db')?{getSql:()=>async strings=>{query=strings.join('?');return [{slug:'sweet-glory',supplier:'Sweet & Glory',supplier_product_id:'COFF002',product:'Coffee Crisp',ean:'0123456789012',asin:'B00535ZIY0',country_origin:'Canada'}]}}:{CATALOGUE_SLUGS:['sweet-glory']}});
 const result=await exports.GET();assert.equal(result.ok,true);assert.equal(result.offers[0].supplierProductId,'COFF002');assert.equal(result.offers[0].identity,'review');assert.ok(query.includes("COALESCE(NULLIF(m.ean,''),NULLIF(pi.ean,''),o.ean)"));assert.ok(query.includes('o.is_active=true'));assert.ok(query.includes('s.slug=ANY('));assert.equal(query.includes('o.tags'),false);assert.equal(query.includes('INSERT'),false)
});
