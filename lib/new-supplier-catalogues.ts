// Public catalogue discovery. Captured quotes stay separate from approved buying costs.
export const NEW_SUPPLIER_SOURCES = {
 'appleton-sweets':{name:'Appleton Sweets',base:'https://www.appletonsweets.co.uk',path:'/collections/wholesale-american-sweets/products.json',kind:'shopify',pages:4,vat:'exclusive'},
 'kandy-king':{name:'The Kandy King',base:'https://www.thekandyking.co.uk',path:'/wholesale-american-candy/',kind:'woocommerce',pages:12,vat:'unknown'},
 'candy-theatre':{name:'Candy Theatre',base:'https://www.candytheatre.com',path:'/products.json',kind:'shopify',pages:12,vat:'unknown'},
 'sweets-treats':{name:'Sweets & Treats Wholesale',base:'https://www.sweetsandtreatswholesale.co.uk',path:'/wholesale-american-sweets.html',kind:'magento',pages:16,vat:'unknown'},
 'hollywood-candy':{name:'Hollywood Candy Wholesale',base:'https://www.hollywoodcandywholesale.co.uk',path:'/shop',kind:'odoo',pages:3,vat:'unknown'},
 'epicerie-corner':{name:'Epicerie Corner',base:'https://epiceriecorner.co.uk',path:'/collections/biscuits/products.json',kind:'shopify',pages:80,vat:'unknown'},
 'delicatezza':{name:'Delicatezza',base:'https://www.delicatezza.co.uk',path:'/collections/biscuits-delicatezza/products.json',kind:'shopify',pages:80,vat:'unknown'},
 'catering-mart':{name:'The Catering Mart',base:'https://thecateringmart.com',path:'/collections/wholesale-biscuits/products.json',kind:'shopify',pages:40,vat:'unknown'},
 'auguste-noel':{name:'Auguste Noel',base:'https://www.augustenoel.co.uk',path:'/Catalogue/WORLD-FOODS/French',kind:'gob2b',pages:1,vat:'unknown'},
} as const
export type NewSupplierSlug = keyof typeof NEW_SUPPLIER_SOURCES
export const decode=(s:string)=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#(?:x([\da-f]+)|(\d+));/gi,(_,h,d)=>String.fromCodePoint(parseInt(h||d,h?16:10))).replace(/&#039;|&apos;/g,"'").replace(/&nbsp;/g,' ')
const normalizeBrand=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
const text=(s:string)=>decode(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim()
export function packFacts(title:string){
 const a=[...title.matchAll(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l|oz)\b/gi)]
 const size=a.length?a[a.length-1][1]+a[a.length-1][2].toLowerCase():''
 if(/\d+\s*[x×]\s*\d+\s*[x×]\s*\d/i.test(title))return {size,caseQty:null}
 const q=title.match(/\b(\d+)\s*[x×]\s*\d+(?:\.\d+)?\s*(?:kg|g|ml|l|oz)\b/i)||title.match(/\b(?:kg|g|ml|l|oz)\s*[x×]\s*(\d+)\b/i)||title.match(/\b(\d+)\s*(?:count|ct)\b/i)||title.match(/\b[x×]\s*(\d+)\s*$/i)
 return {size,caseQty:q?+q[1]:null}
}
export function validCode(value:unknown){const s=String(value||'').trim();if(!/^(?:\d{8}|\d{12,14})$/.test(s))return '';let sum=0;for(let i=s.length-2,w=3;i>=0;i--,w=4-w)sum+=Number(s[i])*w;return (10-sum%10)%10===Number(s.at(-1))?s:''}
function offer(slug:NewSupplierSlug,id:string,title:string,url:string,page:number,extra:any={}){
 const source=NEW_SUPPLIER_SOURCES[slug],facts=packFacts(title),isRetail=slug==='epicerie-corner'||slug==='delicatezza',caseQty=isRetail?null:extra.caseQty||facts.caseQty
 return {supplierProductId:id,product:text(title),rawTitle:text(title),brand:extra.brand||'',supplierSku:extra.supplierSku||'',size:facts.size,caseQty:caseQty||1,
 // Unknown quantities are kept as discovery records, never used as costs.
 casePrice:0,unitCost:0,ean:validCode(extra.ean),status:extra.status||'AVAILABILITY UNKNOWN',stockQty:extra.stockQty??null,expiry:extra.expiry||'',url,source:source.name+' public catalogue · discovery only',sourcePage:page,
 tags:[{type:'catalogue-evidence',observedAt:extra.observedAt,quotedPrice:extra.quotedPrice||null,vatBasis:source.vat,priceAccess:extra.quotedPrice?'public quote':'account required / not exposed',caseQtyConfirmed:!!caseQty,listedPackCount:facts.caseQty,commercialHold:true,scope:source.kind==='odoo'?'pilot: first 3 catalogue pages':slug==='auguste-noel'?'French category':slug==='delicatezza'?'Public retail catalogue only; wholesale and special-order listings excluded':'selected public catalogue',catalogueScope:source.path,quoteType:slug==='epicerie-corner'||slug==='delicatezza'?'public-retail':slug==='catering-mart'?'public-catalogue':'public-quote'}]}
}
export function parseShopify(slug:NewSupplierSlug,products:any[],page:number,observedAt:string){const source=NEW_SUPPLIER_SOURCES[slug];return products.filter(p=>!(slug==='delicatezza'&&/\|\s*(?:wholesale|special order)\b/i.test(String(p.title||'')))).flatMap(p=>(p.variants||[]).map((v:any)=>{
 const title=String(p.title||'')+(v.title&&v.title!=='Default Title'?' — '+v.title:'');const vendor=String(p.vendor||'').trim();return offer(slug,String(p.id)+'-'+String(v.id),title,source.base+'/products/'+p.handle+'?variant='+v.id,page,{observedAt,brand:vendor&&normalizeBrand(title).startsWith(normalizeBrand(vendor)+' ')?vendor:'',supplierSku:v.sku,ean:v.barcode,quotedPrice:Number(v.price)>0?Number(v.price):null,status:v.available===true?'IN STOCK':v.available===false?'OUT OF STOCK':'AVAILABILITY UNKNOWN'})})).filter(o=>o.product)}
