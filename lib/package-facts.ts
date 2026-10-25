export type PackageFacts={weightG?:number;lengthCm?:number;widthCm?:number;heightCm?:number}
export function packagedFacts(raw:any):PackageFacts{
 const facts=raw?.facts||raw||{},value=(key:string)=>Object.entries(facts).find(([k])=>k.toLowerCase().trim()===key.toLowerCase())?.[1]
 const weight=String(value('Item Package Weight')||'').replace(/[‎‏]/g,'').trim().match(/^(\d+(?:\.\d+)?)\s*(kg|kilograms?|g|grams?|pounds?|lb|oz|ounces?)$/i)
 const dimensionText=String(value('Package Dimensions')||value('Item Package Dimensions')||'').replace(/[‎‏]/g,'').trim()
 const dims=dimensionText.match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(cm|centimetres?|mm|millimetres?|inches?)\b/i),scale=dims?.[4].toLowerCase().startsWith('i')? 2.54 : dims?.[4].toLowerCase().startsWith('m') ? 0.1 : 1
 // Amazon sometimes puts the shipping weight after a semicolon in this same package row.
 const trailingWeight=dimensionText.match(/;\s*(\d+(?:\.\d+)?)\s*(g|kg|grams?|kilograms?|ounces?|oz|pounds?|lb)\s*$/i)
 const w=weight||trailingWeight,wu=w?.[2].toLowerCase(),grams=w?Number(w[1])*(wu?.startsWith('k')?1000:wu?.startsWith('p')||wu==='lb'?453.592:wu?.startsWith('o')?28.3495:1):undefined
 const result={weightG:grams,lengthCm:dims?Number(dims[1])*scale:undefined,widthCm:dims?Number(dims[2])*scale:undefined,heightCm:dims?Number(dims[3])*scale:undefined}
 return Object.fromEntries(Object.entries(result).filter(([,v])=>v!==undefined&&Number.isFinite(v)&&v>0&&v<100000))
}
export function completePackage(p?:PackageFacts){return !!p&&[p.weightG,p.lengthCm,p.widthCm,p.heightCm].every(n=>Number.isFinite(n)&&Number(n)>0)}
