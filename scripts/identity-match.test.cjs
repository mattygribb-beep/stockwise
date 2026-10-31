const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file){const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:1,target:9}}).outputText,{exports:api,Set,URL,require:name=>name==='./product-parser'?load('lib/product-parser.ts'):load('lib/catalogue-controls.ts')});return api}
const {identityMatchScore:score}=load('lib/identity-match.ts');
const identity={product_name:'Jell-O Cherry 85g',brand:'Jell-O',size:'85g',ean:'043000200032'};
const offer={product:'Jell-O Cherry 12 x 85g',brand:'Jell-O',size:'85g',case_qty:12,ean:''};
test('supplier case is compared against the underlying identity in the correct direction',()=>{const result=score(offer,{...identity,ean:''},['Jell-O'],{});assert.equal(result.band,'STRONG');assert.ok(result.score>=95)});
test('equivalent UPC and zero-padded EAN values match after validating both check digits',()=>{for(const code of ['043000200032','0043000200032','00043000200032']){const result=score({...offer,ean:code},identity,['Jell-O'],{});assert.equal(result.band,'STRONG',code);assert.match(result.reason,/Exact valid EAN/)}});
test('a valid conflicting barcode blocks an otherwise identical name',()=>{const result=score({...offer,ean:'043000200247'},identity,['Jell-O'],{});assert.equal(result.band,'NO_MATCH');assert.equal(result.reason,'Barcode conflict')});
test('the same barcode never overrides a conflicting size',()=>{const result=score({...offer,size:'120g',product:'Jell-O Cherry 12 x 120g',ean:identity.ean},identity,['Jell-O'],{});assert.equal(result.band,'NO_MATCH');assert.match(result.reason,/size conflict/i)});
test('invalid equal barcodes do not earn exact-identifier confidence',()=>{const result=score({...offer,ean:'043000200033'},{...identity,ean:'043000200033'},['Jell-O'],{});assert.equal(result.band,'REVIEW');assert.equal(result.score,85);assert.match(result.reason,/invalid barcode/)});
test('a supplier case smaller than a known consumer multipack remains blocked',()=>{const result=score({...offer,case_qty:2,product:'Jell-O Cherry 85g'},{...identity,product_name:'Jell-O Cherry 85g Pack of 3',ean:''},['Jell-O'],{});assert.equal(result.band,'NO_MATCH');assert.match(result.reason,/case smaller/)});
test('known origin conflicts block a match but equivalent country names agree',()=>{
 assert.equal(score({...offer,country_origin:'Canada'},{...identity,country_origin:'USA'},['Jell-O'],{}).reason,'Country of origin conflict');
 assert.equal(score({...offer,country_origin:'United States'},{...identity,country_origin:'USA'},['Jell-O'],{}).band,'STRONG');
});
