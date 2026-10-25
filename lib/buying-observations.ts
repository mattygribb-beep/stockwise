import {getSql} from './db'
import type {Research} from './buying-assistant'
export async function saveBuyingObservation(product:{asin:string;supplier:string;offerId:string;identitySignature?:string},research:Research,sql=getSql()){
 const prepared=(o:Research['amazon'])=>({...o,...(o.price!==undefined?{priceCheckedAt:o.priceCheckedAt||o.checkedAt}:{})})
 const amazon=research.amazon.status==='found'?JSON.stringify(prepared(research.amazon)):null,supplier=research.supplier.status==='found'?JSON.stringify(prepared(research.supplier)):null
 await sql`INSERT INTO buying_public_observations(asin,supplier,supplier_offer_id,identity_signature,checked_at,latest_attempt,amazon,supplier_observation)
 VALUES(${product.asin},${product.supplier},${product.offerId},${product.identitySignature||''},${research.checkedAt},${JSON.stringify(research)}::jsonb,${amazon}::jsonb,${supplier}::jsonb)
 ON CONFLICT(asin,supplier,supplier_offer_id) DO UPDATE SET identity_signature=EXCLUDED.identity_signature,checked_at=EXCLUDED.checked_at,latest_attempt=EXCLUDED.latest_attempt,
 amazon=CASE WHEN buying_public_observations.identity_signature<>EXCLUDED.identity_signature THEN EXCLUDED.amazon WHEN EXCLUDED.amazon IS NOT NULL THEN COALESCE(buying_public_observations.amazon,'{}'::jsonb)||EXCLUDED.amazon ELSE buying_public_observations.amazon END,
 supplier_observation=CASE WHEN buying_public_observations.identity_signature<>EXCLUDED.identity_signature THEN EXCLUDED.supplier_observation WHEN EXCLUDED.supplier_observation IS NOT NULL THEN COALESCE(buying_public_observations.supplier_observation,'{}'::jsonb)||EXCLUDED.supplier_observation ELSE buying_public_observations.supplier_observation END
 WHERE EXCLUDED.checked_at>=buying_public_observations.checked_at`
}
