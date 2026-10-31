const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('lib/buying-pool-client.ts','utf8'),{compilerOptions:{module:1,target:9}}).outputText;
test('settings detours reuse public data, concurrent loads deduplicate, reload explicitly refreshes',async()=>{const exports={};let calls=0,clock=1000;const scope={exports,Date:{now:()=>clock},Promise,fetch:async()=>{calls++;return {ok:true,json:async()=>({ok:true,products:[{asin:'B00535ZIY0'}],coverage:{},blocked:[]})}}};vm.runInNewContext(source,scope);const a=exports.readBuyingPool(),b=exports.readBuyingPool();assert.equal(a,b);await a;await exports.readBuyingPool();assert.equal(calls,1);await exports.readBuyingPool(true);assert.equal(calls,2);clock+=60001;await exports.readBuyingPool();assert.equal(calls,3)});
test('failed loads are retriable and never become a cached success',async()=>{const exports={};let calls=0;vm.runInNewContext(source,{exports,Date,Promise,fetch:async()=>{calls++;return {ok:calls>1,json:async()=>calls>1?{ok:true,products:[],coverage:{}}:{ok:false,error:'Temporary failure'}}}});await assert.rejects(exports.readBuyingPool(),/Temporary failure/);await exports.readBuyingPool();assert.equal(calls,2)});
test('catalogue edits invalidate old data even when an earlier request is still running',async()=>{
 const api={},requests=[];vm.runInNewContext(source,{exports:api,Date,Promise,fetch:()=>new Promise(resolve=>requests.push(resolve))});
 const old=api.readBuyingPool();api.invalidateBuyingPool();const current=api.readBuyingPool();assert.equal(requests.length,2);
 requests[1]({ok:true,json:async()=>({ok:true,products:[{asin:'CURRENT'}],coverage:{}})});await current;
 requests[0]({ok:true,json:async()=>({ok:true,products:[{asin:'STALE'}],coverage:{}})});await old;
 const cached=await api.readBuyingPool();assert.equal(cached.products[0].asin,'CURRENT');assert.equal(requests.length,2);
});
