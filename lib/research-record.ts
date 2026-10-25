import type {PublicObservation} from './public-buying-data'
export function mergeObservation(previous:PublicObservation|undefined,next:PublicObservation){
 const dated=(o:PublicObservation|undefined)=>o?{...o,...(o.price!==undefined?{priceCheckedAt:o.priceCheckedAt||o.checkedAt}:{})}:{}
 return {...dated(previous),...dated(next)} as PublicObservation
}
