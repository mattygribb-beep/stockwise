import { NextResponse } from 'next/server'
import { saveSupplierCatalogue } from '../../../../lib/catalogue-store'
import { cleanProductTitle, isNonProductTitle } from '../../../../lib/product-parser'
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60
const BASE='https://www.wholesalesweets.co.uk',START='/shop-online-1137'
const H={'User-Agent':'Flip Lead Supplier Catalogue/1.0','Accept':'text/html,application/xhtml+xml'}
const d=(s:string)=>s.replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/&pound;|&#163;/gi,'£').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
const n=(s:string)=>{const x=Number(String(s||'').replace(/,/g,''));return Number.isFinite(x)?x:0}
const size=(s:string)=>{const a=[...s.matchAll(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|fl\.?\s*oz)\b/gi)];return a.length?a[a.length-1][1]+a[a.length-1][2].replace(/\s+/g,''):''}
const origin=(s:string)=>/\b(?:Chinese|China)\b/i.test(s)?'China':/\b(?:Canadian|Canada|CAN)\b/i.test(s)?'Canada':/\b(?:Japanese|Japan)\b/i.test(s)?'Japan':/\bMexican\b/i.test(s)?'Mexico':/\b(?:USA|US Version|American)\b/i.test(s)?'United States':''
const qty=(s:string)=>{const m=s.match(/\b(\d+)\s*x\s*(?:\d|[A-Za-z])/i);return m?+m[1]:1}
function totalPages(h:string){const t=d(h).match(/Showing\s+\d+\s+of\s+([\d,]+)/i);return t?Math.ceil(n(t[1])/20):1}
function parse(h:string,page:number){
 const candidates:any[]=[]
 // Product title links contain the case/pack description. Accept relative OR absolute hrefs.
 const re=/<a\b[^>]*href=["']((?:https?:\/\/www\.wholesalesweets\.co\.uk)?\/([^"'?#/]+))[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi
 for(const m of h.matchAll(re)){const title=d(m[3]||'');if(!title||!(/\b\d+\s*x\s*\d/i.test(title)||/\b\d+(?:\.\d+)?\s*(?:kg|g|ml|l)\b/i.test(title)))continue;candidates.push({idx:m.index||0,path:'/'+m[2],title})}
 const out:any[]=[]
 for(let i=0;i<candidates.length;i++){const c=candidates[i],end=i+1<candidates.length?candidates[i+1].idx:Math.min(h.length,c.idx+12000),block=h.slice(c.idx,end),text=d(block)
  const inc=[...text.matchAll(/£\s*([\d,.]+)\s*inc\.?\s*VAT/gi)].map(x=>n(x[1])).filter(Boolean)
  if(!inc.length)continue
  const casePrice=inc[inc.length-1],pack=text.match(/\b(\d+)\s*x\s*([^£]{1,70}?)(?=\s+(?:Offers Available|Out of Stock|£|Add to Basket|$))/i),q=pack?+pack[1]:qty(c.title)
  out.push({id:'wholesale-sweets-'+c.path.slice(1),supplier:'Wholesale Sweets',supplierProductId:c.path.slice(1),supplierSku:'',product:c.title,rawTitle:c.title,brand:'',size:size(pack?.[2]||c.title),countryOrigin:origin(c.title),caseQty:q,casePrice,unitCost:casePrice/q,ean:'',status:/Out of Stock/i.test(text)?'OUT OF STOCK':'IN STOCK',url:BASE+c.path,source:'Wholesale Sweets catalogue · VAT inclusive',sourcePage:page,checked:new Date().toISOString(),tags:['VAT_INCLUSIVE']})
 }
 return out
}
async function getPage(page:number){const r=await fetch(BASE+START+(page===1?'':'?page='+page),{cache:'no-store',headers:H});if(!r.ok)throw new Error('Wholesale Sweets page '+page+' returned '+r.status);const h=await r.text();return {h,offers:parse(h,page)}}
export async function GET(){try{
 const first=await getPage(1),pages=totalPages(first.h),offers=[...first.offers]
 for(let i=2;i<=pages;i+=20){const nums=Array.from({length:Math.min(20,pages-i+1)},(_,k)=>i+k);const batch=await Promise.all(nums.map(getPage));batch.forEach(x=>offers.push(...x.offers))}
 const all=[...new Map(offers.map((x:any)=>[x.supplierProductId,x])).values()],unique=all.filter((x:any)=>x.status==='IN STOCK').map((x:any)=>({...x,product:cleanProductTitle(x.product)})).filter((x:any)=>!isNonProductTitle(x.product)).sort((a:any,b:any)=>a.product.localeCompare(b.product))
 if(unique.length<500)throw new Error('Wholesale Sweets parser found only '+unique.length+' in-stock offers from '+all.length+' products across '+pages+' pages; saved catalogue kept')
 await saveSupplierCatalogue('wholesale-sweets',unique,{cataloguePages:pages,productsSeen:all.length,method:'catalogue-title-links',priceBasis:'VAT inclusive'})
 return NextResponse.json({ok:true,supplier:'Wholesale Sweets',cataloguePages:pages,productsSeen:all.length,inStock:unique.length,offers:unique})
}catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Wholesale Sweets sync failed'},{status:500})}}
