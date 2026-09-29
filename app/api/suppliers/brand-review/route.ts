import { NextResponse } from 'next/server'
import { getSql } from '../../../../lib/db'

export const runtime='nodejs'
export const dynamic='force-dynamic'

export async function POST(req:Request){
 try{
  const body=await req.json(),sql=getSql()
  const supplierProductId=String(body.supplierProductId||'').trim()
  const supplier=String(body.supplier||'').trim()
  const status=String(body.status||'').trim().toLowerCase()
  const brand=String(body.brand||'').trim()
  if(!supplierProductId||!supplier) return NextResponse.json({ok:false,error:'Supplier and product are required'},{status:400})
  if(status!=='verified'&&status!=='unbranded') return NextResponse.json({ok:false,error:'Brand status must be verified or unbranded'},{status:400})
  if(status==='verified'&&!brand) return NextResponse.json({ok:false,error:'Enter a brand before verifying it'},{status:400})
  const rows=await sql`UPDATE supplier_offers o SET brand=${status==='unbranded'?'':brand},brand_status=${status}
    FROM suppliers s WHERE o.supplier_id=s.id AND s.name=${supplier} AND o.supplier_product_id=${supplierProductId}
    RETURNING o.supplier_product_id,o.brand,o.brand_status`
  if(!rows.length) return NextResponse.json({ok:false,error:'Supplier offer not found'},{status:404})
  return NextResponse.json({ok:true,offer:rows[0]})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Unable to save brand review'},{status:500})}
}
