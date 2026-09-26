import { NextResponse } from 'next/server'
import { saveSupplierCatalogue } from '../../../../lib/catalogue-store'

export const runtime='nodejs'
export const dynamic='force-dynamic'

const BASE='https://sweetandglory.com'
const HEADERS={'User-Agent':'Stockwise Supplier Catalogue/1.0','Accept':'text/html,application/xhtml+xml'}

function decode(s:string){return s.replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&pound;/g,'£').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
function num(s:string){const n=Number((s||'').replace(/,/g,''));return Number.isFinite(n)?n:0}
function sizeFromTitle(t:string){const a=[...t.matchAll(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|fl\.?\s*oz)\b/gi)];if(!a.length)return '';const m=a[a.length-1];return m[1]+m[2].replace(/\s+/g,'')}
function brandFromPath(path:string){const m=path.match(/\/([^/]+)-wholesale-uk\/?$/);return m?m[1].replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):''}

function brandLinks(html:string){
 const out=new Set<string>()
 for(const m of html.matchAll(/href=["']([^"'#?]+-wholesale-uk\/?)(?:\?[^"']*)?["']/gi)){
  const p=m[1].replace(BASE,'')
  if(p.startsWith('/brands/'))out.add(p)
 }
 return [...out]
}

function pageLinks(html:string,path:string){
 let max=1
 for(const m of html.matchAll(/(?:\?|&amp;|&)page=(\d+)/gi))max=Math.max(max,Number(m[1]))
 return Array.from({length:max},(_,i)=>path+(i?'?page='+(i+1):''))
}

function parseProducts(html:string,path:string){
 const text=decode(html)
 const re=/([^£]{2,190}?\s+-\s+(?:\d+ct|Case))\s+Code:\s*([^\s]+)\s+Availability:\s*([\d,]+)\s+In Stock\s+Pack Quantity:\s*(\d+)\s+Expiry Date:\s*([0-9/]+)\s+(?:\(RRP £[\d,.]+ Save £[\d,.]+\)\s*)?£([\d,.]+)\s*Ex VAT\s*\(£([\d,.]+)\s*Ex VAT per unit\)/gi
 const out:any[]=[]
 for(const m of text.matchAll(re)){
  let title=m[1].replace(/^(?:0\s+|Qty:\s*|Add To Basket\s*)+/gi,'').trim()
  const code=m[2],stock=num(m[3]),caseQty=num(m[4]),expiry=m[5],casePrice=num(m[6]),unitCost=num(m[7])
  if(!code||!caseQty||!casePrice||!unitCost)continue
  out.push({id:'sweet-glory-'+code,supplier:'Sweet & Glory',supplierProductId:code,supplierSku:code,product:title.replace(/\s+-\s+(?:\d+ct|Case)\s*$/i,'').trim(),rawTitle:title,brand:brandFromPath(path),size:sizeFromTitle(title),caseQty,casePrice,unitCost,ean:'',stockQty:stock,expiry,status:'IN STOCK',url:BASE+path.split('?')[0],source:'Sweet & Glory live catalogue',checked:new Date().toISOString()})
 }
 return out
}

export async function GET(){
 try{
  const home=await fetch(BASE+'/',{cache:'no-store',headers:HEADERS})
  if(!home.ok)throw new Error('Sweet & Glory returned '+home.status)
  const brands=brandLinks(await home.text())
  if(!brands.length)throw new Error('No Sweet & Glory brand catalogue links found')
  const pagePaths:string[]=[]
  for(let i=0;i<brands.length;i+=15){
   const batch=brands.slice(i,i+15)
   const pages=await Promise.all(batch.map(async path=>{const r=await fetch(BASE+path,{cache:'no-store',headers:HEADERS});if(!r.ok)return [path];return pageLinks(await r.text(),path)}))
   pages.forEach(x=>pagePaths.push(...x))
  }
  const offers:any[]=[]
  for(let i=0;i<pagePaths.length;i+=15){
   const batch=pagePaths.slice(i,i+15)
   const pages=await Promise.all(batch.map(async path=>{const r=await fetch(BASE+path,{cache:'no-store',headers:HEADERS});return r.ok?parseProducts(await r.text(),path):[]}))
   pages.forEach(x=>offers.push(...x))
  }
  const unique=[...new Map(offers.map(x=>[x.supplierSku,x])).values()].sort((a:any,b:any)=>a.product.localeCompare(b.product))
  await saveSupplierCatalogue('sweet-glory',unique,{brandPages:brands.length,cataloguePages:pagePaths.length})
  return NextResponse.json({ok:true,supplier:'Sweet & Glory',brandPages:brands.length,cataloguePages:pagePaths.length,inStock:unique.length,offers:unique})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Sweet & Glory catalogue sync failed'},{status:500})}
}
