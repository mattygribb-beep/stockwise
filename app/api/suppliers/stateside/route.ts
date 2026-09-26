import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BASE='https://statesidedistribution.com'
const COLLECTION='/collections/all/products.json?limit=250'

function n(v:any){const x=Number(v);return Number.isFinite(x)?x:0}
function packFromTitle(title:string){
 const m=title.match(/(?:pack\s*of|case\s*of|x)\s*(\d+)/i)
 return m?Number(m[1]):null
}
function sizeFromTitle(title:string){
 const matches=[...title.matchAll(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|fl\.?\s*oz)\b/gi)]
 if(!matches.length)return ''
 const m=matches[matches.length-1]
 return m[1]+m[2].replace(/\s+/g,'')
}
function cleanTitle(title:string){
 return title.replace(/\s*[-–]?\s*\(?pack\s*of\s*\d+\)?/ig,'').trim()
}

export async function GET(){
 try{
  const res=await fetch(BASE+COLLECTION,{cache:'no-store',headers:{'User-Agent':'Stockwise Supplier Catalogue/1.0','Accept':'application/json'}})
  if(!res.ok) return NextResponse.json({ok:false,error:'Stateside returned '+res.status},{status:502})
  const json=await res.json()
  const raw=Array.isArray(json.products)?json.products:[]
  const offers=raw.flatMap((p:any)=>{
   const available=(p.variants||[]).filter((v:any)=>v.available!==false)
   if(!available.length)return []
   const v=available[0]
   const pack=packFromTitle(p.title)||1
   const casePrice=n(v.price)
   return [{
    id:'stateside-'+p.id,
    supplier:'Stateside Distribution',
    supplierProductId:String(p.id),
    supplierSku:v.sku||'',
    product:cleanTitle(p.title),
    rawTitle:p.title,
    brand:p.vendor||'',
    size:sizeFromTitle(p.title),
    caseQty:pack,
    casePrice,
    unitCost:pack?casePrice/pack:casePrice,
    ean:v.barcode||'',
    status:'IN STOCK',
    url:BASE+'/products/'+p.handle,
    source:'Stateside live catalogue',
    checked:new Date().toISOString(),
    tags:Array.isArray(p.tags)?p.tags:[]
   }]
  })
  return NextResponse.json({ok:true,supplier:'Stateside Distribution',fetched:raw.length,inStock:offers.length,offers})
 }catch(e:any){
  return NextResponse.json({ok:false,error:e?.message||'Catalogue sync failed'},{status:500})
 }
}
