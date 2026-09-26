import { NextResponse } from 'next/server'
import { saveSupplierCatalogue } from '../../../../lib/catalogue-store'
export const runtime='nodejs';export const dynamic='force-dynamic'
const BASE='https://candycargo.co.uk'
const size=(s:string)=>{const a=[...String(s).matchAll(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz)\b/gi)];return a.length?a[a.length-1][1]+a[a.length-1][2]:''}
const qty=(s:string)=>{const m=s.match(/\b(\d+)\s*[xX]\s*\d/i)||s.match(/\b(\d+)\s*(?:pack|pcs|ct)\b/i);return m?+m[1]:1}
export async function GET(){try{const offers:any[]=[];let page=1,scanned=0
while(page<=30){const r=await fetch(BASE+'/collections/all/products.json?limit=250&page='+page,{cache:'no-store'});if(!r.ok)throw new Error('Candy Cargo catalogue returned '+r.status);const ps=(await r.json()).products||[];scanned+=ps.length
for(const p of ps){const v=(p.variants||[]).find((x:any)=>x.available!==false);if(!v)continue;const title=String(p.title||'').trim(),price=Number(v.price),q=qty(title);if(!title||!price)continue;offers.push({supplierProductId:String(p.id),supplierSku:v.sku||'',product:title,rawTitle:title,brand:p.vendor||'',size:size(title),caseQty:q,casePrice:price,unitCost:price/q,ean:v.barcode||'',status:'IN STOCK',url:BASE+'/products/'+p.handle,source:'Candy Cargo Shopify catalogue',sourcePage:page})}
if(ps.length<250)break;page++}
const unique=[...new Map(offers.map(x=>[x.supplierProductId,x])).values()];if(unique.length<20)throw new Error('Candy Cargo returned only '+unique.length+' offers; saved catalogue kept');await saveSupplierCatalogue('candy-cargo',unique,{cataloguePages:page,scannedProducts:scanned,method:'Shopify collection JSON'});return NextResponse.json({ok:true,supplier:'Candy Cargo',cataloguePages:page,scannedProducts:scanned,inStock:unique.length,offers:unique})}catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Candy Cargo sync failed'},{status:500})}}