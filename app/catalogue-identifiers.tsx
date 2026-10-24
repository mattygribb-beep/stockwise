'use client'
import {useEffect,useState} from 'react'
import {identifierEdit} from '../lib/catalogue-controls'
export default function CatalogueIdentifiers({offer,onSaved}:{offer:any;onSaved:(identity:any)=>void}){
 const originalEan=offer.ean&&offer.ean!=='NEEDS MATCH'?String(offer.ean):'',originalAsin=String(offer.asin||'')
 const [ean,setEan]=useState(originalEan),[asin,setAsin]=useState(originalAsin),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false)
 useEffect(()=>{setEan(originalEan);setAsin(originalAsin);},[offer.id,originalEan,originalAsin])
 const changed=ean.trim()!==originalEan.trim()||asin.trim()!==originalAsin.trim()
 async function save(){
  const payload={supplier:offer.supplier||offer.source,supplierOfferId:String(offer.supplierProductId||offer.id),...(ean.trim()!==originalEan.trim()?{ean}:{}),...(asin.trim()!==originalAsin.trim()?{asin}:{})}
  const checked=identifierEdit(payload);if(!checked.ok){setFailed(true);setMessage(checked.error);return}
  setBusy(true);setMessage('');setFailed(false)
  try{const r=await fetch('/api/product-identity/identifiers',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Save failed');onSaved(d.identity);setMessage('Saved. Product and sell pack still need verification before buying.')}
  catch(e){setFailed(true);setMessage(e instanceof Error?e.message:'Unable to save identifiers')}
  finally{setBusy(false)}
 }
 return <div className="catalogueIdentifierEdit" onClick={e=>e.stopPropagation()}><div><b>Edit identifiers</b><p>Save a barcode, an ASIN, or both. Saving does not confirm a product match.</p></div><div className="catalogueIdentifierFields"><label>EAN / UPC<input inputMode="numeric" value={ean} onChange={e=>{setEan(e.target.value);setMessage('')}} placeholder="Scan or paste barcode" disabled={busy}/></label><label>Amazon ASIN<input value={asin} onChange={e=>{setAsin(e.target.value);setMessage('')}} placeholder="ASIN or Amazon UK product link" disabled={busy}/></label><button className="primary" disabled={!changed||busy} onClick={()=>void save()}>{busy?'Saving…':'Save identifiers'}</button></div>{message&&<p role={failed?'alert':'status'} className={failed?'identifierError':'identifierSaved'}>{message}</p>}</div>
}
