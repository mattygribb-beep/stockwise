import {NextResponse} from 'next/server'
import {GET as runMatcher} from '../amazon-catalogue-match/route'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(){
 const response=await runMatcher()
 if(!response.ok)return response
 const data=await response.json()
 if(!data.ok)return NextResponse.json(data,{status:500})
 const matches=Array.isArray(data.matches)?data.matches:[]
 const review=matches.filter((m:any)=>m.match?.band==='REVIEW'||m.match?.protectedIdentityConflict)
 const strong=matches.filter((m:any)=>m.match?.band==='STRONG'&&!m.match?.protectedIdentityConflict)
 const items=review.map((m:any)=>({
  asin:m.asin,title:m.title,supplier:m.supplier,supplierOfferId:m.supplierOfferId,
  supplierProduct:m.supplierProduct,amazonBarcode:m.amazonEan||null,supplierBarcode:m.supplierEan||null,
  confidence:m.match?.band,identityResolution:m.match?.identityResolution,
  reason:m.match?.reason,identityConflict:!!m.match?.protectedIdentityConflict,
  sizeConflict:!!m.match?.sizeConflict,packConversion:m.packConversion,
  commercialDecision:m.commercial?.decision,
  readyToBuy:false
 }))
 return NextResponse.json({
  ok:true,checked:data.amazonChecked,activeSupplierOffers:data.supplierOffers,
  strongCandidates:strong.length,reviewCandidates:review.length,
  unmatched:data.noCandidate,commercialSummary:data.commercialSummary,
  policy:'Candidates are not approved identities. ANALYSE is not BUY. Verify identity, Amazon fees, VAT, demand and restrictions before purchase.',
  items
 })
}
