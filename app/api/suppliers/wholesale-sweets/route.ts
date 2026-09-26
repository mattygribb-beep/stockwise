import { NextResponse } from 'next/server'
import { saveSupplierCatalogue } from '../../../../lib/catalogue-store'
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60
const BASE='https://www.wholesalesweets.co.uk',START='/shop-online-1137'
const H={'User-Agent':'Flip Lead Supplier Catalogue/1.0','Accept':'text/html,application/xhtml+xml'}
const d=(s:string)=>s.replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/&pound;/gi,'£').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
const n=(s:string)=>{const x=Number(String(s||'').replace(/,/g,''));return Number.isFinite(x)?x:0}
const size=(s:string)=>{const a=[...s.matchAll(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|fl\.?\s*oz)\b/gi)];return a.length?a[a.length-1][1]+a[a.length-1][2].replace(/\s+/g,''):''}
const qty=(s:string)=>{const m=s.match(/\b(\d+)\s*x\s*(?:\d|[A-Za-z])/i);return m?+m[1]:1}
function totalPages(h:string){const t=d(h).match(/Showing\s+\d+\s+of\s+([\d,]+)/i);if(t)return Math.min(250,Math.ceil(n(t[1])/20));let x=1;for(const m of h.matchAll(/[?&]page=(\d+)/gi))x=Math.max(x,+m[1]);return x}
function parse(h:string,page:number){
 const out:any[]=[];const seen=new Set<string>()
 // Product links are root-level URLs. Read each catalogue entry from its product link through Add to Basket.
 const re=/<a\b[^>]*href=["'](\/[^"'?#/]+)["'][^>]*>([\s\S]*?)<\/a>/gi
 const matches=[...h.matchAll(re)]
 for(let i=0;i<matches.length;i++){
  const m=matches[i],path=m[1],anchor=d(m[2]);if(!anchor||anchor.length<4||seen.has(path))continue
  const start=m.index||0,end=Math.min(h.length,start+7000),chunk=h.slice(start,end)
  const basket=chunk.search(/Add\s*to\s*Basket/i);if(basket<0)continue
  const block=chunk.slice(0,basket+300),text=d(block)
  const prices=[...text.matchAll(/£([\d,.]+)\s*(?:inc\.?\s*VAT)?/gi)].map(x=>n(x[1])).filter(Boolean)
  if(!prices.length)continue
  // Require pack/price signals so navigation links cannot become products.
  const pack=text.match(/\b(\d+)\s*x\s*([^£]{1,70}?)(?=\s+(?:Offers Available|Out of Stock|£|Add to Basket))/i)
  if(!pack&&!/\b\d+(?:\.\d+)?\s*(?:kg|g|ml|l)\b/i.test(anchor))continue
  const q=pack?+pack[1]:qty(anchor),casePrice=prices[prices.length-1]
  const status=/Out of Stock/i.test(text)?'OUT OF STOCK':'IN STOCK'
  seen.add(path)
  out.push({id:'wholesale-sweets-'+path.slice(1),supplier:'Wholesale Sweets',supplierProductId:path.slice(1),supplierSku:'',product:anchor,rawTitle:anchor,brand:'',size:size(pack?.[2]||anchor),caseQty:q,casePrice,unitCost:casePrice/q,ean:'',status,url:BASE+path,source:'Wholesale Sweets catalogue · VAT inclusive',sourcePage:page,checked:new Date().toISOString(),tags:['VAT_INCLUSIVE']})
 }
 return out
}
async function getPage(page:number){const r=await fetch(BASE+START+(page===1?'':'?page='+page),{cache:'no-store',headers:H});if(!r.ok)throw new Error('Wholesale Sweets page '+page+' returned '+r.status);const h=await r.text();return {h,offers:parse(h,page)}}
export async function GET(){try{
 const first=await getPage(1),pages=totalPages(first.h),offers=[...first.offers]
 for(let i=2;i<=pages;i+=20){const nums=Array.from({length:Math.min(20,pages-i+1)},(_,k)=>i+k);const batch=await Promise.all(nums.map(getPage));batch.forEach(x=>offers.push(...x.offers))}
 const all=[...new Map(offers.map((x:any)=>[x.supplierProductId,x])).values()],unique=all.filter((x:any)=>x.status==='IN STOCK').sort((a:any,b:any)=>a.product.localeCompare(b.product))
 if(unique.length<500)throw new Error('Wholesale Sweets parser found only '+unique.length+' in-stock offers across '+pages+' pages; saved catalogue kept')
 await saveSupplierCatalogue('wholesale-sweets',unique,{cataloguePages:pages,productsSeen:all.length,method:'catalogue-first',priceBasis:'VAT inclusive'})
 return NextResponse.json({ok:true,supplier:'Wholesale Sweets',cataloguePages:pages,productsSeen:all.length,inStock:unique.length,offers:unique})
}catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Wholesale Sweets sync failed'},{status:500})}}
