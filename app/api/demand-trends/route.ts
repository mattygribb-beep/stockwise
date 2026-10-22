import { NextResponse } from 'next/server';
import { getSql } from '../../../lib/db';
import { demandWatchlist, searchVolumeSource } from '../../../lib/demand-watchlist';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(){
 try {
  const sql=getSql();
  // Discovery candidates only: broad brand/token occurrence is NOT a verified identity match.
  const offers=await sql`SELECT o.id,o.product,o.brand,s.name AS supplier FROM supplier_offers o JOIN suppliers s ON s.id=o.supplier_id WHERE o.is_active=true`;
  const normalize=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const data=demandWatchlist.map(item=>{
   const token=normalize(item.keyword).split(' ')[0];
   const candidates=token.length>=3?offers.filter((o:any)=>normalize(String(o.brand||'')).split(' ').includes(token)||normalize(String(o.product||'')).split(' ').includes(token)):[];
   return {...item,supplierCandidateCount:candidates.length,supplierCount:new Set(candidates.map((o:any)=>o.supplier)).size,trend:'unverified',matchStatus:'requires identity review'};
  });
  return NextResponse.json({ok:true,items:data,source:searchVolumeSource,matchingMethod:'broad discovery candidates only; no EAN, flavour, size or pack validation',generatedAt:new Date().toISOString()});
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Unable to load demand watchlist'},{status:500});}
}
