import { NextResponse } from 'next/server'
import { saveSupplierCatalogue } from '../../../../lib/catalogue-store'

export const runtime='nodejs'
export const dynamic='force-dynamic'

const BASE='https://www.wholesalesweets.co.uk'
const START='/shop-online-1137'
const HEADERS={'User-Agent':'Flip Lead Supplier Catalogue/1.0','Accept':'text/html,application/xhtml+xml'}

function decode(s:string){return s.replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/&pound;/gi,'£').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
function num(s:string){const x=Number(String(s||'').replace(/,/g,''));return Number.isFinite(x)?x:0}
function absolute(u:string){if(!u)return '';if(u.startsWith('http'))return u;return BASE+(u.startsWith('/')?'':'/')+u}
function sizeFromTitle(t:string){const a=[...t.matchAll(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|fl\.?\s*oz)\b/gi)];if(!a.length)return '';const m=a[a.length-1];return m[1]+m[2].replace(/\s+/g,'')}
function caseQtyFromText(t:string){const m=t.match(/\b(\d+)\s*x\s*(?:\(|\d|[A-Za-z])/i);return m?Number(m[1]):1}
function cleanTitle(t:string){return decode(t).replace(/\s+-\s+\d+\s*x\s+.*$/i,'').trim()}

function listingLinks(html:string){
 const out=new Set<string>()
 for(const m of html.matchAll(/href=["']([^"'#?]+)["']/gi)){
  const u=m[1]
  if(!u.startsWith('/')||u.startsWith('/images/')||u.startsWith('/shop-online-')||u.split('/').filter(Boolean).length!==1)continue
  out.add(u)
 }
 return [...out]
}
function maxPage(html:string){
 let max=1
 for(const m of html.matchAll(/[?&](?:page|p)=(\d+)/gi))max=Math.max(max,Number(m[1]))
 const shown=decode(html).match(/Showing\s+\d+\s+of\s+([\d,]+)/i)
 if(shown)max=Math.max(max,Math.ceil(num(shown[1])/20))
 return Math.min(max,250)
}
function parseProduct(html:string,url:string){
 const text=decode(html)
 const h1=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
 const code=text.match(/Product Code:\s*([^\s]+)/i)
 const packLine=text.match(/(?:Pack Size:\s*)?((\d+)\s*x\s+[^£]{1,80}?)(?=\s+(?:Product Code:|Availability|Image:|Offers|Our Price|£))/i)
 const prices=[...text.matchAll(/£([\d,.]+)\s+(?:Inc\.?\s*VAT|inc\.\s*VAT)/gi)].map(m=>num(m[1])).filter(Boolean)
 const fallback=[...text.matchAll(/£([\d,.]+)/g)].map(m=>num(m[1])).filter(Boolean)
 const casePrice=prices.length?prices[prices.length-1]:(fallback.length?fallback[fallback.length-1]:0)
 if(!h1||!code||!casePrice)return null
 const rawTitle=decode(h1[1]),packText=packLine?packLine[1]:rawTitle,caseQty=caseQtyFromText(packText)
 const status=/Out of Stock/i.test(text)?'OUT OF STOCK':'IN STOCK'
 return {id:'wholesale-sweets-'+code[1],supplier:'Wholesale Sweets',supplierProductId:code[1],supplierSku:code[1],product:cleanTitle(rawTitle),rawTitle,brand:'',size:sizeFromTitle(packText||rawTitle),caseQty,casePrice,unitCost:caseQty?casePrice/caseQty:casePrice,ean:'',status,url,source:'Wholesale Sweets live catalogue · VAT inclusive',checked:new Date().toISOString(),tags:['VAT_INCLUSIVE']}
}

export async function GET(){
 try{
  const first=await fetch(BASE+START,{cache:'no-store',headers:HEADERS})
  if(!first.ok)throw new Error('Wholesale Sweets returned '+first.status)
  const firstHtml=await first.text(),pages=maxPage(firstHtml),links=new Set<string>(listingLinks(firstHtml))
  for(let page=2;page<=pages;page++){
   const r=await fetch(BASE+START+'?page='+page,{cache:'no-store',headers:HEADERS})
   if(r.ok)listingLinks(await r.text()).forEach(x=>links.add(x))
  }
  const urls=[...links].map(absolute),offers:any[]=[]
  for(let i=0;i<urls.length;i+=12){
   const batch=urls.slice(i,i+12)
   const found=await Promise.all(batch.map(async url=>{try{const r=await fetch(url,{cache:'no-store',headers:HEADERS});return r.ok?parseProduct(await r.text(),url):null}catch{return null}}))
   offers.push(...found.filter(Boolean))
  }
  const unique=[...new Map(offers.map((x:any)=>[x.supplierProductId,x])).values()].sort((a:any,b:any)=>a.product.localeCompare(b.product))
  if(unique.length<100)throw new Error('Wholesale Sweets returned only '+unique.length+' valid products; previous saved catalogue kept')
  await saveSupplierCatalogue('wholesale-sweets',unique,{cataloguePages:pages,productPages:urls.length,priceBasis:'VAT inclusive'})
  return NextResponse.json({ok:true,supplier:'Wholesale Sweets',cataloguePages:pages,productPages:urls.length,offers:unique})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Wholesale Sweets catalogue sync failed'},{status:500})}
}
