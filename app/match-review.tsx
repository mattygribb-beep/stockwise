'use client'

import {useState} from 'react'
import {ArrowRight,CheckCircle2,ChevronDown,ExternalLink,Search,ShieldAlert} from 'lucide-react'
import snapshot from '../lib/match-review-snapshot.json'

const actionNames:Record<string,string>={
 VERIFY_SELECTED_SUPPLIER_IDENTITY:'Verify this supplier product matches the Amazon listing',
 CAPTURE_AMAZON_PRODUCT_DETAILS:'Capture the Amazon product details',
 CAPTURE_VALID_AMAZON_BARCODE:'Capture a valid Amazon EAN or UPC',
 CAPTURE_VALID_SUPPLIER_BARCODE:'Capture the supplier EAN or UPC',
 VERIFY_AMAZON_SELL_PACK:'Confirm the number of physical units per Amazon sale',
 OBTAIN_SUPPLIER_PRICE:'Obtain the supplier price',
 SUPPLIER_OFFER_INACTIVE:'Find an active supplier offer',
 CONFIRM_SUPPLIER_STOCK:'Confirm supplier stock',
 RESOLVE_SPECIFIC_CAUTION:'Resolve the product-specific caution below',
 CAPTURE_AMAZON_PRICE:'Capture an Amazon selling price',
 REFRESH_AMAZON_PRICE_AND_AVAILABILITY:'Check the current Amazon price and availability',
 REFRESH_SUPPLIER_COST_STOCK_AND_EXPIRY:'Refresh supplier cost, stock and expiry',
 VERIFY_PACKAGED_DIMENSIONS_AND_WEIGHT:'Measure the complete sell pack, including packaging',
 CONFIRM_PRODUCT_AND_FEE_VAT_TREATMENT:'Confirm the product and fee VAT treatment',
 CALCULATE_FBA_PREP_INBOUND_AND_RETURNS_COSTS:'Calculate Amazon fees, prep, inbound shipping and returns costs',
 CHECK_DEMAND_COMPETITION_AND_SELLING_ELIGIBILITY:'Check demand, competition and selling eligibility',
}
const money=(value:string|number|null)=>Number(value)>0?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(value)):'Not recorded'
const date=(value:string|null)=>value?new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'}):'Date not recorded'
const tabs=[['all','All matches'],['verified','Verified pairs'],['review','Identity review'],['hold','On hold']] as const

