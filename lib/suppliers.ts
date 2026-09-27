export type SupplierConfig = {
  slug: string
  name: string
  aliases?: string[]
}

export const CATALOGUE_SUPPLIERS: SupplierConfig[] = [
  {slug:'stateside',name:'Stateside Distribution',aliases:['Stateside']},
  {slug:'sweet-glory',name:'Sweet & Glory'},
  {slug:'wholesale-sweets',name:'Wholesale Sweets'},
  {slug:'kings-candy',name:"King's Candy"},
  {slug:'american-candy-n-drinks',name:'American Candy N Drinks',aliases:['American Candy and Drinks']},
  {slug:'candy-cargo',name:'Candy Cargo'},
  {slug:'yc-wholesale',name:'Y&C Wholesale',aliases:['Y&C','YC Wholesale']},
  {slug:'world-candies',name:'World Candies'},
  {slug:'americatessen',name:'Americatessen'},
  {slug:'hancocks',name:'Hancocks'},
]

export const CATALOGUE_SLUGS = CATALOGUE_SUPPLIERS.map(s=>s.slug)
export const CATALOGUE_NAMES = CATALOGUE_SUPPLIERS.map(s=>s.name)

export function catalogueSupplierByName(name:string){
  const q=name.trim().toLowerCase()
  return CATALOGUE_SUPPLIERS.find(s=>s.name.toLowerCase()===q || s.aliases?.some(a=>a.toLowerCase()===q))
}
