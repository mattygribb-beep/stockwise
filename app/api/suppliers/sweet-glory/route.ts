import { NextResponse } from 'next/server'

export const runtime='nodejs'
export const dynamic='force-dynamic'

const BASE='https://sweetandglory.com'
const SEEDS=['/candy','/chocolate','/grocery','/soft-drinks','/brands','/location','/just-landed']
const HEADERS={'User-Agent':'Stockwise Supplier Catalogue/1.0','Accept':'text/html,application/xhtml+xml'}

function decode(s:string){return s.replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&pound;/g,'£').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
function num(s:string){const n=Number((s||'').replace(/,/g,''));return Number.isFinite(n)?n:0}
function sizeFromTitle(t:string){const a=[...t.matchAll(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|fl\.?\s*oz)\b/gi)];if(!a.length)return '';const m=a[a.length-1];return m[1]+m[2].replace(/\s+/g,'')}
function brandFromPath(path:string){const m=path.match(/\/([^/]+)-wholesale-uk\/?$/);return m?m[1].replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):''}

function links(html:string){
 const out=new Set<string>()
 for(const m of html.matchAll(/href=["']([^"'#?]+)["']/gi)){
  const p=m[1].replace(BASE,'')
  if(/^\/brands\/[a-z0-9-]+\/[a-z0-9-]+-wholesale-uk\/?$/i.test(p))out.add(p)
 }
 return [...out]
}

function parseProducts(html:string,path:string){
 const text=decode(html)
 const re=/([^£]{3,180}?\s+-\s+(\d+)ct)\s+Code:\s*([^\s]+)\s+Availability:\s*([\d,]+)\s+In Stock\s+Pack Quantity:\s*(\d+)\s+Expiry Date:\s*([0-9/]+)\s+(?:\(RRP £[\d,.]+ Save £[\d,.]+\)\s*)?£([\d,.]+)\s*Ex VAT\s*\(£([\d,.]+)\s*Ex VAT per unit\)/gi
 const out:any[]=[]
 for(const m of text.matchAll(re)){
  let title=m[1].trim().replace(/^(?:Qty:|Add To Basket|Notify Me|\d+|Alphabetical|Price|Custom)\s+/gi,'').trim()
  const code=m[3], stock=num(m[4]), caseQty=num(m[5]), expiry=m[6], casePrice=num(m[7]), unitCost=num(m[8])
  if(!title||!code||!caseQty||!casePrice||!unitCost)continue
  out.push({id:'sweet-glory-'+code,supplier:'Sweet & Glory',supplierProductId:code,supplierSku:code,product:title.replace(/\s+-\s+\d+ct\s*$/i,'').trim(),rawTitle:title,brand:brandFromPath(path),size:sizeFromTitle(title),caseQty,casePrice,unitCost,ean:'',stockQty:stock,expiry,status:'IN STOCK',url:BASE+path,source:'Sweet & Glory live catalogue',checked:new Date().toISOString()})
 }
 return out
}

export async function GET(){
 try{
  const seedHtml=await Promise.all(SEEDS.map(async path=>{const r=await fetch(BASE+path,{cache:'no-store',headers:HEADERS});return r.ok?await r.text():''}))
  const brandPaths=new Set<string>()
  seedHtml.forEach(h=>links(h).forEach(x=>brandPaths.add(x)))
  const paths=[...brandPaths]
  const offers:any[]=[]
  for(let i=0;i<paths.length;i+=12){
   const batch=paths.slice(i,i+12)
   const pages=await Promise.all(batch.map(async path=>{const r=await fetch(BASE+path,{cache:'no-store',headers:HEADERS});return r.ok?parseProducts(await r.text(),path):[]}))
   pages.forEach(p=>offers.push(...p))
  }
  const unique=[...new Map(offers.map(x=>[x.supplierSku,x])).values()].sort((a:any,b:any)=>a.product.localeCompare(b.product))
  return NextResponse.json({ok:true,supplier:'Sweet & Glory',brandPages:paths.length,inStock:unique.length,offers:unique})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Sweet & Glory catalogue sync failed'},{status:500})}
}
