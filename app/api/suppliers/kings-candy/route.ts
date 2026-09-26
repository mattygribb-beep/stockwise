import { NextResponse } from 'next/server'
import { saveSupplierCatalogue } from '../../../../lib/catalogue-store'
export const runtime='nodejs';export const dynamic='force-dynamic'
const BASE='https://americancandyuk.co.uk', START='/collections/wholesale'
const H={'User-Agent':'Flip Lead Supplier Catalogue/1.0','Accept':'text/html,application/xhtml+xml'}
const d=(s:string)=>s.replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/&pound;/gi,'£').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
const n=(s:string)=>{const x=Number((s||'').replace(/,/g,''));return Number.isFinite(x)?x:0}
const size=(s:string)=>{const a=[...s.matchAll(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|fl\.?\s*oz)\b/gi)];return a.length?a[a.length-1][1]+a[a.length-1][2].replace(/\s+/g,''):''}
function pages(h:string){let x=1;for(const m of h.matchAll(/[?&]page=(\d+)/gi))x=Math.max(x,+m[1]);return Math.min(x,50)}
function parse(h:string,page:number){
 const out:any[]=[]; const seen=new Set<string>()
 // Shopify collection markup: each product card links to /products/<handle>. Keep all extraction on collection pages.
 const re=/<a[^>]+href=["'](\/products\/([^"'?#]+))[^"']*["'][^>]*>([\s\S]{0,5000}?)(?=<a[^>]+href=["']\/products\/|$)/gi
 for(const m of h.matchAll(re)){
  const path=m[1],handle=m[2];if(seen.has(handle))continue;seen.add(handle)
  const block=m[0], text=d(block)
  const titleAttr=block.match(/(?:aria-label|title)=["']([^"']{3,180})["']/i)
  const heading=block.match(/<(?:h2|h3|span)[^>]*class=["'][^"']*(?:title|product)[^"']*["'][^>]*>([\s\S]*?)<\/(?:h2|h3|span)>/i)
  let raw=d(titleAttr?.[1]||heading?.[1]||'');if(!raw)continue
  const prices=[...text.matchAll(/£([\d,.]+)/g)].map(x=>n(x[1])).filter(Boolean);if(!prices.length)continue
  const casePrice=prices[prices.length-1], pack=raw.match(/\b(\d+)\s*[xX]\s*(.+)$/), qty=pack?+pack[1]:1
  const bbd=text.match(/(?:Best Before|BBD|BBE)\s*:?\s*([0-3]?\d[\/.-][01]?\d[\/.-](?:20)?\d{2})/i)
  const status=/sold out|out of stock/i.test(text)?'OUT OF STOCK':'IN STOCK'
  out.push({id:'kings-candy-'+handle,supplier:"King's Candy",supplierProductId:handle,supplierSku:'',product:raw.replace(/^\d+\s*[xX]\s*/,'').trim(),rawTitle:raw,brand:'',size:size(pack?.[2]||raw),caseQty:qty,casePrice,unitCost:casePrice/qty,ean:'',expiry:bbd?.[1]||'',status,url:BASE+path,source:"King's Candy wholesale catalogue",sourcePage:page,checked:new Date().toISOString()})
 }
 return out
}
export async function GET(){try{
 const first=await fetch(BASE+START+'?view=all',{cache:'no-store',headers:H});if(!first.ok)throw new Error("King's Candy returned "+first.status)
 const fh=await first.text();let offers=parse(fh,1), max=pages(fh)
 if(max>1)for(let i=2;i<=max;i+=6){const nums=Array.from({length:Math.min(6,max-i+1)},(_,k)=>i+k);const b=await Promise.all(nums.map(async p=>{const r=await fetch(BASE+START+'?page='+p,{cache:'no-store',headers:H});return r.ok?parse(await r.text(),p):[]}));b.forEach(x=>offers.push(...x))}
 const unique=[...new Map(offers.map((x:any)=>[x.supplierProductId,x])).values()].filter((x:any)=>x.status==='IN STOCK').sort((a:any,b:any)=>a.product.localeCompare(b.product))
 if(unique.length<30)throw new Error("King's Candy catalogue parser found only "+unique.length+" in-stock offers; saved catalogue kept")
 await saveSupplierCatalogue('kings-candy',unique,{cataloguePages:max,method:'catalogue-first'})
 return NextResponse.json({ok:true,supplier:"King's Candy",cataloguePages:max,inStock:unique.length,offers:unique})
}catch(e:any){return NextResponse.json({ok:false,error:e?.message||"King's Candy sync failed"},{status:500})}}
