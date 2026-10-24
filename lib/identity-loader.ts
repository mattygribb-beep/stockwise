type JsonResponse={ok:boolean;json:()=>Promise<any>}
export type IdentityFetch=(url:string,options:{cache:'no-store';signal?:AbortSignal})=>Promise<JsonResponse>
type Callbacks={products:(offers:any[],complete?:boolean)=>void;identities:(identities:any[])=>void;suggestions:(data:any)=>void;error:(part:'products'|'identities'|'suggestions',message:string)=>void;finished:(part:'products'|'identities'|'suggestions')=>void}
// Start independent requests together. Never make the work queue wait for suggestions.
export async function loadIdentityWorkspace(fetcher:IdentityFetch,callbacks:Callbacks,signal?:AbortSignal){
 const tasks=[
  {part:'products' as const,url:'/api/product-identity/catalogue',apply:(d:any)=>callbacks.products(d.offers||[],!d.hasMore)},
  {part:'identities' as const,url:'/api/product-identity',apply:(d:any)=>callbacks.identities(d.identities||[])},
  {part:'suggestions' as const,url:'/api/identity-suggestions',apply:(d:any)=>callbacks.suggestions(d)}
 ]
 await Promise.allSettled(tasks.map(async task=>{
  try{const response=await fetcher(task.url,{cache:'no-store',signal}),data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'Unable to load '+task.part);if(!signal?.aborted)task.apply(data)
   if(task.part==='products'){
    let offers=data.offers||[],next=data.nextOffset,more=data.hasMore
    while(more&&!signal?.aborted){if(!Number.isInteger(next)||next<offers.length)throw Error('Invalid catalogue continuation');const r=await fetcher('/api/product-identity/catalogue?limit=10000&offset='+next,{cache:'no-store',signal}),d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Unable to load remaining products');if(!Array.isArray(d.offers)||!d.offers.length||d.nextOffset<=next)throw Error('Catalogue continuation did not advance');offers=[...offers,...d.offers];next=d.nextOffset;more=d.hasMore;if(!signal?.aborted)callbacks.products(offers,!more)}
   }
  }
  catch(e){if(!signal?.aborted)callbacks.error(task.part,e instanceof Error?e.message:'Unable to load '+task.part)}
  finally{if(!signal?.aborted)callbacks.finished(task.part)}
 }))
}
