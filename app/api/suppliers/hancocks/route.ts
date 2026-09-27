import { NextResponse } from 'next/server'
import { saveSupplierCatalogue } from '../../../../lib/catalogue-store'
export const runtime='nodejs';export const dynamic='force-dynamic'
const BASE='https://www.hancocks.co.uk'
const clean=(s:string)=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim()
export async function GET(){try{const offers:any[]=[]
 for(let page=1;page<=15;page++){const url=BASE+'/american-all'+(page>1?'?page='+page:'');const r=await fetch(url,{cache:'no-store',headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html,application/xhtml+xml'}});if(!r.ok)continue;const txt=clean(await r.text())
 const re=/(.{3,220}?)\s+Pack Size:\s*(\d+)\s*x\s*(.{1,80}?)\s+Sell at:\s*£[\d.]+\s+Per Piece\s+POR:[\d.]+%(?:Offers Available)?(?:Not available for:Click & Collect)?(?:\s+£[\d.]+)?\s+£\s*(\d+(?:\.\d{1,2})?)\s+ex VAT/gi
 for(const m of txt.matchAll(re)){let name=m[1].trim().replace(/^Add\s+/i,'');const qty=Number(m[2]),price=Number(m[4]);if(!name||name.length>220||!qty||!price)continue;const id=(name+'|'+qty+'|'+m[3]).toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,180);offers.push({supplierProductId:id,supplierSku:id,product:name,rawTitle:name,size:m[3].trim(),caseQty:qty,casePrice:price,unitCost:Math.round(price/qty*10000)/10000,ean:'',status:'IN STOCK',url,source:'Hancocks public American catalogue'})}}
 const unique=[...new Map(offers.map(x=>[x.supplierProductId,x])).values()]
 if(unique.length<10)throw new Error('Hancocks parser found only '+unique.length+' offers; saved catalogue kept')
 await saveSupplierCatalogue('hancocks',unique,{method:'public American catalogue text parser',pricingBasis:'ex VAT'})
 return NextResponse.json({ok:true,supplier:'Hancocks',inStock:unique.length,priceBasis:'EX VAT',offers:unique})
}catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Hancocks sync failed'},{status:500})}}