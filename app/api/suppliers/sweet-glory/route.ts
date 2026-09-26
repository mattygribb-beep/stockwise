import { NextResponse } from 'next/server'

export const runtime='nodejs'
export const dynamic='force-dynamic'

const BASE='https://sweetandglory.com'
const SEEDS=['/candy','/food','/drinks']
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
 const chunks=text.split(/(?=\bCode:\s*)/i)
 const out:any[]=[]
 for(let i=1;i<chunks.length;i++){
  const c=chunks[i]
  const code=c.match(/^Code:\s*([^\s]+)/i)?.[1]||''
  const before=chunks[i-1]
  const headings=[...before.matchAll(/(?:^|\s)([^.]{3,160}?\s+-\s+\d+ct)\s*(?=Code:|Availability:|$)/gi)]
  let title=headings.length?headings[headings.length-1][1].trim():''
  if(!title){const m=before.match(/([A-Z][^£]{3,140}?\s+-\s+\d+ct)\s*$/i);title=m?.[1]?.trim()||''}
  const availability=c.match(/Availability:\s*([\d,]+)\s*In Stock/i)
  const pack=c.match(/Pack Quantity:\s*(\d+)/i)
  const expiry=c.match(/Expiry Date:\s*([0-9/]+)/i)
  const priceMatches=[...c.matchAll(/£([\d,.]+)\s*Ex VAT/gi)]
  const unit=c.match(/£([\d,.]+)\s*Ex VAT per unit/i)
  if(!code||!title||!availability||!pack||!priceMatches.length)continue
  const casePrice=num(priceMatches[priceMatches.length-1][1]),caseQty=num(pack[1])
  out.push({id:'sweet-glory-'+code,supplier:'Sweet & Glory',supplierProductId:code,supplierSku:code,product:title.replace(/\s+-\s+\d+ct\s*$/i,'').trim(),rawTitle:title,brand:brandFromPath(path),size:sizeFromTitle(title),caseQty,casePrice,unitCost:unit?num(unit[1]):casePrice/caseQty,ean:'',stockQty:num(availability[1]),expiry:expiry?.[1]||'',status:'IN STOCK',url:BASE+path,source:'Sweet & Glory live catalogue',checked:new Date().toISOString()})
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
