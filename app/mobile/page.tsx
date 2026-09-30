'use client'
import {useEffect,useRef,useState} from 'react'
type Scan={barcode:string;quantity:number;name:string;scannedAt:string}
const esc=(v:any)=>'"'+String(v??'').replace(/"/g,'""')+'"'
export default function MobileBarcode(){
 const [rows,setRows]=useState<Scan[]>([]),[manual,setManual]=useState(''),[running,setRunning]=useState(false),[msg,setMsg]=useState('Ready to scan')
 const video=useRef<HTMLVideoElement>(null),stream=useRef<MediaStream|null>(null),timer=useRef<any>(null),last=useRef('')
 useEffect(()=>{try{setRows(JSON.parse(localStorage.getItem('source-stack-warehouse-scans')||'[]'))}catch{};return stop},[])
 const save=(next:Scan[])=>{setRows(next);localStorage.setItem('source-stack-warehouse-scans',JSON.stringify(next))}
 const add=(raw:string)=>{const barcode=raw.replace(/\s/g,'');if(!/^\d{8,14}$/.test(barcode)){setMsg('Barcode must be 8–14 digits');return}const now=new Date().toISOString();const found=rows.find(x=>x.barcode===barcode);const next=found?rows.map(x=>x.barcode===barcode?{...x,quantity:x.quantity+1,scannedAt:now}:x):[{barcode,quantity:1,name:'',scannedAt:now},...rows];save(next);setManual('');setMsg(found?'Quantity increased':'Barcode captured')}
 const stop=()=>{if(timer.current)clearInterval(timer.current);timer.current=null;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setRunning(false)}
 const start=async()=>{const Detector=(window as any).BarcodeDetector;if(!Detector){setMsg('Camera barcode scanning is not supported in this browser. Use manual entry below.');return}try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});stream.current=s;if(video.current){video.current.srcObject=s;await video.current.play()}const d=new Detector({formats:['ean_13','ean_8','upc_a','upc_e']});setRunning(true);setMsg('Point camera at a barcode');timer.current=setInterval(async()=>{if(!video.current)return;try{const codes=await d.detect(video.current);const code=codes?.[0]?.rawValue;if(code&&code!==last.current){last.current=code;add(code);setTimeout(()=>last.current='',1200)}}catch{}},350)}catch(e:any){setMsg(e?.message||'Camera unavailable')}}
 const update=(barcode:string,patch:Partial<Scan>)=>save(rows.map(x=>x.barcode===barcode?{...x,...patch}:x))
 const csv=()=>{const head=['barcode','quantity','product_name','scanned_at'];const body=rows.map(x=>[x.barcode,x.quantity,x.name,x.scannedAt].map(esc).join(','));const blob=new Blob([[head.join(','),...body].join('\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='source-stack-warehouse-barcodes.csv';a.click();URL.revokeObjectURL(a.href)}
 return <main style={{maxWidth:720,margin:'0 auto',padding:18,fontFamily:'Arial,sans-serif',background:'#f5f7fb',minHeight:'100vh'}}>
  <header style={{marginBottom:18}}><small style={{fontWeight:800,letterSpacing:2,color:'#00a86b'}}>SOURCE STACK · MOBILE</small><h1 style={{margin:'6px 0'}}>Warehouse Barcode Capture</h1><p style={{color:'#536070'}}>Scan physical stock first. Export and verify before anything is written to the live product database.</p></header>
  <section style={{background:'white',border:'1px solid #dce3ed',borderRadius:18,padding:16}}>
   <video ref={video} playsInline muted style={{width:'100%',aspectRatio:'4/3',objectFit:'cover',background:'#111827',borderRadius:14,display:running?'block':'none'}}/>
   <button onClick={running?stop:start} style={{width:'100%',padding:16,border:0,borderRadius:12,background:'#2468f2',color:'white',fontWeight:800,fontSize:17,marginTop:running?12:0}}>{running?'Stop camera':'Scan barcode with camera'}</button>
   <p style={{fontWeight:700}}>{msg}</p>
   <div style={{display:'flex',gap:8}}><input inputMode="numeric" value={manual} onChange={e=>setManual(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')add(manual)}} placeholder="Or enter EAN / UPC" style={{flex:1,padding:14,border:'1px solid #ccd5e1',borderRadius:10,fontSize:16}}/><button onClick={()=>add(manual)} style={{padding:'0 18px',borderRadius:10,border:'1px solid #ccd5e1',fontWeight:800}}>Add</button></div>
  </section>
  <section style={{marginTop:16,background:'white',border:'1px solid #dce3ed',borderRadius:18,padding:16}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><small>CAPTURED STOCK</small><h2 style={{margin:'4px 0'}}>{rows.length} unique barcodes · {rows.reduce((a,x)=>a+x.quantity,0)} items</h2></div><button disabled={!rows.length} onClick={csv}>Export CSV</button></div>
   {rows.map(x=><div key={x.barcode} style={{padding:'14px 0',borderTop:'1px solid #edf0f4'}}><b>{x.barcode}</b><div style={{display:'grid',gridTemplateColumns:'90px 1fr 36px',gap:8,marginTop:8}}><input type="number" min="1" value={x.quantity} onChange={e=>update(x.barcode,{quantity:Math.max(1,Number(e.target.value)||1)})}/><input value={x.name} onChange={e=>update(x.barcode,{name:e.target.value})} placeholder="Product name (optional)"/><button onClick={()=>save(rows.filter(r=>r.barcode!==x.barcode))}>×</button></div></div>)}
   {!rows.length&&<p style={{color:'#6b7280'}}>Nothing scanned yet. Each repeat scan increases the quantity instead of creating another row.</p>}
  </section>
 </main>
}
