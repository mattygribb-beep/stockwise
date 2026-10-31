import {parseCanonicalProduct,canonicalMatch,type CanonicalProduct} from './product-parser'
import {barcodeValue} from './catalogue-controls'

const country=(value:unknown)=>{const v=String(value||'').toLowerCase().replace(/[^a-z]/g,'');return ['us','usa','unitedstates','unitedstatesofamerica','american'].includes(v)?'us':['can','canada','canadian'].includes(v)?'canada':['uk','gb','greatbritain','unitedkingdom','british'].includes(v)?'uk':v}

export function identityMatchScore(offer:any,identity:any,brands:string[],knowledge:any,prepared?:{a:CanonicalProduct;b:CanonicalProduct}){
 const origin=country(offer.country_origin),identityOrigin=country(identity.country_origin)
 if(origin&&identityOrigin&&origin!==identityOrigin)return {score:0,band:'NO_MATCH',reason:'Country of origin conflict'}
 const supplier=prepared?.a??parseCanonicalProduct({title:offer.product,brand:offer.brand,size:offer.size,caseQty:offer.case_qty},brands,knowledge)
 const product=prepared?.b??parseCanonicalProduct({title:identity.product_name,brand:identity.brand,size:identity.unit_size||identity.size,caseQty:1},brands,knowledge)
 const oe=barcodeValue(offer.ean),ie=barcodeValue(identity.ean)
 if(oe&&ie&&oe.replace(/^0+/,'')!==ie.replace(/^0+/,''))return {score:0,band:'NO_MATCH',reason:'Barcode conflict'}
 // canonicalMatch expects the Amazon/consumer product first and the supplier case second.
 const match=canonicalMatch(product,supplier)
 if(!match.match)return {score:match.score,band:'NO_MATCH',reason:match.reason,parsed:supplier}
 if(oe&&ie)return {score:100,band:'STRONG',reason:'Exact valid EAN / UPC and matching product details',parsed:supplier}
 const invalid=!!String(offer.ean||'').trim()&&!oe||!!String(identity.ean||'').trim()&&!ie
 const score=invalid?Math.min(match.score,85):match.score
 return {score,band:score>=95?'STRONG':score>=75?'REVIEW':'WEAK',reason:match.reason+(invalid?' · invalid barcode needs review':''),parsed:supplier}
}
