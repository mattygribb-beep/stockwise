import type {AssistantProduct} from './buying-assistant'
type Pool={products:AssistantProduct[];coverage:unknown;blocked:unknown[]}
// Public catalogue snapshot only. Personal settings and checks never enter this cache.
let cached:{at:number;data:Pool}|undefined,pending:Promise<Pool>|undefined
export function readBuyingPool(force=false):Promise<Pool>{
 if(!force&&cached&&Date.now()-cached.at<60000)return Promise.resolve(cached.data)
 if(pending)return pending
 pending=(async()=>{const response=await fetch('/api/buying-desk',{cache:'no-store'}),data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'Unable to load products');const pool={products:data.products,coverage:data.coverage,blocked:data.blocked||[]};cached={at:Date.now(),data:pool};return pool})().finally(()=>{pending=undefined})
 return pending
}
