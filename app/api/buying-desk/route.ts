import {NextResponse} from 'next/server'
import {loadBuyingPool} from '../../../lib/buying-pool'
export const runtime='nodejs';export const dynamic='force-dynamic'
export async function GET(){
 try{return NextResponse.json({ok:true,loadedAt:new Date().toISOString(),...await loadBuyingPool()},{headers:{'Cache-Control':'no-store'}})}
 catch{return NextResponse.json({ok:false,error:'Unable to load verified buying matches. Retry without making a buying decision.'},{status:500})}
}
