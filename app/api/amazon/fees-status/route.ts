import {NextResponse} from 'next/server'
import {amazonFeeConfig} from '../../../../lib/amazon-fees'
export const runtime='nodejs';export const dynamic='force-dynamic'
export async function GET(){const c=amazonFeeConfig();return NextResponse.json({ok:true,provider:'Amazon SP-API Product Fees',status:c.status,marketplaceId:c.marketplaceId,configured:c.configured})}
