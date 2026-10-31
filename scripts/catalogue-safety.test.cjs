const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/catalogue-safety.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:api});
const full={complete:true,scope:'catalogue',pagesFetched:2,termination:'short-page'};
test('only evidenced complete scans may deactivate unseen offers',()=>{
 assert.equal(api.canDeactivateMissing(full),true);
 for(const coverage of [undefined,{...full,complete:false},{...full,scope:'partial'},{...full,pagesFetched:0},{...full,pagesFetched:1.5},{...full,failedPages:1},{...full,termination:undefined},{...full,termination:'last-page',expectedPages:3}])assert.equal(api.canDeactivateMissing(coverage),false);
 assert.equal(api.canDeactivateMissing({...full,termination:'last-page',expectedPages:2}),true);
 assert.equal(api.canDeactivateMissing(full,false),false);
});
