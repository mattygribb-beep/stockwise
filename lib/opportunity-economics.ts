export type EconomicsInput={
 caseQty:number; caseCost:number; amazonPackQty:number; sellPrice:number; feesPerSale:number;
 prepPerSale?:number; otherCostPerSale?:number; vatMode?:'not_registered'|'registered'|'unknown'; supplierPriceBasis?:'INC VAT'|'EX VAT'|'UNKNOWN'
}
export function calculateEconomics(i:EconomicsInput){
 const caseQty=Math.max(1,Number(i.caseQty)||1),pack=Math.max(1,Number(i.amazonPackQty)||1),caseCost=Math.max(0,Number(i.caseCost)||0)
 const yieldCount=Math.floor(caseQty/pack),leftover=caseQty%pack,unitCost=caseCost/caseQty,cogs=unitCost*pack
 const sell=Math.max(0,Number(i.sellPrice)||0),costs=Math.max(0,Number(i.feesPerSale)||0)+Math.max(0,Number(i.prepPerSale)||0)+Math.max(0,Number(i.otherCostPerSale)||0)
 const profit=sell-cogs-costs,roi=cogs>0?profit/cogs*100:0,margin=sell>0?profit/sell*100:0,caseProfit=profit*yieldCount
 const breakEven=cogs+costs
 return {caseQty,amazonPackQty:pack,yield:yieldCount,leftover,unitCost,cogs,sellPrice:sell,costs,profit,roi,margin,caseProfit,capitalRequired:caseCost,breakEven}
}
export function buyingDecision(e:ReturnType<typeof calculateEconomics>,rules:any,evidence:{identityVerified:boolean;demandChecked:boolean;competitionChecked:boolean},context:{budgetAvailable?:number;existingCapitalOnProduct?:number}={}){
 const reasons:string[]=[]
 if(!evidence.identityVerified)reasons.push('Verify the exact Amazon product and pack')
 if(!e.sellPrice)reasons.push('Add a checked selling price')
 if(!evidence.demandChecked)reasons.push('Check demand')
 if(!evidence.competitionChecked)reasons.push('Check competition')
 if(e.amazonPackQty>e.caseQty)reasons.push('Amazon sell pack is larger than the supplier case')
 if(e.yield<1)reasons.push('Supplier case cannot make one complete Amazon sell pack')
 if(reasons.length)return {decision:'CONSIDER',reasons,ready:false}
 if(e.profit<=0||e.roi<Number(rules.roi||0)||e.margin<Number(rules.margin||0))return {decision:'WALK AWAY',reasons:['Return falls below a configured buying rule'],ready:true}
 const productCapital=e.capitalRequired+Math.max(0,Number(context.existingCapitalOnProduct)||0)
 if(productCapital>Number(rules.maxCapital||Infinity))return {decision:'WALK AWAY',reasons:['Capital required exceeds the configured maximum per product'],ready:true}
 if(Number.isFinite(Number(context.budgetAvailable))&&e.capitalRequired>Number(context.budgetAvailable))return {decision:'WALK AWAY',reasons:['Capital required exceeds the available buying budget'],ready:true}
 if(e.profit>=Number(rules.profit||0)&&e.caseProfit>=Number(rules.totalProfit||0)){
  const test=e.capitalRequired>Number(rules.firstCapital||Infinity)||e.yield>Number(rules.firstUnits||Infinity)
  return {decision:test?'TEST BUY':'BUY',reasons:[test?'Economics pass but first-buy exposure is high':'Economics and evidence pass configured rules'],ready:true}
 }
 return {decision:'CONSIDER',reasons:['Economics are positive but not all configured targets pass'],ready:true}
}
