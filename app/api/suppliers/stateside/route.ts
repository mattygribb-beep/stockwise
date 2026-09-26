import { NextResponse } from 'next/server'
import { saveSupplierCatalogue } from '../../../../lib/catalogue-store'

export const runtime='nodejs'
export const dynamic='force-dynamic'

const BASE='https://statesidedistribution.com'
const HEADERS={'User-Agent':'Stockwise Supplier Catalogue/1.0','Accept':'text/html,application/xhtml+xml'}

function n(v:any){const x=Number(v);return Number.isFinite(x)?x:0}
function packFromTitle(title:string){const m=title.match(/(?:pack\s*of|case\s*of|x)\s*(\d+)/i);return m?Number(m[1]):1}
function sizeFromTitle(title:string){const a=[...title.matchAll(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|fl\.?\s*oz)\b/gi)];if(!a.length)return '';const m=a[a.length-1];return m[1]+m[2].replace(/\s+/g,'')}
function cleanTitle(title:string){return title.replace(/\s*[-–]?\s*\(?pack\s*of\s*\d+\)?/ig,'').trim()}
function decode(s:string){return s.replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim()}

function productHandles(html:string){
 const out=new Set<string>()
 for(const m of html.matchAll(/href=["']\/products\/([^"'?#]+)(?:\?[^"']*)?["']/gi)) out.add(m[1])
 return [...out]
}

async function productJson(handle:string,page:number){
 const r=await fetch(BASE+'/products/'+handle+'.js',{cache:'no-store',headers:{...HEADERS,Accept:'application/json'}})
 if(!r.ok)return null
 const p=await r.json()
 const variants=(p.variants||[]).filter((v:any)=>v.available!==false)
 if(!variants.length)return null
 const v=variants[0], raw=decode(p.title||handle), pack=packFromTitle(raw), casePrice=n(v.price)/100
 return {id:'stateside-'+p.id,supplier:'Stateside Distribution',supplierProductId:String(p.id),supplierSku:v.sku||'',product:cleanTitle(raw),rawTitle:raw,brand:p.vendor||'',size:sizeFromTitle(raw),caseQty:pack,casePrice,unitCost:pack?casePrice/pack:casePrice,ean:v.barcode||'',status:'IN STOCK',url:BASE+'/products/'+handle,source:'Stateside storefront · page '+page,sourcePage:page,checked:new Date().toISOString(),tags:Array.isArray(p.tags)?p.tags:[]}
}

export async function GET(){
 try{
  const pageResults=await Promise.all(Array.from({length:7},async(_,i)=>{
   const page=i+1
   const url=BASE+'/collections/all?filter.v.availability=1&page='+page+'&sort_by=title-ascending'
   const r=await fetch(url,{cache:'no-store',headers:HEADERS})
   if(!r.ok)throw new Error('Stateside page '+page+' returned '+r.status)
   return {page,handles:productHandles(await r.text())}
  }))
  const unique=new Map<string,number>()
  for(const p of pageResults)for(const h of p.handles)if(!unique.has(h))unique.set(h,p.page)
  const entries=[...unique.entries()]
  const offers:any[]=[]
  for(let i=0;i<entries.length;i+=20){
   const batch=entries.slice(i,i+20)
   const rows=await Promise.all(batch.map(([h,p])=>productJson(h,p)))
   offers.push(...rows.filter(Boolean))
  }
  offers.sort((a,b)=>a.product.localeCompare(b.product))
  await saveSupplierCatalogue('stateside',offers,{collectionCount:unique.size,pages:pageResults.map(x=>({page:x.page,found:x.handles.length}))})
  return NextResponse.json({ok:true,supplier:'Stateside Distribution',collectionCount:unique.size,inStock:offers.length,pages:pageResults.map(x=>({page:x.page,found:x.handles.length})),offers})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Catalogue sync failed'},{status:500})}
}
