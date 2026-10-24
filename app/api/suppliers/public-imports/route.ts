import {NextResponse} from 'next/server'
import {collectNewSupplier,NEW_SUPPLIER_SOURCES,NewSupplierSlug} from '../../../../lib/new-supplier-catalogues'
import {saveSupplierCatalogue} from '../../../../lib/catalogue-store'
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=300
export async function GET(req:Request){
 const slug=new URL(req.url).searchParams.get('supplier')||''
 if(!Object.hasOwn(NEW_SUPPLIER_SOURCES,slug))return NextResponse.json({ok:false,error:'Unsupported public supplier'},{status:400})
 try{const preview=new URL(req.url).searchParams.get('preview')==='1';const data=await collectNewSupplier(slug as NewSupplierSlug,{preview})
  if(preview)return NextResponse.json({ok:true,preview:true,saved:false,...data})
  await saveSupplierCatalogue(slug,data.offers,{method:'Public discovery catalogue',observedAt:data.observedAt,scope:data.scope,complete:data.complete,pages:data.pages,barcodePages:data.barcodePages,barcodeErrors:data.barcodeErrors,commercialHold:true},{deactivateMissing:false})
  // Return the same normalized shape as a subsequent saved-catalogue request.
  return NextResponse.json({ok:true,saved:true,supplier:slug,offerCount:data.offers.length,scope:data.scope})
 }catch(e:any){return NextResponse.json({ok:false,error:e.message||'Public supplier pull failed'},{status:502})}
}
