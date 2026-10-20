/**
 * Conservative, VAT-explicit sourcing calculator.
 * All prices/costs supplied here must use a consistent VAT basis.
 * No automated BUY without confirmed identity, market data and unit economics.
 */
export type Decision='BUY'|'NEGOTIATE'|'WALK AWAY'
export type Input={
 caseCost:number;caseQty:number;amazonPackQty:number;sellPrice:number;
 amazonFees:number;prepCost:number;otherCost:number;
 minRoiPercent?:number;minProfit?:number;
 identityConfirmed:boolean;feesConfirmed:boolean;marketConfirmed:boolean;
 priceIncludesVat?:boolean;vatBasisConfirmed:boolean;
}
const money=(n:number)=>Math.round((n+Number.EPSILON)*100)/100
export function evaluateOpportunity(x:Input){
 const blockers:string[]=[]
 const values=[x.caseCost,x.caseQty,x.amazonPackQty,x.sellPrice,x.amazonFees,x.prepCost,x.otherCost]
 if(values.some(v=>!Number.isFinite(v)))blockers.push('INVALID_NUMBER')
 if(x.caseCost<0||x.sellPrice<=0||x.amazonFees<0||x.prepCost<0||x.otherCost<0)blockers.push('INVALID_COST')
 if(!Number.isSafeInteger(x.caseQty)||x.caseQty<=0||!Number.isSafeInteger(x.amazonPackQty)||x.amazonPackQty<=0)blockers.push('INVALID_PACK_QUANTITY')
 if(!x.vatBasisConfirmed)blockers.push('VAT_BASIS_UNCONFIRMED')
 if(!x.identityConfirmed)blockers.push('PRODUCT_IDENTITY_UNCONFIRMED')
 if(!x.feesConfirmed)blockers.push('AMAZON_FEES_UNCONFIRMED')
 if(!x.marketConfirmed)blockers.push('MARKET_UNCONFIRMED')
 if(blockers.some(b=>b.startsWith('INVALID')))return {decision:'WALK AWAY' as Decision,blockers,profitPerSale:null,roiPercent:null,marginPercent:null,maxBuyCaseCost:null,caseProfit:null,explanation:'Invalid inputs; do not purchase'}
 const unitsPerCase=x.caseQty/x.amazonPackQty
 if(!Number.isInteger(unitsPerCase)){blockers.push('INCOMPLETE_SELLABLE_PACKS');return {decision:'WALK AWAY' as Decision,blockers,profitPerSale:null,roiPercent:null,marginPercent:null,maxBuyCaseCost:null,caseProfit:null,explanation:'Case quantity cannot be converted into whole Amazon sellable packs'}
 const costPerSale=x.caseCost/unitsPerCase
 const expenses=x.amazonFees+x.prepCost+x.otherCost
 const profit=x.sellPrice-expenses-costPerSale
 const roi=costPerSale>0?100*profit/costPerSale:null
 const margin=100*profit/x.sellPrice
 const minRoi=x.minRoiPercent??30,minProfit=x.minProfit??2
 if(!Number.isFinite(minRoi)||!Number.isFinite(minProfit)||minRoi<0||minProfit<0){blockers.push('INVALID_TARGET');return {decision:'WALK AWAY' as Decision,blockers,profitPerSale:null,roiPercent:null,marginPercent:null,maxBuyCaseCost:null,caseProfit:null,explanation:'Invalid buying targets'}}
 const revenueAfterFees=x.sellPrice-expenses
 const maxCostPerSale=Math.max(0,Math.min(revenueAfterFees-minProfit,revenueAfterFees/(1+minRoi/100)))
 const maxBuyCaseCost=money(maxCostPerSale*unitsPerCase)
 const meetsProfit=profit>=minProfit,meetsRoi=roi!==null&&roi>=minRoi
 const decision:Decision=blockers.length?'WALK AWAY':profit<=0?'WALK AWAY':meetsProfit&&meetsRoi?'BUY':maxBuyCaseCost>0?'NEGOTIATE':'WALK AWAY'
 return {decision,blockers,unitsPerCase,costPerSale:money(costPerSale),profitPerSale:money(profit),roiPercent:roi===null?null:money(roi),marginPercent:money(margin),caseProfit:money(profit*unitsPerCase),maxBuyCaseCost,explanation:blockers.length?'Insufficient verified evidence: purchase blocked':decision==='BUY'?'Targets met with verified inputs':decision==='NEGOTIATE'?'Lower supplier case cost required':'Unprofitable or no viable buying price'}
}