export default function MatchReview(){
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[gap,setGap]=useState('all'),[expanded,setExpanded]=useState<string|null>(null)
 const rows=snapshot.rows.filter(r=>{
  const matchesQuery=[r.title,r.asin,r.supplier,r.supplier_product].join(' ').toLowerCase().includes(query.trim().toLowerCase())
  const matchesFilter=filter==='all'||filter==='verified'&&r.selected_supplier_pair_verified||filter==='review'&&r.state==='IDENTITY_REVIEW'||filter==='hold'&&r.state.startsWith('HOLD_')
  const matchesGap=gap==='all'||gap==='details'&&!r.detail_capture_count||gap==='barcode'&&!r.amazon_code_present||gap==='cost'&&r.specific_actions.includes('OBTAIN_SUPPLIER_PRICE')
  return matchesQuery&&matchesFilter&&matchesGap
 })
 return <div className="reviewWorkspace">
  <div className="reviewHeading"><div className="title"><small>PRODUCT VERIFICATION</small><h1>Match review<span className="headingCount">64</span></h1><p>A clear next step for every product. Verify the evidence before committing capital.</p></div><span className="snapshotStamp">Audit · 24 Oct 2026</span></div>
  <div className="reviewMetrics">
   {[['7','Verified supplier pairs','Identity linked; commercial checks remain'],['54','Need identity review','Confirm product, packaging and sell pack'],['3','On hold','Missing supplier price or product details'],['0','Ready to buy','Complete the evidence before deciding']].map(([value,label,help])=><div className="reviewMetric" key={label}><span>{label}</span><strong>{value}</strong><small>{help}</small></div>)}
  </div>
  <div className="evidenceNotice"><ShieldAlert size={19} aria-hidden="true"/><div><b>Evidence first. Buying decisions follow.</b><p>This is the saved 64-product audit from 24 October. Prices and stock below are historical records, not live quotes. Every item still needs a complete commercial check.</p></div></div>
  <section className="reviewList" aria-label="Product match checklist">
   <div className="reviewToolbar"><div><h2>Your review queue</h2><p>31 need Amazon details · 27 need an Amazon barcode · 2 need supplier prices</p></div><label className="reviewSearch"><Search size={17} aria-hidden="true"/><span className="sr-only">Search the review queue</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search product, ASIN or supplier"/></label></div>
   <div className="reviewFilters"><div className="reviewTabs" role="group" aria-label="Filter by review status">{tabs.map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div><label><span className="sr-only">Filter by missing evidence</span><select value={gap} onChange={e=>setGap(e.target.value)}><option value="all">All evidence gaps</option><option value="details">Missing Amazon details</option><option value="barcode">Missing Amazon barcode</option><option value="cost">Missing supplier price</option></select></label></div>
   <p className="reviewResultCount" role="status">Showing {rows.length} of 64 products</p>
   {rows.length===0?<div className="reviewEmpty"><Search size={28}/><h3>No products match these filters</h3><p>Try another product name or clear your filters.</p><button className="secondaryAction" onClick={()=>{setQuery('');setFilter('all');setGap('all')}}>Clear filters</button></div>:rows.map(r=>{
    const isOpen=expanded===r.asin,held=r.state.startsWith('HOLD_'),verified=r.selected_supplier_pair_verified
    return <article className="reviewProduct" key={r.asin}>
     <div className="reviewProductTop"><div className={'productSymbol '+(held?'hold':verified?'verified':'')} aria-hidden="true">{verified?<CheckCircle2 size={20}/>:held?<ShieldAlert size={20}/>:<Search size={20}/>}</div><div className="reviewProductName"><span className="asinLabel">{r.asin}</span><h3>{r.title}</h3><p>{r.supplier} <span>·</span> {r.supplier_product}</p></div><span className={'reviewBadge '+(held?'hold':verified?'verified':'')}>{held?'On hold':verified?'Pair verified':'Identity review'}</span></div>
     <div className="reviewProductBottom"><div className="evidenceChips"><span>{r.detail_capture_count?'Details captured':'Details missing'}</span><span>{r.amazon_code_present?'Amazon code recorded':'Amazon code missing'}</span><span>Commercial checks needed</span></div><button className="reviewExpand" aria-expanded={isOpen} aria-controls={'evidence-'+r.asin} onClick={()=>setExpanded(isOpen?null:r.asin)}>{isOpen?'Close checklist':'Review checklist'}<ChevronDown size={16} style={{transform:isOpen?'rotate(180deg)':undefined}}/></button></div>
     {isOpen&&<div className="reviewEvidence" id={'evidence-'+r.asin}>
      {r.specific_caution&&<div className="productCaution"><ShieldAlert size={17}/><p>{r.specific_caution}</p></div>}
      <div className="reviewEvidenceGrid"><div><h4>Next steps for this product</h4><ul className="actionChecklist">{[...r.specific_actions,...r.common_actions].map(a=><li key={a}><span aria-hidden="true"/>{actionNames[a]||a}</li>)}</ul></div><div className="recordedEvidence"><h4>Recorded evidence</h4><dl><div><dt>Amazon selling price</dt><dd>{money(r.amazon_recorded_price)}</dd><small>Record last seen {date(r.amazon_record_last_seen_at)}</small></div><div><dt>Supplier case price</dt><dd>{money(r.case_price)}</dd><small>{r.case_qty||'Unknown'} units / case · seen {date(r.supplier_cost_observed_at)}</small></div><div><dt>Recorded supplier stock</dt><dd>{r.supplier_recorded_stock_qty===null?'Not recorded':r.supplier_recorded_stock_qty+' cases / source units'}</dd><small>{r.supplier_recorded_stock_status||'Availability needs checking'}</small></div><div><dt>Verified Amazon sell pack</dt><dd>{r.verified_listing_packs.length?r.verified_listing_packs.map(p=>p.pack_qty+' × '+(p.unit_size||'size to confirm')).join(', '):'Needs verification'}</dd></div></dl><p className="evidenceFootnote">A valid barcode does not prove the sell-pack quantity. Item weight alone does not establish packaged measurements.</p><div className="reviewLinks"><a href={'https://www.amazon.co.uk/dp/'+r.asin} target="_blank" rel="noopener noreferrer">Amazon listing <ExternalLink size={13}/></a>{r.supplier_url?.startsWith('https://')&&<a href={r.supplier_url} target="_blank" rel="noopener noreferrer">Supplier source <ExternalLink size={13}/></a>}</div></div></div>
     </div>}
    </article>
   })}
  </section>
  <p className="auditFooter"><ArrowRight size={14}/> Work through the checklist, then verify the current evidence in Product Identity and Buyer. This audit does not mark products as verified.</p>
 </div>
}
