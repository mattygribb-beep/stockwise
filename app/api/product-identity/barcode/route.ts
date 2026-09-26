import {NextResponse} from 'next/server'

const words=(s:string)=>new Set((s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(x=>x.length>1))
const overlap=(a:string,b:string)=>{const A=words(a),B=words(b);if(!A.size||!B.size)return 0;return [...A].filter(x=>B.has(x)).length/Math.max(A.size,B.size)}

export async function GET(req:Request){
 const u=new URL(req.url),ean=(u.searchParams.get('ean')||'').replace(/\D/g,''),supplierTitle=u.searchParams.get('title')||'',supplierBrand=u.searchParams.get('brand')||'',supplierSize=u.searchParams.get('size')||''
 if(!/^\d{8,14}$/.test(ean)) return NextResponse.json({ok:false,error:'Enter a valid 8–14 digit EAN/UPC/GTIN.'},{status:400})
 try{
  const r=await fetch('https://api.upcitemdb.com/prod/trial/lookup?upc='+encodeURIComponent(ean),{headers:{Accept:'application/json'},cache:'no-store'})
  const d=await r.json().catch(()=>null)
  if(!r.ok)return NextResponse.json({ok:false,error:d?.message||('Barcode lookup unavailable ('+r.status+').')},{status:r.status===404?404:502})
  if(d?.code&&d.code!=='OK')return NextResponse.json({ok:false,error:d.message||('Barcode lookup returned '+d.code+'.')},{status:502})
  if(!Array.isArray(d?.items)||d.items.length===0)return NextResponse.json({ok:false,error:'No barcode match found in UPCitemdb for '+ean+'. The EAN can still be verified from the product packaging or another source.'},{status:404})
  const x=d.items[0], titleScore=overlap(supplierTitle,x.title||''), brandMatch=!!supplierBrand&&!!x.brand&&supplierBrand.toLowerCase()===x.brand.toLowerCase()
  const sizeToken=(supplierSize||'').toLowerCase().replace(/\s/g,''); const lookupText=((x.title||'')+' '+(x.size||'')+' '+(x.weight||'')).toLowerCase().replace(/\s/g,''); const sizeMatch=!!sizeToken&&lookupText.includes(sizeToken)
  const barcodeMatch=[x.ean,x.upc,x.gtin].filter(Boolean).some((v:string)=>v===ean||v.replace(/^0+/,'')===ean.replace(/^0+/,''))
  const score=Math.round((barcodeMatch?50:0)+(brandMatch?20:0)+Math.min(20,titleScore*25)+(sizeMatch?10:0))
  const confidence=score>=85?'HIGH':score>=65?'REVIEW':'LOW'
  return NextResponse.json({ok:true,candidate:{ean:x.ean||ean,upc:x.upc||'',gtin:x.gtin||'',asin:x.asin||'',title:x.title||'',brand:x.brand||'',size:x.size||x.weight||'',image:x.images?.[0]||'',score,confidence,checks:{barcode:barcodeMatch,brand:brandMatch,title:titleScore>=.45,size:sizeMatch}}})
 }catch{return NextResponse.json({ok:false,error:'Barcode lookup failed.'},{status:502})}
}