export function parseHtml(slug:NewSupplierSlug,html:string,page:number,observedAt:string){const source=NEW_SUPPLIER_SOURCES[slug],out:any[]=[]
 if(source.kind==='gob2b'){
  const raw=html.match(/<script[^>]*id="FASTNodes"[^>]*>([\s\S]*?)<\/script>/i)?.[1]
  if(!raw)throw new Error('Public French category data unavailable')
  const nodes=JSON.parse(raw).Nodes;if(!Array.isArray(nodes))throw new Error('Invalid public category data')
  for(const n of nodes){if(n.Type!=='P'||!n.StockCode||!String(n.Href||'').startsWith('/Catalogue/'))continue
   // Pricing requires login. Do not use concealed SortPrice metadata as a trade quote.
   out.push(offer(slug,String(n.StockCode),String(n.Name),source.base+n.Href,page,{observedAt,supplierSku:String(n.StockCode)}))
  }
 }

 if(source.kind==='woocommerce')for(const m of html.matchAll(/<li\b[^>]*class="[^"]*\bproduct type-product\b[^"]*"[^>]*>([\s\S]*?)<\/li>/g)){
  const block=m[0],a=block.match(/<a[^>]*href="([^"]+)"[^>]*aria-label="([^"]+)"/),id=block.match(/\bpost-(\d+)\b/),plain=text(block);if(!a||!id)continue
  out.push(offer(slug,id[1],decode(a[2]),decode(a[1]),page,{observedAt,caseQty:Number(plain.match(/Unit Count:\s*(\d+)/i)?.[1])||undefined,stockQty:plain.match(/(\d+) in Stock/i)?.[1]?Number(plain.match(/(\d+) in Stock/i)![1]):null,status:/\boutofstock\b/.test(block)?'OUT OF STOCK':/\binstock\b/.test(block)?'IN STOCK':'AVAILABILITY UNKNOWN',expiry:plain.match(/Product Date:\s*([\d/.-]+)/i)?.[1]||''}))
 }
 if(source.kind==='magento')for(const m of html.matchAll(/<li\b[^>]*class="item product product-item"[^>]*>([\s\S]*?)<\/li>/g)){
  const block=m[1],a=block.match(/<a[^>]*class="product-item-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/),id=block.match(/data-product-id="(\d+)"/);if(!a||!id)continue
  out.push(offer(slug,id[1],text(a[2]),decode(a[1]),page,{observedAt,quotedPrice:Number(block.match(/data-price-amount="([\d.]+)"/)?.[1])||null,supplierSku:block.match(/data-product-sku="([^"]+)"/)?.[1]||'',stockQty:Number(text(block).match(/(\d+) in stock!/i)?.[1])||null,status:/Out of stock/i.test(text(block))?'OUT OF STOCK':/in stock!/i.test(text(block))?'IN STOCK':'AVAILABILITY UNKNOWN'}))
 }
 if(source.kind==='odoo')for(const m of html.matchAll(/<form\b[^>]*class="oe_product_cart[^"]*"[^>]*aria-label="([^"]+)"[^>]*>([\s\S]*?)<\/form>/g)){
  const a=m[2].match(/href="(\/shop\/[^\"]+)"/),id=m[2].match(/data-product-template-id="(\d+)"/);if(a&&id)out.push(offer(slug,id[1],decode(m[1]),source.base+decode(a[1]),page,{observedAt}))
 }
 return out
}
export async function collectNewSupplier(slug:NewSupplierSlug,options:{preview?:boolean}={}){
 const source=NEW_SUPPLIER_SOURCES[slug];if(!source)throw new Error('No public collector for this supplier')
 const observedAt=new Date().toISOString(),offers:any[]=[],pages:any[]=[];let complete=false
 for(let page=1;page<=(options.preview?1:source.pages);page++){
  const url=source.base+(source.kind==='shopify'?source.path+'?limit=250&page='+page:source.kind==='woocommerce'?source.path+(page===1?'':'page/'+page+'/'):source.kind==='magento'?source.path+'?p='+page:source.path+(source.kind==='gob2b'||page===1?'':'/page/'+page))
  const r=await fetch(url,{cache:'no-store',headers:{'User-Agent':'Source Stack Public Catalogue/1.0','Accept':source.kind==='shopify'?'application/json':'text/html'},signal:AbortSignal.timeout(25000)})
  if(!r.ok)throw new Error(source.name+' returned '+r.status+' on page '+page+'; previous records kept')
  let parsed:any[],count:number,html=''
  if(source.kind==='shopify'){const ps=(await r.json()).products;if(!Array.isArray(ps))throw new Error('Missing products feed');count=ps.length;parsed=parseShopify(slug,ps,page,observedAt)}
  else {html=await r.text();parsed=parseHtml(slug,html,page,observedAt);count=parsed.length}
  if(page===1&&!parsed.length)throw new Error('No public products could be parsed; previous records kept')
  const known=new Set(offers.map(o=>o.supplierProductId));if(parsed.length&&parsed.every(o=>known.has(o.supplierProductId)))throw new Error('Repeated catalogue page; previous records kept')
  offers.push(...parsed);pages.push({page,url,products:count})
  if(source.kind==='gob2b'||(source.kind==='shopify'?count<250:source.kind==='woocommerce'?!html.includes(source.path+'page/'+(page+1)+'/'):source.kind==='magento'?!new RegExp('[?&](?:amp;)?p='+(page+1)+'(?:["&])').test(html):false)){complete=true;break}
 }
 if(!complete&&source.kind!=='odoo'&&!options.preview)throw new Error('Catalogue page limit reached; previous records kept')
 // Collection feeds omit barcodes; public product JSON can expose them.
 let barcodePages=0,barcodeErrors=0
 if(['appleton-sweets','epicerie-corner','delicatezza','catering-mart'].includes(slug)&&!options.preview){
  const groups=[...new Map(offers.map(o=>[o.url.split('?')[0],o.url.split('?')[0]])).values()];let next=0
  await Promise.all(Array.from({length:4},async()=>{while(next<groups.length){const url=groups[next++];try{
   const r=await fetch(url+'.js',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('Barcode page unavailable');const p=await r.json();barcodePages++
   for(const v of p.variants||[]){const o=offers.find(o=>o.supplierProductId===String(p.id)+'-'+String(v.id));if(o){o.ean=validCode(v.barcode);o.tags[0].barcodeScope='Supplier trade variant; retail-unit versus outer-case scope requires review';o.tags[0].barcodeSource=url+'.js'}}
  }catch{barcodeErrors++}}}))
 }
 return {supplier:source.name,slug,observedAt,complete,scope:options.preview?'Preview: first catalogue page only':source.kind==='odoo'?'Pilot: first 3 pages only':slug==='auguste-noel'?'French category':slug==='delicatezza'?'Public retail catalogue; wholesale and special-order prices excluded':'Selected public catalogue',pages,barcodePages,barcodeErrors,offers:[...new Map(offers.map(o=>[o.supplierProductId,o])).values()]}
}
