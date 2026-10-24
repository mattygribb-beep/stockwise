import type {SupplierConfig} from './suppliers'
export type SyncState='queued'|'running'|'success'|'failed'|'skipped'|'stopped'|'reload-needed'
export type SupplierSyncResult={slug:string;name:string;state:SyncState;count?:number;message?:string;offers?:any[];lastSync?:string}
export const canSyncSupplier=(supplier:SupplierConfig)=>!!supplier.syncPath||!supplier.discoveryOnly

async function readJson(response:Response){
 const text=await response.text()
 try{return JSON.parse(text)}catch{throw new Error('Server returned an invalid response (HTTP '+response.status+'). Refresh the saved catalogue before retrying.')}
}
export async function syncOneSupplier(supplier:SupplierConfig,request:typeof fetch=fetch):Promise<SupplierSyncResult>{
 const response=await request(supplier.syncPath||'/api/suppliers/'+supplier.slug,{cache:'no-store'})
 const data=await readJson(response)
 if(!response.ok||!data.ok)throw new Error(data.error||'Sync request failed (HTTP '+response.status+').')
 if(!data.saved&&(!Array.isArray(data.offers)||!data.offers.length))throw new Error('Sync returned no products; previous catalogue kept.')
 // Always use the saved, normalized catalogue so manual EAN/identity overrides survive in the UI.
 try{
  const savedResponse=await request('/api/suppliers/catalogue?supplier='+encodeURIComponent(supplier.slug),{cache:'no-store'})
  const saved=await readJson(savedResponse)
  if(!savedResponse.ok||!saved.ok||!Array.isArray(saved.offers)||!saved.offers.length)throw new Error('Saved catalogue could not be loaded.')
  return {slug:supplier.slug,name:supplier.name,state:'success',count:saved.offers.length,offers:saved.offers,lastSync:saved.lastSync||new Date().toISOString()}
 }catch{
  return {slug:supplier.slug,name:supplier.name,state:'reload-needed',count:data.offerCount||data.offers?.length,message:'Sync saved. Reload the catalogue to view it; no repeat sync is needed.'}
 }
}
export async function runSupplierSyncQueue(suppliers:SupplierConfig[],options:{request?:typeof fetch;shouldStop?:()=>boolean;onChange?:(rows:SupplierSyncResult[])=>void;onSaved?:(result:SupplierSyncResult)=>void}={}){
 const rows:SupplierSyncResult[]=suppliers.map(s=>({slug:s.slug,name:s.name,state:canSyncSupplier(s)?'queued':'skipped',...(!canSyncSupplier(s)?{message:'Manual access required; no automatic collector.'}:{})}))
 const emit=()=>options.onChange?.(rows.map(row=>({...row})))
 emit()
 for(let i=0;i<suppliers.length;i++){
  if(rows[i].state==='skipped')continue
  if(options.shouldStop?.()){rows[i]={...rows[i],state:'stopped',message:'Not started.'};emit();continue}
  rows[i]={...rows[i],state:'running'};emit()
  try{rows[i]=await syncOneSupplier(suppliers[i],options.request);options.onSaved?.(rows[i])}
  catch(error){rows[i]={slug:suppliers[i].slug,name:suppliers[i].name,state:'failed',message:error instanceof Error?error.message:'Unable to sync this supplier.'}}
  emit()
 }
 return rows
}
