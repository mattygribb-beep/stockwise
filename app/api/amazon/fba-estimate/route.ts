import {NextResponse} from 'next/server'
import {estimateUkFba} from '../../../../lib/amazon-uk-fba-estimator'
export const runtime='nodejs';export const dynamic='force-dynamic'
export async function GET(req:Request){const u=new URL(req.url),q=u.searchParams;return NextResponse.json({ok:true,estimate:estimateUkFba({price:Number(q.get('price')),category:q.get('category')||'',weightG:Number(q.get('weightG')),lengthCm:Number(q.get('lengthCm')),widthCm:Number(q.get('widthCm')),heightCm:Number(q.get('heightCm'))})})}
