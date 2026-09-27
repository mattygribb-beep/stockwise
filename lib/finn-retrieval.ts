export type FinnOffer = {
  id?: string
  supplier?: string
  product?: string
  rawTitle?: string
  brand?: string
  size?: string
  ean?: string
  asin?: string
  supplierSku?: string
  caseQty?: number
  casePrice?: number
  effectiveCasePrice?: number
  effectiveUnitCost?: number
  unitCost?: number
  identityStatus?: string
  eanConfidence?: string
  asinConfidence?: string
  [key: string]: unknown
}

export type FinnSearchIntent = {
  raw: string
  include: string[]
  exclude: string[]
  brand?: string
  suppliers?: string[]
  ean?: string
  asin?: string
  size?: string
  packCount?: number
  maxCase?: number
  maxUnit?: number
  missingEan?: boolean
  missingAsin?: boolean
}

const SUPPLIERS = [
  'Stateside',
  'Sweet & Glory',
  'Wholesale Sweets',
  "King's Candy",
  'Candy Cargo',
  'Y&C',
  'World Candies',
  'Americatessen',
  'Hancocks',
]

const STOP = new Set(['find','show','search','look','lookup','compare','check','tell','give','get','who','stocks','stocked','cheapest','cheap','best','source','sources','sourcing','me','my','for','a','an','the','some','please','looking','want','i','am','interested','in','with','and','or','product','products','stock','supplier','suppliers','case','cases','anything','any','from','does','do','have','has'])
const clean = (s = '') => s.toLowerCase().replace(/[^a-z0-9.]+/g, ' ').replace(/\s+/g, ' ').trim()
const tokens = (s = '') => clean(s).split(' ').filter(x => x.length > 1 && !STOP.has(x))
const validPrice = (value: unknown) => Number.isFinite(Number(value)) && Number(value) > 0

function editDistance(a: string, b: string) {
  const x=clean(a), y=clean(b)
  if (!x) return y.length
  if (!y) return x.length
  const prev=Array.from({length:y.length+1},(_,i)=>i)
  for(let i=1;i<=x.length;i++){
    let left=i, diag=i-1
    for(let j=1;j<=y.length;j++){
      const up=prev[j], next=x[i-1]===y[j-1]?diag:Math.min(diag,up,left)+1
      diag=up; prev[j]=next; left=next
    }
  }
  return prev[y.length]
}
function fuzzyTokenMatch(term:string, candidates:string[]){
  const t=clean(term)
  if(t.length<4) return candidates.includes(t)
  return candidates.some(c=>c===t || (Math.abs(c.length-t.length)<=2 && editDistance(t,c)<= (t.length>=8?2:1)))
}
function matchReason(confidence:string, exact:string[], matched:string[], sizeMatch:boolean, packMatch:boolean, fuzzy:string[]){
  const reasons=[...exact,...matched.map(x=>`term: ${x}`)]
  if(sizeMatch) reasons.push('size matched')
  if(packMatch) reasons.push('case quantity matched')
  if(fuzzy.length) reasons.push(`fuzzy: ${fuzzy.join(', ')}`)
  const whyNotVerified=confidence==='VERIFIED' ? undefined : 'No exact EAN/UPC or ASIN confirmation for this supplier offer.'
  return {reasons,whyNotVerified}
}

function supplierAliases(name: string) {
  const base = clean(name)
  const aliases = [base]
  if (base === 'world candies') aliases.push('world candy')
  if (base === 'wholesale sweets') aliases.push('wholesale sweet')
  if (base === 'sweet glory') aliases.push('sweet and glory')
  if (base === 'kings candy') aliases.push('king candy', 'kings')
  if (base === 'y c') aliases.push('yc', 'y and c')
  if (base === 'candy cargo') aliases.push('candycargo')
  return aliases
}

function detectSuppliers(q: string) {
  const cq = clean(q)
  return SUPPLIERS.filter(name => supplierAliases(name).some(alias => cq.includes(alias)))
}

function removeSupplierNames(text: string, suppliers: string[]) {
  let result = text
  for (const supplier of suppliers) {
    for (const alias of supplierAliases(supplier)) {
      const pattern = alias.split(' ').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^a-z0-9]+')
      result = result.replace(new RegExp(`\\b${pattern}\\b`, 'gi'), ' ')
    }
  }
  return result
}

