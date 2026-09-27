import { NextResponse } from 'next/server'
import { saveSupplierCatalogue } from '../../../../lib/catalogue-store'
export const runtime='nodejs';export const dynamic='force-dynamic'
const BASE='https://www.worldcandies.co.uk'
const clean=(s:string)=>s.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim()
export async function GET(){try{
 const r=await fetch(BASE+'/',{cache:'no-store',headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html,application/xhtml+xml'}})
 if(!r.ok)throw new Error('World Candies returned '+r.status)
 const html=await r.text(), offers:any[]=[]
 const marker=/Pack:\s*(\d+)[\s\S]{0,120}?Origin:\s*([^<\r\n]+?)\s+Model:\s*([A-Za-z0-9_-]+)/gi
 const ms=[...html.matchAll(marker)]
 for(let i=0;i<ms.length;i++){const m=ms[i],start=(m.index||0)+m[0].length,end=i+1<ms.length?(ms[i+1].index||html.length):Math.min(html.length,start+4000),chunk=html.slice(start,end);const a=chunk.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i),pm=chunk.match(/£\s*(\d+(?:\.\d{1,2})?)/);if(!a||!pm)continue;const name=clean(a[2]),q=Number(m[1]),price=Number(pm[1]);if(!name||name.length<3||!q||!price)continue;offers.push({supplierProductId:m[3],supplierSku:m[3],product:name,rawTitle:name,brand:'',caseQty:q,casePrice:price,unitCost:Math.round(price/q*10000)/10000,ean:'',status:'IN STOCK',url:a[1].startsWith('http')?a[1]:BASE+a[1],source:'World Candies public catalogue',tags:[{origin:clean(m[2])}]})}
 const unique=[...new Map(offers.map(x=>[x.supplierProductId,x])).values()]
 if(unique.length<5)throw new Error('World Candies parser found only '+unique.length+' offers; saved catalogue kept')
 await saveSupplierCatalogue('world-candies',unique,{method:'homepage public catalogue HTML',pricingBasis:'site display price'})
 return NextResponse.json({ok:true,supplier:'World Candies',inStock:unique.length,offers:unique})
}catch(e:any){return NextResponse.json({ok:false,error:e?.message||'World Candies sync failed'},{status:500})}}