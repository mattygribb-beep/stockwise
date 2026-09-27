import { NextResponse } from 'next/server'
import { saveSupplierCatalogue } from '../../../../lib/catalogue-store'
export const runtime='nodejs'; export const dynamic='force-dynamic'
const BASE='https://www.ycwholesale.co.uk'
const H={'User-Agent':'Mozilla/5.0 (compatible; FlipLead/1.0)','Accept':'text/html,application/xhtml+xml'}
const clean=(s:string)=>s.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/\s+/g,' ').trim()
const grab=(s:string,label:string)=>{const m=s.match(new RegExp(label+'\\s*:?\\s*<[^>]*>?\\s*([^<]{1,100})','i'));return m?clean(m[1]):''}
const qty=(s:string)=>{const m=s.match(/(?:pack|case|box)\s*(?:of)?\s*(\d+)/i)||s.match(/\b(\d+)\s*[xX]\s*\d/i);return m?Number(m[1]):1}
export async function GET(){try{const offers:any[]=[];let page=1
 while(page<=80){const r=await fetch(BASE+'/catalog/page-'+page,{cache:'no-store',headers:H});if(!r.ok)throw new Error('Y&C catalogue returned '+r.status);const html=await r.text();const blocks=[...html.matchAll(/<(?:article|div)[^>]*class="[^"]*(?:product|catalog)[^"]*"[^>]*>([\s\S]*?)(?=<\/(?:article|div)>)/gi)];if(!blocks.length){if(page===1)throw new Error('Y&C catalogue format could not be parsed safely');break}
 for(const b of blocks){const x=b[1],name=clean((x.match(/<(?:h2|h3|h4)[^>]*>([\s\S]*?)<\/(?:h2|h3|h4)>/i)||[])[1]||'');const ean=(x.match(/(?:EAN|Barcode|GTIN)[^0-9]{0,30}(\d{8,14})/i)||[])[1]||'';const sku=grab(x,'SKU');const brand=grab(x,'Brand');const packText=grab(x,'Pack(?: Size)?');const link=(x.match(/href=["']([^"']+)["']/i)||[])[1]||'';if(!name||(!ean&&!sku))continue;offers.push({supplierProductId:sku||ean||name,supplierSku:sku,product:name,rawTitle:name,brand,caseQty:qty(packText||name),casePrice:0,unitCost:0,ean,status:'IDENTITY ONLY · TRADE PRICE REQUIRED',url:link.startsWith('http')?link:BASE+link,source:'Y&C public catalogue · identity data only',sourcePage:page})}
 if(!new RegExp('page-'+(page+1),'i').test(html))break;page++}
 const unique=[...new Map(offers.map(x=>[x.supplierProductId,x])).values()];if(unique.length<10)throw new Error('Y&C returned only '+unique.length+' identity records; saved catalogue kept');await saveSupplierCatalogue('yc-wholesale',unique,{cataloguePages:page,method:'Public catalogue identity data',pricing:'not public'});return NextResponse.json({ok:true,supplier:'Y&C Wholesale',cataloguePages:page,inStock:unique.length,pricingAvailable:false,offers:unique})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Y&C sync failed'},{status:500})}}