import {assistantReview,AssistantProduct,AssistantRecord,CostAssumptions,futureExpiry} from './buying-assistant'
import {BuyingRules} from './buying-desk'
export const productKey=(p:AssistantProduct)=>p.asin+'|'+p.supplier+'|'+p.offerId
type Review=ReturnType<typeof assistantReview>
export type BudgetOption={p:AssistantProduct;key:string;cases:number;review:Review;affordable:boolean;financialPass:boolean;current:boolean;maxCasePrice:number|null;reasons:string[]}
const fresh=(value:string|undefined,days:number,now:Date)=>{const age=now.getTime()-Date.parse(value||'');return Number.isFinite(age)&&age>=0&&age<=days*86400000}
// Alternatives, not a combined basket. Reserve all fulfilment cash before payouts.
export function budgetShortlist(products:AssistantProduct[],records:Record<string,AssistantRecord>,costs:CostAssumptions,rules:BuyingRules,budget:number,reserve:number,now=new Date()){
 const valid=Number.isFinite(budget)&&budget>0&&Number.isFinite(reserve)&&reserve>=0&&reserve<=budget&&Object.values(rules).every(v=>Number.isFinite(v)&&v>=0),available=valid?budget-reserve:0
 const options:BudgetOption[]=[],missing:AssistantProduct[]=[]
 for(const p of products){
  const key=productKey(p),record=records[key]||{},initial=assistantReview(p,{...record,cases:'1'},costs,rules,available,now),stock=initial.supplier?.stock??p.offer?.stock
  if(!initial.metrics||!initial.sourceActive){missing.push(p);continue}
  const input=initial.input,vat=input.vatBasis==='ex'?1+Number(input.productVat)/100:1,perCase=initial.metrics.sales,unitCash=initial.metrics.cashRequired-Number(input.delivery)
  const limit=Math.max(0,Math.min(100,Math.floor((available-Number(input.delivery))/unitCash),Math.floor(rules.firstUnits/perCase),Math.floor((Math.min(rules.firstCapital,rules.maxCapital)-Number(input.delivery))/(Number(input.casePrice)*vat)),stock===null||stock===undefined?100:Math.floor(stock)))
  // Include a one-case explanation when even the smallest order cannot fit.
  const variants:BudgetOption[]=[]
  for(let cases=1;cases<=Math.max(1,limit);cases++){
   const review=assistantReview(p,{...record,cases:String(cases)},costs,rules,available,now),m=review.metrics;if(!m)continue
   const operating=Number(review.input.prep)+Number(review.input.other)+(review.input.mode==='FBM'?Number(review.input.postage):0),net=Number(review.input.sellPrice)-Number(review.input.amazonFees)-operating
   const maxLanded=Math.min(m.sales*(net-rules.profit),m.sales*(Number(review.input.sellPrice)*(1-rules.margin/100)-Number(review.input.amazonFees)-operating),m.sales*net/(1+rules.roi/100),m.sales*net-rules.totalProfit,available-operating*m.sales,rules.maxCapital,rules.firstCapital)
   const maxCasePrice=Math.max(0,Math.floor((maxLanded-Number(review.input.delivery))/cases/vat*100)/100)
   const affordable=valid&&m.cashRequired<=available,financialPass=affordable&&m.profit>0&&m.profit>=rules.profit&&m.totalProfit>=rules.totalProfit&&m.roi>=rules.roi&&m.margin>=rules.margin&&m.landed<=rules.firstCapital&&m.landed<=rules.maxCapital&&m.sales<=rules.firstUnits
   const current=fresh(review.priceDate,3,now)&&fresh(review.supplier?.checkedAt||p.offer?.seenAt,7,now)
   const reasons=[!affordable?'Exceeds cash after reserve':null,!financialPass?'Does not meet your buying targets':null,!p.identityConfirmed?'Exact product and pack need review':null,!current?'Refresh saved prices':null,!futureExpiry(review.expiry,now)?'Confirm a future expiry date':null].filter(Boolean) as string[]
   variants.push({p,key,cases,review,affordable,financialPass,current,maxCasePrice,reasons})
  }
  variants.sort((a,b)=>Number(b.financialPass)-Number(a.financialPass)||(b.review.metrics!.totalProfit-a.review.metrics!.totalProfit)||a.cases-b.cases)
  if(variants[0])options.push(variants[0])
 }
 options.sort((a,b)=>Number(b.financialPass&&b.current&&b.p.identityConfirmed&&futureExpiry(b.review.expiry,now))-Number(a.financialPass&&a.current&&a.p.identityConfirmed&&futureExpiry(a.review.expiry,now))||Number(b.affordable)-Number(a.affordable)||(b.review.metrics!.totalProfit-a.review.metrics!.totalProfit)||a.key.localeCompare(b.key))
 const seen=new Set<string>(),alternatives=options.filter(x=>{if(seen.has(x.p.asin))return false;seen.add(x.p.asin);return true})
 return {valid,available,options:alternatives,top:alternatives.slice(0,3),missing,passing:alternatives.filter(x=>x.financialPass&&x.current&&x.p.identityConfirmed&&futureExpiry(x.review.expiry,now))}
}
