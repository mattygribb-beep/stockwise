import {getSql} from './db'
import {BUYING_COHORT} from './buying-cohort'
import {unitSize,normalize,parseCanonicalProduct,canonicalMatch,isNonProductTitle} from './product-parser'
import {barcodeValue} from './catalogue-controls'
import {packagedFacts} from './package-facts'
export {packagedFacts} from './package-facts'
import type {AssistantProduct} from './buying-assistant'
const code=(v:unknown)=>String(v||'').replace(/\D/g,'').replace(/^0+/,'')
const key=(supplier:string,id:unknown)=>supplier+'|'+String(id)
const whole=(v:unknown)=>Number.isInteger(Number(v))&&Number(v)>0
export function explicitSellPack(title:string):number|null{
 const t=String(title||'').toLowerCase().replace(/-/g,' ')
 const m=t.match(/\b(?:pack|case|set|bundle)\s+of\s+(\d+)\b/)||t.match(/\b(\d+)\s*[x×]\s*\d+(?:\.\d+)?\s*(?:g|kg|ml|l|oz)\b/)||t.match(/^\s*(\d+)\s*[x×]\s+[a-z]/)||t.match(/^\s*x\s*(\d+)\s+/)||t.match(/\b(\d+)\s+packs?\b/)||t.match(/\b(\d+)\s+pack\b/)
 return m?Number(m[1]):null
}
export function buildBuyingPool(data:{amazon:any[];offers:any[];links:any[];details:any[];scout:any[];observations?:any[];knowledge?:any},cohort:readonly any[]=BUYING_COHORT){
 const products:AssistantProduct[]=[],blocked:{asin:string;supplier:string;offerId:string;reason:string}[]=[],proofs=new Map<string,any>(),offerMap=new Map(data.offers.map(o=>[key(o.supplier,o.supplier_product_id),o])),amazonMap=new Map(data.amazon.map(a=>[a.asin,a])),detailMap=new Map(data.details.map(d=>[d.asin,d])),scoutMap=new Map(data.scout.map(s=>[s.asin,s]))
 const add=(p:any)=>{const k=p.asin+'|'+key(p.supplier,p.offerId);if(!proofs.has(k))proofs.set(k,p)}
 for(const l of data.links)add({asin:l.asin,supplier:l.supplier,offerId:String(l.supplier_offer_id),packQty:Number(l.pack_qty),listingTitle:l.title,proof:'Confirmed master relationship'})
 for(const a of data.amazon){if(a.match_status!=='verified'||!a.matched_supplier_offer_id)continue;const o=data.offers.find(o=>String(o.id)===String(a.matched_supplier_offer_id)),e=a.match_evidence||{};if(o&&whole(e.amazon_sell_pack_qty))add({asin:a.asin,supplier:o.supplier,offerId:String(o.supplier_product_id),packQty:Number(e.amazon_sell_pack_qty),proof:'Verified catalogue relationship'})}
 for(const c of cohort)add({...c,proof:'Protected product and sell-pack relationship'})
 const brands=[...new Set(data.offers.map(o=>o.brand).filter(Boolean))],knowledge=data.knowledge||{},identityKey=(p:any)=>[normalize(p.brand),normalize(p.family),normalize(p.variant)].join('|'),index=new Map<string,any[]>()
 for(const o of data.offers){if(isNonProductTitle(o.product))continue;const parsed=parseCanonicalProduct({title:o.product,brand:o.brand,size:o.size,caseQty:o.case_qty},brands,knowledge);if(!parsed.unitSize||parsed.sizeConflict)continue;const k=identityKey(parsed);index.set(k,[...(index.get(k)||[]),{o,parsed}])}
 const barcode=(v:any)=>{const b=barcodeValue(v);return b&&(b.length!==14||b[0]==='0')?b.replace(/^0+/,''):''}
 for(const a of data.amazon){if(['hidden','rejected'].includes(a.match_status)||isNonProductTitle(a.title))continue;const parsed=parseCanonicalProduct({title:a.title,caseQty:1},brands,knowledge);if(!parsed.unitSize||parsed.sizeConflict||/mixed\s+bundle|assorted\s+bundle/i.test(a.title))continue
  for(const {o,parsed:op} of index.get(identityKey(parsed))||[]){const m=canonicalMatch(parsed,op);if(!m.match||m.score<95)continue;const exact=!!barcode(o.ean)&&[a.ean,a.upc,a.gtin].some(c=>barcode(c)===barcode(o.ean));add({asin:a.asin,supplier:o.supplier,offerId:String(o.supplier_product_id),packQty:parsed.consumerPackQty,proof:exact?'Exact barcode and matching product details — confirm sell pack':'Matching brand, variant and unit size — identity review required',discovered:true,matchType:exact?'barcode':'name'})}
 }
 for(const p of proofs.values()){
  const o=offerMap.get(key(p.supplier,p.offerId)),a=amazonMap.get(p.asin),d=detailMap.get(p.asin),s=scoutMap.get(p.asin),e=a?.match_evidence||{}
  const reject=(reason:string)=>blocked.push({asin:p.asin,supplier:p.supplier,offerId:p.offerId,reason})
  if(!o||o.is_active===false){reject('Supplier offer inactive or missing');continue}
  if(['review','rejected'].includes(o.link_status)||o.manual_asin&&o.manual_asin!==p.asin||o.manual_ean&&code(o.manual_ean)!==code(o.ean)&&![a?.ean,a?.upc,a?.gtin].some(c=>code(c)&&code(c)===code(o.manual_ean))){reject('Identifiers changed; relationship needs review');continue}
  if(a&&['hidden','rejected'].includes(a.match_status)){reject('Amazon listing hidden or rejected');continue}
  if(whole(e.amazon_sell_pack_qty)&&Number(e.amazon_sell_pack_qty)!==p.packQty){reject('Saved sell-pack evidence conflicts');continue}
  if(!whole(p.packQty)||!whole(o.case_qty)||Number(o.case_qty)<p.packQty){reject('Supplier quantity or Amazon sell pack unconfirmed');continue}
  const titles=[a?.title,s?.title,d?.title,p.listingTitle].filter(Boolean)
  if(titles.some(t=>explicitSellPack(t)!==null&&explicitSellPack(t)!==p.packQty)){reject('Amazon sell-pack counts conflict');continue}
  const size=unitSize(o.size,''),m=size.match(/^([\d.]+)(g|ml)$/)
  if(m&&titles.some(t=>{const n=unitSize('',t).match(/^([\d.]+)(g|ml)$/);return n&&(n[2]!==m[2]||Math.abs(Number(n[1])-Number(m[1]))>Math.max(m[2]==='g'?1:2,Math.min(Number(n[1]),Number(m[1]))*.015))})){reject('Unit size conflicts with an Amazon observation');continue}
  if(e.caution){reject(String(e.caution));continue}
  const evidence=(Array.isArray(o.tags)?o.tags:[]).find((t:any)=>t?.type==='catalogue-evidence')
  if(evidence?.commercialHold||evidence?.caseQtyConfirmed===false){reject('Discovery quote or case contents unconfirmed');continue}
  const observations=[a?{title:a.title,price:a.observed_price,date:a.last_seen_at}:null,s?{title:s.title,price:s.observed_price,date:s.last_seen_at}:null].filter(v=>v&&Number(v.price)>0).sort((x:any,y:any)=>Date.parse(y.date)-Date.parse(x.date)),observed=observations[0]
  const vatBasis=['Sweet & Glory','Stateside Distribution'].includes(p.supplier)?'ex':evidence?.vatBasis==='exclusive'?'ex':evidence?.vatBasis==='inclusive'?'inc':'unknown'
  products.push({asin:p.asin,supplier:p.supplier,offerId:p.offerId,packQty:p.packQty,title:observed?.title||a?.title||d?.title||p.listingTitle||o.product,identityConfirmed:!p.discovered,matchType:p.matchType||'verified',identitySignature:JSON.stringify([p.asin,p.supplier,p.offerId,p.packQty,o.case_qty,o.ean,o.size]),packaged:packagedFacts(d?.raw_facts),available:(o.stock_qty==null||Number(o.stock_qty)!==0)&&!/out[ -]?of[ -]?stock|unavailable|discontinued/i.test(o.status||''),amazon:observed?{price:String(observed.price),seenAt:observed.date,url:`https://www.amazon.co.uk/dp/${p.asin}`,identityEvidence:{proof:p.proof}}:null,offer:{product:o.product,caseQty:Number(o.case_qty),casePrice:String(o.case_price),url:o.product_url,stock:o.stock_qty,status:o.status,expiry:o.expiry,seenAt:o.last_seen_at,minimumOrderQuoted:p.supplier==='Stateside Distribution'?50:p.supplier==='Candy Cargo'?350:undefined,unitWeightG:m&&m[2]==='g'?Number(m[1]):undefined,termsUrl:p.supplier==='Stateside Distribution'?'https://statesidedistribution.com/pages/terms-conditions':p.supplier==='Candy Cargo'?'https://candycargo.co.uk/pages/shipping-returns':undefined,vatBasis}})
 }
 for(const p of products){const saved=(data.observations||[]).find(r=>r.asin===p.asin&&r.supplier===p.supplier&&r.supplier_offer_id===p.offerId&&r.identity_signature===p.identitySignature);if(saved)p.publicResearch={research:saved.latest_attempt,observations:{amazon:saved.amazon||undefined,supplier:saved.supplier_observation||undefined}}}

 return {products,coverage:{relationships:proofs.size,products:products.length,asins:new Set(products.map(p=>p.asin)).size,suppliers:new Set(products.map(p=>p.supplier)).size,priced:products.filter(p=>Number(p.offer?.casePrice)>0&&Number(p.amazon?.price)>0).length,verified:products.filter(p=>p.identityConfirmed).length,review:products.filter(p=>!p.identityConfirmed).length,blocked:blocked.length},blocked}
}
export async function loadBuyingPool(sql=getSql(),selection?:{asin:string;supplier?:string;offerId?:string}){
 const selectedAsin=selection?.asin||null,selectedSupplier=selection?.supplier||null,selectedOffer=selection?.offerId||null
 const [amazon,offers,links,details,scout,observations,ba,va,nt]=await Promise.all([
  sql`SELECT * FROM amazon_catalogue_candidates WHERE (${selectedAsin}::text IS NULL OR asin=${selectedAsin})`,
  sql`SELECT o.id,o.supplier_product_id,o.supplier_sku,o.product,o.brand,o.size,o.case_qty,o.case_price,o.ean,o.stock_qty,o.status,o.expiry,o.product_url,o.last_seen_at,o.tags,s.name supplier,pi.asin manual_asin,pi.ean manual_ean,l.match_status link_status FROM supplier_offers o JOIN suppliers s ON s.id=o.supplier_id LEFT JOIN product_identities pi ON pi.supplier=s.name AND pi.supplier_offer_id=o.supplier_product_id::text LEFT JOIN product_identity_offers l ON l.supplier=s.name AND l.supplier_offer_id=o.supplier_product_id::text WHERE o.is_active=true AND (${selectedSupplier}::text IS NULL OR s.name=${selectedSupplier}) AND (${selectedOffer}::text IS NULL OR o.supplier_product_id::text=${selectedOffer})`,
  sql`SELECT l.supplier,l.supplier_offer_id,a.asin,a.title,a.pack_qty FROM product_identity_offers l JOIN amazon_product_listings a ON a.identity_id=l.identity_id WHERE l.match_status IN ('confirmed','verified') AND a.status='verified' AND a.marketplace='UK' AND (${selectedAsin}::text IS NULL OR a.asin=${selectedAsin}) AND (${selectedSupplier}::text IS NULL OR l.supplier=${selectedSupplier}) AND (${selectedOffer}::text IS NULL OR l.supplier_offer_id=${selectedOffer})`,
  sql`SELECT DISTINCT ON (asin) asin,title,raw_facts FROM storefront_product_details WHERE (${selectedAsin}::text IS NULL OR asin=${selectedAsin}) ORDER BY asin,last_scanned_at DESC`,
  sql`SELECT DISTINCT ON (asin) asin,title,observed_price,last_seen_at FROM storefront_scout_catalogue WHERE observed_price>0 AND (${selectedAsin}::text IS NULL OR asin=${selectedAsin}) ORDER BY asin,last_seen_at DESC`,
  sql`SELECT * FROM buying_public_observations WHERE (${selectedAsin}::text IS NULL OR asin=${selectedAsin}) AND (${selectedSupplier}::text IS NULL OR supplier=${selectedSupplier}) AND (${selectedOffer}::text IS NULL OR supplier_offer_id=${selectedOffer})`,
  sql`SELECT canonical_brand,alias FROM product_brand_aliases`,sql`SELECT brand,canonical_variant,alias FROM product_variant_aliases`,sql`SELECT term FROM product_noise_terms`
 ])
 return buildBuyingPool({amazon,offers,links,details,scout,observations,knowledge:{brandAliases:ba,variantAliases:va,noiseTerms:nt}})
}
