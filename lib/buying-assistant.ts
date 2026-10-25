import {assessBuy,BuyingRules,DeskInput,Evidence,EvidenceKey} from './buying-desk'
import {sweetGloryParcel} from './supplier-delivery'
import {estimateUkFba} from './amazon-uk-fba-estimator'
import type {PublicObservation} from './public-buying-data'
export type CostAssumptions={sellerVat:'not_registered'|'registered';confirmed:boolean;plan:'individual'|'professional';planPerSale:string;prep:string;postage:string;other:string;fbaInbound?:string}
export const DEFAULT_COST_ASSUMPTIONS:CostAssumptions={sellerVat:'not_registered',confirmed:false,plan:'individual',planPerSale:'0.90',prep:'0.40',postage:'3.65',other:'0.10',fbaInbound:'5.00'}
export type AssistantProduct={asin:string;supplier:string;offerId:string;packQty:number;title:string;available:boolean;identityConfirmed?:boolean;identitySignature?:string;matchType?:'verified'|'barcode'|'name';publicResearch?:{research?:Research;observations?:{amazon?:PublicObservation;supplier?:PublicObservation}};packaged?:{weightG?:number;lengthCm?:number;widthCm?:number;heightCm?:number};amazon:{price:string|null;seenAt:string;url:string;identityEvidence?:unknown}|null;offer:{product:string;caseQty:number;casePrice:string;url:string;stock:number|null;status:string;expiry:string|null;seenAt:string;minimumOrderQuoted?:number;termsUrl?:string;unitWeightG?:number;vatBasis?:'ex'|'inc'|'unknown'}|null}
export type Research={checkedAt:string;amazon:PublicObservation;supplier:PublicObservation}
export type AssistantRecord={cases?:string;mode?:'AUTO'|'FBM'|'FBA';feeMode?:'FBM'|'FBA';identitySignature?:string;overrides?:Partial<DeskInput>;editedAt?:string;research?:Research;observations?:{amazon?:PublicObservation;supplier?:PublicObservation};confirmations?:{signature:string;checkedAt:string;dates?:Partial<Record<'identity'|'market'|'eligibility'|'checkout'|'fees',string>>;identity?:boolean;market?:boolean;eligibility?:boolean;checkout?:boolean;fees?:boolean}}
const positive=(s:unknown)=>s!==''&&s!==null&&s!==undefined&&Number.isFinite(Number(s))&&Number(s)>0
const round=(n:number)=>Math.round(n*100)/100
export function futureExpiry(value:string|null|undefined,now:Date){
 const m=String(value||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/),iso=m?`${m[3]}-${m[2]}-${m[1]}`:String(value||'').slice(0,10)
 const d=Date.parse(iso);return /^\d{4}-\d{2}-\d{2}$/.test(iso)&&Number.isFinite(d)&&new Date(d).toISOString().slice(0,10)===iso&&d>now.getTime()
}
export function assistantReview(p:AssistantProduct,r:AssistantRecord,costs:CostAssumptions,rules:BuyingRules,available:number,now=new Date()){
 const valid=(o?:PublicObservation)=>o?.status==='found'&&Number.isFinite(Date.parse(o.checkedAt))&&Date.parse(o.checkedAt)<=now.getTime()
 const ordered=(rows:(PublicObservation|undefined)[],kind:'price'|'package'|'check'='check')=>rows.filter(valid).sort((a,b)=>Date.parse((kind==='price'?b!.priceCheckedAt:kind==='package'?b!.packageCheckedAt:undefined)||b!.checkedAt)-Date.parse((kind==='price'?a!.priceCheckedAt:kind==='package'?a!.packageCheckedAt:undefined)||a!.checkedAt)) as PublicObservation[]
 const sameIdentity=!p.identitySignature||r.identitySignature===p.identitySignature,local=sameIdentity?r:{}
 const sourceAmazon=[local.observations?.amazon,local.research?.amazon,p.publicResearch?.observations?.amazon],sourceSupplier=[local.observations?.supplier,local.research?.supplier,p.publicResearch?.observations?.supplier]
 const priced=ordered(sourceAmazon.filter(o=>positive(o?.price)),'price')[0],packaged=ordered(sourceAmazon.filter(o=>o?.packaged),'package')[0]
 const supplier=ordered(sourceSupplier)[0]||null,amazon=priced||packaged||null
 const supplierNewer=!!supplier&&Date.parse(supplier.priceCheckedAt||supplier.checkedAt)>=Date.parse(p.offer?.seenAt||'1970-01-01'),amazonNewer=!!priced&&Date.parse(priced.priceCheckedAt||priced.checkedAt)>=Date.parse(p.amazon?.seenAt||'1970-01-01')
 const caseQty=supplier&&Date.parse(supplier.checkedAt)>=Date.parse(p.offer?.seenAt||'1970-01-01')?supplier.caseQty??p.offer?.caseQty:p.offer?.caseQty,casePrice=supplierNewer&&positive(supplier?.price)?supplier!.price:(positive(p.offer?.casePrice)?Number(p.offer!.casePrice):null),price=amazonNewer?priced.price:(positive(p.amazon?.price)?Number(p.amazon!.price):null)
 const mode=r.mode==='FBA'?'FBA':'FBM',cases=r.cases||'1',expiry=supplier?.expiry||p.offer?.expiry,sourceActive=p.available&&(supplier?.stock??p.offer?.stock)!==0,measurements=packaged?.packaged||p.packaged
 const inbound=Number(costs.fbaInbound??'5.00'),orderCases=Number(cases),quotedPrice=Number(r.overrides?.casePrice??casePrice),caseWeight=supplier?.caseWeightKg,weightReliable=!!caseWeight&&(!p.offer?.unitWeightG||caseWeight*1000>=p.offer.unitWeightG*Number(caseQty)*.99),netTooHeavy=!!p.offer?.unitWeightG&&p.offer.unitWeightG*Number(caseQty)*orderCases>25000
 const targetParcel=weightReliable?sweetGloryParcel(0,caseWeight!*orderCases):netTooHeavy?null:8.52
 const parcel=p.supplier==='Sweet & Glory'?(weightReliable?sweetGloryParcel(quotedPrice*orderCases,caseWeight!*orderCases):netTooHeavy?null:8.52):null,delivery=parcel!==null?parcel+(mode==='FBA'&&Number.isFinite(inbound)&&inbound>=0?inbound:0):null
 const base:DeskInput={caseQty:caseQty?String(caseQty):'',packQty:String(p.packQty),cases,casePrice:casePrice?String(casePrice):'',vatBasis:p.offer?.vatBasis|| (p.supplier==='Sweet & Glory'?'ex':'unknown'),productVat:'20',sellerVat:costs.sellerVat,mode,sellPrice:price?String(price):'',amazonFees:'',delivery:delivery!==null?String(delivery):'',prep:costs.prep,postage:costs.postage,other:costs.other,weightG:measurements?.weightG?String(measurements.weightG):'',lengthCm:measurements?.lengthCm?String(measurements.lengthCm):'',widthCm:measurements?.widthCm?String(measurements.widthCm):'',heightCm:measurements?.heightCm?String(measurements.heightCm):'',sourceActive,evidence:{}}
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
 const manualFeeApplies=r.overrides?.amazonFees!==undefined&&(r.feeMode||(r.mode==='FBA'?'FBA':'FBM'))===mode
 if(manualFeeApplies){input.amazonFees=r.overrides!.amazonFees!;if(mode==='FBA'&&positive(input.amazonFees))input.fbaFeeQuoted=true;feeExplanation='Your entered complete Amazon fee quote for '+mode+'; confirm referral, fulfilment, VAT, surcharges and selling-plan costs are included'}
 const latestResearch=[local.research,p.publicResearch?.research].filter(Boolean).sort((a,b)=>Date.parse(b!.checkedAt)-Date.parse(a!.checkedAt))[0]
 const savedIdentityConfirmed=p.identityConfirmed&&!latestResearch?.amazon.identityConflict
 const signature=JSON.stringify([p.identitySignature,input,expiry,savedIdentityConfirmed,costs,amazon?.checkedAt,supplier?.checkedAt]),confirmed=r.confirmations?.signature===signature?r.confirmations:null
 const identityConfirmed=(savedIdentityConfirmed||confirmed?.identity)&&!latestResearch?.amazon.identityConflict
 const day=(confirmed?.checkedAt||now.toISOString()).slice(0,10),evidence:Partial<Record<EvidenceKey,Evidence>>={}
 const pass=(key:EvidenceKey,source:string,date=day)=>{evidence[key]={status:'pass',source,checkedAt:date}}
 if(identityConfirmed)pass('identity',savedIdentityConfirmed?'Saved supplier/ASIN relationship with confirmed sell pack':'User checked the exact product, variant and sell pack against the linked supplier and Amazon sources',savedIdentityConfirmed?now.toISOString().slice(0,10):(confirmed?.dates?.identity||confirmed?.checkedAt||day).slice(0,10))
 const date=(key:'identity'|'market'|'eligibility'|'checkout'|'fees')=>(confirmed?.dates?.[key]||confirmed?.checkedAt||day).slice(0,10)
 if(confirmed?.market){for(const k of ['price','demand','competition'] as EvidenceKey[])pass(k,'User confirmed current price, demand and competition in Seller Central / SellerAmp',date('market'))}
 if(confirmed?.eligibility)pass('eligibility','User confirmed this ASIN is eligible in their own Seller Central account',date('eligibility'))
 if(confirmed?.checkout){pass('supplier',p.offer?.url||p.supplier,date('checkout'));if(futureExpiry(expiry,now))pass('expiry','User checked expiry and UK resale/label requirements against supplier checkout',date('checkout'))}
 if(confirmed?.fees&&manualFeeApplies&&positive(r.overrides?.amazonFees))pass('fees','User entered and confirmed their current complete Amazon fee quote',date('fees'))
 input.evidence=evidence
 const result=assessBuy(input,rules,available,now)
 const supplierMinimumMet=!p.offer?.minimumOrderQuoted||Number(input.casePrice)*Number(cases)>=p.offer.minimumOrderQuoted
 const outstanding=[!supplierMinimumMet?'Supplier minimum order is not met':null,!identityConfirmed?'Exact product / pack needs review':null,!costs.confirmed?'Confirm VAT status and costs once in Profile':null,!confirmed?.market?'Current price, demand and competition':null,!confirmed?.eligibility?'Your Amazon selling eligibility':null,!confirmed?.checkout?'Final supplier checkout and compliance':null,!evidence.fees?'Exact Amazon fee quote (estimate shown)':null].filter(Boolean) as string[]
 if(result.missing.some(s=>s.includes('refresh evidence')))outstanding.push('Refresh expired checks')
 const metrics=result.metrics
 // Unknown account evidence never hides a useful estimate or becomes purchase approval.
 const hasEstimate=!!metrics,financialFail=!!metrics&&(metrics.profit<=0||metrics.roi<rules.roi||metrics.margin<rules.margin||metrics.profit<rules.profit||metrics.totalProfit<rules.totalProfit)
 const overBudget=!!metrics&&metrics.cashRequired>available
 const status=!supplierMinimumMet?'Supplier minimum not met':!sourceActive?'Unavailable':!hasEstimate?'More cost data needed':overBudget?'Over budget':financialFail?'Below your targets':outstanding.length?'Worth checking':result.decision==='PASSES RULES'?'Checks complete':'Review order size'
 const targetDelivery=r.overrides?.delivery!==undefined?Number(input.delivery):p.supplier==='Sweet & Glory'&&targetParcel!==null?targetParcel+(mode==='FBA'?inbound:0):Number(input.delivery)
 return {targetDelivery,input,result,signature,metrics,identityConfirmed,status,outstanding,feeExplanation,fba,expiry,hasEstimate,sourceActive,supplier,amazon,priceKind:confirmed?.market?'Your checked market price':r.overrides?.sellPrice!==undefined?'Your entered price':amazonNewer?'Public price observation':'Saved Amazon observation',priceDate:confirmed?.market?(confirmed.dates?.market||confirmed.checkedAt):r.overrides?.sellPrice!==undefined?r.editedAt:amazonNewer?(priced.priceCheckedAt||priced.checkedAt):p.amazon?.seenAt,assumptions:['Non-VAT-registered cash scenario unless your profile states otherwise','20% product VAT scenario; adjust if the product has a different VAT treatment',weightReliable?'Sweet & Glory UK mainland parcel table uses the supplier case weight and order value':'Sweet & Glory carriage assumes one standard mainland parcel up to 25kg; confirm case shipping weight',...(mode==='FBA'?['FBA inbound allowance '+String(costs.fbaInbound??'5.00')+' pounds per order; replace with your carrier quote']:[]),'Postage, packaging and other allowances come from your profile','Published fee estimate is not an account-specific quote'],canApprove:costs.confirmed&&result.decision==='PASSES RULES'&&outstanding.length===0}
}
