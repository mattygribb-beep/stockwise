// Public observations only. A successful fetch is not a Buy Box or eligibility check.
export type PublicObservation={status:'found'|'unavailable'|'blocked';checkedAt:string;url:string;price?:number;caseQty?:number;stock?:number;expiry?:string;vatBasis?:'ex';note:string}
const text=(s:string)=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&pound;|&#163;/g,'£').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()
const blocked=(html:string)=>/validateCaptcha|Robot Check|automated access|verify you are human|unusual traffic|cf-chl-|checking your browser/i.test(html)
const amount=(s:string)=>{const n=Number(s.replace(/,/g,''));return Number.isFinite(n)&&n>0&&n<100000?n:null}
export function parseSupplierObservation(html:string,sku:string,url:string,checkedAt:string):PublicObservation{
 if(blocked(html))return {status:'blocked',url,checkedAt,note:'Supplier requires browser verification; saved data retained'}
 const plain=text(html),escaped=sku.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),match=new RegExp('Code:\\s*'+escaped+'(?=\\s|$)','i').exec(plain)
 if(!match)return {status:'unavailable',url,checkedAt,note:'Exact supplier SKU was not found; saved data retained'}
 const tail=plain.slice(match.index+match[0].length),next=tail.search(/Code:\s*/i),card=tail.slice(0,next<0?1200:next)
 const qty=Number(card.match(/Pack Quantity:\s*(\d+)/i)?.[1]),price=amount(card.match(/£([\d,.]+)\s*Ex VAT(?! per unit)/i)?.[1]||'')
 const stock=card.match(/Availability:\s*([\d,]+)\s*In Stock/i),expiry=card.match(/Expiry Date:\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1]
 if(/Availability:\s*Out of Stock/i.test(card))return {status:'found',stock:0,url,checkedAt,note:'Exact supplier SKU is out of stock'}
 if(!price||!Number.isInteger(qty)||qty<1||!stock)return {status:'unavailable',url,checkedAt,note:'Could not reliably read this SKU’s price and pack; saved data retained'}
 return {status:'found',url,checkedAt,price,caseQty:qty,stock:Number(stock[1].replace(/,/g,'')),expiry,vatBasis:'ex',note:'Exact SKU from the public supplier catalogue; checkout terms still apply'}
}
export function parseAmazonObservation(html:string,asin:string,url:string,checkedAt:string):PublicObservation{
 if(blocked(html))return {status:'blocked',url,checkedAt,note:'Amazon requires browser verification; no new price captured'}
 const escaped=asin.replace(/[^A-Z0-9]/g,''),canonical=html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1]
 const primaryInput=html.match(/<input\b[^>]*\bname=["']ASIN["'][^>]*>/i)?.[0]||''
 const canonicalMatch=!!canonical&&new RegExp('/(?:dp|gp/product)/'+escaped+'(?:[/?#]|$)','i').test(canonical)
 const inputMatch=new RegExp('value=["\']'+escaped+'["\']','i').test(primaryInput)
 if((canonical&&!canonicalMatch)||(!canonicalMatch&&!inputMatch))return {status:'unavailable',url,checkedAt,note:'Exact primary ASIN could not be confirmed on the returned page'}
 // Only standard one-time offer blocks. Never recommendations, ads, subscription prices or arbitrary £ amounts.
 const blocks=[...html.matchAll(/<(?:div|span)\b[^>]*id=["'](?:corePrice_feature_div|corePriceDisplay_desktop_feature_div|corePriceDisplay_mobile_feature_div)["'][^>]*>([\s\S]{0,18000}?)(?=<div[^>]+id=["'][^"']+_feature_div["']|$)/gi)]
 for(const m of blocks){const block=m[1];if(/subscribe|subscription|snsPrice/i.test(block))continue
  const pay=block.match(/<span\b[^>]*class=["'][^"']*(?:priceToPay|apex-pricetopay-value)[^"']*["'][^>]*>([\s\S]{0,1600})/i)?.[1]||''
  const price=amount(pay.match(/class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*£([\d,.]+)/i)?.[1]||'')
  if(price)return {status:'found',price,url,checkedAt,note:'Public one-time listing price; shipping, Buy Box eligibility and competitiveness are not confirmed'}
 }
 const offers=html.match(/<a\b[^>]*id=["']aod-ingress-link["'][^>]*>([\s\S]{0,3500}?)<\/a>/i)?.[1]
 if(offers&&/options from/i.test(text(offers))){const price=amount(offers.match(/class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*£([\d,.]+)/i)?.[1]||'');if(price)return {status:'found',price,url,checkedAt,note:'Lowest advertised offer from the exact ASIN page; not a verified Buy Box or delivered checkout price'}}
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
