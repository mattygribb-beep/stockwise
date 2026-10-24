import {assessBuy,BuyingRules,DeskInput,Evidence,EvidenceKey} from './buying-desk'
import {estimateUkFba} from './amazon-uk-fba-estimator'
import type {PublicObservation} from './public-buying-data'
export type CostAssumptions={sellerVat:'not_registered'|'registered';confirmed:boolean;plan:'individual'|'professional';planPerSale:string;prep:string;postage:string;other:string}
export const DEFAULT_COST_ASSUMPTIONS:CostAssumptions={sellerVat:'not_registered',confirmed:false,plan:'individual',planPerSale:'0.90',prep:'0.40',postage:'3.65',other:'0.10'}
export type AssistantProduct={asin:string;supplier:string;offerId:string;packQty:number;title:string;available:boolean;identityConfirmed?:boolean;packaged?:{weightG?:number;lengthCm?:number;widthCm?:number;heightCm?:number};amazon:{price:string|null;seenAt:string;url:string;identityEvidence?:unknown}|null;offer:{product:string;caseQty:number;casePrice:string;url:string;stock:number|null;status:string;expiry:string|null;seenAt:string;vatBasis?:'ex'|'unknown'}|null}
export type Research={checkedAt:string;amazon:PublicObservation;supplier:PublicObservation}
export type AssistantRecord={cases?:string;mode?:'FBM'|'FBA';overrides?:Partial<DeskInput>;editedAt?:string;research?:Research;observations?:{amazon?:PublicObservation;supplier?:PublicObservation};confirmations?:{signature:string;checkedAt:string;dates?:Partial<Record<'market'|'eligibility'|'checkout'|'fees',string>>;market?:boolean;eligibility?:boolean;checkout?:boolean;fees?:boolean}}
const positive=(s:unknown)=>s!==''&&s!==null&&s!==undefined&&Number.isFinite(Number(s))&&Number(s)>0
const round=(n:number)=>Math.round(n*100)/100
export function futureExpiry(value:string|null|undefined,now:Date){
 const m=String(value||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/),iso=m?`${m[3]}-${m[2]}-${m[1]}`:String(value||'').slice(0,10)
 const d=Date.parse(iso);return /^\d{4}-\d{2}-\d{2}$/.test(iso)&&Number.isFinite(d)&&new Date(d).toISOString().slice(0,10)===iso&&d>now.getTime()
}
export function assistantReview(p:AssistantProduct,r:AssistantRecord,costs:CostAssumptions,rules:BuyingRules,available:number,now=new Date()){
 const valid=(o?:PublicObservation)=>o?.status==='found'&&Number.isFinite(Date.parse(o.checkedAt))&&Date.parse(o.checkedAt)<=now.getTime()
 const so=r.observations?.supplier||r.research?.supplier,ao=r.observations?.amazon||r.research?.amazon
 const supplier=valid(so)?so!:null,amazon=valid(ao)?ao!:null
 const caseQty=supplier?.caseQty??p.offer?.caseQty,casePrice=supplier?.price??(positive(p.offer?.casePrice)?Number(p.offer!.casePrice):null),price=amazon?.price??(positive(p.amazon?.price)?Number(p.amazon!.price):null)
 const mode=r.mode||'FBM',cases=r.cases||'1',expiry=supplier?.expiry||p.offer?.expiry,sourceActive=p.available&&(supplier?.stock??p.offer?.stock)!==0
 const base:DeskInput={caseQty:caseQty?String(caseQty):'',packQty:String(p.packQty),cases,casePrice:casePrice?String(casePrice):'',vatBasis:p.supplier==='Sweet & Glory'?'ex':'unknown',productVat:'20',sellerVat:costs.sellerVat,mode,sellPrice:price?String(price):'',amazonFees:'',delivery:p.supplier==='Sweet & Glory'?'8.52':'',prep:costs.prep,postage:costs.postage,other:costs.other,weightG:p.packaged?.weightG?String(p.packaged.weightG):'',lengthCm:p.packaged?.lengthCm?String(p.packaged.lengthCm):'',widthCm:p.packaged?.widthCm?String(p.packaged.widthCm):'',heightCm:p.packaged?.heightCm?String(p.packaged.heightCm):'',sourceActive,evidence:{}}
 const input={...base,...r.overrides,cases,mode,sourceActive,evidence:{}} as DeskInput
 const sell=Number(input.sellPrice),referralRate=sell<=10?.05:.15,plan=costs.plan==='individual'?.90:Number(costs.planPerSale)
 const validMoney=(v:string)=>v.trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=0
 let feeExplanation='Published Grocery referral rate + 2% UK digital services fee + 20% fee VAT + selling plan allocation'
 let fba:ReturnType<typeof estimateUkFba>|null=null
 if(mode==='FBM'&&positive(input.sellPrice)&&(costs.plan==='individual'||validMoney(costs.planPerSale)))input.amazonFees=String(round(sell*referralRate*1.02*1.2+plan))
 if(mode==='FBA'){
  fba=estimateUkFba({price:sell,category:'Grocery and Gourmet',weightG:Number(input.weightG),lengthCm:Number(input.lengthCm),widthCm:Number(input.widthCm),heightCm:Number(input.heightCm),asOf:now.toISOString().slice(0,10)})
  if(fba.estimatedAmazonFeesIf20PercentFeeVat!=null&&fba.confidence==='RATE_CARD_ESTIMATE'&&(costs.plan==='individual'||validMoney(costs.planPerSale)))input.amazonFees=String(round(fba.estimatedAmazonFeesIf20PercentFeeVat+plan))
  feeExplanation=fba.confidence==='RATE_CARD_ESTIMATE'?fba.fulfilmentTier+' · published FBA rate card, surcharges, fee VAT and plan allocation':'FBA needs the complete packaged weight and dimensions; no parcel size has been guessed'
 }
 if(r.overrides?.amazonFees!==undefined)input.amazonFees=r.overrides.amazonFees
 const signature=JSON.stringify([input,expiry,p.identityConfirmed,costs,amazon?.checkedAt,supplier?.checkedAt]),confirmed=r.confirmations?.signature===signature?r.confirmations:null
 const day=(confirmed?.checkedAt||now.toISOString()).slice(0,10),evidence:Partial<Record<EvidenceKey,Evidence>>={}
 const pass=(key:EvidenceKey,source:string,date=day)=>{evidence[key]={status:'pass',source,checkedAt:date}}
 if(p.identityConfirmed)pass('identity','System reused the saved supplier/ASIN relationship or exact barcode with the protected sell pack',now.toISOString().slice(0,10))
 const date=(key:'market'|'eligibility'|'checkout'|'fees')=>(confirmed?.dates?.[key]||confirmed?.checkedAt||day).slice(0,10)
 if(confirmed?.market){for(const k of ['price','demand','competition'] as EvidenceKey[])pass(k,'User confirmed current price, demand and competition in Seller Central / SellerAmp',date('market'))}
 if(confirmed?.eligibility)pass('eligibility','User confirmed this ASIN is eligible in their own Seller Central account',date('eligibility'))
 if(confirmed?.checkout){pass('supplier',p.offer?.url||p.supplier,date('checkout'));if(futureExpiry(expiry,now))pass('expiry','User checked expiry and UK resale/label requirements against supplier checkout',date('checkout'))}
 if(confirmed?.fees&&positive(r.overrides?.amazonFees))pass('fees','User entered and confirmed their current complete Amazon fee quote',date('fees'))
 input.evidence=evidence
 const result=assessBuy(input,rules,available,now)
 const outstanding=[!p.identityConfirmed?'Exact product / pack needs review':null,!costs.confirmed?'Confirm VAT status and costs once in Profile':null,!confirmed?.market?'Current price, demand and competition':null,!confirmed?.eligibility?'Your Amazon selling eligibility':null,!confirmed?.checkout?'Final supplier checkout and compliance':null,!evidence.fees?'Exact Amazon fee quote (estimate shown)':null].filter(Boolean) as string[]
 if(result.missing.some(s=>s.includes('refresh evidence')))outstanding.push('Refresh expired checks')
 const metrics=result.metrics
 // Unknown account evidence never hides a useful estimate or becomes purchase approval.
 const hasEstimate=!!metrics,financialFail=!!metrics&&(metrics.profit<=0||metrics.roi<rules.roi||metrics.margin<rules.margin||metrics.profit<rules.profit||metrics.totalProfit<rules.totalProfit)
 const overBudget=!!metrics&&metrics.cashRequired>available
 const status=!sourceActive?'Unavailable':!hasEstimate?'More cost data needed':overBudget?'Over budget':financialFail?'Below your targets':outstanding.length?'Worth checking':result.decision==='PASSES RULES'?'Checks complete':'Review order size'
 return {input,result,signature,metrics,status,outstanding,feeExplanation,fba,expiry,hasEstimate,sourceActive,supplier,amazon,priceKind:r.overrides?.sellPrice!==undefined?'Your entered price':amazon?.price?'Public price observation':'Saved Amazon observation',priceDate:r.overrides?.sellPrice!==undefined?r.editedAt:amazon?.checkedAt||p.amazon?.seenAt,assumptions:['Non-VAT-registered cash scenario unless your profile states otherwise','20% product VAT scenario; adjust if the product has a different VAT treatment','Sweet & Glory carriage assumes one standard mainland parcel up to 25kg','Postage, packaging and other allowances come from your profile','Published fee estimate is not an account-specific quote'],canApprove:costs.confirmed&&result.decision==='PASSES RULES'&&outstanding.length===0}
}
