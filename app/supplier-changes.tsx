'use client'
import {useEffect,useState} from 'react'

type Change={supplier_product_id:string;product:string;product_url:string;kind:string;previous_case_price:number|null;case_price:number|null;previous_unit_cost:number|null;unit_cost:number|null;previous_case_qty:number|null;case_qty:number|null;previous_status:string|null;status:string|null}
type Run={id:string;status:string;completed_at:string|null;offer_count:number;error_message:string|null;protection_reason:string|null}
type ChangeData={overview:{active:number;inactive:number;stale:number};runs:Run[];selectedRun:{id:string;completedAt:string;tracked:boolean;counts:Record<string,number>;changes:Change[];total:number;truncated:boolean;protectionReason:string|null;missingRetained:number}|null}
const labels:Record<string,string>={new:'New products',returned:'Back in catalogue',price:'Price changes',pack:'Pack changes',availability:'Availability changes',unavailable:'Not seen this scan'}
const price=(n:number|null)=>n==null?'—':Number(n)>0?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(n):'Price unavailable'
const date=(s:string)=>new Date(s).toLocaleString('en-GB')
function detail(c:Change){
 if(c.kind==='price')return price(c.previous_case_price)+' → '+price(c.case_price)+' per case; '+price(c.previous_unit_cost)+' → '+price(c.unit_cost)+' per unit, as quoted'
 if(c.kind==='pack')return c.previous_case_qty+' → '+c.case_qty+' units per case; recheck sell-pack economics'
 if(c.kind==='availability')return (c.previous_status||'Unknown')+' → '+(c.status||'Unknown')
 if(c.kind==='unavailable')return 'Retained with its identifiers and history; excluded from buying candidates.'
 return c.kind==='returned'?'Available in this scan again; confirm current stock before buying.':'First seen in the supplier catalogue.'
}
export default function SupplierChanges({slug,refresh}:{slug:string;refresh:number}){
 const [open,setOpen]=useState(false),[data,setData]=useState<ChangeData|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[run,setRun]=useState(''),[filter,setFilter]=useState('all')
 useEffect(()=>{
  if(!open)return
  const controller=new AbortController();setLoading(true);setError('')
  fetch('/api/suppliers/changes?supplier='+encodeURIComponent(slug)+(run?'&run='+encodeURIComponent(run):''),{cache:'no-store',signal:controller.signal})
   .then(async response=>{const d=await response.json();if(!response.ok||!d.ok)throw new Error(d.error||'Unable to load supplier changes');return d})
   .then(d=>{if(!controller.signal.aborted)setData(d)})
   .catch(e=>{if(!controller.signal.aborted)setError(e.message||'Unable to load supplier changes')})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return()=>controller.abort()
 },[slug,open,refresh,run,attempt])
 const selected=data?.selectedRun,changes=(selected?.changes||[]).filter(c=>filter==='all'||c.kind===filter)
 return <section className="supplierChanges" aria-label="Supplier changes">
  <button className="secondaryAction" aria-expanded={open} aria-controls="supplier-changes-content" onClick={()=>setOpen(v=>!v)}>{open?'Hide supplier changes':'Supplier changes and sync history'}</button>
  {open&&<div id="supplier-changes-content" className="supplierChangesContent" aria-busy={loading}>
   <div className="overviewSectionHead"><div><small>SUPPLIER CHANGES</small><h2>What changed since the last scan</h2><p>Track price, pack and availability changes before reviewing a purchase.</p></div><button className="secondaryAction" disabled={loading} onClick={()=>setAttempt(v=>v+1)}>Refresh changes</button></div>
   {loading?<p role="status">Loading supplier changes…</p>:error?<p className="assistantAlert" role="alert">{error} <button onClick={()=>setAttempt(v=>v+1)}>Try again</button></p>:data&&<>
    <p>{data.overview.active} active · {data.overview.inactive} inactive records retained{data.overview.stale>0?' · '+data.overview.stale+' active offers not seen within 7 days':''}</p>
    {selected?.protectionReason&&<p className="assistantAlert" role="status">{selected.protectionReason}{selected.missingRetained?' '+selected.missingRetained+' unseen products kept with their original check dates.':''}</p>}
    <div className="supplierChangeControls"><label>Completed scan <select aria-label="Choose completed supplier scan" value={run} onChange={e=>{setRun(e.target.value);setFilter('all')}}><option value="">Latest completed scan</option>{data.runs.filter(r=>r.status==='success').map(r=><option key={r.id} value={r.id}>{r.completed_at?date(r.completed_at):r.id} · {r.offer_count} offers</option>)}</select></label><label>Show <select aria-label="Filter supplier changes" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All changes</option>{Object.entries(labels).map(([kind,label])=><option key={kind} value={kind}>{label} ({selected?.counts[kind]||0})</option>)}</select></label></div>
    {!selected?<p>No completed syncs for this supplier yet.</p>:!selected.tracked?<p>This scan predates change tracking. Changes will appear after the next successful sync.</p>:<>
     <p>{selected.total} {selected.total===1?'change':'changes'} recorded · {date(selected.completedAt)}{selected.truncated?' · Showing a preview of up to 200 changes, with price and pack changes first.':''}</p>
     {!changes.length?<p>No matching changes in this {selected.truncated?'preview':'view'}.</p>:<div className="catalogueTable"><table><thead><tr><th>Product</th><th>Change</th><th>Details</th></tr></thead><tbody>{changes.map(c=><tr key={c.kind+'-'+c.supplier_product_id}><td><b>{c.product}</b><small>Supplier ID: {c.supplier_product_id}</small></td><td>{labels[c.kind]||c.kind}</td><td>{detail(c)}{c.product_url&&/^https?:\/\//i.test(c.product_url)&&<small><a href={c.product_url} target="_blank" rel="noreferrer">Open supplier ↗</a></small>}</td></tr>)}</tbody></table></div>}
    </>}
    <details><summary>Recent sync history</summary><ul className="supplierSyncResults">{data.runs.map(r=><li key={r.id}><div><b>{r.status==='success'?'Saved':r.status==='running'?'Save in progress':'Save failed'} · {r.offer_count} offers</b><span>{r.completed_at?date(r.completed_at):'Not completed'}</span></div>{(r.error_message||r.protection_reason)&&<small>{r.error_message||r.protection_reason}</small>}</li>)}</ul></details>
   </>}
  </div>}
 </section>
}
