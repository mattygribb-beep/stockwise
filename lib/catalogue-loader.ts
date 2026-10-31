import type {SupplierConfig} from './suppliers'
export type SavedCatalogue={slug:string;name:string;offers:any[];lastSync:string|null}
export async function loadSupplierCatalogues(suppliers:Pick<SupplierConfig,'slug'|'name'>[],options:{request?:typeof fetch;signal?:AbortSignal;onLoaded?:(catalogue:SavedCatalogue)=>void}={}){
 const outcomes=await Promise.allSettled(suppliers.map(async supplier=>{
  const response=await (options.request||fetch)('/api/suppliers/catalogue?supplier='+encodeURIComponent(supplier.slug),{cache:'no-store',signal:options.signal})
  let data:any;try{data=await response.json()}catch{throw new Error('Supplier catalogue returned an invalid response (HTTP '+response.status+').')}
  if(!response.ok||!data.ok||!Array.isArray(data.offers))throw new Error(data.error||'Unable to load saved catalogue (HTTP '+response.status+').')
  const catalogue={slug:supplier.slug,name:supplier.name,offers:data.offers,lastSync:data.lastSync||null}
  if(!options.signal?.aborted)options.onLoaded?.(catalogue)
  return catalogue
 }))
 const loaded:SavedCatalogue[]=[],errors:Record<string,string>={}
 outcomes.forEach((result,index)=>{if(result.status==='fulfilled')loaded.push(result.value);else errors[suppliers[index].slug]=result.reason instanceof Error?result.reason.message:'Unable to load saved catalogue.'})
 return {loaded,errors}
}
