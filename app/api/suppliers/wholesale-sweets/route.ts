import { NextResponse } from 'next/server'
import { saveSupplierCatalogue } from '../../../../lib/catalogue-store'
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60
const BASE='https://www.wholesalesweets.co.uk',START='/shop-online-1137'
const H={'User-Agent':'Flip Lead Supplier Catalogue/1.0','Accept':'text/html,application/xhtml+xml'}
const d=(s:string)=>s.replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/&pound;/gi,'£').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
const n=(s:string)=>{const x=Number(String(s||'').replace(/,/g,''));return Number.isFinite(x)?x:0}
const size=(s:string)=>{const a=[...s.matchAll(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|fl\.?\s*oz)\b/gi)];return a.length?a[a.length-1][1]+a[a.length-1][2].replace(/\s+/g,''):''}
const qty=(s:string)=>{const m=s.match(/\b(\d+)\s*x\s*(?:\(|\d|[A-Za-z])/i);return m?+m[1]:1}
const titleCase=(slug:string)=>slug.split('-').filter(Boolean).map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(' ')
function totalPages(h:string){const t=d(h).match(/Showing\s+\d+\s+of\s+([\d,]+)/i);return t?Math.ceil(n(t[1])/20):1}
function parse(h:string,page:number){
 const out:any[]=[];const seen=new Set<string>()
 // Each catalogue product terminates at an Add to Basket control. Work backwards inside that product block.
 const blocks=h.split(/Add\s*to\s*Basket/i)
 for(let i=0;i<blocks.length-1;i++){
  const block=blocks[i].slice(-12000),text=d(block)
  const links=[...block.matchAll(/<a\b([^>]*)href=["'](\/[^"'?#/]+)["']([^>]*)>([\s\S]*?)<\/a>/gi)]
  if(!links.length)continue
  const m=links[links.length-1],path=m[2]
  if(seen.has(path)||/^\/(?:new|deals|brands|login|account|basket|search|help|contact|about)/i.test(path))continue
  const attrs=(m[1]||'')+' '+(m[3]||''),inside=d(m[4]||'')
  const attrTitle=attrs.match(/(?:aria-label|title)=["']([^"']{4,220})["']/i)?.[1]||''
  // Prefer visible/accessible title; fall back to the product slug only when needed.
  let raw=d(inside||attrTitle);if(raw.length<4||/^(?:view|image|add|more)$/i.test(raw))raw=titleCase(path.slice(1))
  const inc=[...text.matchAll(/£([\d,.]+)\s*inc\.?\s*VAT/gi)].map(x=>n(x[1])).filter(Boolean)
  if(!inc.length)continue
  const casePrice=inc[inc.length-1]
  const packMatches=[...text.matchAll(/(?:Pack Size:\s*)?\b(\d+)\s*x\s*([^£]{1,80}?)(?=\s+(?:Offers Available|Out of Stock|£|Add|$))/gi)]
  const pack=packMatches.length?packMatches[packMatches.length-1]:null,q=pack?+pack[1]:qty(raw)
  const status=/Out of Stock/i.test(text.slice(-1500))?'OUT OF STOCK':'IN STOCK'
  seen.add(path)
  out.push({id:'wholesale-sweets-'+path.slice(1),supplier:'Wholesale Sweets',supplierProductId:path.slice(1),supplierSku:'',product:raw,rawTitle:raw,brand:'',size:size(pack?.[2]||raw),caseQty:q,casePrice,unitCost:casePrice/q,ean:'',status,url:BASE+path,source:'Wholesale Sweets catalogue · VAT inclusive',sourcePage:page,checked:new Date().toISOString(),tags:['VAT_INCLUSIVE']})
 }
 return out
}
async function getPage(page:number){const r=await fetch(BASE+START+(page===1?'':'?page='+page),{cache:'no-store',headers:H});if(!r.ok)throw new Error('Wholesale Sweets page '+page+' returned '+r.status);const h=await r.text();return {h,offers:parse(h,page)}}
export async function GET(){try{
 const first=await getPage(1),pages=totalPages(first.h),offers=[...first.offers]
 for(let i=2;i<=pages;i+=20){const nums=Array.from({length:Math.min(20,pages-i+1)},(_,k)=>i+k);const batch=await Promise.all(nums.map(getPage));batch.forEach(x=>offers.push(...x.offers))}
 const all=[...new Map(offers.map((x:any)=>[x.supplierProductId,x])).values()],unique=all.filter((x:any)=>x.status==='IN STOCK').sort((a:any,b:any)=>a.product.localeCompare(b.product))
 if(unique.length<500)throw new Error('Wholesale Sweets parser found only '+unique.length+' in-stock offers from '+all.length+' products across '+pages+' pages; saved catalogue kept')
 await saveSupplierCatalogue('wholesale-sweets',unique,{cataloguePages:pages,productsSeen:all.length,method:'catalogue-blocks',priceBasis:'VAT inclusive'})
 return NextResponse.json({ok:true,supplier:'Wholesale Sweets',cataloguePages:pages,productsSeen:all.length,inStock:unique.length,offers:unique})
}catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Wholesale Sweets sync failed'},{status:500})}}
