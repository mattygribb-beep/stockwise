import {NextResponse} from 'next/server'
import {estimateUkFba} from '../../../../lib/amazon-uk-fba-estimator'
export const runtime='nodejs';export const dynamic='force-dynamic'
export async function GET(req:Request){const q=new URL(req.url).searchParams;const estimate=estimateUkFba({price:Number(q.get('price')),category:q.get('category')||'',weightG:Number(q.get('weightG')),lengthCm:Number(q.get('lengthCm')),widthCm:Number(q.get('widthCm')),heightCm:Number(q.get('heightCm')),asOf:q.get('asOf')||undefined,ukEstablishedSeller:q.get('ukEstablishedSeller')!=='false'});const valid=estimate.confidence!=='INVALID_INPUT';return NextResponse.json({ok:valid,estimate},{status:valid?200:400})}
