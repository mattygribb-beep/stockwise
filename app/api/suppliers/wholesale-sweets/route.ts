import { NextResponse } from 'next/server'
import { saveSupplierCatalogue } from '../../../../lib/catalogue-store'
export const runtime='nodejs'; export const dynamic='force-dynamic'
const BASE='https://www.wholesalesweets.co.uk', START='/shop-online-1137'
const H={'User-Agent':'Flip Lead Supplier Catalogue/1.0','Accept':'text/html,application/xhtml+xml'}
const d=(s:string)=>s.replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/&pound;/gi,'£').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
const n=(s:string)=>{const x=Number((s||'').replace(/,/g,''));return Number.isFinite(x)?x:0}
const size=(s:string)=>{const a=[...s.matchAll(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|fl\.?\s*oz)\b/gi)];return a.length?a[a.length-1][1]+a[a.length-1][2].replace(/\s+/g,''):''}
function maxPage(h:string){let x=1;for(const m of h.matchAll(/[?&](?:page|p)=(\d+)/gi))x=Math.max(x,+m[1]);const z=d(h).match(/Showing\s+\d+\s+of\s+([\d,]+)/i);if(z)x=Math.max(x,Math.ceil(n(z[1])/20));return Math.min(x,250)}
function parse(h:string,page:number){
 const out:any[]=[]
 // Catalogue cards contain a product href, title/pack and VAT-inclusive price. Parse locally; never fetch product pages.
 const cards=h.split(/<(?:article|li|div)[^>]+class=["'][^"']*(?:product|item)[^"']*["'][^>]*>/i)
 for(const c of cards){
  const link=c.match(/href=["'](\/[^"'#?]+)["']/i), title=c.match(/<(?:h2|h3|h4|a)[^>]*>([\s\S]*?)<\/(?:h2|h3|h4|a)>/i)
  if(!link||!title)continue
  const text=d(c.slice(0,5000)), raw=d(title[1]); if(!raw||raw.length<3)continue
  const pm=[...text.matchAll(/£([\d,.]+)(?:\s*(?:inc\.?\s*vat))?/gi)]; if(!pm.length)continue
  const casePrice=n(pm[pm.length-1][1]); if(!casePrice)continue
  const pack=text.match(/\b(\d+)\s*x\s*([^£|]{1,45})/i), qty=pack?+pack[1]:1
  const url=BASE+link[1], key=link[1].replace(/^\//,'').replace(/\/$/,'')
  const status=/out of stock|sold out/i.test(text)?'OUT OF STOCK':'IN STOCK'
  out.push({id:'wholesale-sweets-'+key,supplier:'Wholesale Sweets',supplierProductId:key,supplierSku:'',product:raw.replace(/\s+-\s+\d+\s*x\s+.*$/i,'').trim(),rawTitle:raw,brand:'',size:size(pack?.[2]||raw),caseQty:qty,casePrice,unitCost:casePrice/qty,ean:'',status,url,source:'Wholesale Sweets catalogue · VAT inclusive',sourcePage:page,checked:new Date().toISOString(),tags:['VAT_INCLUSIVE']})
 }
 return out
}
export async function GET(){try{
 const first=await fetch(BASE+START,{cache:'no-store',headers:H});if(!first.ok)throw new Error('Wholesale Sweets returned '+first.status)
 const fh=await first.text(), pages=maxPage(fh), offers=[...parse(fh,1)]
 for(let i=2;i<=pages;i+=8){const nums=Array.from({length:Math.min(8,pages-i+1)},(_,k)=>i+k);const batch=await Promise.all(nums.map(async p=>{const r=await fetch(BASE+START+'?page='+p,{cache:'no-store',headers:H});return r.ok?parse(await r.text(),p):[]}));batch.forEach(x=>offers.push(...x))}
 const unique=[...new Map(offers.map((x:any)=>[x.supplierProductId,x])).values()].filter((x:any)=>x.status==='IN STOCK').sort((a:any,b:any)=>a.product.localeCompare(b.product))
 if(unique.length<100)throw new Error('Wholesale Sweets catalogue parser found only '+unique.length+' in-stock offers; saved catalogue kept')
 await saveSupplierCatalogue('wholesale-sweets',unique,{cataloguePages:pages,method:'catalogue-first',priceBasis:'VAT inclusive'})
 return NextResponse.json({ok:true,supplier:'Wholesale Sweets',cataloguePages:pages,inStock:unique.length,offers:unique})
}catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Wholesale Sweets sync failed'},{status:500})}}
