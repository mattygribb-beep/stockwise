export type EvidenceKey = 'identity'|'supplier'|'price'|'fees'|'demand'|'competition'|'eligibility'|'expiry'
export type Evidence = {status:'unknown'|'pass'|'fail'; checkedAt:string; source:string}
export type BuyingRules = {roi:number;profit:number;margin:number;totalProfit:number;maxCapital:number;firstCapital:number;firstUnits:number}
export type DeskInput = {
 caseQty:string; packQty:string; cases:string; casePrice:string; vatBasis:'unknown'|'inc'|'ex'; productVat:string;
 sellerVat:'unknown'|'not_registered'|'registered'; mode:'FBM'|'FBA'; sellPrice:string; amazonFees:string;
 weightG?:string;lengthCm?:string;widthCm?:string;heightCm?:string;fbaFeeQuoted?:boolean;
 delivery:string; prep:string; postage:string; other:string; sourceActive?:boolean; evidence:Partial<Record<EvidenceKey,Evidence>>
}
export const EVIDENCE_LABELS:Record<EvidenceKey,string> = {
 identity:'Exact product, variant and sell pack',supplier:'Supplier quote, case quantity and carriage',price:'Competitive selling price',fees:'Full Amazon fees for this fulfilment method',demand:'Demand and sales history',competition:'Competing offers and price history',eligibility:'Your account can sell this ASIN',expiry:'Expiry, labelling and resale requirements'
}
export const DEFAULT_BUYING_RULES:BuyingRules={roi:30,profit:2,margin:15,totalProfit:25,maxCapital:500,firstCapital:250,firstUnits:24}
const DAYS:Record<EvidenceKey,number>={identity:30,supplier:7,price:3,fees:3,demand:7,competition:3,eligibility:7,expiry:7}
const numeric=(s:string)=>typeof s==='string'&&s.trim()!==''&&Number.isFinite(Number(s))&&Number(s)>=0
const positive=(s:string)=>numeric(s)&&Number(s)>0
const whole=(s:string)=>positive(s)&&Number.isInteger(Number(s))
export function evidenceIssues(input:DeskInput,now=new Date()){
 const issues:string[]=[]
 for(const key of Object.keys(EVIDENCE_LABELS) as EvidenceKey[]){
  const e=input.evidence[key],label=EVIDENCE_LABELS[key]
  if(e?.status==='fail'){issues.push(label+': failed check');continue}
  if(e?.status!=='pass'){issues.push(label+': not checked');continue}
  const date=Date.parse(e.checkedAt),age=(now.getTime()-date)/86400000
  if(!/^\d{4}-\d{2}-\d{2}$/.test(e.checkedAt)||!Number.isFinite(date)||new Date(date).toISOString().slice(0,10)!==e.checkedAt||age<0||age>=DAYS[key]+1)issues.push(label+': refresh evidence')
  if(!e.source.trim())issues.push(label+': add a source or reference')
 }
 return issues
}
export function assessBuy(input:DeskInput,rules:BuyingRules,availableCash:number,now=new Date()){
 const evidenceMissing=evidenceIssues(input,now),missing:string[]=[]
 if(input.sourceActive===false)missing.push('Supplier offer or Amazon listing is no longer active; refresh the source')
 for(const [key,label] of [['caseQty','Supplier units per case'],['packQty','Units per Amazon sale'],['cases','Number of cases']] as const)if(!whole(input[key]))missing.push(label+': enter a positive whole number')
 for(const [key,label] of [['casePrice','Case price'],['sellPrice','Selling price'],['amazonFees','Full Amazon fees per sale']] as const)if(!positive(input[key]))missing.push(label+': enter a checked positive amount')
 for(const [key,label] of [['delivery','Total supplier delivery'],['prep','Prep and packaging per sale'],['other','Other costs and allowances per sale']] as const)if(!numeric(input[key]))missing.push(label+': enter an amount, including zero if confirmed')
 if(input.mode==='FBM'&&!numeric(input.postage))missing.push('Postage per sale: enter a checked amount')
 if(input.mode==='FBA'&&!input.fbaFeeQuoted)for(const key of ['weightG','lengthCm','widthCm','heightCm'] as const)if(!positive(input[key]||''))missing.push('FBA fee quote: add the complete packaged sell-unit '+({weightG:'weight in grams',lengthCm:'length in centimetres',widthCm:'width in centimetres',heightCm:'height in centimetres'}[key]))
 if(!['FBA','FBM'].includes(input.mode))missing.push('Choose FBA or FBM')
 if(input.sellerVat!=='not_registered')missing.push(input.sellerVat==='registered'?'VAT-registered seller: net VAT analysis is required; this desk currently models cash costs for non-registered sellers':'Confirm seller VAT status')
 if(Object.values(rules).some(n=>!Number.isFinite(n)||n<0))missing.push('Buying rules must contain finite, non-negative limits')
 if(!['inc','ex'].includes(input.vatBasis))missing.push('Confirm whether the supplier quote includes VAT')
 if(input.vatBasis==='ex'&&(!numeric(input.productVat)||Number(input.productVat)>100))missing.push('Confirm product VAT rate between 0% and 100%')
 const caseQty=Number(input.caseQty),pack=Number(input.packQty),cases=Number(input.cases)
 const perCase=whole(input.caseQty)&&whole(input.packQty)?Math.floor(caseQty/pack):0
 if(!perCase)missing.push('Supplier case cannot make one complete Amazon sell pack')
 if(missing.length)return {decision:'NEEDS CHECKS' as const,missing,metrics:null}
 const sales=perCase*cases,leftover=(caseQty%pack)*cases
 // The entire case is paid for; leftovers never subsidise the sellable packs.
 const stock=Number(input.casePrice)*(input.vatBasis==='ex'?1+Number(input.productVat)/100:1)*cases
 const landed=stock+Number(input.delivery),cogs=landed/sales,sell=Number(input.sellPrice)
 const postage=input.mode==='FBM'?Number(input.postage):0
 const operating=Number(input.prep)+Number(input.other)+postage
 const profit=sell-cogs-Number(input.amazonFees)-operating,totalProfit=profit*sales
 // Reserve every sale's packaging/postage/allowances before relying on Amazon payouts.
 const cashRequired=landed+operating*sales
 const roi=landed>0?totalProfit/landed*100:0,margin=profit/sell*100
 const metrics={sales,leftover,stock,landed,cogs,profit,totalProfit,cashRequired,roi,margin,breakEven:cogs+Number(input.amazonFees)+operating,stressProfit:(sell*.9-cogs-Number(input.amazonFees)-operating)*sales}
 if(!Object.values(metrics).every(Number.isFinite))return {decision:'NEEDS CHECKS' as const,missing:['Amounts exceed the supported calculation range'],metrics:null}
 if(evidenceMissing.length)return {decision:'NEEDS CHECKS' as const,missing:evidenceMissing,metrics}
 const reasons:string[]=[]
 if(!Number.isFinite(availableCash)||availableCash<0||cashRequired>availableCash)reasons.push('Order and fulfilment cash exceed your budget after the reserve')
 if(landed>rules.maxCapital)reasons.push('Landed stock exceeds your maximum capital per product')
 if(profit<=0||roi<rules.roi||margin<rules.margin||profit<rules.profit||totalProfit<rules.totalProfit)reasons.push('Returns fall below your buying rules')
 if(reasons.length)return {decision:'WALK AWAY' as const,missing:reasons,metrics}
 if(landed>rules.firstCapital||sales>rules.firstUnits)return {decision:'REDUCE ORDER' as const,missing:['Order exceeds your first-buy exposure limit; reduce quantity and reassess'],metrics}
 return {decision:'PASSES RULES' as const,missing:[],metrics}
}
export function assessBasket(items:{key:string;input:DeskInput}[],rules:BuyingRules,budget:number,reserve:number,now=new Date()){
 const valid=Number.isFinite(budget)&&budget>0&&Number.isFinite(reserve)&&reserve>=0&&reserve<=budget
 const seen=new Set<string>(),results=items.map(item=>({key:item.key,...assessBuy(item.input,rules,valid?budget-reserve:0,now)}))
 const issues:string[]=[]
 if(!valid)issues.push('Enter a valid budget and reserve')
 if(!items.length)issues.push('No products selected')
 for(const r of results){if(seen.has(r.key))issues.push('Duplicate product in basket');seen.add(r.key);if(r.decision!=='PASSES RULES')issues.push(r.key+': '+r.decision)}
 const cashRequired=results.reduce((s,r)=>s+(r.metrics?.cashRequired||0),0),profit=results.reduce((s,r)=>s+(r.metrics?.totalProfit||0),0)
 if(valid&&cashRequired>budget-reserve)issues.push('Combined basket exceeds the budget after the reserve')
 return {ready:issues.length===0,issues,cashRequired,profit,remaining:valid?budget-reserve-cashRequired:0,results}
}
