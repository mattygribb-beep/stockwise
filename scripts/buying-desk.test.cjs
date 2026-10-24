const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const load=(file,req=()=>{throw Error('Unexpected import')})=>{const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:req,Date,Number,Set});return exports};
const desk=load('lib/buying-desk.ts'),legacy=load('lib/opportunity-economics.ts'),now=new Date('2026-10-24T12:00:00Z'),rules={roi:10,profit:1,margin:5,totalProfit:1,maxCapital:200,firstCapital:200,firstUnits:24};
function fixture(patch={}){return {caseQty:'12',packQty:'2',cases:'1',casePrice:'12',vatBasis:'ex',productVat:'20',sellerVat:'not_registered',mode:'FBM',sellPrice:'12',amazonFees:'2',delivery:'3',prep:'0.4',postage:'3',other:'0.2',evidence:Object.fromEntries(Object.keys(desk.EVIDENCE_LABELS).map(k=>[k,{status:'pass',checkedAt:'2026-10-24',source:'Checked test fixture'}])),...patch}}
test('cash model includes VAT, carriage, every fulfilment cost and no invented extra sales',()=>{
 const r=desk.assessBuy(fixture(),rules,100,now);assert.equal(r.decision,'PASSES RULES');assert.equal(r.metrics.sales,6);assert.ok(Math.abs(r.metrics.landed-17.4)<1e-9);assert.ok(Math.abs(r.metrics.cashRequired-39)<1e-9);assert.ok(Math.abs(r.metrics.profit-3.5)<1e-9);assert.ok(Math.abs(r.metrics.totalProfit-21)<1e-9);
});
test('unconfirmed VAT, blank fees, blank carriage and blank postage never pass',()=>{
 for(const patch of [{vatBasis:'unknown'},{sellerVat:'unknown'},{sellerVat:'registered'},{amazonFees:''},{amazonFees:'0'},{delivery:''},{postage:''},{prep:''},{other:''},{casePrice:'0'}])assert.equal(desk.assessBuy(fixture(patch),rules,100,now).decision,'NEEDS CHECKS');
});
test('explicit zero costs are accepted; zero ROI targets remain valid',()=>assert.equal(desk.assessBuy(fixture({delivery:'0',prep:'0',postage:'0',other:'0'}),{...rules,roi:0},100,now).decision,'PASSES RULES'));
test('fractional and negative packs or cases cannot manufacture sales',()=>{for(const patch of [{caseQty:'1.5'},{cases:'0'},{cases:'-1'},{packQty:'2.5'},{caseQty:'1',packQty:'2'}])assert.equal(desk.assessBuy(fixture(patch),rules,100,now).decision,'NEEDS CHECKS')});
test('leftovers have no invented resale value and all stock is charged',()=>{
 const r=desk.assessBuy(fixture({caseQty:'13',packQty:'2'}),rules,100,now);assert.equal(r.metrics.sales,6);assert.equal(r.metrics.leftover,1);assert.ok(Math.abs(r.metrics.cogs-2.9)<1e-9)
});
test('stale, future, impossible, failed and unsourced evidence block approval',()=>{
 for(const e of [{status:'pass',checkedAt:'2026-10-19',source:'ref'},{status:'pass',checkedAt:'2026-10-25',source:'ref'},{status:'pass',checkedAt:'2026-02-30',source:'ref'},{status:'fail',checkedAt:'2026-10-24',source:'ref'},{status:'pass',checkedAt:'2026-10-24',source:' '}]){
  const input=fixture();input.evidence.price=e;assert.equal(desk.assessBuy(input,rules,100,now).decision,'NEEDS CHECKS')
 }
});
test('missing eligibility and expiry are never inferred from matching confidence',()=>{for(const k of ['eligibility','expiry','identity']){const input=fixture();delete input.evidence[k];assert.equal(desk.assessBuy(input,rules,100,now).decision,'NEEDS CHECKS')}});
test('inactive sources and unsupported numbers cannot pass',()=>{for(const patch of [{sourceActive:false},{casePrice:'Infinity'},{casePrice:'-1'},{mode:'OTHER'}])assert.equal(desk.assessBuy(fixture(patch),rules,100,now).decision,'NEEDS CHECKS')});
test('FBA needs packaged dimensions; postage is not double charged',()=>{
 assert.equal(desk.assessBuy(fixture({mode:'FBA'}),rules,100,now).decision,'NEEDS CHECKS');
 const r=desk.assessBuy(fixture({mode:'FBA',weightG:'255',lengthCm:'20',widthCm:'15',heightCm:'5'}),rules,100,now);assert.equal(r.decision,'PASSES RULES');assert.ok(Math.abs(r.metrics.cashRequired-21)<1e-9)
});
test('budget includes fulfilment float, not stock alone',()=>assert.equal(desk.assessBuy(fixture(),rules,30,now).decision,'WALK AWAY'));
test('first-buy exposure cannot label an excessive order a test buy',()=>assert.equal(desk.assessBuy(fixture(),{...rules,firstUnits:5},100,now).decision,'REDUCE ORDER'));
test('financial failure produces a rejection even with all evidence complete',()=>assert.equal(desk.assessBuy(fixture({sellPrice:'4'}),rules,100,now).decision,'WALK AWAY'));
test('combined basket cannot overspend when each product individually fits',()=>{
 const r=desk.assessBasket([{key:'a',input:fixture()},{key:'b',input:fixture()}],rules,100,25,now);assert.equal(r.cashRequired,78);assert.equal(r.ready,false);assert.ok(r.issues.some(x=>x.includes('Combined')))
});
test('a valid basket keeps its reserve and shows a price-drop stress case',()=>{
 const r=desk.assessBasket([{key:'a',input:fixture()}],rules,100,25,now);assert.equal(r.ready,true);assert.equal(r.remaining,36);assert.ok(Math.abs(r.results[0].metrics.stressProfit-13.8)<1e-9)
});
test('duplicates, empty basket, negative reserve and invalid buying rules do not pass',()=>{
 assert.equal(desk.assessBasket([],rules,100,25,now).ready,false);assert.equal(desk.assessBasket([{key:'a',input:fixture()},{key:'a',input:fixture()}],rules,200,25,now).ready,false);assert.equal(desk.assessBasket([{key:'a',input:fixture()}],rules,100,-1,now).ready,false);assert.equal(desk.assessBuy(fixture(),{...rules,profit:NaN},100,now).decision,'NEEDS CHECKS')
});
test('legacy workspace cannot approve a purchase without the complete Buying Desk checks',()=>{
 const e=legacy.calculateEconomics({caseQty:12,caseCost:12,amazonPackQty:1,sellPrice:20,feesPerSale:0});const r=legacy.buyingDecision(e,rules,{identityVerified:true,demandChecked:true,competitionChecked:true});assert.equal(r.ready,false);assert.equal(r.decision,'CONSIDER');assert.ok(r.reasons.includes('Add checked Amazon fees'))
});
test('live-data route returns exactly ten paired candidates and excludes inactive/hidden records in its query',async()=>{
 const {BUYING_COHORT}=load('lib/buying-cohort.ts');assert.equal(BUYING_COHORT.length,10);assert.equal(new Set(BUYING_COHORT.map(x=>x.asin)).size,10);
 const queries=[];const sql=async(strings,...values)=>{const q=strings.join('?');queries.push(q);if(q.includes('amazon_catalogue_candidates'))return BUYING_COHORT.map(x=>({asin:x.asin,title:x.asin,observed_price:'9.99'}));return BUYING_COHORT.map(x=>({supplier:x.supplier,supplier_product_id:x.offerId,product:x.offerId,case_qty:12,case_price:'10',stock_qty:4}))};
 const route=load('app/api/buying-desk/route.ts',name=>name==='next/server'?{NextResponse:{json:x=>x}}:name.endsWith('/db')?{getSql:()=>sql}:{BUYING_COHORT});
 const r=await route.GET();assert.equal(r.ok,true);assert.equal(r.products.length,10);assert.ok(r.products.every(x=>x.available));assert.ok(queries.every(q=>!q.includes('INSERT')));assert.ok(queries[0].includes("match_status<>'hidden'"));assert.ok(queries[1].includes('o.is_active=true'))
});
test('database failure produces a visible API error rather than an empty successful basket',async()=>{
 const route=load('app/api/buying-desk/route.ts',name=>name==='next/server'?{NextResponse:{json:(x,o)=>({...x,status:o?.status})}}:name.endsWith('/db')?{getSql:()=>()=>{throw Error('DB unavailable')}}:{BUYING_COHORT:[]});const r=await route.GET();assert.equal(r.ok,false);assert.equal(r.status,500)
});
