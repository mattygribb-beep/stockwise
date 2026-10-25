import type {AssistantProduct,AssistantRecord} from './buying-assistant'
import type {BudgetOption} from './budget-shortlist'
export const researchKey=(p:AssistantProduct)=>p.asin+'|'+p.supplier+'|'+p.offerId
const fresh=(date:string|undefined,hours:number,now:Date)=>{const age=now.getTime()-Date.parse(date||'');return Number.isFinite(age)&&age>=0&&age<hours*3600000}
// Reopening a review is navigation. Only a changed order invalidates its checks.
export function openBuyingReview(record:AssistantRecord,cases:number):AssistantRecord{
 if(record.cases||cases===1)return record
 return {...record,cases:String(cases),confirmations:undefined}
}
export function researchQueue(products:AssistantProduct[],records:Record<string,AssistantRecord>,options:BudgetOption[],selected:string[],now=new Date()){
 const ranked=new Map(options.map((o,i)=>[o.key,{i,o}]))
 return products.filter(p=>{
  if(!p.available)return false
  const r=records[researchKey(p)]||{},local=!p.identitySignature||p.identitySignature===r.identitySignature?r:{},attempts=[local.research,p.publicResearch?.research].filter(Boolean)
  // Failed and blocked requests need a pause too. Repeated clicks must not hammer a source.
  if(attempts.some(a=>fresh(a!.checkedAt,.5,now)))return false
  const amazon=[local.observations?.amazon,local.research?.amazon,p.publicResearch?.observations?.amazon],supplier=[local.observations?.supplier,local.research?.supplier,p.publicResearch?.observations?.supplier]
  const priced=amazon.some(a=>a?.status==='found'&&Number(a.price)>0&&fresh(a.priceCheckedAt||a.checkedAt,24,now))
  const quoted=supplier.some(s=>s?.status==='found'&&Number(s.price)>0&&fresh(s.priceCheckedAt||s.checkedAt,24,now))||(p.supplier!=='Sweet & Glory'&&Number(p.offer?.casePrice)>0&&fresh(p.offer?.seenAt,24,now))
  return !(priced&&quoted)
 }).sort((a,b)=>{
  const ak=researchKey(a),bk=researchKey(b),ar=ranked.get(ak),br=ranked.get(bk),priority=(key:string,r:typeof ar)=>selected.includes(key)?0:r?.o.financialPass?1:r?.o.decision==='NEGOTIATE'?2:!r?3:4
  return priority(ak,ar)-priority(bk,br)||(ar?.i??999)-(br?.i??999)||ak.localeCompare(bk)
 })
}
export type JourneyView='leads'|'missing'|'saved'|'all'
export function buyingRows(products:AssistantProduct[],options:BudgetOption[],selected:string[],view:JourneyView,query:string){
 const index=new Map(options.map(o=>[o.key,o])),order=new Map(options.map((o,i)=>[o.key,i])),needle=query.trim().toLowerCase()
 return products.map(p=>({p,key:researchKey(p),option:index.get(researchKey(p))})).filter(({p,key,option})=>{
  if(needle&&![p.title,p.offer?.product,p.supplier,p.asin,p.offerId].join(' ').toLowerCase().includes(needle))return false
  return view==='all'||view==='saved'&&selected.includes(key)||view==='missing'&&!option||view==='leads'&&(option?.financialPass||option?.decision==='NEGOTIATE')
 }).sort((a,b)=>(order.get(a.key)??999)-(order.get(b.key)??999))
}
// Resolve one missing input at a time; account-level VAT limitations stay in Profile.
export function nextBuyingInput(issues:string[]){
 const first=issues[0]||''
 const inputs=[['Supplier units per case','caseQty','Units per supplier case'],['Units per Amazon sale','packQty','Units per Amazon sale'],['Number of cases','cases','Cases'],['Case price','casePrice','Case price £'],['Selling price','sellPrice','Selling price £'],['Full Amazon fees','amazonFees','Complete Amazon fees / sale £'],['Total supplier delivery','delivery','Total supplier delivery / FBA inbound £'],['Prep and packaging','prep','Packing / sale £'],['Other costs','other','Other allowance / sale £'],['Postage per sale','postage','FBM postage / sale £']] as const
 return inputs.find(([prefix])=>first.startsWith(prefix))||null
}
