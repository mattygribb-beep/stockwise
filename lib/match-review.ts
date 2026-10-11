export type ReviewDecision='PROTECTED'|'REVIEW'|'REJECTED'
export function conflictingUnitSizes(a:string|undefined,b:string|undefined){
 const parse=(v:string|undefined)=>{const m=String(v||'').toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|l)$/);if(!m)return null;return {amount:Number(m[1])*(m[2]==='kg'||m[2]==='l'?1000:1),kind:m[2].endsWith('l')?'volume':'mass'}}
 const x=parse(a),y=parse(b);if(!x||!y)return false
 return x.kind!==y.kind||Math.abs(x.amount-y.amount)>Math.max(1,x.amount*.01)
}
export function safeMatchBand(input:{score:number;gap:number;identityComplete:boolean;rejected?:boolean;protected?:boolean;sizeConflict?:boolean}):'STRONG'|'REVIEW'|'REJECTED'{
 if(input.rejected)return 'REJECTED'
 if(input.sizeConflict)return 'REVIEW'
 if(input.protected)return 'STRONG'
 return input.score>=95&&input.gap>=10&&input.identityComplete?'STRONG':'REVIEW'
}
