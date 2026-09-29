'use client'
import {useMemo,useState} from 'react'
import Link from 'next/link'

type Item={asin:string;title:string;price:string;url:string}
const SELLER='A3RY4E0FMNTJN0'
const BASE='https://www.amazon.co.uk'

function extract(html:string):Item[]{
 const doc=new DOMParser().parseFromString(html,'text/html')
 const cards=Array.from(doc.querySelectorAll('[data-asin]'))
 const out:Item[]=[]
 for(const card of cards){
  const asin=(card.getAttribute('data-asin')||'').trim()
  if(!/^[A-Z0-9]{10}$/.test(asin)) continue
  const title=(card.querySelector('h2 span')?.textContent||card.querySelector('h2')?.textContent||'').trim()
  const price=(card.querySelector('.a-price .a-offscreen')?.textContent||'').trim()
  const a=card.querySelector('h2 a') as HTMLAnchorElement|null
  const href=a?.getAttribute('href')||('/dp/'+asin)
  out.push({asin,title:title||'Amazon product',price,url:href.startsWith('http')?href:BASE+href})
 }
 return Array.from(new Map(out.map(x=>[x.asin,x])).values())
}
export default function AmazonImporter(){
 const [pages,setPages]=useState<Record<number,Item[]>>({})
 const [page,setPage]=useState(1)
 const [raw,setRaw]=useState('')
 const [msg,setMsg]=useState('')
 const all=useMemo(()=>Array.from(new Map(Object.values(pages).flat().map(x=>[x.asin,x])).values()),[pages])
 const capture=()=>{const items=extract(raw);if(!items.length){setMsg('No Amazon product cards found. Make sure you copied the full page HTML.');return}setPages(v=>({...v,[page]:items}));setMsg('Captured '+items.length+' products from page '+page+'.');setRaw('')}
 const csv=()=>{const q=(s:string)=>'"'+String(s||'').replaceAll('"','""')+'"';const rows=[['ASIN','Title','Price','Amazon URL'],...all.map(x=>[x.asin,x.title,x.price,x.url])];const blob=new Blob([rows.map(r=>r.map(q).join(',')).join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='flip-lead-amazon-storefront.csv';a.click();URL.revokeObjectURL(a.href)}
 return <main className="importPage">
  <div className="importTop"><div><small>AMAZON INTELLIGENCE</small><h1>Storefront Importer</h1><p>Capture a seller catalogue, deduplicate by ASIN, then bring the products into Flip Lead for supplier matching.</p></div><Link href="/">← Flip Lead</Link></div>
  <section className="importCard"><div className="store"><b>Storefront</b><span>Seller {SELLER}</span><a href={BASE+'/s?me='+SELLER+'&marketplaceID=A1F83G8C2ARO7P'} target="_blank">Open Amazon storefront ↗</a></div>
   <div className="steps"><b>How to capture each Amazon page</b><p>Open the storefront page in your browser. Use <strong>View page source</strong>, copy all of the HTML, paste it below, choose the page number and press Capture page. Repeat for pages 1–21. Flip Lead automatically removes duplicate ASINs.</p></div>
   <div className="captureRow"><label><span>PAGE</span><input type="number" min="1" max="99" value={page} onChange={e=>setPage(Number(e.target.value)||1)}/></label><div className="progress"><span>PAGES CAPTURED</span><b>{Object.keys(pages).length} / 21</b></div><div className="progress"><span>UNIQUE PRODUCTS</span><b>{all.length}</b></div></div>
   <textarea value={raw} onChange={e=>setRaw(e.target.value)} placeholder="Paste Amazon page HTML here…"/>
   <div className="actions"><button onClick={capture}>Capture page {page}</button><button className="secondary" disabled={!all.length} onClick={csv}>Export {all.length} products CSV</button><button className="secondary" onClick={()=>{setPages({});setMsg('Importer cleared.')}}>Clear</button></div>{msg&&<p className="message">{msg}</p>}
  </section>
  <section className="importCard"><div className="resultHead"><div><small>CAPTURED CATALOGUE</small><h2>{all.length} unique products</h2></div><span>{Object.keys(pages).sort((a,b)=>Number(a)-Number(b)).map(n=>'Page '+n).join(' · ')||'No pages captured yet'}</span></div>
   {!all.length?<div className="empty">Captured products will appear here with their ASIN, title, current displayed price and Amazon link.</div>:<div className="importTable"><table><thead><tr><th>ASIN</th><th>Product</th><th>Price</th><th>Amazon</th></tr></thead><tbody>{all.map(x=><tr key={x.asin}><td><b>{x.asin}</b></td><td>{x.title}</td><td>{x.price||'—'}</td><td><a href={x.url} target="_blank">Open ↗</a></td></tr>)}</tbody></table></div>}
  </section>
  <style jsx>{`
   .importPage{max-width:1180px;margin:auto;padding:40px 24px;color:#0B1320}.importTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.importTop small,.resultHead small{color:#21C784;font-weight:900;letter-spacing:.12em}.importTop h1{font-size:36px;margin:7px 0}.importTop p{color:#647084;max-width:700px}.importTop>a{color:#1E66F5;font-weight:800;text-decoration:none}.importCard{background:white;border:1px solid #DDE3EA;border-radius:14px;padding:22px;margin-top:20px}.store{display:flex;gap:16px;align-items:center;padding-bottom:18px;border-bottom:1px solid #DDE3EA}.store span{color:#647084}.store a{margin-left:auto;color:#1E66F5;font-weight:800;text-decoration:none}.steps{padding:18px 0}.steps p{color:#647084;line-height:1.6}.captureRow{display:grid;grid-template-columns:160px 1fr 1fr;gap:12px;margin-bottom:12px}.captureRow label,.progress{border:1px solid #DDE3EA;border-radius:10px;padding:12px}.captureRow span,.progress span{display:block;font-size:10px;color:#647084;font-weight:800}.captureRow input{border:0;font-size:20px;font-weight:800;width:100%;outline:none}.progress b{display:block;font-size:22px;margin-top:5px}textarea{width:100%;height:210px;border:1px solid #DDE3EA;border-radius:10px;padding:13px;font:12px monospace;resize:vertical}.actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.actions button{border:0;border-radius:8px;background:#1E66F5;color:white;padding:10px 14px;font-weight:800;cursor:pointer}.actions .secondary{background:#EEF2F7;color:#0B1320}.actions button:disabled{opacity:.45}.message{font-size:12px;color:#647084}.resultHead{display:flex;justify-content:space-between;gap:20px}.resultHead h2{margin:5px 0}.resultHead>span{font-size:11px;color:#647084}.empty{padding:30px;background:#F2F4F7;border-radius:10px;color:#647084}.importTable{overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:11px;border-bottom:1px solid #E8ECF1;font-size:12px}th{font-size:10px;color:#647084}td a{color:#1E66F5;font-weight:800;text-decoration:none}@media(max-width:700px){.importTop,.store,.resultHead{flex-direction:column}.store{align-items:flex-start}.store a{margin-left:0}.captureRow{grid-template-columns:1fr}.importPage{padding:24px 12px}.importTop h1{font-size:29px}}
  `}</style>
 </main>
}
