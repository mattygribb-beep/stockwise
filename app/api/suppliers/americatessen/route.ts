import { NextResponse } from 'next/server'
import { saveSupplierCatalogue } from '../../../../lib/catalogue-store'
export const runtime='nodejs';export const dynamic='force-dynamic'
const BASE='https://www.americatessen.com'
const clean=(s:string)=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim()
export async function GET(){try{
 const urls=['/all','/american-confectionery-american-wholesalers-uk','/american-breakfast-supplier-american-wholesalers-uk','/american-grocery-supplier-american-wholesalers-uk']
 const offers:any[]=[]
 for(const path of urls){const r=await fetch(BASE+path,{cache:'no-store',headers:{'User-Agent':'Mozilla/5.0 (compatible; FlipLead/1.0)','Accept':'text/html,application/xhtml+xml'}});if(!r.ok)continue;const txt=clean(await r.text())
 const re=/(.{3,180}?)\s+Code:\s*([A-Z0-9&.-]+-\d{4,6}-\d{2})\s+Please sign in \/ sign up for pricing\s+Availability:\s*(.{0,300}?)\s+View Details/gi
 for(const m of txt.matchAll(re)){let name=m[1].trim().replace(/^\d+\s+/,'');const sku=m[2];const q=Number((sku.match(/-(\d{2})$/)||[])[1])||0;const size=(name.match(/(\d+(?:\.\d+)?\s?(?:g|kg|ml|oz|ct))/i)||[])[1]||'';if(!name||name.length>180)continue;offers.push({supplierProductId:sku,supplierSku:sku,product:name,rawTitle:name,size,caseQty:q,casePrice:0,unitCost:0,ean:'',status:'IDENTITY ONLY · SIGN IN FOR PRICE',url:BASE+path,source:'Americatessen public catalogue'})}}
 const unique=[...new Map(offers.map(x=>[x.supplierProductId,x])).values()]
 if(unique.length<5)throw new Error('Americatessen parser found only '+unique.length+' offers; saved catalogue kept')
 await saveSupplierCatalogue('americatessen',unique,{method:'public catalogue identity parser',pricingBasis:'trade sign-in required'})
 return NextResponse.json({ok:true,supplier:'Americatessen',inStock:unique.length,identityOnly:true,offers:unique})
}catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Americatessen sync failed'},{status:500})}}