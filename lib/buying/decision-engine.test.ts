import {evaluateOpportunity,Input} from './decision-engine'
const base:Input={caseCost:48,caseQty:12,amazonPackQty:1,sellPrice:12,amazonFees:3,prepCost:.5,otherCost:.5,minRoiPercent:30,minProfit:2,identityConfirmed:true,feesConfirmed:true,marketConfirmed:true,vatBasisConfirmed:true}
const scenarios:[string,Partial<Input>,string][]=[
['profitable singles',{},'BUY'],
['overpriced supplier case',{caseCost:90},'NEGOTIATE'],
['negative unit economics',{caseCost:120},'WALK AWAY'],
['case to Amazon 3-pack',{caseCost:48,amazonPackQty:3,sellPrice:25,amazonFees:5,prepCost:1,otherCost:1},'BUY'],
['incomplete case conversion',{caseQty:10,amazonPackQty:3},'WALK AWAY'],
['unconfirmed product identity',{identityConfirmed:false},'WALK AWAY'],
['unconfirmed fees',{feesConfirmed:false},'WALK AWAY'],
['unconfirmed VAT basis',{vatBasisConfirmed:false},'WALK AWAY'],
['unconfirmed market',{marketConfirmed:false},'WALK AWAY'],
['zero pack quantity',{amazonPackQty:0},'WALK AWAY'],
['negative Amazon fee',{amazonFees:-2},'WALK AWAY'],
['NaN supplier cost',{caseCost:NaN},'WALK AWAY']
]
let failed=0;for(const [name,change,expected] of scenarios){const result=evaluateOpportunity({...base,...change});if(result.decision!==expected){failed++;console.error('FAIL',name,result,expected)}else console.log('PASS',name,result.decision)}if(failed)throw Error(failed+' buying scenarios failed')
