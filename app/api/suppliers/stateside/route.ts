import { NextResponse } from 'next/server'
import { saveSupplierCatalogue } from '../../../../lib/catalogue-store'

export const runtime='nodejs'
export const dynamic='force-dynamic'

const BASE='https://statesidedistribution.com'
const HEADERS={'User-Agent':'Stockwise Supplier Catalogue/1.0','Accept':'application/json'}
function n(v:any){const x=Number(v);return Number.isFinite(x)?x:0}
function packFromTitle(title:string){const m=title.match(/(?:pack\s*of|case\s*of|x)\s*(\d+)/i);return m?Number(m[1]):1}
function sizeFromTitle(title:string){const a=[...title.matchAll(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|fl\.?\s*oz)\b/gi)];if(!a.length)return '';const m=a[a.length-1];return m[1]+m[2].replace(/\s+/g,'')}
function cleanTitle(title:string){return title.replace(/\s*[-–]?\s*\(?pack\s*of\s*\d+\)?/ig,'').trim()}
function originFromProduct(p:any){const html=String(p.body_html||'').replace(/<[^>]+>/g,' ');const m=html.match(/Country\s+of\s+Origin\s*:?\s*(?:Made\s+in\s+)?([A-Za-z ]{2,40}?)(?=\s{2,}|Ingredients|Allergen|Nutrition|$)/i);return m?m[1].trim().replace(/United Sates/i,'United States'):''}
const BRAND_PREFIXES=['Candy Paradise','Dr Pepper','Cookie Crisp','Hi-Chew','Big League Chew','Jolly Rancher','Sour Patch Kids','Cocoa Puffs','A&W','7up','Fanta','Amos','Gatorade','Pepsi','Takis','Skittles','Warheads','Hata Ramune','Dunkaroos','Kellogg\'s','Monster','Coca Cola','Crush','Maruchan','Snapple','Sunkist']
function brandFromProduct(p:any,raw:string){const vendor=String(p.vendor||'').trim();if(vendor&&!/stateside distribution|a&a distribution/i.test(vendor))return vendor;const hit=BRAND_PREFIXES.find(b=>raw.toLowerCase().replace(/^\(halal\)\s*/,'').startsWith(b.toLowerCase()));return hit||''}

function offerFromProduct(p:any){
 const available=(p.variants||[]).filter((v:any)=>v.available!==false)
 if(!available.length)return null
 const v=available[0],raw=String(p.title||p.handle||'').trim(),pack=packFromTitle(raw),casePrice=n(v.price)
 return {id:'stateside-'+p.id,supplier:'Stateside Distribution',supplierProductId:String(p.id),supplierSku:v.sku||'',product:cleanTitle(raw),rawTitle:raw,brand:brandFromProduct(p,raw),size:sizeFromTitle(raw),countryOrigin:originFromProduct(p),caseQty:pack,casePrice,unitCost:pack?casePrice/pack:casePrice,ean:v.barcode||'',status:'IN STOCK',url:BASE+'/products/'+p.handle,source:'Stateside Shopify catalogue',checked:new Date().toISOString(),tags:Array.isArray(p.tags)?p.tags:[]}
}

export async function GET(){
 try{
  const offers:any[]=[];let page=1;let scanned=0
  while(page<=10){
   const r=await fetch(BASE+'/collections/all/products.json?limit=250&page='+page,{cache:'no-store',headers:HEADERS})
   if(!r.ok)throw new Error('Stateside catalogue API returned '+r.status+' on page '+page)
   const products=(await r.json()).products||[]
   scanned+=products.length
   offers.push(...products.map(offerFromProduct).filter(Boolean))
   if(products.length<250)break
   page++
  }
  const unique=[...new Map(offers.map((x:any)=>[x.supplierProductId,x])).values()].sort((a:any,b:any)=>a.product.localeCompare(b.product))
  if(unique.length<80)throw new Error('Stateside returned only '+unique.length+' in-stock products; previous saved catalogue kept')
  await saveSupplierCatalogue('stateside',unique,{scannedProducts:scanned,cataloguePages:page,method:'Shopify collection JSON'})
  return NextResponse.json({ok:true,supplier:'Stateside Distribution',scannedProducts:scanned,inStock:unique.length,cataloguePages:page,offers:unique})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Catalogue sync failed'},{status:500})}
}
