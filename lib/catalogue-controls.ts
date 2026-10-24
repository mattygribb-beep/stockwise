export type CatalogueSort='none'|'nameAsc'|'nameDesc'|'caseAsc'|'caseDesc'|'unitAsc'|'unitDesc'|'qtyAsc'|'qtyDesc'
const positive=(v:unknown)=>Number.isFinite(Number(v))&&Number(v)>0?Number(v):null
export function listedPrice(row:any){return positive(row.observedQuote)??positive(row.effectiveCasePrice)??positive(row.casePrice)}
export function knownUnitCost(row:any){
 if(row.commercialHold||row.caseQtyConfirmed===false)return null
 return positive(row.effectiveUnitCost)??positive(row.unitCost)??(positive(row.casePrice)&&positive(row.caseQty)?Number(row.casePrice)/Number(row.caseQty):null)
}
export function sortCatalogue(rows:any[],sort:CatalogueSort,favourites:string[]=[]){
 const named=(a:any,b:any)=>String(a.product||'').localeCompare(String(b.product||''),'en',{numeric:true,sensitivity:'base'})
 return [...rows].sort((a,b)=>{
  if(sort==='none')return Number(favourites.includes(b.id))-Number(favourites.includes(a.id))
  if(sort.startsWith('name'))return (sort.endsWith('Desc')?-1:1)*named(a,b)
  const value=(r:any)=>sort.startsWith('case')?listedPrice(r):sort.startsWith('unit')?knownUnitCost(r):r.caseQtyConfirmed===false?null:positive(r.caseQty)
  const av=value(a),bv=value(b)
  if(av===null&&bv===null)return named(a,b)
  if(av===null)return 1
  if(bv===null)return -1
  return (sort.endsWith('Desc')?-1:1)*(av-bv)||named(a,b)
 })
}
export function barcodeValue(value:unknown){
 const s=String(value??'').trim().replace(/[\s-]/g,'')
 if(!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(s))return ''
 let sum=0;for(let i=s.length-2,weight=3;i>=0;i--,weight=4-weight)sum+=Number(s[i])*weight
 return (10-sum%10)%10===Number(s.at(-1))?s:''
}
export function asinValue(value:unknown){
 const raw=String(value??'').trim()
 if(/^[A-Z0-9]{10}$/i.test(raw))return raw.toUpperCase()
 try{const url=new URL(raw);if(!['amazon.co.uk','www.amazon.co.uk'].includes(url.hostname)||url.protocol!=='https:')return '';return url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1].toUpperCase()||''}catch{return ''}
}
export function identifierEdit(body:any){
 const supplier=String(body?.supplier||'').trim(),supplierOfferId=String(body?.supplierOfferId||'').trim()
 if(!supplier||!supplierOfferId)return {ok:false as const,error:'Supplier and product are required'}
 const hasEan=typeof body.ean==='string'&&body.ean.trim()!=='',hasAsin=typeof body.asin==='string'&&body.asin.trim()!==''
 if(!hasEan&&!hasAsin)return {ok:false as const,error:'Add a barcode or an ASIN. Either can be saved on its own.'}
 const ean=hasEan?barcodeValue(body.ean):null,asin=hasAsin?asinValue(body.asin):null
 if(hasEan&&!ean)return {ok:false as const,error:'Enter a valid EAN / UPC barcode (8, 12, 13 or 14 digits, including its check digit).'}
 if(hasAsin&&!asin)return {ok:false as const,error:'Enter a 10-character ASIN or paste an Amazon UK product link.'}
 return {ok:true as const,supplier,supplierOfferId,ean,asin}
}
