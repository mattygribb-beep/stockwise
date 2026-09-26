import { NextResponse } from 'next/server'
import { saveSupplierCatalogue } from '../../../../lib/catalogue-store'
export const runtime='nodejs';export const dynamic='force-dynamic'
const BASE='https://americancandyuk.co.uk', START='/collections/wholesale'
const H={'User-Agent':'Flip Lead Supplier Catalogue/1.0','Accept':'application/json'}
const n=(v:any)=>{const x=Number(v);return Number.isFinite(x)?x:0}
const size=(s:string)=>{const a=[...String(s).matchAll(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|fl\.?\s*oz)\b/gi)];return a.length?a[a.length-1][1]+a[a.length-1][2].replace(/\s+/g,''):''}
const qty=(s:string)=>{const patterns=[/\b(?:case|box)\s+of\s+(\d+)/i,/\((\d+)\s*x\s*[^)]+\)/i,/\b(\d+)\s*pack\b/i,/\b(\d+)\s*x\s*\d/i];for(const p of patterns){const m=s.match(p);if(m)return +m[1]}return 1}
export async function GET(){try{
 const offers:any[]=[];let page=1,scanned=0
 while(page<=30){const r=await fetch(BASE+START+'/products.json?limit=250&page='+page,{cache:'no-store',headers:H});if(!r.ok)throw new Error("King's Candy catalogue API returned "+r.status);const ps=(await r.json()).products||[];scanned+=ps.length
  for(const p of ps){const v=(p.variants||[]).find((x:any)=>x.available!==false);if(!v)continue;const raw=String(p.title||'').trim(),q=qty(raw),price=n(v.price);if(!raw||!price)continue
   offers.push({id:'kings-candy-'+p.id,supplier:"King's Candy",supplierProductId:String(p.id),supplierSku:v.sku||'',product:raw,rawTitle:raw,brand:p.vendor||'',size:size(raw),caseQty:q,casePrice:price,unitCost:price/q,ean:v.barcode||'',status:'IN STOCK',url:BASE+'/products/'+p.handle,source:"King's Candy Shopify wholesale collection",sourcePage:page,checked:new Date().toISOString()})}
  if(ps.length<250)break;page++}
 const unique=[...new Map(offers.map((x:any)=>[x.supplierProductId,x])).values()].sort((a:any,b:any)=>a.product.localeCompare(b.product))
 if(unique.length<30)throw new Error("King's Candy returned only "+unique.length+" in-stock wholesale offers; saved catalogue kept")
 await saveSupplierCatalogue('kings-candy',unique,{cataloguePages:page,scannedProducts:scanned,method:'Shopify collection JSON'})
 return NextResponse.json({ok:true,supplier:"King's Candy",cataloguePages:page,scannedProducts:scanned,inStock:unique.length,offers:unique})
}catch(e:any){return NextResponse.json({ok:false,error:e?.message||"King's Candy sync failed"},{status:500})}}