export function parseFinnIntent(raw: string, filters?: {include?: string; exclude?: string; brand?: string; maxCase?: string | number; suppliers?: string[]}): FinnSearchIntent {
  const q = raw || ''
  const lower = q.toLowerCase()
  const detectedSuppliers = filters?.suppliers?.length ? filters.suppliers : detectSuppliers(q)
  const ean = q.match(/\b\d{8,14}\b/)?.[0]
  const asin = q.match(/\bB0[A-Z0-9]{8}\b/i)?.[0]?.toUpperCase()
  const size = q.match(/\b\d+(?:\.\d+)?\s?(?:g|kg|ml|l|oz|fl\s?oz)\b/i)?.[0]
  const pack = q.match(/\b(?:pack|case|box)\s*(?:of\s*)?(\d+)\b/i) || q.match(/\b(\d+)\s*[xX]\b/)
  const priceLimit = q.match(/(?:under|below|less than|max(?:imum)?(?: case)?(?: price)?|up to)\s*£?\s*(\d+(?:\.\d+)?)/i)?.[1]
  const unitLimit = q.match(/(?:under|below|less than|max(?:imum)?|up to)\s*£?\s*(\d+(?:\.\d+)?)\s*(?:per\s*)?(?:unit|each|item|piece)/i)?.[1]
  const excludedPhrase = (lower.match(/(?:don't|do not|exclude|excluding|avoid|but not|not)\s+(?:find\s+)?([^.;]+)/) || [])[1] || ''
  const explicitInclude = filters?.include?.trim()
  let includeText = explicitInclude || q
    .replace(/(?:don't|do not|exclude|excluding|avoid|but not)[^.;]*/gi, ' ')
    .replace(/(?:under|below|less than|max(?:imum)?(?: case)?(?: price)?|up to)\s*£?\s*\d+(?:\.\d+)?(?:\s*(?:per\s*)?(?:unit|each|item|piece))?/gi, ' ')
    .replace(/\b(?:missing|without|no)\s+(?:an?\s+)?(?:ean|barcode|asin)s?\b/gi, ' ')
  includeText = removeSupplierNames(includeText, detectedSuppliers)
  return {
    raw: q,
    include: tokens(includeText),
    exclude: tokens(filters?.exclude || excludedPhrase),
    brand: filters?.brand?.trim() || undefined,
    suppliers: detectedSuppliers.length ? detectedSuppliers : undefined,
    ean,
    asin,
    size: size ? clean(size) : undefined,
    packCount: pack ? Number(pack[1]) : undefined,
    maxCase: Number(filters?.maxCase) || (!unitLimit ? Number(priceLimit) : 0) || undefined,
    maxUnit: Number(unitLimit) || undefined,
    missingEan: /\b(?:missing|without|no)\s+(?:an?\s+)?(?:ean|barcode)s?\b/i.test(q),
    missingAsin: /\b(?:missing|without|no)\s+(?:an?\s+)?asin?s?\b/i.test(q),
  }
}

function offerHaystack(o: FinnOffer) {
  return clean([o.product,o.rawTitle,o.brand,o.size,o.ean,o.asin,o.supplierSku].filter(Boolean).join(' '))
}

export function rankFinnOffers(allOffers: FinnOffer[], intent: FinnSearchIntent) {
  const wanted = intent.include
  return allOffers.map(offer => {
    const hay = offerHaystack(offer)
    const hayTokens = new Set(tokens(hay))
    const caseCost = Number(offer.effectiveCasePrice ?? offer.casePrice ?? 0)
    const unitCost = Number(offer.effectiveUnitCost ?? offer.unitCost ?? (validPrice(caseCost) && Number(offer.caseQty) > 0 ? caseCost / Number(offer.caseQty) : 0))
    if (intent.suppliers?.length && !intent.suppliers.some(s => clean(String(offer.supplier || '')) === clean(s))) return null
    if (intent.maxCase && (!validPrice(caseCost) || caseCost > intent.maxCase)) return null
    if (intent.maxUnit && (!validPrice(unitCost) || unitCost > intent.maxUnit)) return null
    if (intent.missingEan && String(offer.ean || '').trim()) return null
    if (intent.missingAsin && String(offer.asin || '').trim()) return null
    if (intent.exclude.some(t => hay.includes(clean(t)))) return null
    if (intent.brand && !hay.includes(clean(intent.brand))) return null

    const eanExact = !!intent.ean && clean(String(offer.ean || '')).replace(/^0+/, '') === clean(intent.ean).replace(/^0+/, '')
    const asinExact = !!intent.asin && String(offer.asin || '').toUpperCase() === intent.asin
    const candidateTokens=[...hayTokens]
    const matched = wanted.filter(t => hay.includes(clean(t)) || hayTokens.has(clean(t)) || fuzzyTokenMatch(t,candidateTokens))
    const fuzzyMatched = wanted.filter(t => !hay.includes(clean(t)) && !hayTokens.has(clean(t)) && fuzzyTokenMatch(t,candidateTokens))
    const coverage = wanted.length ? matched.length / wanted.length : 0
    const sizeMatch = !!intent.size && hay.includes(intent.size)
    const packMatch = !!intent.packCount && Number(offer.caseQty || 0) === intent.packCount

    let score = 0
    if (eanExact) score += 100
    if (asinExact) score += 95
    score += coverage * 60
    if (intent.brand && hay.includes(clean(intent.brand))) score += 20
    if (sizeMatch) score += 15
    if (packMatch) score += 8
    if (intent.suppliers?.length) score += 6
    if (validPrice(caseCost)) score += 4

    if (!eanExact && !asinExact && wanted.length && matched.length === 0) return null
    const confidence = eanExact || asinExact ? 'VERIFIED' : (coverage >= .75 && (sizeMatch || !!intent.brand) && fuzzyMatched.length===0) ? 'STRONG POSSIBLE' : coverage >= .4 ? 'POSSIBLE' : 'LOOSE POSSIBLE'
    const explanation=matchReason(confidence,[eanExact?'exact EAN/UPC':'',asinExact?'exact ASIN':''].filter(Boolean),matched,sizeMatch,packMatch,fuzzyMatched)
    return {offer, score, confidence, matchedTerms: matched, fuzzyMatched, explanation, caseCost: validPrice(caseCost) ? caseCost : 0, unitCost: validPrice(unitCost) ? unitCost : 0}
  }).filter(Boolean).sort((a:any,b:any) => b.score - a.score || (a.caseCost || Infinity) - (b.caseCost || Infinity))
}

export function groupFinnResults(ranked: ReturnType<typeof rankFinnOffers>) {
  const groups = new Map<string, any[]>()
  for (const r of ranked as any[]) {
    const o = r.offer as FinnOffer
    const identity = o.ean ? `ean:${String(o.ean).replace(/^0+/, '')}` : o.asin ? `asin:${String(o.asin).toUpperCase()}` : `name:${clean(`${o.product || ''} ${o.size || ''}`)}`
    groups.set(identity, [...(groups.get(identity) || []), r])
  }
  return [...groups.values()].map(group => {
    const sorted = [...group].sort((a,b) => {
      const ap = a.caseCost > 0 ? a.caseCost : Number.POSITIVE_INFINITY
      const bp = b.caseCost > 0 ? b.caseCost : Number.POSITIVE_INFINITY
      return ap - bp || b.score - a.score
    })
    const priced = sorted.filter(x => x.caseCost > 0)
    const best = priced[0] || sorted[0]
    const alt = priced[1]
    const pricedSupplierCount = new Set(priced.map(x => x.offer.supplier)).size
    return {
      product: best.offer.product,
      size: best.offer.size,
      best: best.offer,
      bestCost: best.caseCost,
      bestUnitCost: best.unitCost,
      confidence: best.confidence,
      explanation: best.explanation,
      matchedTerms: best.matchedTerms,
      fuzzyMatched: best.fuzzyMatched,
      score: best.score,
      supplierCount: new Set(sorted.map(x => x.offer.supplier)).size,
      pricedSupplierCount,
      alt: alt?.offer,
      altCost: alt?.caseCost,
      saving: alt ? alt.caseCost - best.caseCost : null,
      pct: alt?.caseCost ? ((alt.caseCost - best.caseCost) / alt.caseCost) * 100 : null,
      status: pricedSupplierCount > 1 ? 'COMPARISON' : 'SINGLE SOURCE',
    }
  }).sort((a,b) => b.score - a.score)
}
