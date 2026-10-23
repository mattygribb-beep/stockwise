import {NextResponse} from 'next/server'
import snapshot from '../../../../reports/source-stack-step3-2026-10-23.json'
export async function GET(){return NextResponse.json({ok:true,method:'Dated interim economics snapshot; published fee estimates, not live market data',snapshot},{headers:{'Cache-Control':'no-store'}})}
