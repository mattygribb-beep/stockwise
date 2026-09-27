import { NextResponse } from 'next/server'
import { saveSupplierCatalogue } from '../../../../lib/catalogue-store'
export const runtime='nodejs';export const dynamic='force-dynamic'
const BASE='https://www.worldcandies.co.uk'
const clean=(s:string)=>s.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim()
export async function GET(){try{
 const r=await fetch(BASE+'/',{cache:'no-store',headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html,application/xhtml+xml'}})
 if(!r.ok)throw new Error('World Candies returned '+r.status)
 const html=await r.text(), offers:any[]=[]
 const re=/Pack:\s*(\d+)[\s\S]{0,180}?Origin:\s*([^<\r\n]*?)\s*Model:\s*([A-Za-z0-9_-]+)[\s\S]{0,700}?<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]{0,500}?£\s*(\d+(?:\.\d{1,2})?)/gi
 for(const m of html.matchAll(re)){const q=Number(m[1]),price=Number(m[6]),name=clean(m[5]);if(!q||!price||!name||name.length<3)continue;offers.push({supplierProductId:m[3],supplierSku:m[3],product:name,rawTitle:name,brand:'',caseQty:q,casePrice:price,unitCost:Math.round(price/q*10000)/10000,ean:'',status:'IN STOCK',url:m[4].startsWith('http')?m[4]:BASE+m[4],source:'World Candies public catalogue',tags:[{origin:clean(m[2])}]})}
 const unique=[...new Map(offers.map(x=>[x.supplierProductId,x])).values()]
 if(unique.length<5)throw new Error('World Candies parser found only '+unique.length+' offers; saved catalogue kept')
 await saveSupplierCatalogue('world-candies',unique,{method:'public homepage catalogue',pricingBasis:'displayed site price'})
 return NextResponse.json({ok:true,supplier:'World Candies',inStock:unique.length,offers:unique})
}catch(e:any){return NextResponse.json({ok:false,error:e?.message||'World Candies sync failed'},{status:500})}}