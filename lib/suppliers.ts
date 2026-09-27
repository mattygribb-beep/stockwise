export type SupplierConfig = {
  slug: string
  name: string
  aliases?: string[]
  priceBasis?: 'unknown'|'unit'|'case'
  vatBasis?: 'unknown'|'inclusive'|'exclusive'|'mixed'
  capabilities?: Array<'catalogue'|'ean'|'priced'|'identity-only'>
}

export const CATALOGUE_SUPPLIERS: SupplierConfig[] = [
  {slug:'stateside',name:'Stateside Distribution',aliases:['Stateside'],priceBasis:'unknown',vatBasis:'unknown',capabilities:['catalogue','ean','priced']},
  {slug:'sweet-glory',name:'Sweet & Glory',priceBasis:'unknown',vatBasis:'unknown',capabilities:['catalogue','ean','priced']},
  {slug:'wholesale-sweets',name:'Wholesale Sweets',priceBasis:'unknown',vatBasis:'unknown',capabilities:['catalogue','ean','priced']},
  {slug:'kings-candy',name:"King's Candy",priceBasis:'unknown',vatBasis:'unknown',capabilities:['catalogue','ean','priced']},
  {slug:'american-candy-n-drinks',name:'American Candy N Drinks',aliases:['American Candy and Drinks'],priceBasis:'unknown',vatBasis:'unknown',capabilities:['catalogue']},
  {slug:'candy-cargo',name:'Candy Cargo',priceBasis:'unknown',vatBasis:'unknown',capabilities:['catalogue','ean','priced']},
  {slug:'yc-wholesale',name:'Y&C Wholesale',aliases:['Y&C','YC Wholesale'],priceBasis:'unknown',vatBasis:'unknown',capabilities:['catalogue']},
  {slug:'world-candies',name:'World Candies',priceBasis:'unknown',vatBasis:'unknown',capabilities:['catalogue','ean','priced']},
  {slug:'americatessen',name:'Americatessen',priceBasis:'unknown',vatBasis:'unknown',capabilities:['catalogue','identity-only']},
  {slug:'hancocks',name:'Hancocks',priceBasis:'unknown',vatBasis:'unknown',capabilities:['catalogue']},
]

export const CATALOGUE_SLUGS = CATALOGUE_SUPPLIERS.map(s=>s.slug)
export const CATALOGUE_NAMES = CATALOGUE_SUPPLIERS.map(s=>s.name)

export function catalogueSupplierByName(name:string){
  const q=name.trim().toLowerCase()
  return CATALOGUE_SUPPLIERS.find(s=>s.name.toLowerCase()===q || s.aliases?.some(a=>a.toLowerCase()===q))
}
