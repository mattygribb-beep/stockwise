import { NextResponse } from 'next/server'
import { saveSupplierCatalogue } from '../../../../lib/catalogue-store'
export const runtime='nodejs';export const dynamic='force-dynamic'
const BASE='https://www.worldcandies.co.uk'
const textify=(s:string)=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim()
export async function GET(){try{
 const r=await fetch(BASE+'/',{cache:'no-store',headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36','Accept':'text/html,application/xhtml+xml','Accept-Language':'en-GB,en;q=0.9'}})
 if(!r.ok)throw new Error('World Candies returned '+r.status)
 const html=await r.text(), txt=textify(html), offers:any[]=[]
 const re=/Pack:\s*(\d+)\s+Origin:\s*(.*?)\s+Model:\s*([A-Za-z0-9_-]+)\s+(.{3,260}?)\s+£\s*(\d+(?:\.\d{1,2})?)/gi
 for(const m of txt.matchAll(re)){const q=Number(m[1]),price=Number(m[5]);let name=m[4].trim();name=name.split('...')[0].trim();const repeated=name.match(/^(.{8,120}?)\s+\1/i);if(repeated)name=repeated[1];if(!q||!price||!name)continue;offers.push({supplierProductId:m[3],supplierSku:m[3],product:name,rawTitle:name,brand:'',caseQty:q,casePrice:price,unitCost:Math.round(price/q*10000)/10000,ean:'',status:'IN STOCK',url:BASE,source:'World Candies public catalogue'})}
 const unique=[...new Map(offers.map(x=>[x.supplierProductId,x])).values()]
 if(unique.length<5)throw new Error('World Candies parser found only '+unique.length+' offers; saved catalogue kept')
 await saveSupplierCatalogue('world-candies',unique,{method:'public catalogue text parser',pricingBasis:'displayed site price'})
 return NextResponse.json({ok:true,supplier:'World Candies',inStock:unique.length,offers:unique})
}catch(e:any){return NextResponse.json({ok:false,error:e?.message||'World Candies sync failed'},{status:500})}}