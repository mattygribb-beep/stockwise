// Public observations only. A successful fetch is not a Buy Box or eligibility check.
import {packagedFacts,PackageFacts} from './package-facts'
export type PublicObservation={status:'found'|'unavailable'|'blocked';identityConflict?:boolean;checkedAt:string;priceCheckedAt?:string;packageCheckedAt?:string;packaged?:PackageFacts;url:string;price?:number;caseQty?:number;caseWeightKg?:number;stock?:number;expiry?:string;vatBasis?:'ex';note:string}
const text=(s:string)=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&pound;|&#163;/g,'£').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()
const blocked=(html:string)=>/validateCaptcha|Robot Check|automated access|verify you are human|unusual traffic|cf-chl-|checking your browser/i.test(html)
const amount=(s:string)=>{const n=Number(s.replace(/,/g,''));return Number.isFinite(n)&&n>0&&n<100000?n:null}
export function supplierProductUrl(html:string,sku:string){
 for(const m of html.matchAll(/href=["']([^"']+)["']/gi)){try{const u=new URL(m[1].replace(/&amp;/g,'&'));if(u.protocol==='https:'&&u.hostname==='sweetandglory.com'&&!u.username&&!u.password&&!u.port&&u.searchParams.get('code')===sku&&!u.pathname.startsWith('/brands/'))return u.toString()}catch{}}
 return ''
}
function packageFromPage(html:string){
 const facts:Record<string,string>={}
 const blocks=[...html.matchAll(/<table\b(?=[^>]*(?:id=["']productDetails_[^"']+["']|class=["'][^"']*(?:prodDetTable|voyager-ns-(?:desktop|mobile)-table)[^"']*["']))[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>m[1])
 for(const block of blocks)for(const row of block.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...row[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(m=>text(m[1]).replace(/[‎‏]/g,'').trim())
  if(cells.length===2&&['package dimensions','item package dimensions','item package weight'].includes(cells[0].toLowerCase()))facts[cells[0]]=cells[1]
 }
 const detail=html.match(/id=["']detailBullets_feature_div["'][^>]*>([\s\S]{0,18000}?)(?=<div[^>]+id=["'][^"']+_feature_div["']|$)/i)?.[1]||''
 for(const row of detail.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)){const value=text(row[1]).replace(/[‎‏]/g,'').trim(),m=value.match(/^(Package Dimensions|Item Package Weight)\s*:\s*(.+)$/i);if(m)facts[m[1]]=m[2]}
 return packagedFacts(facts)
}
export function parseSupplierObservation(html:string,sku:string,url:string,checkedAt:string):PublicObservation{
 if(blocked(html))return {status:'blocked',url,checkedAt,note:'Supplier requires browser verification; saved data retained'}
 const plain=text(html),escaped=sku.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');let match=new RegExp('Code:\\s*'+escaped+'(?=\\s|$)','i').exec(plain)
 if(!match){try{if(new URL(url).searchParams.get('code')===sku)match=new RegExp('\\b'+escaped+'\\b').exec(plain)}catch{}}
 if(!match)return {status:'unavailable',url,checkedAt,note:'Exact supplier SKU was not found; saved data retained'}
 const tail=plain.slice(match.index+match[0].length),next=tail.search(/Code:\s*/i),card=tail.slice(0,next<0?1200:next)
 const qty=Number(card.match(/Pack Quantity:\s*(\d+)/i)?.[1]),price=amount(card.match(/£([\d,.]+)\s*Ex VAT(?! per unit)/i)?.[1]||'')
 const stock=card.match(/(?:Availability:\s*)?([\d,]+)\s*In Stock/i),expiry=card.match(/Expiry Date:\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1],weight=card.match(/Weight:\s*([\d.]+)\s*(kg|g)\b/i),caseWeightKg=weight?Number(weight[1])*(weight[2].toLowerCase()==='g'?.001:1):undefined
 if(/(?:Availability:\s*)?Out of Stock/i.test(card))return {status:'found',stock:0,url,checkedAt,note:'Exact supplier SKU is out of stock'}
 if(!price||!Number.isInteger(qty)||qty<1||!stock)return {status:'unavailable',url,checkedAt,note:'Could not reliably read this SKU’s price and pack; saved data retained'}
 return {status:'found',url,checkedAt,price,caseQty:qty,...(caseWeightKg&&caseWeightKg>0&&caseWeightKg<1000?{caseWeightKg}:{}),stock:Number(stock[1].replace(/,/g,'')),expiry,vatBasis:'ex',note:'Exact SKU from the public supplier catalogue; checkout terms still apply'}
}
export function parseAmazonObservation(html:string,asin:string,url:string,checkedAt:string,expectedPack?:number):PublicObservation{
 if(blocked(html))return {status:'blocked',url,checkedAt,note:'Amazon requires browser verification; no new price captured'}
 const escaped=asin.replace(/[^A-Z0-9]/g,''),canonical=html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1]
 const primaryInput=html.match(/<input\b[^>]*\bname=["']ASIN["'][^>]*>/i)?.[0]||''
 const canonicalMatch=!!canonical&&new RegExp('/(?:dp|gp/product)/'+escaped+'(?:[/?#]|$)','i').test(canonical)
 const inputMatch=new RegExp('value=["\']'+escaped+'["\']','i').test(primaryInput)
 if((canonical&&!canonicalMatch)||(!canonicalMatch&&!inputMatch))return {status:'unavailable',url,checkedAt,note:'Exact primary ASIN could not be confirmed on the returned page'}
 if(expectedPack!==undefined){
  const title=text(html.match(/<span\b[^>]*id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]||'')
  const n=title.toLowerCase().replace(/-/g,' ').match(/\b(?:pack|case|set|bundle)\s+of\s+(\d+)\b/)||title.match(/\b(\d+)\s*[x×]\s*\d+(?:\.\d+)?\s*(?:g|kg|ml|l|oz)\b/i)||title.match(/^\s*(\d+)\s*[x×]\s+[a-z]/i)||title.match(/^\s*x\s*(\d+)\s+/i)||title.match(/\b(\d+)\s+packs?\b/i)
  if(!title||(n?Number(n[1])!==expectedPack:expectedPack!==1))return {status:'unavailable',url,checkedAt,identityConflict:!!title,note:'Live Amazon title does not confirm the saved sell pack; price not updated'}
 }
 const packaged=packageFromPage(html),packageData=Object.keys(packaged).length?{packaged,packageCheckedAt:checkedAt}:{}
 // Only standard one-time offer blocks. Never recommendations, ads, subscription prices or arbitrary £ amounts.
 const blocks=[...html.matchAll(/<(?:div|span)\b[^>]*id=["'](?:corePrice_feature_div|corePriceDisplay_desktop_feature_div|corePriceDisplay_mobile_feature_div)["'][^>]*>([\s\S]{0,18000}?)(?=<div[^>]+id=["'][^"']+_feature_div["']|$)/gi)]
 for(const m of blocks){const block=m[1];if(/subscribe|subscription|snsPrice/i.test(block))continue
  const pay=block.match(/<span\b[^>]*class=["'][^"']*(?:priceToPay|apex-pricetopay-value)[^"']*["'][^>]*>([\s\S]{0,1600})/i)?.[1]||''
  const price=amount(pay.match(/class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*£([\d,.]+)/i)?.[1]||'')
  if(price)return {status:'found',price,priceCheckedAt:checkedAt,...packageData,url,checkedAt,note:'Public one-time listing price; shipping, Buy Box eligibility and competitiveness are not confirmed'}
 }
 const offers=html.match(/<a\b[^>]*id=["']aod-ingress-link["'][^>]*>([\s\S]{0,3500}?)<\/a>/i)?.[1]
 if(offers&&/options from/i.test(text(offers))){const price=amount(offers.match(/class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*£([\d,.]+)/i)?.[1]||'');if(price)return {status:'found',price,priceCheckedAt:checkedAt,...packageData,url,checkedAt,note:'Lowest advertised offer from the exact ASIN page; not a verified Buy Box or delivered checkout price'}}
 if(Object.keys(packaged).length)return {status:'found',...packageData,url,checkedAt,note:'Captured explicit package measurements; no unambiguous price found'}
 return {status:'unavailable',url,checkedAt,note:'No unambiguous one-time price could be read; use the saved observation or open the listing'}
}
export async function fetchPublicObservation(url:string,parse:(html:string)=>PublicObservation):Promise<PublicObservation>{
 const checkedAt=new Date().toISOString()
 try{const r=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(9000),headers:{'User-Agent':'Source Stack Public Price Check/1.0','Accept':'text/html'}})
  if(!r.ok)return {status:r.status===403||r.status===429?'blocked':'unavailable',url,checkedAt,note:'Public source returned '+r.status+'; saved data retained'}
  const html=await r.text();if(html.length>4000000)return {status:'unavailable',url,checkedAt,note:'Public page too large to parse safely'}
  return parse(html)
 }catch{return {status:'unavailable',url,checkedAt,note:'Public source could not be reached; saved data retained'}}
}
