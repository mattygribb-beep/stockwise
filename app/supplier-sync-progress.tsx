'use client'
import {AlertCircle,RefreshCw} from 'lucide-react'
import type {SupplierSyncResult} from '../lib/supplier-sync'

export default function SupplierSyncProgress({results,busy,stopping,onStop,onRetry}:{results:SupplierSyncResult[];busy:boolean;stopping:boolean;onStop:()=>void;onRetry:()=>void}){
 if(!results.length)return null
 const count=(state:string)=>results.filter(row=>row.state===state).length
 const active=results.find(row=>row.state==='running'),done=results.filter(row=>row.state!=='queued'&&row.state!=='running').length
 const failed=results.filter(row=>row.state==='failed'||row.state==='reload-needed')
 const labels:Record<string,string>={queued:'Waiting',running:'Syncing',success:'Updated',failed:'Failed',skipped:'Manual access',stopped:'Not started','reload-needed':'Saved · reload needed'}
 return <section className="supplierSyncPanel" aria-label="Supplier sync progress" aria-busy={busy}>
  <div className="supplierSyncHead"><div><span className="syncEyebrow">CATALOGUE REFRESH</span><h2>{busy?'Updating your suppliers':count('stopped')?'Sync stopped':'Sync complete'}</h2><p role="status" aria-live="polite">{done} of {results.length} suppliers processed</p></div><div className="syncPanelActions">{busy?<button className="secondaryAction" disabled={stopping} onClick={onStop}>{stopping?'Stopping after current…':'Stop after current'}</button>:(count('failed')+count('stopped')>0)&&<button className="secondaryAction" onClick={onRetry}>Retry unfinished</button>}</div></div>
  <div className="syncProgressTrack" role="progressbar" aria-label="Suppliers processed" aria-valuemin={0} aria-valuemax={results.length} aria-valuenow={done}><span style={{width:done/results.length*100+'%'}}/></div>
  <div className="syncSummary" aria-label="Sync totals">{[['success','Updated'],['failed','Failed'],['queued','Waiting'],['skipped','Manual / skipped'],...(count('reload-needed')?[['reload-needed','Saved · reload needed']]:[]),...(count('stopped')?[['stopped','Not started']]:[])].map(([state,label])=><div key={state} className={'syncTotal '+state}><strong>{count(state)}</strong><span>{label}</span></div>)}</div>
  {active&&<div className="syncActive"><RefreshCw size={18} aria-hidden="true"/><div><b>{active.name}</b><span>{stopping?'Finishing this supplier before stopping.':'Updating catalogue and loading saved products…'}</span></div><span className="syncRunningBadge">In progress</span></div>}
  {failed.length>0&&<ul className="syncIssues" aria-label="Sync issues">{failed.map(row=><li key={row.slug}><AlertCircle size={17} aria-hidden="true"/><div><b>{row.name} · {labels[row.state]}</b><p>{row.message||'Refresh the saved catalogue before retrying.'}</p></div></li>)}</ul>}
  <details className="syncDetails"><summary>View all {results.length} supplier results</summary><ul className="supplierSyncResults">{results.map(row=><li key={row.slug} className={'syncResult '+row.state}><div><b>{row.name}</b><span>{labels[row.state]}{row.count!=null?' · '+row.count+' products':''}</span></div>{row.message&&<small>{row.message}</small>}</li>)}</ul></details>
  <p className="supplierSyncHelp">{busy?'Keep Wholesale open while the queue runs. Each supplier updates separately.':'Failed suppliers can be retried individually. Existing verified barcode and identity overrides are preserved.'} Manual-only suppliers are skipped.</p>
 </section>
}
