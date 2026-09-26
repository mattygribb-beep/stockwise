import {NextResponse} from 'next/server'

const words=(s:string)=>new Set((s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(x=>x.length>1))
const overlap=(a:string,b:string)=>{const A=words(a),B=words(b);if(!A.size||!B.size)return 0;return [...A].filter(x=>B.has(x)).length/Math.max(A.size,B.size)}
const digits=(s:string)=>String(s||'').replace(/\D/g,'')
const sameCode=(a:string,b:string)=>{const A=digits(a).replace(/^0+/,''),B=digits(b).replace(/^0+/,'');return !!A&&A===B}

export async function GET(req:Request){
 const u=new URL(req.url),ean=digits(u.searchParams.get('ean')||''),supplierTitle=u.searchParams.get('title')||'',supplierBrand=u.searchParams.get('brand')||'',supplierSize=u.searchParams.get('size')||''
 if(!/^\d{8,14}$/.test(ean)) return NextResponse.json({ok:false,error:'Enter a valid 8–14 digit EAN/UPC/GTIN.'},{status:400})
 try{
  const fields='code,product_name,brands,quantity,product_quantity,product_quantity_unit,image_front_url,image_url'
  const r=await fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(ean)+'.json?fields='+fields,{headers:{'User-Agent':'FlipLead/1.2 (product identity lookup)','Accept':'application/json'},cache:'no-store'})
  const d=await r.json().catch(()=>null)
  if(!r.ok)return NextResponse.json({ok:false,error:'Open Food Facts lookup unavailable ('+r.status+').',source:'Open Food Facts'},{status:502})
  if(d?.status!==1||!d?.product)return NextResponse.json({ok:false,error:'No Open Food Facts match found for '+ean+'.',source:'Open Food Facts'},{status:404})
  const x=d.product, title=x.product_name||'', brand=x.brands||'', size=x.quantity||(x.product_quantity&&x.product_quantity_unit?x.product_quantity+' '+x.product_quantity_unit:'')
  const titleScore=overlap(supplierTitle,title), brandMatch=!!supplierBrand&&!!brand&&supplierBrand.toLowerCase().split(',')[0].trim()===brand.toLowerCase().split(',')[0].trim()
  const sizeToken=(supplierSize||'').toLowerCase().replace(/\s/g,''); const lookupText=(title+' '+size).toLowerCase().replace(/\s/g,''); const sizeMatch=!!sizeToken&&lookupText.includes(sizeToken)
  const barcodeMatch=sameCode(x.code||d.code||'',ean)
  const score=Math.round((barcodeMatch?55:0)+(brandMatch?20:0)+Math.min(15,titleScore*20)+(sizeMatch?10:0))
  const confidence=score>=85?'HIGH':score>=65?'REVIEW':'LOW'
  return NextResponse.json({ok:true,candidate:{source:'Open Food Facts',ean:x.code||d.code||ean,upc:'',gtin:x.code||d.code||ean,asin:'',title,brand,size,image:x.image_front_url||x.image_url||'',score,confidence,checks:{barcode:barcodeMatch,brand:brandMatch,title:titleScore>=.45,size:sizeMatch}}})
 }catch{return NextResponse.json({ok:false,error:'Open Food Facts lookup failed.',source:'Open Food Facts'},{status:502})}
}
